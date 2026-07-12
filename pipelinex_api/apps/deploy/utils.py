# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django_redis import get_redis_connection
from django.conf import settings
from django.db import close_old_connections
from libs.utils import AttrDict, human_time, render_str
from apps.host.models import Host
from apps.config.utils import compose_configs
from apps.repository.models import Repository
from apps.repository.utils import dispatch as build_repository
from apps.app.utils import fetch_repo
from apps.deploy.models import DeployRequest
from apps.deploy.helper import Helper, SpugError
from concurrent import futures
from functools import partial
import json
import uuid
import os
import subprocess

REPOS_DIR = settings.REPOS_DIR
BUILD_DIR = settings.BUILD_DIR


def dispatch(req, fail_mode=False):
    rds = get_redis_connection()
    rds_key = f'{settings.REQUEST_KEY}:{req.id}'
    if fail_mode:
        req.host_ids = req.fail_host_ids
    req.fail_mode = fail_mode
    req.host_ids = json.loads(req.host_ids)
    req.fail_host_ids = req.host_ids[:]
    helper = Helper.make(rds, rds_key, req.host_ids if fail_mode else None)

    try:
        api_token = uuid.uuid4().hex
        rds.setex(api_token, 60 * 60, f'{req.deploy.app_id},{req.deploy.env_id}')
        env = AttrDict(
            SPUG_APP_NAME=req.deploy.app.name,
            SPUG_APP_KEY=req.deploy.app.key,
            SPUG_APP_ID=str(req.deploy.app_id),
            SPUG_REQUEST_ID=str(req.id),
            SPUG_REQUEST_NAME=req.name,
            SPUG_DEPLOY_ID=str(req.deploy.id),
            SPUG_ENV_ID=str(req.deploy.env_id),
            SPUG_ENV_KEY=req.deploy.env.key,
            SPUG_VERSION=req.version,
            SPUG_BUILD_VERSION=req.spug_version,
            SPUG_DEPLOY_TYPE=req.type,
            SPUG_API_TOKEN=api_token,
            SPUG_REPOS_DIR=REPOS_DIR,
        )
        # append configs
        configs = compose_configs(req.deploy.app, req.deploy.env_id)
        configs_env = {f'_SPUG_{k.upper()}': v for k, v in configs.items()}
        env.update(configs_env)

        if req.deploy.extend == '1':
            _ext1_deploy(req, helper, env)
        elif req.deploy.extend == '2':
            _ext2_deploy(req, helper, env)
        else:
            _k8s_deploy(req, helper, env)
        req.status = '3'
    except Exception as e:
        req.status = '-3'
        raise e
    finally:
        close_old_connections()
        DeployRequest.objects.filter(pk=req.id).update(
            status=req.status,
            repository=req.repository,
            fail_host_ids=json.dumps(req.fail_host_ids),
        )
        helper.clear()
        Helper.send_deploy_notify(req)


def _ext1_deploy(req, helper, env):
    if not req.repository_id:
        rep = Repository(
            app_id=req.deploy.app_id,
            env_id=req.deploy.env_id,
            deploy_id=req.deploy_id,
            version=req.version,
            spug_version=req.spug_version,
            extra=req.extra,
            remarks='SPUG AUTO MAKE',
            created_by_id=req.created_by_id
        )
        build_repository(rep, helper)
        req.repository = rep
    extras = json.loads(req.extra)
    if extras[0] == 'repository':
        extras = extras[1:]
    if extras[0] == 'branch':
        env.update(SPUG_GIT_BRANCH=extras[1], SPUG_GIT_COMMIT_ID=extras[2])
    else:
        env.update(SPUG_GIT_TAG=extras[1])
    if req.deploy.is_parallel:
        threads, latest_exception = [], None
        max_workers = max(10, os.cpu_count() * 5)
        with futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            for h_id in req.host_ids:
                new_env = AttrDict(env.items())
                t = executor.submit(_deploy_ext1_host, req, helper, h_id, new_env)
                t.h_id = h_id
                threads.append(t)
            for t in futures.as_completed(threads):
                exception = t.exception()
                if exception:
                    latest_exception = exception
                    if not isinstance(exception, SpugError):
                        helper.send_error(t.h_id, f'Exception: {exception}', False)
                else:
                    req.fail_host_ids.remove(t.h_id)
        if latest_exception:
            raise latest_exception
    else:
        host_ids = sorted(req.host_ids, reverse=True)
        while host_ids:
            h_id = host_ids.pop()
            new_env = AttrDict(env.items())
            try:
                _deploy_ext1_host(req, helper, h_id, new_env)
                req.fail_host_ids.remove(h_id)
            except Exception as e:
                helper.send_error(h_id, f'Exception: {e}', False)
                for h_id in host_ids:
                    helper.send_error(h_id, '终止发布', False)
                raise e


def _ext2_deploy(req, helper, env):
    extend, step = req.deploy.extend_obj, 1
    host_actions = json.loads(extend.host_actions)
    server_actions = json.loads(extend.server_actions)
    env.update({'SPUG_RELEASE': req.version})
    if req.version:
        for index, value in enumerate(req.version.split()):
            env.update({f'SPUG_RELEASE_{index + 1}': value})

    build_dir = None
    if extend.git_repo:
        build_dir = os.path.join(settings.REPOS_DIR, req.spug_version)
        env.update(SPUG_BUILD_DIR=build_dir)

    try:
        if extend.git_repo and not req.fail_mode:
            helper.send_step('local', step, f'{human_time()} 获取代码仓库...        ')
            fetch_repo(req.deploy_id, extend.git_repo)
            helper.send_info('local', '\033[32m完成√\033[0m\r\n')
            step += 1

            helper.send_step('local', step, f'{human_time()} 执行检出...        ')
            git_dir = os.path.join(settings.REPOS_DIR, str(req.deploy_id))
            extras = json.loads(req.extra)
            if extras[0] == 'branch':
                tree_ish = extras[2]
                env.update(SPUG_GIT_BRANCH=extras[1], SPUG_GIT_COMMIT_ID=extras[2])
            else:
                tree_ish = extras[1]
                env.update(SPUG_GIT_TAG=extras[1])
            
            command = f'cd {git_dir} && git archive --prefix={req.spug_version}/ {tree_ish} | (cd .. && tar xf -)'
            helper.local(command)
            helper.send_info('local', '\033[32m完成√\033[0m\r\n')
            step += 1

        if not req.fail_mode:
            if not extend.git_repo:
                helper.send_info('local', f'\033[32m完成√\033[0m\r\n')
            for action in server_actions:
                helper.send_step('local', step, f'{human_time()} {action["title"]}...\r\n')
                work_dir = build_dir if build_dir else '/tmp'
                helper.local(f'cd {work_dir} && {action["data"]}', env)
                step += 1

        for action in host_actions:
            if action.get('type') == 'transfer':
                action['src'] = render_str(action.get('src', '').strip().rstrip('/'), env)
                action['dst'] = render_str(action['dst'].strip().rstrip('/'), env)
                if action.get('src_mode') == '1':  # upload when publish
                    extra = json.loads(req.extra)
                    if 'name' in extra:
                        action['name'] = extra['name']
                    break
                helper.send_step('local', step, f'{human_time()} 检测到来源为本地路径的数据传输动作，执行打包...   \r\n')
                action['src'] = action['src'].rstrip('/ ')
                action['dst'] = action['dst'].rstrip('/ ')
                if not action['src'] or not action['dst']:
                    helper.send_error('local', f'Invalid path for transfer, src: {action["src"]} dst: {action["dst"]}')
                if not os.path.exists(action['src']):
                    helper.send_error('local', f'No such file or directory: {action["src"]}')
                is_dir, exclude = os.path.isdir(action['src']), ''
                sp_dir, sd_dst = os.path.split(action['src'])
                contain = sd_dst
                if action['mode'] != '0' and is_dir:
                    files = helper.parse_filter_rule(action['rule'], ',', env)
                    if files:
                        if action['mode'] == '1':
                            contain = ' '.join(f'{sd_dst}/{x}' for x in files)
                        else:
                            excludes = []
                            for x in files:
                                if x.startswith('/'):
                                    excludes.append(f'--exclude={sd_dst}{x}')
                                else:
                                    excludes.append(f'--exclude={x}')
                            exclude = ' '.join(excludes)
                tar_gz_file = f'{req.spug_version}.tar.gz'
                helper.local(f'cd {sp_dir} && tar -zcf {tar_gz_file} {exclude} {contain}')
                helper.send_info('local', f'{human_time()} \033[32m完成√\033[0m\r\n')
                helper.add_callback(partial(os.remove, os.path.join(sp_dir, tar_gz_file)))
                break
        helper.send_step('local', 100, '')

        if host_actions:
            if req.deploy.is_parallel:
                threads, latest_exception = [], None
                max_workers = max(10, os.cpu_count() * 5)
                with futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                    for h_id in req.host_ids:
                        new_env = AttrDict(env.items())
                        t = executor.submit(_deploy_ext2_host, helper, h_id, host_actions, new_env, req.spug_version)
                        t.h_id = h_id
                        threads.append(t)
                    for t in futures.as_completed(threads):
                        exception = t.exception()
                        if exception:
                            latest_exception = exception
                            if not isinstance(exception, SpugError):
                                helper.send_error(t.h_id, f'Exception: {exception}', False)
                        else:
                            req.fail_host_ids.remove(t.h_id)
                if latest_exception:
                    raise latest_exception
            else:
                host_ids = sorted(req.host_ids, reverse=True)
                while host_ids:
                    h_id = host_ids.pop()
                    new_env = AttrDict(env.items())
                    try:
                        _deploy_ext2_host(helper, h_id, host_actions, new_env, req.spug_version)
                        req.fail_host_ids.remove(h_id)
                    except Exception as e:
                        helper.send_error(h_id, f'Exception: {e}', False)
                        for h_id in host_ids:
                            helper.send_error(h_id, '终止发布', False)
                        raise e
        else:
            req.fail_host_ids = []
            helper.send_step('local', 100, f'\r\n{human_time()} ** 发布成功 **')
    finally:
        if build_dir:
            helper.local(f'cd {settings.REPOS_DIR} && rm -rf {req.spug_version}')


def _deploy_ext1_host(req, helper, h_id, env):
    helper.send_step(h_id, 1, f'\033[32m就绪√\033[0m\r\n{human_time()} 数据准备...        ')
    host = Host.objects.filter(pk=h_id).first()
    if not host:
        helper.send_error(h_id, 'no such host')
    env.update({'SPUG_HOST_ID': h_id, 'SPUG_HOST_NAME': host.hostname})
    extend = req.deploy.extend_obj
    extend.dst_dir = render_str(extend.dst_dir, env)
    extend.dst_repo = render_str(extend.dst_repo, env)
    env.update(SPUG_DST_DIR=extend.dst_dir)
    with host.get_ssh(default_env=env) as ssh:
        base_dst_dir = os.path.dirname(extend.dst_dir)
        code, _ = ssh.exec_command_raw(
            f'mkdir -p {extend.dst_repo} {base_dst_dir} && [ -e {extend.dst_dir} ] && [ ! -L {extend.dst_dir} ]')
        if code == 0:
            helper.send_error(host.id, f'检测到该主机的发布目录 {extend.dst_dir!r} 已存在，为了数据安全请自行备份后删除该目录，Spug 将会创建并接管该目录。')
        if req.type == '2':
            helper.send_step(h_id, 1, '\033[33m跳过√\033[0m\r\n')
        else:
            # clean
            clean_command = f'ls -d {extend.deploy_id}_* 2> /dev/null | sort -t _ -rnk2 | tail -n +{extend.versions + 1} | xargs rm -rf'
            helper.remote_raw(host.id, ssh, f'cd {extend.dst_repo} && {clean_command}')
            # transfer files
            tar_gz_file = f'{req.spug_version}.tar.gz'
            try:
                callback = helper.progress_callback(host.id)
                ssh.put_file(
                    os.path.join(BUILD_DIR, tar_gz_file),
                    os.path.join(extend.dst_repo, tar_gz_file),
                    callback
                )
            except Exception as e:
                helper.send_error(host.id, f'Exception: {e}')

            command = f'cd {extend.dst_repo} && rm -rf {req.spug_version} && tar xf {tar_gz_file} && rm -f {req.deploy_id}_*.tar.gz'
            helper.remote_raw(host.id, ssh, command)
            helper.send_step(h_id, 1, '\033[32m完成√\033[0m\r\n')

        # pre host
        repo_dir = os.path.join(extend.dst_repo, req.spug_version)
        if extend.hook_pre_host:
            helper.send_step(h_id, 2, f'{human_time()} 发布前任务...       \r\n')
            command = f'cd {repo_dir} && {extend.hook_pre_host}'
            helper.remote(host.id, ssh, command)

        # do deploy
        helper.send_step(h_id, 3, f'{human_time()} 执行发布...        ')
        helper.remote_raw(host.id, ssh, f'rm -f {extend.dst_dir} && ln -sfn {repo_dir} {extend.dst_dir}')
        helper.send_step(h_id, 3, '\033[32m完成√\033[0m\r\n')

        # post host
        if extend.hook_post_host:
            helper.send_step(h_id, 4, f'{human_time()} 发布后任务...       \r\n')
            command = f'cd {extend.dst_dir} && {extend.hook_post_host}'
            helper.remote(host.id, ssh, command)

        helper.send_step(h_id, 100, f'\r\n{human_time()} ** \033[32m发布成功\033[0m **')


def _deploy_ext2_host(helper, h_id, actions, env, spug_version):
    helper.send_info(h_id, '\033[32m就绪√\033[0m\r\n')
    host = Host.objects.filter(pk=h_id).first()
    if not host:
        helper.send_error(h_id, 'no such host')
    env.update({'SPUG_HOST_ID': h_id, 'SPUG_HOST_NAME': host.hostname})
    with host.get_ssh(default_env=env) as ssh:
        for index, action in enumerate(actions):
            helper.send_step(h_id, 1 + index, f'{human_time()} {action["title"]}...\r\n')
            if action.get('type') == 'transfer':
                if action.get('src_mode') == '1':
                    try:
                        dst = action['dst']
                        command = f'[ -e {dst} ] || mkdir -p $(dirname {dst}); [ -d {dst} ]'
                        code, _ = ssh.exec_command_raw(command)
                        if code == 0:  # is dir
                            if not action.get('name'):
                                raise RuntimeError('internal error 1002')
                            dst = dst.rstrip('/') + '/' + action['name']
                        callback = helper.progress_callback(host.id)
                        ssh.put_file(os.path.join(REPOS_DIR, env.SPUG_DEPLOY_ID, spug_version), dst, callback)
                    except Exception as e:
                        helper.send_error(host.id, f'Exception: {e}')
                    helper.send_info(host.id, 'transfer completed\r\n')
                    continue
                else:
                    sp_dir, sd_dst = os.path.split(action['src'])
                    tar_gz_file = f'{spug_version}.tar.gz'
                    try:
                        callback = helper.progress_callback(host.id)
                        ssh.put_file(os.path.join(sp_dir, tar_gz_file), f'/tmp/{tar_gz_file}', callback)
                    except Exception as e:
                        helper.send_error(host.id, f'Exception: {e}')

                    command = f'mkdir -p /tmp/{spug_version} && tar xf /tmp/{tar_gz_file} -C /tmp/{spug_version}/ '
                    command += f'&& rm -rf {action["dst"]} && mv /tmp/{spug_version}/{sd_dst} {action["dst"]} '
                    command += f'&& rm -rf /tmp/{spug_version}* && echo "transfer completed"'
            else:
                 command = f'cd /tmp && {action["data"]}'
            helper.remote(host.id, ssh, command)

    helper.send_step(h_id, 100, f'\r\n{human_time()} ** \033[32m发布成功\033[0m **')


# K8s 部署实现
def _k8s_deploy(req, helper, env):
    # FIX: 解决原 ext2 被误切断的 SyntaxError，确保 try 块闭合且将 K8s 发布逻辑优雅地追加至末尾
    import yaml
    from kubernetes import client, config
    from libs.utils import decrypt_kubeconfig

    extend = req.deploy.extend_obj
    step = 1
    
    if not req.deploy.env.k8s_config:
        raise Exception("当前环境未配置 Kubernetes (Kubeconfig) 凭证，请先在环境管理中进行配置")
        
    helper.send_step('local', step, f'{human_time()} 解析 K8s 集群配置...        ')
    try:
        kubeconfig_yaml = decrypt_kubeconfig(req.deploy.env.k8s_config)
        kubeconfig_dict = yaml.safe_load(kubeconfig_yaml)
        config.load_kube_config_from_dict(kubeconfig_dict)
        k8s_apps_api = client.AppsV1Api()
        helper.send_info('local', '\033[32m完成√\033[0m\r\n')
    except Exception as e:
        helper.send_error('local', f'解析 Kubeconfig 失败: {e}', True)
        raise e
        
    step += 1
    
    image_tag = req.version if req.version else req.spug_version
    if image_tag and '#' in image_tag:
        image_tag = image_tag.replace('#', '-')
    final_image = f"{extend.image_repo}:{image_tag}"
    
    if extend.git_repo:
        helper.send_step('local', step, f'{human_time()} 获取代码仓库...        ')
        fetch_repo(req.deploy_id, extend.git_repo)
        
        import json
        from apps.setting.utils import AppSetting
        from libs.gitlib import Git
        repo_dir = os.path.join(settings.REPOS_DIR, str(req.deploy_id))
        pkey = AppSetting.get_default('private_key')
        
        extras = json.loads(req.extra)
        if extras[0] == 'repository':
            extras = extras[1:]
        if extras[0] == 'branch':
            tree_ish = extras[2] if len(extras) > 2 else f'origin/{extras[1]}'
        else:
            tree_ish = extras[1]
            
        with Git(extend.git_repo, repo_dir, pkey) as git:
            git.repo.git.clean('-fdx')
            git.repo.git.reset('--hard', tree_ish)
            
        helper.send_info('local', '\033[32m完成√\033[0m\r\n')
        
        step += 1
        helper.send_step('local', step, f'{human_time()} 开始构建 Docker 镜像...        ')
        build_path = os.path.join(settings.REPOS_DIR, str(req.deploy_id))
        build_cmd = f"docker build -t {final_image} ."
        helper.send_info('local', f'执行命令: {build_cmd}\r\n')
        
        try:
            process = subprocess.Popen(build_cmd, shell=True, cwd=build_path, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            for line in iter(process.stdout.readline, b''):
                helper.send_info('local', line.decode('utf-8', errors='ignore'))
            process.stdout.close()
            process.wait()
            if process.returncode != 0:
                raise Exception(f"Docker 镜像构建失败，错误码 {process.returncode}")
            helper.send_info('local', '\033[32m镜像构建完成√\033[0m\r\n')
        except Exception as e:
            helper.send_error('local', f'构建镜像失败: {e}', True)
            raise e
            
        step += 1
        helper.send_step('local', step, f'{human_time()} 推送镜像到远程仓库...        ')
        push_cmd = f"docker push {final_image}"
        helper.send_info('local', f'执行命令: {push_cmd}\r\n')
        try:
            process = subprocess.Popen(push_cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            for line in iter(process.stdout.readline, b''):
                helper.send_info('local', line.decode('utf-8', errors='ignore'))
            process.stdout.close()
            process.wait()
            if process.returncode != 0:
                raise Exception(f"Docker 镜像推送失败，错误码 {process.returncode}")
            helper.send_info('local', '\033[32m镜像推送完成√\033[0m\r\n')
        except Exception as e:
            helper.send_error('local', f'推送镜像失败: {e}', True)
            raise e
            
        step += 1

    helper.send_step('local', step, f'{human_time()} 触发 K8s 滚动部署 ({extend.workload_type})...        ')
    try:
        namespace = extend.workload_namespace if getattr(extend, 'workload_namespace', None) else 'default'
        if extend.workload_type.lower() == 'deployment':
            dep = k8s_apps_api.read_namespaced_deployment(name=extend.workload_name, namespace=namespace)
            found = False
            for container in dep.spec.template.spec.containers:
                if container.name == extend.container_name:
                    container.image = final_image
                    found = True
                    break
            if not found:
                raise Exception(f"在工作负载 {extend.workload_name} 中未找到容器: {extend.container_name}")
                
            k8s_apps_api.patch_namespaced_deployment(name=extend.workload_name, namespace=namespace, body=dep)
        elif extend.workload_type.lower() == 'statefulset':
            sts = k8s_apps_api.read_namespaced_stateful_set(name=extend.workload_name, namespace=namespace)
            found = False
            for container in sts.spec.template.spec.containers:
                if container.name == extend.container_name:
                    container.image = final_image
                    found = True
                    break
            if not found:
                raise Exception(f"在工作负载 {extend.workload_name} 中未找到容器: {extend.container_name}")
                
            k8s_apps_api.patch_namespaced_stateful_set(name=extend.workload_name, namespace=namespace, body=sts)
        elif extend.workload_type.lower() == 'daemonset':
            ds = k8s_apps_api.read_namespaced_daemon_set(name=extend.workload_name, namespace=namespace)
            found = False
            for container in ds.spec.template.spec.containers:
                if container.name == extend.container_name:
                    container.image = final_image
                    found = True
                    break
            if not found:
                raise Exception(f"在工作负载 {extend.workload_name} 中未找到容器: {extend.container_name}")
                
            k8s_apps_api.patch_namespaced_daemon_set(name=extend.workload_name, namespace=namespace, body=ds)
        else:
            raise Exception(f"不支持的 K8s 工作负载类型: {extend.workload_type}")
            
        helper.send_info('local', '\033[32mPatch 发送成功√\033[0m\r\n')
    except Exception as e:
        helper.send_error('local', f'更新 K8s 负载失败: {e}', True)
        raise e

    step += 1
    
    helper.send_step('local', step, f'{human_time()} 等待 K8s 滚动升级就绪检测...        \r\n')
    import time
    max_wait = 300
    check_interval = 5
    elapsed = 0
    try:
        while elapsed < max_wait:
            time.sleep(check_interval)
            elapsed += check_interval
            
            if extend.workload_type.lower() == 'deployment':
                status = k8s_apps_api.read_namespaced_deployment_status(name=extend.workload_name, namespace=namespace)
                replicas = status.status.replicas or 0
                updated_replicas = status.status.updated_replicas or 0
                available_replicas = status.status.available_replicas or 0
                
                log_msg = f"检测进度: 当前副本数 {replicas}，更新就绪副本数 {updated_replicas}，可用副本数 {available_replicas}\r\n"
                helper.send_info('local', log_msg)
                
                if updated_replicas == replicas and available_replicas == replicas:
                    helper.send_info('local', '\033[32mK8s 部署升级全部就绪成功√\033[0m\r\n')
                    break
            elif extend.workload_type.lower() == 'statefulset':
                status = k8s_apps_api.read_namespaced_stateful_set_status(name=extend.workload_name, namespace=namespace)
                replicas = status.status.replicas or 0
                updated_replicas = status.status.updated_replicas or 0
                ready_replicas = status.status.ready_replicas or 0
                
                log_msg = f"检测进度: 当前副本数 {replicas}，更新副本数 {updated_replicas}，就绪副本数 {ready_replicas}\r\n"
                helper.send_info('local', log_msg)
                
                if updated_replicas == replicas and ready_replicas == replicas:
                    helper.send_info('local', '\033[32mK8s 部署升级全部就绪成功√\033[0m\r\n')
                    break
            elif extend.workload_type.lower() == 'daemonset':
                status = k8s_apps_api.read_namespaced_daemon_set_status(name=extend.workload_name, namespace=namespace)
                desired = status.status.desired_number_scheduled or 0
                updated = status.status.updated_number_scheduled or 0
                ready = status.status.number_ready or 0
                
                log_msg = f"检测进度: 当前期望节点数 {desired}，更新节点数 {updated}，就绪节点数 {ready}\r\n"
                helper.send_info('local', log_msg)
                
                if updated == desired and ready == desired:
                    helper.send_info('local', '\033[32mK8s 部署升级全部就绪成功√\033[0m\r\n')
                    break
        else:
            raise Exception("K8s 滚动发布超时，请检查 Pod 启动日志是否有异常。")
    except Exception as e:
        helper.send_error('local', f'就绪检测阶段发生异常: {e}', True)
        raise e

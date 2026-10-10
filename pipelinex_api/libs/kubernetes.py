import yaml
import base64
from kubernetes import client, config

def _get_k8s_client(kubeconfig):
    """
    解析并获取 K8s 客户端配置
    kubeconfig 可以是原生 YAML 文本或 Base64 编码的字符串
    """
    try:
        kubeconfig_str = base64.b64decode(kubeconfig).decode('utf-8')
    except Exception:
        kubeconfig_str = kubeconfig

    kubeconfig_dict = yaml.safe_load(kubeconfig_str)
    
    api_client = client.ApiClient()
    config.load_kube_config_from_dict(kubeconfig_dict, client=api_client)
    return api_client

def update_k8s_deployment(kubeconfig, namespace, deploy_name, container_name, image_url):
    """
    更新 Kubernetes 原生 Deployment 的指定容器镜像
    """
    try:
        api_client = _get_k8s_client(kubeconfig)
        apps_api = client.AppsV1Api(api_client)
        
        deployment = apps_api.read_namespaced_deployment(name=deploy_name, namespace=namespace)
        
        found = False
        for container in deployment.spec.template.spec.containers:
            if container.name == container_name:
                container.image = image_url
                found = True
                break
                
        if not found:
            return f"在 Deployment {deploy_name} 中未找到容器: {container_name}"
            
        apps_api.patch_namespaced_deployment(name=deploy_name, namespace=namespace, body=deployment)
        return None
    except Exception as e:
        return str(e)

def update_k8s_cronworkflow(kubeconfig, namespace, cwf_name, template_name, image_url):
    """
    更新 Argo CronWorkflow 指定 template 的容器镜像
    GVK: argoproj.io/v1alpha1/cronworkflows
    """
    try:
        api_client = _get_k8s_client(kubeconfig)
        custom_api = client.CustomObjectsApi(api_client)
        
        group = "argoproj.io"
        version = "v1alpha1"
        plural = "cronworkflows"
        
        cwf = custom_api.get_namespaced_custom_object(
            group=group,
            version=version,
            namespace=namespace,
            plural=plural,
            name=cwf_name
        )
        
        templates = cwf.get('spec', {}).get('workflowSpec', {}).get('templates', [])
        found = False
        for tmpl in templates:
            if tmpl.get('name') == template_name:
                container = tmpl.get('container')
                if container:
                    container['image'] = image_url
                    found = True
                break
                
        if not found:
            return f"在 CronWorkflow {cwf_name} 中未找到模板: {template_name} 或其 container 字段"
            
        custom_api.patch_namespaced_custom_object(
            group=group,
            version=version,
            namespace=namespace,
            plural=plural,
            name=cwf_name,
            body=cwf
        )
        return None
    except Exception as e:
        return str(e)

def update_k8s_javadeploy(kubeconfig, namespace, deploy_name, image_url):
    """
    更新私有 CRD JavaDeploy 的 spec.image 字段
    GVK: apps.joey.com/v1/javadeploys
    """
    try:
        api_client = _get_k8s_client(kubeconfig)
        custom_api = client.CustomObjectsApi(api_client)
        
        group = "apps.joey.com"
        version = "v1"
        plural = "javadeploys"
        
        patch_body = {
            "spec": {
                "image": image_url
            }
        }
        
        custom_api.patch_namespaced_custom_object(
            group=group,
            version=version,
            namespace=namespace,
            plural=plural,
            name=deploy_name,
            body=patch_body
        )
        return None
    except Exception as e:
        return str(e)

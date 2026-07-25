/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Radio, Input, Switch, Select, message, Steps, Button } from 'antd';
import envStore from 'pages/config/environment/store';
import { http, cleanCommand } from 'libs';
import { ACEditor } from 'components';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/theme-tomorrow';
import Repo from './Repo';
import store from './store';

export default observer(function Ext3Form() {
  const [form] = Form.useForm();
  const [envs, setEnvs] = useState([]);
  const [repoVisible, setRepoVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const info = store.deploy;
  const [hookPreServer, setHookPreServer] = useState(info.hook_pre_server || '');
  const [hookPostServer, setHookPostServer] = useState(info.hook_post_server || '');
  const [page, setPage] = useState(0);

  function handleNext() {
    form.validateFields()
      .then(() => {
        setPage(1);
      })
  }

  function updateEnvs() {
    const ids = store.currentRecord['deploys'].map(x => x.env_id);
    setEnvs(ids.filter(x => x !== store.deploy.env_id))
  }

  useEffect(() => {
    if (store.currentRecord['deploys'] === undefined) {
      store.loadDeploys(store.app_id).then(updateEnvs)
    } else {
      updateEnvs()
    }
  }, []);

  function handleSubmit() {
    setLoading(true);
    const fields = form.getFieldsValue();
    const info = {
      ...store.deploy,
      ...fields,
      hook_pre_server: hookPreServer,
      hook_post_server: hookPostServer,
      app_id: store.app_id,
      extend: '3',
      host_ids: []  // K8s发布不使用传统物理主机
    };
    http.post('/api/app/deploy/', info)
      .then(res => {
        message.success('操作成功');
        store.ext3Visible = false;
        store.loadDeploys(store.app_id);
      }, () => setLoading(false))
  }

  const appName = store.currentRecord.name;
  let title = `K8s发布 - ${appName}`;
  if (store.deploy.id) {
    store.isReadOnly ? title = '查看' + title : title = '编辑' + title;
  } else {
    title = '新建' + title;
  }

  // 默认通知配置初始化防止报错
  if (!info.rst_notify) {
    info.rst_notify = {mode: '0'};
  }

  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title={title}
      onCancel={() => store.ext3Visible = false}
      footer={null}>
      <Form form={form} initialValues={info} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.git_repo !== currentValues.git_repo}>
          {({ getFieldValue }) => {
            const hasGit = !!getFieldValue('git_repo');
            return hasGit ? (
              <Steps current={page} size="small" style={{ width: '60%', margin: '0 auto 24px' }}>
                <Steps.Step title="基本配置" />
                <Steps.Step title="构建配置" />
              </Steps>
            ) : null;
          }}
        </Form.Item>

        <div style={{ display: page === 0 ? 'block' : 'none' }}>
          <Form.Item required name="env_id" label="发布环境" tooltip="每个发布环境只能创建一个配置。此环境必须在“环境管理”中提前配置好 Kkubeconfig 凭证。">
            <Select disabled={store.isReadOnly} placeholder="请选择发布环境">
              {envStore.records.map(item => (
                <Select.Option disabled={envs.includes(item.id)} value={item.id} key={item.id}>
                  {item.name} {item.has_k8s_config ? ' (已配置 K8s)' : ' (未配置 K8s)'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item required name="workload_type" label="工作负载类型">
            <Radio.Group disabled={store.isReadOnly} buttonStyle="solid">
              <Radio.Button value="Deployment">Deployment</Radio.Button>
              <Radio.Button value="StatefulSet">StatefulSet</Radio.Button>
              <Radio.Button value="DaemonSet">DaemonSet</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item required name="workload_namespace" label="命名空间" initialValue="default" tooltip="该应用在 Kubernetes 集群中部署所处的命名空间 (Namespace)，默认值为 default。">
            <Input disabled={store.isReadOnly} placeholder="请输入命名空间，例如：default"/>
          </Form.Item>
          <Form.Item required name="workload_name" label="工作负载名称">
            <Input disabled={store.isReadOnly} placeholder="请输入 Kubernetes 工作负载名称，例如：order-service"/>
          </Form.Item>
          <Form.Item required name="container_name" label="容器名称">
            <Input disabled={store.isReadOnly} placeholder="请输入容器名称，例如：order-container"/>
          </Form.Item>
          <Form.Item required name="image_repo" label="镜像仓库地址" tooltip="请输入镜像仓库地址（不需要包含 tag 标签）。例如：registry.cn-hangzhou.aliyuncs.com/mycorp/order-service">
            <Input disabled={store.isReadOnly} placeholder="请输入镜像仓库地址，不需要包含 tag 标签"/>
          </Form.Item>
          <Form.Item name="git_repo" label="Git仓库地址" extra={<span className="btn" onClick={() => setRepoVisible(true)}>私有仓库？</span>}>
            <Input disabled={store.isReadOnly} placeholder="可选，若需要拉取代码构建镜像并推送，请输入Git仓库地址。"/>
          </Form.Item>
          <Form.Item name="is_audit" label="发布审核" valuePropName="checked" tooltip="开启后发布申请需要审批通过后才能发布。">
            <Switch disabled={store.isReadOnly} checkedChildren="开启" unCheckedChildren="关闭"/>
          </Form.Item>
          <Form.Item label="消息通知" extra="应用审核及发布成功/失败结果的渠道通知配置。">
            <Input.Group compact>
              <Form.Item name={['rst_notify', 'mode']} noStyle>
                <Select disabled={store.isReadOnly} style={{width: 100}}>
                  <Select.Option value="0">关闭</Select.Option>
                  <Select.Option value="1">钉钉</Select.Option>
                  <Select.Option value="3">微信</Select.Option>
                  <Select.Option value="4">飞书</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name={['rst_notify', 'value']} noStyle>
                <Input disabled={store.isReadOnly} style={{width: 'calc(100% - 100px)'}} placeholder="请输入 Webhook 机器人通知地址"/>
              </Form.Item>
            </Input.Group>
          </Form.Item>
        </div>

        <div style={{ display: page === 1 ? 'block' : 'none' }}>
          <Form.Item
            label="代码检出前执行"
            tooltip="在运行 PipelineX 的服务器(或容器)上执行，当前目录为仓库源代码目录，可以执行任意自定义命令。"
            extra={<span>请避免在此修改已跟踪的文件，防止在检出代码时失败。</span>}>
            <ACEditor
              readOnly={store.isReadOnly}
              mode="sh"
              theme="tomorrow"
              width="100%"
              height="120px"
              placeholder="输入要执行的命令"
              value={hookPreServer}
              onChange={v => setHookPreServer(cleanCommand(v))}
              style={{ border: '1px solid #e8e8e8' }} />
          </Form.Item>
          <Form.Item
            label="代码检出后执行"
            style={{ marginTop: 12, marginBottom: 24 }}
            tooltip="在运行 PipelineX 的服务器(或容器)上执行，当前目录为检出后的源代码目录，可执行任意自定义命令。"
            extra={<span>大多数情况下在此进行构建操作（如 npm run build 或 mvn package）。</span>}>
            <ACEditor
              readOnly={store.isReadOnly}
              mode="sh"
              theme="tomorrow"
              width="100%"
              height="120px"
              placeholder="输入要执行的命令"
              value={hookPostServer}
              onChange={v => setHookPostServer(cleanCommand(v))}
              style={{ border: '1px solid #e8e8e8' }} />
          </Form.Item>
        </div>
        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.git_repo !== currentValues.git_repo}>
          {({ getFieldValue }) => {
            const hasGit = !!getFieldValue('git_repo');
            return (
              <div style={{
                textAlign: 'right',
                borderTop: '1px solid #f0f0f0',
                padding: '12px 24px',
                margin: '24px -24px -24px -24px',
                backgroundColor: '#fff',
                borderRadius: '0 0 4px 4px'
              }}>
                <Button onClick={() => store.ext3Visible = false} style={{ marginRight: 8 }}>
                  取消
                </Button>
                {page === 1 ? (
                  <>
                    <Button onClick={() => setPage(0)} style={{ marginRight: 8 }}>
                      上一步
                    </Button>
                    <Button type="primary" loading={loading} onClick={handleSubmit}>
                      确定
                    </Button>
                  </>
                ) : (
                  <>
                    {hasGit ? (
                      <Button type="primary" onClick={handleNext}>
                        下一步
                      </Button>
                    ) : (
                      <Button type="primary" loading={loading} onClick={handleSubmit}>
                        确定
                      </Button>
                    )}
                  </>
                )}
              </div>
            );
          }}
        </Form.Item>
      </Form>
      {repoVisible && <Repo onCancel={() => setRepoVisible(false)} />}
    </Modal>
  )
})

/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Radio, Button, message } from 'antd';
import { ACEditor } from 'components';
import { cleanCommand } from 'libs';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-tomorrow';
import http from 'libs/http';
import store from './store';

export default observer(function TemplateForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [extendType, setExtendType] = useState(store.record.extend || '3'); // 默认 K8s 模板
  const [hookPreServer, setHookPreServer] = useState(store.configData.hook_pre_server || '');
  const [hookPostServer, setHookPostServer] = useState(store.configData.hook_post_server || '');
  
  // 自定义发布动作 JSON 文本状态
  const [serverActions, setServerActions] = useState(
    store.configData.server_actions ? JSON.stringify(store.configData.server_actions, null, 2) : '[]'
  );
  const [hostActions, setHostActions] = useState(
    store.configData.host_actions ? JSON.stringify(store.configData.host_actions, null, 2) : '[]'
  );

  // 常规物理主机文件过滤规则内容状态
  const [filterRuleData, setFilterRuleData] = useState(
    store.configData.filter_rule ? store.configData.filter_rule.data : ''
  );

  function handleSubmit() {
    setLoading(true);
    form.validateFields()
      .then(values => {
        const { name, extend, description, filter_rule_type, ...configFields } = values;
        
        // 组装 config_data
        const configData = {
          ...configFields,
          filter_rule: {
            type: filter_rule_type || 'exclude',
            data: filterRuleData || ''
          },
          hook_pre_server: hookPreServer,
          hook_post_server: hookPostServer
        };

        // 自定义发布模式解析并封装 actions JSON
        if (extend === '2') {
          try {
            configData.server_actions = JSON.parse(serverActions);
            configData.host_actions = JSON.parse(hostActions);
          } catch (e) {
            message.error('本地或目标主机动作 JSON 语法解析失败，请检查格式。');
            setLoading(false);
            return;
          }
        }
        
        const params = {
          id: store.record.id,
          name,
          extend,
          description,
          config_data: configData
        };

        http.post('/api/app/deploy/template/', params)
          .then(() => {
            message.success('操作成功');
            store.formVisible = false;
            store.fetchRecords();
          })
          .finally(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }

  // 渲染初始值
  const initialValues = {
    name: store.record.name,
    extend: store.record.extend || '3',
    description: store.record.description,
    
    // 常规发布初始值
    dst_dir: store.configData.dst_dir || '/var/www/{APP_KEY}',
    dst_repo: store.configData.dst_repo || '/data/spug/repos/{APP_KEY}',
    versions: store.configData.versions || 10,
    filter_rule_type: store.configData.filter_rule ? store.configData.filter_rule.type : 'exclude',
    
    // K8s 初始值
    workload_type: store.configData.workload_type || 'Deployment',
    workload_namespace: store.configData.workload_namespace || 'default',
    workload_name: store.configData.workload_name || '{APP_KEY}',
    container_name: store.configData.container_name || '{APP_KEY}',
    image_repo: store.configData.image_repo || 'registry.cn-hangzhou.aliyuncs.com/mycorp/{APP_KEY}'
  };

  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title={store.record.id ? '编辑发布模板' : '创建发布模板'}
      onCancel={() => store.formVisible = false}
      footer={[
        <Button key="cancel" onClick={() => store.formVisible = false}>取消</Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>确定</Button>
      ]}>
      <Form form={form} initialValues={initialValues} labelCol={{ span: 6 }} wrapperCol={{ span: 15 }}>
        <Form.Item required name="name" label="模板名称">
          <Input placeholder="例如: Java-Maven-K8s标准构建模板" />
        </Form.Item>
        <Form.Item required name="extend" label="发布类型">
          <Radio.Group onChange={e => setExtendType(e.target.value)}>
            <Radio.Button value="3">K8s发布</Radio.Button>
            <Radio.Button value="1">常规物理主机发布</Radio.Button>
            <Radio.Button value="2">自定义发布</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="description" label="模板备注">
          <Input.TextArea placeholder="请输入对该发版模版的简短描述信息" rows={2} />
        </Form.Item>

        {/* 1. K8s 发布模版配置 */}
        {extendType === '3' && (
          <>
            <div style={{ borderTop: '1px dashed #e8e8e8', margin: '20px 0', padding: '10px 0', color: '#1890ff', fontWeight: 'bold' }}>
              K8s 容器参数模板 (支持占位符: {'{APP_KEY}'}, {'{APP_NAME}'})
            </div>
            <Form.Item required name="workload_type" label="工作负载类型">
              <Radio.Group buttonStyle="solid">
                <Radio.Button value="Deployment">Deployment</Radio.Button>
                <Radio.Button value="StatefulSet">StatefulSet</Radio.Button>
                <Radio.Button value="DaemonSet">DaemonSet</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item required name="workload_namespace" label="命名空间">
              <Input placeholder="默认值: default" />
            </Form.Item>
            <Form.Item required name="workload_name" label="工作负载名称" tooltip="支持占位符 {APP_KEY} 会自动翻译为应用唯一标识符">
              <Input placeholder="输入工作负载名称，支持占位符" />
            </Form.Item>
            <Form.Item required name="container_name" label="容器名称" tooltip="支持占位符 {APP_KEY}">
              <Input placeholder="输入容器名称，支持占位符" />
            </Form.Item>
            <Form.Item required name="image_repo" label="镜像仓库地址" tooltip="支持占位符 {APP_KEY}">
              <Input placeholder="例如: registry.cn-hangzhou.aliyuncs.com/mycorp/{APP_KEY}" />
            </Form.Item>
          </>
        )}

        {/* 2. 常规发布模版配置 */}
        {extendType === '1' && (
          <>
            <div style={{ borderTop: '1px dashed #e8e8e8', margin: '20px 0', padding: '10px 0', color: '#1890ff', fontWeight: 'bold' }}>
              常规主机发布参数模板 (支持占位符: {'{APP_KEY}'}, {'{APP_NAME}'})
            </div>
            <Form.Item required name="dst_dir" label="发布目标路径">
              <Input placeholder="例如: /var/www/{APP_KEY}" />
            </Form.Item>
            <Form.Item required name="dst_repo" label="发布历史版本仓库路径">
              <Input placeholder="例如: /data/spug/repos/{APP_KEY}" />
            </Form.Item>
            <Form.Item required name="versions" label="历史保留版本数">
              <Input type="number" placeholder="默认保留 10 个历史版本" />
            </Form.Item>
            
            {/* 视觉升级后的文件过滤规则与 ACEditor */}
            <Form.Item 
              label="文件过滤规则" 
              tooltip="支持配置打包传输至目标服务器时，在本地需要排除或包含的文件/目录路径模式。">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <Form.Item name="filter_rule_type" noStyle>
                    <Radio.Group>
                      <Radio.Button value="include">包含</Radio.Button>
                      <Radio.Button value="exclude">排除</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </div>
                <ACEditor
                  mode="text"
                  theme="tomorrow"
                  width="100%"
                  height="120px"
                  placeholder="请输入过滤规则内容，一行一个路径模式。例如:&#10;.git&#10;.idea&#10;node_modules"
                  value={filterRuleData}
                  onChange={v => setFilterRuleData(v)}
                  style={{ border: '1px solid #e8e8e8' }} />
              </div>
            </Form.Item>
          </>
        )}

        {/* 3. 自定义发布动作模板配置 */}
        {extendType === '2' && (
          <>
            <div style={{ borderTop: '1px dashed #e8e8e8', margin: '20px 0', padding: '10px 0', color: '#1890ff', fontWeight: 'bold' }}>
              自定义发布动作步骤模板 (请提供 JSON 格式配置)
            </div>
            <Form.Item
              label="本地执行动作 (server_actions)"
              extra="在部署主机上执行的脚本或动作步骤列表，以 JSON 格式提供。">
              <ACEditor
                mode="json"
                theme="tomorrow"
                width="100%"
                height="120px"
                placeholder="例如: []"
                value={serverActions}
                onChange={v => setServerActions(v)}
                style={{ border: '1px solid #e8e8e8' }} />
            </Form.Item>
            <Form.Item
              label="目标主机动作 (host_actions)"
              style={{ marginTop: 12 }}
              extra="在目标目标服务器上执行的动作步骤列表，以 JSON 格式提供。">
              <ACEditor
                mode="json"
                theme="tomorrow"
                width="100%"
                height="120px"
                placeholder="例如: []"
                value={hostActions}
                onChange={v => setHostActions(v)}
                style={{ border: '1px solid #e8e8e8' }} />
            </Form.Item>
          </>
        )}

        {/* 4. 共享的代码检出 Hook 配置 */}
        {extendType !== '2' && (
          <>
            <div style={{ borderTop: '1px dashed #e8e8e8', margin: '20px 0', padding: '10px 0', color: '#1890ff', fontWeight: 'bold' }}>
              代码检出 Hook 模板 (在 PipelineX 本地执行)
            </div>
            <Form.Item
              label="代码检出前执行"
              extra="代码拉取完毕后但尚未切换版本前执行，通常留空。">
              <ACEditor
                mode="sh"
                theme="tomorrow"
                width="100%"
                height="120px"
                placeholder="输入要预置的构建前命令"
                value={hookPreServer}
                onChange={v => setHookPreServer(cleanCommand(v))}
                style={{ border: '1px solid #e8e8e8' }} />
            </Form.Item>
            <Form.Item
              label="代码检出后执行"
              style={{ marginTop: 12 }}
              extra="代码版本切换成功后且在 Dockerfile 镜像打包前执行，常用于编译打包 (如 npm run build 或 mvn package)。">
              <ACEditor
                mode="sh"
                theme="tomorrow"
                width="100%"
                height="120px"
                placeholder="输入要预置的编译构建命令，如 npm run build"
                value={hookPostServer}
                onChange={v => setHookPostServer(cleanCommand(v))}
                style={{ border: '1px solid #e8e8e8' }} />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
});

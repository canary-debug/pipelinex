/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, message } from 'antd';
import http from 'libs/http';
import store from './store';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    http.post('/api/config/environment/', formData)
      .then(res => {
        message.success('操作成功');
        store.formVisible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  const record = store.record.has_k8s_config ? { ...store.record, k8s_config: '******' } : store.record;

  return (
    <Modal
      visible
      maskClosable={false}
      title={store.record.id ? '编辑环境' : '新建环境'}
      onCancel={() => store.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={record} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required name="name" label="环境名称">
          <Input placeholder="请输入环境名称，例如：开发环境"/>
        </Form.Item>
        <Form.Item
          required
          name="key"
          label="唯一标识符"
          tooltip="环境的唯一标识符，会在配置中心API中使用，具体请参考官方文档。"
          extra="可以由字母、数字和下划线组成。">
          <Input placeholder="请输入唯一标识符，例如：dev"/>
        </Form.Item>
        <Form.Item name="k8s_config" tooltip="Kubernetes集群配置文件内容" label="Kubeconfig" extra="如果此环境启用 Kubernetes 发布，请粘贴集群的 kubeconfig 凭证。强烈建议在本地将其转换为 Base64 编码文本（单行乱码）后再粘贴至此，以防止屏幕明文泄露。">
          <Input.TextArea rows={6} placeholder="请输入 Kubeconfig 凭证内容 (支持 YAML 明文或 Base64 混淆文本)"/>
        </Form.Item>
        <Form.Item name="desc" label="备注信息">
          <Input.TextArea placeholder="请输入备注信息"/>
        </Form.Item>
      </Form>
    </Modal>
  )
})

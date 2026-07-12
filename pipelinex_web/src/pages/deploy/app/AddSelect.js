/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { BuildOutlined, OrderedListOutlined, CloudOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Modal, Card, Tabs, Form, Select, Input, Button, message, Spin, Row, Col } from 'antd';
import store from './store';
import envStore from 'pages/config/environment/store';
import http from 'libs/http';
import styles from './index.module.css';

export default observer(function AddSelect() {
  const [activeTab, setActiveTab] = useState('custom');
  const [templates, setTemplates] = useState([]);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    setLoadingTpl(true);
    http.get('/api/app/deploy/template/')
      .then(res => setTemplates(res))
      .finally(() => setLoadingTpl(false));
      
    if (envStore.records.length === 0) {
      envStore.fetchRecords();
    }
  }, []);

  const switchExt1 = () => {
    store.addVisible = false;
    store.ext1Visible = true;
    store.deploy = {
      git_type: 'branch',
      is_audit: false,
      rst_notify: {mode: '0'},
      host_ids: [],
      filter_rule: {type: 'exclude', data: ''}
    };
  };

  const switchExt2 = () => {
    store.addVisible = false;
    store.ext2Visible = true;
    store.deploy = {
      is_audit: false,
      rst_notify: {mode: '0'},
      host_ids: [],
      host_actions: [],
      server_actions: []
    };
  };

  const switchExt3 = () => {
    store.addVisible = false;
    store.ext3Visible = true;
    store.deploy = {
      is_audit: false,
      rst_notify: {mode: '0'},
      host_ids: [],
      workload_type: 'Deployment',
      workload_name: '',
      container_name: '',
      git_repo: '',
      image_repo: ''
    };
  };

  const handleSelectTemplate = (tpl) => {
    setSelectedTpl(tpl);
    setCreateVisible(true);
    form.resetFields();
  };

  const handleTemplateCreate = () => {
    setCreateLoading(true);
    form.validateFields()
      .then(values => {
        const params = {
          app_id: store.app_id,
          env_id: values.env_id,
          template_id: selectedTpl.id,
          git_repo: values.git_repo
        };
        http.post('/api/app/deploy/template/create/', params)
          .then(() => {
            message.success('一键创建成功');
            setCreateVisible(false);
            store.addVisible = false;
            // 刷新发布配置列表
            store.loadDeploys(store.app_id);
          })
          .finally(() => setCreateLoading(false));
      })
      .catch(() => setCreateLoading(false));
  };

  // 已经配置过的环境，需置灰
  const configuredEnvIds = store.currentRecord['deploys'] 
    ? store.currentRecord['deploys'].map(x => x.env_id) 
    : [];

  const modalStyle = {
    backgroundColor: '#f0f2f5',
    padding: '24px'
  };

  return (
    <>
      <Modal
        visible
        width={960}
        maskClosable={false}
        title="配置应用发布"
        onCancel={() => store.addVisible = false}
        footer={null}
        bodyStyle={modalStyle}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} size="large" centered>
          <Tabs.TabPane tab="基础创建" key="custom">
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '40px 0' }}>
              <Card
                style={{ width: 280, cursor: 'pointer' }}
                bodyStyle={{ display: 'flex' }}
                onClick={switchExt1}>
                <div style={{ marginRight: 16 }}>
                  <OrderedListOutlined style={{ fontSize: 36, color: '#1890ff' }} />
                </div>
                <div>
                  <div className={styles.cardTitle}>常规发布</div>
                  <div className={styles.cardDesc}>
                    由 PipelineX 来控制发布的主流程，你可以通过添加钩子脚本来执行额外的自定义操作。
                  </div>
                </div>
              </Card>
              <Card
                style={{ width: 280, cursor: 'pointer' }}
                bodyStyle={{ display: 'flex' }}
                onClick={switchExt2}>
                <div style={{ marginRight: 16 }}>
                  <BuildOutlined style={{ fontSize: 36, color: '#1890ff' }} />
                </div>
                <div>
                  <div className={styles.cardTitle}>自定义发布</div>
                  <div className={styles.cardDesc}>
                    你可以完全自己定义发布的所有流程和操作，PipelineX 负责按顺序依次执行你记录 of 动作。
                  </div>
                </div>
              </Card>
              <Card
                style={{ width: 280, cursor: 'pointer' }}
                bodyStyle={{ display: 'flex' }}
                onClick={switchExt3}>
                <div style={{ marginRight: 16 }}>
                  <CloudOutlined style={{ fontSize: 36, color: '#1890ff' }} />
                </div>
                <div>
                  <div className={styles.cardTitle}>K8s发布</div>
                  <div className={styles.cardDesc}>
                    通过 K8s API 自动滚动更新容器镜像。支持代码编译自动构建镜像并推送远程仓库。
                  </div>
                </div>
              </Card>
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="发版模板市场" key="template">
            <Spin spinning={loadingTpl}>
              <div style={{ minHeight: 200, padding: '24px 0' }}>
                {templates.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#999', paddingTop: 60 }}>
                    <AppstoreOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 12 }} />
                    <p>模板市场暂无可用模板，请先前往“发版模板”页面定义。</p>
                  </div>
                ) : (
                  <Row gutter={[16, 16]}>
                    {templates.map(tpl => (
                      <Col span={8} key={tpl.id}>
                        <Card
                          hoverable
                          style={{ borderRadius: 6, border: '1px solid #e8e8e8' }}
                          bodyStyle={{ padding: 18 }}
                          onClick={() => handleSelectTemplate(tpl)}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{
                              width: 36,
                              height: 36,
                              borderRadius: 4,
                              backgroundColor: tpl.extend === '3' ? '#e6f7ff' : (tpl.extend === '2' ? '#f6ffed' : '#fffbe6'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 12
                            }}>
                              {tpl.extend === '3' ? (
                                <CloudOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                              ) : (tpl.extend === '2' ? (
                                <BuildOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                              ) : (
                                <OrderedListOutlined style={{ fontSize: 20, color: '#faad14' }} />
                              ))}
                            </div>
                            <div style={{ fontWeight: 'bold', fontSize: 15, color: '#333' }}>{tpl.name}</div>
                          </div>
                          <div style={{ color: '#666', fontSize: 13, height: 40, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {tpl.description || '一键快速构建与发版。'}
                          </div>
                          <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 12, paddingTop: 8, textAlign: 'right', fontSize: 12, color: '#999' }}>
                            提供者: 系统管理员
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </div>
            </Spin>
          </Tabs.TabPane>
        </Tabs>
      </Modal>

      {/* 一键极简创建配置表单 */}
      {createVisible && (
        <Modal
          visible
          width={500}
          maskClosable={false}
          title={`使用模板创建：${selectedTpl ? selectedTpl.name : ''}`}
          onCancel={() => setCreateVisible(false)}
          confirmLoading={createLoading}
          onOk={handleTemplateCreate}>
          <Form form={form} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }}>
            <Form.Item required name="env_id" label="发布环境" rules={[{ required: true, message: '请选择环境' }]}>
              <Select placeholder="选择要部署的目标发布环境">
                {envStore.records.map(item => (
                  <Select.Option disabled={configuredEnvIds.includes(item.id)} value={item.id} key={item.id}>
                    {item.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="git_repo" label="Git 仓库地址" rules={[{ required: true, message: '请输入 Git 仓库地址' }]} extra="可选填，用于在发版时拉取代码自动触发编译和镜像构建。">
              <Input placeholder="例如: git@gitee.com:user/repo.git" />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </>
  );
});

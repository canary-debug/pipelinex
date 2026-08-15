/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { BuildOutlined, OrderedListOutlined, CloudOutlined } from '@ant-design/icons';
import { Modal, Card } from 'antd';
import store from './store';
import styles from './index.module.css';

export default observer(function AddSelect() {
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

  const modalStyle = {
    backgroundColor: '#f0f2f5',
    padding: '24px'
  };

  return (
    <Modal
      visible
      width={960}
      maskClosable={false}
      title="配置应用发布"
      onCancel={() => store.addVisible = false}
      footer={null}
      bodyStyle={modalStyle}>
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
    </Modal>
  );
});

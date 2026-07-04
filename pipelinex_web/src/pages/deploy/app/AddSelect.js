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

@observer
class AddSelect extends React.Component {
  switchExt1 = () => {
    store.addVisible = false;
    store.ext1Visible = true;
    store.deploy = {
      git_type: 'branch',
      is_audit: false,
      rst_notify: {mode: '0'},
      host_ids: [],
      filter_rule: {type: 'exclude', data: ''}
    }
  };

  switchExt2 = () => {
    store.addVisible = false;
    store.ext2Visible = true;
    store.deploy = {
      is_audit: false,
      rst_notify: {mode: '0'},
      host_ids: [],
      host_actions: [],
      server_actions: []
    }
  };

  switchExt3 = () => {
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
    }
  };

  render() {
    const modalStyle = {
      display: 'flex',
      justifyContent: 'space-around',
      backgroundColor: 'rgba(240, 242, 245, 1)',
      padding: '80px 0'
    };

    return (
      <Modal
        visible
        width={1000}
        maskClosable={false}
        title="选择发布方式"
        bodyStyle={modalStyle}
        onCancel={() => store.addVisible = false}
        footer={null}>
        <Card
          style={{width: 280, cursor: 'pointer'}}
          bodyStyle={{display: 'flex'}}
          onClick={this.switchExt1}>
          <div style={{marginRight: 16}}>
            <OrderedListOutlined style={{fontSize: 36, color: '#1890ff'}} />
          </div>
          <div>
            <div className={styles.cardTitle}>常规发布</div>
            <div className={styles.cardDesc}>
              由 PipelineX 来控制发布的主流程，你可以通过添加钩子脚本来执行额外的自定义操作。
            </div>
          </div>
        </Card>
        <Card
          style={{width: 280, cursor: 'pointer'}}
          bodyStyle={{display: 'flex'}}
          onClick={this.switchExt2}>
          <div style={{marginRight: 16}}>
            <BuildOutlined style={{fontSize: 36, color: '#1890ff'}} />
          </div>
          <div>
            <div className={styles.cardTitle}>自定义发布</div>
            <div className={styles.cardDesc}>
              你可以完全自己定义发布的所有流程和操作，PipelineX 负责按顺序依次执行你记录的动作。
            </div>
          </div>
        </Card>
        <Card
          style={{width: 280, cursor: 'pointer'}}
          bodyStyle={{display: 'flex'}}
          onClick={this.switchExt3}>
          <div style={{marginRight: 16}}>
            <CloudOutlined style={{fontSize: 36, color: '#1890ff'}} />
          </div>
          <div>
            <div className={styles.cardTitle}>K8s发布</div>
            <div className={styles.cardDesc}>
              通过 K8s API 自动滚动更新容器镜像。支持代码编译自动构建镜像并推送远程仓库。
            </div>
          </div>
        </Card>
      </Modal>
    )
  }
}

export default AddSelect

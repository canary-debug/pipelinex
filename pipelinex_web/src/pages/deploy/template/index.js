/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';
import { Table, Button, Space, Popconfirm, Badge, message } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { SearchForm, AuthDiv, Breadcrumb } from 'components';
import ComForm from './Form';
import store from './store';
import http from 'libs/http';

export default observer(function TemplateIndex() {
  useEffect(() => {
    store.fetchRecords();
  }, []);

  function handleDelete(id) {
    http.delete('/api/app/deploy/template/', { params: { id } })
      .then(() => {
        message.success('删除成功');
        store.fetchRecords();
      });
  }

  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: '发布类型',
      dataIndex: 'extend',
      key: 'extend',
      render: (val) => {
        if (val === '3') {
          return <Badge status="processing" text="K8s发布" />;
        }
        return <Badge status="warning" text="常规物理机发布" />;
      }
    },
    {
      title: '模板描述',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || <span style={{ color: '#ccc' }}>无描述</span>
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => store.showForm(record)}>编辑</Button>
          <Popconfirm title="确定要删除这个模板吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <AuthDiv auth="deploy.app.view">
      <Breadcrumb>
        <Breadcrumb.Item>首页</Breadcrumb.Item>
        <Breadcrumb.Item>应用发布</Breadcrumb.Item>
        <Breadcrumb.Item>发版模板</Breadcrumb.Item>
      </Breadcrumb>
      
      <SearchForm>
        <SearchForm.Item span={24} style={{ textAlign: 'right', marginBottom: 0 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => store.showForm()}>
            创建模板
          </Button>
        </SearchForm.Item>
      </SearchForm>

      <Table
        rowKey="id"
        loading={store.isFetching}
        dataSource={store.records}
        columns={columns}
        style={{ marginTop: 16 }}
      />

      {store.formVisible && <ComForm />}
    </AuthDiv>
  );
});

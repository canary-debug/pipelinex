/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';
import { Table, Button, Space, Popconfirm, Badge, message, Upload } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, UploadOutlined, ExportOutlined } from '@ant-design/icons';
import { SearchForm, AuthDiv, Breadcrumb } from 'components';
import ComForm from './Form';
import store from './store';
import http from 'libs/http';

export default observer(function TemplateIndex() {
  useEffect(() => {
    console.log('>>> [调试] 正在加载最新版发版模板页面，包含导入/导出功能 <<<');
    store.fetchRecords();
  }, []);

  function handleDelete(id) {
    http.delete('/api/app/deploy/template/', { params: { id } })
      .then(() => {
        message.success('删除成功');
        store.fetchRecords();
      });
  }

  function handleExport(record) {
    const exportData = {
      name: record.name,
      extend: record.extend,
      description: record.description,
      config_data: record.config_data
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${record.name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleImport(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.name || !data.extend || !data.config_data) {
          message.error('无效的模板配置文件结构，必须包含 name、extend 与 config_data 字段。');
          return;
        }
        http.post('/api/app/deploy/template/', data)
          .then(() => {
            message.success('导入发布模板成功');
            store.fetchRecords();
          });
      } catch (err) {
        message.error('JSON 文件解析失败，请检查文件格式是否正确。');
      }
    };
    reader.readAsText(file);
    return false;
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
        if (val === '2') {
          return <Badge status="success" text="自定义发布" />;
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
          <Button type="link" icon={<ExportOutlined />} onClick={() => handleExport(record)}>导出</Button>
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
          <Upload
            accept=".json"
            showUploadList={false}
            beforeUpload={handleImport}>
            <Button icon={<UploadOutlined />} style={{ marginRight: 8 }}>
              导入模板
            </Button>
          </Upload>
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

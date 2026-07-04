/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { SyncOutlined, LoadingOutlined } from '@ant-design/icons';
import { Modal, Form, Input, DatePicker, message, Button, Select } from 'antd';
import { http, history } from 'libs';
import store from './store';
import lds from 'lodash';

function NoVersions() {
  return (
    <div>
      <span>未找到符合条件的版本，</span>
      <Button
        type="link"
        style={{padding: 0}}
        onClick={() => history.push('/deploy/repository')}>
        去构建新版本？</Button>
    </div>
  )
}

export default observer(function Ext3Form() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(store.record.plan);

  const [fetching, setFetching] = useState(false);
  const [git_type, setGitType] = useState();
  const [extra, setExtra] = useState([]);
  const [extra1, setExtra1] = useState();
  const [extra2, setExtra2] = useState();
  const [versions, setVersions] = useState({});
  const [repositories, setRepositories] = useState([]);

  useEffect(() => {
    const {git_repo} = store.record;
    if (git_repo) {
      fetchVersions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fetchVersions() {
    setFetching(true);
    const deploy_id = store.record.deploy_id
    const p1 = http.get(`/api/app/deploy/${deploy_id}/versions/`, {timeout: 300000})
    const p2 = http.get('/api/repository/', {params: {deploy_id}})
    Promise.all([p1, p2])
      .then(([res1, res2]) => {
        if (!versions.branches) _initial(res1, res2)
        setVersions(res1)
        setRepositories(res2)
      })
      .finally(() => setFetching(false))
  }

  function _setDefault(type, new_extra, new_versions, new_repositories) {
    const now_extra = new_extra || extra;
    const now_versions = new_versions || versions;
    const now_repositories = new_repositories || repositories;
    const {branches, tags} = now_versions;
    if (type === 'branch') {
      let [branch, commit] = [now_extra[1], null];
      if (branches[branch]) {
        commit = lds.get(branches[branch], '0.id')
      } else {
        branch = lds.get(Object.keys(branches), 0)
        commit = lds.get(branches, [branch, 0, 'id'])
      }
      setExtra1(branch)
      setExtra2(commit)
    } else if (type === 'tag') {
      setExtra1(lds.get(Object.keys(tags), 0))
      setExtra2(null)
    } else {
      setExtra1(lds.get(now_repositories, '0.id'))
      setExtra2(null)
    }
  }

  function _initial(versions, repositories) {
    const {branches, tags} = versions;
    if (branches && tags) {
      for (let item of store.records) {
        if (item.extra && item.deploy_id === store.record.deploy_id) {
          const type = item.extra[0];
          setExtra(item.extra);
          setGitType(type);
          return _setDefault(type, item.extra, versions, repositories);
        }
      }
      setGitType('branch');
      const branch = lds.get(Object.keys(branches), 0);
      const commit = lds.get(branches, [branch, 0, 'id'])
      setExtra1(branch);
      setExtra2(commit)
    }
  }

  function switchType(v) {
    setGitType(v);
    _setDefault(v)
  }

  function switchExtra1(v) {
    setExtra1(v)
    if (git_type === 'branch') {
      setExtra2(lds.get(versions.branches[v], '0.id'))
    }
  }

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    formData['type'] = store.record.type;
    formData['deploy_id'] = store.record.deploy_id;
    if (plan) formData.plan = plan.format('YYYY-MM-DD HH:mm:00');
    
    if (store.record.git_repo) {
      formData['extra'] = [git_type, extra1, extra2];
    }

    http.post('/api/deploy/request/ext3/', formData)
      .then(res => {
        message.success('操作成功');
        store.ext3Visible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  const {git_repo} = store.record;
  const {branches, tags} = versions;
  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title={`${store.record.id ? '编辑' : '新建'} K8s 发布申请`}
      onCancel={() => store.ext3Visible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 5}} wrapperCol={{span: 17}}>
        <Form.Item required name="name" label="申请标题">
          <Input placeholder="请输入发布申请标题"/>
        </Form.Item>
        {!git_repo && (
          <Form.Item
            required
            name="version"
            label="发布镜像 Tag"
            tooltip="请输入要发布的容器镜像标签，例如：v1.0.0。由于没有配置 Git，发布镜像 Tag 为必填项。">
            <Input placeholder="请输入要发布的容器镜像标签 tag"/>
          </Form.Item>
        )}
        {git_repo && (
          <>
            <Form.Item required label="选择版本" style={{marginBottom: 12}} extra={<span>
                从 Git 拉取版本可能需要些时间，请耐心等待。
              </span>}>
              <Input.Group compact>
                <Select value={git_type} style={{width: 100}} onChange={switchType}>
                  <Select.Option value="branch">分支</Select.Option>
                  <Select.Option value="tag">标签</Select.Option>
                  <Select.Option value="repository">构建版本</Select.Option>
                </Select>
                {git_type === 'branch' && (
                  <>
                    <Select
                      showSearch
                      value={extra1}
                      style={{width: 240}}
                      placeholder="选择分支"
                      onChange={switchExtra1}>
                      {Object.keys(branches || {}).map(item => (
                        <Select.Option key={item} value={item}>{item}</Select.Option>
                      ))}
                    </Select>
                    <Select
                      value={extra2}
                      style={{width: 'calc(100% - 340px)'}}
                      placeholder="选择提交"
                      onChange={v => setExtra2(v)}>
                      {(lds.get(branches, extra1) || []).map(item => (
                        <Select.Option key={item.id} value={item.id}>{item.author}: {item.message}</Select.Option>
                      ))}
                    </Select>
                  </>
                )}
                {git_type === 'tag' && (
                  <Select
                    showSearch
                    value={extra1}
                    style={{width: 'calc(100% - 100px)'}}
                    placeholder="选择标签"
                    onChange={v => setExtra1(v)}>
                    {Object.keys(tags || {}).map(item => (
                      <Select.Option key={item} value={item}>{item}</Select.Option>
                    ))}
                  </Select>
                )}
                {git_type === 'repository' && (
                  <Select
                    value={extra1}
                    style={{width: 'calc(100% - 100px)'}}
                    placeholder="选择构建版本"
                    notFoundContent={<NoVersions/>}
                    onChange={v => setExtra1(v)}>
                    {repositories.map(item => (
                      <Select.Option key={item.id} value={item.id}>{item.version} ({item.created_at})</Select.Option>
                    ))}
                  </Select>
                )}
              </Input.Group>
            </Form.Item>
            {fetching && (
              <Form.Item wrapperCol={{span: 17, offset: 5}} style={{marginBottom: 12}}>
                <LoadingOutlined/> 正在从 Git 获取分支与标签...
              </Form.Item>
            )}
            {!fetching && lds.isEmpty(versions.branches) && (
              <Form.Item wrapperCol={{span: 17, offset: 5}} style={{marginBottom: 12}}>
                <span style={{color: '#ff4d4f'}}>获取版本失败，</span>
                <Button type="link" style={{padding: 0}} onClick={fetchVersions} icon={<SyncOutlined/>}>重新获取</Button>
              </Form.Item>
            )}
          </>
        )}
        <Form.Item label="发布时间" tooltip="如需定时发布，请在此设定执行时间。若不设定则立即执行。">
          <DatePicker
            showTime
            style={{width: '100%'}}
            format="YYYY-MM-DD HH:mm:00"
            placeholder="立即发布"
            value={plan}
            onChange={v => setPlan(v)}/>
        </Form.Item>
        <Form.Item name="desc" label="备注信息">
          <Input.TextArea placeholder="请输入备注信息"/>
        </Form.Item>
      </Form>
    </Modal>
  )
})

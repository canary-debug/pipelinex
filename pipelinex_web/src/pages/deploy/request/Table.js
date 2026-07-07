/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { BranchesOutlined, BuildOutlined, TagOutlined, PlusOutlined, TagsOutlined } from '@ant-design/icons';
import { Radio, Modal, Popover, Tag, Popconfirm, Tooltip, message } from 'antd';
import { http, hasPermission } from 'libs';
import { Action, AuthButton, TableCard } from 'components';
import S from './index.module.less';
import store from './store';
import moment from 'moment';

function DeployConfirm() {
  return (
    <div>
      <div>确认发布方式</div>
      <div style={{color: '#999', fontSize: 12}}>补偿：仅发布上次发布失败的主机。</div>
      <div style={{color: '#999', fontSize: 12}}>全量：再次发布所有主机。</div>
    </div>
  )
}

function ComTable() {
  const columns = [{
    title: '申请标题',
    className: S.min180,
    render: info => (
      <div>
        {info.type === '2' && <Tooltip title="回滚发布"><Tag color="#f50">R</Tag></Tooltip>}
        {info.type === '3' && <Tooltip title="Webhook触发"><Tag color="#87d068">A</Tag></Tooltip>}
        {info.plan && <Tooltip title={`定时发布（${info.plan}）`}> <Tag color="#108ee9">P</Tag></Tooltip>}
        {info.name}
      </div>
    )
  }, {
    title: '应用',
    className: S.min120,
    dataIndex: 'app_name',
  }, {
    title: '发布环境',
    className: S.min120,
    dataIndex: 'env_name',
  }, {
    title: '版本',
    className: S.min155,
    render: info => {
      if (info['app_extend'] === '1') {
        const [ext1] = info.extra || info.rep_extra;
        switch (ext1) {
          case 'branch':
            return <div><BranchesOutlined/> {info.version}</div>
          case 'tag':
            return <div><TagOutlined/> {info.version}</div>
          default:
            return <div><TagsOutlined/> {info.version}</div>
        }
      } else {
        return (
          <div><BuildOutlined/> {info.version}</div>
        )
      }
    }
  }, {
    title: '申请人',
    className: S.min120,
    dataIndex: 'created_by_user',
    hide: true
  }, {
    title: '申请时间',
    className: S.min120,
    dataIndex: 'created_at',
    sorter: (a, b) => a['created_at'].localeCompare(b['created_at']),
    render: v => <Tooltip title={v}>{v ? moment(v).fromNow() : null}</Tooltip>,
    hide: true
  }, {
    title: '审核人',
    className: S.min120,
    dataIndex: 'approve_by_user',
    hide: true
  }, {
    title: '审核时间',
    className: S.min120,
    dataIndex: 'approve_at',
    hide: true
  }, {
    title: '发布人',
    className: S.min120,
    dataIndex: 'do_by_user',
    hide: true
  }, {
    title: '发布时间',
    className: S.min120,
    dataIndex: 'do_at',
  }, {
    title: '备注',
    className: S.min120,
    dataIndex: 'desc',
  }, {
    title: '状态',
    fixed: 'right',
    className: S.min120,
    render: info => {
      if (info.status === '-1' && info.reason) {
        return <Popover title="驳回原因:" content={info.reason}>
          <Tag color="#f50">{info['status_alias']}</Tag>
        </Popover>
      } else if (info.status === '1' && info.reason) {
        return <Popover title="审核意见:" content={info.reason}>
          <Tag color="#87d068">{info['status_alias']}</Tag>
        </Popover>
      } else if (info.status === '2') {
        return <Tag color="orange">{info['status_alias']}</Tag>
      } else if (info.status === '3') {
        return <Tag color="green">{info['status_alias']}</Tag>
      } else if (info.status === '-3') {
        return <Tag color="red">{info['status_alias']}</Tag>
      } else {
        return <Tag color="blue">{info['status_alias']}</Tag>
      }
    }
  }, {
    title: '操作',
    fixed: 'right',
    className: S.min220,
    render: info => {
      const actionItems = [];
      switch (info.status) {
        case '-3':
          actionItems.push(<Action.Button key="read" auth="deploy.request.do" onClick={() => store.readConsole(info)}>查看</Action.Button>);
          actionItems.push(<DoAction key="do" info={info}/>);
          if (info.visible_rollback) {
            actionItems.push(<Action.Button key="rollback" auth="deploy.request.do" onClick={() => store.rollback(info)}>回滚</Action.Button>);
          }
          break;
        case '3':
          actionItems.push(<Action.Button key="read" auth="deploy.request.do" onClick={() => store.readConsole(info)}>查看</Action.Button>);
          if (info.visible_rollback) {
            actionItems.push(<Action.Button key="rollback" auth="deploy.request.do" onClick={() => store.rollback(info)}>回滚</Action.Button>);
          }
          break;
        case '-1':
          actionItems.push(<Action.Button key="edit" auth="deploy.request.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>);
          actionItems.push(<Action.Button key="del" auth="deploy.request.del" onClick={() => handleDelete(info)}>删除</Action.Button>);
          break;
        case '0':
          actionItems.push(<Action.Button key="approve" auth="deploy.request.approve" onClick={() => store.showApprove(info)}>审核</Action.Button>);
          actionItems.push(<Action.Button key="edit" auth="deploy.request.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>);
          actionItems.push(<Action.Button key="del" auth="deploy.request.del" onClick={() => handleDelete(info)}>删除</Action.Button>);
          break;
        case '1':
          actionItems.push(<DoAction key="do" info={info}/>);
          actionItems.push(<Action.Button key="del" auth="deploy.request.del" onClick={() => handleDelete(info)}>删除</Action.Button>);
          break;
        case '2':
          actionItems.push(<Action.Button key="read" auth="deploy.request.do" onClick={() => store.readConsole(info)}>查看</Action.Button>);
          break;
      }
      actionItems.push(<Action.Button key="share" onClick={() => handleShare(info)}>分享</Action.Button>);

      return (
        <Action>
          {actionItems}
        </Action>
      );
    }
  }];

  function DoAction(props) {
    const {host_ids, fail_host_ids} = props.info;
    return (
      <Popconfirm
        title={<DeployConfirm/>}
        okText="全量"
        cancelText="补偿"
        cancelButtonProps={{disabled: [0, host_ids.length].includes(fail_host_ids.length)}}
        onConfirm={e => handleDeploy(e, props.info, 'all')}
        onCancel={e => handleDeploy(e, props.info, 'fail')}>
        <Action.Button auth="deploy.request.do">发布</Action.Button>
      </Popconfirm>
    )
  }

  function handleDelete(info) {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${info['name']}】?`,
      onOk: () => {
        return http.delete('/api/deploy/request/', {params: {id: info.id}})
          .then(() => {
            message.success('删除成功');
            store.fetchRecords()
          })
      }
    })
  }

  function handleDeploy(e, info, mode) {
    info.mode = mode
    store.showConsole(info);
  }

  function handleShare(info) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?env_id=${info.env_id}&app_id=${info.app_id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => message.success('已复制分享链接到剪切板，发送给审核人即可快捷访问！'))
        .catch(err => {
          console.error('复制链接失败', err);
          _fallbackCopy(shareUrl);
        });
    } else {
      _fallbackCopy(shareUrl);
    }
  }

  function _fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      message.success('已复制分享链接到剪切板，发送给审核人即可快捷访问！');
    } catch (err) {
      message.error('自动复制链接失败，请手动复制地址栏链接');
    }
    document.body.removeChild(textarea);
  }

  return (
    <TableCard
      tKey="dr"
      rowKey={row => row.key || row.id}
      title="申请列表"
      columns={columns}
      scroll={{x: 1500}}
      tableLayout="auto"
      loading={store.isFetching}
      dataSource={store.dataSource}
      onReload={store.fetchRecords}
      actions={[
        <AuthButton
          auth="deploy.request.add"
          type="primary"
          icon={<PlusOutlined/>}
          onClick={() => store.addVisible = true}>新建申请</AuthButton>,
        <Radio.Group value={store.f_status} onChange={e => store.f_status = e.target.value}>
          <Radio.Button value="all">全部({store.counter['all'] || 0})</Radio.Button>
          <Radio.Button value="0">待审核({store.counter['0'] || 0})</Radio.Button>
          <Radio.Button value="1">待发布({store.counter['1'] || 0})</Radio.Button>
          <Radio.Button value="3">发布成功({store.counter['3'] || 0})</Radio.Button>
          <Radio.Button value="-3">发布异常({store.counter['-3'] || 0})</Radio.Button>
          <Radio.Button value="99">其他({store.counter['99'] || 0})</Radio.Button>
        </Radio.Group>
      ]}
      pagination={{
        showSizeChanger: true,
        showLessItems: true,
        showTotal: total => `共 ${total} 条`,
        pageSizeOptions: ['10', '20', '50', '100']
      }}/>
  )
}

export default observer(ComTable)

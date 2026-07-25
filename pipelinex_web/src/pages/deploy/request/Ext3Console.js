/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useState } from 'react';
import { observer, useLocalStore } from 'mobx-react';
import { Card, Progress, Modal, Collapse, Steps, Skeleton } from 'antd';
import { ShrinkOutlined, LoadingOutlined, CloseOutlined } from '@ant-design/icons';
import OutView from './OutView';
import { http, X_TOKEN } from 'libs';
import styles from './index.module.less';
import store from './store';

function Ext3Console(props) {
  const terms = useLocalStore(() => ({}));
  const outputs = useLocalStore(() => ({local: {id: 'local'}}));
  const [sActions, setSActions] = useState([]);
  const [mini, setMini] = useState(false);
  const [visible, setVisible] = useState(true);
  const [fetching, setFetching] = useState(true);

  useEffect(props.request.mode === 'read' ? readDeploy : doDeploy, [])

  function readDeploy() {
    let socket;
    http.get(`/api/deploy/request/${props.request.id}/`)
      .then(res => {
        setSActions(res.s_actions);
        Object.assign(outputs, res.outputs);
        setTimeout(() => setFetching(false), 100)
        if (res.status === '2') {
          socket = _makeSocket(res.index)
        }
      })
    return () => socket && socket.close()
  }

  function doDeploy() {
    let socket;
    http.post(`/api/deploy/request/${props.request.id}/`, {mode: props.request.mode})
      .then(res => {
        setSActions(res.s_actions);
        Object.assign(outputs, res.outputs)
        setTimeout(() => setFetching(false), 100)
        socket = _makeSocket()
        store.fetchInfo(props.request.id)
      })
    return () => socket && socket.close()
  }

  function _makeSocket(index = 0) {
    const token = props.request.id;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/request/${token}/?x-token=${X_TOKEN}`);
    socket.onopen = () => socket.send(String(index));
    socket.onmessage = e => {
      if (e.data === 'pong') {
        socket.send(String(index))
      } else {
        index += 1;
        const {key, data, step, status} = JSON.parse(e.data);
        if (!outputs[key]) return
        if (data !== undefined) {
          outputs[key].data += data
          if (terms[key]) terms[key].write(data)
        }
        if (step !== undefined) outputs[key].step = step;
        if (status !== undefined) outputs[key].status = status;
      }
    }
    socket.onerror = () => {
      for (let key of Object.keys(outputs)) {
        outputs[key]['status'] = 'error'
        outputs[key].data = '\u001b[31mWebsocket connection failed!\u001b[0m'
        if (terms[key]) {
          terms[key].reset()
          terms[key].write('\u001b[31mWebsocket connection failed!\u001b[0m')
        }
      }
    }
    return socket
  }

  function StepItem(props) {
    let icon = null;
    if (props.step === props.item.step && props.item.status !== 'error') {
      if (props.item.id === 'local' || outputs.local.step === 100) {
        icon = <LoadingOutlined/>
      }
    }
    return <Steps.Step {...props} icon={icon}/>
  }

  function switchMiniMode() {
    setMini(true)
    setVisible(false)
  }

  function handleSetTerm(term, key) {
    if (outputs[key] && outputs[key].data) {
      term.write(outputs[key].data)
    }
    terms[key] = term
  }

  return (
    <div>
      {mini && (
        <Card
          className={styles.item}
          bodyStyle={{padding: '8px 12px'}}
          onClick={() => setVisible(true)}>
          <div className={styles.header}>
            <div className={styles.title}>{props.request.name}</div>
            <CloseOutlined onClick={() => store.showConsole(props.request, true)}/>
          </div>
          <Progress percent={(outputs.local.step + 1) * (90 / (1 + sActions.length)).toFixed(0)}
                    status={outputs.local.step === 100 ? 'success' : outputs.local.status === 'error' ? 'exception' : 'active'}/>
        </Card>
      )}
      <Modal
        visible={visible}
        width={1000}
        footer={null}
        maskClosable={false}
        className={styles.console}
        onCancel={() => store.showConsole(props.request, true)}
        title={[
          <span key="1">{props.request.name}</span>,
          <div key="2" className={styles.miniIcon} onClick={switchMiniMode}>
            <ShrinkOutlined/>
          </div>
        ]}>
        <Skeleton loading={fetching} active>
          {sActions.length > 0 && (
            <div style={{ padding: '0 8px' }}>
              <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
                <Steps size="small" current={outputs.local.step} status={outputs.local.status}>
                  <StepItem title="建立连接" item={outputs.local} step={0}/>
                  {sActions.map((item, index) => (
                    <StepItem key={index} title={item.title} item={outputs.local} step={index + 1}/>
                  ))}
                </Steps>
              </div>
              <Collapse defaultActiveKey={['0']} className={styles.collapse}>
                <Collapse.Panel header={<b>K8s 构建部署执行日志</b>}>
                  <OutView setTerm={term => handleSetTerm(term, 'local')}/>
                </Collapse.Panel>
              </Collapse>
            </div>
          )}
        </Skeleton>
      </Modal>
    </div>
  )
}

export default observer(Ext3Console)

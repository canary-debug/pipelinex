/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from "mobx";
import http from 'libs/http';

class Store {
  @observable records = [];
  @observable record = {};
  @observable idMap = {};
  @observable isFetching = false;
  @observable formVisible = false;

  @observable f_name;

  @computed get dataSource() {
    let records = this.records;
    if (this.f_name) records = records.filter(x => x.name.toLowerCase().includes(this.f_name.toLowerCase()));
    return records
  }

  fetchRecords = () => {
    this.isFetching = true;
    return http.get('/api/config/environment/')
      .then(res => {
        this.records = res;
        for (let item of res) {
          this.idMap[item.id] = item
        }
        this.checkK8sStatus();
      })
      .finally(() => this.isFetching = false)
  };

    checkK8sStatus = () => {
    http.get('/api/config/environment/check_k8s_status/').then(res => {
      if (res) {
        for (let item of this.records) {
          if (res[item.id] !== undefined) {
            item.k8s_status = res[item.id];
          }
        }
      }
    }).catch(e => console.error(e));
  };

  showForm = (info = {}) => {
    this.formVisible = true;
    this.record = info
  }
}

export default new Store()

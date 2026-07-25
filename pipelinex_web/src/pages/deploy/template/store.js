/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, action } from 'mobx';
import http from 'libs/http';

class Store {
  @observable records = [];
  @observable record = {};
  @observable configData = {};
  @observable isFetching = false;
  @observable formVisible = false;

  @action
  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/app/deploy/template/')
      .then(res => this.records = res)
      .finally(() => this.isFetching = false);
  };

  @action
  showForm = (record = {}) => {
    this.record = record;
    this.configData = record.config_data || {};
    this.formVisible = true;
  };
}

export default new Store();

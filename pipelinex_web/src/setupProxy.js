/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // 优先从环境变量中读取后端 API 地址，若没有则回退到默认的 127.0.0.1:8000
  const apiTarget = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

  app.use(createProxyMiddleware('/api/', {
    target: apiTarget,
    changeOrigin: true,
    ws: true,
    headers: {'X-Real-IP': '1.1.1.1'},
    pathRewrite: {
      '^/api': ''
    }
  }))
};

/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
const {override, addDecoratorsLegacy, addLessLoader, fixBabelImports} = require('customize-cra');

module.exports = override(
  addDecoratorsLegacy(),
  fixBabelImports('import', {
    libraryName: 'antd',
    libraryDirectory: 'es',
    style: true,
  }),
  addLessLoader({
    lessOptions: {
      javascriptEnabled: true,
      modifyVars: {
        '@primary-color': '#2563fc'
      }
    }
  }),
  (config) => {
    // 移除 Create React App 默认的 GenerateSW 插件，解决构建时 Generate service worker 'assignWith is not defined' 的兼容性报错
    if (config.plugins) {
      config.plugins = config.plugins.filter(
        (plugin) => !(plugin.constructor && plugin.constructor.name === 'GenerateSW')
      );
    }
    config.plugins.push({
      apply: (compiler) => {
        compiler.hooks.done.tap('PrintSuccessMessagePlugin', (stats) => {
          setTimeout(() => {
            console.log('\n\n\x1b[36m%s\x1b[0m', '==================================================');
            console.log('\x1b[32m%s\x1b[0m', '  🎉 PipelineX 前端开发服务器启动成功！');
            console.log('\x1b[37m%s\x1b[0m', '  您可以直接在浏览器中访问以下地址：');
            console.log('\x1b[34m%s\x1b[0m', '  👉 http://localhost:3000');
            console.log('\x1b[36m%s\x1b[0m', '==================================================\n');
          }, 100);
        });
      }
    });
    return config;
  }
);

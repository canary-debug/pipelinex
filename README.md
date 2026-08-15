<h1 align="center">PipelineX</h1>

<div align="center">

PipelineX 是面向中小型企业设计的轻量级无 Agent 自动化运维与流水线发布平台。本项目基于优秀的开源运维平台 Spug 进行二次开发与定制，延续了其轻量、优雅、开箱即用的特性，并在其基础上引入了配置外部化设计、多源数据库支持、LDAP 软依赖适配等多项深度定制化改造。

</div>

## 致敬与致谢

PipelineX 采用 [Spug](https://github.com/openspug/spug) 作为上游基石进行二次开发。在此，我们由衷致谢 **OpenSpug 团队**及其开源贡献者们。Spug 极其优雅的代码架构与卓越 of UI 交互体验为本项目提供了极佳的基础。

本项目遵循 Spug 原有的 **AGPL-3.0** 开源许可协议，延续并弘扬开源共享的社区精神。

## 特性

- **批量执行**: 主机命令在线批量执行
- **在线终端**: 主机支持浏览器在线终端登录
- **文件管理**: 主机文件在线上传下载
- **任务计划**: 灵活的在线任务计划
- **发布部署**: 支持自定义发布部署流程，支持 Git 仓库深度集成
- **配置中心**: 支持KV、文本、json等格式的配置
- **监控中心**: 支持站点、端口、进程、自定义等监控
- **报警中心**: 支持短信、邮件、钉钉、微信等报警方式
- **优雅美观**: 完美融合高质感 PipelineX 视觉主题，基于 Ant Design
- **二开适配**: 支持使用 `pipelinex.conf` 进行外部 MySQL 与 Redis 配置，彻底隔离敏感环境参数

## 环境要求

* Python 3.8+
* Django 2.2
* Node 12.14+ (已解决 Node 17+ 升级引发的加密套件兼容问题)
* React 16.11

## 安装与快速启动

请参考项目中的 `pipelinex.example.conf` 配置文件模板，创建您的本地 `pipelinex.conf` 数据库与端口配置。

### 前端依赖安装与开发模式启动
```powershell
cd pipelinex_web
npm install
npm run dev
```

### 后端依赖安装与服务启动
```powershell
cd pipelinex_api
pip install -r requirements.txt
python manage.py runserver
```


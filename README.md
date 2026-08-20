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

## 🚀 部署与运行 (Docker)

本项目推荐使用 Docker Compose 进行一键环境构建与服务部署，容器化不仅解决了依赖版本问题，也为您自动打通了 MySQL 与 Redis 服务。

### 1. 获取源码

首先克隆本项目代码到本地，再进行后续的操作：

```bash
git clone https://github.com/canary-debug/pipelinex.git
cd pipelinex
```

### 2. 准备配置文件

首先，基于项目提供的模板创建您的配置文件：

```bash
cd pipelinex_api
cp pipelinex.example.conf pipelinex.conf
```

**修改配置项**：因为采用 Docker 桥接网络部署，请修改 `pipelinex.conf`，将 `host` 地址更改为对应的容器名 `mysql` 和 `redis`，并确保 MySQL 密码与 `docker-compose.yml` 中定义的密码一致。

修改后的 `pipelinex.conf` 数据库部分示例：
```ini
[mysql]
host = mysql
port = 3306
user = root
password = root_password_here
database = pipelinex

[redis]
host = redis
port = 6379
password = 
```

### 3. 一键启动服务

进入 `example` 目录并使用 docker-compose 启动包括前后端及基础设施在内的所有容器：

```bash
cd example
docker-compose up -d
```
*注：本项目基于 Django ORM 模型驱动，无需手动或自动导入旧版本的增量 SQL 升级脚本，后续步骤会自动完成全量最新表结构的构建。*

### 4. 初始化服务 (首次运行必须)

容器启动成功后，请在宿主机终端依次执行以下命令，完成数据库结构的初始化与管理员账号创建：

**1. 初始化与更新数据库结构**：
```bash
docker exec -it pipelinex-api python manage.py updatedb
```
*(注：该命令会自动检测所有模型变更并完成最新数据表的创建，因此您**不需要**手动执行 `doc/sql` 目录下的升级脚本。)*

**2. 创建初始超级管理员账号**：
```bash
docker exec -it pipelinex-api python manage.py user add -u admin -p admin -n 管理员 -s
```
*注：`-u` 指定登录账号，`-p` 指定密码，`-n` 指定账号昵称，`-s` 标识为超级管理员。您可以自行修改初始化密码。*

### 5. 访问系统

服务初始化完成后，即可通过浏览器访问 Web 服务：

- **Web 访问入口**: [http://localhost](http://localhost) (或您的服务器 IP)
- **后端 API**: [http://localhost:8000](http://localhost:8000)

### 6. 常用操作命令

以下是一些日常维护中常用的快捷操作命令（在宿主机执行）：

- **查看后端服务实时日志**：
  ```bash
  docker logs -f pipelinex-api
  ```
- **重启后端 API 服务**：
  ```bash
  docker restart pipelinex-api
  ```
- **重置账户密码** (例如忘记 admin 密码)：
  ```bash
  docker exec -it pipelinex-api python manage.py user reset -u admin -p new_password
  ```
- **解除账户禁用状态**：
  ```bash
  docker exec -it pipelinex-api python manage.py user enable -u admin
  ```

---
欢迎提交 Issue 和 Pull Request 共建 PipelineX 生态！

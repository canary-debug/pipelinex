-- ----------------------------------------------------
-- 创建发布模版表 deploy_template 并为现有配置表关联 template_id
-- 并在建表后直接插入系统默认自带的 NodeJS, Java, Python K8s 构建模板（开箱即用）
-- ----------------------------------------------------

DROP TABLE IF EXISTS deploy_template;

CREATE TABLE deploy_template (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '模板名称',
    extend CHAR(1) NOT NULL COMMENT '发布类型: 1-常规, 2-自定义, 3-K8s',
    description VARCHAR(255) NULL COMMENT '模板描述',
    config_data TEXT NOT NULL COMMENT '模板参数配置 JSON 字符串',
    created_at VARCHAR(20) NOT NULL COMMENT '创建时间',
    updated_at VARCHAR(20) NULL COMMENT '修改时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------
-- 插入系统默认自带的 K8s 构建模板
-- ----------------------------------------------------

INSERT INTO deploy_template (name, extend, description, config_data, created_at, updated_at) VALUES 
('Node.js-K8s标准构建模板', '3', '适用于 React/Vue 前端单页应用或 Node.js 服务。在本地代码检出后执行 npm 依赖拉取与打包编译，并基于 Docker 镜像滚动更新到 K8s 集群。', '{"workload_type": "Deployment", "workload_namespace": "default", "workload_name": "{APP_KEY}", "container_name": "{APP_KEY}", "image_repo": "registry.cn-hangzhou.aliyuncs.com/mycorp/{APP_KEY}", "hook_pre_server": "", "hook_post_server": "npm install --registry=https://registry.npmmirror.com && npm run build"}', '2026-07-12 19:00:00', NULL),

('Java-Maven-K8s标准构建模板', '3', '适用于 Java Maven (Spring Boot) 微服务。代码检出后在本地执行 mvn clean package 极速编译出可执行 Jar包，并打包镜像部署至 K8s 集群。', '{"workload_type": "Deployment", "workload_namespace": "default", "workload_name": "{APP_KEY}", "container_name": "{APP_KEY}", "image_repo": "registry.cn-hangzhou.aliyuncs.com/mycorp/{APP_KEY}", "hook_pre_server": "", "hook_post_server": "mvn clean package -Dmaven.test.skip=true"}', '2026-07-12 19:00:00', NULL),

('Python-Django-K8s标准构建模板', '3', '适用于 Python Django/Flask Web 服务。无需编译，直接在工作区进行基础镜像拷贝构建，并一键部署至 K8s 集群。', '{"workload_type": "Deployment", "workload_namespace": "default", "workload_name": "{APP_KEY}", "container_name": "{APP_KEY}", "image_repo": "registry.cn-hangzhou.aliyuncs.com/mycorp/{APP_KEY}", "hook_pre_server": "", "hook_post_server": ""}', '2026-07-12 19:00:00', NULL);

-- ----------------------------------------------------
-- 使用存储过程安全检查并添加 template_id 字段
-- ----------------------------------------------------

DELIMITER $$

DROP PROCEDURE IF EXISTS AddTemplateIdColumn $$

CREATE PROCEDURE AddTemplateIdColumn()
BEGIN
    -- 给 deploy_extend1 表安全添加 template_id
    IF NOT EXISTS(
        SELECT * FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'deploy_extend1' 
        AND column_name = 'template_id'
    ) THEN
        ALTER TABLE deploy_extend1 ADD COLUMN template_id INT NULL COMMENT '关联的构建模板ID';
    END IF;

    -- 给 deploy_extend3 表安全添加 template_id
    IF NOT EXISTS(
        SELECT * FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'deploy_extend3' 
        AND column_name = 'template_id'
    ) THEN
        ALTER TABLE deploy_extend3 ADD COLUMN template_id INT NULL COMMENT '关联的构建模板ID';
    END IF;
END $$

DELIMITER ;

CALL AddTemplateIdColumn();

DROP PROCEDURE IF EXISTS AddTemplateIdColumn;

-- ----------------------------------------------------
-- 创建发布模版表 deploy_template 并为现有扩展配置表关联 template_id
-- ----------------------------------------------------

CREATE TABLE deploy_template (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '模板名称',
    extend CHAR(1) NOT NULL COMMENT '发布类型: 1-常规, 2-自定义, 3-K8s',
    description VARCHAR(255) NULL COMMENT '模板描述',
    config_data TEXT NOT NULL COMMENT '模板参数配置 JSON 字符串',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE deploy_extend1 ADD COLUMN template_id INT NULL COMMENT '关联的构建模板ID';
ALTER TABLE deploy_extend3 ADD COLUMN template_id INT NULL COMMENT '关联的构建模板ID';

-- ----------------------------------------------------
-- 添加 K8s 命名空间 (Namespace) 字段到 deploy_extend3 配置表中
-- ----------------------------------------------------

ALTER TABLE deploy_extend3 ADD COLUMN workload_namespace VARCHAR(255) NOT NULL DEFAULT 'default';

-- ----------------------------------------------------
-- 添加 K8s 检出前和检出后执行的 hook 脚本字段到 deploy_extend3 配置表中
-- ----------------------------------------------------

ALTER TABLE deploy_extend3 ADD COLUMN hook_pre_server TEXT NULL;
ALTER TABLE deploy_extend3 ADD COLUMN hook_post_server TEXT NULL;

-- 数据库结构变更: 自定义发布（DeployExtend2）增添 git_repo 字段
ALTER TABLE deploy_extend2 ADD COLUMN git_repo VARCHAR(255) NULL;

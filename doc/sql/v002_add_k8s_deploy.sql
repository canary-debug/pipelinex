-- 数据库结构变更: environments 表增加 k8s_config 字段
ALTER TABLE environments ADD COLUMN k8s_config TEXT NULL;

-- 数据库结构变更: 新增 deploy_extend3 表以支持 K8s 部署明细配置
CREATE TABLE `deploy_extend3` (
  `deploy_id` int(11) NOT NULL,
  `workload_type` varchar(50) NOT NULL,
  `workload_name` varchar(255) NOT NULL,
  `container_name` varchar(255) NOT NULL,
  `git_repo` varchar(255) NULL,
  `image_repo` varchar(255) NOT NULL,
  PRIMARY KEY (`deploy_id`),
  CONSTRAINT `deploy_extend3_fk_deploy` FOREIGN KEY (`deploy_id`) REFERENCES `deploys` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

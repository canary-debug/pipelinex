ALTER TABLE environments ADD COLUMN k8s_status tinyint(1) NOT NULL DEFAULT 0 COMMENT '0-未配置, 1-正常, 2-异常';

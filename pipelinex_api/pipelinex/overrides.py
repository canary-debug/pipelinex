# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.

import os
import configparser

# 获取 spug_api 根目录下的 pipelinex.conf 路径
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
config_file = os.path.join(BASE_DIR, 'pipelinex.conf')

if os.path.exists(config_file):
    config = configparser.ConfigParser()
    try:
        config.read(config_file, encoding='utf-8')
        
        # 覆盖 MySQL 配置
        if 'mysql' in config:
            mysql_conf = config['mysql']
            DATABASES = {
                'default': {
                    'ATOMIC_REQUESTS': True,
                    'ENGINE': 'django.db.backends.mysql',
                    'NAME': mysql_conf.get('database', 'pipelinex'),
                    'USER': mysql_conf.get('user', 'root'),
                    'PASSWORD': mysql_conf.get('password', ''),
                    'HOST': mysql_conf.get('host', '127.0.0.1'),
                    'PORT': mysql_conf.get('port', '3306'),
                    'OPTIONS': {
                        'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
                    }
                }
            }
            
        # 覆盖 Redis / Cache 配置
        if 'redis' in config:
            redis_conf = config['redis']
            r_host = redis_conf.get('host', '127.0.0.1')
            r_port = redis_conf.get('port', '6379')
            r_password = redis_conf.get('password', '')
            
            # 组装 Redis URL 格式以支持密码连接
            if r_password:
                redis_url_cache = f"redis://:{r_password}@{r_host}:{r_port}/1"
                redis_hosts_channels = f"redis://:{r_password}@{r_host}:{r_port}/0"
            else:
                redis_url_cache = f"redis://{r_host}:{r_port}/1"
                redis_hosts_channels = f"redis://{r_host}:{r_port}/0"
                
            CACHES = {
                "default": {
                    "BACKEND": "django_redis.cache.RedisCache",
                    "LOCATION": redis_url_cache,
                    "OPTIONS": {
                        "CLIENT_CLASS": "django_redis.client.DefaultClient",
                    }
                }
            }
            
            CHANNEL_LAYERS = {
                "default": {
                    "BACKEND": "channels_redis.core.RedisChannelLayer",
                    "CONFIG": {
                        "hosts": [redis_hosts_channels],
                        "capacity": 1000,
                        "expiry": 120,
                    },
                },
            }
    except Exception as e:
        print(f"[PipelineX] Failed to load config file pipelinex.conf: {e}")

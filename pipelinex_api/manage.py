#!/usr/bin/env python
# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pipelinex.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # 拦截 runserver，从配置文件中读取启动主机和端口
    if len(sys.argv) > 1 and sys.argv[1] == 'runserver':
        has_addr_port = False
        for arg in sys.argv[2:]:
            if not arg.startswith('-'):
                has_addr_port = True
                break
        
        if not has_addr_port:
            import configparser
            BASE_DIR = os.path.dirname(os.path.abspath(__file__))
            config_file = os.path.join(BASE_DIR, 'pipelinex.conf')
            if os.path.exists(config_file):
                config = configparser.ConfigParser()
                try:
                    config.read(config_file, encoding='utf-8')
                    if 'api' in config:
                        api_conf = config['api']
                        host = api_conf.get('host', '0.0.0.0')
                        port = api_conf.get('port', '8000')
                        sys.argv.append(f"{host}:{port}")
                except Exception as e:
                    print(f"[PipelineX] Failed to parse api port config from config file: {e}")

    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()

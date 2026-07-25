#!/bin/sh
# ----------------------------------------------------
# PipelineX 后端多进程一键拉起脚本
# ----------------------------------------------------

echo ">>> [Entrypoint] 启动后台定时任务调度器 runscheduler..."
python manage.py runscheduler > /var/log/pipelinex-scheduler.log 2>&1 &

echo ">>> [Entrypoint] 启动异步发版与构建引擎 runworker..."
python manage.py runworker > /var/log/pipelinex-worker.log 2>&1 &

echo ">>> [Entrypoint] 启动健康状态监控进程 runmonitor..."
python manage.py runmonitor > /var/log/pipelinex-monitor.log 2>&1 &

echo ">>> [Entrypoint] 启动前台 Web 服务主进程 runserver..."
exec python manage.py runserver 0.0.0.0:8000

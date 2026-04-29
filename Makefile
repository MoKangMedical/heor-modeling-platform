# HEOR Modeling Platform - Makefile
# 快捷命令集

.PHONY: help dev prod demo docker stop clean test install

# 默认目标
help:
	@echo "HEOR Modeling Platform - 可用命令:"
	@echo ""
	@echo "  make dev        启动开发模式 (热重载)"
	@echo "  make prod       启动生产模式"
	@echo "  make demo       启动演示模式 (纯前端)"
	@echo "  make docker     使用Docker启动"
	@echo "  make stop       停止所有服务"
	@echo "  make test       运行测试"
	@echo "  make install    安装依赖"
	@echo "  make clean      清理临时文件"
	@echo "  make status     查看服务状态"
	@echo "  make logs       查看日志"
	@echo ""

# 开发模式
dev:
	@chmod +x start.sh && ./start.sh dev

# 生产模式
prod:
	@chmod +x start.sh && ./start.sh prod

# 演示模式
demo:
	@chmod +x start.sh && ./start.sh demo

# Docker模式
docker:
	@chmod +x start.sh && ./start.sh docker

# 停止服务
stop:
	@echo "停止所有服务..."
	@pkill -f "uvicorn app.main:app" 2>/dev/null || true
	@pkill -f "python3 -m http.server 3000" 2>/dev/null || true
	@pkill -f "gunicorn app.main:app" 2>/dev/null || true
	@docker-compose down 2>/dev/null || true
	@echo "服务已停止"

# 运行测试
test:
	@echo "运行测试..."
	cd backend && python -m pytest tests/ -v
	@echo "测试完成"

# 安装依赖
install:
	@echo "安装依赖..."
	cd backend && pip install -r requirements.txt
	@echo "依赖安装完成"

# 清理
clean:
	@echo "清理临时文件..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name ".DS_Store" -delete 2>/dev/null || true
	rm -rf backend/venv 2>/dev/null || true
	rm -rf backend/*.db 2>/dev/null || true
	@echo "清理完成"

# 查看状态
status:
	@echo "服务状态:"
	@echo "  后端: $(shell curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1 && echo '运行中' || echo '未运行')"
	@echo "  前端: $(shell curl -s http://localhost:3000 > /dev/null 2>&1 && echo '运行中' || echo '未运行')"
	@echo ""
	@echo "进程:"
	@ps aux | grep -E "(uvicorn|http.server)" | grep -v grep || echo "  无相关进程"

# 查看日志
logs:
	@echo "查看后端日志..."
	@tail -f backend/logs/*.log 2>/dev/null || echo "无日志文件"

# 构建Docker镜像
build:
	@echo "构建Docker镜像..."
	docker-compose build
	@echo "构建完成"

# 数据库迁移
migrate:
	@echo "执行数据库迁移..."
	cd backend && alembic upgrade head
	@echo "迁移完成"

# 生成API文档
docs:
	@echo "生成API文档..."
	cd backend && python -c "from app.main import app; import json; print(json.dumps(app.openapi(), indent=2))" > api-docs.json
	@echo "API文档已生成: api-docs.json"

# 性能测试
benchmark:
	@echo "运行性能测试..."
	cd tests && python benchmark.py
	@echo "性能测试完成"

# 代码检查
lint:
	@echo "代码检查..."
	cd backend && python -m pylint app/ --disable=C0114,C0115,C0116
	@echo "检查完成"

# 格式化代码
format:
	@echo "格式化代码..."
	cd backend && python -m black app/ --quiet
	@echo "格式化完成"

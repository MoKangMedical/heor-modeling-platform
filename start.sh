#!/bin/bash
# HEOR Modeling Platform - 启动脚本
# 用法: ./start.sh [mode]
# 模式: dev (开发), prod (生产), demo (演示), docker (容器)

set -e

MODE="${1:-dev}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
SITE_DIR="$PROJECT_DIR/site"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║          HEOR Modeling Platform                         ║"
    echo "║          卫生经济学与结果研究建模平台                      ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# 检查依赖
check_dependencies() {
    print_status "检查依赖..."
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python3 未安装"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    print_status "Python版本: $PYTHON_VERSION"
    
    if [ "$MODE" = "docker" ]; then
        if ! command -v docker &> /dev/null; then
            print_error "Docker 未安装"
            exit 1
        fi
        if ! command -v docker-compose &> /dev/null; then
            print_error "Docker Compose 未安装"
            exit 1
        fi
    fi
}

# 安装Python依赖
install_dependencies() {
    print_status "安装Python依赖..."
    cd "$BACKEND_DIR"
    
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    pip install -r requirements.txt -q 2>/dev/null || pip install fastapi uvicorn sqlalchemy pydantic -q
    
    print_status "依赖安装完成"
}

# 启动后端
start_backend() {
    print_status "启动后端API服务..."
    cd "$BACKEND_DIR"
    
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    
    # 设置环境变量
    export APP_ENV="${MODE}"
    export DATABASE_URL="${DATABASE_URL:-sqlite:///./heor.db}"
    export AUTO_CREATE_TABLES="true"
    
    if [ "$MODE" = "prod" ]; then
        # 生产模式：使用gunicorn
        if command -v gunicorn &> /dev/null; then
            gunicorn app.main:app \
                --workers 4 \
                --worker-class uvicorn.workers.UvicornWorker \
                --bind 0.0.0.0:8000 \
                --access-logfile - &
        else
            uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 &
        fi
    else
        # 开发模式：热重载
        uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    fi
    
    BACKEND_PID=$!
    print_status "后端PID: $BACKEND_PID"
    print_status "后端地址: http://localhost:8000"
    print_status "API文档: http://localhost:8000/docs"
}

# 启动前端
start_frontend() {
    print_status "启动前端服务..."
    cd "$SITE_DIR"
    
    if [ "$MODE" = "prod" ]; then
        # 生产模式：使用nginx或简单HTTP服务
        if command -v nginx &> /dev/null; then
            print_status "使用Nginx服务前端..."
            # 创建临时nginx配置
            cat > /tmp/heor-nginx.conf << EOF
server {
    listen 3000;
    root $SITE_DIR;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF
            nginx -c /tmp/heor-nginx.conf &
        else
            python3 -m http.server 3000 &
        fi
    else
        # 开发模式：简单HTTP服务
        python3 -m http.server 3000 &
    fi
    
    FRONTEND_PID=$!
    print_status "前端PID: $FRONTEND_PID"
    print_status "前端地址: http://localhost:3000"
}

# Docker模式
start_docker() {
    print_status "使用Docker启动..."
    cd "$PROJECT_DIR"
    
    docker-compose up -d
    
    print_status "Docker容器已启动"
    print_status "前端: http://localhost:3000"
    print_status "后端: http://localhost:8000"
    print_status "API文档: http://localhost:8000/docs"
}

# 演示模式（纯前端）
start_demo() {
    print_status "启动演示模式（纯前端）..."
    cd "$SITE_DIR"
    
    python3 -m http.server 3000 &
    
    FRONTEND_PID=$!
    print_status "演示模式PID: $FRONTEND_PID"
    print_status "访问地址: http://localhost:3000"
    print_warning "演示模式：所有数据为模拟数据，无需后端"
}

# 等待服务就绪
wait_for_services() {
    print_status "等待服务就绪..."
    
    # 等待后端
    if [ "$MODE" != "demo" ]; then
        for i in {1..30}; do
            if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
                print_status "后端服务就绪"
                break
            fi
            sleep 1
        done
    fi
    
    # 等待前端
    for i in {1..10}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            print_status "前端服务就绪"
            break
        fi
        sleep 1
    done
}

# 清理函数
cleanup() {
    echo ""
    print_status "正在停止服务..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    if [ "$MODE" = "docker" ]; then
        docker-compose down 2>/dev/null || true
    fi
    
    print_status "服务已停止"
    exit 0
}

# 注册清理函数
trap cleanup SIGINT SIGTERM

# 主流程
main() {
    print_header
    
    case "$MODE" in
        dev)
            print_status "开发模式"
            check_dependencies
            install_dependencies
            start_backend
            start_frontend
            ;;
        prod)
            print_status "生产模式"
            check_dependencies
            install_dependencies
            start_backend
            start_frontend
            ;;
        demo)
            print_status "演示模式"
            check_dependencies
            start_demo
            ;;
        docker)
            print_status "Docker模式"
            check_dependencies
            start_docker
            ;;
        *)
            print_error "未知模式: $MODE"
            echo "用法: $0 [dev|prod|demo|docker]"
            exit 1
            ;;
    esac
    
    wait_for_services
    
    echo ""
    echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  HEOR Modeling Platform 已启动!${NC}"
    echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  前端地址: ${BLUE}http://localhost:3000${NC}"
    
    if [ "$MODE" != "demo" ]; then
        echo -e "  后端地址: ${BLUE}http://localhost:8000${NC}"
        echo -e "  API文档:  ${BLUE}http://localhost:8000/docs${NC}"
    fi
    
    echo ""
    echo -e "  按 ${YELLOW}Ctrl+C${NC} 停止服务"
    echo ""
    
    # 保持前台运行
    wait
}

# 运行
main

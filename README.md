# HEOR Modeling Platform

面向 HEOR / HTA 团队的在线建模平台原型仓库。

当前仓库包含两部分：

- `site/`：发布到 GitHub Pages 的平台官网与产品原型站点
- `backend/`：FastAPI + PostgreSQL/SQLite 后端服务骨架

## 当前目标

本仓库用于启动一个对标 TreeAge 的现代在线平台，重点支持：

- 基于 survival / hazard / compound curve 的证据输入
- Markov / PartSA / PSA 相关分析
- 临床数据校准
- 患者追踪与 cohort dashboard
- 可审计的 run / metrics / artifact 管理

## 仓库结构

```text
backend/
  app/
  docs/
  openapi.yaml
docs/
  strategy/
site/
  index.html
  evidence.html
  runtime.html
  simulation.html
  review.html
  styles.css
  app.js
.github/workflows/pages.yml
```

## 本地运行

### GitHub Pages 站点

```bash
cd site
python3 -m http.server 8080
```

然后访问：

- `http://localhost:8080/index.html`
- `http://localhost:8080/evidence.html`
- `http://localhost:8080/runtime.html`
- `http://localhost:8080/simulation.html`
- `http://localhost:8080/review.html`

### 后端服务

```bash
cd backend
python3.12 -m venv .venv312
. .venv312/bin/activate
python -m pip install --upgrade pip
python -m pip install .
uvicorn app.main:app --reload
```

默认配置会直接使用 `SQLite` 并自动创建 demo seed，因此本地联调不需要先起 PostgreSQL。
如需切回 PostgreSQL，再设置 `DATABASE_URL` 并按需启动 `docker compose up -d db`。

## 文档

- 平台研究：[docs/strategy/TreeAge对标平台研究与搭建准备.md](./docs/strategy/TreeAge对标平台研究与搭建准备.md)
- 六大能力 PRD：[docs/strategy/TreeAge六大能力_PRD_技术任务拆解.md](./docs/strategy/TreeAge六大能力_PRD_技术任务拆解.md)
- 数据库与引擎设计：[docs/strategy/平台数据库表结构与计算引擎模块设计.md](./docs/strategy/平台数据库表结构与计算引擎模块设计.md)
- SQL 草案：[docs/strategy/平台核心表结构_v1.sql](./docs/strategy/平台核心表结构_v1.sql)
- 后端 API contract：[backend/docs/API_CONTRACT.md](./backend/docs/API_CONTRACT.md)
- OpenAPI 草案：[backend/openapi.yaml](./backend/openapi.yaml)

## Pages 发布

仓库内置 GitHub Actions Pages 工作流：

- 推送到 `main` 分支后自动部署 `site/`
- 发布后默认地址为：
  - `https://<github-username>.github.io/<repo-name>/`

## 下一步

1. 用 Alembic 管理后端迁移
2. 把 `probability-runtime` 与 `markov-solver` 从 demo 实现升级为可验证实现
3. 增加认证、组织权限和异步任务队列
4. 给 calibration 配置、优化日志和 overlay artifact 接入真实计算

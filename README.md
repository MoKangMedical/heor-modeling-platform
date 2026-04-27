# HEOR Modeling Platform

> **卫生经济学与结果研究建模平台** — 为药物经济学评价提供标准化建模工具

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9+-green.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-red.svg)](https://fastapi.tiangolo.com)

---

## 核心功能

| # | 功能模块 | 说明 |
|---|---------|------|
| 1 | **成本-效果分析（CEA）** | 比较不同干预方案的成本与健康产出，计算ICER |
| 2 | **成本-效用分析（CUA）** | 以QALY为效果指标，支持意愿支付阈值判定 |
| 3 | **预算影响分析（BIA）** | 评估新药纳入医保后的短期/长期预算影响 |
| 4 | **Markov模型** | 支持多状态Markov队列模型，含半周期校正 |
| 5 | **分区生存模型（PSM）** | 基于PFS/OS曲线的参数化生存分析 |
| 6 | **微观模拟（Microsimulation）** | 个体层面离散事件模拟，支持异质性建模 |
| 7 | **网络Meta分析（NMA）** | 间接比较多种干预措施的相对效果 |
| 8 | **真实世界数据整合** | 对接RWD数据源，支持真实世界证据生成 |
| 9 | **敏感性分析（PSA/TOWSA）** | 概率敏感性分析、单因素/多因素敏感性分析 |
| 10 | **报告自动生成** | 一键生成符合HTA要求的技术报告 |

---

## 在线体验

**访问地址**: https://mokangmedical.github.io/heor-modeling-platform/

### 功能亮点

- **任务驱动工作流**: 从证据上传到结果审阅，一条流程完成
- **交互式图表**: 校准覆盖图、PSA散点图、CEAC曲线
- **双语支持**: 中文/英文一键切换
- **离线演示模式**: 无需后端即可体验完整流程

---

## 快速开始

### 方式一：在线体验（推荐）

直接访问 https://mokangmedical.github.io/heor-modeling-platform/

点击"载入示例流程"即可体验完整工作流。

### 方式二：本地运行

```bash
# 克隆仓库
git clone https://github.com/MoKangMedical/heor-modeling-platform.git
cd heor-modeling-platform

# 安装依赖
pip install -r requirements.txt

# 启动后端API
cd backend
uvicorn app.main:app --reload --port 8000

# 启动前端（新终端）
cd site
python -m http.server 3000
```

### 方式三：Docker 部署

```bash
docker-compose up -d
```

---

## 项目结构

```
heor-modeling-platform/
├── site/                       # 前端静态页面
│   ├── index.html             # 首页
│   ├── evidence.html          # 证据上传
│   ├── calibration.html       # 临床校准
│   ├── simulation.html        # 运行模拟
│   ├── review.html            # 结果审阅
│   ├── styles.css             # 样式表
│   └── app.js                 # 交互逻辑
├── backend/                    # FastAPI后端
│   ├── app/
│   │   ├── api/routes/        # API路由
│   │   ├── services/          # 业务逻辑
│   │   ├── models/            # 数据模型
│   │   └── schemas/           # Pydantic模式
│   └── alembic/               # 数据库迁移
├── src/                        # 核心建模引擎
│   ├── markov_model.py        # Markov模型
│   ├── psa.py                 # 敏感性分析
│   ├── cost_effectiveness.py  # 成本效果分析
│   ├── survival_analysis.py   # 生存分析
│   └── ...                    # 更多模块
├── data/                       # 数据文件
│   ├── disease-burden.json    # 疾病经济负担
│   ├── utility-values.json    # 健康效用值
│   └── cost-data.json         # 成本数据
├── docs/                       # 文档
│   └── strategy/              # 平台策略文档
└── tests/                      # 测试
```

---

## 数据库

### 疾病经济负担数据

涵盖12种主要疾病的经济负担数据：

| 疾病 | 患病率 | 年直接医疗成本 | QALY损失/年 | 数据来源 |
|------|--------|---------------|------------|---------|
| 2型糖尿病 | 11.6% | ¥12,580 | 0.05 | 中国慢性病监测 |
| 非小细胞肺癌 | 0.058% | ¥186,000 | 0.65 | 肿瘤登记年报 |
| 类风湿关节炎 | 0.4% | ¥18,200 | 0.08 | APLAR数据 |
| 阿尔茨海默病 | 3.5% | ¥45,600 | 0.15 | AD登记研究 |
| 心力衰竭 | 1.3% | ¥28,900 | 0.10 | CCCF研究 |
| 慢性肾病(CKD3-5) | 1.8% | ¥52,300 | 0.12 | CSN登记 |
| 骨质疏松症 | 6.5% | ¥8,900 | 0.03 | COS研究 |
| 抑郁症 | 3.4% | ¥6,200 | 0.20 | 精神卫生调查 |
| 哮喘 | 4.2% | ¥5,800 | 0.04 | CSE数据 |
| 丙型肝炎 | 0.7% | ¥35,000 | 0.08 | CSLH数据 |
| 乳腺癌 | 0.045% | ¥145,000 | 0.35 | 肿瘤登记年报 |
| 帕金森病 | 0.2% | ¥32,000 | 0.12 | PD登记研究 |

### 健康效用值

- **测量方法**: EQ-5D-5L
- **估值集**: 中国TTO值集
- **数据来源**: 临床试验、真实世界研究、系统综述

---

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (原生)
- **后端**: Python 3.9+, FastAPI, SQLAlchemy
- **建模引擎**: NumPy, SciPy, Pandas
- **数据可视化**: Plotly, Chart.js
- **数据库**: SQLite (开发), PostgreSQL (生产)
- **部署**: GitHub Pages, Docker

---

## API 文档

启动后端后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 主要端点

```
POST /api/v1/evidence/upload     # 上传证据数据
POST /api/v1/probability/generate # 生成概率函数
POST /api/v1/runs/create         # 创建模拟运行
GET  /api/v1/runs/{id}/results   # 获取运行结果
POST /api/v1/calibration/run     # 执行校准
GET  /api/v1/analytics/icer      # 计算ICER
```

---

## 应用场景

- **药物定价** — 基于成本-效果证据支持定价策略
- **医保谈判** — 提供HTA提交所需的经济学证据
- **临床指南** — 为诊疗路径优化提供卫生经济学依据
- **企业决策** — 产品管线价值评估与市场准入策略
- **学术研究** — 药物经济学方法学研究与教学

---

## 相关项目

| 项目 | 定位 |
|------|------|
| [OPC Platform](https://github.com/MoKangMedical/opcplatform) | 创业者联盟平台 |
| [Biostats](https://github.com/MoKangMedical/Biostats) | 生物统计分析平台 |
| [MetaForge](https://github.com/MoKangMedical/metaforge) | Meta分析平台 |
| [DrugMind](https://github.com/MoKangMedical/drugmind) | 药物研发数字孪生 |
| [MediChat-RD](https://github.com/MoKangMedical/medichat-rd) | 罕病诊断平台 |

---

## 贡献

欢迎贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 许可证

本项目采用 [MIT License](LICENSE) 开源。

---

<p align="center">
  <b>HEOR Modeling Platform</b> — 让药物经济学评价更科学、更高效<br>
  <sub>Built for Health Economics and Outcomes Research</sub>
</p>

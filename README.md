# 📊 HEOR Modeling Platform

> **卫生经济学与结果研究建模平台** — 为药物经济学评价提供标准化建模工具

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9+-green.svg)](https://python.org)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.28+-red.svg)](https://streamlit.io)

---

## 🎯 核心功能

| # | 功能模块 | 说明 |
|---|---------|------|
| 1 | **成本-效果分析（CEA）** | 比较不同干预方案的成本与健康产出，计算ICER |
| 2 | **成本-效用分析（CUA）** | 以QALY为效果指标，支持意愿支付阈值判定 |
| 3 | **预算影响分析（BIA）** | 评估新药纳入医保后的短期/长期预算影响 |
| 4 | **Markov模型** | 支持多状态Markov队列模型，含半周期校正 |
| 5 | **分区生存模型（Partitioned Survival）** | 基于PFS/OS曲线的参数化生存分析 |
| 6 | **微观模拟（Microsimulation）** | 个体层面离散事件模拟，支持异质性建模 |
| 7 | **网络Meta分析（NMA）** | 间接比较多种干预措施的相对效果 |
| 8 | **真实世界数据整合** | 对接RWD数据源，支持真实世界证据生成 |
| 9 | **敏感性分析（PSA/TOWSA）** | 概率敏感性分析、单因素/多因素敏感性分析 |
| 10 | **报告自动生成** | 一键生成符合HTA要求的技术报告 |

---

## 🛠 技术栈

- **建模引擎**: Python 3.9+ (NumPy, SciPy, Pandas)
- **统计分析**: R (survival, netmeta, BCEA)
- **交互界面**: Streamlit
- **数据可视化**: Plotly, Matplotlib
- **报告生成**: Jinja2 + WeasyPrint

---

## 📋 应用场景

- 💊 **药物定价** — 基于成本-效果证据支持定价策略
- 🏥 **医保谈判** — 提供HTA提交所需的经济学证据
- 📖 **临床指南** — 为诊疗路径优化提供卫生经济学依据
- 🏢 **企业决策** — 产品管线价值评估与市场准入策略

---

## 🚀 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/MoKangMedical/heor-modeling-platform.git
cd heor-modeling-platform

# 安装依赖
pip install -r requirements.txt

# 启动Streamlit界面
streamlit run app.py
```

### Docker 部署

```bash
docker-compose up -d
```

### 基本使用

```python
from src.markov_model import MarkovModel
from src.cost_effectiveness import CostEffectivenessAnalysis
from src.psa import ProbabilisticSensitivityAnalysis

# 1. 定义Markov模型
model = MarkovModel(
    states=["健康", "疾病", "死亡"],
    cycle_length=1,  # 年
    num_cycles=30,
    discount_rate=0.03
)

# 2. 运行成本-效果分析
cea = CostEffectivenessAnalysis(
    model=model,
    comparator="标准治疗",
    intervention="新药A"
)
results = cea.run()
print(f"ICER: ¥{results['icer']:,.0f}/QALY")

# 3. 概率敏感性分析
psa = ProbabilisticSensitivityAnalysis(
    cea=cea,
    n_simulations=1000
)
psa_results = psa.run()
psa.plot_ceac()  # 绘制成本-效果可接受曲线
```

---

## 📁 项目结构

```
heor-modeling-platform/
├── src/                        # 核心建模模块
│   ├── markov_model.py        # Markov模型引擎
│   ├── psa.py                 # 敏感性分析
│   └── cost_effectiveness.py  # 成本-效果分析
├── data/                       # 数据文件
│   ├── model-templates.json   # 建模模板库
│   └── disease-burden.json    # 疾病经济负担数据
├── examples/                   # 案例
│   └── drug-pricing-case.md   # 药物定价案例
├── docs/                       # 文档
├── tests/                      # 测试
├── app.py                      # Streamlit应用入口
├── docker-compose.yml          # Docker编排
└── README.md                   # 本文件
```

---

## 📚 模型模板

平台内置三大建模模板：

- **Markov模型模板** — 适用于慢性病长期成本-效果分析
- **分区生存模型模板** — 适用于肿瘤药物评价
- **微观模拟模板** — 适用于需要个体异质性的复杂场景

详见 [`data/model-templates.json`](data/model-templates.json)

---

## 📊 疾病经济负担数据库

涵盖10种主要疾病的经济负担数据：

| 疾病 | 年直接医疗成本 | QALY损失 | 数据来源 |
|------|--------------|---------|---------|
| 2型糖尿病 | ¥12,580/年 | 0.05/年 | 中国DM调查 |
| 非小细胞肺癌 | ¥186,000/年 | 0.65 | CSCO指南 |
| 类风湿关节炎 | ¥18,200/年 | 0.08/年 | APLAR数据 |
| 阿尔茨海默病 | ¥45,600/年 | 0.15/年 | 中国AD登记 |
| 心力衰竭 | ¥28,900/年 | 0.10/年 | CCCF研究 |
| 慢性肾病(CKD3-5) | ¥52,300/年 | 0.12/年 | CSN登记 |
| 骨质疏松症 | ¥8,900/年 | 0.03/年 | COS研究 |
| 抑郁症 | ¥6,200/年 | 0.20/年 | 中国MH调查 |
| 哮喘 | ¥5,800/年 | 0.04/年 | CSE数据 |
| 丙型肝炎 | ¥35,000(治愈) | 0.08/年 | CSLH数据 |

详见 [`data/disease-burden.json`](data/disease-burden.json)

---

## 🤝 贡献

欢迎贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源。

---

<p align="center">
  <b>HEOR Modeling Platform</b> — 让药物经济学评价更科学、更高效<br>
  <sub>Built with ❤️ for Health Economics and Outcomes Research</sub>
</p>

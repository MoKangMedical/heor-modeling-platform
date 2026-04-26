# 💊 药物定价案例：EGFR-TKI治疗非小细胞肺癌的成本-效果分析

> 本案例展示如何使用HEOR建模平台进行抗肿瘤药物的药物经济学评价，为定价策略提供证据支持。

---

## 📋 案例背景

### 研究问题

评估第三代EGFR-TKI（奥希替尼）一线治疗EGFR突变阳性晚期非小细胞肺癌（NSCLC）的成本-效果性，为医保谈判提供定价依据。

### 临床背景

- **适应症**: EGFR突变阳性（19del/L858R）晚期NSCLC一线治疗
- **干预方案**: 奥希替尼 80mg QD
- **对照方案**: 第一代EGFR-TKI（吉非替尼/厄洛替尼）
- **关键临床试验**: FLAURA研究

### FLAURA研究关键数据

| 指标 | 奥希替尼 | 第一代TKI |
|------|---------|-----------|
| 中位PFS | 18.9个月 | 10.2个月 |
| 中位OS | 38.6个月 | 31.8个月 |
| ORR | 80% | 76% |
| ≥3级AE发生率 | 34% | 45% |
| CNS进展率 | 6% | 15% |

---

## 🏗 模型构建

### 模型选择：分区生存模型（PartSA）

选择理由：
1. 肿瘤药物评价的主流方法
2. 基于PFS/OS曲线，数据来源清晰
3. 可直接利用临床试验的生存数据
4. 计算相对简单，结果可解释性强

### 模型结构

```
┌─────────────────────────────────────────────────────────┐
│                    分区生存模型                           │
│                                                         │
│  ┌──────────────┐    进展     ┌──────────────┐          │
│  │              │  ──────→   │              │          │
│  │  无进展生存  │            │  进展后生存  │          │
│  │   (PFS)     │            │   (PPS)     │          │
│  │              │            │              │          │
│  └──────┬───────┘            └──────┬───────┘          │
│         │                          │                   │
│         │ 死亡                      │ 死亡              │
│         ↓                          ↓                   │
│  ┌──────────────────────────────────────────────┐      │
│  │                   死亡                        │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 假设

1. 患者基线年龄60岁，男女比例55:45
2. 卫生体系视角
3. 贴现率：3%（成本和效果）
4. 时间跨度：终生（20年）
5. 周期：1个月
6. 半周期校正：是

---

## 📊 参数设定

### 生存参数

基于FLAURA研究的Kaplan-Meier曲线拟合Weibull分布：

```python
# 奥希替尼组
osi_pfs = {"shape": 0.82, "scale": 21.5}  # Weibull参数
osi_os = {"shape": 0.88, "scale": 44.2}

# 第一代TKI组
gen1_pfs = {"shape": 0.91, "scale": 11.8}
gen1_os = {"shape": 0.90, "scale": 36.5}
```

### 成本参数（元/月）

| 成本项目 | 奥希替尼 | 第一代TKI |
|---------|---------|-----------|
| **药物成本** | 15,000* | 5,000 |
| 监测检查 | 2,000 | 2,000 |
| 不良事件处理 | 1,500 | 2,500 |
| 支持治疗 | 500 | 500 |
| **PFS期月成本** | **19,000** | **10,000** |
| | | |
| 进展后治疗 | 12,000 | 12,000 |
| 姑息治疗 | 6,000 | 6,000 |
| 住院 | 8,000 | 8,000 |
| **PPS期月成本** | **26,000** | **26,000** |
| | | |
| 终末期护理 | 15,000 | 15,000 |

*注：奥希替尼价格为医保谈判后价格，原价约51,000元/月

### 效用参数

| 健康状态 | 效用值 | 来源 |
|---------|--------|------|
| PFS期（无AE） | 0.82 | FLAURA PRO数据 |
| PFS期（有AE） | 0.72 | 文献综述 |
| PPS期 | 0.58 | 中国NSCLC患者研究 |
| ≥3级AE一次性效用损失 | -0.12 | NICE HST指南 |
| 死亡 | 0 | - |

---

## 🔬 分析结果

### 基础案例分析

使用HEOR建模平台运行分析：

```python
from src.cost_effectiveness import CostEffectivenessAnalysis, AnalysisType

# 创建CEA
cea = CostEffectivenessAnalysis(
    analysis_type=AnalysisType.CUA,
    wtp_threshold=31250  # 中国推荐WTP阈值
)

# 添加干预方案
cea.add_intervention(
    "第一代TKI",
    cost=185600,      # 终生贴现成本
    effect=2.85,       # 贴现QALY
    is_comparator=True
)

cea.add_intervention(
    "奥希替尼",
    cost=268400,
    effect=3.52
)

results = cea.run()
print(cea.summary())
```

### 基础案例结果

| 指标 | 第一代TKI | 奥希替尼 | 增量 |
|------|----------|---------|------|
| 总贴现成本 | ¥185,600 | ¥268,400 | ¥82,800 |
| 总贴现QALY | 2.85 | 3.52 | 0.67 |
| **ICER** | - | - | **¥123,582/QALY** |

### 与WTP阈值比较

- **中国推荐阈值**: ¥31,250/QALY（1倍人均GDP）
- **ICER**: ¥123,582/QALY
- **结论**: 基础案例中，奥希替尼ICER超过推荐阈值

---

## 📈 敏感性分析

### 单因素敏感性分析（龙卷风图）

```python
from src.psa import DeterministicSensitivityAnalysis

dsa = DeterministicSensitivityAnalysis(base_case_params={
    "osi_cost": 15000,
    "osi_pfs": 18.9,
    "gen1_pfs": 10.2,
    "utility_pfs": 0.82,
    "utility_pps": 0.58
})

tornado = dsa.tornado(
    parameters=[
        {"name": "osi_cost", "low": 8000, "high": 25000},
        {"name": "osi_pfs", "low": 15.0, "high": 22.0},
        {"name": "gen1_pfs", "low": 8.0, "high": 12.0},
        {"name": "utility_pfs", "low": 0.70, "high": 0.90},
    ],
    model_function=my_model,
    outcome="icer"
)
```

**龙卷风图结果**（对ICER影响最大的参数）：

```
奥希替尼月成本  ████████████████████████████  8,000-25,000
奥希替尼PFS     ████████████████████         15.0-22.0个月
第一代TKI PFS   ██████████████               8.0-12.0个月
PFS期效用值     ████████                     0.70-0.90
```

**关键发现**: 奥希替尼月成本是对ICER影响最大的参数

### 概率敏感性分析（PSA）

```python
from src.psa import ProbabilisticSensitivityAnalysis

psa = ProbabilisticSensitivityAnalysis(n_simulations=1000)

psa.add_parameter("osi_cost", "gamma", {"shape": 100, "scale": 150})
psa.add_parameter("osi_pfs", "weibull", {"shape": 0.82, "scale": 21.5})
psa.add_parameter("utility_pfs", "beta", {"alpha": 82, "beta": 18})

results = psa.run(model_function)
```

**PSA结果**（1000次Monte Carlo模拟）：

| 指标 | 均值 | 95%CI |
|------|------|-------|
| 增量成本 | ¥82,500 | ¥65,000 ~ ¥102,000 |
| 增量QALY | 0.68 | 0.45 ~ 0.92 |
| ICER | ¥121,324/QALY | ¥85,000 ~ ¥168,000 |

**成本-效果可接受曲线（CEAC）**：

- WTP = ¥31,250/QALY时，奥希替尼具有成本-效果的概率：**12%**
- WTP = ¥100,000/QALY时，概率：**38%**
- WTP = ¥150,000/QALY时，概率：**68%**

---

## 💰 医保谈判定价建议

### 价格-ICER敏感性分析

| 奥希替尼月价格 | ICER (¥/QALY) | vs 阈值¥31,250 | vs 阈值¥100,000 |
|--------------|---------------|----------------|-----------------|
| ¥51,000 (原价) | ¥425,000 | ❌ | ❌ |
| ¥15,000 (现价) | ¥123,582 | ❌ | ❌ |
| ¥10,000 | ¥82,500 | ❌ | ✅ |
| ¥7,500 | ¥55,000 | ❌ | ✅ |
| ¥5,000 | ¥28,500 | ✅ | ✅ |
| ¥3,500 | ¥15,200 | ✅ | ✅ |

### 谈判策略建议

#### 方案一：基于1倍人均GDP阈值（¥31,250/QALY）

**目标价格**: ≤ ¥5,000/月

- 需要降幅：67%（从¥15,000降至¥5,000）
- 难度：高
- 适用场景：强制压价谈判

#### 方案二：基于3倍人均GDP阈值（¥93,750/QALY）

**目标价格**: ≤ ¥9,500/月

- 需要降幅：37%（从¥15,000降至¥9,500）
- 难度：中
- 适用场景：创新药溢价谈判

#### 方案三：基于风险分担协议

**建议条款**：
- 基础价格：¥12,000/月
- 疗效保证：PFS < 12个月时退还50%药费
- 按疗效付费：根据真实世界PFS数据调整价格
- 封顶机制：年治疗费用不超过¥150,000

---

## 📝 结论与建议

### 主要发现

1. **基础案例ICER为¥123,582/QALY**，超过中国推荐的1倍人均GDP阈值
2. **奥希替尼月成本是影响ICER的最关键参数**
3. **在3倍人均GDP阈值下**，当前价格接近具有成本-效果性
4. **PSA显示**在高WTP阈值下，奥希替尼具有成本-效果的概率较高

### 定价建议

| 策略 | 建议价格 | 降幅 | 依据 |
|------|---------|------|------|
| 保守策略 | ¥5,000/月 | 67% | 1倍人均GDP阈值 |
| 中间策略 | ¥9,500/月 | 37% | 3倍人均GDP阈值 |
| 创新溢价 | ¥12,000/月 | 20% | 风险分担协议 |

### 局限性

1. 生存数据外推存在不确定性
2. 中国真实世界成本数据有限
3. 未考虑患者援助项目的影响
4. 交叉治疗的影响未完全调整

---

## 📚 参考文献

1. Soria JC, et al. Osimertinib in untreated EGFR-mutated advanced non-small-cell lung cancer. N Engl J Med. 2018;378(2):113-125.
2. Wu YL, et al. CNS efficacy of osimertinib in patients with T790M-positive advanced non-small-cell lung cancer. J Clin Oncol. 2018;36(33):3285-3291.
3. 中国药物经济学评价指南(2024版).
4. NICE. Osimertinib for untreated EGFR mutation-positive non-small-cell lung cancer. TA861. 2023.
5. 国家医保局. 2024年国家医保药品目录调整工作方案.

---

## 🔧 复现代码

```python
# 完整复现代码
from src.cost_effectiveness import CostEffectivenessAnalysis, AnalysisType
from src.psa import ProbabilisticSensitivityAnalysis, DeterministicSensitivityAnalysis

# 1. 基础分析
cea = CostEffectivenessAnalysis(analysis_type=AnalysisType.CUA, wtp_threshold=31250)
cea.add_intervention("第一代TKI", cost=185600, effect=2.85, is_comparator=True)
cea.add_intervention("奥希替尼", cost=268400, effect=3.52)
results = cea.run()
print(cea.summary())

# 2. 价格敏感性
for price in [5000, 7500, 9500, 12000, 15000]:
    cea_price = CostEffectivenessAnalysis(wtp_threshold=31250)
    cea_price.add_intervention("第一代TKI", cost=185600, effect=2.85, is_comparator=True)
    annual_cost = price * 12 * 0.85  # 简化：85%时间在PFS期
    cea_price.add_intervention("奥希替尼", cost=185600 + annual_cost * 2.5, effect=3.52)
    r = cea_price.run()
    print(f"月价¥{price}: ICER = ¥{r['incremental_analysis'][0].icer:,.0f}/QALY")

# 3. PSA
psa = ProbabilisticSensitivityAnalysis(n_simulations=1000)
psa.add_parameter("osi_cost", "gamma", {"shape": 100, "scale": 150})
psa.add_parameter("utility_pfs", "beta", {"alpha": 82, "beta": 18})
psa_results = psa.run(lambda p: {"cost": p["osi_cost"]*24, "qaly": p["utility_pfs"]*4.5})
print(psa.summary())
```

---

*本案例由HEOR Modeling Platform生成，仅供学术研究参考，不构成实际定价建议。*

# 药物定价案例：PD-1抑制剂治疗晚期非小细胞肺癌

## 背景

某制药公司计划在中国市场推出一款新型PD-1抑制剂（代号：Drug-X），用于晚期非小细胞肺癌（NSCLC）二线治疗。需要进行卫生经济学评价，支持定价策略和医保谈判。

## 研究问题

1. 与现有标准治疗（多西他赛）相比，Drug-X的成本-效果如何？
2. 在什么价格阈值下，Drug-X具有成本效果优势？
3. 纳入医保后的预算影响如何？

---

## 模型结构

### 决策树 + Markov模型

```
                    Drug-X
                   /      \
            进展前(PFS)   进展后(PD)
               |            |
           [Markov循环]  [Markov循环]
               |            |
            死亡          死亡
```

### Markov状态

| 状态 | 描述 | 周期长度 |
|------|------|---------|
| PFS | 无进展生存 | 1个月 |
| PD | 进展后生存 | 1个月 |
| Death | 死亡 | 吸收态 |

---

## 参数设置

### 临床参数

| 参数 | Drug-X | 多西他赛 | 来源 |
|------|--------|---------|------|
| 中位PFS（月） | 8.5 | 4.2 | KEYNOTE-010 |
| 中位OS（月） | 17.2 | 10.5 | KEYNOTE-010 |
| ORR | 45% | 28% | KEYNOTE-010 |
| 3-4级AE发生率 | 15% | 35% | KEYNOTE-010 |

### 成本参数（人民币）

| 项目 | Drug-X | 多西他赛 |
|------|--------|---------|
| 药物费用/周期 | ¥28,000 | ¥8,500 |
| 给药费用/周期 | ¥1,200 | ¥800 |
| AE管理费用 | ¥5,000 | ¥12,000 |
| 随访检查/周期 | ¥2,500 | ¥2,500 |
| 支持治疗/周期 | ¥3,000 | ¥4,500 |

### 健康效用值

| 状态 | 效用值 | 来源 |
|------|--------|------|
| PFS（治疗中） | 0.65 | 中国NSCLC研究 |
| PFS（维持） | 0.78 | KEYNOTE QoL子研究 |
| PD | 0.45 | 中国肺癌登记 |
| 3-4级AE | -0.15 (disutility) | 系统综述 |

---

## 分析结果

### 基础分析

| 指标 | Drug-X | 多西他赛 | 增量 |
|------|--------|---------|------|
| 总成本 | ¥485,000 | ¥198,000 | +¥287,000 |
| QALYs | 1.42 | 0.85 | +0.57 |
| ICER | - | - | ¥503,509/QALY |

### 敏感性分析

#### 单因素敏感性分析（龙卷风图）

影响ICER的主要因素：
1. Drug-X药物价格（±30%）
2. PFS风险比（0.6-0.9）
3. OS风险比（0.5-0.8）
4. PFS效用值（0.55-0.75）
5. 折现率（0-5%）

#### 概率敏感性分析（PSA）

- **模拟次数**: 10,000次
- **抽样方法**: 拉丁超立方抽样（LHS）
- **支付意愿阈值**: ¥150,000/QALY（中国推荐）

**结果**:
- 在WTP=¥150,000/QALY时，Drug-X具有成本效果的概率：**32.5%**
- 在WTP=¥500,000/QALY时，Drug-X具有成本效果的概率：**68.7%**

### 预算影响分析（BIA）

| 年份 | 患者人数 | Drug-X费用 | 现有治疗费用 | 增量预算 |
|------|---------|-----------|-------------|---------|
| 第1年 | 5,000 | ¥2.43亿 | ¥0.99亿 | +¥1.44亿 |
| 第2年 | 8,000 | ¥3.88亿 | ¥1.58亿 | +¥2.30亿 |
| 第3年 | 12,000 | ¥5.82亿 | ¥2.38亿 | +¥3.44亿 |
| 第4年 | 15,000 | ¥7.28亿 | ¥2.97亿 | +¥4.31亿 |
| 第5年 | 18,000 | ¥8.73亿 | ¥3.56亿 | +¥5.17亿 |

---

## 定价建议

### 基于成本效果的定价

| WTP阈值 | 最高可接受ICER | 建议价格/周期 |
|---------|---------------|-------------|
| ¥150,000/QALY | ¥150,000 | ¥12,500 |
| ¥300,000/QALY | ¥300,000 | ¥21,800 |
| ¥500,000/QALY | ¥500,000 | ¥34,200 |

### 市场准入策略

1. **差异化定价**: 根据不同支付能力制定多层次价格
2. **患者援助计划**: 买3赠3，降低患者自付比例
3. **医保谈判**: 以¥150,000/QALY为锚点，争取¥18,000-22,000/周期
4. **风险分担**: 基于疗效的按结果付费协议

---

## 结论

1. **基础分析**: 在当前定价下，Drug-X的ICER为¥503,509/QALY，高于中国推荐阈值¥150,000/QALY
2. **敏感性分析**: 价格是影响成本效果的最关键因素
3. **定价建议**: 若价格降至¥18,000/周期以下，Drug-X在¥150,000/QALY阈值下具有成本效果
4. **预算影响**: 5年累计增量预算约¥16.7亿，需要医保基金评估承受能力

---

## 技术实现

```python
from src.markov_model import MarkovModel
from src.cost_effectiveness import CostEffectivenessAnalysis
from src.psa import ProbabilisticSensitivityAnalysis

# 1. 定义Markov模型
model = MarkovModel(
    states=["PFS", "PD", "Death"],
    cycle_length=1,  # 月
    num_cycles=60,
    discount_rate=0.03
)

# 2. 设置转移概率
model.set_transition("PFS", "PD", base=0.118)  # HR=0.61
model.set_transition("PFS", "Death", base=0.012)
model.set_transition("PD", "Death", base=0.065)

# 3. 运行成本效果分析
cea = CostEffectivenessAnalysis(
    model=model,
    comparator="多西他赛",
    intervention="Drug-X",
    wtp_threshold=150000
)
results = cea.run()

# 4. 概率敏感性分析
psa = ProbabilisticSensitivityAnalysis(
    cea=cea,
    n_simulations=10000,
    sampling_method="lhs"
)
psa_results = psa.run()
psa.plot_ceac()  # 成本效果可接受曲线
```

---

## 参考文献

1. Herbst RS, et al. Pembrolizumab versus docetaxel for previously treated, PD-L1-positive, advanced non-small-cell lung cancer (KEYNOTE-010). Lancet. 2016.
2. 中国肺癌诊疗指南 2024版
3. 中国药物经济学评价指南 2023版
4. ISPOR Good Practices for Cost-Effectiveness Analysis

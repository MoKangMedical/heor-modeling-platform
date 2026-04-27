"""
HEOR Modeling Platform — Streamlit 界面
提供Markov模型、冰山模型、生存分析和成本-效果分析的交互界面
"""

import streamlit as st
import numpy as np
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from markov_model import MarkovModel
from iceberg import IcebergModel
from survival_analysis import (
    KaplanMeierEstimator, ParametricSurvivalModel, PartitionedSurvivalModel
)

st.set_page_config(page_title="HEOR Modeling Platform", page_icon="📊", layout="wide")

st.title("📊 HEOR Modeling Platform")
st.markdown("卫生经济学与结果研究（HEOR）建模平台 — 支持Markov模型、冰山模型、生存分析和成本-效果分析")


# ========== 侧边栏导航 ==========
page = st.sidebar.selectbox(
    "选择模块",
    ["🏠 首页", "📈 Markov模型", "🧊 冰山模型", "📉 生存分析", "💊 分区生存模型", "📋 模型模板库"]
)


# ========== 首页 ==========
if page == "🏠 首页":
    st.header("欢迎使用 HEOR Modeling Platform")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.info("**📈 Markov模型**\n多状态队列模型，支持半周期校正、贴现和敏感性分析")
    with col2:
        st.info("**🧊 冰山模型**\n疾病经济负担全景分析，展示直接和间接成本")
    with col3:
        st.info("**📉 生存分析**\nKM估计、参数模型拟合和分区生存模型")
    
    st.markdown("---")
    st.markdown("""
    ### 功能特点
    - 🔄 **Markov队列模型** — 多状态转移、半周期校正、PSA敏感性分析
    - 🧊 **冰山模型** — 直接/间接成本分解、经济负担全景展示
    - 📉 **生存分析** — Kaplan-Meier估计、5种参数分布、AIC/BIC比较
    - 💊 **分区生存模型** — 基于PFS/OS的肿瘤药物经济学评价
    - 📊 **模型模板库** — 预置常用HEOR建模模板
    """)


# ========== Markov模型 ==========
elif page == "📈 Markov模型":
    st.header("📈 Markov队列模型")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("模型参数")
        num_states = st.slider("状态数", 2, 6, 3)
        state_names = []
        for i in range(num_states):
            name = st.text_input(f"状态 {i+1} 名称", value=["健康", "疾病", "死亡"][i] if i < 3 else f"状态{i+1}")
            state_names.append(name)
        
        num_cycles = st.number_input("周期数", 1, 100, 30)
        cycle_length = st.number_input("周期长度", 0.1, 10.0, 1.0)
        discount_rate = st.number_input("贴现率 (%)", 0.0, 20.0, 3.0) / 100
        half_cycle = st.checkbox("半周期校正", value=True)
    
    with col2:
        st.subheader("转移概率矩阵")
        matrix = []
        for i in range(num_states):
            cols = st.columns(num_states)
            row = []
            for j in range(num_states):
                default = 0.85 if i == j else (0.10 if j == i+1 and i < num_states-1 else (0.05 if j == num_states-1 else 0.0))
                val = cols[j].number_input(
                    f"{state_names[i]}→{state_names[j]}",
                    0.0, 1.0, default, 0.01, key=f"t_{i}_{j}"
                )
                row.append(val)
            matrix.append(row)
    
    st.subheader("成本与效用")
    costs = {}
    utilities = {}
    cols_cost = st.columns(num_states)
    for i, name in enumerate(state_names):
        costs[name] = cols_cost[i].number_input(f"{name} 年成本 (¥)", 0.0, 1000000.0, 15000.0 if i == 1 else 0.0, key=f"cost_{i}")
        utilities[name] = cols_cost[i].number_input(f"{name} 效用", 0.0, 1.0, 0.75 if i == 1 else (1.0 if i == 0 else 0.0), 0.01, key=f"util_{i}")
    
    if st.button("运行 Markov 模型", type="primary"):
        model = MarkovModel(
            states=state_names,
            cycle_length=cycle_length,
            num_cycles=num_cycles,
            half_cycle_correction=half_cycle,
            discount_rate=discount_rate
        )
        model.set_transition_matrix(matrix)
        model.set_costs(costs)
        model.set_utilities(utilities)
        
        results = model.run()
        
        st.success("模型运行完成！")
        
        col1, col2, col3 = st.columns(3)
        col1.metric("总贴现成本", f"¥{results['total_cost']:,.2f}")
        col2.metric("总贴现QALY", f"{results['total_qaly']:.4f}")
        col3.metric("ICER", f"¥{results['total_cost']/max(results['total_qaly'],0.001):,.2f}/QALY")
        
        st.subheader("状态分布轨迹")
        import pandas as pd
        df = pd.DataFrame(results["trace"], columns=state_names)
        df.index.name = "周期"
        st.line_chart(df)


# ========== 冰山模型 ==========
elif page == "🧊 冰山模型":
    st.header("🧊 疾病经济负担冰山模型")
    
    disease = st.text_input("疾病名称", "2型糖尿病")
    population = st.number_input("目标人群规模", 1000, 10000000, 100000)
    
    st.subheader("直接医疗成本（水面以上）")
    direct_medical = {}
    n_dm = st.number_input("直接医疗成本项数", 1, 10, 4, key="n_dm")
    for i in range(n_dm):
        col1, col2 = st.columns(2)
        name = col1.text_input(f"项目名称", ["药物费用", "住院费用", "门诊费用", "检查费用"][i] if i < 4 else f"项目{i+1}", key=f"dm_name_{i}")
        amount = col2.number_input(f"金额 (¥)", 0.0, 1000000.0, [4800, 15000, 600, 1200][i] if i < 4 else 0.0, key=f"dm_amt_{i}")
        direct_medical[name] = amount
    
    st.subheader("间接成本（水面以下）")
    indirect = {}
    n_ind = st.number_input("间接成本项数", 1, 10, 3, key="n_ind")
    for i in range(n_ind):
        col1, col2 = st.columns(2)
        name = col1.text_input(f"项目名称", ["误工损失", "提前退休", "生产力损失"][i] if i < 3 else f"间接项{i+1}", key=f"ind_name_{i}")
        amount = col2.number_input(f"金额 (¥)", 0.0, 1000000.0, [8000, 12000, 25000][i] if i < 3 else 0.0, key=f"ind_amt_{i}")
        indirect[name] = amount
    
    if st.button("生成冰山模型报告", type="primary"):
        iceberg = IcebergModel(disease=disease, population_size=population)
        iceberg.add_direct_medical_costs(direct_medical)
        iceberg.add_indirect_costs(indirect)
        
        report = iceberg.generate_report()
        s = report["summary"]
        
        col1, col2, col3 = st.columns(3)
        col1.metric("直接成本", f"¥{s['direct_costs']:,.0f}")
        col2.metric("间接成本", f"¥{s['indirect_costs']:,.0f}")
        col3.metric("总经济负担", f"¥{s['total_burden']:,.0f}")
        
        st.metric("冰山比（隐性/显性）", f"{s['iceberg_ratio']:.2f}x")
        
        st.subheader("成本构成")
        import pandas as pd
        chart_data = pd.DataFrame({
            "类别": ["直接成本"] + list(indirect.keys()),
            "金额": [sum(direct_medical.values())] + list(indirect.values())
        })
        st.bar_chart(chart_data.set_index("类别"))


# ========== 生存分析 ==========
elif page == "📉 生存分析":
    st.header("📉 生存分析")
    
    st.subheader("输入生存数据")
    data_input = st.text_area(
        "数据格式：每行一个观测，格式为 time,event（1=事件, 0=删失）",
        "1,1\n2,0\n3,1\n4,1\n5,0\n6,1\n8,1\n10,0\n12,1\n15,0\n18,1\n20,0\n24,1",
        height=200
    )
    
    if st.button("运行生存分析", type="primary"):
        lines = [l.strip() for l in data_input.strip().split("\n") if l.strip()]
        times, events = [], []
        for line in lines:
            parts = line.split(",")
            times.append(float(parts[0]))
            events.append(int(parts[1]))
        
        # KM估计
        st.subheader("Kaplan-Meier 估计")
        km = KaplanMeierEstimator()
        km_result = km.fit(times, events)
        
        col1, col2 = st.columns(2)
        col1.metric("中位生存时间", f"{km_result['median_survival']} 单位时间" if km_result['median_survival'] else "未达到")
        col2.metric("观测数", f"{len(times)}")
        
        # 参数模型对比
        st.subheader("参数生存模型对比")
        all_models = ParametricSurvivalModel.fit_all_distributions(times, events)
        
        import pandas as pd
        model_df = pd.DataFrame([
            {"分布": m["distribution"], "AIC": round(m["aic"], 2), "BIC": round(m["bic"], 2), "对数似然": round(m["log_likelihood"], 2)}
            for m in all_models
        ])
        st.dataframe(model_df, use_container_width=True)
        
        best = all_models[0]
        st.success(f"最佳拟合分布: **{best['distribution']}** (AIC={best['aic']:.2f})")


# ========== 分区生存模型 ==========
elif page == "💊 分区生存模型":
    st.header("💊 分区生存模型（PartSA）")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("PFS 参数")
        pfs_dist = st.selectbox("PFS分布", ["weibull", "exponential", "lognormal", "loglogistic", "gompertz"])
        pfs_shape = st.number_input("PFS shape", 0.1, 5.0, 0.85, 0.01)
        pfs_scale = st.number_input("PFS scale", 1.0, 100.0, 14.2, 0.1)
    
    with col2:
        st.subheader("OS 参数")
        os_dist = st.selectbox("OS分布", ["weibull", "exponential", "lognormal", "loglogistic", "gompertz"], index=0)
        os_shape = st.number_input("OS shape", 0.1, 5.0, 0.92, 0.01)
        os_scale = st.number_input("OS scale", 1.0, 200.0, 22.5, 0.1)
    
    col3, col4 = st.columns(2)
    with col3:
        st.subheader("成本设置")
        pfs_cost = st.number_input("PFS 月成本 (¥)", 0.0, 100000.0, 12500.0)
        pps_cost = st.number_input("PPS 月成本 (¥)", 0.0, 100000.0, 26000.0)
    
    with col4:
        st.subheader("效用设置")
        pfs_util = st.number_input("PFS 效用", 0.0, 1.0, 0.80)
        pps_util = st.number_input("PPS 效用", 0.0, 1.0, 0.55)
    
    num_cycles = st.number_input("模拟周期数（月）", 12, 120, 60)
    
    if st.button("运行 PartSA 模型", type="primary"):
        psa = PartitionedSurvivalModel(num_cycles=num_cycles)
        psa.set_pfs_params(pfs_dist, shape=pfs_shape, scale=pfs_scale)
        psa.set_os_params(os_dist, shape=os_shape, scale=os_scale)
        psa.set_costs("PFS", {"total": pfs_cost})
        psa.set_costs("PPS", {"total": pps_cost})
        psa.set_utilities({"PFS": pfs_util, "PPS": pps_util})
        
        results = psa.run()
        
        col1, col2, col3 = st.columns(3)
        col1.metric("总QALY", f"{results['total_qaly']:.4f}")
        col2.metric("总成本", f"¥{results['total_cost']:,.0f}")
        col3.metric("中位PFS", f"{results['median_pfs']:.1f}月" if results['median_pfs'] else "未达到")
        
        st.subheader("生存曲线")
        import pandas as pd
        chart_df = pd.DataFrame({
            "时间（月）": results["times"],
            "PFS": results["pfs_curve"],
            "OS": results["os_curve"]
        })
        st.line_chart(chart_df.set_index("时间（月）"))


# ========== 模型模板库 ==========
elif page == "📋 模型模板库":
    st.header("📋 模型模板库")
    
    template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "model-templates.json")
    if os.path.exists(template_path):
        with open(template_path) as f:
            templates = json.load(f)
        
        for tpl in templates.get("templates", []):
            with st.expander(f"📄 {tpl['name']} ({tpl['type']})"):
                st.markdown(f"**描述**: {tpl['description']}")
                st.markdown(f"**适用场景**: {', '.join(tpl['use_cases'])}")
                st.json(tpl["parameters"])
    else:
        st.warning("未找到模型模板文件")


# 侧边栏信息
st.sidebar.markdown("---")
st.sidebar.markdown("### 关于")
st.sidebar.markdown("HEOR Modeling Platform v1.0\n\n支持卫生经济学与结果研究的多维度建模分析")

const palette = {
  navy: "#1b345d",
  evidence: "#2f6fed",
  calibration: "#7c5ce0",
  simulation: "#18a6a0",
  review: "#d9852c",
  success: "#2e9d6b",
  muted: "#5f6f83",
  line: "rgba(19, 32, 51, 0.1)",
};

const calibrationObserved = [0.98, 0.91, 0.82, 0.69, 0.57, 0.45, 0.33, 0.23];
const calibrationPredicted = {
  low: [0.98, 0.93, 0.86, 0.77, 0.68, 0.59, 0.51, 0.42],
  base: [0.98, 0.9, 0.81, 0.7, 0.58, 0.46, 0.34, 0.24],
  high: [0.98, 0.87, 0.75, 0.62, 0.5, 0.39, 0.28, 0.19],
};
const calibrationBand = {
  upper: [0.99, 0.93, 0.85, 0.74, 0.63, 0.52, 0.41, 0.3],
  lower: [0.97, 0.87, 0.77, 0.66, 0.54, 0.4, 0.28, 0.19],
};

const workflowSteps = [
  {
    index: "01",
    tone: "evidence",
    status: "从这里开始",
    title: "上传证据",
    summary: "把 KM / survival / hazard 数据放进平台，先完成字段校验、时间对齐和对象标准化。",
    action: "上传一份表格，或直接加载 demo 数据",
    result: "已校验的证据对象",
  },
  {
    index: "02",
    tone: "evidence",
    status: "准备下一步",
    title: "构建概率函数",
    summary: "把整理好的 survival / hazard 证据转换成每个 cycle 可直接调用的事件概率。",
    action: "选择一份证据对象并生成概率函数",
    result: "可追溯的概率函数",
  },
  {
    index: "03",
    tone: "simulation",
    status: "核心运行",
    title: "运行校准与模拟",
    summary: "先让模型贴近真实观察数据，再执行 Markov / PSA，并把样本矩阵、随机种子和产物一起保存。",
    action: "设置参数边界、抽样方式和周期数，然后启动 run",
    result: "校准结果与运行指标",
  },
  {
    index: "04",
    tone: "review",
    status: "可直接审阅",
    title: "审阅输出结果",
    summary: "先看基线结论，再看校准覆盖图、PSA 散点图、队列轨迹和可导出的审阅包。",
    action: "打开一条 run，切换图、看解释、导出产物",
    result: "可分享的结果页面",
  },
];

const surfaces = {
  evidence: {
    key: "evidence",
    tone: "evidence",
    label: "证据工作台",
    kicker: "先整理好输入，再继续后面的分析",
    title: "把原始临床数据整理成下一步可以直接调用的证据层",
    description:
      "你把 survival / hazard / KM 数据和 compound curve 定义带进来，平台先帮你做对象标准化、时间对齐和校验日志，然后再把这些结果交给运行时和求解层。",
    status: "证据已标准化，可继续往下走",
    inputs: ["OS / PFS KM 表", "风险表", "复合曲线片段"],
    system: ["字段校验与时间对齐", "单位换算与留痕日志", "对象标准化与版本标记"],
    outputs: ["证据序列", "拟合曲线", "复合曲线", "概率函数草稿"],
  },
  calibration: {
    key: "calibration",
    tone: "calibration",
    label: "校准工作台",
    kicker: "先把模型拉近真实观察数据，再去大规模跑分析",
    title: "用真实临床观察数据调整模型，让结果更像真实疾病进程",
    description:
      "你在这里设定目标曲线、参数边界和优化设置。平台负责异步拟合、记录优化轨迹，并把观察值对预测值的覆盖图带回同一界面里。",
    status: "校准完成后会返回 overlay 与 best-fit 参数",
    inputs: ["OS / PFS 目标曲线", "进展和死亡参数边界", "目标函数"],
    system: ["优化循环", "拟合优度评分", "校准图渲染"],
    outputs: ["最佳参数组合", "拟合得分", "版本化校准产物"],
  },
  simulation: {
    key: "simulation",
    tone: "simulation",
    label: "模拟实验室",
    kicker: "把函数真正跑起来，再看患者队列如何流动",
    title: "启动一次真实模拟，并把中间过程和结果一起保存下来",
    description:
      "你点击运行后，平台会异步执行队列 Markov、PSA 和敏感性分析，并保留抽样方式、随机种子、样本矩阵、运行元数据和产物。",
    status: "运行会排队、留痕、可复现",
    inputs: ["概率函数层", "模型参数", "抽样配置"],
    system: ["任务队列编排", "LHS / 随机抽样", "产物持久化"],
    outputs: ["运行状态", "样本矩阵", "指标目录", "可下载结果"],
  },
  review: {
    key: "review",
    tone: "review",
    label: "结果审阅",
    kicker: "把结果讲清楚，而不是只把图导出来",
    title: "把关键指标、动态状态流和产物放进同一张结果页里",
    description:
      "你在这里直接解释结果。平台把散点图、队列轨迹、运行元数据、产物版本和审阅备注放在一个连续阅读路径里。",
    status: "结果已可审阅、可汇报、可分享",
    inputs: ["运行指标", "患者 / 队列事件", "产物与说明"],
    system: ["坐标轴切换", "队列切片", "产物版本管理"],
    outputs: ["散点图", "队列仪表盘", "运行说明", "可分享证据包"],
  },
};

const objectCards = [
  {
    tone: "evidence",
    name: "证据序列",
    en: "ClinicalSeries",
    status: "已校验",
    tags: ["KM 点", "已对齐时间", "已版本化"],
    source: "临床试验 KM 表 / 生存表 / 风险表",
    fields: "series_type, unit, source_id, points, trace_log",
    generatedBy: "证据导入与校验流程",
    usedBy: "曲线拟合、校准目标、结果审阅",
  },
  {
    tone: "evidence",
    name: "复合曲线",
    en: "CompoundCurve",
    status: "可追溯",
    tags: ["分段组合", "规则驱动", "可复用"],
    source: "多条拟合曲线或表格片段",
    fields: "curve_parts, switch_rules, time_windows, provenance",
    generatedBy: "曲线组合工作台",
    usedBy: "概率函数、图形层、敏感性叠加",
  },
  {
    tone: "simulation",
    name: "概率函数",
    en: "ProbabilityFunction",
    status: "已版本化",
    tags: ["生存转概率", "风险转概率", "可追溯"],
    source: "证据序列 / 风险表 / 复合曲线",
    fields: "function_type, cycle_window, inputs_ref, transform_notes",
    generatedBy: "运行时编译器",
    usedBy: "Solver、绘图、校准、敏感性分析",
  },
  {
    tone: "review",
    name: "运行产物",
    en: "RunArtifact",
    status: "可分享",
    tags: ["PNG", "CSV", "运行说明"],
    source: "已完成的 Markov / PSA / 校准任务",
    fields: "artifact_type, file_key, run_id, version, reviewer_note",
    generatedBy: "运行流程与导出层",
    usedBy: "结果审阅页、下载、审计轨迹",
  },
];

const capabilityFilters = [
  { key: "all", label: "全部" },
  { key: "evidence", label: "证据" },
  { key: "calibration", label: "校准" },
  { key: "simulation", label: "模拟" },
  { key: "review", label: "审阅" },
];

const capabilities = [
  {
    key: "probability-runtime",
    workflow: "evidence",
    maturity: "core",
    title: "统一概率函数层",
    summary: "把 survival、hazard 和复合曲线统一成可被求解器、图形层和校准流程重复调用的函数层。",
    input: "证据序列 / 复合曲线",
    output: "按周期生成的事件概率",
    engine: "函数编译层",
    tags: ["P0 核心", "证据底座", "可复用"],
  },
  {
    key: "clinical-calibration",
    workflow: "calibration",
    maturity: "next",
    title: "临床校准",
    summary: "用真实观察数据自动拟合 Markov 参数，减少手工试错。",
    input: "KM / 生存数据 + 参数边界",
    output: "最佳参数集 + 拟合覆盖图",
    engine: "优化循环",
    tags: ["P1 下一步", "观察值对预测值", "覆盖图"],
  },
  {
    key: "plot-sensitivity",
    workflow: "calibration",
    maturity: "next",
    title: "图形敏感性模式",
    summary: "在生存图和 Markov 图上直接叠加低位、基线和高位结果，提升解释性。",
    input: "情景差异",
    output: "叠加曲线 + 关键驱动提示",
    engine: "可视化层",
    tags: ["P1 下一步", "图形敏感性", "结果审阅"],
  },
  {
    key: "lhs-psa",
    workflow: "simulation",
    maturity: "next",
    title: "拉丁超立方 PSA",
    summary: "更均匀地覆盖参数空间，在较少模拟次数下得到更稳定的 PSA 输出。",
    input: "分布配置",
    output: "LHS 样本矩阵 + 稳定 PSA 结果",
    engine: "抽样引擎",
    tags: ["P1 下一步", "抽样", "可复现"],
  },
  {
    key: "patient-tracking",
    workflow: "review",
    maturity: "later",
    title: "患者追踪仪表盘",
    summary: "把患者级事件日志聚合成队列仪表盘，用于发现异常迁移和结构问题。",
    input: "患者事件日志",
    output: "队列仪表盘 + 下钻轨迹",
    engine: "轨迹聚合层",
    tags: ["P2 后续", "微观模拟", "仪表盘"],
  },
  {
    key: "scatterplot",
    workflow: "review",
    maturity: "next",
    title: "自定义模拟散点图",
    summary: "任意选择输入或输出指标组合，快速识别相关性、异常点和关键驱动因素。",
    input: "运行指标目录",
    output: "自定义散点图",
    engine: "分析层",
    tags: ["P1 下一步", "指标探索", "结果分析"],
  },
];

const lancetWatch = [
  {
    title: "Accelerating cervical cancer elimination in Aboriginal and Torres Strait Islander women",
    journal: "The Lancet Public Health",
    published: "March 2026",
    lens: "Dynamic screening and elimination modelling",
    summary:
      "文章把 HPV 传播、疫苗接种、筛查和随访放进同一模拟框架，比较不同 coverage 提升路径对消除时间线的影响。它展示了 screening policy modelling 和 elimination target analysis 的典型做法。",
    doi: "https://doi.org/10.1016/S2468-2667(26)00005-8",
    source: "https://www.sciencedirect.com/science/article/pii/S2468266726000058",
  },
  {
    title: "The effect of alcohol minimum unit pricing and cancer warning labels on cancer incidence and mortality in Canada",
    journal: "The Lancet Public Health",
    published: "March 2026",
    lens: "Policy epidemiological modelling",
    summary:
      "论文比较最低单位定价和癌症警示标签对癌症发病与死亡的影响，并强调更严格政策对低收入群体和年轻人群的潜在收益。这类研究对应平台中的 policy lever、equity lens 和 multi-scenario comparison。",
    doi: "https://doi.org/10.1016/S2468-2667(26)00006-X",
    source: "https://pubmed.ncbi.nlm.nih.gov/41748236/",
  },
  {
    title: "Estimating the costs of informal care for individuals with brain health disorders from 2000 to 2021",
    journal: "The Lancet Public Health",
    published: "March 2026",
    lens: "Global cost modelling",
    summary:
      "这篇全球 modelling study 估算了 24 类 brain health disorders 的非正式照护时间和收入损失，是典型的 disease burden 与 societal cost 结合分析。需要注意，该文在 2026-02-25 发布过更正。",
    doi: "https://doi.org/10.1016/S2468-2667(26)00010-1",
    source: "https://www.sciencedirect.com/science/article/pii/S2468266726000101",
  },
  {
    title: "Health-economic impacts of age-targeted and sex-targeted Lassa fever vaccination in endemic regions of Nigeria, Guinea, Liberia, and Sierra Leone",
    journal: "The Lancet Global Health",
    published: "February 2026",
    lens: "Health-economic modelling",
    summary:
      "文章评估不同年龄和性别人群的 Lassa 疫苗接种策略，并比较不同价格下的成本效果。对我们平台而言，这类研究正好对应疫苗定向策略、阈值分析和人群层级建模。",
    doi: "https://doi.org/10.1016/S2214-109X(25)00450-4",
    source: "https://www.sciencedirect.com/science/article/pii/S2214109X25004504",
  },
  {
    title: "The potential effect of a geographically focused intervention against tuberculosis in the USA",
    journal: "The Lancet Public Health",
    published: "February 2026",
    lens: "模拟建模 + Markov 经济学结局",
    summary:
      "这篇论文用 simulation modelling 和 Markov cohort lifetime outcomes 评估针对高负担县的结核干预。它非常贴近我们平台未来的 policy scenario、targeted intervention 和 lifetime cost/outcome 分析能力。",
    doi: "https://doi.org/10.1016/S2468-2667(25)00306-8",
    source: "https://www.sciencedirect.com/science/article/pii/S2468266725003068",
  },
];

const architectureLayers = [
  {
    index: "L1",
    title: "体验层",
    body: "公开官网、产品界面、示例运行和结果审阅都属于体验层，负责解释任务流并承接用户操作。",
    items: ["GitHub Pages 公开入口", "工作台导航", "示例运行仪表盘"],
  },
  {
    index: "L2",
    title: "流程编排层",
    body: "管理证据导入、运行队列、参数配置、产物导出和审阅备注的流程编排。",
    items: ["工作台状态", "异步运行编排", "版本化配置"],
  },
  {
    index: "L3",
    title: "建模引擎层",
    body: "平台真正的差异化核心，统一概率函数层，并驱动 Markov、PSA 和临床校准等分析引擎。",
    items: ["概率函数层", "Markov 队列引擎", "LHS 抽样器", "校准优化器"],
  },
  {
    index: "L4",
    title: "数据与产物层",
    body: "持久化对象模型、运行元数据、样本矩阵和导出产物，保证版本与追溯能力。",
    items: ["PostgreSQL 元数据", "对象存储", "运行指标", "产物与日志"],
  },
  {
    index: "L5",
    title: "治理与审阅层",
    body: "把运行说明、审阅意见、假设和产物版本组织成可交付、可分享的审阅界面。",
    items: ["审阅备注", "版本谱系", "审计轨迹", "可分享输出"],
  },
];

const roadmapColumns = [
  {
    key: "p0",
    badge: "P0 核心",
    title: "先闭合证据层到概率函数层的底座",
    copy: "只要这条底层闭环可用，平台就不再是概念展示，而是一个真的能运行的分析系统。",
    items: ["上传 survival / hazard / KM 数据", "对象标准化与校验日志", "输出周期事件概率", "可追溯函数层"],
  },
  {
    key: "p1",
    badge: "P1 下一步",
    title: "把临床校准和 PSA 做成差异化能力",
    copy: "这一步决定平台是不是现代 HEOR 工具，而不只是一个建模壳子。",
    items: ["观察值对预测值校准", "PSA 的 LHS 抽样", "图形敏感性模式", "运行元数据与产物导出"],
  },
  {
    key: "p2",
    badge: "P2 后续",
    title: "补齐 Patient-level 与协作审阅层",
    copy: "当底层引擎稳定后，再把 patient trace、review comments 和分享工作流完整拉起来。",
    items: ["患者事件日志", "队列仪表盘", "审阅意见流程", "协作与审批"],
  },
];

const outputMetrics = [
  { label: "增量成本", value: "$18,440", note: "社会视角" },
  { label: "增量 QALY", value: "0.62", note: "按 3% 折现" },
  { label: "ICER", value: "$29,742 / QALY", note: "低于 $50k 阈值" },
  { label: "净货币收益", value: "$12,860", note: "支付意愿 $50,000" },
];

const artifactItems = [
  { name: "overlay-fit-v3.png", meta: "校准产物 · 已版本化" },
  { name: "psa-sample-matrix.csv", meta: "8,000 个样本 · LHS" },
  { name: "cohort-trace-cycle-24.csv", meta: "结果审阅导出" },
  { name: "assumptions-and-notes.md", meta: "可直接补充审阅意见" },
];

const scatterOptions = {
  incrementalCost: "增量成本",
  incrementalQaly: "增量 QALY",
  nmb: "净货币收益",
  osGain: "OS 获益（月）",
  pfsGain: "PFS 获益（月）",
};

const scatterPoints = [
  { incrementalCost: 11200, incrementalQaly: 0.32, nmb: 4800, osGain: 2.7, pfsGain: 1.9 },
  { incrementalCost: 11850, incrementalQaly: 0.36, nmb: 6120, osGain: 3.2, pfsGain: 2.1 },
  { incrementalCost: 12620, incrementalQaly: 0.42, nmb: 8360, osGain: 3.6, pfsGain: 2.4 },
  { incrementalCost: 13100, incrementalQaly: 0.39, nmb: 6400, osGain: 3.5, pfsGain: 2.3 },
  { incrementalCost: 14380, incrementalQaly: 0.49, nmb: 10120, osGain: 4.3, pfsGain: 2.9 },
  { incrementalCost: 15250, incrementalQaly: 0.54, nmb: 11750, osGain: 4.8, pfsGain: 3.3 },
  { incrementalCost: 15880, incrementalQaly: 0.58, nmb: 13120, osGain: 5.1, pfsGain: 3.7 },
  { incrementalCost: 16620, incrementalQaly: 0.61, nmb: 13880, osGain: 5.6, pfsGain: 4.1 },
  { incrementalCost: 17140, incrementalQaly: 0.65, nmb: 15360, osGain: 6.1, pfsGain: 4.2 },
  { incrementalCost: 18260, incrementalQaly: 0.69, nmb: 16240, osGain: 6.7, pfsGain: 4.6 },
  { incrementalCost: 19050, incrementalQaly: 0.71, nmb: 16450, osGain: 6.9, pfsGain: 4.9 },
  { incrementalCost: 19780, incrementalQaly: 0.74, nmb: 17220, osGain: 7.3, pfsGain: 5.2 },
];

const ceacThresholds = [20000, 40000, 60000, 80000, 100000, 120000, 150000];
const ceacProbabilities = [0.44, 0.58, 0.68, 0.76, 0.83, 0.87, 0.91];

const cohortTimeline = [
  { label: "Cycle 0 · Month 0", pfs: 100, pd: 0, dead: 0 },
  { label: "Cycle 4 · Month 2", pfs: 84, pd: 12, dead: 4 },
  { label: "Cycle 8 · Month 4", pfs: 71, pd: 21, dead: 8 },
  { label: "Cycle 12 · Month 6", pfs: 58, pd: 28, dead: 14 },
  { label: "Cycle 18 · Month 9", pfs: 42, pd: 34, dead: 24 },
  { label: "Cycle 24 · Month 12", pfs: 31, pd: 35, dead: 34 },
  { label: "Cycle 36 · Month 18", pfs: 18, pd: 30, dead: 52 },
];

const state = {
  activeSurface: "evidence",
  capabilityFilter: "all",
  evidenceLoaded: false,
  surfaceScenario: "base",
  exampleScenario: "base",
  runProgress: 0,
  runTimer: null,
  reviewX: "incrementalCost",
  reviewY: "incrementalQaly",
  exampleX: "incrementalCost",
  exampleY: "incrementalQaly",
  reviewCohortIndex: 3,
  exampleCohortIndex: 2,
};

const workflowRail = document.getElementById("workflow-rail");
const surfaceNav = document.getElementById("surface-nav");
const surfaceKicker = document.getElementById("surface-kicker");
const surfaceTitle = document.getElementById("surface-title");
const surfaceStatus = document.getElementById("surface-status");
const surfaceDescription = document.getElementById("surface-description");
const surfaceInputs = document.getElementById("surface-inputs");
const surfaceSystem = document.getElementById("surface-system");
const surfaceOutputs = document.getElementById("surface-outputs");
const surfaceExperience = document.getElementById("surface-experience");
const metricCards = document.getElementById("metric-cards");
const exampleScenarioToggle = document.getElementById("example-scenario-toggle");
const exampleCalibration = document.getElementById("example-calibration");
const exampleScatter = document.getElementById("example-scatter");
const exampleScatterX = document.getElementById("example-scatter-x");
const exampleScatterY = document.getElementById("example-scatter-y");
const exampleCeac = document.getElementById("example-ceac");
const exampleCohort = document.getElementById("example-cohort");
const cohortSlider = document.getElementById("cohort-slider");
const cohortTime = document.getElementById("cohort-time");
const artifactList = document.getElementById("artifact-list");
const objectGrid = document.getElementById("object-grid");
const filterBar = document.getElementById("filter-bar");
const capabilityGrid = document.getElementById("capability-grid");
const lancetCount = document.getElementById("lancet-count");
const lancetGrid = document.getElementById("lancet-grid");
const architectureStack = document.getElementById("architecture-stack");
const roadmapGrid = document.getElementById("roadmap-grid");
const heroChart = document.getElementById("hero-chart");

function listMarkup(items) {
  return items.map((item) => `<li>${item}</li>`).join("");
}

function toneClass(tone) {
  return `tone-${tone}`;
}

function maturityClass(maturity) {
  if (maturity === "core") return "core";
  if (maturity === "next") return "next";
  return "later";
}

function maturityLabel(maturity) {
  if (maturity === "core") return "P0 核心";
  if (maturity === "next") return "P1 下一步";
  return "P2 后续";
}

function renderWorkflow() {
  if (!workflowRail) {
    return;
  }

  workflowRail.innerHTML = workflowSteps
    .map(
      (step) => `
        <article class="workflow-step">
          <div class="workflow-step-head">
            <span class="workflow-index">${step.index}</span>
            <span class="mini-label ${toneClass(step.tone)}">${step.status}</span>
          </div>
          <div class="workflow-copy">
            <h3>${step.title}</h3>
            <p>${step.summary}</p>
          </div>
          <div class="workflow-meta">
            <div class="detail-block">
              <span>你做什么</span>
              <strong>${step.action}</strong>
            </div>
            <div class="detail-block">
              <span>完成后得到</span>
              <strong>${step.result}</strong>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderHeroChart() {
  if (!heroChart) {
    return;
  }
  heroChart.innerHTML = makeCalibrationSvg("base", { compact: true, note: "观察值与预测值" });
  attachChartTooltip(heroChart);
}

function renderSurfaceNav() {
  if (!surfaceNav) {
    return;
  }

  surfaceNav.innerHTML = Object.values(surfaces)
    .map(
      (surface) => `
        <button class="${surface.key === state.activeSurface ? "active" : ""}" data-surface="${surface.key}">
          ${surface.label}
        </button>
      `
    )
    .join("");

  surfaceNav.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeSurface = button.dataset.surface;
      renderSurfaceNav();
      renderSurfaceView();
    });
  });
}

function currentSurfaceStatus() {
  if (state.activeSurface === "evidence") {
    return state.evidenceLoaded ? "3 份证据已整理 · 4 个对象可继续使用" : surfaces.evidence.status;
  }
  if (state.activeSurface === "simulation") {
    if (state.runProgress === 0) return surfaces.simulation.status;
    if (state.runProgress < 100) return `分析进行中 · ${state.runProgress}%`;
    return "分析已完成 · 产物已保存";
  }
  return surfaces[state.activeSurface].status;
}

function renderSurfaceView() {
  if (!surfaceKicker || !surfaceTitle || !surfaceStatus || !surfaceDescription || !surfaceInputs || !surfaceSystem || !surfaceOutputs || !surfaceExperience) {
    return;
  }

  const surface = surfaces[state.activeSurface];
  surfaceKicker.textContent = surface.kicker;
  surfaceTitle.textContent = surface.title;
  surfaceStatus.textContent = currentSurfaceStatus();
  surfaceDescription.textContent = surface.description;
  surfaceInputs.innerHTML = listMarkup(surface.inputs);
  surfaceSystem.innerHTML = listMarkup(surface.system);
  surfaceOutputs.innerHTML = listMarkup(surface.outputs);
  surfaceExperience.innerHTML = surfaceTemplate(surface.key);
  attachSurfaceInteractions(surface.key);
}

function surfaceTemplate(key) {
  if (key === "evidence") {
    return `
      <div class="experience-grid">
        <section class="input-card">
          <span class="mini-label tone-evidence">拖拽导入</span>
          <div class="dropzone">
            <div>
              <strong>${state.evidenceLoaded ? "3 份证据文件已加入暂存区" : "把 KM / hazard / survival 文件拖进这里"}</strong>
              <p>${state.evidenceLoaded ? "时间对齐、字段校验和来源记录都已经生成。" : "支持 KM 表、风险表、复合曲线片段和试验元数据。"}</p>
              <button id="load-demo-evidence" class="fake-button">${state.evidenceLoaded ? "重新载入示例证据" : "加载一组示例证据"}</button>
            </div>
          </div>
          <p id="evidence-stage-status">${state.evidenceLoaded ? "证据对象、曲线对象和函数草稿都已准备好，可以继续往下走。" : "当前状态：等待一组示例证据。点击按钮就能体验这一步真正会发生什么。 "}</p>
        </section>
        <section class="control-card">
          <div class="mini-topline">
            <span>你已经得到的对象</span>
            <span>${state.evidenceLoaded ? "已校验" : "草稿"}</span>
          </div>
          <ul class="stack-list">
            <li><div><strong>试验 OS KM 曲线</strong><br /><small>8 个点 · 单位: 月</small></div><span class="pill ${state.evidenceLoaded ? "core" : "neutral"}">${state.evidenceLoaded ? "可继续使用" : "等待中"}</span></li>
            <li><div><strong>风险片段 A</strong><br /><small>时间窗: 0-12 月</small></div><span class="pill ${state.evidenceLoaded ? "core" : "neutral"}">${state.evidenceLoaded ? "已校验" : "草稿"}</span></li>
            <li><div><strong>复合曲线 v0.2</strong><br /><small>组合规则: 拟合曲线 + 表格</small></div><span class="pill ${state.evidenceLoaded ? "core" : "neutral"}">${state.evidenceLoaded ? "已版本化" : "待生成"}</span></li>
            <li><div><strong>生存转概率草稿</strong><br /><small>周期窗: 1 个月</small></div><span class="pill ${state.evidenceLoaded ? "core" : "neutral"}">${state.evidenceLoaded ? "可追溯" : "未编译"}</span></li>
          </ul>
        </section>
      </div>
    `;
  }

  if (key === "calibration") {
    return `
      <div class="experience-grid">
        <section class="input-card">
          <div class="panel-heading">
            <div>
              <span class="panel-kicker">覆盖图</span>
              <h3>你会先看到的校准图</h3>
            </div>
            <div id="surface-scenario-toggle" class="segmented"></div>
          </div>
          <div id="surface-calibration-chart" class="chart-frame large-frame"></div>
          <div class="object-tags">
            <span class="metric-line">观察点</span>
            <span class="metric-line">预测曲线</span>
            <span class="metric-line">不确定性带</span>
            <span class="metric-line">拟合优度与运行号一起留痕</span>
          </div>
        </section>
        <section class="control-card">
          <span class="mini-label tone-calibration">参数边界</span>
          <div class="table-card">
            <table>
              <thead>
                <tr>
                  <th>参数</th>
                  <th>下界</th>
                  <th>起始值</th>
                  <th>上界</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>p_progression</td>
                  <td>0.08</td>
                  <td>0.12</td>
                  <td>0.21</td>
                </tr>
                <tr>
                  <td>p_death</td>
                  <td>0.02</td>
                  <td>0.04</td>
                  <td>0.09</td>
                </tr>
                <tr>
                  <td>utility_pfs</td>
                  <td>0.62</td>
                  <td>0.72</td>
                  <td>0.82</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul class="stack-list">
            <li><div><strong>目标证据</strong><br /><small>来自真实临床数据的 OS 曲线</small></div><span class="pill core">已链接</span></li>
            <li><div><strong>运行记录</strong><br /><small>24 次迭代 · 优化器 = Nelder-Mead</small></div><span class="pill next">已留痕</span></li>
            <li><div><strong>拟合表现</strong><br /><small>RMSE 0.018 · R² 0.91</small></div><span class="pill next">可解释</span></li>
          </ul>
        </section>
      </div>
    `;
  }

  if (key === "simulation") {
    const buttonLabel = state.runProgress === 0 ? "运行 Markov + PSA" : state.runProgress < 100 ? "正在运行..." : "重新运行分析";
    return `
      <div class="experience-grid">
        <section class="input-card">
          <span class="mini-label tone-simulation">分析执行中</span>
          <p>点击运行按钮后，状态条、样本数、queue 状态和 artifact 生成都会变化，让你看到一次真实分析是怎样一步步完成的。</p>
          <button id="run-psa-button" class="run-button">${buttonLabel}</button>
          <div class="mini-topline">
            <span id="run-status-text">${state.runProgress === 0 ? "准备开始" : state.runProgress < 100 ? "Markov + PSA 正在执行" : "已完成并保存"}</span>
            <span id="run-progress-label">${state.runProgress}%</span>
          </div>
          <div class="progress-bar"><span id="run-progress-bar" style="width:${state.runProgress}%"></span></div>
          <div class="run-meta">
            <div><span>抽样</span><strong>${state.runProgress === 0 ? "LHS 待运行" : "拉丁超立方"}</strong></div>
            <div><span>样本数</span><strong>${state.runProgress === 0 ? "0" : state.runProgress < 100 ? "8,000 已排队" : "8,000 已完成"}</strong></div>
            <div><span>随机种子</span><strong>874211</strong></div>
          </div>
        </section>
        <section class="control-card">
          <span class="mini-label tone-simulation">运行记录与产物</span>
          <ul class="stack-list">
            <li><div><strong>RUN-2026-0315-014</strong><br /><small>分析类型: 队列 Markov + PSA</small></div><span class="pill ${state.runProgress === 100 ? "core" : "next"}">${state.runProgress === 100 ? "完成" : "排队中"}</span></li>
            <li><div><strong>样本矩阵</strong><br /><small>lhs_samples_v2.csv</small></div><span class="pill ${state.runProgress > 20 ? "core" : "neutral"}">${state.runProgress > 20 ? "已保存" : "等待中"}</span></li>
            <li><div><strong>结果包</strong><br /><small>icer_summary.json · ce_plane.png</small></div><span class="pill ${state.runProgress === 100 ? "core" : "neutral"}">${state.runProgress === 100 ? "可查看" : "未生成"}</span></li>
          </ul>
        </section>
      </div>
    `;
  }

  return `
      <div class="experience-grid">
      <section class="input-card">
        <span class="mini-label tone-review">结果阅读器</span>
        <div class="review-controls">
          <label>
            X 轴
            <select id="surface-review-x"></select>
          </label>
          <label>
            Y 轴
            <select id="surface-review-y"></select>
          </label>
          <label>
            队列切片
            <input id="surface-cohort-slider" class="cohort-slider" type="range" min="0" max="6" value="${state.reviewCohortIndex}" />
          </label>
        </div>
        <div id="surface-review-scatter" class="chart-frame"></div>
      </section>
      <section class="control-card">
        <div class="mini-topline">
          <span>当前 cohort trace</span>
          <span id="surface-cohort-time" class="pill neutral"></span>
        </div>
        <div id="surface-cohort-board" class="cohort-board"></div>
        <ul class="stack-list">
          <li><div><strong>版本化说明</strong><br /><small>assumptions-and-notes.md</small></div><span class="pill core">v0.3</span></li>
          <li><div><strong>可下载产物</strong><br /><small>overlay-fit-v3.png</small></div><span class="pill core">可导出</span></li>
          <li><div><strong>审阅意见</strong><br /><small>“Check p_death sensitivity above month 18”</small></div><span class="pill next">待处理</span></li>
        </ul>
      </section>
    </div>
  `;
}

function attachSurfaceInteractions(key) {
  if (key === "evidence") {
    const button = document.getElementById("load-demo-evidence");
    if (!button) {
      return;
    }
    button.addEventListener("click", () => {
      state.evidenceLoaded = !state.evidenceLoaded;
      renderSurfaceView();
    });
    return;
  }

  if (key === "calibration") {
    const scenarioToggle = document.getElementById("surface-scenario-toggle");
    const chartTarget = document.getElementById("surface-calibration-chart");
    if (!scenarioToggle || !chartTarget) {
      return;
    }
    mountScenarioToggle(scenarioToggle, state.surfaceScenario, (value) => {
      state.surfaceScenario = value;
      attachSurfaceInteractions("calibration");
    });
    renderCalibrationInto(chartTarget, state.surfaceScenario, false);
    return;
  }

  if (key === "simulation") {
    const button = document.getElementById("run-psa-button");
    if (!button) {
      return;
    }
    button.addEventListener("click", startRunAnimation);
    return;
  }

  const reviewXSelect = document.getElementById("surface-review-x");
  const reviewYSelect = document.getElementById("surface-review-y");
  const reviewScatter = document.getElementById("surface-review-scatter");
  const reviewSlider = document.getElementById("surface-cohort-slider");
  const reviewBoard = document.getElementById("surface-cohort-board");
  const reviewTime = document.getElementById("surface-cohort-time");
  if (!reviewXSelect || !reviewYSelect || !reviewScatter || !reviewSlider || !reviewBoard || !reviewTime) {
    return;
  }

  populateScatterSelect(reviewXSelect, state.reviewX);
  populateScatterSelect(reviewYSelect, state.reviewY);
  reviewXSelect.addEventListener("change", (event) => {
    state.reviewX = event.target.value;
    renderScatterInto(reviewScatter, state.reviewX, state.reviewY);
  });
  reviewYSelect.addEventListener("change", (event) => {
    state.reviewY = event.target.value;
    renderScatterInto(reviewScatter, state.reviewX, state.reviewY);
  });
  reviewSlider.addEventListener("input", (event) => {
    state.reviewCohortIndex = Number(event.target.value);
    renderCohortInto(reviewBoard, reviewTime, state.reviewCohortIndex);
  });
  renderScatterInto(reviewScatter, state.reviewX, state.reviewY);
  renderCohortInto(reviewBoard, reviewTime, state.reviewCohortIndex);
}

function mountScenarioToggle(container, active, onSelect) {
  if (!container) {
    return;
  }

  const scenarios = [
    { key: "low", label: "低情景" },
    { key: "base", label: "基线" },
    { key: "high", label: "高情景" },
  ];
  container.innerHTML = scenarios
    .map(
      (item) => `
        <button class="${item.key === active ? "active" : ""}" data-scenario="${item.key}">
          ${item.label}
        </button>
      `
    )
    .join("");

  container.querySelectorAll("button").forEach((button) => {
    button.onclick = () => onSelect(button.dataset.scenario);
  });
}

function renderMetrics() {
  if (!metricCards) {
    return;
  }

  metricCards.innerHTML = outputMetrics
    .map(
      (metric, index) => `
        <article class="metric-card">
          <span class="mini-label ${index === 0 ? "tone-evidence" : index === 1 ? "tone-simulation" : index === 2 ? "tone-calibration" : "tone-review"}">${metric.label}</span>
          <strong>${metric.value}</strong>
          <small>${metric.note}</small>
        </article>
      `
    )
    .join("");
}

function renderExampleControls() {
  if (!exampleScenarioToggle || !exampleScatterX || !exampleScatterY) {
    return;
  }

  mountScenarioToggle(exampleScenarioToggle, state.exampleScenario, (value) => {
    state.exampleScenario = value;
    renderExampleControls();
    renderCalibrationInto(exampleCalibration, state.exampleScenario, false);
  });

  populateScatterSelect(exampleScatterX, state.exampleX);
  populateScatterSelect(exampleScatterY, state.exampleY);
  exampleScatterX.onchange = (event) => {
    state.exampleX = event.target.value;
    renderScatterInto(exampleScatter, state.exampleX, state.exampleY);
  };
  exampleScatterY.onchange = (event) => {
    state.exampleY = event.target.value;
    renderScatterInto(exampleScatter, state.exampleX, state.exampleY);
  };
  if (cohortSlider) {
    cohortSlider.oninput = (event) => {
      state.exampleCohortIndex = Number(event.target.value);
      renderCohortInto(exampleCohort, cohortTime, state.exampleCohortIndex);
    };
  }
}

function renderArtifactList() {
  if (!artifactList) {
    return;
  }

  artifactList.innerHTML = artifactItems
    .map((item) => `<li><span>${item.name}</span><small>${item.meta}</small></li>`)
    .join("");
}

function renderObjectCards() {
  if (!objectGrid) {
    return;
  }

  objectGrid.innerHTML = objectCards
    .map(
      (item) => `
        <article class="object-card">
          <div class="object-card-head">
            <div>
              <span class="mini-label ${toneClass(item.tone)}">${item.en}</span>
              <h3>${item.name}</h3>
            </div>
            <span class="pill core">${item.status}</span>
          </div>
          <div class="object-tags">
            ${item.tags.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
          <dl class="object-meta">
            <div>
              <dt>来源</dt>
              <dd>${item.source}</dd>
            </div>
            <div>
              <dt>输入字段</dt>
              <dd>${item.fields}</dd>
            </div>
            <div>
              <dt>生成方式</dt>
              <dd>${item.generatedBy}</dd>
            </div>
            <div>
              <dt>被谁调用</dt>
              <dd>${item.usedBy}</dd>
            </div>
          </dl>
        </article>
      `
    )
    .join("");
}

function renderFilterBar() {
  if (!filterBar) {
    return;
  }

  filterBar.innerHTML = capabilityFilters
    .map(
      (filter) => `
        <button class="filter-button ${filter.key === state.capabilityFilter ? "active" : ""}" data-filter="${filter.key}">
          ${filter.label}
        </button>
      `
    )
    .join("");

  filterBar.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.capabilityFilter = button.dataset.filter;
      renderFilterBar();
      renderCapabilities();
    });
  });
}

function renderCapabilities() {
  if (!capabilityGrid) {
    return;
  }

  const filtered = state.capabilityFilter === "all"
    ? capabilities
    : capabilities.filter((item) => item.workflow === state.capabilityFilter);

  capabilityGrid.innerHTML = filtered
    .map(
      (item) => `
        <article class="capability-card">
          <div class="capability-card-head">
            <span class="mini-label ${toneClass(item.workflow)}">${item.workflow}</span>
            <span class="pill ${maturityClass(item.maturity)}">${maturityLabel(item.maturity)}</span>
          </div>
          <h3>${item.title}</h3>
          <p>${item.summary}</p>
          <div class="capability-tags">
            ${item.tags.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
          <dl class="capability-meta">
            <div>
              <dt>输入</dt>
              <dd>${item.input}</dd>
            </div>
            <div>
              <dt>输出</dt>
              <dd>${item.output}</dd>
            </div>
            <div>
              <dt>引擎</dt>
              <dd>${item.engine}</dd>
            </div>
            <div>
              <dt>归属</dt>
              <dd>${surfaces[item.workflow] ? surfaces[item.workflow].label : "核心引擎"}</dd>
            </div>
          </dl>
        </article>
      `
    )
    .join("");
}

function renderLancetWatch() {
  if (!lancetCount || !lancetGrid) {
    return;
  }

  lancetCount.textContent = String(lancetWatch.length);
  lancetGrid.innerHTML = lancetWatch
    .map(
      (item) => `
        <article class="lancet-card">
          <div class="lancet-meta">
            <span class="mini-label tone-review">${item.journal}</span>
            <span class="pill neutral">${item.published}</span>
          </div>
          <h3>${item.title}</h3>
          <p>${item.summary}</p>
          <div class="object-tags">
            <span>${item.lens}</span>
          </div>
          <div class="lancet-links">
            <a class="text-link" href="${item.doi}" target="_blank" rel="noreferrer">打开 DOI</a>
            <a class="text-link" href="${item.source}" target="_blank" rel="noreferrer">查看来源页</a>
          </div>
        </article>
      `
    )
    .join("");
}

function renderArchitecture() {
  if (!architectureStack) {
    return;
  }

  architectureStack.innerHTML = architectureLayers
    .map(
      (layer) => `
        <article class="architecture-layer">
          <span class="layer-index">${layer.index}</span>
          <div>
            <h3>${layer.title}</h3>
            <p>${layer.body}</p>
          </div>
          <ul class="layer-list">
            ${layer.items.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>
      `
    )
    .join("");
}

function renderRoadmap() {
  if (!roadmapGrid) {
    return;
  }

  roadmapGrid.innerHTML = roadmapColumns
    .map(
      (column) => `
        <article class="roadmap-column ${column.key}">
          <span class="roadmap-badge">${column.badge}</span>
          <h3>${column.title}</h3>
          <p>${column.copy}</p>
          <ul>
            ${column.items.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>
      `
    )
    .join("");
}

function populateScatterSelect(select, value) {
  if (!select) {
    return;
  }

  select.innerHTML = Object.entries(scatterOptions)
    .map(([key, label]) => `<option value="${key}" ${key === value ? "selected" : ""}>${label}</option>`)
    .join("");
}

function renderCalibrationInto(target, mode, compact) {
  if (!target) {
    return;
  }

  const modeLabel = mode === "low" ? "低情景" : mode === "high" ? "高情景" : "基线";
  target.innerHTML = makeCalibrationSvg(mode, { compact, note: compact ? "预览运行" : `当前情景: ${modeLabel}` });
  attachChartTooltip(target);
}

function makeCalibrationSvg(mode, { compact = false, note = "" } = {}) {
  const width = compact ? 560 : 720;
  const height = compact ? 260 : 360;
  const padding = compact ? 34 : 44;
  const predicted = calibrationPredicted[mode];
  const scenarioColor = mode === "low" ? palette.simulation : mode === "base" ? palette.calibration : palette.review;
  const gridYs = [0, 0.25, 0.5, 0.75, 1];
  const xLabels = ["0", "3", "6", "9", "12", "15", "18", "21"];

  const toPoint = (value, index) => {
    const x = padding + (index / (calibrationObserved.length - 1)) * (width - padding * 2);
    const y = height - padding - value * (height - padding * 2);
    return [x, y];
  };

  const linePath = (values) =>
    values
      .map((value, index) => {
        const [x, y] = toPoint(value, index);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

  const bandPath = () => {
    const upper = calibrationBand.upper.map((value, index) => toPoint(value, index));
    const lower = calibrationBand.lower.map((value, index) => toPoint(value, index)).reverse();
    const points = [...upper, ...lower];
    return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";
  };

  const scenarioLabel = mode === "low" ? "低情景" : mode === "high" ? "高情景" : "基线";

  const observedDots = calibrationObserved
    .map((value, index) => {
      const [x, y] = toPoint(value, index);
      return `<circle cx="${x}" cy="${y}" r="${compact ? 3.6 : 4.5}" fill="${palette.navy}" data-tip="观察点 ${index + 1}: 生存率 ${(value * 100).toFixed(1)}%" />`;
    })
    .join("");

  const xTicks = xLabels
    .map((label, index) => {
      const [x] = toPoint(0, index);
      return `
        <text class="axis-label" x="${x}" y="${height - 12}" text-anchor="middle">${label}</text>
      `;
    })
    .join("");

  const yTicks = gridYs
    .map((tick) => {
      const y = height - padding - tick * (height - padding * 2);
      return `
        <line class="gridline" x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" />
        <text class="axis-label" x="${padding - 10}" y="${y + 4}" text-anchor="end">${tick.toFixed(2)}</text>
      `;
    })
    .join("");

  return `
    <svg class="svg-root" viewBox="0 0 ${width} ${height}" role="img" aria-label="校准覆盖图">
      ${yTicks}
      <line class="axis-line" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
      <line class="axis-line" x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
      <path d="${bandPath()}" fill="rgba(47, 111, 237, 0.12)" data-tip="不确定性带: 展示校准后的可接受波动范围" />
      <path d="${linePath(predicted)}" fill="none" stroke="${scenarioColor}" stroke-width="${compact ? 3 : 4}" stroke-linecap="round" stroke-linejoin="round" data-tip="${scenarioLabel}预测曲线" />
      <path d="${linePath(calibrationObserved)}" fill="none" stroke="${palette.navy}" stroke-width="${compact ? 1.8 : 2.2}" stroke-dasharray="5 6" opacity="0.7" data-tip="观察值曲线" />
      ${observedDots}
      ${xTicks}
      <text class="chart-label" x="${padding}" y="${compact ? 20 : 22}">观察点</text>
      <text class="chart-label" x="${width - padding}" y="${compact ? 20 : 22}" text-anchor="end">${scenarioLabel}预测曲线</text>
      <text class="chart-note" x="${padding}" y="${height - 24}">时间（月）</text>
      <text class="chart-note" x="${width - padding}" y="${height - 24}" text-anchor="end">${note}</text>
    </svg>
  `;
}

function renderScatterInto(target, xKey, yKey) {
  if (!target) {
    return;
  }

  target.innerHTML = makeScatterSvg(xKey, yKey);
  attachChartTooltip(target);
}

function makeScatterSvg(xKey, yKey) {
  const width = 420;
  const height = 280;
  const padding = 38;
  const xValues = scatterPoints.map((point) => point[xKey]);
  const yValues = scatterPoints.map((point) => point[yKey]);
  const xMin = Math.min(...xValues) * 0.92;
  const xMax = Math.max(...xValues) * 1.06;
  const yMin = Math.min(...yValues) * 0.9;
  const yMax = Math.max(...yValues) * 1.08;

  const normalizeX = (value) => padding + ((value - xMin) / (xMax - xMin)) * (width - padding * 2);
  const normalizeY = (value) => height - padding - ((value - yMin) / (yMax - yMin)) * (height - padding * 2);

  const points = scatterPoints
    .map((point, index) => {
      const x = normalizeX(point[xKey]);
      const y = normalizeY(point[yKey]);
      const fill = index % 3 === 0 ? palette.evidence : index % 3 === 1 ? palette.calibration : palette.simulation;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.2" fill="${fill}" fill-opacity="0.82" data-tip="样本 ${index + 1}: ${scatterOptions[xKey]} ${point[xKey]}，${scatterOptions[yKey]} ${point[yKey]}" />`;
    })
    .join("");

  return `
    <svg class="svg-root" viewBox="0 0 ${width} ${height}" role="img" aria-label="模拟散点图">
      <line class="gridline" x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" />
      <line class="gridline" x1="${width / 2}" y1="${padding}" x2="${width / 2}" y2="${height - padding}" />
      <line class="axis-line" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
      <line class="axis-line" x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
      ${points}
      <text class="chart-label" x="${padding}" y="22">${scatterOptions[xKey]} vs ${scatterOptions[yKey]}</text>
      <text class="chart-note" x="${width - padding}" y="22" text-anchor="end">展示 12 个样本</text>
      <text class="axis-label" x="${width / 2}" y="${height - 12}" text-anchor="middle">${scatterOptions[xKey]}</text>
      <text class="axis-label" x="18" y="${height / 2}" transform="rotate(-90 18 ${height / 2})" text-anchor="middle">${scatterOptions[yKey]}</text>
    </svg>
  `;
}

function renderCeacInto(target) {
  if (!target) {
    return;
  }

  const width = 420;
  const height = 280;
  const padding = 38;
  const xMin = ceacThresholds[0];
  const xMax = ceacThresholds[ceacThresholds.length - 1];
  const yMin = 0.35;
  const yMax = 0.95;
  const normalizeX = (value) => padding + ((value - xMin) / (xMax - xMin)) * (width - padding * 2);
  const normalizeY = (value) => height - padding - ((value - yMin) / (yMax - yMin)) * (height - padding * 2);
  const path = ceacThresholds
    .map((threshold, index) => `${index === 0 ? "M" : "L"} ${normalizeX(threshold).toFixed(1)} ${normalizeY(ceacProbabilities[index]).toFixed(1)}`)
    .join(" ");
  const points = ceacThresholds
    .map((threshold, index) => `<circle cx="${normalizeX(threshold)}" cy="${normalizeY(ceacProbabilities[index])}" r="4.5" fill="${palette.review}" />`)
    .join("");

  target.innerHTML = `
    <svg class="svg-root" viewBox="0 0 ${width} ${height}" role="img" aria-label="成本效果可接受性曲线">
      <line class="gridline" x1="${padding}" y1="${normalizeY(0.5)}" x2="${width - padding}" y2="${normalizeY(0.5)}" />
      <line class="axis-line" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
      <line class="axis-line" x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
      <path d="${path}" fill="none" stroke="${palette.review}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" data-tip="不同支付意愿阈值下的成本效果可接受概率" />
      ${points.replaceAll('fill="' + palette.review + '"', 'fill="' + palette.review + '" data-tip="对应阈值下的可接受概率"')}
      <text class="chart-label" x="${padding}" y="22">成本效果可接受概率</text>
      <text class="chart-note" x="${width - padding}" y="22" text-anchor="end">支付意愿阈值</text>
      <text class="axis-label" x="${width / 2}" y="${height - 12}" text-anchor="middle">阈值（USD / QALY）</text>
      <text class="axis-label" x="18" y="${height / 2}" transform="rotate(-90 18 ${height / 2})" text-anchor="middle">概率</text>
    </svg>
  `;
  attachChartTooltip(target);
}

function renderCohortInto(target, labelNode, index) {
  if (!target || !labelNode) {
    return;
  }

  const point = cohortTimeline[index];
  if (!point) {
    return;
  }
  labelNode.textContent = point.label;
  target.innerHTML = [
    { name: "无进展", value: point.pfs, color: palette.evidence },
    { name: "已进展", value: point.pd, color: palette.calibration },
    { name: "死亡", value: point.dead, color: palette.review },
  ]
    .map(
      (item) => `
        <div class="cohort-bar">
          <strong>${item.name}</strong>
          <div class="cohort-track"><span style="width:${item.value}%; background:${item.color};"></span></div>
          <span>${item.value}%</span>
        </div>
      `
    )
    .join("");
}

function startRunAnimation() {
  if (state.runTimer) {
    clearInterval(state.runTimer);
  }

  state.runProgress = 0;
  renderSurfaceView();

  const step = [8, 16, 27, 39, 52, 68, 79, 91, 100];
  let pointer = 0;
  state.runTimer = setInterval(() => {
    state.runProgress = step[pointer];
    const progressBar = document.getElementById("run-progress-bar");
    const progressLabel = document.getElementById("run-progress-label");
    const statusLabel = document.getElementById("run-status-text");
    if (progressBar && progressLabel && statusLabel) {
      progressBar.style.width = `${state.runProgress}%`;
      progressLabel.textContent = `${state.runProgress}%`;
      statusLabel.textContent = state.runProgress < 100 ? "Markov + PSA 正在执行" : "已完成并保存";
      surfaceStatus.textContent = currentSurfaceStatus();
    }
    pointer += 1;
    if (pointer >= step.length) {
      clearInterval(state.runTimer);
      state.runTimer = null;
      renderSurfaceView();
    }
  }, 380);
}

function attachChartTooltip(container) {
  if (!container) {
    return;
  }

  let tooltip = container.querySelector(".chart-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    container.appendChild(tooltip);
  }

  const show = (event) => {
    const target = event.target.closest("[data-tip]");
    if (!target || !container.contains(target)) {
      tooltip.classList.remove("is-visible");
      return;
    }
    tooltip.textContent = target.getAttribute("data-tip") || "";
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left + 14;
    const y = event.clientY - rect.top - 10;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.classList.add("is-visible");
  };

  const hide = () => {
    tooltip.classList.remove("is-visible");
  };

  container.onpointermove = show;
  container.onpointerleave = hide;
}

renderWorkflow();
renderHeroChart();
renderSurfaceNav();
renderSurfaceView();
renderMetrics();
renderExampleControls();
renderCalibrationInto(exampleCalibration, state.exampleScenario, false);
renderScatterInto(exampleScatter, state.exampleX, state.exampleY);
renderCeacInto(exampleCeac);
renderCohortInto(exampleCohort, cohortTime, state.exampleCohortIndex);
renderArtifactList();
renderObjectCards();
renderFilterBar();
renderCapabilities();
renderLancetWatch();
renderArchitecture();
renderRoadmap();

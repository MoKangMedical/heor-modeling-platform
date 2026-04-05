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
  surfaceCalibrationCompareMode: "single",
  exampleScenario: "base",
  heroCompareMode: "compare",
  exampleCalibrationCompareMode: "compare",
  runProgress: 0,
  runTimer: null,
  reviewX: "incrementalCost",
  reviewY: "incrementalQaly",
  reviewScatterCompareMode: "compare",
  exampleX: "incrementalCost",
  exampleY: "incrementalQaly",
  exampleScatterCompareMode: "compare",
  exampleCeacCompareMode: "compare",
  reviewCohortIndex: 3,
  exampleCohortIndex: 2,
  brushWindows: {},
  rangeComparisons: {},
  pageKey: "index",
  arrivalTransition: null,
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
const PAGE_TRANSITION_KEY = "heor-demo.page-transition";
const GUIDED_TOUR_KEY = "heor-demo.guided-tour";
const STATIC_STORY_TRACK = [
  { key: "index", title: "理解任务" },
  { key: "evidence", title: "整理证据" },
  { key: "runtime", title: "生成函数" },
  { key: "calibration", title: "贴近临床" },
  { key: "simulation", title: "执行分析" },
  { key: "review", title: "交付结果" },
];
const STATIC_PAGE_STORIES = {
  index: {
    title: "平台总览",
    arrival: "你现在看到的是从临床证据到结果交付的完整任务路径。",
    next: "继续进入证据页，就能看到平台如何把一份原始生存数据整理成可运行对象。",
    stage: "index",
  },
  evidence: {
    title: "证据工作台",
    arrival: "这一步会先把原始 KM / survival / hazard 数据整理成可追溯的证据对象。",
    next: "完成字段校验和时间对齐后，下一步就是把它们编译成概率函数。",
    stage: "evidence",
  },
  runtime: {
    title: "概率函数工作台",
    arrival: "这里把临床曲线和风险表转成每个周期都能直接调用的事件概率。",
    next: "函数层准备好以后，就可以进入校准或模拟，真正让模型跑起来。",
    stage: "runtime",
  },
  calibration: {
    title: "临床校准",
    arrival: "这一步会把模型预测和真实临床观察数据放在一起，自动寻找更贴近现实的参数。",
    next: "校准完成后，你可以直接进入运行模拟，观察结果如何随参数变化。",
    stage: "calibration",
  },
  simulation: {
    title: "运行模拟",
    arrival: "平台会在这里异步执行 Markov / PSA，并把样本、随机种子和产物一起保存下来。",
    next: "运行完成后，下一步就是进入结果审阅，解释它是否值得、是否稳定、是否能交付。",
    stage: "simulation",
  },
  review: {
    title: "结果审阅",
    arrival: "这里会把结论、拟合、不确定性和队列轨迹串成一条可直接给客户演示的阅读路径。",
    next: "如果你要回头解释平台结构，可以再打开平台细节页或示例运行页。",
    stage: "review",
  },
  "example-run": {
    title: "示例运行",
    arrival: "这页把一条完整 run 的关键图、关键值和导出产物直接摆在客户面前。",
    next: "继续进入结果审阅页，可以进一步切换图表维度、查看状态变化和导出包。",
    stage: "review",
  },
  platform: {
    title: "平台细节",
    arrival: "这里会展开对象模型、能力层和系统分层，帮助客户理解平台为什么可追溯、可复现。",
    next: "如果你要从业务视角继续讲解，建议回到首页或示例运行页。",
    stage: "index",
  },
  research: {
    title: "研究追踪",
    arrival: "这里展示外部研究与平台能力的对应关系，用来说明平台为什么值得建、怎么对标行业前沿。",
    next: "回到首页或示例运行页，可以把研究能力和可操作界面连起来讲。",
    stage: "index",
  },
};
const GUIDED_TOUR_STEPS = [
  {
    page: "index",
    selector: ".hero-stage",
    title: "先用一条真实 run 建立信任",
    body: "首页先把一条完整示例运行放到客户眼前，再带他逐页看每一步是如何实现的。",
    cta: "进入证据工作台",
    href: "./evidence.html?demo=1&tour=1",
  },
  {
    page: "evidence",
    selector: ".panel.span-8",
    title: "第 1 步先整理原始证据",
    body: "这里把原始 KM / survival / hazard 数据整理成可追溯对象，是整条业务链的起点。",
    cta: "继续到概率函数",
    href: "./runtime.html?tour=1",
  },
  {
    page: "runtime",
    selector: ".panel.span-7",
    title: "第 2 步生成可运行函数层",
    body: "平台把临床证据编译成周期级概率函数，后面的校准、模拟和图形解释都复用这层定义。",
    cta: "继续到临床校准",
    href: "./calibration.html?tour=1",
  },
  {
    page: "calibration",
    selector: "#calibration-overlay-chart",
    title: "第 3 步先贴近真实临床数据",
    body: "这一页直接展示观察值对预测值覆盖图，帮助客户理解模型为什么可信，或者为什么还要继续调参。",
    cta: "继续到运行模拟",
    href: "./simulation.html?tour=1",
  },
  {
    page: "simulation",
    selector: "#simulation-markov-motion",
    title: "第 4 步真正跑一次分析",
    body: "这里不仅显示结果卡片，也会让客户看到异步 job、动态 Markov 状态流和可复现产物。",
    cta: "继续到结果审阅",
    href: "./review.html?tour=1",
  },
  {
    page: "review",
    selector: "#review-scatter",
    title: "第 5 步把结果讲清楚并交付",
    body: "最后一页把结果卡、散点图、队列轨迹和产物包组合成一条完整的交付路径。",
    cta: "完成导览",
    href: "./review.html",
  },
];
const STATIC_MOTION_SELECTOR = [
  ".hero-copy",
  ".hero-stage",
  ".entry-card",
  ".result-hero",
  ".promise-card",
  ".metric-card",
  ".workflow-step",
  ".surface-shell",
  ".object-card",
  ".capability-card",
  ".lancet-card",
  ".architecture-layer",
  ".roadmap-column",
  ".dashboard-panel",
  ".page-hero",
].join(", ");

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setStaticPageAccent() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  state.pageKey = page.replace(".html", "") || "index";
  document.body.dataset.sitePage = state.pageKey;
}

function bindStaticPointerAura() {
  if (bindStaticPointerAura.initialized) {
    return;
  }

  const setAura = (clientX, clientY) => {
    const x = `${(clientX / window.innerWidth) * 100}%`;
    const y = `${(clientY / window.innerHeight) * 100}%`;
    document.body.style.setProperty("--pointer-x", x);
    document.body.style.setProperty("--pointer-y", y);
  };

  document.addEventListener("pointermove", (event) => {
    setAura(event.clientX, event.clientY);
  });
  document.addEventListener("pointerleave", () => {
    document.body.style.setProperty("--pointer-x", "50%");
    document.body.style.setProperty("--pointer-y", "26%");
  });

  bindStaticPointerAura.initialized = true;
}

function refreshStaticMotion() {
  const targets = document.querySelectorAll(STATIC_MOTION_SELECTOR);
  targets.forEach((node) => {
    node.classList.add("reveal-surface", "tilt-surface");
  });

  applyStaticRevealMotion(targets);
  applyStaticSurfaceTilt(targets);
}

function applyStaticRevealMotion(nodes) {
  const elements = Array.from(nodes);
  if (!elements.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    elements.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  if (!applyStaticRevealMotion.observer) {
    applyStaticRevealMotion.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            applyStaticRevealMotion.observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -10% 0px" }
    );
  }

  elements.forEach((node) => {
    if (node.classList.contains("is-visible")) {
      return;
    }
    applyStaticRevealMotion.observer.observe(node);
  });
}

function applyStaticSurfaceTilt(nodes) {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return;
  }

  nodes.forEach((node) => {
    if (node.dataset.tiltBound === "true") {
      return;
    }

    node.dataset.tiltBound = "true";
    node.addEventListener("pointermove", (event) => {
      const rect = node.getBoundingClientRect();
      const px = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const py = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      const rotateY = (px - 0.5) * 9;
      const rotateX = (0.5 - py) * 8;

      node.classList.add("is-tilting");
      node.style.transform = `perspective(1400px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
    });

    node.addEventListener("pointerleave", () => {
      node.classList.remove("is-tilting");
      node.style.transform = "";
    });
  });
}

function normalizeBrushWindow(start, end, length) {
  const safeLength = Math.max(length - 1, 0);
  const nextStart = clamp(Number(start) || 0, 0, safeLength);
  const nextEnd = clamp(Number(end) || safeLength, nextStart + 1, safeLength);
  return [nextStart, nextEnd];
}

function getStaticBrushWindow(key, length, suggested = [0, Math.max(length - 1, 1)]) {
  const current = state.brushWindows[key];
  if (!current) {
    return normalizeBrushWindow(suggested[0], suggested[1], length);
  }
  return normalizeBrushWindow(current.start, current.end, length);
}

function setStaticBrushWindow(key, start, end, length) {
  const [nextStart, nextEnd] = normalizeBrushWindow(start, end, length);
  state.brushWindows[key] = { start: nextStart, end: nextEnd };
  return state.brushWindows[key];
}

function getStaticRangeCompareState(key) {
  if (!state.rangeComparisons[key]) {
    state.rangeComparisons[key] = { A: null, B: null };
  }
  return state.rangeComparisons[key];
}

function setStaticRangeCompareWindow(key, slot, start, end, length) {
  const [nextStart, nextEnd] = normalizeBrushWindow(start, end, length);
  const compare = getStaticRangeCompareState(key);
  compare[slot] = [nextStart, nextEnd];
  return compare;
}

function joinStaticControls(...controls) {
  return controls.filter(Boolean).join("");
}

function createStaticExportMarkup(key) {
  return `
    <div class="site-export-group" data-export-group="${key}">
      <button class="site-export-button" type="button" data-export-kind="png">导出 PNG</button>
      <button class="site-export-button" type="button" data-export-kind="svg">导出 SVG</button>
    </div>
  `;
}

function downloadStaticBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 300);
}

function exportStaticSvgNode(container, filenameBase, format) {
  const svg = container.querySelector("svg");
  if (!svg) {
    return;
  }
  const serializer = new XMLSerializer();
  const markup = serializer.serializeToString(svg);
  const source = markup.startsWith("<?xml") ? markup : `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`;
  if (format === "svg") {
    downloadStaticBlob(`${filenameBase}.svg`, new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
    return;
  }
  const viewBox = svg.viewBox?.baseVal;
  const width = Math.round(viewBox?.width || svg.clientWidth || 1200);
  const height = Math.round(viewBox?.height || svg.clientHeight || 720);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        downloadStaticBlob(`${filenameBase}.png`, blob);
      }
    }, "image/png");
    URL.revokeObjectURL(image.src);
  };
  image.src = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
}

function bindStaticChartExports(container, key, filenameBase) {
  container.querySelectorAll(`[data-export-group="${key}"] [data-export-kind]`).forEach((button) => {
    button.addEventListener("click", () => {
      exportStaticSvgNode(container, filenameBase, button.getAttribute("data-export-kind"));
    });
  });
}

function mean(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function createStaticChartFrame({ legendEyebrow, legendTitle, legendBody, svg, brush, controls }) {
  return `
    <div class="site-chart-shell">
      <div class="site-chart-shell-head">
        <div class="site-chart-legend-live">
          <span class="site-chart-eyebrow">${legendEyebrow || "图表解释"}</span>
          <strong data-chart-legend="title">${legendTitle || ""}</strong>
          <small data-chart-legend="body">${legendBody || ""}</small>
        </div>
        ${controls ? `<div class="site-chart-inline-controls">${controls}</div>` : ""}
      </div>
      <div class="site-chart-stage">${svg}</div>
      ${brush || ""}
    </div>
  `;
}

function createStaticBrushMarkup({ key, start, end, length, startLabel, endLabel, caption, compareSummary = "先把当前窗口分别存成 A / B，平台会直接告诉客户两段区间差了多少。" }) {
  const compare = getStaticRangeCompareState(key);
  return `
    <div class="site-chart-brush" data-brush-key="${key}" data-brush-length="${length}">
      <div class="site-chart-brush-head">
        <strong>${caption || "查看时间窗"}</strong>
        <span>${startLabel} - ${endLabel}</span>
      </div>
      <div class="site-chart-brush-track">
        <div
          class="site-chart-brush-window"
          style="--brush-start:${(start / Math.max(length - 1, 1)) * 100}%; --brush-end:${(end / Math.max(length - 1, 1)) * 100}%"
        ></div>
        <input class="site-brush-range" data-range-role="start" type="range" min="0" max="${Math.max(length - 1, 1)}" value="${start}" />
        <input class="site-brush-range" data-range-role="end" type="range" min="1" max="${Math.max(length - 1, 1)}" value="${end}" />
      </div>
      <div class="site-chart-range-compare" data-range-compare="${key}">
        <div class="site-chart-range-actions">
          <button class="site-range-button ${compare.A ? "is-filled" : ""}" type="button" data-range-slot="A">设为 A</button>
          <button class="site-range-button ${compare.B ? "is-filled" : ""}" type="button" data-range-slot="B">设为 B</button>
        </div>
        <small class="site-chart-range-summary">${compareSummary}</small>
      </div>
    </div>
  `;
}

function bindStaticBrushControls(container, { key, length, labelForIndex, onChange, onCompareChange }) {
  const brush = container.querySelector(`[data-brush-key="${key}"]`);
  if (!brush) {
    return;
  }

  const startInput = brush.querySelector('[data-range-role="start"]');
  const endInput = brush.querySelector('[data-range-role="end"]');
  const caption = brush.querySelector(".site-chart-brush-head span");
  const windowNode = brush.querySelector(".site-chart-brush-window");

  const sync = (trigger) => {
    const current = setStaticBrushWindow(key, startInput.value, endInput.value, length);
    startInput.value = current.start;
    endInput.value = current.end;
    windowNode.style.setProperty("--brush-start", `${(current.start / Math.max(length - 1, 1)) * 100}%`);
    windowNode.style.setProperty("--brush-end", `${(current.end / Math.max(length - 1, 1)) * 100}%`);
    if (caption) {
      caption.textContent = `${labelForIndex(current.start)} - ${labelForIndex(current.end)}`;
    }
    if (typeof onChange === "function") {
      onChange(current, trigger);
    }
  };

  startInput.addEventListener("input", () => sync("start"));
  endInput.addEventListener("input", () => sync("end"));

  brush.querySelectorAll("[data-range-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      const slot = button.getAttribute("data-range-slot");
      if (!slot) {
        return;
      }
      const current = getStaticBrushWindow(key, length);
      setStaticRangeCompareWindow(key, slot, current[0], current[1], length);
      if (typeof onCompareChange === "function") {
        onCompareChange(slot, current);
      }
    });
  });
}

function createStaticToggleMarkup({ group, options, active }) {
  return `
    <div class="site-chart-toggle-group" data-toggle-group="${group}">
      ${options
        .map(
          (option) => `
            <button
              type="button"
              class="site-chart-toggle ${option.value === active ? "is-active" : ""}"
              data-toggle-option="${option.value}"
            >
              ${option.label}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function bindStaticToggleGroup(container, group, onChange) {
  const toggleGroup = container.querySelector(`[data-toggle-group="${group}"]`);
  if (!toggleGroup) {
    return;
  }

  toggleGroup.querySelectorAll("[data-toggle-option]").forEach((button) => {
    button.addEventListener("click", () => {
      onChange(button.dataset.toggleOption);
    });
  });
}

function storyForPage(key) {
  return STATIC_PAGE_STORIES[key] || STATIC_PAGE_STORIES.index;
}

function getStageIndexForPage(key) {
  const stageKey = storyForPage(key).stage || key;
  return Math.max(
    STATIC_STORY_TRACK.findIndex((item) => item.key === stageKey),
    0
  );
}

function mountStaticTransitionLayer() {
  if (document.getElementById("site-page-transition")) {
    return;
  }

  const layer = document.createElement("div");
  layer.id = "site-page-transition";
  layer.className = "site-page-transition-layer";
  layer.innerHTML = `
    <div class="site-page-transition-panel">
      <span id="site-page-transition-kicker">正在进入下一步</span>
      <strong id="site-page-transition-title">把当前结果带进下一页</strong>
      <p id="site-page-transition-copy">平台会带着上下文继续进入下一步。</p>
      <div class="site-page-transition-track" id="site-page-transition-track"></div>
    </div>
  `;
  document.body.appendChild(layer);
}

function extractPageKeyFromHref(href) {
  try {
    const url = new URL(href, window.location.href);
    const file = url.pathname.split("/").pop() || "index.html";
    return file.replace(".html", "") || "index";
  } catch (error) {
    return "index";
  }
}

function bindStaticNarrativeLinks() {
  document.querySelectorAll('a[href*=".html"]').forEach((anchor) => {
    if (anchor.dataset.transitionBound === "true") {
      return;
    }
    anchor.dataset.transitionBound = "true";
    anchor.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http")) {
        return;
      }
      const destination = extractPageKeyFromHref(href);
      if (!destination || destination === state.pageKey) {
        return;
      }
      event.preventDefault();
      playStaticPageTransition(destination, href);
    });
  });
}

function playStaticPageTransition(to, href) {
  const layer = document.getElementById("site-page-transition");
  if (!layer) {
    window.location.href = href;
    return;
  }

  const title = document.getElementById("site-page-transition-title");
  const kicker = document.getElementById("site-page-transition-kicker");
  const copy = document.getElementById("site-page-transition-copy");
  const track = document.getElementById("site-page-transition-track");
  const nextStory = storyForPage(to);
  const activeStage = getStageIndexForPage(to);

  if (kicker) {
    kicker.textContent = `第 ${activeStage + 1} 步 · ${nextStory.title}`;
  }
  if (title) {
    title.textContent = `从 ${storyForPage(state.pageKey).title} 进入 ${nextStory.title}`;
  }
  if (copy) {
    copy.textContent = nextStory.arrival;
  }
  if (track) {
    track.innerHTML = STATIC_STORY_TRACK.map((item, index) => {
      const className = index < activeStage ? "site-page-transition-node is-complete" : index === activeStage ? "site-page-transition-node is-active" : "site-page-transition-node";
      return `
        <div class="${className}">
          <i>${String(index + 1).padStart(2, "0")}</i>
          <b>${item.title}</b>
        </div>
      `;
    }).join("");
  }

  sessionStorage.setItem(
    PAGE_TRANSITION_KEY,
    JSON.stringify({
      from: state.pageKey,
      to,
      timestamp: Date.now(),
    })
  );

  document.body.classList.add("is-site-page-transitioning");
  layer.classList.add("is-active");

  window.setTimeout(() => {
    window.location.href = href;
  }, 520);
}

function mountStaticArrivalBanner(payload) {
  const main = document.querySelector("main");
  const hero = document.querySelector(".hero, .page-hero");
  if (!main || !hero || document.querySelector(".site-arrival-banner")) {
    return;
  }

  const banner = document.createElement("div");
  banner.className = "site-arrival-banner";
  banner.innerHTML = `
    <span>刚完成 ${storyForPage(payload.from).title}</span>
    <strong>${storyForPage(state.pageKey).arrival}</strong>
    <small>${storyForPage(state.pageKey).next}</small>
  `;
  main.insertBefore(banner, hero);
}

function hydrateStaticArrivalNarrative() {
  const raw = sessionStorage.getItem(PAGE_TRANSITION_KEY);
  if (!raw) {
    return;
  }

  try {
    const payload = JSON.parse(raw);
    sessionStorage.removeItem(PAGE_TRANSITION_KEY);
    if (payload?.to !== state.pageKey) {
      return;
    }
    state.arrivalTransition = payload;
    mountStaticArrivalBanner(payload);
  } catch (error) {
    sessionStorage.removeItem(PAGE_TRANSITION_KEY);
  }
}

function getStaticGuidedTourState() {
  const raw = sessionStorage.getItem(GUIDED_TOUR_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.step === "number" ? parsed : null;
  } catch (error) {
    sessionStorage.removeItem(GUIDED_TOUR_KEY);
    return null;
  }
}

function setStaticGuidedTourState(step) {
  sessionStorage.setItem(GUIDED_TOUR_KEY, JSON.stringify({ active: true, step }));
}

function clearStaticGuidedTour() {
  sessionStorage.removeItem(GUIDED_TOUR_KEY);
  document.querySelector(".site-guided-tour-card")?.remove();
  document.querySelector(".site-guided-tour-focus")?.classList.remove("site-guided-tour-focus");
}

function scrollStaticTourTargetIntoView(target) {
  if (!target) {
    return;
  }

  const rect = target.getBoundingClientRect();
  const topThreshold = 124;
  const bottomThreshold = Math.max(window.innerHeight - 180, topThreshold + 120);
  const fullyFramed = rect.top >= topThreshold && rect.bottom <= bottomThreshold;
  if (fullyFramed) {
    return;
  }

  target.scrollIntoView({ block: "start", behavior: "auto" });
}

function mountStaticTourEntry() {
  const heroActions = document.querySelector(".hero-actions");
  if (heroActions && !heroActions.querySelector(".tour-launch-button")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button secondary tour-launch-button";
    button.textContent = "开始引导演示";
    button.addEventListener("click", () => {
      setStaticGuidedTourState(0);
      syncStaticGuidedTour();
    });
    heroActions.appendChild(button);
  }

  const nav = document.querySelector(".nav");
  if (nav && !nav.querySelector(".tour-nav-button")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tour-nav-button";
    button.textContent = "演示导览";
    button.addEventListener("click", () => {
      setStaticGuidedTourState(state.pageKey === "index" ? 0 : 0);
      if (state.pageKey === "index") {
        syncStaticGuidedTour();
      } else {
        playStaticPageTransition("index", "./index.html?tour=1");
      }
    });
    nav.appendChild(button);
  }
}

function syncStaticGuidedTour() {
  document.querySelector(".site-guided-tour-focus")?.classList.remove("site-guided-tour-focus");
  document.querySelector(".site-guided-tour-card")?.remove();

  let tour = getStaticGuidedTourState();
  if (!tour && new URLSearchParams(window.location.search).get("tour") === "1") {
    const stepIndex = GUIDED_TOUR_STEPS.findIndex((step) => step.page === state.pageKey);
    if (stepIndex >= 0) {
      setStaticGuidedTourState(stepIndex);
      tour = getStaticGuidedTourState();
    }
  }
  if (!tour?.active) {
    return;
  }

  const step = GUIDED_TOUR_STEPS[tour.step];
  if (!step || step.page !== state.pageKey) {
    return;
  }

  const target = document.querySelector(step.selector);
  if (!target) {
    return;
  }
  target.classList.add("site-guided-tour-focus");
  scrollStaticTourTargetIntoView(target);

  const card = document.createElement("aside");
  card.className = "site-guided-tour-card";
  card.innerHTML = `
    <span>引导演示 ${tour.step + 1} / ${GUIDED_TOUR_STEPS.length}</span>
    <strong>${step.title}</strong>
    <p>${step.body}</p>
    <div class="site-guided-tour-actions">
      <button type="button" class="site-guided-tour-button is-secondary" data-tour-action="back" ${tour.step === 0 ? "disabled" : ""}>上一步</button>
      <button type="button" class="site-guided-tour-button is-secondary" data-tour-action="close">结束导览</button>
      <button type="button" class="site-guided-tour-button is-primary" data-tour-action="next">${step.cta}</button>
    </div>
  `;
  document.body.appendChild(card);

  card.querySelector('[data-tour-action="close"]')?.addEventListener("click", clearStaticGuidedTour);
  card.querySelector('[data-tour-action="back"]')?.addEventListener("click", () => moveStaticGuidedTour(-1));
  card.querySelector('[data-tour-action="next"]')?.addEventListener("click", () => moveStaticGuidedTour(1));
}

function moveStaticGuidedTour(direction) {
  const tour = getStaticGuidedTourState();
  if (!tour) {
    return;
  }

  if (direction > 0 && tour.step >= GUIDED_TOUR_STEPS.length - 1) {
    clearStaticGuidedTour();
    return;
  }

  const nextStepIndex = clamp(tour.step + direction, 0, GUIDED_TOUR_STEPS.length - 1);
  const nextStep = GUIDED_TOUR_STEPS[nextStepIndex];
  if (!nextStep) {
    clearStaticGuidedTour();
    return;
  }

  setStaticGuidedTourState(nextStepIndex);
  if (nextStep.page === state.pageKey) {
    syncStaticGuidedTour();
    return;
  }
  const href = direction > 0 ? nextStep.href : `./${nextStep.page}.html?tour=1`;
  playStaticPageTransition(nextStep.page, href);
}

function initializeStaticSite() {
  setStaticPageAccent();
  bindStaticPointerAura();
  mountStaticTransitionLayer();
  bindStaticNarrativeLinks();
  hydrateStaticArrivalNarrative();
  mountStaticTourEntry();
  syncStaticGuidedTour();

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
  refreshStaticMotion();
}

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

  refreshStaticMotion();
}

function describeStaticCalibrationRangeCompare(mode, compareKey) {
  const compare = getStaticRangeCompareState(compareKey);
  if (!compare.A || !compare.B) {
    return "先把当前窗口设成 A / B，平台会直接比较两段时间窗的平均生存率和拟合误差。";
  }
  const monthLabels = ["0", "3", "6", "9", "12", "15", "18", "21"];
  const series = calibrationPredicted[mode];
  const avgFor = ([start, end], source) => mean(source.slice(start, end + 1));
  const gapFor = ([start, end]) =>
    mean(
      calibrationObserved.slice(start, end + 1).map((value, index) => Math.abs(value - series[start + index]))
    );
  const avgA = avgFor(compare.A, series);
  const avgB = avgFor(compare.B, series);
  const gapA = gapFor(compare.A);
  const gapB = gapFor(compare.B);
  return `A ${monthLabels[compare.A[0]]}-${monthLabels[compare.A[1]]} 月 vs B ${monthLabels[compare.B[0]]}-${monthLabels[compare.B[1]]} 月 · 预测平均生存率 ${(avgA * 100).toFixed(1)}% -> ${(avgB * 100).toFixed(1)}% · 平均拟合误差 ${(gapA * 100).toFixed(2)} -> ${(gapB * 100).toFixed(2)} pct`;
}

function renderHeroChart() {
  if (!heroChart) {
    return;
  }
  const pointLabels = ["0", "3", "6", "9", "12", "15", "18", "21"];
  const [start, end] = getStaticBrushWindow("heroCalibration", calibrationObserved.length, [0, calibrationObserved.length - 1]);
  heroChart.innerHTML = createStaticChartFrame({
    legendEyebrow: "首页示例运行",
    legendTitle:
      state.heroCompareMode === "compare"
        ? "三条预测曲线与真实观察值正在同屏比较"
        : "先看基线预测如何贴近真实观察值",
    legendBody:
      state.heroCompareMode === "compare"
        ? "这张首页图先告诉客户，平台不只会出一条线，而是能把低位、基线和高位预测一起放进同一张校准图里。"
        : "这张首页图先回答一个最基础的问题: 当前基线曲线是否已经贴近真实观察点。",
    controls: joinStaticControls(
      createStaticToggleMarkup({
        group: "hero-calibration-mode",
        active: state.heroCompareMode,
        options: [
          { value: "single", label: "只看基线" },
          { value: "compare", label: "三情景对比" },
        ],
      }),
      createStaticExportMarkup("hero-calibration-export")
    ),
    svg: makeCalibrationSvg("base", {
      compact: true,
      note: `时间窗 ${pointLabels[start]}-${pointLabels[end]} 月`,
      startIndex: start,
      endIndex: end,
      compareMode: state.heroCompareMode,
    }),
    brush: createStaticBrushMarkup({
      key: "heroCalibration",
      start,
      end,
      length: calibrationObserved.length,
      startLabel: `${pointLabels[start]} 月`,
      endLabel: `${pointLabels[end]} 月`,
      caption: "刷选时间窗",
      compareSummary: describeStaticCalibrationRangeCompare("base", "heroCalibration"),
    }),
  });
  attachChartTooltip(heroChart, {
    title:
      state.heroCompareMode === "compare"
        ? "三条预测曲线和观察值一起解释模型稳定性"
        : "基线预测曲线与观察值一起解释拟合效果",
    body: "把鼠标放在线、点或不确定性带上，右侧说明会同步切换成当前对象的解释。",
  });
  bindStaticChartExports(heroChart, "hero-calibration-export", "hero-calibration");
  bindStaticToggleGroup(heroChart, "hero-calibration-mode", (value) => {
    state.heroCompareMode = value;
    renderHeroChart();
  });
  bindStaticBrushControls(heroChart, {
    key: "heroCalibration",
    length: calibrationObserved.length,
    labelForIndex: (index) => `${pointLabels[index]} 月`,
    onChange: () => renderHeroChart(),
    onCompareChange: () => renderHeroChart(),
  });
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
  refreshStaticMotion();
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

  refreshStaticMotion();
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

  refreshStaticMotion();
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

  refreshStaticMotion();
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

  refreshStaticMotion();
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

  refreshStaticMotion();
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

  refreshStaticMotion();
}

function populateScatterSelect(select, value) {
  if (!select) {
    return;
  }

  select.innerHTML = Object.entries(scatterOptions)
    .map(([key, label]) => `<option value="${key}" ${key === value ? "selected" : ""}>${label}</option>`)
    .join("");
}

function renderCalibrationInto(target, mode, compact, options = {}) {
  if (!target) {
    return;
  }

  const modeLabel = mode === "low" ? "低情景" : mode === "high" ? "高情景" : "基线";
  const pointLabels = ["0", "3", "6", "9", "12", "15", "18", "21"];
  const viewKey = options.viewKey || (target.id === "example-calibration" ? "exampleCalibration" : "surfaceCalibration");
  const compareStateKey = viewKey === "exampleCalibration" ? "exampleCalibrationCompareMode" : "surfaceCalibrationCompareMode";
  const compareMode = state[compareStateKey];
  const [start, end] = getStaticBrushWindow(viewKey, calibrationObserved.length, [0, calibrationObserved.length - 1]);

  target.innerHTML = createStaticChartFrame({
    legendEyebrow: viewKey === "exampleCalibration" ? "校准图阅读器" : "工作台预览",
    legendTitle:
      compareMode === "compare"
        ? `${modeLabel} 会与另外两条情景曲线一起对比`
        : `${modeLabel} 预测曲线正在和真实观察值逐点比对`,
    legendBody:
      compareMode === "compare"
        ? "客户可以直接看到情景切换之后，曲线是如何分开、又如何围绕观察值聚拢的。"
        : "这一视图适合逐点讲解哪几个时间窗拟合更紧，哪几个时间窗还需要继续调整。",
    controls: joinStaticControls(
      createStaticToggleMarkup({
        group: `${viewKey}-compare`,
        active: compareMode,
        options: [
          { value: "single", label: "只看当前情景" },
          { value: "compare", label: "三情景对比" },
        ],
      }),
      createStaticExportMarkup(`${viewKey}-export`)
    ),
    svg: makeCalibrationSvg(mode, {
      compact,
      note: `当前情景: ${modeLabel}`,
      startIndex: start,
      endIndex: end,
      compareMode,
    }),
    brush: createStaticBrushMarkup({
      key: viewKey,
      start,
      end,
      length: calibrationObserved.length,
      startLabel: `${pointLabels[start]} 月`,
      endLabel: `${pointLabels[end]} 月`,
      caption: "刷选校准时间窗",
      compareSummary: describeStaticCalibrationRangeCompare(mode, viewKey),
    }),
  });
  attachChartTooltip(target, {
    title:
      compareMode === "compare"
        ? "同一组观察值下对比低位、基线和高位预测"
        : `${modeLabel} 预测曲线正在和观察值对照`,
    body: "这张图会把当前悬停对象的意义直接写出来，适合在演示时边指边讲。",
  });
  bindStaticChartExports(target, `${viewKey}-export`, `${viewKey}-${mode}`);
  bindStaticToggleGroup(target, `${viewKey}-compare`, (value) => {
    state[compareStateKey] = value;
    renderCalibrationInto(target, mode, compact, options);
  });
  bindStaticBrushControls(target, {
    key: viewKey,
    length: calibrationObserved.length,
    labelForIndex: (index) => `${pointLabels[index]} 月`,
    onChange: () => renderCalibrationInto(target, mode, compact, options),
    onCompareChange: () => renderCalibrationInto(target, mode, compact, options),
  });
}

function makeCalibrationSvg(mode, { compact = false, note = "", startIndex = 0, endIndex = calibrationObserved.length - 1, compareMode = "single" } = {}) {
  const width = compact ? 560 : 720;
  const height = compact ? 260 : 360;
  const padding = compact ? 34 : 44;
  const predicted = calibrationPredicted[mode];
  const scenarioColor = mode === "low" ? palette.simulation : mode === "base" ? palette.calibration : palette.review;
  const gridYs = [0, 0.25, 0.5, 0.75, 1];
  const xLabels = ["0", "3", "6", "9", "12", "15", "18", "21"];
  const [safeStart, safeEnd] = normalizeBrushWindow(startIndex, endIndex, calibrationObserved.length);
  const visibleIndices = calibrationObserved.map((_, index) => index).slice(safeStart, safeEnd + 1);
  const visibleObserved = calibrationObserved.slice(safeStart, safeEnd + 1);
  const visiblePredicted = predicted.slice(safeStart, safeEnd + 1);
  const visibleUpper = calibrationBand.upper.slice(safeStart, safeEnd + 1);
  const visibleLower = calibrationBand.lower.slice(safeStart, safeEnd + 1);

  const toPoint = (value, index, total = visibleIndices.length) => {
    const ratio = total <= 1 ? 0 : index / (total - 1);
    const x = padding + ratio * (width - padding * 2);
    const y = height - padding - value * (height - padding * 2);
    return [x, y];
  };

  const linePath = (values) =>
    values
      .map((value, index) => {
        const [x, y] = toPoint(value, index, values.length);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

  const bandPath = () => {
    const upper = visibleUpper.map((value, index) => toPoint(value, index, visibleUpper.length));
    const lower = visibleLower.map((value, index) => toPoint(value, index, visibleLower.length)).reverse();
    const points = [...upper, ...lower];
    return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";
  };

  const scenarioLabel = mode === "low" ? "低情景" : mode === "high" ? "高情景" : "基线";

  const observedDots = visibleObserved
    .map((value, index) => {
      const [x, y] = toPoint(value, index, visibleObserved.length);
      const sourceIndex = visibleIndices[index];
      return `
        <circle
          class="site-chart-dot site-chart-dot--observed"
          cx="${x}"
          cy="${y}"
          r="${compact ? 3.8 : 4.6}"
          fill="${palette.navy}"
          data-tip="观察点 ${sourceIndex + 1}: 生存率 ${(value * 100).toFixed(1)}%"
          data-legend-title="观察点 ${sourceIndex + 1}"
          data-legend-body="这个点来自真实临床数据，表示 ${xLabels[sourceIndex]} 月时的观察生存率 ${(value * 100).toFixed(1)}%。"
        />
      `;
    })
    .join("");

  const xTicks = visibleIndices
    .map((sourceIndex, index) => {
      const [x] = toPoint(0, index, visibleIndices.length);
      return `
        <text class="axis-label" x="${x}" y="${height - 12}" text-anchor="middle">${xLabels[sourceIndex]}</text>
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

  const scenarioSeries =
    compareMode === "compare"
      ? [
          { key: "low", label: "低情景", color: palette.simulation, values: calibrationPredicted.low.slice(safeStart, safeEnd + 1) },
          { key: "base", label: "基线", color: palette.calibration, values: calibrationPredicted.base.slice(safeStart, safeEnd + 1) },
          { key: "high", label: "高情景", color: palette.review, values: calibrationPredicted.high.slice(safeStart, safeEnd + 1) },
        ]
      : [{ key: mode, label: scenarioLabel, color: scenarioColor, values: visiblePredicted }];

  const predictedLines = scenarioSeries
    .map((series, seriesIndex) => {
      const emphasized = series.key === mode || compareMode === "single";
      return `
        <path
          class="site-chart-line ${emphasized ? "is-primary" : "is-secondary"}"
          d="${linePath(series.values)}"
          fill="none"
          stroke="${series.color}"
          stroke-width="${emphasized ? (compact ? 3 : 4) : compact ? 2.2 : 2.8}"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="animation-delay:${seriesIndex * 80}ms"
          data-tip="${series.label}预测曲线"
          data-legend-title="${series.label}预测曲线"
          data-legend-body="${series.label}曲线表示在当前参数假设下，模型在所选时间窗中的预测生存走势。"
        />
      `;
    })
    .join("");

  return `
    <svg class="svg-root" viewBox="0 0 ${width} ${height}" role="img" aria-label="校准覆盖图">
      ${yTicks}
      <line class="axis-line" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
      <line class="axis-line" x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
      <path
        class="site-chart-band"
        d="${bandPath()}"
        fill="rgba(47, 111, 237, 0.12)"
        data-tip="不确定性带: 展示校准后的可接受波动范围"
        data-legend-title="不确定性带"
        data-legend-body="这层带状区域告诉客户，即使考虑参数波动，模型仍会在这一区间内活动。"
      />
      ${predictedLines}
      <path
        class="site-chart-line is-observed"
        d="${linePath(visibleObserved)}"
        fill="none"
        stroke="${palette.navy}"
        stroke-width="${compact ? 1.8 : 2.2}"
        stroke-dasharray="5 6"
        opacity="0.7"
        data-tip="观察值曲线"
        data-legend-title="观察值曲线"
        data-legend-body="这条虚线连接真实观察点，用来帮助客户快速判断模型预测与真实数据的偏离程度。"
      />
      ${observedDots}
      ${xTicks}
      <text class="chart-label" x="${padding}" y="${compact ? 20 : 22}">观察点</text>
      <text class="chart-label" x="${width - padding}" y="${compact ? 20 : 22}" text-anchor="end">${compareMode === "compare" ? "低 / 基线 / 高 三情景" : `${scenarioLabel}预测曲线`}</text>
      <text class="chart-note" x="${padding}" y="${height - 24}">时间（月）</text>
      <text class="chart-note" x="${width - padding}" y="${height - 24}" text-anchor="end">${note}</text>
    </svg>
  `;
}

function buildComparisonScatterPoints() {
  return scatterPoints.map((point, index) => ({
    incrementalCost: Math.round(point.incrementalCost * 1.09 + (index % 4) * 420),
    incrementalQaly: Number((point.incrementalQaly * 0.91).toFixed(3)),
    nmb: Math.round(point.nmb * 0.82),
    osGain: Number((point.osGain * 0.92).toFixed(2)),
    pfsGain: Number((point.pfsGain * 0.9).toFixed(2)),
  }));
}

function renderScatterInto(target, xKey, yKey, options = {}) {
  if (!target) {
    return;
  }

  const viewKey = options.viewKey || (target.id === "example-scatter" ? "exampleScatter" : "surfaceReviewScatter");
  const compareStateKey = viewKey === "exampleScatter" ? "exampleScatterCompareMode" : "reviewScatterCompareMode";
  const compareMode = state[compareStateKey];

  target.innerHTML = createStaticChartFrame({
    legendEyebrow: viewKey === "exampleScatter" ? "PSA 样本云团" : "审阅页预览",
    legendTitle:
      compareMode === "compare"
        ? "当前运行与保守情景正在同屏对比"
        : "当前运行的样本分布正在解释不确定性",
    legendBody:
      compareMode === "compare"
        ? "客户可以直接看到，当参数转向更保守的情景时，样本云团会往哪个方向移动。"
        : "散点云越集中，客户越容易理解这条结果在当前假设下的稳定程度。",
    controls: joinStaticControls(
      createStaticToggleMarkup({
        group: `${viewKey}-compare`,
        active: compareMode,
        options: [
          { value: "single", label: "只看当前运行" },
          { value: "compare", label: "叠加保守情景" },
        ],
      }),
      createStaticExportMarkup(`${viewKey}-export`)
    ),
    svg: makeScatterSvg(xKey, yKey, { compareMode }),
  });

  attachChartTooltip(target, {
    title:
      compareMode === "compare"
        ? "两组样本云正在解释方案稳不稳"
        : "当前样本云正在解释方案稳不稳",
    body: "把鼠标放在任意样本点上，图例会同步切换到该点对应的业务解释。",
  });
  bindStaticChartExports(target, `${viewKey}-export`, `${viewKey}-${xKey}-${yKey}`);
  bindStaticToggleGroup(target, `${viewKey}-compare`, (value) => {
    state[compareStateKey] = value;
    renderScatterInto(target, xKey, yKey, options);
  });
}

function makeScatterSvg(xKey, yKey, { compareMode = "single" } = {}) {
  const width = 420;
  const height = 280;
  const padding = 38;
  const comparisonPoints = buildComparisonScatterPoints();
  const visiblePoints = compareMode === "compare" ? [...scatterPoints, ...comparisonPoints] : scatterPoints;
  const xValues = visiblePoints.map((point) => point[xKey]);
  const yValues = visiblePoints.map((point) => point[yKey]);
  const xMin = Math.min(...xValues) * 0.92;
  const xMax = Math.max(...xValues) * 1.06;
  const yMin = Math.min(...yValues) * 0.9;
  const yMax = Math.max(...yValues) * 1.08;

  const normalizeX = (value) => padding + ((value - xMin) / (xMax - xMin)) * (width - padding * 2);
  const normalizeY = (value) => height - padding - ((value - yMin) / (yMax - yMin)) * (height - padding * 2);

  const currentPoints = scatterPoints
    .map((point, index) => {
      const x = normalizeX(point[xKey]);
      const y = normalizeY(point[yKey]);
      const fill = index % 3 === 0 ? palette.evidence : index % 3 === 1 ? palette.calibration : palette.simulation;
      return `
        <circle
          class="site-chart-sample is-primary"
          cx="${x.toFixed(1)}"
          cy="${y.toFixed(1)}"
          r="5.2"
          fill="${fill}"
          fill-opacity="0.82"
          style="animation-delay:${index * 36}ms"
          data-tip="当前运行样本 ${index + 1}: ${scatterOptions[xKey]} ${point[xKey]}，${scatterOptions[yKey]} ${point[yKey]}"
          data-legend-title="当前运行样本 ${index + 1}"
          data-legend-body="这个点代表当前运行下的一次 PSA 抽样结果，帮助客户理解结果在不确定性下的离散程度。"
        />
      `;
    })
    .join("");

  const comparePoints =
    compareMode === "compare"
      ? comparisonPoints
          .map((point, index) => {
            const x = normalizeX(point[xKey]);
            const y = normalizeY(point[yKey]);
            return `
              <circle
                class="site-chart-sample is-compare"
                cx="${x.toFixed(1)}"
                cy="${y.toFixed(1)}"
                r="4.8"
                fill="rgba(255,255,255,0.08)"
                stroke="${palette.navy}"
                stroke-width="1.8"
                style="animation-delay:${index * 42}ms"
                data-tip="保守情景样本 ${index + 1}: ${scatterOptions[xKey]} ${point[xKey]}，${scatterOptions[yKey]} ${point[yKey]}"
                data-legend-title="保守情景样本 ${index + 1}"
                data-legend-body="这组描边点用于告诉客户，如果切到更保守的参数组合，样本云会向哪里偏移。"
              />
            `;
          })
          .join("")
      : "";

  return `
    <svg class="svg-root" viewBox="0 0 ${width} ${height}" role="img" aria-label="模拟散点图">
      <line class="gridline" x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" />
      <line class="gridline" x1="${width / 2}" y1="${padding}" x2="${width / 2}" y2="${height - padding}" />
      <line class="axis-line" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
      <line class="axis-line" x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
      ${comparePoints}
      ${currentPoints}
      <text class="chart-label" x="${padding}" y="22">${scatterOptions[xKey]} vs ${scatterOptions[yKey]}</text>
      <text class="chart-note" x="${width - padding}" y="22" text-anchor="end">${compareMode === "compare" ? "当前运行 + 保守情景" : "展示 12 个当前样本"}</text>
      <text class="axis-label" x="${width / 2}" y="${height - 12}" text-anchor="middle">${scatterOptions[xKey]}</text>
      <text class="axis-label" x="18" y="${height / 2}" transform="rotate(-90 18 ${height / 2})" text-anchor="middle">${scatterOptions[yKey]}</text>
    </svg>
  `;
}

function renderCeacInto(target) {
  if (!target) {
    return;
  }

  const conservativeProbabilities = ceacProbabilities.map((value, index) =>
    Number(Math.max(0.32, value - 0.08 - index * 0.004).toFixed(3))
  );
  const width = 420;
  const height = 280;
  const padding = 38;
  const xMin = ceacThresholds[0];
  const xMax = ceacThresholds[ceacThresholds.length - 1];
  const yMin = 0.35;
  const yMax = 0.95;
  const normalizeX = (value) => padding + ((value - xMin) / (xMax - xMin)) * (width - padding * 2);
  const normalizeY = (value) => height - padding - ((value - yMin) / (yMax - yMin)) * (height - padding * 2);
  const pathFor = (series) =>
    ceacThresholds
      .map((threshold, index) => `${index === 0 ? "M" : "L"} ${normalizeX(threshold).toFixed(1)} ${normalizeY(series[index]).toFixed(1)}`)
      .join(" ");
  const pointsFor = (series, type) =>
    ceacThresholds
      .map(
        (threshold, index) => `
          <circle
            class="site-chart-sample ${type === "compare" ? "is-compare" : "is-primary"}"
            cx="${normalizeX(threshold)}"
            cy="${normalizeY(series[index])}"
            r="${type === "compare" ? 4.2 : 4.5}"
            fill="${type === "compare" ? "rgba(255,255,255,0.06)" : palette.review}"
            stroke="${type === "compare" ? palette.navy : "none"}"
            stroke-width="${type === "compare" ? 1.6 : 0}"
            data-tip="${type === "compare" ? "保守情景" : "当前运行"}: 阈值 ${threshold.toLocaleString()} 下可接受概率 ${(series[index] * 100).toFixed(1)}%"
            data-legend-title="${type === "compare" ? "保守情景" : "当前运行"} · 阈值 ${threshold.toLocaleString()}"
            data-legend-body="这一个点代表当支付意愿阈值来到 ${threshold.toLocaleString()} 时，方案被判为成本效果可接受的概率。"
          />
        `
      )
      .join("");

  target.innerHTML = createStaticChartFrame({
    legendEyebrow: "成本效果可接受概率",
    legendTitle:
      state.exampleCeacCompareMode === "compare"
        ? "当前运行与保守情景的 CEAC 正在同屏比较"
        : "当前运行的 CEAC 正在解释阈值变化如何影响接受概率",
    legendBody:
      state.exampleCeacCompareMode === "compare"
        ? "客户可以直接看到，更保守的假设会把整条接受概率曲线整体下压多少。"
        : "这条曲线适合解释在不同支付意愿阈值下，方案被接受的概率如何变化。",
    controls: joinStaticControls(
      createStaticToggleMarkup({
        group: "example-ceac-compare",
        active: state.exampleCeacCompareMode,
        options: [
          { value: "single", label: "只看当前运行" },
          { value: "compare", label: "加入保守情景" },
        ],
      }),
      createStaticExportMarkup("example-ceac-export")
    ),
    svg: `
      <svg class="svg-root" viewBox="0 0 ${width} ${height}" role="img" aria-label="成本效果可接受性曲线">
        <line class="gridline" x1="${padding}" y1="${normalizeY(0.5)}" x2="${width - padding}" y2="${normalizeY(0.5)}" />
        <line class="axis-line" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
        <line class="axis-line" x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
        ${
          state.exampleCeacCompareMode === "compare"
            ? `
              <path
                class="site-chart-line is-secondary"
                d="${pathFor(conservativeProbabilities)}"
                fill="none"
                stroke="${palette.navy}"
                stroke-width="2.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                data-tip="保守情景下的成本效果可接受概率"
                data-legend-title="保守情景 CEAC"
                data-legend-body="保守情景曲线用来告诉客户，在更谨慎的参数假设下，结果会不会明显失去吸引力。"
              />
              ${pointsFor(conservativeProbabilities, "compare")}
            `
            : ""
        }
        <path
          class="site-chart-line is-primary"
          d="${pathFor(ceacProbabilities)}"
          fill="none"
          stroke="${palette.review}"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
          data-tip="当前运行下的成本效果可接受概率"
          data-legend-title="当前运行 CEAC"
          data-legend-body="这条线表示在不同支付意愿阈值下，当前方案被接受的概率如何变化。"
        />
        ${pointsFor(ceacProbabilities, "primary")}
        <text class="chart-label" x="${padding}" y="22">成本效果可接受概率</text>
        <text class="chart-note" x="${width - padding}" y="22" text-anchor="end">${state.exampleCeacCompareMode === "compare" ? "当前运行 + 保守情景" : "支付意愿阈值"}</text>
        <text class="axis-label" x="${width / 2}" y="${height - 12}" text-anchor="middle">阈值（USD / QALY）</text>
        <text class="axis-label" x="18" y="${height / 2}" transform="rotate(-90 18 ${height / 2})" text-anchor="middle">概率</text>
      </svg>
    `,
  });

  attachChartTooltip(target, {
    title:
      state.exampleCeacCompareMode === "compare"
        ? "两条 CEAC 正在一起解释阈值敏感性"
        : "当前 CEAC 正在解释阈值敏感性",
    body: "把鼠标放在曲线或节点上，可以直接读到该阈值点的业务含义。",
  });
  bindStaticChartExports(target, "example-ceac-export", "example-ceac");
  bindStaticToggleGroup(target, "example-ceac-compare", (value) => {
    state.exampleCeacCompareMode = value;
    renderCeacInto(target);
  });
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

function attachChartTooltip(container, fallbackLegend = null) {
  if (!container) {
    return;
  }

  let tooltip = container.querySelector(".chart-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    container.appendChild(tooltip);
  }

  const legendTitle = container.querySelector('[data-chart-legend="title"]');
  const legendBody = container.querySelector('[data-chart-legend="body"]');
  const shellHead = container.querySelector(".site-chart-shell-head");
  let legendActions = shellHead?.querySelector(".site-chart-legend-actions");
  if (shellHead && !legendActions) {
    legendActions = document.createElement("div");
    legendActions.className = "site-chart-legend-actions";
    legendActions.innerHTML = `
      <span class="site-chart-pin-status">点击图形固定说明</span>
      <button class="site-chart-pin-clear" type="button" hidden>取消固定</button>
    `;
    shellHead.appendChild(legendActions);
  }
  const pinStatus = legendActions?.querySelector(".site-chart-pin-status");
  const pinClear = legendActions?.querySelector(".site-chart-pin-clear");
  let pinnedNode = null;

  const resetLegend = () => {
    if (!fallbackLegend) {
      return;
    }
    if (legendTitle && fallbackLegend.title) {
      legendTitle.textContent = fallbackLegend.title;
    }
    if (legendBody && fallbackLegend.body) {
      legendBody.textContent = fallbackLegend.body;
    }
  };
  const updatePinState = () => {
    if (pinStatus) {
      pinStatus.textContent = pinnedNode ? "说明已固定" : "点击图形固定说明";
    }
    if (pinClear) {
      pinClear.hidden = !pinnedNode;
    }
  };

  const show = (event) => {
    const target = event.target.closest("[data-tip]");
    if (!target || !container.contains(target)) {
      if (!pinnedNode) {
        tooltip.classList.remove("is-visible");
        resetLegend();
      }
      return;
    }

    if (pinnedNode && target !== pinnedNode) {
      return;
    }

    const legendTitleText = target.getAttribute("data-legend-title");
    const legendBodyText = target.getAttribute("data-legend-body");
    if (legendTitle && legendTitleText) {
      legendTitle.textContent = legendTitleText;
    }
    if (legendBody && legendBodyText) {
      legendBody.textContent = legendBodyText;
    }

    tooltip.textContent = target.getAttribute("data-tip") || "";
    const rect = container.getBoundingClientRect();
    const clientX = typeof event.clientX === "number" ? event.clientX : rect.left + rect.width * 0.5;
    const clientY = typeof event.clientY === "number" ? event.clientY : rect.top + rect.height * 0.5;
    const x = clientX - rect.left + 14;
    const y = clientY - rect.top - 10;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.classList.add("is-visible");
  };

  const hide = () => {
    if (pinnedNode) {
      return;
    }
    tooltip.classList.remove("is-visible");
    resetLegend();
  };

  container.onpointermove = show;
  container.onpointerleave = hide;
  container.onfocusin = show;
  container.onfocusout = hide;
  container.onclick = (event) => {
    const target = event.target.closest("[data-tip]");
    if (!target || !container.contains(target)) {
      return;
    }
    pinnedNode = pinnedNode === target ? null : target;
    updatePinState();
    if (!pinnedNode) {
      hide();
      return;
    }
    show(event);
  };
  pinClear?.addEventListener("click", () => {
    pinnedNode = null;
    updatePinState();
    hide();
  });
  resetLegend();
  updatePinState();
}

initializeStaticSite();

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
    title: "先把临床证据带进来",
    summary: "把 KM table、hazard table、survival table 和 compound curve 片段导入平台，不再散落在附件和截图里。",
    input: "你手里的 KM / survival / hazard 数据",
    system: "时间对齐、字段校验、来源记录、对象标准化",
    output: "一组可追溯的证据对象",
  },
  {
    index: "02",
    tone: "evidence",
    title: "把不同来源整理成同一种语言",
    summary: "平台把分散来源统一到同一时间粒度和引用格式，避免你每次 run 前都手工换算一次。",
    input: "原始 timepoints、单位和 metadata",
    system: "单位换算、windowing、transform trace",
    output: "可版本化的证据层",
  },
  {
    index: "03",
    tone: "evidence",
    title: "把证据编译成模型能直接调用的函数",
    summary: "把 survival / hazard table 和复合曲线转换成 cycle-level event probabilities，后续校准、求解和画图都复用这一层。",
    input: "已整理的 ClinicalSeries / CompoundCurve",
    system: "ProbSurvTable、ProbHazardTable、ProbCompCurve",
    output: "一条可复用的概率函数",
  },
  {
    index: "04",
    tone: "simulation",
    title: "运行 Markov / PSA",
    summary: "启动 cohort Markov、PSA 和 sensitivity analysis，并保留样本矩阵、seed、job 状态和 artifacts。",
    input: "概率函数、模型参数、抽样设置",
    system: "Markov engine、LHS sampler、queued runs",
    output: "Costs、QALYs、ICER 和 sample matrix",
  },
  {
    index: "05",
    tone: "calibration",
    title: "让模型先贴近 observed clinical data",
    summary: "根据临床数据拟合参数边界，记录优化轨迹、goodness-of-fit 和 overlay，减少手工试错。",
    input: "Observed OS/PFS 与 calibration bounds",
    system: "Optimizer、fit scoring、overlay generation",
    output: "best-fit 参数与校准记录",
  },
  {
    index: "06",
    tone: "review",
    title: "把结果讲清楚并交给团队审阅",
    summary: "统一查看 cohort trace、scatterplots、patient event log 和 downloadable artifacts，不再在图、表、注释之间来回跳转。",
    input: "Run metrics、patient events 和 notes",
    system: "Trace view、artifact versioning、review comments",
    output: "一页可审阅、可分享的结果面",
  },
];

const surfaces = {
  evidence: {
    key: "evidence",
    tone: "evidence",
    label: "证据工作台 Evidence Workbench",
    kicker: "先整理好输入，再继续后面的分析",
    title: "把原始临床数据整理成下一步可以直接调用的证据层",
    description:
      "你把 survival / hazard / KM 数据和 compound curve 定义带进来，平台先帮你做对象标准化、时间对齐和校验日志，然后再把这些结果交给运行时和求解层。",
    status: "证据已标准化，可继续往下走",
    inputs: ["KM OS / PFS table", "Hazard table", "Compound curve fragments"],
    system: ["字段校验与 time alignment", "单位换算与 trace log", "对象标准化与版本标记"],
    outputs: ["ClinicalSeries", "CurveFit", "CompoundCurve", "ProbabilityFunction draft"],
  },
  calibration: {
    key: "calibration",
    tone: "calibration",
    label: "校准工作台 Calibration Studio",
    kicker: "先把模型拉近 observed data，再去大规模跑分析",
    title: "用 observed clinical data 调整模型，让结果更像真实疾病进程",
    description:
      "你在这里设定目标曲线、参数边界和优化设置。平台负责异步拟合、记录优化轨迹，并把 observed vs predicted overlay 回到同一界面里。",
    status: "校准完成后会返回 overlay 与 best-fit 参数",
    inputs: ["OS / PFS target series", "Bounds for p_progression / p_death", "Objective function"],
    system: ["Optimization loop", "Goodness-of-fit scoring", "Overlay plot rendering"],
    outputs: ["Best-fit parameter set", "Fit score", "Versioned overlay artifact"],
  },
  simulation: {
    key: "simulation",
    tone: "simulation",
    label: "模拟实验室 Simulation Lab",
    kicker: "把函数真正跑起来，再看患者队列如何流动",
    title: "启动一次真实模拟，并把中间过程和结果一起保存下来",
    description:
      "你点击运行后，平台会异步执行 cohort Markov、PSA、sensitivity analysis，并保留 sampling method、seed、matrix、run metadata 和 artifacts。",
    status: "运行会排队、留痕、可复现",
    inputs: ["Probability runtime", "Model parameters", "Sampling config"],
    system: ["Run queue orchestration", "LHS / random sampler", "Artifact persistence"],
    outputs: ["Run status", "Sample matrix", "Metrics catalog", "Downloadable outputs"],
  },
  review: {
    key: "review",
    tone: "review",
    label: "审阅界面 Review Surface",
    kicker: "把结果讲清楚，而不是只把图导出来",
    title: "把关键指标、动态状态流和 artifacts 放进同一张结果页里",
    description:
      "你在这里直接解释结果。平台把 scatterplots、cohort trace、run metadata、artifact versions 和 reviewer notes 放在一个连续阅读路径里。",
    status: "结果已可审阅、可汇报、可分享",
    inputs: ["Run metrics", "Patient / cohort events", "Artifacts and notes"],
    system: ["Axis selection", "Cohort time slicing", "Artifact versioning"],
    outputs: ["Scatterplot", "Cohort dashboard", "Run notes", "Share-ready evidence pack"],
  },
};

const objectCards = [
  {
    tone: "evidence",
    name: "ClinicalSeries",
    en: "整理好的临床证据",
    status: "Validated",
    tags: ["KM points", "Time-aligned", "Versioned"],
    source: "Clinical trial KM table / survival table / hazard table",
    fields: "series_type, unit, source_id, points, trace_log",
    generatedBy: "证据导入与校验流程",
    usedBy: "曲线拟合、校准目标、结果审阅",
  },
  {
    tone: "evidence",
    name: "CompoundCurve",
    en: "复合生存曲线定义",
    status: "Traceable",
    tags: ["Blended segments", "Rule-based", "Reusable"],
    source: "Multiple fitted curves or table segments",
    fields: "curve_parts, switch_rules, time_windows, provenance",
    generatedBy: "曲线组合工作台",
    usedBy: "概率函数、图形层、敏感性叠加",
  },
  {
    tone: "simulation",
    name: "ProbabilityFunction",
    en: "每个 cycle 的事件概率",
    status: "Versioned",
    tags: ["ProbSurvTable", "ProbHazardTable", "Traceable"],
    source: "ClinicalSeries / Hazard table / CompoundCurve",
    fields: "function_type, cycle_window, inputs_ref, transform_notes",
    generatedBy: "运行时编译器",
    usedBy: "Solver、绘图、校准、敏感性分析",
  },
  {
    tone: "review",
    name: "RunArtifact",
    en: "可交付的结果产物",
    status: "Shareable",
    tags: ["PNG", "CSV", "Run notes"],
    source: "Completed Markov / PSA / calibration run",
    fields: "artifact_type, file_key, run_id, version, reviewer_note",
    generatedBy: "运行流程与导出层",
    usedBy: "结果审阅页、下载、审计轨迹",
  },
];

const capabilityFilters = [
  { key: "all", label: "全部" },
  { key: "evidence", label: "Evidence" },
  { key: "calibration", label: "Calibration" },
  { key: "simulation", label: "Simulation" },
  { key: "review", label: "Review" },
];

const capabilities = [
  {
    key: "probability-runtime",
    workflow: "evidence",
    maturity: "core",
    title: "统一概率运行时 Probability Runtime",
    summary: "把 survival / hazard / compound curves 统一为可被 solver、plot 和 calibration 重复调用的函数层。",
    input: "ClinicalSeries / CompoundCurve",
    output: "Cycle-level event probability",
    engine: "Runtime compiler",
    tags: ["P0 Core", "Evidence", "Reusable"],
  },
  {
    key: "clinical-calibration",
    workflow: "calibration",
    maturity: "next",
    title: "临床校准 Clinical Calibration",
    summary: "用 observed clinical data 自动拟合 Markov 参数，减少手工试错。",
    input: "KM / survival data + parameter bounds",
    output: "Best-fit parameter set + overlay fit",
    engine: "Optimization loop",
    tags: ["P1 Ready Next", "Observed vs Predicted", "Overlay"],
  },
  {
    key: "plot-sensitivity",
    workflow: "calibration",
    maturity: "next",
    title: "图形敏感性模式 Plot Sensitivity",
    summary: "在 Survival Plot 和 Markov Plot 上直接叠加 low / base / high 结果，提升解释性。",
    input: "Scenario deltas",
    output: "Overlay curves + key driver insight",
    engine: "Plot layer",
    tags: ["P1 Ready Next", "Visual sensitivity", "Review"],
  },
  {
    key: "lhs-psa",
    workflow: "simulation",
    maturity: "next",
    title: "拉丁超立方 PSA",
    summary: "更均匀地覆盖参数空间，在较少模拟次数下得到更稳定的 PSA 输出。",
    input: "Distribution config",
    output: "LHS sample matrix + stable PSA run",
    engine: "Sampling engine",
    tags: ["P1 Ready Next", "Sampling", "Reproducibility"],
  },
  {
    key: "patient-tracking",
    workflow: "review",
    maturity: "later",
    title: "患者追踪仪表盘 Patient Tracking",
    summary: "把 patient-level event log 聚合成 cohort dashboard，用于发现异常迁移和结构问题。",
    input: "Patient event log",
    output: "Cohort dashboard + drill-down trace",
    engine: "Trace aggregation",
    tags: ["P2 Later", "Microsimulation", "Dashboard"],
  },
  {
    key: "scatterplot",
    workflow: "review",
    maturity: "next",
    title: "自定义模拟散点图 Custom Scatterplot",
    summary: "任意选择输入或输出指标组合，快速识别相关性、异常点和关键驱动因素。",
    input: "Run metrics catalog",
    output: "Custom scatterplot",
    engine: "Analytics layer",
    tags: ["P1 Ready Next", "Metrics", "Exploration"],
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
      "文章评估不同年龄和性别人群的 Lassa 疫苗接种策略，并比较不同价格下的 cost-effectiveness。对我们平台而言，这类研究正好对应 vaccine targeting、threshold analysis 和 population-level modelling。",
    doi: "https://doi.org/10.1016/S2214-109X(25)00450-4",
    source: "https://www.sciencedirect.com/science/article/pii/S2214109X25004504",
  },
  {
    title: "The potential effect of a geographically focused intervention against tuberculosis in the USA",
    journal: "The Lancet Public Health",
    published: "February 2026",
    lens: "Simulation + Markov economic outcomes",
    summary:
      "这篇论文用 simulation modelling 和 Markov cohort lifetime outcomes 评估针对高负担县的结核干预。它非常贴近我们平台未来的 policy scenario、targeted intervention 和 lifetime cost/outcome 分析能力。",
    doi: "https://doi.org/10.1016/S2468-2667(25)00306-8",
    source: "https://www.sciencedirect.com/science/article/pii/S2468266725003068",
  },
];

const architectureLayers = [
  {
    index: "L1",
    title: "Experience Layer",
    body: "公开官网、产品界面、Example Runs 和 Review Surfaces 都属于体验层，负责解释任务流并承接用户操作。",
    items: ["GitHub Pages public surface", "Workspace navigation", "Example run dashboard"],
  },
  {
    index: "L2",
    title: "Workflow Orchestration",
    body: "管理 evidence ingest、run queue、parameter configs、artifact exports 和 reviewer notes 的流程编排。",
    items: ["Workspace state", "Async run orchestration", "Versioned configs"],
  },
  {
    index: "L3",
    title: "Modeling Engine",
    body: "平台真正的差异化核心，统一 probability runtime，并驱动 Markov、PSA、calibration 等分析引擎。",
    items: ["Probability runtime", "Markov cohort engine", "LHS sampler", "Calibration optimizer"],
  },
  {
    index: "L4",
    title: "Data & Artifact Layer",
    body: "持久化对象模型、run metadata、sample matrix 和 exported artifacts，保证版本与追溯能力。",
    items: ["PostgreSQL metadata", "Object storage", "Run metrics", "Artifacts and logs"],
  },
  {
    index: "L5",
    title: "Governance & Review Layer",
    body: "把 run notes、review comments、assumptions、artifact versions 组织成可交付、可分享的审阅面。",
    items: ["Reviewer notes", "Version lineage", "Audit trail", "Share-ready outputs"],
  },
];

const roadmapColumns = [
  {
    key: "p0",
    badge: "P0 Core",
    title: "先闭合 Evidence 到 Probability 的底座",
    copy: "只要这条底层闭环可用，平台就不再是概念展示，而是一个真的能运行的分析系统。",
    items: ["上传 survival / hazard / KM 数据", "对象标准化与校验日志", "输出 cycle probability", "Traceable function runtime"],
  },
  {
    key: "p1",
    badge: "P1 Ready Next",
    title: "把 Calibration 和 PSA 做成差异化能力",
    copy: "这一步决定平台是不是现代 HEOR 工具，而不只是一个建模壳子。",
    items: ["Observed vs predicted calibration", "LHS for PSA", "Plot sensitivity mode", "Run metadata and artifact exports"],
  },
  {
    key: "p2",
    badge: "P2 Later",
    title: "补齐 Patient-level 与协作审阅层",
    copy: "当底层引擎稳定后，再把 patient trace、review comments 和分享工作流完整拉起来。",
    items: ["Patient event log", "Cohort dashboard", "Reviewer comment workflow", "Collaboration and approvals"],
  },
];

const outputMetrics = [
  { label: "Incremental cost", value: "$18,440", note: "Societal perspective" },
  { label: "Incremental QALY", value: "0.62", note: "Discounted at 3%" },
  { label: "ICER", value: "$29,742 / QALY", note: "Below $50k threshold" },
  { label: "Net monetary benefit", value: "$12,860", note: "WTP $50,000" },
];

const artifactItems = [
  { name: "overlay-fit-v3.png", meta: "calibration artifact · versioned" },
  { name: "psa-sample-matrix.csv", meta: "8,000 samples · lhs" },
  { name: "cohort-trace-cycle-24.csv", meta: "review extract" },
  { name: "assumptions-and-notes.md", meta: "reviewer comment ready" },
];

const scatterOptions = {
  incrementalCost: "Incremental cost",
  incrementalQaly: "Incremental QALY",
  nmb: "Net monetary benefit",
  osGain: "OS gain (months)",
  pfsGain: "PFS gain (months)",
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
  if (maturity === "core") return "P0 Core";
  if (maturity === "next") return "P1 Ready Next";
  return "P2 Later";
}

function renderWorkflow() {
  workflowRail.innerHTML = workflowSteps
    .map(
      (step) => `
        <article class="workflow-step">
          <div class="workflow-step-head">
            <span class="workflow-index">${step.index}</span>
            <span class="mini-label ${toneClass(step.tone)}">${step.tone}</span>
          </div>
          <div class="workflow-copy">
            <h3>${step.title}</h3>
            <p>${step.summary}</p>
          </div>
          <div class="workflow-detail">
            <div class="detail-block">
              <span>输入</span>
              <strong>${step.input}</strong>
            </div>
            <div class="detail-block">
              <span>系统动作</span>
              <strong>${step.system}</strong>
            </div>
            <div class="detail-block">
              <span>输出</span>
              <strong>${step.output}</strong>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderHeroChart() {
  heroChart.innerHTML = makeCalibrationSvg("base", { compact: true, note: "Observed vs predicted" });
}

function renderSurfaceNav() {
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
          <span class="mini-label tone-evidence">Drag and drop</span>
          <div class="dropzone">
            <div>
              <strong>${state.evidenceLoaded ? "3 份证据文件已加入 staging" : "把 KM / hazard / survival 文件拖进这里"}</strong>
              <p>${state.evidenceLoaded ? "时间对齐、字段校验和来源记录都已经生成。" : "支持 KM table、hazard table、compound curve 片段和 trial metadata。"}</p>
              <button id="load-demo-evidence" class="fake-button">${state.evidenceLoaded ? "重新载入示例证据" : "加载一组示例证据"}</button>
            </div>
          </div>
          <p id="evidence-stage-status">${state.evidenceLoaded ? "证据对象、曲线对象和函数草稿都已准备好，可以继续往下走。" : "当前状态：等待一组示例证据。点击按钮就能体验这一步真正会发生什么。 "}</p>
        </section>
        <section class="control-card">
          <div class="mini-topline">
            <span>你已经得到的对象</span>
            <span>${state.evidenceLoaded ? "Validated" : "Draft"}</span>
          </div>
          <ul class="stack-list">
            <li><div><strong>KM Trial OS</strong><br /><small>points: 8 · unit: month</small></div><span class="pill ${state.evidenceLoaded ? "core" : "neutral"}">${state.evidenceLoaded ? "Ready" : "Waiting"}</span></li>
            <li><div><strong>Hazard Segment A</strong><br /><small>window: 0-12 month</small></div><span class="pill ${state.evidenceLoaded ? "core" : "neutral"}">${state.evidenceLoaded ? "Validated" : "Draft"}</span></li>
            <li><div><strong>CompoundCurve v0.2</strong><br /><small>blend rule: curve-fit + table</small></div><span class="pill ${state.evidenceLoaded ? "core" : "neutral"}">${state.evidenceLoaded ? "Versioned" : "Pending"}</span></li>
            <li><div><strong>ProbSurvTable draft</strong><br /><small>cycle window: 1 month</small></div><span class="pill ${state.evidenceLoaded ? "core" : "neutral"}">${state.evidenceLoaded ? "Traceable" : "Not compiled"}</span></li>
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
              <span class="panel-kicker">Overlay Plot</span>
              <h3>你会先看到的校准图</h3>
            </div>
            <div id="surface-scenario-toggle" class="segmented"></div>
          </div>
          <div id="surface-calibration-chart" class="chart-frame large-frame"></div>
          <div class="object-tags">
            <span class="metric-line">Observed points</span>
            <span class="metric-line">Predicted line</span>
            <span class="metric-line">Uncertainty band</span>
            <span class="metric-line">GOF tracked with run id</span>
          </div>
        </section>
        <section class="control-card">
          <span class="mini-label tone-calibration">Parameter bounds</span>
          <div class="table-card">
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Min</th>
                  <th>Start</th>
                  <th>Max</th>
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
            <li><div><strong>运行记录</strong><br /><small>24 iterations · optimizer = Nelder-Mead</small></div><span class="pill next">已留痕</span></li>
            <li><div><strong>拟合表现</strong><br /><small>RMSE 0.018 · R² 0.91</small></div><span class="pill next">可解释</span></li>
          </ul>
        </section>
      </div>
    `;
  }

  if (key === "simulation") {
    const buttonLabel = state.runProgress === 0 ? "Run Markov + PSA" : state.runProgress < 100 ? "Running..." : "Rerun Analysis";
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
            <div><span>Sampling</span><strong>${state.runProgress === 0 ? "LHS pending" : "Latin hypercube"}</strong></div>
            <div><span>Samples</span><strong>${state.runProgress === 0 ? "0" : state.runProgress < 100 ? "8,000 已排队" : "8,000 已完成"}</strong></div>
            <div><span>Seed</span><strong>874211</strong></div>
          </div>
        </section>
        <section class="control-card">
          <span class="mini-label tone-simulation">运行记录与产物</span>
          <ul class="stack-list">
            <li><div><strong>RUN-2026-0315-014</strong><br /><small>analysis: cohort Markov + PSA</small></div><span class="pill ${state.runProgress === 100 ? "core" : "next"}">${state.runProgress === 100 ? "完成" : "排队中"}</span></li>
            <li><div><strong>Sample matrix</strong><br /><small>lhs_samples_v2.csv</small></div><span class="pill ${state.runProgress > 20 ? "core" : "neutral"}">${state.runProgress > 20 ? "已保存" : "等待中"}</span></li>
            <li><div><strong>Artifact bundle</strong><br /><small>icer_summary.json · ce_plane.png</small></div><span class="pill ${state.runProgress === 100 ? "core" : "neutral"}">${state.runProgress === 100 ? "可查看" : "未生成"}</span></li>
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
            X axis
            <select id="surface-review-x"></select>
          </label>
          <label>
            Y axis
            <select id="surface-review-y"></select>
          </label>
          <label>
            Cohort slice
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
    button.addEventListener("click", () => {
      state.evidenceLoaded = !state.evidenceLoaded;
      renderSurfaceView();
    });
    return;
  }

  if (key === "calibration") {
    mountScenarioToggle(document.getElementById("surface-scenario-toggle"), state.surfaceScenario, (value) => {
      state.surfaceScenario = value;
      attachSurfaceInteractions("calibration");
    });
    renderCalibrationInto(document.getElementById("surface-calibration-chart"), state.surfaceScenario, false);
    return;
  }

  if (key === "simulation") {
    const button = document.getElementById("run-psa-button");
    button.addEventListener("click", startRunAnimation);
    return;
  }

  populateScatterSelect(document.getElementById("surface-review-x"), state.reviewX);
  populateScatterSelect(document.getElementById("surface-review-y"), state.reviewY);
  document.getElementById("surface-review-x").addEventListener("change", (event) => {
    state.reviewX = event.target.value;
    renderScatterInto(document.getElementById("surface-review-scatter"), state.reviewX, state.reviewY);
  });
  document.getElementById("surface-review-y").addEventListener("change", (event) => {
    state.reviewY = event.target.value;
    renderScatterInto(document.getElementById("surface-review-scatter"), state.reviewX, state.reviewY);
  });
  const slider = document.getElementById("surface-cohort-slider");
  slider.addEventListener("input", (event) => {
    state.reviewCohortIndex = Number(event.target.value);
    renderCohortInto(document.getElementById("surface-cohort-board"), document.getElementById("surface-cohort-time"), state.reviewCohortIndex);
  });
  renderScatterInto(document.getElementById("surface-review-scatter"), state.reviewX, state.reviewY);
  renderCohortInto(document.getElementById("surface-cohort-board"), document.getElementById("surface-cohort-time"), state.reviewCohortIndex);
}

function mountScenarioToggle(container, active, onSelect) {
  const scenarios = [
    { key: "low", label: "low" },
    { key: "base", label: "base" },
    { key: "high", label: "high" },
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
  cohortSlider.oninput = (event) => {
    state.exampleCohortIndex = Number(event.target.value);
    renderCohortInto(exampleCohort, cohortTime, state.exampleCohortIndex);
  };
}

function renderArtifactList() {
  artifactList.innerHTML = artifactItems
    .map((item) => `<li><span>${item.name}</span><small>${item.meta}</small></li>`)
    .join("");
}

function renderObjectCards() {
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
              <dd>${surfaces[item.workflow] ? surfaces[item.workflow].label : "Core engine"}</dd>
            </div>
          </dl>
        </article>
      `
    )
    .join("");
}

function renderLancetWatch() {
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
  select.innerHTML = Object.entries(scatterOptions)
    .map(([key, label]) => `<option value="${key}" ${key === value ? "selected" : ""}>${label}</option>`)
    .join("");
}

function renderCalibrationInto(target, mode, compact) {
  target.innerHTML = makeCalibrationSvg(mode, { compact, note: compact ? "Preview run" : `Scenario: ${mode}` });
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

  const observedDots = calibrationObserved
    .map((value, index) => {
      const [x, y] = toPoint(value, index);
      return `<circle cx="${x}" cy="${y}" r="${compact ? 3.6 : 4.5}" fill="${palette.navy}" />`;
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
    <svg class="svg-root" viewBox="0 0 ${width} ${height}" role="img" aria-label="Calibration plot">
      ${yTicks}
      <line class="axis-line" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
      <line class="axis-line" x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
      <path d="${bandPath()}" fill="rgba(47, 111, 237, 0.12)" />
      <path d="${linePath(predicted)}" fill="none" stroke="${scenarioColor}" stroke-width="${compact ? 3 : 4}" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${linePath(calibrationObserved)}" fill="none" stroke="${palette.navy}" stroke-width="${compact ? 1.8 : 2.2}" stroke-dasharray="5 6" opacity="0.7" />
      ${observedDots}
      ${xTicks}
      <text class="chart-label" x="${padding}" y="${compact ? 20 : 22}">Observed points</text>
      <text class="chart-label" x="${width - padding}" y="${compact ? 20 : 22}" text-anchor="end">Predicted ${mode}</text>
      <text class="chart-note" x="${padding}" y="${height - 24}">Time (months)</text>
      <text class="chart-note" x="${width - padding}" y="${height - 24}" text-anchor="end">${note}</text>
    </svg>
  `;
}

function renderScatterInto(target, xKey, yKey) {
  target.innerHTML = makeScatterSvg(xKey, yKey);
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
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.2" fill="${fill}" fill-opacity="0.82" />`;
    })
    .join("");

  return `
    <svg class="svg-root" viewBox="0 0 ${width} ${height}" role="img" aria-label="Scatterplot">
      <line class="gridline" x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" />
      <line class="gridline" x1="${width / 2}" y1="${padding}" x2="${width / 2}" y2="${height - padding}" />
      <line class="axis-line" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
      <line class="axis-line" x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
      ${points}
      <text class="chart-label" x="${padding}" y="22">${scatterOptions[xKey]} vs ${scatterOptions[yKey]}</text>
      <text class="chart-note" x="${width - padding}" y="22" text-anchor="end">12 samples shown</text>
      <text class="axis-label" x="${width / 2}" y="${height - 12}" text-anchor="middle">${scatterOptions[xKey]}</text>
      <text class="axis-label" x="18" y="${height / 2}" transform="rotate(-90 18 ${height / 2})" text-anchor="middle">${scatterOptions[yKey]}</text>
    </svg>
  `;
}

function renderCeacInto(target) {
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
    <svg class="svg-root" viewBox="0 0 ${width} ${height}" role="img" aria-label="CEAC chart">
      <line class="gridline" x1="${padding}" y1="${normalizeY(0.5)}" x2="${width - padding}" y2="${normalizeY(0.5)}" />
      <line class="axis-line" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
      <line class="axis-line" x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
      <path d="${path}" fill="none" stroke="${palette.review}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      ${points}
      <text class="chart-label" x="${padding}" y="22">Probability cost-effective</text>
      <text class="chart-note" x="${width - padding}" y="22" text-anchor="end">WTP threshold</text>
      <text class="axis-label" x="${width / 2}" y="${height - 12}" text-anchor="middle">Threshold (USD / QALY)</text>
      <text class="axis-label" x="18" y="${height / 2}" transform="rotate(-90 18 ${height / 2})" text-anchor="middle">Probability</text>
    </svg>
  `;
}

function renderCohortInto(target, labelNode, index) {
  const point = cohortTimeline[index];
  labelNode.textContent = point.label;
  target.innerHTML = [
    { name: "Progression-free", value: point.pfs, color: palette.evidence },
    { name: "Progressed disease", value: point.pd, color: palette.calibration },
    { name: "Dead", value: point.dead, color: palette.review },
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
      statusLabel.textContent = state.runProgress < 100 ? "Markov + PSA executing" : "Completed and stored";
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

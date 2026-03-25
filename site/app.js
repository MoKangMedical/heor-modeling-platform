const capabilities = [
  {
    title: "Clinical Calibration",
    body: "用 KM / survival 数据自动校准 Markov 参数，让拟合流程从手工试错转向结构化优化。",
    meta: ["P1", "Markov", "Observed vs Predicted"],
  },
  {
    title: "Plot Sensitivity Mode",
    body: "直接在 Markov Plot 和 Survival Plot 上叠加 low / base / high 曲线，用机制图解释参数影响。",
    meta: ["P1", "Sensitivity", "Overlay Curves"],
  },
  {
    title: "Latin Hypercube PSA",
    body: "为 PSA 提供更均匀的参数空间覆盖，减少样本浪费，提高稳定性和重复性。",
    meta: ["P1", "Sampling", "Reproducibility"],
  },
  {
    title: "Patient Tracking Dashboard",
    body: "把 patient-level event log 汇总成 cohort dashboard，识别异常迁移和结构风险。",
    meta: ["P2", "Microsimulation", "Review"],
  },
  {
    title: "Custom Scatterplots",
    body: "任意选择输入样本、输出结果、增量指标做散点图，快速暴露相关性和异常点。",
    meta: ["P1", "Metrics", "Exploration"],
  },
  {
    title: "Probability Functions",
    body: "把 survival tables、hazard tables、compound curves 转成统一 probability runtime，供 solver、plot、calibration 复用。",
    meta: ["P0", "Evidence", "Runtime Core"],
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

const workspaceViews = [
  {
    key: "evidence",
    label: "Evidence Workbench",
    title: "Evidence Workbench",
    status: "Foundational Layer",
    description:
      "负责接收 survival table、hazard table、KM 数据和 compound curve 定义，并把它们标准化成平台内部可引用对象。",
    objects: ["ClinicalSeries", "CurveFit", "CompoundCurve", "ProbabilityFunction"],
    outputs: ["Validated evidence objects", "Time-aligned series", "Debuggable function traces"],
    mock: [
      ["KM Trial OS", "Upload、校验、标准化 points 和 time unit"],
      ["Hazard Blend", "用多个 fit / table segment 生成 compound curve"],
      ["ProbSurvTable", "按 cycle 窗口计算 interval event probability"],
    ],
  },
  {
    key: "calibration",
    label: "Calibration Studio",
    title: "Calibration Studio",
    status: "Observed Data Fitting",
    description:
      "围绕 observed clinical data 拟合 model parameters，记录参数边界、目标函数、优化轨迹、overlay plot 和最终参数集。",
    objects: ["CalibrationConfig", "CalibrationParameter", "CalibrationRun", "CalibrationResult"],
    outputs: ["Best-fit parameter set", "Fit score", "Observed vs predicted overlay"],
    mock: [
      ["Target Series", "选择 OS/PFS clinical series 作为 calibration target"],
      ["Parameter Bounds", "限定 calibratable parameters 的搜索空间"],
      ["Overlay Plot", "对比 observed curve 与 model prediction 的偏差"],
    ],
  },
  {
    key: "simulation",
    label: "Simulation Lab",
    title: "Simulation Lab",
    status: "PSA & Runtime",
    description:
      "承担 cohort Markov、PSA 和 sample set 批量执行，保留 random seed、sampling method 和 run artifacts。",
    objects: ["Run", "SampleSet", "RunMetricCatalog", "RunArtifact"],
    outputs: ["Queued runs", "LHS/random sample matrices", "Metrics catalog"],
    mock: [
      ["Run Queue", "异步管理 Markov、PSA、Calibration 等不同 analysis type"],
      ["Latin Hypercube", "对高维参数分布做均匀覆盖的 sample generation"],
      ["Artifacts", "存储 plot、CSV、sample matrix 和 report exports"],
    ],
  },
  {
    key: "review",
    label: "Review Surface",
    title: "Review Surface",
    status: "Traceability & Explanation",
    description:
      "把 metrics catalog、scatterplots、cohort aggregates 和 patient trace 组织成审阅层，让模型结果不仅可算，还可解释。",
    objects: ["RunMetricValues", "Scatterplot", "CohortAggregates", "PatientStateEvents"],
    outputs: ["Custom scatterplots", "Cohort dashboard", "Patient drill-down trace"],
    mock: [
      ["Scatterplot", "任意选择输入/输出指标做关系探索"],
      ["Cohort Trace", "按时间显示 occupancy、inflow、outflow"],
      ["Patient Drill-down", "定位 sample 或 patient 的异常路径"],
    ],
  },
];

const capabilityGrid = document.getElementById("capability-grid");
const lancetCount = document.getElementById("lancet-count");
const lancetGrid = document.getElementById("lancet-grid");
const workspaceNav = document.getElementById("workspace-nav");
const workspaceTitle = document.getElementById("workspace-title");
const workspaceStatus = document.getElementById("workspace-status");
const workspaceDescription = document.getElementById("workspace-description");
const workspaceObjects = document.getElementById("workspace-objects");
const workspaceOutputs = document.getElementById("workspace-outputs");
const workspaceMock = document.getElementById("workspace-mock");

function renderCapabilities() {
  capabilityGrid.innerHTML = capabilities
    .map(
      (item) => `
        <article class="capability-card">
          <span class="card-label">Platform Block</span>
          <h3>${item.title}</h3>
          <p>${item.body}</p>
          <div class="capability-meta">
            ${item.meta.map((meta) => `<span class="meta-chip">${meta}</span>`).join("")}
          </div>
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
            <span class="lancet-chip">${item.journal}</span>
            <span class="lancet-chip">${item.published}</span>
            <span class="lancet-chip">${item.lens}</span>
          </div>
          <h3>${item.title}</h3>
          <p>${item.summary}</p>
          <div class="lancet-links">
            <a class="text-link" href="${item.doi}" target="_blank" rel="noreferrer">打开 DOI</a>
            <a class="text-link secondary" href="${item.source}" target="_blank" rel="noreferrer">查看来源页</a>
          </div>
        </article>
      `
    )
    .join("");
}

function renderWorkspaceTabs() {
  workspaceNav.innerHTML = workspaceViews
    .map(
      (view, index) => `
        <button class="${index === 0 ? "active" : ""}" data-key="${view.key}">
          ${view.label}
        </button>
      `
    )
    .join("");

  workspaceNav.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      workspaceNav.querySelectorAll("button").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      const target = workspaceViews.find((view) => view.key === button.dataset.key);
      if (target) {
        renderWorkspaceView(target);
      }
    });
  });
}

function renderWorkspaceView(view) {
  workspaceTitle.textContent = view.title;
  workspaceStatus.textContent = view.status;
  workspaceDescription.textContent = view.description;
  workspaceObjects.innerHTML = view.objects.map((item) => `<li>${item}</li>`).join("");
  workspaceOutputs.innerHTML = view.outputs.map((item) => `<li>${item}</li>`).join("");
  workspaceMock.innerHTML = `
    <div class="mock-grid">
      ${view.mock
        .map(
          ([title, text]) => `
            <div class="mock-card">
              <strong>${title}</strong>
              <span>${text}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

renderCapabilities();
renderLancetWatch();
renderWorkspaceTabs();
renderWorkspaceView(workspaceViews[0]);

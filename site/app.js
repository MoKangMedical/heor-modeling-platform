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
renderWorkspaceTabs();
renderWorkspaceView(workspaceViews[0]);


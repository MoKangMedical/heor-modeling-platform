const STORAGE_KEYS = {
  apiBase: "heor-demo.api-base",
  series: "heor-demo.offline.series",
  functions: "heor-demo.offline.functions",
  runs: "heor-demo.offline.runs",
};

const DEFAULT_API_BASE = "http://127.0.0.1:8000/api/v1";
const OFFLINE_CONTEXT = {
  organization_id: "offline-org",
  organization_slug: "offline-org",
  project_id: "offline-project",
  project_slug: "offline-heor",
  model_id: "offline-model",
  model_version_id: "offline-model-version",
  model_name: "Offline Oncology Model",
  latest_series_id: null,
  latest_probability_function_id: null,
  latest_run_id: null,
};

const SAMPLE_POINTS = [
  { seq_no: 1, time_value: 0, estimate_value: 1.0 },
  { seq_no: 2, time_value: 3, estimate_value: 0.92 },
  { seq_no: 3, time_value: 6, estimate_value: 0.84 },
  { seq_no: 4, time_value: 9, estimate_value: 0.73 },
  { seq_no: 5, time_value: 12, estimate_value: 0.61 },
  { seq_no: 6, time_value: 15, estimate_value: 0.49 },
];

const SAMPLE_CSV = [
  "seq_no,time_value,estimate_value",
  ...SAMPLE_POINTS.map((point) => `${point.seq_no},${point.time_value},${point.estimate_value}`),
].join("\n");

const PALETTE = {
  ink: "#132033",
  muted: "#607185",
  line: "rgba(19, 32, 51, 0.14)",
  evidence: "#2f6fed",
  calibration: "#7c5ce0",
  simulation: "#18a6a0",
  review: "#d9852c",
  success: "#2e9d6b",
  warning: "#c58b28",
  fill: "rgba(47, 111, 237, 0.12)",
};

const DEFAULT_METRIC_OPTIONS = [
  { key: "total_cost", label: "Total Cost" },
  { key: "total_qalys", label: "Total QALYs" },
  { key: "life_years", label: "Life Years" },
  { key: "deaths", label: "Deaths" },
  { key: "mean_transition_probability", label: "Mean Transition Probability" },
];

const state = {
  page: document.body.dataset.page,
  apiBase: localStorage.getItem(STORAGE_KEYS.apiBase) || DEFAULT_API_BASE,
  live: false,
  context: { ...OFFLINE_CONTEXT },
  series: [],
  functions: [],
  runs: [],
  selectedSeriesId: null,
  selectedFunctionId: null,
  selectedRunId: null,
  scatterX: "total_cost",
  scatterY: "total_qalys",
  patientIndex: 0,
  cycleFocusIndex: 0,
  currentReview: null,
  runProgressTimer: null,
};

document.addEventListener("DOMContentLoaded", () => {
  bootstrap().catch((error) => {
    console.error(error);
    setConnectionStatus("offline", "页面加载失败，已回退到离线样本模式。");
  });
});

async function bootstrap() {
  hydrateApiBaseInput();
  bindApiControls();
  await connectAndLoad();
  renderSharedChrome();

  if (state.page === "evidence") {
    initEvidencePage();
  }
  if (state.page === "runtime") {
    initRuntimePage();
  }
  if (state.page === "simulation") {
    initSimulationPage();
  }
  if (state.page === "review") {
    initReviewPage();
  }
}

function hydrateApiBaseInput() {
  const input = document.getElementById("api-base");
  if (input) {
    input.value = state.apiBase;
  }
}

function bindApiControls() {
  const button = document.getElementById("connect-api");
  const input = document.getElementById("api-base");
  if (!button || !input) {
    return;
  }

  button.addEventListener("click", async () => {
    state.apiBase = input.value.trim() || DEFAULT_API_BASE;
    localStorage.setItem(STORAGE_KEYS.apiBase, state.apiBase);
    await connectAndLoad();
    renderSharedChrome();
    rerenderPage();
  });
}

async function connectAndLoad() {
  setConnectionStatus("warning", "正在尝试连接本地 FastAPI；若不可达会自动回退到离线样本模式。");

  try {
    const context = await request("/demo/context");
    state.live = true;
    state.context = context;
    setConnectionStatus("live", "已连接真实 API。当前页面会直接创建对象、概率函数和 run。");
  } catch (error) {
    console.warn("Falling back to offline mode", error);
    state.live = false;
    state.context = { ...OFFLINE_CONTEXT };
    setConnectionStatus("offline", "未连接到后端，当前使用离线样本模式。页面仍可完整演示整条任务流。");
  }

  await refreshCollections();
}

async function refreshCollections() {
  if (state.live) {
    const [series, functions, runs] = await Promise.all([
      request(`/projects/${state.context.project_id}/clinical-series`).catch(() => []),
      request(`/model-versions/${state.context.model_version_id}/probability-functions`).catch(() => []),
      request(`/model-versions/${state.context.model_version_id}/runs`).catch(() => []),
    ]);
    state.series = series;
    state.functions = functions;
    state.runs = runs;
  } else {
    state.series = readStore(STORAGE_KEYS.series, []);
    state.functions = readStore(STORAGE_KEYS.functions, []);
    state.runs = readStore(STORAGE_KEYS.runs, []);
  }

  state.selectedSeriesId = pickLatestId(state.series, state.selectedSeriesId);
  state.selectedFunctionId = pickLatestId(state.functions, state.selectedFunctionId);
  state.selectedRunId = pickLatestId(state.runs, state.selectedRunId);
}

function pickLatestId(items, currentId) {
  if (currentId && items.some((item) => item.id === currentId)) {
    return currentId;
  }
  return items[0]?.id || null;
}

function rerenderPage() {
  if (state.page === "evidence") {
    renderEvidenceRegistry();
  }
  if (state.page === "runtime") {
    renderRuntimePage();
  }
  if (state.page === "simulation") {
    renderSimulationPage();
  }
  if (state.page === "review") {
    renderReviewShell();
  }
}

function renderSharedChrome() {
  setText("context-project", state.context.project_slug || state.context.project_id);
  setText("context-model", state.context.model_name || state.context.model_version_id);
  setText("context-mode", state.live ? "Live API mode" : "Offline sample mode");
  setText("sidebar-series-count", String(state.series.length));
  setText("sidebar-function-count", String(state.functions.length));
  setText("sidebar-run-count", String(state.runs.length));
  hydrateApiBaseInput();
}

function setConnectionStatus(mode, message) {
  const badge = document.getElementById("connection-badge");
  const copy = document.getElementById("connection-copy");
  if (badge) {
    badge.textContent = mode === "live" ? "Live API" : mode === "offline" ? "Offline Sample" : "Connecting";
    badge.className = `status-badge ${mode}`;
  }
  if (copy) {
    copy.textContent = message;
  }
}

function initEvidencePage() {
  const csv = document.getElementById("sample-csv");
  if (csv && !csv.value.trim()) {
    csv.value = SAMPLE_CSV;
  }

  document.getElementById("load-sample-csv")?.addEventListener("click", () => {
    document.getElementById("sample-csv").value = SAMPLE_CSV;
  });

  document.getElementById("create-series")?.addEventListener("click", async () => {
    const payload = buildSeriesPayload();
    if (!payload) {
      return;
    }

    try {
      const series = state.live ? await createSeriesLive(payload) : createSeriesOffline(payload);
      state.selectedSeriesId = series.id;
      await refreshCollections();
      renderSharedChrome();
      renderEvidenceRegistry();
      renderSeriesOutput(series, "ClinicalSeries created and ready for runtime compilation.");
    } catch (error) {
      renderSeriesOutput(null, extractMessage(error));
    }
  });

  renderEvidenceRegistry();
}

function renderEvidenceRegistry() {
  renderSeriesOutput(null, state.selectedSeriesId ? "" : "等待创建对象。");
  renderSeriesStatus();
  renderSeriesTable();
}

function buildSeriesPayload() {
  const rawCsv = document.getElementById("sample-csv")?.value || "";
  const points = parseCsvPoints(rawCsv);
  if (!points.length) {
    renderSeriesOutput(null, "CSV 中没有可解析的点。请检查表头和数值列。");
    return null;
  }

  return {
    name: document.getElementById("series-name")?.value.trim() || "Demo PFS KM",
    series_kind: document.getElementById("series-kind")?.value || "km_survival",
    time_unit: "month",
    value_unit: "survival_probability",
    interpolation_method: "piecewise_linear",
    source_metadata_json: {
      source: state.live ? "live-demo-ui" : "offline-demo-ui",
      page: "evidence",
    },
    points,
  };
}

function renderSeriesOutput(series, message) {
  const container = document.getElementById("series-output");
  if (!container) {
    return;
  }

  const selected = series || state.series.find((item) => item.id === state.selectedSeriesId);
  if (!selected) {
    container.innerHTML = `
      <strong>尚未创建对象</strong>
      <p class="helper">${message || "创建成功后，这里会显示对象 id、点数、来源和下一步建议。"}</p>
    `;
    return;
  }

  container.innerHTML = `
    <span class="panel-kicker">Latest ClinicalSeries</span>
    <strong>${selected.name}</strong>
    <p class="helper">${message || "该对象已经标准化，可以直接在下一页编译为 ProbabilityFunction。"}</p>
    <div class="pill-row">
      <span class="tone-pill evidence">${selected.series_kind}</span>
      <span class="hero-chip">${selected.points.length} points</span>
    </div>
    <ul class="context-list">
      <li>
        <span>ID</span>
        <strong>${selected.id}</strong>
      </li>
      <li>
        <span>Value Unit</span>
        <strong>${selected.value_unit}</strong>
      </li>
    </ul>
  `;
}

function renderSeriesStatus() {
  const container = document.getElementById("series-status-strip");
  if (!container) {
    return;
  }
  const selected = state.series.find((item) => item.id === state.selectedSeriesId);
  if (!selected) {
    container.innerHTML = `
      <strong>Waiting for upload</strong>
      <p class="helper">Time alignment、字段完整性和对象标准化结果会显示在这里。</p>
    `;
    return;
  }

  container.innerHTML = `
    <strong>${selected.name}</strong>
    <p class="helper">Validation passed. ${selected.points.length} points were aligned at ${selected.time_unit} granularity.</p>
    <div class="pill-row">
      <span class="tone-pill evidence">Validated</span>
      <span class="hero-chip">${state.live ? "Persisted in API" : "Stored offline"}</span>
    </div>
  `;
}

function renderSeriesTable() {
  const container = document.getElementById("series-list");
  if (!container) {
    return;
  }
  if (!state.series.length) {
    container.className = "table-scroll empty-state";
    container.textContent = "暂无对象。先在上方创建一个 ClinicalSeries。";
    return;
  }

  container.className = "table-scroll";
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Kind</th>
          <th>Points</th>
          <th>Time Unit</th>
          <th>ID</th>
        </tr>
      </thead>
      <tbody>
        ${state.series
          .map(
            (series) => `
              <tr>
                <td>${series.name}</td>
                <td>${series.series_kind}</td>
                <td>${series.points.length}</td>
                <td>${series.time_unit}</td>
                <td>${shortId(series.id)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function initRuntimePage() {
  document.getElementById("compile-function")?.addEventListener("click", async () => {
    const seriesId = document.getElementById("series-select")?.value;
    if (!seriesId) {
      renderFunctionOutput(null, "请先在 Evidence 页面创建一个 ClinicalSeries。");
      return;
    }

    const payload = {
      name: document.getElementById("function-name")?.value.trim() || "PFS Event Probability",
      function_kind:
        document.getElementById("function-kind")?.value || "survival_interval_probability",
      source_type: "clinical_series",
      source_ref_id: seriesId,
      cycle_length: Number(document.getElementById("function-cycle-length")?.value || 1),
      time_unit: "month",
      interpolation_method: "piecewise_linear",
      options_json: {},
    };

    try {
      const probabilityFunction = state.live
        ? await createFunctionLive(payload)
        : createFunctionOffline(payload);
      state.selectedFunctionId = probabilityFunction.id;
      await refreshCollections();
      renderSharedChrome();
      renderRuntimePage();
      renderFunctionOutput(probabilityFunction, "ProbabilityFunction compiled successfully.");
    } catch (error) {
      renderFunctionOutput(null, extractMessage(error));
    }
  });

  document.getElementById("debug-function")?.addEventListener("click", async () => {
    const functionId = document.getElementById("debug-function-select")?.value;
    const t0 = Number(document.getElementById("debug-t0")?.value || 0);
    const t1 = Number(document.getElementById("debug-t1")?.value || 1);
    if (!functionId) {
      renderDebugResult(null, "请先编译一个 ProbabilityFunction。");
      return;
    }
    try {
      const debug = state.live
        ? await request(`/probability-functions/${functionId}/debug`, {
            method: "POST",
            body: JSON.stringify({ t0, t1 }),
          })
        : debugFunctionOffline(functionId, t0, t1);
      renderDebugResult(debug);
    } catch (error) {
      renderDebugResult(null, extractMessage(error));
    }
  });

  renderRuntimePage();
}

function renderRuntimePage() {
  populateSelect(
    document.getElementById("series-select"),
    state.series.map((series) => ({
      value: series.id,
      label: `${series.name} · ${series.series_kind}`,
    })),
    state.selectedSeriesId
  );

  populateSelect(
    document.getElementById("debug-function-select"),
    state.functions.map((fn) => ({
      value: fn.id,
      label: `${fn.name} · ${fn.function_kind}`,
    })),
    state.selectedFunctionId
  );

  renderFunctionRegistry();
  renderFunctionOutput();
  renderDebugResult();
}

function renderFunctionOutput(functionRecord, message) {
  const container = document.getElementById("function-output");
  if (!container) {
    return;
  }
  const selected = functionRecord || state.functions.find((item) => item.id === state.selectedFunctionId);
  if (!selected) {
    container.innerHTML = `
      <strong>尚未生成函数</strong>
      <p class="helper">${message || "编译成功后，这里会显示 source ref、cycle length、compiled kind 和状态。"}</p>
    `;
    return;
  }

  const compiled = selected.options_json?.compiled_source;
  container.innerHTML = `
    <span class="panel-kicker">Latest ProbabilityFunction</span>
    <strong>${selected.name}</strong>
    <p class="helper">${message || "该函数已经可调试，并可直接在 Simulation Lab 中运行。"} </p>
    <div class="pill-row">
      <span class="tone-pill calibration">${compiled?.compiled_kind || "compiled"}</span>
      <span class="hero-chip">${selected.cycle_length} ${selected.time_unit}</span>
    </div>
    <ul class="context-list">
      <li>
        <span>Source Ref</span>
        <strong>${selected.source_ref_id}</strong>
      </li>
      <li>
        <span>Function Kind</span>
        <strong>${selected.function_kind}</strong>
      </li>
    </ul>
  `;
}

function renderFunctionRegistry() {
  const container = document.getElementById("function-list");
  if (!container) {
    return;
  }
  if (!state.functions.length) {
    container.className = "empty-state";
    container.textContent = "暂无函数。先从一个 ClinicalSeries 编译生成。";
    return;
  }

  container.className = "list-table";
  container.innerHTML = state.functions
    .map(
      (fn) => `
        <li>
          <strong>${fn.name}</strong>
          <span class="list-meta">${fn.function_kind} · ${fn.cycle_length} ${fn.time_unit}</span>
          <span class="list-meta">${shortId(fn.id)} · source ${shortId(fn.source_ref_id)}</span>
        </li>
      `
    )
    .join("");
}

function renderDebugResult(debug, message) {
  const result = document.getElementById("debug-result");
  const chart = document.getElementById("debug-chart");
  if (!result || !chart) {
    return;
  }

  if (!debug) {
    result.innerHTML = `
      <strong>等待调试</strong>
      <p class="helper">${message || "会显示 interval probability 和 trace 元数据。"}</p>
    `;
    chart.innerHTML = makeEmptyChartSvg("Compile a function first");
    return;
  }

  const selected = state.functions.find((item) => item.id === debug.function_id);
  result.innerHTML = `
    <strong>Probability = ${(debug.probability * 100).toFixed(2)}%</strong>
    <p class="helper">Interval [${debug.t0}, ${debug.t1}] evaluated against ${debug.trace.compiled_kind || "compiled"} source.</p>
    <ul class="context-list">
      <li>
        <span>Function ID</span>
        <strong>${debug.function_id}</strong>
      </li>
      <li>
        <span>Trace</span>
        <strong>${Object.entries(debug.trace)
          .slice(0, 3)
          .map(([key, value]) => `${key}: ${value}`)
          .join(" · ")}</strong>
      </li>
    </ul>
  `;
  chart.innerHTML = makeProbabilityChartSvg(selected, debug);
}

function initSimulationPage() {
  document.getElementById("launch-run")?.addEventListener("click", async () => {
    const functionId = document.getElementById("run-function-select")?.value;
    if (!functionId) {
      renderRunStatus("请先在 Runtime 页面创建一个 ProbabilityFunction。");
      return;
    }

    const payload = {
      project_id: state.context.project_id,
      analysis_type: "cohort_markov",
      sampling_method: document.getElementById("run-sampling-method")?.value || "lhs",
      input_snapshot_json: {},
      config_json: {
        probability_function_id: functionId,
        cycles: Number(document.getElementById("run-cycles")?.value || 12),
        initial_population: Number(document.getElementById("run-population")?.value || 1000),
        sample_size: Number(document.getElementById("run-sample-size")?.value || 16),
      },
    };

    animateRunProgress();
    renderRunStatus("Run queued. The demo is preparing summary cards and artifacts.");

    try {
      const run = state.live ? await createRunLive(payload) : createRunOffline(payload);
      stopRunProgress(100);
      state.selectedRunId = run.id;
      await refreshCollections();
      renderSharedChrome();
      await renderSimulationPage();
      renderRunStatus(`Run ${shortId(run.id)} completed.`);
    } catch (error) {
      stopRunProgress(0);
      renderRunStatus(extractMessage(error));
    }
  });

  renderSimulationPage();
}

async function renderSimulationPage() {
  populateSelect(
    document.getElementById("run-function-select"),
    state.functions.map((fn) => ({
      value: fn.id,
      label: `${fn.name} · ${fn.function_kind}`,
    })),
    state.selectedFunctionId
  );

  renderRunSummary();
  renderRunRegistry();
  await renderArtifactPreview();
}

function renderRunStatus(message) {
  const container = document.getElementById("run-status");
  if (!container) {
    return;
  }
  container.innerHTML = `
    <strong>${message}</strong>
    <p class="helper">Run API returns summary cards, metrics and artifact references that Review Surface can directly consume.</p>
  `;
}

function animateRunProgress() {
  stopRunProgress(0);
  let progress = 6;
  state.runProgressTimer = window.setInterval(() => {
    progress = Math.min(progress + 7, 90);
    setProgress(progress);
    if (progress >= 90) {
      window.clearInterval(state.runProgressTimer);
      state.runProgressTimer = null;
    }
  }, 180);
}

function stopRunProgress(finalValue) {
  if (state.runProgressTimer) {
    window.clearInterval(state.runProgressTimer);
    state.runProgressTimer = null;
  }
  setProgress(finalValue);
}

function setProgress(value) {
  const progress = document.getElementById("run-progress");
  if (progress) {
    progress.style.width = `${value}%`;
  }
}

function renderRunSummary() {
  const container = document.getElementById("run-summary");
  if (!container) {
    return;
  }

  const run = state.runs.find((item) => item.id === state.selectedRunId) || state.runs[0];
  if (!run) {
    container.className = "empty-state";
    container.textContent = "还没有 run 结果。先选择一个 ProbabilityFunction 并启动分析。";
    return;
  }

  const cards = run.summary_json?.cards || [];
  container.className = "metric-grid four";
  container.innerHTML = cards
    .map(
      (card) => `
        <article class="metric-card">
          <small>${card.label}</small>
          <strong>${formatMetricValue(card.value, card.unit)}</strong>
          <span>${card.unit || ""}</span>
        </article>
      `
    )
    .join("");
}

function renderRunRegistry() {
  const container = document.getElementById("run-list");
  if (!container) {
    return;
  }

  if (!state.runs.length) {
    container.className = "empty-state";
    container.textContent = "暂无 run。创建第一个模拟结果后，这里会出现 run 列表。";
    return;
  }

  container.className = "list-table";
  container.innerHTML = state.runs
    .map(
      (run) => `
        <li>
          <strong>${shortId(run.id)} · ${run.status}</strong>
          <span class="list-meta">${run.analysis_type} · ${run.sampling_method || "random"}</span>
          <span class="list-meta">${run.summary_json?.sample_size || 0} samples</span>
        </li>
      `
    )
    .join("");
}

async function renderArtifactPreview() {
  const container = document.getElementById("run-artifact-preview");
  if (!container) {
    return;
  }
  const run = state.runs.find((item) => item.id === state.selectedRunId) || state.runs[0];
  if (!run) {
    container.className = "empty-state";
    container.textContent = "运行完成后，这里会预览 probability-trace、cohort-trace 和 run-config artifacts。";
    return;
  }

  const artifacts = state.live ? await request(`/runs/${run.id}/artifacts`).catch(() => []) : run._artifacts || [];
  if (!artifacts.length) {
    container.className = "empty-state";
    container.textContent = "该 run 暂无 artifacts。";
    return;
  }

  container.className = "artifact-list";
  container.innerHTML = artifacts
    .map(
      (artifact) => `
        <li>
          <strong>${artifact.artifact_type}</strong>
          <span class="list-meta">${artifact.storage_uri}</span>
          <span class="list-meta">${artifact.checksum || "no checksum"}</span>
        </li>
      `
    )
    .join("");
}

function initReviewPage() {
  document.getElementById("load-review")?.addEventListener("click", async () => {
    state.selectedRunId = document.getElementById("review-run-select")?.value || null;
    state.scatterX = document.getElementById("review-metric-x")?.value || "total_cost";
    state.scatterY = document.getElementById("review-metric-y")?.value || "total_qalys";
    state.patientIndex = Number(document.getElementById("review-patient-index")?.value || 0);
    await loadReviewBundle();
    renderReviewSurface();
  });

  document.getElementById("review-cycle-slider")?.addEventListener("input", () => {
    state.cycleFocusIndex = Number(document.getElementById("review-cycle-slider")?.value || 0);
    renderReviewSurface();
  });

  renderReviewShell();
}

function renderReviewShell() {
  populateSelect(
    document.getElementById("review-run-select"),
    state.runs.map((run) => ({
      value: run.id,
      label: `${shortId(run.id)} · ${run.status}`,
    })),
    state.selectedRunId
  );

  populateSelect(
    document.getElementById("review-metric-x"),
    DEFAULT_METRIC_OPTIONS.map((metric) => ({ value: metric.key, label: metric.label })),
    state.scatterX
  );
  populateSelect(
    document.getElementById("review-metric-y"),
    DEFAULT_METRIC_OPTIONS.map((metric) => ({ value: metric.key, label: metric.label })),
    state.scatterY
  );

  if (state.runs.length && !state.currentReview) {
    loadReviewBundle().then(() => renderReviewSurface());
  } else {
    renderReviewSurface();
  }
}

async function loadReviewBundle() {
  const runId = state.selectedRunId || state.runs[0]?.id;
  if (!runId) {
    state.currentReview = null;
    return;
  }

  state.selectedRunId = runId;
  const run = state.runs.find((item) => item.id === runId);
  if (!run) {
    state.currentReview = null;
    return;
  }

  if (state.live) {
    const [artifacts, metricCatalog, scatter, cohort, trace] = await Promise.all([
      request(`/runs/${runId}/artifacts`).catch(() => []),
      request(`/runs/${runId}/metrics`).catch(() => []),
      request(`/runs/${runId}/scatterplot?x_metric=${state.scatterX}&y_metric=${state.scatterY}`).catch(() => ({
        points: [],
      })),
      request(`/runs/${runId}/cohort-dashboard`).catch(() => ({ points: [] })),
      request(`/runs/${runId}/patients/${state.patientIndex}/trace`).catch(() => ({ events: [] })),
    ]);
    state.currentReview = { run, artifacts, metricCatalog, scatter, cohort, trace };
  } else {
    const bundle = buildOfflineReviewBundle(runId, state.scatterX, state.scatterY, state.patientIndex);
    state.currentReview = bundle;
  }

  const uniqueBuckets = getUniqueBucketTimes(state.currentReview?.cohort?.points || []);
  const slider = document.getElementById("review-cycle-slider");
  if (slider) {
    slider.max = String(Math.max(uniqueBuckets.length - 1, 0));
    state.cycleFocusIndex = Math.min(state.cycleFocusIndex, uniqueBuckets.length - 1);
    slider.value = String(Math.max(state.cycleFocusIndex, 0));
  }
}

function renderReviewSurface() {
  const summary = document.getElementById("review-summary");
  const scatter = document.getElementById("review-scatter");
  const cohort = document.getElementById("review-cohort");
  const trace = document.getElementById("review-patient-trace");
  const artifacts = document.getElementById("review-artifacts");
  const cycleLabel = document.getElementById("review-cycle-label");
  if (!summary || !scatter || !cohort || !trace || !artifacts || !cycleLabel) {
    return;
  }

  if (!state.currentReview) {
    summary.className = "empty-state";
    summary.textContent = "还没有加载 run。先从上方选择一个 run。";
    scatter.innerHTML = makeEmptyChartSvg("No scatterplot yet");
    cohort.innerHTML = makeEmptyChartSvg("No cohort data yet");
    trace.className = "empty-state";
    trace.textContent = "选择 run 后，这里会显示 patient event trace。";
    artifacts.className = "empty-state";
    artifacts.textContent = "选择 run 后，这里会显示 artifacts 和 metadata。";
    cycleLabel.textContent = "Cycle focus pending";
    return;
  }

  const cards = state.currentReview.run.summary_json?.cards || [];
  summary.className = "metric-grid four";
  summary.innerHTML = cards
    .map(
      (card) => `
        <article class="metric-card">
          <small>${card.label}</small>
          <strong>${formatMetricValue(card.value, card.unit)}</strong>
          <span>${card.unit || ""}</span>
        </article>
      `
    )
    .join("");

  scatter.innerHTML = makeScatterSvg(
    state.currentReview.scatter?.points || [],
    state.scatterX,
    state.scatterY
  );
  cohort.innerHTML = makeCohortSvg(state.currentReview.cohort?.points || [], state.cycleFocusIndex);
  trace.className = "trace-list";
  trace.innerHTML = (state.currentReview.trace?.events || [])
    .map(
      (event) => `
        <li>
          <strong>${event.event_type} · cycle ${event.cycle_index ?? "-"}</strong>
          <span class="trace-meta">${event.from_state_code || "start"} -> ${event.to_state_code || "-"}</span>
          <span class="trace-meta">time ${event.event_time}</span>
        </li>
      `
    )
    .join("") || "<div class='empty-state'>该 patient index 没有事件。</div>";

  artifacts.className = "artifact-list";
  artifacts.innerHTML = (state.currentReview.artifacts || [])
    .map(
      (artifact) => `
        <li>
          <strong>${artifact.artifact_type}</strong>
          <span class="list-meta">${artifact.storage_uri}</span>
          <span class="list-meta">${artifact.checksum || "no checksum"}</span>
        </li>
      `
    )
    .join("") || "<div class='empty-state'>该 run 暂无 artifacts。</div>";

  const buckets = getUniqueBucketTimes(state.currentReview.cohort?.points || []);
  const focus = buckets[state.cycleFocusIndex] ?? buckets[0] ?? 0;
  cycleLabel.textContent = `Cycle focus · ${focus}`;
}

async function createSeriesLive(payload) {
  return request(`/projects/${state.context.project_id}/clinical-series`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function createSeriesOffline(payload) {
  const series = {
    ...payload,
    id: makeId("series"),
    project_id: state.context.project_id,
    created_at: new Date().toISOString(),
  };
  const seriesStore = [series, ...readStore(STORAGE_KEYS.series, [])];
  writeStore(STORAGE_KEYS.series, seriesStore);
  return series;
}

async function createFunctionLive(payload) {
  return request(`/model-versions/${state.context.model_version_id}/probability-functions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function createFunctionOffline(payload) {
  const series = state.series.find((item) => item.id === payload.source_ref_id);
  if (!series) {
    throw new Error("ClinicalSeries not found.");
  }
  const compiledSource = compileSeries(series);
  const probabilityFunction = {
    ...payload,
    id: makeId("function"),
    model_version_id: state.context.model_version_id,
    created_at: new Date().toISOString(),
    options_json: {
      ...payload.options_json,
      compiled_source: compiledSource,
    },
  };
  const functionStore = [probabilityFunction, ...readStore(STORAGE_KEYS.functions, [])];
  writeStore(STORAGE_KEYS.functions, functionStore);
  return probabilityFunction;
}

async function createRunLive(payload) {
  return request(`/model-versions/${state.context.model_version_id}/runs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function createRunOffline(payload) {
  const probabilityFunction = state.functions.find(
    (item) => item.id === payload.config_json.probability_function_id
  );
  if (!probabilityFunction) {
    throw new Error("ProbabilityFunction not found.");
  }

  const simulation = simulateOfflineRun(probabilityFunction, payload);
  const run = {
    ...simulation.run,
    _artifacts: simulation.artifacts,
    _metricCatalog: simulation.metricCatalog,
    _scatterMap: simulation.scatterMap,
    _cohort: simulation.cohort,
    _patientTraces: simulation.patientTraces,
  };
  const runStore = [run, ...readStore(STORAGE_KEYS.runs, [])];
  writeStore(STORAGE_KEYS.runs, runStore);
  return run;
}

function debugFunctionOffline(functionId, t0, t1) {
  const fn = state.functions.find((item) => item.id === functionId);
  if (!fn) {
    throw new Error("ProbabilityFunction not found.");
  }
  return evaluateFunction(fn, t0, t1);
}

function buildOfflineReviewBundle(runId, xMetric, yMetric, patientIndex) {
  const run = state.runs.find((item) => item.id === runId);
  const points = (run?._scatterMap || []).map((sample) => ({
    sample_index: sample.sample_index,
    x: sample[xMetric] ?? 0,
    y: sample[yMetric] ?? 0,
  }));
  return {
    run,
    artifacts: run?._artifacts || [],
    metricCatalog: run?._metricCatalog || DEFAULT_METRIC_OPTIONS,
    scatter: { run_id: runId, x_metric: xMetric, y_metric: yMetric, points },
    cohort: { run_id: runId, points: run?._cohort || [] },
    trace: { run_id: runId, events: run?._patientTraces?.[patientIndex] || [] },
  };
}

function simulateOfflineRun(probabilityFunction, payload) {
  const config = {
    cycles: Number(payload.config_json.cycles || 12),
    sample_size: Number(payload.config_json.sample_size || 16),
    initial_population: Number(payload.config_json.initial_population || 1000),
    pf_state_cost: 4800,
    pd_state_cost: 9100,
    transition_cost: 1800,
    pf_state_utility: 0.82,
    pd_state_utility: 0.53,
    pf_death_probability: 0.01,
    pd_death_probability: 0.08,
    cycle_length: 1,
    time_unit: probabilityFunction.time_unit,
  };

  const sampleParams = buildOfflineSamples(config.sample_size, payload.sampling_method || "lhs");
  const base = runOfflineSample(probabilityFunction, config, sampleParams[0], 0);
  const samples = [base];
  for (let index = 1; index < sampleParams.length; index += 1) {
    samples.push(runOfflineSample(probabilityFunction, config, sampleParams[index], index));
  }

  const cards = [
    { label: "Base Cost", value: base.metrics.total_cost, unit: "USD per patient" },
    { label: "Base QALYs", value: base.metrics.total_qalys, unit: "QALYs" },
    { label: "Base Life Years", value: base.metrics.life_years, unit: "LYs" },
    {
      label: "Mean Event Probability",
      value: base.metrics.mean_transition_probability,
      unit: "probability",
    },
  ];

  const runId = makeId("run");
  const run = {
    id: runId,
    project_id: state.context.project_id,
    model_version_id: state.context.model_version_id,
    analysis_type: "cohort_markov",
    template_id: null,
    random_seed: 20260325,
    sampling_method: payload.sampling_method || "lhs",
    input_snapshot_json: {
      probability_function_id: probabilityFunction.id,
    },
    config_json: payload.config_json,
    summary_json: {
      run_id: runId,
      sample_size: samples.length,
      sampling_method: payload.sampling_method || "lhs",
      probability_function_id: probabilityFunction.id,
      cards,
      base_metrics: base.metrics,
      mean_metrics: {
        total_cost: round(sum(samples.map((sample) => sample.metrics.total_cost)) / samples.length, 4),
        total_qalys: round(sum(samples.map((sample) => sample.metrics.total_qalys)) / samples.length, 4),
        life_years: round(sum(samples.map((sample) => sample.metrics.life_years)) / samples.length, 4),
      },
      config: payload.config_json,
    },
    status: "completed",
    engine_version: "offline-demo-0.1.0",
    error_log: null,
    submitted_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  };

  return {
    run,
    artifacts: [
      {
        artifact_type: "probability-trace",
        storage_uri: "inline://probability-trace",
        checksum: "offline-probability-trace",
      },
      {
        artifact_type: "cohort-trace",
        storage_uri: "inline://cohort-trace",
        checksum: "offline-cohort-trace",
      },
      {
        artifact_type: "run-config",
        storage_uri: "inline://run-config",
        checksum: "offline-run-config",
      },
    ],
    metricCatalog: DEFAULT_METRIC_OPTIONS,
    scatterMap: samples.map((sample) => ({
      sample_index: sample.sample_index,
      total_cost: sample.metrics.total_cost,
      total_qalys: sample.metrics.total_qalys,
      life_years: sample.metrics.life_years,
      deaths: sample.metrics.deaths,
      mean_transition_probability: sample.metrics.mean_transition_probability,
    })),
    cohort: base.cohort,
    patientTraces: buildOfflinePatientTraces(base.intervalProbabilities),
  };
}

function runOfflineSample(probabilityFunction, config, sample, sampleIndex) {
  let progressionFree = config.initial_population;
  let progressedDisease = 0;
  let dead = 0;
  let totalCost = 0;
  let totalQalys = 0;
  let totalLifeYears = 0;
  const cohort = [];
  const intervalProbabilities = [];

  addCohortPoint(cohort, 0, "progression_free", progressionFree, 0, 0);
  addCohortPoint(cohort, 0, "progressed_disease", progressedDisease, 0, 0);
  addCohortPoint(cohort, 0, "dead", dead, 0, 0);

  for (let cycleIndex = 0; cycleIndex < config.cycles; cycleIndex += 1) {
    const t0 = cycleIndex * config.cycle_length;
    const t1 = (cycleIndex + 1) * config.cycle_length;
    const debug = evaluateFunction(probabilityFunction, t0, t1);
    const eventProbability = clamp(debug.probability * sample.event_scale, 0, 0.95);
    intervalProbabilities.push({ cycle_index: cycleIndex, t0, t1, probability: eventProbability });

    const cycleYears = config.time_unit.startsWith("month") ? config.cycle_length / 12 : config.cycle_length;
    totalQalys +=
      (((progressionFree / config.initial_population) * (config.pf_state_utility + sample.utility_shift)) +
        ((progressedDisease / config.initial_population) * (config.pd_state_utility + sample.utility_shift * 0.7))) *
      cycleYears;
    totalLifeYears += ((progressionFree + progressedDisease) / config.initial_population) * cycleYears;
    totalCost +=
      ((progressionFree / config.initial_population) * config.pf_state_cost * sample.cost_multiplier +
        (progressedDisease / config.initial_population) * config.pd_state_cost * sample.cost_multiplier +
        ((progressionFree * eventProbability) / config.initial_population) * config.transition_cost);

    const pfToPd = progressionFree * eventProbability;
    const remainingPf = Math.max(progressionFree - pfToPd, 0);
    const pfToDead = remainingPf * config.pf_death_probability;
    const pdToDead = progressedDisease * config.pd_death_probability;

    progressionFree = Math.max(progressionFree - pfToPd - pfToDead, 0);
    progressedDisease = Math.max(progressedDisease + pfToPd - pdToDead, 0);
    dead += pfToDead + pdToDead;

    addCohortPoint(cohort, t1, "progression_free", progressionFree, 0, pfToPd + pfToDead);
    addCohortPoint(cohort, t1, "progressed_disease", progressedDisease, pfToPd, pdToDead);
    addCohortPoint(cohort, t1, "dead", dead, pfToDead + pdToDead, 0);
  }

  return {
    sample_index: sampleIndex,
    metrics: {
      total_cost: round(totalCost, 4),
      total_qalys: round(totalQalys, 4),
      life_years: round(totalLifeYears, 4),
      deaths: round(dead, 2),
      mean_transition_probability: round(
        sum(intervalProbabilities.map((item) => item.probability)) / Math.max(intervalProbabilities.length, 1),
        6
      ),
    },
    intervalProbabilities,
    cohort,
  };
}

function buildOfflinePatientTraces(intervalProbabilities) {
  const traces = {};
  for (let patientIndex = 0; patientIndex < 8; patientIndex += 1) {
    const events = [
      {
        patient_index: patientIndex,
        event_seq: 0,
        cycle_index: 0,
        event_time: 0,
        from_state_code: null,
        to_state_code: "progression_free",
        event_type: "baseline",
      },
    ];
    let currentState = "progression_free";
    let eventSeq = 1;
    intervalProbabilities.forEach((interval) => {
      if (currentState === "dead") {
        return;
      }
      if (currentState === "progression_free" && patientIndex % 3 === interval.cycle_index % 4) {
        events.push({
          patient_index: patientIndex,
          event_seq: eventSeq,
          cycle_index: interval.cycle_index + 1,
          event_time: interval.t1,
          from_state_code: "progression_free",
          to_state_code: "progressed_disease",
          event_type: "transition",
        });
        currentState = "progressed_disease";
        eventSeq += 1;
      } else if (
        currentState === "progressed_disease" &&
        patientIndex % 2 === interval.cycle_index % 3
      ) {
        events.push({
          patient_index: patientIndex,
          event_seq: eventSeq,
          cycle_index: interval.cycle_index + 1,
          event_time: interval.t1,
          from_state_code: "progressed_disease",
          to_state_code: "dead",
          event_type: "death",
        });
        currentState = "dead";
        eventSeq += 1;
      }
    });
    if (currentState !== "dead") {
      const last = intervalProbabilities.at(-1);
      events.push({
        patient_index: patientIndex,
        event_seq: eventSeq,
        cycle_index: last?.cycle_index ?? 0,
        event_time: last?.t1 ?? 0,
        from_state_code: currentState,
        to_state_code: currentState,
        event_type: "censored",
      });
    }
    traces[patientIndex] = events;
  }
  return traces;
}

function buildOfflineSamples(sampleSize, method) {
  const samples = [{ event_scale: 1, cost_multiplier: 1, utility_shift: 0 }];
  if (sampleSize <= 1) {
    return samples;
  }
  for (let index = 1; index < sampleSize; index += 1) {
    const ratio = method === "lhs" ? (index + 0.5) / sampleSize : Math.random();
    samples.push({
      event_scale: 0.85 + ratio * 0.3,
      cost_multiplier: 0.92 + ratio * 0.16,
      utility_shift: -0.04 + ratio * 0.08,
    });
  }
  return samples;
}

function compileSeries(series) {
  const points = [...series.points]
    .filter((point) => point.estimate_value !== null && point.estimate_value !== undefined)
    .sort((left, right) => Number(left.time_value) - Number(right.time_value))
    .map((point) => ({
      time: Number(point.time_value),
      value: Number(point.estimate_value),
    }));

  if (points[0] && points[0].time > 0 && inferCompiledKind(series) === "survival") {
    points.unshift({ time: 0, value: 1 });
  }

  return {
    compiled_kind: inferCompiledKind(series),
    series_kind: series.series_kind,
    value_unit: series.value_unit,
    points,
  };
}

function inferCompiledKind(series) {
  const normalized = `${series.series_kind} ${series.value_unit}`.toLowerCase();
  return normalized.includes("hazard") ? "hazard" : "survival";
}

function evaluateFunction(functionRecord, t0, t1) {
  const compiled = functionRecord.options_json?.compiled_source;
  if (!compiled) {
    throw new Error("Compiled source is missing.");
  }

  if (compiled.compiled_kind === "survival") {
    const s0 = interpolate(compiled.points, t0);
    const s1 = interpolate(compiled.points, t1);
    const probability = s0 <= 0 ? 1 : clamp(1 - s1 / s0, 0, 1);
    return {
      function_id: functionRecord.id,
      t0,
      t1,
      probability,
      trace: {
        compiled_kind: "survival",
        survival_t0: round(s0, 6),
        survival_t1: round(s1, 6),
        source_ref_id: functionRecord.source_ref_id,
      },
    };
  }

  const h0 = interpolate(compiled.points, t0);
  const h1 = interpolate(compiled.points, t1);
  const meanHazard = (h0 + h1) / 2;
  const probability = clamp(1 - Math.exp(-(meanHazard * (t1 - t0))), 0, 1);
  return {
    function_id: functionRecord.id,
    t0,
    t1,
    probability,
    trace: {
      compiled_kind: "hazard",
      hazard_t0: round(h0, 6),
      hazard_t1: round(h1, 6),
      source_ref_id: functionRecord.source_ref_id,
    },
  };
}

function parseCsvPoints(csv) {
  const rows = csv
    .trim()
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  if (rows.length <= 1) {
    return [];
  }

  return rows.slice(1).map((row, index) => {
    const [seqNo, timeValue, estimateValue] = row.split(",").map((cell) => cell.trim());
    return {
      seq_no: Number(seqNo || index + 1),
      time_value: Number(timeValue),
      estimate_value: Number(estimateValue),
      lower_ci: null,
      upper_ci: null,
      at_risk: null,
      events: null,
      censored: null,
      metadata_json: {},
    };
  });
}

function populateSelect(element, options, selectedValue) {
  if (!element) {
    return;
  }
  if (!options.length) {
    element.innerHTML = `<option value="">No data</option>`;
    return;
  }
  element.innerHTML = options
    .map(
      (option) => `
        <option value="${option.value}" ${String(option.value) === String(selectedValue) ? "selected" : ""}>
          ${option.label}
        </option>
      `
    )
    .join("");
}

function request(path, options = {}) {
  return fetch(`${state.apiBase}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  }).then(async (response) => {
    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try {
        const payload = await response.json();
        detail = payload.detail || JSON.stringify(payload);
      } catch (error) {
        detail = detail || String(error);
      }
      throw new Error(detail);
    }
    return response.json();
  });
}

function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function extractMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function shortId(value) {
  return value ? `${String(value).slice(0, 8)}...` : "-";
}

function makeId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function addCohortPoint(collection, bucketTime, stateCode, occupancyCount, inflowCount, outflowCount) {
  collection.push({
    bucket_time: round(bucketTime, 4),
    state_code: stateCode,
    occupancy_count: Math.round(occupancyCount),
    inflow_count: Math.round(inflowCount),
    outflow_count: Math.round(outflowCount),
  });
}

function interpolate(points, timeValue) {
  if (!points.length) {
    return 0;
  }
  if (timeValue <= points[0].time) {
    return points[0].value;
  }
  if (timeValue >= points.at(-1).time) {
    return points.at(-1).value;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];
    if (left.time <= timeValue && timeValue <= right.time) {
      if (right.time === left.time) {
        return right.value;
      }
      const ratio = (timeValue - left.time) / (right.time - left.time);
      return left.value + (right.value - left.value) * ratio;
    }
  }
  return points.at(-1).value;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function formatMetricValue(value, unit) {
  if (typeof value !== "number") {
    return String(value);
  }
  if ((unit || "").toLowerCase().includes("usd")) {
    return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  if ((unit || "").toLowerCase().includes("prob")) {
    return `${(value * 100).toFixed(2)}%`;
  }
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function getUniqueBucketTimes(points) {
  return [...new Set(points.map((point) => Number(point.bucket_time)))].sort((left, right) => left - right);
}

function makeEmptyChartSvg(label) {
  return `
    <svg viewBox="0 0 640 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">
      <rect x="0" y="0" width="640" height="320" fill="transparent"></rect>
      <text x="320" y="160" text-anchor="middle" fill="${PALETTE.muted}" font-family="IBM Plex Sans" font-size="16">${label}</text>
    </svg>
  `;
}

function makeProbabilityChartSvg(functionRecord, debug) {
  if (!functionRecord?.options_json?.compiled_source?.points?.length) {
    return makeEmptyChartSvg("No compiled source");
  }
  const points = functionRecord.options_json.compiled_source.points;
  const width = 640;
  const height = 320;
  const padding = 44;
  const minX = 0;
  const maxX = Math.max(...points.map((point) => point.time), debug.t1 + 1);
  const minY = 0;
  const maxY = 1;
  const scaleX = (value) => padding + ((value - minX) / Math.max(maxX - minX, 1)) * (width - padding * 2);
  const scaleY = (value) => height - padding - ((value - minY) / (maxY - minY)) * (height - padding * 2);
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${scaleX(point.time)} ${scaleY(point.value)}`).join(" ");
  return `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Probability debug chart">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="${PALETTE.line}" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="${PALETTE.line}" />
      <path d="${line}" fill="none" stroke="${PALETTE.evidence}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <rect x="${scaleX(debug.t0)}" y="${padding}" width="${Math.max(scaleX(debug.t1) - scaleX(debug.t0), 2)}" height="${height - padding * 2}" fill="rgba(124, 92, 224, 0.12)" />
      ${points
        .map(
          (point) => `
            <circle cx="${scaleX(point.time)}" cy="${scaleY(point.value)}" r="4.5" fill="${PALETTE.evidence}" />
          `
        )
        .join("")}
      <text x="${padding}" y="${padding - 12}" fill="${PALETTE.muted}" font-family="IBM Plex Mono" font-size="12">Compiled source</text>
      <text x="${width - padding}" y="${padding - 12}" fill="${PALETTE.calibration}" text-anchor="end" font-family="IBM Plex Mono" font-size="12">p = ${(debug.probability * 100).toFixed(2)}%</text>
    </svg>
  `;
}

function makeScatterSvg(points, xMetric, yMetric) {
  if (!points.length) {
    return makeEmptyChartSvg("No scatter data");
  }
  const width = 640;
  const height = 320;
  const padding = 48;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scaleX = (value) => padding + ((value - minX) / Math.max(maxX - minX, 1)) * (width - padding * 2);
  const scaleY = (value) => height - padding - ((value - minY) / Math.max(maxY - minY, 1e-6)) * (height - padding * 2);
  return `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Scatterplot">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="${PALETTE.line}" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="${PALETTE.line}" />
      ${points
        .map(
          (point) => `
            <circle cx="${scaleX(point.x)}" cy="${scaleY(point.y)}" r="6" fill="${PALETTE.review}" fill-opacity="0.8" />
          `
        )
        .join("")}
      <text x="${padding}" y="${padding - 12}" fill="${PALETTE.muted}" font-family="IBM Plex Mono" font-size="12">${yMetric}</text>
      <text x="${width - padding}" y="${height - 14}" text-anchor="end" fill="${PALETTE.muted}" font-family="IBM Plex Mono" font-size="12">${xMetric}</text>
    </svg>
  `;
}

function makeCohortSvg(points, focusIndex) {
  if (!points.length) {
    return makeEmptyChartSvg("No cohort data");
  }

  const width = 640;
  const height = 320;
  const padding = 44;
  const buckets = getUniqueBucketTimes(points);
  const stateCodes = ["progression_free", "progressed_disease", "dead"];
  const colors = {
    progression_free: PALETTE.evidence,
    progressed_disease: PALETTE.simulation,
    dead: PALETTE.review,
  };
  const grouped = stateCodes.map((stateCode) => ({
    stateCode,
    series: buckets.map((bucket) => {
      const row = points.find(
        (point) => Number(point.bucket_time) === bucket && point.state_code === stateCode
      );
      return row ? Number(row.occupancy_count) : 0;
    }),
  }));
  const maxY = Math.max(
    ...grouped.flatMap((entry) => entry.series),
    1
  );
  const scaleX = (value) => padding + ((value - buckets[0]) / Math.max(buckets.at(-1) - buckets[0], 1)) * (width - padding * 2);
  const scaleY = (value) => height - padding - (value / maxY) * (height - padding * 2);
  const focusBucket = buckets[focusIndex] ?? buckets[0];
  return `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cohort dashboard">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="${PALETTE.line}" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="${PALETTE.line}" />
      <line x1="${scaleX(focusBucket)}" y1="${padding}" x2="${scaleX(focusBucket)}" y2="${height - padding}" stroke="${PALETTE.warning}" stroke-dasharray="6 8" />
      ${grouped
        .map((entry) => {
          const path = entry.series
            .map((value, index) => `${index === 0 ? "M" : "L"} ${scaleX(buckets[index])} ${scaleY(value)}`)
            .join(" ");
          return `<path d="${path}" fill="none" stroke="${colors[entry.stateCode]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;
        })
        .join("")}
      ${grouped
        .map(
          (entry, index) => `
            <text x="${padding}" y="${padding - 14 + index * 16}" fill="${colors[entry.stateCode]}" font-family="IBM Plex Mono" font-size="12">${entry.stateCode}</text>
          `
        )
        .join("")}
    </svg>
  `;
}

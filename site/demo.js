const STORAGE_KEYS = {
  apiBase: "heor-demo.api-base",
  series: "heor-demo.offline.series",
  functions: "heor-demo.offline.functions",
  runs: "heor-demo.offline.runs",
  calibrationConfigs: "heor-demo.offline.calibration-configs",
  transition: "heor-demo.page-transition",
};

const DEFAULT_API_BASE = "http://127.0.0.1:8000/api/v1";
const OFFLINE_CONTEXT = {
  organization_id: "offline-org",
  organization_slug: "offline-org",
  project_id: "offline-project",
  project_slug: "offline-heor",
  model_id: "offline-model",
  model_version_id: "offline-model-version",
  model_name: "晚期 NSCLC 靶向治疗成本效果模型",
  demo_case_name: "模拟晚期 NSCLC 靶向治疗经济学演示",
  population_label: "EGFR+ 晚期非小细胞肺癌一线治疗人群",
  intervention_label: "靶向治疗方案",
  comparator_label: "标准化疗",
};

const SAMPLE_POINTS = [
  { seq_no: 1, time_value: 0, estimate_value: 1.0 },
  { seq_no: 2, time_value: 1, estimate_value: 0.968 },
  { seq_no: 3, time_value: 2, estimate_value: 0.936 },
  { seq_no: 4, time_value: 3, estimate_value: 0.902 },
  { seq_no: 5, time_value: 4, estimate_value: 0.868 },
  { seq_no: 6, time_value: 5, estimate_value: 0.835 },
  { seq_no: 7, time_value: 6, estimate_value: 0.802 },
  { seq_no: 8, time_value: 8, estimate_value: 0.732 },
  { seq_no: 9, time_value: 10, estimate_value: 0.664 },
  { seq_no: 10, time_value: 12, estimate_value: 0.598 },
  { seq_no: 11, time_value: 15, estimate_value: 0.512 },
  { seq_no: 12, time_value: 18, estimate_value: 0.438 },
  { seq_no: 13, time_value: 21, estimate_value: 0.368 },
  { seq_no: 14, time_value: 24, estimate_value: 0.304 },
];

const OBSERVED_SAMPLE_POINTS = [
  { seq_no: 1, time_value: 0, estimate_value: 1.0 },
  { seq_no: 2, time_value: 1, estimate_value: 0.955 },
  { seq_no: 3, time_value: 2, estimate_value: 0.912 },
  { seq_no: 4, time_value: 3, estimate_value: 0.87 },
  { seq_no: 5, time_value: 4, estimate_value: 0.826 },
  { seq_no: 6, time_value: 5, estimate_value: 0.785 },
  { seq_no: 7, time_value: 6, estimate_value: 0.742 },
  { seq_no: 8, time_value: 8, estimate_value: 0.658 },
  { seq_no: 9, time_value: 10, estimate_value: 0.578 },
  { seq_no: 10, time_value: 12, estimate_value: 0.502 },
  { seq_no: 11, time_value: 15, estimate_value: 0.402 },
  { seq_no: 12, time_value: 18, estimate_value: 0.316 },
  { seq_no: 13, time_value: 21, estimate_value: 0.246 },
  { seq_no: 14, time_value: 24, estimate_value: 0.188 },
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
  evidenceSoft: "rgba(47, 111, 237, 0.12)",
  calibration: "#7c5ce0",
  calibrationSoft: "rgba(124, 92, 224, 0.12)",
  simulation: "#18a6a0",
  simulationSoft: "rgba(24, 166, 160, 0.14)",
  review: "#d9852c",
  reviewSoft: "rgba(217, 133, 44, 0.14)",
  success: "#2e9d6b",
  successSoft: "rgba(46, 157, 107, 0.14)",
  warning: "#c58b28",
  warningSoft: "rgba(197, 139, 40, 0.14)",
};

const DEFAULT_METRIC_OPTIONS = [
  { key: "total_cost", label: "总成本" },
  { key: "total_qalys", label: "总 QALY" },
  { key: "life_years", label: "总生存年" },
  { key: "deaths", label: "死亡人数" },
  { key: "mean_transition_probability", label: "平均事件概率" },
];

const DEFAULT_CALIBRATION_TEMPLATE = {
  event_scale: { lower: 0.7, upper: 1.3, initial: 1.0 },
  pf_death_probability: { lower: 0.004, upper: 0.03, initial: 0.01 },
  pd_death_probability: { lower: 0.04, upper: 0.14, initial: 0.08 },
};

const state = {
  page: document.body.dataset.page,
  apiBase: localStorage.getItem(STORAGE_KEYS.apiBase) || DEFAULT_API_BASE,
  live: false,
  context: { ...OFFLINE_CONTEXT },
  series: [],
  functions: [],
  runs: [],
  calibrationConfigs: [],
  selectedSeriesId: null,
  selectedFunctionId: null,
  selectedRunId: null,
  selectedCalibrationId: null,
  scatterX: "total_cost",
  scatterY: "total_qalys",
  patientIndex: 0,
  cycleFocusIndex: 0,
  currentReview: null,
  currentCalibration: null,
  currentSimulation: null,
  simulationCycleIndex: 0,
  runProgressTimer: null,
  calibrationProgressTimer: null,
  simulationMotionTimer: null,
  reviewAutoplayTimer: null,
  reviewAutoplay: false,
  reviewCompareMode: "single",
  currentReviewComparison: null,
  brushWindows: {},
  arrivalTransition: null,
};

const WORKFLOW_STAGE_MAP = [
  { key: "evidence", label: "上传证据", href: "./evidence.html", cue: "字段校验与对象标准化" },
  { key: "runtime", label: "概率函数", href: "./runtime.html", cue: "编译为可调用函数层" },
  { key: "calibration", label: "临床校准", href: "./calibration.html", cue: "观察值对预测值拟合" },
  { key: "simulation", label: "运行模拟", href: "./simulation.html", cue: "Markov 与 PSA 真正执行" },
  { key: "review", label: "结果审阅", href: "./review.html", cue: "动态轨迹与产物交付" },
];

const PAGE_STORY_MAP = {
  evidence: {
    title: "上传证据",
    arrival: "客户先看到原始临床输入如何被平台整理成可信证据对象。",
    next: "下一步会把这份证据编译成模型可直接调用的概率函数。",
  },
  runtime: {
    title: "概率函数",
    arrival: "客户现在能看到一份生存证据是如何变成可运行的事件概率层。",
    next: "下一步会拿这层函数去做临床校准。",
  },
  calibration: {
    title: "临床校准",
    arrival: "客户现在能一眼看出模型输出和真实观察数据之间的差距。",
    next: "下一步会沿用 best-fit 参数去跑模拟。",
  },
  simulation: {
    title: "运行模拟",
    arrival: "客户现在能看到平台正在真实运行模型，而不是只展示静态图。",
    next: "下一步会把结果、状态流和产物合成一张审阅页。",
  },
  review: {
    title: "结果审阅",
    arrival: "客户现在看到的是一条分析结果如何被解释、复核并交付。",
    next: "如果要回溯原因，可以沿着上一页继续往回看。",
  },
};

document.addEventListener("DOMContentLoaded", () => {
  initWorkspaceEffects();
  bootstrap().catch((error) => {
    console.error(error);
    setConnectionStatus("offline", "页面加载失败，已自动切换到离线样本模式。");
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
  if (state.page === "calibration") {
    initCalibrationPage();
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
  setConnectionStatus("warning", "平台正在尝试连接你的本地 FastAPI；如果今天只是演示，也会自动回退到离线样本模式。");

  try {
    const context = await request("/demo/context");
    state.live = true;
    state.context = context;
    setConnectionStatus("live", "已连接到真实 API。你刚才的上传、编译、校准和运行都会真实写入后端。");
  } catch (error) {
    console.warn("Falling back to offline mode", error);
    state.live = false;
    state.context = { ...OFFLINE_CONTEXT };
    setConnectionStatus("offline", "当前未连接到后端，平台已切换到离线样本模式。你仍然可以把整条任务流先走通。");
  }

  await refreshCollections();
}

async function refreshCollections() {
  if (state.live) {
    const [series, functions, runs, calibrationConfigs] = await Promise.all([
      request(`/projects/${state.context.project_id}/clinical-series`).catch(() => []),
      request(`/model-versions/${state.context.model_version_id}/probability-functions`).catch(() => []),
      request(`/model-versions/${state.context.model_version_id}/runs`).catch(() => []),
      request(`/model-versions/${state.context.model_version_id}/calibration-configs`).catch(() => []),
    ]);
    state.series = series;
    state.functions = functions;
    state.runs = runs;
    state.calibrationConfigs = calibrationConfigs;
  } else {
    state.series = readStore(STORAGE_KEYS.series, []);
    state.functions = readStore(STORAGE_KEYS.functions, []);
    state.runs = readStore(STORAGE_KEYS.runs, []);
    state.calibrationConfigs = readStore(STORAGE_KEYS.calibrationConfigs, []);
  }

  state.selectedSeriesId = pickLatestId(state.series, state.selectedSeriesId);
  state.selectedFunctionId = pickLatestId(state.functions, state.selectedFunctionId);
  state.selectedCalibrationId = pickLatestId(state.calibrationConfigs, state.selectedCalibrationId);
  state.selectedRunId =
    pickLatestId(
      state.runs.filter((run) => run.analysis_type === "cohort_markov" && run.status === "completed"),
      state.selectedRunId
    ) || pickLatestId(state.runs, state.selectedRunId);
}

function pickLatestId(items, currentId) {
  if (currentId && items.some((item) => String(item.id) === String(currentId))) {
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
  if (state.page === "calibration") {
    renderCalibrationPage();
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
  setText("context-mode", state.live ? "已连接真实 API" : "离线样本模式");
  setText("sidebar-series-count", String(state.series.length));
  setText("sidebar-function-count", String(state.functions.length));
  setText("sidebar-run-count", String(state.runs.length));
  hydrateApiBaseInput();
  updateMissionRail();
  refreshMotionTargets();
}

function initWorkspaceEffects() {
  bindPointerAura();
  mountMissionRail();
  mountTransitionLayer();
  bindNarrativeLinks();
  hydrateArrivalNarrative();
  refreshMotionTargets();
}

function bindPointerAura() {
  const root = document.documentElement;
  const setPointer = (x, y) => {
    root.style.setProperty("--pointer-x", `${x}%`);
    root.style.setProperty("--pointer-y", `${y}%`);
  };

  setPointer(72, 18);
  window.addEventListener(
    "pointermove",
    (event) => {
      setPointer((event.clientX / window.innerWidth) * 100, (event.clientY / window.innerHeight) * 100);
    },
    { passive: true }
  );
}

function mountMissionRail() {
  const workspaceMain = document.querySelector(".workspace-main");
  const heroPanel = document.querySelector(".hero-panel");
  if (!workspaceMain || !heroPanel || document.querySelector(".mission-rail")) {
    return;
  }

  const currentIndex = Math.max(
    WORKFLOW_STAGE_MAP.findIndex((stage) => stage.key === state.page),
    0
  );

  const rail = document.createElement("section");
  rail.className = "mission-rail";
  rail.innerHTML = `
    <div class="mission-head">
      <div class="mission-copy">
        <span>任务流</span>
        <strong>从证据到结果的一条连续工作流</strong>
        <small id="mission-status-copy">正在整理当前页面状态。</small>
      </div>
      <div class="mission-metrics">
        <span class="mission-stat" id="mission-project-stat">项目 · -</span>
        <span class="mission-stat" id="mission-mode-stat">模式 · -</span>
        <span class="mission-stat" id="mission-object-stat">对象 · 0 / 0 / 0</span>
      </div>
    </div>
    <div class="mission-track">
      ${WORKFLOW_STAGE_MAP.map((stage, index) => {
        const cls = index < currentIndex ? "complete" : index === currentIndex ? "active" : "pending";
        return `
          <a class="mission-node ${cls}" href="${stage.href}" data-step="${String(index + 1).padStart(2, "0")}">
            <strong>${stage.label}</strong>
            <span>${stage.cue}</span>
          </a>
        `;
      }).join("")}
    </div>
  `;

  workspaceMain.insertBefore(rail, heroPanel.nextElementSibling);
}

function updateMissionRail() {
  const arrivalCopy =
    state.arrivalTransition && state.arrivalTransition.to === state.page
      ? `你刚刚从 ${PAGE_STORY_MAP[state.arrivalTransition.from]?.title || "上一页"} 进入当前页面。${PAGE_STORY_MAP[state.page]?.arrival || ""}`
      : null;
  setText(
    "mission-status-copy",
    arrivalCopy ||
      (state.live
        ? "真实 API 已连接，当前页面的上传、校准、运行和结果操作都会真实写入后端。"
        : "当前处于离线样本模式，但整条工作流仍然可完整体验。")
  );
  setText("mission-project-stat", `项目 · ${state.context.project_slug || state.context.project_id}`);
  setText("mission-mode-stat", `模式 · ${state.live ? "真实 API" : "离线演示"}`);
  setText("mission-object-stat", `对象 · ${state.series.length} / ${state.functions.length} / ${state.runs.length}`);
}

function mountTransitionLayer() {
  if (document.querySelector(".page-transition-layer")) {
    return;
  }

  const layer = document.createElement("div");
  layer.className = "page-transition-layer";
  layer.innerHTML = `
    <div class="page-transition-panel">
      <span id="page-transition-eyebrow">正在切换任务阶段</span>
      <strong id="page-transition-title">准备进入下一步</strong>
      <p id="page-transition-copy">平台会把上一页得到的对象、函数或运行结果带入下一页。</p>
      <div class="page-transition-track">
        ${WORKFLOW_STAGE_MAP.map(
          (stage, index) => `
            <span class="page-transition-node" data-step="${stage.key}">
              <i>${String(index + 1).padStart(2, "0")}</i>
              <b>${stage.label}</b>
            </span>
          `
        ).join("")}
      </div>
    </div>
  `;
  document.body.appendChild(layer);
}

function bindNarrativeLinks() {
  document.querySelectorAll("a[href]").forEach((link) => {
    if (link.dataset.storyBound === "1") {
      return;
    }
    link.dataset.storyBound = "1";
    link.addEventListener("click", (event) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === "_blank"
      ) {
        return;
      }

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) {
        return;
      }

      const to = extractPageKey(href);
      if (!to || to === state.page) {
        return;
      }

      event.preventDefault();
      playPageTransition(to, href);
    });
  });
}

function extractPageKey(href) {
  const clean = href.split("?")[0].split("#")[0];
  if (!clean.endsWith(".html")) {
    return null;
  }
  return clean.split("/").pop().replace(".html", "");
}

function playPageTransition(to, href) {
  const payload = { from: state.page, to, at: Date.now() };
  state.arrivalTransition = payload;
  sessionStorage.setItem(STORAGE_KEYS.transition, JSON.stringify(payload));

  setText(
    "page-transition-eyebrow",
    `第 ${Math.max(WORKFLOW_STAGE_MAP.findIndex((item) => item.key === to) + 1, 1)} 步 · ${PAGE_STORY_MAP[to]?.title || "进入下一页"}`
  );
  setText(
    "page-transition-title",
    `把 ${PAGE_STORY_MAP[state.page]?.title || "当前结果"} 带入 ${PAGE_STORY_MAP[to]?.title || "下一步"}`
  );
  setText("page-transition-copy", PAGE_STORY_MAP[to]?.arrival || "平台会带着上下文继续进入下一步。");

  document.querySelectorAll(".page-transition-node").forEach((node) => {
    const nodeKey = node.getAttribute("data-step");
    const nodeIndex = WORKFLOW_STAGE_MAP.findIndex((item) => item.key === nodeKey);
    const targetIndex = WORKFLOW_STAGE_MAP.findIndex((item) => item.key === to);
    node.classList.toggle("is-active", nodeKey === to);
    node.classList.toggle("is-complete", nodeIndex < targetIndex);
  });

  document.body.classList.add("is-page-transitioning");
  document.querySelector(".page-transition-layer")?.classList.add("is-active");
  window.setTimeout(() => {
    window.location.href = href;
  }, 460);
}

function hydrateArrivalNarrative() {
  const raw = sessionStorage.getItem(STORAGE_KEYS.transition);
  if (!raw) {
    return;
  }

  try {
    const payload = JSON.parse(raw);
    if (!payload || payload.to !== state.page || Date.now() - payload.at > 15000) {
      return;
    }
    state.arrivalTransition = payload;
    document.body.classList.add("is-page-arriving");
    mountArrivalBanner(payload);
    window.setTimeout(() => {
      document.body.classList.remove("is-page-arriving");
    }, 1400);
  } catch (error) {
    console.warn("Invalid transition payload", error);
  } finally {
    sessionStorage.removeItem(STORAGE_KEYS.transition);
  }
}

function mountArrivalBanner(payload) {
  const workspaceMain = document.querySelector(".workspace-main");
  const heroPanel = document.querySelector(".hero-panel");
  if (!workspaceMain || !heroPanel) {
    return;
  }

  document.querySelector(".arrival-banner")?.remove();
  const banner = document.createElement("section");
  banner.className = "arrival-banner";
  banner.innerHTML = `
    <span>刚完成 ${PAGE_STORY_MAP[payload.from]?.title || "上一页"}</span>
    <strong>${PAGE_STORY_MAP[state.page]?.arrival || "已经进入新的任务阶段。"}</strong>
    <small>${PAGE_STORY_MAP[state.page]?.next || ""}</small>
  `;
  workspaceMain.insertBefore(banner, heroPanel);
}

function refreshMotionTargets() {
  applyRevealMotion();
  applySurfaceTilt();
}

function applyRevealMotion() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = [...document.querySelectorAll(".hero-panel, .mission-rail, .sidebar-card, .panel, .preview-card, .artifact-card, .result-card")];
  if (!targets.length) {
    return;
  }

  if (prefersReducedMotion) {
    targets.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  if (!applyRevealMotion.observer) {
    applyRevealMotion.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            applyRevealMotion.observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
  }

  targets.forEach((node, index) => {
    if (node.dataset.revealBound === "1") {
      return;
    }
    node.dataset.revealBound = "1";
    node.classList.add("reveal-surface");
    node.style.setProperty("--reveal-delay", `${Math.min(index, 8) * 55}ms`);
    applyRevealMotion.observer.observe(node);
  });
}

function applySurfaceTilt() {
  if (!window.matchMedia("(hover: hover)").matches) {
    return;
  }

  const targets = document.querySelectorAll(".hero-panel, .mission-rail, .sidebar-card, .panel, .preview-card, .chart-frame, .cohort-frame");
  targets.forEach((node) => {
    if (node.dataset.tiltBound === "1") {
      return;
    }
    node.dataset.tiltBound = "1";
    node.classList.add("tilt-surface");
    node.addEventListener("pointermove", (event) => {
      const rect = node.getBoundingClientRect();
      const rotateX = ((event.clientY - rect.top) / rect.height - 0.5) * -7;
      const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
      node.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
      node.classList.add("is-tilting");
    });
    node.addEventListener("pointerleave", () => {
      node.style.transform = "";
      node.classList.remove("is-tilting");
    });
  });
}

function normalizeBrushWindow(start, end, length) {
  const maxIndex = Math.max(length - 1, 0);
  let nextStart = clamp(Number(start) || 0, 0, maxIndex);
  let nextEnd = clamp(Number(end) || maxIndex, 0, maxIndex);
  if (nextStart > nextEnd) {
    [nextStart, nextEnd] = [nextEnd, nextStart];
  }
  if (nextStart === nextEnd && maxIndex > 0) {
    if (nextEnd < maxIndex) {
      nextEnd += 1;
    } else {
      nextStart -= 1;
    }
  }
  return [nextStart, nextEnd];
}

function getBrushWindow(key, length, suggested = [0, Math.max(length - 1, 0)]) {
  const current = state.brushWindows[key] || suggested;
  return normalizeBrushWindow(current[0], current[1], length);
}

function setBrushWindow(key, start, end, length) {
  const normalized = normalizeBrushWindow(start, end, length);
  state.brushWindows[key] = normalized;
  return normalized;
}

function createChartFrame({
  legendEyebrow,
  legendTitle,
  legendBody,
  svg,
  brush = null,
  controls = "",
}) {
  return `
    <div class="chart-shell">
      <div class="chart-shell-head">
        <div class="chart-legend-live">
          <span class="chart-legend-eyebrow">${legendEyebrow}</span>
          <strong data-chart-legend="title">${legendTitle}</strong>
          <small data-chart-legend="body">${legendBody}</small>
        </div>
        ${controls ? `<div class="chart-inline-controls">${controls}</div>` : ""}
      </div>
      <div class="chart-stage">
        ${svg}
      </div>
      ${brush || ""}
    </div>
  `;
}

function createBrushMarkup({ key, start, end, length, startLabel, endLabel, caption }) {
  const maxIndex = Math.max(length - 1, 0);
  const startPct = maxIndex === 0 ? 0 : (start / maxIndex) * 100;
  const endPct = maxIndex === 0 ? 100 : (end / maxIndex) * 100;
  return `
    <div class="chart-brush" data-brush-key="${key}">
      <div class="chart-brush-head">
        <span>${caption}</span>
        <strong>${startLabel} - ${endLabel}</strong>
      </div>
      <div class="chart-brush-track" style="--brush-start:${startPct}%; --brush-end:${endPct}%;">
        <div class="chart-brush-window"></div>
        <input class="brush-range brush-range-start" type="range" min="0" max="${maxIndex}" step="1" value="${start}" />
        <input class="brush-range brush-range-end" type="range" min="0" max="${maxIndex}" step="1" value="${end}" />
      </div>
    </div>
  `;
}

function bindBrushControls(container, { key, length, labelForIndex, onChange }) {
  const root = container.querySelector(`[data-brush-key="${key}"]`);
  if (!root) {
    return;
  }

  const startInput = root.querySelector(".brush-range-start");
  const endInput = root.querySelector(".brush-range-end");
  const titleNode = root.querySelector(".chart-brush-head strong");
  const track = root.querySelector(".chart-brush-track");
  if (!startInput || !endInput || !titleNode || !track) {
    return;
  }

  const sync = () => {
    const [start, end] = setBrushWindow(key, startInput.value, endInput.value, length);
    startInput.value = String(start);
    endInput.value = String(end);
    const maxIndex = Math.max(length - 1, 0);
    track.style.setProperty("--brush-start", `${maxIndex === 0 ? 0 : (start / maxIndex) * 100}%`);
    track.style.setProperty("--brush-end", `${maxIndex === 0 ? 100 : (end / maxIndex) * 100}%`);
    titleNode.textContent = `${labelForIndex(start)} - ${labelForIndex(end)}`;
    onChange(start, end);
  };

  startInput.addEventListener("input", sync);
  endInput.addEventListener("input", sync);
}

function createToggleMarkup({ group, options, active }) {
  return `
    <div class="chart-toggle-group" data-toggle-group="${group}">
      ${options
        .map(
          (option) => `
            <button class="chart-toggle ${option.key === active ? "is-active" : ""}" type="button" data-toggle-value="${option.key}">
              ${option.label}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function bindToggleGroup(container, group, onChange) {
  container.querySelectorAll(`[data-toggle-group="${group}"] .chart-toggle`).forEach((button) => {
    button.addEventListener("click", () => onChange(button.getAttribute("data-toggle-value")));
  });
}

function setConnectionStatus(mode, message) {
  const badge = document.getElementById("connection-badge");
  const copy = document.getElementById("connection-copy");
  if (badge) {
    badge.textContent = mode === "live" ? "已连接真实接口" : mode === "offline" ? "离线演示模式" : "正在连接";
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
      renderSeriesOutput(series, "这份证据已经整理完成。下一步最自然的动作，是把它编译成可运行函数。");
    } catch (error) {
      renderSeriesOutput(null, extractMessage(error));
    }
  });

  renderEvidenceRegistry();

  if (new URLSearchParams(window.location.search).get("demo") === "1") {
    ensureDemoSeries();
  }
}

function renderEvidenceRegistry() {
  renderSeriesOutput(null, state.selectedSeriesId ? "" : "还没有证据对象。先贴入一份表格。");
  renderSeriesStatus();
  renderSeriesTable();
}

function buildSeriesPayload() {
  const rawCsv = document.getElementById("sample-csv")?.value || "";
  const points = parseCsvPoints(rawCsv);
  if (!points.length) {
    renderSeriesOutput(null, "没有解析到有效数据点。请检查 CSV 表头和数值列。");
    return null;
  }

  return {
    name: document.getElementById("series-name")?.value.trim() || "模拟晚期 NSCLC PFS - 网络荟萃估计",
    series_kind: document.getElementById("series-kind")?.value || "km_survival",
    time_unit: "month",
    value_unit: "survival_probability",
    interpolation_method: "piecewise_linear",
    source_metadata_json: {
      source: state.live ? "live-demo-ui" : "offline-demo-ui",
      page: "evidence",
      scenario: state.context.demo_case_name || OFFLINE_CONTEXT.demo_case_name,
      population: state.context.population_label || OFFLINE_CONTEXT.population_label,
    },
    points,
  };
}

async function ensureDemoSeries() {
  const csv = document.getElementById("sample-csv");
  if (csv) {
    csv.value = SAMPLE_CSV;
  }

  const sourceName = "模拟晚期 NSCLC PFS - 网络荟萃估计";
  const targetName = "模拟晚期 NSCLC PFS - 真实世界观察";
  const existingSource = state.series.find(
    (item) => item.name === sourceName && item.series_kind === "km_survival"
  );
  const existingTarget = state.series.find(
    (item) => item.name === targetName && item.series_kind === "km_survival"
  );
  if (existingSource && existingTarget) {
    state.selectedSeriesId = existingSource.id;
    renderSharedChrome();
    renderEvidenceRegistry();
    renderSeriesOutput(
      existingSource,
      "示例场景已准备好：基础 PFS 曲线用于生成概率函数，真实世界曲线用于后续校准。"
    );
    return;
  }

  try {
    const sourcePayload = {
      ...buildSeriesPayload(),
      name: sourceName,
      source_metadata_json: {
        source: "simulated_nma_curve",
        page: "evidence",
        scenario: state.context.demo_case_name || OFFLINE_CONTEXT.demo_case_name,
        population: state.context.population_label || OFFLINE_CONTEXT.population_label,
        role: "base_survival_evidence",
      },
      points: SAMPLE_POINTS.map((point) => ({ ...point, metadata_json: { month: point.time_value } })),
    };
    const targetPayload = {
      ...sourcePayload,
      name: targetName,
      source_metadata_json: {
        source: "simulated_rwe_curve",
        page: "evidence",
        scenario: state.context.demo_case_name || OFFLINE_CONTEXT.demo_case_name,
        population: state.context.population_label || OFFLINE_CONTEXT.population_label,
        role: "observed_target_curve",
      },
      points: OBSERVED_SAMPLE_POINTS.map((point) => ({ ...point, metadata_json: { month: point.time_value } })),
    };

    const sourceSeries = existingSource || (state.live ? await createSeriesLive(sourcePayload) : createSeriesOffline(sourcePayload));
    if (!existingTarget) {
      if (state.live) {
        await createSeriesLive(targetPayload);
      } else {
        createSeriesOffline(targetPayload);
      }
    }
    state.selectedSeriesId = sourceSeries.id;
    await refreshCollections();
    renderSharedChrome();
    renderEvidenceRegistry();
    renderSeriesOutput(
      sourceSeries,
      "示例证据已经准备好。你现在可以先生成概率函数，再用真实世界曲线做临床校准。"
    );
  } catch (error) {
    renderSeriesOutput(null, extractMessage(error));
  }
}

function renderSeriesOutput(series, message) {
  const container = document.getElementById("series-output");
  if (!container) {
    return;
  }

  const selected = series || state.series.find((item) => String(item.id) === String(state.selectedSeriesId));
  if (!selected) {
    container.innerHTML = `
      <strong>还没有整理好的证据</strong>
      <p class="helper">${message || "整理成功后，这里会显示来源、点数和你最合理的下一步。 "}</p>
    `;
    return;
  }

  container.innerHTML = `
    <span class="panel-kicker">当前最新证据对象</span>
    <strong>${selected.name}</strong>
    <p class="helper">${message || "这份证据已经可以直接拿去生成可运行函数。"} </p>
    <div class="pill-row">
      <span class="tone-pill evidence">${selected.series_kind}</span>
      <span class="hero-chip">${selected.points.length} 个数据点</span>
    </div>
    <ul class="context-list">
      <li>
        <span>ID</span>
        <strong>${selected.id}</strong>
      </li>
      <li>
        <span>数据单位</span>
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
  const selected = state.series.find((item) => String(item.id) === String(state.selectedSeriesId));
  if (!selected) {
    container.innerHTML = `
      <strong>等待你导入一份证据</strong>
      <p class="helper">这里会先告诉你字段是否完整、时间是否对齐，以及这份输入能不能进入下一步。</p>
    `;
    return;
  }

  container.innerHTML = `
    <strong>${selected.name}</strong>
    <p class="helper">校验已通过。${selected.points.length} 个点已按 ${selected.time_unit} 粒度对齐，这份证据现在可以继续用于生成函数。</p>
    <div class="pill-row">
      <span class="tone-pill evidence">可继续使用</span>
      <span class="hero-chip">${state.live ? "已写入 API" : "已保存到本地样本"}</span>
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
    container.textContent = "还没有整理好的证据。先在上方导入一份表格。";
    return;
  }

  container.className = "table-scroll";
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>名称</th>
          <th>类型</th>
          <th>点数</th>
          <th>时间单位</th>
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
      renderFunctionOutput(null, "先在证据页面整理出一份可用证据，再回来生成函数。");
      return;
    }

      const payload = {
      name: document.getElementById("function-name")?.value.trim() || "模拟晚期 NSCLC 月度进展概率函数",
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
      renderFunctionOutput(probabilityFunction, "这条函数已经生成完成。建议先验证一个区间，再进入临床校准。");
    } catch (error) {
      renderFunctionOutput(null, extractMessage(error));
    }
  });

  document.getElementById("debug-function")?.addEventListener("click", async () => {
    const functionId = document.getElementById("debug-function-select")?.value;
    const t0 = Number(document.getElementById("debug-t0")?.value || 0);
    const t1 = Number(document.getElementById("debug-t1")?.value || 1);
    if (!functionId) {
      renderDebugResult(null, "先生成一条可运行函数。");
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
  const selected = functionRecord || state.functions.find((item) => String(item.id) === String(state.selectedFunctionId));
  if (!selected) {
    container.innerHTML = `
      <strong>还没有可运行函数</strong>
      <p class="helper">${message || "生成后，这里会告诉你它来自哪份证据、现在是否可复用，以及接下来做什么最合适。 "}</p>
    `;
    return;
  }

  const compiled = selected.options_json?.compiled_source;
  container.innerHTML = `
    <span class="panel-kicker">当前最新概率函数</span>
    <strong>${selected.name}</strong>
    <p class="helper">${message || "你现在可以直接验证任意区间，或者把它送去做校准和模拟。"} </p>
    <div class="pill-row">
      <span class="tone-pill calibration">${compiled?.compiled_kind || "compiled"}</span>
      <span class="hero-chip">${selected.cycle_length} ${selected.time_unit}</span>
    </div>
    <ul class="context-list">
      <li>
        <span>来自证据</span>
        <strong>${selected.source_ref_id}</strong>
      </li>
      <li>
        <span>函数类型</span>
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
    container.textContent = "还没有函数。先把一份证据编译成可运行函数。";
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
      <strong>等待你发起一次验证</strong>
      <p class="helper">${message || "这里会显示区间概率，以及这次求值到底基于什么输入。 "}</p>
    `;
    chart.innerHTML = makeEmptyChartSvg("先生成一条可运行函数");
    return;
  }

  const selected = state.functions.find((item) => String(item.id) === String(debug.function_id));
  const points = selected?.options_json?.compiled_source?.points || [];
  const [startIndex, endIndex] = getBrushWindow("runtimeDebug", points.length);
  const startLabel = points[startIndex] ? `Month ${points[startIndex].time}` : "起点";
  const endLabel = points[endIndex] ? `Month ${points[endIndex].time}` : "终点";
  result.innerHTML = `
    <strong>区间概率 = ${(debug.probability * 100).toFixed(2)}%</strong>
    <p class="helper">区间 [${debug.t0}, ${debug.t1}] 已完成求值。这个结果可以帮助你判断函数层是否已经足够稳定，适合继续往下跑。</p>
    <ul class="context-list">
      <li>
        <span>函数 ID</span>
        <strong>${debug.function_id}</strong>
      </li>
      <li>
        <span>求值依据</span>
        <strong>${Object.entries(debug.trace)
          .slice(0, 3)
          .map(([key, value]) => `${key}: ${value}`)
          .join(" · ")}</strong>
      </li>
    </ul>
  `;
  chart.innerHTML = createChartFrame({
    legendEyebrow: "实时函数解释",
    legendTitle: `区间 [${debug.t0}, ${debug.t1}] 月`,
    legendBody: `当前事件概率 ${(debug.probability * 100).toFixed(2)}%。悬停曲线点可查看单个月的连续估计值。`,
    svg: makeProbabilityChartSvg(selected, debug, { startIndex, endIndex }),
    brush: points.length
      ? createBrushMarkup({
          key: "runtimeDebug",
          start: startIndex,
          end: endIndex,
          length: points.length,
          startLabel,
          endLabel,
          caption: "时间窗口 brush",
        })
      : "",
  });
  attachChartTooltip(chart, {
    title: `区间 [${debug.t0}, ${debug.t1}] 月`,
    body: `当前事件概率 ${(debug.probability * 100).toFixed(2)}%。`,
  });
  if (points.length) {
    bindBrushControls(chart, {
      key: "runtimeDebug",
      length: points.length,
      labelForIndex: (index) => `Month ${points[index]?.time ?? index}`,
      onChange: async (start, end) => {
        const t0Input = document.getElementById("debug-t0");
        const t1Input = document.getElementById("debug-t1");
        const nextT0 = Number(points[start]?.time ?? 0);
        const nextT1 = Number(points[end]?.time ?? nextT0 + 1);
        if (t0Input) t0Input.value = String(nextT0);
        if (t1Input) t1Input.value = String(nextT1);
        const functionId = document.getElementById("debug-function-select")?.value;
        if (!functionId) {
          return;
        }
        try {
          const nextDebug = state.live
            ? await request(`/probability-functions/${functionId}/debug`, {
                method: "POST",
                body: JSON.stringify({ t0: nextT0, t1: nextT1 }),
              })
            : debugFunctionOffline(functionId, nextT0, nextT1);
          renderDebugResult(nextDebug);
        } catch (error) {
          renderDebugResult(null, extractMessage(error));
        }
      },
    });
  }
}

function initCalibrationPage() {
  document.getElementById("load-calibration-template")?.addEventListener("click", () => {
    hydrateCalibrationTemplate();
    renderCalibrationStatus("推荐边界已载入。现在可以直接启动校准。");
  });

  document.getElementById("launch-calibration")?.addEventListener("click", async () => {
    const configPayload = buildCalibrationConfigPayload();
    if (!configPayload) {
      return;
    }

    const runPayload = {
      project_id: state.context.project_id,
      config_json: {
        probability_function_id: document.getElementById("calibration-function-select")?.value || "",
        cycles: Number(document.getElementById("calibration-cycles")?.value || 15),
        initial_population: Number(document.getElementById("calibration-population")?.value || 1000),
      },
    };

    startProgress("calibration");
    renderCalibrationStatus("正在创建校准配置，并准备把任务送进异步队列。");

    try {
      const bundle = state.live
        ? await launchCalibrationLive(configPayload, runPayload)
        : await launchCalibrationOffline(configPayload, runPayload);
      state.currentCalibration = bundle;
      state.selectedCalibrationId = bundle.config.id;
      await refreshCollections();
      renderSharedChrome();
      renderCalibrationPage();
      stopProgress("calibration", 100);
      renderCalibrationStatus("校准已完成。现在可以先看覆盖图，再进入运行模拟。");
    } catch (error) {
      stopProgress("calibration", 0);
      renderCalibrationStatus(extractMessage(error));
    }
  });

  hydrateCalibrationTemplate();
  renderCalibrationPage();
}

async function ensureLatestCalibrationBundle() {
  const completedRuns = state.runs
    .filter((run) => run.analysis_type === "calibration" && run.status === "completed")
    .sort((left, right) => getRunTimestamp(right) - getRunTimestamp(left));
  const latest = completedRuns[0];
  if (!latest) {
    state.currentCalibration = null;
    return null;
  }

  if (state.currentCalibration && String(state.currentCalibration.run?.id) === String(latest.id)) {
    return state.currentCalibration;
  }

  if (state.live) {
    try {
      const [result, artifacts] = await Promise.all([
        request(`/runs/${latest.id}/calibration-result`),
        request(`/runs/${latest.id}/artifacts`).catch(() => []),
      ]);
      state.currentCalibration = {
        run: latest,
        result,
        artifacts,
        overlayArtifact: artifacts.find((artifact) => artifact.artifact_type === "calibration-overlay") || null,
      };
      return state.currentCalibration;
    } catch (error) {
      console.warn("Failed to load latest calibration bundle", error);
      state.currentCalibration = null;
      return null;
    }
  }

  state.currentCalibration = {
    run: latest,
    result: latest._calibrationResult || null,
    artifacts: latest._artifacts || [],
    overlayArtifact: (latest._artifacts || []).find((artifact) => artifact.artifact_type === "calibration-overlay") || null,
  };
  return state.currentCalibration;
}

function renderCalibrationPage() {
  populateSelect(
    document.getElementById("calibration-target-series"),
    state.series.map((series) => ({
      value: series.id,
      label: `${series.name} · ${series.series_kind}`,
    })),
    state.selectedSeriesId
  );

  populateSelect(
    document.getElementById("calibration-function-select"),
    state.functions.map((fn) => ({
      value: fn.id,
      label: `${fn.name} · ${fn.function_kind}`,
    })),
    state.selectedFunctionId
  );

  renderCalibrationStatus();
  renderCalibrationBest();
  renderCalibrationOverlay();
  renderCalibrationConfigs();
  renderCalibrationDiagnostics();
}

function hydrateCalibrationTemplate() {
  setInputValue("calibration-event-scale-lower", DEFAULT_CALIBRATION_TEMPLATE.event_scale.lower);
  setInputValue("calibration-event-scale-upper", DEFAULT_CALIBRATION_TEMPLATE.event_scale.upper);
  setInputValue("calibration-event-scale-initial", DEFAULT_CALIBRATION_TEMPLATE.event_scale.initial);
  setInputValue("calibration-pf-death-lower", DEFAULT_CALIBRATION_TEMPLATE.pf_death_probability.lower);
  setInputValue("calibration-pf-death-upper", DEFAULT_CALIBRATION_TEMPLATE.pf_death_probability.upper);
  setInputValue("calibration-pf-death-initial", DEFAULT_CALIBRATION_TEMPLATE.pf_death_probability.initial);
  setInputValue("calibration-pd-death-lower", DEFAULT_CALIBRATION_TEMPLATE.pd_death_probability.lower);
  setInputValue("calibration-pd-death-upper", DEFAULT_CALIBRATION_TEMPLATE.pd_death_probability.upper);
  setInputValue("calibration-pd-death-initial", DEFAULT_CALIBRATION_TEMPLATE.pd_death_probability.initial);
}

function buildCalibrationConfigPayload() {
  const targetSeriesId = document.getElementById("calibration-target-series")?.value;
  const functionId = document.getElementById("calibration-function-select")?.value;
  if (!targetSeriesId) {
    renderCalibrationStatus("先选择一条目标证据，校准才知道要贴近哪条观察曲线。");
    return null;
  }
  if (!functionId) {
    renderCalibrationStatus("先选择一条可运行函数，校准才能真正开始。");
    return null;
  }

  return {
    name: document.getElementById("calibration-name")?.value.trim() || "观察值与预测值拟合",
    target_series_id: targetSeriesId,
    objective_type: "rmse",
    optimizer_type: "deterministic_grid",
    max_iterations: Number(document.getElementById("calibration-max-iterations")?.value || 12),
    config_json: {
      probability_function_id: functionId,
    },
    parameters: [
      {
        parameter_code: "event_scale",
        lower_bound: Number(document.getElementById("calibration-event-scale-lower")?.value || 0.7),
        upper_bound: Number(document.getElementById("calibration-event-scale-upper")?.value || 1.3),
        initial_value: Number(document.getElementById("calibration-event-scale-initial")?.value || 1.0),
        transform_type: "identity",
        is_fixed: false,
      },
      {
        parameter_code: "pf_death_probability",
        lower_bound: Number(document.getElementById("calibration-pf-death-lower")?.value || 0.004),
        upper_bound: Number(document.getElementById("calibration-pf-death-upper")?.value || 0.03),
        initial_value: Number(document.getElementById("calibration-pf-death-initial")?.value || 0.01),
        transform_type: "identity",
        is_fixed: false,
      },
      {
        parameter_code: "pd_death_probability",
        lower_bound: Number(document.getElementById("calibration-pd-death-lower")?.value || 0.04),
        upper_bound: Number(document.getElementById("calibration-pd-death-upper")?.value || 0.14),
        initial_value: Number(document.getElementById("calibration-pd-death-initial")?.value || 0.08),
        transform_type: "identity",
        is_fixed: false,
      },
    ],
  };
}

function renderCalibrationStatus(message) {
  const container = document.getElementById("calibration-status");
  if (!container) {
    return;
  }

  const bundle = state.currentCalibration;
  if (!bundle) {
    container.innerHTML = `
      <strong>${message || "准备好开始校准"}</strong>
      <p class="helper">先设置目标证据和参数边界。平台会用异步任务跑完观察值对预测值校准，然后把最值得看的结果带回这里。</p>
    `;
    return;
  }

  container.innerHTML = `
    <strong>${message || "最近一次校准已经完成"}</strong>
    <p class="helper">运行 ${shortId(bundle.run.id)} · ${bundle.run.status} · ${bundle.result.convergence_status}。这次校准已经给出一组可继续使用的参数。</p>
    <div class="pill-row">
      <span class="tone-pill calibration">最佳 RMSE ${Number(bundle.result.best_objective_value).toFixed(4)}</span>
      <span class="hero-chip">${bundle.config.max_iterations} 个候选值</span>
    </div>
  `;
}

function renderCalibrationBest() {
  const container = document.getElementById("calibration-best");
  if (!container) {
    return;
  }

  const bundle = state.currentCalibration;
  if (!bundle) {
    container.className = "empty-state";
    container.textContent = "还没有校准结果。先设置参数边界并启动这次校准。";
    return;
  }

  const bestParams = bundle.result.best_params_json || {};
  container.className = "result-card";
  container.innerHTML = `
    <span class="panel-kicker">最近一次校准结果</span>
    <strong>最佳 RMSE = ${Number(bundle.result.best_objective_value).toFixed(4)}</strong>
    <p class="helper">这组参数已经让模型输出更接近目标证据。你可以直接看覆盖图，或者继续去跑模拟。</p>
    <ul class="context-list">
      <li>
        <span>事件比例</span>
        <strong>${formatShortNumber(bestParams.event_scale)}</strong>
      </li>
      <li>
        <span>无进展死亡概率</span>
        <strong>${formatShortNumber(bestParams.pf_death_probability)}</strong>
      </li>
      <li>
        <span>进展后死亡概率</span>
        <strong>${formatShortNumber(bestParams.pd_death_probability)}</strong>
      </li>
    </ul>
  `;
}

function renderCalibrationOverlay() {
  const chart = document.getElementById("calibration-overlay-chart");
  const label = document.getElementById("calibration-overlay-label");
  if (!chart || !label) {
    return;
  }

  const bundle = state.currentCalibration;
  if (!bundle) {
    chart.innerHTML = makeEmptyChartSvg("先启动一次校准");
      label.textContent = "等待校准结果";
    return;
  }

  const overlayArtifact = bundle.overlayArtifact;
  const metadata = overlayArtifact?.metadata_json || {};
  const observedPoints = metadata.observed_points || [];
  const [startIndex, endIndex] = getBrushWindow("calibrationOverlay", observedPoints.length);
  chart.innerHTML = createChartFrame({
    legendEyebrow: "当前拟合解读",
    legendTitle: `RMSE ${Number(bundle.result.best_objective_value).toFixed(4)}`,
    legendBody: "悬停观察点或预测点，可以直接解释当前月的真实值和模型值差异。",
    svg: makeCalibrationOverlaySvg(
      {
        observedPoints,
        predictedPoints: metadata.predicted_points || [],
        fullPredictedCurve: metadata.full_predicted_curve || [],
        bestObjectiveValue: bundle.result.best_objective_value,
      },
      { startIndex, endIndex }
    ),
    brush: observedPoints.length
      ? createBrushMarkup({
          key: "calibrationOverlay",
          start: startIndex,
          end: endIndex,
          length: observedPoints.length,
          startLabel: `Month ${observedPoints[startIndex]?.time ?? 0}`,
          endLabel: `Month ${observedPoints[endIndex]?.time ?? 0}`,
          caption: "聚焦拟合窗口",
        })
      : "",
  });
  attachChartTooltip(chart, {
    title: `RMSE ${Number(bundle.result.best_objective_value).toFixed(4)}`,
    body: "悬停具体月份，可以直接对比真实观察点和模型预测值。",
  });
  if (observedPoints.length) {
    bindBrushControls(chart, {
      key: "calibrationOverlay",
      length: observedPoints.length,
      labelForIndex: (index) => `Month ${observedPoints[index]?.time ?? index}`,
      onChange: () => renderCalibrationOverlay(),
    });
  }
  label.textContent = `观察值对预测值 · RMSE ${Number(bundle.result.best_objective_value).toFixed(4)}`;
}

function renderCalibrationConfigs() {
  const container = document.getElementById("calibration-config-list");
  if (!container) {
    return;
  }

  if (!state.calibrationConfigs.length) {
    container.className = "empty-state";
    container.textContent = "还没有校准配置。先提交一组参数边界。";
    return;
  }

  container.className = "list-table";
  container.innerHTML = state.calibrationConfigs
    .map(
      (config) => `
        <li>
          <strong>${config.name}</strong>
          <span class="list-meta">${config.objective_type} · ${config.optimizer_type}</span>
          <span class="list-meta">${config.parameters?.length || 0} 个参数 · ${config.max_iterations} 次迭代</span>
        </li>
      `
    )
    .join("");
}

function renderCalibrationDiagnostics() {
  const container = document.getElementById("calibration-diagnostics");
  if (!container) {
    return;
  }

  const bundle = state.currentCalibration;
  if (!bundle) {
    container.className = "empty-state";
    container.textContent = "运行结束后，这里会显示优化器、候选次数和 best-fit 参数，方便你解释为什么会得到这组结果。";
    return;
  }

  const history = bundle.result.diagnostics_json?.history || [];
  container.className = "list-table";
  container.innerHTML = history
    .slice(0, 6)
      .map(
        (candidate) => `
        <li>
          <strong>第 ${candidate.iteration} 次尝试 · RMSE ${Number(candidate.objective).toFixed(4)}</strong>
          <span class="list-meta">事件比例 ${formatShortNumber(candidate.parameter_values?.event_scale)}</span>
          <span class="list-meta">无进展死亡 ${formatShortNumber(candidate.parameter_values?.pf_death_probability)} · 进展后死亡 ${formatShortNumber(candidate.parameter_values?.pd_death_probability)}</span>
        </li>
      `
    )
    .join("");
}

function initSimulationPage() {
  document.getElementById("preset-base-case")?.addEventListener("click", () => {
    setInputValue("run-sampling-method", "random");
    setInputValue("run-cycles", 12);
    setInputValue("run-population", 1000);
    setInputValue("run-sample-size", 1);
    renderRunStatus("已切换到基线情景配置。现在可以直接运行单条队列结果。");
  });

  document.getElementById("preset-psa")?.addEventListener("click", () => {
    setInputValue("run-sampling-method", "lhs");
    setInputValue("run-cycles", 12);
    setInputValue("run-population", 1000);
    setInputValue("run-sample-size", 16);
    renderRunStatus("已切换到 PSA 配置。平台将使用 LHS 抽样，并保存样本矩阵。");
  });

  document.getElementById("load-run-template")?.addEventListener("click", () => {
    setInputValue("run-sampling-method", "lhs");
    setInputValue("run-cycles", 24);
    setInputValue("run-population", 1000);
    setInputValue("run-sample-size", 24);
    renderRunStatus("已载入模拟晚期 NSCLC 的示例配置。你可以直接运行，或微调样本数和周期数。");
  });

  document.getElementById("launch-run")?.addEventListener("click", async () => {
    const functionId = document.getElementById("run-function-select")?.value;
    if (!functionId) {
      renderRunStatus("先在上一页生成一条可运行函数，分析才能开始。");
      return;
    }

    const calibrationBundle = await ensureLatestCalibrationBundle();
    const calibratedParams = calibrationBundle?.result?.best_params_json || {};

    const payload = {
      project_id: state.context.project_id,
      analysis_type: "cohort_markov",
      sampling_method: document.getElementById("run-sampling-method")?.value || "lhs",
      input_snapshot_json: {
        scenario: state.context.demo_case_name || OFFLINE_CONTEXT.demo_case_name,
        population: state.context.population_label || OFFLINE_CONTEXT.population_label,
        intervention: state.context.intervention_label || OFFLINE_CONTEXT.intervention_label,
        comparator: state.context.comparator_label || OFFLINE_CONTEXT.comparator_label,
        calibration_run_id: calibrationBundle?.run?.id || null,
      },
      config_json: {
        probability_function_id: functionId,
        cycles: Number(document.getElementById("run-cycles")?.value || 12),
        initial_population: Number(document.getElementById("run-population")?.value || 1000),
        sample_size: Number(document.getElementById("run-sample-size")?.value || 16),
        patient_trace_count: 10,
        event_scale: Number(calibratedParams.event_scale ?? 1.0),
        pf_death_probability: Number(calibratedParams.pf_death_probability ?? 0.01),
        pd_death_probability: Number(calibratedParams.pd_death_probability ?? 0.08),
        pf_state_cost: 6800,
        pd_state_cost: 12400,
        transition_cost: 2400,
        pf_state_utility: 0.83,
        pd_state_utility: 0.56,
      },
    };

    startProgress("run");
    renderRunStatus(
      calibrationBundle
        ? "任务已排队。平台会沿用最近一次校准参数，继续计算 cohort、样本矩阵和结果页需要的产物。"
        : "任务已排队。平台正在准备队列结果、样本矩阵和结果页需要的产物。"
    );

    try {
      const run = state.live ? await launchRunLive(payload) : await launchRunOffline(payload);
      state.selectedRunId = run.id;
      await refreshCollections();
      renderSharedChrome();
      await renderSimulationPage();
      stopProgress("run", 100);
      renderRunStatus(`运行 ${shortId(run.id)} 已完成。你现在可以先看动态 Markov 流，再去结果页讲清楚这次分析。`);
    } catch (error) {
      stopProgress("run", 0);
      renderRunStatus(extractMessage(error));
    }
  });

  renderSimulationPage();
}

async function renderSimulationPage() {
  await ensureLatestCalibrationBundle();
  populateSelect(
    document.getElementById("run-function-select"),
    state.functions.map((fn) => ({
      value: fn.id,
      label: `${fn.name} · ${fn.function_kind}`,
    })),
    state.selectedFunctionId
  );

  renderCalibrationBridge();
  renderRunSummary();
  renderRunRegistry();
  await renderArtifactPreview();
  await renderSimulationMotion();
}

function renderRunStatus(message) {
  const container = document.getElementById("run-status");
  if (!container) {
    return;
  }
  container.innerHTML = `
    <strong>${message}</strong>
    <p class="helper">这一页会把运行状态、核心结果、动态状态流和可审阅产物串起来，让你不用在不同页面来回跳。</p>
  `;
}

function renderCalibrationBridge() {
  const container = document.getElementById("run-calibration-bridge");
  if (!container) {
    return;
  }

  const bundle = state.currentCalibration;
  if (!bundle?.result) {
    container.className = "preview-card";
    container.innerHTML = `
      <strong>当前还没有可沿用的校准结果</strong>
      <p class="helper">你仍然可以直接跑 base case 或 PSA；如果先做一次临床校准，后面的模拟会自动带上最新参数。</p>
    `;
    return;
  }

  const bestParams = bundle.result.best_params_json || {};
  container.className = "preview-card";
  container.innerHTML = `
    <strong>这次运行会自动沿用最近一次校准结果</strong>
    <p class="helper">来自运行 ${shortId(bundle.run.id)}。这能让模拟更接近你刚刚确认过的观察值对预测值拟合。</p>
    <div class="pill-row">
      <span class="tone-pill calibration">事件比例 ${formatShortNumber(bestParams.event_scale)}</span>
      <span class="hero-chip">PF 死亡 ${formatShortNumber(bestParams.pf_death_probability)}</span>
      <span class="hero-chip">PD 死亡 ${formatShortNumber(bestParams.pd_death_probability)}</span>
    </div>
  `;
}

function renderRunSummary() {
  const container = document.getElementById("run-summary");
  const note = document.getElementById("run-summary-note");
  if (!container) {
    return;
  }

  const run = getSelectedCohortRun();
  if (!run) {
    container.className = "empty-state";
    container.textContent = "还没有分析结果。先选择一条函数并启动这次运行。";
    if (note) {
      note.textContent = "结果出现后，这里会先告诉你基线指标最该先看什么。";
    }
    return;
  }

  const cards = run.summary_json?.cards || [];
  if (!cards.length) {
    container.className = "empty-state";
    container.textContent = `${run.analysis_type} · ${run.status}。结果卡片会在运行完成后出现。`;
    if (note) {
      note.textContent = "当前 run 还没有 summary cards，先等计算完成。";
    }
    return;
  }

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

  if (note) {
    const primaryLabels = cards.slice(0, 3).map((card) => card.label).join("、");
    const eventScale = run.summary_json?.calibration_applied?.event_scale;
    note.textContent = eventScale
      ? `先看 ${primaryLabels}。这次运行已带入校准后的事件比例 ${formatShortNumber(eventScale)}，再决定是否进入完整结果页解释不确定性。`
      : `先看 ${primaryLabels}，这会帮助你先判断基线结果，再决定是否要进入完整结果页解释不确定性。`;
  }
}

function renderRunRegistry() {
  const container = document.getElementById("run-list");
  if (!container) {
    return;
  }

  if (!state.runs.length) {
    container.className = "empty-state";
    container.textContent = "还没有历史分析。跑完第一条结果后，这里会出现最近运行记录。";
    return;
  }

  container.className = "list-table";
  container.innerHTML = state.runs
    .map(
      (run) => `
        <li>
          <strong>${shortId(run.id)} · ${run.status}</strong>
          <span class="list-meta">${run.analysis_type} · ${run.sampling_method || "random"}</span>
          <span class="list-meta">${run.summary_json?.sample_size || 0} 个样本</span>
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
  const run = getSelectedCohortRun();
  if (!run) {
    container.className = "empty-state";
    container.textContent = "运行完成后，这里会预览概率轨迹、队列轨迹和运行配置等可审阅产物。";
    return;
  }

  const artifacts = state.live ? await request(`/runs/${run.id}/artifacts`).catch(() => []) : run._artifacts || [];
  if (!artifacts.length) {
    container.className = "empty-state";
    container.textContent = "这次运行还没有产物文件。";
    return;
  }

  container.className = "artifact-list";
  container.innerHTML = artifacts
    .map(
      (artifact) => `
        <li>
            <strong>${artifact.artifact_type}</strong>
            <span class="list-meta">${artifact.storage_uri}</span>
            <span class="list-meta">${artifact.checksum || "无校验值"}</span>
          </li>
      `
    )
    .join("");
}

async function renderSimulationMotion() {
  const container = document.getElementById("simulation-markov-motion");
  const label = document.getElementById("simulation-flow-label");
  const note = document.getElementById("simulation-motion-note");
  if (!container || !label) {
    return;
  }

  const run = getSelectedCohortRun();
  if (!run || run.status !== "completed") {
    stopSimulationMotion();
    container.innerHTML = makeEmptyChartSvg("先完成一条分析运行");
    label.textContent = "等待分析结果";
    if (note) {
      note.textContent = "状态流完成后，这里会用一句话解释当前 cycle 最值得注意的迁移变化。";
    }
    return;
  }

  if (!state.currentSimulation || String(state.currentSimulation.run.id) !== String(run.id)) {
    const cohort = state.live
      ? (await request(`/runs/${run.id}/cohort-dashboard`).catch(() => ({ points: [] }))).points || []
      : run._cohort || [];
    state.currentSimulation = { run, cohort };
    state.simulationCycleIndex = 0;
    startSimulationMotion();
  }

  const buckets = getUniqueBucketTimes(state.currentSimulation.cohort || []);
  const focus = buckets[state.simulationCycleIndex] ?? buckets.at(-1) ?? 0;
  container.innerHTML = createChartFrame({
    legendEyebrow: "动态状态流",
    legendTitle: `周期 ${focus} · Markov 状态迁移`,
    legendBody: "悬停状态节点或流向路径，可以直接解释这一周期谁在流出、谁在累积。",
    svg: makeMarkovMotionSvg(state.currentSimulation.cohort || [], state.simulationCycleIndex),
  });
  attachChartTooltip(container, {
    title: `周期 ${focus} · Markov 状态迁移`,
    body: "悬停状态节点或流向路径，可以直接解释这一周期的状态变化。",
  });
  label.textContent = `周期 ${focus} · 动态状态流`;
  if (note) {
    note.textContent = describeCohortFocus(state.currentSimulation.cohort || [], state.simulationCycleIndex);
  }
}

function startSimulationMotion() {
  stopSimulationMotion();
  state.simulationMotionTimer = window.setInterval(() => {
    const buckets = getUniqueBucketTimes(state.currentSimulation?.cohort || []);
    if (!buckets.length) {
      return;
    }
    state.simulationCycleIndex = (state.simulationCycleIndex + 1) % buckets.length;
    renderSimulationMotion();
  }, 1500);
}

function stopSimulationMotion() {
  if (state.simulationMotionTimer) {
    window.clearInterval(state.simulationMotionTimer);
    state.simulationMotionTimer = null;
  }
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

  document.getElementById("review-open-latest")?.addEventListener("click", async () => {
    const latest = getReviewableRuns()[0];
    if (!latest) {
      renderReviewCompareSummary("还没有可打开的运行结果。先去运行模拟页跑一条结果。");
      return;
    }
    state.selectedRunId = latest.id;
    const select = document.getElementById("review-run-select");
    if (select) {
      select.value = String(latest.id);
    }
    await loadReviewBundle();
    renderReviewSurface();
    renderReviewCompareSummary(`已切换到最新运行 ${shortId(latest.id)}。现在可以直接导出结果或继续比较。`);
  });

  document.getElementById("review-compare-latest")?.addEventListener("click", () => {
    compareLatestRuns();
  });

  document.getElementById("review-export-summary")?.addEventListener("click", () => {
    exportReviewSummary();
  });

  document.getElementById("review-export-calibration")?.addEventListener("click", () => {
    exportCalibrationPack();
  });

  document.getElementById("review-export-bundle")?.addEventListener("click", () => {
    exportReviewerBundle();
  });

  document.getElementById("review-copy-metadata")?.addEventListener("click", async () => {
    await copyRunMetadata();
  });

  document.getElementById("review-cycle-slider")?.addEventListener("input", () => {
    state.cycleFocusIndex = Number(document.getElementById("review-cycle-slider")?.value || 0);
    renderReviewSurface();
  });

  document.getElementById("review-autoplay")?.addEventListener("click", () => {
    toggleReviewAutoplay();
  });

  renderReviewShell();
}

function renderReviewShell() {
  const reviewableRuns = getReviewableRuns();
  populateSelect(
    document.getElementById("review-run-select"),
    reviewableRuns.map((run) => ({
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

  if (reviewableRuns.length && !state.currentReview) {
    loadReviewBundle().then(() => renderReviewSurface());
  } else {
    renderReviewSurface();
  }

  syncReviewCompareButton();
  renderReviewCompareSummary();
}

function syncReviewCompareButton() {
  const button = document.getElementById("review-compare-latest");
  if (!button) {
    return;
  }
  button.textContent = state.reviewCompareMode === "compare" ? "退出最近两次对比" : "比较最近两次 run";
}

async function loadReviewBundle() {
  const reviewableRuns = getReviewableRuns();
  const runId = state.selectedRunId || reviewableRuns[0]?.id;
  if (!runId) {
    state.currentReview = null;
    stopReviewAutoplay();
    return;
  }

  state.selectedRunId = runId;
  const run = reviewableRuns.find((item) => String(item.id) === String(runId));
  if (!run) {
    state.currentReview = null;
    stopReviewAutoplay();
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
    state.currentReview = buildOfflineReviewBundle(runId, state.scatterX, state.scatterY, state.patientIndex);
  }

  state.currentReviewComparison = null;
  const comparisonRun = state.reviewCompareMode === "compare" ? getComparisonRun(runId) : null;
  if (comparisonRun) {
    if (state.live) {
      const scatter = await request(
        `/runs/${comparisonRun.id}/scatterplot?x_metric=${state.scatterX}&y_metric=${state.scatterY}`
      ).catch(() => ({ points: [] }));
      state.currentReviewComparison = { run: comparisonRun, scatter };
    } else {
      const compareBundle = buildOfflineReviewBundle(
        comparisonRun.id,
        state.scatterX,
        state.scatterY,
        state.patientIndex
      );
      state.currentReviewComparison = {
        run: comparisonRun,
        scatter: compareBundle.scatter,
      };
    }
  }

  const uniqueBuckets = getUniqueBucketTimes(state.currentReview?.cohort?.points || []);
  const slider = document.getElementById("review-cycle-slider");
  if (slider) {
    slider.max = String(Math.max(uniqueBuckets.length - 1, 0));
    state.cycleFocusIndex = Math.min(state.cycleFocusIndex, Math.max(uniqueBuckets.length - 1, 0));
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
  const motionLabel = document.getElementById("review-motion-label");
  const motion = document.getElementById("review-markov-motion");
  const summaryNote = document.getElementById("review-summary-note");
  const scatterNote = document.getElementById("review-scatter-note");
  const cohortNote = document.getElementById("review-cohort-note");
  if (!summary || !scatter || !cohort || !trace || !artifacts || !cycleLabel || !motionLabel || !motion) {
    return;
  }

  syncReviewAutoplayButton();

  if (!state.currentReview) {
    summary.className = "empty-state";
    summary.textContent = "还没有加载结果。先从上方选择一条运行记录。";
    scatter.innerHTML = makeEmptyChartSvg("先加载散点结果");
    cohort.innerHTML = makeEmptyChartSvg("先加载 cohort 数据");
    motion.innerHTML = makeEmptyChartSvg("先加载动态状态流");
    trace.className = "empty-state";
      trace.textContent = "选择结果后，这里会显示单个患者的事件轨迹。";
    artifacts.className = "empty-state";
    artifacts.textContent = "选择结果后，这里会显示产物文件和元数据。";
    cycleLabel.textContent = "等待你选择 cycle";
    motionLabel.textContent = "等待分析结果";
    if (summaryNote) {
      summaryNote.textContent = "加载结果后，这里会先用一句话提醒你最该先读哪张结论卡。";
    }
    if (scatterNote) {
      scatterNote.textContent = "散点图加载后，这里会解释当前样本分布大致说明了什么。";
    }
    if (cohortNote) {
      cohortNote.textContent = "队列轨迹加载后，这里会概括当前周期的状态变化重点。";
    }
    return;
  }

  const cards = state.currentReview.run.summary_json?.cards || [];
  summary.className = cards.length ? "metric-grid four" : "empty-state";
  summary.innerHTML = cards.length
    ? cards
        .map(
          (card) => `
            <article class="metric-card">
              <small>${card.label}</small>
              <strong>${formatMetricValue(card.value, card.unit)}</strong>
              <span>${card.unit || ""}</span>
            </article>
          `
        )
        .join("")
    : "这次运行还没有 summary cards。";
  if (summaryNote) {
    summaryNote.textContent = cards.length
      ? `先看 ${cards.slice(0, 3).map((card) => card.label).join("、")}，再决定是否要继续看不确定性和 trace。`
      : "这次运行还没有结论卡，可以先看下方的动态状态流和 trace。";
  }

  const currentScatterPoints = state.currentReview.scatter?.points || [];
  const compareScatterPoints =
    state.reviewCompareMode === "compare" ? state.currentReviewComparison?.scatter?.points || [] : [];
  scatter.innerHTML = createChartFrame({
    legendEyebrow: state.reviewCompareMode === "compare" ? "最近两次运行对比" : "当前运行样本带",
    legendTitle:
      state.reviewCompareMode === "compare"
        ? `当前 ${shortId(state.currentReview.run.id)} vs 上一条 ${shortId(state.currentReviewComparison?.run?.id)}`
        : `${DEFAULT_METRIC_OPTIONS.find((item) => item.key === state.scatterX)?.label || state.scatterX} vs ${DEFAULT_METRIC_OPTIONS.find((item) => item.key === state.scatterY)?.label || state.scatterY}`,
    legendBody:
      state.reviewCompareMode === "compare"
        ? "橙色是当前 run，蓝色空心点是上一条 run。看整体分布有没有平移，比看单个数字更直观。"
        : "悬停单个样本点，可以直接解释当前指标组合下的样本位置。",
    svg: makeScatterSvg(currentScatterPoints, state.scatterX, state.scatterY, {
      comparePoints: compareScatterPoints,
    }),
    controls: createToggleMarkup({
      group: "review-scatter-compare",
      active: state.reviewCompareMode,
      options: [
        { key: "single", label: "只看当前 run" },
        { key: "compare", label: "对比上一条 run" },
      ],
    }),
  });
  bindToggleGroup(scatter, "review-scatter-compare", async (value) => {
    state.reviewCompareMode = value;
    syncReviewCompareButton();
    await loadReviewBundle();
    renderReviewSurface();
  });
  attachChartTooltip(scatter, {
    title:
      state.reviewCompareMode === "compare"
        ? `当前 ${shortId(state.currentReview.run.id)} vs 上一条 ${shortId(state.currentReviewComparison?.run?.id)}`
        : "当前运行样本分布",
    body:
      state.reviewCompareMode === "compare"
        ? "橙色和蓝色点云的偏移，能直接告诉客户这次调整到底改变了什么。"
        : "悬停单个样本点，可以查看具体指标值。",
  });
  if (scatterNote) {
    const pointCount = currentScatterPoints.length;
    scatterNote.textContent = pointCount
      ? state.reviewCompareMode === "compare"
        ? `当前散点图把 ${pointCount} 个当前样本和 ${compareScatterPoints.length} 个上一条 run 的样本放在同一坐标系里，先看整体带状位移，再看离群点。`
        : `当前散点图用 ${state.scatterX} 对 ${state.scatterY} 展示 ${pointCount} 个样本。先看主带分布，再找是否有离群点需要解释。`
      : "散点图会在结果准备好后出现。";
  }
  const cohortPoints = state.currentReview.cohort?.points || [];
  const uniqueBuckets = getUniqueBucketTimes(cohortPoints);
  const [cohortStart, cohortEnd] = getBrushWindow("reviewCohort", uniqueBuckets.length);
  cohort.innerHTML = createChartFrame({
    legendEyebrow: "队列窗口解读",
    legendTitle: `聚焦周期 ${uniqueBuckets[cohortStart] ?? 0} - ${uniqueBuckets[cohortEnd] ?? 0}`,
    legendBody: "拖动 brush 可以把客户视线聚焦在早期、转折期或后期死亡累积阶段。",
    svg: makeCohortSvg(cohortPoints, state.cycleFocusIndex, {
      startIndex: cohortStart,
      endIndex: cohortEnd,
    }),
    brush: uniqueBuckets.length
      ? createBrushMarkup({
          key: "reviewCohort",
          start: cohortStart,
          end: cohortEnd,
          length: uniqueBuckets.length,
          startLabel: `Cycle ${uniqueBuckets[cohortStart] ?? 0}`,
          endLabel: `Cycle ${uniqueBuckets[cohortEnd] ?? 0}`,
          caption: "时间窗口 brush",
        })
      : "",
  });
  attachChartTooltip(cohort, {
    title: `聚焦周期 ${uniqueBuckets[cohortStart] ?? 0} - ${uniqueBuckets[cohortEnd] ?? 0}`,
    body: "悬停某个状态点，可以直接说明这一时点的状态占比。",
  });
  if (uniqueBuckets.length) {
    bindBrushControls(cohort, {
      key: "reviewCohort",
      length: uniqueBuckets.length,
      labelForIndex: (index) => `Cycle ${uniqueBuckets[index] ?? index}`,
      onChange: () => renderReviewSurface(),
    });
  }
  const focus = uniqueBuckets[state.cycleFocusIndex] ?? uniqueBuckets[0] ?? 0;
  motion.innerHTML = createChartFrame({
    legendEyebrow: "动态审阅视图",
    legendTitle: `周期 ${focus} · 状态迁移`,
    legendBody: "这块是给客户看的动态解释层，不需要读公式，也能看懂患者队列在做什么。",
    svg: makeMarkovMotionSvg(state.currentReview.cohort?.points || [], state.cycleFocusIndex),
  });
  attachChartTooltip(motion, {
    title: `周期 ${focus} · 状态迁移`,
    body: "悬停路径或节点，可以看到这一周期的流入、流出和状态占比。",
  });
  if (cohortNote) {
    cohortNote.textContent = describeCohortFocus(state.currentReview.cohort?.points || [], state.cycleFocusIndex);
  }
  trace.className = "trace-list";
  trace.innerHTML =
    (state.currentReview.trace?.events || [])
      .map(
        (event) => `
          <li>
            <strong>${event.event_type} · 周期 ${event.cycle_index ?? "-"}</strong>
            <span class="trace-meta">${event.from_state_code || "起始"} -> ${event.to_state_code || "-"}</span>
            <span class="trace-meta">时间 ${event.event_time}</span>
          </li>
        `
      )
      .join("") || "<div class='empty-state'>这个患者索引下还没有事件记录。</div>";

  artifacts.className = "artifact-list";
  artifacts.innerHTML =
    (state.currentReview.artifacts || [])
      .map(
        (artifact) => `
          <li>
            <strong>${artifact.artifact_type}</strong>
            <span class="list-meta">${artifact.storage_uri}</span>
            <span class="list-meta">${artifact.checksum || "无校验值"}</span>
          </li>
        `
      )
      .join("") || "<div class='empty-state'>这次运行暂时还没有产物。</div>";

  cycleLabel.textContent = `当前查看周期 · ${focus}`;
  motionLabel.textContent = `周期 ${focus} · 动态状态流回放`;
}

function toggleReviewAutoplay() {
  if (state.reviewAutoplay) {
    stopReviewAutoplay();
    return;
  }

  const buckets = getUniqueBucketTimes(state.currentReview?.cohort?.points || []);
  if (!buckets.length) {
    return;
  }

  state.reviewAutoplay = true;
  syncReviewAutoplayButton();
  state.reviewAutoplayTimer = window.setInterval(() => {
    state.cycleFocusIndex = (state.cycleFocusIndex + 1) % buckets.length;
    const slider = document.getElementById("review-cycle-slider");
    if (slider) {
      slider.value = String(state.cycleFocusIndex);
    }
    renderReviewSurface();
  }, 1500);
}

function stopReviewAutoplay() {
  state.reviewAutoplay = false;
  if (state.reviewAutoplayTimer) {
    window.clearInterval(state.reviewAutoplayTimer);
    state.reviewAutoplayTimer = null;
  }
  syncReviewAutoplayButton();
}

function syncReviewAutoplayButton() {
  const button = document.getElementById("review-autoplay");
  if (button) {
    button.textContent = state.reviewAutoplay ? "暂停状态流" : "播放状态流";
  }
}

function renderReviewCompareSummary(message) {
  const container = document.getElementById("review-compare-summary");
  if (!container) {
    return;
  }

  if (!message) {
    container.innerHTML = `
      <strong>比较视图待命</strong>
      <p class="helper">这里会告诉你最近两次 run 最明显的差异，避免你手工逐张图去比。</p>
    `;
    return;
  }

  container.innerHTML = `
    <strong>最近对比结果</strong>
    <p class="helper">${message}</p>
  `;
}

function compareLatestRuns() {
  const runs = getReviewableRuns();
  if (runs.length < 2) {
    renderReviewCompareSummary("至少需要两条已完成的运行结果，才值得打开比较视图。");
    return;
  }

  state.reviewCompareMode = state.reviewCompareMode === "compare" ? "single" : "compare";
  syncReviewCompareButton();

  if (state.reviewCompareMode === "single") {
    state.currentReviewComparison = null;
    renderReviewSurface();
    renderReviewCompareSummary("已经退出最近两次 run 的对比模式。现在重新回到当前 run 单视图。");
    return;
  }

  const [latest, previous] = runs;
  state.selectedRunId = latest.id;
  const previousCards = new Map((previous.summary_json?.cards || []).map((card) => [card.label, card]));
  const snippets = (latest.summary_json?.cards || [])
    .slice(0, 3)
    .map((card) => {
      const baseline = previousCards.get(card.label);
      if (!baseline) {
        return `${card.label} 新增为 ${formatMetricValue(card.value, card.unit)}`;
      }
      return `${card.label} 从 ${formatMetricValue(baseline.value, baseline.unit)} 变为 ${formatMetricValue(card.value, card.unit)}`;
    });

  loadReviewBundle().then(() => {
    renderReviewSurface();
    renderReviewCompareSummary(
      `最新 run ${shortId(latest.id)} 对比上一条 ${shortId(previous.id)}: ${snippets.join("；")}。`
    );
  });
}

function exportReviewSummary() {
  if (!state.currentReview) {
    renderReviewCompareSummary("先加载一条运行结果，再导出结果摘要。");
    return;
  }

  const cards = state.currentReview.run.summary_json?.cards || [];
  const lines = [
    "label,value,unit",
    ...cards.map((card) => `${escapeCsv(card.label)},${escapeCsv(card.value)},${escapeCsv(card.unit || "")}`),
  ];
  downloadBlob(`${state.currentReview.run.id}-summary.csv`, lines.join("\n"), "text/csv;charset=utf-8");
  renderReviewCompareSummary("结果摘要已导出为 CSV，可直接在 Excel 中打开。");
}

function exportCalibrationPack() {
  if (!state.currentReview) {
    renderReviewCompareSummary("先加载一条运行结果，再下载校准包。");
    return;
  }

  const pack = {
    run_id: state.currentReview.run.id,
    analysis_type: state.currentReview.run.analysis_type,
    probability_function_id: state.currentReview.run.input_snapshot_json?.probability_function_id || null,
    config_json: state.currentReview.run.config_json || {},
    artifacts: state.currentReview.artifacts || [],
    note: "校准包由结果审阅页导出。",
  };
  downloadBlob(
    `${state.currentReview.run.id}-calibration-pack.json`,
    JSON.stringify(pack, null, 2),
    "application/json;charset=utf-8"
  );
  renderReviewCompareSummary("校准包已下载。你可以把这份配置和产物一起交给团队复核。");
}

function exportReviewerBundle() {
  if (!state.currentReview) {
    renderReviewCompareSummary("先加载一条运行结果，再下载审阅包。");
    return;
  }

  const bundle = {
    run: state.currentReview.run,
    metric_catalog: state.currentReview.metricCatalog || [],
    artifacts: state.currentReview.artifacts || [],
    scatter_preview: state.currentReview.scatter || {},
    cohort_preview: state.currentReview.cohort || {},
    patient_trace: state.currentReview.trace || {},
    exported_at: new Date().toISOString(),
  };
  downloadBlob(
    `${state.currentReview.run.id}-reviewer-bundle.json`,
    JSON.stringify(bundle, null, 2),
    "application/json;charset=utf-8"
  );
  renderReviewCompareSummary("审阅包已下载。现在这条结果已经更接近可交付状态。");
}

async function copyRunMetadata() {
  if (!state.currentReview) {
    renderReviewCompareSummary("先加载一条运行结果，再复制元数据。");
    return;
  }

  const metadata = {
    run_id: state.currentReview.run.id,
    status: state.currentReview.run.status,
    analysis_type: state.currentReview.run.analysis_type,
    sampling_method: state.currentReview.run.sampling_method,
    engine_version: state.currentReview.run.engine_version,
    submitted_at: state.currentReview.run.submitted_at,
    finished_at: state.currentReview.run.finished_at,
  };
  const text = JSON.stringify(metadata, null, 2);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      renderReviewCompareSummary("运行元数据已复制到剪贴板。");
      return;
    }
  } catch (error) {
    console.warn("Clipboard write failed", error);
  }

  downloadBlob(`${state.currentReview.run.id}-metadata.json`, text, "application/json;charset=utf-8");
  renderReviewCompareSummary("当前环境无法直接写入剪贴板，已改为下载元数据文件。");
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
  writeStore(STORAGE_KEYS.series, [series, ...readStore(STORAGE_KEYS.series, [])]);
  return series;
}

async function createFunctionLive(payload) {
  return request(`/model-versions/${state.context.model_version_id}/probability-functions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function createFunctionOffline(payload) {
  const series = state.series.find((item) => String(item.id) === String(payload.source_ref_id));
  if (!series) {
    throw new Error("未找到对应的证据序列。");
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
  writeStore(STORAGE_KEYS.functions, [probabilityFunction, ...readStore(STORAGE_KEYS.functions, [])]);
  return probabilityFunction;
}

async function launchRunLive(payload) {
  const queuedRun = await request(`/model-versions/${state.context.model_version_id}/runs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const jobId = queuedRun.summary_json?.job_id;
  if (!jobId) {
    return queuedRun;
  }
  await waitForJob(jobId, "run");
  return request(`/runs/${queuedRun.id}`);
}

async function launchRunOffline(payload) {
  await sleep(850);
  return createRunOffline(payload);
}

function createRunOffline(payload) {
  const probabilityFunction = state.functions.find(
    (item) => String(item.id) === String(payload.config_json.probability_function_id)
  );
  if (!probabilityFunction) {
    throw new Error("未找到对应的概率函数。");
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
  writeStore(STORAGE_KEYS.runs, [run, ...readStore(STORAGE_KEYS.runs, [])]);
  return run;
}

async function createCalibrationConfigLive(payload) {
  return request(`/model-versions/${state.context.model_version_id}/calibration-configs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function createCalibrationConfigOffline(payload) {
  const config = {
    ...payload,
    id: makeId("calibration"),
    model_version_id: state.context.model_version_id,
    created_at: new Date().toISOString(),
  };
  writeStore(STORAGE_KEYS.calibrationConfigs, [config, ...readStore(STORAGE_KEYS.calibrationConfigs, [])]);
  return config;
}

async function launchCalibrationLive(configPayload, runPayload) {
  const config = await createCalibrationConfigLive(configPayload);
  const queuedRun = await request(`/calibration-configs/${config.id}/run`, {
    method: "POST",
    body: JSON.stringify(runPayload),
  });
  const jobId = queuedRun.summary_json?.job_id;
  if (jobId) {
    await waitForJob(jobId, "calibration");
  }
  const [run, result, artifacts] = await Promise.all([
    request(`/runs/${queuedRun.id}`),
    request(`/runs/${queuedRun.id}/calibration-result`),
    request(`/runs/${queuedRun.id}/artifacts`).catch(() => []),
  ]);
  return {
    config,
    run,
    result,
    artifacts,
    overlayArtifact: artifacts.find((artifact) => artifact.artifact_type === "calibration-overlay") || null,
  };
}

async function launchCalibrationOffline(configPayload, runPayload) {
  await sleep(900);
  const config = createCalibrationConfigOffline(configPayload);
  const bundle = buildOfflineCalibrationBundle(config, runPayload);
  const runStore = [bundle.run, ...readStore(STORAGE_KEYS.runs, [])];
  writeStore(STORAGE_KEYS.runs, runStore);
  return bundle;
}

async function waitForJob(jobId, kind) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const job = await request(`/jobs/${jobId}`);
    updateJobProgress(kind, job, attempt);
    if (job.status === "completed") {
      return job;
    }
    if (job.status === "failed") {
      throw new Error(job.error_log || `${kind} job failed`);
    }
    await sleep(450);
  }
  throw new Error("等待异步任务超时，请稍后重试。");
}

function updateJobProgress(kind, job, attempt) {
  const progress = job.status === "queued" ? Math.min(20 + attempt * 2, 42) : job.status === "running" ? Math.min(50 + attempt * 3, 92) : job.status === "completed" ? 100 : 0;
  setProgress(kind, progress);

  if (kind === "run") {
    renderRunStatus(
      job.status === "queued"
        ? "任务已排队，正在等待执行器接管这次分析。"
        : job.status === "running"
          ? "分析正在执行。平台正在计算队列轨迹、核心指标和结果页所需产物。"
          : "分析已完成。"
    );
  }

  if (kind === "calibration") {
    renderCalibrationStatus(
      job.status === "queued"
        ? "校准任务已排队，正在等待观察值对预测值拟合开始。"
        : job.status === "running"
          ? "校准正在运行。平台正在比较 target curve 与 predicted curve。"
          : "校准已完成。"
    );
  }
}

function startProgress(kind) {
  const timerKey = kind === "run" ? "runProgressTimer" : "calibrationProgressTimer";
  stopProgress(kind, 0);
  let progress = 8;
  state[timerKey] = window.setInterval(() => {
    progress = Math.min(progress + 6, 88);
    setProgress(kind, progress);
    if (progress >= 88) {
      window.clearInterval(state[timerKey]);
      state[timerKey] = null;
    }
  }, 180);
}

function stopProgress(kind, finalValue) {
  const timerKey = kind === "run" ? "runProgressTimer" : "calibrationProgressTimer";
  if (state[timerKey]) {
    window.clearInterval(state[timerKey]);
    state[timerKey] = null;
  }
  setProgress(kind, finalValue);
}

function setProgress(kind, value) {
  const progress = document.getElementById(kind === "run" ? "run-progress" : "calibration-progress");
  if (progress) {
    progress.style.width = `${value}%`;
  }
}

function debugFunctionOffline(functionId, t0, t1) {
  const fn = state.functions.find((item) => String(item.id) === String(functionId));
  if (!fn) {
    throw new Error("未找到对应的概率函数。");
  }
  return evaluateFunction(fn, t0, t1);
}

function getSelectedCohortRun() {
  return (
    state.runs.find(
      (item) =>
        String(item.id) === String(state.selectedRunId) && item.analysis_type === "cohort_markov"
    ) ||
    state.runs.find((item) => item.analysis_type === "cohort_markov")
  );
}

function getReviewableRuns() {
  return state.runs
    .filter((run) => run.analysis_type === "cohort_markov")
    .sort((left, right) => getRunTimestamp(right) - getRunTimestamp(left));
}

function getComparisonRun(runId) {
  const runs = getReviewableRuns();
  const index = runs.findIndex((run) => String(run.id) === String(runId));
  if (index === -1) {
    return runs[1] || null;
  }
  return runs[index + 1] || null;
}

function buildOfflineReviewBundle(runId, xMetric, yMetric, patientIndex) {
  const run = state.runs.find((item) => String(item.id) === String(runId));
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

function buildOfflineCalibrationBundle(config, runPayload) {
  const targetSeries = state.series.find((item) => String(item.id) === String(config.target_series_id));
  const probabilityFunction = state.functions.find(
    (item) => String(item.id) === String(runPayload.config_json.probability_function_id)
  );
  if (!targetSeries || !probabilityFunction) {
    throw new Error("校准必须同时具备目标证据和概率函数。");
  }

  const targetPoints = targetSeries.points
    .filter((point) => point.estimate_value !== null && point.estimate_value !== undefined)
    .sort((left, right) => Number(left.time_value) - Number(right.time_value))
    .map((point) => ({ time: Number(point.time_value), estimate: Number(point.estimate_value) }));

  const candidates = buildCalibrationCandidates(config.parameters || [], config.max_iterations);
  const history = [];
  let best = null;
  candidates.forEach((candidate, index) => {
    const evaluated = evaluateCalibrationCandidateOffline(probabilityFunction, targetPoints, runPayload, candidate);
    evaluated.iteration = index + 1;
    history.push(evaluated);
    if (!best || evaluated.objective < best.objective) {
      best = evaluated;
    }
  });

  if (!best) {
    throw new Error("校准过程中没有成功评估任何候选参数。");
  }

  const runId = makeId("cal-run");
  const overlayMetadata = {
    observed_points: targetPoints,
    predicted_points: best.predictedPoints,
    full_predicted_curve: best.sample.survivalPoints,
    best_params: best.parameterValues,
    best_objective_value: best.objective,
  };
  const overlayArtifact = {
    id: makeId("artifact"),
    run_id: runId,
    artifact_type: "calibration-overlay",
    storage_uri: "inline://calibration-overlay",
    checksum: "offline-calibration-overlay",
    metadata_json: overlayMetadata,
    created_at: new Date().toISOString(),
  };
  const run = {
    id: runId,
    project_id: state.context.project_id,
    model_version_id: state.context.model_version_id,
    analysis_type: "calibration",
    template_id: null,
    random_seed: 20260325,
    sampling_method: null,
    input_snapshot_json: {
      probability_function_id: probabilityFunction.id,
      target_series_id: targetSeries.id,
    },
    config_json: {
      calibration_config_id: config.id,
      ...runPayload.config_json,
    },
    summary_json: {
      message: "校准已完成",
      calibration_config_id: config.id,
      cards: [
        { label: "最佳 RMSE", value: best.objective, unit: "RMSE" },
        { label: "候选次数", value: history.length, unit: "个候选值" },
        { label: "目标证据", value: targetSeries.name, unit: "series" },
        { label: "事件比例校准值", value: best.parameterValues.event_scale || 1.0, unit: "scale" },
      ],
      best_params: best.parameterValues,
    },
    status: "completed",
    engine_version: "offline-demo-0.2.0",
    error_log: null,
    submitted_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    _artifacts: [overlayArtifact],
    _calibrationResult: null,
  };
  const result = {
    run_id: run.id,
    calibration_config_id: config.id,
    convergence_status: "completed",
    best_objective_value: best.objective,
    best_params_json: best.parameterValues,
    diagnostics_json: {
      history: history.slice(0, 40),
      optimizer_type: "deterministic_grid",
    },
    overlay_artifact_id: overlayArtifact.id,
    created_at: new Date().toISOString(),
  };
  run._calibrationResult = result;
  return {
    config,
    run,
    result,
    artifacts: [overlayArtifact],
    overlayArtifact,
  };
}

function evaluateCalibrationCandidateOffline(probabilityFunction, targetPoints, runPayload, parameterValues) {
  const config = {
    cycles: Number(runPayload.config_json.cycles || 15),
    sample_size: 1,
    initial_population: Number(runPayload.config_json.initial_population || 1000),
    pf_state_cost: 4800,
    pd_state_cost: 9100,
    transition_cost: 1800,
    pf_state_utility: 0.82,
    pd_state_utility: 0.53,
    pf_death_probability: Number(parameterValues.pf_death_probability ?? 0.01),
    pd_death_probability: Number(parameterValues.pd_death_probability ?? 0.08),
    cycle_length: 1,
    time_unit: probabilityFunction.time_unit,
  };
  const sample = runOfflineSample(
    probabilityFunction,
    config,
    {
      event_scale: Number(parameterValues.event_scale ?? 1),
      cost_multiplier: 1,
      utility_shift: 0,
    },
    0
  );

  const predictedPoints = targetPoints.map((point) => ({
    time: point.time,
    estimate: interpolateSeries(sample.survivalPoints, point.time, "alive_probability"),
  }));
  const squaredErrors = predictedPoints.map((predicted, index) => {
    const target = targetPoints[index];
    return (Number(target.estimate) - Number(predicted.estimate)) ** 2;
  });
  return {
    objective: round(Math.sqrt(sum(squaredErrors) / Math.max(squaredErrors.length, 1)), 8),
    parameterValues,
    predictedPoints,
    sample,
  };
}

function buildCalibrationCandidates(parameters, maxIterations) {
  const supported = (parameters || []).filter((parameter) =>
    ["event_scale", "pf_death_probability", "pd_death_probability"].includes(parameter.parameter_code)
  );
  if (!supported.length) {
    return [{ event_scale: 1 }];
  }
  const candidates = [];
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const candidate = {};
    supported.forEach((parameter, index) => {
      const lower = Number(parameter.lower_bound);
      const upper = Number(parameter.upper_bound);
      if (parameter.is_fixed) {
        candidate[parameter.parameter_code] = Number(parameter.initial_value ?? lower);
        return;
      }
      if (iteration === 0 && parameter.initial_value !== null && parameter.initial_value !== undefined) {
        candidate[parameter.parameter_code] = Number(parameter.initial_value);
        return;
      }
      const fraction = ((((iteration * (index + 2)) + (index * 3)) % maxIterations) + 0.5) / maxIterations;
      const value = lower + (upper - lower) * fraction;
      candidate[parameter.parameter_code] = round(clamp(value, lower, upper), 6);
    });
    candidates.push(candidate);
  }
  return candidates;
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
    { label: "基线成本", value: base.metrics.total_cost, unit: "USD/人" },
    { label: "基线 QALY", value: base.metrics.total_qalys, unit: "QALY" },
    { label: "基线生存年", value: base.metrics.life_years, unit: "LY" },
    {
      label: "平均事件概率",
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
      calibration_applied: {
        event_scale: payload.config_json.event_scale ?? 1,
        pf_death_probability: payload.config_json.pf_death_probability ?? 0.01,
        pd_death_probability: payload.config_json.pd_death_probability ?? 0.08,
      },
    },
    status: "completed",
    engine_version: "offline-demo-0.2.0",
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
  const survivalPoints = [{ time: 0, alive_probability: 1 }];

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
    survivalPoints.push({
      time: t1,
      alive_probability: round((progressionFree + progressedDisease) / config.initial_population, 6),
    });

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
    survivalPoints,
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
    element.innerHTML = `<option value="">暂无可用数据</option>`;
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

function setInputValue(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.value = String(value);
  }
}

function extractMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function getRunTimestamp(run) {
  return new Date(run.finished_at || run.started_at || run.submitted_at || run.created_at || 0).getTime();
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

function interpolateSeries(points, timeValue, key) {
  if (!points.length) {
    return 0;
  }
  if (timeValue <= Number(points[0].time)) {
    return Number(points[0][key] ?? 0);
  }
  if (timeValue >= Number(points.at(-1).time)) {
    return Number(points.at(-1)[key] ?? 0);
  }
  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];
    if (Number(left.time) <= timeValue && timeValue <= Number(right.time)) {
      const leftValue = Number(left[key] ?? 0);
      const rightValue = Number(right[key] ?? 0);
      if (Number(right.time) === Number(left.time)) {
        return rightValue;
      }
      const ratio = (timeValue - Number(left.time)) / (Number(right.time) - Number(left.time));
      return leftValue + (rightValue - leftValue) * ratio;
    }
  }
  return Number(points.at(-1)[key] ?? 0);
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

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

function formatShortNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return Number(value).toFixed(4).replace(/\.?0+$/, "");
}

function getUniqueBucketTimes(points) {
  return [...new Set(points.map((point) => Number(point.bucket_time)))].sort((left, right) => left - right);
}

function getCohortSnapshot(points, focusIndex) {
  const buckets = getUniqueBucketTimes(points);
  const focusBucket = buckets[focusIndex] ?? buckets[0] ?? 0;
  const findState = (stateCode) =>
    points.find((point) => Number(point.bucket_time) === focusBucket && point.state_code === stateCode) || {
      occupancy_count: 0,
      inflow_count: 0,
      outflow_count: 0,
    };
  return {
    focusBucket,
    progressionFree: findState("progression_free"),
    progressedDisease: findState("progressed_disease"),
    dead: findState("dead"),
  };
}

function describeCohortFocus(points, focusIndex) {
  if (!points.length) {
    return "结果准备好后，这里会用一句话提醒你当前 cycle 最关键的状态变化。";
  }

  const snapshot = getCohortSnapshot(points, focusIndex);
  const total =
    Number(snapshot.progressionFree.occupancy_count) +
    Number(snapshot.progressedDisease.occupancy_count) +
    Number(snapshot.dead.occupancy_count);
  const safeTotal = Math.max(total, 1);
  const pfShare = (Number(snapshot.progressionFree.occupancy_count) / safeTotal) * 100;
  const pdShare = (Number(snapshot.progressedDisease.occupancy_count) / safeTotal) * 100;
  const deadShare = (Number(snapshot.dead.occupancy_count) / safeTotal) * 100;

  if (deadShare >= 45) {
    return `周期 ${snapshot.focusBucket} 时死亡占比已到 ${deadShare.toFixed(0)}%，结果页应优先解释后期死亡累积是否符合预期。`;
  }
  if (pdShare >= pfShare) {
    return `周期 ${snapshot.focusBucket} 时已进展状态已追上或超过无进展状态，这通常意味着中后期转移开始成为主要驱动。`;
  }
  return `周期 ${snapshot.focusBucket} 时无进展状态仍占 ${pfShare.toFixed(0)}%，这说明早期状态仍由无进展人群主导。`;
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadBlob(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function makeEmptyChartSvg(label) {
  return `
    <svg viewBox="0 0 640 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">
      <rect x="0" y="0" width="640" height="320" fill="transparent"></rect>
      <text x="320" y="160" text-anchor="middle" fill="${PALETTE.muted}" font-family="IBM Plex Sans" font-size="16">${label}</text>
    </svg>
  `;
}

function makeProbabilityChartSvg(functionRecord, debug, options = {}) {
  if (!functionRecord?.options_json?.compiled_source?.points?.length) {
    return makeEmptyChartSvg("还没有可用的连续曲线");
  }
  const sourcePoints = functionRecord.options_json.compiled_source.points;
  const [startIndex, endIndex] = normalizeBrushWindow(
    options.startIndex ?? 0,
    options.endIndex ?? sourcePoints.length - 1,
    sourcePoints.length
  );
  const points = sourcePoints.slice(startIndex, endIndex + 1);
  const width = 640;
  const height = 320;
  const padding = 44;
  const minX = Number(points[0]?.time ?? 0);
  const maxX = Math.max(...points.map((point) => Number(point.time)), Number(debug.t1) + 1);
  const scaleX = (value) => padding + ((Number(value) - minX) / Math.max(maxX - minX, 1)) * (width - padding * 2);
  const scaleY = (value) => height - padding - value * (height - padding * 2);
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${scaleX(point.time)} ${scaleY(point.value)}`).join(" ");
  return `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Probability debug chart">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="${PALETTE.line}" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="${PALETTE.line}" />
      <path d="${line}" fill="none" stroke="${PALETTE.evidence}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" data-tip="这条线表示当前证据对象编译后的连续估计值。" data-legend-title="连续曲线" data-legend-body="悬停单个点可以看到每个月的估计值和当前窗口。" />
      <rect x="${scaleX(debug.t0)}" y="${padding}" width="${Math.max(scaleX(debug.t1) - scaleX(debug.t0), 2)}" height="${height - padding * 2}" fill="rgba(124, 92, 224, 0.12)" data-tip="当前正在验证区间 [${debug.t0}, ${debug.t1}]，区间事件概率为 ${(debug.probability * 100).toFixed(2)}%。" data-legend-title="当前验证区间" data-legend-body="区间 [${debug.t0}, ${debug.t1}] 的事件概率 ${(debug.probability * 100).toFixed(2)}%。" />
      ${points
        .map(
          (point) => `
            <circle cx="${scaleX(point.time)}" cy="${scaleY(point.value)}" r="4.5" fill="${PALETTE.evidence}" data-tip="Month ${point.time}: 估计值 ${Number(point.value).toFixed(3)}" data-legend-title="Month ${point.time}" data-legend-body="连续估计值 ${Number(point.value).toFixed(3)}。拖动下方 brush 可以聚焦任意时间窗口。" />
          `
        )
        .join("")}
      <text x="${padding}" y="${padding - 12}" fill="${PALETTE.muted}" font-family="IBM Plex Mono" font-size="12">证据连续曲线</text>
      <text x="${width - padding}" y="${padding - 12}" fill="${PALETTE.calibration}" text-anchor="end" font-family="IBM Plex Mono" font-size="12">区间概率 ${(debug.probability * 100).toFixed(2)}%</text>
    </svg>
  `;
}

function makeCalibrationOverlaySvg({ observedPoints, predictedPoints, fullPredictedCurve, bestObjectiveValue }, options = {}) {
  if (!observedPoints.length || !predictedPoints.length) {
    return makeEmptyChartSvg("还没有校准覆盖图");
  }

  const [startIndex, endIndex] = normalizeBrushWindow(
    options.startIndex ?? 0,
    options.endIndex ?? observedPoints.length - 1,
    observedPoints.length
  );
  const visibleObserved = observedPoints.slice(startIndex, endIndex + 1);
  const visiblePredicted = predictedPoints.slice(startIndex, endIndex + 1);
  const visibleStartTime = Number(visibleObserved[0]?.time ?? 0);
  const visibleEndTime = Number(visibleObserved.at(-1)?.time ?? visibleStartTime + 1);
  const visibleFullCurve = fullPredictedCurve.filter((point) => {
    const time = Number(point.time || point.time_value || 0);
    return time >= visibleStartTime && time <= visibleEndTime;
  });

  const width = 880;
  const height = 340;
  const padding = 48;
  const allTimes = [
    ...visibleObserved.map((point) => Number(point.time)),
    ...visibleFullCurve.map((point) => Number(point.time || point.time_value || 0)),
  ];
  const minX = Math.min(...allTimes, visibleStartTime);
  const maxX = Math.max(...allTimes, visibleEndTime, 1);
  const scaleX = (value) => padding + ((Number(value) - minX) / Math.max(maxX - minX, 1)) * (width - padding * 2);
  const scaleY = (value) => height - padding - Number(value) * (height - padding * 2);
  const predictionPath = visiblePredicted
    .map((point, index) => `${index === 0 ? "M" : "L"} ${scaleX(point.time)} ${scaleY(point.estimate)}`)
    .join(" ");
  const fullPath = visibleFullCurve.length
    ? visibleFullCurve
        .map((point, index) => `${index === 0 ? "M" : "L"} ${scaleX(point.time)} ${scaleY(point.alive_probability || point.estimate || 0)}`)
        .join(" ")
    : predictionPath;
  const upperBand = visiblePredicted
    .map((point) => `${scaleX(point.time)},${scaleY(clamp(Number(point.estimate) + 0.04, 0, 1))}`)
    .join(" ");
  const lowerBand = [...visiblePredicted]
    .reverse()
    .map((point) => `${scaleX(point.time)},${scaleY(clamp(Number(point.estimate) - 0.04, 0, 1))}`)
    .join(" ");

  return `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Calibration overlay">
      <defs>
        <linearGradient id="overlay-glow" x1="0" x2="1">
          <stop offset="0%" stop-color="${PALETTE.calibration}" stop-opacity="0.28" />
          <stop offset="100%" stop-color="${PALETTE.simulation}" stop-opacity="0.12" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="${PALETTE.line}" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="${PALETTE.line}" />
      <polygon points="${upperBand} ${lowerBand}" fill="url(#overlay-glow)" data-tip="带状区域表示预测曲线周围的可接受不确定范围。" />
      <path d="${fullPath}" fill="none" stroke="rgba(124, 92, 224, 0.28)" stroke-width="2" stroke-dasharray="8 8" data-tip="完整预测曲线，覆盖所有周期。" data-legend-title="完整预测趋势" data-legend-body="浅色虚线表示更长时间窗下的整体预测趋势。" />
      <path d="${predictionPath}" fill="none" stroke="${PALETTE.calibration}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" data-tip="校准后的预测曲线。RMSE ${Number(bestObjectiveValue).toFixed(4)}。" data-legend-title="校准后预测曲线" data-legend-body="当前窗口内的拟合 RMSE ${Number(bestObjectiveValue).toFixed(4)}。">
        <animate attributeName="stroke-dasharray" values="0 420;420 0" dur="1.4s" begin="0s" fill="freeze" />
      </path>
      ${visibleObserved
        .map(
          (point) => `
            <circle cx="${scaleX(point.time)}" cy="${scaleY(point.estimate)}" r="5.5" fill="${PALETTE.review}" data-tip="真实观察 · Month ${point.time}: ${Number(point.estimate).toFixed(3)}" data-legend-title="Month ${point.time} 真实观察" data-legend-body="观察值 ${Number(point.estimate).toFixed(3)}。客户可以直接看到真实数据落点。" />
          `
        )
        .join("")}
      ${visiblePredicted
        .map(
          (point) => `
            <circle cx="${scaleX(point.time)}" cy="${scaleY(point.estimate)}" r="4.5" fill="${PALETTE.calibration}" data-tip="模型预测 · Month ${point.time}: ${Number(point.estimate).toFixed(3)}" data-legend-title="Month ${point.time} 模型预测" data-legend-body="预测值 ${Number(point.estimate).toFixed(3)}。可和真实观察点直接对读。" />
          `
        )
        .join("")}
      <text x="${padding}" y="${padding - 16}" fill="${PALETTE.muted}" font-family="IBM Plex Mono" font-size="12">真实观察点</text>
      <text x="${width - padding}" y="${padding - 16}" fill="${PALETTE.calibration}" text-anchor="end" font-family="IBM Plex Mono" font-size="12">校准预测曲线 · RMSE ${Number(bestObjectiveValue).toFixed(4)}</text>
      <text x="${width - padding}" y="${height - 14}" fill="${PALETTE.muted}" text-anchor="end" font-family="IBM Plex Mono" font-size="12">时间</text>
    </svg>
  `;
}

function makeScatterSvg(points, xMetric, yMetric, options = {}) {
  const comparePoints = options.comparePoints || [];
  if (!points.length && !comparePoints.length) {
    return makeEmptyChartSvg("还没有散点结果");
  }
  const width = 640;
  const height = 320;
  const padding = 48;
  const allPoints = [...comparePoints, ...points];
  const xs = allPoints.map((point) => point.x);
  const ys = allPoints.map((point) => point.y);
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
      ${comparePoints
        .map(
          (point) => `
            <circle cx="${scaleX(point.x)}" cy="${scaleY(point.y)}" r="5.2" fill="${PALETTE.evidence}" fill-opacity="0.34" stroke="rgba(47,111,237,0.52)" stroke-width="1.4" data-tip="对比 run · 样本 ${point.sample_index} · ${DEFAULT_METRIC_OPTIONS.find((item) => item.key === xMetric)?.label || xMetric}: ${formatShortNumber(point.x)} · ${DEFAULT_METRIC_OPTIONS.find((item) => item.key === yMetric)?.label || yMetric}: ${formatShortNumber(point.y)}" data-legend-title="对比 run 样本 ${point.sample_index}" data-legend-body="蓝色空心点表示上一条运行的样本位置，用来直接和当前 run 对比。" />
          `
        )
        .join("")}
      ${points
        .map(
          (point) => `
            <circle cx="${scaleX(point.x)}" cy="${scaleY(point.y)}" r="6" fill="${PALETTE.review}" fill-opacity="0.82" data-tip="当前 run · 样本 ${point.sample_index} · ${DEFAULT_METRIC_OPTIONS.find((item) => item.key === xMetric)?.label || xMetric}: ${formatShortNumber(point.x)} · ${DEFAULT_METRIC_OPTIONS.find((item) => item.key === yMetric)?.label || yMetric}: ${formatShortNumber(point.y)}" data-legend-title="当前 run 样本 ${point.sample_index}" data-legend-body="橙色点代表当前运行结果。切换对比模式时，可以直接看到样本带有没有整体平移。">
              <animate attributeName="r" values="5.2;6.8;5.2" dur="2.6s" repeatCount="indefinite" />
            </circle>
          `
        )
        .join("")}
      <text x="${padding}" y="${padding - 12}" fill="${PALETTE.muted}" font-family="IBM Plex Mono" font-size="12">${DEFAULT_METRIC_OPTIONS.find((item) => item.key === yMetric)?.label || yMetric}</text>
      <text x="${width - padding}" y="${height - 14}" text-anchor="end" fill="${PALETTE.muted}" font-family="IBM Plex Mono" font-size="12">${DEFAULT_METRIC_OPTIONS.find((item) => item.key === xMetric)?.label || xMetric}</text>
    </svg>
  `;
}

function makeCohortSvg(points, focusIndex, options = {}) {
  if (!points.length) {
    return makeEmptyChartSvg("还没有队列轨迹");
  }

  const width = 640;
  const height = 320;
  const padding = 44;
  const allBuckets = getUniqueBucketTimes(points);
  const [startIndex, endIndex] = normalizeBrushWindow(
    options.startIndex ?? 0,
    options.endIndex ?? allBuckets.length - 1,
    allBuckets.length
  );
  const buckets = allBuckets.slice(startIndex, endIndex + 1);
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
  const maxY = Math.max(...grouped.flatMap((entry) => entry.series), 1);
  const scaleX = (value) =>
    padding +
    ((value - buckets[0]) / Math.max((buckets.at(-1) || 1) - buckets[0], 1)) * (width - padding * 2);
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
          const dots = entry.series
            .map(
              (value, index) => `
                <circle cx="${scaleX(buckets[index])}" cy="${scaleY(value)}" r="4.4" fill="${colors[entry.stateCode]}" data-tip="周期 ${buckets[index]} · ${entry.stateCode}: ${Math.round(value)} 人" data-legend-title="周期 ${buckets[index]} · ${entry.stateCode}" data-legend-body="这一时点共有 ${Math.round(value)} 人处于 ${entry.stateCode}。拖动 brush 可以聚焦早期或后期状态变化。" />
              `
            )
            .join("");
          return `<g><path d="${path}" fill="none" stroke="${colors[entry.stateCode]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" data-tip="${entry.stateCode} 的整体状态轨迹" data-legend-title="${entry.stateCode} 轨迹" data-legend-body="这条线展示所选时间窗口内 ${entry.stateCode} 的总体变化趋势。" />${dots}</g>`;
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

function makeMarkovMotionSvg(points, focusIndex) {
  if (!points.length) {
    return makeEmptyChartSvg("还没有动态状态流");
  }

  const buckets = getUniqueBucketTimes(points);
  const focusBucket = buckets[focusIndex] ?? buckets.at(-1) ?? 0;
  const rows = {
    progression_free: points.find(
      (point) => Number(point.bucket_time) === focusBucket && point.state_code === "progression_free"
    ) || { occupancy_count: 0, inflow_count: 0, outflow_count: 0 },
    progressed_disease: points.find(
      (point) => Number(point.bucket_time) === focusBucket && point.state_code === "progressed_disease"
    ) || { occupancy_count: 0, inflow_count: 0, outflow_count: 0 },
    dead: points.find(
      (point) => Number(point.bucket_time) === focusBucket && point.state_code === "dead"
    ) || { occupancy_count: 0, inflow_count: 0, outflow_count: 0 },
  };

  const total =
    Number(rows.progression_free.occupancy_count) +
    Number(rows.progressed_disease.occupancy_count) +
    Number(rows.dead.occupancy_count);
  const safeTotal = Math.max(total, 1);
  const pfToPd = Number(rows.progressed_disease.inflow_count || 0);
  const pdToDead = Number(rows.progressed_disease.outflow_count || 0);
  const pfToDead = Math.max(Number(rows.dead.inflow_count || 0) - pdToDead, 0);
  const pfWidth = Math.max(140, (Number(rows.progression_free.occupancy_count) / safeTotal) * 240);
  const pdWidth = Math.max(140, (Number(rows.progressed_disease.occupancy_count) / safeTotal) * 220);
  const deadWidth = Math.max(140, (Number(rows.dead.occupancy_count) / safeTotal) * 220);
  const suffix = String(focusIndex).replace(/\D/g, "");
  const pfPdPath = `pf-pd-${suffix}`;
  const pfDeadPath = `pf-dead-${suffix}`;
  const pdDeadPath = `pd-dead-${suffix}`;

  return `
    <svg viewBox="0 0 920 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dynamic Markov motion">
      <defs>
        <linearGradient id="flow-bg-${suffix}" x1="0" x2="1">
          <stop offset="0%" stop-color="rgba(47, 111, 237, 0.16)" />
          <stop offset="100%" stop-color="rgba(24, 166, 160, 0.08)" />
        </linearGradient>
        <filter id="glow-${suffix}" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <path id="${pfPdPath}" d="M 268 158 C 370 118, 462 118, 558 158" />
        <path id="${pfDeadPath}" d="M 256 186 C 392 258, 528 286, 742 258" />
        <path id="${pdDeadPath}" d="M 612 186 C 684 202, 722 218, 770 228" />
      </defs>
      <rect x="0" y="0" width="920" height="360" rx="28" fill="rgba(255,255,255,0.02)" />
      <rect x="46" y="54" width="${pfWidth}" height="122" rx="28" fill="${PALETTE.evidenceSoft}" stroke="rgba(47,111,237,0.22)" data-tip="无进展状态：当前 ${Math.round(Number(rows.progression_free.occupancy_count || 0))} 人；本周期流出 ${Math.round(Number(rows.progression_free.outflow_count || 0))} 人。" />
      <rect x="362" y="72" width="${pdWidth}" height="110" rx="28" fill="${PALETTE.simulationSoft}" stroke="rgba(24,166,160,0.22)" data-tip="进展后状态：当前 ${Math.round(Number(rows.progressed_disease.occupancy_count || 0))} 人；本周期流入 ${Math.round(Number(rows.progressed_disease.inflow_count || 0))} 人。" />
      <rect x="678" y="124" width="${deadWidth}" height="102" rx="28" fill="${PALETTE.reviewSoft}" stroke="rgba(217,133,44,0.24)" data-tip="死亡状态：当前 ${Math.round(Number(rows.dead.occupancy_count || 0))} 人；本周期新增死亡 ${Math.round(Number(rows.dead.inflow_count || 0))} 人。" />

      <circle cx="102" cy="114" r="12" fill="${PALETTE.evidence}" filter="url(#glow-${suffix})">
        <animate attributeName="r" values="11;15;11" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="418" cy="124" r="11" fill="${PALETTE.simulation}" filter="url(#glow-${suffix})">
        <animate attributeName="r" values="10;13.5;10" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="734" cy="174" r="10" fill="${PALETTE.review}" filter="url(#glow-${suffix})">
        <animate attributeName="r" values="9;12.5;9" dur="2.1s" repeatCount="indefinite" />
      </circle>

      <path d="M 268 158 C 370 118, 462 118, 558 158" fill="none" stroke="rgba(124,92,224,0.18)" stroke-width="${Math.max(10, pfToPd / 20)}" stroke-linecap="round" data-tip="本周期从无进展转入进展后：${Math.round(pfToPd)} 人" />
      <path d="M 256 186 C 392 258, 528 286, 742 258" fill="none" stroke="rgba(217,133,44,0.16)" stroke-width="${Math.max(8, pfToDead / 20)}" stroke-linecap="round" data-tip="本周期从无进展直接死亡：${Math.round(pfToDead)} 人" />
      <path d="M 612 186 C 684 202, 722 218, 770 228" fill="none" stroke="rgba(217,133,44,0.22)" stroke-width="${Math.max(9, pdToDead / 18)}" stroke-linecap="round" data-tip="本周期从进展后转入死亡：${Math.round(pdToDead)} 人" />

      <circle r="6.8" fill="${PALETTE.calibration}">
        <animateMotion dur="1.6s" repeatCount="indefinite">
          <mpath href="#${pfPdPath}" />
        </animateMotion>
        <animate attributeName="opacity" values="0;1;1;0" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle r="5.8" fill="${PALETTE.review}">
        <animateMotion dur="2.4s" repeatCount="indefinite">
          <mpath href="#${pfDeadPath}" />
        </animateMotion>
        <animate attributeName="opacity" values="0;1;1;0" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle r="5.2" fill="${PALETTE.review}">
        <animateMotion dur="1.8s" repeatCount="indefinite">
          <mpath href="#${pdDeadPath}" />
        </animateMotion>
        <animate attributeName="opacity" values="0;1;1;0" dur="1.8s" repeatCount="indefinite" />
      </circle>

      <text x="78" y="102" fill="${PALETTE.evidence}" font-family="IBM Plex Mono" font-size="12">无进展</text>
      <text x="78" y="142" fill="${PALETTE.ink}" font-family="Newsreader" font-size="34" font-weight="700">${Math.round(Number(rows.progression_free.occupancy_count || 0))}</text>
      <text x="78" y="166" fill="${PALETTE.muted}" font-family="IBM Plex Sans" font-size="14">当前仍处于稳定状态</text>

      <text x="394" y="120" fill="${PALETTE.simulation}" font-family="IBM Plex Mono" font-size="12">进展后</text>
      <text x="394" y="154" fill="${PALETTE.ink}" font-family="Newsreader" font-size="30" font-weight="700">${Math.round(Number(rows.progressed_disease.occupancy_count || 0))}</text>
      <text x="394" y="176" fill="${PALETTE.muted}" font-family="IBM Plex Sans" font-size="14">仍存活但已进展</text>

      <text x="710" y="172" fill="${PALETTE.review}" font-family="IBM Plex Mono" font-size="12">死亡</text>
      <text x="710" y="204" fill="${PALETTE.ink}" font-family="Newsreader" font-size="28" font-weight="700">${Math.round(Number(rows.dead.occupancy_count || 0))}</text>
      <text x="710" y="224" fill="${PALETTE.muted}" font-family="IBM Plex Sans" font-size="14">吸收状态</text>

      <text x="300" y="116" fill="${PALETTE.calibration}" font-family="IBM Plex Mono" font-size="12">${Math.round(pfToPd)} 人转入进展后</text>
      <text x="502" y="286" fill="${PALETTE.review}" font-family="IBM Plex Mono" font-size="12">${Math.round(pfToDead)} 人直接死亡</text>
      <text x="656" y="206" fill="${PALETTE.review}" font-family="IBM Plex Mono" font-size="12">${Math.round(pdToDead)} 人在进展后死亡</text>

      <text x="46" y="32" fill="${PALETTE.muted}" font-family="IBM Plex Mono" font-size="12">周期 ${focusBucket} · 动态状态流回放</text>
      <text x="874" y="32" text-anchor="end" fill="${PALETTE.muted}" font-family="IBM Plex Mono" font-size="12">总人数 ${Math.round(safeTotal)}</text>
    </svg>
  `;
}

function attachChartTooltip(container, fallbackLegend = null) {
  if (!container) {
    return;
  }

  const interactiveNodes = [...container.querySelectorAll("[data-tip]")];
  const existing = container.querySelector(".chart-tooltip");
  if (!interactiveNodes.length) {
    existing?.remove();
    return;
  }

  const tooltip = existing || document.createElement("div");
  tooltip.className = "chart-tooltip";
  tooltip.hidden = true;
  if (!existing) {
    container.appendChild(tooltip);
  }

  const legendTitle = container.querySelector('[data-chart-legend="title"]');
  const legendBody = container.querySelector('[data-chart-legend="body"]');
  const resetLegend = () => {
    if (legendTitle && fallbackLegend?.title) {
      legendTitle.textContent = fallbackLegend.title;
    }
    if (legendBody && fallbackLegend?.body) {
      legendBody.textContent = fallbackLegend.body;
    }
  };
  const syncLegend = (target) => {
    if (!target) {
      resetLegend();
      return;
    }
    const nextTitle = target.getAttribute("data-legend-title");
    const nextBody = target.getAttribute("data-legend-body");
    if (legendTitle && nextTitle) {
      legendTitle.textContent = nextTitle;
    }
    if (legendBody && nextBody) {
      legendBody.textContent = nextBody;
    }
  };
  resetLegend();

  const position = (event) => {
    const rect = container.getBoundingClientRect();
    const eventX = typeof event.clientX === "number" ? event.clientX - rect.left : rect.width / 2;
    const eventY = typeof event.clientY === "number" ? event.clientY - rect.top : rect.height / 2;
    const x = clamp(eventX, 28, rect.width - 28);
    const y = clamp(eventY, 18, rect.height - 18);
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  };

  const show = (event) => {
    const text = event.currentTarget?.getAttribute("data-tip");
    if (!text) {
      return;
    }
    tooltip.textContent = text;
    tooltip.hidden = false;
    tooltip.classList.add("is-visible");
    syncLegend(event.currentTarget);
    position(event);
  };

  const hide = () => {
    tooltip.hidden = true;
    tooltip.classList.remove("is-visible");
    resetLegend();
  };

  interactiveNodes.forEach((node) => {
    node.setAttribute("tabindex", "0");
    node.addEventListener("pointerenter", show);
    node.addEventListener("pointermove", position);
    node.addEventListener("pointerleave", hide);
    node.addEventListener("focus", show);
    node.addEventListener("blur", hide);
  });
}

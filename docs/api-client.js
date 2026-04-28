/**
 * HEOR Modeling Platform - API Client
 * 
 * 统一的API调用层，支持：
 * - 离线模式 (demo数据)
 * - 在线模式 (真实API)
 * - 自动降级
 */

const HEOR_API = (() => {
  // 配置
  const config = {
    baseUrl: localStorage.getItem('heor-api-base') || 'http://127.0.0.1:8000/api/v1',
    timeout: 30000,
    retryCount: 2,
    offlineMode: true,  // 默认离线模式
  };

  // 状态
  let isConnected = false;
  let connectionChecked = false;

  // ============ 核心请求方法 ============

  async function request(endpoint, options = {}) {
    // If already in offline mode, throw immediately
    if (config.offlineMode) {
      throw new APIError(0, 'Offline mode');
    }
    
    const url = `${config.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new APIError(response.status, error.message || error.detail || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Switch to offline mode for any API error
      if (!config.offlineMode) {
        console.warn('[HEOR API] API unavailable, switching to offline mode:', error.message || error.status);
        config.offlineMode = true;
      }
      
      if (error.name === 'AbortError') {
        throw new APIError(0, 'API timeout - offline mode');
      }
      
      throw new APIError(0, 'API error - offline mode');
    }
  }

  class APIError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
      this.name = 'APIError';
    }
  }

  // ============ 连接管理 ============

  async function checkConnection() {
    try {
      const result = await request('/health');
      isConnected = true;
      connectionChecked = true;
      config.offlineMode = false;
      return { connected: true, version: result.version };
    } catch (error) {
      isConnected = false;
      connectionChecked = true;
      config.offlineMode = true;
      console.log('[HEOR API] Switched to offline mode');
      return { connected: false, offline: true };
    }
  }

  function setApiBase(url) {
    config.baseUrl = url;
    localStorage.setItem('heor-api-base', url);
    connectionChecked = false;
  }

  function getApiBase() {
    return config.baseUrl;
  }

  function isOffline() {
    return config.offlineMode;
  }

  // ============ 证据管理 ============

  async function uploadEvidence(projectId, evidenceData) {
    if (config.offlineMode) {
      console.log('[HEOR API] Using offline mode for uploadEvidence');
      return DemoData.createEvidence(evidenceData);
    }
    try {
      return await request(`/projects/${projectId}/evidence`, {
        method: 'POST',
        body: JSON.stringify(evidenceData),
      });
    } catch (error) {
      console.log('[HEOR API] API failed, falling back to offline mode');
      config.offlineMode = true;
      return DemoData.createEvidence(evidenceData);
    }
  }

  async function getEvidenceList(projectId) {
    if (config.offlineMode) {
      return DemoData.getEvidenceList();
    }
    return request(`/projects/${projectId}/evidence`);
  }

  async function validateEvidence(evidenceId) {
    if (config.offlineMode) {
      return DemoData.validateEvidence(evidenceId);
    }
    return request(`/evidence/${evidenceId}/validate`, { method: 'POST' });
  }

  // ============ 概率函数 ============

  async function generateProbabilityFunction(evidenceId, params = {}) {
    if (config.offlineMode) {
      return DemoData.generateProbabilityFunction(evidenceId);
    }
    return request('/probability-functions', {
      method: 'POST',
      body: JSON.stringify({ evidence_id: evidenceId, ...params }),
    });
  }

  async function getProbabilityFunctions() {
    if (config.offlineMode) {
      return DemoData.getProbabilityFunctions();
    }
    return request('/probability-functions');
  }

  // ============ 运行管理 ============

  async function createRun(runConfig) {
    if (config.offlineMode) {
      return DemoData.createRun(runConfig);
    }
    return request('/runs', {
      method: 'POST',
      body: JSON.stringify(runConfig),
    });
  }

  async function getRun(runId) {
    if (config.offlineMode) {
      return DemoData.getRun(runId);
    }
    return request(`/runs/${runId}`);
  }

  async function getRunResults(runId) {
    if (config.offlineMode) {
      return DemoData.getRunResults(runId);
    }
    return request(`/runs/${runId}/results`);
  }

  async function listRuns() {
    if (config.offlineMode) {
      return DemoData.listRuns();
    }
    return request('/runs');
  }

  // ============ 校准 ============

  async function runCalibration(params) {
    if (config.offlineMode) {
      return DemoData.runCalibration(params);
    }
    return request('/calibration', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async function getCalibrationResults(calibrationId) {
    if (config.offlineMode) {
      return DemoData.getCalibrationResults(calibrationId);
    }
    return request(`/calibration/${calibrationId}`);
  }

  // ============ 分析 ============

  async function calculateICER(runId) {
    if (config.offlineMode) {
      return DemoData.calculateICER();
    }
    return request(`/analytics/icer/${runId}`);
  }

  async function runPSA(runId, params) {
    if (config.offlineMode) {
      return DemoData.runPSA(params);
    }
    return request(`/analytics/psa/${runId}`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async function getCEAC(runId) {
    if (config.offlineMode) {
      return DemoData.getCEAC();
    }
    return request(`/analytics/ceac/${runId}`);
  }

  // ============ 演示数据 ============

  async function loadDemo() {
    if (config.offlineMode) {
      return DemoData.loadFullDemo();
    }
    return request('/demo/load', { method: 'POST' });
  }

  // ============ Demo数据生成器 ============

  const DemoData = {
    _counter: 1000,
    _evidence: [],
    _runs: [],
    _calibrations: [],

    generateId() {
      return `demo-${++this._counter}-${Date.now().toString(36)}`;
    },

    createEvidence(data) {
      const evidence = {
        id: this.generateId(),
        name: data.name || 'Demo Evidence',
        type: data.type || 'km_survival',
        status: 'validated',
        points: data.points || this._defaultKMPoints(),
        created_at: new Date().toISOString(),
      };
      this._evidence.push(evidence);
      return evidence;
    },

    getEvidenceList() {
      return this._evidence;
    },

    validateEvidence(evidenceId) {
      return {
        valid: true,
        message: 'Evidence validated successfully',
        checks: {
          fields_complete: true,
          time_aligned: true,
          values_in_range: true,
          sufficient_points: true,
        }
      };
    },

    generateProbabilityFunction(evidenceId) {
      const pf = {
        id: this.generateId(),
        evidence_id: evidenceId,
        type: 'monthly_transition',
        cycle_length: 1,
        cycle_unit: 'month',
        probabilities: this._generateProbabilities(),
        created_at: new Date().toISOString(),
      };
      return pf;
    },

    getProbabilityFunctions() {
      return [{
        id: 'pf-demo-1',
        name: 'NSCLC PFS Probability Function',
        type: 'monthly_transition',
        cycle_length: 1,
      }];
    },

    createRun(config) {
      const run = {
        id: this.generateId(),
        status: 'completed',
        config: {
          model_type: config.model_type || 'markov',
          cycles: config.cycles || 60,
          initial_population: config.initial_population || 1000,
          sample_size: config.sample_size || 1000,
          discount_rate: config.discount_rate || 0.03,
          ...config,
        },
        results: this._generateRunResults(config),
        created_at: new Date().toISOString(),
      };
      this._runs.push(run);
      return run;
    },

    getRun(runId) {
      return this._runs.find(r => r.id === runId) || this._runs[0];
    },

    getRunResults(runId) {
      const run = this.getRun(runId);
      return run ? run.results : this._generateRunResults({});
    },

    listRuns() {
      return this._runs;
    },

    runCalibration(params) {
      const calibration = {
        id: this.generateId(),
        status: 'completed',
        rmse: 0.018,
        observed: params.observed || [0.98, 0.91, 0.82, 0.69, 0.57, 0.45, 0.33, 0.23],
        predicted: {
          base: [0.98, 0.90, 0.81, 0.70, 0.58, 0.46, 0.34, 0.24],
          low: [0.98, 0.93, 0.86, 0.77, 0.68, 0.59, 0.51, 0.42],
          high: [0.98, 0.87, 0.75, 0.62, 0.50, 0.39, 0.28, 0.19],
        },
        band: {
          upper: [0.99, 0.93, 0.85, 0.74, 0.63, 0.52, 0.41, 0.30],
          lower: [0.97, 0.87, 0.77, 0.66, 0.54, 0.40, 0.28, 0.19],
        },
        created_at: new Date().toISOString(),
      };
      this._calibrations.push(calibration);
      return calibration;
    },

    getCalibrationResults(calibrationId) {
      return this._calibrations.find(c => c.id === calibrationId) || this._calibrations[0];
    },

    calculateICER() {
      return {
        icer: 29742,
        incremental_cost: 18440,
        incremental_qaly: 0.62,
        wtp_threshold: 50000,
        below_threshold: true,
        net_monetary_benefit: 12860,
        interpretation: 'Intervention is cost-effective at $50,000/QALY threshold',
      };
    },

    runPSA(params) {
      const n = params.n_simulations || 1000;
      const results = [];
      const rng = this._createRNG(42);
      
      for (let i = 0; i < n; i++) {
        const cost = 18440 + rng.normal() * 5000;
        const qaly = 0.62 + rng.normal() * 0.15;
        results.push({
          cost,
          qaly,
          icer: cost / qaly,
          cost_effective: cost / qaly < 50000,
        });
      }

      const ceProb = results.filter(r => r.cost_effective).length / n;

      return {
        n_simulations: n,
        mean_icer: results.reduce((s, r) => s + r.icer, 0) / n,
        cost_effective_probability: ceProb,
        icer_ci: {
          lower: this._percentile(results.map(r => r.icer), 0.025),
          upper: this._percentile(results.map(r => r.icer), 0.975),
        },
        scatter_data: results.slice(0, 500).map(r => [r.qaly, r.cost]),
      };
    },

    getCEAC() {
      const thresholds = [0, 25000, 50000, 75000, 100000, 150000, 200000];
      const probabilities = [0.05, 0.22, 0.45, 0.62, 0.75, 0.85, 0.92];
      return { thresholds, probabilities };
    },

    loadFullDemo() {
      // Create demo evidence
      this.createEvidence({
        name: 'NSCLC PFS - KEYNOTE-010',
        type: 'km_survival',
        points: this._defaultKMPoints(),
      });

      // Create demo run
      this.createRun({
        model_type: 'partitioned_survival',
        cycles: 60,
        intervention: 'Pembrolizumab',
        comparator: 'Docetaxel',
      });

      return {
        status: 'loaded',
        evidence_count: this._evidence.length,
        run_count: this._runs.length,
        message: 'Demo data loaded successfully',
      };
    },

    // Helper methods
    _defaultKMPoints() {
      return [
        { time: 0, estimate: 1.0 },
        { time: 1, estimate: 0.968 },
        { time: 2, estimate: 0.936 },
        { time: 3, estimate: 0.902 },
        { time: 4, estimate: 0.868 },
        { time: 5, estimate: 0.835 },
        { time: 6, estimate: 0.802 },
        { time: 8, estimate: 0.732 },
        { time: 10, estimate: 0.664 },
        { time: 12, estimate: 0.598 },
        { time: 15, estimate: 0.512 },
        { time: 18, estimate: 0.438 },
        { time: 21, estimate: 0.368 },
        { time: 24, estimate: 0.304 },
      ];
    },

    _generateProbabilities() {
      const probs = [];
      for (let m = 0; m < 60; m++) {
        const basePFS = Math.exp(-0.085 * m);
        probs.push({
          cycle: m + 1,
          pfs_to_pd: 0.085 * Math.exp(-0.02 * m),
          pfs_to_death: 0.012,
          pd_to_death: 0.065,
          pfs_survival: basePFS,
        });
      }
      return probs;
    },

    _generateRunResults(config) {
      const cycles = config.cycles || 60;
      const pop = config.initial_population || 1000;
      
      // Generate cohort trace
      const trace = [];
      let pfs = pop, pd = 0, dead = 0;
      
      for (let m = 0; m < cycles; m++) {
        const newPD = pfs * 0.085 * Math.exp(-0.02 * m);
        const pfsDeath = pfs * 0.012;
        const pdDeath = pd * 0.065;
        
        pfs = pfs - newPD - pfsDeath;
        pd = pd + newPD - pdDeath;
        dead = dead + pfsDeath + pdDeath;
        
        trace.push({
          cycle: m + 1,
          pfs: Math.max(0, Math.round(pfs)),
          pd: Math.max(0, Math.round(pd)),
          dead: Math.round(dead),
        });
      }

      return {
        cohort_trace: trace,
        summary: {
          total_cost: 485000,
          total_qaly: 1.42,
          icer: 29742,
          life_years: 2.15,
        },
        cost_effectiveness: {
          intervention: { cost: 485000, qaly: 1.42 },
          comparator: { cost: 198000, qaly: 0.85 },
          incremental: { cost: 287000, qaly: 0.57 },
        },
      };
    },

    _createRNG(seed) {
      let s = seed;
      return {
        normal() {
          s = (s * 16807) % 2147483647;
          const u1 = s / 2147483647;
          s = (s * 16807) % 2147483647;
          const u2 = s / 2147483647;
          return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        }
      };
    },

    _percentile(arr, p) {
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.floor(sorted.length * p);
      return sorted[idx];
    },
  };

  // ============ 公共API ============

  return {
    // Connection
    checkConnection,
    setApiBase,
    getApiBase,
    isOffline: () => config.offlineMode,

    // Evidence
    uploadEvidence,
    getEvidenceList,
    validateEvidence,

    // Probability Functions
    generateProbabilityFunction,
    getProbabilityFunctions,

    // Runs
    createRun,
    getRun,
    getRunResults,
    listRuns,

    // Calibration
    runCalibration,
    getCalibrationResults,

    // Analytics
    calculateICER,
    runPSA,
    getCEAC,

    // Demo
    loadDemo,

    // Config
    get config() { return { ...config }; },
  };
})();

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  HEOR_API.checkConnection().then(result => {
    console.log('[HEOR API]', result.connected ? 'Connected' : 'Offline mode');
    
    // Update UI indicators
    const indicator = document.getElementById('connection-status');
    if (indicator) {
      indicator.textContent = result.connected ? 'API Connected' : 'Offline Demo Mode';
      indicator.className = result.connected ? 'status-connected' : 'status-offline';
    }
  });
});

// Export for modules
if (typeof module !== 'undefined') {
  module.exports = HEOR_API;
}

/**
 * HEOR Modeling Platform - 证据工作流集成
 * 
 * 完整流程：证据上传 → 概率函数 → 校准 → 模拟 → 结果
 */

const EvidenceWorkflow = (() => {
  // 工作流状态
  const state = {
    currentStep: 1,
    projectId: null,
    evidence: null,
    probabilityFunction: null,
    calibration: null,
    run: null,
    results: null,
  };

  // ============ Step 1: 证据上传 ============

  async function uploadEvidence(formData) {
    console.log('[Workflow] Step 1: 上传证据');
    
    try {
      // 解析CSV数据
      const points = parseCSV(formData.csvData);
      
      // 调用API
      const evidence = await HEOR_API.uploadEvidence(formData.projectId || 'default', {
        name: formData.name,
        type: formData.type,
        points: points,
        metadata: {
          source: formData.source,
          time_unit: formData.timeUnit || 'month',
        }
      });

      // 验证证据
      const validation = await HEOR_API.validateEvidence(evidence.id);
      
      if (!validation.valid) {
        throw new Error(validation.message || 'Evidence validation failed');
      }

      state.evidence = evidence;
      state.currentStep = 2;
      
      updateUI('evidence', {
        success: true,
        evidence: evidence,
        validation: validation,
      });

      return evidence;
    } catch (error) {
      console.error('[Workflow] Evidence upload failed:', error);
      updateUI('evidence', { success: false, error: error.message });
      throw error;
    }
  }

  function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const header = lines[0].split(',').map(h => h.trim());
    
    const points = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 3) {
        points.push({
          seq_no: parseInt(values[0]),
          time_value: parseFloat(values[1]),
          estimate_value: parseFloat(values[2]),
        });
      }
    }
    
    return points;
  }

  // ============ Step 2: 生成概率函数 ============

  async function generateProbabilityFunction(options = {}) {
    console.log('[Workflow] Step 2: 生成概率函数');
    
    if (!state.evidence) {
      throw new Error('请先上传证据');
    }

    try {
      const pf = await HEOR_API.generateProbabilityFunction(state.evidence.id, {
        cycle_length: options.cycleLength || 1,
        cycle_unit: options.cycleUnit || 'month',
        distribution: options.distribution || 'weibull',
        extrapolation: options.extrapolation || true,
        max_cycles: options.maxCycles || 60,
      });

      state.probabilityFunction = pf;
      state.currentStep = 3;
      
      updateUI('probability', {
        success: true,
        probabilityFunction: pf,
      });

      return pf;
    } catch (error) {
      console.error('[Workflow] Probability function generation failed:', error);
      updateUI('probability', { success: false, error: error.message });
      throw error;
    }
  }

  // ============ Step 3: 临床校准 ============

  async function runCalibration(params) {
    console.log('[Workflow] Step 3: 临床校准');
    
    if (!state.probabilityFunction) {
      throw new Error('请先生成概率函数');
    }

    try {
      const calibration = await HEOR_API.runCalibration({
        probability_function_id: state.probabilityFunction.id,
        observed_data: params.observedData || generateDefaultObserved(),
        method: params.method || 'least_squares',
        iterations: params.iterations || 1000,
        tolerance: params.tolerance || 0.001,
      });

      state.calibration = calibration;
      state.currentStep = 4;
      
      updateUI('calibration', {
        success: true,
        calibration: calibration,
      });

      return calibration;
    } catch (error) {
      console.error('[Workflow] Calibration failed:', error);
      updateUI('calibration', { success: false, error: error.message });
      throw error;
    }
  }

  function generateDefaultObserved() {
    // 生成默认的观察数据（用于演示）
    return [
      { time: 0, value: 1.0 },
      { time: 3, value: 0.90 },
      { time: 6, value: 0.80 },
      { time: 9, value: 0.68 },
      { time: 12, value: 0.58 },
      { time: 15, value: 0.50 },
      { time: 18, value: 0.42 },
      { time: 21, value: 0.35 },
      { time: 24, value: 0.28 },
    ];
  }

  // ============ Step 4: 运行模拟 ============

  async function runSimulation(config) {
    console.log('[Workflow] Step 4: 运行模拟');
    
    if (!state.calibration) {
      throw new Error('请先完成校准');
    }

    try {
      // 创建运行
      const run = await HEOR_API.createRun({
        model_type: config.modelType || 'markov',
        probability_function_id: state.probabilityFunction.id,
        calibration_id: state.calibration.id,
        cycles: config.cycles || 60,
        initial_population: config.population || 1000,
        sample_size: config.sampleSize || 1000,
        discount_rate: config.discountRate || 0.03,
        intervention: config.intervention || '新药A',
        comparator: config.comparator || '标准治疗',
        costs: config.costs || getDefaultCosts(),
        utilities: config.utilities || getDefaultUtilities(),
      });

      // 获取结果
      const results = await HEOR_API.getRunResults(run.id);
      
      state.run = run;
      state.results = results;
      state.currentStep = 5;
      
      updateUI('simulation', {
        success: true,
        run: run,
        results: results,
      });

      return { run, results };
    } catch (error) {
      console.error('[Workflow] Simulation failed:', error);
      updateUI('simulation', { success: false, error: error.message });
      throw error;
    }
  }

  function getDefaultCosts() {
    return {
      intervention: {
        drug_cost: 28000,
        administration: 1200,
        monitoring: 2500,
        ae_management: 5000,
      },
      comparator: {
        drug_cost: 8500,
        administration: 800,
        monitoring: 2500,
        ae_management: 12000,
      },
    };
  }

  function getDefaultUtilities() {
    return {
      pfs: 0.65,
      pd: 0.45,
      ae_disutility: -0.15,
    };
  }

  // ============ Step 5: 获取结果 ============

  async function getResults() {
    console.log('[Workflow] Step 5: 获取结果');
    
    if (!state.run) {
      throw new Error('请先运行模拟');
    }

    try {
      const [icer, psa, ceac] = await Promise.all([
        HEOR_API.calculateICER(state.run.id),
        HEOR_API.runPSA(state.run.id, { n_simulations: 1000 }),
        HEOR_API.getCEAC(state.run.id),
      ]);

      const fullResults = {
        run: state.run,
        icer: icer,
        psa: psa,
        ceac: ceac,
        cohort_trace: state.results.cohort_trace,
      };

      updateUI('results', {
        success: true,
        results: fullResults,
      });

      return fullResults;
    } catch (error) {
      console.error('[Workflow] Get results failed:', error);
      updateUI('results', { success: false, error: error.message });
      throw error;
    }
  }

  // ============ 完整流程 ============

  async function runFullWorkflow(formData, simulationConfig) {
    console.log('[Workflow] Starting full workflow...');
    
    try {
      // Step 1: 上传证据
      await uploadEvidence(formData);
      
      // Step 2: 生成概率函数
      await generateProbabilityFunction();
      
      // Step 3: 校准
      await runCalibration({});
      
      // Step 4: 运行模拟
      await runSimulation(simulationConfig);
      
      // Step 5: 获取结果
      const results = await getResults();
      
      console.log('[Workflow] Full workflow completed!');
      return results;
    } catch (error) {
      console.error('[Workflow] Full workflow failed:', error);
      throw error;
    }
  }

  // ============ UI更新 ============

  function updateUI(step, data) {
    // 触发自定义事件
    const event = new CustomEvent('heor:workflow:update', {
      detail: { step, data, state }
    });
    document.dispatchEvent(event);
    
    // 更新进度指示器
    updateProgressIndicator(step, data.success);
    
    // 更新步骤状态
    updateStepStatus(step, data);
  }

  function updateProgressIndicator(step, success) {
    const stepMap = {
      'evidence': 1,
      'probability': 2,
      'calibration': 3,
      'simulation': 4,
      'results': 5,
    };
    
    const stepNum = stepMap[step];
    const indicator = document.querySelector(`.step-${stepNum}`);
    
    if (indicator) {
      indicator.classList.remove('active', 'completed', 'error');
      if (success) {
        indicator.classList.add('completed');
      } else {
        indicator.classList.add('error');
      }
    }
  }

  function updateStepStatus(step, data) {
    const statusElement = document.getElementById(`${step}-status`);
    if (statusElement) {
      if (data.success) {
        statusElement.innerHTML = '<span class="status-success">✓ 完成</span>';
      } else {
        statusElement.innerHTML = `<span class="status-error">✗ ${data.error}</span>`;
      }
    }
  }

  // ============ 状态管理 ============

  function getState() {
    return { ...state };
  }

  function reset() {
    state.currentStep = 1;
    state.projectId = null;
    state.evidence = null;
    state.probabilityFunction = null;
    state.calibration = null;
    state.run = null;
    state.results = null;
  }

  function canProceedToStep(step) {
    switch (step) {
      case 1: return true;
      case 2: return !!state.evidence;
      case 3: return !!state.probabilityFunction;
      case 4: return !!state.calibration;
      case 5: return !!state.run;
      default: return false;
    }
  }

  // ============ 导出 ============

  function exportResults(format = 'json') {
    if (!state.results) {
      throw new Error('没有可导出的结果');
    }

    const data = {
      metadata: {
        exported_at: new Date().toISOString(),
        platform: 'HEOR Modeling Platform',
        version: '1.0.0',
      },
      evidence: state.evidence,
      probability_function: state.probabilityFunction,
      calibration: state.calibration,
      run: state.run,
      results: state.results,
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `heor-results-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    return data;
  }

  // ============ 公共API ============

  return {
    uploadEvidence,
    generateProbabilityFunction,
    runCalibration,
    runSimulation,
    getResults,
    runFullWorkflow,
    getState,
    reset,
    canProceedToStep,
    exportResults,
  };
})();

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Workflow] Evidence Workflow initialized');
  
  // 监听工作流更新事件
  document.addEventListener('heor:workflow:update', (event) => {
    const { step, data, state } = event.detail;
    console.log(`[Workflow] Step ${step} updated:`, data.success ? 'success' : 'failed');
  });
});

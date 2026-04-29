/**
 * HEOR Modeling Platform - 引导系统
 * 
 * 借鉴: Intercom (产品导览), Appcues (步骤引导), Pendo (工具提示)
 */

const HEOR_TOUR = (() => {
  let currentStep = 0;
  let steps = [];
  let overlay = null;
  let tooltip = null;

  const defaultSteps = {
    'index': [
      { target: '.hero-copy', title: '欢迎使用 HEOR Modeling Platform', content: '这是一个任务驱动型卫生经济学建模平台，从证据上传到结果审阅，一条流程完成。', position: 'right' },
      { target: '.entry-grid', title: '三种进入方式', content: '根据您的需求选择最合适的入口：首次体验、开始建模、或直接查看结果。', position: 'top' },
      { target: '.hero-stage', title: '示例运行', content: '这里展示了一条完整的示例运行结果，包括校准图、ICER和PSA。', position: 'left' },
      { target: '#workflow-rail', title: '四步流程', content: '上传证据 → 概率函数 → 校准 → 模拟 → 审阅，每一步都有清晰的输入输出。', position: 'top' },
    ],
    'evidence': [
      { target: '.topbar', title: '导航栏', content: '通过顶部导航栏可以在不同功能模块之间切换。', position: 'bottom' },
      { target: '[data-step="1"]', title: '步骤 1: 上传证据', content: '从这里开始，上传KM表或生存数据，平台会自动校验并生成证据对象。', position: 'right' },
    ],
    'calibration': [
      { target: '.topbar', title: '临床校准', content: '这一步将模型预测与真实世界观察数据进行拟合。', position: 'bottom' },
    ],
    'simulation': [
      { target: '.topbar', title: '运行模拟', content: '执行Markov模型和概率敏感性分析。', position: 'bottom' },
    ],
    'review': [
      { target: '.topbar', title: '结果审阅', content: '查看ICER、PSA散点图、CEAC曲线和队列轨迹。', position: 'bottom' },
    ],
  };

  function init() {
    createOverlay();
    createTooltip();
    
    // Auto-start tour for first-time visitors
    const hasVisited = localStorage.getItem('heor-tour-completed');
    if (!hasVisited) {
      const page = getCurrentPage();
      if (page === 'index') {
        setTimeout(() => start(page), 1000);
      }
    }
  }

  function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '') || 'index';
    return page;
  }

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'tour-overlay';
    overlay.addEventListener('click', end);
    document.body.appendChild(overlay);
  }

  function createTooltip() {
    tooltip = document.createElement('div');
    tooltip.className = 'tour-tooltip';
    tooltip.innerHTML = `
      <div class="tour-tooltip-header">
        <h4 class="tour-tooltip-title"></h4>
        <button class="tour-tooltip-close" onclick="HEOR_TOUR.end()">×</button>
      </div>
      <div class="tour-tooltip-content"></div>
      <div class="tour-tooltip-footer">
        <span class="tour-progress"></span>
        <div class="tour-actions">
          <button class="tour-btn tour-btn-secondary" onclick="HEOR_TOUR.prev()">上一步</button>
          <button class="tour-btn tour-btn-primary" onclick="HEOR_TOUR.next()">下一步</button>
        </div>
      </div>
    `;
    document.body.appendChild(tooltip);
  }

  function start(page) {
    steps = defaultSteps[page] || defaultSteps['index'];
    currentStep = 0;
    overlay.classList.add('active');
    showStep();
  }

  function showStep() {
    if (currentStep >= steps.length) {
      end();
      return;
    }

    const step = steps[currentStep];
    const target = document.querySelector(step.target);
    
    if (!target) {
      next();
      return;
    }

    // Highlight target
    const rect = target.getBoundingClientRect();
    overlay.style.clipPath = `polygon(
      0% 0%, 100% 0%, 100% 100%, 0% 100%,
      0% ${rect.top}px, ${rect.left}px ${rect.top}px,
      ${rect.left}px ${rect.bottom}px, ${rect.right}px ${rect.bottom}px,
      ${rect.right}px ${rect.top}px, 0% ${rect.top}px
    )`;

    // Position tooltip
    const tooltipRect = tooltip.getBoundingClientRect();
    let top, left;
    
    switch (step.position) {
      case 'top':
        top = rect.top - tooltipRect.height - 16;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = rect.bottom + 16;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        left = rect.left - tooltipRect.width - 16;
        break;
      case 'right':
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        left = rect.right + 16;
        break;
    }

    tooltip.style.top = `${Math.max(10, top)}px`;
    tooltip.style.left = `${Math.max(10, left)}px`;
    tooltip.classList.add('visible');

    // Update content
    tooltip.querySelector('.tour-tooltip-title').textContent = step.title;
    tooltip.querySelector('.tour-tooltip-content').textContent = step.content;
    tooltip.querySelector('.tour-progress').textContent = `${currentStep + 1} / ${steps.length}`;

    // Update buttons
    const prevBtn = tooltip.querySelector('.tour-btn-secondary');
    const nextBtn = tooltip.querySelector('.tour-btn-primary');
    prevBtn.style.display = currentStep === 0 ? 'none' : 'block';
    nextBtn.textContent = currentStep === steps.length - 1 ? '完成' : '下一步';
  }

  function next() {
    currentStep++;
    if (currentStep >= steps.length) {
      end();
    } else {
      showStep();
    }
  }

  function prev() {
    if (currentStep > 0) {
      currentStep--;
      showStep();
    }
  }

  function end() {
    overlay.classList.remove('active');
    tooltip.classList.remove('visible');
    localStorage.setItem('heor-tour-completed', 'true');
  }

  return {
    init,
    start,
    next,
    prev,
    end,
  };
})();

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  HEOR_TOUR.init();
});

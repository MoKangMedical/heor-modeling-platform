/**
 * HEOR Modeling Platform - 高级交互系统
 * 
 * 借鉴: VS Code (Command Palette), Linear (Keyboard shortcuts), 
 *       Notion (Slash commands), Bloomberg (Quick actions)
 */

const HEOR_UX = (() => {
  // ============ Command Palette ============
  const commands = [
    { id: 'home', label: '返回首页', labelEn: 'Go Home', shortcut: 'G H', action: () => navigate('./index.html') },
    { id: 'evidence', label: '上传证据', labelEn: 'Upload Evidence', shortcut: 'G E', action: () => navigate('./evidence.html') },
    { id: 'calibration', label: '临床校准', labelEn: 'Calibration', shortcut: 'G C', action: () => navigate('./calibration.html') },
    { id: 'simulation', label: '运行模拟', labelEn: 'Simulation', shortcut: 'G S', action: () => navigate('./simulation.html') },
    { id: 'review', label: '结果审阅', labelEn: 'Review', shortcut: 'G R', action: () => navigate('./review.html') },
    { id: 'workflow', label: '完整流程', labelEn: 'Workflow', shortcut: 'G W', action: () => navigate('./workflow-demo.html') },
    { id: 'example', label: '示例运行', labelEn: 'Example Run', shortcut: 'G X', action: () => navigate('./example-run.html') },
    { id: 'platform', label: '平台细节', labelEn: 'Platform', shortcut: 'G P', action: () => navigate('./platform.html') },
    { id: 'theme', label: '切换主题', labelEn: 'Toggle Theme', shortcut: 'T', action: toggleTheme },
    { id: 'lang', label: '切换语言', labelEn: 'Toggle Language', shortcut: 'L', action: toggleLang },
    { id: 'fullscreen', label: '全屏模式', labelEn: 'Fullscreen', shortcut: 'F', action: toggleFullscreen },
    { id: 'help', label: '键盘快捷键', labelEn: 'Keyboard Shortcuts', shortcut: '?', action: showShortcuts },
  ];

  let paletteOpen = false;
  let selectedIndex = 0;
  let shortcutBuffer = '';
  let shortcutTimer = null;

  function init() {
    createPalette();
    createToastContainer();
    bindKeyboard();
    addScrollProgress();
    addBackToTop();
    console.log('[HEOR UX] Advanced UX system initialized');
  }

  // ============ Command Palette UI ============
  function createPalette() {
    const palette = document.createElement('div');
    palette.id = 'cmd-palette';
    palette.className = 'cmd-palette';
    palette.innerHTML = `
      <div class="cmd-palette-backdrop"></div>
      <div class="cmd-palette-dialog">
        <div class="cmd-palette-header">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" opacity="0.5">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
          <input type="text" placeholder="输入命令或搜索..." id="cmd-input" autocomplete="off" spellcheck="false">
          <kbd>ESC</kbd>
        </div>
        <div class="cmd-palette-list" id="cmd-list"></div>
        <div class="cmd-palette-footer">
          <span><kbd>↑↓</kbd> 导航</span>
          <span><kbd>Enter</kbd> 执行</span>
          <span><kbd>Esc</kbd> 关闭</span>
        </div>
      </div>
    `;
    document.body.appendChild(palette);

    // Bind events
    const backdrop = palette.querySelector('.cmd-palette-backdrop');
    const input = document.getElementById('cmd-input');
    
    backdrop.addEventListener('click', closePalette);
    input.addEventListener('input', filterCommands);
    input.addEventListener('keydown', handlePaletteKeydown);
  }

  function openPalette() {
    const palette = document.getElementById('cmd-palette');
    if (!palette) return;
    
    paletteOpen = true;
    selectedIndex = 0;
    palette.classList.add('open');
    
    const input = document.getElementById('cmd-input');
    input.value = '';
    input.focus();
    
    renderCommands(commands);
    document.body.style.overflow = 'hidden';
  }

  function closePalette() {
    const palette = document.getElementById('cmd-palette');
    if (!palette) return;
    
    paletteOpen = false;
    palette.classList.remove('open');
    document.body.style.overflow = '';
  }

  function filterCommands() {
    const input = document.getElementById('cmd-input');
    const query = input.value.toLowerCase();
    
    const filtered = commands.filter(cmd => 
      cmd.label.toLowerCase().includes(query) || 
      cmd.labelEn.toLowerCase().includes(query) ||
      cmd.id.includes(query)
    );
    
    selectedIndex = 0;
    renderCommands(filtered);
  }

  function renderCommands(cmds) {
    const list = document.getElementById('cmd-list');
    if (!list) return;
    
    const lang = localStorage.getItem('heor-lang') || 'zh';
    
    list.innerHTML = cmds.map((cmd, i) => `
      <div class="cmd-item ${i === selectedIndex ? 'selected' : ''}" data-index="${i}" data-id="${cmd.id}">
        <span class="cmd-label">${lang === 'en' ? cmd.labelEn : cmd.label}</span>
        <kbd class="cmd-shortcut">${cmd.shortcut}</kbd>
      </div>
    `).join('');

    // Bind click events
    list.querySelectorAll('.cmd-item').forEach(item => {
      item.addEventListener('click', () => {
        const cmd = commands.find(c => c.id === item.dataset.id);
        if (cmd) {
          closePalette();
          cmd.action();
        }
      });
    });
  }

  function handlePaletteKeydown(e) {
    const list = document.getElementById('cmd-list');
    const items = list?.querySelectorAll('.cmd-item') || [];
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items);
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection(items);
        break;
      case 'Enter':
        e.preventDefault();
        const selected = items[selectedIndex];
        if (selected) {
          const cmd = commands.find(c => c.id === selected.dataset.id);
          if (cmd) {
            closePalette();
            cmd.action();
          }
        }
        break;
      case 'Escape':
        closePalette();
        break;
    }
  }

  function updateSelection(items) {
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === selectedIndex);
    });
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }

  // ============ Keyboard Shortcuts ============
  function bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Command palette: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (paletteOpen) closePalette();
        else openPalette();
        return;
      }

      // Don't handle shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      // Single key shortcuts
      switch (e.key) {
        case '?':
          if (!e.shiftKey) return;
          showShortcuts();
          break;
        case 'Escape':
          if (paletteOpen) closePalette();
          break;
      }

      // G + key navigation
      clearTimeout(shortcutTimer);
      shortcutBuffer += e.key.toUpperCase();
      
      shortcutTimer = setTimeout(() => {
        const cmd = commands.find(c => c.shortcut === shortcutBuffer);
        if (cmd) {
          cmd.action();
          toast(`导航到: ${cmd.label}`, 'info');
        }
        shortcutBuffer = '';
      }, 500);
    });
  }

  // ============ Toast Notifications ============
  function createToastContainer() {
    if (document.getElementById('toast-container')) return;
    
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  function toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4v5M8 11v1"/></svg>',
      success: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5 8l2 2 4-4"/></svg>',
      error: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5 5l6 6M11 5l-6 6"/></svg>',
      warning: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L1 14h14L8 1z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 6v4M8 12v1"/></svg>',
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));
    
    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ============ Theme Toggle ============
  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('heor-theme', isDark ? 'dark' : 'light');
    toast(isDark ? '已切换到深色模式' : '已切换到浅色模式', 'info');
  }

  // ============ Language Toggle ============
  function toggleLang() {
    const btn = document.getElementById('langToggle');
    if (btn) btn.click();
  }

  // ============ Fullscreen ============
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      toast('已进入全屏模式', 'info');
    } else {
      document.exitFullscreen();
      toast('已退出全屏模式', 'info');
    }
  }

  // ============ Navigation ============
  function navigate(url) {
    window.location.href = url;
  }

  // ============ Scroll Progress ============
  function addScrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = `${progress}%`;
    });
  }

  // ============ Back to Top ============
  function addBackToTop() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.id = 'back-to-top';
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3l-7 7h4v7h6v-7h4l-7-7z"/></svg>';
    btn.title = '回到顶部';
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 300);
    });
  }

  // ============ Shortcuts Help ============
  function showShortcuts() {
    const lang = localStorage.getItem('heor-lang') || 'zh';
    const isZh = lang === 'zh';
    
    const shortcuts = [
      { keys: 'Ctrl/Cmd + K', desc: isZh ? '打开命令面板' : 'Open Command Palette' },
      { keys: 'G → H', desc: isZh ? '返回首页' : 'Go Home' },
      { keys: 'G → E', desc: isZh ? '上传证据' : 'Upload Evidence' },
      { keys: 'G → C', desc: isZh ? '临床校准' : 'Calibration' },
      { keys: 'G → S', desc: isZh ? '运行模拟' : 'Simulation' },
      { keys: 'G → R', desc: isZh ? '结果审阅' : 'Review' },
      { keys: 'G → W', desc: isZh ? '完整流程' : 'Workflow' },
      { keys: 'Shift + ?', desc: isZh ? '显示快捷键帮助' : 'Show Shortcuts Help' },
      { keys: 'Esc', desc: isZh ? '关闭弹窗' : 'Close Dialog' },
    ];

    const modal = document.createElement('div');
    modal.className = 'shortcuts-modal';
    modal.innerHTML = `
      <div class="shortcuts-backdrop"></div>
      <div class="shortcuts-dialog">
        <h3>${isZh ? '键盘快捷键' : 'Keyboard Shortcuts'}</h3>
        <div class="shortcuts-list">
          ${shortcuts.map(s => `
            <div class="shortcut-item">
              <kbd>${s.keys}</kbd>
              <span>${s.desc}</span>
            </div>
          `).join('')}
        </div>
        <button class="shortcuts-close">${isZh ? '关闭' : 'Close'}</button>
      </div>
    `;

    document.body.appendChild(modal);
    
    modal.querySelector('.shortcuts-backdrop').addEventListener('click', () => modal.remove());
    modal.querySelector('.shortcuts-close').addEventListener('click', () => modal.remove());
    
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  // ============ Public API ============
  return {
    init,
    toast,
    openPalette,
    closePalette,
    toggleTheme,
    toggleLang,
    commands,
  };
})();

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  HEOR_UX.init();
});

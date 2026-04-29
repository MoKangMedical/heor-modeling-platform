/**
 * HEOR Modeling Platform - 高级图表系统
 * 
 * 借鉴: Bloomberg Terminal (数据密度), Tableau (交互), D3.js (动画)
 */

const HEOR_CHARTS = (() => {
  const colors = {
    primary: '#2f6fed',
    secondary: '#7c5ce0',
    success: '#2e9d6b',
    warning: '#c78a24',
    danger: '#e94560',
    navy: '#1b345d',
    muted: '#5f6f83',
    grid: 'rgba(19, 32, 51, 0.08)',
  };

  // ============ ICER Plane Chart ============
  function renderICERPlane(container, data) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 600, 400);

    // Grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(60 + i * 48, 40);
      ctx.lineTo(60 + i * 48, 360);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(60, 40 + i * 32);
      ctx.lineTo(540, 40 + i * 32);
      ctx.stroke();
    }

    // WTP line
    ctx.strokeStyle = colors.danger;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(60, 360);
    ctx.lineTo(540, 40);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scatter points
    if (data && data.points) {
      data.points.forEach((p, i) => {
        const x = 60 + (p.qaly / 2) * 480;
        const y = 360 - (p.cost / 100000) * 320;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.cost_effective ? colors.success : colors.danger;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }

    // Mean point
    if (data && data.mean) {
      const mx = 60 + (data.mean.qaly / 2) * 480;
      const my = 360 - (data.mean.cost / 100000) * 320;
      
      ctx.beginPath();
      ctx.arc(mx, my, 8, 0, Math.PI * 2);
      ctx.fillStyle = colors.primary;
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Labels
    ctx.fillStyle = colors.navy;
    ctx.font = '12px IBM Plex Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('增量 QALY', 300, 395);
    
    ctx.save();
    ctx.translate(15, 200);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('增量成本 (¥)', 0, 0);
    ctx.restore();

    // Title
    ctx.fillStyle = colors.navy;
    ctx.font = 'bold 14px IBM Plex Sans, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('成本-效果平面图', 60, 25);

    return canvas;
  }

  // ============ CEAC Chart ============
  function renderCEAC(container, data) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 600, 400);

    // Grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(60 + i * 48, 40);
      ctx.lineTo(60 + i * 48, 360);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(60, 40 + i * 32);
      ctx.lineTo(540, 40 + i * 32);
      ctx.stroke();
    }

    // CEAC curve
    if (data && data.thresholds && data.probabilities) {
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      data.thresholds.forEach((t, i) => {
        const x = 60 + (t / 200000) * 480;
        const y = 360 - data.probabilities[i] * 320;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Fill area under curve
      ctx.fillStyle = `${colors.primary}20`;
      ctx.beginPath();
      ctx.moveTo(60, 360);
      data.thresholds.forEach((t, i) => {
        const x = 60 + (t / 200000) * 480;
        const y = 360 - data.probabilities[i] * 320;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(540, 360);
      ctx.closePath();
      ctx.fill();
    }

    // Labels
    ctx.fillStyle = colors.navy;
    ctx.font = '12px IBM Plex Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('支付意愿阈值 (¥/QALY)', 300, 395);
    
    ctx.save();
    ctx.translate(15, 200);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('成本效果可接受概率', 0, 0);
    ctx.restore();

    // Title
    ctx.fillStyle = colors.navy;
    ctx.font = 'bold 14px IBM Plex Sans, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('成本效果可接受曲线 (CEAC)', 60, 25);

    return canvas;
  }

  // ============ Cohort Trace Chart ============
  function renderCohortTrace(container, data) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 300;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 600, 300);

    // Grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(60 + i * 80, 30);
      ctx.lineTo(60 + i * 80, 260);
      ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(60, 30 + i * 46);
      ctx.lineTo(540, 30 + i * 46);
      ctx.stroke();
    }

    // Stacked area chart
    if (data && data.trace) {
      const cycles = data.trace.length;
      const dx = 480 / cycles;

      // PFS area
      ctx.fillStyle = `${colors.primary}40`;
      ctx.beginPath();
      ctx.moveTo(60, 260);
      data.trace.forEach((t, i) => {
        ctx.lineTo(60 + i * dx, 260 - (t.pfs / 1000) * 230);
      });
      ctx.lineTo(60 + cycles * dx, 260);
      ctx.closePath();
      ctx.fill();

      // PD area
      ctx.fillStyle = `${colors.warning}40`;
      ctx.beginPath();
      data.trace.forEach((t, i) => {
        const y = 260 - (t.pfs / 1000) * 230;
        ctx.lineTo(60 + i * dx, y);
      });
      for (let i = cycles - 1; i >= 0; i--) {
        const t = data.trace[i];
        const y = 260 - ((t.pfs + t.pd) / 1000) * 230;
        ctx.lineTo(60 + i * dx, y);
      }
      ctx.closePath();
      ctx.fill();

      // Lines
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.trace.forEach((t, i) => {
        const x = 60 + i * dx;
        const y = 260 - (t.pfs / 1000) * 230;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.strokeStyle = colors.warning;
      ctx.beginPath();
      data.trace.forEach((t, i) => {
        const x = 60 + i * dx;
        const y = 260 - ((t.pfs + t.pd) / 1000) * 230;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Legend
    ctx.fillStyle = colors.primary;
    ctx.fillRect(400, 15, 12, 12);
    ctx.fillStyle = colors.navy;
    ctx.font = '11px IBM Plex Sans, sans-serif';
    ctx.fillText('无进展 (PFS)', 418, 25);

    ctx.fillStyle = colors.warning;
    ctx.fillRect(400, 33, 12, 12);
    ctx.fillStyle = colors.navy;
    ctx.fillText('已进展 (PD)', 418, 43);

    // Title
    ctx.fillStyle = colors.navy;
    ctx.font = 'bold 14px IBM Plex Sans, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('患者队列轨迹', 60, 20);

    return canvas;
  }

  // ============ Calibration Chart ============
  function renderCalibration(container, data) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 600, 400);

    // Grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(60 + i * 48, 40);
      ctx.lineTo(60 + i * 48, 360);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(60, 40 + i * 32);
      ctx.lineTo(540, 40 + i * 32);
      ctx.stroke();
    }

    // Perfect calibration line
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(60, 360);
    ctx.lineTo(540, 40);
    ctx.stroke();
    ctx.setLineDash([]);

    // Uncertainty band
    if (data && data.band) {
      ctx.fillStyle = `${colors.primary}15`;
      ctx.beginPath();
      data.band.upper.forEach((v, i) => {
        const x = 60 + (i / (data.band.upper.length - 1)) * 480;
        const y = 360 - v * 320;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      for (let i = data.band.lower.length - 1; i >= 0; i--) {
        const x = 60 + (i / (data.band.lower.length - 1)) * 480;
        const y = 360 - data.band.lower[i] * 320;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Predicted line
    if (data && data.predicted) {
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.predicted.base.forEach((v, i) => {
        const x = 60 + (i / (data.predicted.base.length - 1)) * 480;
        const y = 360 - v * 320;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Observed points
    if (data && data.observed) {
      data.observed.forEach((v, i) => {
        const x = 60 + (i / (data.observed.length - 1)) * 480;
        const y = 360 - v * 320;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = colors.navy;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // Labels
    ctx.fillStyle = colors.navy;
    ctx.font = '12px IBM Plex Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('时间 (月)', 300, 395);
    
    ctx.save();
    ctx.translate(15, 200);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('生存概率', 0, 0);
    ctx.restore();

    // Title
    ctx.fillStyle = colors.navy;
    ctx.font = 'bold 14px IBM Plex Sans, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('校准拟合图', 60, 25);

    // RMSE
    if (data && data.rmse) {
      ctx.fillStyle = colors.success;
      ctx.font = 'bold 12px IBM Plex Sans, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`RMSE = ${data.rmse}`, 540, 25);
    }

    return canvas;
  }

  // ============ Public API ============
  return {
    renderICERPlane,
    renderCEAC,
    renderCohortTrace,
    renderCalibration,
    colors,
  };
})();

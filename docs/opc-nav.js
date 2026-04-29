/* ============================================================
   OPC Ecosystem Floating Nav — self-contained component
   Usage: <script src="opc-nav.js"></script> before </body>
   ============================================================ */
(function(){
  if(window.__opcNavInit) return; window.__opcNavInit = true;

  var PROJECTS = [
    {name:'OPC Home',          url:'https://mokangmedical.github.io/opc-homepage/',            icon:'🏠'},
    {name:'Tianyan 天眼',      url:'https://mokangmedical.github.io/tianyan/',                  icon:'🔭'},
    {name:'PharmaSim',         url:'https://mokangmedical.github.io/PharmaSim/',                icon:'💊'},
    {name:'Kondratiev Wave',   url:'https://mokangmedical.github.io/kondratiev-wave/',          icon:'📈'},
    {name:'Chronicare',        url:'https://mokangmedical.github.io/chronicdiseasemanagement/', icon:'🩺'},
    {name:'MediChat-RD',       url:'https://mokangmedical.github.io/medichat-rd/',              icon:'💬'},
    {name:'Virtual Cell',      url:'https://mokangmedical.github.io/virtual-cell/',             icon:'🧬'},
    {name:'Cloud Memorial',    url:'https://mokangmedical.github.io/cloud-memorial/',           icon:'🕯'},
    {name:'MedRoundTable',     url:'https://mokangmedical.github.io/medroundtable/',            icon:'🏥'},
    {name:'NarrowGate',        url:'https://mokangmedical.github.io/narrowgate/',               icon:'🚪'}
  ];
  var CURRENT = 'HEOR Modeling Platform';

  // Inject styles
  var css = document.createElement('style');
  css.textContent = [
    '.opc-fab{position:fixed;bottom:24px;right:24px;z-index:9999;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#1b345d,#2a5298);color:#fff;border:none;cursor:pointer;font-size:22px;box-shadow:0 4px 20px rgba(27,52,93,0.4);display:flex;align-items:center;justify-content:center;transition:all .3s ease}',
    '.opc-fab:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(27,52,93,0.5)}',
    '.opc-fab.open{transform:rotate(45deg)}',
    '.opc-panel{position:fixed;bottom:88px;right:24px;z-index:9998;width:300px;max-height:0;overflow:hidden;background:#1b345d;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,0.3);transition:all .4s cubic-bezier(.4,0,.2,1);opacity:0;transform:translateY(10px) scale(0.95)}',
    '.opc-panel.show{max-height:520px;opacity:1;transform:translateY(0) scale(1)}',
    '.opc-panel-header{padding:16px 20px 12px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:10px}',
    '.opc-panel-logo{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#2f6fed,#7c5ce0);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff}',
    '.opc-panel-title{color:#fff;font-size:14px;font-weight:600}',
    '.opc-panel-sub{color:rgba(255,255,255,0.5);font-size:11px}',
    '.opc-panel-list{padding:8px 0;overflow-y:auto;max-height:380px}',
    '.opc-panel-item{display:flex;align-items:center;gap:10px;padding:10px 20px;color:rgba(255,255,255,0.85);text-decoration:none;font-size:13px;transition:all .2s;border-left:3px solid transparent}',
    '.opc-panel-item:hover{background:rgba(255,255,255,0.08);color:#fff;border-left-color:#2f6fed}',
    '.opc-panel-item.current{background:rgba(47,111,237,0.15);color:#fff;border-left-color:#2f6fed;font-weight:600}',
    '.opc-panel-item .opc-icon{font-size:16px;width:22px;text-align:center;flex-shrink:0}',
    '.opc-panel-item .opc-name{flex:1}',
    '.opc-panel-item .opc-badge{font-size:9px;background:#2f6fed;color:#fff;padding:2px 6px;border-radius:10px}',
    '.opc-panel-footer{padding:10px 20px;border-top:1px solid rgba(255,255,255,0.1);text-align:center}',
    '.opc-panel-footer a{color:rgba(255,255,255,0.5);font-size:11px;text-decoration:none}',
    '.opc-panel-footer a:hover{color:#fff}',
    '@media(max-width:480px){.opc-fab{width:44px;height:44px;font-size:18px;bottom:16px;right:16px}.opc-panel{right:16px;bottom:72px;width:260px}}'
  ].join('\n');
  document.head.appendChild(css);

  // Create FAB
  var fab = document.createElement('button');
  fab.className = 'opc-fab';
  fab.innerHTML = '⊕';
  fab.setAttribute('aria-label','OPC Ecosystem Navigation');
  fab.setAttribute('aria-expanded','false');
  document.body.appendChild(fab);

  // Create panel
  var panel = document.createElement('nav');
  panel.className = 'opc-panel';
  panel.setAttribute('role','navigation');
  var items = '';
  for(var i=0;i<PROJECTS.length;i++){
    var p = PROJECTS[i];
    var isCurrent = (p.name === CURRENT || p.name.indexOf('HEOR')>-1);
    items += '<a class="opc-panel-item'+(isCurrent?' current':'')+'" href="'+p.url+'" target="_blank" rel="noopener noreferrer">'
      +'<span class="opc-icon">'+p.icon+'</span>'
      +'<span class="opc-name">'+p.name+'</span>'
      +(isCurrent?'<span class="opc-badge">HERE</span>':'')
      +'</a>';
  }
  panel.innerHTML = '<div class="opc-panel-header"><div class="opc-panel-logo">M</div><div><div class="opc-panel-title">OPC Ecosystem</div><div class="opc-panel-sub">MoKangMedical · 60+ Projects</div></div></div>'
    +'<div class="opc-panel-list">'+items+'</div>'
    +'<div class="opc-panel-footer"><a href="https://mokangmedical.github.io/opc-homepage/">View All Projects →</a></div>';
  document.body.appendChild(panel);

  // Toggle
  var open = false;
  function toggle(){
    open = !open;
    panel.classList.toggle('show',open);
    fab.classList.toggle('open',open);
    fab.innerHTML = open ? '×' : '⊕';
    fab.setAttribute('aria-expanded',open?'true':'false');
  }
  fab.addEventListener('click',toggle);

  // Close on outside click
  document.addEventListener('click',function(e){
    if(open && !panel.contains(e.target) && e.target!==fab) toggle();
  });
  // Close on Escape
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape' && open) toggle();
  });
})();

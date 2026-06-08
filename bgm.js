(() => {
  const DAY_SRC = 'audio/day.mp3';
  const NIGHT_SRC = 'audio/night.mp3';

  const day = new Audio(DAY_SRC);
  const night = new Audio(NIGHT_SRC);
  day.loop = true;
  night.loop = true;
  day.volume = 0.45;
  night.volume = 0.45;

  let enabled = false;
  let current = null;
  let lastKind = 'day';

  const panel = document.createElement('button');
  panel.textContent = '음악 켜기';
  panel.setAttribute('aria-label', '배경음악 켜기');
  Object.assign(panel.style, {
    position: 'fixed',
    right: '14px',
    bottom: '14px',
    zIndex: '99999',
    background: 'rgba(31,25,20,.94)',
    color: '#ded4c1',
    border: '1px solid #6e5a40',
    borderRadius: '8px',
    padding: '9px 12px',
    font: '14px system-ui, -apple-system, Segoe UI, sans-serif',
    boxShadow: '0 6px 20px rgba(0,0,0,.45)'
  });

  const ch4Panel = document.createElement('button');
  ch4Panel.textContent = '4장 진행';
  ch4Panel.setAttribute('aria-label', '4장 진행 보조');
  Object.assign(ch4Panel.style, {
    display: 'none',
    position: 'fixed',
    right: '14px',
    bottom: '58px',
    zIndex: '99999',
    background: 'rgba(79,55,34,.96)',
    color: '#fff0d0',
    border: '1px solid #c39b62',
    borderRadius: '8px',
    padding: '9px 12px',
    font: '14px system-ui, -apple-system, Segoe UI, sans-serif',
    boxShadow: '0 6px 20px rgba(0,0,0,.45)'
  });

  const fixStyle = document.createElement('style');
  fixStyle.textContent = `
    .gamebox{overflow:hidden!important;}
    .dialog{
      position:absolute!important;
      left:16px!important;
      right:16px!important;
      bottom:16px!important;
      top:auto!important;
      transform:none!important;
      max-height:214px!important;
      overflow:hidden!important;
      z-index:8!important;
    }
    .dialog .text{
      max-height:92px!important;
      overflow-y:auto!important;
      padding-right:4px!important;
    }
    .dialog .options{
      max-height:96px!important;
      overflow-y:auto!important;
      overscroll-behavior:contain!important;
    }
    .dialog button{scroll-margin:0!important;}
    @media(max-width:980px){
      .dialog{left:10px!important;right:10px!important;bottom:10px!important;max-height:42vh!important;}
      .dialog .text{max-height:15vh!important;}
      .dialog .options{max-height:18vh!important;}
    }
  `;

  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(fixStyle);
    document.body.appendChild(panel);
    document.body.appendChild(ch4Panel);
    updateMusicLabel();
    fixDialogPosition();
    patchChapter4EndButton();
  });

  function readTimeOfDay() {
    const hud = document.getElementById('hud');
    const phase = document.getElementById('phaseText');
    const hudText = hud ? hud.innerText : '';
    const phaseText = phase ? phase.innerText : '';
    const source = `${hudText}\n${phaseText}`;

    if (/·\s*밤\b|\/\s*밤\b|\b밤\s*\//.test(source)) return 'night';
    if (/·\s*낮\b|\/\s*낮\b|\b낮\s*\//.test(source)) return 'day';
    if (/·\s*새벽\b|\/\s*새벽\b|\b새벽\s*\//.test(source)) return 'day';

    return lastKind;
  }

  function updateMusicLabel() {
    if (!enabled) {
      panel.textContent = '음악 켜기';
      return;
    }
    const kind = readTimeOfDay();
    panel.textContent = kind === 'night' ? '밤 음악 재생 중' : '낮 음악 재생 중';
  }

  async function playTrack(kind) {
    lastKind = kind;
    const target = kind === 'night' ? night : day;
    const other = kind === 'night' ? day : night;
    if (current === target && !target.paused) {
      updateMusicLabel();
      return;
    }
    other.pause();
    other.currentTime = 0;
    current = target;
    try {
      await target.play();
      updateMusicLabel();
    } catch (e) {
      panel.textContent = '음악 켜기';
    }
  }

  function updateMusic() {
    if (!enabled) return;
    playTrack(readTimeOfDay());
  }

  panel.addEventListener('click', () => {
    enabled = !enabled;
    if (!enabled) {
      day.pause();
      night.pause();
      panel.textContent = '음악 켜기';
      return;
    }
    updateMusic();
  });

  ['click', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => {
      if (!enabled) return;
      updateMusic();
    }, { passive: true });
  });

  function fixDialogPosition() {
    const dialog = document.getElementById('dialog');
    if (!dialog) return;
    dialog.style.top = 'auto';
    dialog.style.bottom = '16px';
    dialog.style.left = '16px';
    dialog.style.right = '16px';
    dialog.style.transform = 'none';
    dialog.style.maxHeight = '214px';
    dialog.style.overflow = 'hidden';
    const text = dialog.querySelector('.text');
    const options = dialog.querySelector('.options');
    if (text) {
      text.style.maxHeight = '92px';
      text.style.overflowY = 'auto';
    }
    if (options) {
      options.style.maxHeight = '96px';
      options.style.overflowY = 'auto';
    }
  }

  function callGlobal(name, ...args) {
    const fn = window[name];
    if (typeof fn === 'function') {
      try { fn(...args); return true; } catch (e) { console.warn(name, e); }
    }
    return false;
  }

  function patchChapter4EndButton() {
    const dialog = document.getElementById('dialog');
    if (!dialog || dialog.style.display === 'none') return;
    const speaker = (document.getElementById('speaker') || {}).innerText || '';
    const text = (document.getElementById('dialogText') || {}).innerText || '';
    const options = document.getElementById('options');
    if (!options) return;

    const isCh4End = speaker.includes('4장 종료') || text.includes('다음 장은 마지막 산제다');
    if (!isCh4End) return;

    const first = options.querySelector('button');
    if (first && first.textContent !== '5장으로 진행한다') {
      first.textContent = '5장으로 진행한다';
      first.onclick = () => {
        if (!callGlobal('startChapter5')) {
          const msg = '5장 함수가 아직 준비되지 않았습니다. 새로고침 후 다시 눌러 주세요.';
          if (typeof window.toast === 'function') window.toast(msg); else alert(msg);
        }
      };
    }
  }

  function updateChapter4AssistButton() {
    const hud = document.getElementById('hud');
    const dialog = document.getElementById('dialog');
    const report = document.getElementById('reportPanel');
    const h = hud ? hud.innerText : '';
    const dialogOpen = dialog && dialog.style.display !== 'none';
    const reportOpen = report && report.style.display !== 'none';

    ch4Panel.style.display = 'none';
    if (!h.includes('4장') || dialogOpen || reportOpen) return;

    if (h.includes('4장 흔적 조사: 4/4')) {
      ch4Panel.textContent = '검은등 대면';
      ch4Panel.style.display = 'block';
      ch4Panel.onclick = () => callGlobal('showScene', 'ch4FirstMeet');
      return;
    }
    if (h.includes('4장 밤 행동: 완료')) {
      ch4Panel.textContent = '새벽으로 진행';
      ch4Panel.style.display = 'block';
      ch4Panel.onclick = () => callGlobal('showScene', 'ch4Dawn');
      return;
    }
    if (h.includes('4장 새벽')) {
      ch4Panel.textContent = '4장 보고서';
      ch4Panel.style.display = 'block';
      ch4Panel.onclick = () => callGlobal('openReport', 4);
    }
  }

  setInterval(() => {
    updateMusic();
    updateMusicLabel();
    fixDialogPosition();
    patchChapter4EndButton();
    updateChapter4AssistButton();
  }, 800);
})();

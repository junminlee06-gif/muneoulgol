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
  let interactPatched = false;
  let showScenePatched = false;

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

  const ch4Guide = document.createElement('div');
  Object.assign(ch4Guide.style, {
    display: 'none',
    position: 'fixed',
    left: '14px',
    bottom: '14px',
    zIndex: '99998',
    width: '260px',
    maxWidth: 'calc(100vw - 28px)',
    background: 'rgba(31,25,20,.94)',
    color: '#ded4c1',
    border: '1px solid #6e5a40',
    borderRadius: '8px',
    padding: '10px 12px',
    font: '12px/1.45 system-ui, -apple-system, Segoe UI, sans-serif',
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
      max-height:342px!important;
      overflow:hidden!important;
      z-index:8!important;
      padding:12px!important;
    }
    .dialog .speaker{margin-bottom:4px!important;}
    .dialog .text{
      max-height:104px!important;
      overflow-y:auto!important;
      padding-right:4px!important;
      margin-bottom:8px!important;
      font-size:14px!important;
      line-height:1.42!important;
    }
    .dialog .options{
      max-height:190px!important;
      overflow-y:auto!important;
      overscroll-behavior:contain!important;
      gap:5px!important;
    }
    .dialog button{
      scroll-margin:0!important;
      padding:6px 9px!important;
      font-size:13px!important;
      line-height:1.32!important;
    }
    @media(max-width:980px){
      .dialog{left:10px!important;right:10px!important;bottom:10px!important;max-height:58vh!important;padding:10px!important;}
      .dialog .text{max-height:18vh!important;font-size:13px!important;}
      .dialog .options{max-height:26vh!important;}
      .dialog button{padding:6px 8px!important;font-size:13px!important;}
      #muneoulgolCh4Guide{left:10px!important;right:10px!important;bottom:64px!important;width:auto!important;}
    }
  `;

  ch4Guide.id = 'muneoulgolCh4Guide';

  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(fixStyle);
    document.body.appendChild(panel);
    document.body.appendChild(ch4Panel);
    document.body.appendChild(ch4Guide);
    updateMusicLabel();
    fixDialogPosition();
    patchChapter4EndButton();
    patchGameFunctions();
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
    dialog.style.maxHeight = '342px';
    dialog.style.overflow = 'hidden';
    dialog.style.padding = '12px';
    const text = dialog.querySelector('.text');
    const options = dialog.querySelector('.options');
    if (text) {
      text.style.maxHeight = '104px';
      text.style.overflowY = 'auto';
      text.style.fontSize = '14px';
      text.style.lineHeight = '1.42';
      text.style.marginBottom = '8px';
    }
    if (options) {
      options.style.maxHeight = '190px';
      options.style.overflowY = 'auto';
      options.style.gap = '5px';
    }
    [...dialog.querySelectorAll('button')].forEach(b => {
      b.style.padding = '6px 9px';
      b.style.fontSize = '13px';
      b.style.lineHeight = '1.32';
    });
  }

  function callGlobal(name, ...args) {
    const fn = window[name];
    if (typeof fn === 'function') {
      try { fn(...args); return true; } catch (e) { console.warn(name, e); }
    }
    try {
      const fn2 = Function('return typeof ' + name + ' === "function" ? ' + name + ' : null')();
      if (typeof fn2 === 'function') { fn2(...args); return true; }
    } catch (e) {}
    return false;
  }

  function gameState() {
    try { if (typeof state !== 'undefined') return state; } catch (e) {}
    return null;
  }

  function gameLoc() {
    try { if (typeof nearbyLocation === 'function') return nearbyLocation(); } catch (e) {}
    return null;
  }

  function gameToast(msg) {
    if (!callGlobal('toast', msg)) {
      const old = ch4Guide.innerHTML;
      ch4Guide.style.display = 'block';
      ch4Guide.innerHTML = '<b style="color:#d3ad70">안내</b><br>' + msg + '<hr style="border-color:#4a3b2c;border-width:0 0 1px;margin:7px 0">' + old;
    }
  }

  const ch4EventByLoc = {
    rockBones: 'bones',
    rockWater: 'water',
    rockFootprint: 'footprint',
    rockTooth: 'tooth'
  };
  const ch4EventByScene = {
    ch4Bones: 'bones',
    ch4Water: 'water',
    ch4Footprint: 'footprint',
    ch4Tooth: 'tooth'
  };
  const ch4Places = [
    { key: 'bones', label: '바위 아래 뼈더미', pos: '왼쪽 아래' },
    { key: 'water', label: '말라붙은 물길', pos: '오른쪽 중간' },
    { key: 'footprint', label: '겹친 발자국', pos: '왼쪽 위' },
    { key: 'tooth', label: '이빨 사이의 이름', pos: '오른쪽 위' }
  ];

  function isCh4Visited(key) {
    const st = gameState();
    return !!(st && st.chapterVisited && st.chapterVisited['ch4_' + key]);
  }

  function patchGameFunctions() {
    if (!showScenePatched) {
      try {
        if (typeof showScene === 'function') {
          const originalShowScene = showScene;
          showScene = function(id, ...args) {
            const st = gameState();
            const key = ch4EventByScene[id];
            if (st && st.chapter === 4 && st.phase === 'ch4_day' && key && isCh4Visited(key)) {
              gameToast('이미 확인한 흔적입니다. 다른 흔적을 찾으세요.');
              updateCh4Guide();
              return;
            }
            return originalShowScene.call(this, id, ...args);
          };
          window.showScene = showScene;
          showScenePatched = true;
        }
      } catch (e) {}
    }

    if (!interactPatched) {
      try {
        if (typeof interact === 'function') {
          const originalInteract = interact;
          interact = function(...args) {
            const st = gameState();
            const loc = gameLoc();
            const key = loc && ch4EventByLoc[loc.id];
            if (st && st.chapter === 4 && st.phase === 'ch4_day' && key && isCh4Visited(key)) {
              gameToast('이미 확인한 흔적입니다. 4장은 네 흔적을 각각 한 번씩 확인해야 진행됩니다.');
              updateCh4Guide();
              return;
            }
            return originalInteract.apply(this, args);
          };
          window.interact = interact;
          interactPatched = true;
        }
      } catch (e) {}
    }
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

  function updateCh4Guide() {
    const st = gameState();
    const dialog = document.getElementById('dialog');
    const report = document.getElementById('reportPanel');
    const dialogOpen = dialog && dialog.style.display !== 'none';
    const reportOpen = report && report.style.display !== 'none';

    if (!st || st.chapter !== 4 || reportOpen) {
      ch4Guide.style.display = 'none';
      return;
    }

    const phase = st.phase || '';
    ch4Guide.style.display = dialogOpen ? 'none' : 'block';

    if (phase === 'ch4_day') {
      const rows = ch4Places.map(p => {
        const done = isCh4Visited(p.key);
        return `<div style="display:flex;justify-content:space-between;gap:8px;opacity:${done ? .52 : 1}"><span>${done ? '✓' : '•'} ${p.label}</span><span style="color:#b7925d">${p.pos}</span></div>`;
      }).join('');
      const doneCount = ch4Places.filter(p => isCh4Visited(p.key)).length;
      const footer = doneCount >= 4 ? '네 흔적을 모두 봤습니다. 중앙의 검은 바위 앞으로 가세요.' : '이미 확인한 흔적은 다시 조사하지 않고, 남은 위치만 찾으면 됩니다.';
      ch4Guide.innerHTML = `<b style="color:#d3ad70">4장 흔적 안내 ${doneCount}/4</b><div style="margin-top:6px">${rows}</div><div style="margin-top:7px;color:#c8b89a">${footer}</div>`;
      return;
    }

    if (phase === 'ch4_night') {
      ch4Guide.innerHTML = '<b style="color:#d3ad70">4장 밤 안내</b><div style="margin-top:6px">• 검은 바위: 중앙 위<br>• 도리의 이름: 오른쪽 위<br>• 사량의 바위턱: 왼쪽 중간</div><div style="margin-top:7px;color:#c8b89a">밤에는 하나만 고르면 됩니다.</div>';
      return;
    }

    if (phase === 'ch4_dawn') {
      ch4Guide.innerHTML = '<b style="color:#d3ad70">4장 새벽 안내</b><div style="margin-top:6px">검은 바위 앞에서 기록을 정리하세요.</div>';
      return;
    }

    ch4Guide.style.display = 'none';
  }

  setInterval(() => {
    patchGameFunctions();
    updateMusic();
    updateMusicLabel();
    fixDialogPosition();
    patchChapter4EndButton();
    updateChapter4AssistButton();
    updateCh4Guide();
  }, 800);
})();

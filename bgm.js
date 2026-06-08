(() => {
  'use strict';

  const DAY_SRC = 'audio/day.mp3';
  const NIGHT_SRC = 'audio/night.mp3';

  const day = new Audio(DAY_SRC);
  const night = new Audio(NIGHT_SRC);
  day.loop = true;
  night.loop = true;
  day.volume = 0.45;
  night.volume = 0.45;

  let musicEnabled = false;
  let currentTrack = null;
  let lastKind = 'day';

  const visitedCh4 = new Set();
  let openCh4Scene = null;

  const ch4Labels = {
    '바위 아래 뼈더미': 'bones',
    '말라붙은 물길': 'water',
    '겹친 발자국': 'footprint',
    '이빨 사이의 이름': 'tooth'
  };
  const ch4ByKey = {
    bones: { label: '바위 아래 뼈더미', pos: '왼쪽 아래' },
    water: { label: '말라붙은 물길', pos: '오른쪽 중간' },
    footprint: { label: '겹친 발자국', pos: '왼쪽 위' },
    tooth: { label: '이빨 사이의 이름', pos: '오른쪽 위' }
  };

  const musicButton = document.createElement('button');
  musicButton.textContent = '음악 켜기';
  musicButton.setAttribute('aria-label', '배경음악 켜기');
  Object.assign(musicButton.style, {
    position: 'fixed', right: '14px', bottom: '14px', zIndex: '99999',
    background: 'rgba(31,25,20,.94)', color: '#ded4c1', border: '1px solid #6e5a40',
    borderRadius: '8px', padding: '9px 12px',
    font: '14px system-ui, -apple-system, Segoe UI, sans-serif',
    boxShadow: '0 6px 20px rgba(0,0,0,.45)'
  });

  const ch4Button = document.createElement('button');
  ch4Button.textContent = '4장 진행';
  Object.assign(ch4Button.style, {
    display: 'none', position: 'fixed', right: '14px', bottom: '58px', zIndex: '99999',
    background: 'rgba(79,55,34,.96)', color: '#fff0d0', border: '1px solid #c39b62',
    borderRadius: '8px', padding: '9px 12px',
    font: '14px system-ui, -apple-system, Segoe UI, sans-serif',
    boxShadow: '0 6px 20px rgba(0,0,0,.45)'
  });

  const guide = document.createElement('div');
  guide.id = 'muneoulgolCh4Guide';
  Object.assign(guide.style, {
    display: 'none', position: 'fixed', left: '14px', bottom: '14px', zIndex: '99998',
    width: '270px', maxWidth: 'calc(100vw - 28px)', background: 'rgba(31,25,20,.94)',
    color: '#ded4c1', border: '1px solid #6e5a40', borderRadius: '8px', padding: '10px 12px',
    font: '12px/1.45 system-ui, -apple-system, Segoe UI, sans-serif',
    boxShadow: '0 6px 20px rgba(0,0,0,.45)'
  });

  const style = document.createElement('style');
  style.textContent = `
    .gamebox { overflow: hidden !important; }
    .dialog {
      position: fixed !important;
      transform: none !important;
      overflow: hidden !important;
      z-index: 99990 !important;
      box-sizing: border-box !important;
      padding: 12px !important;
    }
    .dialog .speaker { margin-bottom: 4px !important; }
    .dialog .text {
      overflow-y: auto !important;
      padding-right: 4px !important;
      margin-bottom: 8px !important;
      font-size: 14px !important;
      line-height: 1.42 !important;
    }
    .dialog .options {
      overflow-y: auto !important;
      overscroll-behavior: contain !important;
      gap: 5px !important;
    }
    .dialog button {
      scroll-margin: 0 !important;
      padding: 6px 9px !important;
      font-size: 13px !important;
      line-height: 1.32 !important;
    }
    @media (max-width: 980px) {
      .dialog { padding: 10px !important; }
      .dialog .text { font-size: 13px !important; }
      .dialog button { padding: 6px 8px !important; font-size: 13px !important; }
      #muneoulgolCh4Guide { left: 10px !important; right: 10px !important; bottom: 64px !important; width: auto !important; }
    }
  `;

  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(style);
    document.body.appendChild(musicButton);
    document.body.appendChild(ch4Button);
    document.body.appendChild(guide);
    updateMusicLabel();
    tick();
  });

  function readTimeOfDay() {
    const hud = document.getElementById('hud');
    const phase = document.getElementById('phaseText');
    const source = `${hud ? hud.innerText : ''}\n${phase ? phase.innerText : ''}`;
    if (/·\s*밤\b|\/\s*밤\b|\b밤\s*\//.test(source)) return 'night';
    if (/·\s*낮\b|\/\s*낮\b|\b낮\s*\//.test(source)) return 'day';
    if (/·\s*새벽\b|\/\s*새벽\b|\b새벽\s*\//.test(source)) return 'day';
    return lastKind;
  }

  function updateMusicLabel() {
    if (!musicEnabled) {
      musicButton.textContent = '음악 켜기';
      return;
    }
    const kind = readTimeOfDay();
    musicButton.textContent = kind === 'night' ? '밤 음악 재생 중' : '낮 음악 재생 중';
  }

  async function playTrack(kind) {
    lastKind = kind;
    const target = kind === 'night' ? night : day;
    const other = kind === 'night' ? day : night;
    if (currentTrack === target && !target.paused) {
      updateMusicLabel();
      return;
    }
    other.pause();
    other.currentTime = 0;
    currentTrack = target;
    try {
      await target.play();
      updateMusicLabel();
    } catch (e) {
      musicButton.textContent = '음악 켜기';
    }
  }

  musicButton.addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    if (!musicEnabled) {
      day.pause();
      night.pause();
      musicButton.textContent = '음악 켜기';
      return;
    }
    playTrack(readTimeOfDay());
  });

  ['click', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => {
      if (musicEnabled) playTrack(readTimeOfDay());
    }, { passive: true });
  });

  function anchorDialog() {
    const dialog = document.getElementById('dialog');
    const gamebox = document.querySelector('.gamebox');
    if (!dialog || !gamebox || dialog.style.display === 'none') return;

    const rect = gamebox.getBoundingClientRect();
    const margin = rect.width < 520 ? 10 : 16;
    const pad = 8;
    const maxHeight = Math.min(342, Math.max(220, rect.height - margin * 2), Math.max(220, window.innerHeight - pad * 2));
    const width = Math.max(260, rect.width - margin * 2);

    dialog.style.position = 'fixed';
    dialog.style.left = `${Math.round(Math.max(pad, rect.left + margin))}px`;
    dialog.style.right = 'auto';
    dialog.style.width = `${Math.round(Math.min(width, window.innerWidth - pad * 2))}px`;
    dialog.style.maxHeight = `${Math.round(maxHeight)}px`;
    dialog.style.overflow = 'hidden';
    dialog.style.transform = 'none';
    dialog.style.padding = rect.width < 520 ? '10px' : '12px';

    const text = dialog.querySelector('.text');
    const options = dialog.querySelector('.options');
    const optionCount = options ? options.children.length : 0;
    const optionHeight = optionCount >= 4 ? 188 : optionCount === 3 ? 150 : 120;
    const textHeight = optionCount >= 4 ? 96 : 112;

    if (text) {
      text.style.maxHeight = `${Math.round(Math.min(textHeight, maxHeight * 0.34))}px`;
      text.style.overflowY = 'auto';
      text.style.fontSize = rect.width < 520 ? '13px' : '14px';
      text.style.lineHeight = '1.42';
      text.style.marginBottom = '8px';
    }
    if (options) {
      options.style.maxHeight = `${Math.round(Math.min(optionHeight, maxHeight * 0.56))}px`;
      options.style.overflowY = 'auto';
      options.style.gap = '5px';
    }
    dialog.querySelectorAll('button').forEach(btn => {
      btn.style.padding = rect.width < 520 ? '6px 8px' : '6px 9px';
      btn.style.fontSize = '13px';
      btn.style.lineHeight = '1.32';
    });

    const measured = Math.min(dialog.offsetHeight || maxHeight, maxHeight);
    const topWithinGame = rect.bottom - measured - margin;
    const top = Math.max(pad, Math.min(topWithinGame, window.innerHeight - measured - pad));
    dialog.style.top = `${Math.round(top)}px`;
    dialog.style.bottom = 'auto';

    if (document.activeElement && dialog.contains(document.activeElement)) {
      try { document.activeElement.blur(); } catch (e) {}
    }
  }

  function callGlobal(name, ...args) {
    const fn = window[name];
    if (typeof fn === 'function') {
      try { fn(...args); return true; } catch (e) { console.warn(e); }
    }
    try {
      const fn2 = Function(`return typeof ${name} === 'function' ? ${name} : null`)();
      if (typeof fn2 === 'function') {
        fn2(...args);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function closeDialogFallback() {
    const dialog = document.getElementById('dialog');
    if (dialog) dialog.style.display = 'none';
    try {
      Function("if (typeof state !== 'undefined') state.dialogOpen = false; if (typeof keysDown !== 'undefined') keysDown.clear();")();
    } catch (e) {}
    callGlobal('refreshSide');
  }

  function currentCh4KeyFromSpeaker() {
    const speaker = document.getElementById('speaker');
    const text = speaker ? speaker.innerText : '';
    for (const label of Object.keys(ch4Labels)) {
      if (text.includes(label)) return ch4Labels[label];
    }
    return null;
  }

  function markCh4OptionClicks() {
    const options = document.getElementById('options');
    if (!options) return;
    const key = currentCh4KeyFromSpeaker();
    openCh4Scene = key;
    if (!key) return;

    options.querySelectorAll('button').forEach(btn => {
      if (btn.dataset.ch4Tracked === '1') return;
      btn.dataset.ch4Tracked = '1';
      btn.addEventListener('click', () => {
        setTimeout(() => {
          visitedCh4.add(key);
          updateGuide();
        }, 50);
      }, { capture: true });
    });
  }

  function sanitizeDuplicateDialog() {
    const dialog = document.getElementById('dialog');
    const speaker = document.getElementById('speaker');
    const text = document.getElementById('dialogText');
    const options = document.getElementById('options');
    if (!dialog || !speaker || !text || !options || dialog.style.display === 'none') return;

    const key = currentCh4KeyFromSpeaker();
    if (!key || !visitedCh4.has(key)) {
      markCh4OptionClicks();
      return;
    }

    const label = ch4ByKey[key].label;
    speaker.textContent = '이미 확인한 흔적';
    text.textContent = `${label}은 이미 조사했다. 남은 흔적을 찾아 이동하자.`;
    options.innerHTML = '';
    const btn = document.createElement('button');
    btn.textContent = '다른 흔적을 찾는다';
    btn.onclick = closeDialogFallback;
    options.appendChild(btn);
  }

  function currentInteractionLabel() {
    const hud = document.getElementById('hud');
    const h = hud ? hud.innerText : '';
    const m = h.match(/상호작용:\s*([^\n]+)/);
    return m ? m[1].trim() : '';
  }

  function interceptDuplicateInteraction(event) {
    if (!['Enter', ' ', 'Spacebar', 'z', 'Z'].includes(event.key)) return;
    const hud = document.getElementById('hud');
    const h = hud ? hud.innerText : '';
    if (!h.includes('4장') || !h.includes('흔적 조사')) return;

    const label = currentInteractionLabel();
    const key = ch4Labels[label];
    if (!key || !visitedCh4.has(key)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    showTemporaryGuide(`이미 확인한 흔적입니다. ${nextUnvisitedText()}을 찾아가세요.`);
  }

  document.addEventListener('keydown', interceptDuplicateInteraction, true);

  function nextUnvisitedText() {
    const next = Object.keys(ch4ByKey).find(k => !visitedCh4.has(k));
    return next ? ch4ByKey[next].label : '중앙의 검은 바위';
  }

  function showTemporaryGuide(msg) {
    guide.style.display = 'block';
    guide.innerHTML = `<b style="color:#d3ad70">안내</b><br>${msg}<hr style="border-color:#4a3b2c;border-width:0 0 1px;margin:7px 0">${guide.innerHTML}`;
  }

  function patchChapter4EndButton() {
    const dialog = document.getElementById('dialog');
    if (!dialog || dialog.style.display === 'none') return;
    const speaker = (document.getElementById('speaker') || {}).innerText || '';
    const text = (document.getElementById('dialogText') || {}).innerText || '';
    const options = document.getElementById('options');
    if (!options) return;
    const isEnd = speaker.includes('4장 종료') || text.includes('다음 장은 마지막 산제다');
    if (!isEnd) return;
    const first = options.querySelector('button');
    if (first && first.textContent !== '5장으로 진행한다') {
      first.textContent = '5장으로 진행한다';
      first.onclick = () => {
        if (!callGlobal('startChapter5')) alert('5장 함수가 아직 준비되지 않았습니다. 새로고침 후 다시 눌러 주세요.');
      };
    }
  }

  function updateAssistButton() {
    const hud = document.getElementById('hud');
    const dialog = document.getElementById('dialog');
    const report = document.getElementById('reportPanel');
    const h = hud ? hud.innerText : '';
    const dialogOpen = dialog && dialog.style.display !== 'none';
    const reportOpen = report && report.style.display !== 'none';
    ch4Button.style.display = 'none';
    if (!h.includes('4장') || dialogOpen || reportOpen) return;

    if (h.includes('4장 흔적 조사: 4/4') || visitedCh4.size >= 4) {
      ch4Button.textContent = '검은등 대면';
      ch4Button.style.display = 'block';
      ch4Button.onclick = () => callGlobal('showScene', 'ch4FirstMeet');
    } else if (h.includes('4장 밤 행동: 완료')) {
      ch4Button.textContent = '새벽으로 진행';
      ch4Button.style.display = 'block';
      ch4Button.onclick = () => callGlobal('showScene', 'ch4Dawn');
    } else if (h.includes('4장 새벽')) {
      ch4Button.textContent = '4장 보고서';
      ch4Button.style.display = 'block';
      ch4Button.onclick = () => callGlobal('openReport', 4);
    }
  }

  function updateGuide() {
    const hud = document.getElementById('hud');
    const dialog = document.getElementById('dialog');
    const report = document.getElementById('reportPanel');
    const h = hud ? hud.innerText : '';
    const dialogOpen = dialog && dialog.style.display !== 'none';
    const reportOpen = report && report.style.display !== 'none';
    if (!h.includes('4장') || reportOpen || dialogOpen) {
      guide.style.display = 'none';
      return;
    }

    guide.style.display = 'block';
    if (h.includes('흔적 조사')) {
      const keys = Object.keys(ch4ByKey);
      const rows = keys.map(key => {
        const done = visitedCh4.has(key);
        const item = ch4ByKey[key];
        const opacity = done ? 0.52 : 1;
        const mark = done ? '✓' : '•';
        return `<div style="display:flex;justify-content:space-between;gap:8px;opacity:${opacity}"><span>${mark} ${item.label}</span><span style="color:#b7925d">${item.pos}</span></div>`;
      }).join('');
      const footer = visitedCh4.size >= 4 ? '네 흔적을 모두 봤습니다. 중앙의 검은 바위 앞으로 가세요.' : '같은 흔적은 다시 조사하지 말고, 남은 위치를 찾으세요.';
      guide.innerHTML = `<b style="color:#d3ad70">4장 흔적 안내 ${visitedCh4.size}/4</b><div style="margin-top:6px">${rows}</div><div style="margin-top:7px;color:#c8b89a">${footer}</div>`;
    } else if (h.includes('밤')) {
      guide.innerHTML = '<b style="color:#d3ad70">4장 밤 안내</b><div style="margin-top:6px">• 검은 바위: 중앙 위<br>• 도리의 이름: 오른쪽 위<br>• 사량의 바위턱: 왼쪽 중간</div>';
    } else if (h.includes('새벽')) {
      guide.innerHTML = '<b style="color:#d3ad70">4장 새벽 안내</b><div style="margin-top:6px">검은 바위 앞에서 기록을 정리하세요.</div>';
    }
  }

  function tick() {
    if (musicEnabled) playTrack(readTimeOfDay());
    updateMusicLabel();
    sanitizeDuplicateDialog();
    anchorDialog();
    patchChapter4EndButton();
    updateAssistButton();
    updateGuide();
  }

  setInterval(tick, 200);
})();

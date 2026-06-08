(() => {
  'use strict';

  const day = new Audio('audio/day.mp3');
  const night = new Audio('audio/night.mp3');
  day.loop = true;
  night.loop = true;
  day.volume = 0.45;
  night.volume = 0.45;

  let musicOn = false;
  let currentTrack = null;
  let lastKind = 'day';

  const style = document.createElement('style');
  style.textContent = `
    .dialog{
      position:absolute!important;
      left:16px!important;
      right:16px!important;
      bottom:16px!important;
      top:auto!important;
      transform:none!important;
      max-height:340px!important;
      overflow:hidden!important;
    }
    .dialog .text{max-height:112px!important;overflow-y:auto!important;}
    .dialog .options{max-height:190px!important;overflow-y:auto!important;}
    .dialog button{font-size:13px!important;line-height:1.32!important;padding:6px 9px!important;}
    #muneoulgolPad{position:fixed;left:18px;bottom:18px;z-index:99999;display:grid;grid-template-columns:54px 54px 54px;grid-template-rows:54px 54px 54px;gap:6px;touch-action:none;user-select:none}
    #muneoulgolPad button,#muneoulgolAction,#muneoulgolUnlock,#muneoulgolMusic{background:rgba(31,25,20,.92);color:#ded4c1;border:1px solid #6e5a40;border-radius:10px;font:14px system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.42)}
    #muneoulgolPad button{font-size:22px;font-weight:700}
    #muneoulgolAction{position:fixed;right:18px;bottom:104px;z-index:99999;width:96px;height:54px;touch-action:none}
    #muneoulgolUnlock{position:fixed;right:18px;bottom:164px;z-index:99999;padding:9px 12px;background:rgba(79,55,34,.96);color:#fff0d0;border-color:#c39b62}
    #muneoulgolMusic{position:fixed;right:18px;bottom:18px;z-index:99999;padding:9px 12px}
    @media(min-width:981px){#muneoulgolPad,#muneoulgolAction{opacity:.86}}
    @media(max-width:980px){.dialog{left:10px!important;right:10px!important;bottom:10px!important;max-height:54vh!important}.dialog .text{max-height:17vh!important}.dialog .options{max-height:24vh!important}}
  `;

  const musicBtn = document.createElement('button');
  musicBtn.id = 'muneoulgolMusic';
  musicBtn.textContent = '음악 켜기';

  const unlockBtn = document.createElement('button');
  unlockBtn.id = 'muneoulgolUnlock';
  unlockBtn.textContent = '조작 잠금 해제';

  const actionBtn = document.createElement('button');
  actionBtn.id = 'muneoulgolAction';
  actionBtn.textContent = '조사';

  const pad = document.createElement('div');
  pad.id = 'muneoulgolPad';
  pad.innerHTML = '<span></span><button data-key="ArrowUp">▲</button><span></span><button data-key="ArrowLeft">◀</button><span></span><button data-key="ArrowRight">▶</button><span></span><button data-key="ArrowDown">▼</button><span></span>';

  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(style);
    document.body.appendChild(pad);
    document.body.appendChild(actionBtn);
    document.body.appendChild(unlockBtn);
    document.body.appendChild(musicBtn);
    setupPad();
    tick();
  });

  function elem(id) { return document.getElementById(id); }
  function text(id) { const e = elem(id); return e ? e.innerText : ''; }
  function visible(e) { return !!e && e.style.display !== 'none'; }
  function hudText() { return text('hud') + '\n' + text('phaseText'); }

  function timeKind() {
    const src = hudText();
    if (/·\s*밤\b|\/\s*밤\b|\b밤\s*\//.test(src)) return 'night';
    if (/·\s*낮\b|\/\s*낮\b|\b낮\s*\//.test(src)) return 'day';
    if (/·\s*새벽\b|\/\s*새벽\b|\b새벽\s*\//.test(src)) return 'day';
    return lastKind;
  }

  async function play(kind) {
    lastKind = kind;
    const target = kind === 'night' ? night : day;
    const other = kind === 'night' ? day : night;
    if (currentTrack === target && !target.paused) return updateMusicLabel();
    other.pause();
    other.currentTime = 0;
    currentTrack = target;
    try { await target.play(); } catch (e) { musicOn = false; }
    updateMusicLabel();
  }

  function updateMusicLabel() {
    if (!musicOn) { musicBtn.textContent = '음악 켜기'; return; }
    musicBtn.textContent = timeKind() === 'night' ? '밤 음악 재생 중' : '낮 음악 재생 중';
  }

  musicBtn.onclick = () => {
    musicOn = !musicOn;
    if (!musicOn) { day.pause(); night.pause(); updateMusicLabel(); return; }
    play(timeKind());
  };

  function dispatchKey(type, key) {
    window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
  }

  function setupPad() {
    pad.querySelectorAll('button[data-key]').forEach(button => {
      const key = button.dataset.key;
      const down = event => {
        event.preventDefault();
        safeUnlockHiddenState();
        dispatchKey('keydown', key);
      };
      const up = event => {
        event.preventDefault();
        dispatchKey('keyup', key);
      };
      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointercancel', up);
      button.addEventListener('pointerleave', up);
    });
    actionBtn.addEventListener('click', event => {
      event.preventDefault();
      safeUnlockHiddenState();
      dispatchKey('keydown', 'Enter');
      setTimeout(() => dispatchKey('keyup', 'Enter'), 40);
    });
  }

  function callGlobal(fnName) {
    try {
      return Function(`return typeof ${fnName} === 'function' ? ${fnName} : null`)();
    } catch (e) {
      return null;
    }
  }

  function safeUnlockHiddenState() {
    const dialog = elem('dialog');
    const report = elem('reportPanel');
    const cutscene = elem('cutscene');
    const dialogOpen = visible(dialog);
    const reportOpen = visible(report);
    const cutsceneOpen = !!cutscene && cutscene.style.display === 'block';
    if (dialogOpen || reportOpen || cutsceneOpen) return;
    try {
      Function("if (typeof state !== 'undefined') state.dialogOpen = false; if (typeof keysDown !== 'undefined') keysDown.clear();")();
    } catch (e) {}
  }

  function closeDialogFully() {
    const closeDialog = callGlobal('closeDialog');
    if (typeof closeDialog === 'function') {
      try { closeDialog(); } catch (e) {}
    }
    const dialog = elem('dialog');
    if (dialog) dialog.style.display = 'none';
    try {
      Function("if (typeof state !== 'undefined') state.dialogOpen = false; if (typeof keysDown !== 'undefined') keysDown.clear();")();
    } catch (e) {}
  }

  function closeReportFully() {
    const report = elem('reportPanel');
    if (report) report.style.display = 'none';
  }

  unlockBtn.onclick = () => {
    closeDialogFully();
    closeReportFully();
  };

  function cleanOverlays() {
    const dialog = elem('dialog');
    const report = elem('reportPanel');
    const cutscene = elem('cutscene');
    const dialogOpen = visible(dialog);
    const reportOpen = visible(report);
    const cutsceneOpen = !!cutscene && cutscene.style.display === 'block';
    const isChapter5 = /5장|마지막 산제단/.test(hudText());
    const stale4Dialog = /4장|검은등|밤의 검은 바위|도리의 이름|사량의 바위턱/.test(text('speaker'));
    const stale4Report = text('reportTitle').includes('4장');

    if (cutsceneOpen) {
      if (dialogOpen) closeDialogFully();
      if (reportOpen) closeReportFully();
      return;
    }
    if (isChapter5) {
      if (dialogOpen && stale4Dialog) closeDialogFully();
      if (reportOpen && stale4Report) closeReportFully();
      return;
    }
    if (dialogOpen && reportOpen) closeDialogFully();
  }

  function patchChapter4EndButton() {
    const options = elem('options');
    if (!options) return;
    const speaker = text('speaker');
    const body = text('dialogText');
    if (!speaker.includes('4장 종료') && !body.includes('다음 장은 마지막 산제다')) return;
    const first = options.querySelector('button');
    if (!first || first.dataset.toCh5 === '1') return;
    first.dataset.toCh5 = '1';
    first.textContent = '5장으로 진행한다';
    first.onclick = () => {
      closeDialogFully();
      closeReportFully();
      const startChapter5 = callGlobal('startChapter5');
      if (typeof startChapter5 === 'function') startChapter5();
    };
  }

  function tick() {
    cleanOverlays();
    patchChapter4EndButton();
    safeUnlockHiddenState();
    if (musicOn) play(timeKind());
    updateMusicLabel();
  }

  setInterval(tick, 150);
})();

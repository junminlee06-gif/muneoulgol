(() => {
  'use strict';

  const day = new Audio('audio/day.mp3');
  const night = new Audio('audio/night.mp3');
  day.loop = true;
  night.loop = true;
  day.volume = 0.45;
  night.volume = 0.45;

  let musicOn = false;
  let current = null;
  let lastKind = 'day';

  const musicBtn = document.createElement('button');
  musicBtn.textContent = '음악 켜기';
  Object.assign(musicBtn.style, buttonStyle('14px'));

  const unlockBtn = document.createElement('button');
  unlockBtn.textContent = '조작 잠금 해제';
  Object.assign(unlockBtn.style, buttonStyle('58px'), {
    display: 'none',
    background: 'rgba(79,55,34,.96)',
    color: '#fff0d0',
    borderColor: '#c39b62'
  });

  const style = document.createElement('style');
  style.textContent = `
    .dialog{
      position:absolute!important;
      left:16px!important;
      right:16px!important;
      bottom:16px!important;
      top:auto!important;
      transform:none!important;
      z-index:5!important;
      max-height:340px!important;
      overflow:hidden!important;
    }
    .dialog .text{max-height:112px!important;overflow-y:auto!important;}
    .dialog .options{max-height:190px!important;overflow-y:auto!important;}
    .dialog button{font-size:13px!important;line-height:1.32!important;padding:6px 9px!important;}
    @media(max-width:980px){.dialog{left:10px!important;right:10px!important;bottom:10px!important;max-height:54vh!important}.dialog .text{max-height:17vh!important}.dialog .options{max-height:24vh!important}}
  `;

  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(style);
    document.body.appendChild(musicBtn);
    document.body.appendChild(unlockBtn);
    tick();
  });

  function buttonStyle(bottom) {
    return {
      position: 'fixed',
      right: '14px',
      bottom,
      zIndex: '99999',
      background: 'rgba(31,25,20,.94)',
      color: '#ded4c1',
      border: '1px solid #6e5a40',
      borderRadius: '8px',
      padding: '9px 12px',
      font: '14px system-ui,-apple-system,Segoe UI,sans-serif',
      boxShadow: '0 6px 20px rgba(0,0,0,.45)'
    };
  }

  function el(id) { return document.getElementById(id); }
  function text(id) { const node = el(id); return node ? node.innerText : ''; }
  function visible(node) { return !!node && node.style.display !== 'none'; }
  function hudText() { return `${text('hud')}\n${text('phaseText')}`; }

  function timeKind() {
    const source = hudText();
    if (/·\s*밤\b|\/\s*밤\b|\b밤\s*\//.test(source)) return 'night';
    if (/·\s*낮\b|\/\s*낮\b|\b낮\s*\//.test(source)) return 'day';
    if (/·\s*새벽\b|\/\s*새벽\b|\b새벽\s*\//.test(source)) return 'day';
    return lastKind;
  }

  async function play(kind) {
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
    } catch (e) {
      musicOn = false;
    }
    updateMusicLabel();
  }

  function updateMusicLabel() {
    if (!musicOn) {
      musicBtn.textContent = '음악 켜기';
      return;
    }
    musicBtn.textContent = timeKind() === 'night' ? '밤 음악 재생 중' : '낮 음악 재생 중';
  }

  musicBtn.onclick = () => {
    musicOn = !musicOn;
    if (!musicOn) {
      day.pause();
      night.pause();
      updateMusicLabel();
      return;
    }
    play(timeKind());
  };

  ['click', 'keydown', 'touchstart'].forEach(eventName => {
    window.addEventListener(eventName, () => {
      if (musicOn) play(timeKind());
    }, { passive: true });
  });

  function callCloseDialog() {
    if (typeof window.closeDialog === 'function') {
      try {
        window.closeDialog();
        return true;
      } catch (e) {}
    }
    const dialog = el('dialog');
    if (dialog) dialog.style.display = 'none';
    return false;
  }

  function forceCloseDialogOnly() {
    callCloseDialog();
  }

  function forceCloseReportOnly() {
    const report = el('reportPanel');
    if (report) report.style.display = 'none';
  }

  function isCutsceneOpen() {
    const cutscene = el('cutscene');
    return !!cutscene && cutscene.style.display === 'block';
  }

  function isChapter5() {
    const source = hudText();
    return source.includes('5장') || source.includes('마지막 산제단');
  }

  function isStaleChapter4Dialog() {
    return /4장|검은등|밤의 검은 바위|도리의 이름|사량의 바위턱/.test(text('speaker'));
  }

  function isStaleChapter4Report() {
    return text('reportTitle').includes('4장');
  }

  function cleanOverlapsSafely() {
    const dialog = el('dialog');
    const report = el('reportPanel');
    const dialogOpen = visible(dialog);
    const reportOpen = visible(report);

    if (isCutsceneOpen()) {
      if (dialogOpen) forceCloseDialogOnly();
      if (reportOpen) forceCloseReportOnly();
      unlockBtn.style.display = 'none';
      return;
    }

    if (isChapter5()) {
      if (dialogOpen && isStaleChapter4Dialog()) forceCloseDialogOnly();
      if (reportOpen && isStaleChapter4Report()) forceCloseReportOnly();
      unlockBtn.style.display = 'none';
      return;
    }

    if (dialogOpen && reportOpen) {
      forceCloseDialogOnly();
      unlockBtn.style.display = 'block';
      return;
    }

    // 화면에는 아무 창도 없는데 내부 상태만 대화 중으로 남은 경우를 풀기 위한 안전장치.
    if (!dialogOpen && !reportOpen && !isCutsceneOpen()) {
      unlockBtn.style.display = 'none';
    }
  }

  function patchChapter4EndButton() {
    const options = el('options');
    if (!options) return;
    const speaker = text('speaker');
    const body = text('dialogText');
    if (!speaker.includes('4장 종료') && !body.includes('다음 장은 마지막 산제다')) return;
    const first = options.querySelector('button');
    if (!first || first.dataset.toCh5 === '1') return;
    first.dataset.toCh5 = '1';
    first.textContent = '5장으로 진행한다';
    first.onclick = () => {
      forceCloseDialogOnly();
      forceCloseReportOnly();
      if (typeof window.startChapter5 === 'function') {
        window.startChapter5();
      }
    };
  }

  unlockBtn.onclick = () => {
    forceCloseDialogOnly();
    forceCloseReportOnly();
    unlockBtn.style.display = 'none';
  };

  function tick() {
    cleanOverlapsSafely();
    patchChapter4EndButton();
    if (musicOn) play(timeKind());
    updateMusicLabel();
  }

  setInterval(tick, 150);
})();

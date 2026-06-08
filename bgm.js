(() => {
  'use strict';

  const day = new Audio('audio/day.mp3');
  const night = new Audio('audio/night.mp3');
  day.loop = true;
  night.loop = true;
  day.volume = 0.45;
  night.volume = 0.45;

  let enabled = false;
  let current = null;
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
    #muneoulgolMusic{position:fixed;right:18px;bottom:18px;z-index:99999;background:rgba(31,25,20,.94);color:#ded4c1;border:1px solid #6e5a40;border-radius:10px;padding:9px 12px;font:14px system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.42)}
    @media(max-width:980px){.dialog{left:10px!important;right:10px!important;bottom:10px!important;max-height:54vh!important}.dialog .text{max-height:17vh!important}.dialog .options{max-height:24vh!important}}
  `;

  const button = document.createElement('button');
  button.id = 'muneoulgolMusic';
  button.textContent = '음악 켜기';

  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(style);
    document.body.appendChild(button);
    updateLabel();
  });

  function text(id) {
    const node = document.getElementById(id);
    return node ? node.innerText : '';
  }

  function timeKind() {
    const source = text('hud') + '\n' + text('phaseText');
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
      updateLabel();
      return;
    }
    other.pause();
    other.currentTime = 0;
    current = target;
    try {
      await target.play();
    } catch (e) {
      enabled = false;
    }
    updateLabel();
  }

  function updateLabel() {
    if (!enabled) {
      button.textContent = '음악 켜기';
      return;
    }
    button.textContent = timeKind() === 'night' ? '밤 음악 재생 중' : '낮 음악 재생 중';
  }

  button.onclick = () => {
    enabled = !enabled;
    if (!enabled) {
      day.pause();
      night.pause();
      updateLabel();
      return;
    }
    play(timeKind());
  };

  ['click', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => {
      if (enabled) play(timeKind());
    }, { passive: true });
  });

  setInterval(() => {
    if (enabled) play(timeKind());
    updateLabel();
  }, 1000);
})();

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

  const style = document.createElement('style');
  style.textContent = '#muneoulgolMusic{position:fixed;right:18px;bottom:18px;z-index:99999;background:rgba(31,25,20,.94);color:#ded4c1;border:1px solid #6e5a40;border-radius:10px;padding:9px 12px;font:14px system-ui,sans-serif}#muneoulgolPad,#muneoulgolAction,#muneoulgolUnlock{display:none!important}';

  const button = document.createElement('button');
  button.id = 'muneoulgolMusic';
  button.textContent = '음악 켜기';

  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(style);
    document.body.appendChild(button);
    cleanupOldButtons();
  });

  function cleanupOldButtons() {
    ['muneoulgolPad', 'muneoulgolAction', 'muneoulgolUnlock'].forEach(id => document.getElementById(id)?.remove());
  }

  function currentKind() {
    const text = (document.getElementById('hud')?.innerText || '') + (document.getElementById('phaseText')?.innerText || '');
    return /밤/.test(text) ? 'night' : 'day';
  }

  async function play(kind) {
    const target = kind === 'night' ? night : day;
    const other = kind === 'night' ? day : night;
    if (current === target && !target.paused) return;
    other.pause();
    other.currentTime = 0;
    current = target;
    try { await target.play(); } catch { enabled = false; }
    button.textContent = enabled ? (kind === 'night' ? '밤 음악 재생 중' : '낮 음악 재생 중') : '음악 켜기';
  }

  button.onclick = () => {
    enabled = !enabled;
    if (!enabled) {
      day.pause();
      night.pause();
      button.textContent = '음악 켜기';
      return;
    }
    play(currentKind());
  };

  setInterval(() => {
    cleanupOldButtons();
    if (enabled) play(currentKind());
  }, 1000);
})();

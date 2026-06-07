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

  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(panel);
    updateMusicLabel();
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

  setInterval(updateMusic, 1000);
})();

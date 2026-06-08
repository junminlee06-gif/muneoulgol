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
  const ch4Visited = new Set();

  const ch4Labels = {
    '바위 아래 뼈더미': 'bones',
    '말라붙은 물길': 'water',
    '겹친 발자국': 'footprint',
    '이빨 사이의 이름': 'tooth'
  };
  const ch4Info = {
    bones: ['바위 아래 뼈더미', '왼쪽 아래'],
    water: ['말라붙은 물길', '오른쪽 중간'],
    footprint: ['겹친 발자국', '왼쪽 위'],
    tooth: ['이빨 사이의 이름', '오른쪽 위']
  };

  const musicBtn = document.createElement('button');
  musicBtn.textContent = '음악 켜기';
  Object.assign(musicBtn.style, fixedButtonStyle('14px'));

  const ch4Btn = document.createElement('button');
  ch4Btn.textContent = '4장 진행';
  Object.assign(ch4Btn.style, fixedButtonStyle('58px'), { display: 'none', background: 'rgba(79,55,34,.96)', color: '#fff0d0', borderColor: '#c39b62' });

  const guide = document.createElement('div');
  guide.id = 'muneoulgolCh4Guide';
  Object.assign(guide.style, {
    display: 'none', position: 'fixed', left: '14px', bottom: '14px', zIndex: '99998',
    width: '270px', maxWidth: 'calc(100vw - 28px)', background: 'rgba(31,25,20,.94)',
    color: '#ded4c1', border: '1px solid #6e5a40', borderRadius: '8px', padding: '10px 12px',
    font: '12px/1.45 system-ui,-apple-system,Segoe UI,sans-serif', boxShadow: '0 6px 20px rgba(0,0,0,.45)'
  });

  const style = document.createElement('style');
  style.textContent = `
    .gamebox{overflow:hidden!important;}
    .dialog{position:fixed!important;transform:none!important;overflow:hidden!important;z-index:99990!important;box-sizing:border-box!important;padding:12px!important;}
    .dialog .speaker{margin-bottom:4px!important;}
    .dialog .text{overflow-y:auto!important;padding-right:4px!important;margin-bottom:8px!important;font-size:14px!important;line-height:1.42!important;}
    .dialog .options{overflow-y:auto!important;overscroll-behavior:contain!important;gap:5px!important;}
    .dialog button{scroll-margin:0!important;padding:6px 9px!important;font-size:13px!important;line-height:1.32!important;}
    @media(max-width:980px){.dialog{padding:10px!important}.dialog .text{font-size:13px!important}.dialog button{padding:6px 8px!important;font-size:13px!important}#muneoulgolCh4Guide{left:10px!important;right:10px!important;bottom:64px!important;width:auto!important}}
  `;

  function fixedButtonStyle(bottom) {
    return {
      position: 'fixed', right: '14px', bottom, zIndex: '99999', background: 'rgba(31,25,20,.94)',
      color: '#ded4c1', border: '1px solid #6e5a40', borderRadius: '8px', padding: '9px 12px',
      font: '14px system-ui,-apple-system,Segoe UI,sans-serif', boxShadow: '0 6px 20px rgba(0,0,0,.45)'
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(style);
    document.body.appendChild(musicBtn);
    document.body.appendChild(ch4Btn);
    document.body.appendChild(guide);
    tick();
  });

  function hudText() {
    const hud = document.getElementById('hud');
    const phase = document.getElementById('phaseText');
    return `${hud ? hud.innerText : ''}\n${phase ? phase.innerText : ''}`;
  }

  function timeKind() {
    const t = hudText();
    if (/·\s*밤\b|\/\s*밤\b|\b밤\s*\//.test(t)) return 'night';
    if (/·\s*낮\b|\/\s*낮\b|\b낮\s*\//.test(t)) return 'day';
    if (/·\s*새벽\b|\/\s*새벽\b|\b새벽\s*\//.test(t)) return 'day';
    return lastKind;
  }

  async function play(kind) {
    lastKind = kind;
    const target = kind === 'night' ? night : day;
    const other = kind === 'night' ? day : night;
    if (current === target && !target.paused) return updateMusicLabel();
    other.pause();
    other.currentTime = 0;
    current = target;
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
  ['click','keydown','touchstart'].forEach(ev => window.addEventListener(ev, () => { if (musicOn) play(timeKind()); }, { passive:true }));

  function anchorDialog() {
    const dialog = document.getElementById('dialog');
    const gamebox = document.querySelector('.gamebox');
    if (!dialog || !gamebox || dialog.style.display === 'none') return;
    const r = gamebox.getBoundingClientRect();
    const margin = r.width < 520 ? 10 : 16;
    const pad = 8;
    const maxH = Math.min(342, Math.max(220, r.height - margin * 2), Math.max(220, window.innerHeight - pad * 2));
    const width = Math.max(260, r.width - margin * 2);
    dialog.style.left = `${Math.round(Math.max(pad, r.left + margin))}px`;
    dialog.style.right = 'auto';
    dialog.style.width = `${Math.round(Math.min(width, window.innerWidth - pad * 2))}px`;
    dialog.style.maxHeight = `${Math.round(maxH)}px`;
    dialog.style.padding = r.width < 520 ? '10px' : '12px';
    const text = dialog.querySelector('.text');
    const opts = dialog.querySelector('.options');
    const count = opts ? opts.children.length : 0;
    if (text) text.style.maxHeight = `${Math.round(Math.min(count >= 4 ? 96 : 112, maxH * .34))}px`;
    if (opts) opts.style.maxHeight = `${Math.round(Math.min(count >= 4 ? 188 : count === 3 ? 150 : 120, maxH * .56))}px`;
    dialog.querySelectorAll('button').forEach(b => { b.style.fontSize = '13px'; b.style.lineHeight = '1.32'; });
    const h = Math.min(dialog.offsetHeight || maxH, maxH);
    dialog.style.top = `${Math.round(Math.max(pad, Math.min(r.bottom - h - margin, window.innerHeight - h - pad)))}px`;
    dialog.style.bottom = 'auto';
    if (document.activeElement && dialog.contains(document.activeElement)) { try { document.activeElement.blur(); } catch(e) {} }
  }

  function speakerText() {
    const s = document.getElementById('speaker');
    return s ? s.innerText : '';
  }

  function optionBox() { return document.getElementById('options'); }

  function ch4KeyFromSpeaker() {
    const s = speakerText();
    for (const label of Object.keys(ch4Labels)) if (s.includes(label)) return ch4Labels[label];
    return null;
  }

  function closeDialogDomOnly() {
    const d = document.getElementById('dialog');
    if (d) d.style.display = 'none';
  }

  function trackCh4DayOptions() {
    const key = ch4KeyFromSpeaker();
    const opts = optionBox();
    if (!opts || !key) return;
    if (ch4Visited.has(key)) {
      const label = ch4Info[key][0];
      const speaker = document.getElementById('speaker');
      const text = document.getElementById('dialogText');
      if (speaker) speaker.textContent = '이미 확인한 흔적';
      if (text) text.textContent = `${label}은 이미 조사했다. 남은 흔적을 찾아 이동하자.`;
      opts.innerHTML = '';
      const b = document.createElement('button');
      b.textContent = '다른 흔적을 찾는다';
      b.onclick = closeDialogDomOnly;
      opts.appendChild(b);
      return;
    }
    opts.querySelectorAll('button').forEach(btn => {
      if (btn.dataset.ch4Tracked) return;
      btn.dataset.ch4Tracked = '1';
      btn.addEventListener('click', () => setTimeout(() => { ch4Visited.add(key); updateGuide(); }, 80), { capture:true });
    });
  }

  function patchNightBlackRock() {
    const s = speakerText();
    if (!s.includes('밤의 검은 바위')) return;
    const opts = optionBox();
    if (!opts || opts.dataset.nightRockPatched === '1') return;
    opts.dataset.nightRockPatched = '1';
    const buttons = Array.from(opts.querySelectorAll('button'));
    buttons.forEach(btn => {
      const original = btn.onclick;
      btn.onclick = function(ev) {
        let ok = true;
        try { if (typeof original === 'function') original.call(this, ev); } catch (e) { ok = false; console.warn(e); }
        setTimeout(() => {
          if (speakerText().includes('밤의 검은 바위')) showNightFallback(ok ? '선택은 처리됐지만 화면 전환이 멈췄습니다.' : '선택 처리 중 오류가 났습니다.');
        }, 250);
      };
    });
    const extra = document.createElement('button');
    extra.textContent = '4장 새벽으로 진행한다';
    extra.style.background = '#6b4e2f';
    extra.style.borderColor = '#c39b62';
    extra.onclick = () => {
      const first = buttons[0];
      if (first && typeof first.onclick === 'function') first.onclick.call(first, new Event('click'));
      setTimeout(() => showNightFallback('새벽 진행 보조를 실행했습니다.'), 300);
    };
    opts.appendChild(extra);
  }

  function showNightFallback(msg) {
    const s = document.getElementById('speaker');
    const t = document.getElementById('dialogText');
    const opts = optionBox();
    if (!s || !t || !opts) return;
    s.textContent = '4장 새벽 진행 안내';
    t.textContent = `${msg}\n\n새벽 기록 화면으로 넘어가지 않으면, 오른쪽 아래의 “새벽으로 진행” 버튼을 눌러 기록 단계로 이동하세요.`;
    opts.innerHTML = '';
    const b = document.createElement('button');
    b.textContent = '닫고 새벽 진행 버튼을 누른다';
    b.onclick = closeDialogDomOnly;
    opts.appendChild(b);
    ch4Btn.textContent = '새벽으로 진행';
    ch4Btn.style.display = 'block';
    ch4Btn.onclick = () => {
      // Prefer the original route if it is reachable through the visible scene buttons.
      const fake = document.createElement('button');
      fake.textContent = '새벽 기록으로 이동';
      document.body.appendChild(fake);
      fake.remove();
      showTemporaryGuide('검은 바위 앞에서 새벽 기록을 정리하세요. 화면이 그대로면 검은 바위 앞에서 상호작용하세요.');
    };
  }

  function currentInteractionLabel() {
    const h = hudText();
    const m = h.match(/상호작용:\s*([^\n]+)/);
    return m ? m[1].trim() : '';
  }

  document.addEventListener('keydown', ev => {
    if (!['Enter',' ','Spacebar','z','Z'].includes(ev.key)) return;
    const h = hudText();
    if (!h.includes('4장') || !h.includes('흔적 조사')) return;
    const key = ch4Labels[currentInteractionLabel()];
    if (!key || !ch4Visited.has(key)) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    showTemporaryGuide(`이미 확인한 흔적입니다. ${nextUnvisitedText()}을 찾아가세요.`);
  }, true);

  function nextUnvisitedText() {
    const k = Object.keys(ch4Info).find(x => !ch4Visited.has(x));
    return k ? ch4Info[k][0] : '중앙의 검은 바위';
  }

  function showTemporaryGuide(msg) {
    guide.style.display = 'block';
    guide.innerHTML = `<b style="color:#d3ad70">안내</b><br>${msg}`;
  }

  function callGlobal(name, ...args) {
    const fn = window[name];
    if (typeof fn === 'function') { try { fn(...args); return true; } catch(e) {} }
    return false;
  }

  function patchEndButton() {
    const s = speakerText();
    const t = (document.getElementById('dialogText') || {}).innerText || '';
    const opts = optionBox();
    if (!opts || (!s.includes('4장 종료') && !t.includes('다음 장은 마지막 산제다'))) return;
    const first = opts.querySelector('button');
    if (!first || first.textContent === '5장으로 진행한다') return;
    first.textContent = '5장으로 진행한다';
    first.onclick = () => callGlobal('startChapter5');
  }

  function updateAssist() {
    const h = hudText();
    const dialog = document.getElementById('dialog');
    const report = document.getElementById('reportPanel');
    const dialogOpen = dialog && dialog.style.display !== 'none';
    const reportOpen = report && report.style.display !== 'none';
    ch4Btn.style.display = 'none';
    if (!h.includes('4장') || dialogOpen || reportOpen) return;
    if (h.includes('흔적 조사') && ch4Visited.size >= 4) {
      ch4Btn.textContent = '검은등 대면'; ch4Btn.style.display = 'block';
      ch4Btn.onclick = () => showTemporaryGuide('중앙의 검은 바위 앞으로 이동해서 상호작용하세요.');
    } else if (h.includes('밤 행동: 완료')) {
      ch4Btn.textContent = '새벽으로 진행'; ch4Btn.style.display = 'block';
      ch4Btn.onclick = () => showTemporaryGuide('검은 바위 앞에서 새벽 기록을 정리하세요.');
    } else if (h.includes('새벽')) {
      ch4Btn.textContent = '4장 보고서'; ch4Btn.style.display = 'block';
      ch4Btn.onclick = () => showTemporaryGuide('검은 바위 앞에서 상호작용해 4장 보고서를 여세요.');
    }
  }

  function updateGuide() {
    const h = hudText();
    const dialog = document.getElementById('dialog');
    const report = document.getElementById('reportPanel');
    if (!h.includes('4장') || (report && report.style.display !== 'none') || (dialog && dialog.style.display !== 'none')) { guide.style.display = 'none'; return; }
    guide.style.display = 'block';
    if (h.includes('흔적 조사')) {
      const rows = Object.keys(ch4Info).map(k => {
        const done = ch4Visited.has(k); const [label,pos] = ch4Info[k];
        return `<div style="display:flex;justify-content:space-between;gap:8px;opacity:${done ? .52 : 1}"><span>${done ? '✓' : '•'} ${label}</span><span style="color:#b7925d">${pos}</span></div>`;
      }).join('');
      guide.innerHTML = `<b style="color:#d3ad70">4장 흔적 안내 ${ch4Visited.size}/4</b><div style="margin-top:6px">${rows}</div><div style="margin-top:7px;color:#c8b89a">같은 흔적은 다시 조사하지 말고, 남은 위치를 찾으세요.</div>`;
    } else if (h.includes('밤')) {
      guide.innerHTML = '<b style="color:#d3ad70">4장 밤 안내</b><div style="margin-top:6px">검은 바위·도리의 이름·사량의 바위턱 중 하나를 고릅니다.</div>';
    }
  }

  function tick() {
    if (musicOn) play(timeKind());
    updateMusicLabel();
    trackCh4DayOptions();
    patchNightBlackRock();
    anchorDialog();
    patchEndButton();
    updateAssist();
    updateGuide();
  }

  setInterval(tick, 200);
})();

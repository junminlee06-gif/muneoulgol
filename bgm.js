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
  let introRecovered = false;

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
    #muneoulgolPad,#muneoulgolAction,#muneoulgolUnlock{display:none!important;pointer-events:none!important;}
    #muneoulgolMusic{position:fixed;right:18px;bottom:18px;z-index:99999;background:rgba(31,25,20,.94);color:#ded4c1;border:1px solid #6e5a40;border-radius:10px;padding:9px 12px;font:14px system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.42)}
    @media(max-width:980px){.dialog{left:10px!important;right:10px!important;bottom:10px!important;max-height:54vh!important}.dialog .text{max-height:17vh!important}.dialog .options{max-height:24vh!important}}
  `;

  const button = document.createElement('button');
  button.id = 'muneoulgolMusic';
  button.textContent = '음악 켜기';

  function removeOldControlOverlays() {
    ['muneoulgolPad', 'muneoulgolAction', 'muneoulgolUnlock'].forEach(id => {
      const node = document.getElementById(id);
      if (node) node.remove();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    removeOldControlOverlays();
    document.head.appendChild(style);
    document.body.appendChild(button);
    updateLabel();
    setTimeout(recoverIntroIfNeeded, 450);
    setTimeout(recoverIntroIfNeeded, 1200);
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

  function recoverIntroIfNeeded() {
    if (introRecovered) return;
    const dialog = document.getElementById('dialog');
    const report = document.getElementById('reportPanel');
    const cutscene = document.getElementById('cutscene');
    const hud = text('hud');
    const speaker = text('speaker');

    const dialogVisible = dialog && dialog.style.display !== 'none';
    const reportVisible = report && report.style.display !== 'none';
    const cutsceneVisible = cutscene && cutscene.style.display === 'block';

    if (dialogVisible || reportVisible || cutsceneVisible) return;

    const looksLikeFreshStart = !speaker && (!hud || hud.includes('남쪽 고갯길') || hud.includes('1장'));
    if (!looksLikeFreshStart) return;

    try {
      const show = Function('return typeof showScene === "function" ? showScene : null')();
      const st = Function('return typeof state !== "undefined" ? state : null')();
      if (st && st.chapter === 1 && show) {
        introRecovered = true;
        show('intro');
      }
    } catch (e) {}
  }

  setInterval(() => {
    removeOldControlOverlays();
    recoverIntroIfNeeded();
    if (enabled) play(timeKind());
    updateLabel();
  }, 1000);
})();

(() => {
  'use strict';

  const actionKeys = new Set(['Enter', ' ', 'z', 'Z']);
  const locIds = {
    '촌장집': 'chief',
    '마을 우물': 'well',
    '무당집': 'shaman',
    '방앗간': 'mill',
    '관아 임시처소': 'office'
  };
  const placeName = { chief: '촌장집', well: '마을 우물', shaman: '무당집', mill: '방앗간', office: '관아 임시처소' };
  const patch = {
    started: false,
    finished: false,
    dialogOpen: false,
    stage: 'd1_day',
    day: 1,
    count: 0,
    max: 3,
    visited: {},
    report: null,
    bias: { beast: 0, human: 0, ritual: 0, conceal: 0, unknown: 0 },
    trust: { wolseon: 0, makrye: 0, eulpa: 0, hunter: 0, office: 0 },
    official: [],
    unofficial: [],
    clues: [],
    flags: {}
  };

  function byId(id) { return document.getElementById(id); }
  function getText(id) { const n = byId(id); return n ? n.innerText : ''; }
  function hudText() { return getText('hud') + '\n' + getText('phaseText'); }
  function reportVisible() { const n = byId('reportPanel'); return n && n.style.display === 'block'; }
  function originalDialogVisible() {
    const d = byId('dialog');
    if (!d || patch.dialogOpen) return false;
    return d.style.display === 'block' || d.style.display === '' && getText('speaker');
  }
  function currentLoc() {
    const m = getText('hud').match(/상호작용:\s*([^\n]+)/);
    if (!m) return null;
    return locIds[m[1].trim()] || null;
  }
  function inCh1VillageContext() {
    const h = hudText();
    if (patch.finished) return false;
    if (h.includes('2장') || h.includes('3장') || h.includes('4장') || h.includes('5장')) return false;
    return h.includes('무너울골') && (h.includes('1장') || patch.started);
  }
  function addUnique(arr, value) { if (value && !arr.includes(value)) arr.push(value); }
  function apply(effect) {
    if (!effect) return;
    (effect.bias || []).forEach(([k, v]) => { patch.bias[k] = (patch.bias[k] || 0) + v; });
    (effect.trust || []).forEach(([k, v]) => { patch.trust[k] = (patch.trust[k] || 0) + v; });
    (effect.official || []).forEach(v => addUnique(patch.official, v));
    (effect.unofficial || []).forEach(v => addUnique(patch.unofficial, v));
    (effect.clues || []).forEach(v => addUnique(patch.clues, v));
    (effect.flags || []).forEach(([k, v]) => { patch.flags[k] = v; });
  }
  function esc(s) { return String(s).replace(/[&<>\"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[m])); }
  function koBias(k) { return ({ beast: '범/짐승', human: '사람', ritual: '산제', conceal: '은폐', unknown: '불명' })[k] || k; }
  function koTrust(k) { return ({ wolseon: '월선', makrye: '막례', eulpa: '을파', hunter: '사냥꾼', office: '관아' })[k] || k; }
  function trustWord(v) { return v <= -2 ? '경계' : v === -1 ? '불신' : v === 0 ? '중립' : v === 1 ? '관심' : v === 2 ? '신뢰' : '협력'; }
  function renderSide() {
    if (!patch.started || patch.finished) return;
    const phase = byId('phaseText');
    const meters = byId('meters');
    const official = byId('official');
    const unofficial = byId('unofficial');
    const clues = byId('cluePills');
    if (phase) phase.textContent = `1장 확장 · ${patch.day}일차 · ${stageLabel()} · 조사 ${patch.count}/${patch.max}`;
    if (meters) {
      const bias = Object.entries(patch.bias).map(([k, v]) => `<div class="meter"><span>${koBias(k)}</span><b>${v}</b></div>`).join('');
      const trust = Object.entries(patch.trust).map(([k, v]) => `<div class="meter"><span>${koTrust(k)}</span><b>${trustWord(v)}</b></div>`).join('');
      meters.innerHTML = bias + trust;
    }
    if (official) official.innerHTML = patch.official.map(v => `<li>${esc(v)}</li>`).join('') || '<li class="small">아직 없음</li>';
    if (unofficial) unofficial.innerHTML = patch.unofficial.map(v => `<li>${esc(v)}</li>`).join('') || '<li class="small">아직 없음</li>';
    if (clues) clues.innerHTML = patch.clues.map(v => `<span class="pill">단서: ${esc(v)}</span>`).join('') || '<span class="small">아직 없음</span>';
  }
  function stageLabel() {
    if (patch.stage === 'd1_day') return '낮 조사';
    if (patch.stage === 'd1_office') return '관아 정리';
    if (patch.stage === 'd1_night') return '첫 밤';
    if (patch.stage === 'd1_report') return '첫 보고';
    if (patch.stage === 'd2_day') return '둘째 낮';
    if (patch.stage === 'd2_night') return '두 번째 밤';
    if (patch.stage === 'd2_dawn') return '새벽 정리';
    return patch.stage;
  }
  function toast(msg) {
    const t = byId('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.style.display = 'none'; }, 1400);
  }
  function showCustom(speaker, body, options) {
    const dialog = byId('dialog');
    const sp = byId('speaker');
    const tx = byId('dialogText');
    const box = byId('options');
    if (!dialog || !sp || !tx || !box) return;
    patch.dialogOpen = true;
    patch.started = true;
    sp.textContent = speaker;
    tx.textContent = body;
    box.innerHTML = '';
    options.forEach((op, i) => {
      const btn = document.createElement('button');
      btn.textContent = `${i + 1}. ${op.text}`;
      btn.onclick = () => {
        apply(op.effect);
        if (op.run) op.run();
        if (!op.keepOpen) closeCustom();
        renderSide();
      };
      box.appendChild(btn);
    });
    dialog.style.display = 'block';
    renderSide();
  }
  function closeCustom() {
    const dialog = byId('dialog');
    if (dialog) dialog.style.display = 'none';
    patch.dialogOpen = false;
  }
  function consume(place) {
    const key = `${patch.stage}:${place}`;
    if (patch.visited[key]) {
      toast('이미 조사한 곳이다. 다른 장소를 보자.');
      return false;
    }
    patch.visited[key] = true;
    patch.count += 1;
    return true;
  }
  function afterDayInvestigation() {
    if (patch.count >= patch.max) {
      if (patch.stage === 'd1_day') showD1Dusk();
      else if (patch.stage === 'd2_day') showD2Dusk();
    } else {
      toast(`조사 ${patch.count}/${patch.max} 완료. 다른 장소로 이동하자.`);
    }
  }
  function handleInteraction(loc) {
    patch.started = true;
    if (patch.stage === 'd1_day') return showD1Location(loc);
    if (patch.stage === 'd1_office') {
      if (loc !== 'office') return toast('관아 임시처소에서 첫날 기록을 정리해야 한다.');
      return showD1NightStart();
    }
    if (patch.stage === 'd1_night') return showD1Night(loc);
    if (patch.stage === 'd2_day') return showD2Location(loc);
    if (patch.stage === 'd2_night') return showD2Night(loc);
    if (patch.stage === 'd2_dawn') {
      if (loc !== 'office') return toast('관아 임시처소에서 1장 최종 보고를 마무리하자.');
      return showFinalBridge();
    }
  }
  function showD1Location(loc) {
    if (!['chief', 'well', 'shaman', 'mill'].includes(loc)) return toast('1일차 낮에는 촌장집, 우물, 무당집, 방앗간을 조사하자.');
    const scenes = {
      chief: ['을파의 장부', '을파는 장부를 닫지 않았다. 호적 초안, 세금 장부, 벌목 기록이 가지런하다. 그러나 산제 비용 칸만 세 해째 비어 있다.', [
        opt('범 습격으로 정리하면 마을이 안정될 것이라 본다.', { bias: [['beast', 1]], trust: [['eulpa', 1], ['office', 1]], official: ['촌장 진술: 범 습격 가능성 높음'] }),
        opt('산제 비용이 끊긴 해와 실종을 연결해 본다.', { bias: [['ritual', 1]], trust: [['eulpa', -1]], clues: ['산제 비용 3년 공백'], unofficial: ['산제 중단과 벌목량 증가가 같은 해부터 겹친다'] }),
        opt('장부가 너무 잘 정리되어 있다고 지적한다.', { bias: [['conceal', 1]], trust: [['eulpa', -1]], unofficial: ['을파는 준비된 답만 내놓는 듯했다'] }),
        opt('실종자 이름부터 공식 기록에 넣는다.', { bias: [['human', 1]], trust: [['wolseon', 1]], official: ['실종 아동 이름: 도리'], clues: ['도리의 이름'] })
      ]],
      well: ['우물가와 월선', '우물물은 고요한데, 산 쪽에서 물소리가 들린다. 월선은 젖은 짚신 이야기를 꺼내자 얼굴을 돌렸다.', [
        opt('월선에게 도리의 이름을 직접 묻는다.', { bias: [['human', 1]], trust: [['wolseon', 1]], official: ['아이 이름: 도리'], clues: ['도리의 이름'] }),
        opt('아이들이 들은 노래를 묻는다.', { bias: [['ritual', 1]], clues: ['우물가 산제 노래'], unofficial: ['검은 등 넘어, 물소리 따라, 이름은 두고 발만 간다는 노래'] }),
        opt('우물 밑을 살펴본다.', { bias: [['unknown', 1]], clues: ['우물 밑 나무패'], unofficial: ['우물 밑에 이름패 같은 물건이 보였다'] }),
        opt('주민들이 말을 아끼는 이유를 본다.', { bias: [['conceal', 1]], trust: [['eulpa', -1]], unofficial: ['아이들은 어른들 눈치를 보고 있었다'] })
      ]],
      shaman: ['막례의 무당집', '막례는 방울을 뒤집어 놓고 있었다. “산은 기록을 못 한다. 그래서 관아 사람이 온 게지.”', [
        opt('증거 없이 믿을 수 없다고 말한다.', { bias: [['unknown', 1]], trust: [['makrye', -1], ['office', 1]], official: ['무당 진술: 산길 이상 주장'] }),
        opt('산제가 무엇을 막는 의례였는지 묻는다.', { bias: [['ritual', 1]], trust: [['makrye', 1]], clues: ['검은등이라는 산군 별칭'], unofficial: ['산제는 부르는 의식보다 문을 닫는 의식에 가까웠다'] }),
        opt('사람이 산의 이름을 이용했는지 묻는다.', { bias: [['human', 1]], trust: [['makrye', 1]], unofficial: ['막례는 사람이 산 이름을 빌릴 때가 있다고 했다'] }),
        opt('마을을 선동하지 말라고 경고한다.', { bias: [['conceal', 1]], trust: [['eulpa', 1], ['makrye', -2]], official: ['무당 감시 필요 가능성'] })
      ]],
      mill: ['방앗간', '낮의 방앗간은 평범해 보인다. 그러나 물레 축은 젖어 있고, 돌확 아래에는 아이 짚신과 같은 풀이 끼어 있다.', [
        opt('짚신 풀 조각을 증거로 챙긴다.', { bias: [['human', 1]], clues: ['짚신 풀 조각'], official: ['도리가 방앗간을 지나간 정황'] }),
        opt('물레 축의 물기를 확인한다.', { bias: [['ritual', 1]], clues: ['젖은 물레 축'], unofficial: ['물레는 멈춰 있었지만 밤새 돈 것처럼 젖어 있었다'] }),
        opt('검은 털을 줍는다.', { bias: [['beast', 1]], clues: ['검은 털'], official: ['방앗간에서 짐승 털 발견'] }),
        opt('돌확이 의례 도구였는지 본다.', { bias: [['ritual', 1]], clues: ['제물 씻던 돌확'], unofficial: ['돌확 홈은 산 쪽 물길로 이어져 있었다'] })
      ]]
    };
    const s = scenes[loc];
    showCustom(s[0], s[1], s[2].map(o => withRun(o, () => { if (consume(loc)) afterDayInvestigation(); })));
  }
  function showD1Dusk() {
    showCustom('1일차 해질녘', '우물가에서 아이 하나가 산제 노래를 부르다 멈춘다.\n\n“도리가 같이 불렀어요.”\n\n을파는 소문을 막으라 하고, 월선은 우물가에 주저앉는다.', [
      { text: '아이에게 더 묻는다.', effect: { bias: [['human', 1]], trust: [['eulpa', -1]], clues: ['도리 목소리 목격담'] }, run: goOffice },
      { text: '월선을 먼저 진정시킨다.', effect: { trust: [['wolseon', 2]], unofficial: ['월선은 도리가 아직 산길에 있다고 믿었다'] }, run: goOffice },
      { text: '을파 말대로 소문을 막는다.', effect: { bias: [['conceal', 1]], trust: [['eulpa', 1], ['wolseon', -1]], official: ['우물가 소란 진정 조치'] }, run: goOffice },
      { text: '막례를 불러 노래를 확인한다.', effect: { bias: [['ritual', 1]], trust: [['makrye', 1]], clues: ['산제 노래의 두 번째 구절'] }, run: goOffice }
    ]);
    function goOffice() { patch.stage = 'd1_office'; patch.count = 0; patch.max = 1; toast('관아 임시처소로 이동해 밤을 맞자.'); }
  }
  function showD1NightStart() {
    showCustom('관아 임시처소', '기록장 위에 공식 기록과 비공식 기록이 따로 쌓인다.\n\n해루가 묻는다. “이런 건 공식 기록에 못 쓰겠지요?”\n\n밖에서는 방앗간 물레 소리와 우물 물소리가 엇갈린다.', [
      { text: '밖으로 나가 밤의 흔적을 직접 확인한다.', run: () => { patch.stage = 'd1_night'; patch.max = 1; patch.count = 0; toast('밤 행동은 한 번뿐이다.'); } },
      { text: '관아 지침대로 더 들어가지 않는다.', effect: { bias: [['unknown', 1]], trust: [['office', 1]], official: ['야간 추가 진입 보류'] }, run: showD1Report, keepOpen: true }
    ]);
  }
  function showD1Night(loc) {
    if (!['well', 'shaman', 'mill'].includes(loc)) return toast('첫 밤에는 우물, 무당집, 방앗간 중 한 곳만 확인하자.');
    const scenes = {
      well: ['우물의 밤', '우물 속에서 이름이 한 박자 늦게 돌아온다. 월선의 목소리와 아이의 목소리가 겹친다.', [
        opt('나무패를 꺼내려 한다.', { bias: [['human', 1]], clues: ['젖은 이름패'], unofficial: ['우물 속에서 도리 이름패 같은 물건을 보았다'] }),
        opt('도리의 이름을 부른다.', { bias: [['ritual', 1]], trust: [['wolseon', 1]], unofficial: ['도리 이름에 우물이 반응했다'] }),
        opt('우물가를 봉쇄한다.', { bias: [['unknown', 1]], trust: [['office', 1]], official: ['우물가 야간 접근 금지'] })
      ]],
      shaman: ['막례의 밤', '막례는 잠들지 않았다. 금줄을 맨 손끝이 떨린다. “물레 소리 말고, 그 안에 섞인 숨을 들었느냐.”', [
        opt('창귀라는 말인가 묻는다.', { bias: [['ritual', 1]], trust: [['makrye', 1]], unofficial: ['막례: 창귀 가능성 언급'] }),
        opt('보낼 방법을 묻는다.', { bias: [['ritual', 1]], clues: ['천도 조건: 이름과 길'], unofficial: ['길을 잃은 이름은 부르면 올 수 있지만 어디로 올지 모른다'] }),
        opt('이 말을 공식 기록에 넣겠다고 한다.', { trust: [['makrye', -1], ['office', -1]], official: ['무당의 비정상 진술 확보'] })
      ]],
      mill: ['방앗간의 밤', '멈춰 있던 물레가 천천히 돈다. 물소리 사이로 아이 목소리가 들린다.\n\n“집에 가려 했는데, 길이 자꾸 산으로 갔어요.”', [
        opt('도리의 이름을 부른다.', { bias: [['ritual', 1]], trust: [['wolseon', 1]], unofficial: ['밤 방앗간에서 도리의 목소리 확인'] }),
        opt('누가 데려갔느냐고 묻는다.', { bias: [['human', 1]], clues: ['물가에서 끊긴 큰 발자국'] }),
        opt('검은 털과 물소리를 함께 기록한다.', { bias: [['beast', 1], ['ritual', 1]], clues: ['젖은 검은 털'], unofficial: ['범 털 같은데 물에 오래 담긴 냄새가 났다'] })
      ]]
    };
    const s = scenes[loc];
    showCustom(s[0], s[1], s[2].map(o => withRun(o, showD1Report, true)));
  }
  function showD1Report() {
    patch.stage = 'd1_report';
    showCustom('첫 보고서', '새벽이 되었다.\n\n보고서는 단순한 정리가 아니다. 무엇을 공식 진실로 만들 것인지 정하는 일이다.', [
      { text: '범의 습격 가능성', effect: { bias: [['beast', 2]], trust: [['office', 1], ['eulpa', 1], ['wolseon', -1]], official: ['1장 첫 보고: 범의 습격 가능성'], unofficial: ['짚신의 습기와 사람 발자국은 보고서에서 약하게 처리되었다'], flags: [['hunterArrived', true]] }, run: () => beginDay2('beast') },
      { text: '사람이 아이를 데려간 흔적', effect: { bias: [['human', 2]], trust: [['wolseon', 1], ['eulpa', -1]], official: ['1장 첫 보고: 유괴 또는 마을 사람 개입 가능성'], flags: [['humanReport', true]] }, run: () => beginDay2('human') },
      { text: '산제와 관련된 흔적', effect: { bias: [['ritual', 2]], trust: [['makrye', 2], ['office', -1], ['eulpa', -1]], official: ['1장 첫 보고: 산제 관련 비정상 정황'], flags: [['ritualReport', true]] }, run: () => beginDay2('ritual') },
      { text: '마을 은폐 가능성', effect: { bias: [['conceal', 2]], trust: [['eulpa', -2], ['wolseon', 1]], official: ['1장 첫 보고: 마을 내부 은폐 가능성'], flags: [['concealReport', true]] }, run: () => beginDay2('conceal') },
      { text: '판단 보류', effect: { bias: [['unknown', 2]], trust: [['office', -1]], official: ['1장 첫 보고: 원인 불명'], unofficial: ['서로 맞지 않는 단서들을 삭제하지 않고 남겨 두었다'] }, run: () => beginDay2('unknown') }
    ]);
  }
  function beginDay2(kind) {
    patch.report = kind;
    patch.day = 2;
    patch.stage = 'd2_day';
    patch.count = 0;
    patch.max = 2;
    showCustom('2일차 아침', day2MorningText(kind), [{ text: '둘째 날 조사를 시작한다.', run: closeCustom }]);
  }
  function day2MorningText(kind) {
    if (kind === 'beast') return '범이라는 말은 마을을 겁주지만 동시에 안심시켰다. 을파는 협조적이고, 장승 아래에는 낯선 사냥꾼이 서 있다.';
    if (kind === 'human') return '사람이 아이를 데려갔다는 문장은 범보다 깊게 마을을 물었다. 월선은 당신을 기다리고 있고, 을파는 멀리서 보고 있다.';
    if (kind === 'ritual') return '마을은 조용하다. 그러나 조용한 것이 아니라, 누군가 소리를 덮어 누르는 듯하다. 막례가 장승 뒤에서 기다린다.';
    if (kind === 'conceal') return '당신이 공터에 나서자 말소리가 끊겼다. 누군가 숨기고 있다는 문장은 마을 전체를 용의자로 만들었다.';
    return '마을은 어제와 같아 보였다. 아무것도 달라지지 않았다는 사실이 오히려 불길했다.';
  }
  function showD2Location(loc) {
    if (!['chief', 'well', 'shaman', 'mill'].includes(loc)) return toast('2일차 낮에는 마을의 핵심 장소를 다시 확인하자.');
    const scenes = {
      chief: ['2일차 촌장집', '을파는 장부를 닫지 않는다. 그러나 당신의 첫 보고서에 따라 펼쳐 놓은 장부의 종류가 다르다.', [
        opt('산제를 끊은 이유를 이해한다고 말한다.', { trust: [['eulpa', 1]], clues: ['세금·군역·흉년과 산제 중단의 겹침'] }),
        opt('그래도 금지된 숲을 벤 건 잘못이라고 말한다.', { bias: [['ritual', 1]], trust: [['eulpa', -1]], unofficial: ['금지된 숲 벌목과 산제 중단의 연결'] }),
        opt('마을이 증거를 숨긴 정황을 묻는다.', { bias: [['conceal', 1]], trust: [['eulpa', -1]], unofficial: ['을파는 헛간 이야기에 표정을 닫았다'] }),
        opt('마루라는 벌목꾼 이름을 확인한다.', { bias: [['human', 1]], clues: ['마루: 표식 나무 벌목 담당'] })
      ]],
      well: ['2일차 우물가', '월선은 도리의 이름을 낮게 반복한다. “이름을 잊으면 그 애가 정말 없어질 것 같아서요.”', [
        opt('도리의 이름을 공식 기록에 남기겠다.', { trust: [['wolseon', 2]], official: ['실종 아동의 이름은 도리'], clues: ['도리의 이름'] }),
        opt('밤에는 이름을 부르지 말라고 한다.', { trust: [['wolseon', -1]], official: ['유족 야간 접근 자제 요청'] }),
        opt('도리가 부른 노래를 묻는다.', { bias: [['ritual', 1]], clues: ['노래 조각: 검은 등 넘어 / 물소리 따라'] }),
        opt('짚신이 도리 것이 맞느냐고 묻는다.', { bias: [['human', 1]], trust: [['wolseon', 1]], clues: ['짚신은 도리의 것'] })
      ]],
      shaman: ['2일차 막례의 뒤뜰', '막례의 뒤뜰에는 말라붙은 풀과 젖은 돌이 함께 놓여 있다. “산은 제물을 달라 하지 않는다. 사람이 산의 이름을 빌릴 때가 있지.”', [
        opt('산제가 아이 실종과 관련 있습니까?', { bias: [['ritual', 1]], trust: [['makrye', 1]], unofficial: ['막례는 산제와 실종 사이의 말을 아꼈다'] }),
        opt('사람이 산제 이름을 이용했다는 뜻입니까?', { bias: [['human', 1]], trust: [['makrye', 1]], unofficial: ['사람이 산의 이름을 빌렸을 가능성'] }),
        opt('이 말을 보고서에 남기겠습니다.', { official: ['막례 진술: 산제 이름이 실종에 이용됐을 가능성'], trust: [['office', -1], ['makrye', 1]] }),
        opt('비공식 기록에만 남기겠습니다.', { trust: [['makrye', 2]], unofficial: ['산의 등은 검고, 물의 입은 닫히지 않는다'] })
      ]],
      mill: ['2일차 방앗간', '물레는 멈춰 있지만 축축하다. 밤새 돌아간 것처럼 나무가 물을 먹었다.', [
        opt('검은 털을 보관한다.', { bias: [['beast', 1]], clues: ['젖은 검은 털'] }),
        opt('돌확을 조사한다.', { bias: [['ritual', 1]], clues: ['제물 씻는 절차'] }),
        opt('물길을 따라가 본다.', { bias: [['ritual', 1], ['unknown', 1]], clues: ['물길이 골짜기와 이어짐'] }),
        opt('사냥꾼의 말을 듣는다.', { bias: [['beast', 1]], trust: [['hunter', 1]], unofficial: ['사냥꾼: 범이면 발톱이 먼저 말한다. 그런데 이건 물이 먼저 온다'] })
      ]]
    };
    const s = scenes[loc];
    showCustom(s[0], s[1], s[2].map(o => withRun(o, () => { if (consume(loc)) afterDayInvestigation(); })));
  }
  function showD2Dusk() {
    showCustom('2일차 해질녘', '마을은 다시 공터에 모였다. 을파는 마을을 지키라 했고, 월선은 도리의 이름을 잊지 말라 했다. 막례는 산의 말을 함부로 문서에 적지 말라 했다.', [
      { text: '을파의 설명을 따른다.', effect: { bias: [['beast', 1]], trust: [['eulpa', 1], ['wolseon', -1]] }, run: beginD2Night },
      { text: '월선의 증언을 믿는다.', effect: { bias: [['human', 1]], trust: [['wolseon', 2]] }, run: beginD2Night },
      { text: '막례의 경고를 듣는다.', effect: { bias: [['ritual', 1]], trust: [['makrye', 2], ['office', -1]] }, run: beginD2Night },
      { text: '누구도 완전히 믿지 않는다.', effect: { bias: [['unknown', 1]], unofficial: ['모든 증언은 서로 다른 방향을 가리켰다'] }, run: beginD2Night }
    ]);
    function beginD2Night() { patch.stage = 'd2_night'; patch.count = 0; patch.max = 1; toast('두 번째 밤 행동은 한 번뿐이다.'); }
  }
  function showD2Night(loc) {
    if (!['well', 'shaman', 'mill', 'chief'].includes(loc)) return toast('두 번째 밤에는 우물, 무당집, 방앗간, 촌장집 주변 중 한 곳만 보자.');
    const scenes = {
      chief: ['헛간 쪽 밤', '촌장집 뒤 헛간에서 젖은 짚을 뒤집는 소리가 들렸다. 발자국은 산이 아니라 마을 안쪽으로 향한다.', [
        opt('젖은 짚단을 확인한다.', { bias: [['conceal', 1]], clues: ['헛간의 젖은 짚단'], unofficial: ['젖은 흔적을 숨기려 한 듯했다'] }),
        opt('을파에게 바로 묻는다.', { trust: [['eulpa', -2]], official: ['촌장 은폐 가능성 조사 필요'] }),
        opt('지금은 지켜보기만 한다.', { bias: [['unknown', 1]], unofficial: ['을파는 밤에도 장부를 태우지 않았다. 다만 옮겼다'] })
      ]],
      well: ['두 번째 밤의 우물', '월선이 도리 이름을 부른다. 우물 안에서 같은 이름이, 조금 더 어린 목소리로 되돌아온다.', [
        opt('월선과 함께 이름을 부른다.', { trust: [['wolseon', 2]], bias: [['ritual', 1]], clues: ['도리 이름 반응'] }),
        opt('월선을 멈춘다.', { trust: [['wolseon', -1]], bias: [['unknown', 1]], official: ['유족 야간 행동 제지'] }),
        opt('우물 밑 이름패를 다시 본다.', { bias: [['human', 1]], clues: ['도리 이름패'] })
      ]],
      shaman: ['막례의 금줄', '무당집 앞 금줄이 한 겹 더 매인다. 막례는 산제단 쪽을 보며 이름을 삼킨다.', [
        opt('금줄을 같이 맨다.', { trust: [['makrye', 1]], bias: [['ritual', 1]], clues: ['임시 금줄'] }),
        opt('제문 첫 구절을 묻는다.', { trust: [['makrye', 1]], clues: ['제문 조각: 문을 닫아라'] }),
        opt('무당을 공식 감시 대상으로 둔다.', { trust: [['makrye', -1], ['office', 1]], official: ['무당 감시 지속'] })
      ]],
      mill: ['방앗간 돌확', '물레는 멈춰 있다. 그런데 물소리만 계속 난다. 돌확 위로 검은 털 하나가 떠오른다.', [
        opt('검은 털을 건진다.', { bias: [['beast', 1]], clues: ['방앗간 돌확의 검은 털'] }),
        opt('돌확의 물길을 막는다.', { bias: [['ritual', 1]], clues: ['제물 씻는 물길 차단'] }),
        opt('물소리에 귀를 댄다.', { bias: [['unknown', 1]], unofficial: ['물소리 속에는 도리만이 아니라 다른 이름들도 섞여 있었다'] })
      ]]
    };
    const s = scenes[loc];
    showCustom(s[0], s[1], s[2].map(o => withRun(o, showD2Dawn, true)));
  }
  function showD2Dawn() {
    patch.stage = 'd2_dawn';
    patch.count = 1;
    showCustom('1장 종료: 두 번째 새벽', `도리는 돌아오지 않았다.\n\n그러나 이제 사라진 것은 아이 하나가 아니었다. 마을의 말, 산의 소리, 관아의 문장이 서로 다른 방향으로 걷기 시작했다.\n\n다음 장 시작 방향: ${nextType()}`, [
      { text: '관아 임시처소에서 1장 최종 보고를 마무리한다.', run: () => { toast('관아 임시처소로 이동해 원본 2장으로 넘기자.'); } },
      { text: '바로 원본 보고서 화면으로 넘긴다.', run: finishToOriginal }
    ]);
  }
  function showFinalBridge() {
    showCustom('원본 2장 연결', `1장 확장 이벤트가 끝났다.\n\n이제 원본 보고서 화면을 열고 제출하면 기존 2장으로 이어진다.\n\n연결 타입: ${nextType()}`, [
      { text: '원본 보고서 작성 화면을 연다.', run: finishToOriginal }
    ]);
  }
  function nextType() {
    if (patch.bias.conceal >= 3) return '을파 감시 속 골짜기 진입';
    if (patch.bias.ritual >= 3 || patch.trust.makrye >= 2) return '막례의 경고와 제문 중심 진입';
    if (patch.bias.human >= 3 || patch.trust.wolseon >= 2) return '월선의 부탁과 도리 흔적 중심 진입';
    if (patch.bias.beast >= 3 || patch.trust.hunter >= 1) return '사냥꾼과 함께 골짜기 초입 조사';
    return '판단 보류, 비공식 기록 중심 진입';
  }
  function finishToOriginal() {
    patch.finished = true;
    closeCustom();
    try {
      if (typeof window.openReport === 'function') {
        window.openReport(1);
      } else {
        toast('원본 보고서 함수를 찾지 못했다. 새로고침 후 다시 시도해 주세요.');
      }
    } catch (e) {
      toast('원본 보고서 연결 중 오류가 발생했다.');
    }
  }
  function opt(text, effect) { return { text, effect }; }
  function withRun(op, run, keepOpen) { return { text: op.text, effect: op.effect, run, keepOpen: !!keepOpen }; }

  window.addEventListener('keydown', e => {
    if (patch.dialogOpen) {
      if (actionKeys.has(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      const n = parseInt(e.key, 10);
      if (n >= 1) {
        const btn = byId('options')?.children[n - 1];
        if (btn) { e.preventDefault(); e.stopImmediatePropagation(); btn.click(); }
      }
      return;
    }
    if (!actionKeys.has(e.key) || e.repeat || reportVisible() || originalDialogVisible() || !inCh1VillageContext()) return;
    const loc = currentLoc();
    if (!loc) return;
    if (patch.stage === 'd1_day' || patch.stage === 'd1_office' || patch.stage === 'd1_night' || patch.stage === 'd2_day' || patch.stage === 'd2_night' || patch.stage === 'd2_dawn') {
      e.preventDefault();
      e.stopImmediatePropagation();
      handleInteraction(loc);
    }
  }, true);

  document.addEventListener('click', e => {
    if (!patch.dialogOpen) return;
    const target = e.target;
    if (target && target.closest && target.closest('#options button')) {
      e.stopPropagation();
    }
  }, true);

  setInterval(renderSide, 900);
})();

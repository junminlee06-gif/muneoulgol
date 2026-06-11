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
let shade = null;

const css = document.createElement('style');
css.textContent = `
#muneoulgolMusic{position:fixed;right:18px;bottom:18px;z-index:99999;background:rgba(31,25,20,.94);color:#ded4c1;border:1px solid #6e5a40;border-radius:10px;padding:9px 12px;font:14px system-ui,sans-serif}
#ch1Shade{position:absolute;inset:0;background:rgba(0,0,0,.60);box-shadow:inset 0 0 140px rgba(0,0,0,.9);z-index:4;pointer-events:none;display:none}
#ch1Mark{position:fixed;left:10px;bottom:10px;z-index:99999;color:#b7925d;background:rgba(20,15,10,.75);border:1px solid #4a3b2c;padding:3px 6px;font:11px system-ui}
#muneoulgolPad,#muneoulgolAction,#muneoulgolUnlock{display:none!important}
`;
const musicButton = document.createElement('button');
musicButton.id = 'muneoulgolMusic';
musicButton.textContent = '음악 켜기';
const mark = document.createElement('div');
mark.id = 'ch1Mark';
mark.textContent = 'expansion v2026-06-11a';

document.addEventListener('DOMContentLoaded', () => {
  document.head.appendChild(css);
  document.body.appendChild(musicButton);
  document.body.appendChild(mark);
  const gamebox = document.querySelector('.gamebox');
  if (gamebox) {
    shade = document.createElement('div');
    shade.id = 'ch1Shade';
    gamebox.appendChild(shade);
  }
  cleanupLegacyButtons();
});

const ACTION_KEYS = new Set(['Enter', ' ', 'z', 'Z']);
const LOC = {
  '촌장집': 'chief',
  '마을 우물': 'well',
  '무당집': 'shaman',
  '방앗간': 'mill',
  '관아 임시처소': 'office',
  '물소리 골짜기': 'valley',
  '벌목터': 'lumber',
  '무너진 산제단': 'shrine',
  '금지된 숲 입구': 'forest',
  '물소리 골짜기 방향': 'toNorth',
  '무너울골 남쪽 길': 'toVillage',
  '남쪽 고갯길': 'toPass'
};

const P = {
  active: false,
  done: false,
  dialog: false,
  stage: 'd1',
  day: 1,
  count: 0,
  max: 3,
  seen: {},
  off: [],
  note: [],
  clue: [],
  bias: { beast: 0, human: 0, ritual: 0, conceal: 0, unknown: 0 }
};

const Q = {
  active: false,
  done: false,
  dialog: false,
  stage: 'wait',
  day: 1,
  count: 0,
  max: 4,
  seen: {},
  off: [],
  note: [],
  clue: [],
  report: { cause: null, measure: null, route: null },
  bias: { path: 0, human: 0, ritual: 0, conceal: 0, unknown: 0 }
};

function byId(id) { return document.getElementById(id); }
function text(id) { return byId(id)?.innerText || ''; }
function allText() { return `${text('hud')}\n${text('phaseText')}\n${text('speaker')}\n${text('dialogText')}\n${text('reportTitle')}`; }
function cleanupLegacyButtons() { ['muneoulgolPad', 'muneoulgolAction', 'muneoulgolUnlock'].forEach(id => byId(id)?.remove()); }
function add(list, value) { if (value && !list.includes(value)) list.push(value); }
function escapeHtml(value) { return String(value).replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch])); }
function toast(message) {
  const t = byId('toast');
  if (!t) return;
  t.textContent = message;
  t.style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.style.display = 'none'; }, 1600);
}
function currentLoc() {
  const match = text('hud').match(/상호작용:\s*([^\n]+)/);
  return match ? LOC[match[1].trim()] : null;
}
function reportOpen() { return byId('reportPanel')?.style.display === 'block'; }
function originalDialogOpen() {
  const d = byId('dialog');
  return d && !P.dialog && !Q.dialog && (d.style.display === 'block' || (d.style.display === '' && text('speaker')));
}
function isNight() { return ['night1', 'night2'].includes(P.stage) || ['night1', 'night2'].includes(Q.stage); }
function updateShade() {
  if (!shade) return;
  shade.style.display = isNight() && ((P.active && !P.done) || (Q.active && !Q.done)) ? 'block' : 'none';
}
async function playTrack(kind) {
  const target = kind === 'night' ? night : day;
  const other = kind === 'night' ? day : night;
  if (currentTrack === target && !target.paused) return;
  other.pause();
  other.currentTime = 0;
  currentTrack = target;
  try { await target.play(); } catch { musicOn = false; }
  musicButton.textContent = musicOn ? (kind === 'night' ? '밤 음악 재생 중' : '낮 음악 재생 중') : '음악 켜기';
}
musicButton.onclick = () => {
  musicOn = !musicOn;
  if (!musicOn) {
    day.pause();
    night.pause();
    musicButton.textContent = '음악 켜기';
    return;
  }
  playTrack(isNight() ? 'night' : 'day');
};

function applyEffects(target, effects = {}) {
  (effects.b || []).forEach(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(target.bias, key)) target.bias[key] += value;
  });
  (effects.o || []).forEach(value => add(target.off, value));
  (effects.n || []).forEach(value => add(target.note, value));
  (effects.c || []).forEach(value => add(target.clue, value));
}
function labelP() {
  return {
    d1: '첫날 낮', report: '첫 보고', night1: '첫날 밤', d2: '둘째 낮', dusk: '둘째 해질녘', night2: '두 번째 밤', end: '새벽 정리'
  }[P.stage] || P.stage;
}
function labelQ() {
  return {
    intro: '도입', day1: '1일차 낮', night1: '1일차 밤', day2: '2일차 낮', report: '2장 중간 보고', night2: '2일차 밤', end: '새벽 정리'
  }[Q.stage] || Q.stage;
}
function side() {
  const ph = byId('phaseText');
  const off = byId('official');
  const un = byId('unofficial');
  const cl = byId('cluePills');
  const target = Q.active && !Q.done ? Q : (P.active && !P.done ? P : null);
  if (!target) return;
  if (ph) {
    ph.textContent = target === Q
      ? `2장 확장 · ${labelQ()} · 조사 ${target.count}/${target.max}`
      : `1장 확장 · ${target.day}일차 · ${labelP()} · 조사 ${target.count}/${target.max}`;
  }
  if (off) off.innerHTML = target.off.map(v => `<li>${escapeHtml(v)}</li>`).join('') || '<li class="small">아직 없음</li>';
  if (un) un.innerHTML = target.note.map(v => `<li>${escapeHtml(v)}</li>`).join('') || '<li class="small">아직 없음</li>';
  if (cl) cl.innerHTML = target.clue.map(v => `<span class="pill">단서: ${escapeHtml(v)}</span>`).join('') || '<span class="small">아직 없음</span>';
  updateShade();
}
function closeDialog() {
  const d = byId('dialog');
  if (d) d.style.display = 'none';
  P.dialog = false;
  Q.dialog = false;
  side();
}
function showFor(target, speaker, body, options) {
  const d = byId('dialog');
  const s = byId('speaker');
  const tx = byId('dialogText');
  const box = byId('options');
  if (!d || !s || !tx || !box) return;
  target.active = true;
  target.dialog = true;
  if (target === P) Q.dialog = false;
  if (target === Q) P.dialog = false;
  s.textContent = speaker;
  tx.textContent = body;
  box.innerHTML = '';
  options.forEach((option, index) => {
    const button = document.createElement('button');
    button.textContent = `${index + 1}. ${option.text}`;
    button.onclick = () => {
      applyEffects(target, option.e);
      if (option.response) {
        respondFor(target, option.response, option.run);
      } else {
        if (!option.keep) closeDialog();
        if (option.run) option.run();
      }
      side();
    };
    box.appendChild(button);
  });
  d.style.display = 'block';
  side();
}\nfunction respondFor(target, body, next) {
  showFor(target, '기록 반응', body, [{ text: '계속한다', run: next || closeDialog }]);
}
function showP(speaker, body, options) { showFor(P, speaker, body, options); }
function respondP(body, next) { respondFor(P, body, next); }
function opt(text, e, response) { return { text, e, response }; }
function markSeen(target, place) {
  const key = `${target.stage}:${place}`;
  if (target.seen[key]) return false;
  target.seen[key] = true;
  target.count += 1;
  return true;
}

function inCh1() {
  const t = allText();
  return !P.done && (P.active || (t.includes('무너울골') && t.includes('1장') && !/[2345]장/.test(t)));
}
function inCh2() {
  const t = allText();
  return P.done && !Q.done && (Q.active || t.includes('2장') || t.includes('물소리 골짜기'));
}

function buildReport(groupsBox, report, groups) {
  groupsBox.innerHTML = '';
  groups.forEach(group => {
    const div = document.createElement('div');
    div.className = 'reportGroup';
    div.innerHTML = `<b>${group.title}</b><div class="choices"></div>`;
    const choices = div.querySelector('.choices');
    group.items.forEach(item => {
      const button = document.createElement('button');
      button.textContent = item;
      button.onclick = () => {
        report[group.key] = item;
        [...choices.children].forEach(child => child.classList.remove('selected'));
        button.classList.add('selected');
      };
      choices.appendChild(button);
    });
    groupsBox.appendChild(div);
  });
}

function sceneP(title, body, options, place) {
  showP(title, body, options.map(option => ({ ...option, run: () => {
    if (!markSeen(P, place)) { toast('이미 조사한 곳이다. 다른 장소를 보자.'); return; }
    if (P.count >= P.max) {
      if (P.stage === 'd1') report1();
      else if (P.stage === 'd2') dusk2();
    } else {
      toast(`조사 ${P.count}/${P.max} 완료. 다른 장소로 이동하자.`);
    }
  }})));
}
function sceneQ(title, body, options, place) {
  showFor(Q, title, body, options.map(option => ({ ...option, run: () => {
    if (!markSeen(Q, place)) { toast('이미 2장 기록에 올린 장소다. 다른 흔적을 보자.'); return; }
    if (Q.count >= Q.max) {
      if (Q.stage === 'day1') startCh2Night1();
      else if (Q.stage === 'day2') ch2Report();
    } else {
      toast(`2장 조사 ${Q.count}/${Q.max} 완료. 더 대조하자.`);
    }
  }})));
}

function handleP(place) {
  P.active = true;
  if (P.stage === 'd1') return day1(place);
  if (P.stage === 'night1') return night1(place);
  if (P.stage === 'd2') return day2(place);
  if (P.stage === 'night2') return night2(place);
  if (P.stage === 'end') return place === 'office' ? finishBridge() : toast('관아 임시처소에서 마무리하자.');
}

function day1(place) {
  if (!['chief', 'well', 'shaman', 'mill'].includes(place)) return toast('촌장집, 우물, 무당집, 방앗간을 조사하자.');
  const data = {
    chief: ['을파의 장부', '촌장집 마루는 볕을 잘 받는데도 장부 위만 눅눅하다. 을파는 당신이 앉기도 전에 장부를 펴고, 펴는 순간 손바닥으로 한 칸을 가린다.\n\n그 칸에는 산제에 쓴 쌀과 술의 수량이 있어야 했다. 그러나 먹이 번진 빈칸만 남아 있다.', [
      opt('범의 흔적으로 본다.', { b: [['beast', 1]], o: ['촌장 진술: 범 가능성'] }, '을파는 기다렸다는 듯 고개를 끄덕인다. “그렇게 적으면 마을이 덜 흔들릴 겁니다.” 그 말은 걱정처럼 들리지만, 부탁처럼도 들린다.'),
      opt('산제 중단과 연결한다.', { b: [['ritual', 1]], c: ['산제 비용 공백'] }, '당신이 빈칸을 짚자 을파의 손가락이 잠깐 굳는다. 이 칸만은 누군가 일부러 기억하지 않기로 한 듯 비어 있다.'),
      opt('기록 정리를 의심한다.', { b: [['conceal', 1]], n: ['장부가 지나치게 정리되어 있다'] }, '장부는 이상할 만큼 깨끗하다. 누군가 나중에 보여주려고 고른 종이 같다.')]],
    well: ['우물가', '우물가에는 아이들이 남긴 발자국이 겹겹이 말라 있다. 물동이를 내려놓은 흔적, 허둥지둥 달아난 발끝, 그리고 그 위를 지워 밟은 어른의 발자국.\n\n물은 조용한데, 우물 안쪽에서 산길 물소리가 난다.', [
      opt('도리의 이름을 확인한다.', { b: [['human', 1]], o: ['이름 확인: 도리'], c: ['도리의 이름'] }, '월선은 이름을 듣자마자 고개를 든다. “도리요. 아직 도리라고 불러야 합니다.” 그 말 끝에서 우물물이 아주 작게 흔들린다.'),
      opt('산제 노래를 묻는다.', { b: [['ritual', 1]], c: ['산제 노래'] }, '한 아이가 노래의 첫 구절을 부르다 말고 입을 다문다. 금지된 노래는 사라진 아이보다 오래 마을에 남아 있었던 것 같다.'),
      opt('주민 침묵을 본다.', { b: [['conceal', 1]], n: ['사람들이 서로 눈치를 본다'] }, '누구도 거짓말을 하고 있지는 않다. 다만 모두가 말하지 않기로 한 문장 앞에서 입술을 닫고 있다.')]],
    shaman: ['막례의 말', '무당집 처마 밑 금줄은 오래되어 누렇게 말랐다. 그런데 매듭 하나만 새 짚이다. 막례는 그것을 보라는 듯 내버려 둔다.\n\n“산은 기록을 못 해. 대신 사람이 산 대신 거짓말을 하지.”', [
      opt('산제 의미를 묻는다.', { b: [['ritual', 1]], c: ['검은등 별칭'] }, '“검은등은 이름이 아니야. 등을 보였다는 뜻이지.” 막례의 말 뒤로 방울 소리가 늦게 따라온다.'),
      opt('사람의 개입을 묻는다.', { b: [['human', 1]], n: ['사람이 산 이름을 빌릴 때가 있다'] }, '“산이 아이를 부를 때도 있고, 사람이 산 목소리를 흉내 낼 때도 있어. 문제는 둘이 같은 소리로 들린다는 거야.”'),
      opt('공식 감시 대상으로 본다.', { b: [['conceal', 1]], o: ['무당 감시 필요성'] }, '“관아 문서에 내 이름을 올려. 대신 아이 이름도 같이 올려.” 막례는 그렇게 말하고 문을 닫는다.')]],
    mill: ['방앗간', '방앗간은 낮인데도 서늘하다. 물레는 멈췄고 물길도 막혔는데, 축에는 방금 젖은 듯한 물방울이 맺혀 있다.\n\n돌확 아래에는 짚신에서 빠진 것처럼 가늘고 찢긴 풀 조각 하나가 끼어 있다.', [
      opt('풀 조각을 챙긴다.', { b: [['human', 1]], c: ['짚신 풀 조각'] }, '풀 조각은 끌려간 흔적이라기보다는, 붙잡힌 쪽이 버틴 흔적에 가깝다. 당신은 그것을 먼저 손안에 숨긴다.'),
      opt('물기를 확인한다.', { b: [['ritual', 1]], c: ['젖은 물레 축'] }, '물은 차갑지 않다. 손끝에 닿는 순간 오래된 제삿술 냄새가 난다.'),
      opt('검은 털을 줍는다.', { b: [['beast', 1]], c: ['검은 털'] }, '검은 털은 범의 것이라 적기에는 너무 젖어 있고, 사람의 것이라 하기에는 너무 거칠다.')]]
  }[place];
  sceneP(data[0], data[1], data[2], place);
}
function report1() {
  P.stage = 'report';
  P.dialog = false;
  const d = byId('dialog');
  if (d) d.style.display = 'none';
  openFirstReportPanel();
  side();
}
function openFirstReportPanel() {
  const panel = byId('reportPanel');
  const title = byId('reportTitle');
  const intro = byId('reportIntro');
  const groupsBox = byId('reportGroups');
  const finishBtn = byId('finishReport');
  if (!panel || !title || !intro || !groupsBox || !finishBtn) return;
  const report = { cause: null, measure: null, missing: null };
  title.textContent = '1장 중간 보고서';
  intro.textContent = '첫날 낮 조사 결과를 관아 문장으로 정리합니다. 무엇을 쓰느냐보다 무엇을 빼느냐가 더 오래 남습니다. 제출 후 1일차 밤 조사로 이어집니다.';
  buildReport(groupsBox, report, [
    { key: 'cause', title: '사건 원인', items: ['범의 흔적', '사람의 흔적', '산제 흔적', '마을 은폐', '판단 보류'] },
    { key: 'measure', title: '조치', items: ['산길 폐쇄', '추가 조사', '촌장 책임 조사', '무당 협조', '수색 지속'] },
    { key: 'missing', title: '실종자 표기', items: ['생존 가능성 있음', '행방 불명', '호적 보류', '사망 추정'] }
  ]);
  finishBtn.onclick = () => {
    if (!report.cause || !report.measure || !report.missing) { toast('모든 항목을 하나씩 선택하세요.'); return; }
    add(P.off, `1장 첫 보고: ${report.cause} / ${report.measure} / ${report.missing}`);
    panel.style.display = 'none';
    respondP('중간 보고서가 접수되었다. 종이는 금세 마르지만, 거기에 쓰지 않은 말들은 젖은 채로 남는다.\n\n밤이 되자 마을은 보고서에 적힌 문장과 다른 소리를 내기 시작한다.', startNight1);
  };
  panel.style.display = 'block';
}
function startNight1() {
  P.day = 1; P.stage = 'night1'; P.count = 0; P.max = 1;
  updateShade();
  showP('1일차 밤', '첫 보고서를 올렸지만 밤은 아직 끝나지 않았다.\n\n관아에 보낸 문장은 마을을 조용하게 만들었지만, 조용해진 자리마다 다른 소리가 고인다. 우물, 무당집, 방앗간 중 한 곳을 확인하자.', [{ text: '밤 조사를 시작한다', run: closeDialog }]);
}
function finishNight1(afterText) { showP('새벽 기록', afterText, [{ text: '2일차 아침으로 넘긴다', run: () => beginDay2('night') }]); }
function night1(place) {
  if (!['well', 'shaman', 'mill'].includes(place)) return toast('첫날 밤에는 우물, 무당집, 방앗간 중 한 곳만 확인하자.');
  const data = {
    well: { title: '첫날 밤의 우물', body: '우물가에는 아무도 없다. 그런데 누가 방금 물을 길어 간 듯 바닥이 젖어 있다. 두레박 줄은 내려가 있지 않은데, 물 위에는 장승 그림자가 비친다.', e: { b: [['ritual', 1]], c: ['우물의 이름 반응'], n: ['도리 이름에 우물이 반응했다'] }, response: '도리의 이름을 적자 우물 안쪽에서 같은 이름이 아주 작게 되돌아온다. 메아리라기에는 너무 늦고, 대답이라기에는 너무 낮다.', after: '첫날 밤 기록: 우물은 범의 발자국도, 사람의 손자국도 내놓지 않았다. 대신 이름에 반응했다.' },
    shaman: { title: '첫날 밤의 무당집', body: '무당집에는 등불이 없다. 그런데 금줄의 짚 끝마다 희미한 빛이 걸려 있다. 막례는 당신이 올 것을 이미 알고 있었던 사람처럼 말한다.\n\n“보고서에 적은 말이 밤을 부른다.”', e: { b: [['ritual', 1]], c: ['밤의 금줄'], n: ['막례는 창귀 가능성을 에둘러 말했다'] }, response: '막례는 끝내 검은등이라는 이름을 입 밖에 내지 않는다. 대신 문턱 아래를 손가락으로 누른다. 그곳에는 아이 손톱보다 작은 짚 조각이 끼어 있다.', after: '첫날 밤 기록: 막례는 산이 아이를 데려갔다고 말하지 않았다. 다만 사람이 산의 이름을 빌릴 수 있다고 했다.' },
    mill: { title: '첫날 밤의 방앗간', body: '방앗간의 물레는 멈춰 있다. 하지만 멈춘 물레에서 물이 도는 소리만 빠져나온다. 나무 바닥은 오래된 쌀겨 냄새와 새로 젖은 짚 냄새를 함께 품고 있다.', e: { b: [['human', 1], ['ritual', 1]], c: ['밤 방앗간의 물소리'], n: ['방앗간에서 아이 목소리 같은 소리를 들었다'] }, response: '물레 소리 사이로 아주 낮은 목소리가 섞인다. 아이 목소리 같기도 하고, 어른이 아이 흉내를 내는 소리 같기도 하다.', after: '첫날 밤 기록: 방앗간은 산의 흔적과 사람의 흔적을 동시에 남겼다. 어느 한쪽만 적으면 나머지 하나가 거짓이 된다.' }
  }[place];
  showP(data.title, data.body, [{ text: '밤의 흔적을 기록한다', e: data.e, response: data.response, run: () => finishNight1(data.after) }]);
}
function beginDay2() {
  P.day = 2; P.stage = 'd2'; P.count = 0; P.max = 2;
  showP('2일차 아침', '첫날 밤의 기록이 마을의 낮을 바꾸었다. 어제의 보고서는 끝난 문서가 아니라, 오늘의 의심을 여는 문이 되었다.', [{ text: '둘째 날 조사를 시작한다', run: closeDialog }]);
}
function day2(place) {
  if (!['chief', 'well', 'shaman', 'mill'].includes(place)) return toast('마을 핵심 장소를 다시 확인하자.');
  const data = {
    chief: ['2일차 촌장집', '을파는 장부를 닫지 않는다. 어제는 손바닥으로 가리던 칸을 오늘은 일부러 열어 둔다. 빈칸은 여전히 빈칸이다.', [
      opt('은폐 정황을 묻는다.', { b: [['conceal', 1]], n: ['을파는 헛간 이야기에 표정을 닫았다'] }, '을파는 “마을을 지키는 일과 마을을 의심하는 일이 늘 다르진 않다”고 말한다.'),
      opt('마루 이름을 확인한다.', { b: [['human', 1]], c: ['마루 이름'] }, '마루라는 이름은 장부의 가장자리에서 발견된다.')]],
    well: ['2일차 우물가', '월선은 우물가에 앉아 도리의 이름을 반복하고 있다. 이름을 부르는 것이 기도인지 확인인지 분간되지 않는다.', [
      opt('도리 이름을 기록한다.', { b: [['human', 1]], o: ['도리 이름 공식 기록'], c: ['도리의 이름'] }, '이름이 공식 기록에 오른다는 말에 월선의 어깨가 아주 조금 내려간다.'),
      opt('노래를 더 묻는다.', { b: [['ritual', 1]], c: ['노래 조각'] }, '월선은 노래를 모른다고 한다. 하지만 마지막 음만은 따라 부른다.')]],
    shaman: ['2일차 막례', '막례는 젖은 돌을 볕에 말리고 있다. 돌은 마르지 않는다. “물에 젖은 게 아니야. 이름에 젖은 거지.”', [
      opt('산제 관련성을 묻는다.', { b: [['ritual', 1]], n: ['막례는 말을 아꼈다'] }, '막례는 산제는 빌기 위한 자리가 아니라 돌려보내기 위한 자리였다고 말한다.'),
      opt('비공식 기록에 남긴다.', { b: [['unknown', 1]], n: ['산의 등은 검고 물의 입은 닫히지 않는다'] }, '당신은 관아 문서가 아닌 쪽지에 적는다.')]],
    mill: ['2일차 방앗간', '방앗간의 물레는 완전히 말랐다. 말랐기 때문에 더 수상하다. 밤새 젖어 있던 냄새가 한순간에 사라진 자리에, 누군가 쓸고 간 자국만 남아 있다.', [
      opt('검은 털을 보관한다.', { b: [['beast', 1]], c: ['젖은 검은 털'] }, '검은 털은 아침이 되자 조금 가벼워졌다. 너무 빨리 보여주면 다른 흔적들이 그 이름 아래 묻힐 것이다.'),
      opt('돌확을 조사한다.', { b: [['ritual', 1]], c: ['돌확 절차'] }, '돌확의 홈은 물길이 아니라 사람 손으로 판 선이다.')]]
  }[place];
  sceneP(data[0], data[1], data[2], place);
}
function dusk2() {
  P.stage = 'dusk';
  showP('2일차 해질녘', '해가 산등성이에 걸리자 마을은 다시 두 갈래로 갈라진다. 하나는 관아에 적기 쉬운 길이다. 다른 하나는 아직 이름 붙이기 어려운 길이다.', [
    { text: '을파의 설명을 따른다', e: { b: [['beast', 1]] }, response: '마을은 잠시 안정된다. 하지만 안정된 마을일수록 누군가의 울음소리는 더 멀리 밀려난다.', run: startNight2 },
    { text: '월선의 증언을 믿는다', e: { b: [['human', 1]] }, response: '월선은 도리의 이름을 다시 붙잡는다. 그 이름은 아이가 아직 사람으로 남아 있다는 마지막 끈처럼 느껴진다.', run: startNight2 },
    { text: '막례의 경고를 듣는다', e: { b: [['ritual', 1]] }, response: '막례가 금줄을 한 겹 더 묶는다. 무언가가 밤에 들어오지 못하게 하려는 손이다.', run: startNight2 },
    { text: '누구도 완전히 믿지 않는다', e: { b: [['unknown', 1]] }, response: '모든 증언이 서로 다른 방향을 가리킨다.', run: startNight2 }
  ]);
}
function startNight2() { P.stage = 'night2'; P.count = 0; P.max = 1; updateShade(); toast('두 번째 밤이다. 화면이 어두워졌다.'); }
function night2(place) {
  if (!['chief', 'well', 'shaman', 'mill'].includes(place)) return toast('밤에는 핵심 장소 한 곳만 보자.');
  showP('두 번째 밤 기록', '밤의 기록이 끝났다. 새벽이 오자 어둠이 조금 물러난다. 하지만 남은 것은 더 선명해진 발자국이다.', [{ text: '새벽까지 기록한다', run: end1 }]);
}
function end1() {
  P.stage = 'end';
  updateShade();
  showP('1장 종료', '도리는 돌아오지 않았다.\n\n하지만 이제 그는 단순한 실종자가 아니다. 보고서에 적힌 이름, 우물에 되돌아온 이름, 누군가 숨기려 한 이름이 되었다.\n\n물소리 골짜기는 그 이름들을 한꺼번에 삼키고 있다.', [{ text: '원본 보고서 화면을 연다', run: finishCh1 }]);
}
function finishBridge() { finishCh1(); }
function finishCh1() {
  P.done = true;
  closeDialog();
  updateShade();
  toast('1장 확장 종료. 원본 2장으로 이어집니다.');
  try { window.openReport && window.openReport(1); } catch {}
}

function maybeStartCh2() {
  if (!P.done || Q.active || Q.done || reportOpen() || P.dialog || Q.dialog || originalDialogOpen()) return;
  const t = allText();
  if (t.includes('2장') || t.includes('물소리 골짜기')) {
    Q.active = true;
    Q.stage = 'intro';
    Q.day = 1;
    Q.count = 0;
    Q.max = 4;
    showFor(Q, '2장: 물소리 골짜기', '관아에 1장 보고서가 올라가자, 마을 북쪽 길이 열린다.\n\n물소리 골짜기는 물이 많아서 그렇게 불리는 곳이 아니다. 물이 없는데도 물소리가 나서 그렇게 불린다.\n\n2장은 낮과 밤을 두 번 건넌다. 첫날은 길의 이상을 확인하고, 둘째 날은 그 길을 누가 이용했는지 기록한다.', [{ text: '2장 1일차 낮 조사를 시작한다', run: () => { Q.stage = 'day1'; closeDialog(); } }]);
  }
}
function handleQ(place) {
  if (!Q.active || Q.done) return false;
  if (['toNorth', 'toVillage', 'toPass'].includes(place)) return false;
  if (Q.stage === 'intro') { Q.stage = 'day1'; return true; }
  if (Q.stage === 'day1') return ch2Day1(place);
  if (Q.stage === 'night1') return ch2Night1(place);
  if (Q.stage === 'day2') return ch2Day2(place);
  if (Q.stage === 'night2') return ch2Night2(place);
  if (Q.stage === 'end') return place === 'office' ? openFinalCh2Report() : (toast('관아 임시처소에서 2장 보고서를 정리하자.'), true);
  return false;
}
function ch2Day1(place) {
  const data = {
    valley: ['물소리 골짜기', '골짜기에는 흐르는 물이 없다. 그런데 귀를 낮추면 돌 밑에서 물이 흐른다. 소리는 아래가 아니라 앞에서 오고, 앞이 아니라 등 뒤에서 닫힌다.\n\n발자국 몇 개가 같은 자리를 빙빙 돈다. 길을 잃은 흔적이라기보다, 길이 사람을 되돌려 보낸 흔적이다.', [
      opt('소리가 돌아오는 지점을 표시한다', { b: [['path', 1], ['unknown', 1]], c: ['되돌아오는 물소리'] }, '표시한 돌은 세 번 확인해도 제자리가 아니다. 지도는 맞는데 길이 틀린다.'),
      opt('발자국의 순서를 본다', { b: [['human', 1]], c: ['반복된 발자국'] }, '가장 작은 발자국 위에 더 큰 발자국이 겹쳐 있다.')]],
    lumber: ['벌목터', '벌목터의 나무들은 베인 것이 아니라 멈춘 것처럼 서 있다. 도끼 자국은 중간에서 끊겼고, 나무 밑동에는 물에 불은 흙이 말라붙어 있다.', [
      opt('사량의 덫을 확인한다', { b: [['human', 1]], c: ['사량의 빈 덫'] }, '덫은 짐승을 잡기 위한 모양이지만, 끈 높이가 아이 허리쯤에 걸려 있다.'),
      opt('벌목 중단 이유를 묻는다', { b: [['conceal', 1]], n: ['벌목터 사람들은 같은 날 일을 멈췄다'] }, '사량은 “나무가 울어서”라고 말한 뒤, 스스로도 그 말이 우스운 듯 입을 다문다.')]],
    shrine: ['무너진 산제단', '산제단은 무너져 있지만, 무너진 순서가 이상하다. 오래된 돌은 안쪽에 있고 새 돌은 바깥에 있다. 누군가 폐허를 고치려다 중간에 그만둔 흔적이다.', [
      opt('제단의 홈을 따라 본다', { b: [['ritual', 1]], c: ['산제단의 역방향 홈'] }, '홈은 산 위쪽으로 이어지지 않는다. 마을 쪽으로 돌아 나온다.'),
      opt('젖은 쌀알을 챙긴다', { b: [['ritual', 1], ['conceal', 1]], c: ['젖은 제물 쌀'] }, '공식적으로 중단된 산제는 실제로는 완전히 끝나지 않았다.')]],
    well: ['2장 우물가', '우물가의 물소리와 골짜기의 물소리가 같은 박자로 겹친다. 월선은 그것을 듣고도 놀라지 않는다.', [
      opt('월선에게 같은 소리를 들었는지 묻는다', { b: [['human', 1]], n: ['월선은 밤마다 같은 물소리를 들었다'] }, '월선은 “도리가 사라진 뒤로 물이 말을 배웠다”고 말한다.'),
      opt('아이들의 노래를 다시 묻는다', { b: [['ritual', 1]], c: ['되풀이되는 노래 끝음'] }, '아이들은 앞 구절은 잊었다고 하지만 끝음만은 정확히 맞춘다.')]],
    shaman: ['2장 무당집', '막례는 북쪽을 보지 않는다. 보지 않는 쪽을 너무 잘 아는 사람의 태도다.', [
      opt('검은등의 자리를 묻는다', { b: [['ritual', 1]], c: ['검은등의 자리'] }, '“자리는 산에 있지 않아. 사람이 비워 둔 곳에 생겨.”'),
      opt('산제 복원 여부를 묻는다', { b: [['ritual', 1], ['conceal', 1]], n: ['산제는 중단된 것이 아니라 숨겨졌다'] }, '막례는 복원이 아니라 봉합이라고 고쳐 말한다.')]],
    mill: ['2장 방앗간', '방앗간의 물레 소리가 골짜기 쪽과 엇박으로 돈다. 두 소리는 닮았지만 같은 곳에서 나지 않는다.', [
      opt('물레 축과 골짜기 돌을 대조한다', { b: [['unknown', 1]], c: ['엇박의 물소리'] }, '두 소리는 서로를 흉내 낸다. 어느 쪽이 먼저인지 아직 알 수 없다.'),
      opt('큰 발자국의 진흙을 묻는다', { b: [['human', 1]], c: ['북쪽 진흙 발자국'] }, '방앗간의 진흙은 북쪽 벌목터 흙과 색이 같다.')]]
  }[place];
  if (!data) return false;
  sceneQ(data[0], data[1], data[2], place);
  return true;
}
function startCh2Night1() {
  Q.stage = 'night1';
  Q.day = 1;
  Q.count = 0;
  Q.max = 1;
  updateShade();
  showFor(Q, '2장 1일차 밤', '첫날 낮에 표시한 물소리는 해가 지자 마을 안쪽으로 번진다.\n\n골짜기에서만 들리던 소리가 우물, 방앗간, 무당집 처마 밑에서도 같은 박자로 들린다. 한 곳을 골라 밤의 침범을 확인하자.', [{ text: '밤 조사를 시작한다', run: closeDialog }]);
}
function ch2Night1(place) {
  const data = {
    well: ['1일차 밤: 우물', '우물은 골짜기보다 먼저 어두워진다. 물 위에는 별이 비치지 않고, 북쪽 길의 나뭇가지 그림자가 비친다.', { b: [['path', 1], ['ritual', 1]], c: ['마을로 번진 물소리'] }],
    shaman: ['1일차 밤: 무당집', '막례의 금줄 끝이 젖어 있다. 비가 오지 않았는데 짚에서는 물비린내가 난다.', { b: [['ritual', 1]], c: ['젖은 금줄'] }],
    mill: ['1일차 밤: 방앗간', '물레가 돌지 않는데도 방앗간 바닥에는 둥근 물자국이 생긴다. 누군가 보이지 않는 축을 돌린 듯하다.', { b: [['human', 1], ['unknown', 1]], c: ['둥근 물자국'] }],
    valley: ['1일차 밤: 골짜기', '밤의 골짜기는 길을 보여주지 않는다. 대신 같은 돌, 같은 나무, 같은 발자국을 세 번 보여준다.', { b: [['path', 1]], c: ['세 번 반복된 길'] }]
  }[place];
  if (!data) return toast('첫 번째 밤에는 우물, 무당집, 방앗간, 골짜기 중 한 곳을 보자.'), true;
  showFor(Q, data[0], data[1], [{ text: '밤의 침범을 기록한다', e: data[2], response: '첫 번째 밤 기록이 끝났다. 북쪽의 이상은 더 이상 북쪽에만 머물지 않는다.', run: beginCh2Day2 }]);
  return true;
}
function beginCh2Day2() {
  Q.stage = 'day2';
  Q.day = 2;
  Q.count = 0;
  Q.max = 4;
  updateShade();
  showFor(Q, '2장 2일차 낮', '아침이 되자 길은 다시 평범한 산길처럼 보인다.\n\n하지만 전날 밤의 기록 때문에 볼 수 있는 것이 달라졌다. 이제 문제는 길 자체가 아니라, 누가 그 길을 알고 이용했는지다.', [{ text: '2일차 낮 조사를 시작한다', run: closeDialog }]);
}
function ch2Day2(place) {
  const data = {
    forest: ['금지된 숲 입구', '금지된 숲 입구에는 금줄이 없다. 금줄이 필요 없을 만큼 오래전부터 사람들이 알아서 멈추던 자리다.\n\n하지만 흙 위에는 최근 발자국이 있다.', [
      opt('발자국 방향을 본다', { b: [['human', 1]], c: ['숲 입구의 최근 발자국'] }, '발자국은 숲으로 들어간 것이 아니라, 숲에서 마을로 나온 쪽이 더 깊다.'),
      opt('금줄이 없는 이유를 생각한다', { b: [['ritual', 1]], n: ['금지된 숲에는 금줄이 없다'] }, '금줄은 막기 위한 것이고, 이곳은 이미 모두가 막혀 있다고 믿는 곳이다.')]],
    shrine: ['2일차 산제단', '어제 본 젖은 쌀알은 사라졌다. 대신 같은 자리에 마른 쌀겨가 둥글게 모여 있다.', [
      opt('제단 배열을 다시 본다', { b: [['ritual', 1]], c: ['되돌아오는 제단 배열'] }, '제단은 무너진 것이 아니라, 무너진 척 놓인 것처럼 보인다.'),
      opt('최근 제물 흔적을 찾는다', { b: [['conceal', 1]], c: ['숨겨진 제물 흔적'] }, '누군가는 산제를 중단한 적이 없다. 다만 관아가 볼 수 없는 시간에 올렸을 뿐이다.')]],
    lumber: ['2일차 벌목터', '벌목터의 덫은 치워져 있다. 하지만 덫이 있던 자리에는 아이 키 높이의 줄 자국이 나무껍질에 남아 있다.', [
      opt('줄 자국을 잰다', { b: [['human', 1]], c: ['아이 키 높이의 줄 자국'] }, '짐승을 노린 덫이라기에는 너무 낮고, 아이를 막기에는 너무 정확하다.'),
      opt('사량의 거짓말을 확인한다', { b: [['conceal', 1]], n: ['사량은 덫을 치웠다'] }, '사량은 덫을 치운 적 없다고 말한다. 손톱 밑에는 젖은 나무껍질이 끼어 있다.')]],
    chief: ['2일차 촌장집', '을파는 북쪽 출입 명단이 없다고 말한다. 그런데 장부 끈에는 방금 풀었다 묶은 자국이 있다.', [
      opt('출입 명단을 요구한다', { b: [['conceal', 1]], n: ['북쪽 출입 명단 은폐'] }, '을파는 “마을을 살리려면 가끔 이름을 지워야 한다”고 말한다.'),
      opt('마루와 도리의 관계를 묻는다', { b: [['human', 1]], c: ['마루와 도리의 연결'] }, '두 이름은 장부의 서로 다른 곳에 있지만, 같은 손글씨로 고쳐 적혀 있다.')]],
    well: ['2일차 우물', '우물은 낮에도 밤의 소리를 조금 남기고 있다. 월선은 물을 길지 않는다. 대신 물 위를 계속 본다.', [
      opt('월선의 밤 증언을 받는다', { b: [['human', 1]], n: ['월선은 세 이름을 들었다'] }, '월선은 도리 말고도 두 이름이 더 들렸다고 말한다.'),
      opt('이름을 대조한다', { b: [['unknown', 1]], c: ['대조해야 할 이름들'] }, '이름들은 호적 순서가 아니라 사라진 순서대로 돌아온다.')]],
    mill: ['2일차 방앗간', '방앗간의 물레는 멈춰 있다. 하지만 그림자는 천천히 돈다.', [
      opt('그림자 방향을 기록한다', { b: [['unknown', 1]], c: ['반대로 도는 물레 그림자'] }, '그림자는 물레와 반대 방향으로 돈다. 보이는 것과 움직이는 것이 갈라져 있다.'),
      opt('벌목터 흙과 대조한다', { b: [['human', 1]], c: ['방앗간과 벌목터의 같은 흙'] }, '진흙 색이 같다. 누군가는 방앗간과 벌목터 사이를 오갔다.')]],
    shaman: ['2일차 무당집', '막례는 오래된 제문을 꺼내지 않는다. 대신 제문이 있던 빈 함을 보여준다.', [
      opt('빈 함을 기록한다', { b: [['ritual', 1], ['conceal', 1]], c: ['사라진 제문 함'] }, '중요한 것은 제문 내용이 아니라, 누가 가져갔는지다.'),
      opt('산제 절차를 묻는다', { b: [['ritual', 1]], n: ['산제는 돌아오는 것을 막는 절차'] }, '막례는 “부르는 제사가 아니라 돌려보내는 제사였다”고 말한다.')]]
  }[place];
  if (!data) return false;
  sceneQ(data[0], data[1], data[2], place);
  return true;
}
function ch2Report() {
  Q.stage = 'report';
  const panel = byId('reportPanel');
  const title = byId('reportTitle');
  const intro = byId('reportIntro');
  const groupsBox = byId('reportGroups');
  const finishBtn = byId('finishReport');
  if (!panel || !title || !intro || !groupsBox || !finishBtn) return;
  const report = { cause: null, measure: null, route: null };
  title.textContent = '2장 중간 보고서';
  intro.textContent = '물소리 골짜기와 마을 내부 진술을 대조해 보고합니다. 선택한 문장은 2일차 밤에 먼저 반응할 장소를 바꿉니다.';
  buildReport(groupsBox, report, [
    { key: 'cause', title: '핵심 판단', items: ['길 자체의 이상', '사람의 유도', '산제 절차의 파손', '마을의 은폐', '판단 보류'] },
    { key: 'measure', title: '즉시 조치', items: ['북쪽 길 임시 봉쇄', '벌목터 수색', '산제단 보존', '무당 협조 요청', '아이 이름 대조'] },
    { key: 'route', title: '밤 조사 우선지', items: ['물소리 골짜기', '무너진 산제단', '우물의 물소리', '방앗간 물레'] }
  ]);
  finishBtn.onclick = () => {
    if (!report.cause || !report.measure || !report.route) { toast('모든 항목을 하나씩 선택하세요.'); return; }
    Q.report = report;
    add(Q.off, `2장 중간 보고: ${report.cause} / ${report.measure} / ${report.route}`);
    panel.style.display = 'none';
    Q.stage = 'night2';
    Q.day = 2;
    Q.count = 0;
    Q.max = 1;
    updateShade();
    respondFor(Q, '2장 중간 보고서가 접수되었다.\n\n그날 밤, 보고서에 적은 판단이 먼저 젖는다. 길이라고 적으면 길이, 사람이라고 적으면 발자국이, 산제라고 적으면 제단이 먼저 반응한다.', () => showFor(Q, '2장 2일차 밤', '물소리 골짜기, 산제단, 우물, 방앗간 중 한 곳에서 보고서의 반응을 확인하자.', [{ text: '마지막 밤 조사를 시작한다', run: closeDialog }]));
  };
  panel.style.display = 'block';
}
function ch2Night2(place) {
  const data = {
    valley: ['2일차 밤: 물소리 골짜기', '골짜기는 이번에는 길을 반복하지 않는다. 대신 당신이 낮에 적은 보고서 문장을 돌려준다.\n\n“길 자체의 이상.”\n\n그 문장은 물소리처럼 들리지만, 사람 목소리의 박자를 갖고 있다.', { b: [['path', 1], ['unknown', 1]], c: ['보고서를 따라 읽는 골짜기'] }],
    shrine: ['2일차 밤: 무너진 산제단', '무너진 돌들이 낮과 다른 위치에 놓여 있다. 누가 옮긴 흔적은 없는데 제단은 조금 더 완성된 모양에 가까워졌다.\n\n복원된 것이 아니라, 돌아오고 있다.', { b: [['ritual', 1]], c: ['밤에 움직인 제단 돌'] }],
    well: ['2일차 밤: 우물', '우물물은 더 이상 이름 하나만 돌려주지 않는다. 도리, 마루, 그리고 아직 기록하지 않은 아이의 이름이 섞여 올라온다.', { b: [['human', 1], ['ritual', 1]], c: ['섞여 돌아온 이름들'] }],
    mill: ['2일차 밤: 방앗간', '방앗간 물레와 골짜기 물소리가 처음으로 같은 박자에 맞는다. 그 순간 물레 그림자가 사람의 팔처럼 길어진다.', { b: [['human', 1], ['unknown', 1]], c: ['물레 그림자의 팔'] }]
  }[place];
  if (!data) return toast('2일차 밤에는 물소리 골짜기, 산제단, 우물, 방앗간 중 한 곳을 보자.'), true;
  showFor(Q, data[0], data[1], [{ text: '2장 밤의 결과를 기록한다', e: data[2], response: '2장 밤 기록이 끝났다. 이제 물소리 골짜기는 단순한 장소가 아니라, 마을이 숨긴 이름들이 되돌아오는 통로가 되었다.', run: () => {
    Q.stage = 'end';
    updateShade();
    showFor(Q, '2장 종료', '새벽이 오자 북쪽 길은 다시 평범한 산길처럼 보인다.\n\n하지만 이제 당신은 안다. 길이 이상한 것이 아니라, 기록되지 않은 이름들이 같은 길을 반복하고 있다는 것을. 관아 임시처소에서 2장 보고서를 정리하자.', [{ text: '관아에서 2장 보고서를 작성한다', run: openFinalCh2Report }]);
  } }]);
  return true;
}
function openFinalCh2Report() {
  Q.done = true;
  closeDialog();
  updateShade();
  toast('2장 확장 종료. 원본 2장 보고서로 이어집니다.');
  try { window.openReport && window.openReport(2); } catch {}
}
function adoptOriginalMidReport() {
  if (P.done) return;
  P.active = true;
  P.day = 1;
  P.stage = 'night1';
  P.count = 0;
  P.max = 1;
  add(P.off, '1장 첫 보고: 중간 보고서 제출');
  const d = byId('dialog');
  if (d) d.style.display = 'none';
  P.dialog = false;
  showP('1일차 밤', '중간 보고서는 올라갔다. 하지만 보고서가 마을을 떠난 뒤에야, 보고서에 적히지 않은 것들이 움직이기 시작한다. 우물, 무당집, 방앗간 중 한 곳을 확인하자.', [{ text: '밤 조사를 시작한다', run: closeDialog }]);
}

document.addEventListener('click', event => {
  const target = event.target && event.target.closest ? event.target.closest('#finishReport') : null;
  if (!target) return;
  const title = text('reportTitle');
  if (!title.includes('1장 중간 보고서')) return;
  const selected = document.querySelectorAll('#reportPanel button.selected').length;
  if (selected < 3) return;
  setTimeout(adoptOriginalMidReport, 0);
}, false);

window.addEventListener('keydown', event => {
  if (P.dialog || Q.dialog) {
    const active = document.activeElement;
    if (ACTION_KEYS.has(event.key) && active && active.closest && active.closest('#options')) {
      event.preventDefault(); event.stopImmediatePropagation(); active.click(); return;
    }
    const n = parseInt(event.key, 10);
    if (n >= 1) {
      const button = byId('options')?.children[n - 1];
      if (button) { event.preventDefault(); event.stopImmediatePropagation(); button.click(); return; }
    }
    if (ACTION_KEYS.has(event.key)) { event.preventDefault(); event.stopImmediatePropagation(); }
    return;
  }
  if (!ACTION_KEYS.has(event.key) || event.repeat || reportOpen() || originalDialogOpen()) return;
  const place = currentLoc();
  if (!place) return;
  if (inCh2()) {
    const handled = handleQ(place);
    if (handled) { event.preventDefault(); event.stopImmediatePropagation(); }
    return;
  }
  if (inCh1()) {
    event.preventDefault(); event.stopImmediatePropagation(); handleP(place);
  }
}, true);

setInterval(() => { cleanupLegacyButtons(); side(); maybeStartCh2(); if (musicOn) playTrack(isNight() ? 'night' : 'day'); }, 900);
})();
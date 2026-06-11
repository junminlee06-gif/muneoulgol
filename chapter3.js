(() => {
'use strict';

const ACTION_KEYS = new Set(['Enter', ' ', 'z', 'Z']);
const LOC = {
  '금지된 숲 입구': 'entrance',
  '사량의 덫': 'trap',
  '뒤엉킨 뿌리길': 'roots',
  '아이 목소리가 나는 길': 'voice',
  '표식 나무': 'tree',
  '깊은 숲길': 'deep'
};
const R = {
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
  report: { truth: null, measure: null, expression: null },
  axis: { record: 0, ritual: 0, grief: 0, boundary: 0, fear: 0 }
};

function byId(id) { return document.getElementById(id); }
function text(id) { return byId(id)?.innerText || ''; }
function allText() { return `${text('hud')}\n${text('phaseText')}\n${text('speaker')}\n${text('dialogText')}\n${text('reportTitle')}`; }
function reportOpen() { return byId('reportPanel')?.style.display === 'block'; }
function originalDialogOpen() {
  const d = byId('dialog');
  return d && !R.dialog && (d.style.display === 'block' || (d.style.display === '' && text('speaker')));
}
function toast(message) {
  const t = byId('toast');
  if (!t) return;
  t.textContent = message;
  t.style.display = 'block';
  clearTimeout(toast.timer3);
  toast.timer3 = setTimeout(() => { t.style.display = 'none'; }, 1700);
}
function currentLoc() {
  const match = text('hud').match(/상호작용:\s*([^\n]+)/);
  return match ? LOC[match[1].trim()] : null;
}
function add(list, value) { if (value && !list.includes(value)) list.push(value); }
function esc(value) { return String(value).replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch])); }
function fx(e = {}) {
  (e.a || []).forEach(([key, value]) => { if (Object.prototype.hasOwnProperty.call(R.axis, key)) R.axis[key] += value; });
  (e.o || []).forEach(v => add(R.off, v));
  (e.n || []).forEach(v => add(R.note, v));
  (e.c || []).forEach(v => add(R.clue, v));
}
function label() {
  return {
    intro: '도입', day1: '1일차 낮', night1: '1일차 밤', day2: '2일차 낮', report: '중간 보고', night2: '2일차 밤', dawn3: '3일차 새벽'
  }[R.stage] || R.stage;
}
function side() {
  if (!R.active || R.done) return;
  const ph = byId('phaseText'), off = byId('official'), un = byId('unofficial'), cl = byId('cluePills');
  if (ph) ph.textContent = `3장 확장 · ${label()} · 조사 ${R.count}/${R.max}`;
  if (off) off.innerHTML = R.off.map(v => `<li>${esc(v)}</li>`).join('') || '<li class="small">아직 없음</li>';
  if (un) un.innerHTML = R.note.map(v => `<li>${esc(v)}</li>`).join('') || '<li class="small">아직 없음</li>';
  if (cl) cl.innerHTML = R.clue.map(v => `<span class="pill">단서: ${esc(v)}</span>`).join('') || '<span class="small">아직 없음</span>';
}
function closeDialog() {
  const d = byId('dialog');
  if (d) d.style.display = 'none';
  R.dialog = false;
  side();
}
function show(speaker, body, options) {
  const d = byId('dialog'), s = byId('speaker'), tx = byId('dialogText'), box = byId('options');
  if (!d || !s || !tx || !box) return;
  R.active = true;
  R.dialog = true;
  s.textContent = speaker;
  tx.textContent = body;
  box.innerHTML = '';
  options.forEach((op, index) => {
    const b = document.createElement('button');
    b.textContent = `${index + 1}. ${op.text}`;
    b.onclick = () => {
      fx(op.e);
      if (op.response) respond(op.response, op.run);
      else { if (!op.keep) closeDialog(); if (op.run) op.run(); }
      side();
    };
    box.appendChild(b);
  });
  d.style.display = 'block';
  side();
}
function respond(body, next) { show('기록 반응', body, [{ text: '계속한다', run: next || closeDialog }]); }
function opt(text, e, response) { return { text, e, response }; }
function seen(place) {
  const key = `${R.stage}:${place}`;
  if (R.seen[key]) { toast('이미 확인한 숲길이다. 다른 흔적을 보자.'); return false; }
  R.seen[key] = true;
  R.count += 1;
  return true;
}
function scene(title, body, options, place) {
  show(title, body, options.map(op => ({ ...op, run: () => {
    if (!seen(place)) return;
    if (R.count >= R.max) advanceAfterCount();
    else toast(`3장 조사 ${R.count}/${R.max} 완료. 숲의 다른 결을 더 확인하자.`);
  }})));
}
function advanceAfterCount() {
  if (R.stage === 'day1') startNight1();
  else if (R.stage === 'day2') openMidReport();
}
function inChapter3() {
  const t = allText();
  return !R.done && (R.active || ((t.includes('3장') || t.includes('금지된 숲')) && !t.includes('4장') && !t.includes('5장')));
}
function maybeStart() {
  if (R.active || R.done || reportOpen() || originalDialogOpen()) return;
  if (!inChapter3()) return;
  R.active = true;
  R.stage = 'intro';
  R.day = 1;
  R.count = 0;
  R.max = 4;
  show('3장: 오래된 산제', '금지된 숲은 사건의 다음 장소가 아니다.\n\n이곳은 마을이 오래전에 중단한 산제의 기록이 아직 썩지 않고 남아 있는 곳이다. 길은 사람 길, 짐승 길, 죽은 자의 길로 갈라지지 않는다. 세 길이 겹쳐져서 서로를 흉내 낸다.\n\n3장은 사라진 아이를 찾는 장이 아니라, 왜 아이들이 길이 되었는지 복원하는 장이다.', [{ text: '1일차 낮 조사를 시작한다', run: () => { R.stage = 'day1'; closeDialog(); } }]);
}
function handle(place) {
  if (!R.active || R.done) return false;
  if (R.stage === 'intro') { R.stage = 'day1'; return true; }
  if (R.stage === 'day1') return day1(place);
  if (R.stage === 'night1') return night1(place);
  if (R.stage === 'day2') return day2(place);
  if (R.stage === 'night2') return night2(place);
  if (R.stage === 'dawn3') return place === 'deep' || place === 'voice' ? dawn3() : (toast('새벽의 기록은 깊은 숲길 쪽에서 정리하자.'), true);
  return false;
}

function day1(place) {
  const data = {
    entrance: ['금지된 숲 입구', '금줄은 끊어져 있는데, 끊긴 자리마다 누군가 다시 묶으려다 포기한 매듭이 남아 있다.\n\n말뚝 속에는 검은 흙이 들어 있다. 산의 흙이라기엔 너무 고운 흙이고, 무덤의 흙이라 하기엔 아직 물기가 있다.', [
      opt('금줄의 끊긴 순서를 본다', { a: [['boundary', 1]], c: ['끊긴 금줄의 순서'] }, '금줄은 한 번에 끊긴 것이 아니다. 해마다 조금씩 약해졌고, 누군가는 그것을 고치지 않고 덮어 두었다.'),
      opt('관아 표시를 남긴다', { a: [['record', 1]], o: ['금지된 숲 경계 표시'] }, '나무에 관아 표시를 남긴다. 표식은 사람의 길을 만들지만, 숲은 그 표식을 곧 안쪽으로 기울게 한다.')]],
    trap: ['사량의 덫', '덫은 짐승을 기다리는 모양이지만, 길의 한가운데가 아니라 사람이 비켜 가려는 곳에 숨겨져 있다.\n\n덫 이빨에는 피가 없다. 대신 머리카락 같기도 하고 젖은 금줄 같기도 한 검은 실이 걸려 있다.', [
      opt('덫을 해체한다', { a: [['boundary', 1]], c: ['해체한 사량의 덫'] }, '덫을 풀자 쇠가 우는 소리가 숲으로 번진다. 멀리서 사량이 욕설을 삼키는 소리가 난다.'),
      opt('검은 실을 챙긴다', { a: [['record', 1]], c: ['덫에 걸린 검은 실'] }, '검은 실은 손끝에서 물기를 잃지 않는다. 이것은 짐승의 털도, 사람의 머리카락도, 금줄도 완전히 아니다.')]],
    roots: ['뒤엉킨 뿌리길', '뿌리는 길을 막은 것이 아니라 붙잡고 있다. 몇 걸음 걸으면 같은 나무로 돌아온다.\n\n하지만 같은 나무라고 생각한 순간, 나무껍질의 상처가 조금씩 달라져 있다.', [
      opt('물소리를 따르지 않는다', { a: [['boundary', 1], ['ritual', 1]], c: ['기다리면 열리는 길'] }, '서서 기다리자 물소리가 한 겹 낮아진다. 길은 앞으로 열리지 않고, 뒤로 닫히는 것을 멈춘다.'),
      opt('사람 발자국을 따른다', { a: [['record', 1]], c: ['마루의 깊은 숲 발자국'] }, '마루의 발자국은 도끼를 끌고 가는 자국과 겹친다. 그는 도망친 것이 아니라, 무언가를 찍으러 갔다.')]],
    voice: ['아이 목소리가 나는 길', '숲 안쪽에서 도리의 목소리가 들린다.\n\n“집으로 가는 길을 찾았어요.”\n\n그 말은 반가워야 하는데, 길을 찾았다는 아이의 목소리가 너무 오래된 사람처럼 낮다.', [
      opt('도리의 이름을 낮게 부른다', { a: [['grief', 1]], c: ['도리 이름 반응'] }, '목소리는 가까워지지 않는다. 대신 같은 문장을 조금 더 정확한 도리의 목소리로 되풀이한다.'),
      opt('목소리의 방향을 기록한다', { a: [['record', 1]], n: ['아이 목소리는 깊은 숲이 아니라 뿌리길에서 돌아왔다'] }, '소리는 깊은 곳에서 오지 않는다. 이미 지나온 길 뒤편에서 따라오고 있다.')]],
    tree: ['표식 나무', '나무껍질에는 오래된 칼자국이 있다. 처음에는 방향 표시처럼 보이지만, 가까이 보면 이름의 첫 글자를 지운 흔적이다.\n\n그 아래에는 낡은 천 조각이 끼어 있다.', [
      opt('지워진 이름을 읽어 본다', { a: [['record', 1]], c: ['지워진 이름의 첫 글자'] }, '글자는 하나로 읽히지 않는다. 도리, 마루, 소미. 서로 다른 이름들이 같은 칼자국 아래 눌려 있다.'),
      opt('천 조각을 묶어 둔다', { a: [['ritual', 1], ['grief', 1]], c: ['소미의 천 조각'] }, '천 조각은 바람 없이 흔들린다. 누군가 아직 제단으로 돌아가지 못했다.')]],
    deep: ['깊은 숲길', '깊은 숲으로 이어지는 길이다. 낮인데도 안쪽은 밤처럼 어둡다.\n\n지금 들어가면 길을 잃을 수 있다. 하지만 가장자리에는 작은 발자국이 있다. 아이 발자국처럼 보이다가 끝에서 짐승 발처럼 갈라진다.', [
      opt('가장자리만 확인한다', { a: [['fear', 1], ['record', 1]], c: ['깊은 숲 입구의 갈라진 발자국'] }, '발자국은 아이가 짐승이 된 흔적이라기보다, 아이의 이름이 짐승의 길 위에 겹친 흔적에 가깝다.'),
      opt('아직 들어가지 않는다', { a: [['boundary', 1]], n: ['깊은 숲 진입 보류'] }, '물러서는 것도 기록이다. 아직 부를 이름이 정리되지 않았을 때 들어가면, 숲은 먼저 대답한다.')]]
  }[place];
  if (!data) return false;
  scene(data[0], data[1], data[2], place);
  return true;
}
function startNight1() {
  R.stage = 'night1';
  R.day = 1;
  R.count = 0;
  R.max = 1;
  show('3장 1일차 밤', '첫날 낮의 조사는 숲의 표면만 건드렸다.\n\n밤이 되자 숲은 장소가 아니라 목소리로 변한다. 오늘 밤은 한 길만 고를 수 있다. 도리의 목소리, 사량의 덫, 표식 나무, 깊은 숲길 중 하나를 확인하자.', [{ text: '밤 조사를 시작한다', run: closeDialog }]);
}
function night1(place) {
  const data = {
    voice: ['1일차 밤: 도리의 목소리', '도리의 목소리가 가까이서 들린다.\n\n“어머니가 부르면 가야 하는데, 산이 먼저 불러요.”\n\n목소리 뒤로 작은 발소리가 여러 개 따라온다. 하나의 아이가 아니라, 여러 아이가 같은 길을 따라 걷는 소리다.', { a: [['grief', 1], ['ritual', 1]], c: ['도리의 목소리: 산이 먼저 부름'], n: ['도리는 집으로 가려다 다른 이를 부르는 길이 되었다'] }],
    trap: ['1일차 밤: 사량의 덫', '밤의 덫에는 짐승이 걸려 있지 않다. 덫 안에는 마루의 목소리가 걸려 있다.\n\n“찍으라 해서 찍었는데, 나무가 피를 흘렸어요.”', { a: [['record', 1], ['fear', 1]], c: ['마루의 목소리가 걸린 덫'], n: ['마루는 누군가의 목소리에 이끌려 나무를 찍었다'] }],
    tree: ['1일차 밤: 표식 나무', '표식 나무의 상처가 새로 젖어 있다. 검은 물이 아니라 아주 묽은 피처럼 보인다.\n\n뿌리 아래에서 소미의 천 조각이 흔들린다.', { a: [['grief', 1]], c: ['표식 나무 아래 소미의 흔적'], n: ['소미는 아직 제단으로 돌아가지 못했다'] }],
    deep: ['1일차 밤: 깊은 숲길', '깊은 숲에서 아이가 서 있다. 얼굴은 보이지 않는다.\n\n“같이 가면 집에 갈 수 있어요.”\n\n해루가 떨리는 목소리로 말한다. “저 아이, 발이 땅에 닿지 않습니다.”', { a: [['fear', 1], ['ritual', 1]], c: ['발이 닿지 않는 아이 그림자'], n: ['도리 창귀화 가능성'] }]
  }[place];
  if (!data) return toast('밤에는 도리의 목소리, 사량의 덫, 표식 나무, 깊은 숲길 중 하나를 골라야 한다.'), true;
  show(data[0], data[1], [{ text: '밤의 흔적을 받아 적는다', e: data[2], response: '첫 번째 밤 기록이 끝났다. 숲은 도리를 숨긴 것이 아니다. 도리의 이름을 여러 길에 나누어 걸어 두었다.', run: beginDay2 }]);
  return true;
}
function beginDay2() {
  R.stage = 'day2';
  R.day = 2;
  R.count = 0;
  R.max = 4;
  show('3장 2일차 낮', '아침이 오자 금지된 숲은 다시 평범한 나무들로 돌아간다. 그러나 밤에 들은 이름들은 사라지지 않는다.\n\n둘째 날은 산제의 순서를 복원해야 한다. 누구를 부르고, 누구를 돌려보내고, 어떤 경계를 다시 세워야 하는지 확인하자.', [{ text: '2일차 낮 조사를 시작한다', run: closeDialog }]);
}
function day2(place) {
  const data = {
    entrance: ['2일차 금지된 숲 입구', '입구의 금줄은 밤새 더 헐거워졌다. 끊어진 자리를 감추면 튼튼해 보이지만, 실제로는 어디가 약한지 알 수 없다.', [
      opt('끊어진 자리를 드러내어 묶는다', { a: [['boundary', 1], ['ritual', 1]], c: ['불완전한 금줄 복원'] }, '끊어진 자리를 숨기지 않자, 금줄은 더 약하지만 더 정직한 경계가 된다.'),
      opt('관아 끈으로 보강한다', { a: [['record', 1], ['boundary', 1]], o: ['관아 끈으로 숲 경계 보강'] }, '인간 질서가 오래된 의례를 받친다. 어울리지 않지만, 오늘은 필요하다.')]],
    roots: ['2일차 뿌리길', '뿌리길은 어제보다 덜 반복된다. 대신 뿌리 사이에 오래된 제문 조각 같은 나무껍질이 끼어 있다.', [
      opt('제문 조각을 맞춰 본다', { a: [['ritual', 1], ['record', 1]], c: ['문을 닫는 제문 조각'] }, '문장은 부르는 말이 아니다. 닫는 말이다. 산제는 산을 부르는 의식이 아니라 돌아오는 것을 막는 절차였다.'),
      opt('물소리와 제문 박자를 대조한다', { a: [['ritual', 1]], n: ['제문 박자는 물소리와 반대로 흐른다'] }, '물소리가 길을 열 때, 제문은 길을 닫는다. 두 소리는 서로 싸우는 것이 아니라 균형을 맞추고 있었다.')]],
    trap: ['2일차 사량의 덫', '사량은 덫을 다시 놓으려 한다. 그의 분노는 산군을 향하지만, 손끝은 죽은 아내 연지의 이름에 묶여 있다.', [
      opt('화살보다 이름을 먼저 묻는다', { a: [['grief', 1]], n: ['사량의 분노는 연지의 이름에 묶여 있다'] }, '사량은 한참 뒤에야 연지의 이름을 말한다. 산군보다 먼저 나온 이름은 분노가 아니라 슬픔이다.'),
      opt('덫을 마지막 방어로만 쓰게 한다', { a: [['boundary', 1], ['fear', 1]], o: ['사량의 덫 제한 사용'] }, '사량은 완전히 납득하지 않는다. 하지만 오늘 밤 덫이 의례를 배신하지 않도록 위치만은 바꾼다.')]],
    tree: ['2일차 표식 나무', '표식 나무의 상처에는 세 이름이 겹쳐 있다. 도리, 마루, 소미. 이름들은 사건 순서가 아니라 의례 순서로 얽혀 있다.', [
      opt('세 이름의 순서를 정리한다', { a: [['record', 1], ['grief', 1]], c: ['도리·마루·소미 이름 순서'] }, '누가 먼저 사라졌는지보다, 누가 누구를 불렀는지가 중요하다. 이름은 시간순이 아니라 길의 순서로 배열된다.'),
      opt('소미의 천 조각을 제문 옆에 둔다', { a: [['ritual', 1], ['grief', 1]], c: ['소미 천 조각과 제문'] }, '천 조각이 제문 옆에서 멎는다. 소미는 도리보다 오래 이 숲의 가장자리에 붙잡혀 있었을지도 모른다.')]],
    voice: ['2일차 아이 목소리 길', '낮인데도 목소리가 들린다. 이제 목소리는 도리 하나가 아니다.\n\n어떤 목소리는 집에 가자고 하고, 어떤 목소리는 집이 어디냐고 묻는다.', [
      opt('각 목소리에 이름을 붙인다', { a: [['grief', 1], ['record', 1]], c: ['이름 붙인 아이 목소리들'] }, '이름이 붙자 목소리 몇 개는 조용해진다. 두려운 것은 이름이 아니라 이름 없는 채 남는 것이다.'),
      opt('목소리를 따라가지 않는다', { a: [['boundary', 1]], n: ['목소리를 따라가지 않는 절차'] }, '따라가지 않는 것도 의례다. 산제는 모든 부름에 답하지 않기 위해 만들어졌을지도 모른다.')]],
    deep: ['2일차 깊은 숲길', '깊은 숲길 안쪽에는 어제보다 분명한 아이 그림자가 보인다.\n\n하지만 그림자 뒤에는 더 큰 등, 검은 바위처럼 둥근 등이 숲의 어둠 속에 엎드려 있다.', [
      opt('검은 등을 직접 보지 않는다', { a: [['boundary', 1]], n: ['검은등 직접 대면 보류'] }, '아직 부를 이름이 모자라다. 보지 않는 것이 도망은 아니다. 준비 없는 대면은 산의 이름을 사람에게 뒤집어씌운다.'),
      opt('도리의 이름만 낮게 부른다', { a: [['grief', 1], ['ritual', 1]], c: ['검은 등 앞의 도리 이름 반응'] }, '아이 그림자가 잠깐 도리의 자세로 돌아온다. 그러나 곧 다시 길의 모양이 된다.')]]
  }[place];
  if (!data) return false;
  scene(data[0], data[1], data[2], place);
  return true;
}
function openMidReport() {
  R.stage = 'report';
  const panel = byId('reportPanel'), title = byId('reportTitle'), intro = byId('reportIntro'), groups = byId('reportGroups'), finish = byId('finishReport');
  if (!panel || !title || !intro || !groups || !finish) return;
  const report = { truth: null, measure: null, expression: null };
  title.textContent = '3장 중간 보고서';
  intro.textContent = '금지된 숲의 오래된 산제 기록을 중간 정리합니다. 이 보고서는 밤에 어떤 이름이 먼저 반응할지 바꿉니다.';
  buildReport(groups, report, [
    { key: 'truth', title: '복원된 사실', items: ['산제는 부르는 의식이 아니라 닫는 절차', '도리는 길 잃은 아이이자 부르는 목소리', '사람이 의례를 끊어 경계가 약해짐', '검은등의 개입은 아직 판단 보류'] },
    { key: 'measure', title: '밤의 조치', items: ['도리 이름을 보존한다', '마루의 목소리를 풀어 준다', '소미의 흔적을 제문에 둔다', '깊은 숲 진입을 보류한다'] },
    { key: 'expression', title: '공식 표현', items: ['금지된 숲 경계 붕괴', '실종자 이름 대조 필요', '산제 절차 일부 복원', '기록 불가한 현상으로 보류'] }
  ]);
  finish.onclick = () => {
    if (!report.truth || !report.measure || !report.expression) { toast('모든 항목을 하나씩 선택하세요.'); return; }
    R.report = report;
    add(R.off, `3장 중간 보고: ${report.truth} / ${report.measure} / ${report.expression}`);
    panel.style.display = 'none';
    R.stage = 'night2';
    R.day = 2;
    R.count = 0;
    R.max = 1;
    respond('3장 중간 보고서가 접수되었다.\n\n그날 밤, 숲은 보고서에 적힌 순서대로 목소리를 낸다. 복원된 기록이 맞는지, 혹은 또 다른 이름을 지우고 있는지 확인해야 한다.', () => show('3장 2일차 밤', '도리의 목소리, 사량의 덫, 표식 나무, 깊은 숲길 중 한 곳에서 중간 보고서의 반응을 확인하자.', [{ text: '2일차 밤 조사를 시작한다', run: closeDialog }]));
  };
  panel.style.display = 'block';
}
function night2(place) {
  const data = {
    voice: ['2일차 밤: 도리의 이름', '도리의 목소리가 검은등의 숨 사이에서 새어 나온다.\n\n“부르면 가고 싶은데, 산이 먼저 대답해요.”\n\n이제 도리가 어디에 있는지보다, 누구의 부름에 먼저 반응하는지가 더 중요해졌다.', { a: [['grief', 1], ['ritual', 1]], c: ['도리 이름 보존 조건'], n: ['도리는 월선의 이름 부름이 필요하다'] }],
    trap: ['2일차 밤: 마루의 목소리', '덫 안에서 마루의 목소리가 다시 들린다.\n\n“문을 열면 집에 갈 수 있다고 했어요.”\n\n마루는 가해자라기보다, 이미 다른 목소리에 속아 문을 연 아이에 가깝다.', { a: [['record', 1], ['grief', 1]], c: ['마루: 문을 열었다는 증언'], n: ['마루는 도리의 목소리에 이끌렸을 가능성'] }],
    tree: ['2일차 밤: 소미의 천 조각', '표식 나무 아래 천 조각이 바람 없이 흔들린다.\n\n소미라는 이름은 다른 이름들보다 더 오래 숲 가장자리에 걸려 있었다. 누군가 그 이름을 제문 밖에 두었기 때문에 돌아가지 못한 것처럼 보인다.', { a: [['grief', 1], ['ritual', 1]], c: ['소미 이름의 누락'], n: ['산제 기록에서 빠진 이름이 있었다'] }],
    deep: ['2일차 밤: 깊은 숲의 등', '깊은 숲 안쪽에서 거대한 등이 움직인다. 호랑이의 등처럼 보이지만, 바위가 숨 쉬는 것처럼 느리다.\n\n검은등은 아직 나타난 것이 아니다. 숲이 그를 떠올리고 있다.', { a: [['fear', 1], ['boundary', 1]], c: ['검은등의 자리 예고'], n: ['검은등은 사람을 벌하기보다 경계를 잃은 존재일 수 있다'] }]
  }[place];
  if (!data) return toast('2일차 밤에는 도리의 목소리, 사량의 덫, 표식 나무, 깊은 숲길 중 하나를 골라야 한다.'), true;
  show(data[0], data[1], [{ text: '밤의 검증을 기록한다', e: data[2], response: '두 번째 밤 기록이 끝났다. 오래된 산제의 조각은 모였지만, 아직 그것을 누구에게 적용해야 하는지는 결정되지 않았다.', run: beginDawn3 }]);
  return true;
}
function beginDawn3() {
  R.stage = 'dawn3';
  R.day = 3;
  R.count = 0;
  R.max = 1;
  show('3장 3일차 새벽', '새벽이 오자 금지된 숲은 다시 평범한 나무들로 돌아간다.\n\n그러나 이제 사실을 안다. 도리는 죽은 아이만도 아니고, 살아 돌아올 아이도 아니다. 그는 집으로 가려다 사람을 산으로 부르는 목소리가 되었다.\n\n깊은 숲길 쪽에서 마지막 기록을 정리하자.', [{ text: '새벽 기록을 정리한다', run: closeDialog }]);
}
function dawn3() {
  show('3장 새벽 기록', '오래된 산제는 산을 달래는 의식만이 아니었다.\n\n그것은 죽은 길과 산길, 사람 길이 서로 섞이지 않게 닫는 절차였다. 의례가 끊기자 이름들은 제자리로 돌아가지 못했고, 도리는 그 이름들을 집으로 데려가려는 목소리가 되었다.\n\n검은등은 아직 직접 모습을 드러내지 않았다. 그러나 그가 지키던 경계는 무너졌고, 그의 자리로 가야만 남은 이름들을 돌려보낼 수 있다.', [
    { text: '도리 천도 준비를 우선한다', e: { a: [['grief', 1], ['ritual', 1]], o: ['4장 목표: 도리 천도 준비'] }, run: openFinalReport },
    { text: '사량의 덫부터 회수한다', e: { a: [['boundary', 1]], o: ['4장 목표: 사량의 덫 회수'] }, run: openFinalReport },
    { text: '막례에게 산군의 이름을 묻기로 한다', e: { a: [['ritual', 1]], o: ['4장 목표: 산군 이름 조사'] }, run: openFinalReport },
    { text: '금지된 숲 봉쇄를 보고한다', e: { a: [['record', 1]], o: ['금지된 숲 임시 봉쇄'] }, run: openFinalReport }
  ]);
  return true;
}
function openFinalReport() {
  R.done = true;
  closeDialog();
  toast('3장 확장 종료. 원본 3장 보고서로 이어집니다.');
  try { window.openReport && window.openReport(3); } catch {}
}

function buildReport(groupsBox, report, groups) {
  groupsBox.innerHTML = '';
  groups.forEach(g => {
    const div = document.createElement('div');
    div.className = 'reportGroup';
    div.innerHTML = `<b>${g.title}</b><div class="choices"></div>`;
    const box = div.querySelector('.choices');
    g.items.forEach(item => {
      const b = document.createElement('button');
      b.textContent = item;
      b.onclick = () => {
        report[g.key] = item;
        [...box.children].forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
      };
      box.appendChild(b);
    });
    groupsBox.appendChild(div);
  });
}

window.addEventListener('keydown', event => {
  if (R.dialog) {
    const active = document.activeElement;
    if (ACTION_KEYS.has(event.key) && active && active.closest && active.closest('#options')) {
      event.preventDefault(); event.stopImmediatePropagation(); active.click(); return;
    }
    const n = parseInt(event.key, 10);
    if (n >= 1) {
      const b = byId('options')?.children[n - 1];
      if (b) { event.preventDefault(); event.stopImmediatePropagation(); b.click(); return; }
    }
    if (ACTION_KEYS.has(event.key)) { event.preventDefault(); event.stopImmediatePropagation(); }
    return;
  }
  if (!ACTION_KEYS.has(event.key) || event.repeat || reportOpen() || originalDialogOpen()) return;
  if (!inChapter3()) return;
  const place = currentLoc();
  if (!place) return;
  const handled = handle(place);
  if (handled) { event.preventDefault(); event.stopImmediatePropagation(); }
}, true);
setInterval(() => { maybeStart(); side(); }, 850);
})();
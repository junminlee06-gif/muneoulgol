(() => {
'use strict';

const VERSION = 'chapter3 patch v2026-06-11b';
let shade = null;
let mark = null;

function byId(id) { return document.getElementById(id); }
function txt(id) { return byId(id)?.innerText || ''; }
function ensureVisuals() {
  if (!shade) {
    const style = document.createElement('style');
    style.textContent = `
#ch3PatchShade{position:absolute;inset:0;z-index:4;display:none;pointer-events:none;background:radial-gradient(circle at 50% 46%,rgba(35,24,14,.22) 0 18%,rgba(0,0,0,.62) 62%,rgba(0,0,0,.88) 100%);box-shadow:inset 0 0 190px rgba(0,0,0,.96)}
#ch3PatchShade:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,226,160,.018) 0 1px,transparent 1px 23px),linear-gradient(rgba(255,220,150,.025),rgba(0,0,0,.18));mix-blend-mode:screen}
#ch3PatchMark{position:fixed;left:10px;bottom:66px;z-index:99999;color:#d2ad73;background:rgba(18,13,9,.76);border:1px solid #4a3b2c;padding:3px 6px;font:11px system-ui}
`;
    document.head.appendChild(style);
    const gamebox = document.querySelector('.gamebox');
    if (gamebox) {
      shade = document.createElement('div');
      shade.id = 'ch3PatchShade';
      gamebox.appendChild(shade);
    }
  }
  if (!mark && document.body) {
    mark = document.createElement('div');
    mark.id = 'ch3PatchMark';
    mark.textContent = VERSION;
    document.body.appendChild(mark);
  }
}
function isNight() {
  const phase = txt('phaseText');
  const speaker = txt('speaker');
  const body = txt('dialogText');
  if (!phase.includes('3장') && !speaker.includes('3장') && !speaker.includes('1일차 밤') && !speaker.includes('2일차 밤')) return false;
  return phase.includes('밤') || speaker.includes('밤') || body.includes('밤의 금지된 숲') || body.includes('밤이 내려오자');
}
function updateShade() {
  ensureVisuals();
  if (shade) shade.style.display = isNight() ? 'block' : 'none';
}

const replacements = new Map([
  ['3장: 오래된 산제', '금지된 숲은 사건의 다음 장소가 아니다.\n\n이곳은 마을이 오래전에 중단한 산제의 기록이 아직 썩지 않고 남아 있는 곳이다. 흙은 젖어 있고, 금줄은 낡았고, 나무들은 같은 방향으로 기울어 있다. 길은 사람 길, 짐승 길, 죽은 자의 길로 갈라지지 않는다. 세 길이 서로를 흉내 내며 겹쳐져 있다.\n\n3장의 목표는 도리를 단순히 찾는 것이 아니다. 왜 아이들이 이름이 아니라 길이 되었는지, 오래된 산제는 원래 무엇을 닫으려 했는지 복원하는 것이다.'],
  ['3장 1일차 밤', '밤이 내려오자 금지된 숲은 색을 잃는다. 낮에는 종이처럼 겹쳐 보이던 길들이 이제는 검은 먹물처럼 서로 번진다.\n\n오늘 밤은 한 길만 고를 수 있다. 도리의 목소리, 사량의 덫, 표식 나무, 깊은 숲길 중 하나를 확인해야 한다.\n\n이 밤의 목적은 누가 죽었는지를 확인하는 것이 아니다. 어떤 이름이 아직 돌아가지 못했는지 듣는 것이다.'],
  ['1일차 밤: 도리의 목소리', '도리의 목소리가 아주 가까이서 들린다. 낮에는 숲 안쪽에서 들렸는데, 지금은 귓가 바로 뒤에서 숨을 쉰다.\n\n“어머니가 부르면 가야 하는데, 산이 먼저 불러요.”\n\n목소리 뒤로 작은 발소리가 여러 개 따라온다. 하나의 아이가 아니라, 여러 아이가 같은 길을 따라 걷는 소리다. 도리의 말 끝에는 아직 도리 아닌 아이들의 숨이 붙어 있다.\n\n해루가 칼집에 손을 얹지만, 칼을 뽑지는 않는다. “저건 사람을 부르는 말이지만, 해치려는 말 같진 않습니다.”'],
  ['1일차 밤: 사량의 덫', '밤의 덫에는 짐승이 걸려 있지 않다. 덫 안에는 마루의 목소리가 걸려 있다.\n\n“찍으라 해서 찍었는데, 나무가 피를 흘렸어요.”\n\n목소리는 쇠 이빨 사이에서 떨린다. 마루는 거짓말을 하는 아이처럼 들리지 않는다. 누군가의 말을 그대로 믿고, 나무를 찍었고, 찍힌 나무가 길을 열었을 뿐이다.\n\n사량이 놓은 덫은 산군을 기다렸지만, 먼저 걸린 것은 겁먹은 아이의 대답이었다.'],
  ['1일차 밤: 표식 나무', '표식 나무의 상처가 새로 젖어 있다. 검은 물이 아니라 아주 묽은 피처럼 보인다. 나무껍질의 칼자국 사이에서 낡은 천 조각이 천천히 흔들린다.\n\n그 천은 아이 옷감처럼 작고, 제물보처럼 오래됐다. 바람은 없는데 천만 움직인다. 마치 누군가 뒤늦게 자기 이름을 여기에 묶어 달라고 흔드는 것 같다.\n\n소미라는 이름은 누구도 크게 말하지 않았다. 그래서인지 그 이름의 흔적이 가장 오래 숲에 남아 있다.'],
  ['1일차 밤: 깊은 숲길', '깊은 숲에서 아이가 서 있다. 얼굴은 보이지 않는다. 머리와 어깨의 높이는 도리와 비슷하지만, 발이 땅에 닿지 않는다.\n\n“같이 가면 집에 갈 수 있어요.”\n\n해루가 떨리는 목소리로 말한다. “저 아이, 발이 땅에 닿지 않습니다.”\n\n그 순간 아이 뒤편에서 더 큰 그림자가 아주 느리게 숨을 쉰다. 호랑이인지 바위인지 알 수 없다. 다만 그 등은 검고, 오래 기다린 문처럼 낮게 웅크려 있다.'],
  ['3장 2일차 낮', '아침이 오자 금지된 숲은 다시 평범한 나무들로 돌아간다. 그러나 밤에 들은 이름들은 사라지지 않는다. 도리의 목소리, 마루의 대답, 소미의 천 조각, 깊은 숲의 검은 등은 서로 다른 단서가 아니라 하나의 의례에서 빠져나온 조각들이다.\n\n둘째 날은 산제의 순서를 복원해야 한다. 누구를 부르고, 누구를 돌려보내고, 어떤 경계를 다시 세워야 하는지 확인하자.'],
  ['3장 2일차 밤', '두 번째 밤은 첫 번째 밤보다 깊다. 첫 번째 밤이 “누가 아직 남아 있는가”를 들려줬다면, 두 번째 밤은 “어떤 순서로 돌려보내야 하는가”를 묻는다.\n\n도리의 목소리, 사량의 덫, 표식 나무, 깊은 숲길 중 한 곳에서 중간 보고서의 반응을 확인하자. 숲은 보고서에 적힌 문장을 그대로 믿지 않는다. 대신 빠진 이름부터 되묻는다.'],
  ['2일차 밤: 도리의 이름', '도리의 목소리가 검은등의 숨 사이에서 새어 나온다.\n\n“부르면 가고 싶은데, 산이 먼저 대답해요.”\n\n이제 도리가 어디에 있는지보다, 누구의 부름에 먼저 반응하는지가 더 중요해졌다. 월선의 이름인가, 산의 이름인가, 검은등의 숨인가. 도리는 아직 아이의 목소리로 말하지만, 그 목소리는 길목처럼 열려 있다.\n\n당신이 이름을 부르려 하자 숲 전체가 먼저 숨을 들이쉰다. 부르는 순서를 틀리면, 도리가 아니라 숲이 대답할 것이다.'],
  ['2일차 밤: 마루의 목소리', '덫 안에서 마루의 목소리가 다시 들린다.\n\n“문을 열면 집에 갈 수 있다고 했어요.”\n\n마루는 가해자라기보다, 이미 다른 목소리에 속아 문을 연 아이에 가깝다. 그는 도끼를 들었지만, 도끼를 들게 한 것은 분노가 아니라 약속이었다.\n\n쇠 이빨은 목소리를 붙잡고 있지만, 붙잡힌 목소리는 계속 같은 말을 반복한다. 덫은 짐승을 멈추게 할 수 있어도, 믿었던 말을 멈추게 하지는 못한다.'],
  ['2일차 밤: 소미의 천 조각', '표식 나무 아래 천 조각이 바람 없이 흔들린다.\n\n소미라는 이름은 다른 이름들보다 더 오래 숲 가장자리에 걸려 있었다. 누군가 그 이름을 제문 밖에 두었기 때문에 돌아가지 못한 것처럼 보인다.\n\n나무 상처에서 검은 물이 다시 배어 나온다. 검은 물은 아래로 흐르지 않고, 이름이 지워진 칼자국을 따라 옆으로 번진다. 빠진 이름 하나가 의례 전체를 옆으로 밀어 낸 것이다.'],
  ['2일차 밤: 깊은 숲의 등', '깊은 숲 안쪽에서 거대한 등이 움직인다. 호랑이의 등처럼 보이지만, 바위가 숨 쉬는 것처럼 느리다.\n\n검은등은 아직 나타난 것이 아니다. 숲이 그를 떠올리고 있다. 오래된 주인의 등, 길을 나누던 짐승의 등, 이제는 어떤 길이 사람 길인지 기억하지 못하는 검은 등.\n\n그 등 앞에 도리의 그림자가 서 있다. 아이가 산군에게 먹힌 것이 아니라, 산군이 잃어버린 경계 안에 아이가 걸린 것처럼 보인다.'],
  ['3장 3일차 새벽', '새벽이 오자 금지된 숲은 다시 평범한 나무들로 돌아간다. 그러나 평범해진 것은 숲의 얼굴뿐이다.\n\n도리는 죽은 아이만도 아니고, 살아 돌아올 아이도 아니다. 그는 집으로 가려다 사람을 산으로 부르는 목소리가 되었다. 마루는 그 목소리에 속아 문을 열었고, 소미는 제문 밖에 남아 오래 흔들렸다.\n\n깊은 숲길 쪽에서 마지막 기록을 정리하자. 이제 3장은 끝나지만, 검은등의 자리는 아직 시작되지 않았다.'],
  ['3장 새벽 기록', '오래된 산제는 산을 달래는 의식만이 아니었다.\n\n그것은 죽은 길과 산길, 사람 길이 서로 섞이지 않게 닫는 절차였다. 의례가 끊기자 이름들은 제자리로 돌아가지 못했고, 도리는 그 이름들을 집으로 데려가려는 목소리가 되었다. 선의가 길을 잃으면, 그것은 가장 위험한 부름이 된다.\n\n검은등은 아직 직접 모습을 드러내지 않았다. 그러나 그가 지키던 경계는 무너졌고, 그의 자리로 가야만 남은 이름들을 돌려보낼 수 있다. 마지막 보고서는 이 숲을 끝내는 문서가 아니라, 검은등의 자리로 들어가는 허가장이 될 것이다.']
]);

const reactionRules = [
  { has: '첫 번째 밤 기록이 끝났다', text: '첫 번째 밤 기록이 끝났다. 숲은 도리를 숨긴 것이 아니다. 도리의 이름을 여러 길에 나누어 걸어 두었다.\n\n목소리는 아이의 것이지만, 작동 방식은 길의 것이다. 누군가를 해치려는 악의보다 무서운 것은, 모두 함께 집에 가려는 잘못된 선의다.' },
  { has: '3장 중간 보고서가 접수되었다', text: '3장 중간 보고서가 접수되었다.\n\n관아 문서는 숲을 모르지만, 숲은 문서의 순서를 안다. 그날 밤, 금지된 숲은 보고서에 적힌 첫 문장부터 되풀이한다. 복원된 기록이 맞는지, 혹은 또 다른 이름을 지우고 있는지 확인해야 한다.' },
  { has: '두 번째 밤 기록이 끝났다', text: '두 번째 밤 기록이 끝났다. 오래된 산제의 조각은 모였지만, 아직 그것을 누구에게 적용해야 하는지는 결정되지 않았다.\n\n이제 남은 문제는 도리를 되찾는 것이 아니라, 도리를 붙잡고 있는 길과 검은등이 잃어버린 경계를 어떻게 분리할 것인가다.' }
];

function patchDialogue() {
  const speakerEl = byId('speaker');
  const bodyEl = byId('dialogText');
  if (!speakerEl || !bodyEl) return;
  const speaker = speakerEl.innerText || '';
  const body = bodyEl.innerText || '';
  let key = speaker;
  let replacement = replacements.get(key);
  if (!replacement && speaker === '기록 반응') {
    const rule = reactionRules.find(r => body.includes(r.has));
    if (rule) {
      key = `reaction:${rule.has}`;
      replacement = rule.text;
    }
  }
  if (replacement && bodyEl.dataset.ch3PatchKey !== key) {
    bodyEl.innerText = replacement;
    bodyEl.dataset.ch3PatchKey = key;
  }
}

const observer = new MutationObserver(() => {
  patchDialogue();
  updateShade();
});
function start() {
  ensureVisuals();
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  setInterval(() => { patchDialogue(); updateShade(); }, 350);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
})();
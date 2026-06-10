(() => {
'use strict';

const day = new Audio('audio/day.mp3');
const night = new Audio('audio/night.mp3');
day.loop = night.loop = true;
day.volume = night.volume = 0.45;
let musicOn = false;
let current = null;
let shade = null;

const css = document.createElement('style');
css.textContent = '#muneoulgolMusic{position:fixed;right:18px;bottom:18px;z-index:99999;background:rgba(31,25,20,.94);color:#ded4c1;border:1px solid #6e5a40;border-radius:10px;padding:9px 12px;font:14px system-ui,sans-serif}#ch1Shade{position:absolute;inset:0;background:rgba(0,0,0,.60);box-shadow:inset 0 0 140px rgba(0,0,0,.9);z-index:4;pointer-events:none;display:none}#ch1Mark{position:fixed;left:10px;bottom:10px;z-index:99999;color:#b7925d;background:rgba(20,15,10,.75);border:1px solid #4a3b2c;padding:3px 6px;font:11px system-ui}#muneoulgolPad,#muneoulgolAction,#muneoulgolUnlock{display:none!important}';
const music = document.createElement('button');
music.id = 'muneoulgolMusic';
music.textContent = '음악 켜기';
const mark = document.createElement('div');
mark.id = 'ch1Mark';
mark.textContent = 'ch1-expansion v2026-06-10h';

document.addEventListener('DOMContentLoaded', () => {
  document.head.appendChild(css);
  document.body.appendChild(music);
  document.body.appendChild(mark);
  const gamebox = document.querySelector('.gamebox');
  if (gamebox) {
    shade = document.createElement('div');
    shade.id = 'ch1Shade';
    gamebox.appendChild(shade);
  }
  cleanup();
});

function cleanup(){ ['muneoulgolPad','muneoulgolAction','muneoulgolUnlock'].forEach(id => document.getElementById(id)?.remove()); }
function txt(id){ return document.getElementById(id)?.innerText || ''; }
function isNight(){ return P.stage === 'night1' || P.stage === 'night2'; }
function updateShade(){ if (shade) shade.style.display = isNight() && P.active && !P.done ? 'block' : 'none'; }
async function play(k){
  const target = k === 'night' ? night : day;
  const other = k === 'night' ? day : night;
  if (current === target && !target.paused) return;
  other.pause();
  other.currentTime = 0;
  current = target;
  try { await target.play(); } catch { musicOn = false; }
  music.textContent = musicOn ? (k === 'night' ? '밤 음악 재생 중' : '낮 음악 재생 중') : '음악 켜기';
}
music.onclick = () => {
  musicOn = !musicOn;
  if (!musicOn) { day.pause(); night.pause(); music.textContent = '음악 켜기'; return; }
  play(isNight() ? 'night' : 'day');
};
setInterval(() => { cleanup(); updateShade(); if (musicOn) play(isNight() ? 'night' : 'day'); }, 800);

const LOC = {'촌장집':'chief','마을 우물':'well','무당집':'shaman','방앗간':'mill','관아 임시처소':'office'};
const ACTION = new Set(['Enter',' ','z','Z']);
const P = {active:false,done:false,dialog:false,stage:'d1',day:1,count:0,max:3,seen:{},off:[],note:[],clue:[],bias:{beast:0,human:0,ritual:0,conceal:0,unknown:0}};

function inCh1(){
  const h = txt('hud') + txt('phaseText');
  return !P.done && (P.active || (h.includes('무너울골') && !/[2345]장/.test(h) && h.includes('1장')));
}
function loc(){ const m = txt('hud').match(/상호작용:\s*([^\n]+)/); return m ? LOC[m[1].trim()] : null; }
function oldDialog(){ const d=document.getElementById('dialog'); return d && !P.dialog && (d.style.display==='block' || (d.style.display==='' && txt('speaker'))); }
function reportOpen(){ return document.getElementById('reportPanel')?.style.display === 'block'; }
function add(a,v){ if (v && !a.includes(v)) a.push(v); }
function fx(e={}){ (e.b||[]).forEach(([k,n])=>P.bias[k]+=n); (e.o||[]).forEach(v=>add(P.off,v)); (e.n||[]).forEach(v=>add(P.note,v)); (e.c||[]).forEach(v=>add(P.clue,v)); }
function esc(s){ return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function toast(m){ const t=document.getElementById('toast'); if(!t) return; t.textContent=m; t.style.display='block'; clearTimeout(toast.id); toast.id=setTimeout(()=>t.style.display='none',1600); }
function label(){ return {d1:'첫날 낮',report:'첫 보고',night1:'첫날 밤',d2:'둘째 낮',dusk:'둘째 해질녘',night2:'두 번째 밤',end:'새벽 정리'}[P.stage] || P.stage; }
function side(){
  if(!P.active || P.done) return;
  const ph=document.getElementById('phaseText'), off=document.getElementById('official'), un=document.getElementById('unofficial'), cl=document.getElementById('cluePills');
  if(ph) ph.textContent = `1장 확장 · ${P.day}일차 · ${label()} · 조사 ${P.count}/${P.max}`;
  if(off) off.innerHTML = P.off.map(v=>`<li>${esc(v)}</li>`).join('') || '<li class="small">아직 없음</li>';
  if(un) un.innerHTML = P.note.map(v=>`<li>${esc(v)}</li>`).join('') || '<li class="small">아직 없음</li>';
  if(cl) cl.innerHTML = P.clue.map(v=>`<span class="pill">단서: ${esc(v)}</span>`).join('') || '<span class="small">아직 없음</span>';
  updateShade();
}
function close(){ const d=document.getElementById('dialog'); if(d) d.style.display='none'; P.dialog=false; side(); }
function show(sp, body, opts){
  const d=document.getElementById('dialog'), s=document.getElementById('speaker'), tx=document.getElementById('dialogText'), box=document.getElementById('options');
  if(!d||!s||!tx||!box) return;
  P.active=true; P.dialog=true;
  s.textContent=sp; tx.textContent=body; box.innerHTML='';
  opts.forEach((op,i)=>{
    const b=document.createElement('button');
    b.textContent = `${i+1}. ${op.text}`;
    b.onclick = () => { fx(op.e); if(op.response) respond(op.response, op.run); else { if(!op.keep) close(); if(op.run) op.run(); } side(); };
    box.appendChild(b);
  });
  d.style.display='block';
  side();
}
function respond(body,next){ show('기록 반응', body, [{text:'계속한다', run:next||close}]); }
function opt(text,e,response){ return {text,e,response}; }
function seen(place){ const k=P.stage+':'+place; if(P.seen[k]){ toast('이미 조사한 곳이다. 다른 장소를 보자.'); return false; } P.seen[k]=true; P.count++; return true; }
function after(){ if(P.count>=P.max){ if(P.stage==='d1') report1(); else if(P.stage==='d2') dusk2(); } else toast(`조사 ${P.count}/${P.max} 완료. 다른 장소로 이동하자.`); }
function scene(title,body,opts,place){ show(title,body,opts.map(o=>({...o,run:()=>{ if(seen(place)) after(); }}))); }

function handle(place){
  P.active=true;
  if(P.stage==='d1') return day1(place);
  if(P.stage==='night1') return night1(place);
  if(P.stage==='d2') return day2(place);
  if(P.stage==='night2') return night2(place);
  if(P.stage==='end') return place==='office' ? finishBridge() : toast('관아 임시처소에서 마무리하자.');
}

function day1(place){
  if(!['chief','well','shaman','mill'].includes(place)) return toast('촌장집, 우물, 무당집, 방앗간을 조사하자.');
  const D={
    chief:['을파의 장부','촌장집 마루는 볕을 잘 받는데도 장부 위만 눅눅하다. 을파는 당신이 앉기도 전에 장부를 펴고, 펴는 순간 손바닥으로 한 칸을 가린다.\n\n그 칸에는 산제에 쓴 쌀과 술의 수량이 있어야 했다. 그러나 먹이 번진 빈칸만 남아 있다.',[
      opt('범의 흔적으로 본다.',{b:[['beast',1]],o:['촌장 진술: 범 가능성']},'을파는 기다렸다는 듯 고개를 끄덕인다.\n\n“그렇게 적으면 마을이 덜 흔들릴 겁니다.”\n\n그 말은 걱정처럼 들리지만, 어쩐지 부탁처럼도 들린다.'),
      opt('산제 중단과 연결한다.',{b:[['ritual',1]],c:['산제 비용 공백']},'당신이 빈칸을 짚자 을파의 손가락이 잠깐 굳는다.\n\n장부는 마을의 기억을 담는 물건인데, 이 칸만은 누군가 일부러 기억하지 않기로 한 듯 비어 있다.'),
      opt('기록 정리를 의심한다.',{b:[['conceal',1]],n:['장부가 지나치게 정리되어 있다']},'장부는 이상할 만큼 깨끗하다. 지저분한 마을의 장부가 아니라, 누군가 나중에 보여주려고 고른 종이 같다.\n\n을파는 “관아 사람은 늘 빈칸부터 보더군요”라고 낮게 말한다.')]],
    well:['우물가','우물가에는 아이들이 남긴 발자국이 겹겹이 말라 있다. 물동이를 내려놓은 흔적, 허둥지둥 달아난 발끝, 그리고 그 위를 지워 밟은 어른의 발자국.\n\n물은 조용한데, 우물 안쪽에서 산길 물소리가 난다.',[
      opt('도리의 이름을 확인한다.',{b:[['human',1]],o:['이름 확인: 도리'],c:['도리의 이름']},'월선은 이름을 듣자마자 고개를 든다.\n\n“도리요. 아직 도리라고 불러야 합니다. 사라졌다고 해서 이름까지 잃은 건 아니니까요.”\n\n그 말 끝에서 우물물이 아주 작게 흔들린다.'),
      opt('산제 노래를 묻는다.',{b:[['ritual',1]],c:['산제 노래']},'한 아이가 노래의 첫 구절을 부르다 말고 입을 다문다.\n\n“어른들이 그 노래 하지 말랬어요.”\n\n금지된 노래는 사라진 아이보다 오래 마을에 남아 있었던 것 같다.'),
      opt('주민 침묵을 본다.',{b:[['conceal',1]],n:['사람들이 서로 눈치를 본다']},'당신이 질문을 멈추자 사람들도 함께 숨을 멈춘다.\n\n누구도 거짓말을 하고 있지는 않다. 다만 모두가 말하지 않기로 한 문장 앞에서 입술을 닫고 있다.')]],
    shaman:['막례의 말','무당집 처마 밑 금줄은 오래되어 누렇게 말랐다. 그런데 매듭 하나만 새 짚이다. 막례는 그것을 등 뒤로 감추지 않는다. 오히려 보라는 듯 내버려 둔다.\n\n“산은 기록을 못 해. 대신 사람이 산 대신 거짓말을 하지.”',[
      opt('산제 의미를 묻는다.',{b:[['ritual',1]],c:['검은등 별칭']},'막례는 방울을 흔들지 않는다. 흔들지 않는데도 쇳소리가 난다.\n\n“검은등은 이름이 아니야. 등을 보였다는 뜻이지. 산이 등을 보이면, 사람은 길을 잃어.”'),
      opt('사람의 개입을 묻는다.',{b:[['human',1]],n:['사람이 산 이름을 빌릴 때가 있다']},'막례가 처음으로 당신을 빤히 본다.\n\n“산이 아이를 부를 때도 있고, 사람이 산 목소리를 흉내 낼 때도 있어. 문제는 둘이 같은 소리로 들린다는 거야.”'),
      opt('공식 감시 대상으로 본다.',{b:[['conceal',1]],o:['무당 감시 필요성']},'당신이 감시라는 말을 꺼내자 막례는 웃지 않는다.\n\n“관아 문서에 내 이름을 올려. 대신 아이 이름도 같이 올려. 어른 이름만 남는 보고서는 늘 사람을 덜 죽인 척하거든.”')]],
    mill:['방앗간','방앗간은 낮인데도 서늘하다. 물레는 멈췄고 물길도 막혔는데, 축에는 방금 젖은 듯한 물방울이 맺혀 있다.\n\n돌확 아래에는 풀 조각 하나가 끼어 있다. 짚신에서 빠진 것처럼 가늘고, 누군가 급히 떼어낸 것처럼 끝이 찢겼다.',[
      opt('풀 조각을 챙긴다.',{b:[['human',1]],c:['짚신 풀 조각']},'풀 조각은 작지만 방향이 있다. 끌려간 흔적이라기보다는, 붙잡힌 쪽이 버틴 흔적에 가깝다.\n\n당신은 그것을 공식 단서가 아니라 먼저 손안에 숨긴다.'),
      opt('물기를 확인한다.',{b:[['ritual',1]],c:['젖은 물레 축']},'물은 차갑지 않다. 이상하게도 손끝에 닿는 순간, 오래된 제삿술 냄새가 난다.\n\n방앗간의 물은 흐르지 않았지만, 무언가 이곳을 지나갔다.'),
      opt('검은 털을 줍는다.',{b:[['beast',1]],c:['검은 털']},'검은 털은 범의 것이라 적기에는 너무 젖어 있고, 사람의 것이라 하기에는 너무 거칠다.\n\n기록하기 쉬운 단서일수록 거짓말을 하기 쉽다.')]]
  }[place];
  scene(D[0],D[1],D[2],place);
}

function report1(){ P.stage='report'; P.active=true; P.dialog=false; const d=document.getElementById('dialog'); if(d)d.style.display='none'; openFirstReportPanel(); side(); }
function openFirstReportPanel(){
  const panel=document.getElementById('reportPanel'), title=document.getElementById('reportTitle'), intro=document.getElementById('reportIntro'), groupsBox=document.getElementById('reportGroups'), finishBtn=document.getElementById('finishReport');
  if(!panel||!title||!intro||!groupsBox||!finishBtn)return;
  const report={cause:null,measure:null,missing:null};
  title.textContent='1장 중간 보고서';
  intro.textContent='첫날 낮 조사 결과를 관아 문장으로 정리합니다. 무엇을 쓰느냐보다 무엇을 빼느냐가 더 오래 남습니다. 제출 후 1일차 밤 조사로 이어집니다.';
  const groups=[
    {key:'cause',title:'사건 원인',items:['범의 흔적','사람의 흔적','산제 흔적','마을 은폐','판단 보류']},
    {key:'measure',title:'조치',items:['산길 폐쇄','추가 조사','촌장 책임 조사','무당 협조','수색 지속']},
    {key:'missing',title:'실종자 표기',items:['생존 가능성 있음','행방 불명','호적 보류','사망 추정']}
  ];
  groupsBox.innerHTML='';
  groups.forEach(g=>{
    const div=document.createElement('div');
    div.className='reportGroup';
    div.innerHTML='<b>'+g.title+'</b><div class="choices"></div>';
    const box=div.querySelector('.choices');
    g.items.forEach(item=>{
      const b=document.createElement('button');
      b.textContent=item;
      b.onclick=()=>{ report[g.key]=item; [...box.children].forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); };
      box.appendChild(b);
    });
    groupsBox.appendChild(div);
  });
  finishBtn.onclick=()=>{
    if(!report.cause||!report.measure||!report.missing){ toast('모든 항목을 하나씩 선택하세요.'); return; }
    add(P.off,'1장 첫 보고: '+report.cause+' / '+report.measure+' / '+report.missing);
    if(report.cause.includes('범'))P.bias.beast+=2; else if(report.cause.includes('사람'))P.bias.human+=2; else if(report.cause.includes('산제'))P.bias.ritual+=2; else if(report.cause.includes('은폐'))P.bias.conceal+=2; else P.bias.unknown+=2;
    panel.style.display='none';
    respond('중간 보고서가 접수되었다. 종이는 금세 마르지만, 거기에 쓰지 않은 말들은 젖은 채로 남는다.\n\n밤이 되자 마을은 보고서에 적힌 문장과 다른 소리를 내기 시작한다.',startNight1);
  };
  panel.style.display='block';
}

function startNight1(){ P.day=1; P.stage='night1'; P.count=0; P.max=1; updateShade(); show('1일차 밤','첫 보고서를 올렸지만 밤은 아직 끝나지 않았다.\n\n관아에 보낸 문장은 마을을 조용하게 만들었지만, 조용해진 자리마다 다른 소리가 고인다. 우물, 무당집, 방앗간 중 한 곳을 확인하자.',[{text:'밤 조사를 시작한다',run:close}]); }
function finishNight1(afterText){ show('새벽 기록',afterText,[{text:'2일차 아침으로 넘긴다',run:()=>beginDay2('night')}]); }
function night1(place){
  if(!['well','shaman','mill'].includes(place))return toast('첫날 밤에는 우물, 무당집, 방앗간 중 한 곳만 확인하자.');
  const D={
    well:{title:'첫날 밤의 우물',body:'우물가에는 아무도 없다. 그런데 누가 방금 물을 길어 간 듯 바닥이 젖어 있다.\n\n두레박 줄은 안쪽으로 내려가 있지 않은데, 물 위에는 장승 그림자가 비친다. 장승은 우물가에 서 있지 않다.',e:{b:[['ritual',1]],c:['우물의 이름 반응'],n:['도리 이름에 우물이 반응했다']},response:'당신은 도리의 이름을 기록장 가장자리에 적는다.\n\n먹이 번지기도 전에 우물 안쪽에서 같은 이름이 아주 작게 되돌아온다. 메아리라기에는 너무 늦고, 대답이라기에는 너무 낮다.\n\n이름은 살아 있는 사람에게 붙는 것인데, 이 밤의 우물은 사라진 아이의 이름만 알아듣는다.',after:'첫날 밤 기록: 우물은 범의 발자국도, 사람의 손자국도 내놓지 않았다. 대신 이름에 반응했다.\n\n공식 보고서에는 쓰기 어려운 사실이다. 그러나 2일차에는 월선에게 도리의 이름, 노래, 우물가에서 마지막으로 본 사람을 다시 물어야 한다.'},
    shaman:{title:'첫날 밤의 무당집',body:'무당집에는 등불이 없다. 그런데 금줄의 짚 끝마다 희미한 빛이 걸려 있다. 막례는 문 안쪽에 앉아 있고, 당신이 온 것을 이미 알고 있었던 사람처럼 말한다.\n\n“보고서에 적은 말이 밤을 부른다. 범이라 적으면 범의 길이 열리고, 사람이라 적으면 사람이 숨을 곳이 생기지.”',e:{b:[['ritual',1]],c:['밤의 금줄'],n:['막례는 창귀 가능성을 에둘러 말했다']},response:'막례는 끝내 검은등이라는 이름을 입 밖에 내지 않는다.\n\n대신 문턱 아래를 손가락으로 누른다. 그곳에는 아이 손톱보다 작은 짚 조각이 끼어 있다. 막례는 그것을 보지 못한 척하고, 당신도 곧장 줍지 않는다.\n\n두 사람이 모른 척하는 사이, 금줄이 아주 천천히 흔들린다.',after:'첫날 밤 기록: 막례는 산이 아이를 데려갔다고 말하지 않았다. 다만 사람이 산의 이름을 빌릴 수 있다고 했다.\n\n2일차에는 무당집 뒤뜰, 금줄 매듭, 오래된 제문을 함께 봐야 한다. 막례가 숨기는 것이 의례인지 죄책감인지는 아직 갈리지 않았다.'},
    mill:{title:'첫날 밤의 방앗간',body:'방앗간의 물레는 멈춰 있다. 하지만 멈춘 물레에서 물이 도는 소리만 빠져나온다.\n\n돌확 밑에는 물길이 없는데 젖은 냄새가 난다. 나무 바닥은 오래된 쌀겨 냄새와, 새로 젖은 짚 냄새를 함께 품고 있다.',e:{b:[['human',1],['ritual',1]],c:['밤 방앗간의 물소리'],n:['방앗간에서 아이 목소리 같은 소리를 들었다']},response:'물레 소리 사이로 아주 낮은 목소리가 섞인다. 아이 목소리 같기도 하고, 어른이 아이 흉내를 내는 소리 같기도 하다.\n\n돌확 가장자리에는 낮에 본 풀 조각과 같은 결의 짚이 하나 더 붙어 있다. 그 옆에는 작은 발자국이 아니라, 더 큰 발자국의 진흙이 말라붙어 있다.\n\n산의 소리와 사람의 흔적이 같은 곳에 남았다.',after:'첫날 밤 기록: 방앗간은 산의 흔적과 사람의 흔적을 동시에 남겼다. 어느 한쪽만 적으면 나머지 하나가 거짓이 된다.\n\n2일차에는 방앗간의 짚 조각, 촌장집 장부의 빈칸, 마을 뒤편의 젖은 짚 냄새를 서로 대조해야 한다.'}
  }[place];
  show(D.title,D.body,[{text:'밤의 흔적을 기록한다',e:D.e,response:D.response,run:()=>finishNight1(D.after)}]);
}

function beginDay2(k){ P.day=2; P.stage='d2'; P.count=0; P.max=2; const m={beast:'범이라는 말은 마을을 잠시 안정시켰다. 하지만 밤의 기록은 범만으로는 닫히지 않는다.',human:'월선은 당신이 밤에 무엇을 들었는지 묻기 전부터 알고 있는 얼굴로 기다리고 있다.',ritual:'막례의 금줄은 아침에도 젖어 있다. 밤의 말은 사라지지 않았다.',conceal:'마을 전체가 더 조용해졌다. 침묵이 곧 증언처럼 느껴진다.',unknown:'아무것도 확정하지 않았기 때문에, 모든 것이 아직 가능하다.',night:'첫날 밤의 기록이 마을의 낮을 바꾸었다. 어제의 보고서는 끝난 문서가 아니라, 오늘의 의심을 여는 문이 되었다.'}[k]||'둘째 날이 밝았다.'; show('2일차 아침',m,[{text:'둘째 날 조사를 시작한다',run:close}]); }
function day2(place){
  if(!['chief','well','shaman','mill'].includes(place))return toast('마을 핵심 장소를 다시 확인하자.');
  const D={
    chief:['2일차 촌장집','을파는 장부를 닫지 않는다. 어제는 손바닥으로 가리던 칸을 오늘은 일부러 열어 둔다.\n\n빈칸은 여전히 빈칸이다. 다만 그 옆에 못 보던 작은 점 하나가 생겼다. 먹이 튄 것인지, 누가 젖은 손으로 짚은 것인지 알 수 없다.',[opt('은폐 정황을 묻는다.',{b:[['conceal',1]],n:['을파는 헛간 이야기에 표정을 닫았다']},'을파는 “마을을 지키는 일과 마을을 의심하는 일이 늘 다르진 않다”고 말한다.\n\n그 말은 변명처럼 들리지만, 동시에 경고처럼도 들린다.'),opt('마루 이름을 확인한다.',{b:[['human',1]],c:['마루 이름']},'마루라는 이름은 장부의 가장자리에서 발견된다. 정식 호적 칸이 아니라, 빚과 품삯을 적는 난외다.\n\n아이의 이름은 언제나 어른들의 계산 밖에 먼저 적힌다.')]],
    well:['2일차 우물가','월선은 우물가에 앉아 도리의 이름을 반복하고 있다. 이름을 부르는 것이 기도인지 확인인지 분간되지 않는다.\n\n우물 안쪽 물빛은 어제보다 조금 어둡다.',[opt('도리 이름을 기록한다.',{b:[['human',1]],o:['도리 이름 공식 기록'],c:['도리의 이름']},'당신이 도리의 이름을 공식 기록에 올리겠다고 말하자 월선의 어깨가 아주 조금 내려간다.\n\n살아 돌아오지 못하더라도 이름이 사라지지는 않는다는 약속이 된다.'),opt('노래를 더 묻는다.',{b:[['ritual',1]],c:['노래 조각']},'월선은 노래를 모른다고 한다. 하지만 마지막 음만은 따라 부른다.\n\n모르는 노래의 끝을 알고 있다는 건, 누군가 오래전에 이 노래를 마을 전체에 남겼다는 뜻이다.')]],
    shaman:['2일차 막례','막례는 젖은 돌을 볕에 말리고 있다. 돌은 마르지 않는다.\n\n“물에 젖은 게 아니야. 이름에 젖은 거지.” 그녀는 그렇게 말하고, 더는 설명하지 않는다.',[opt('산제 관련성을 묻는다.',{b:[['ritual',1]],n:['막례는 말을 아꼈다']},'막례는 산제는 빌기 위한 자리가 아니라 돌려보내기 위한 자리였다고 말한다.\n\n무엇을 돌려보내는지 묻자, 그녀는 마을 쪽을 본다.'),opt('비공식 기록에 남긴다.',{b:[['unknown',1]],n:['산의 등은 검고 물의 입은 닫히지 않는다']},'당신은 관아 문서가 아닌 쪽지에 적는다.\n\n“산의 등은 검고, 물의 입은 닫히지 않는다.”\n\n막례는 그 문장을 보고 처음으로 고개를 끄덕인다.')]],
    mill:['2일차 방앗간','방앗간의 물레는 완전히 말랐다. 말랐기 때문에 더 수상하다.\n\n밤새 젖어 있던 냄새가 한순간에 사라진 자리에, 누군가 쓸고 간 자국만 남아 있다.',[opt('검은 털을 보관한다.',{b:[['beast',1]],c:['젖은 검은 털']},'검은 털은 아침이 되자 조금 가벼워졌다.\n\n짐승의 흔적이라면 사냥꾼에게 보여야 한다. 그러나 너무 빨리 보여주면, 다른 흔적들이 그 이름 아래 묻힐 것이다.'),opt('돌확을 조사한다.',{b:[['ritual',1]],c:['돌확 절차']},'돌확의 홈은 물길이 아니라 사람 손으로 판 선이다.\n\n그 선은 산 쪽을 향하다가, 마지막에 마을 안쪽으로 꺾인다.')]]
  }[place];
  scene(D[0],D[1],D[2],place);
}
function dusk2(){ P.stage='dusk'; show('2일차 해질녘','해가 산등성이에 걸리자 마을은 다시 두 갈래로 갈라진다.\n\n하나는 관아에 적기 쉬운 길이다. 다른 하나는 아직 이름 붙이기 어려운 길이다. 누구의 말을 믿을지 정해야 한다.',[{text:'을파의 설명을 따른다',e:{b:[['beast',1]]},response:'을파는 고개를 숙인다. 마을은 잠시 안정된다.\n\n하지만 안정된 마을일수록 누군가의 울음소리는 더 멀리 밀려난다.',run:startNight2},{text:'월선의 증언을 믿는다',e:{b:[['human',1]]},response:'월선은 도리의 이름을 다시 붙잡는다.\n\n그 이름이 사건의 증거가 아니라, 아이가 아직 사람으로 남아 있다는 마지막 끈처럼 느껴진다.',run:startNight2},{text:'막례의 경고를 듣는다',e:{b:[['ritual',1]]},response:'막례가 금줄을 한 겹 더 묶는다.\n\n그녀의 손은 늙었지만 매듭은 흔들리지 않는다. 무언가가 밤에 들어오지 못하게 하려는 손이다.',run:startNight2},{text:'누구도 완전히 믿지 않는다',e:{b:[['unknown',1]]},response:'모든 증언이 서로 다른 방향을 가리킨다.\n\n당신은 어느 한쪽으로 기울지 않는 대신, 모든 쪽에서 미움을 살 준비를 한다.',run:startNight2}]); }
function startNight2(){ P.stage='night2'; P.count=0; P.max=1; updateShade(); toast('두 번째 밤이다. 화면이 어두워졌다.'); }
function night2(place){ if(!['chief','well','shaman','mill'].includes(place))return toast('밤에는 핵심 장소 한 곳만 보자.'); const D={chief:['헛간 쪽 밤','젖은 짚 냄새가 난다. 낮에는 없던 냄새다.\n\n헛간 문틈 안쪽에서 누군가 숨을 참는 듯한 정적이 이어진다.',{b:[['conceal',1]],c:['젖은 짚단']}],well:['우물의 밤','도리 이름이 되돌아온다. 이번에는 한 번이 아니다.\n\n물은 같은 이름을 여러 사람의 목소리로 나누어 돌려준다.',{b:[['ritual',1]],c:['이름 반응']}],shaman:['금줄의 밤','금줄이 한 겹 더 매인다. 막례는 아무 말 없이 매듭을 물어뜯어 끊고 다시 묶는다.\n\n오래된 의례는 기도보다 수선에 가깝다.',{b:[['ritual',1]],c:['제문 조각']}],mill:['돌확의 밤','물소리가 계속 난다. 물이 없는 곳에서 물소리가 난다는 것은, 물이 아니라 길이 흐른다는 뜻일지도 모른다.',{b:[['unknown',1]],n:['물소리 속에 여러 이름이 섞였다']}]}[place]; show(D[0],D[1],[{text:'새벽까지 기록한다',e:D[2],response:'밤의 기록이 끝났다. 새벽이 오자 어둠이 조금 물러난다.\n\n하지만 어둠이 물러난 자리에 남은 것은 빛이 아니라, 더 선명해진 발자국이다.',run:end1}]); }
function end1(){ P.stage='end'; updateShade(); show('1장 종료','도리는 돌아오지 않았다.\n\n하지만 이제 그는 단순한 실종자가 아니다. 보고서에 적힌 이름, 우물에 되돌아온 이름, 누군가 숨기려 한 이름이 되었다.\n\n물소리 골짜기는 그 이름들을 한꺼번에 삼키고 있다.',[{text:'원본 보고서 화면을 연다',run:finish}]); }
function finishBridge(){ show('원본 2장 연결','1장 확장 이벤트가 끝났다.\n\n이제 관아에 올릴 마지막 1장 보고서를 정리하고, 물소리 골짜기로 넘어간다.',[{text:'원본 보고서 작성 화면을 연다',run:finish}]); }
function finish(){ P.done=true; close(); updateShade(); toast('1장 확장 종료. 원본 2장으로 이어집니다.'); try{ window.openReport && window.openReport(1); }catch{} }
function adoptOriginalMidReport(){ if(P.done)return; P.active=true; P.day=1; P.stage='night1'; P.count=0; P.max=1; add(P.off,'1장 첫 보고: 중간 보고서 제출'); const d=document.getElementById('dialog'); if(d)d.style.display='none'; P.dialog=false; show('1일차 밤','중간 보고서는 올라갔다.\n\n하지만 보고서가 마을을 떠난 뒤에야, 보고서에 적히지 않은 것들이 움직이기 시작한다. 우물, 무당집, 방앗간 중 한 곳을 확인하자.',[{text:'밤 조사를 시작한다',run:close}]); }

document.addEventListener('click',e=>{ const target=e.target&&e.target.closest?e.target.closest('#finishReport'):null; if(!target)return; const title=txt('reportTitle'); if(!title.includes('1장 중간 보고서'))return; const selected=document.querySelectorAll('#reportPanel button.selected').length; if(selected<3)return; setTimeout(adoptOriginalMidReport,0); },false);
window.addEventListener('keydown',e=>{
  if(P.dialog){
    const active=document.activeElement;
    if(ACTION.has(e.key)&&active&&active.closest&&active.closest('#options')){e.preventDefault();e.stopImmediatePropagation();active.click();return;}
    const n=parseInt(e.key,10);
    if(n>=1){ const b=document.getElementById('options')?.children[n-1]; if(b){e.preventDefault();e.stopImmediatePropagation();b.click();return;} }
    if(ACTION.has(e.key)){e.preventDefault();e.stopImmediatePropagation();}
    return;
  }
  if(!ACTION.has(e.key)||e.repeat||reportOpen()||oldDialog()||!inCh1())return;
  const l=loc(); if(!l)return;
  e.preventDefault(); e.stopImmediatePropagation(); handle(l);
},true);
setInterval(side,900);
})();
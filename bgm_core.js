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
mark.textContent = 'expansion v2026-06-11c';

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

const P = { active:false, done:false, dialog:false, stage:'d1', day:1, count:0, max:3, seen:{}, off:[], note:[], clue:[], bias:{beast:0,human:0,ritual:0,conceal:0,unknown:0} };
const Q = { active:false, done:false, dialog:false, stage:'wait', day:1, count:0, max:4, seen:{}, off:[], note:[], clue:[], report:{cause:null,measure:null,route:null}, bias:{path:0,human:0,ritual:0,conceal:0,unknown:0} };

function byId(id){ return document.getElementById(id); }
function text(id){ return byId(id)?.innerText || ''; }
function allText(){ return `${text('hud')}\n${text('phaseText')}\n${text('speaker')}\n${text('dialogText')}\n${text('reportTitle')}`; }
function cleanupLegacyButtons(){ ['muneoulgolPad','muneoulgolAction','muneoulgolUnlock'].forEach(id => byId(id)?.remove()); }
function add(list,value){ if(value && !list.includes(value)) list.push(value); }
function escapeHtml(value){ return String(value).replace(/[&<>]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch])); }
function toast(message){ const t=byId('toast'); if(!t)return; t.textContent=message; t.style.display='block'; clearTimeout(toast.timer); toast.timer=setTimeout(()=>{t.style.display='none';},1600); }
function currentLoc(){ const match=text('hud').match(/상호작용:\s*([^\n]+)/); return match ? LOC[match[1].trim()] : null; }
function reportOpen(){ return byId('reportPanel')?.style.display === 'block'; }
function originalDialogOpen(){ const d=byId('dialog'); return d && !P.dialog && !Q.dialog && (d.style.display==='block' || (d.style.display==='' && text('speaker'))); }
function isNight(){ return ['night1','night2'].includes(P.stage) || ['night1','night2'].includes(Q.stage); }
function updateShade(){ if(shade) shade.style.display = isNight() && ((P.active&&!P.done)||(Q.active&&!Q.done)) ? 'block' : 'none'; }
async function playTrack(kind){ const target=kind==='night'?night:day; const other=kind==='night'?day:night; if(currentTrack===target && !target.paused)return; other.pause(); other.currentTime=0; currentTrack=target; try{ await target.play(); }catch{ musicOn=false; } musicButton.textContent = musicOn ? (kind==='night'?'밤 음악 재생 중':'낮 음악 재생 중') : '음악 켜기'; }
musicButton.onclick = () => { musicOn=!musicOn; if(!musicOn){ day.pause(); night.pause(); musicButton.textContent='음악 켜기'; return; } playTrack(isNight()?'night':'day'); };

function applyEffects(target,effects={}){ (effects.b||[]).forEach(([key,value])=>{ if(Object.prototype.hasOwnProperty.call(target.bias,key)) target.bias[key]+=value; }); (effects.o||[]).forEach(v=>add(target.off,v)); (effects.n||[]).forEach(v=>add(target.note,v)); (effects.c||[]).forEach(v=>add(target.clue,v)); }
function labelP(){ return {d1:'첫날 낮',report:'첫 보고',night1:'첫날 밤',d2:'둘째 낮',dusk:'둘째 해질녘',night2:'두 번째 밤',end:'새벽 정리'}[P.stage] || P.stage; }
function labelQ(){ return {intro:'도입',day1:'1일차 낮',night1:'1일차 밤',day2:'2일차 낮',report:'2장 중간 보고',night2:'2일차 밤',end:'새벽 정리'}[Q.stage] || Q.stage; }
function side(){
  const ph=byId('phaseText'), off=byId('official'), un=byId('unofficial'), cl=byId('cluePills');
  const target = Q.active && !Q.done ? Q : (P.active && !P.done ? P : null);
  if(!target)return;
  if(ph) ph.textContent = target===Q ? `2장 확장 · ${labelQ()} · 조사 ${target.count}/${target.max}` : `1장 확장 · ${target.day}일차 · ${labelP()} · 조사 ${target.count}/${target.max}`;
  if(off) off.innerHTML = target.off.map(v=>`<li>${escapeHtml(v)}</li>`).join('') || '<li class="small">아직 없음</li>';
  if(un) un.innerHTML = target.note.map(v=>`<li>${escapeHtml(v)}</li>`).join('') || '<li class="small">아직 없음</li>';
  if(cl) cl.innerHTML = target.clue.map(v=>`<span class="pill">단서: ${escapeHtml(v)}</span>`).join('') || '<span class="small">아직 없음</span>';
  updateShade();
}
function closeDialog(){ const d=byId('dialog'); if(d)d.style.display='none'; P.dialog=false; Q.dialog=false; side(); }
function showFor(target,speaker,body,options){
  const d=byId('dialog'), s=byId('speaker'), tx=byId('dialogText'), box=byId('options');
  if(!d||!s||!tx||!box)return;
  target.active=true; target.dialog=true; if(target===P)Q.dialog=false; if(target===Q)P.dialog=false;
  s.textContent=speaker; tx.textContent=body; box.innerHTML='';
  options.forEach((option,index)=>{ const button=document.createElement('button'); button.textContent=`${index+1}. ${option.text}`; button.onclick=()=>{ applyEffects(target,option.e); if(option.response){ respondFor(target,option.response,option.run); }else{ if(!option.keep)closeDialog(); if(option.run)option.run(); } side(); }; box.appendChild(button); });
  d.style.display='block'; side();
}
function respondFor(target,body,next){ showFor(target,'기록 반응',body,[{text:'계속한다',run:next||closeDialog}]); }
function showP(speaker,body,options){ showFor(P,speaker,body,options); }
function respondP(body,next){ respondFor(P,body,next); }
function opt(text,e,response){ return {text,e,response}; }
function markSeen(target,place){ const key=`${target.stage}:${place}`; if(target.seen[key])return false; target.seen[key]=true; target.count+=1; return true; }
function inCh1(){ const t=allText(); return !P.done && (P.active || (t.includes('무너울골') && t.includes('1장') && !/[2345]장/.test(t))); }
function inCh2(){ const t=allText(); return P.done && !Q.done && (Q.active || t.includes('2장') || t.includes('물소리 골짜기')); }
function buildReport(groupsBox,report,groups){ groupsBox.innerHTML=''; groups.forEach(group=>{ const div=document.createElement('div'); div.className='reportGroup'; div.innerHTML=`<b>${group.title}</b><div class="choices"></div>`; const choices=div.querySelector('.choices'); group.items.forEach(item=>{ const button=document.createElement('button'); button.textContent=item; button.onclick=()=>{ report[group.key]=item; [...choices.children].forEach(child=>child.classList.remove('selected')); button.classList.add('selected'); }; choices.appendChild(button); }); groupsBox.appendChild(div); }); }
function sceneP(title,body,options,place){ showP(title,body,options.map(option=>({...option,run:()=>{ if(!markSeen(P,place)){toast('이미 조사한 곳이다. 다른 장소를 보자.');return;} if(P.count>=P.max){ if(P.stage==='d1')report1(); else if(P.stage==='d2')dusk2(); }else{ toast(`조사 ${P.count}/${P.max} 완료. 다른 장소로 이동하자.`); } }}))); }
function sceneQ(title,body,options,place){ showFor(Q,title,body,options.map(option=>({...option,run:()=>{ if(!markSeen(Q,place)){toast('이미 2장 기록에 올린 장소다. 다른 흔적을 보자.');return;} if(Q.count>=Q.max){ if(Q.stage==='day1')startCh2Night1(); else if(Q.stage==='day2')ch2Report(); }else{ toast(`2장 조사 ${Q.count}/${Q.max} 완료. 더 대조하자.`); } }}))); }

function handleP(place){ P.active=true; if(P.stage==='d1')return day1(place); if(P.stage==='night1')return night1(place); if(P.stage==='d2')return day2(place); if(P.stage==='night2')return night2(place); if(P.stage==='end')return place==='office'?openFinalCh1Report():toast('관아 임시처소에서 마무리하자.'); }
function day1(place){
  if(!['chief','well','shaman','mill'].includes(place))return toast('촌장집, 우물, 무당집, 방앗간을 조사하자.');
  const data={
    chief:['을파의 장부','촌장집 마루는 볕을 잘 받는데도 장부 위만 눅눅하다. 을파는 장부 한 칸을 손바닥으로 가린다.\n\n그 칸에는 산제에 쓴 쌀과 술의 수량이 있어야 했다. 그러나 먹이 번진 빈칸만 남아 있다.',[opt('범의 흔적으로 본다.',{b:[['beast',1]],o:['촌장 진술: 범 가능성']},'을파는 기다렸다는 듯 고개를 끄덕인다. “그렇게 적으면 마을이 덜 흔들릴 겁니다.”'),opt('산제 중단과 연결한다.',{b:[['ritual',1]],c:['산제 비용 공백']},'당신이 빈칸을 짚자 을파의 손가락이 잠깐 굳는다.'),opt('기록 정리를 의심한다.',{b:[['conceal',1]],n:['장부가 지나치게 정리되어 있다']},'장부는 이상할 만큼 깨끗하다. 누군가 나중에 보여주려고 고른 종이 같다.')]],
    well:['우물가','우물가에는 아이들이 남긴 발자국이 겹겹이 말라 있다. 물은 조용한데, 우물 안쪽에서 산길 물소리가 난다.',[opt('도리의 이름을 확인한다.',{b:[['human',1]],o:['이름 확인: 도리'],c:['도리의 이름']},'월선은 이름을 듣자마자 고개를 든다. “도리요. 아직 도리라고 불러야 합니다.”'),opt('산제 노래를 묻는다.',{b:[['ritual',1]],c:['산제 노래']},'한 아이가 노래의 첫 구절을 부르다 말고 입을 다문다.'),opt('주민 침묵을 본다.',{b:[['conceal',1]],n:['사람들이 서로 눈치를 본다']},'모두가 말하지 않기로 한 문장 앞에서 입술을 닫고 있다.')]],
    shaman:['막례의 말','무당집 처마 밑 금줄은 오래되어 누렇게 말랐다. 그런데 매듭 하나만 새 짚이다.\n\n“산은 기록을 못 해. 대신 사람이 산 대신 거짓말을 하지.”',[opt('산제 의미를 묻는다.',{b:[['ritual',1]],c:['검은등 별칭']},'“검은등은 이름이 아니야. 등을 보였다는 뜻이지.”'),opt('사람의 개입을 묻는다.',{b:[['human',1]],n:['사람이 산 이름을 빌릴 때가 있다']},'“산이 아이를 부를 때도 있고, 사람이 산 목소리를 흉내 낼 때도 있어.”'),opt('공식 감시 대상으로 본다.',{b:[['conceal',1]],o:['무당 감시 필요성']},'“관아 문서에 내 이름을 올려. 대신 아이 이름도 같이 올려.”')]],
    mill:['방앗간','방앗간은 낮인데도 서늘하다. 물레는 멈췄고 물길도 막혔는데, 축에는 방금 젖은 듯한 물방울이 맺혀 있다.',[opt('풀 조각을 챙긴다.',{b:[['human',1]],c:['짚신 풀 조각']},'풀 조각은 붙잡힌 쪽이 버틴 흔적에 가깝다.'),opt('물기를 확인한다.',{b:[['ritual',1]],c:['젖은 물레 축']},'손끝에 닿는 순간 오래된 제삿술 냄새가 난다.'),opt('검은 털을 줍는다.',{b:[['beast',1]],c:['검은 털']},'검은 털은 범의 것이라 적기에는 너무 젖어 있다.')]]
  }[place]; sceneP(data[0],data[1],data[2],place);
}
function report1(){ P.stage='report'; P.dialog=false; const d=byId('dialog'); if(d)d.style.display='none'; openFirstReportPanel(); side(); }
function openFirstReportPanel(){ const panel=byId('reportPanel'), title=byId('reportTitle'), intro=byId('reportIntro'), groupsBox=byId('reportGroups'), finishBtn=byId('finishReport'); if(!panel||!title||!intro||!groupsBox||!finishBtn)return; const report={cause:null,measure:null,missing:null}; title.textContent='1장 중간 보고서'; intro.textContent='첫날 낮 조사 결과를 관아 문장으로 정리합니다. 제출 후에는 1일차 밤 조사로 이어집니다.'; buildReport(groupsBox,report,[{key:'cause',title:'사건 원인',items:['범의 흔적','사람의 흔적','산제 흔적','마을 은폐','판단 보류']},{key:'measure',title:'조치',items:['산길 폐쇄','추가 조사','촌장 책임 조사','무당 협조','수색 지속']},{key:'missing',title:'실종자 표기',items:['생존 가능성 있음','행방 불명','호적 보류','사망 추정']}]); finishBtn.onclick=()=>{ if(!report.cause||!report.measure||!report.missing){toast('모든 항목을 하나씩 선택하세요.');return;} add(P.off,`1장 첫 보고: ${report.cause} / ${report.measure} / ${report.missing}`); panel.style.display='none'; respondP('중간 보고서가 접수되었다. 종이는 금세 마르지만, 거기에 쓰지 않은 말들은 젖은 채로 남는다.\n\n밤이 되자 마을은 보고서에 적힌 문장과 다른 소리를 내기 시작한다.',startNight1); }; panel.style.display='block'; }
function startNight1(){ P.day=1; P.stage='night1'; P.count=0; P.max=1; updateShade(); showP('1일차 밤','첫 보고서를 올렸지만 밤은 아직 끝나지 않았다.\n\n우물, 무당집, 방앗간 중 한 곳을 확인하자.',[{text:'밤 조사를 시작한다',run:closeDialog}]); }
function finishNight1(afterText){ showP('1일차 밤 기록',afterText,[{text:'2일차 아침으로 넘긴다',run:beginDay2}]); }
function night1(place){ if(!['well','shaman','mill'].includes(place))return toast('첫날 밤에는 우물, 무당집, 방앗간 중 한 곳만 확인하자.'); const data={well:{title:'첫날 밤의 우물',body:'우물가에는 아무도 없다. 물 위에는 우물가에 없는 장승 그림자가 비친다.',e:{b:[['ritual',1]],c:['우물의 이름 반응'],n:['도리 이름에 우물이 반응했다']},response:'도리의 이름을 적자 우물 안쪽에서 같은 이름이 아주 작게 되돌아온다.',after:'첫날 밤 기록: 우물은 범의 발자국도 사람의 손자국도 내놓지 않았다. 대신 이름에 반응했다.'},shaman:{title:'첫날 밤의 무당집',body:'무당집에는 등불이 없다. 금줄의 짚 끝마다 희미한 빛이 걸려 있다.\n\n막례는 “보고서에 적은 말이 밤을 부른다”고 말한다.',e:{b:[['ritual',1]],c:['밤의 금줄'],n:['막례는 창귀 가능성을 에둘러 말했다']},response:'막례는 끝내 검은등이라는 이름을 입 밖에 내지 않는다. 대신 문턱 아래의 짚 조각을 가리킨다.',after:'첫날 밤 기록: 막례는 산이 아이를 데려갔다고 말하지 않았다. 다만 사람이 산의 이름을 빌릴 수 있다고 했다.'},mill:{title:'첫날 밤의 방앗간',body:'방앗간의 물레는 멈춰 있다. 하지만 멈춘 물레에서 물이 도는 소리만 빠져나온다.',e:{b:[['human',1],['ritual',1]],c:['밤 방앗간의 물소리'],n:['방앗간에서 아이 목소리 같은 소리를 들었다']},response:'물레 소리 사이로 아주 낮은 목소리가 섞인다. 아이 목소리 같기도 하고, 어른이 아이 흉내를 내는 소리 같기도 하다.',after:'첫날 밤 기록: 방앗간은 산의 흔적과 사람의 흔적을 동시에 남겼다. 어느 한쪽만 적으면 나머지 하나가 거짓이 된다.'}}[place]; showP(data.title,data.body,[{text:'밤의 흔적을 기록한다',e:data.e,response:data.response,run:()=>finishNight1(data.after)}]); }
function beginDay2(){ P.day=2; P.stage='d2'; P.count=0; P.max=2; updateShade(); showP('2일차 아침','첫날 밤의 기록이 마을의 낮을 바꾸었다. 아직 마지막 보고서를 쓸 때가 아니다.\n\n둘째 날 낮 조사를 두 곳 더 진행해야 한다.',[{text:'둘째 날 조사를 시작한다',run:closeDialog}]); }
function day2(place){ if(!['chief','well','shaman','mill'].includes(place))return toast('마을 핵심 장소를 다시 확인하자.'); const data={chief:['2일차 촌장집','을파는 장부를 닫지 않는다. 어제는 가리던 칸을 오늘은 일부러 열어 둔다. 빈칸은 여전히 빈칸이다.',[opt('은폐 정황을 묻는다.',{b:[['conceal',1]],n:['을파는 헛간 이야기에 표정을 닫았다']},'을파는 “마을을 지키는 일과 마을을 의심하는 일이 늘 다르진 않다”고 말한다.'),opt('마루 이름을 확인한다.',{b:[['human',1]],c:['마루 이름']},'마루라는 이름은 장부의 가장자리에서 발견된다.')]],well:['2일차 우물가','월선은 우물가에 앉아 도리의 이름을 반복하고 있다.',[opt('도리 이름을 기록한다.',{b:[['human',1]],o:['도리 이름 공식 기록'],c:['도리의 이름']},'이름이 공식 기록에 오른다는 말에 월선의 어깨가 아주 조금 내려간다.'),opt('노래를 더 묻는다.',{b:[['ritual',1]],c:['노래 조각']},'월선은 노래를 모른다고 한다. 하지만 마지막 음만은 따라 부른다.')]],shaman:['2일차 막례','막례는 젖은 돌을 볕에 말리고 있다. 돌은 마르지 않는다.',[opt('산제 관련성을 묻는다.',{b:[['ritual',1]],n:['막례는 말을 아꼈다']},'막례는 산제는 빌기 위한 자리가 아니라 돌려보내기 위한 자리였다고 말한다.'),opt('비공식 기록에 남긴다.',{b:[['unknown',1]],n:['산의 등은 검고 물의 입은 닫히지 않는다']},'당신은 관아 문서가 아닌 쪽지에 적는다.')]],mill:['2일차 방앗간','방앗간의 물레는 완전히 말랐다. 말랐기 때문에 더 수상하다.',[opt('검은 털을 보관한다.',{b:[['beast',1]],c:['젖은 검은 털']},'검은 털은 아침이 되자 조금 가벼워졌다.'),opt('돌확을 조사한다.',{b:[['ritual',1]],c:['돌확 절차']},'돌확의 홈은 물길이 아니라 사람 손으로 판 선이다.')]]}[place]; sceneP(data[0],data[1],data[2],place); }
function dusk2(){ P.stage='dusk'; showP('2일차 해질녘','둘째 날 낮 조사가 끝났다. 이제 누구의 말을 더 무겁게 둘지 정해야 한다.\n\n이 선택 뒤에 두 번째 밤이 온다. 마지막 보고서는 아직 아니다.',[{text:'을파의 설명을 따른다',e:{b:[['beast',1]]},response:'마을은 잠시 안정된다. 하지만 안정된 마을일수록 누군가의 울음소리는 더 멀리 밀려난다.',run:startNight2},{text:'월선의 증언을 믿는다',e:{b:[['human',1]]},response:'월선은 도리의 이름을 다시 붙잡는다.',run:startNight2},{text:'막례의 경고를 듣는다',e:{b:[['ritual',1]]},response:'막례가 금줄을 한 겹 더 묶는다.',run:startNight2},{text:'누구도 완전히 믿지 않는다',e:{b:[['unknown',1]]},response:'모든 증언이 서로 다른 방향을 가리킨다.',run:startNight2}]); }
function startNight2(){ P.stage='night2'; P.count=0; P.max=1; updateShade(); showP('2일차 밤','두 번째 밤이다. 낮 동안 모은 말들은 서로 맞물리지 않는다.\n\n을파는 마을을 지키려 하고, 월선은 이름을 붙잡고, 막례는 산의 이름을 입 밖에 내지 않는다. 어느 쪽도 완전히 틀렸다고 적을 수 없다.\n\n촌장집, 우물, 무당집, 방앗간 중 한 곳을 마지막으로 확인하자.',[{text:'두 번째 밤 조사를 시작한다',run:closeDialog}]); }
function night2(place){
  if(!['chief','well','shaman','mill'].includes(place))return toast('두 번째 밤에는 촌장집, 우물, 무당집, 방앗간 중 한 곳을 보자.');
  const data={
    chief:{title:'두 번째 밤: 촌장집',body:'촌장집 불은 꺼져 있지만 헛간 쪽만 희미하게 젖어 있다. 비가 온 것도 아닌데 짚단 아래에서 물방울이 떨어진다.\n\n을파는 나오지 않는다. 대신 닫힌 문 안쪽에서 종이를 넘기는 소리가 난다. 장부를 덮는 소리가 아니라, 장부에서 무언가를 뜯어내는 소리다.',e:{b:[['conceal',1]],c:['젖은 짚단'],n:['을파가 밤에 장부를 고쳤다']},response:'당신이 헛간 문틈으로 손을 넣자 젖은 짚 한 올이 딸려 나온다. 짚 끝에는 진흙이 묻어 있다.\n\n진흙은 우물가의 흙도, 방앗간의 흙도 아니다. 북쪽 길에서 밟히는 검은 흙이다. 마을 안의 은폐는 이미 산 쪽과 이어져 있다.',after:'두 번째 밤 기록: 촌장집의 침묵은 단순한 두려움이 아니다. 누군가는 북쪽 길과 마을 안쪽 사이의 기록을 고쳐 왔다. 마지막 보고서에 “범”만 적으면 이 젖은 짚은 사라진다.'},
    well:{title:'두 번째 밤: 우물',body:'우물가에는 월선이 없다. 그런데 누군가 같은 자리에 오래 앉아 있었던 듯 땅이 눌려 있다.\n\n물을 들여다보자 도리의 이름이 먼저 돌아오고, 그 뒤에 모르는 이름 하나가 따라온다. 세 번째 이름은 물속에서 부서져 알아들을 수 없다.',e:{b:[['human',1],['ritual',1]],c:['여러 이름의 반응'],n:['우물은 도리 외의 이름도 돌려주었다']},response:'당신은 이름을 받아 적으려다 손을 멈춘다. 아직 확인하지 않은 이름을 공식 문서에 올리는 순간, 그 아이도 실종자가 된다.\n\n하지만 적지 않으면, 그는 애초에 사라진 적 없는 사람이 된다. 기록하지 않는 것도 하나의 삭제다.',after:'두 번째 밤 기록: 우물은 도리 하나만 기억하지 않았다. 마을에는 이전에도 되돌아오지 않은 이름들이 있었다. 마지막 보고서는 한 아이의 실종이 아니라, 지워진 이름들의 순서를 열어야 한다.'},
    shaman:{title:'두 번째 밤: 무당집',body:'막례는 잠들지 않았다. 방 안에는 등불 대신 재 냄새가 가득하다. 금줄 한 가닥이 불에 그을려 그릇 안에 놓여 있다.\n\n“묶어 둔 게 풀리면, 사람들은 그제야 산이 화났다고 말하지. 사실은 사람이 먼저 풀어 놓은 건데.”',e:{b:[['ritual',1],['conceal',1]],c:['그을린 금줄'],n:['막례는 산제 파손을 사람의 책임으로 보았다']},response:'막례는 오래된 제문 한 줄을 외운다. 말은 기도처럼 시작하지만 끝은 경고처럼 닫힌다.\n\n그녀는 도리를 살릴 수 있느냐는 질문에는 대답하지 않는다. 대신 “이름을 제대로 돌려보내야 다음 이름이 붙잡히지 않는다”고 말한다.',after:'두 번째 밤 기록: 산제는 아이를 바치는 의식이 아니라, 돌아오지 못한 이름을 붙잡아 두지 않기 위한 절차였을 가능성이 있다. 마지막 보고서에는 막례의 죄보다, 마을이 의례를 어떻게 망가뜨렸는지를 남겨야 한다.'},
    mill:{title:'두 번째 밤: 방앗간',body:'방앗간 물레는 움직이지 않는다. 그런데 그림자는 천천히 돈다. 달빛이 움직이는 것도 아닌데, 그림자만 반대 방향으로 밀려난다.\n\n돌확 아래에서 아이 목소리 같은 숨소리가 들리고, 곧 어른의 낮은 숨이 그 위를 덮는다.',e:{b:[['human',1],['unknown',1]],c:['반대로 도는 물레 그림자'],n:['방앗간에서 아이와 어른의 숨소리가 겹쳤다']},response:'당신은 낮에 챙긴 풀 조각을 꺼내 돌확 틈에 맞춰 본다. 들어맞는다. 누군가 이곳에서 버텼고, 누군가는 그 버틴 흔적을 나중에 지우려 했다.\n\n산의 소리만 있었다면 흔적은 이렇게 인간적인 모양으로 남지 않았을 것이다.',after:'두 번째 밤 기록: 방앗간은 산의 소리와 사람의 손이 겹치는 장소다. 마지막 보고서가 어느 한쪽만 택하면, 다른 한쪽은 완벽한 도피처가 된다.'}
  }[place];
  showP(data.title,data.body,[{text:'새벽까지 기록한다',e:data.e,response:data.response,run:()=>end1(data.after)}]);
}
function end1(nightSummary){ P.stage='end'; updateShade(); const body=`${nightSummary}\n\n새벽이 오자 마을은 아무 일도 없었다는 얼굴로 돌아온다. 우물가에는 물동이가 놓이고, 방앗간에는 쌀겨 냄새가 돌아오고, 촌장집 마루에는 볕이 든다.\n\n하지만 당신의 기록장에는 밤의 순서가 남아 있다. 첫 보고서는 사건을 정리하려 했고, 두 번째 밤은 그 정리가 얼마나 쉽게 사람을 지우는지 보여 주었다.\n\n도리는 아직 돌아오지 않았다. 그러나 이제 그는 “실종자 1명”이 아니라, 마을이 어떤 이름을 남기고 어떤 이름을 지웠는지 묻는 기준이 되었다.\n\n관아 임시처소에서 1장의 마지막 보고서를 작성하자. 그 보고서가 끝나면, 물소리 골짜기로 가야 한다.`; showP('1장 새벽 정리',body,[{text:'관아에서 1장 마지막 보고서를 작성한다',run:openFinalCh1Report}]); }
function openFinalCh1Report(){ P.done=true; closeDialog(); updateShade(); toast('1장 확장 종료. 원본 2장으로 이어집니다.'); try{ window.openReport && window.openReport(1); }catch{} }
function finishBridge(){ openFinalCh1Report(); }

function maybeStartCh2(){ if(!P.done||Q.active||Q.done||reportOpen()||P.dialog||Q.dialog||originalDialogOpen())return; const t=allText(); if(t.includes('2장')||t.includes('물소리 골짜기')){ Q.active=true; Q.stage='intro'; Q.day=1; Q.count=0; Q.max=4; showFor(Q,'2장: 물소리 골짜기','관아에 1장 보고서가 올라가자, 마을 북쪽 길이 열린다.\n\n2장은 낮과 밤을 두 번 건넌다. 첫날은 길의 이상을 확인하고, 둘째 날은 그 길을 누가 이용했는지 기록한다.',[{text:'2장 1일차 낮 조사를 시작한다',run:()=>{Q.stage='day1';closeDialog();}}]); } }
function handleQ(place){ if(!Q.active||Q.done)return false; if(['toNorth','toVillage','toPass'].includes(place))return false; if(Q.stage==='intro'){Q.stage='day1';return true;} if(Q.stage==='day1')return ch2Day1(place); if(Q.stage==='night1')return ch2Night1(place); if(Q.stage==='day2')return ch2Day2(place); if(Q.stage==='night2')return ch2Night2(place); if(Q.stage==='end')return place==='office'?openFinalCh2Report():(toast('관아 임시처소에서 2장 보고서를 정리하자.'),true); return false; }
function ch2Day1(place){ const data={valley:['물소리 골짜기','골짜기에는 흐르는 물이 없다. 그런데 귀를 낮추면 돌 밑에서 물이 흐른다. 발자국 몇 개가 같은 자리를 빙빙 돈다.',[opt('소리가 돌아오는 지점을 표시한다',{b:[['path',1],['unknown',1]],c:['되돌아오는 물소리']},'표시한 돌은 세 번 확인해도 제자리가 아니다.'),opt('발자국의 순서를 본다',{b:[['human',1]],c:['반복된 발자국']},'가장 작은 발자국 위에 더 큰 발자국이 겹쳐 있다.')]],lumber:['벌목터','벌목터의 나무들은 베인 것이 아니라 멈춘 것처럼 서 있다.',[opt('사량의 덫을 확인한다',{b:[['human',1]],c:['사량의 빈 덫']},'덫은 짐승을 잡기 위한 모양이지만, 끈 높이가 아이 허리쯤에 걸려 있다.'),opt('벌목 중단 이유를 묻는다',{b:[['conceal',1]],n:['벌목터 사람들은 같은 날 일을 멈췄다']},'사량은 “나무가 울어서”라고 말한다.')]],shrine:['무너진 산제단','산제단은 무너져 있지만, 무너진 순서가 이상하다. 누군가 폐허를 고치려다 중간에 그만둔 흔적이다.',[opt('제단의 홈을 따라 본다',{b:[['ritual',1]],c:['산제단의 역방향 홈']},'홈은 산 위쪽으로 이어지지 않는다. 마을 쪽으로 돌아 나온다.'),opt('젖은 쌀알을 챙긴다',{b:[['ritual',1],['conceal',1]],c:['젖은 제물 쌀']},'공식적으로 중단된 산제는 실제로는 완전히 끝나지 않았다.')]],well:['2장 우물가','우물가의 물소리와 골짜기의 물소리가 같은 박자로 겹친다.',[opt('월선에게 같은 소리를 들었는지 묻는다',{b:[['human',1]],n:['월선은 밤마다 같은 물소리를 들었다']},'월선은 “도리가 사라진 뒤로 물이 말을 배웠다”고 말한다.'),opt('아이들의 노래를 다시 묻는다',{b:[['ritual',1]],c:['되풀이되는 노래 끝음']},'아이들은 앞 구절은 잊었다고 하지만 끝음만은 정확히 맞춘다.')]],shaman:['2장 무당집','막례는 북쪽을 보지 않는다. 보지 않는 쪽을 너무 잘 아는 사람의 태도다.',[opt('검은등의 자리를 묻는다',{b:[['ritual',1]],c:['검은등의 자리']},'“자리는 산에 있지 않아. 사람이 비워 둔 곳에 생겨.”'),opt('산제 복원 여부를 묻는다',{b:[['ritual',1],['conceal',1]],n:['산제는 중단된 것이 아니라 숨겨졌다']},'막례는 복원이 아니라 봉합이라고 고쳐 말한다.')]],mill:['2장 방앗간','방앗간의 물레 소리가 골짜기 쪽과 엇박으로 돈다.',[opt('물레 축과 골짜기 돌을 대조한다',{b:[['unknown',1]],c:['엇박의 물소리']},'두 소리는 서로를 흉내 낸다.'),opt('큰 발자국의 진흙을 묻는다',{b:[['human',1]],c:['북쪽 진흙 발자국']},'방앗간의 진흙은 북쪽 벌목터 흙과 색이 같다.')]]}[place]; if(!data)return false; sceneQ(data[0],data[1],data[2],place); return true; }
function startCh2Night1(){ Q.stage='night1'; Q.day=1; Q.count=0; Q.max=1; updateShade(); showFor(Q,'2장 1일차 밤','첫날 낮에 표시한 물소리는 해가 지자 마을 안쪽으로 번진다. 우물, 무당집, 방앗간, 골짜기 중 한 곳을 확인하자.',[{text:'밤 조사를 시작한다',run:closeDialog}]); }
function ch2Night1(place){ const data={well:['1일차 밤: 우물','우물은 골짜기보다 먼저 어두워진다. 물 위에는 북쪽 길의 나뭇가지 그림자가 비친다.',{b:[['path',1],['ritual',1]],c:['마을로 번진 물소리']}],shaman:['1일차 밤: 무당집','막례의 금줄 끝이 젖어 있다. 비가 오지 않았는데 짚에서는 물비린내가 난다.',{b:[['ritual',1]],c:['젖은 금줄']}],mill:['1일차 밤: 방앗간','물레가 돌지 않는데도 방앗간 바닥에는 둥근 물자국이 생긴다.',{b:[['human',1],['unknown',1]],c:['둥근 물자국']}],valley:['1일차 밤: 골짜기','밤의 골짜기는 같은 돌, 같은 나무, 같은 발자국을 세 번 보여준다.',{b:[['path',1]],c:['세 번 반복된 길']}]}[place]; if(!data)return toast('첫 번째 밤에는 우물, 무당집, 방앗간, 골짜기 중 한 곳을 보자.'),true; showFor(Q,data[0],data[1],[{text:'밤의 침범을 기록한다',e:data[2],response:'첫 번째 밤 기록이 끝났다. 북쪽의 이상은 더 이상 북쪽에만 머물지 않는다.',run:beginCh2Day2}]); return true; }
function beginCh2Day2(){ Q.stage='day2'; Q.day=2; Q.count=0; Q.max=4; updateShade(); showFor(Q,'2장 2일차 낮','아침이 되자 길은 다시 평범한 산길처럼 보인다. 하지만 전날 밤의 기록 때문에 볼 수 있는 것이 달라졌다.',[{text:'2일차 낮 조사를 시작한다',run:closeDialog}]); }
function ch2Day2(place){ const data={forest:['금지된 숲 입구','금지된 숲 입구에는 금줄이 없다. 하지만 흙 위에는 최근 발자국이 있다.',[opt('발자국 방향을 본다',{b:[['human',1]],c:['숲 입구의 최근 발자국']},'발자국은 숲으로 들어간 것이 아니라, 숲에서 마을로 나온 쪽이 더 깊다.'),opt('금줄이 없는 이유를 생각한다',{b:[['ritual',1]],n:['금지된 숲에는 금줄이 없다']},'이곳은 이미 모두가 막혀 있다고 믿는 곳이다.')]],shrine:['2일차 산제단','어제 본 젖은 쌀알은 사라졌다. 대신 같은 자리에 마른 쌀겨가 둥글게 모여 있다.',[opt('제단 배열을 다시 본다',{b:[['ritual',1]],c:['되돌아오는 제단 배열']},'제단은 무너진 것이 아니라, 무너진 척 놓인 것처럼 보인다.'),opt('최근 제물 흔적을 찾는다',{b:[['conceal',1]],c:['숨겨진 제물 흔적']},'누군가는 산제를 중단한 적이 없다.')]],lumber:['2일차 벌목터','벌목터의 덫은 치워져 있다. 하지만 덫이 있던 자리에는 아이 키 높이의 줄 자국이 남아 있다.',[opt('줄 자국을 잰다',{b:[['human',1]],c:['아이 키 높이의 줄 자국']},'짐승을 노린 덫이라기에는 너무 낮다.'),opt('사량의 거짓말을 확인한다',{b:[['conceal',1]],n:['사량은 덫을 치웠다']},'사량은 덫을 치운 적 없다고 말한다.')]],chief:['2일차 촌장집','을파는 북쪽 출입 명단이 없다고 말한다. 그런데 장부 끈에는 방금 풀었다 묶은 자국이 있다.',[opt('출입 명단을 요구한다',{b:[['conceal',1]],n:['북쪽 출입 명단 은폐']},'을파는 “마을을 살리려면 가끔 이름을 지워야 한다”고 말한다.'),opt('마루와 도리의 관계를 묻는다',{b:[['human',1]],c:['마루와 도리의 연결']},'두 이름은 같은 손글씨로 고쳐 적혀 있다.')]],well:['2일차 우물','우물은 낮에도 밤의 소리를 조금 남기고 있다.',[opt('월선의 밤 증언을 받는다',{b:[['human',1]],n:['월선은 세 이름을 들었다']},'월선은 도리 말고도 두 이름이 더 들렸다고 말한다.'),opt('이름을 대조한다',{b:[['unknown',1]],c:['대조해야 할 이름들']},'이름들은 호적 순서가 아니라 사라진 순서대로 돌아온다.')]],mill:['2일차 방앗간','방앗간의 물레는 멈춰 있다. 하지만 그림자는 천천히 돈다.',[opt('그림자 방향을 기록한다',{b:[['unknown',1]],c:['반대로 도는 물레 그림자']},'그림자는 물레와 반대 방향으로 돈다.'),opt('벌목터 흙과 대조한다',{b:[['human',1]],c:['방앗간과 벌목터의 같은 흙']},'진흙 색이 같다.')]],shaman:['2일차 무당집','막례는 오래된 제문을 꺼내지 않는다. 대신 제문이 있던 빈 함을 보여준다.',[opt('빈 함을 기록한다',{b:[['ritual',1],['conceal',1]],c:['사라진 제문 함']},'중요한 것은 제문 내용이 아니라, 누가 가져갔는지다.'),opt('산제 절차를 묻는다',{b:[['ritual',1]],n:['산제는 돌아오는 것을 막는 절차']},'막례는 “부르는 제사가 아니라 돌려보내는 제사였다”고 말한다.')]]}[place]; if(!data)return false; sceneQ(data[0],data[1],data[2],place); return true; }
function ch2Report(){ const panel=byId('reportPanel'), title=byId('reportTitle'), intro=byId('reportIntro'), groupsBox=byId('reportGroups'), finishBtn=byId('finishReport'); Q.stage='report'; if(!panel||!title||!intro||!groupsBox||!finishBtn)return; const report={cause:null,measure:null,route:null}; title.textContent='2장 중간 보고서'; intro.textContent='물소리 골짜기와 마을 내부 진술을 대조해 보고합니다. 제출 후 2일차 밤으로 이어집니다.'; buildReport(groupsBox,report,[{key:'cause',title:'핵심 판단',items:['길 자체의 이상','사람의 유도','산제 절차의 파손','마을의 은폐','판단 보류']},{key:'measure',title:'즉시 조치',items:['북쪽 길 임시 봉쇄','벌목터 수색','산제단 보존','무당 협조 요청','아이 이름 대조']},{key:'route',title:'밤 조사 우선지',items:['물소리 골짜기','무너진 산제단','우물의 물소리','방앗간 물레']}]); finishBtn.onclick=()=>{ if(!report.cause||!report.measure||!report.route){toast('모든 항목을 하나씩 선택하세요.');return;} Q.report=report; add(Q.off,`2장 중간 보고: ${report.cause} / ${report.measure} / ${report.route}`); panel.style.display='none'; Q.stage='night2'; Q.day=2; Q.count=0; Q.max=1; updateShade(); respondFor(Q,'2장 중간 보고서가 접수되었다. 그날 밤, 보고서에 적은 판단이 먼저 젖는다.',()=>showFor(Q,'2장 2일차 밤','물소리 골짜기, 산제단, 우물, 방앗간 중 한 곳에서 보고서의 반응을 확인하자.',[{text:'마지막 밤 조사를 시작한다',run:closeDialog}])); }; panel.style.display='block'; }
function ch2Night2(place){ const data={valley:['2일차 밤: 물소리 골짜기','골짜기는 이번에는 길을 반복하지 않는다. 대신 당신이 낮에 적은 보고서 문장을 돌려준다.',{b:[['path',1],['unknown',1]],c:['보고서를 따라 읽는 골짜기']}],shrine:['2일차 밤: 무너진 산제단','무너진 돌들이 낮과 다른 위치에 놓여 있다. 제단은 조금 더 완성된 모양에 가까워졌다.',{b:[['ritual',1]],c:['밤에 움직인 제단 돌']}],well:['2일차 밤: 우물','우물물은 더 이상 이름 하나만 돌려주지 않는다. 도리, 마루, 아직 기록하지 않은 이름이 섞여 올라온다.',{b:[['human',1],['ritual',1]],c:['섞여 돌아온 이름들']}],mill:['2일차 밤: 방앗간','방앗간 물레와 골짜기 물소리가 처음으로 같은 박자에 맞는다.',{b:[['human',1],['unknown',1]],c:['물레 그림자의 팔']}]}[place]; if(!data)return toast('2일차 밤에는 물소리 골짜기, 산제단, 우물, 방앗간 중 한 곳을 보자.'),true; showFor(Q,data[0],data[1],[{text:'2장 밤의 결과를 기록한다',e:data[2],response:'2장 밤 기록이 끝났다. 이제 물소리 골짜기는 마을이 숨긴 이름들이 되돌아오는 통로가 되었다.',run:()=>{ Q.stage='end'; updateShade(); showFor(Q,'2장 종료','새벽이 오자 북쪽 길은 다시 평범한 산길처럼 보인다. 관아 임시처소에서 2장 보고서를 정리하자.',[{text:'관아에서 2장 보고서를 작성한다',run:openFinalCh2Report}]); }}]); return true; }
function openFinalCh2Report(){ Q.done=true; closeDialog(); updateShade(); toast('2장 확장 종료. 원본 2장 보고서로 이어집니다.'); try{ window.openReport && window.openReport(2); }catch{} }

window.addEventListener('keydown',event=>{ if(P.dialog||Q.dialog){ const active=document.activeElement; if(ACTION_KEYS.has(event.key)&&active&&active.closest&&active.closest('#options')){event.preventDefault();event.stopImmediatePropagation();active.click();return;} const n=parseInt(event.key,10); if(n>=1){ const button=byId('options')?.children[n-1]; if(button){event.preventDefault();event.stopImmediatePropagation();button.click();return;} } if(ACTION_KEYS.has(event.key)){event.preventDefault();event.stopImmediatePropagation();} return; } if(!ACTION_KEYS.has(event.key)||event.repeat||reportOpen()||originalDialogOpen())return; const place=currentLoc(); if(!place)return; if(inCh2()){ const handled=handleQ(place); if(handled){event.preventDefault();event.stopImmediatePropagation();} return; } if(inCh1()){event.preventDefault();event.stopImmediatePropagation();handleP(place);} },true);
setInterval(()=>{ cleanupLegacyButtons(); side(); maybeStartCh2(); if(musicOn)playTrack(isNight()?'night':'day'); },900);
})();
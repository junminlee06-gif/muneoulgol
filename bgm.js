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
css.textContent = '#muneoulgolMusic{position:fixed;right:18px;bottom:18px;z-index:99999;background:rgba(31,25,20,.94);color:#ded4c1;border:1px solid #6e5a40;border-radius:10px;padding:9px 12px;font:14px system-ui,sans-serif}#ch1Shade{position:absolute;inset:0;background:rgba(0,0,0,.58);box-shadow:inset 0 0 130px rgba(0,0,0,.88);z-index:4;pointer-events:none;display:none}#ch1Mark{position:fixed;left:10px;bottom:10px;z-index:99999;color:#b7925d;background:rgba(20,15,10,.75);border:1px solid #4a3b2c;padding:3px 6px;font:11px system-ui}#muneoulgolPad,#muneoulgolAction,#muneoulgolUnlock{display:none!important}';
const music = document.createElement('button');
music.id = 'muneoulgolMusic';
music.textContent = '음악 켜기';
const mark = document.createElement('div');
mark.id = 'ch1Mark';
mark.textContent = 'ch1-expansion v2026-06-10c';

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

function cleanup(){ ['muneoulgolPad','muneoulgolAction','muneoulgolUnlock'].forEach(id=>document.getElementById(id)?.remove()); }
function txt(id){ return document.getElementById(id)?.innerText || ''; }
function isNight(){ return P.stage === 'night'; }
function updateShade(){ if (shade) shade.style.display = isNight() && P.active && !P.done ? 'block' : 'none'; }
async function play(k){ const target=k==='night'?night:day, other=k==='night'?day:night; if(current===target && !target.paused) return; other.pause(); other.currentTime=0; current=target; try{ await target.play(); }catch{ musicOn=false; } music.textContent=musicOn?(k==='night'?'밤 음악 재생 중':'낮 음악 재생 중'):'음악 켜기'; }
music.onclick=()=>{ musicOn=!musicOn; if(!musicOn){day.pause();night.pause();music.textContent='음악 켜기';} else play(isNight()?'night':'day'); };
setInterval(()=>{ cleanup(); updateShade(); if(musicOn) play(isNight()?'night':'day'); },800);

const LOC = {'촌장집':'chief','마을 우물':'well','무당집':'shaman','방앗간':'mill','관아 임시처소':'office'};
const ACTION = new Set(['Enter',' ','z','Z']);
const P = {active:false,done:false,dialog:false,stage:'d1',day:1,count:0,max:3,seen:{},off:[],note:[],clue:[],bias:{beast:0,human:0,ritual:0,conceal:0,unknown:0}};

function inCh1(){ const h=txt('hud')+txt('phaseText'); return !P.done && h.includes('무너울골') && !/[2345]장/.test(h) && (h.includes('1장') || P.active); }
function loc(){ const m=txt('hud').match(/상호작용:\s*([^\n]+)/); return m ? LOC[m[1].trim()] : null; }
function oldDialog(){ const d=document.getElementById('dialog'); return d && !P.dialog && (d.style.display==='block' || (d.style.display==='' && txt('speaker'))); }
function reportOpen(){ return document.getElementById('reportPanel')?.style.display === 'block'; }
function add(a,v){ if(v && !a.includes(v)) a.push(v); }
function fx(e={}){ (e.b||[]).forEach(([k,n])=>P.bias[k]+=n); (e.o||[]).forEach(v=>add(P.off,v)); (e.n||[]).forEach(v=>add(P.note,v)); (e.c||[]).forEach(v=>add(P.clue,v)); }
function esc(s){ return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function toast(m){ const t=document.getElementById('toast'); if(!t)return; t.textContent=m; t.style.display='block'; clearTimeout(toast.id); toast.id=setTimeout(()=>t.style.display='none',1500); }
function label(){ return {d1:'첫날 낮',report:'첫 보고',d2:'둘째 낮',dusk:'둘째 해질녘',night:'두 번째 밤',end:'새벽 정리'}[P.stage]||P.stage; }
function side(){ if(!P.active||P.done)return; const ph=document.getElementById('phaseText'),off=document.getElementById('official'),un=document.getElementById('unofficial'),cl=document.getElementById('cluePills'); if(ph)ph.textContent=`1장 확장 · ${P.day}일차 · ${label()} · 조사 ${P.count}/${P.max}`; if(off)off.innerHTML=P.off.map(v=>`<li>${esc(v)}</li>`).join('')||'<li class="small">아직 없음</li>'; if(un)un.innerHTML=P.note.map(v=>`<li>${esc(v)}</li>`).join('')||'<li class="small">아직 없음</li>'; if(cl)cl.innerHTML=P.clue.map(v=>`<span class="pill">단서: ${esc(v)}</span>`).join('')||'<span class="small">아직 없음</span>'; updateShade(); }
function close(){ const d=document.getElementById('dialog'); if(d)d.style.display='none'; P.dialog=false; side(); }
function show(sp, body, opts){ const d=document.getElementById('dialog'),s=document.getElementById('speaker'),tx=document.getElementById('dialogText'),box=document.getElementById('options'); if(!d||!s||!tx||!box)return; P.active=true; P.dialog=true; s.textContent=sp; tx.textContent=body; box.innerHTML=''; opts.forEach((op,i)=>{ const b=document.createElement('button'); b.textContent=`${i+1}. ${op.text}`; b.onclick=()=>{ fx(op.e); if(op.response){ respond(op.response,op.run); } else { if(!op.keep) close(); if(op.run) op.run(); } side(); }; box.appendChild(b); }); d.style.display='block'; side(); }
function respond(body,next){ show('기록 반응',body,[{text:'계속한다',run:next||close}]); }
function opt(text,e,response){ return {text,e,response}; }
function seen(place){ const k=P.stage+':'+place; if(P.seen[k]){toast('이미 조사한 곳이다.');return false;} P.seen[k]=true; P.count++; return true; }
function after(){ if(P.count>=P.max){ if(P.stage==='d1') report1(); else if(P.stage==='d2') dusk2(); } else toast(`조사 ${P.count}/${P.max} 완료. 다른 장소로 이동하자.`); }
function scene(title,body,opts,place){ show(title,body,opts.map(o=>({...o,run:()=>{ if(seen(place)) after(); }}))); }

function handle(place){ P.active=true; if(P.stage==='d1')return day1(place); if(P.stage==='d2')return day2(place); if(P.stage==='night')return night2(place); if(P.stage==='end')return place==='office'?finishBridge():toast('관아 임시처소에서 마무리하자.'); }
function day1(place){ if(!['chief','well','shaman','mill'].includes(place))return toast('촌장집, 우물, 무당집, 방앗간을 조사하자.'); const D={chief:['을파의 장부','산제 비용 칸이 비어 있다.',[opt('범의 흔적으로 본다.',{b:[['beast',1]],o:['촌장 진술: 범 가능성']},'을파는 고개를 끄덕인다. 마을은 잠시 조용해진다.'),opt('산제 중단과 연결한다.',{b:[['ritual',1]],c:['산제 비용 공백']},'장부의 빈칸이 유난히 검게 보인다.'),opt('기록 정리를 의심한다.',{b:[['conceal',1]],n:['장부가 지나치게 정리되어 있다']},'을파의 손이 장부 모서리를 누른다.')]],well:['우물가','우물은 고요하지만 산 쪽에서 물소리가 난다.',[opt('도리의 이름을 확인한다.',{b:[['human',1]],o:['이름 확인: 도리'],c:['도리의 이름']},'월선이 처음으로 당신을 똑바로 본다.'),opt('산제 노래를 묻는다.',{b:[['ritual',1]],c:['산제 노래']},'아이의 노래가 한 박자 늦게 끊긴다.'),opt('주민 침묵을 본다.',{b:[['conceal',1]],n:['사람들이 서로 눈치를 본다']},'우물가의 말소리가 갑자기 얇아진다.')]],shaman:['막례의 말','막례는 산은 기록을 못 한다고 말한다.',[opt('산제 의미를 묻는다.',{b:[['ritual',1]],c:['검은등 별칭']},'막례가 방울을 뒤집어 놓는다.'),opt('사람의 개입을 묻는다.',{b:[['human',1]],n:['사람이 산 이름을 빌릴 때가 있다']},'막례는 “사람이 더 무서울 때가 있다”고 말한다.'),opt('공식 감시 대상으로 본다.',{b:[['conceal',1]],o:['무당 감시 필요성']},'막례의 시선이 차갑게 닫힌다.')]],mill:['방앗간','물레 축은 젖어 있고 돌확 아래에는 풀 조각이 있다.',[opt('풀 조각을 챙긴다.',{b:[['human',1]],c:['짚신 풀 조각']},'짚신의 풀과 결이 같다.'),opt('물기를 확인한다.',{b:[['ritual',1]],c:['젖은 물레 축']},'물레는 멈춰 있는데 물 냄새가 난다.'),opt('검은 털을 줍는다.',{b:[['beast',1]],c:['검은 털']},'털 끝이 물에 젖은 듯 무겁다.')]]}[place]; scene(D[0],D[1],D[2],place); }
function report1(){ P.stage='report'; show('첫 보고서','아래 항목을 고르면 보고서가 제출되고 2일차 조사로 이어진다.',[{text:'보고서 제출: 범의 흔적',e:{b:[['beast',2]],o:['1장 첫 보고: 범의 흔적']},response:'보고서가 접수되었다. 마을은 범이라는 말에 잠시 안심한다.',run:()=>beginDay2('beast')},{text:'보고서 제출: 사람의 흔적',e:{b:[['human',2]],o:['1장 첫 보고: 사람의 흔적']},response:'보고서가 접수되었다. 사람을 의심하는 문장이 마을을 조용하게 만든다.',run:()=>beginDay2('human')},{text:'보고서 제출: 산제 흔적',e:{b:[['ritual',2]],o:['1장 첫 보고: 산제 흔적']},response:'보고서가 접수되었다. 막례가 장승 뒤에서 기다린다.',run:()=>beginDay2('ritual')},{text:'보고서 제출: 마을 은폐',e:{b:[['conceal',2]],o:['1장 첫 보고: 마을 은폐']},response:'보고서가 접수되었다. 을파의 얼굴에서 웃음이 사라진다.',run:()=>beginDay2('conceal')},{text:'보고서 제출: 판단 보류',e:{b:[['unknown',2]],o:['1장 첫 보고: 판단 보류']},response:'보고서가 접수되었다. 관아 전령은 더 분명한 문장을 요구한다.',run:()=>beginDay2('unknown')}]); }
function beginDay2(k){ P.day=2; P.stage='d2'; P.count=0; P.max=2; const m={beast:'범이라는 말이 마을을 안심시켰다.',human:'월선이 당신을 기다리고 있다.',ritual:'막례가 장승 뒤에서 기다린다.',conceal:'마을 전체가 용의자가 되었다.',unknown:'아무것도 달라지지 않은 것이 불길하다.'}[k]||'둘째 날이 밝았다.'; show('2일차 아침',m,[{text:'둘째 날 조사를 시작한다',run:close}]); }
function day2(place){ if(!['chief','well','shaman','mill'].includes(place))return toast('마을 핵심 장소를 다시 확인하자.'); const D={chief:['2일차 촌장집','을파는 장부를 닫지 않는다.',[opt('은폐 정황을 묻는다.',{b:[['conceal',1]],n:['을파는 헛간 이야기에 표정을 닫았다']},'을파는 “말을 조심하라”고 한다.'),opt('마루 이름을 확인한다.',{b:[['human',1]],c:['마루 이름']},'마루라는 이름이 장부 한쪽에 남아 있다.')]],well:['2일차 우물가','월선은 도리의 이름을 반복한다.',[opt('도리 이름을 기록한다.',{b:[['human',1]],o:['도리 이름 공식 기록'],c:['도리의 이름']},'월선의 숨이 조금 풀린다.'),opt('노래를 더 묻는다.',{b:[['ritual',1]],c:['노래 조각']},'노래의 다음 구절은 물소리에 묻힌다.')]],shaman:['2일차 막례','막례는 젖은 돌을 본다.',[opt('산제 관련성을 묻는다.',{b:[['ritual',1]],n:['막례는 말을 아꼈다']},'막례는 대답 대신 금줄을 만진다.'),opt('비공식 기록에 남긴다.',{b:[['unknown',1]],n:['산의 등은 검고 물의 입은 닫히지 않는다']},'공식 문서 밖의 문장이 하나 늘어난다.')]],mill:['2일차 방앗간','물레는 멈췄지만 축축하다.',[opt('검은 털을 보관한다.',{b:[['beast',1]],c:['젖은 검은 털']},'털은 짐승의 것 같지만 물 냄새가 진하다.'),opt('돌확을 조사한다.',{b:[['ritual',1]],c:['돌확 절차']},'돌확의 홈이 산 쪽을 향한다.')]]}[place]; scene(D[0],D[1],D[2],place); }
function dusk2(){ P.stage='dusk'; show('2일차 해질녘','누구의 말을 믿을지 정해야 한다.',[{text:'을파의 설명을 따른다',e:{b:[['beast',1]]},response:'마을은 잠시 안정된다. 대신 월선의 눈이 멀어진다.',run:startNight},{text:'월선의 증언을 믿는다',e:{b:[['human',1]]},response:'월선은 도리의 이름을 다시 붙잡는다.',run:startNight},{text:'막례의 경고를 듣는다',e:{b:[['ritual',1]]},response:'막례가 금줄을 한 겹 더 묶는다.',run:startNight},{text:'누구도 완전히 믿지 않는다',e:{b:[['unknown',1]]},response:'모든 증언이 서로 다른 방향을 가리킨다.',run:startNight}]); }
function startNight(){ P.stage='night'; P.count=0; P.max=1; updateShade(); toast('두 번째 밤이다. 화면이 어두워졌다.'); }
function night2(place){ if(!['chief','well','shaman','mill'].includes(place))return toast('밤에는 핵심 장소 한 곳만 보자.'); const D={chief:['헛간 쪽 밤','젖은 짚 냄새가 난다.',{b:[['conceal',1]],c:['젖은 짚단']}],well:['우물의 밤','도리 이름이 되돌아온다.',{b:[['ritual',1]],c:['이름 반응']}],shaman:['금줄의 밤','금줄이 한 겹 더 매인다.',{b:[['ritual',1]],c:['제문 조각']}],mill:['돌확의 밤','물소리가 계속 난다.',{b:[['unknown',1]],n:['물소리 속에 여러 이름이 섞였다']}]}[place]; show(D[0],D[1],[{text:'새벽까지 기록한다',e:D[2],response:'밤의 기록이 끝났다. 새벽이 오자 어둠이 조금 물러난다.',run:end1}]); }
function end1(){ P.stage='end'; updateShade(); show('1장 종료','도리는 돌아오지 않았다. 이제 물소리 골짜기로 향한다.',[{text:'원본 보고서 화면을 연다',run:finish}]); }
function finish(){ P.done=true; close(); updateShade(); toast('1장 확장 종료. 원본 2장으로 이어집니다.'); try{ window.openReport && window.openReport(1); }catch{} }

window.addEventListener('keydown',e=>{ if(P.dialog){ const active=document.activeElement; if(ACTION.has(e.key)&&active&&active.closest&&active.closest('#options')){e.preventDefault();e.stopImmediatePropagation();active.click();return;} const n=parseInt(e.key,10); if(n>=1){ const b=document.getElementById('options')?.children[n-1]; if(b){e.preventDefault();e.stopImmediatePropagation();b.click();return;} } if(ACTION.has(e.key)){e.preventDefault();e.stopImmediatePropagation();} return; } if(!ACTION.has(e.key)||e.repeat||reportOpen()||oldDialog()||!inCh1())return; const l=loc(); if(!l)return; e.preventDefault(); e.stopImmediatePropagation(); handle(l); },true);
setInterval(side,900);
})();
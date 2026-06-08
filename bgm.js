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
  let interactPatched = false;
  let showScenePatched = false;

  const panel = document.createElement('button');
  panel.textContent = '음악 켜기';
  panel.setAttribute('aria-label', '배경음악 켜기');
  Object.assign(panel.style, {position:'fixed',right:'14px',bottom:'14px',zIndex:'99999',background:'rgba(31,25,20,.94)',color:'#ded4c1',border:'1px solid #6e5a40',borderRadius:'8px',padding:'9px 12px',font:'14px system-ui, -apple-system, Segoe UI, sans-serif',boxShadow:'0 6px 20px rgba(0,0,0,.45)'});

  const ch4Panel = document.createElement('button');
  ch4Panel.textContent = '4장 진행';
  Object.assign(ch4Panel.style, {display:'none',position:'fixed',right:'14px',bottom:'58px',zIndex:'99999',background:'rgba(79,55,34,.96)',color:'#fff0d0',border:'1px solid #c39b62',borderRadius:'8px',padding:'9px 12px',font:'14px system-ui, -apple-system, Segoe UI, sans-serif',boxShadow:'0 6px 20px rgba(0,0,0,.45)'});

  const ch4Guide = document.createElement('div');
  ch4Guide.id = 'muneoulgolCh4Guide';
  Object.assign(ch4Guide.style, {display:'none',position:'fixed',left:'14px',bottom:'14px',zIndex:'99998',width:'260px',maxWidth:'calc(100vw - 28px)',background:'rgba(31,25,20,.94)',color:'#ded4c1',border:'1px solid #6e5a40',borderRadius:'8px',padding:'10px 12px',font:'12px/1.45 system-ui, -apple-system, Segoe UI, sans-serif',boxShadow:'0 6px 20px rgba(0,0,0,.45)'});

  const fixStyle = document.createElement('style');
  fixStyle.textContent = `
    .gamebox{overflow:hidden!important;}
    .dialog{position:fixed!important;transform:none!important;overflow:hidden!important;z-index:99990!important;padding:12px!important;box-sizing:border-box!important;}
    .dialog .speaker{margin-bottom:4px!important;}
    .dialog .text{overflow-y:auto!important;padding-right:4px!important;margin-bottom:8px!important;font-size:14px!important;line-height:1.42!important;}
    .dialog .options{overflow-y:auto!important;overscroll-behavior:contain!important;gap:5px!important;}
    .dialog button{scroll-margin:0!important;padding:6px 9px!important;font-size:13px!important;line-height:1.32!important;}
    @media(max-width:980px){.dialog{padding:10px!important}.dialog .text{font-size:13px!important}.dialog button{padding:6px 8px!important;font-size:13px!important}#muneoulgolCh4Guide{left:10px!important;right:10px!important;bottom:64px!important;width:auto!important}}
  `;

  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(fixStyle);
    document.body.appendChild(panel);
    document.body.appendChild(ch4Panel);
    document.body.appendChild(ch4Guide);
    updateMusicLabel();
    anchorDialog();
    patchGameFunctions();
  });

  function readTimeOfDay(){const hud=document.getElementById('hud'), phase=document.getElementById('phaseText');const source=`${hud?hud.innerText:''}\n${phase?phase.innerText:''}`;if(/·\s*밤\b|\/\s*밤\b|\b밤\s*\//.test(source))return'night';if(/·\s*낮\b|\/\s*낮\b|\b낮\s*\//.test(source))return'day';if(/·\s*새벽\b|\/\s*새벽\b|\b새벽\s*\//.test(source))return'day';return lastKind;}
  function updateMusicLabel(){if(!enabled){panel.textContent='음악 켜기';return}const kind=readTimeOfDay();panel.textContent=kind==='night'?'밤 음악 재생 중':'낮 음악 재생 중'}
  async function playTrack(kind){lastKind=kind;const target=kind==='night'?night:day,other=kind==='night'?day:night;if(current===target&&!target.paused){updateMusicLabel();return}other.pause();other.currentTime=0;current=target;try{await target.play();updateMusicLabel()}catch(e){panel.textContent='음악 켜기'}}
  function updateMusic(){if(enabled)playTrack(readTimeOfDay())}
  panel.addEventListener('click',()=>{enabled=!enabled;if(!enabled){day.pause();night.pause();panel.textContent='음악 켜기';return}updateMusic()});
  ['click','keydown','touchstart'].forEach(evt=>window.addEventListener(evt,()=>{if(enabled)updateMusic()},{passive:true}));

  function anchorDialog(){
    const dialog=document.getElementById('dialog'),gamebox=document.querySelector('.gamebox');
    if(!dialog||!gamebox||dialog.style.display==='none')return;
    const rect=gamebox.getBoundingClientRect(), margin=rect.width<520?10:16, pad=8;
    const maxH=Math.min(342,Math.max(220,rect.height-margin*2),Math.max(220,window.innerHeight-pad*2));
    const width=Math.max(260,rect.width-margin*2);
    dialog.style.position='fixed';dialog.style.left=Math.round(Math.max(pad,rect.left+margin))+'px';dialog.style.right='auto';dialog.style.width=Math.round(Math.min(width,window.innerWidth-pad*2))+'px';dialog.style.maxHeight=Math.round(maxH)+'px';dialog.style.overflow='hidden';dialog.style.transform='none';dialog.style.padding=rect.width<520?'10px':'12px';
    const text=dialog.querySelector('.text'), options=dialog.querySelector('.options');
    const optionCount=options?options.children.length:0, optionH=optionCount>=4?188:optionCount===3?150:120, textH=optionCount>=4?96:112;
    if(text){text.style.maxHeight=Math.round(Math.min(textH,maxH*.34))+'px';text.style.overflowY='auto';text.style.fontSize=rect.width<520?'13px':'14px';text.style.lineHeight='1.42';text.style.marginBottom='8px'}
    if(options){options.style.maxHeight=Math.round(Math.min(optionH,maxH*.56))+'px';options.style.overflowY='auto';options.style.gap='5px'}
    [...dialog.querySelectorAll('button')].forEach(b=>{b.style.padding=rect.width<520?'6px 8px':'6px 9px';b.style.fontSize='13px';b.style.lineHeight='1.32'});
    const h=Math.min(dialog.offsetHeight||maxH,maxH), topWithinGame=rect.bottom-h-margin, top=Math.max(pad,Math.min(topWithinGame,window.innerHeight-h-pad));
    dialog.style.top=Math.round(top)+'px';dialog.style.bottom='auto';
    if(document.activeElement&&dialog.contains(document.activeElement)){try{document.activeElement.blur()}catch(e){}}
  }

  function callGlobal(name,...args){const fn=window[name];if(typeof fn==='function'){try{fn(...args);return true}catch(e){console.warn(name,e)}}try{const fn2=Function('return typeof '+name+' === "function" ? '+name+' : null')();if(typeof fn2==='function'){fn2(...args);return true}}catch(e){}return false}
  function gameState(){try{return Function('return typeof state !== "undefined" ? state : null')()}catch(e){return null}}
  function gameLoc(){try{return Function('return typeof nearbyLocation === "function" ? nearbyLocation() : null')()}catch(e){return null}}
  function closeGameDialog(){const dialog=document.getElementById('dialog');if(dialog)dialog.style.display='none';try{Function('if(typeof state!=="undefined") state.dialogOpen=false; if(typeof keysDown!=="undefined") keysDown.clear();')()}catch(e){}callGlobal('refreshSide')}
  function gameToast(msg){if(!callGlobal('toast',msg)){ch4Guide.style.display='block';ch4Guide.innerHTML='<b style="color:#d3ad70">안내</b><br>'+msg}}

  const ch4EventByLoc={rockBones:'bones',rockWater:'water',rockFootprint:'footprint',rockTooth:'tooth'};
  const ch4EventByScene={ch4Bones:'bones',ch4Water:'water',ch4Footprint:'footprint',ch4Tooth:'tooth'};
  const ch4SpeakerToKey=[['바위 아래 뼈더미','bones'],['말라붙은 물길','water'],['겹친 발자국','footprint'],['이빨 사이의 이름','tooth']];
  const ch4Places=[{key:'bones',label:'바위 아래 뼈더미',pos:'왼쪽 아래'},{key:'water',label:'말라붙은 물길',pos:'오른쪽 중간'},{key:'footprint',label:'겹친 발자국',pos:'왼쪽 위'},{key:'tooth',label:'이빨 사이의 이름',pos:'오른쪽 위'}];
  function isCh4Visited(key){const st=gameState();return!!(st&&st.chapterVisited&&st.chapterVisited['ch4_'+key])}

  function patchGameFunctions(){
    if(!showScenePatched){try{const originalShowScene=Function('return typeof showScene === "function" ? showScene : null')();if(originalShowScene){Function('fn',`showScene=function(id){var st=typeof state!=="undefined"?state:null;var map={ch4Bones:"bones",ch4Water:"water",ch4Footprint:"footprint",ch4Tooth:"tooth"};var key=map[id];if(st&&st.chapter===4&&st.phase==="ch4_day"&&key&&st.chapterVisited&&st.chapterVisited["ch4_"+key]){if(typeof toast==="function")toast("이미 확인한 흔적입니다. 다른 흔적을 찾으세요.");return;}return fn.apply(this,arguments)};window.showScene=showScene;`)(originalShowScene);showScenePatched=true}}catch(e){}}
    if(!interactPatched){try{const originalInteract=Function('return typeof interact === "function" ? interact : null')();if(originalInteract){Function('fn',`interact=function(){var st=typeof state!=="undefined"?state:null;var loc=typeof nearbyLocation==="function"?nearbyLocation():null;var map={rockBones:"bones",rockWater:"water",rockFootprint:"footprint",rockTooth:"tooth"};var key=loc&&map[loc.id];if(st&&st.chapter===4&&st.phase==="ch4_day"&&key&&st.chapterVisited&&st.chapterVisited["ch4_"+key]){if(typeof toast==="function")toast("이미 확인한 흔적입니다. 남은 흔적을 찾으세요.");return;}return fn.apply(this,arguments)};window.interact=interact;`)(originalInteract);interactPatched=true}}catch(e){}}
  }

  function sanitizeDuplicateCh4Dialog(){
    const st=gameState(); if(!st||st.chapter!==4||st.phase!=='ch4_day')return;
    const dialog=document.getElementById('dialog'),speaker=document.getElementById('speaker'),text=document.getElementById('dialogText'),options=document.getElementById('options');
    if(!dialog||!speaker||!text||!options||dialog.style.display==='none')return;
    const sp=speaker.innerText||'', found=ch4SpeakerToKey.find(([label])=>sp.includes(label)); if(!found)return;
    const [label,key]=found; if(!isCh4Visited(key))return;
    speaker.textContent='이미 확인한 흔적';
    text.textContent=label+'은 이미 조사했다. 같은 선택지를 다시 누르면 진행이 멈춘 것처럼 보일 수 있으므로, 남은 흔적을 찾아 이동하자.';
    options.innerHTML=''; const b=document.createElement('button'); b.textContent='다른 흔적을 찾는다'; b.onclick=closeGameDialog; options.appendChild(b);
  }

  function patchChapter4EndButton(){const dialog=document.getElementById('dialog');if(!dialog||dialog.style.display==='none')return;const speaker=(document.getElementById('speaker')||{}).innerText||'',text=(document.getElementById('dialogText')||{}).innerText||'',options=document.getElementById('options');if(!options)return;const isCh4End=speaker.includes('4장 종료')||text.includes('다음 장은 마지막 산제다');if(!isCh4End)return;const first=options.querySelector('button');if(first&&first.textContent!=='5장으로 진행한다'){first.textContent='5장으로 진행한다';first.onclick=()=>{if(!callGlobal('startChapter5')){const msg='5장 함수가 아직 준비되지 않았습니다. 새로고침 후 다시 눌러 주세요.';if(typeof window.toast==='function')window.toast(msg);else alert(msg)}}}}

  function updateChapter4AssistButton(){const hud=document.getElementById('hud'),dialog=document.getElementById('dialog'),report=document.getElementById('reportPanel'),h=hud?hud.innerText:'',dialogOpen=dialog&&dialog.style.display!=='none',reportOpen=report&&report.style.display!=='none';ch4Panel.style.display='none';if(!h.includes('4장')||dialogOpen||reportOpen)return;if(h.includes('4장 흔적 조사: 4/4')){ch4Panel.textContent='검은등 대면';ch4Panel.style.display='block';ch4Panel.onclick=()=>callGlobal('showScene','ch4FirstMeet');return}if(h.includes('4장 밤 행동: 완료')){ch4Panel.textContent='새벽으로 진행';ch4Panel.style.display='block';ch4Panel.onclick=()=>callGlobal('showScene','ch4Dawn');return}if(h.includes('4장 새벽')){ch4Panel.textContent='4장 보고서';ch4Panel.style.display='block';ch4Panel.onclick=()=>callGlobal('openReport',4)}}

  function updateCh4Guide(){const st=gameState(),dialog=document.getElementById('dialog'),report=document.getElementById('reportPanel'),dialogOpen=dialog&&dialog.style.display!=='none',reportOpen=report&&report.style.display!=='none';if(!st||st.chapter!==4||reportOpen){ch4Guide.style.display='none';return}const phase=st.phase||'';ch4Guide.style.display=dialogOpen?'none':'block';if(phase==='ch4_day'){const rows=ch4Places.map(p=>{const done=isCh4Visited(p.key);return`<div style="display:flex;justify-content:space-between;gap:8px;opacity:${done?.52:1}"><span>${done?'✓':'•'} ${p.label}</span><span style="color:#b7925d">${p.pos}</span></div>`}).join('');const doneCount=ch4Places.filter(p=>isCh4Visited(p.key)).length;const footer=doneCount>=4?'네 흔적을 모두 봤습니다. 중앙의 검은 바위 앞으로 가세요.':'같은 흔적은 다시 조사하지 않습니다. 남은 위치만 찾으면 됩니다.';ch4Guide.innerHTML=`<b style="color:#d3ad70">4장 흔적 안내 ${doneCount}/4</b><div style="margin-top:6px">${rows}</div><div style="margin-top:7px;color:#c8b89a">${footer}</div>`;return}if(phase==='ch4_night'){ch4Guide.innerHTML='<b style="color:#d3ad70">4장 밤 안내</b><div style="margin-top:6px">• 검은 바위: 중앙 위<br>• 도리의 이름: 오른쪽 위<br>• 사량의 바위턱: 왼쪽 중간</div><div style="margin-top:7px;color:#c8b89a">밤에는 하나만 고르면 됩니다.</div>';return}if(phase==='ch4_dawn'){ch4Guide.innerHTML='<b style="color:#d3ad70">4장 새벽 안내</b><div style="margin-top:6px">검은 바위 앞에서 기록을 정리하세요.</div>';return}ch4Guide.style.display='none'}

  setInterval(()=>{patchGameFunctions();sanitizeDuplicateCh4Dialog();updateMusic();updateMusicLabel();anchorDialog();patchChapter4EndButton();updateChapter4AssistButton();updateCh4Guide()},250);
})();

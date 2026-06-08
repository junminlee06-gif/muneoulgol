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

  const musicBtn = document.createElement('button');
  musicBtn.textContent = '음악 켜기';
  Object.assign(musicBtn.style, btnStyle('14px'));

  const fixBtn = document.createElement('button');
  fixBtn.textContent = '겹친 창 닫기';
  Object.assign(fixBtn.style, btnStyle('58px'), {display:'none', background:'rgba(79,55,34,.96)', color:'#fff0d0', borderColor:'#c39b62'});

  const style = document.createElement('style');
  style.textContent = `
    .dialog{position:fixed!important;transform:none!important;overflow:hidden!important;z-index:99990!important;box-sizing:border-box!important;}
    .dialog .text{overflow-y:auto!important;font-size:14px!important;line-height:1.42!important;}
    .dialog .options{overflow-y:auto!important;gap:5px!important;}
    .dialog button{padding:6px 9px!important;font-size:13px!important;line-height:1.32!important;}
  `;

  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(style);
    document.body.appendChild(musicBtn);
    document.body.appendChild(fixBtn);
    tick();
  });

  function btnStyle(bottom){return {position:'fixed',right:'14px',bottom,zIndex:'99999',background:'rgba(31,25,20,.94)',color:'#ded4c1',border:'1px solid #6e5a40',borderRadius:'8px',padding:'9px 12px',font:'14px system-ui,-apple-system,Segoe UI,sans-serif',boxShadow:'0 6px 20px rgba(0,0,0,.45)'}}
  function el(id){return document.getElementById(id)}
  function txt(id){const x=el(id);return x?x.innerText:''}
  function hudText(){return txt('hud')+'\n'+txt('phaseText')}
  function kind(){const h=hudText();if(/·\s*밤\b|\/\s*밤\b|\b밤\s*\//.test(h))return'night';if(/·\s*낮\b|\/\s*낮\b|\b낮\s*\//.test(h))return'day';if(/·\s*새벽\b|\/\s*새벽\b|\b새벽\s*\//.test(h))return'day';return lastKind}
  async function play(k){lastKind=k;const target=k==='night'?night:day, other=k==='night'?day:night;if(current===target&&!target.paused)return label();other.pause();other.currentTime=0;current=target;try{await target.play()}catch(e){musicOn=false}label()}
  function label(){musicBtn.textContent=!musicOn?'음악 켜기':kind()==='night'?'밤 음악 재생 중':'낮 음악 재생 중'}
  musicBtn.onclick=()=>{musicOn=!musicOn;if(!musicOn){day.pause();night.pause();label();return}play(kind())};
  ['click','keydown','touchstart'].forEach(ev=>window.addEventListener(ev,()=>{if(musicOn)play(kind())},{passive:true}));

  function unlock(){try{Function("if(typeof state!=='undefined') state.dialogOpen=false; if(typeof keysDown!=='undefined') keysDown.clear();")()}catch(e){}}
  function hide(node){if(node)node.style.display='none'}
  function reportOpen(){const r=el('reportPanel');return r&&r.style.display!=='none'}
  function dialogOpen(){const d=el('dialog');return d&&d.style.display!=='none'}
  function cutsceneOpen(){const c=el('cutscene');return c&&c.style.display==='block'}
  function isCh5(){const h=hudText();return h.includes('5장')||h.includes('마지막 산제단')}
  function speaker(){return txt('speaker')}
  function reportTitle(){return txt('reportTitle')}
  function stale4Dialog(){return /4장|검은등|밤의 검은 바위|도리의 이름|사량의 바위턱/.test(speaker())}
  function stale4Report(){return reportTitle().includes('4장')}

  function forceCloseOverlaps(){
    const d=el('dialog'), r=el('reportPanel');
    if(cutsceneOpen()){
      hide(d); hide(r); hide(fixBtn); unlock();
      return;
    }
    if(isCh5()){
      if(stale4Dialog()) hide(d);
      if(stale4Report()) hide(r);
      hide(fixBtn); unlock();
      return;
    }
    if(reportOpen()&&dialogOpen()){
      hide(d); unlock();
    }
  }

  function anchorDialog(){
    const d=el('dialog'), game=document.querySelector('.gamebox');
    if(!d||!game||d.style.display==='none'||reportOpen()||cutsceneOpen())return;
    const r=game.getBoundingClientRect(), m=r.width<520?10:16, pad=8;
    const maxH=Math.min(342,Math.max(220,r.height-m*2),Math.max(220,window.innerHeight-pad*2));
    d.style.left=Math.round(Math.max(pad,r.left+m))+'px';
    d.style.right='auto';
    d.style.width=Math.round(Math.min(Math.max(260,r.width-m*2),window.innerWidth-pad*2))+'px';
    d.style.maxHeight=Math.round(maxH)+'px';
    const t=d.querySelector('.text'), o=d.querySelector('.options'), c=o?o.children.length:0;
    if(t)t.style.maxHeight=Math.round(Math.min(c>=4?96:112,maxH*.34))+'px';
    if(o)o.style.maxHeight=Math.round(Math.min(c>=4?188:c===3?150:120,maxH*.56))+'px';
    const h=Math.min(d.offsetHeight||maxH,maxH);
    d.style.top=Math.round(Math.max(pad,Math.min(r.bottom-h-m,window.innerHeight-h-pad)))+'px';
    d.style.bottom='auto';
  }

  function patch4End(){
    const o=el('options'); if(!o)return;
    const s=speaker(), body=txt('dialogText');
    if(!s.includes('4장 종료')&&!body.includes('다음 장은 마지막 산제다'))return;
    const b=o.querySelector('button'); if(!b||b.dataset.toCh5)return;
    b.dataset.toCh5='1'; b.textContent='5장으로 진행한다';
    b.onclick=()=>{hide(el('dialog'));hide(el('reportPanel'));unlock();try{Function("if(typeof startChapter5==='function') startChapter5();")()}catch(e){}};
  }

  fixBtn.onclick=()=>{hide(el('dialog'));hide(el('reportPanel'));unlock();hide(fixBtn)};

  function tick(){
    forceCloseOverlaps();
    if(musicOn)play(kind());
    label();
    anchorDialog();
    patch4End();
    fixBtn.style.display=(dialogOpen()&&reportOpen())?'block':fixBtn.style.display;
  }
  setInterval(tick,120);
})();

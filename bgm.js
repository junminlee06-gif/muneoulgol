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

  const style = document.createElement('style');
  style.textContent = '.dialog{left:16px!important;right:16px!important;bottom:16px!important;top:auto!important;max-height:340px!important;overflow:hidden!important}.dialog .text{max-height:112px!important;overflow-y:auto!important}.dialog .options{max-height:190px!important;overflow-y:auto!important}.dialog button{font-size:13px!important;line-height:1.32!important;padding:6px 9px!important}#muneoulgolPad,#muneoulgolAction,#muneoulgolUnlock{display:none!important;pointer-events:none!important}#muneoulgolMusic{position:fixed;right:18px;bottom:18px;z-index:99999;background:rgba(31,25,20,.94);color:#ded4c1;border:1px solid #6e5a40;border-radius:10px;padding:9px 12px;font:14px system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.42)}';

  const music = document.createElement('button');
  music.id = 'muneoulgolMusic';
  music.textContent = '음악 켜기';

  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(style);
    document.body.appendChild(music);
    cleanup();
    setTimeout(() => {
      try {
        if (!text('speaker') && typeof showScene === 'function' && typeof state !== 'undefined' && state.chapter === 1) showScene('intro');
      } catch {}
    }, 700);
  });

  function cleanup() {
    ['muneoulgolPad', 'muneoulgolAction', 'muneoulgolUnlock'].forEach(id => document.getElementById(id)?.remove());
  }
  function text(id) { return document.getElementById(id)?.innerText || ''; }
  function kind() { return /밤/.test(text('hud') + text('phaseText')) ? 'night' : 'day'; }
  async function play(k) {
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
    if (!musicOn) { day.pause(); night.pause(); music.textContent = '음악 켜기'; }
    else play(kind());
  };
  setInterval(() => { cleanup(); if (musicOn) play(kind()); }, 1000);

  const locs = { '촌장집': 'chief', '마을 우물': 'well', '무당집': 'shaman', '방앗간': 'mill', '관아 임시처소': 'office' };
  const actionKeys = new Set(['Enter', ' ', 'z', 'Z']);
  const p = { active:false, done:false, dialog:false, stage:'d1', day:1, count:0, max:3, seen:{}, official:[], memo:[], clue:[], bias:{beast:0,human:0,ritual:0,conceal:0,unknown:0} };

  function inCh1() {
    const h = text('hud') + text('phaseText');
    return !p.done && h.includes('무너울골') && !/[2345]장/.test(h) && (h.includes('1장') || p.active);
  }
  function currentLoc() {
    const m = text('hud').match(/상호작용:\s*([^\n]+)/);
    return m ? locs[m[1].trim()] : null;
  }
  function reportOpen() { return document.getElementById('reportPanel')?.style.display === 'block'; }
  function oldDialogOpen() {
    const d = document.getElementById('dialog');
    return d && !p.dialog && (d.style.display === 'block' || (d.style.display === '' && text('speaker')));
  }
  function add(a, v) { if (v && !a.includes(v)) a.push(v); }
  function apply(e = {}) {
    (e.b || []).forEach(([k,n]) => p.bias[k] += n);
    (e.o || []).forEach(v => add(p.official, v));
    (e.m || []).forEach(v => add(p.memo, v));
    (e.c || []).forEach(v => add(p.clue, v));
  }
  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(toast.id);
    toast.id = setTimeout(() => t.style.display = 'none', 1400);
  }
  function esc(s) { return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  function render() {
    if (!p.active || p.done) return;
    const phase = document.getElementById('phaseText');
    const official = document.getElementById('official');
    const unofficial = document.getElementById('unofficial');
    const cluePills = document.getElementById('cluePills');
    if (phase) phase.textContent = `1장 확장 · ${p.day}일차 · ${label()} · 조사 ${p.count}/${p.max}`;
    if (official) official.innerHTML = p.official.map(v => `<li>${esc(v)}</li>`).join('') || '<li class="small">아직 없음</li>';
    if (unofficial) unofficial.innerHTML = p.memo.map(v => `<li>${esc(v)}</li>`).join('') || '<li class="small">아직 없음</li>';
    if (cluePills) cluePills.innerHTML = p.clue.map(v => `<span class="pill">단서: ${esc(v)}</span>`).join('') || '<span class="small">아직 없음</span>';
  }
  function label() { return {d1:'첫날 낮',report1:'첫 보고',d2:'둘째 낮',night2:'두 번째 밤',end1:'새벽 정리'}[p.stage] || p.stage; }
  function show(speaker, body, options) {
    const d = document.getElementById('dialog');
    const sp = document.getElementById('speaker');
    const tx = document.getElementById('dialogText');
    const box = document.getElementById('options');
    if (!d || !sp || !tx || !box) return;
    p.active = true;
    p.dialog = true;
    sp.textContent = speaker;
    tx.textContent = body;
    box.innerHTML = '';
    options.forEach((op, i) => {
      const b = document.createElement('button');
      b.textContent = `${i + 1}. ${op.text}`;
      b.onclick = () => { apply(op.e); if (!op.keep) close(); if (op.run) op.run(); render(); };
      box.appendChild(b);
    });
    d.style.display = 'block';
    render();
  }
  function close() { const d = document.getElementById('dialog'); if (d) d.style.display = 'none'; p.dialog = false; }
  function seen(place) {
    const k = p.stage + ':' + place;
    if (p.seen[k]) { toast('이미 조사한 곳이다. 다른 장소로 이동하자.'); return false; }
    p.seen[k] = true;
    p.count += 1;
    return true;
  }
  function after() {
    if (p.count >= p.max) {
      if (p.stage === 'd1') report1();
      else if (p.stage === 'd2') dusk2();
    } else toast(`조사 ${p.count}/${p.max} 완료. 다른 장소로 이동하자.`);
  }
  function opt(text, e) { return {text, e}; }
  function scene(title, body, options, place) {
    show(title, body, options.map(o => ({...o, run:()=>{ if (seen(place)) after(); }})));
  }
  function handle(place) {
    p.active = true;
    if (p.stage === 'd1') return day1(place);
    if (p.stage === 'd2') return day2(place);
    if (p.stage === 'night2') return night2(place);
    if (p.stage === 'end1') return place === 'office' ? finalBridge() : toast('관아 임시처소에서 마무리하자.');
  }
  function day1(place) {
    if (!['chief','well','shaman','mill'].includes(place)) return toast('촌장집, 우물, 무당집, 방앗간을 조사하자.');
    const data = {
      chief:['을파의 장부','산제 비용 칸이 비어 있다.',[opt('범의 흔적으로 본다.',{b:[['beast',1]],o:['촌장 진술: 범 가능성']}),opt('산제 중단과 연결한다.',{b:[['ritual',1]],c:['산제 비용 공백']}),opt('기록 정리를 의심한다.',{b:[['conceal',1]],m:['장부가 지나치게 정리되어 있다']})]],
      well:['우물가','우물은 고요하지만 산 쪽에서 물소리가 난다.',[opt('도리의 이름을 확인한다.',{b:[['human',1]],o:['이름 확인: 도리'],c:['도리의 이름']}),opt('산제 노래를 묻는다.',{b:[['ritual',1]],c:['산제 노래']}),opt('주민 침묵을 본다.',{b:[['conceal',1]],m:['사람들이 서로 눈치를 본다']})]],
      shaman:['막례의 말','막례는 산은 기록을 못 한다고 말한다.',[opt('산제 의미를 묻는다.',{b:[['ritual',1]],c:['검은등 별칭']}),opt('사람의 개입을 묻는다.',{b:[['human',1]],m:['사람이 산 이름을 빌릴 때가 있다']}),opt('공식 감시 대상으로 본다.',{b:[['conceal',1]],o:['무당 감시 필요성']})]],
      mill:['방앗간','물레 축은 젖어 있고 돌확 아래에는 풀 조각이 있다.',[opt('풀 조각을 챙긴다.',{b:[['human',1]],c:['짚신 풀 조각']}),opt('물기를 확인한다.',{b:[['ritual',1]],c:['젖은 물레 축']}),opt('검은 털을 줍는다.',{b:[['beast',1]],c:['검은 털']})]]
    }[place];
    scene(data[0], data[1], data[2], place);
  }
  function report1() {
    p.stage = 'report1';
    show('첫 보고서', '이 보고는 중간 보고다. 제출해도 2장으로 가지 않고 2일차 조사로 이어진다.', [
      {text:'범의 습격 가능성', e:{b:[['beast',2]],o:['1장 첫 보고: 범의 습격 가능성']}, run:()=>beginDay2('beast')},
      {text:'사람이 데려간 흔적', e:{b:[['human',2]],o:['1장 첫 보고: 사람 개입 가능성']}, run:()=>beginDay2('human')},
      {text:'산제와 관련된 흔적', e:{b:[['ritual',2]],o:['1장 첫 보고: 산제 관련 정황']}, run:()=>beginDay2('ritual')},
      {text:'마을 은폐 가능성', e:{b:[['conceal',2]],o:['1장 첫 보고: 마을 은폐 가능성']}, run:()=>beginDay2('conceal')},
      {text:'판단 보류', e:{b:[['unknown',2]],o:['1장 첫 보고: 판단 보류']}, run:()=>beginDay2('unknown')}
    ]);
  }
  function beginDay2(kind) {
    p.day = 2;
    p.stage = 'd2';
    p.count = 0;
    p.max = 2;
    const msg = {beast:'범이라는 말이 마을을 안심시켰다.',human:'월선이 당신을 기다리고 있다.',ritual:'막례가 장승 뒤에서 기다린다.',conceal:'마을 전체가 용의자가 되었다.',unknown:'아무것도 달라지지 않은 것이 불길하다.'}[kind] || '둘째 날이 밝았다.';
    show('2일차 아침', msg, [{text:'둘째 날 조사를 시작한다.', run:close}]);
  }
  function day2(place) {
    if (!['chief','well','shaman','mill'].includes(place)) return toast('마을 핵심 장소를 다시 확인하자.');
    const data = {
      chief:['2일차 촌장집','을파는 장부를 닫지 않는다.',[opt('은폐 정황을 묻는다.',{b:[['conceal',1]],m:['을파는 헛간 이야기에 표정을 닫았다']}),opt('마루 이름을 확인한다.',{b:[['human',1]],c:['마루 이름']})]],
      well:['2일차 우물가','월선은 도리의 이름을 반복한다.',[opt('도리 이름을 기록한다.',{b:[['human',1]],o:['도리 이름 공식 기록'],c:['도리의 이름']}),opt('노래를 더 묻는다.',{b:[['ritual',1]],c:['노래 조각']})]],
      shaman:['2일차 막례','막례는 젖은 돌을 본다.',[opt('산제 관련성을 묻는다.',{b:[['ritual',1]],m:['막례는 말을 아꼈다']}),opt('비공식 기록에 남긴다.',{b:[['unknown',1]],m:['산의 등은 검고 물의 입은 닫히지 않는다']})]],
      mill:['2일차 방앗간','물레는 멈췄지만 축축하다.',[opt('검은 털을 보관한다.',{b:[['beast',1]],c:['젖은 검은 털']}),opt('돌확을 조사한다.',{b:[['ritual',1]],c:['돌확 절차']})]]
    }[place];
    scene(data[0], data[1], data[2], place);
  }
  function dusk2() { show('2일차 해질녘','누구의 말을 믿을지 정해야 한다.',[{text:'을파의 설명을 따른다.',e:{b:[['beast',1]]},run:startNight2},{text:'월선의 증언을 믿는다.',e:{b:[['human',1]]},run:startNight2},{text:'막례의 경고를 듣는다.',e:{b:[['ritual',1]]},run:startNight2},{text:'누구도 완전히 믿지 않는다.',e:{b:[['unknown',1]]},run:startNight2}]); }
  function startNight2() { p.stage = 'night2'; p.count = 0; p.max = 1; toast('두 번째 밤 행동은 한 번뿐이다.'); }
  function night2(place) {
    if (!['chief','well','shaman','mill'].includes(place)) return toast('밤에는 핵심 장소 한 곳만 보자.');
    const data = {chief:['헛간 쪽 밤','젖은 짚 냄새가 난다.',{b:[['conceal',1]],c:['젖은 짚단']}],well:['우물의 밤','도리 이름이 되돌아온다.',{b:[['ritual',1]],c:['이름 반응']}],shaman:['금줄의 밤','금줄이 한 겹 더 매인다.',{b:[['ritual',1]],c:['제문 조각']}],mill:['돌확의 밤','물소리가 계속 난다.',{b:[['unknown',1]],m:['물소리 속에 여러 이름이 섞였다']}]}[place];
    show(data[0], data[1], [{text:'새벽까지 기록한다.',e:data[2],run:end1}]);
  }
  function end1() { p.stage='end1'; show('1장 종료','도리는 돌아오지 않았다. 이제 물소리 골짜기로 향한다.',[{text:'관아 임시처소에서 원본 보고서로 마무리한다.',run:()=>toast('관아 임시처소로 이동하자.')},{text:'바로 원본 보고서 화면을 연다.',run:finish}]); }
  function finalBridge() { show('원본 2장 연결','1장 확장 이벤트가 끝났다.',[{text:'원본 보고서 작성 화면을 연다.',run:finish}]); }
  function finish() { p.done = true; close(); try { window.openReport ? window.openReport(1) : toast('원본 보고서 함수를 찾지 못했다.'); } catch { toast('원본 보고서 연결 오류'); } }
  function earlyKind() { const s=Array.from(document.querySelectorAll('#reportPanel button.selected')).map(b=>b.textContent).join(' '); if(s.includes('범'))return'beast'; if(s.includes('은폐')||s.includes('촌장'))return'conceal'; if(s.includes('무당')||s.includes('산길'))return'ritual'; if(s.includes('도적'))return'human'; return'unknown'; }
  function guardReport(e) {
    const target=e.target?.closest?.('#finishReport');
    if(!target||p.done||!p.active||p.stage==='end1')return;
    const panel=document.getElementById('reportPanel');
    if(!panel||panel.style.display!=='block')return;
    e.preventDefault(); e.stopImmediatePropagation();
    if(document.querySelectorAll('#reportPanel button.selected').length<3){toast('모든 항목을 선택하세요. 첫 보고는 2일차 조사로 이어집니다.');return;}
    panel.style.display='none'; add(p.official,'1장 첫 보고: 중간 보고로 처리'); beginDay2(earlyKind());
  }
  window.addEventListener('keydown', e=>{
    if(p.dialog){const n=parseInt(e.key,10); if(n>=1){const b=document.getElementById('options')?.children[n-1]; if(b){e.preventDefault(); e.stopImmediatePropagation(); b.click();}} if(actionKeys.has(e.key)){e.preventDefault(); e.stopImmediatePropagation();} return;}
    if(!actionKeys.has(e.key)||e.repeat||reportOpen()||oldDialogOpen()||!inCh1())return;
    const l=currentLoc(); if(!l)return; e.preventDefault(); e.stopImmediatePropagation(); handle(l);
  },true);
  document.addEventListener('click',guardReport,true);
  setInterval(renderSide,900);
})();

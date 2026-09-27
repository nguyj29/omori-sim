import {DEFAULT_STATE,ENCOUNTERS,runAll,rollScenario,partyAt,POLICY_NAMES} from './engine.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const SVG='http://www.w3.org/2000/svg';
const el=(tag,attrs={},...kids)=>{const n=tag.startsWith('svg:')?document.createElementNS(SVG,tag.slice(4)):document.createElement(tag);for(const[k,v]of Object.entries(attrs))if(v!=null&&v!==false)n.setAttribute(k,v);for(const k of kids.flat())if(k!=null)n.append(k.nodeType?k:document.createTextNode(k));return n};
const fmt=n=>Math.round(n).toLocaleString();
const pct=(r,d=1)=>{const v=r*100;if(v===100)return'100%';if(v>99.9&&v<100)return`${v.toFixed(2)}%`;return`${v.toFixed(d)}%`};
const POLICIES=['suboptimal','decent','best','custom'];
const ENC_TAGS={download:'rules from game files',spaceboy:'provisional move choice',bunnies:'test sample'};

const RULES={
  common:{
    source:['Level 1–50 stats come from the class tables; equipment adds its listed bonuses.','All four commands are chosen before the turn resolves, then everyone acts in Speed order (no random roll; ties keep party order).','Damage: formula → critical ×1.5 + 1.5 → ±20% spread (triangular) → rounded. Critical chance = Luck %. Stab always crits.','Energy starts at 3 and rises by 1 whenever a friend loses Heart to a hit, up to 10.','Release Energy needs Aubrey, Kel and Hero alive; +25% ATK/DEF/SPD/LUCK for the rest of the battle.','Headbutt needs 20% Heart and costs floor(20% max Heart) in recoil, never below 1.','Candy +30 Heart · Apple Juice +25 Juice · Life Jam revives at 50%.'],
    assume:['Release Energy and follow-ups use tier 1 (300 damage; Trip, Pass to Aubrey).','Someone switches Omori from Stab to Attack 80% of the time at 10 Energy, so Release Energy can be offered.','Each friend has a small chance per turn of ignoring heals already queued by teammates (Someone: 10%).'],
    gap:['Guard, emotions and emotion-based skills.','Aubrey’s Look At and Hero’s Call follow-ups.','Omori’s “did not succumb”.','Boss Rush versions of each boss.']
  },
  download:{source:['Download Window: 600 Heart, 5 DEF, 1 Speed (always acts last).','Does nothing on turns 1–2 and 4–5; CRASH on turn 3 and every turn from 6.','CRASH hits every friend for round(80% max Heart). It cannot miss, has no spread and never crits — anyone at or below 80% Heart goes Toast.'],assume:[],gap:[]},
  spaceboy:{source:['Space Ex-Boyfriend: 1350 Heart, 15 ATK, 16 DEF, 25 Speed, 95% hit.'],assume:['Move choice and anger phases (75/50/25% Heart) are approximations, not the game’s AI table.'],gap:['Angsty Song’s emotion effect.']},
  bunnies:{source:['Space Bunny: 105 Heart, 12 ATK, 7 DEF, 10 Speed, 95% hit.'],assume:['This pair is a test formation, not a specific map encounter; move odds are approximate.'],gap:[]}
};

const state={encounter:'download',levels:{...DEFAULT_STATE.levels},current:structuredClone(DEFAULT_STATE.current),results:null,why:'custom',rolled:null,turn:0};

/* ---------------- tooltip ---------------- */
const tip=$('#tip');
function showTip(e,lines){tip.replaceChildren(...lines.map((l,i)=>el('div',{},i===0?el('strong',{},l):l)));tip.hidden=false;const r=(e.currentTarget||e.target).getBoundingClientRect(),x=e.clientX??r.left+r.width/2,y=e.clientY??r.top;tip.style.left=`${Math.min(innerWidth-tip.offsetWidth-8,Math.max(8,x+12))}px`;tip.style.top=`${Math.max(8,y-tip.offsetHeight-10)}px`}
const hideTip=()=>{tip.hidden=true};
function hover(node,lines){node.setAttribute('tabindex','0');node.addEventListener('pointermove',e=>showTip(e,lines()));node.addEventListener('focus',e=>showTip(e,lines()));node.addEventListener('pointerleave',hideTip);node.addEventListener('blur',hideTip)}

/* ---------------- encounter + party ---------------- */
function renderEncounters(){
  $('#encounters').replaceChildren(...Object.entries(ENCOUNTERS).map(([id,e])=>{
    const b=el('button',{role:'radio','aria-checked':String(id===state.encounter)},e.name,el('small',{},ENC_TAGS[id]));
    b.onclick=()=>{state.encounter=id;renderEncounters();renderRules();markStale()};return b}));
}
function setup(){return{encounter:state.encounter,levels:state.levels,current:state.current,inventory:$('#inventory').value,headbutt:$('#headbutt').checked}}
function renderParty(){
  const party=partyAt(state.levels,state.current);
  $('#party').replaceChildren(...party.map(p=>{
    const meter=(kind,label,cur,max)=>{const input=el('input',{type:'number',min:0,max,value:cur,'aria-label':`${p.name} ${label}`});
      input.onchange=()=>{state.current[p.id]={...state.current[p.id],[kind==='heart'?'hp':'juice']:Math.max(0,Math.min(max,+input.value||0))};renderParty();markStale()};
      return el('div',{class:`meter ${kind}`},label,el('div',{class:'bar'},el('i',{style:`width:${max?100*cur/max:0}%`})),el('span',{class:'val'},input,`/${max}`))};
    const lv=el('input',{type:'number',min:1,max:50,value:p.level,'aria-label':`${p.name} level`});
    const setLv=v=>{v=Math.max(1,Math.min(50,v|0||1));const was=state.current[p.id]||{},before=partyAt(state.levels,state.current).find(x=>x.id===p.id);state.levels={...state.levels,[p.id]:v};const after=partyAt(state.levels,{}).find(x=>x.id===p.id);
      // A full bar stays full when the maximum changes; otherwise keep the typed value (clamped).
      state.current[p.id]={hp:before.hp===before.maxHp?after.maxHp:Math.min(after.maxHp,was.hp??after.maxHp),juice:before.juice===before.maxJuice?after.maxJuice:Math.min(after.maxJuice,was.juice??after.maxJuice)};renderParty();markStale()};
    lv.onchange=()=>setLv(+lv.value);
    const minus=el('button',{'aria-label':`Lower ${p.name} level`},'−'),plus=el('button',{'aria-label':`Raise ${p.name} level`},'+');minus.onclick=()=>setLv(p.level-1);plus.onclick=()=>setLv(p.level+1);
    return el('article',{class:`friend${p.hp<=0?' toast':''}`},
      el('div',{class:'friend-top'},el('span',{class:'friend-name'},p.name.toUpperCase()),el('span',{class:'lv'},'LV',minus,lv,plus)),
      meter('heart','HEART',p.hp,p.maxHp),meter('juice','JUICE',p.juice,p.maxJuice),
      el('div',{class:'stats'},...[['ATK',p.atk],['DEF',p.def],['SPD',p.spd],['LCK',p.luck]].map(([k,v])=>el('span',{},`${k} `,el('b',{},String(v))))),
      el('div',{class:'gear'},`${p.weapon} · ${p.charm}`));
  }));
}
function markStale(){if(state.results)$('#status').textContent='Setup changed — press Simulate to update these numbers.'}

/* ---------------- simulation ---------------- */
function makeWorker(){return new Worker(new URL('./worker.js',import.meta.url),{type:'module'})}
async function run(){
  const s=setup(),n=+$('#trials').value,seed=+$('#seed').value||1;$('#run').disabled=true;
  $('#status').textContent=`Simulating ${(n*4).toLocaleString()} battles…`;const t0=performance.now();
  let results;
  try{results=await new Promise((resolve,reject)=>{const w=makeWorker();w.onmessage=e=>{resolve(e.data);w.terminate()};w.onerror=e=>{w.terminate();reject(e)};w.postMessage({setup:s,trials:n,seed})})}
  catch{await new Promise(r=>setTimeout(r,20));results=runAll(s,n,seed)}
  state.results={list:results,encounter:s.encounter};$('#run').disabled=false;
  $('#status').textContent=`${n.toLocaleString()} battles per policy · seed ${seed} · ${Math.round(performance.now()-t0)} ms. The same seed reproduces these numbers.`;
  renderOdds();renderPresets();updateKelly();
}
const byKey=k=>state.results?.list.find(r=>r.key===k);

function renderOdds(){
  const me=byKey('custom'),best=byKey('best'),enc=ENCOUNTERS[state.results.encounter].name;
  $('#verdict').replaceChildren(
    el('div',{class:'who'},el('span',{},'Someone'),el('small',{},`win chance vs ${enc}`)),
    el('div',{class:'big'},pct(me.rate)),
    el('p',{class:'side'},`Best found play wins ${pct(best.rate)}. The gap is how much the profile's habits cost in this fight.`));
  drawRuler();
  const t=$('#policyTable');t.replaceChildren(el('thead',{},el('tr',{},...['Policy','Win','95% interval','Median turns','Friends standing'].map(h=>el('th',{},h)))),
    el('tbody',{},...POLICIES.map(k=>{const r=byKey(k);return el('tr',{class:k==='custom'?'me':''},el('td',{},r.name),el('td',{},pct(r.rate)),el('td',{},`${pct(r.ci[0])}–${pct(r.ci[1])}`),el('td',{},String(r.medianTurns)),el('td',{},r.avgSurvivors.toFixed(1)))})));
  $('#whyPolicy').replaceChildren(...POLICIES.map(k=>{const b=el('button',{role:'radio','aria-checked':String(k===state.why)},POLICY_NAMES[k]);b.onclick=()=>{state.why=k;renderOdds()};return b}));
  drawEnds();renderToasts();
}

// One horizontal probability scale: a row per policy (dot + 95% whisker), plus the market's Blue line.
function drawRuler(){
  const svg=$('#ruler');if(!state.results)return;const W=svg.clientWidth||600,H=132,L=10,R=10,top=22,row=24;
  const x=v=>L+v*(W-L-R);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.replaceChildren();
  const axisY=top+row*4+4;
  for(const v of[0,.25,.5,.75,1]){svg.append(el('svg:line',{class:'grid',x1:x(v),x2:x(v),y1:top-6,y2:axisY}),el('svg:text',{class:'ax',x:x(v),y:axisY+16,'text-anchor':v===0?'start':v===1?'end':'middle'},`${v*100}%`))}
  const market=(+$('#marketOdds').value||50)/100;
  svg.append(el('svg:line',{x1:x(market),x2:x(market),y1:top-14,y2:axisY,stroke:'var(--paper)','stroke-dasharray':'3 4','stroke-width':1.5}),
    el('svg:text',{class:'lab dim',x:x(market),y:top-12,'text-anchor':market>.85?'end':market<.15?'start':'middle','font-size':'11'},`market ${pct(market)}`));
  POLICIES.forEach((k,i)=>{const r=byKey(k),y=top+8+i*row,me=k==='custom',cx=x(r.rate);
    const g=el('svg:g',{'aria-label':`${r.name} ${pct(r.rate)}`});
    g.append(el('svg:rect',{x:Math.min(x(r.ci[0]),cx-12),y:y-12,width:Math.max(24,x(r.ci[1])-x(r.ci[0])+24),height:24,fill:'transparent'}),
      el('svg:line',{x1:x(r.ci[0]),x2:x(r.ci[1]),y1:y,y2:y,stroke:me?'var(--paper)':'var(--dim)','stroke-width':2,'stroke-linecap':'round'}),
      el('svg:circle',{cx,cy:y,r:me?7:5,fill:me?'var(--paper)':'var(--dim)',stroke:'var(--box)','stroke-width':2}));
    const anchorEnd=r.rate>.6;
    g.append(el('svg:text',{class:me?'lab':'lab dim',x:anchorEnd?cx-14:cx+14,y:y+4,'text-anchor':anchorEnd?'end':'start','font-weight':me?'700':'400'},`${r.name} ${pct(r.rate)}`));
    hover(g,()=>[pct(r.rate),`${r.name} · 95% interval ${pct(r.ci[0])}–${pct(r.ci[1])}`,`${r.wins.toLocaleString()} wins of ${r.trials.toLocaleString()}`]);svg.append(g)});
}

// Battles ending on each turn, split by outcome (share of all battles for the chosen policy).
function drawEnds(){
  const r=byKey(state.why),svg=$('#endsChart'),W=svg.clientWidth||420,H=170,L=34,R=6,T=10,B=24;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.replaceChildren();
  const turns=Object.keys(r.ends).map(Number).sort((a,b)=>a-b),lo=turns[0],hi=turns.at(-1),n=hi-lo+1;
  const maxShare=Math.max(...turns.map(t=>(r.ends[t].win+r.ends[t].loss)/r.trials));
  const niceMax=Math.min(1,Math.ceil(maxShare*10)/10||.1),y=v=>T+(1-v/niceMax)*(H-T-B),bw=(W-L-R)/n;
  for(const v of[0,niceMax/2,niceMax]){svg.append(el('svg:line',{class:'grid',x1:L,x2:W-R,y1:y(v),y2:y(v)}),el('svg:text',{class:'ax',x:L-6,y:y(v)+4,'text-anchor':'end'},`${Math.round(v*100)}%`))}
  const every=Math.ceil(n/12);
  for(let t=lo;t<=hi;t++){
    const e=r.ends[t]||{win:0,loss:0},w=e.win/r.trials,l=e.loss/r.trials,x0=L+(t-lo)*bw+Math.min(3,bw*.15),bwi=Math.max(2,bw-2*Math.min(3,bw*.15));
    const g=el('svg:g',{'aria-label':`Turn ${t}`});
    g.append(el('svg:rect',{x:L+(t-lo)*bw,y:T,width:bw,height:H-T-B,fill:'transparent'}));
    if(w>0)g.append(el('svg:rect',{x:x0,y:y(w),width:bwi,height:Math.max(1,y(0)-y(w)),fill:'var(--blue)',rx:2}));
    if(l>0){const top=y(w+l),bottom=y(w)-(w>0?2:0);g.append(el('svg:rect',{x:x0,y:top,width:bwi,height:Math.max(1,bottom-top),fill:'var(--red)',rx:2}))}
    if((t-lo)%every===0)svg.append(el('svg:text',{class:'ax',x:L+(t-lo+.5)*bw,y:H-6,'text-anchor':'middle'},`T${t}`));
    hover(g,()=>[pct(w+l),`of battles end on turn ${t}`,`party wins ${pct(w)} · boss wins ${pct(l)}`]);svg.append(g);
  }
}
function renderToasts(){
  const r=byKey(state.why),party=partyAt(state.levels,state.current);
  const worst=party.map(p=>({p,s:r.toast[p.id]})).filter(x=>x.s.rate>0).sort((a,b)=>b.s.rate-a.s.rate||a.s.medianTurn-b.s.medianTurn)[0];
  const lede=worst?`${worst.p.name} goes Toast in ${pct(worst.s.rate,0)} of ${r.name}'s battles, usually on turn ${worst.s.medianTurn}.`:`Nobody goes Toast in ${r.name}'s battles.`;
  $('#toasts').replaceChildren(el('h3',{},'Who goes Toast'),el('p',{class:'lede'},lede),...party.flatMap(p=>{const s=r.toast[p.id];return[
    el('div',{class:'row'},el('span',{},p.name),el('div',{class:'bar'},el('i',{style:`width:${s.rate*100}%`})),el('span',{class:'num'},pct(s.rate,0))),
    el('div',{class:'when'},s.medianTurn?`first Toast usually turn ${s.medianTurn}`:'never Toast')]}));
}

/* ---------------- bet sizing (parimutuel Kelly) ---------------- */
function growthFor(stake,bankroll,p,ownPool,otherPool){if(stake<=0)return 0;if(stake>=bankroll)return-Infinity;const win=bankroll+stake*otherPool/(ownPool+stake),lose=bankroll-stake;return p*Math.log(win/bankroll)+(1-p)*Math.log(lose/bankroll)}
function fullKellyStake(bankroll,p,ownPool,otherPool){let lo=0,hi=bankroll*.999999;for(let i=0;i<100;i++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(growthFor(a,bankroll,p,ownPool,otherPool)<growthFor(b,bankroll,p,ownPool,otherPool))lo=a;else hi=b}const s=(lo+hi)/2;return growthFor(s,bankroll,p,ownPool,otherPool)>1e-12?s:0}
function renderPresets(){
  const box=$('#presets');const me=byKey('custom'),best=byKey('best');
  if(!me){box.replaceChildren(el('span',{class:'hint'},'Presets appear after a simulation.'));return}
  // Pessimistic sits as far below Someone as Best found sits above it; clamped to the slider range.
  const clamp=v=>Math.max(.001,Math.min(.999,v)),items=[['Pessimistic',clamp(me.rate-(best.rate-me.rate))],['Custom · Someone',clamp(me.rate)],['Optimistic · Best found',clamp(best.rate)]];
  box.replaceChildren(...items.map(([label,v])=>{const b=el('button',{type:'button'},label,el('strong',{},pct(v)));b.onclick=()=>{$('#belief').value=(v*100).toFixed(1);updateKelly()};return b}));
}
function updateKelly(){
  const total=Math.max(100,+$('#poolSize').value||100),marketBlue=Math.max(.01,Math.min(.99,(+$('#marketOdds').value||50)/100)),blue=total*marketBlue,red=total-blue,bankroll=Math.max(1,+$('#bankroll').value||1),beliefBlue=Math.max(1e-6,Math.min(1-1e-6,(+$('#belief').value||0)/100)),fraction=+$('#kellyFraction').value;
  $('#poolSizeOut').value=fmt(total);$('#marketOddsOut').value=pct(marketBlue);$('#beliefOut').value=pct(beliefBlue);
  $('#redPool').textContent=fmt(red);$('#bluePool').textContent=fmt(blue);$('#redOdds').textContent=`${(1+blue/red).toFixed(2)}× return`;$('#blueOdds').textContent=`${(1+red/blue).toFixed(2)}× return`;
  const edge=(beliefBlue-marketBlue)*100;$('#beliefEdge').textContent=`${edge>=0?'+':''}${edge.toFixed(1)} pts Blue`;
  const bf=fullKellyStake(bankroll,beliefBlue,blue,red),rf=fullKellyStake(bankroll,1-beliefBlue,red,blue),side=growthFor(bf,bankroll,beliefBlue,blue,red)>=growthFor(rf,bankroll,1-beliefBlue,red,blue)?'blue':'red';
  const full=side==='blue'?bf:rf,p=side==='blue'?beliefBlue:1-beliefBlue,own=side==='blue'?blue:red,other=side==='blue'?red:blue,stake=full*fraction,profit=stake?stake*other/(own+stake):0,ev=p*profit-(1-p)*stake,riskPct=stake/bankroll*100;
  $('#rec').className=`rec ${stake?side:''}`;
  $('#betSide').textContent=stake?(side==='blue'?'Bet BLUE · party wins':'Bet RED · boss wins'):'No bet';
  $('#betStake').textContent=`${fmt(stake)} points`;
  const name={1:'Full',0.75:'Three-quarter',0.5:'Half',0.25:'Quarter'}[fraction];
  $('#betExplanation').textContent=stake?`${name} Kelly risks ${riskPct.toFixed(1)}% of your points, after accounting for how your stake shrinks ${side==='blue'?'Blue':'Red'}'s payout.`:'Neither side grows your points on average at this belief and pool.';
  const risk=riskPct===0?'None':riskPct<5?'Low':riskPct<15?'Moderate':riskPct<30?'High':'Very high';
  $('#riskLabel').textContent=`${risk} · ${riskPct.toFixed(1)}%`;$('#fullKelly').textContent=fmt(full);$('#winBankroll').textContent=fmt(bankroll+profit);$('#loseBankroll').textContent=fmt(bankroll-stake);$('#expectedBankroll').textContent=fmt(bankroll+ev);$('#expectedReturn').textContent=`${ev>=0?'+':''}${fmt(ev)}`;$('#rewardRisk').textContent=stake?`${(ev/stake*100).toFixed(1)}%`:'—';
  drawRuler();
}

/* ---------------- replay ---------------- */
function roll(){
  const s=setup();state.rolled={...rollScenario(s,$('#scenarioPolicy').value,+$('#scenarioSeed').value||1),start:partyAt(s.levels,s.current),setup:s};
  state.turn=1;renderTimeline();renderTurn();
}
const endOf=(trace,t)=>trace.filter(e=>e.turn===t).at(-1);
function renderTimeline(){
  const r=state.rolled,turns=[...new Set(r.trace.map(e=>e.turn))],enemies=r.trace[0].enemies.map(e=>e.name),friends=r.start.map(p=>p.name);
  const labels=el('div',{class:'tlabels','aria-hidden':'true'},el('span',{},'turn'),...friends.map(n=>el('span',{},n)),...enemies.map(n=>el('span',{},n.replace('Download Window','Window').replace('Space Ex-Boyfriend','Ex-BF'))),el('span',{},'energy'));
  const cols=turns.map(t=>{const end=endOf(r.trace,t),crash=r.trace.some(e=>e.turn===t&&e.side==='e'&&/CRASH|Bullet Hell|Angry Song/.test(e.action));
    const b=el('button',{class:`tcol${crash?' crash':''}`,role:'tab','aria-selected':String(t===state.turn),'aria-label':`Turn ${t}`},el('span',{class:'tn'},`T${t}`),
      ...end.party.map(p=>el('span',{class:`cell${p.hp<=0?' out':''}`},el('i',{style:`width:${100*p.hp/p.max}%`}))),
      ...end.enemies.map(e=>el('span',{class:'cell boss'},el('i',{style:`width:${100*e.hp/e.max}%`}))),
      el('span',{class:'en'},String(end.energy)));
    b.onclick=()=>{state.turn=t;renderTimeline();renderTurn()};return b});
  $('#timeline').replaceChildren(labels,...cols);
}
function renderTurn(){
  const r=state.rolled,t=state.turn,entries=r.trace.filter(e=>e.turn===t),end=entries.at(-1),prev=t>1?endOf(r.trace,t-1):null;
  const startHp=name=>prev?prev.party.find(p=>p.name===name).hp:r.start.find(p=>p.name===name).hp;
  const acts=entries.map((e,i)=>el('li',{class:e.side==='e'?'enemy':''},el('span',{},el('b',{},e.actor),el('span',{class:'order'},`#${i+1}`)),el('span',{},e.action)));
  for(const p of r.start){if(entries.some(e=>e.actor===p.name))continue;const wasUp=startHp(p.name)>0;acts.push(el('li',{class:'out'},el('span',{},el('b',{},p.name)),el('span',{},wasUp?'Went Toast before acting — no action':'Toast — no action')))}
  const last=t===r.turns&&entries.length;
  const tbl=el('table',{},el('thead',{},el('tr',{},...['End of turn','Heart','Juice'].map(h=>el('th',{},h)))),el('tbody',{},
    ...end.party.map(p=>el('tr',{class:p.hp>0?'me':''},el('td',{},p.name),el('td',{},p.hp>0?`${p.hp}/${p.max}`:`Toast`),el('td',{},String(p.juice)))),
    ...end.enemies.map(e=>el('tr',{class:'me'},el('td',{},e.name),el('td',{},`${e.hp}/${e.max}`),el('td',{},'—')))));
  $('#turn').replaceChildren(
    el('div',{},el('h3',{},`Turn ${t} · in resolution order`),el('ol',{class:'acts'},...acts)),
    el('div',{class:'state'},tbl,el('div',{class:'energy'},'Energy',el('span',{class:'pips'},...Array.from({length:10},(_,i)=>el('i',{class:i<end.energy?'on':''}))),el('span',{class:'num'},`${end.energy}/10`)),
      last?el('p',{class:`outcome ${r.win?'win':'loss'}`,style:'margin-top:14px'},r.win?`Party wins on turn ${r.turns}`:`Boss wins on turn ${r.turns}`):el('p',{class:'fine',style:'margin-top:14px'},`${r.policy} · seed ${r.seed} · ${r.win?'won':'lost'} on turn ${r.turns}. Use ← → to step.`)));
}
$('#timeline').addEventListener('keydown',e=>{if(!state.rolled)return;const max=state.rolled.turns;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();state.turn=Math.max(1,Math.min(max,state.turn+(e.key==='ArrowRight'?1:-1)));renderTimeline();renderTurn();$(`.tcol[aria-selected=true]`)?.focus()}});

/* ---------------- rules, import, calibration ---------------- */
function renderRules(){const c=RULES.common,e=RULES[state.encounter];for(const[k,id]of[['source','#rulesSource'],['assume','#rulesAssume'],['gap','#rulesGap']])$(id).replaceChildren(...[...e[k],...c[k]].map(x=>el('li',{},x)))}
let previewUrls=[];
function captureImages(files){const images=[...files].filter(f=>f.type.startsWith('image/'));if(!images.length)return;previewUrls.forEach(URL.revokeObjectURL);previewUrls=images.map(f=>URL.createObjectURL(f));$('#importer').open=true;
  $('#statPreviews').replaceChildren(...images.map((f,i)=>el('figure',{},el('img',{src:previewUrls[i],alt:`Stat screen ${i+1}`}),el('figcaption',{},f.name||`Pasted image ${i+1}`))));
  $('#status').textContent=`${images.length} screenshot${images.length===1?'':'s'} added as one import batch. Automatic reading isn't connected — enter the values in the party boxes.`}
$('#statImage').onchange=e=>captureImages(e.target.files);
document.addEventListener('paste',e=>{const files=[...(e.clipboardData?.files||[])];if(files.some(f=>f.type.startsWith('image/')))captureImages(files)});

const DIMS=[['Target choice','focus one enemy'],['Healing','late; careful in boss fights (Cook < 60%, snacks < 35%)'],['Life Jam','only when 2+ friends are Toast'],['Juice','mostly ignored'],['Items','hoarded outside bosses'],['Energy','saved for Release Energy in bosses'],['Omori','Stab whenever Juice ≥ 13'],['Aubrey','Headbutt often while Heart > 55%'],['Emotions','knows effects, not matchups'],['Speed order','ignored']];
$('#dims').replaceChildren(...DIMS.map(([k,v])=>el('li',{},el('span',{},k),el('span',{},v))));
$('#profilePrompt').value='They understand what each emotion does, but not which emotion beats which or the advanced tiers. They ignore speed order and Juice, focus one target, and race the enemy. In boss fights they get careful: Hero uses Cook around 60% Heart and snacks come out around 35%. Life Jam only when more than one friend is Toast. In bosses they save Energy for Omori\'s Release Energy. Omori uses Stab whenever he can afford it; Aubrey Headbutts often if she has Heart to spare. They repeat familiar actions and go into bosses without preparing.';
$('#interpretProfile').onclick=async()=>{const b=$('#interpretProfile'),st=$('#profileStatus');b.disabled=true;st.textContent='Sending the description to the calibration service…';
  try{const res=await fetch('/api/calibrate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:$('#profileModel').value,reasoning_effort:$('#profileEffort').value,description:$('#profilePrompt').value,current_profile:Object.fromEntries(DIMS)})});
    if(!res.ok)throw new Error(res.status===404?'The calibration service is not connected in this build.':`The calibration service returned ${res.status}.`);
    const patch=await res.json();$('#profilePatch').replaceChildren(el('pre',{},JSON.stringify(patch,null,2)));st.textContent='Review the proposed changes and their confidence before applying them.'}
  catch(e){st.textContent=`${e.message||'The calibration service could not be reached.'} No model was called and the profile is unchanged.`;$('#profilePatch').replaceChildren()}
  finally{b.disabled=false}};
function obsList(){try{return JSON.parse(localStorage.getItem('omori-observations')||'[]')}catch{return[]}}
$('#obsSave').onclick=()=>{const text=$('#obsText').value.trim();if(!text)return;const list=[...obsList(),{text,at:new Date().toISOString()}];let saved=true;try{localStorage.setItem('omori-observations',JSON.stringify(list))}catch{saved=false}
  $('#obsText').value='';$('#obsStatus').textContent=saved?`Saved. ${list.length} observation${list.length===1?'':'s'} stored in this browser.`:'This browser blocked local storage, so the observation was not saved.'};

/* ---------------- wiring ---------------- */
$('#run').onclick=run;
['inventory','headbutt'].forEach(id=>$(`#${id}`).addEventListener('change',markStale));
['poolSize','marketOdds','bankroll','belief','kellyFraction'].forEach(id=>$(`#${id}`).addEventListener('input',updateKelly));
$('#scenarioPolicy').replaceChildren(...['custom','suboptimal','decent','best'].map(k=>el('option',{value:k},POLICY_NAMES[k])));
$('#rollScenario').onclick=roll;$('#rerollScenario').onclick=()=>{$('#scenarioSeed').value=(+$('#scenarioSeed').value||0)+1;roll()};
let resizeT;addEventListener('resize',()=>{clearTimeout(resizeT);resizeT=setTimeout(()=>{if(state.results){drawRuler();drawEnds()}},120)});

function registerTools(){const c=document.modelContext;if(!c?.registerTool)return;const add=t=>Promise.resolve(c.registerTool(t)).catch(()=>{});
  add({name:'configure_battle',title:'Configure battle',description:'Set the encounter, battles per policy, party levels, snacks, and Headbutt availability.',inputSchema:{type:'object',properties:{encounter:{type:'string',enum:Object.keys(ENCOUNTERS)},trials:{type:'integer',enum:[1000,5000,10000]},levels:{type:'object',properties:{omori:{type:'integer',minimum:1,maximum:50},aubrey:{type:'integer',minimum:1,maximum:50},kel:{type:'integer',minimum:1,maximum:50},hero:{type:'integer',minimum:1,maximum:50}},additionalProperties:false},inventory:{type:'string',enum:['standard','lean','none']},headbutt:{type:'boolean'}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},
    execute:async x=>{if(x.encounter){state.encounter=x.encounter;renderEncounters();renderRules()}if(x.trials)$('#trials').value=x.trials;if(x.levels){state.levels={...state.levels,...x.levels};renderParty()}if(x.inventory)$('#inventory').value=x.inventory;if(typeof x.headbutt==='boolean')$('#headbutt').checked=x.headbutt;markStale();return setup()}});
  add({name:'run_battle_simulation',title:'Run battle simulation',description:'Run all four policies with the current setup and return win rates.',inputSchema:{type:'object',properties:{seed:{type:'integer',minimum:1}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},
    execute:async x=>{if(x.seed)$('#seed').value=x.seed;await run();return state.results.list.map(({key,name,rate,ci,medianTurns})=>({key,name,rate,ci,medianTurns}))}})}

renderEncounters();renderParty();renderRules();renderPresets();updateKelly();registerTools();roll();run();

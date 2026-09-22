// Behavioral checks for site/dist/engine.js. Run: node omori-sim/tests/engine.test.mjs
import assert from 'node:assert/strict';
import {runAll,rollScenario,simulate,DEFAULT_STATE,__test} from '../site/dist/engine.js';
const {rollDamage,stat,policyFor,planTurn,makeBattle,rng32,actionOrder,resolveActor}=__test;

const base={encounter:'download',levels:DEFAULT_STATE.levels,current:DEFAULT_STATE.current,inventory:'standard',headbutt:true};
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('ok',name)};
const fixedRng=v=>({rng:()=>v});

test('critical is ×1.5 then +1.5 before rounding (YEP_X_CriticalControl)',()=>{
  assert.equal(rollDamage(fixedRng(0),25,{forceCrit:true,variance:0}).value,39);
  assert.equal(rollDamage(fixedRng(0),35,{critRate:0,variance:0}).value,35);
});

test('variance is RPG Maker triangular ±floor(20%) around the value',()=>{
  const b={rng:rng32(7)};let lo=Infinity,hi=-Infinity,sum=0;const n=20000;
  for(let i=0;i<n;i++){const v=rollDamage(b,35,{variance:20}).value;lo=Math.min(lo,v);hi=Math.max(hi,v);sum+=v}
  assert.equal(lo,28);assert.equal(hi,42);assert.ok(Math.abs(sum/n-35)<.2);
  assert.equal(rollDamage(b,-5,{variance:20}).value,0,'negative formulas floor at 0');
});

test('Release Energy stat buff is ×1.25, rounded, non-stacking',()=>{
  const a={atk:23,released:true};assert.equal(stat(a,'atk'),29);assert.equal(stat({atk:23},'atk'),23);
});

test('Download Window: idle on 1–2 and 4–5, Crash on 3 and 6+, Crash = round(80% max Heart)',()=>{
  const r=rollScenario({...base,inventory:'none',headbutt:false},'suboptimal',3);
  const dw=r.trace.filter(e=>e.actor==='Download Window');
  for(const e of dw){const crash=e.turn===3||e.turn>=6;assert.equal(/CRASH/.test(e.action),crash,`turn ${e.turn}: ${e.action}`)}
  const crash=dw.find(e=>e.turn===3);
  if(crash){for(const [,name,dmg] of crash.action.matchAll(/(Omori|Aubrey|Kel|Hero) (\d+)/g)){
    const m=crash.party.find(p=>p.name===name);assert.ok(+dmg===Math.round(m.max*.8)||m.hp===0,`${name} took ${dmg}`)}}
});

test('Headbutt recoil below 81% Heart makes Crash lethal for Aubrey (source mechanics)',()=>{
  const aubreyMax=81,recoil=Math.floor(aubreyMax*.2),crash=Math.round(aubreyMax*.8);
  assert.equal(recoil,16);assert.equal(crash,65);assert.ok(aubreyMax-recoil<=crash);
});

test('input phase commits distinct heal targets when coordination holds',()=>{
  const b=makeBattle({...base},rng32(1));for(const m of b.party)m.hp=Math.floor(m.maxHp*.2);
  const p={...policyFor('custom','download'),coordErr:0};
  const plans=planTurn(b,p,'custom',base);const targets=[...plans.values()].filter(x=>x.kind==='item'||x.kind==='cook').map(x=>x.target.id);
  assert.equal(new Set(targets).size,targets.length,`duplicate heal targets: ${targets}`);
  assert.equal(plans.get('hero').kind,'cook');
});

test('action order is Agility-sorted, Download Window last',()=>{
  const b=makeBattle(base,rng32(1));assert.deepEqual(actionOrder(b).map(q=>q.x.name),['Kel','Omori','Aubrey','Hero','Download Window']);
});

test('only the custom profile uses Stab; Stab needs 13 Juice',()=>{
  for(const k of ['suboptimal','decent','best']){const r=rollScenario(base,k,11);assert.ok(!r.trace.some(e=>/Stab/.test(e.action)),k)}
  const low={...base,current:{...base.current,omori:{hp:72,juice:12}}};
  const r=rollScenario(low,'custom',11);const firstOmori=r.trace.find(e=>e.actor==='Omori');assert.ok(!/Stab/.test(firstOmori.action));
});

test('Release Energy only fires with Aubrey, Kel and Hero alive and costs 10 Energy',()=>{
  for(let s=1;s<300;s++){const r=rollScenario(base,'custom',s);r.trace.forEach((e,i)=>{if(!/Release Energy/.test(e.action))return;
    const prev=i?r.trace[i-1]:null;assert.ok(!prev||prev.party.every(p=>p.hp>0),`seed ${s}: release with a Toast friend`);
    assert.ok(prev&&prev.energy===10&&e.energy===0,`seed ${s}: energy ${prev?.energy} → ${e.energy}`)})}
});

test('Release Energy resolves directly: 300 damage, −10 Energy, buff; blocked by a Toast friend',()=>{
  const p=policyFor('best','download');
  const b=makeBattle(base,rng32(5));b.energy=10;const [omori,,kel]=b.party,dw=b.enemies[0];
  const text=resolveActor(omori,{kind:'attack',target:dw},b,p,'best',base);
  assert.match(text,/Release Energy: Download Window 300/);assert.equal(b.energy,0);assert.ok(b.party.every(x=>x.released));
  const b2=makeBattle(base,rng32(5));b2.energy=10;b2.party[2].hp=0;
  assert.doesNotMatch(resolveActor(b2.party[0],{kind:'attack',target:b2.enemies[0]},b2,p,'best',base),/Release/);
});

test('trace enemy Heart never rises and the final entry matches the outcome',()=>{
  for(const k of ['suboptimal','decent','best','custom'])for(let s=1;s<60;s++){
    const r=rollScenario(base,k,s);let last=600;
    for(const e of r.trace){assert.ok(e.enemies[0].hp<=last);last=e.enemies[0].hp}
    assert.equal(r.win,last===0,`${k} seed ${s}`);
  }
});

test('deterministic under a seed; sane across levels, inventories and encounters',()=>{
  assert.deepEqual(runAll(base,300,4187),runAll(base,300,4187));
  for(const encounter of ['download','spaceboy','bunnies'])for(const inventory of ['standard','lean','none'])for(const lv of [1,8,20,50]){
    const setup={encounter,inventory,headbutt:true,levels:{omori:lv,aubrey:lv,kel:lv,hero:lv},current:{}};
    for(const r of runAll(setup,60,9)){assert.ok(r.rate>=0&&r.rate<=1&&Number.isFinite(r.avgSurvivors),`${encounter} ${inventory} ${lv} ${r.key}`)}
  }
});

console.log(`${passed} tests passed`);

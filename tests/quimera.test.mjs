import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tsModuleUrl} from './ts-module.mjs';
const load=path=>import(tsModuleUrl(new URL(path,import.meta.url)));
const {QuimeraController}=await load('../src/entities/boss/QuimeraController.ts');
const {QuimeraConfig:config}=await load('../src/config/QuimeraConfig.ts');
const {robotAttacks}=await load('../src/config/RobotConfig.ts');
const {levels}=await load('../src/levels/levels.ts');
const {arcadeRooms}=await load('../src/data/rooms/arcadeRooms.ts');
const {validateLevelCatalog}=await load('../src/levels/validateLevelConfig.ts');
const from={x:1280,y:768},target={x:1420,y:768};
const step=(boss,delta=50,los=true,to=target)=>boss.update(delta,from,to,los);
const until=(boss,predicate,los=true)=>{for(let i=0;i<3000;i++){if(predicate())return;step(boss,50,los);}throw Error('Boss controller timeout');};
const ready=()=>{const boss=new QuimeraController();step(boss,config.introMs);return boss;};

test('provided source has actual inspected dimensions and RGBA format',()=>{
    const png=readFileSync('public/assets/sprites/enemies/RobotQuimera.png');
    assert.equal(png.readUInt32BE(16),1024);assert.equal(png.readUInt32BE(20),1536);assert.equal(png[25],6);
});
test('intro is brief, cannot emit or take damage; normal combat accepts damage',()=>{
    const boss=new QuimeraController();assert.equal(boss.damage(10),0);
    assert.deepEqual(step(boss,1499),{shots:[],pulse:false});step(boss,1);
    assert.equal(boss.state,'REPOSITION');assert.equal(boss.damage(config.normalDamage),config.normalDamage);
});
test('phase thresholds activate at safe boundaries without reversing or interrupting attacks',()=>{
    const boss=ready();until(boss,()=>boss.state==='ATTACKING'&&boss.attack==='burst');
    boss.damage(37);assert.equal(boss.phase,1);assert.equal(boss.state,'ATTACKING');
    until(boss,()=>boss.phase===2);assert.equal(boss.state,'PHASE_TRANSITION');
    until(boss,()=>boss.state==='REPOSITION');boss.damage(25);
    step(boss);assert.equal(boss.phase,2);until(boss,()=>boss.state==='REPOSITION');
    for(let i=0;i<100;i++)step(boss);assert.equal(boss.phase,2);
});
test('recovery is a bonus damage window, not permanent invulnerability',()=>{
    const boss=ready();assert.equal(boss.damage(2),2);
    until(boss,()=>boss.state==='RECOVERING');assert.equal(boss.damage(2),3);
    assert.equal(step(boss,config.recoveryMs[0]-1).shots.length,0);assert.equal(boss.state,'RECOVERING');
});
test('directed and short burst patterns warn first, use fixed aim and bounded cadence',()=>{
    const boss=ready();until(boss,()=>boss.state==='CHARGING');
    assert.equal(step(boss,config.warningMs.aim-1).shots.length,0);
    const single=step(boss,1);assert.equal(single.shots.length,1);assert.equal(single.shots[0].piercesInteriorWalls,false);
    until(boss,()=>boss.state==='CHARGING'&&boss.attack==='burst');
    const first=step(boss,config.warningMs.burst);assert.equal(first.shots.length,1);
    assert.equal(step(boss,config.shortBurstDelay-1).shots.length,0);
    const second=step(boss,1,true,{x:1280,y:900});assert.deepEqual(second.shots[0].direction,first.shots[0].direction);
    const third=step(boss,config.shortBurstDelay);assert.equal(third.shots.length,1);assert.equal(boss.state,'RECOVERING');
});
test('pulse exposes its exact radius before a single damage event',()=>{
    const boss=ready();boss.damage(22);until(boss,()=>boss.attack==='pulse'&&boss.state==='CHARGING');
    assert.equal(boss.pulseWarning,true);assert.equal(step(boss,config.warningMs.pulse-1).pulse,false);
    assert.equal(step(boss,1).pulse,true);assert.equal(step(boss).pulse,false);
    assert.ok(config.warningMs.pulse/1000*220>config.pulseRadius);
});
for(const module of config.modules)test(`${module}: experimental module reuses its real cadence, count, speed and wall rules`,()=>{
    const boss=ready();boss.damage(22);until(boss,()=>boss.attack==='module'&&boss.module===module&&boss.state==='CHARGING');
    const expected={...robotAttacks[module],projectileSpeed:robotAttacks[module].projectileSpeed*boss.tactics.moduleSpeedMultiplier,chargeDuration:(robotAttacks[module].chargeDuration??0)*boss.tactics.moduleTimingMultiplier},shots=[];
    const warning=module==='robot-orange'?expected.chargeDuration:config.warningMs.module;
    assert.equal(step(boss,warning-1).shots.length,0);shots.push(...step(boss,1).shots);
    while(boss.state==='ATTACKING')shots.push(...step(boss,50).shots);
    assert.equal(shots.length,module==='robot-blue'?5:module==='robot-orange'?6:module==='robot-yellow'?3:1);
    assert.ok(shots.every(shot=>shot.speed===expected.projectileSpeed&&shot.attackType===expected.type&&shot.piercesInteriorWalls===expected.piercingWalls));
    if(module==='robot-orange')assert.ok(Math.abs(Math.atan2(shots[0].direction.y,shots[0].direction.x)*180/Math.PI+20)<.0001);
});
test('blue module cancels pending burst on lost sight; only orange can fire through cover',()=>{
    const boss=ready();boss.damage(22);until(boss,()=>boss.attack==='module'&&boss.module==='robot-blue'&&boss.state==='CHARGING');
    assert.equal(step(boss,config.warningMs.module).shots.length,1);
    assert.equal(step(boss,200,false).shots.length,0);assert.equal(boss.state,'RECOVERING');
    until(boss,()=>boss.attack==='module'&&boss.module==='robot-orange'&&boss.state==='CHARGING');
    assert.equal(step(boss,boss.moduleAttack.config.chargeDuration-1,false).shots.length,0);assert.equal(step(boss,1,false).shots.length,6);
});
test('yellow does not fire beyond its short range or stay in an endless pursuit',()=>{
    const boss=ready();boss.damage(22);until(boss,()=>boss.attack==='module'&&boss.module==='robot-yellow'&&boss.state==='CHARGING');
    assert.equal(step(boss,650,true,{x:1650,y:768}).shots.length,0);
    assert.equal(step(boss,4000,true,{x:1650,y:768}).shots.length,0);assert.equal(boss.state,'RECOVERING');
});
test('orange charge cancels if the player leaves module range',()=>{
    const boss=ready();boss.damage(22);until(boss,()=>boss.attack==='module'&&boss.module==='robot-orange'&&boss.state==='CHARGING');
    assert.equal(step(boss,1000,false,{x:2200,y:768}).shots.length,0);assert.equal(boss.state,'RECOVERING');
});
test('critical discharge preserves a visible safe sector; combined patterns leave a warned gap',()=>{
    const boss=new QuimeraController('advanced');step(boss,config.introMs);boss.damage(boss.config.maxHealth*.7);until(boss,()=>boss.attack==='critical'&&boss.state==='CHARGING');
    const angle=boss.aim;assert.equal(step(boss,boss.config.warningMs.critical-1).shots.length,0);
    const critical=step(boss,1).shots;assert.ok(critical.length>=8);
    for(const shot of critical){const difference=Math.atan2(Math.sin(Math.atan2(shot.direction.y,shot.direction.x)-angle),Math.cos(Math.atan2(shot.direction.y,shot.direction.x)-angle));assert.ok(Math.abs(difference)>=Math.PI/6-.00001);}
    assert.equal(boss.state,'RECOVERING');
    until(boss,()=>boss.attack==='combined'&&boss.state==='CHARGING');
    assert.equal(step(boss,boss.config.warningMs.combined).shots.length,7);assert.equal(boss.charging,true);
    assert.equal(step(boss,boss.config.combinedDelay-1).shots.length,0);assert.equal(step(boss,1).shots.length,1);assert.equal(boss.state,'RECOVERING');
});
test('no update on pause advances charge; large frames never accumulate infinite emissions',()=>{
    const boss=ready();until(boss,()=>boss.state==='CHARGING');const snapshot=JSON.stringify(boss);
    for(const delta of [0,-1,NaN,Infinity])assert.equal(step(boss,delta).shots.length,0);
    assert.equal(JSON.stringify(boss),snapshot);assert.ok(step(boss,100000).shots.length<=6);
});
test('a boss outside the visible viewport cannot fire an unseen charged attack',()=>{
    const boss=ready();until(boss,()=>boss.state==='CHARGING');
    assert.deepEqual(boss.update(1000,from,target,true,false),{shots:[],pulse:false});assert.equal(boss.state,'RECOVERING');
});
test('death and stop cancel every future action and reject duplicate or invalid damage',()=>{
    for(const kill of [true,false]){
        const boss=ready();until(boss,()=>boss.state==='CHARGING');
        for(const amount of [0,-1,NaN,Infinity])assert.equal(boss.damage(amount),0);
        if(kill){boss.damage(999);boss.resolveFinisher(false);boss.damage(999);assert.equal(boss.state,'DEAD');assert.equal(boss.damage(999),0);}else boss.stop();
        assert.deepEqual(step(boss,100000),{shots:[],pulse:false});
    }
});
test('special damage is bounded and normal shots alone can finish the encounter',()=>{
    const boss=ready();assert.ok(config.specialDamage.alex<config.maxHealth/2&&config.specialDamage.lua<config.maxHealth/2);
    let hits=0;while(boss.alive&&hits<50){boss.damage(config.normalDamage);if(boss.state==='QTE')boss.resolveFinisher(false);hits++;}
    assert.equal(hits,36);assert.equal(boss.health,0);
});
for(const [name,mutate]of [
    ['boss outside final level',catalog=>{catalog[0].boss=catalog[4].boss;}],
    ['boss over machinery',catalog=>{catalog[4].boss.spawn={row:3,column:8};}],
    ['boss alongside normal waves',catalog=>{catalog[4].waves=catalog[0].waves;}],
    ['unavailable boss arena',catalog=>{catalog[4].availability='reserved';}]
])test(`catalog rejects ${name}`,()=>{const catalog=structuredClone(levels);mutate(catalog);assert.ok(validateLevelCatalog(catalog,arcadeRooms).length>0);});

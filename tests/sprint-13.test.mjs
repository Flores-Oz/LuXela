import test from 'node:test';
import assert from 'node:assert/strict';
import {tsModuleUrl} from './ts-module.mjs';
const load=path=>import(tsModuleUrl(new URL(path,import.meta.url)));
const {QuimeraController}=await load('../src/entities/boss/QuimeraController.ts');
const {robotAttacks,redRobotRangeMultiplier,robotMovementScale}=await load('../src/config/RobotConfig.ts');
const {EnemyAttackController}=await load('../src/entities/enemies/EnemyAttackController.ts');
const {safeTeleportDestination}=await load('../src/entities/boss/BossTeleportGeometry.ts');
const {CombatObservation}=await load('../src/entities/boss/CombatObservation.ts');
const {BossTacticsConfig}=await load('../src/config/BossTacticsConfig.ts');
const from={x:500,y:500},target={x:850,y:500};
const update=(c,delta=25,to=target,context={})=>c.update(delta,from,to,true,true,context);
const until=(c,predicate,to=target)=>{for(let i=0;i<10000;i++){if(predicate())return;update(c,25,to);}throw Error(`Timeout ${c.phase}/${c.state}/${c.attack}`);};
test('red gets 25% range and enough flight time, with its old cadence and speed',()=>{
    const r=robotAttacks['robot-red'];assert.equal(redRobotRangeMultiplier,1.25);assert.equal(r.attackRange,750);
    assert.equal(r.projectileSpeed,300);assert.equal(r.attackInterval,1500);assert.equal(robotMovementScale['robot-red'],1);
    assert.ok(r.projectileLifetimeMs/1000*r.projectileSpeed>=r.attackRange);
    const c=new EnemyAttackController(r);assert.equal(c.update(0,true,from,target).length,1);assert.equal(c.update(1499,true,from,target),null);assert.equal(c.update(1500,false,from,target),null);
});
test('other three robot configurations keep all their exact pre-sprint timings and mechanics',()=>{
    assert.deepEqual(robotAttacks['robot-blue'],{type:'burst',projectileSpeed:350,attackInterval:2000,attackRange:420,piercingWalls:false,burstCount:5,burstDelay:200});
    assert.deepEqual(robotAttacks['robot-yellow'],{type:'rapid',projectileSpeed:400,attackInterval:800,attackRange:160,piercingWalls:false});
    assert.deepEqual(robotAttacks['robot-orange'],{type:'piercing-spread',projectileSpeed:320,attackInterval:2500,attackRange:600,piercingWalls:true,chargeDuration:1000,recoveryDuration:2500,spreadAngle:20,spreadCount:6});
});
for(const [mode,thresholds]of [['trial',[.5]],['advanced',[.7,.35]]])test(`${mode}: exact thresholds stay in the old phase; crossing changes once without healing`,()=>{
    const c=new QuimeraController(mode);assert.equal(c.config.phasePatterns.length,thresholds.length+1);
    update(c,1500);let phase=1;
    for(const threshold of thresholds){
        until(c,()=>c.state==='REPOSITION');c.health=c.config.maxHealth*threshold;update(c);assert.equal(c.phase,phase);
        c.health-=.01;const health=c.health;until(c,()=>c.phase===phase+1);assert.equal(c.health,health);assert.equal(c.state,'PHASE_TRANSITION');phase++;
        const start=c.stateStartedAt;update(c,100);assert.equal(c.stateStartedAt,start);
    }
});
test('stationary final player gets an area fixed to its observed location, with a full warning',()=>{
    const c=new QuimeraController('advanced');c.health=60;
    until(c,()=>c.state==='CHARGING'&&c.attack==='target-area');const locked={...c.warningTarget},health=c.health;
    assert.equal(update(c,c.config.warningMs['target-area']-1,{x:1100,y:900}).area,undefined);
    assert.deepEqual(update(c,1,{x:1100,y:900}).area,locked);assert.equal(c.state,'RECOVERING');assert.equal(c.health,health);
    assert.equal(update(c,900).area,undefined);assert.equal(c.state,'RECOVERING');
    for(let i=0;i<20;i++)assert.equal(update(c).area,undefined);
});
test('close final player causes a warned defensive shockwave instead of continuous contact punishment',()=>{
    const c=new QuimeraController('advanced');c.health=60;
    until(c,()=>c.state==='RECOVERING');
    until(c,()=>c.attack==='shockwave'&&c.state==='CHARGING',{x:650,y:500});
    assert.ok(!update(c,c.config.warningMs.shockwave-1,{x:650,y:500}).shockwave);assert.ok(update(c,1,{x:650,y:500}).shockwave);
    assert.ok(!update(c,1200,{x:650,y:500}).shockwave);assert.equal(c.state,'RECOVERING');
});
test('regional observation catches small circling and only predicts consistent actual movement',()=>{
    const o=new CombatObservation();for(let i=0;i<50;i++)o.update(50,{x:500+Math.sin(i)*20,y:500+Math.cos(i)*20});assert.ok(o.stationaryMs>=1800);
    const moving=new CombatObservation();for(let i=0;i<30;i++)moving.update(50,{x:i*11,y:0});assert.ok(moving.consistentDirectionMs>=900);
    const p=moving.predict({x:319,y:0});assert.ok(p.x>319&&p.x<=389&&p.y===0);
    moving.update(50,{x:308,y:0});assert.ok(moving.consistentDirectionMs<100);
    moving.update(1,{x:10000,y:10000});assert.equal(moving.consistentDirectionMs,0);assert.deepEqual(moving.velocity,{x:0,y:0});
});
test('observation and locked warnings read Player-style position getters instead of spreading the entity',()=>{
    class Position {value=800;get x(){return this.value;}get y(){return 500;}}
    const player=new Position(),o=new CombatObservation();for(let i=0;i<30;i++){player.value+=5;o.update(25,player);}
    assert.ok(Number.isFinite(o.velocity.x)&&o.velocity.x>0);assert.ok(o.consistentDirectionMs>=700);
    const c=new QuimeraController('advanced');c.health=60;
    until(c,()=>c.state==='CHARGING'&&c.attack==='target-area',player);
    assert.deepEqual(c.warningTarget,{x:player.x,y:player.y});assert.deepEqual(Object.keys(c.warningTarget).sort(),['x','y']);
});
test('moving-player prediction is locked during warning and does not track after firing',()=>{
    const c=new QuimeraController('advanced');c.health=60;let warned=false,angle=0;
    for(let i=0;i<3000;i++){
        const p={x:800+i*5.5,y:600},origin={x:p.x-350,y:400};c.update(25,origin,p,true);
        if(c.attack==='aim'&&c.state==='CHARGING'){
            const prediction=c.observation.predict(p);angle=Math.atan2(prediction.y-origin.y,prediction.x-origin.x);
            assert.ok(Math.abs(c.aim-angle)<1e-8);warned=true;
            const frame=c.update(c.config.warningMs.aim,origin,{x:p.x,y:1000},true);assert.equal(frame.shots.length,1);
            assert.ok(Math.abs(Math.atan2(frame.shots[0].direction.y,frame.shots[0].direction.x)-angle)<1e-8);break;
        }
    }
    assert.ok(warned);
});
test('teleport has its own warning, no damage on arrival, cooldown and another full attack warning',()=>{
    const c=new QuimeraController();update(c,1500);
    let frame=update(c,1100,{x:1250,y:500},{teleportAvailable:true});assert.ok(frame.teleportStart);assert.equal(c.state,'TELEPORTING');
    assert.equal(c.damage(10),0);assert.equal(update(c,899).shots.length,0);frame=update(c,1);assert.ok(frame.teleportEnd);assert.equal(frame.shots.length,0);
    update(c,c.tactics.postTeleportMs);assert.equal(c.state,'CHARGING');assert.equal(update(c,c.config.warningMs.aim-1).shots.length,0);assert.equal(update(c,1).shots.length,1);
    assert.ok(c.nextTeleportAt>c.time);
});
test('only final phase three can select overload; sequences never overlap an active ring',()=>{
    for(const mode of ['trial','advanced']){
        const c=new QuimeraController(mode);c.health=mode==='advanced'?25:30;const areaTimes=[],volleyTimes=[];
        for(let i=0;i<6000;i++){
            const f=update(c);if(c.attack==='overload')assert.fail('composite must resolve to existing stages');
            if(f.area)areaTimes.push(c.time);if(f.shots.length)volleyTimes.push(c.time);
            if(mode==='trial')assert.equal(f.area,undefined);
        }
        if(mode==='advanced'){assert.ok(areaTimes.length);for(const at of areaTimes)assert.ok(!volleyTimes.some(time=>time>=at&&time<at+900));}
    }
});
test('teleport geometry rejects walls, cover, viewport edges and occupied or nearby destinations',()=>{
    const p={x:600,y:500},player={x:100,y:500},origin={x:1000,y:500},view={x:0,y:0,width:1200,height:1000},half={x:58,y:64};
    const safe=(point=p,walls=[],occupied=[])=>safeTeleportDestination(point,player,origin,walls,occupied,view,half);
    assert.ok(safe());assert.equal(safe({x:90,y:500}),false);assert.equal(safe({x:1050,y:500}),false);
    assert.equal(safe(p,[{x:570,y:480,width:64,height:64}]),false);
    assert.equal(safe(p,[{x:300,y:480,width:64,height:64}]),false);
    assert.equal(safe(p,[],[{x:620,y:500}]),false);
    assert.equal(safe({x:600,y:30}),false);
});
test('both encounters retain positive recoveries and distinct reinforcement limits',()=>{
    for(const mode of ['trial','advanced']){const c=new QuimeraController(mode);assert.ok(c.config.recoveryMs.every(ms=>ms>=800));assert.ok(c.tactics.comboRecoveryMs>=450);}
    assert.equal(BossTacticsConfig.trial.summons.maxActive,2);assert.equal(BossTacticsConfig.advanced.summons.maxActive,6);
});
test('aggressive boss tuning speeds attacks and final teleports with more final health while preserving normal robot speeds',()=>{
    const trial=new QuimeraController(),final=new QuimeraController('advanced');
    assert.equal(trial.health,72);assert.equal(final.health,144);
    assert.deepEqual(trial.config.projectileSpeed,[330,360]);assert.deepEqual(final.config.projectileSpeed,[420,435,450]);
    assert.equal(final.config.shortBurstDelay,130);assert.equal(final.config.warningMs.beam,650);
    assert.equal(final.tactics.teleportWarningMs,550);assert.deepEqual(final.tactics.teleportCooldownMs,[4000,3500,2500]);
    assert.equal(trial.tactics.teleportWarningMs,900);assert.equal(robotAttacks['robot-blue'].burstDelay,200);
    assert.equal(robotAttacks['robot-orange'].chargeDuration,1000);assert.equal(robotAttacks['robot-yellow'].attackInterval,800);
});

test('trial has new patterns and final barrage completes four separately warned burst stages',()=>{
    const trial=new QuimeraController();
    assert.ok(trial.config.phasePatterns[0].includes('alternating'));
    assert.ok(trial.config.phasePatterns[0].includes('beam'));
    assert.ok(trial.config.phasePatterns[1].includes('cross-burst'));
    const c=new QuimeraController('advanced');
    c.selectAttack=()=> 'barrage';
    const warnings=[],shots=[];let lastStart=-1;
    for(let i=0;i<1200;i++){
        const f=update(c);
        if(c.state==='CHARGING'&&c.stateStartedAt!==lastStart){warnings.push(c.attack);lastStart=c.stateStartedAt;}
        shots.push(...f.shots);
        if(warnings.length===4&&c.state==='RECOVERING'&&c.comboQueue.length===0)break;
    }
    assert.deepEqual(warnings,['burst','cross-burst','burst','cross-burst']);
    assert.equal(shots.length,36);assert.ok(shots.every(s=>!s.piercesInteriorWalls));
    assert.equal(c.tactics.volleyDelayMs,130);
    const types=c.tactics.summons.types;
    assert.deepEqual(types,['robot-red','robot-blue','robot-orange']);
    assert.equal(c.tactics.summons.replaceOnClear,true);
    c.stop();assert.equal(update(c,10000).shots.length,0);
});

test('final starts at full strength with six supports and an opening barrage before any health loss',()=>{
    const c=new QuimeraController('advanced');
    assert.equal(c.health,144);assert.equal(c.tactics.summons.fromPhase,1);
    assert.equal(c.tactics.summons.batch,6);assert.equal(c.tactics.reactiveFromPhase,1);
    update(c,c.config.introMs);update(c,1000);
    assert.equal(c.phase,1);assert.equal(c.health,c.config.maxHealth);
    assert.equal(c.state,'CHARGING');assert.equal(c.attack,'burst');
    assert.deepEqual(c.comboQueue,['cross-burst','burst','cross-burst']);
    assert.ok(c.config.phasePatterns[0].includes('arsenal'));
    assert.ok(c.config.phasePatterns[0].includes('beam-chain'));
});

test('final fires two separately aimed beams with shorter full warnings and no overlapping damage',()=>{
    const c=new QuimeraController('advanced');c.selectAttack=()=> 'beam-chain';
    until(c,()=>c.state==='CHARGING');assert.equal(c.attack,'beam');
    const firstAim=c.aim;
    assert.ok(!update(c,649).beam);const first=update(c,1);assert.ok(first.beam);
    const fired=c.time;assert.equal(c.state,'RECOVERING');
    assert.ok(!update(c,799,{x:800,y:800}).beam);assert.equal(c.state,'RECOVERING');
    update(c,1,{x:800,y:800});assert.equal(c.state,'CHARGING');assert.equal(c.attack,'beam');assert.notEqual(c.aim,firstAim);
    assert.ok(!update(c,649,{x:800,y:800}).beam);assert.ok(update(c,1,{x:800,y:800}).beam);
    assert.ok(c.time-fired>=1450);assert.equal(c.comboQueue.length,0);
    assert.equal(new QuimeraController().config.warningMs.beam,1100);
    for(const phase of c.config.phasePatterns)assert.ok(phase.includes('beam-chain'));
});

import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {tsModuleUrl} from './ts-module.mjs';
const load=path=>import(tsModuleUrl(new URL(path,import.meta.url)));
const {levels}=await load('../src/levels/levels.ts');
const {arcadeRooms,createArcadeRooms}=await load('../src/data/rooms/arcadeRooms.ts');
const {createLevelCatalog}=await load('../src/levels/levels.ts');
const {validateLevelCatalog}=await load('../src/levels/validateLevelConfig.ts');
const {QuimeraController}=await load('../src/entities/boss/QuimeraController.ts');
const {QuimeraAdvancedConfig,AdvancedCombat}=await load('../src/config/QuimeraAdvancedConfig.ts');
const {CombatObservation}=await load('../src/entities/boss/CombatObservation.ts');
const {beamHits,clippedRayLength,ringHits}=await load('../src/entities/boss/BossAttackGeometry.ts');
const {ArcadeRunService}=await load('../src/systems/ArcadeRunService.ts');
const {quimeraIntros}=await load('../src/narrative/routes/quimeraIntro.ts');
test('advanced sectors keep high pressure and the opening sectors increase challenge',()=>{
    for(const [index,oldCount]of [6,8,10,12].entries())assert.ok(levels[index].enemies.count>=oldCount);
    assert.deepEqual(levels.slice(0,4).map(l=>l.enemies.count),[8,10,12,12]);
    assert.ok(levels.slice(0,4).every(l=>l.difficulty.detectionRange>=520));
    for(const level of levels.slice(5,9)){
        assert.equal(level.waves.length,3);assert.ok(level.enemies.count>=9);
        assert.equal(level.difficulty.moveSpeed,levels[8].difficulty.moveSpeed);
        assert.ok(level.difficulty.detectionRange>=550);
    }
    assert.ok(AdvancedCombat.maxSummons>=6);assert.ok(AdvancedCombat.summonBatch>=3);assert.ok(AdvancedCombat.maxProjectiles>=72);
    assert.ok(QuimeraAdvancedConfig.phasePatterns[3].includes('summon'));
});
test('11 distinct connected large maps and exact advanced robot combinations',()=>{
    assert.equal(levels.length,11);assert.deepEqual(validateLevelCatalog(levels,arcadeRooms),[]);
    assert.equal(new Set(levels.map(l=>l.roomId)).size,11);
    assert.deepEqual(levels.slice(5,10).map(l=>l.enemies.types),[['robot-red','robot-blue'],['robot-yellow','robot-orange'],['robot-red','robot-blue','robot-yellow'],['robot-blue','robot-orange','robot-red'],['robot-red','robot-blue','robot-yellow','robot-orange']]);
    for(const [i,l]of levels.entries()){
        assert.equal(arcadeRooms[l.roomId].length,24);assert.equal(arcadeRooms[l.roomId][0].length,40);assert.equal(l.next,levels[i+1]?.id??null);
        for(const w of l.waves)assert.ok(w.enemies.count<=12);
        const m=arcadeRooms[l.roomId],start=m.flatMap((row,r)=>row.flatMap((t,c)=>t===2?[{r,c}]:[]))[0],seen=new Set([`${start.r},${start.c}`]),queue=[start];
        for(let n=0;n<queue.length;n++)for(const [dr,dc]of [[1,0],[-1,0],[0,1],[0,-1]]){const r=queue[n].r+dr,c=queue[n].c+dc,k=`${r},${c}`;if(m[r]?.[c]!==undefined&&m[r][c]!==1&&!seen.has(k)){seen.add(k);queue.push({r,c});}}
        assert.equal(seen.size,m.flat().filter(t=>t!==1).length,`${l.id} disconnected floor`);
    }
});
test('maps, footprints and spawns remain valid at larger supported dimensions',()=>{for(const [w,h]of [[40,24],[48,28],[60,36]]){const rooms=createArcadeRooms(w,h);assert.deepEqual(validateLevelCatalog(createLevelCatalog(rooms),rooms),[]);}});
test('trial and final reuse one controller with independent health and phase profiles',()=>{
    const first=new QuimeraController(),final=new QuimeraController('advanced');assert.equal(first.health,72);assert.equal(final.health,96);
    const step=c=>c.update(2000,{x:100,y:100},{x:400,y:100},true);
    step(final);for(const [damage,phase]of [[24,2],[24,3],[24,4]]){for(let i=0;i<100&&final.state!=='REPOSITION';i++)step(final);final.damage(damage);for(let i=0;i<100&&final.phase<phase;i++)step(final);assert.equal(final.phase,phase);assert.ok(final.health<=96*.75);}
    assert.equal(first.health,72);assert.equal(QuimeraAdvancedConfig.phasePatterns.length,4);
});
test('advanced patterns are finite, warned, include all new attacks and bounded adaptation',()=>{
    const found=new Set();
    for(const health of [96,70,46,22]){
        const c=new QuimeraController('advanced');c.health=health;
        for(let i=0;i<4000;i++){
            const f=c.update(50,{x:500,y:500},{x:700+Math.sin(i/7)*30,y:650+Math.cos(i/9)*30},true);
            if(c.state==='CHARGING')assert.ok(c.time-c.stateStartedAt>=0);
            for(const key of ['beam','shockwave','summon'])if(f[key])found.add(key);
            assert.ok(f.shots.length<=12);assert.equal(f.shots.some(s=>s.piercesInteriorWalls),false);
            if(f.shots.some(s=>s.originOffset))found.add('alternating');
        }
    }
    assert.deepEqual([...found].sort(),['alternating','beam','shockwave','summon']);
});
test('beam clips to nearest cover and its damage stays inside the visible segment',()=>{
    const origin={x:0,y:0},wall={x:100,y:-20,width:20,height:40};
    assert.equal(clippedRayLength(origin,{x:1,y:0},1500,[wall]),100);
    assert.ok(beamHits(origin,0,100,16,{x:50,y:-5,width:10,height:10}));
    assert.equal(beamHits(origin,0,100,16,{x:130,y:-5,width:10,height:10}),false);
    assert.equal(beamHits(origin,0,100,16,{x:50,y:30,width:10,height:10}),false);
    assert.equal(clippedRayLength(origin,{x:0,y:1},100,[wall]),100);
});
test('shockwave is a growing annulus; center and outside are not invisible damage zones',()=>{
    assert.equal(ringHits({x:0,y:0},100,18,{x:-5,y:-5,width:10,height:10}),false);
    assert.ok(ringHits({x:0,y:0},100,18,{x:95,y:-5,width:10,height:10}));
    assert.equal(ringHits({x:0,y:0},100,18,{x:140,y:-5,width:10,height:10}),false);
    assert.ok(AdvancedCombat.shockwave.radius/(AdvancedCombat.shockwave.activeMs/1000)<220);
});
test('observation uses measured history and clamps lead, rather than perfect future aim',()=>{
    const o=new CombatObservation();for(let i=0;i<30;i++)o.update(100,{x:0,y:0});assert.ok(o.stationaryMs>=1600);
    o.update(1,{x:10000,y:0});const p=o.predict({x:0,y:0});assert.ok(Math.hypot(p.x,p.y)<=70.00001);assert.equal(o.stationaryMs,0);
});
test('campaign cannot finish at first Quimera and only grants completion after all 11 levels',()=>{
    const run=new ArcadeRunService(),id=run.begin('alex');
    for(let i=0;i<11;i++){run.clearRoom(id,i);if(i===4)assert.equal(run.finish(id,i),false);if(i<10)assert.ok(run.advance(id,i));}
    assert.ok(run.finish(id,10));assert.ok(run.canComplete('alex',id));
});
test('intro exact lines belong to both routes and acknowledgement is scoped to final room/run',()=>{
    for(const intro of quimeraIntros)assert.deepEqual(intro.entries.filter(e=>e.type==='dialogue').map(e=>e.text),['Datos obtenidos.','Patrones aprendidos.','Prepárate para el verdadero combate.']);
    const runs=new ArcadeRunService(),id=runs.begin('lua');runs.acknowledgeBossIntro(id);assert.equal(runs.hasBossIntro(id),false);
    for(let i=0;i<10;i++){runs.clearRoom(id,i);runs.advance(id,i);}runs.acknowledgeBossIntro(id);assert.ok(runs.hasBossIntro(id));assert.equal(runs.hasBossIntro(runs.begin('lua')),false);
});
for(const [file,w,h]of [['tilesets/advanced-industrial',512,512],['effects/quimera-core-charge',1024,512],['effects/quimera-projectiles',512,512],['effects/quimera-beam',2048,384],['effects/quimera-shockwave',1024,768],['effects/robot-spawn',1024,768],['bosses/quimera-intro',1920,1080]])test(`${file}: real PNG dimensions match registered frames`,()=>{const png=readFileSync(`public/assets/${file}.png`);assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);});

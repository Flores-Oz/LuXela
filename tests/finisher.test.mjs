import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tsModuleUrl} from './ts-module.mjs';
const load=path=>import(tsModuleUrl(new URL(path,import.meta.url)));
const {QuimeraController}=await load('../src/entities/boss/QuimeraController.ts');
const {FinisherChallenge}=await load('../src/entities/boss/FinisherChallenge.ts');
const ready=()=>{const boss=new QuimeraController();boss.update(1500,{x:0,y:0},{x:100,y:0},true);return boss;};
test('health below ten percent waits for proximity and sight before suppressing combat',()=>{
    const boss=ready();boss.damage(65);assert.equal(boss.health,7);assert.equal(boss.state,'REPOSITION');assert.ok(boss.finisherAvailable);
    assert.equal(boss.tryStartFinisher(161,true),false);assert.equal(boss.tryStartFinisher(100,false),false);
    assert.ok(boss.tryStartFinisher(160,true));assert.equal(boss.state,'QTE');
    assert.equal(boss.damage(99),0);const clock=boss.time;
    assert.deepEqual(boss.update(9999,{x:0,y:0},{x:100,y:0},true),{shots:[],pulse:false});assert.equal(boss.time,clock);
    boss.resolveFinisher(true);assert.equal(boss.state,'FINISHING');assert.equal(boss.damage(99),0);
    assert.ok(boss.completeFinisher());assert.equal(boss.health,0);assert.equal(boss.state,'DEAD');assert.equal(boss.completeFinisher(),false);
});
test('failed finisher resumes combat once; retry creates a fresh opportunity',()=>{
    const boss=ready();boss.damage(64);assert.equal(boss.tryStartFinisher(100,true),false);boss.damage(2);assert.ok(boss.tryStartFinisher(100,true));assert.equal(boss.state,'QTE');
    boss.resolveFinisher(false);assert.equal(boss.state,'RECOVERING');boss.damage(999);assert.equal(boss.state,'DEAD');
    assert.equal(boss.resolveFinisher(true),false);assert.equal(new QuimeraController().finisherTriggered,false);
});
test('exact threshold and lower living health both qualify; lethal hits remain lethal',()=>{
    for(const health of [72*.1,6,1]){const boss=ready();boss.damage(72-health);assert.ok(boss.tryStartFinisher(100,true));assert.ok(Math.abs(boss.health-health)<.00001);}
    const boss=ready();boss.damage(999);assert.equal(boss.state,'DEAD');assert.equal(boss.tryStartFinisher(1,true),false);
});
for(const character of ['alex','lua'])test(`${character}: sequence, held-key rejection, animation clock and one completion`,()=>{
    const challenge=new FinisherChallenge(character,2950);assert.ok(challenge.start());assert.equal(challenge.start(),false);
    assert.equal(challenge.input(challenge.sequence[0],true),false);assert.equal(challenge.step,0);
    for(const key of challenge.sequence){challenge.update(100);assert.ok(challenge.input(key));assert.equal(challenge.remaining,600);}
    assert.equal(challenge.state,'animating');assert.equal(challenge.input('Space'),false);
    for(const delta of [0,-1,NaN,Infinity])challenge.update(delta);assert.equal(challenge.elapsed,0);
    challenge.update(2949);assert.equal(challenge.state,'animating');challenge.update(1);assert.equal(challenge.state,'complete');
    assert.equal(challenge.active,false);challenge.update(1000);assert.equal(challenge.elapsed,2950);
});
test('wrong input, deadline and cancellation never count as a completed finisher',()=>{
    for(const mode of ['wrong','timeout','cancel']){
        const c=new FinisherChallenge('alex',2950);c.start();
        if(mode==='wrong')c.input('ArrowDown');else if(mode==='timeout'){c.update(599);assert.equal(c.state,'prompt');c.update(1);}else c.cancel();
        assert.equal(c.active,false);c.update(9999);assert.notEqual(c.state,'complete');assert.equal(c.start(),false);
    }
});
test('derived atlases retain all supplied GIF frame timings and uniform cells',()=>{
    const timings=JSON.parse(readFileSync('public/assets/special/derived/timings.json','utf8'));
    for(const [character,frames,duration]of [['alex',16,2950],['lua',12,2890]]){
        const t=timings[character],png=readFileSync(`public/assets/special/derived/${character}-finisher.png`);
        assert.equal(t.frames,frames);assert.equal(t.durationMs,duration);assert.equal(t.durations.reduce((a,b)=>a+b,0),duration);
        assert.equal(png.readUInt32BE(16),2048);assert.equal(png.readUInt32BE(20),Math.ceil(frames/4)*512);
    }
});

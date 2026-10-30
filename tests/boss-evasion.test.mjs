import test from 'node:test';
import assert from 'node:assert/strict';
import {tsModuleUrl} from './ts-module.mjs';
const {BossEvasion,BossEvasionConfig:c}=await import(tsModuleUrl(new URL('../src/entities/boss/BossEvasion.ts',import.meta.url)));
const body={x:500,y:500,width:114,height:128},bounds={x:0,y:0,width:1500,height:1500};
const shot=()=>({id:{},x:350,y:564,vx:500,vy:0,radius:8});
const update=(e,now=0,shots=[shot()],walls=[],occupied=[],allowed=true,b=body)=>e.update(now,allowed,b,shots,walls,occupied,bounds);

test('a genuine incoming shot can trigger a lateral physical dodge at the configured chance',()=>{
    const e=new BossEvasion(()=>.34),v=update(e);
    assert.deepEqual(v,{x:-0,y:c.speed});assert.equal(c.chance,.35);
    assert.deepEqual(update(e,100,[]),v);assert.equal(update(e,c.durationMs,[]),null);
});
test('a refused shot is considered once, never rerolled every frame',()=>{
    let rolls=0;const e=new BossEvasion(()=>{rolls++;return .9;}),s=shot();
    for(let now=0;now<5000;now+=25)assert.equal(update(e,now,[s]),null);
    assert.equal(rolls,1);
});
test('successful dodges enforce a cooldown even against new shots',()=>{
    const e=new BossEvasion(()=>0);assert.ok(update(e));
    assert.equal(update(e,1000),null);assert.equal(update(e,c.cooldownMs-1),null);assert.ok(update(e,c.cooldownMs));
});
test('outgoing, off-target, stationary, occluded and too-close shots cannot trigger evasion',()=>{
    const cases=[{...shot(),vx:-500},{...shot(),y:200},{...shot(),vx:0},{...shot(),x:470}];
    for(const s of cases)assert.equal(update(new BossEvasion(()=>0),0,[s]),null);
    assert.equal(update(new BossEvasion(()=>0),0,[shot()],[{x:420,y:500,width:30,height:150}]),null);
});
test('swept paths respect walls, actors and world boundaries; the opposite side is tried',()=>{
    const wall={x:480,y:650,width:160,height:50};
    assert.equal(update(new BossEvasion(()=>0),0,[shot()],[wall]).y,-c.speed);
    const top={x:480,y:350,width:160,height:120};
    assert.equal(update(new BossEvasion(()=>0),0,[shot()],[wall,top]),null);
    assert.equal(update(new BossEvasion(()=>0),0,[shot()],[wall],[top]),null);
    assert.equal(update(new BossEvasion(()=>0),0,[shot()],[],[],true,{...body,x:0}),null);
});
test('active evasions stop when geometry becomes blocked or combat no longer allows dodging',()=>{
    const e=new BossEvasion(()=>0);assert.ok(update(e));
    assert.equal(update(e,25,[],[{x:500,y:650,width:200,height:50}]),null);
    const other=new BossEvasion(()=>0);assert.ok(update(other));assert.equal(update(other,25,[],[],[],false),null);
    assert.equal(update(other,30,[]),null);
});

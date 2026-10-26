import test from 'node:test';
import assert from 'node:assert/strict';
import { tsModuleUrl } from './ts-module.mjs';
const { EnemyAttackController } = await import(tsModuleUrl(new URL('../src/entities/enemies/EnemyAttackController.ts', import.meta.url)));
const { robotAttacks } = await import(tsModuleUrl(new URL('../src/config/RobotConfig.ts', import.meta.url)));
const from = { x: 0, y: 0 }, target = { x: 240, y: 0 };
const create = type => new EnemyAttackController(robotAttacks[`robot-${type}`]);

for (const [variant, speed, interval] of [['red',300,1500],['yellow',400,800]]) {
    test(`${variant}: one shot, fixed speed and exact cooldown`, () => {
        const attack = create(variant), shot = attack.update(0,true,from,target);
        assert.equal(shot.length,1); assert.equal(shot[0].speed,speed);
        assert.deepEqual(shot[0].direction,{x:1,y:0});
        assert.equal(attack.update(interval-1,true,from,target),null);
        assert.equal(attack.update(interval,true,from,target).length,1);
    });
}
test('blue: exactly five shots at 0/200/400/600/800ms then a two-second rest', () => {
    const attack=create('blue');
    assert.equal(attack.update(0,true,from,target).length,1);
    assert.equal(attack.update(199,true,from,target),null);
    assert.equal(attack.update(200,true,from,target)[0].speed,350);
    assert.equal(attack.update(399,true,from,target),null);
    assert.equal(attack.update(400,true,from,target).length,1);
    assert.equal(attack.update(600,true,from,target).length,1);
    assert.equal(attack.update(800,true,from,target).length,1);
    assert.equal(attack.update(2799,true,from,target),null);
    assert.equal(attack.update(2800,true,from,target).length,1);
});
test('blue: each shot re-aims, prior directions remain fixed', () => {
    const attack=create('blue'), first=attack.update(0,true,from,target)[0];
    assert.deepEqual(attack.update(200,true,from,{x:0,y:240})[0].direction,{x:0,y:1});
    assert.deepEqual(first.direction,{x:1,y:0});
});
test('blue: lost sight cancels the remaining burst and starts its rest', () => {
    const attack=create('blue');attack.update(0,true,from,target);
    assert.equal(attack.update(100,false,from,target),null);
    assert.equal(attack.phase,'ready');
    assert.equal(attack.update(400,true,from,target),null);
    assert.equal(attack.update(2100,true,from,target).length,1);
});
test('blue: a slow frame never emits accumulated shots at once', () => {
    const attack=create('blue');attack.update(0,true,from,target);
    assert.equal(attack.update(1000,true,from,target).length,1);
    assert.equal(attack.update(1001,true,from,target),null);
    assert.equal(attack.update(1200,true,from,target).length,1);
});
test('orange: one-second charge, six simultaneous spread projectiles and exact recovery', () => {
    const attack=create('orange');
    assert.equal(attack.update(0,true,from,target),null);assert.equal(attack.phase,'charging');
    assert.equal(attack.update(999,true,from,target),null);
    const shots=attack.update(1000,true,from,target);
    assert.equal(shots.length,6);assert.equal(attack.phase,'recovering');
    shots.forEach((shot,index)=>{
        assert.ok(Math.abs(Math.atan2(shot.direction.y,shot.direction.x)*180/Math.PI-[-20,-12,-4,4,12,20][index])<1e-10);
        assert.equal(shot.speed,320);assert.equal(shot.piercesInteriorWalls,true);
    });
    assert.equal(attack.update(3499,true,from,target),null);assert.equal(attack.phase,'recovering');
    assert.equal(attack.update(3500,true,from,target),null);assert.equal(attack.phase,'charging');
    assert.equal(attack.update(4500,true,from,target).length,6);
});
test('orange: aim locks at charge completion and never changes afterward', () => {
    const attack=create('orange');attack.update(0,true,from,target);
    const shots=attack.update(2000,true,from,{x:0,y:240});
    assert.ok(Math.abs(shots.reduce((sum,shot)=>sum+shot.direction.x,0))<1e-10);
    const fixed={...shots[2].direction};
    attack.update(3000,true,from,{x:-240,y:0});
    assert.deepEqual(shots[2].direction,fixed);
});
test('orange: no perception means no charge; losing perception cancels pending fire', () => {
    const attack=create('orange');assert.equal(attack.update(0,false,from,target),null);assert.equal(attack.phase,'ready');
    attack.update(100,true,from,target);attack.update(500,false,from,target);
    assert.equal(attack.phase,'ready');assert.equal(attack.update(2100,true,from,target),null);
});
test('orange: recovery finishes even without a valid target', () => {
    const attack=create('orange');attack.update(0,true,from,target);attack.update(2000,true,from,target);
    attack.update(4500,false,from,target);assert.equal(attack.phase,'ready');
});
for (const variant of ['red','blue','yellow','orange']) test(`${variant}: cancellation discards pending attack state`, () => {
    const attack=create(variant);attack.update(0,true,from,target);attack.cancel(100);
    assert.equal(attack.phase,'ready');assert.equal(attack.update(101,false,from,target),null);
});
test('coincident points never create a non-finite projectile direction', () => {
    for(const variant of ['red','blue','yellow','orange']) assert.equal(create(variant).update(0,true,from,from),null);
});

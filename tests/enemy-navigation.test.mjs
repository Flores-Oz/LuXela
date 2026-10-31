import test from 'node:test';
import assert from 'node:assert/strict';
import { tsModuleUrl } from './ts-module.mjs';
const { EnemyNavigationGrid } = await import(tsModuleUrl(new URL('../src/entities/enemies/EnemyNavigation.ts', import.meta.url)));
const bounds = { x:0, y:0, width:640, height:512 };
const grid = walls => new EnemyNavigationGrid(bounds, walls, 44, 52);
const validate = (navigation, from, target) => {
    const route = navigation.findPath(from, target);
    assert.ok(route.length);
    let previous = from;
    for (const point of route) { assert.ok(navigation.canTravel(previous, point), JSON.stringify({previous,point})); previous=point; }
    return route;
};
test('a robot flush against a wall can step away and navigate around its end', () => {
    const navigation=grid([{x:320,y:128,width:64,height:256}]);
    const route=validate(navigation,{x:298,y:256},{x:480,y:256});
    assert.deepEqual(route.at(-1),{x:480,y:256});
    assert.ok(route.some(p=>p.y<=96||p.y>=416));
});
test('a U-shaped enclosure is escaped through its opening before returning toward the player', () => {
    const navigation=grid([{x:192,y:128,width:32,height:256},{x:384,y:128,width:32,height:256},{x:192,y:352,width:224,height:32}]);
    const route=validate(navigation,{x:288,y:320},{x:288,y:448});
    assert.deepEqual(route.at(-1),{x:288,y:448});
    assert.ok(route.some(p=>p.y<=96));
});
test('64px corridors fit a robot body without allowing corner cuts', () => {
    const navigation=grid([{x:0,y:0,width:256,height:192},{x:0,y:256,width:256,height:256}]);
    const route=validate(navigation,{x:96,y:224},{x:480,y:224});
    assert.deepEqual(route.at(-1),{x:480,y:224});
    assert.equal(navigation.canTravel({x:280,y:224},{x:240,y:180}),false);
});
test('unreachable targets end at an accessible point without crossing the separating wall', () => {
    const navigation=grid([{x:256,y:0,width:64,height:512}]);
    const route=validate(navigation,{x:96,y:256},{x:480,y:256});
    assert.ok(route.every(p=>p.x<256));
    assert.notDeepEqual(route.at(-1),{x:480,y:256});
});
test('world bounds and retreat targets outside the room are respected', () => {
    const navigation=grid([]), route=validate(navigation,{x:96,y:96},{x:-400,y:-400});
    assert.ok(route.every(p=>p.x>=24&&p.y>=28));
    assert.equal(navigation.canTravel({x:96,y:96},{x:-1,y:96}),false);
});
test('an enclosed body has no route rather than an oscillating escape through a wall', () => {
    assert.deepEqual(grid([{x:64,y:64,width:128,height:128}]).findPath({x:128,y:128},{x:400,y:400}),[]);
});

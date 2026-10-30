import assert from 'node:assert/strict';
import test from 'node:test';
import { tsModuleUrl } from './ts-module.mjs';
const { WaveManager } = await import(tsModuleUrl(new URL('../src/levels/WaveManager.ts', import.meta.url)));
const { planWaveSpawns } = await import(tsModuleUrl(new URL('../src/levels/SpawnPlanner.ts', import.meta.url)));
const { LevelManager } = await import(tsModuleUrl(new URL('../src/levels/LevelManager.ts', import.meta.url)));
const { validateLevelCatalog } = await import(tsModuleUrl(new URL('../src/levels/validateLevelConfig.ts', import.meta.url)));
const { levels } = await import(tsModuleUrl(new URL('../src/levels/levels.ts', import.meta.url)));
const { arcadeRooms } = await import(tsModuleUrl(new URL('../src/data/rooms/arcadeRooms.ts', import.meta.url)));
const wave = (id, count) => ({ id, enemies: { count, types: ['robot-red'], spawns: Array.from({ length: count }, () => ({ row: 1, column: 2, type: 'robot-red' })) }, completion: 'eliminate-all-enemies' });
function setup(waves) {
    const events = [], state = { allowed: true, safe: true };
    const manager = new WaveManager('room', waves, { canSpawn: () => state.allowed, spawn: (_, index) => { if (state.safe) events.push(index); return state.safe; }, changed() {}, completed: () => events.push('completed') });
    return { manager, events, state };
}
test('catalog contains normal, multiwave, special and final encounters', () => {
    assert.deepEqual(validateLevelCatalog(levels, arcadeRooms), []);
    assert.deepEqual(levels.slice(0,5).map(level => level.waves.length), [1, 2, 3, 1, 0]);
    assert.equal(levels.slice(0,5).reduce((sum, level) => sum + level.waves.reduce((n, w) => n + w.enemies.count, 0), 0), 78);
});
test('reinforcements use genuinely different authored positions', () => {
    for (const level of levels) {
        const distributions = level.waves.map(wave => JSON.stringify(wave.enemies.spawns.map(p => `${p.row},${p.column}`).sort()));
        assert.equal(new Set(distributions).size, level.waves.length);
    }
});
test('no early wave, duplicate start, duplicate kill or duplicate completion', () => {
    const { manager: m, events } = setup([wave('a', 2), wave('b', 1)]);
    assert.equal(m.start(), true); assert.equal(m.start(), false); m.update(100000);
    assert.deepEqual(events, [0]); assert.equal(m.defeat('wrong'), false);
    assert.equal(m.defeat(m.enemyId(0, 0)), true); assert.equal(m.defeat(m.enemyId(0, 0)), false);
    m.update(100000); assert.deepEqual(events, [0]);
    m.defeat(m.enemyId(0, 1)); assert.equal(m.state, 'starting'); assert.deepEqual(events, [0]);
    m.update(999); assert.deepEqual(events, [0]); m.update(1); assert.deepEqual(events, [0, 1]);
    m.defeat(m.enemyId(1, 0)); m.update(100000); m.defeat(m.enemyId(1, 0));
    assert.equal(m.isComplete, true); assert.deepEqual(events, [0, 1, 'completed']);
});
test('empty waves and an empty sequence terminate without recursion or repeated completion', () => {
    const { manager: m, events } = setup([wave('a', 0), wave('b', 0)]);
    m.start(); assert.equal(m.state, 'starting'); m.update(1000); m.update(1000);
    assert.deepEqual(events, [0, 1, 'completed']);
    const empty = setup([]); empty.manager.start(); empty.manager.start(); empty.manager.update(1000);
    assert.deepEqual(empty.events, ['completed']);
});
test('cannot spawn during defeat, pause-like suspension, or special animation', () => {
    const { manager: m, events, state } = setup([wave('a', 1), wave('b', 1)]);
    m.start(); m.defeat(m.enemyId(0, 0)); state.allowed = false; m.update(100000);
    assert.deepEqual(events, [0]); state.allowed = true; m.update(999); assert.deepEqual(events, [0]);
    m.update(1); assert.deepEqual(events, [0, 1]);
});
test('unsafe spawn retries without partial initialization or advancement', () => {
    const { manager: m, events, state } = setup([wave('a', 1)]);
    state.safe = false; m.start(); m.update(1000); assert.equal(m.state, 'starting'); assert.equal(m.aliveCount, 0); assert.deepEqual(events, []);
    state.safe = true; m.update(250); assert.deepEqual(events, [0]); assert.equal(m.aliveCount, 1);
});
test('stop cancels scheduled waves and ignores late deaths', () => {
    const { manager: m, events } = setup([wave('a', 1), wave('b', 1)]);
    m.start(); m.defeat(m.enemyId(0, 0)); m.stop(); m.update(100000);
    assert.equal(m.defeat(m.enemyId(0, 0)), false); assert.equal(m.start(), false); assert.deepEqual(events, [0]);
});
test('rejects malformed waves', () => {
    for (const bad of [[wave('a', -1)], [wave('a', 1), wave('a', 1)], [{ ...wave('a', 1), completion: 'boss' }], [{ ...wave('a', 1), enemies: null }]]) {
        assert.throws(() => setup(bad), /Invalid wave/);
    }
});
test('all layouts can relocate later waves away from the player without overlap', () => {
    const levelsManager = new LevelManager();
    for (let index = 0; index < levelsManager.count; index++) {
        const room = levelsManager.createRoom(index), config = levels[index];
        for (const wave of config.waves) for (const original of wave.enemies.spawns) {
            const player = { x: (original.column + .5) * 64, y: (original.row + .5) * 64 };
            const planned = planWaveSpawns(room, wave.enemies.spawns, player, config.difficulty.detectionRange);
            assert.ok(planned); assert.equal(new Set(planned.map(p => `${p.row},${p.column}`)).size, wave.enemies.count);
            assert.ok(planned.every(p => Math.hypot((p.column + .5) * 64 - player.x, (p.row + .5) * 64 - player.y) >= config.difficulty.detectionRange + 64));
        }
    }
});
test('spawn planner refuses insufficient safe space and accepts empty waves', () => {
    const room = new LevelManager().createRoom(0);
    assert.equal(planWaveSpawns(room, levels[0].enemies.spawns, { x: 100, y: 100 }, 100000), null);
    assert.deepEqual(planWaveSpawns(room, [], { x: 100, y: 100 }, 100000), []);
});
test('authored empty wave is valid and partial encounter metadata is rejected', () => {
    const data = structuredClone(levels);
    data[0].enemies.count = 0; data[0].enemies.spawns = [];
    assert.deepEqual(validateLevelCatalog(data, arcadeRooms), []);
    const partial = structuredClone(levels); delete partial[0].waves;
    assert.ok(validateLevelCatalog(partial, arcadeRooms).some(error => error.includes('explicit waves')));
});
for (const [name, change] of [
    ['duplicate wave', d => { d[1].waves[1].id = d[1].waves[0].id; }],
    ['bad order', d => { d[0].order = 2; }],
    ['broken next link', d => { d[0].next = 'missing'; }],
    ['invalid later spawn', d => { d[1].waves[1].enemies.spawns[0].row = 0; }],
    ['exit in wall', d => { d[0].exits[0].position.row = 0; }],
    ['unlocked progression exit', d => { d[0].exits[0].requiresClear = false; }],
    ['invalid layer metadata', d => { d[0].presentation.layers.collision = 12; }],
    ['invalid tilemap reference', d => { d[0].presentation.tilemapKey = ''; }]
]) test(`catalog rejects ${name}`, () => { const data = structuredClone(levels); change(data); assert.ok(validateLevelCatalog(data, arcadeRooms).length > 0); });

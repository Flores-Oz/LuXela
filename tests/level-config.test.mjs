import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Compile the pure TS validator in memory; no browser, Phaser runtime or generated files.
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText).toString('base64')}`;
const tileModule = moduleUrl(readFileSync(new URL('../src/types/RoomTypes.ts', import.meta.url), 'utf8'));
const validatorModule = moduleUrl(readFileSync(new URL('../src/levels/validateLevelConfig.ts', import.meta.url), 'utf8')
    .replace('"../types/RoomTypes"', JSON.stringify(tileModule)));
const { validateLevelCatalog, assertValidLevelCatalog } = await import(validatorModule);

function fixture() {
    return {
        levels: [{
            id: 'fixture-level', roomId: 'fixture-room',
            enemies: { count: 2, types: ['robot-red'], spawns: [
                { type: 'robot-red', row: 1, column: 4 },
                { type: 'robot-red', row: 3, column: 2 }
            ] },
            difficulty: { moveSpeed: 80, detectionRange: 200, shootCooldown: 1000, patrol: true },
            completion: 'eliminate-all-enemies', scorePerEnemy: 100
        }],
        rooms: { 'fixture-room': [
            [1, 1, 1, 1, 1, 1, 1],
            [1, 2, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 4, 1],
            [1, 1, 1, 1, 1, 1, 1]
        ] }
    };
}

test('valid catalog is accepted without mutating authored data', () => {
    const data = fixture(), snapshot = structuredClone(data);
    assert.deepEqual(validateLevelCatalog(data.levels, data.rooms), []);
    assert.doesNotThrow(() => assertValidLevelCatalog(data.levels, data.rooms));
    assert.deepEqual(data, snapshot);
});

test('different levels may reuse a map with different difficulty settings', () => {
    const { levels, rooms } = fixture();
    const second = structuredClone(levels[0]);
    second.id = 'second-fixture'; second.difficulty.moveSpeed = 90;
    levels.push(second);
    assert.deepEqual(validateLevelCatalog(levels, rooms), []);
});

const invalidCases = [
    ['empty catalog', d => { d.levels = []; }, /non-empty array/],
    ['null level', d => { d.levels[0] = null; }, /level object/],
    ['blank id', d => { d.levels[0].id = ' '; }, /id must/],
    ['duplicate id', d => { d.levels.push(structuredClone(d.levels[0])); }, /duplicate id/],
    ['missing room', d => { d.levels[0].roomId = 'missing'; }, /existing room/],
    ['inherited room name', d => { d.levels[0].roomId = 'toString'; }, /existing room/],
    ['empty matrix', d => { d.rooms['fixture-room'] = []; }, /rectangular matrix/],
    ['unequal row widths', d => { d.rooms['fixture-room'][2].pop(); }, /rectangular matrix/],
    ['unknown tile', d => { d.rooms['fixture-room'][2][2] = 99; }, /known tiles/],
    ['missing player', d => { d.rooms['fixture-room'][1][1] = 0; }, /exactly one PlayerSpawn/],
    ['multiple players', d => { d.rooms['fixture-room'][2][1] = 2; }, /exactly one PlayerSpawn/],
    ['missing exit', d => { d.rooms['fixture-room'][3][5] = 0; }, /at least one Exit/],
    ['unreachable targets', d => { d.rooms['fixture-room'][2] = [1, 1, 1, 1, 1, 1, 1]; }, /unreachable/],
    ['enemy count mismatch', d => { d.levels[0].enemies.count = 3; }, /must match/],
    ['negative enemy count', d => { d.levels[0].enemies.count = -1; }, /non-negative safe integer/],
    ['unsupported enemy', d => { d.levels[0].enemies.types = ['boss']; }, /supported types/],
    ['duplicated enemy type', d => { d.levels[0].enemies.types.push('robot-red'); }, /unique supported types/],
    ['unavailable spawn type', d => { d.levels[0].enemies.spawns[0].type = 'boss'; }, /unavailable enemy type/],
    ['overlapping spawns', d => { d.levels[0].enemies.spawns[1] = structuredClone(d.levels[0].enemies.spawns[0]); }, /overlaps/],
    ['spawn in wall', d => { d.levels[0].enemies.spawns[0].row = 0; }, /must be on floor/],
    ['spawn on player', d => { d.levels[0].enemies.spawns[0].column = 1; }, /outside player spawn/],
    ['spawn on exit', d => { d.levels[0].enemies.spawns[0] = { type: 'robot-red', row: 3, column: 5 }; }, /outside player spawn/],
    ['spawn outside matrix', d => { d.levels[0].enemies.spawns[0].column = 999; }, /must be on floor/],
    ['fractional coordinate', d => { d.levels[0].enemies.spawns[0].row = 1.5; }, /integer row and column/],
    ['negative coordinate', d => { d.levels[0].enemies.spawns[0].row = -1; }, /integer row and column/],
    ['non-finite speed', d => { d.levels[0].difficulty.moveSpeed = Infinity; }, /difficulty.moveSpeed/],
    ['zero cooldown', d => { d.levels[0].difficulty.shootCooldown = 0; }, /difficulty.shootCooldown/],
    ['negative detection', d => { d.levels[0].difficulty.detectionRange = -10; }, /difficulty.detectionRange/],
    ['non-boolean patrol', d => { d.levels[0].difficulty.patrol = 'yes'; }, /patrol must be boolean/],
    ['negative points', d => { d.levels[0].scorePerEnemy = -100; }, /scorePerEnemy/],
    ['fractional points', d => { d.levels[0].scorePerEnemy = 0.5; }, /scorePerEnemy/],
    ['unsupported completion', d => { d.levels[0].completion = 'boss'; }, /unsupported completion/]
];

for (const [name, mutate, expected] of invalidCases) {
    test(`rejects ${name}`, () => {
        const data = fixture(); mutate(data);
        const errors = validateLevelCatalog(data.levels, data.rooms);
        assert.ok(errors.some(error => expected.test(error)), JSON.stringify(errors));
        assert.throws(() => assertValidLevelCatalog(data.levels, data.rooms), /Invalid level catalog/);
    });
}

test('malformed external structures return errors instead of crashing', () => {
    for (const catalog of [null, undefined, {}, 'invalid', 3]) {
        assert.ok(validateLevelCatalog(catalog, {}).length > 0);
    }
    for (const rooms of [null, [], 3]) {
        assert.ok(validateLevelCatalog(fixture().levels, rooms).length > 0);
    }
    for (const change of [
        d => { d.levels[0].enemies = null; },
        d => { d.levels[0].enemies.spawns = null; },
        d => { d.levels[0].enemies.spawns[0] = null; },
        d => { d.levels[0].difficulty = null; },
        d => { d.rooms['fixture-room'][1] = null; }
    ]) {
        const data = fixture(); change(data);
        assert.ok(validateLevelCatalog(data.levels, data.rooms).length > 0);
    }
});

test('legacy robot markers are valid configurable spawn positions', () => {
    const { levels, rooms } = fixture(); rooms['fixture-room'][1][4] = 3;
    assert.deepEqual(validateLevelCatalog(levels, rooms), []);
});

test('reports independent errors together with their level index', () => {
    const { levels, rooms } = fixture(); levels[0].id = ''; levels[0].scorePerEnemy = -1;
    const errors = validateLevelCatalog(levels, rooms);
    assert.equal(errors.length, 2);
    assert.ok(errors.every(error => error.startsWith('levels[0]:')));
});

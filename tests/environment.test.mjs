import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import { tsModuleUrl } from './ts-module.mjs';
const { buildEnvironmentPlan, wallMask } = await import(tsModuleUrl(new URL('../src/world/environment/EnvironmentPlan.ts', import.meta.url)));
const { environmentAtlas, environmentThemes, placeholderAtlas } = await import(tsModuleUrl(new URL('../src/world/environment/RoomTheme.ts', import.meta.url)));
const { environmentStyleIds, environmentSheets, sheetCell, detailedEnvironmentAtlas } = await import(tsModuleUrl(new URL('../src/world/environment/EnvironmentSheets.ts', import.meta.url)));
const { createRoomLayout } = await import(tsModuleUrl(new URL('../src/world/RoomLayout.ts', import.meta.url)));
const { LevelManager } = await import(tsModuleUrl(new URL('../src/levels/LevelManager.ts', import.meta.url)));
const { levels } = await import(tsModuleUrl(new URL('../src/levels/levels.ts', import.meta.url)));
const { arcadeRooms } = await import(tsModuleUrl(new URL('../src/data/rooms/arcadeRooms.ts', import.meta.url)));
const { validateLevelCatalog } = await import(tsModuleUrl(new URL('../src/levels/validateLevelConfig.ts', import.meta.url)));

for (const [name, cells, expected] of [
    ['isolated', [], 0], ['horizontal', [[2,1],[2,3]], 10], ['vertical', [[1,2],[3,2]], 5],
    ['top left corner', [[2,3],[3,2]], 6], ['top right corner', [[2,1],[3,2]], 12],
    ['bottom left corner', [[1,2],[2,3]], 3], ['bottom right corner', [[1,2],[2,1]], 9],
    ['north termination', [[1,2]], 1], ['east termination', [[2,3]], 2], ['south termination', [[3,2]], 4], ['west termination', [[2,1]], 8],
    ['three-way junction', [[1,2],[2,3],[3,2]], 7], ['cross', [[1,2],[2,3],[3,2],[2,1]], 15]
]) test(`wall topology: ${name}`, () => assert.equal(wallMask(2,2,new Set(cells.map(([r,c])=>`${r},${c}`))), expected));

test('every room has complete floor, exact wall coverage and bounded decoration indices', () => {
    const manager = new LevelManager();
    for (let index=0;index<manager.count;index++) {
        const config=manager.getLevel(index), layout=createRoomLayout(manager.createRoom(index),config.exits), plan=buildEnvironmentPlan(layout,config.presentation);
        const atlas=detailedEnvironmentAtlas(config.presentation.environmentStyle);
        assert.equal(plan.floor.length,11); assert.ok(plan.floor.every(row=>row.length===15 && row.every(tile=>atlas.floors.includes(tile))));
        assert.equal(plan.walls.flat().filter(tile=>tile>=0).length,layout.walls.length);
        for(const cell of layout.walls) assert.ok(plan.walls[cell.row][cell.column]>=0 && plan.walls[cell.row][cell.column]<atlas.columns*atlas.rows);
        assert.equal([...plan.decoration.flat(),...plan.decorationOverlay.flat()].filter(tile=>tile>=0).length,config.presentation.decorations.length);
        const frames=Object.values(atlas.decoration);
        assert.ok([...plan.decoration.flat(),...plan.decorationOverlay.flat()].every(tile=>tile===-1 || frames.includes(tile)));
    }
});
test('three themes change only appearance and keep the same room data', () => {
    const manager=new LevelManager(),room=manager.createRoom(0),layout=createRoomLayout(room),snapshot=structuredClone(room.matrix);
    const plans=Object.keys(environmentThemes).map(theme=>buildEnvironmentPlan(layout,{scenarioId:'same-room',theme}));
    assert.equal(new Set(plans.map(plan=>plan.theme)).size,3);
    for(const plan of plans) {assert.deepEqual(plan.floor,plans[0].floor);assert.deepEqual(plan.walls,plans[0].walls);}
    assert.deepEqual(room.matrix,snapshot);
    assert.equal(new Set(Object.values(environmentThemes).map(theme=>theme.textureKey)).size,3);
    assert.equal(new Set(Object.values(environmentThemes).map(theme=>theme.palette.floor)).size,3);
});
test('decorations cannot overlay walls, player start or exit even in unvalidated render input', () => {
    const layout=createRoomLayout(new LevelManager().createRoom(0));
    const plan=buildEnvironmentPlan(layout,{scenarioId:'test',decorations:[{row:0,column:0,kind:'grate'},{row:1,column:1,kind:'panel'},{row:9,column:13,kind:'warning'},{row:99,column:99,kind:'circuit'}]});
    assert.ok(plan.decoration.flat().every(tile=>tile===-1));
    assert.ok(plan.decorationOverlay.flat().every(tile=>tile===-1));
});
test('fallback and supplied atlas mappings both preserve physical cell coverage',()=>{
    const layout=createRoomLayout(new LevelManager().createRoom(0)),prepared=buildEnvironmentPlan(layout,{scenarioId:'same'}),fallback=buildEnvironmentPlan(layout,{scenarioId:'same'},placeholderAtlas);
    assert.equal(prepared.walls.flat().filter(tile=>tile>=0).length,fallback.walls.flat().filter(tile=>tile>=0).length);
    assert.ok(fallback.walls.flat().every(tile=>tile===-1||tile>=4&&tile<=35));
    assert.ok(prepared.walls.flat().every(tile=>tile===-1||tile>=4&&tile<=11));
});
test('plans are deterministic and do not mutate definitions', () => {
    const manager=new LevelManager(),config=levels[0],snapshot=structuredClone(config),layout=createRoomLayout(manager.createRoom(0));
    assert.deepEqual(buildEnvironmentPlan(layout,config.presentation),buildEnvironmentPlan(layout,config.presentation));
    assert.deepEqual(config,snapshot); assert.equal(environmentAtlas.tileSize,32);
});
for(const [name,mutate] of [
    ['unknown environment style',d=>{d[0].presentation.environmentStyle='unknown';}],
    ['unknown theme',d=>{d[0].presentation.theme='unknown';}],
    ['overlapping layers',d=>{d[0].presentation.layers.walls='floor';}],
    ['decoration in wall',d=>{d[0].presentation.decorations[0].row=0;}],
    ['decoration on exit',d=>{d[0].presentation.decorations[0]={row:9,column:13,kind:'panel'};}],
    ['duplicate decoration',d=>{d[0].presentation.decorations.push(structuredClone(d[0].presentation.decorations[0]));}],
    ['unknown decoration',d=>{d[0].presentation.decorations[0].kind='blocking-crate';}]
]) test(`rejects ${name}`,()=>{const data=structuredClone(levels);mutate(data);assert.ok(validateLevelCatalog(data,arcadeRooms).length>0);});

test('all eight organized source sheets retain original hashes and bounded non-overlapping measured crops',()=>{
    const provenance=JSON.parse(readFileSync(new URL('../public/assets/environment/sources/provenance.json',import.meta.url),'utf8'));
    assert.equal(provenance.length,8);
    for(const id of environmentStyleIds){
        const entry=provenance.find(source=>source.id===id),bytes=readFileSync(new URL('../public/assets/environment/'+entry.file,import.meta.url));
        assert.equal(createHash('sha256').update(bytes).digest('hex').toUpperCase(),entry.sha256);
        assert.equal(bytes.readUInt32BE(16),1254);assert.equal(bytes.readUInt32BE(20),1254);
        const rectangles=Array.from({length:16},(_,index)=>sheetCell(id,index));
        for(const rect of rectangles)assert.ok(rect.x>=0&&rect.y>=0&&rect.width>0&&rect.height>0&&rect.x+rect.width<=1254&&rect.y+rect.height<=1254);
        for(let i=0;i<16;i++)for(let j=i+1;j<16;j++){const a=rectangles[i],b=rectangles[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);}
    }
});
test('all detailed styles preserve physical geometry and keep fixtures confined to walls',()=>{
    const manager=new LevelManager(),layout=createRoomLayout(manager.createRoom(0)),before=structuredClone(layout);
    for(const style of environmentStyleIds){
        const atlas=detailedEnvironmentAtlas(style),plan=buildEnvironmentPlan(layout,{scenarioId:'check',environmentStyle:style});
        assert.equal(plan.floor.flat().filter(index=>index>=0).length,165);
        assert.equal(plan.walls.flat().filter(index=>index>=0).length,layout.walls.length);
        for(const cell of layout.floors)assert.equal(plan.walls[cell.row][cell.column],-1);
        assert.ok([...atlas.floors,...atlas.walls,...atlas.wallVariants,...atlas.wallDetails,...Object.values(atlas.decoration),...Object.values(atlas.edgeWalls),...Object.values(atlas.door)].every(index=>index>=0&&index<64));
    }
    assert.deepEqual(layout,before);
});
test('the five campaign rooms visibly use pieces from all eight source sheets',()=>{
    const manager=new LevelManager(),used=new Set();
    for(let index=0;index<levels.length;index++){
        const config=levels[index],style=config.presentation.environmentStyle,plan=buildEnvironmentPlan(createRoomLayout(manager.createRoom(index)),config.presentation);
        const frames=[...plan.floor.flat(),...plan.walls.flat(),...plan.decoration.flat()];
        if(frames.some(frame=>frame>=0&&frame<16))used.add(style);
        if(frames.some(frame=>frame>=16&&frame<32))used.add(environmentSheets[style].companion);
    }
    assert.deepEqual([...used].sort(),[...environmentStyleIds].sort());
});

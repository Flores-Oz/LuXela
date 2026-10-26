import test from 'node:test';
import assert from 'node:assert/strict';
import {tsModuleUrl} from './ts-module.mjs';
const load=path=>import(tsModuleUrl(new URL(path,import.meta.url)));
const {levels}=await load('../src/levels/levels.ts');
const {arcadeRooms}=await load('../src/data/rooms/arcadeRooms.ts');
const {Room}=await load('../src/world/Room.ts');
const {createRoomLayout}=await load('../src/world/RoomLayout.ts');
const {buildEnvironmentPlan}=await load('../src/world/environment/EnvironmentPlan.ts');
const {obstacleGroups,composeRoomDecorations}=await load('../src/world/environment/EnvironmentComposition.ts');
const {environmentSheets,sheetFunctions,detailedEnvironmentAtlas}=await load('../src/world/environment/EnvironmentSheets.ts');
const {validateLevelCatalog}=await load('../src/levels/validateLevelConfig.ts');

test('campaign pairs its four robots with their intended dominant sheets, reserving the reactor',()=>{
    assert.deepEqual(levels.map(level=>level.presentation.environmentStyle),['quarantine-red','data-blue','cargo-olive','hangar-amber','reactor-cyan']);
    assert.deepEqual(levels.map(level=>level.enemies.types),[['robot-red'],['robot-blue'],['robot-yellow'],['robot-orange'],[]]);
    assert.deepEqual(levels.map(level=>level.waves.length),[1,2,3,1,0]);
    assert.equal(environmentSheets['quarantine-red'].companion,'industrial-green');
    assert.equal(environmentSheets['quarantine-red'].neutral,'maintenance-teal');
    assert.equal(environmentSheets['hangar-amber'].companion,'assembly-amber');
});

for(const level of levels)test(`${level.id}: cohesive machines, clean floors, contextual decoration and continuous perimeter`,()=>{
    const matrix=arcadeRooms[level.roomId],layout=createRoomLayout(new Room(matrix,64),level.exits);
    const atlas=detailedEnvironmentAtlas(level.presentation.environmentStyle),plan=buildEnvironmentPlan(layout,level.presentation);
    const groups=obstacleGroups(40,24,layout.walls);
    assert.ok(groups.length>=6);
    assert.equal(groups.reduce((sum,group)=>sum+group.cells.length,0),layout.walls.length-124);
    for(const group of groups){
        const frames=group.cells.map(cell=>plan.walls[cell.row][cell.column]);
        assert.ok(new Set(frames).size<=2,'one machine material plus one terminal/core per bank');
        assert.equal(frames.filter(frame=>frame===atlas.materials.console||frame===atlas.materials.themed&&level.order===5).length,1);
    }
    const clean=layout.floors.filter(cell=>plan.floor[cell.row][cell.column]===atlas.materials.clean).length;
    assert.ok(clean/layout.floors.length>.55,'clean floor remains the dominant surface');
    for(const d of level.presentation.decorations){
        assert.equal(matrix[d.row][d.column],0);
        assert.ok(groups.some(group=>group.cells.some(c=>Math.max(Math.abs(c.row-d.row),Math.abs(c.column-d.column))<=1)),'decals belong to machinery/service edges');
        assert.ok([...layout.playerSpawns,...layout.doors].every(c=>Math.hypot(c.row-d.row,c.column-d.column)>=2));
    }
    const warnings=level.presentation.decorations.filter(d=>d.kind==='warning');
    assert.ok(warnings.length<=(level.order===1?3:level.order===2?4:level.order===3?10:6));
    assert.deepEqual(composeRoomDecorations(matrix,level.presentation.environmentStyle),level.presentation.decorations);
    assert.equal(plan.walls[0][0],atlas.corners.northWest);
    assert.equal(plan.walls[0][39],atlas.corners.northEast);
    assert.equal(plan.walls[23][39],atlas.corners.southEast);
    assert.equal(plan.walls[23][0],atlas.corners.southWest);
    assert.ok(plan.walls[0].slice(1,-1).every(frame=>frame===atlas.edgeWalls.north));
    assert.ok(plan.walls[23].slice(1,-1).every(frame=>frame===atlas.edgeWalls.south));
});

test('blue racks align in two banks with parallel avenues and a cross aisle',()=>{
    const matrix=arcadeRooms.corridors;
    for(const row of [5,15])for(const column of [10,24,34])assert.equal(matrix[row][column],1);
    assert.ok(matrix[12].slice(1,-1).every(cell=>cell!==1));
});

test('hangar bays form open L-shaped shielding rather than scattered isolated pieces',()=>{
    const layout=createRoomLayout(new Room(arcadeRooms.maze,64));
    assert.equal(obstacleGroups(40,24,layout.walls).filter(group=>group.cells.length===22).length,4);
});

test('reactor keeps a large clear central arena without provisional enemy content',()=>{
    const matrix=arcadeRooms['combat-arena'];
    for(let row=6;row<=17;row++)for(let column=11;column<=29;column++)assert.notEqual(matrix[row][column],1);
    assert.equal(levels[4].availability,'reserved');
    assert.deepEqual(levels[4].enemies,{count:0,types:[],spawns:[]});
});

test('all sheets have explicit functional categories and floor art excludes wall segments',()=>{
    for(const style of Object.keys(environmentSheets)){
        const categories=sheetFunctions(style);
        assert.deepEqual(Object.keys(categories),['floor','wall','obstacle','decoration','thematic']);
        for(const list of Object.values(categories))assert.ok(list.length&&list.every(index=>Number.isInteger(index)&&index>=0&&index<16));
        assert.ok(categories.floor.every(index=>!categories.wall.includes(index)&&!categories.obstacle.includes(index)));
    }
    assert.equal(detailedEnvironmentAtlas('cargo-olive').decoration.circuit,8,'yellow loading marks distinguish the olive cargo art');
    assert.equal(detailedEnvironmentAtlas('hangar-amber').decoration.warning,3,'helipad is not used as repeated warning signage');
});

for(const [name,mutate]of [
    ['enemy in reserved arena',catalog=>{catalog[4].enemies=structuredClone(catalog[0].enemies);}],
    ['waves in reserved arena',catalog=>{catalog[4].waves=structuredClone(catalog[0].waves);}],
    ['reserved middle room',catalog=>{catalog[0].availability='reserved';}],
    ['unknown availability',catalog=>{catalog[4].availability='boss';}]
])test(`validation rejects ${name}`,()=>{
    const catalog=structuredClone(levels);mutate(catalog);
    assert.ok(validateLevelCatalog(catalog,arcadeRooms).length>0);
});

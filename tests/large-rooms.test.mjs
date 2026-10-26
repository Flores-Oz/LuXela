import test from 'node:test';
import assert from 'node:assert/strict';
import {tsModuleUrl} from './ts-module.mjs';
const load=path=>import(tsModuleUrl(new URL(path,import.meta.url)));
const {createArcadeRooms}=await load('../src/data/rooms/arcadeRooms.ts');
const {createLevelCatalog}=await load('../src/levels/levels.ts');
const {validateLevelCatalog}=await load('../src/levels/validateLevelConfig.ts');
const {roomCameraZoom}=await load('../src/world/RoomCamera.ts');
const {Room}=await load('../src/world/Room.ts');
const {planWaveSpawns}=await load('../src/levels/SpawnPlanner.ts');
for(const [width,height] of [[40,24],[48,30],[24,16],[20,14]])test(`${width}x${height}: physical rooms, reachable exits and dimension-relative placements`,()=>{
    const rooms=createArcadeRooms(width,height),catalog=createLevelCatalog(rooms);
    assert.deepEqual(validateLevelCatalog(catalog,rooms),[]);
    for(const config of catalog){
        const matrix=rooms[config.roomId],room=new Room(matrix,64);
        assert.equal(room.widthInPixels,width*64);assert.equal(room.heightInPixels,height*64);
        assert.ok(matrix[0].every(tile=>tile===1)&&matrix.at(-1).every(tile=>tile===1)&&matrix.every(row=>row[0]===1&&row.at(-1)===1));
        assert.ok(matrix.slice(1,-1).flatMap(row=>row.slice(1,-1)).filter(tile=>tile===1).length/(width-2)/(height-2)<.12);
        const start=room.findTile(2),exit=room.findTile(4);
        assert.deepEqual(config.exits[0].position,exit);
        const walkable=new Set([`${start.row},${start.column}`]),queue=[start];
        for(let i=0;i<queue.length;i++)for(const [dr,dc]of [[1,0],[-1,0],[0,1],[0,-1]]){const row=queue[i].row+dr,column=queue[i].column+dc,key=`${row},${column}`;if(matrix[row]?.[column]!==undefined&&matrix[row][column]!==1&&!walkable.has(key)){walkable.add(key);queue.push({row,column});}}
        assert.ok(walkable.has(`${exit.row},${exit.column}`));
        assert.equal(walkable.size,matrix.flat().filter(tile=>tile!==1).length);
        for(const wave of config.waves){
            const points=wave.enemies.spawns;
            for(const [i,p]of points.entries()){
                assert.equal(matrix[p.row][p.column],0);assert.ok(Math.hypot(p.row-start.row,p.column-start.column)>=5);assert.ok(Math.hypot(p.row-exit.row,p.column-exit.column)>=2);
                assert.ok(points.slice(i+1).every(q=>Math.hypot(p.row-q.row,p.column-q.column)>=3));
            }
            const relocated=planWaveSpawns(room,points,{x:(exit.column+.5)*64,y:(exit.row+.5)*64},config.difficulty.detectionRange);
            assert.equal(relocated.length,points.length);
            for(const p of relocated)assert.ok(Math.hypot(p.row-exit.row,p.column-exit.column)>=2);
        }
    }
});
test('large-room combat density increases while wave progression and movement remain intact',()=>{
    const catalog=createLevelCatalog(),waves=catalog.flatMap(level=>level.waves),robots=waves.flatMap(wave=>wave.enemies.spawns);
    assert.equal(waves.length,10);assert.equal(robots.length,106);assert.equal(robots.length*catalog[0].scorePerEnemy,10600);
    assert.deepEqual([...new Set(robots.map(robot=>robot.type))].sort(),['robot-blue','robot-orange','robot-red','robot-yellow']);
    assert.deepEqual(catalog.map(config=>config.difficulty.moveSpeed),[80,88,96,104,112]);
});
for(const [width,height]of [[1366,768],[1920,1080],[390,844],[3440,1440],[3840,2160],[2560,1536]])test(`${width}x${height}: camera covers the entire viewport without exposing outside space`,()=>{
    const zoom=roomCameraZoom(width,height,2560,1536);
    assert.ok(zoom>=1);assert.ok(width/zoom<=2560+.001&&height/zoom<=1536+.001);
});
test('invalid room sizes fail before generation',()=>{for(const size of [[0,24],[40,1],[40.5,24],[NaN,24]])assert.throws(()=>createArcadeRooms(...size),RangeError);});

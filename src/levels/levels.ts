import type { LevelConfig, LevelEnemySpawn, LevelRoomCatalog } from "./LevelConfig";
import type { EncounterConfig } from "./WaveConfig";
import { arcadeRooms } from "../data/rooms/arcadeRooms";
import { TileType } from "../types/RoomTypes";
import { findRoomTile, placeRoomPoints } from "./RoomPlacement";
import { CombatBalance } from "../config/CombatBalance";
import { roomScenarios } from "./RoomScenarios";
import { composeRoomDecorations } from "../world/environment/EnvironmentComposition";

/** Existing movement and progression, with large-room combat tuning in one config. */
const roomSeeds:readonly Omit<LevelConfig,'enemies'>[]=roomScenarios.map(({roomId},index)=>({
    id:'level-'+(index+1),roomId,difficulty:{moveSpeed:80+index*8,detectionRange:CombatBalance.detectionRanges[index]!,shootCooldown:CombatBalance.shootCooldowns[index]!,patrol:true},completion:'eliminate-all-enemies',scorePerEnemy:100
}));
export function createLevelCatalog(rooms:LevelRoomCatalog=arcadeRooms):readonly EncounterConfig[]{
    return roomSeeds.map((seed,index)=>{
        const matrix=rooms[seed.roomId]!;
        const scenario=roomScenarios[index]!;
        const enemyCount=scenario.reserved?0:CombatBalance.enemiesPerWave[index]!;
        const enemiesForWave=(waveIndex:number)=>{
            const zones=scenario.zones.slice(0,enemyCount).map(([row,column])=>[Math.min(.9,Math.max(.12,row+(waveIndex===1?.07:waveIndex===2?-.07:0))),Math.min(.9,Math.max(.12,column+(waveIndex===1?-.07:waveIndex===2?.07:0)))] as const);
            const spawns:readonly LevelEnemySpawn[]=placeRoomPoints(matrix,zones,3,Math.ceil((seed.difficulty.detectionRange+64)/64)).map((position,spawnIndex)=>({...position,type:scenario.robots[(spawnIndex+waveIndex)%scenario.robots.length]!}));
            return {count:enemyCount,types:scenario.robots,spawns};
        };
        const next=roomSeeds[index+1]?.id??null,count=scenario.reserved?0:[1,2,3,1,3][index]!;
        const waves=Array.from({length:count},(_,waveIndex)=>({id:`wave-${waveIndex+1}`,enemies:enemiesForWave(waveIndex),completion:"eliminate-all-enemies" as const}));
        const {theme,environmentStyle,title,hint}=scenario;
        const decorations=composeRoomDecorations(matrix,environmentStyle);
        return {...seed,availability:scenario.reserved?"reserved":"available",enemies:waves[0]?.enemies??{count:0,types:[],spawns:[]},order:index+1,encounter:index===4?"final":index===2?"special":count>1?"multiwave":"normal",waves,next,
            presentation:{scenarioId:seed.roomId,theme,environmentStyle,title,hint,decorations,layers:{floor:"floor",walls:"walls",collision:"collision",decoration:"decoration"}},
            exits:[{id:"progression-exit",position:findRoomTile(matrix,TileType.Exit),next,requiresClear:true}]};
    });
}
export const levels=createLevelCatalog();
export function isLevelIndex(index:unknown):index is number {
    return typeof index==="number"&&Number.isInteger(index)&&index>=0&&index<levels.length;
}

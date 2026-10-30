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
    id:'level-'+(index+1),roomId,difficulty:{moveSpeed:CombatBalance.moveSpeeds[index]!,detectionRange:CombatBalance.detectionRanges[index]!,shootCooldown:CombatBalance.shootCooldowns[index]!,patrol:true,...(index===3?{chargeDuration:CombatBalance.orangeIntroChargeMs}:{})},completion:'eliminate-all-enemies',scorePerEnemy:100
}));
export function createLevelCatalog(rooms:LevelRoomCatalog=arcadeRooms):readonly EncounterConfig[]{
    return roomSeeds.map((seed,index)=>{
        const matrix=rooms[seed.roomId]!;
        const difficulty={...seed.difficulty,detectionRange:seed.difficulty.detectionRange*Math.min(1,matrix[0]!.length/40,matrix.length/24)};
        const scenario=roomScenarios[index]!;
        const enemyCount=scenario.reserved||scenario.boss?0:Math.min(CombatBalance.enemiesPerWave[index]!,CombatBalance.maxActivePerLevel[index]!);
        const enemiesForWave=(waveIndex:number)=>{
            const zones=scenario.zones.slice(0,enemyCount).map(([row,column])=>[Math.min(.9,Math.max(.12,row+(waveIndex===1?.07:waveIndex===2?-.07:0))),Math.min(.9,Math.max(.12,column+(waveIndex===1?-.07:waveIndex===2?.07:0)))] as const);
            const spawns:readonly LevelEnemySpawn[]=placeRoomPoints(matrix,zones,3,Math.ceil((difficulty.detectionRange+64)/64)).map((position,spawnIndex)=>({...position,type:scenario.robots[(spawnIndex+waveIndex)%scenario.robots.length]!}));
            return {count:enemyCount,types:scenario.robots,spawns};
        };
        const next=roomSeeds[index+1]?.id??null,count=CombatBalance.wavesPerLevel[index]!;
        const waves=Array.from({length:count},(_,waveIndex)=>({id:`wave-${waveIndex+1}`,enemies:enemiesForWave(waveIndex),completion:"eliminate-all-enemies" as const}));
        const {theme,environmentStyle,title,hint}=scenario;
        const decorations=composeRoomDecorations(matrix,environmentStyle??'maintenance-teal');
        return {...seed,difficulty,availability:scenario.reserved?"reserved":"available",boss:scenario.boss?{type:'quimera' as const,mode:index===10?'advanced' as const:'trial' as const,spawn:{row:Math.floor(matrix.length/2),column:Math.floor(matrix[0]!.length/2)}}:undefined,enemies:waves[0]?.enemies??{count:0,types:[],spawns:[]},order:index+1,encounter:index===10?"final":scenario.boss||index===2?"special":count>1?"multiwave":"normal",waves,next,
            presentation:{scenarioId:seed.roomId,theme,environmentStyle,title,hint,decorations,layers:{floor:"floor",walls:"walls",collision:"collision",decoration:"decoration"}},
            exits:[{id:"progression-exit",position:findRoomTile(matrix,TileType.Exit),next,requiresClear:true}]};
    });
}
export const levels=createLevelCatalog();
export function isLevelIndex(index:unknown):index is number {
    return typeof index==="number"&&Number.isInteger(index)&&index>=0&&index<levels.length;
}

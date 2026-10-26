import type { LevelConfig, LevelEnemySpawn, LevelRoomCatalog } from "./LevelConfig";
import type { EncounterConfig } from "./WaveConfig";
import type { RoomTheme, DecorationConfig, DecorationKind } from "../world/environment/RoomTheme";
import type { EnvironmentStyle } from "../world/environment/EnvironmentSheets";
import { arcadeRooms } from "../data/rooms/arcadeRooms";
import { robotTypes } from "../config/RobotConfig";
import { TileType } from "../types/RoomTypes";
import { findRoomTile, placeRoomPoints, type RoomAnchor } from "./RoomPlacement";
import { CombatBalance } from "../config/CombatBalance";

const appearances: readonly (readonly [RoomTheme,EnvironmentStyle])[] = [
    ["industrial","industrial-green"],["laboratory","reactor-cyan"],["control","data-blue"],["industrial","cargo-olive"],["control","hangar-amber"]
];
const spawnZones:readonly RoomAnchor[]=[[.16,.25],[.38,.22],[.22,.48],[.60,.40],[.40,.66],[.72,.68],[.18,.78],[.78,.23],[.52,.86],[.84,.48],[.46,.46],[.68,.86],[.85,.80],[.18,.92]];
const decorationZones:readonly RoomAnchor[]=Array.from({length:48},(_,index)=>[.12+Math.floor(index/8)*.15,.09+(index%8)*.115] as const);
/** Existing movement and progression, with large-room combat tuning in one config. */
const roomSeeds:readonly Omit<LevelConfig,'enemies'>[]=['open-room','corridors','mixed-room','maze','combat-arena'].map((roomId,index)=>({
    id:'level-'+(index+1),roomId,difficulty:{moveSpeed:80+index*8,detectionRange:CombatBalance.detectionRanges[index]!,shootCooldown:CombatBalance.shootCooldowns[index]!,patrol:true},completion:'eliminate-all-enemies',scorePerEnemy:100
}));
export function createLevelCatalog(rooms:LevelRoomCatalog=arcadeRooms):readonly EncounterConfig[]{
    return roomSeeds.map((seed,index)=>{
        const matrix=rooms[seed.roomId]!;
        const enemyCount=CombatBalance.enemiesPerWave[index]!;
        const enemiesForWave=(waveIndex:number)=>{
            const zones=spawnZones.slice(0,enemyCount).map(([row,column])=>[Math.min(.9,Math.max(.12,row+(waveIndex===1?.07:waveIndex===2?-.07:0))),Math.min(.9,Math.max(.12,column+(waveIndex===1?-.07:waveIndex===2?.07:0)))] as const);
            const spawns:readonly LevelEnemySpawn[]=placeRoomPoints(matrix,zones,3,Math.ceil((seed.difficulty.detectionRange+64)/64)).map((position,spawnIndex)=>({...position,type:robotTypes[(spawnIndex+waveIndex+index)%robotTypes.length]!}));
            return {count:enemyCount,types:robotTypes,spawns};
        };
        const next=roomSeeds[index+1]?.id??null,count=[1,2,3,1,3][index]!;
        const waves=Array.from({length:count},(_,waveIndex)=>({id:`wave-${waveIndex+1}`,enemies:enemiesForWave(waveIndex),completion:"eliminate-all-enemies" as const}));
        const [theme,environmentStyle]=appearances[index]!;
        const kinds:readonly DecorationKind[]=["grate","panel","grate","circuit","panel","grate","circuit","panel","grate","warning","grate","panel"];
        const detailCount=Math.min(CombatBalance.maxFloorDetails,Math.floor((matrix.length-2)*(matrix[0]!.length-2)/10));
        const decorations:readonly DecorationConfig[]=placeRoomPoints(matrix,decorationZones.slice(0,detailCount),2).map((position,i)=>({...position,kind:kinds[(i+index)%kinds.length]!}));
        return {...seed,enemies:waves[0]!.enemies,order:index+1,encounter:index===4?"final":index===2?"special":count>1?"multiwave":"normal",waves,next,
            presentation:{scenarioId:seed.roomId,theme,environmentStyle,decorations,layers:{floor:"floor",walls:"walls",collision:"collision",decoration:"decoration"}},
            exits:[{id:"progression-exit",position:findRoomTile(matrix,TileType.Exit),next,requiresClear:true}]};
    });
}
export const levels=createLevelCatalog();
export function isLevelIndex(index:unknown):index is number {
    return typeof index==="number"&&Number.isInteger(index)&&index>=0&&index<levels.length;
}

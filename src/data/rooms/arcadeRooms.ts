import { TileType, type RoomMatrix } from "../../types/RoomTypes";
import type { LevelRoomCatalog } from "../../levels/LevelConfig";

export const arcadeRoomSize = { columns:40, rows:24 } as const;
type Block = readonly [row:number,column:number,height:number,width:number];
const designs: Readonly<Record<string,readonly Block[]>> = {
    "open-room":[[.34,.34,.08,.05],[.57,.65,.08,.05],[.24,.58,.08,.05],[.67,.20,.08,.05],[.78,.80,.045,.08],[.45,.82,.045,.05]],
    corridors:[[.14,.30,.35,.025],[.50,.63,.32,.025],[.28,.53,.08,.05],[.70,.20,.08,.05],[.18,.82,.08,.05],[.74,.82,.08,.05]],
    "mixed-room":[[.25,.20,.045,.15],[.62,.23,.09,.05],[.45,.60,.045,.15],[.70,.78,.09,.025],[.20,.73,.08,.05],[.78,.47,.08,.05],[.45,.35,.08,.05]],
    maze:[[.18,.28,.38,.025],[.45,.52,.38,.025],[.15,.75,.38,.025],[.65,.14,.08,.05],[.20,.48,.08,.05],[.73,.82,.08,.05]],
    "combat-arena":[[.28,.30,.08,.05],[.28,.68,.08,.05],[.68,.30,.08,.05],[.68,.68,.08,.05],[.46,.16,.08,.05],[.46,.83,.08,.05],[.16,.48,.045,.08],[.82,.48,.045,.08]]
};

/** Physical tile matrices, with wide connected routes and dimension-relative authoring. */
export function createArcadeRooms(columns:number=arcadeRoomSize.columns,rows:number=arcadeRoomSize.rows):LevelRoomCatalog {
    if(!Number.isSafeInteger(columns)||!Number.isSafeInteger(rows)||columns<20||rows<14)throw new RangeError("Arcade rooms require at least 20 columns and 14 rows");
    const result:Record<string,RoomMatrix>={};
    for(const [id,blocks] of Object.entries(designs)){
        const matrix:RoomMatrix=Array.from({length:rows},(_,r)=>Array.from({length:columns},(_,c)=>r===0||c===0||r===rows-1||c===columns-1?TileType.Wall:TileType.Floor));
        for(const [r,c,h,w] of blocks){
            const top=1+Math.round((rows-3)*r),left=1+Math.round((columns-3)*c);
            const height=Math.max(1,Math.round((rows-2)*h)),width=Math.max(1,Math.round((columns-2)*w));
            for(let y=top;y<Math.min(rows-2,top+height);y++)for(let x=left;x<Math.min(columns-2,left+width);x++)matrix[y]![x]=TileType.Wall;
        }
        matrix[1+Math.round((rows-3)*.12)]![1+Math.round((columns-3)*.08)]=TileType.PlayerSpawn;
        matrix[rows-2]![columns-2]=TileType.Exit;
        result[id]=matrix;
    }
    return result;
}
export const arcadeRooms = createArcadeRooms();

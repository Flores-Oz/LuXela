import { TileType, type RoomMatrix } from "../../types/RoomTypes";
import type { LevelRoomCatalog } from "../../levels/LevelConfig";

export const arcadeRoomSize = { columns:40, rows:24 } as const;
type Block = readonly [row:number,column:number,height:number,width:number];
// Author at 40x24, then resolve proportionally at every supported room size.
const blocks = (rectangles: readonly Block[]): readonly Block[] => rectangles.map(([r,c,h,w])=>[(r-1)/21,(c-1)/37,h/22,w/38]);
const designs: Readonly<Record<string,readonly Block[]>> = {
    // Red: three long horizontal firing lanes separated by equipment banks.
    "open-room":blocks([[6,8,2,6],[6,20,2,6],[6,31,2,5],[14,8,2,6],[14,20,2,6],[14,31,2,5],[2,28,2,5],[20,10,1,5],[20,25,1,5]]),
    // Blue: staggered racks, medium-distance avenues and room to retreat.
    corridors:blocks([[5,10,6,3],[15,10,5,3],[2,24,6,3],[12,24,6,3],[20,4,2,4],[20,31,2,5],[6,33,4,3],[14,33,3,3]]),
    // Yellow: offset machinery islands create short turns and connected loops.
    "mixed-room":blocks([[7,14,5,5],[12,22,5,5],[15,14,4,5],[5,22,4,5],[8,6,3,3],[16,6,3,3],[4,32,3,3],[13,32,3,3]]),
    // Orange: freestanding shielding obstructs normal shots, but leaves escape routes.
    maze:blocks([[3,10,6,2],[14,10,6,2],[6,22,7,2],[17,22,4,2],[3,32,6,2],[13,32,5,2],[10,4,2,4],[10,16,2,4],[10,27,2,3],[2,17,2,3],[19,4,2,3],[20,29,2,3],[15,16,2,3]]),
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

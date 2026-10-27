import { TileType, type RoomMatrix } from "../../types/RoomTypes";
import type { LevelRoomCatalog } from "../../levels/LevelConfig";

export const arcadeRoomSize = { columns:40, rows:24 } as const;
type Block = readonly [row:number,column:number,height:number,width:number];
// Author at 40x24, then resolve proportionally at every supported room size.
const blocks = (rectangles: readonly Block[]): readonly Block[] => rectangles.map(([r,c,h,w])=>[(r-1)/21,(c-1)/37,h/22,w/38]);
const designs: Readonly<Record<string,readonly Block[]>> = {
    // Red: three long horizontal firing lanes separated by equipment banks.
    "open-room":blocks([[6,8,2,5],[6,20,2,5],[6,31,2,5],[14,8,2,5],[14,20,2,5],[14,31,2,5],[2,28,2,5],[20,10,1,5],[20,25,1,5]]),
    // Blue: aligned rack banks with cross aisles, parallel avenues and lateral escape routes.
    corridors:blocks([[5,10,6,2],[15,10,5,2],[5,24,6,2],[15,24,5,2],[5,34,6,2],[15,34,5,2],[20,4,2,3],[2,24,1,4]]),
    // Yellow: offset machinery islands create short turns and connected loops.
    "mixed-room":blocks([[7,14,4,4],[12,22,4,4],[15,14,4,4],[5,22,4,4],[8,6,3,3],[16,6,3,3],[4,32,3,3],[13,32,3,3],[20,24,1,5],[2,14,1,4]]),
    // Orange: four L-shaped operational bays, a central shield and connected escape aisles.
    maze:blocks([[3,10,6,2],[3,10,2,7],[3,28,2,7],[3,33,6,2],[15,10,6,2],[19,10,2,7],[15,33,6,2],[19,28,2,7],[8,22,8,2],[11,4,2,3],[11,15,2,3],[11,28,2,3]]),
    // Reserved reactor: all infrastructure stays at the edges of a large clear central arena.
    "combat-arena":blocks([[3,8,3,3],[3,30,3,3],[18,8,3,3],[18,30,3,3],[2,18,2,4],[20,18,2,4]]),
    "convergence":blocks([[6,9,2,9],[15,9,2,9],[5,26,5,3],[15,26,5,3],[11,17,2,5],[20,5,1,5]]),
    "industrial-reactor":blocks([[7,15,3,4],[14,22,3,4],[15,10,3,4],[5,29,3,4],[3,8,2,4],[19,29,2,5]]),
    "defense-system":blocks([[5,10,5,2],[15,10,5,2],[5,26,5,2],[15,26,5,2],[10,18,2,5],[18,18,2,5],[3,33,3,3]]),
    "maximum-security":blocks([[3,13,6,2],[13,13,7,2],[6,5,2,7],[16,5,2,7],[5,26,2,8],[15,26,2,8],[9,26,4,2],[19,22,2,6]]),
    "last-defense":blocks([[5,8,4,3],[14,8,4,3],[4,20,3,4],[16,20,3,4],[9,30,3,4],[18,30,3,4],[10,16,3,4]]),
    "true-quimera-arena":blocks([[4,8,3,3],[4,30,3,3],[17,8,3,3],[17,30,3,3],[2,18,2,4],[20,18,2,4]])
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

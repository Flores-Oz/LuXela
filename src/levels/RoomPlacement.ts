import { TileType, type RoomMatrix } from "../types/RoomTypes";
import type { TilePosition } from "../world/Room";

export type RoomAnchor = readonly [rowFraction:number,columnFraction:number];
export function findRoomTile(matrix:RoomMatrix,type:TileType):TilePosition {
    for(let row=0;row<matrix.length;row++)for(let column=0;column<matrix[row]!.length;column++)if(matrix[row]![column]===type)return {row,column};
    throw new Error(`Room is missing tile ${type}`);
}
/** Resolve authored zones against the real matrix; never place content in a wall or doorway. */
export function placeRoomPoints(matrix:RoomMatrix,anchors:readonly RoomAnchor[],spacing=1,playerClearance=0):readonly TilePosition[]{
    const height=matrix.length,width=matrix[0]!.length,player=findRoomTile(matrix,TileType.PlayerSpawn),door=findRoomTile(matrix,TileType.Exit);
    const floor:TilePosition[]=[];
    for(let row=1;row<height-1;row++)for(let column=1;column<width-1;column++)if(matrix[row]![column]===TileType.Floor&&Math.hypot(row-player.row,column-player.column)>=playerClearance&&Math.hypot(row-door.row,column-door.column)>=2)floor.push({row,column});
    const result:TilePosition[]=[];
    for(const [r,c] of anchors){
        const row=1+(height-3)*r,column=1+(width-3)*c;
        const candidate=floor.filter(point=>result.every(other=>Math.hypot(point.row-other.row,point.column-other.column)>=spacing))
            .sort((a,b)=>Math.hypot(a.row-row,a.column-column)-Math.hypot(b.row-row,b.column-column))[0];
        if(!candidate)throw new Error("Insufficient safe room placements");
        result.push(candidate);
    }
    return result;
}

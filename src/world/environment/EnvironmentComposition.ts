import {TileType,type RoomMatrix} from "../../types/RoomTypes";
import type {DecorationConfig} from "./RoomTheme";
import type {EnvironmentStyle} from "./EnvironmentSheets";

type Cell={row:number;column:number};
export interface ObstacleGroup {cells:Cell[];top:number;left:number;bottom:number;right:number}

/** Reuse the physical cells to discover whole banks/racks instead of varying art per tile. */
export function obstacleGroups(width:number,height:number,walls:readonly Cell[]):ObstacleGroup[]{
    const remaining=new Map(walls.filter(cell=>cell.row>0&&cell.column>0&&cell.row<height-1&&cell.column<width-1).map(cell=>[`${cell.row},${cell.column}`,cell]));
    const groups:ObstacleGroup[]=[];
    while(remaining.size){
        const first=remaining.values().next().value!;remaining.delete(`${first.row},${first.column}`);
        const cells=[first];
        for(let i=0;i<cells.length;i++)for(const [dr,dc]of [[1,0],[-1,0],[0,1],[0,-1]]){
            const key=`${cells[i]!.row+dr!},${cells[i]!.column+dc!}`,next=remaining.get(key);
            if(next){remaining.delete(key);cells.push(next);}
        }
        groups.push({cells,top:Math.min(...cells.map(c=>c.row)),bottom:Math.max(...cells.map(c=>c.row)),left:Math.min(...cells.map(c=>c.column)),right:Math.max(...cells.map(c=>c.column))});
    }
    return groups;
}

/** Small connected service strips and justified warning signs, never a room-wide scatter grid. */
export function composeRoomDecorations(matrix:RoomMatrix,style:EnvironmentStyle):readonly DecorationConfig[]{
    const height=matrix.length,width=matrix[0]!.length,walls:Cell[]=[],reserved:Cell[]=[];
    for(let row=0;row<height;row++)for(let column=0;column<width;column++){
        if(matrix[row]![column]===TileType.Wall)walls.push({row,column});
        else if(matrix[row]![column]===TileType.PlayerSpawn||matrix[row]![column]===TileType.Exit)reserved.push({row,column});
    }
    const wallKeys=new Set(walls.map(cell=>`${cell.row},${cell.column}`));
    const result=new Map<string,DecorationConfig>();
    const add=(row:number,column:number,kind:DecorationConfig['kind'])=>{
        if(matrix[row]?.[column]!==TileType.Floor||reserved.some(c=>(c.row-row)**2+(c.column-column)**2<4))return false;
        let besideStructure=false;
        for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(wallKeys.has(`${row+dr},${column+dc}`))besideStructure=true;
        if(!besideStructure)return false;
        const key=`${row},${column}`;
        if(result.has(key))return false;
        result.set(key,{row,column,kind});return true;
    };
    let warningBudget=style==="quarantine-red"?3:style==="data-blue"?4:style==="cargo-olive"?10:6;
    for(const [index,group]of obstacleGroups(width,height,walls).entries()){
        const middle=Math.floor((group.left+group.right)/2);
        for(let offset=-1;offset<=1;offset++)add(group.bottom+1,middle+offset,'grate');
        for(let row=group.top;row<=Math.min(group.bottom,group.top+2);row++)add(row,group.left-1,'circuit');
        if(style==="cargo-olive")for(let column=group.left;column<=Math.min(group.left+1,group.right);column++)add(group.top-1,column,'panel');
        if(warningBudget>0&&index%2===0&&add(group.top-1,group.right+1,'warning'))warningBudget--;
    }
    return [...result.values()];
}

import {BossTacticsConfig} from '../../config/BossTacticsConfig';
import {clippedRayLength,type Point,type Box} from './BossAttackGeometry';

export function safeTeleportDestination(point:Point,player:Point,origin:Point,walls:readonly Box[],occupied:readonly Point[],view:Box,halfBody:Point,bodyCenterOffset:Point={x:0,y:0}):boolean {
    const t=BossTacticsConfig.teleport,margin=t.viewportMargin;
    if(point.x<view.x+margin||point.x>view.x+view.width-margin||point.y<view.y+margin||point.y>view.y+view.height-margin)return false;
    if(Math.hypot(point.x-player.x,point.y-player.y)<t.minPlayerDistance||Math.hypot(point.x-origin.x,point.y-origin.y)<t.minTravel)return false;
    if(occupied.some(other=>Math.hypot(point.x-other.x,point.y-other.y)<t.minEntityDistance))return false;
    const x=point.x+bodyCenterOffset.x-halfBody.x-t.bodyMargin,y=point.y+bodyCenterOffset.y-halfBody.y-t.bodyMargin,w=2*(halfBody.x+t.bodyMargin),h=2*(halfBody.y+t.bodyMargin);
    if(x<view.x||y<view.y||x+w>view.x+view.width||y+h>view.y+view.height)return false;
    if(walls.some(wall=>x<wall.x+wall.width&&x+w>wall.x&&y<wall.y+wall.height&&y+h>wall.y))return false;
    const distance=Math.hypot(point.x-player.x,point.y-player.y);
    return clippedRayLength(point,{x:(player.x-point.x)/distance,y:(player.y-point.y)/distance},distance,walls)>=distance;
}

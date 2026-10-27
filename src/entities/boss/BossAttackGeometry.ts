export interface Point {x:number;y:number}
export interface Box {x:number;y:number;width:number;height:number}
/** Distance to the first solid AABB along a fixed ray, including exterior walls. */
export function clippedRayLength(origin:Point,direction:Point,range:number,walls:readonly Box[]):number {
    let length=range;
    for(const wall of walls){let enter=0,exit=range;
        for(const [position,velocity,min,max]of [[origin.x,direction.x,wall.x,wall.x+wall.width],[origin.y,direction.y,wall.y,wall.y+wall.height]]){
            if(Math.abs(velocity!)<.000001){if(position!<min!||position!>max!){exit=-1;break;}}
            else {const a=(min!-position!)/velocity!,b=(max!-position!)/velocity!;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));}
        }
        if(exit>=enter&&exit>=0)length=Math.min(length,Math.max(0,enter));
    }
    return length;
}
export function beamHits(origin:Point,angle:number,length:number,width:number,body:Box):boolean {
    const expanded={x:body.x-width/2,y:body.y-width/2,width:body.width+width,height:body.height+width};
    return clippedRayLength(origin,{x:Math.cos(angle),y:Math.sin(angle)},length+.001,[expanded])<=length;
}
export function ringHits(origin:Point,radius:number,thickness:number,body:Box):boolean {
    const nearX=Math.max(body.x,Math.min(origin.x,body.x+body.width)),nearY=Math.max(body.y,Math.min(origin.y,body.y+body.height));
    const nearest=Math.hypot(nearX-origin.x,nearY-origin.y);
    const farthest=Math.max(...[body.x,body.x+body.width].flatMap(x=>[body.y,body.y+body.height].map(y=>Math.hypot(x-origin.x,y-origin.y))));
    return nearest<=radius+thickness/2&&farthest>=radius-thickness/2;
}

import {clippedRayLength,type Box,type Point} from './BossAttackGeometry';

export const BossEvasionConfig={chance:.35,cooldownMs:3500,retryMs:500,durationMs:240,speed:560,lookAheadMs:450,minReactionMs:160} as const;
export interface IncomingShot extends Point {id:object;vx:number;vy:number;radius:number}
const overlaps=(a:Box,b:Box)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;

/** An occasional physical sidestep; never grants invulnerability or cancels damage. */
export class BossEvasion {
    private readonly observed=new WeakSet<object>();
    private nextAttempt=0;
    private until=0;
    private velocity:Point|null=null;
    private readonly random:()=>number;
    constructor(random:()=>number=Math.random){this.random=random;}
    cancel():void {this.velocity=null;this.until=0;}
    update(now:number,allowed:boolean,body:Box,shots:readonly IncomingShot[],walls:readonly Box[],occupied:readonly Box[],bounds:Box):Point|null {
        if(!allowed){this.cancel();return null;}
        const c=BossEvasionConfig;
        const safe=(v:Point,seconds:number)=>{
            const dx=v.x*seconds,dy=v.y*seconds;
            // Conservative swept body, including the entire route rather than only its endpoint.
            const sweep={x:body.x+Math.min(0,dx)-4,y:body.y+Math.min(0,dy)-4,width:body.width+Math.abs(dx)+8,height:body.height+Math.abs(dy)+8};
            return sweep.x>=bounds.x&&sweep.y>=bounds.y&&sweep.x+sweep.width<=bounds.x+bounds.width&&sweep.y+sweep.height<=bounds.y+bounds.height&&![...walls,...occupied].some(box=>overlaps(sweep,box));
        };
        if(this.velocity&&now<this.until){
            if(safe(this.velocity,(this.until-now)/1000))return this.velocity;
            this.cancel();return null;
        }
        this.cancel();if(now<this.nextAttempt)return null;
        const threats=shots.flatMap(shot=>{
            if(this.observed.has(shot.id))return [];
            const speed=Math.hypot(shot.vx,shot.vy);if(!Number.isFinite(speed)||speed<1)return [];
            const direction={x:shot.vx/speed,y:shot.vy/speed},range=speed*c.lookAheadMs/1000;
            const expanded={x:body.x-shot.radius,y:body.y-shot.radius,width:body.width+2*shot.radius,height:body.height+2*shot.radius};
            const distance=clippedRayLength(shot,direction,range+.01,[expanded]);
            if(distance>range||distance/speed<c.minReactionMs/1000||clippedRayLength(shot,direction,distance,walls)<distance)return [];
            return [{shot,direction,time:distance/speed}];
        }).sort((a,b)=>a.time-b.time);
        const threat=threats[0];if(!threat)return null;
        this.observed.add(threat.shot.id);this.nextAttempt=now+c.retryMs;
        if(this.random()>=c.chance)return null;
        for(const sign of [1,-1]){
            const velocity={x:-threat.direction.y*c.speed*sign,y:threat.direction.x*c.speed*sign};
            if(!safe(velocity,c.durationMs/1000))continue;
            this.velocity=velocity;this.until=now+c.durationMs;this.nextAttempt=now+c.cooldownMs;
            return velocity;
        }
        return null;
    }
}

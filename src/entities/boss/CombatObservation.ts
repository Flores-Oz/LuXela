import {AdvancedCombat} from '../../config/QuimeraAdvancedConfig';
type Point={x:number;y:number};
/** Only observed past/current displacement; bounded anticipation, no tracking projectiles. */
export class CombatObservation {
    private previous:Point|null=null;
    stationaryMs=0;
    velocity={x:0,y:0};
    update(delta:number,point:Point):void {
        if(!Number.isFinite(delta)||delta<=0)return;
        if(this.previous){const dx=point.x-this.previous.x,dy=point.y-this.previous.y;
            this.stationaryMs=Math.hypot(dx,dy)<.5?this.stationaryMs+delta:0;
            this.velocity={x:this.velocity.x*.7+dx/delta*1000*.3,y:this.velocity.y*.7+dy/delta*1000*.3};
        }
        this.previous={...point};
    }
    predict(point:Point):Point {
        const a=AdvancedCombat.adaptation,dx=this.velocity.x*a.leadMs/1000,dy=this.velocity.y*a.leadMs/1000,scale=Math.min(1,a.maxLead/(Math.hypot(dx,dy)||1));
        return {x:point.x+dx*scale,y:point.y+dy*scale};
    }
}

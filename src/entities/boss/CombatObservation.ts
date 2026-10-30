import {AdvancedCombat} from '../../config/QuimeraAdvancedConfig';
import {BossTacticsConfig} from '../../config/BossTacticsConfig';
type Point={x:number;y:number};
/** Only observed past/current displacement; bounded anticipation, no tracking projectiles. */
export class CombatObservation {
    private previous:Point|null=null;
    private region:Point|null=null;
    private direction:Point|null=null;
    stationaryMs=0;
    consistentDirectionMs=0;
    velocity={x:0,y:0};
    update(delta:number,point:Point):void {
        if(!Number.isFinite(delta)||delta<=0)return;
        if(!this.region||Math.hypot(point.x-this.region.x,point.y-this.region.y)>BossTacticsConfig.observation.regionRadius){this.region={x:point.x,y:point.y};this.stationaryMs=0;}
        else this.stationaryMs+=delta;
        if(this.previous){const dx=point.x-this.previous.x,dy=point.y-this.previous.y,length=Math.hypot(dx,dy);
            if(length/delta*1000>1000){this.velocity={x:0,y:0};this.direction=null;this.consistentDirectionMs=0;this.previous={x:point.x,y:point.y};return;}
            if(length/delta*1000>10){
                const next={x:dx/length,y:dy/length};
                this.consistentDirectionMs=this.direction&&next.x*this.direction.x+next.y*this.direction.y>=BossTacticsConfig.observation.directionCosine?this.consistentDirectionMs+delta:delta;
                this.direction=next;
            }else {this.direction=null;this.consistentDirectionMs=0;}
            this.velocity={x:this.velocity.x*.7+dx/delta*1000*.3,y:this.velocity.y*.7+dy/delta*1000*.3};
        }
        this.previous={x:point.x,y:point.y};
    }
    predict(point:Point):Point {
        const a=AdvancedCombat.adaptation,dx=this.velocity.x*a.leadMs/1000,dy=this.velocity.y*a.leadMs/1000,scale=Math.min(1,a.maxLead/(Math.hypot(dx,dy)||1));
        return {x:point.x+dx*scale,y:point.y+dy*scale};
    }
}

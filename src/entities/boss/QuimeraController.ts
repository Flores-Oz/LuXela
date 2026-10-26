import {QuimeraConfig as config,type BossAttack,type BossPhase,type BossState} from '../../config/QuimeraConfig';
import {EnemyAttackController,type EnemyShot} from '../enemies/EnemyAttackController';
import {robotAttacks,type RobotType} from '../../config/RobotConfig';

type Point={x:number;y:number};
export interface BossFrame {shots:EnemyShot[];pulse:boolean}
const angleTo=(from:Point,to:Point)=>Math.atan2(to.y-from.y,to.x-from.x);

/** Delta-clock state machine: pause means no updates, and no timers can outlive the boss. */
export class QuimeraController {
    health:number=config.maxHealth;
    phase:BossPhase=1;
    state:BossState='INTRO';
    attack:BossAttack='aim';
    module:RobotType='robot-red';
    time=0;
    stateStartedAt=0;
    aim=0;
    private dueAt:number=config.introMs;
    private patternIndex=0;
    private moduleIndex=0;
    private emitted=0;
    private nextShotAt=0;
    private moduleAttack:EnemyAttackController|null=null;

    get alive():boolean{return this.health>0&&this.state!=='STOPPED';}
    get vulnerable():boolean{return this.alive&&this.state!=='INTRO'&&this.state!=='PHASE_TRANSITION';}
    get charging():boolean{return this.state==='CHARGING'||this.state==='ATTACKING'&&this.attack==='combined'&&this.emitted===1;}
    get pulseWarning():boolean{return this.state==='CHARGING'&&this.attack==='pulse';}
    private get requestedPhase():BossPhase{return this.health<=config.maxHealth*config.phaseThresholds[1]?3:this.health<=config.maxHealth*config.phaseThresholds[0]?2:1;}
    damage(amount:number):number {
        if(!this.vulnerable||!Number.isFinite(amount)||amount<=0)return 0;
        const before=this.health;
        this.health=Math.max(0,this.health-amount*(this.state==='RECOVERING'?config.recoveryDamageMultiplier:1));
        if(this.health===0){this.moduleAttack?.cancel(this.time);this.enter('DEAD',0);}
        return before-this.health;
    }
    stop():void {this.moduleAttack?.cancel(this.time);if(this.state!=='DEAD')this.enter('STOPPED',0);}

    update(delta:number,from:Point,target:Point,lineOfSight:boolean,visible=true):BossFrame {
        const frame:BossFrame={shots:[],pulse:false};
        if(!this.alive||!Number.isFinite(delta)||delta<=0)return frame;
        this.time+=delta;
        if(!visible&&(this.state==='CHARGING'||this.state==='ATTACKING')){this.recover();return frame;}
        if(this.state==='INTRO'||this.state==='PHASE_TRANSITION'){
            if(this.time>=this.dueAt)this.enter('REPOSITION',config.repositionMs[this.phase-1]!);
            return frame;
        }
        if(this.state==='RECOVERING'){
            if(this.time>=this.dueAt){
                const next=this.requestedPhase;
                if(next>this.phase){this.phase=next;this.patternIndex=0;this.enter('PHASE_TRANSITION',config.transitionMs);}
                else this.enter('REPOSITION',config.repositionMs[this.phase-1]!);
            }
            return frame;
        }
        if(this.state==='REPOSITION'){
            if(this.requestedPhase>this.phase){this.phase=this.requestedPhase;this.patternIndex=0;this.enter('PHASE_TRANSITION',config.transitionMs);return frame;}
            if(this.time<this.dueAt)return frame;
            if(!visible){this.enter('REPOSITION',250);return frame;}
            const patterns=config.phasePatterns[this.phase-1]!;
            this.attack=patterns[this.patternIndex++%patterns.length]!;
            if(this.attack==='module')this.module=config.modules[this.moduleIndex++%config.modules.length]!;
            // Normal patterns need sight. Relocate again if solid cover occludes the player.
            if(!lineOfSight&&!(this.attack==='module'&&this.module==='robot-orange')){
                this.enter('REPOSITION',Math.min(650,config.repositionMs[this.phase-1]!));return frame;
            }
            this.aim=angleTo(from,target);this.emitted=0;
            this.moduleAttack=this.attack==='module'?new EnemyAttackController(robotAttacks[this.module]):null;
            let warning:number=config.warningMs[this.attack];
            if(this.attack==='module'&&this.module==='robot-orange'){
                warning=robotAttacks[this.module].chargeDuration!;
                this.moduleAttack!.update(this.time,true,from,target);
            }
            this.enter('CHARGING',warning);
            return frame;
        }
        if(this.state==='CHARGING'){
            if(this.attack==='module'&&this.module==='robot-orange'&&Math.hypot(target.x-from.x,target.y-from.y)>robotAttacks[this.module].attackRange){this.recover();return frame;}
            if(this.time<this.dueAt)return frame;
            this.enter('ATTACKING',0);this.nextShotAt=this.time;
        }
        if(this.state!=='ATTACKING'||this.time<this.nextShotAt)return frame;
        const shot=(angle:number,speed:number=config.projectileSpeed[this.phase-1]!,piercing=false):EnemyShot=>({
            direction:{x:Math.cos(angle),y:Math.sin(angle)},speed,attackType:piercing?'piercing-spread':'single',piercesInteriorWalls:piercing
        });
        const spread=()=>Array.from({length:config.spreadCount},(_,i)=>shot(this.aim+(-config.spreadAngle+i*2*config.spreadAngle/(config.spreadCount-1))*Math.PI/180));
        if(this.attack==='module'){
            const inRange=Math.hypot(target.x-from.x,target.y-from.y)<=robotAttacks[this.module].attackRange;
            const eligible=inRange&&(this.module==='robot-orange'||lineOfSight);
            const volley=this.moduleAttack!.update(this.time,eligible,from,target);
            if(volley){frame.shots=volley;this.emitted+=volley.length;}
            const expected=this.module==='robot-blue'?robotAttacks[this.module].burstCount!:this.module==='robot-orange'?robotAttacks[this.module].spreadCount!:this.module==='robot-yellow'?config.yellowShots:1;
            if(this.emitted>=expected||(!eligible&&this.module!=='robot-yellow')||!lineOfSight&&this.module==='robot-yellow'||this.module==='robot-yellow'&&this.time-this.stateStartedAt>=config.yellowModuleMs)this.recover();
        }else if(this.attack==='pulse'){
            frame.pulse=true;this.recover();
        }else if(this.attack==='critical'){
            for(let i=0;i<config.criticalCount;i++){
                const angle=-180+i*360/config.criticalCount;
                if(Math.abs(angle)<config.criticalSafeAngle/2)continue;
                frame.shots.push(shot(this.aim+angle*Math.PI/180));
            }
            this.recover();
        }else if(this.attack==='combined'){
            if(this.emitted===0){frame.shots=spread();this.emitted=1;this.aim=angleTo(from,target);this.nextShotAt=this.time+config.combinedDelay;}
            else{if(lineOfSight)frame.shots=[shot(this.aim)];this.recover();}
        }else if(this.attack==='spread'){
            frame.shots=spread();this.recover();
        }else if(this.attack==='burst'){
            if(!lineOfSight){this.recover();return frame;}
            frame.shots=[shot(this.aim)];this.emitted++;this.nextShotAt=this.time+config.shortBurstDelay;
            if(this.emitted>=config.shortBurstCount)this.recover();
        }else{
            if(lineOfSight)frame.shots=[shot(this.aim)];this.recover();
        }
        return frame;
    }
    private recover():void {this.moduleAttack?.cancel(this.time);this.enter('RECOVERING',config.recoveryMs[this.phase-1]!);}
    private enter(state:BossState,duration:number):void {this.state=state;this.stateStartedAt=this.time;this.dueAt=this.time+duration;}
}

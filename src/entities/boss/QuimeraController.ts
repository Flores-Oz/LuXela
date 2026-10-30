import {QuimeraConfig as defaultConfig,type QuimeraTuning,type BossAttack,type BossPhase,type BossState} from '../../config/QuimeraConfig';
import {EnemyAttackController,type EnemyShot} from '../enemies/EnemyAttackController';
import {robotAttacks,type RobotType} from '../../config/RobotConfig';
import {BossFinisherConfig} from '../../config/BossFinisherConfig';
import {QuimeraAdvancedConfig,AdvancedCombat} from '../../config/QuimeraAdvancedConfig';
import {CombatObservation} from './CombatObservation';

type Point={x:number;y:number};
export interface BossFrame {shots:EnemyShot[];pulse:boolean;beam?:boolean;shockwave?:boolean;summon?:boolean}
const angleTo=(from:Point,to:Point)=>Math.atan2(to.y-from.y,to.x-from.x);

/** Delta-clock state machine: pause means no updates, and no timers can outlive the boss. */
export class QuimeraController {
    health:number;
    phase:BossPhase=1;
    state:BossState='INTRO';
    attack:BossAttack='aim';
    module:RobotType='robot-red';
    time=0;
    stateStartedAt=0;
    aim=0;
    private dueAt:number;
    private patternIndex=0;
    private moduleIndex=0;
    private comboQueue:BossAttack[]=[];
    private emitted=0;
    private nextShotAt=0;
    private moduleAttack:EnemyAttackController|null=null;
    finisherTriggered=false;

    readonly config:QuimeraTuning;
    readonly advanced:boolean;
    readonly observation=new CombatObservation();
    constructor(mode:'trial'|'advanced'='trial'){this.advanced=mode==='advanced';this.config=this.advanced?QuimeraAdvancedConfig:defaultConfig;this.health=this.config.maxHealth;this.dueAt=this.config.introMs;}

    get alive():boolean{return this.health>0&&this.state!=='STOPPED';}
    get vulnerable():boolean{return this.alive&&!['INTRO','PHASE_TRANSITION','QTE','FINISHING'].includes(this.state);}
    get charging():boolean{return this.state==='CHARGING'||this.state==='ATTACKING'&&this.attack==='combined'&&this.emitted===1;}
    get pulseWarning():boolean{return this.state==='CHARGING'&&this.attack==='pulse';}
    get finisherAvailable():boolean{return this.alive&&!this.finisherTriggered&&this.health<=this.config.maxHealth*(BossFinisherConfig.healthRatio+Number.EPSILON);}
    tryStartFinisher(distance:number,lineOfSight:boolean):boolean {
        if(!this.finisherAvailable||!this.vulnerable||!lineOfSight||!Number.isFinite(distance)||distance<0||distance>BossFinisherConfig.activationRange)return false;
        this.comboQueue=[];this.finisherTriggered=true;this.moduleAttack?.cancel(this.time);this.enter('QTE',0);return true;
    }
    private get requestedPhase():BossPhase {return (1+this.config.phaseThresholds.filter(threshold=>this.health<=this.config.maxHealth*threshold).length) as BossPhase;}
    damage(amount:number):number {
        if(!this.vulnerable||!Number.isFinite(amount)||amount<=0)return 0;
        const before=this.health;
        this.health=Math.max(0,this.health-amount*(this.state==='RECOVERING'?this.config.recoveryDamageMultiplier:1));
        if(this.health===0){this.comboQueue=[];this.moduleAttack?.cancel(this.time);this.enter('DEAD',0);}
        return before-this.health;
    }
    stop():void {this.comboQueue=[];this.moduleAttack?.cancel(this.time);if(this.state!=='DEAD')this.enter('STOPPED',0);}
    resolveFinisher(success:boolean):boolean {
        if(this.state!=='QTE')return false;
        if(success)this.enter('FINISHING',0);else this.recover();
        return true;
    }
    completeFinisher():boolean {
        if(this.state!=='FINISHING')return false;
        this.health=0;this.enter('DEAD',0);return true;
    }

    update(delta:number,from:Point,target:Point,lineOfSight:boolean,visible=true):BossFrame {
        const frame:BossFrame={shots:[],pulse:false};
        if(!this.alive||this.state==='QTE'||this.state==='FINISHING'||!Number.isFinite(delta)||delta<=0)return frame;
        this.time+=delta;if(this.advanced)this.observation.update(delta,target);
        if(!visible&&(this.state==='CHARGING'||this.state==='ATTACKING')){this.comboQueue=[];this.recover();return frame;}
        if(this.state==='INTRO'||this.state==='PHASE_TRANSITION'){
            if(this.time>=this.dueAt)this.enter('REPOSITION',this.config.repositionMs[this.phase-1]!);
            return frame;
        }
        if(this.state==='RECOVERING'){
            if(this.time>=this.dueAt){
                const next=this.requestedPhase;
                if(next>this.phase){this.comboQueue=[];this.phase=next;this.patternIndex=0;this.enter('PHASE_TRANSITION',this.config.transitionMs);}
                else if(this.comboQueue.length){this.attack=this.comboQueue.shift()!;this.prepareAttack(from,target,lineOfSight);}
                else this.enter('REPOSITION',this.config.repositionMs[this.phase-1]!);
            }
            return frame;
        }
        if(this.state==='REPOSITION'){
            if(this.requestedPhase>this.phase){this.phase=this.requestedPhase;this.patternIndex=0;this.enter('PHASE_TRANSITION',this.config.transitionMs);return frame;}
            if(this.time<this.dueAt)return frame;
            if(!visible){this.enter('REPOSITION',250);return frame;}
            const patterns=this.config.phasePatterns[this.phase-1]!;
            this.attack=patterns[this.patternIndex++%patterns.length]!;
            if(this.advanced&&this.attack!=='arsenal'&&this.patternIndex%AdvancedCombat.adaptation.selectEvery===0){
                if(this.phase===4&&Math.hypot(target.x-from.x,target.y-from.y)>AdvancedCombat.adaptation.farDistance)this.attack='beam';
                else if(this.observation.stationaryMs>AdvancedCombat.adaptation.stationaryMs)this.attack='aim';
            }
            if(this.attack==='arsenal'){
                this.module='robot-orange';
                this.comboQueue=['cross-burst','beam'];
                this.attack='module';
            }else if(this.attack==='module')this.module=this.config.modules[this.moduleIndex++%this.config.modules.length]!;
            this.prepareAttack(from,target,lineOfSight);
            return frame;
        }
        if(this.state==='CHARGING'){
            if(this.attack==='module'&&this.module==='robot-orange'&&Math.hypot(target.x-from.x,target.y-from.y)>robotAttacks[this.module].attackRange){this.comboQueue=[];this.recover();return frame;}
            if(this.time<this.dueAt)return frame;
            this.enter('ATTACKING',0);this.nextShotAt=this.time;
        }
        if(this.state!=='ATTACKING'||this.time<this.nextShotAt)return frame;
        const shot=(angle:number,speed:number=this.config.projectileSpeed[this.phase-1]!,piercing=false):EnemyShot=>({
            direction:{x:Math.cos(angle),y:Math.sin(angle)},speed,attackType:piercing?'piercing-spread':'single',piercesInteriorWalls:piercing
        });
        const spread=()=>Array.from({length:this.config.spreadCount},(_,i)=>shot(this.aim+(-this.config.spreadAngle+i*2*this.config.spreadAngle/(this.config.spreadCount-1))*Math.PI/180));
        if(this.attack==='beam'||this.attack==='shockwave'||this.attack==='summon'){
            frame[this.attack]=true;this.recover();
        }else if(this.attack==='alternating'||this.attack==='cross-burst'){
            const side=this.emitted%2===0?-1:1,angle=this.aim;
            const volley=this.attack==='cross-burst'?[-.24,0,.24]:[0];
            frame.shots=volley.map(offset=>({...shot(angle+offset),originOffset:{x:-Math.sin(angle)*side*45,y:Math.cos(angle)*side*45},visualFrame:side<0?0:4}));
            this.emitted++;this.nextShotAt=this.time+AdvancedCombat.volleyDelayMs;
            if(this.emitted>=(this.attack==='alternating'?AdvancedCombat.alternatingVolleys:AdvancedCombat.crossBurstVolleys))this.recover();
        }else if(this.attack==='module'){
            const inRange=Math.hypot(target.x-from.x,target.y-from.y)<=robotAttacks[this.module].attackRange;
            const eligible=inRange&&(this.module==='robot-orange'||lineOfSight);
            const volley=this.moduleAttack!.update(this.time,eligible,from,target);
            if(volley){frame.shots=volley;this.emitted+=volley.length;}
            const expected=this.module==='robot-blue'?robotAttacks[this.module].burstCount!:this.module==='robot-orange'?robotAttacks[this.module].spreadCount!:this.module==='robot-yellow'?this.config.yellowShots:1;
            if(this.emitted>=expected||(!eligible&&this.module!=='robot-yellow')||!lineOfSight&&this.module==='robot-yellow'||this.module==='robot-yellow'&&this.time-this.stateStartedAt>=this.config.yellowModuleMs)this.recover();
        }else if(this.attack==='pulse'){
            frame.pulse=true;this.recover();
        }else if(this.attack==='critical'){
            for(let i=0;i<this.config.criticalCount;i++){
                const angle=-180+i*360/this.config.criticalCount;
                if(Math.abs(angle)<this.config.criticalSafeAngle/2)continue;
                frame.shots.push(shot(this.aim+angle*Math.PI/180));
            }
            this.recover();
        }else if(this.attack==='combined'){
            if(this.emitted===0){frame.shots=spread();this.emitted=1;this.aim=angleTo(from,target);this.nextShotAt=this.time+this.config.combinedDelay;}
            else{if(lineOfSight)frame.shots=[shot(this.aim)];this.recover();}
        }else if(this.attack==='spread'){
            frame.shots=spread();this.recover();
        }else if(this.attack==='burst'){
            if(!lineOfSight){this.recover();return frame;}
            frame.shots=[shot(this.aim)];this.emitted++;this.nextShotAt=this.time+this.config.shortBurstDelay;
            if(this.emitted>=this.config.shortBurstCount)this.recover();
        }else{
            if(lineOfSight)frame.shots=[shot(this.aim)];this.recover();
        }
        return frame;
    }
    /** Each combo stage locks a fresh aim and receives its own full warning. */
    private prepareAttack(from:Point,target:Point,lineOfSight:boolean):void {
        if(!lineOfSight&&!(this.attack==='module'&&this.module==='robot-orange')){
            this.comboQueue=[];this.enter('REPOSITION',650);return;
        }
        if(this.attack==='module'&&this.module==='robot-orange'&&Math.hypot(target.x-from.x,target.y-from.y)>robotAttacks[this.module].attackRange){
            this.comboQueue=[];this.enter('REPOSITION',650);return;
        }
        this.aim=angleTo(from,target);this.emitted=0;
        if(this.advanced&&this.attack==='aim')this.aim=angleTo(from,this.observation.predict(target));
        this.moduleAttack=this.attack==='module'?new EnemyAttackController(robotAttacks[this.module]):null;
        let warning=this.config.warningMs[this.attack]??700;
        if(this.attack==='module'&&this.module==='robot-orange'){
            warning=robotAttacks[this.module].chargeDuration!;
            this.moduleAttack!.update(this.time,true,from,target);
        }
        this.enter('CHARGING',warning);
    }
    private recover():void {this.moduleAttack?.cancel(this.time);this.enter('RECOVERING',this.comboQueue.length?AdvancedCombat.comboRecoveryMs:this.config.recoveryMs[this.phase-1]!);}
    private enter(state:BossState,duration:number):void {this.state=state;this.stateStartedAt=this.time;this.dueAt=this.time+duration;}
}

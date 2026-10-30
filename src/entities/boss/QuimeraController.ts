import {QuimeraConfig as defaultConfig,type QuimeraTuning,type BossAttack,type BossPhase,type BossState} from '../../config/QuimeraConfig';
import {EnemyAttackController,type EnemyShot} from '../enemies/EnemyAttackController';
import {robotAttacks,type RobotType} from '../../config/RobotConfig';
import {BossFinisherConfig} from '../../config/BossFinisherConfig';
import {QuimeraAdvancedConfig,AdvancedCombat} from '../../config/QuimeraAdvancedConfig';
import {CombatObservation} from './CombatObservation';
import {BossTacticsConfig} from '../../config/BossTacticsConfig';

type Point={x:number;y:number};
export interface BossFrame {shots:EnemyShot[];pulse:boolean;beam?:boolean;shockwave?:boolean;summon?:boolean;area?:Point;teleportStart?:boolean;teleportEnd?:boolean;phaseChanged?:boolean}
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
    private readonly recentAttacks:BossAttack[]=[];
    private readonly reactionAt=new Map<string,number>();
    private nextTeleportAt=0;
    private afterTeleport=false;
    warningTarget:Point={x:0,y:0};
    private emitted=0;
    private nextShotAt=0;
    private moduleAttack:EnemyAttackController|null=null;
    finisherTriggered=false;

    readonly config:QuimeraTuning;
    readonly advanced:boolean;
    get tactics(){return this.advanced?BossTacticsConfig.advanced:BossTacticsConfig.trial;}
    readonly observation=new CombatObservation();
    constructor(mode:'trial'|'advanced'='trial'){this.advanced=mode==='advanced';this.config=this.advanced?QuimeraAdvancedConfig:defaultConfig;this.health=this.config.maxHealth;this.dueAt=this.config.introMs;}

    get alive():boolean{return this.health>0&&this.state!=='STOPPED';}
    get vulnerable():boolean{return this.alive&&!['INTRO','PHASE_TRANSITION','TELEPORTING','QTE','FINISHING'].includes(this.state);}
    get charging():boolean{return this.state==='CHARGING'||this.state==='ATTACKING'&&this.attack==='combined'&&this.emitted===1;}
    get pulseWarning():boolean{return this.state==='CHARGING'&&this.attack==='pulse';}
    get finisherAvailable():boolean{return this.alive&&!this.finisherTriggered&&this.health<=this.config.maxHealth*(BossFinisherConfig.healthRatio+Number.EPSILON);}
    tryStartFinisher(distance:number,lineOfSight:boolean):boolean {
        if(!this.finisherAvailable||!this.vulnerable||!lineOfSight||!Number.isFinite(distance)||distance<0||distance>BossFinisherConfig.activationRange)return false;
        this.comboQueue=[];this.finisherTriggered=true;this.moduleAttack?.cancel(this.time);this.enter('QTE',0);return true;
    }
    private get requestedPhase():BossPhase {return (1+this.config.phaseThresholds.filter(threshold=>this.health<this.config.maxHealth*threshold).length) as BossPhase;}
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

    update(delta:number,from:Point,target:Point,lineOfSight:boolean,visible=true,context:{teleportAvailable?:boolean;effectsBusy?:boolean;summonAvailable?:boolean}={}):BossFrame {
        const frame:BossFrame={shots:[],pulse:false};
        if(!this.alive||this.state==='QTE'||this.state==='FINISHING'||!Number.isFinite(delta)||delta<=0)return frame;
        this.time+=delta;this.observation.update(delta,target);
        if(this.state==='TELEPORTING'){
            if(this.time>=this.dueAt){frame.teleportEnd=true;this.afterTeleport=true;this.enter('REPOSITION',this.tactics.postTeleportMs);}
            return frame;
        }
        if(!visible&&(this.state==='CHARGING'||this.state==='ATTACKING')){this.comboQueue=[];this.recover();return frame;}
        if(this.state==='INTRO'||this.state==='PHASE_TRANSITION'){
            if(this.time>=this.dueAt)this.enter('REPOSITION',this.config.repositionMs[this.phase-1]!);
            return frame;
        }
        if(this.state==='RECOVERING'){
            if(this.time>=this.dueAt){
                const next=this.requestedPhase;
                if(next>this.phase){this.changePhase(next);frame.phaseChanged=true;}
                else if(this.comboQueue.length){this.attack=this.comboQueue.shift()!;this.prepareAttack(from,target,lineOfSight);}
                else this.enter('REPOSITION',this.config.repositionMs[this.phase-1]!);
            }
            return frame;
        }
        if(this.state==='REPOSITION'){
            if(this.requestedPhase>this.phase){this.changePhase(this.requestedPhase);frame.phaseChanged=true;return frame;}
            if(this.time<this.dueAt)return frame;
            const distance=Math.hypot(target.x-from.x,target.y-from.y);
            if(!this.afterTeleport&&context.teleportAvailable&&!context.effectsBusy&&this.time>=this.nextTeleportAt&&
                (!lineOfSight||distance>this.tactics.farDistance||distance<this.tactics.nearDistance||this.observation.stationaryMs>=this.tactics.stationaryMs)){
                this.nextTeleportAt=this.time+this.tactics.teleportCooldownMs[this.phase-1]!;
                this.enter('TELEPORTING',this.tactics.teleportWarningMs);frame.teleportStart=true;return frame;
            }
            if(!visible||context.effectsBusy){this.enter('REPOSITION',200);return frame;}
            this.attack=this.afterTeleport?(this.advanced&&this.phase>=2?'beam':'aim'):this.selectAttack(distance,lineOfSight,context.summonAvailable!==false);
            this.afterTeleport=false;
            this.remember(this.attack);
            if(this.attack==='arsenal'){
                this.module='robot-orange';this.comboQueue=['cross-burst','beam'];this.attack='module';
            }else if(this.attack==='barrage'){
                this.comboQueue=['cross-burst','burst','cross-burst'];this.attack='burst';
            }else if(this.attack==='beam-chain'){
                this.comboQueue=['beam'];this.attack='beam';
            }else if(this.attack==='pressure'){
                this.comboQueue=this.advanced?['beam','beam']:['beam'];this.attack='burst';
            }else if(this.attack==='counter'){
                this.comboQueue=['pulse'];this.attack='aim';
            }else if(this.attack==='overload'){
                this.comboQueue=['cross-burst'];this.attack='target-area';
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
            direction:{x:Math.cos(angle),y:Math.sin(angle)},speed,lifetimeMs:4500,attackType:piercing?'piercing-spread':'single',piercesInteriorWalls:piercing
        });
        const spread=()=>Array.from({length:this.config.spreadCount},(_,i)=>shot(this.aim+(-this.config.spreadAngle+i*2*this.config.spreadAngle/(this.config.spreadCount-1))*Math.PI/180));
        if(this.attack==='target-area'){frame.area={...this.warningTarget};this.recover();}
        else if(this.attack==='beam'||this.attack==='shockwave'||this.attack==='summon'){
            frame[this.attack]=true;this.recover();
        }else if(this.attack==='alternating'||this.attack==='cross-burst'){
            const side=this.emitted%2===0?-1:1,angle=this.aim;
            const volley=this.attack==='cross-burst'?[-.24,0,.24]:[0];
            frame.shots=volley.map(offset=>({...shot(angle+offset),originOffset:{x:-Math.sin(angle)*side*45,y:Math.cos(angle)*side*45},visualFrame:side<0?0:4}));
            this.emitted++;this.nextShotAt=this.time+this.tactics.volleyDelayMs;
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
        this.remember(this.attack);this.warningTarget={x:target.x,y:target.y};
        this.aim=angleTo(from,target);this.emitted=0;
        if(this.advanced&&this.phase>=2&&this.attack==='aim'&&this.observation.consistentDirectionMs>=this.tactics.repeatDirectionMs)this.aim=angleTo(from,this.observation.predict(target));
        this.moduleAttack=null;
        if(this.attack==='module'){
            const base=robotAttacks[this.module],speed=this.tactics.moduleSpeedMultiplier,timing=this.tactics.moduleTimingMultiplier;
            this.moduleAttack=new EnemyAttackController({...base,projectileSpeed:base.projectileSpeed*speed,attackInterval:base.attackInterval*timing,
                ...(base.burstDelay!==undefined?{burstDelay:base.burstDelay*timing}:{}),
                ...(base.chargeDuration!==undefined?{chargeDuration:base.chargeDuration*timing}:{}),
                ...(base.recoveryDuration!==undefined?{recoveryDuration:base.recoveryDuration*timing}:{})});
        }
        let warning=this.config.warningMs[this.attack]??700;
        if(this.attack==='module'&&this.module==='robot-orange'){
            warning=this.moduleAttack!.config.chargeDuration!;
            this.moduleAttack!.update(this.time,true,from,target);
        }
        this.enter('CHARGING',warning);
    }
    private recover():void {
        this.moduleAttack?.cancel(this.time);
        const effectMs=this.attack==='shockwave'?AdvancedCombat.shockwave.activeMs:this.attack==='target-area'?AdvancedCombat.area.activeMs:this.attack==='beam'?AdvancedCombat.beam.activeMs:0;
        this.enter('RECOVERING',Math.max(effectMs?effectMs+150:0,this.comboQueue.length?this.tactics.comboRecoveryMs:this.config.recoveryMs[this.phase-1]!));
    }
    cancelTeleport():void {this.afterTeleport=false;if(this.state==='TELEPORTING')this.enter('REPOSITION',this.tactics.postTeleportMs);}
    private changePhase(next:BossPhase):void {
        this.comboQueue=[];this.afterTeleport=false;this.moduleAttack?.cancel(this.time);
        this.phase=next;this.patternIndex=0;this.enter('PHASE_TRANSITION',this.config.transitionMs);
    }
    private remember(attack:BossAttack):void {
        if(this.recentAttacks.at(-1)!==attack)this.recentAttacks.push(attack);
        if(this.recentAttacks.length>3)this.recentAttacks.shift();
    }
    private selectAttack(distance:number,sight:boolean,summonAvailable:boolean):BossAttack {
        const t=this.tactics;
        const canReact=(reason:string,attack:BossAttack)=>!this.recentAttacks.includes(attack)&&this.time-(this.reactionAt.get(reason)??-Infinity)>=t.reactionCooldownMs;
        const react=(reason:string,attack:BossAttack)=>{this.reactionAt.set(reason,this.time);return attack;};
        if(this.recentAttacks.length>0&&this.phase>=t.reactiveFromPhase&&sight){
            const close=this.advanced?'shockwave':'pulse';
            if(distance<t.nearDistance&&canReact('near',close))return react('near',close);
            const stationary=this.advanced?'target-area':'aim';
            if(this.observation.stationaryMs>=t.stationaryMs&&canReact('static',stationary))return react('static',stationary);
            if(distance>t.farDistance&&canReact('far','beam'))return react('far','beam');
            if(this.advanced&&this.observation.consistentDirectionMs>=t.repeatDirectionMs&&canReact('direction','aim'))return react('direction','aim');
        }
        const patterns=this.config.phasePatterns[this.phase-1]!;
        const eligible=(attack:BossAttack)=>
            (attack!=='summon'||summonAvailable)&&
            (attack!=='counter'||distance<320)&&
            (attack!=='arsenal'||distance<=robotAttacks['robot-orange'].attackRange)&&
            (attack!=='shockwave'||distance<=360)&&
            (attack!=='overload'||this.advanced&&this.phase===3);
        for(let i=0;i<patterns.length;i++){
            const index=(this.patternIndex+i)%patterns.length,candidate=patterns[index]!;
            if(eligible(candidate)&&!this.recentAttacks.includes(candidate)) {this.patternIndex=index+1;return candidate;}
        }
        return this.attack==='aim'?'burst':'aim';
    }
    private enter(state:BossState,duration:number):void {this.state=state;this.stateStartedAt=this.time;this.dueAt=this.time+duration;}
}

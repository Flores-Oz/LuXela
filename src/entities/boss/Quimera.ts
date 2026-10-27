import Phaser from 'phaser';
import {QuimeraController} from './QuimeraController';
import {QuimeraConfig as config} from '../../config/QuimeraConfig';
import {robotMovementScale} from '../../config/RobotConfig';
import type {Player} from '../Player';
import type {LineOfSight} from '../../systems/LineOfSight';
import type {BossFrame} from './QuimeraController';

export class Quimera extends Phaser.Physics.Arcade.Sprite {
    readonly controller=new QuimeraController();
    private readonly energy:Phaser.GameObjects.Graphics;
    private facing='down';
    private readonly onDying:()=>void;
    private hitUntil=0;
    private pulseUntil=0;
    private stopping=false;

    constructor(scene:Phaser.Scene,x:number,y:number,onDying:()=>void,onDestroyed:()=>void){
        super(scene,x,y,'quimera','0');scene.add.existing(this);scene.physics.add.existing(this);
        this.onDying=onDying;
        this.setScale(config.spriteScale).setDepth(0).setCollideWorldBounds(true).setTint(0x68767a);
        this.setSize(config.body.width,config.body.height).setOffset(config.body.offsetX,config.body.offsetY);
        this.energy=scene.add.graphics().setDepth(1);
        this.play('quimera-idle');
        this.once(Phaser.GameObjects.Events.DESTROY,()=>this.energy.destroy());
        this.once('quimera-destroyed',onDestroyed);
    }
    isDead():boolean{return this.controller.health<=0;}
    receiveDamage(amount:number):number {
        const taken=this.controller.damage(amount);
        if(taken===0)return 0;
        this.hitUntil=this.controller.time+160;
        if(this.isDead())this.beginDeath();
        else if(['REPOSITION','RECOVERING'].includes(this.controller.state))this.play('quimera-hit',true);
        return taken;
    }
    tryStartFinisher(player:Player,sight:LineOfSight):boolean {
        if(!this.controller.tryStartFinisher(Math.hypot(player.x-this.x,player.y-this.y),sight.hasLineOfSight(this,player)))return false;
        this.setVelocity(0,0);this.anims.stop();this.energy.clear();this.clearTint();this.emit('quimera-finisher-ready');return true;
    }
    finish():boolean {if(!this.controller.completeFinisher())return false;this.beginDeath();return true;}
    private beginDeath():void {
        this.setVelocity(0,0);(this.body as Phaser.Physics.Arcade.Body).enable=false;this.energy.clear();
        this.onDying();
        this.once('animationcomplete-quimera-death',()=>{if(!this.stopping){this.setVisible(false);this.emit('quimera-destroyed');}});
        this.clearTint().play('quimera-death');
    }
    cancel():void {this.stopping=true;this.controller.stop();if(this.body)this.setVelocity(0,0);this.anims?.stop();if(this.energy.scene)this.energy.clear();}

    updateCombat(delta:number,player:Player,sight:LineOfSight):BossFrame {
        if(this.stopping||this.isDead()||this.controller.state==='QTE'||this.controller.state==='FINISHING')return {shots:[],pulse:false};
        const state=this.controller.state;
        const view=this.scene.cameras.main.worldView;
        const frame=this.controller.update(delta,this,player,sight.hasLineOfSight(this,player),view.contains(this.x,this.y));
        const controller=this.controller;
        this.setVelocity(0,0);
        if(controller.state==='REPOSITION'||controller.state==='ATTACKING'&&controller.attack==='module'&&controller.module==='robot-yellow'){
            const dx=player.x-this.x,dy=player.y-this.y,distance=Math.hypot(dx,dy)||1;
            const desired=controller.attack==='module'&&controller.state==='ATTACKING'?130:Math.min(config.preferredDistance[controller.phase-1]!,view.width*.3,view.height*.35);
            const approach=distance>desired+60?1:distance<desired-60?-1:0;
            const side=Math.floor(controller.time/1600)%2?1:-1;
            let vx=dx/distance*approach-dy/distance*side*.6,vy=dy/distance*approach+dx/distance*side*.6;
            const body=this.body as Phaser.Physics.Arcade.Body;
            // Turn along a blocked axis, keeping the body's normal Arcade wall collider.
            if(vx<0&&body.blocked.left||vx>0&&body.blocked.right){vx=0;vy=dy>=0?1:-1;}
            if(vy<0&&body.blocked.up||vy>0&&body.blocked.down){vy=0;vx=dx>=0?1:-1;}
            const speed=config.movementSpeed[controller.phase-1]!*(controller.state==='ATTACKING'?robotMovementScale['robot-yellow']:1);
            const length=Math.hypot(vx,vy)||1;this.setVelocity(vx/length*speed,vy/length*speed);
            if(Math.abs(vx)>Math.abs(vy))this.facing=vx<0?'left':'right';else this.facing=vy<0?'up':'down';
            if(this.anims.currentAnim?.key!=='quimera-hit'||!this.anims.isPlaying)this.play(`quimera-walk-${this.facing}`,true);
        }else if(controller.state==='CHARGING'||controller.state==='ATTACKING'||frame.shots.length>0||frame.pulse){
            const direction=controller.attack==='module'&&frame.shots.length?Math.atan2(frame.shots[0]!.direction.y,frame.shots[0]!.direction.x):controller.aim;
            this.faceAngle(direction);this.play(`quimera-attack-${this.facing}`,true);
        }else if(state!==controller.state||!this.anims.isPlaying)this.play('quimera-idle',true);
        if(frame.pulse)this.pulseUntil=controller.time+240;
        this.drawEnergy();
        return frame;
    }
    private faceAngle(angle:number):void {
        if(Math.abs(Math.cos(angle))>Math.abs(Math.sin(angle)))this.facing=Math.cos(angle)<0?'left':'right';
        else this.facing=Math.sin(angle)<0?'up':'down';
    }
    private drawEnergy():void {
        const c=this.controller,g=this.energy;g.clear();
        const coreY=this.y+12,armY=this.y+38;
        const color=c.attack==='module'?({'robot-red':0xff5544,'robot-blue':0x669dff,'robot-yellow':0xffdb55,'robot-orange':0xffa52a}[c.module]):c.phase===3?0xff704b:c.phase===2?0x6de8ff:0xb4dfbd;
        if(c.state==='INTRO'){g.fillStyle(0x6de8ff,Math.min(.9,(c.time-c.stateStartedAt)/config.introMs)).fillCircle(this.x,coreY,12);return;}
        if(c.time<this.hitUntil)this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);else this.clearTint();
        const glow=c.state==='RECOVERING'?.9:.25+c.phase*.13;
        g.fillStyle(color,glow).fillCircle(this.x,coreY,8+c.phase*2);
        if(c.phase>=2){
            for(const direction of [-1,1])g.fillStyle(color,.5).fillCircle(this.x+direction*65,armY,5+c.phase);
        }
        if(c.phase===3)for(let i=0;i<4;i++){
            const angle=c.time/350+i*Math.PI/2;g.fillStyle(color,.5).fillCircle(this.x+Math.cos(angle)*78,armY+Math.sin(angle)*45,2);
        }
        if(c.charging){
            g.lineStyle(3,color,.5+.35*Math.abs(Math.sin(c.time/100)));
            if(c.pulseWarning){
                g.fillStyle(color,.1).fillCircle(this.x,this.y,config.pulseRadius);g.strokeCircle(this.x,this.y,config.pulseRadius);
            }else if(c.attack==='critical'){
                g.strokeCircle(this.x,this.y,230);
                for(let i=0;i<config.criticalCount;i++){
                    const degrees=-180+i*360/config.criticalCount;if(Math.abs(degrees)<config.criticalSafeAngle/2)continue;
                    const angle=c.aim+degrees*Math.PI/180;g.lineBetween(this.x+Math.cos(angle)*95,this.y+Math.sin(angle)*95,this.x+Math.cos(angle)*230,this.y+Math.sin(angle)*230);
                }
                const halfGap=config.criticalSafeAngle*Math.PI/360;
                g.lineStyle(4,0xb4dfbd,.8);g.beginPath();g.arc(this.x,this.y,235,c.aim-halfGap,c.aim+halfGap).strokePath();
            }else{
                g.strokeCircle(this.x,this.y,100);
                g.lineBetween(this.x+Math.cos(c.aim)*90,this.y+Math.sin(c.aim)*90,this.x+Math.cos(c.aim)*250,this.y+Math.sin(c.aim)*250);
            }
        }
        if(c.time<this.pulseUntil)g.lineStyle(8,0x6de8ff,(this.pulseUntil-c.time)/240).strokeCircle(this.x,this.y,config.pulseRadius);
        if(c.state==='RECOVERING')g.lineStyle(2,0xb4dfbd,.8).strokeCircle(this.x,coreY,22);
    }
}

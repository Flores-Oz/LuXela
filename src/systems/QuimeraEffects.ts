import Phaser from 'phaser';
import {AdvancedCombat as config} from '../config/QuimeraAdvancedConfig';
import {beamHits,clippedRayLength,ringHits} from '../entities/boss/BossAttackGeometry';
import type {Quimera} from '../entities/boss/Quimera';
import type {Player} from '../entities/Player';
import type {BossFrame} from '../entities/boss/QuimeraController';

export function loadAdvancedBossAssets(scene:Phaser.Scene):void {
    for(const [name,width,height]of [['quimera-core-charge',256,256],['quimera-projectiles',128,128],['quimera-beam',512,128],['quimera-shockwave',256,256]] as const)
        if(!scene.textures.exists(name))scene.load.spritesheet(name,`assets/effects/${name}.png`,{frameWidth:width,frameHeight:height});
}
/** Scene-delta visual and damage clocks. Effects never register independent colliders/timers. */
export class QuimeraEffects {
    private readonly boss:Quimera;
    private readonly player:Player;
    private readonly walls:Phaser.Physics.Arcade.StaticGroup;
    private readonly core:Phaser.GameObjects.Image;
    private readonly beam:Phaser.GameObjects.Image;
    private readonly ring:Phaser.GameObjects.Image;
    private readonly warning:Phaser.GameObjects.Graphics;
    private attack:{kind:'beam'|'shockwave'|'area';elapsed:number;x:number;y:number;angle:number;length:number;radius:number;duration:number}|null=null;
    constructor(scene:Phaser.Scene,boss:Quimera,player:Player,walls:Phaser.Physics.Arcade.StaticGroup){
        this.boss=boss;this.player=player;this.walls=walls;
        this.core=scene.add.image(0,0,'quimera-core-charge',0).setDepth(2).setDisplaySize(105,105).setVisible(false);
        this.beam=scene.add.image(0,0,'quimera-beam',4).setOrigin(0,.5).setDepth(3).setVisible(false);
        this.ring=scene.add.image(0,0,'quimera-shockwave',0).setDepth(3).setVisible(false);
        this.warning=scene.add.graphics().setDepth(2);
    }
    private ray(x:number,y:number,angle:number):number {return clippedRayLength({x,y},{x:Math.cos(angle),y:Math.sin(angle)},config.beam.range,this.walls.getChildren().map(w=>{const b=(w as Phaser.Physics.Arcade.Image).body!;return {x:b.x,y:b.y,width:b.width,height:b.height};}));}
    get activeAttack():Readonly<typeof this.attack>{return this.attack;}
    get busy():boolean{return this.attack!==null;}
    update(delta:number,frame:BossFrame):void {
        const b=this.boss,c=b.controller;
        if(!c.alive||this.player.isDead()){this.clear();return;}
        if(frame.phaseChanged)this.clear();
        this.warning.clear();
        this.core.setPosition(b.x,b.y+12).setVisible(c.state==='CHARGING'||c.state==='PHASE_TRANSITION'||c.phase===c.config.phasePatterns.length)
            .setFrame(Math.floor(c.time/110)%8);
        if(c.state==='CHARGING'&&c.attack==='beam'){
            const length=this.ray(b.x,b.y,c.aim);
            this.warning.lineStyle(20,0xff5555,.15).lineBetween(b.x,b.y,b.x+Math.cos(c.aim)*length,b.y+Math.sin(c.aim)*length)
                .lineStyle(2,0xffce7a,.9).lineBetween(b.x,b.y,b.x+Math.cos(c.aim)*length,b.y+Math.sin(c.aim)*length);
        }
        if(c.state==='CHARGING'&&c.attack==='shockwave')this.warning.lineStyle(3,0xffa744,.8).strokeCircle(b.x,b.y,config.shockwave.radius);
        if(c.state==='CHARGING'&&c.attack==='target-area')this.warning.fillStyle(0xffa744,.14).fillCircle(c.warningTarget.x,c.warningTarget.y,config.area.radius)
            .lineStyle(3,0xffa744,.9).strokeCircle(c.warningTarget.x,c.warningTarget.y,config.area.radius);
        if(frame.beam||frame.shockwave||frame.area){
            this.beam.setVisible(false);this.ring.setVisible(false);
            this.attack={kind:frame.area?'area':frame.beam?'beam':'shockwave',elapsed:0,x:frame.area?.x??b.x,y:frame.area?.y??b.y,angle:c.aim,length:this.ray(b.x,b.y,c.aim),
                radius:frame.area?config.area.radius:config.shockwave.radius,duration:frame.area?config.area.activeMs:config.shockwave.activeMs};
        }
        const a=this.attack;if(!a)return;
        // The emission frame's delta belongs to the preceding warning, not the new damage window.
        if(!frame.beam&&!frame.shockwave&&!frame.area)a.elapsed+=Math.max(0,delta);
        const body=this.player.physicsSprite.body as Phaser.Physics.Arcade.Body;
        if(a.kind==='beam'){
            if(a.elapsed>=config.beam.activeMs){this.attack=null;this.beam.setVisible(false);return;}
            this.beam.setVisible(true).setPosition(a.x,a.y).setRotation(a.angle).setDisplaySize(a.length,64).setFrame(4+Math.floor(a.elapsed/90)%4);
            if(beamHits(a,a.angle,a.length,config.beam.width,body))this.player.die();
        }else{
            if(a.elapsed>=a.duration){this.attack=null;this.ring.setVisible(false);return;}
            const p=a.elapsed/a.duration,frame=Math.min(8,3+Math.floor(p*6)),radius=40+(a.radius-40)*p;
            const sourceRadius=[48,62,70,83,92,95][frame-3]!;
            this.ring.setVisible(true).setPosition(a.x,a.y).setFrame(frame).setDisplaySize(256*radius/sourceRadius,256*radius/sourceRadius);
            if(a.kind==='area'){
                this.warning.fillStyle(0xffa744,.25).fillCircle(a.x,a.y,radius);
                if(Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(a.x,a.y,radius),new Phaser.Geom.Rectangle(body.x,body.y,body.width,body.height)))this.player.die();
            }else if(ringHits(a,radius,config.shockwave.thickness,body))this.player.die();
        }
    }
    clear():void {this.attack=null;this.beam.setVisible(false);this.ring.setVisible(false);this.core.setVisible(false);this.warning.clear();}
    destroy():void {this.clear();for(const item of [this.core,this.beam,this.ring,this.warning])item.destroy();}
}

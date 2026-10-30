import Phaser from 'phaser';
import {Quimera} from '../entities/boss/Quimera';
import {QuimeraConfig as config} from '../config/QuimeraConfig';
import {BossHealthBar} from '../ui/BossHealthBar';
import {fireEnemyShots} from './EnemyProjectiles';
import type {Player} from '../entities/Player';
import type {LineOfSight} from './LineOfSight';
import type {PlayerCharacter} from '../config/characters';
import type {TilePosition} from '../world/Room';
import {BossFinisher} from '../ui/BossFinisher';
import {AdvancedCombat} from '../config/QuimeraAdvancedConfig';
import {QuimeraEffects} from './QuimeraEffects';
import {QuimeraReinforcements} from './QuimeraReinforcements';
import type {Room} from '../world/Room';
import {QuimeraTeleport} from './QuimeraTeleport';
import type {EnemyManager} from './EnemyManager';
import {BossEvasion,type IncomingShot} from '../entities/boss/BossEvasion';

/** Boss-specific collision target; the existing enemy projectile groups and wall rules are reused. */
export class QuimeraEncounter {
    readonly boss:Quimera;
    readonly healthBar:BossHealthBar;
    readonly finisher:BossFinisher;
    readonly effects:QuimeraEffects|null;
    readonly reinforcements:QuimeraReinforcements|null;
    readonly teleport:QuimeraTeleport;
    private readonly evasion=new BossEvasion();
    private readonly playerShots:Phaser.Physics.Arcade.Group;
    private readonly walls:Phaser.Physics.Arcade.StaticGroup;
    private readonly enemies:EnemyManager;
    private readonly collisions:Phaser.Physics.Arcade.Collider[]=[];
    private stopped=false;
    private readonly scene:Phaser.Scene;
    private readonly player:Player;
    private readonly enemyShots:Phaser.Physics.Arcade.Group;
    private readonly sight:LineOfSight;
    constructor(scene:Phaser.Scene,spawn:TilePosition,tileSize:number,player:Player,
        walls:Phaser.Physics.Arcade.StaticGroup,playerShots:Phaser.Physics.Arcade.Group,
        enemyShots:Phaser.Physics.Arcade.Group,sight:LineOfSight,onDying:()=>void,onDestroyed:()=>void,
        finisher:{character:PlayerCharacter;start:()=>void;resume:()=>void},encounter:{room:Room;enemies:EnemyManager;mode:'trial'|'advanced'}){
        this.scene=scene;this.player=player;this.enemyShots=enemyShots;this.sight=sight;
        this.playerShots=playerShots;this.walls=walls;this.enemies=encounter.enemies;
        this.boss=new Quimera(scene,(spawn.column+.5)*tileSize,(spawn.row+.5)*tileSize,()=>{this.teleport?.cancel();this.effects?.clear();this.reinforcements?.cancelPending();this.healthBar.hide();enemyShots.clear(true,true);onDying();},onDestroyed,encounter.mode);
        this.effects=new QuimeraEffects(scene,this.boss,player,walls);
        this.reinforcements=new QuimeraReinforcements(scene,encounter.room,player,this.boss,encounter.enemies);
        this.teleport=new QuimeraTeleport(scene,encounter.room,this.boss,player,walls,encounter.enemies);
        this.healthBar=new BossHealthBar(scene);
        this.finisher=new BossFinisher(scene,finisher.character,()=>{this.boss.controller.resolveFinisher(true);},()=>{
            this.boss.controller.resolveFinisher(false);finisher.resume();
        },()=>{this.boss.finish();});
        this.boss.on('quimera-finisher-ready',()=>{this.teleport.cancel();this.effects?.clear();this.reinforcements?.cancelPending();finisher.start();this.finisher.start();this.healthBar.update(this.boss.controller,0);});
        // Arcade delivers the sprite first for sprite-vs-group overlaps, regardless of argument order.
        this.collisions.push(scene.physics.add.collider(this.boss,walls),scene.physics.add.overlap(this.boss,playerShots,(_boss,shot)=>{
            const projectile=shot as Phaser.Physics.Arcade.Image;
            if(this.stopped||this.player.isDead()||!projectile.active||this.boss.isDead())return;
            projectile.getData('projectile')?.destroy();this.boss.receiveDamage(config.normalDamage);
        }));
    }
    update(delta:number):void {
        if(this.stopped||this.player.isDead())return;
        if(this.finisher.active){this.finisher.update(delta);return;}
        if(this.boss.tryStartFinisher(this.player,this.sight))return;
        const frame=this.boss.updateCombat(delta,this.player,this.sight,{teleportAvailable:this.teleport.available,effectsBusy:this.effects?.busy,summonAvailable:this.reinforcements?.canRequest});
        if(frame.phaseChanged){this.teleport.cancel();this.reinforcements?.cancelPending();}
        this.teleport.update(delta,frame);
        this.updateEvasion();
        fireEnemyShots(this.scene,this.boss,frame.shots,this.enemyShots,AdvancedCombat.maxProjectiles,this.boss.controller.advanced);
        this.effects?.update(delta,frame);
        if(this.player.isDead())return;
        if(frame.summon)this.reinforcements?.request();
        this.reinforcements?.update(delta);
        const body=this.player.physicsSprite.body as Phaser.Physics.Arcade.Body;
        if(frame.pulse&&Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(this.boss.x,this.boss.y,config.pulseRadius),new Phaser.Geom.Rectangle(body.x,body.y,body.width,body.height)))this.player.die();
        this.healthBar.update(this.boss.controller,delta);
    }
    private updateEvasion():void {
        const c=this.boss.controller;
        const allowed=c.advanced&&c.state==='REPOSITION'&&!this.effects?.busy;
        if(!allowed){this.evasion.cancel();return;}
        const shots:IncomingShot[]=this.playerShots.getChildren().flatMap(object=>{
            const image=object as Phaser.Physics.Arcade.Image,body=image.body as Phaser.Physics.Arcade.Body|null;
            return image.active&&body?.enable?[{id:image,x:body.center.x,y:body.center.y,vx:body.velocity.x,vy:body.velocity.y,radius:Math.max(body.width,body.height)/2}]:[];
        });
        const boxes=(objects:readonly Phaser.GameObjects.GameObject[])=>objects.flatMap(object=>{
            const body=(object as Phaser.Physics.Arcade.Image).body;
            return body?.enable?[{x:body.x,y:body.y,width:body.width,height:body.height}]:[];
        });
        const velocity=this.evasion.update(c.time,true,this.boss.body as Phaser.Physics.Arcade.Body,shots,boxes(this.walls.getChildren()),boxes([...this.enemies.getLivingEnemies(),this.player.physicsSprite]),this.scene.physics.world.bounds);
        if(velocity)this.boss.evade(velocity);
    }
    specialHit(character:PlayerCharacter):{x:number;y:number}|null {
        if(this.stopped||this.player.isDead()||Math.hypot(this.player.x-this.boss.x,this.player.y-this.boss.y)>config.specialRange[character])return null;
        return this.boss.receiveDamage(config.specialDamage[character])>0?{x:this.boss.x,y:this.boss.y}:null;
    }
    stop():void {if(this.stopped)return;this.stopped=true;this.evasion.cancel();this.teleport.cancel();this.effects?.clear();this.reinforcements?.cancelPending();this.finisher.cancel();this.boss.cancel();this.healthBar.hide();}
    destroy():void {this.stop();this.teleport.destroy();this.effects?.destroy();this.reinforcements?.destroy();for(const collision of this.collisions)if(collision.world)collision.destroy();this.finisher.destroy();this.healthBar.destroy();if(this.boss.scene)this.boss.destroy();}
}

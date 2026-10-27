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
import type {EnemyManager} from './EnemyManager';

/** Boss-specific collision target; the existing enemy projectile groups and wall rules are reused. */
export class QuimeraEncounter {
    readonly boss:Quimera;
    readonly healthBar:BossHealthBar;
    readonly finisher:BossFinisher;
    readonly effects:QuimeraEffects|null;
    readonly reinforcements:QuimeraReinforcements|null;
    private readonly collisions:Phaser.Physics.Arcade.Collider[]=[];
    private stopped=false;
    private readonly scene:Phaser.Scene;
    private readonly player:Player;
    private readonly enemyShots:Phaser.Physics.Arcade.Group;
    private readonly sight:LineOfSight;
    constructor(scene:Phaser.Scene,spawn:TilePosition,tileSize:number,player:Player,
        walls:Phaser.Physics.Arcade.StaticGroup,playerShots:Phaser.Physics.Arcade.Group,
        enemyShots:Phaser.Physics.Arcade.Group,sight:LineOfSight,onDying:()=>void,onDestroyed:()=>void,
        finisher:{character:PlayerCharacter;start:()=>void;resume:()=>void},advanced?:{room:Room;enemies:EnemyManager}){
        this.scene=scene;this.player=player;this.enemyShots=enemyShots;this.sight=sight;
        this.boss=new Quimera(scene,(spawn.column+.5)*tileSize,(spawn.row+.5)*tileSize,()=>{this.effects?.clear();this.reinforcements?.cancelPending();this.healthBar.hide();enemyShots.clear(true,true);onDying();},onDestroyed,advanced?'advanced':'trial');
        this.effects=advanced?new QuimeraEffects(scene,this.boss,player,walls):null;
        this.reinforcements=advanced?new QuimeraReinforcements(scene,advanced.room,player,this.boss,advanced.enemies):null;
        this.healthBar=new BossHealthBar(scene);
        this.finisher=new BossFinisher(scene,finisher.character,()=>{this.boss.controller.resolveFinisher(true);},()=>{
            this.boss.controller.resolveFinisher(false);finisher.resume();
        },()=>{this.boss.finish();});
        this.boss.on('quimera-finisher-ready',()=>{this.effects?.clear();this.reinforcements?.cancelPending();finisher.start();this.finisher.start();this.healthBar.update(this.boss.controller,0);});
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
        const frame=this.boss.updateCombat(delta,this.player,this.sight);
        fireEnemyShots(this.scene,this.boss,frame.shots,this.enemyShots,this.effects?AdvancedCombat.maxProjectiles:Infinity,!!this.effects);
        this.effects?.update(delta,frame);
        if(this.player.isDead())return;
        if(frame.summon)this.reinforcements?.request();
        this.reinforcements?.update(delta);
        const body=this.player.physicsSprite.body as Phaser.Physics.Arcade.Body;
        if(frame.pulse&&Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(this.boss.x,this.boss.y,config.pulseRadius),new Phaser.Geom.Rectangle(body.x,body.y,body.width,body.height)))this.player.die();
        this.healthBar.update(this.boss.controller,delta);
    }
    specialHit(character:PlayerCharacter):{x:number;y:number}|null {
        if(this.stopped||this.player.isDead()||Math.hypot(this.player.x-this.boss.x,this.player.y-this.boss.y)>config.specialRange[character])return null;
        return this.boss.receiveDamage(config.specialDamage[character])>0?{x:this.boss.x,y:this.boss.y}:null;
    }
    stop():void {if(this.stopped)return;this.stopped=true;this.effects?.clear();this.reinforcements?.cancelPending();this.finisher.cancel();this.boss.cancel();this.healthBar.hide();}
    destroy():void {this.stop();this.effects?.destroy();this.reinforcements?.destroy();for(const collision of this.collisions)if(collision.world)collision.destroy();this.finisher.destroy();this.healthBar.destroy();if(this.boss.scene)this.boss.destroy();}
}

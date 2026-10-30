import type Phaser from 'phaser';
import type {Quimera} from '../entities/boss/Quimera';
import type {Player} from '../entities/Player';
import type {Room} from '../world/Room';
import type {EnemyManager} from './EnemyManager';
import type {BossFrame} from '../entities/boss/QuimeraController';
import {safeTeleportDestination} from '../entities/boss/BossTeleportGeometry';
import {RobotSpawnEffect,RobotSpawnConfig} from './RobotSpawnEffect';
import {TileType} from '../types/RoomTypes';

/** Reuses the spawn animation; all timing is owned by the boss controller. */
export class QuimeraTeleport {
    private readonly candidates:{x:number;y:number}[]=[];
    private destination:{x:number;y:number}|null=null;
    private origin:{x:number;y:number}|null=null;
    private visuals:RobotSpawnEffect[]=[];
    private readonly scene:Phaser.Scene;
    private readonly boss:Quimera;
    private readonly player:Player;
    private readonly walls:Phaser.Physics.Arcade.StaticGroup;
    private readonly enemies:EnemyManager;
    constructor(scene:Phaser.Scene,room:Room,boss:Quimera,
        player:Player,walls:Phaser.Physics.Arcade.StaticGroup,enemies:EnemyManager){
        this.scene=scene;this.boss=boss;this.player=player;this.walls=walls;this.enemies=enemies;
        for(let row=2;row<room.matrix.length-2;row+=2)for(let col=2;col<room.matrix[0]!.length-2;col+=2)
            if(room.matrix[row]![col]===TileType.Floor)this.candidates.push({x:(col+.5)*room.tileSize,y:(row+.5)*room.tileSize});
    }
    get available():boolean{return this.candidates.length>0;}
    get pendingDestination():Readonly<{x:number;y:number}>|null{return this.destination;}
    private safe(point:{x:number;y:number}):boolean {
        const camera=this.scene.cameras.main,body=this.boss.body as Phaser.Physics.Arcade.Body;
        // worldView is cached at render time; use current scroll/zoom after resize or pause.
        const width=camera.width/camera.zoomX,height=camera.height/camera.zoomY;
        const view={x:camera.scrollX+camera.width/2-width/2,y:camera.scrollY+camera.height/2-height/2,width,height};
        return safeTeleportDestination(point,this.player,this.origin??this.boss,
            this.walls.getChildren().map(wall=>{const b=(wall as Phaser.Physics.Arcade.Image).body!;return {x:b.x,y:b.y,width:b.width,height:b.height};}),
            this.enemies.getLivingEnemies(),view,
            {x:body.width/2,y:body.height/2},{x:body.x+body.width/2-this.boss.x,y:body.y+body.height/2-this.boss.y});
    }
    update(delta:number,frame:BossFrame):void {
        const body=this.boss.body as Phaser.Physics.Arcade.Body;
        if(frame.teleportStart||frame.teleportEnd)body.updateFromGameObject();
        if(frame.teleportStart){
            this.cancel();this.origin={x:this.boss.x,y:this.boss.y};
            const desired=this.boss.controller.config.preferredDistance[this.boss.controller.phase-1]!;
            this.destination=this.candidates.filter(point=>this.safe(point)).sort((a,b)=>
                Math.abs(Math.hypot(a.x-this.player.x,a.y-this.player.y)-desired)-Math.abs(Math.hypot(b.x-this.player.x,b.y-this.player.y)-desired))[0]??null;
            if(!this.destination){this.boss.controller.cancelTeleport();this.origin=null;return;}
            this.visuals=[this.origin,this.destination].map(point=>new RobotSpawnEffect(this.scene,point.x,point.y));
        }
        if(!frame.teleportStart)for(const visual of this.visuals)visual.update(delta*RobotSpawnConfig.durationMs/this.boss.controller.tactics.teleportWarningMs);
        if(frame.teleportEnd){
            // Recheck moving actors, the viewport and the full body before committing.
            if(this.destination&&this.safe(this.destination)){
                body.reset(this.destination.x,this.destination.y);
                // Arcade reset uses the texture's top-left; restore the configured hitbox offset.
                body.updateFromGameObject();body.prev.copy(body.position);body.prevFrame.copy(body.position);
            }
            else this.boss.controller.cancelTeleport();
            this.cancel();
        }
    }
    cancel():void {for(const visual of this.visuals)visual.destroy();this.visuals=[];this.destination=null;this.origin=null;}
    destroy():void {this.cancel();}
}

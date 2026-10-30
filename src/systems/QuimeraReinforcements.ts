import Phaser from 'phaser';
import {AdvancedCombat as config} from '../config/QuimeraAdvancedConfig';
import {Enemy} from '../entities/enemies/Enemy';
import type {EnemyManager} from './EnemyManager';
import type {Player} from '../entities/Player';
import type {Quimera} from '../entities/boss/Quimera';
import type {Room} from '../world/Room';
import {TileType} from '../types/RoomTypes';
import {RobotSpawnEffect} from './RobotSpawnEffect';

export class QuimeraReinforcements {
    private readonly scene:Phaser.Scene;private readonly player:Player;private readonly boss:Quimera;private readonly enemies:EnemyManager;
    private readonly candidates:{x:number;y:number}[]=[];
    private readonly pending:{x:number;y:number;elapsed:number;visual:RobotSpawnEffect}[]=[];
    private serial=0;private cooldown=0;
    constructor(scene:Phaser.Scene,room:Room,player:Player,boss:Quimera,enemies:EnemyManager){
        this.scene=scene;this.player=player;this.boss=boss;this.enemies=enemies;
        for(let row=2;row<room.matrix.length-2;row++)for(let col=2;col<room.matrix[0]!.length-2;col++){
            if([-1,0,1].every(dr=>[-1,0,1].every(dc=>room.matrix[row+dr]?.[col+dc]===TileType.Floor)))this.candidates.push({x:(col+.5)*room.tileSize,y:(row+.5)*room.tileSize});
        }
    }
    get pendingCount():number{return this.pending.length;}
    get canRequest():boolean {
        const controller=this.boss.controller,limit=controller.tactics.summons;
        return controller.alive&&!this.player.isDead()&&this.cooldown<=0&&controller.phase>=limit.fromPhase&&
            !['INTRO','PHASE_TRANSITION','TELEPORTING','QTE','FINISHING'].includes(controller.state)&&
            (limit.replaceOnClear?this.enemies.aliveCount===0&&this.pending.length===0:this.enemies.aliveCount+this.pending.length<limit.maxActive);
    }
    request():void {
        if(!this.canRequest)return;
        const limit=this.boss.controller.tactics.summons;
        const occupied:{x:number;y:number}[]=[...this.enemies.getLivingEnemies(),...this.pending,this.boss];
        let slots=Math.min(limit.batch,limit.maxActive-this.enemies.aliveCount-this.pending.length);
        // Traverse a stable permutation of the room's safe cells, rather than crowding one corner.
        for(let i=0;i<this.candidates.length&&slots>0;i++){
            const point=this.candidates[(i*137+this.serial*53)%this.candidates.length]!;
            if(Math.hypot(point.x-this.player.x,point.y-this.player.y)<config.minSpawnDistance||occupied.some(other=>Math.hypot(point.x-other.x,point.y-other.y)<config.minRobotDistance))continue;
            const visual=new RobotSpawnEffect(this.scene,point.x,point.y);
            this.pending.push({...point,elapsed:0,visual});occupied.push(point);slots--;
        }
        // The final boss reserves whole cohorts: never leave a partial batch behind.
        if(limit.replaceOnClear&&slots>0)this.cancelPending();
        this.cooldown=limit.intervalMs;
    }
    update(delta:number):void {
        if(!this.boss.controller.alive||this.player.isDead()){this.cancelPending();return;}
        this.cooldown=Math.max(0,this.cooldown-delta);
        const limit=this.boss.controller.tactics.summons;
        // Recheck the complete warning area before materializing a final-boss cohort.
        // If the player enters it, retry with a fresh warning rather than spawning on them.
        if(limit.replaceOnClear&&this.pending.length&&this.pending[0]!.elapsed+delta>=config.summonWarningMs&&
            (this.enemies.aliveCount>0||this.pending.some(item=>Math.hypot(item.x-this.player.x,item.y-this.player.y)<config.minSpawnDistance))){
            this.cancelPending();this.cooldown=limit.intervalMs;
        }
        for(const item of [...this.pending]){
            item.elapsed+=delta;item.visual.update(delta);
            if(item.elapsed<config.summonWarningMs)continue;
            item.visual.destroy();this.pending.splice(this.pending.indexOf(item),1);
            if(this.enemies.aliveCount>=this.boss.controller.tactics.summons.maxActive||Math.hypot(item.x-this.player.x,item.y-this.player.y)<config.minSpawnDistance||this.enemies.getLivingEnemies().some(enemy=>Math.hypot(item.x-enemy.x,item.y-enemy.y)<config.minRobotDistance))continue;
            const enemy=new Enemy(this.scene,item.x,item.y,limit.types[this.serial%limit.types.length]!,{moveSpeed:96,detectionRange:540,shootCooldown:1200,patrol:true});
            enemy.setData('level-enemy-id',`quimera-reinforcement-${this.serial++}`);this.enemies.add(enemy);enemy.playIdle();this.enemies.start();
        }
        // Replenishment is independent of the randomly selected attack pattern.
        // A surviving support robot prevents replacements, even after the cooldown.
        if(limit.replaceOnClear)this.request();
    }
    cancelPending():void {for(const item of this.pending)item.visual.destroy();this.pending.length=0;}
    destroy():void {this.cancelPending();}
}

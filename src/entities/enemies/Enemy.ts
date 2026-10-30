import Phaser from "phaser";
import { EnemyState } from "./EnemyState";
import type { Player } from "../Player";
import type { LineOfSight } from "../../systems/LineOfSight";
import { CombatEvents } from "../../systems/CombatEvents";
import { robotAttacks,robotMovementScale,robotDefinitions,robotTypes,redRobotRangeMultiplier,type RobotType,type EnemyAttackConfig } from "../../config/RobotConfig";
import { EnemyAttackController, type EnemyShot } from "./EnemyAttackController";
import {RobotSpawnEffect} from '../../systems/RobotSpawnEffect';

export type EnemyConfig = {
    moveSpeed?: number;
    detectionRange?: number;
    shootCooldown?: number;
    animationPrefix?: string;
    patrol?: boolean;
    piercesInteriorWalls?: boolean;
    spawnEffect?: boolean;
    chargeDuration?: number;
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    readonly piercesInteriorWalls:boolean;
    readonly attack: EnemyAttackController;
    readonly explodesOnContact:boolean;

    private dead = false;

    private readonly moveSpeed: number;

    private readonly detectionRange: number;

    readonly shootCooldown: number;

    private readonly animationPrefix: string;

    private chargeWarning?: Phaser.GameObjects.Arc;
    private flashUntil = -Infinity;

    private readonly patrolEnabled: boolean;

    private patrolDirection = -1;

    private nextPatrolTurn = 0;

    private playerDetected = false;

    private currentState: EnemyState = EnemyState.IDLE;
    private spawnEffect:RobotSpawnEffect|null=null;
    get isSpawning():boolean{return this.spawnEffect?.active??false;}
    preUpdate(time:number,delta:number):void {
        super.preUpdate(time,delta);
        if(this.spawnEffect?.active){
            if(!this.scene.physics.world.isPaused)this.spawnEffect.update(delta);
            this.spawnEffect.setPosition(this.x,this.y);
            this.setAlpha(this.spawnEffect.active ? .15+.85*this.spawnEffect.progress : 1);
        }
    }

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string,
        config: EnemyConfig = {}
    ) {
        super(scene, x, y, texture);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        const variant = robotTypes.some(type => type === texture) ? texture as RobotType : "robot-red";
        this.explodesOnContact=variant==='robot-yellow';
        this.moveSpeed = (config.moveSpeed ?? 80) * robotMovementScale[variant];
        this.detectionRange = (config.detectionRange ?? 200)*(variant==='robot-red'?redRobotRangeMultiplier:1);
        const attackConfig: EnemyAttackConfig = { ...robotAttacks[variant] };
        if(variant==='robot-orange'&&config.chargeDuration!==undefined)attackConfig.chargeDuration=config.chargeDuration;
        // The existing level cadence scales the basic soldier; other patterns retain their timings.
        if (variant === "robot-red" && config.shootCooldown !== undefined) attackConfig.attackInterval = config.shootCooldown;
        this.shootCooldown = attackConfig.attackInterval;
        const definition=robotTypes.some(type=>type===texture)?robotDefinitions[texture as RobotType]:undefined;
        this.animationPrefix = config.animationPrefix ?? definition?.prefix ?? "robot";
        this.piercesInteriorWalls=config.piercesInteriorWalls??definition?.piercesInteriorWalls??false;
        attackConfig.piercingWalls = this.piercesInteriorWalls;
        this.attack = new EnemyAttackController(attackConfig);
        this.patrolEnabled = config.patrol ?? false;
        this.setSize(44, 52);
        this.setOffset(10, 10);

        this.setCollideWorldBounds(true);
        this.once(Phaser.GameObjects.Events.DESTROY, () => this.cancelAttack());
        if(config.spawnEffect&&scene.textures.exists('robot-spawn')){
            this.spawnEffect=new RobotSpawnEffect(scene,x,y);this.setAlpha(.15);
            this.once(Phaser.GameObjects.Events.DESTROY,()=>this.spawnEffect?.destroy());
        }
        this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            if (!this.dead && this.attack.phase !== "charging" && (this.currentState === EnemyState.ATTACK_READY || this.currentState === EnemyState.RECOVERY || this.currentState === EnemyState.BURST)) this.playIdle();
        });
    }

    public playIdle(): void {
        if (this.dead) {
            return;
        }

        this.play(`${this.animationPrefix}-idle`, true);
    }

    public moveUp(): void {
        if (this.dead) {
            return;
        }

        this.setVelocity(0, -this.moveSpeed);
        this.play(`${this.animationPrefix}-walk-up`, true);
    }

    public moveDown(): void {
        if (this.dead) {
            return;
        }

        this.setVelocity(0, this.moveSpeed);
        this.play(`${this.animationPrefix}-walk-down`, true);
    }

    public moveLeft(): void {
        if (this.dead) {
            return;
        }

        this.setVelocity(-this.moveSpeed, 0);
        this.play(`${this.animationPrefix}-walk-left`, true);
    }

    public moveRight(): void {
        if (this.dead) {
            return;
        }

        this.setVelocity(this.moveSpeed, 0);
        this.play(`${this.animationPrefix}-walk-right`, true);
    }

    public stop(): this {
        if (this.dead) {
            return this;
        }

        this.setVelocity(0, 0);
        this.playIdle();

        return this;
    }

    public die(): void {
        if (this.dead || !this.active || !this.body) {
            return;
        }
        this.spawnEffect?.destroy();this.setAlpha(1);

        this.dead = true;
        this.playerDetected = false;
        this.cancelAttack();

        this.setVelocity(0, 0);

        this.disableBody(false, false);
        this.once(
            `${Phaser.Animations.Events.ANIMATION_COMPLETE_KEY}${this.animationPrefix}-death`,
            () => this.destroy()
        );
        this.play(`${this.animationPrefix}-death`);
        this.emit(CombatEvents.ENEMY_DIED, this);
    }

    public isDead(): boolean {
        return this.dead;
    }

    public detonateOnContact():boolean {
        if(!this.explodesOnContact||this.dead||!this.active||this.isSpawning)return false;
        const blast=this.scene.add.circle(this.x,this.y,16,0xffdc55,.8)
            .setStrokeStyle(4,0xff921f).setDepth(this.depth+2).setName('yellow-contact-explosion');
        this.scene.tweens.add({targets:blast,scale:4,alpha:0,duration:350,onComplete:()=>blast.destroy()});
        this.die();return true;
    }

    public setState(state: EnemyState | number | string): this {
        if (this.dead || this.currentState === state) {
            return this;
        }

        super.setState(state);
        if (import.meta.env.DEV) {
            console.debug(`Enemy: ${this.currentState} -> ${state}`);
        }
        this.currentState = state as EnemyState;

        if (
            state === EnemyState.IDLE ||
            state === EnemyState.ATTACK_READY
        ) {
            this.stop();
        }

        return this;
    }

    public getState(): EnemyState {
        return this.currentState;
    }

    public chasePlayer(
        player: Phaser.GameObjects.Components.Transform
    ): void {

        if (this.dead) {
            return;
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;

        const stopDistance = this.explodesOnContact ? 0 : 48;

        if (Math.hypot(dx, dy) <= stopDistance) {
            this.stop();
            return;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
            const blocked=(this.body as Phaser.Physics.Arcade.Body).blocked;
            if(dx>0?blocked.right:blocked.left){
                if((dy<0&&!blocked.up)||blocked.down)this.moveUp();else this.moveDown();
                return;
            }
            if (dx > 0) {
                this.moveRight();
            } else {
                this.moveLeft();
            }
        } else {
            const blocked=(this.body as Phaser.Physics.Arcade.Body).blocked;
            if(dy>0?blocked.down:blocked.up){
                if((dx<0&&!blocked.left)||blocked.right)this.moveLeft();else this.moveRight();
                return;
            }
            if (dy > 0) {
                this.moveDown();
            } else {
                this.moveUp();
            }
        }
    }

    public detectPlayer(
        player: Phaser.GameObjects.Components.Transform
    ): boolean {

        if (this.dead || !this.active) {
            this.playerDetected = false;
            return false;
        }

        const distance = Phaser.Math.Distance.Between(
            this.x,
            this.y,
            player.x,
            player.y
        );

        this.playerDetected =
            distance <= this.detectionRange;

        return this.playerDetected;
    }

    public hasDetectedPlayer(): boolean {
        return this.playerDetected;
    }

    private patrol(time: number): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        const blocked = [body.blocked.right, body.blocked.down,
            body.blocked.left, body.blocked.up][this.patrolDirection];

        // Turn at walls or after 1.5 seconds, using the scene clock.
        if (blocked || time >= this.nextPatrolTurn) {
            this.patrolDirection = (this.patrolDirection + 1) % 4;
            this.nextPatrolTurn = time + 1500;
        }

        switch (this.patrolDirection) {
            case 0: this.moveRight(); break;
            case 1: this.moveDown(); break;
            case 2: this.moveLeft(); break;
            case 3: this.moveUp(); break;
        }
    }

    public cancelAttack(): void {
        this.attack.cancel();
        this.chargeWarning?.destroy();
        this.chargeWarning = undefined;
        this.clearTint();
    }

    private updateAttackVisuals(time: number, shots: EnemyShot[] | null): void {
        if (this.attack.phase === "charging") {
            if (!this.chargeWarning) {
                this.chargeWarning = this.scene.add.circle(this.x, this.y, 43, 0xff941a, .1).setStrokeStyle(3, 0xffb34d).setDepth(this.depth + 1);
            }
            this.chargeWarning.setPosition(this.x, this.y).setAlpha(.4 + .6 * Math.abs(Math.sin(time / 110)));
            this.setTint(Math.sin(time / 110) > 0 ? 0xffb34d : 0xffffff);
            const key = `${this.animationPrefix}-special-a1`;
            if (this.scene.anims.exists(key)) this.play({ key, repeat: -1 }, true);
            return;
        }
        this.chargeWarning?.destroy();
        this.chargeWarning = undefined;
        if (shots) {
            this.flashUntil = time + 100;
            const key = `${this.animationPrefix}-special-b1`;
            const walkingShot = this.attack.config.type === "rapid" && (this.body as Phaser.Physics.Arcade.Body).velocity.lengthSq() > 0;
            if (!walkingShot && this.scene.anims.exists(key)) this.play({ key, repeat: 0 }, true);
        }
        if (time < this.flashUntil) this.setTint(0xffedb0); else this.clearTint();
    }

    /** Advances movement and the shared attack clock; a spread is one atomic volley. */
    public updateBehavior(
        player: Player,
        lineOfSight: LineOfSight,
        time: number
    ): EnemyShot[] | null {
        if (this.dead || !this.active) {
            return null;
        }
        if(this.isSpawning){this.setVelocity(0,0);return null;}

        if (player.isDead() || !player.physicsSprite.active) {
            this.cancelAttack();
            this.playerDetected = false;
            this.setState(EnemyState.IDLE);
            this.stop();
            return null;
        }

        const detected = this.detectPlayer(player.physicsSprite);
        const visible = detected && lineOfSight.hasLineOfSight(this, player, this.piercesInteriorWalls);
        const distance = Math.hypot(player.x - this.x, player.y - this.y);
        const shots = this.attack.update(time, visible && distance <= this.attack.config.attackRange, this, player);
        const charging = this.attack.phase === "charging";
        const recovering = this.attack.config.type === "piercing-spread" && this.attack.phase === "recovering";
        let state: EnemyState;
        if (charging || recovering) state = charging ? EnemyState.CHARGING : EnemyState.RECOVERY;
        else if (!detected) state = this.patrolEnabled ? EnemyState.PATROL : EnemyState.IDLE;
        else if (!visible || distance > this.attack.config.attackRange || this.attack.config.type === "rapid") state = EnemyState.CHASE;
        else if (this.attack.config.type === "burst" && distance < 160) state = EnemyState.RETREAT;
        else if (this.attack.config.type === "burst" && distance > 300) state = EnemyState.CHASE;
        else state = this.attack.phase === "burst" ? EnemyState.BURST : EnemyState.ATTACK_READY;
        this.setState(state);
        if (state === EnemyState.PATROL) this.patrol(time);
        else if (state === EnemyState.CHASE) this.chasePlayer(player.physicsSprite);
        else if (state === EnemyState.RETREAT) this.chasePlayer({ x: this.x * 2 - player.x, y: this.y * 2 - player.y } as Phaser.GameObjects.Components.Transform);
        else this.setVelocity(0, 0);
        this.updateAttackVisuals(time, shots);
        return shots;
    }
}

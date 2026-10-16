import Phaser from "phaser";
import { EnemyState } from "./EnemyState";
import type { Player } from "../Player";
import type { LineOfSight } from "../../systems/LineOfSight";
import { CombatEvents } from "../../systems/CombatEvents";

export type EnemyConfig = {
    moveSpeed?: number;
    detectionRange?: number;
    shootCooldown?: number;
    animationPrefix?: string;
    patrol?: boolean;
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {

    private dead = false;

    private readonly moveSpeed: number;

    private readonly detectionRange: number;

    private readonly shootCooldown: number;

    private readonly animationPrefix: string;

    private lastShotTime = -Infinity;

    private readonly patrolEnabled: boolean;

    private patrolDirection = -1;

    private nextPatrolTurn = 0;

    private playerDetected = false;

    private currentState: EnemyState = EnemyState.IDLE;

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

        this.moveSpeed = config.moveSpeed ?? 80;
        this.detectionRange = config.detectionRange ?? 200;
        this.shootCooldown = config.shootCooldown ?? 1000;
        this.animationPrefix = config.animationPrefix ?? "robot";
        this.patrolEnabled = config.patrol ?? false;
        this.setSize(44, 52);
        this.setOffset(10, 10);

        this.setCollideWorldBounds(true);
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

        this.dead = true;
        this.playerDetected = false;

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

        const stopDistance = 48;

        if (Math.hypot(dx, dy) <= stopDistance) {
            this.stop();
            return;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
                this.moveRight();
            } else {
                this.moveLeft();
            }
        } else {
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

    /** Advances AI and returns a fixed firing direction only when ready. */
    public updateBehavior(
        player: Player,
        lineOfSight: LineOfSight,
        time: number
    ): Phaser.Math.Vector2 | null {
        if (this.dead || !this.active) {
            return null;
        }

        if (player.isDead() || !player.physicsSprite.active) {
            this.playerDetected = false;
            this.setState(EnemyState.IDLE);
            this.stop();
            return null;
        }

        const detected = this.detectPlayer(player.physicsSprite);
        const visible = detected && lineOfSight.hasLineOfSight(this, player);
        this.setState(!detected ? (this.patrolEnabled ? EnemyState.PATROL : EnemyState.IDLE) :
            visible ? EnemyState.ATTACK_READY : EnemyState.CHASE);

        if (this.currentState === EnemyState.PATROL) {
            this.patrol(time);
        }

        if (this.currentState === EnemyState.CHASE) {
            this.chasePlayer(player.physicsSprite);
        }

        if (this.currentState !== EnemyState.ATTACK_READY ||
            time - this.lastShotTime < this.shootCooldown) {
            return null;
        }

        const direction = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y);
        if (direction.lengthSq() === 0) {
            return null;
        }
        this.lastShotTime = time;
        return direction.normalize();
    }
}

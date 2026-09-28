import Phaser from "phaser";

export class Enemy extends Phaser.Physics.Arcade.Sprite {

    private dead = false;

    private readonly moveSpeed = 80;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string
    ) {
        super(scene, x, y, texture);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
    }

    public playIdle(): void {
        if (this.dead) {
            return;
        }

        this.play("robot-idle", true);
    }

    public moveUp(): void {
        if (this.dead) {
            return;
        }

        this.setVelocity(0, -this.moveSpeed);
        this.play("robot-walk-up", true);
    }

    public moveDown(): void {
        if (this.dead) {
            return;
        }

        this.setVelocity(0, this.moveSpeed);
        this.play("robot-walk-down", true);
    }

    public moveLeft(): void {
        if (this.dead) {
            return;
        }

        this.setVelocity(-this.moveSpeed, 0);
        this.play("robot-walk-left", true);
    }

    public moveRight(): void {
        if (this.dead) {
            return;
        }

        this.setVelocity(this.moveSpeed, 0);
        this.play("robot-walk-right", true);
    }

    public stop(): void {
        if (this.dead) {
            return;
        }

        this.setVelocity(0, 0);
        this.playIdle();
    }

    public die(): void {

        if (this.dead) {
            return;
        }

        this.dead = true;

        this.setVelocity(0, 0);

        this.disableBody(true, true);
    }

    public isDead(): boolean {
        return this.dead;
    }
}

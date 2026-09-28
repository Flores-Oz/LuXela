import Phaser from "phaser";

export class Enemy extends Phaser.Physics.Arcade.Sprite {

    private dead = false;

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

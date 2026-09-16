import Phaser, { Textures } from "phaser";

export class Projectile {
    private readonly body:
        Phaser.Physics.Arcade.Image;

    private readonly speed = 500;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        direction: Phaser.Math.Vector2
    ){
        const textureKey = 'player-projectile';

        if (!scene.textures.exists(textureKey)){
            const graphics = scene.add.graphics();

            graphics.fillStyle(0x66ff33);
            graphics.fillCircle(8, 8, 8);

            graphics.generateTexture(
                textureKey,
                16,
                16
            );

            graphics.destroy();
        }

          this.body = scene.physics.add.image(
            x,
            y,
            textureKey
        );

        const normalizedDirection =
            direction.clone().normalize();

        this.body.setVelocity(
            normalizedDirection.x * this.speed,
            normalizedDirection.y * this.speed
        );
    }

    get physicsBody():
        Phaser.Physics.Arcade.Image {

        return this.body;
    }

    destroy(): void {
        this.body.destroy();
    }
}
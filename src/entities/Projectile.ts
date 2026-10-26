import Phaser from "phaser";
import type { EnemyAttackType } from "../config/RobotConfig";

export type ProjectileOwner = "player" | "enemy";

export class Projectile {
    private readonly body:
        Phaser.Physics.Arcade.Image;

    private readonly lifetime = 2000;

    private readonly expiration: Phaser.Time.TimerEvent;

    public readonly owner: ProjectileOwner;
    public readonly piercesInteriorWalls:boolean;
    public readonly attackType: EnemyAttackType | "player";
    public readonly damageType = "instant-kill";

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        direction: Phaser.Math.Vector2,
        owner: ProjectileOwner = "player",
        group?: Phaser.Physics.Arcade.Group,
        speed = 500,
        piercesInteriorWalls = false,
        attackType: EnemyAttackType | "player" = owner === "player" ? "player" : piercesInteriorWalls ? "piercing-spread" : "single"
    ){
        this.owner = owner;
        this.attackType = attackType;
        this.piercesInteriorWalls=owner==="enemy"&&piercesInteriorWalls;
        const textureKey = `${owner}-projectile${this.piercesInteriorWalls?"-orange":attackType==="burst"?"-blue":attackType==="rapid"?"-yellow":""}`;

        if (!scene.textures.exists(textureKey)){
            const graphics = scene.add.graphics();

            graphics.fillStyle(owner === "player" ? 0x66ff33 : this.piercesInteriorWalls?0xffa52a:attackType==="burst"?0x659dff:attackType==="rapid"?0xffdf52:0xff5533);
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

        // Add before setting velocity: Arcade groups apply their defaults on add.
        group?.add(this.body);
        this.body.setData("projectile", this);
        this.body.setCircle(8);
        this.body.setCollideWorldBounds(true);
        (this.body.body as Phaser.Physics.Arcade.Body).onWorldBounds=true;

        const normalizedDirection =
            direction.clone().normalize();

        this.body.setVelocity(
            normalizedDirection.x * speed,
            normalizedDirection.y * speed
        );

        this.expiration = scene.time.delayedCall(
            this.lifetime,
            () => {
                this.destroy();
            }
        );
        this.body.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.expiration.remove(false);
        });
    }

    get physicsBody():
        Phaser.Physics.Arcade.Image {

        return this.body;
    }

    destroy(): void {
        if (!this.body.active) {
            return;
        }
        this.body.destroy();
    }
}

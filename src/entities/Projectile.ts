import Phaser from "phaser";
import type { EnemyAttackType } from "../config/RobotConfig";
import {ProjectileConfig as config} from '../config/ProjectileConfig';

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
        attackType: EnemyAttackType | "player" = owner === "player" ? "player" : piercesInteriorWalls ? "piercing-spread" : "single",
        visual?:{key:string;frame:number}
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

          this.body = (visual?scene.physics.add.sprite.bind(scene.physics.add):scene.physics.add.image.bind(scene.physics.add))(
            x,
            y,
            textureKey
        );

        // Add before setting velocity: Arcade groups apply their defaults on add.
        group?.add(this.body);
        this.body.setData("projectile", this);
        const scale=config.displaySize[owner]/16,radius=config.normalHitRadius/scale;
        this.body.setDisplaySize(config.displaySize[owner],config.displaySize[owner]).setCircle(radius,8-radius,8-radius);
        if(visual&&scene.textures.exists(visual.key)){
            // The supplied 128px cells contain substantial transparent padding.
            // Keep the collision diameter inside the visible energy core.
            const radius=config.energyHitRadius/(config.energyDisplaySize/128);
            this.body.setTexture(visual.key,visual.frame).setDisplaySize(config.energyDisplaySize,config.energyDisplaySize).setCircle(radius,64-radius,64-radius);
            const key=`${visual.key}-${visual.frame}`;
            if(!scene.anims.exists(key))scene.anims.create({key,frames:scene.anims.generateFrameNumbers(visual.key,{start:visual.frame,end:visual.frame+3}),frameRate:12,repeat:-1});
            (this.body as Phaser.Physics.Arcade.Sprite).play(key);
        }
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

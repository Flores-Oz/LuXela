import Phaser from "phaser";

import { Room } from "../world/Room";
import { RoomBuilder } from "../world/RoomBuilder";
import { TileType } from "../types/RoomTypes";
import { Player } from "../entities/Player";
import { Projectile } from "../entities/Projectile";
import { testRoom } from "../data/rooms/testRoom";
import { testRoom2 } from "../data/rooms/testRoom2";
import { Enemy } from "../entities/enemies/Enemy";


export class GameScene extends Phaser.Scene {

    private player: Player | null = null;

    private roomIndex = 0;

    private isChangingRoom = false;

    private enemy: Enemy | null = null;

    private readonly rooms = [
        testRoom,
        testRoom2
    ];

    private walls: 
        Phaser.Physics.Arcade.StaticGroup | null = null;

    constructor() {
        super("GameScene");
    }

    preload(): void {
        this.load.spritesheet(
            "player-walk",
            "assets/sprites/player/lua-walk.png",
            { frameWidth: 256, frameHeight: 256 }
        );

        this.load.spritesheet(
            "robot-red",
            "assets/sprites/enemies/RobotRed-fixed.png",
            {
                frameWidth: 64,
                frameHeight: 64,
                endFrame: 65
            }
        );
    }

    create(): void {

        const tileSize = 64;

        const roomMatrix =
            this.rooms[this.roomIndex];

        const room = new Room(
            roomMatrix,
            tileSize
        );

        const builder = new RoomBuilder(this);

        builder.build(room);

        this.createPlayerAnimations();
        this.createEnemyAnimations();

        this.walls = builder.getWalls();

        const spawn =
            room.findTile(TileType.PlayerSpawn);

        if (!spawn) {
            throw new Error(
                "Room does not contain a PlayerSpawn."
            );
        }

        const playerX =
            spawn.column * tileSize +
            tileSize / 2;

        const playerY =
            spawn.row * tileSize +
            tileSize / 2;

        this.player = new Player(
            this,
            playerX,
            playerY
        );

        this.physics.add.collider(
            this.player.physicsSprite,
            this.walls
        );

        this.physics.world.setBounds(
            0,
            0,
            room.widthInPixels,
            room.heightInPixels
        );

        this.cameras.main.setBackgroundColor(
            "#000000"
        );

        this.cameras.main.centerOn(
            room.widthInPixels / 2,
            room.heightInPixels / 2
        );

        const exits =
            builder.getExits();

        this.physics.add.overlap(
            this.player.physicsSprite,
            exits,
            () => {
                this.changeRoom();
            }
        );

        const playerSpawnCount =
            room.countTiles(
                TileType.PlayerSpawn
            );

        if (playerSpawnCount !== 1) {
            throw new Error(
                `Room must contain exactly one PlayerSpawn. Found: ${playerSpawnCount}`
            );
        }

        this.enemy = new Enemy(
            this,
            500,
            300,
            "robot-red"
        );

      /*  this.enemy.play("robot-walk-up");
        this.enemy.play("robot-walk-down");*/
        /*this.enemy.play("robot-walk-left");*/
        this.enemy.play("robot-walk-right");

    }

    update(
    ): void {

         if (!this.player) {
            return;
        }

        this.player.update();

        const shootDirection =
            this.player.consumeShootRequest();

        if (!shootDirection) {
            return;
        }

        this.createProjectile(
            shootDirection
        );
    }

    private createPlayerAnimations(): void {
        this.anims.create({
            key: "player-walk-down",
            frames: this.anims.generateFrameNumbers(
                'player-walk',
                { start:0, end:7}
            ),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: "player-walk-up",
            frames: this.anims.generateFrameNumbers(
                'player-walk',
                { start:8, end:15}
            ),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: "player-walk-left",
            frames: this.anims.generateFrameNumbers(
                'player-walk',
                { start:16, end:23}
            ),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: "player-walk-right",
            frames: this.anims.generateFrameNumbers(
                'player-walk',
                { start:24, end:31}
            ),
            frameRate: 10,
            repeat: -1
        });
    }

    private createEnemyAnimations(): void {

        this.anims.create({
            key: "robot-idle",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 0, end: 3 }
            ),
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: "robot-walk-up",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 6, end: 11 }
            ),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: "robot-walk-down",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 12, end: 17 }
            ),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: "robot-walk-right",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 18, end: 23 }
            ),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: "robot-walk-left",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 24, end: 29 }
            ),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: "robot-special-a1",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 30, end: 33 }
            ),
            frameRate: 8,
            repeat: 0
        });

        this.anims.create({
            key: "robot-special-a2",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 36, end: 39 }
            ),
            frameRate: 8,
            repeat: 0
        });

        this.anims.create({
            key: "robot-special-b1",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 42, end: 45 }
            ),
            frameRate: 8,
            repeat: 0
        });

        this.anims.create({
            key: "robot-special-b2",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 48, end: 51 }
            ),
            frameRate: 8,
            repeat: 0
        });

        this.anims.create({
            key: "robot-hit",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 54, end: 56 }
            ),
            frameRate: 10,
            repeat: 0
        });

        this.anims.create({
            key: "robot-death",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 60, end: 65 }
            ),
            frameRate: 10,
            repeat: 0
        });
    }

    private createProjectile(
        direction: Phaser.Math.Vector2
    ): void {

        if (!this.player) {
            return;
        }

        const spawn = 
            this.player.getProjectileSpawn(
                direction
            );

        const projectile =
            new Projectile(
                this,
                spawn.x,
                spawn.y,
                direction
            );

        if (!this.walls) {
            return;
        }

        this.physics.add.collider(
            projectile.physicsBody,
            this.walls,
            () => {
                projectile.destroy();
            }
        );
    }

    private changeRoom(): void {
          if (this.isChangingRoom) {
            return;
        }

        this.isChangingRoom = true;

        const nextRoomIndex =
            (this.roomIndex + 1) %
            this.rooms.length;

        this.scene.restart({
            roomIndex: nextRoomIndex
        });
    }

    init(data: { roomIndex?: number }): void {
        this.roomIndex =
            data.roomIndex ?? 0;

        this.isChangingRoom = false;
    }
}

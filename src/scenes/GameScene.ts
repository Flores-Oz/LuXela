import Phaser from "phaser";

import { Room } from "../world/Room";
import { RoomBuilder } from "../world/RoomBuilder";
import { testRoom } from "../data/rooms/testRoom";
import { TileType } from "../types/RoomTypes";
import { Player } from "../entities/Player";

export class GameScene extends Phaser.Scene {

    private player: Player | null = null;

    constructor() {
        super("GameScene");
    }

    preload(): void {
        this.load.spritesheet(
            "player-walk",
            "assets/sprites/player/lua-walk.png",
            { frameWidth: 256, frameHeight: 256 }
        );
    }

    create(): void {

        const tileSize = 64;

        const room = new Room(
            testRoom,
            tileSize
        );

        const builder = new RoomBuilder(this);

        builder.build(room);

        this.createPlayerAnimations();

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
            builder.getWalls()
        );

        this.cameras.main.setBackgroundColor(
            "#000000"
        );

        this.cameras.main.centerOn(
            room.widthInPixels / 2,
            room.heightInPixels / 2
        );
    }

    update(
    ): void {

        this.player?.update();
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
}

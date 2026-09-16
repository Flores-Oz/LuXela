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
            "assets/sprites/player/alex-walk.png",
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

        this.cameras.main.setBackgroundColor(
            "#000000"
        );

        this.cameras.main.centerOn(
            room.widthInPixels / 2,
            room.heightInPixels / 2
        );
    }

    update(
        _time: number,
        delta: number
    ): void {

        this.player?.update(delta);
    }

    private createPlayerAnimations(): void {
        this.anims.create({
            key: "player-walk-down",
            frames: this.anims.generateFrameNumbers(
                'player-walk',
                { start:0, end:5}
            ),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: "player-walk-up",
            frames: this.anims.generateFrameNumbers(
                'player-walk',
                { start:6, end:11}
            ),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: "player-walk-left",
            frames: this.anims.generateFrameNumbers(
                'player-walk',
                { start:12, end:17}
            ),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: "player-walk-right",
            frames: this.anims.generateFrameNumbers(
                'player-walk',
                { start:18, end:23}
            ),
            frameRate: 8,
            repeat: -1
        });
    }
}

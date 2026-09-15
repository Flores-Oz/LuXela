import Phaser from "phaser";

import { Room } from "../world/Room";
import { RoomBuilder } from "../world/RoomBuilder";
import { testRoom } from "../data/rooms/testRoom";

export class GameScene extends Phaser.Scene {

    constructor() {
        super("GameScene");
    }

    create(): void {

        const tileSize = 64;

        const room = new Room(
            testRoom,
            tileSize
        );

        const builder = new RoomBuilder(this);

        builder.build(room);

        this.cameras.main.setBackgroundColor("#000000");

        this.cameras.main.centerOn(
            room.widthInPixels / 2,
            room.heightInPixels / 2
        );
    }
}
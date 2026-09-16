import Phaser from "phaser";
import { Room } from "./Room";
import { TileType } from "../types/RoomTypes";

export class RoomBuilder {

    private readonly scene: Phaser.Scene;

    private readonly walls:
        Phaser.Physics.Arcade.StaticGroup;

    private readonly exits:
        Phaser.Physics.Arcade.StaticGroup;

    constructor(
        scene: Phaser.Scene
    ) {
        this.scene = scene;

        this.exits =
            scene.physics.add.staticGroup();

        this.walls = 
            scene.physics.add.staticGroup();
    }

    build(room: Room): void {

        for (let row = 0; row < room.height; row++) {

            for (let column = 0; column < room.width; column++) {

                const tile = room.matrix[row][column];

                const x =
                    column * room.tileSize +
                    room.tileSize / 2;

                const y =
                    row * room.tileSize +
                    room.tileSize / 2;

                this.drawTile(
                    tile,
                    x,
                    y,
                    room.tileSize
                );
            }
        }
    }

    getWalls():
        Phaser.Physics.Arcade.StaticGroup {
            return this.walls;
        }

    getExits():
        Phaser.Physics.Arcade.StaticGroup {
        return this.exits;
    }

    private drawTile(
        tile: TileType,
        x: number,
        y: number,
        size: number
    ): void {

        switch (tile) {

            case TileType.Floor:
                this.drawFloor(x, y, size);
                break;

            case TileType.Wall:
                this.drawWall(x, y, size);
                break;

            case TileType.RobotSpawn:
                this.drawFloor(x, y, size);
                this.drawRobotSpawn(x, y, size);
                break;

            case TileType.Exit:
                this.drawFloor(x, y, size);
                this.drawExit(x, y, size);
                break;
        }
    }

    private drawFloor(
        x: number,
        y: number,
        size: number
    ): void {

        this.scene.add.rectangle(
            x,
            y,
            size,
            size,
            0x181818
        );
    }

    private drawWall(
        x: number,
        y: number,
        size: number
    ): void {

        const wall =
            this.scene.add.rectangle(
                x,
                y,
                size,
                size,
                0x777777
            )
        
        this.scene.physics.add.existing(
            wall,
            true
        );

        this.walls.add(wall);
    }

    private drawRobotSpawn(
        x: number,
        y: number,
        size: number
    ): void {

        this.scene.add.rectangle(
            x,
            y,
            size * 0.55,
            size * 0.55,
            0xff3333
        );
    }

    private drawExit(
         x: number,
        y: number,
        size: number
    ): void {

        const exit =
            this.scene.add.rectangle(
                x,
                y,
                size * 0.65,
                size * 0.65,
                0x33ff66
            );

        this.scene.physics.add.existing(
            exit,
            true
        );

        this.exits.add(exit);
    }
}

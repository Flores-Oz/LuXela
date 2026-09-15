import type { RoomMatrix, TileType } from "../types/RoomTypes";

export type TilePosition = {
    row: number;
    column: number;
};

export class Room {

    public readonly matrix: RoomMatrix;
    public readonly tileSize: number;

    constructor(
        matrix: RoomMatrix,
        tileSize: number
    ) {
        this.matrix = matrix;
        this.tileSize = tileSize;
    }

    get width(): number {
        return this.matrix[0].length;
    }

    get height(): number {
        return this.matrix.length;
    }

    get widthInPixels(): number {
        return this.width * this.tileSize;
    }

    get heightInPixels(): number {
        return this.height * this.tileSize;
    }

    findTile(tileType: TileType): TilePosition | null {

        for (let row = 0; row < this.height; row++) {

            for (let column = 0; column < this.width; column++) {

                if (this.matrix[row][column] === tileType) {
                    return {
                        row,
                        column
                    };
                }
            }
        }

        return null;
    }
}
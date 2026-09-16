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
       if (matrix.length === 0) {
            throw new Error(
                "Room matrix cannot be empty."
            );
        }

        if (matrix[0].length === 0) {
            throw new Error(
                "Room rows cannot be empty."
            );
        }

        const width = matrix[0].length;

        const hasInvalidRow =
            matrix.some(
                row => row.length !== width
            );

        if (hasInvalidRow) {
            throw new Error(
                "All Room rows must have the same width."
            );
        }

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

    countTiles(
        tileType: TileType
    ): number {
        let count = 0;
        for (const row of this.matrix) {

            for (const tile of row) {

                if (tile === tileType) {
                    count++;
                }
            }
        }
        return count;
    }
}
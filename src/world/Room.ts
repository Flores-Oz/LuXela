import type {RoomMatrix} from "../types/RoomTypes";
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

}

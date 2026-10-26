import { TileType, type RoomMatrix } from "../../types/RoomTypes";
import type { LevelRoomCatalog } from "../../levels/LevelConfig";

type WallBlock = readonly [row: number, column: number, height: number, width: number];

/** Authoring helper: existing 64px tiles, fixed border, and no enemy spawn markers. */
function roomWithWalls(blocks: readonly WallBlock[]): RoomMatrix {
    const width = 15, height = 11;
    const matrix: RoomMatrix = Array.from({ length: height }, (_, row) =>
        Array.from({ length: width }, (_, column) =>
            row === 0 || column === 0 || row === height - 1 || column === width - 1
                ? TileType.Wall : TileType.Floor));
    for (const [row, column, blockHeight, blockWidth] of blocks) {
        for (let r = row; r < row + blockHeight; r++) {
            for (let c = column; c < column + blockWidth; c++) matrix[r]![c] = TileType.Wall;
        }
    }
    matrix[1]![1] = TileType.PlayerSpawn;
    matrix[9]![13] = TileType.Exit;
    return matrix;
}

export const arcadeRooms: LevelRoomCatalog = {
    "open-room": roomWithWalls([[4, 6, 2, 1], [4, 9, 2, 1]]),
    "corridors": roomWithWalls([[1, 4, 6, 1], [4, 9, 6, 1]]),
    "mixed-room": roomWithWalls([[3, 3, 1, 3], [6, 3, 2, 1], [5, 8, 1, 3], [7, 11, 2, 1]]),
    "maze": roomWithWalls([[1, 4, 7, 1], [3, 8, 7, 1], [1, 11, 7, 1]]),
    "combat-arena": roomWithWalls([[3, 5, 1, 2], [3, 10, 1, 2], [7, 5, 1, 2], [7, 10, 1, 2]])
};

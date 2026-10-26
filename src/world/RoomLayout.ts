import type { Room, TilePosition } from "./Room";
import { TileType } from "../types/RoomTypes";
import type { ExitConfig } from "../levels/WaveConfig";
import type { RoomTheme, DecorationConfig } from "./environment/RoomTheme";
import type { EnvironmentStyle } from "./environment/EnvironmentSheets";

/** Optional Sprint 8 asset references. They never define current collision permission. */
export interface RoomPresentation {
    readonly scenarioId: string;
    readonly title?: string;
    readonly hint?: string;
    readonly tilemapKey?: string;
    readonly layers?: { readonly floor?: string; readonly walls?: string; readonly collision?: string; readonly decoration?: string };
    readonly theme?: RoomTheme;
    readonly environmentStyle?: EnvironmentStyle;
    readonly decorations?: readonly DecorationConfig[];
}
export interface RoomCell extends Readonly<TilePosition> { readonly x: number; readonly y: number; readonly size: number }
export interface LayoutDoor extends RoomCell { readonly config: ExitConfig }
export interface RoomLayout {
    readonly width: number; readonly height: number; readonly tileSize: number;
    readonly floors: readonly RoomCell[]; readonly walls: readonly RoomCell[];
    readonly playerSpawns: readonly RoomCell[]; readonly enemyMarkers: readonly RoomCell[];
    readonly doors: readonly LayoutDoor[];
}
export function createRoomLayout(room: Room, exitConfigs: readonly ExitConfig[] = []): RoomLayout {
    const floors: RoomCell[] = [], walls: RoomCell[] = [], playerSpawns: RoomCell[] = [], enemyMarkers: RoomCell[] = [], doors: LayoutDoor[] = [];
    for (let row = 0; row < room.height; row++) for (let column = 0; column < room.width; column++) {
        const cell = { row, column, x: (column + .5) * room.tileSize, y: (row + .5) * room.tileSize, size: room.tileSize };
        const tile = room.matrix[row]![column];
        if (tile === TileType.Wall) { walls.push(cell); continue; }
        floors.push(cell);
        if (tile === TileType.PlayerSpawn) playerSpawns.push(cell);
        if (tile === TileType.RobotSpawn) enemyMarkers.push(cell);
        if (tile === TileType.Exit) {
            const config = exitConfigs.find(exit => exit.position.row === row && exit.position.column === column) ??
                { id: `exit-${doors.length}`, position: { row, column }, next: null, requiresClear: true };
            doors.push({ ...cell, config });
        }
    }
    return { width: room.widthInPixels, height: room.heightInPixels, tileSize: room.tileSize, floors, walls, playerSpawns, enemyMarkers, doors };
}

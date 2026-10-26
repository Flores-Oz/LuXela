import type { RoomLayout, RoomPresentation } from "../RoomLayout";
import { environmentThemes, placeholderAtlas, type EnvironmentAtlas, type RoomTheme } from "./RoomTheme";
import { detailedEnvironmentAtlas } from "./EnvironmentSheets";

export interface EnvironmentPlan { readonly theme: RoomTheme; readonly floor: number[][]; readonly walls: number[][]; readonly decoration: number[][]; readonly decorationOverlay: number[][] }
/** N=1, E=2, S=4, W=8: all sixteen connection patterns, including ends and junctions. */
export function wallMask(row: number, column: number, walls: ReadonlySet<string>): number {
    return (walls.has(`${row - 1},${column}`) ? 1 : 0) | (walls.has(`${row},${column + 1}`) ? 2 : 0) |
        (walls.has(`${row + 1},${column}`) ? 4 : 0) | (walls.has(`${row},${column - 1}`) ? 8 : 0);
}
export function buildEnvironmentPlan(layout: RoomLayout, presentation?: RoomPresentation,
    atlas: EnvironmentAtlas = presentation?.environmentStyle ? detailedEnvironmentAtlas(presentation.environmentStyle) : environmentThemes[presentation?.theme ?? "industrial"].atlas ?? placeholderAtlas): EnvironmentPlan {
    const width = layout.width / layout.tileSize, height = layout.height / layout.tileSize;
    const empty = () => Array.from({ length: height }, () => Array<number>(width).fill(-1));
    const floor = empty(), walls = empty(), decoration = empty(), decorationOverlay = empty();
    const wallCells = new Set(layout.walls.map(cell => `${cell.row},${cell.column}`));
    const ground = new Set(layout.floors.map(cell => `${cell.row},${cell.column}`));
    const reserved = new Set([...layout.playerSpawns, ...layout.doors].map(cell => `${cell.row},${cell.column}`));
    let seed = 0;
    for (const char of presentation?.scenarioId ?? "room") seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
    for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
        floor[row]![column] = atlas.floors[((row * 13 + column * 7 + seed) >>> 0) % atlas.floors.length]!;
    }
    for (const cell of layout.walls) {
        const frames = (cell.row + cell.column + seed) % 5 === 0 ? atlas.wallVariants : atlas.walls;
        walls[cell.row]![cell.column] = frames[wallMask(cell.row, cell.column, wallCells)]!;
        if (atlas.edgeWalls) {
            if (cell.row === 0 && cell.column > 0 && cell.column < width-1) walls[cell.row]![cell.column] = atlas.edgeWalls.north;
            else if (cell.row === height-1 && cell.column > 0 && cell.column < width-1) walls[cell.row]![cell.column] = atlas.edgeWalls.south;
            else if (cell.column === 0 && cell.row > 0 && cell.row < height-1) walls[cell.row]![cell.column] = atlas.edgeWalls.west;
            else if (cell.column === width-1 && cell.row > 0 && cell.row < height-1) walls[cell.row]![cell.column] = atlas.edgeWalls.east;
        }
        if (atlas.wallDetails?.length && cell.row > 0 && cell.row < height-1 && cell.column > 0 && cell.column < width-1) {
            walls[cell.row]![cell.column] = atlas.wallDetails[(cell.row*7+cell.column*3+seed)%atlas.wallDetails.length]!;
        } else if (atlas.wallDetails?.length && cell.column > 1 && cell.column < width-2 && (cell.column+seed)%4===0) {
            walls[cell.row]![cell.column] = atlas.wallDetails[(cell.row+cell.column)%atlas.wallDetails.length]!;
        }
    }
    for (const cell of presentation?.decorations ?? []) {
        const key = `${cell.row},${cell.column}`;
        if (!ground.has(key) || reserved.has(key)) continue;
        const target = atlas.screenDecorations.includes(cell.kind) ? decorationOverlay : decoration;
        target[cell.row]![cell.column] = atlas.decoration[cell.kind];
    }
    return { theme: presentation?.theme ?? "industrial", floor, walls, decoration, decorationOverlay };
}

import { TileType } from "../types/RoomTypes";
import type { Room, TilePosition } from "../world/Room";
import type { LevelEnemySpawn } from "./LevelConfig";

/** Plan the entire wave before spawning anything. Never fall back to an unsafe position. */
export function planWaveSpawns(room: Room, spawns: readonly LevelEnemySpawn[],
    player: { x: number; y: number }, detectionRange: number): readonly TilePosition[] | null {
    const origin = room.findTile(TileType.PlayerSpawn);
    if (!origin) return null;
    const seen = new Set<string>([`${origin.row},${origin.column}`]), queue = [origin];
    for (let index = 0; index < queue.length; index++) {
        const { row, column } = queue[index]!;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const r = row + dr, c = column + dc, tile = room.matrix[r]?.[c], key = `${r},${c}`;
            if (tile !== undefined && tile !== TileType.Wall && !seen.has(key)) { seen.add(key); queue.push({ row: r, column: c }); }
        }
    }
    const clearance = Math.max(room.tileSize * 2, detectionRange + room.tileSize);
    const exits=queue.filter(({row,column})=>room.matrix[row]![column]===TileType.Exit);
    const available = queue.filter(({ row, column }) => {
        const tile = room.matrix[row]![column];
        return (tile === TileType.Floor || tile === TileType.RobotSpawn) && exits.every(exit=>Math.hypot(row-exit.row,column-exit.column)>=2) &&
            Math.hypot((column + 0.5) * room.tileSize - player.x, (row + 0.5) * room.tileSize - player.y) >= clearance;
    });
    const chosen = new Set<string>(), result: TilePosition[] = [];
    for (const spawn of spawns) {
        const candidate = available.filter(tile => !chosen.has(`${tile.row},${tile.column}`)&&result.every(other=>Math.hypot(tile.row-other.row,tile.column-other.column)>=2))
            .sort((a, b) => Math.abs(a.row - spawn.row) + Math.abs(a.column - spawn.column) -
                Math.abs(b.row - spawn.row) - Math.abs(b.column - spawn.column))[0];
        if (!candidate) return null;
        chosen.add(`${candidate.row},${candidate.column}`); result.push(candidate);
    }
    return result;
}

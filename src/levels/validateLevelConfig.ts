import { TileType } from "../types/RoomTypes";
import type { LevelConfig, LevelRoomCatalog } from "./LevelConfig";
import { roomThemeIds } from "../world/environment/RoomTheme";
import { environmentStyleIds } from "../world/environment/EnvironmentSheets";
import { robotTypes } from "../config/RobotConfig";

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
    value !== null && typeof value === "object" && !Array.isArray(value);
const isId = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
const coordinate = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const knownTiles = new Set<number>(Object.values(TileType));

/** Validate external or authored data without creating Phaser objects or changing the catalog. */
export function validateLevelCatalog(catalog: unknown, rooms: unknown): string[] {
    const errors: string[] = [];
    if (!Array.isArray(catalog) || catalog.length === 0) return ["levels: expected a non-empty array"];
    if (!isRecord(rooms)) return ["rooms: expected a room catalog"];
    const ids = new Set<string>();
    catalog.forEach((value: unknown, index) => {
        const path = `levels[${index}]`;
        const error = (message: string) => { errors.push(`${path}: ${message}`); };
        if (!isRecord(value)) { error("expected a level object"); return; }
        if (!isId(value.id)) error("id must be a non-empty string");
        else if (ids.has(value.id)) error(`duplicate id '${value.id}'`);
        else ids.add(value.id);
        if (value.completion !== "eliminate-all-enemies") error("unsupported completion condition");
        if (!coordinate(value.scorePerEnemy)) error("scorePerEnemy must be a non-negative safe integer");
        if (value.presentation !== undefined) {
            if (!isRecord(value.presentation) || !isId(value.presentation.scenarioId)) error("presentation requires a scenarioId");
            else {
                const theme = value.presentation.theme;
                if (theme !== undefined && !roomThemeIds.some(id => id === theme)) error("unknown room theme");
                const style = value.presentation.environmentStyle;
                if (style !== undefined && !environmentStyleIds.some(id=>id===style)) error("unknown environment style");
                if (value.presentation.tilemapKey !== undefined && !isId(value.presentation.tilemapKey)) error("invalid tilemap reference");
                if (value.presentation.layers !== undefined && (!isRecord(value.presentation.layers) || Object.values(value.presentation.layers).some(layer => !isId(layer)))) error("invalid layer references");
                else if (isRecord(value.presentation.layers)) {
                    const decorationLayer = value.presentation.layers.decoration ?? "decoration";
                    const layers = [value.presentation.layers.floor ?? "floor", value.presentation.layers.walls ?? "walls", decorationLayer, `${decorationLayer}-overlay`];
                    if (new Set(layers).size !== layers.length) error("visual layer names must be distinct");
                }
            }
        }

        if (!isRecord(value.difficulty)) error("difficulty must be an object");
        else {
            for (const key of ["moveSpeed", "detectionRange", "shootCooldown"] as const) {
                if (!positive(value.difficulty[key])) error(`difficulty.${key} must be finite and greater than zero`);
            }
            if (typeof value.difficulty.patrol !== "boolean") error("difficulty.patrol must be boolean");
        }

        const enemies = isRecord(value.enemies) ? value.enemies : null;
        if (!enemies) error("enemies must be an object");
        else {
            if (!coordinate(enemies.count)) error("enemies.count must be a non-negative safe integer");
            if (!Array.isArray(enemies.types) || enemies.types.length === 0 ||
                enemies.types.some(type => !robotTypes.some(robot=>robot===type)) || new Set(enemies.types).size !== enemies.types.length) {
                error("enemies.types must contain unique supported types");
            }
            if (!Array.isArray(enemies.spawns)) error("enemies.spawns must be an array");
            else if (enemies.spawns.length !== enemies.count) error("enemies.count must match enemies.spawns.length");
        }

        if (!isId(value.roomId) || !Object.hasOwn(rooms, value.roomId)) {
            error("roomId must reference an existing room"); return;
        }
        const matrix = rooms[value.roomId];
        if (!Array.isArray(matrix) || matrix.length === 0 || !Array.isArray(matrix[0]) || matrix[0].length === 0 ||
            matrix.some(row => !Array.isArray(row) || row.length !== matrix[0].length ||
                row.some(tile => typeof tile !== "number" || !knownTiles.has(tile)))) {
            error("room must be a non-empty rectangular matrix of known tiles"); return;
        }
        const grid = matrix as number[][];
        if (isRecord(value.presentation) && value.presentation.decorations !== undefined) {
            if (!Array.isArray(value.presentation.decorations)) error("decorations must be an array");
            else {
                const cells = new Set<string>();
                for (const decoration of value.presentation.decorations) {
                    if (!isRecord(decoration) || !coordinate(decoration.row) || !coordinate(decoration.column) ||
                        ![TileType.Floor, TileType.RobotSpawn].includes(grid[decoration.row]?.[decoration.column] as 0 | 3) ||
                        !["grate", "panel", "warning", "circuit"].includes(String(decoration.kind))) { error("invalid decoration position or kind"); continue; }
                    const key = `${decoration.row},${decoration.column}`;
                    if (cells.has(key)) error("duplicate decoration position");
                    cells.add(key);
                }
            }
        }
        const players: { row: number; column: number }[] = [];
        const exits: { row: number; column: number }[] = [];
        grid.forEach((row, r) => row.forEach((tile, c) => {
            if (tile === TileType.PlayerSpawn) players.push({ row: r, column: c });
            if (tile === TileType.Exit) exits.push({ row: r, column: c });
        }));
        if (players.length !== 1) error("room must contain exactly one PlayerSpawn");
        if (exits.length === 0) error("room must contain at least one Exit");

        // Reachability uses the same four movement directions as the existing robots.
        const reachable = new Set<string>();
        const queue = players.length === 1 ? [players[0]!] : [];
        if (queue[0]) reachable.add(`${queue[0].row},${queue[0].column}`);
        for (let cursor = 0; cursor < queue.length; cursor++) {
            const { row, column } = queue[cursor]!;
            for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
                const r = row + dr, c = column + dc, key = `${r},${c}`;
                const tile = grid[r]?.[c];
                if (tile !== undefined && tile !== TileType.Wall && !reachable.has(key)) {
                    reachable.add(key); queue.push({ row: r, column: c });
                }
            }
        }
        if (players.length === 1 && exits.some(exit => !reachable.has(`${exit.row},${exit.column}`))) error("room contains an unreachable exit");

        if (value.waves === undefined && [value.order, value.encounter, value.next, value.exits].some(field => field !== undefined)) {
            error("encounter metadata requires explicit waves");
        }
        if (value.waves !== undefined) {
            if (!Array.isArray(value.waves) || value.waves.length === 0) error("waves must be a non-empty array");
            else {
                const waveIds = new Set<string>();
                value.waves.forEach((wave: unknown, waveIndex: number) => {
                    if (!isRecord(wave) || !isId(wave.id)) { error(`waves[${waveIndex}] requires an id`); return; }
                    if (waveIds.has(wave.id)) error(`duplicate wave id '${wave.id}'`);
                    waveIds.add(wave.id);
                    // Reuse the same geometry and enemy validation for every wave.
                    const single = { ...value, waves: undefined, order: undefined, encounter: undefined, next: undefined, exits: undefined, enemies: wave.enemies, completion: wave.completion };
                    for (const problem of validateLevelCatalog([single], rooms)) error(`waves[${waveIndex}]: ${problem}`);
                });
                if (JSON.stringify(value.enemies) !== JSON.stringify(value.waves[0]?.enemies)) error("enemies must reference the first wave configuration");
            }
            if (value.order !== index + 1) error("order must match the configured sequence");
            if (!["normal", "multiwave", "special", "final"].includes(String(value.encounter))) error("invalid encounter type");
            if (value.encounter === "normal" && Array.isArray(value.waves) && value.waves.length !== 1) error("normal encounters require one wave");
            if (value.encounter === "multiwave" && Array.isArray(value.waves) && value.waves.length < 2) error("multiwave encounters require multiple waves");
            const next = index + 1 < catalog.length && isRecord(catalog[index + 1]) ? catalog[index + 1].id : null;
            if (value.next !== next) error("next must reference the next encounter or null at the end");
            if (value.encounter === "final" && next !== null) error("final encounter must be last");
            if (!Array.isArray(value.exits) || value.exits.length !== exits.length) error("exits must configure every map exit");
            else {
                const doorIds = new Set<string>(), positions = new Set<string>();
                for (const door of value.exits) {
                    if (!isRecord(door) || !isId(door.id) || !isRecord(door.position)) { error("invalid exit configuration"); continue; }
                    if (doorIds.has(door.id)) error("duplicate exit id");
                    doorIds.add(door.id);
                    const { row, column } = door.position;
                    if (!coordinate(row) || !coordinate(column) || grid[row]?.[column] !== TileType.Exit) error("exit position must reference an Exit tile");
                    const key = `${row},${column}`;
                    if (positions.has(key)) error("duplicate exit position");
                    positions.add(key);
                    if (door.next !== value.next || door.requiresClear !== true) error("progression exits must require clearance and use the configured next encounter");
                }
            }
        }

        const occupied = new Set<string>();
        if (enemies && Array.isArray(enemies.spawns)) enemies.spawns.forEach((spawn: unknown, spawnIndex) => {
            const label = `enemies.spawns[${spawnIndex}]`;
            if (!isRecord(spawn) || !coordinate(spawn.row) || !coordinate(spawn.column)) {
                error(`${label} must have non-negative integer row and column`); return;
            }
            if (!robotTypes.some(robot=>robot===spawn.type) || !Array.isArray(enemies.types) || !enemies.types.includes(spawn.type)) {
                error(`${label} uses an unavailable enemy type`);
            }
            const key = `${spawn.row},${spawn.column}`;
            if (occupied.has(key)) error(`${label} overlaps another enemy`);
            occupied.add(key);
            const tile = grid[spawn.row]?.[spawn.column];
            if (tile !== TileType.Floor && tile !== TileType.RobotSpawn) error(`${label} must be on floor, outside player spawn and exits`);
            else if (players.length === 1 && !reachable.has(key)) error(`${label} is unreachable from the player spawn`);
        });
    });
    return errors;
}

/** Fail before room creation, with all detected configuration errors in one message. */
export function assertValidLevelCatalog(catalog: readonly LevelConfig[], rooms: LevelRoomCatalog): void {
    const errors = validateLevelCatalog(catalog, rooms);
    if (errors.length) throw new Error(`Invalid level catalog:\n${errors.join("\n")}`);
}

import { Room } from "../world/Room";
import { arcadeRooms } from "../data/rooms/arcadeRooms";
import type { LevelConfig, LevelRoomCatalog } from "./LevelConfig";
import { levels } from "./levels";
import { assertValidLevelCatalog } from "./validateLevelConfig";

/** Resolves validated level data; session state stays in ArcadeRunService. */
export class LevelManager {
    private readonly catalog: readonly LevelConfig[];
    private readonly rooms: LevelRoomCatalog;

    constructor(catalog: readonly LevelConfig[] = levels, rooms: LevelRoomCatalog = arcadeRooms) {
        assertValidLevelCatalog(catalog, rooms);
        this.catalog = catalog;
        this.rooms = rooms;
    }

    get count(): number { return this.catalog.length; }

    nextIndex(index: number): number | null {
        const config = this.getLevel(index);
        if (config.next !== undefined) {
            return config.next === null ? null : this.catalog.findIndex(level => level.id === config.next);
        }
        return index + 1 < this.count ? index + 1 : null;
    }

    getLevel(index: number): LevelConfig {
        if (!Number.isInteger(index) || index < 0 || index >= this.count) {
            throw new RangeError(`Invalid level index: ${index}`);
        }
        return this.catalog[index]!;
    }

    createRoom(index: number, tileSize = 64): Room {
        if (!Number.isFinite(tileSize) || tileSize <= 0) throw new RangeError("Tile size must be positive and finite");
        const config = this.getLevel(index);
        // Room exposes its matrix: each load gets a copy to protect the authored maps.
        return new Room(this.rooms[config.roomId]!.map(row => [...row]), tileSize);
    }
}

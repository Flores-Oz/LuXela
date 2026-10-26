import type { EnemyConfig } from "../entities/enemies/Enemy";
import type { RoomMatrix } from "../types/RoomTypes";
import type { TilePosition } from "../world/Room";
import type { EncounterType, ExitConfig, WaveConfig } from "./WaveConfig";
import type { RoomPresentation } from "../world/RoomLayout";

/** Only the common robot already available in the game. */
export type LevelEnemyType = "robot-red";

export type LevelDifficulty = Readonly<Required<Pick<EnemyConfig,
    "moveSpeed" | "detectionRange" | "shootCooldown" | "patrol"
>>>;

export interface LevelEnemySpawn extends Readonly<TilePosition> {
    readonly type: LevelEnemyType;
}

/** Positions are tile coordinates, not pixels. The map supplies player and exit tiles. */
export interface LevelConfig {
    readonly id: string;
    readonly roomId: string;
    readonly enemies: {
        readonly count: number;
        readonly types: readonly LevelEnemyType[];
        readonly spawns: readonly LevelEnemySpawn[];
    };
    readonly difficulty: LevelDifficulty;
    readonly completion: "eliminate-all-enemies";
    readonly scorePerEnemy: number;
    readonly order?: number;
    readonly encounter?: EncounterType;
    readonly waves?: readonly WaveConfig[];
    readonly next?: string | null;
    readonly exits?: readonly ExitConfig[];
    readonly presentation?: RoomPresentation;
}

export type LevelRoomCatalog = Readonly<Record<string, RoomMatrix>>;

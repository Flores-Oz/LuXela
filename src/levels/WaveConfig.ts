import type { LevelConfig } from "./LevelConfig";
import type { TilePosition } from "../world/Room";

export interface WaveConfig {
    readonly id: string;
    readonly enemies: LevelConfig["enemies"];
    readonly completion: "eliminate-all-enemies";
}

export type EncounterType = "normal" | "multiwave" | "special" | "final";

export interface ExitConfig {
    readonly id: string;
    readonly position: Readonly<TilePosition>;
    readonly next: string | null;
    readonly requiresClear: boolean;
}

/** New authored encounters always provide explicit progression and wave metadata. */
export interface EncounterConfig extends LevelConfig {
    readonly order: number;
    readonly encounter: EncounterType;
    readonly waves: readonly WaveConfig[];
    readonly next: string | null;
    readonly exits: readonly ExitConfig[];
}

/** Existing single-group configs remain loadable as one-wave encounters. */
export function getWaves(level: LevelConfig): readonly WaveConfig[] {
    return level.waves ?? [{ id: "wave-1", enemies: level.enemies, completion: "eliminate-all-enemies" }];
}

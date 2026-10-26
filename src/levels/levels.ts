import type { LevelConfig, LevelEnemySpawn } from "./LevelConfig";
import type { EncounterConfig } from "./WaveConfig";

const spawns = (positions: readonly (readonly [number, number])[]): readonly LevelEnemySpawn[] =>
    positions.map(([row, column]) => ({ row, column, type: "robot-red" }));

type SpawnPoints = readonly (readonly [number, number])[];
const reinforcementPositions: Readonly<Record<string, readonly SpawnPoints[]>> = {
    corridors: [[[7, 2], [8, 6], [2, 8], [7, 12]]],
    "mixed-room": [
        [[2, 12], [4, 2], [4, 8], [8, 6], [9, 10]],
        [[1, 10], [5, 5], [6, 12], [8, 8], [9, 4]]
    ],
    "combat-arena": [
        [[1, 7], [2, 11], [4, 4], [4, 10], [6, 2], [8, 6], [9, 12]],
        [[2, 6], [2, 13], [5, 2], [5, 12], [8, 3], [8, 8], [9, 11]]
    ]
};

/** Gradual test balance: +8 px/s movement, +12 px detection, -100 ms cooldown per level. */
const roomSeeds: readonly LevelConfig[] = [
    {
        id: "level-1", roomId: "open-room",
        enemies: { count: 3, types: ["robot-red"], spawns: spawns([[2, 10], [7, 5], [8, 12]]) },
        difficulty: { moveSpeed: 80, detectionRange: 180, shootCooldown: 1400, patrol: true },
        completion: "eliminate-all-enemies", scorePerEnemy: 100
    },
    {
        id: "level-2", roomId: "corridors",
        enemies: { count: 4, types: ["robot-red"], spawns: spawns([[3, 6], [8, 2], [2, 12], [8, 12]]) },
        difficulty: { moveSpeed: 88, detectionRange: 192, shootCooldown: 1300, patrol: true },
        completion: "eliminate-all-enemies", scorePerEnemy: 100
    },
    {
        id: "level-3", roomId: "mixed-room",
        enemies: { count: 5, types: ["robot-red"], spawns: spawns([[2, 10], [4, 6], [7, 5], [8, 9], [9, 12]]) },
        difficulty: { moveSpeed: 96, detectionRange: 204, shootCooldown: 1200, patrol: true },
        completion: "eliminate-all-enemies", scorePerEnemy: 100
    },
    {
        id: "level-4", roomId: "maze",
        enemies: { count: 6, types: ["robot-red"], spawns: spawns([[5, 2], [8, 3], [8, 6], [2, 7], [2, 10], [8, 13]]) },
        difficulty: { moveSpeed: 104, detectionRange: 216, shootCooldown: 1100, patrol: true },
        completion: "eliminate-all-enemies", scorePerEnemy: 100
    },
    {
        id: "level-5", roomId: "combat-arena",
        enemies: { count: 7, types: ["robot-red"], spawns: spawns([[2, 7], [2, 12], [5, 4], [5, 10], [8, 2], [8, 7], [8, 12]]) },
        difficulty: { moveSpeed: 112, detectionRange: 228, shootCooldown: 1000, patrol: true },
        completion: "eliminate-all-enemies", scorePerEnemy: 100
    }
];

export const levels: readonly EncounterConfig[] = roomSeeds.map((seed, index) => {
    const next = roomSeeds[index + 1]?.id ?? null;
    const count = [1, 2, 3, 1, 3][index]!;
    const waves = Array.from({ length: count }, (_, waveIndex) => ({
        id: `wave-${waveIndex + 1}`,
        enemies: waveIndex === 0 ? seed.enemies : { ...seed.enemies, spawns: spawns(reinforcementPositions[seed.roomId]![waveIndex - 1]!) },
        completion: "eliminate-all-enemies" as const
    }));
    return {
        ...seed, order: index + 1, encounter: index === 4 ? "final" : index === 2 ? "special" : count > 1 ? "multiwave" : "normal",
        waves, next, presentation: { scenarioId: seed.roomId, layers: { floor: "floor", walls: "walls", collision: "collision", decoration: "decoration" } },
        exits: [{ id: "progression-exit", position: { row: 9, column: 13 }, next, requiresClear: true }]
    };
});

export function isLevelIndex(index: unknown): index is number {
    return typeof index === "number" && Number.isInteger(index) && index >= 0 && index < levels.length;
}

export const EnemyState = {
    IDLE: "IDLE",
    PATROL: "PATROL",
    CHASE: "CHASE",
    ATTACK_READY: "ATTACK_READY"
} as const;

export type EnemyState = typeof EnemyState[keyof typeof EnemyState];

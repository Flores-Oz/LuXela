export const EnemyState = {
    IDLE: "IDLE",
    PATROL: "PATROL",
    CHASE: "CHASE",
    ATTACK_READY: "ATTACK_READY",
    RETREAT: "RETREAT",
    BURST: "BURST",
    CHARGING: "CHARGING",
    RECOVERY: "RECOVERY"
} as const;

export type EnemyState = typeof EnemyState[keyof typeof EnemyState];

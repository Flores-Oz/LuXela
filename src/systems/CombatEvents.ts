export const CombatEvents = {
    PLAYER_DIED: "player-died",
    PLAYER_DEFEAT_COMPLETE: "player-defeat-complete",
    ENEMY_DIED: "enemy-died",
    ENEMY_DEFEATED: "enemy-defeated",
    ENEMY_COUNT_CHANGED: "enemy-count-changed",
    ENEMY_GROUP_CLEARED: "enemy-group-cleared",
    WAVE_STARTED: "wave-started",
    WAVE_COMPLETED: "wave-completed",
    ROOM_CLEARED: "room-cleared"
} as const;

/** Large-room tuning: preserve movement and one-hit combat, bring encounters into view sooner. */
export const CombatBalance={
    enemiesPerWave:[6,8,10,12,14],
    detectionRanges:[420,450,480,510,540],
    shootCooldowns:[1500,1400,1300,1200,1100],
    maxFloorDetails:128
} as const;

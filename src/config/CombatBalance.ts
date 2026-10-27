/** Large-room tuning: preserve movement and one-hit combat, bring encounters into view sooner. */
export const CombatBalance={
    enemiesPerWave:[8,10,12,12,0,9,9,10,9,10,0],
    detectionRanges:[520,560,580,600,540,550,550,560,550,560,560],
    moveSpeeds:[96,104,108,112,112,144,144,144,144,152,160],
    shootCooldowns:[1100,1200,1100,1100,1100,1150,1150,1150,1150,1100,1100],
    wavesPerLevel:[1,2,3,1,0,3,3,3,3,3,0],
    maxActivePerLevel:[8,10,12,12,0,9,9,10,9,10,0]
} as const;

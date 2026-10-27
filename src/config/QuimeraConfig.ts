/** Boss-only balance. Normal robot and player rules remain in their existing configs. */
export const QuimeraConfig = {
    maxHealth: 72, normalDamage: 2, specialDamage: {alex:12,lua:14},
    specialRange: {alex:1600,lua:720}, recoveryDamageMultiplier:1.5,
    introMs:1500, transitionMs:700, score:1000,
    phaseThresholds:[.7,.35],
    movementSpeed:[75,100,125], repositionMs:[1800,1300,950], preferredDistance:[460,350,300],
    projectileSpeed:[280,300,320], recoveryMs:[1100,1400,1700],
    warningMs:{aim:500,burst:650,spread:850,pulse:1100,module:650,combined:1000,critical:1600},
    shortBurstCount:3, shortBurstDelay:230, spreadCount:5, spreadAngle:32,
    pulseRadius:180, criticalCount:12, criticalSafeAngle:60, combinedDelay:800,
    yellowShots:3, yellowModuleMs:4000,
    phasePatterns:[['aim','burst'],['spread','pulse','module'],['combined','critical','module','pulse']],
    modules:['robot-red','robot-blue','robot-yellow','robot-orange'],
    spriteScale:1.1, body:{width:104,height:116,offsetX:44,offsetY:48}
} as const;

export type BossAttack = typeof QuimeraConfig.phasePatterns[number][number];
export type BossPhase = 1 | 2 | 3;
export type BossState = 'INTRO'|'REPOSITION'|'CHARGING'|'ATTACKING'|'RECOVERING'|'PHASE_TRANSITION'|'QTE'|'FINISHING'|'DEAD'|'STOPPED';

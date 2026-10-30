/** Boss-only balance. Normal robot and player rules remain in their existing configs. */
export const QuimeraConfig = {
    maxHealth: 72, normalDamage: 2, specialDamage: {alex:12,lua:14},
    specialRange: {alex:1600,lua:720}, recoveryDamageMultiplier:1.5,
    introMs:1500, transitionMs:700, score:1000,
    phaseThresholds:[.5],
    movementSpeed:[85,100], repositionMs:[750,550], preferredDistance:[420,350],
    projectileSpeed:[330,360], recoveryMs:[850,950],
    warningMs:{aim:450,burst:550,spread:650,pulse:1100,module:500,combined:800,critical:1350,beam:1100,shockwave:1300,summon:1100,alternating:550,'cross-burst':800},
    shortBurstCount:3, shortBurstDelay:170, spreadCount:5, spreadAngle:32,
    pulseRadius:180, criticalCount:12, criticalSafeAngle:60, combinedDelay:600,
    yellowShots:3, yellowModuleMs:4000,
    phasePatterns:[['aim','burst','spread','module','alternating','combined','beam'],['pressure','counter','module','cross-burst','spread','summon','combined','shockwave']],
    modules:['robot-red','robot-blue','robot-yellow','robot-orange'],
    spriteScale:1.1, body:{width:104,height:116,offsetX:44,offsetY:48}
} as const;

export type BossAttack = typeof QuimeraConfig.phasePatterns[number][number] | 'pulse' | 'combined' | 'critical' | 'alternating' | 'cross-burst' | 'beam' | 'shockwave' | 'summon' | 'arsenal' | 'target-area' | 'overload' | 'barrage' | 'beam-chain';
export type BossPhase = 1 | 2 | 3;
export type QuimeraTuning = Omit<typeof QuimeraConfig,'maxHealth'|'phaseThresholds'|'movementSpeed'|'repositionMs'|'preferredDistance'|'projectileSpeed'|'recoveryMs'|'phasePatterns'|'warningMs'|'spreadCount'|'spreadAngle'|'shortBurstDelay'> & {
    readonly shortBurstDelay:number;readonly spreadCount:number;readonly spreadAngle:number;
    readonly maxHealth:number;readonly phaseThresholds:readonly number[];readonly movementSpeed:readonly number[];readonly repositionMs:readonly number[];
    readonly preferredDistance:readonly number[];readonly projectileSpeed:readonly number[];readonly recoveryMs:readonly number[];
    readonly phasePatterns:readonly (readonly BossAttack[])[];readonly warningMs:Partial<Readonly<Record<BossAttack,number>>>;
};
export type BossState = 'INTRO'|'REPOSITION'|'CHARGING'|'ATTACKING'|'RECOVERING'|'PHASE_TRANSITION'|'TELEPORTING'|'QTE'|'FINISHING'|'DEAD'|'STOPPED';

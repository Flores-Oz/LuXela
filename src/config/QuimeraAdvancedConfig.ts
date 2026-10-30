import {QuimeraConfig,type QuimeraTuning} from './QuimeraConfig';

export const QuimeraAdvancedConfig:QuimeraTuning={...QuimeraConfig,maxHealth:96,phaseThresholds:[.75,.5,.25],
    movementSpeed:[85,100,110,120],repositionMs:[1500,1300,1400,1300],preferredDistance:[400,360,350,330],
    projectileSpeed:[290,310,310,330],recoveryMs:[1200,1400,1700,2000],
    spreadCount:7,spreadAngle:38,
    warningMs:{...QuimeraConfig.warningMs,alternating:700,'cross-burst':1100,beam:1500,shockwave:1500,summon:1400},
    phasePatterns:[['alternating','burst','aim'],['arsenal','cross-burst','spread','alternating'],['summon','arsenal','alternating','beam','spread'],['beam','arsenal','shockwave','cross-burst','summon','combined','critical']]
};
export const AdvancedCombat={
    comboRecoveryMs:800,
    maxProjectiles:72,maxSummons:6,summonBatch:3,summonIntervalMs:7000,summonWarningMs:900,minSpawnDistance:360,minRobotDistance:140,
    alternatingVolleys:6,crossBurstVolleys:5,volleyDelayMs:260,
    beam:{range:1500,width:16,activeMs:650},shockwave:{radius:240,activeMs:1200,thickness:18},
    adaptation:{stationaryMs:1600,farDistance:650,leadMs:180,maxLead:70,selectEvery:3}
} as const;

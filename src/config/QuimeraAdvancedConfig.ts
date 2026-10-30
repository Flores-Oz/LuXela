import {QuimeraConfig,type QuimeraTuning} from './QuimeraConfig';
import {BossTacticsConfig} from './BossTacticsConfig';

export const QuimeraAdvancedConfig:QuimeraTuning={...QuimeraConfig,maxHealth:144,phaseThresholds:[.7,.35],
    movementSpeed:[125,135,145],repositionMs:[350,300,250],preferredDistance:[400,350,330],
    projectileSpeed:[420,435,450],recoveryMs:[800,950,1100],
    shortBurstDelay:130,spreadCount:7,spreadAngle:38,
    warningMs:{...QuimeraConfig.warningMs,alternating:500,'cross-burst':750,'target-area':1150,beam:650},
    phasePatterns:[['barrage','arsenal','beam-chain','cross-burst','pressure','spread','summon'],['arsenal','barrage','pressure','summon','cross-burst','beam-chain','spread'],['beam-chain','barrage','overload','arsenal','shockwave','cross-burst','summon','combined','critical']]
};
export const AdvancedCombat={
    comboRecoveryMs:BossTacticsConfig.advanced.comboRecoveryMs,
    maxProjectiles:72,maxSummons:BossTacticsConfig.advanced.summons.maxActive,summonBatch:BossTacticsConfig.advanced.summons.batch,summonIntervalMs:BossTacticsConfig.advanced.summons.intervalMs,summonWarningMs:900,minSpawnDistance:360,minRobotDistance:140,
    alternatingVolleys:6,crossBurstVolleys:5,
    beam:{range:1500,width:16,activeMs:650},shockwave:{radius:240,activeMs:1200,thickness:18},
    adaptation:{leadMs:180,maxLead:70},
    area:{radius:140,activeMs:900,thickness:18}
} as const;

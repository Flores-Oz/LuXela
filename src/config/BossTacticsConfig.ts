/** Shared tactics with encounter-specific limits; durations use the scene clock. */
export const BossTacticsConfig={
    trial:{teleportCooldownMs:[12000,9500],teleportWarningMs:900,postTeleportMs:350,
        volleyDelayMs:170,comboRecoveryMs:650,moduleSpeedMultiplier:1.1,moduleTimingMultiplier:.8,reactiveFromPhase:1,stationaryMs:2000,nearDistance:230,farDistance:650,
        reactionCooldownMs:5000,repeatDirectionMs:1100,
        summons:{fromPhase:2,maxActive:2,batch:1,intervalMs:14000,replaceOnClear:false,types:['robot-red','robot-blue','robot-yellow','robot-orange']}},
    advanced:{teleportCooldownMs:[4000,3500,2500],teleportWarningMs:550,postTeleportMs:180,
        volleyDelayMs:130,comboRecoveryMs:450,moduleSpeedMultiplier:1.25,moduleTimingMultiplier:.65,reactiveFromPhase:1,stationaryMs:1500,nearDistance:240,farDistance:650,
        reactionCooldownMs:3200,repeatDirectionMs:900,
        summons:{fromPhase:1,maxActive:6,batch:6,intervalMs:1200,replaceOnClear:true,types:['robot-red','robot-blue','robot-orange']}},
    teleport:{minPlayerDistance:260,minTravel:240,minEntityDistance:160,bodyMargin:8,viewportMargin:70},
    observation:{regionRadius:60,directionCosine:.9}
} as const;

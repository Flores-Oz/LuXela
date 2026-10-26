export const robotTypes=["robot-red","robot-blue","robot-yellow","robot-orange"] as const;
export type RobotType=typeof robotTypes[number];
export type EnemyAttackType = "single" | "burst" | "rapid" | "piercing-spread";
export interface EnemyAttackConfig {
    type: EnemyAttackType;
    projectileSpeed: number;
    attackInterval: number;
    attackRange: number;
    piercingWalls: boolean;
    burstCount?: number;
    burstDelay?: number;
    chargeDuration?: number;
    recoveryDuration?: number;
    spreadAngle?: number;
    spreadCount?: number;
}
export const robotAttacks: Record<RobotType, Readonly<EnemyAttackConfig>> = {
    "robot-red": { type: "single", projectileSpeed: 300, attackInterval: 1500, attackRange: 600, piercingWalls: false },
    "robot-blue": { type: "burst", projectileSpeed: 350, attackInterval: 2000, attackRange: 420, piercingWalls: false, burstCount: 5, burstDelay: 200 },
    "robot-yellow": { type: "rapid", projectileSpeed: 400, attackInterval: 800, attackRange: 160, piercingWalls: false },
    "robot-orange": { type: "piercing-spread", projectileSpeed: 320, attackInterval: 2500, attackRange: 600, piercingWalls: true, chargeDuration: 1000, recoveryDuration: 2500, spreadAngle: 20, spreadCount: 6 }
};
export const robotMovementScale: Record<RobotType, number> = { "robot-red": 1, "robot-blue": .9, "robot-yellow": 2, "robot-orange": .65 };
export const robotDefinitions={
    "robot-red":{file:"RobotRed-fixed.png",prefix:"robot",piercesInteriorWalls:false},
    "robot-blue":{file:"RobotBlue.png",prefix:"robot-blue",piercesInteriorWalls:false},
    "robot-yellow":{file:"RobotYellow.png",prefix:"robot-yellow",piercesInteriorWalls:false},
    "robot-orange":{file:"RobotOrange.png",prefix:"robot-orange",piercesInteriorWalls:true}
} as const;

import type { EnemyAttackConfig, EnemyAttackType } from "../../config/RobotConfig";

type Point = { x: number; y: number };
export type EnemyShot = {
    direction: Point;
    speed: number;
    attackType: EnemyAttackType;
    piercesInteriorWalls: boolean;
    originOffset?:Point;
    visualFrame?:number;
    lifetimeMs?:number;
};
export type AttackPhase = "ready" | "burst" | "charging" | "recovering";

/** One scene-clock state machine for all patterns. No callbacks can outlive an enemy. */
export class EnemyAttackController {
    readonly config: Readonly<EnemyAttackConfig>;
    phase: AttackPhase = "ready";
    private nextAt = -Infinity;
    private burstRemaining = 0;

    constructor(config: Readonly<EnemyAttackConfig>) { this.config = config; }

    cancel(time = 0): void {
        this.phase = "ready";
        this.burstRemaining = 0;
        this.nextAt = time + this.config.attackInterval;
    }

    update(time: number, eligible: boolean, from: Point, target: Point): EnemyShot[] | null {
        if (this.phase === "recovering" && time >= this.nextAt) this.phase = "ready";
        if (!eligible) {
            if (this.phase === "burst" || this.phase === "charging") this.cancel(time);
            return null;
        }
        if (time < this.nextAt) return null;
        const length = Math.hypot(target.x - from.x, target.y - from.y);
        if (!length) return null;
        const direction = { x: (target.x - from.x) / length, y: (target.y - from.y) / length };
        const shot = (angle = 0): EnemyShot => {
            const radians = angle * Math.PI / 180;
            return { direction: { x: direction.x * Math.cos(radians) - direction.y * Math.sin(radians),
                y: direction.x * Math.sin(radians) + direction.y * Math.cos(radians) },
                speed: this.config.projectileSpeed, attackType: this.config.type, piercesInteriorWalls: this.config.piercingWalls,
                ...(this.config.projectileLifetimeMs?{lifetimeMs:this.config.projectileLifetimeMs}:{}) };
        };

        if (this.config.type === "piercing-spread") {
            if (this.phase === "ready") {
                this.phase = "charging";
                this.nextAt = time + this.config.chargeDuration!;
                return null;
            }
            this.phase = "recovering";
            this.nextAt = time + this.config.recoveryDuration!;
            const count = this.config.spreadCount ?? 3;
            return Array.from({ length: count }, (_, index) => shot(count === 1 ? 0 : -this.config.spreadAngle! + index * 2 * this.config.spreadAngle! / (count - 1)));
        }

        if (this.config.type === "burst") {
            if (this.phase !== "burst") this.burstRemaining = this.config.burstCount!;
            this.burstRemaining--;
            this.phase = this.burstRemaining ? "burst" : "recovering";
            this.nextAt = time + (this.burstRemaining ? this.config.burstDelay! : this.config.attackInterval);
        } else {
            this.nextAt = time + this.config.attackInterval;
        }
        // Deliberately emit at most one burst shot per update after a slow frame.
        return [shot()];
    }
}

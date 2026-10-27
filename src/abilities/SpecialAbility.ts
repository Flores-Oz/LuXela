import type { Player } from "../entities/Player";

export type AbilityState = "locked" | "cooldown" | "ready" | "charging" | "active" | "recovering";
export interface AbilityTiming { chargeMs: number; durationMs: number; recoveryMs: number; killsRequired: number }
export interface AbilityCharge { count: () => number; consume: () => boolean; cooldownRemaining?: () => number }

/** Availability requires validated eliminations; animation/recovery still gates repeated input. */
export abstract class SpecialAbility {
    private phase: "charging" | "active" | "recovering" | null = null;
    elapsed = 0;
    private destroyed = false;
    private discharged: (()=>void) | undefined;
    onDischarged(listener:()=>void):void {this.discharged=listener;}

    protected readonly player: Player;
    protected readonly timing: AbilityTiming;
    private readonly charge: AbilityCharge;
    constructor(player: Player, timing: AbilityTiming, charge: AbilityCharge) { this.player = player; this.timing = timing; this.charge = charge; }
    get cooldownRemaining(): number { return this.charge.cooldownRemaining?.() ?? 0; }
    get state(): AbilityState { return this.phase ?? (this.destroyed ? "locked" : this.cooldownRemaining > 0 ? "cooldown" : this.charge.count() >= this.timing.killsRequired ? "ready" : "locked"); }

    get performing(): boolean {
        return this.phase !== null;
    }

    activate(): boolean {
        if (this.destroyed || this.player.isDead() || !this.player.physicsSprite.active || this.state !== "ready" || !this.charge.consume()) return false;
        this.phase = "charging";
        this.elapsed = 0;
        return true;
    }

    update(delta: number): void {
        if (this.destroyed || !Number.isFinite(delta) || delta <= 0) return;
        if (this.player.isDead()) { this.cancel(); return; }
        let remaining = delta;
        while (remaining > 0 && this.phase !== null) {
            const duration = this.phase === "charging" ? this.timing.chargeMs :
                this.phase === "active" ? this.timing.durationMs : this.timing.recoveryMs;
            const step = Math.min(remaining, Math.max(0, duration - this.elapsed));
            this.elapsed += step;
            remaining -= step;
            if (this.phase === "active") this.onActiveUpdate(this.elapsed);
            if (this.elapsed < duration) break;
            this.elapsed = 0;
            if (this.phase === "charging") { this.phase = "active"; this.onDischarge(); this.discharged?.(); }
            else if (this.phase === "active") this.phase = "recovering";
            else this.phase = null;
        }
    }

    cancel(): void {
        this.phase = null;
        this.elapsed = 0;
    }

    destroy(): void { this.cancel(); this.destroyed = true; this.discharged=undefined; }
    protected abstract onDischarge(): void;
    protected onActiveUpdate(_elapsed: number): void {}
}

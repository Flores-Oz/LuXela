import type { Player } from "../entities/Player";

export type AbilityState = "ready" | "charging" | "active" | "recovering" | "cooldown";
export interface AbilityTiming { chargeMs: number; durationMs: number; recoveryMs: number; cooldownMs: number }

/** Scene delta drives all phases; no timers survive cancellation or shutdown. */
export abstract class SpecialAbility {
    state: AbilityState = "ready";
    elapsed = 0;
    cooldownRemaining = 0;
    private destroyed = false;

    protected readonly player: Player;
    protected readonly timing: AbilityTiming;
    constructor(player: Player, timing: AbilityTiming) { this.player = player; this.timing = timing; }

    get performing(): boolean {
        return this.state === "charging" || this.state === "active" || this.state === "recovering";
    }

    activate(): boolean {
        if (this.destroyed || this.player.isDead() || !this.player.physicsSprite.active || this.state !== "ready") return false;
        this.state = "charging";
        this.elapsed = 0;
        return true;
    }

    update(delta: number): void {
        if (this.destroyed || !Number.isFinite(delta) || delta <= 0) return;
        if (this.player.isDead()) { this.cancel(); return; }
        let remaining = delta;
        while (remaining > 0 && this.state !== "ready") {
            if (this.state === "cooldown") {
                this.cooldownRemaining = Math.max(0, this.cooldownRemaining - remaining);
                if (!this.cooldownRemaining) this.state = "ready";
                break;
            }
            const duration = this.state === "charging" ? this.timing.chargeMs :
                this.state === "active" ? this.timing.durationMs : this.timing.recoveryMs;
            const step = Math.min(remaining, Math.max(0, duration - this.elapsed));
            this.elapsed += step;
            remaining -= step;
            if (this.state === "active") this.onActiveUpdate(this.elapsed);
            if (this.elapsed < duration) break;
            this.elapsed = 0;
            if (this.state === "charging") { this.state = "active"; this.onDischarge(); }
            else if (this.state === "active") this.state = "recovering";
            else { this.state = "cooldown"; this.cooldownRemaining = this.timing.cooldownMs; }
        }
    }

    cancel(): void {
        if (this.performing) { this.state = "cooldown"; this.cooldownRemaining = this.timing.cooldownMs; }
        this.elapsed = 0;
    }

    destroy(): void { this.cancel(); this.destroyed = true; }
    protected abstract onDischarge(): void;
    protected onActiveUpdate(_elapsed: number): void {}
}

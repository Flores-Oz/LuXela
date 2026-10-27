import type Phaser from "phaser";
import type { PlayerCharacter } from "../config/characters";
import { levels } from "../levels/levels";
import { SpecialAbilityConfig } from "../config/SpecialAbilityConfig";

/** Session-only arcade result. Narrative/UI cannot manufacture a victory by scene data alone. */
export class ArcadeRunService {
    private serial = 0;
    private bossIntroRunId:number|undefined;
    hasBossIntro(id:number):boolean{return this.bossIntroRunId===id;}
    acknowledgeBossIntro(id:number):void {if(this.run?.id===id&&this.run.roomIndex===10&&this.run.status==='playing')this.bossIntroRunId=id;}
    private run: { id: number; character: PlayerCharacter; roomIndex: number; cleared: Set<number>; score: number; entryScore: number; specialCharge: number; entryCharge: number; specialCooldown: number; entryCooldown: number; awarded: Set<string>; status: "playing" | "defeat" | "victory" } | null = null;
    readonly roomCount: number;
    constructor(roomCount = levels.length) {
        if (!Number.isSafeInteger(roomCount) || roomCount < 1) throw new RangeError("Invalid room count");
        this.roomCount = roomCount;
    }
    begin(character: PlayerCharacter): number {
        this.run = { id: ++this.serial, character, roomIndex: 0, cleared: new Set(), score: 0, entryScore: 0, specialCharge: 0, entryCharge: 0, specialCooldown: 0, entryCooldown: 0, awarded: new Set(), status: "playing" };
        return this.run.id;
    }
    continue(id: unknown, character: PlayerCharacter, roomIndex = this.run?.roomIndex): boolean {
        if (!this.run || this.run.id !== id || this.run.character !== character || this.run.status === "victory" || roomIndex !== this.run.roomIndex) return false;
        // The room is rebuilt on retry or narrative return: restore its entry checkpoint.
        this.run.cleared.delete(this.run.roomIndex);
        this.run.score = this.run.entryScore;
        this.run.specialCharge = this.run.entryCharge;
        this.run.specialCooldown = this.run.entryCooldown;
        this.run.awarded.clear();
        this.run.status = "playing";
        return true;
    }
    clearRoom(id: number, roomIndex: number): void {
        if (this.run?.id === id && this.run.status === "playing" && roomIndex === this.run.roomIndex) this.run.cleared.add(roomIndex);
    }
    advance(id: number, roomIndex: number): boolean {
        if (!this.run || this.run.id !== id || this.run.status !== "playing" || this.run.roomIndex !== roomIndex ||
            !this.run.cleared.has(roomIndex) || roomIndex >= this.roomCount - 1) return false;
        this.run.roomIndex++;
        this.run.entryScore = this.run.score;
        this.run.entryCharge = this.run.specialCharge;
        this.run.entryCooldown = this.run.specialCooldown;
        this.run.awarded.clear();
        return true;
    }
    awardKill(id: number, roomIndex: number, enemyId: string, points: number): boolean {
        const run = this.run;
        if (!run || run.id !== id || run.status !== "playing" || run.roomIndex !== roomIndex || run.cleared.has(roomIndex) ||
            typeof enemyId !== "string" || !enemyId || run.awarded.has(enemyId) ||
            !Number.isSafeInteger(points) || points < 0 || !Number.isSafeInteger(run.score + points)) return false;
        run.awarded.add(enemyId);
        run.score += points;
        run.specialCharge = Math.min(SpecialAbilityConfig[run.character].killsRequired, run.specialCharge + 1);
        return true;
    }
    getScore(id: number): number { return this.run?.id === id ? this.run.score : 0; }
    getSpecialCharge(id: number): number { return this.run?.id === id ? this.run.specialCharge : 0; }
    getSpecialCooldown(id: number): number { return this.run?.id === id ? this.run.specialCooldown : 0; }
    advanceSpecialCooldown(id: number, delta: number): void {
        if (this.run?.id !== id || this.run.status !== "playing" || !Number.isFinite(delta) || delta <= 0) return;
        this.run.specialCooldown = Math.max(0, this.run.specialCooldown - delta);
    }
    consumeSpecial(id: number): boolean {
        if (!this.run || this.run.id !== id || this.run.status !== "playing" || this.run.specialCooldown > 0 || this.run.specialCharge < SpecialAbilityConfig[this.run.character].killsRequired) return false;
        this.run.specialCharge = 0;
        this.run.specialCooldown = SpecialAbilityConfig.cooldownMs;
        return true;
    }
    defeat(id: number): void { if (this.run?.id === id && this.run.status === "playing") this.run.status = "defeat"; }
    finish(id: number, roomIndex: number): boolean {
        if (!this.run || this.run.id !== id || this.run.status !== "playing" || this.run.roomIndex !== roomIndex || roomIndex !== this.roomCount - 1 || this.run.cleared.size !== this.roomCount) return false;
        this.run.status = "victory";
        return true;
    }
    canComplete(character: unknown, id: unknown): boolean {
        return !!this.run && this.run.id === id && this.run.character === character && this.run.status === "victory";
    }
    currentRunId(character: unknown): number | undefined {
        return this.run && this.run.character === character && this.run.status === "playing" ? this.run.id : undefined;
    }
    reset(): void { this.run = null; }
}

export function getArcadeRun(game: Phaser.Game): ArcadeRunService {
    const key = "arcade-run-service";
    let service = game.registry.get(key) as ArcadeRunService | undefined;
    if (!service) { service = new ArcadeRunService(); game.registry.set(key, service); }
    return service;
}

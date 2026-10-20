import type Phaser from "phaser";
import type { PlayerCharacter } from "../config/characters";

/** Session-only arcade result. Narrative/UI cannot manufacture a victory by scene data alone. */
export class ArcadeRunService {
    private serial = 0;
    private run: { id: number; character: PlayerCharacter; cleared: Set<number>; status: "playing" | "defeat" | "victory" } | null = null;
    readonly roomCount: number;
    constructor(roomCount = 2) { this.roomCount = roomCount; }
    begin(character: PlayerCharacter): number {
        this.run = { id: ++this.serial, character, cleared: new Set(), status: "playing" };
        return this.run.id;
    }
    continue(id: unknown, character: PlayerCharacter): boolean {
        if (!this.run || this.run.id !== id || this.run.character !== character || this.run.status === "victory") return false;
        this.run.status = "playing";
        return true;
    }
    clearRoom(id: number, roomIndex: number): void {
        if (this.run?.id === id && this.run.status === "playing" && Number.isInteger(roomIndex) && roomIndex >= 0 && roomIndex < this.roomCount) this.run.cleared.add(roomIndex);
    }
    defeat(id: number): void { if (this.run?.id === id && this.run.status === "playing") this.run.status = "defeat"; }
    finish(id: number, roomIndex: number): boolean {
        if (!this.run || this.run.id !== id || this.run.status !== "playing" || roomIndex !== this.roomCount - 1 || this.run.cleared.size !== this.roomCount) return false;
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

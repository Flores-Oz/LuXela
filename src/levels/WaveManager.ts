import type { WaveConfig } from "./WaveConfig";

export type WaveState = "idle" | "starting" | "active" | "completed" | "stopped";
export const WaveSettings = { interWaveMs: 1000, spawnRetryMs: 250 } as const;
export interface WaveHandlers {
    spawn: (wave: WaveConfig, index: number) => boolean;
    changed: () => void;
    completed: () => void;
    canSpawn: () => boolean;
    started?: (index: number) => void;
    ended?: (index: number) => void;
}

/** Owns mandatory wave identities, not physics. Delta updates freeze naturally with scene pause. */
export class WaveManager {
    private phase: WaveState = "idle";
    private index = 0;
    private remaining = new Set<string>();
    private waitMs = 0;
    private blockedSpawn = false;
    private readonly roomId: string;
    private readonly waves: readonly WaveConfig[];
    private readonly handlers: WaveHandlers;

    constructor(roomId: string, waves: readonly WaveConfig[], handlers: WaveHandlers) {
        const ids = new Set<string>();
        for (const wave of waves) {
            if (!wave || !wave.id || ids.has(wave.id) || wave.completion !== "eliminate-all-enemies" ||
                !wave.enemies || !Number.isSafeInteger(wave.enemies.count) || wave.enemies.count < 0 ||
                !Array.isArray(wave.enemies.spawns) || wave.enemies.count !== wave.enemies.spawns.length) {
                throw new Error("Invalid wave configuration");
            }
            ids.add(wave.id);
        }
        this.roomId = roomId; this.waves = waves; this.handlers = handlers;
    }
    get state(): WaveState { return this.phase; }
    get waveNumber(): number { return this.waves.length ? Math.min(this.index + 1, this.waves.length) : 0; }
    get totalWaves(): number { return this.waves.length; }
    get aliveCount(): number { return this.remaining.size; }
    get isComplete(): boolean { return this.phase === "completed"; }
    get waitingForSpace(): boolean { return this.blockedSpawn; }
    canDefeat(id: string): boolean { return this.phase === "active" && this.remaining.has(id); }
    enemyId(waveIndex: number, spawnIndex: number): string { return `${this.roomId}:${this.waves[waveIndex]!.id}:${spawnIndex}`; }

    start(): boolean {
        if (this.phase !== "idle") return false;
        this.phase = "starting";
        if (this.waves.length === 0) this.finish();
        else this.begin();
        return true;
    }
    update(delta: number): void {
        if (this.phase !== "starting" || !Number.isFinite(delta) || delta <= 0 || !this.handlers.canSpawn()) return;
        this.waitMs = Math.max(0, this.waitMs - delta);
        if (this.waitMs === 0) this.begin();
    }
    defeat(id: string): boolean {
        if (this.phase !== "active" || !this.remaining.delete(id)) return false;
        if (this.remaining.size === 0) this.endWave();
        else this.handlers.changed();
        return true;
    }
    stop(): void { this.phase = "stopped"; this.remaining.clear(); }

    private begin(): void {
        if (!this.handlers.canSpawn()) { this.waitMs = WaveSettings.spawnRetryMs; return; }
        const wave = this.waves[this.index]!;
        this.remaining = new Set(wave.enemies.spawns.map((_, spawnIndex) => this.enemyId(this.index, spawnIndex)));
        this.phase = "active";
        if (!this.handlers.spawn(wave, this.index)) {
            this.blockedSpawn = true;
            this.remaining.clear(); this.phase = "starting"; this.waitMs = WaveSettings.spawnRetryMs;
            this.handlers.changed(); return;
        }
        this.blockedSpawn = false;
        this.handlers.started?.(this.index);
        this.handlers.changed();
        if (this.phase === "active" && this.remaining.size === 0) this.endWave();
    }
    private endWave(): void {
        this.handlers.ended?.(this.index);
        if (this.index === this.waves.length - 1) { this.finish(); return; }
        this.index++;
        this.blockedSpawn = false;
        this.phase = "starting"; this.waitMs = WaveSettings.interWaveMs;
        this.handlers.changed();
    }
    private finish(): void {
        if (this.phase === "completed" || this.phase === "stopped") return;
        this.phase = "completed";
        this.handlers.completed(); this.handlers.changed();
    }
}

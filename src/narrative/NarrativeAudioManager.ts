import Phaser from "phaser";
import { narrativeAudio, NarrativeConfig, type AudioAsset } from "../config/NarrativeConfig";

export function loadNarrativeAudio(scene: Phaser.Scene): void {
    for (const [key, asset] of Object.entries(narrativeAudio)) {
        if (!scene.cache.audio.exists(key)) scene.load.audio(key, asset.urls);
    }
}
export class NarrativeAudioManager {
    private music: Phaser.Sound.BaseSound | null = null;
    private readonly effects = new Set<Phaser.Sound.BaseSound>();
    private readonly unlocking: () => void;
    private readonly scene: Phaser.Scene;
    private readonly report: (message: string) => void;
    private readonly assets: Record<string, AudioAsset>;
    constructor(scene: Phaser.Scene, report: (message: string) => void,
        assets: Record<string, AudioAsset> = narrativeAudio) {
        this.scene = scene; this.report = report; this.assets = assets;
        this.unlocking = () => { if (this.music && !this.music.isPlaying) this.music.play(); };
        scene.sound.on(Phaser.Sound.Events.UNLOCKED, this.unlocking);
    }
    get currentMusicKey(): string | null { return this.music?.key ?? null; }
    private available(key: string): boolean {
        if (!Object.hasOwn(this.assets, key) || !this.scene.cache.audio.exists(key)) {
            this.report(`Audio no disponible: ${key}. La secuencia continúa sin él.`); return false;
        }
        return true;
    }
    playMusic(key: string, volume: number = NarrativeConfig.musicVolume): void {
        if (this.music?.key === key) {
            if ("setVolume" in this.music && typeof this.music.setVolume === "function") this.music.setVolume(volume);
            return;
        }
        this.stopMusic();
        if (!this.available(key)) return;
        try {
            this.music = this.scene.sound.add(key, { loop: true, volume });
            this.music.play();
        } catch { this.music?.destroy(); this.music = null; this.report(`No se pudo reproducir: ${key}.`); }
    }
    stopMusic(key?: string): void {
        if (key !== undefined && this.music?.key !== key) return;
        this.music?.destroy(); this.music = null;
    }
    playSound(key: string, volume: number = NarrativeConfig.soundVolume): void {
        if (!this.available(key)) return;
        let sound: Phaser.Sound.BaseSound | null = null;
        try {
            sound = this.scene.sound.add(key, { volume });
            this.effects.add(sound);
            const effect = sound;
            effect.once(Phaser.Sound.Events.COMPLETE, () => { this.effects.delete(effect); effect.destroy(); });
            if (!sound.play()) { this.effects.delete(sound); sound.destroy(); }
        } catch {
            if (sound) { this.effects.delete(sound); sound.destroy(); }
            this.report(`No se pudo reproducir efecto: ${key}.`);
        }
    }
    destroy(): void {
        this.scene.sound.off(Phaser.Sound.Events.UNLOCKED, this.unlocking);
        this.stopMusic();
        for (const sound of this.effects) sound.destroy();
        this.effects.clear();
    }
}

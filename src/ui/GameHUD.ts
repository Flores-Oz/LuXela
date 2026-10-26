import Phaser from "phaser";
import { UITheme } from "../config/UITheme";
import type { PlayerCharacter } from "../config/characters";
import type { AbilityState } from "../abilities/SpecialAbility";

export interface GameHUDState {
    level: number; totalLevels: number; score: number; enemies: number;
    wave?: number; totalWaves?: number; special?: number; specialRequired?: number;
    specialState?: AbilityState; notice?: string;
    specialCooldown?: number;
}

/** Progress indicators reuse one text object and remain fixed while the room scrolls. */
export class GameHUD {
    private readonly text: Phaser.GameObjects.Text;
    private readonly scene: Phaser.Scene;
    private state: GameHUDState;

    constructor(scene: Phaser.Scene, state: GameHUDState, character: PlayerCharacter = "alex") {
        this.scene = scene;
        this.state = state;
        this.text = scene.add.text(0, 0, "", {
            fontFamily: UITheme.font, fontSize: "14px", color: character === "lua" ? "#ffda55" : UITheme.accent,
            backgroundColor: UITheme.overlay, padding: { x: 10, y: 8 }, lineSpacing: 4
        }).setScrollFactor(0).setDepth(100);
        this.layout();
    }

    update(state: GameHUDState): void { this.state = state; this.layout(); }

    layout(): void {
        const camera = this.scene.cameras.main, zoom = camera.zoom;
        const narrow = this.scene.scale.width < 1000;
        const { level, totalLevels, score, enemies } = this.state;
        const { wave = 1, totalWaves = 1, special = 0, specialRequired = 10, specialState, notice, specialCooldown = 0 } = this.state;
        const status = specialState === "ready" ? " · LISTA [Q]" : specialState === "charging" ? " · CARGANDO" : specialState === "active" || specialState === "recovering" ? " · ACTIVA" : specialCooldown > 0 ? ` · ESPERA ${Math.ceil(specialCooldown / 1000)} s` : "";
        this.text.setText(`HABITACIÓN ${String(level).padStart(2, "0")} / ${String(totalLevels).padStart(2, "0")} · OLEADA ${wave} / ${totalWaves}${narrow ? "\n" : "    "}ENEMIGOS ${enemies} · PUNTOS ${score}\nESPECIAL ${special} / ${specialRequired}${status}${notice ? ` · ${notice}` : ""}`)
            .setFontSize(narrow ? 12 : 14).setScale(1 / zoom)
            .setPosition(camera.width / 2 + (16 - camera.width / 2) / zoom,
                camera.height / 2 + (16 - camera.height / 2) / zoom);
    }

    destroy(): void { this.text.destroy(); }
}

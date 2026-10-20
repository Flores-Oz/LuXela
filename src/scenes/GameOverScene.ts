import Phaser from "phaser";
import type { PlayerCharacter } from "../config/characters";
import { getCharacterUnlocks } from "../systems/CharacterUnlockService";

export type RetryData = { roomIndex: number; character: PlayerCharacter; runId?: number };

export class GameOverScene extends Phaser.Scene {
    private restarting = false;
    private retryData: RetryData = { roomIndex: 0, character: "lua" };

    constructor() { super("GameOverScene"); }

    init(data: RetryData): void {
        this.restarting = false;
        this.retryData = data;
    }

    create(): void {
        if (!getCharacterUnlocks(this.game).isUnlocked(this.retryData.character)) {
            this.scene.start("CharacterSelectScene");
            return;
        }
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor("#101018");
        this.add.text(width / 2, height / 2 - 80, "GAME OVER", {
            fontFamily: "monospace", fontSize: "56px", color: "#ff5555"
        }).setOrigin(0.5);
        const retry = this.add.text(width / 2, height / 2 + 16, "[ REINTENTAR ]", {
            fontFamily: "monospace", fontSize: "28px", color: "#66ff33"
        }).setOrigin(0.5).setPadding(16).setInteractive({ useHandCursor: true });
        this.add.text(width / 2, height / 2 + 90, "ENTER o R para reiniciar", {
            fontFamily: "monospace", fontSize: "18px", color: "#ccccdd"
        }).setOrigin(0.5);
        retry.on("pointerover", () => retry.setColor("#ffffff"));
        retry.on("pointerout", () => retry.setColor("#66ff33"));
        retry.on("pointerdown", this.restart, this);
        this.input.keyboard?.on("keydown-ENTER", this.restart, this);
        this.input.keyboard?.on("keydown-R", this.restart, this);
        this.add.text(width / 2, height / 2 + 155, "CAMBIAR PERSONAJE", {
            fontFamily: "monospace", fontSize: "18px", color: "#ccccdd"
        }).setOrigin(0.5).setPadding(12).setInteractive({ useHandCursor: true })
            .on("pointerdown", () => {
                if (this.restarting) return;
                this.restarting = true;
                this.scene.start("CharacterSelectScene");
            });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.keyboard?.off("keydown-ENTER", this.restart, this);
            this.input.keyboard?.off("keydown-R", this.restart, this);
        });
    }

    private restart(): void {
        if (this.restarting) return;
        this.restarting = true;
        if (!getCharacterUnlocks(this.game).isUnlocked(this.retryData.character)) {
            this.scene.start("CharacterSelectScene");
            return;
        }
        this.scene.start("GameScene", this.retryData);
    }
}

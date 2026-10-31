import Phaser from "phaser";
import type { PlayerCharacter } from "../config/characters";
import { getCharacterUnlocks } from "../systems/CharacterUnlockService";
import { getArcadeRun } from "../systems/ArcadeRunService";
import { loadPlayerAssets } from "../systems/PlayerAnimations";
import { GameOverView, loadGameOverAssets } from "../ui/GameOverView";

export type RetryData = { roomIndex: number; character: PlayerCharacter; runId?: number };

export class GameOverScene extends Phaser.Scene {
    private restarting = false;
    private retryData: RetryData = { roomIndex: 0, character: "lua" };
    private view: GameOverView | null = null;
    private readonly handledKeys = new WeakSet<KeyboardEvent>();

    constructor() { super("GameOverScene"); }

    init(data: RetryData): void {
        this.restarting = false;
        this.retryData = data;
    }

    preload(): void {
        if (!getCharacterUnlocks(this.game).isUnlocked(this.retryData.character)) return;
        loadGameOverAssets(this); loadPlayerAssets(this);
    }

    create(): void {
        if (!getCharacterUnlocks(this.game).isUnlocked(this.retryData.character)) {
            this.scene.start("CharacterSelectScene");
            return;
        }
        this.cameras.main.setBackgroundColor("#08121d");
        this.input.keyboard?.resetKeys();
        this.view = new GameOverView(this, this.retryData.character, this.retryData.roomIndex + 1,
            getArcadeRun(this.game).getScore(this.retryData.runId ?? 0), [
                () => this.restart(), () => this.leave("CharacterSelectScene"), () => this.leave("MainMenuScene")
            ]);
        this.input.keyboard?.on("keydown-ENTER", this.confirm, this);
        this.input.keyboard?.on("keydown-R", this.restart, this);
        this.input.keyboard?.on("keydown-DOWN", this.next, this);
        this.input.keyboard?.on("keydown-UP", this.previous, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.keyboard?.off("keydown-ENTER", this.confirm, this);
            this.input.keyboard?.off("keydown-R", this.restart, this);
            this.input.keyboard?.off("keydown-DOWN", this.next, this);
            this.input.keyboard?.off("keydown-UP", this.previous, this);
            this.view?.destroy(); this.view = null;
        });
    }

    private acceptKey(event?: KeyboardEvent): boolean {
        event?.preventDefault();
        if (this.restarting || event?.repeat || (event && this.handledKeys.has(event))) return false;
        // Phaser can revisit a queued native event when another key arrives in the same frame.
        if (event) this.handledKeys.add(event);
        return true;
    }
    private confirm(event?: KeyboardEvent): void { if (this.acceptKey(event)) this.view?.activate(); }
    private next(event?: KeyboardEvent): void { if (this.acceptKey(event)) this.view?.move(1); }
    private previous(event?: KeyboardEvent): void { if (this.acceptKey(event)) this.view?.move(-1); }
    private leave(key: string): void {
        if (this.restarting) return;
        this.restarting = true;
        this.scene.start(key);
    }

    private restart(event?: KeyboardEvent): void {
        if (!this.acceptKey(event)) return;
        this.restarting = true;
        if (!getCharacterUnlocks(this.game).isUnlocked(this.retryData.character)) {
            this.scene.start("CharacterSelectScene");
            return;
        }
        this.scene.start("GameScene", this.retryData);
    }
}

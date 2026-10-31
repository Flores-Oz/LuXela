import Phaser from "phaser";
import { type PlayerCharacter } from "../config/characters";
import { isNarrativeRoute } from "../narrative/NarrativeTypes";
import { getCharacterUnlocks } from "../systems/CharacterUnlockService";
import { ControlsView } from "../ui/ControlsView";
import { mountSceneView } from "../ui/mountSceneView";
import { startSceneTransition } from "../ui/SceneTransition";

export class ControlsScene extends Phaser.Scene {
    private request: { character?: PlayerCharacter; roomIndex?: number; runId?: number } = {};
    constructor() { super("ControlsScene"); }
    init(data: unknown = {}): void {
        this.request = data !== null && typeof data === "object" && !Array.isArray(data) ? data : {};
    }
    create(): void {
        const { character, roomIndex, runId } = this.request;
        if (!isNarrativeRoute(character) || !getCharacterUnlocks(this.game).isUnlocked(character) || roomIndex !== 0) {
            this.scene.start("CharacterSelectScene");
            return;
        }
        this.cameras.main.setBackgroundColor("#0b1014");
        const view = new ControlsView(character, () => {
            if (!getCharacterUnlocks(this.game).isUnlocked(character)) { this.scene.start("CharacterSelectScene"); return; }
            startSceneTransition(this, "GameScene", { character, roomIndex, runId });
        });
        mountSceneView(this, view.element);
        view.focus();
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => view.destroy());
    }
}

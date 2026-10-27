import Phaser from "phaser";
import { MenuView } from "../ui/MenuView";
import { mountSceneView } from "../ui/mountSceneView";
import { BackgroundManager } from "../narrative/BackgroundManager";
import { getArcadeRun } from "../systems/ArcadeRunService";
import { getCharacterUnlocks } from "../systems/CharacterUnlockService";
import { isNarrativeRoute } from "../narrative/NarrativeTypes";
import { characters } from "../config/characters";
import { levels } from "../levels/levels";

export class CompletionScene extends Phaser.Scene {
    private request: { character?: unknown; runId?: unknown } = {};
    constructor() { super("CompletionScene"); }
    init(data: unknown): void { this.request = data && typeof data === "object" ? data : {}; }
    create(): void {
        const { character, runId } = this.request;
        if (!isNarrativeRoute(character) || !getCharacterUnlocks(this.game).isUnlocked(character) || !getArcadeRun(this.game).canComplete(character, runId)) {
            this.scene.start("MainMenuScene"); return;
        }
        let leaving = false;
        const leave = (key: string) => { if (leaving) return; leaving = true; getArcadeRun(this.game).reset(); this.scene.start(key); };
        const view = new MenuView({ kind: "completion", eyebrow: `Ruta de ${characters[character].name}`, title: "Campaña completada",
            subtitle: `Superaste los ${levels.length} niveles y el verdadero combate contra Quimera. El epílogo de esta ruta llegará próximamente.`, actions: [
                { label: "Volver al menú principal", primary: true, action: () => leave("MainMenuScene") },
                { label: "Elegir otro personaje", action: () => leave("CharacterSelectScene") }
            ] });
        mountSceneView(this, view.element);
        const background = new BackgroundManager(view.element.querySelector(".presentation-background")!, message => {
            view.element.querySelector(".presentation-subtitle")!.textContent = message;
        });
        background.show("main-menu", true);
        view.focus();
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { background.destroy(); view.destroy(); });
    }
}

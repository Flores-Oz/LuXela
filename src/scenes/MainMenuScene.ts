import Phaser from "phaser";
import { MenuView } from "../ui/MenuView";
import { mountSceneView } from "../ui/mountSceneView";
import { BackgroundManager } from "../narrative/BackgroundManager";
import { getArcadeRun } from "../systems/ArcadeRunService";

export class MainMenuScene extends Phaser.Scene {
    constructor() { super("MainMenuScene"); }
    create(): void {
        getArcadeRun(this.game).reset();
        let leaving = false;
        const actions = [{ label: "Comenzar", primary: true, action: () => {
            if (leaving) return; leaving = true; this.scene.start("CharacterSelectScene");
        } }];
        if (this.scale.fullscreen.available) actions.push({ label: "Pantalla completa", primary: false, action: () => {
            if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen();
        } });
        const view = new MenuView({ kind: "main", eyebrow: "Alex / Lua · Dos formas de entrar", title: "Cada habitación\ncuenta.",
            subtitle: "Muévete. Despeja el camino. Encuentra la salida. Un solo impacto decide la partida.", actions });
        mountSceneView(this, view.element);
        const background = new BackgroundManager(view.element.querySelector(".presentation-background")!, message => {
            view.element.querySelector(".presentation-subtitle")!.textContent = message;
        });
        background.show("main-menu", true);
        view.focus();
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { background.destroy(); view.destroy(); });
    }
}

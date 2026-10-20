import Phaser from "phaser";
import { MenuView } from "../ui/MenuView";
import { mountSceneView } from "../ui/mountSceneView";
import type { GameScene } from "./GameScene";

export class PauseScene extends Phaser.Scene {
    constructor() { super("PauseScene"); }
    create(): void {
        const gameplay = this.scene.get("GameScene") as GameScene;
        if (!this.scene.isPaused("GameScene")) { this.scene.stop(); return; }
        let leaving = false;
        const leave = (destination: "resume" | "restart" | "menu") => {
            if (leaving) return; leaving = true;
            // Stop the overlay first so its DOM/keyboard capture is released before a new scene mounts.
            this.scene.stop();
            if (destination === "resume") { gameplay.resumeFromPause(); this.scene.resume("GameScene"); }
            else {
                const character = gameplay.selectedCharacter;
                this.scene.stop("GameScene");
                if (destination === "restart") this.scene.start("GameScene", { character, roomIndex: 0 });
                else this.scene.start("MainMenuScene");
            }
        };
        const view = new MenuView({ kind: "pause", eyebrow: "Tómate un momento", title: "Pausa", subtitle: "La habitación puede esperar.", actions: [
            { label: "Continuar", primary: true, action: () => leave("resume") },
            { label: "Reiniciar partida", action: () => leave("restart") },
            { label: "Volver al menú principal", action: () => leave("menu") }
        ] });
        mountSceneView(this, view.element);
        const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.repeat) { event.preventDefault(); leave("resume"); } };
        window.addEventListener("keydown", escape);
        view.focus();
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { window.removeEventListener("keydown", escape); view.destroy(); });
    }
}

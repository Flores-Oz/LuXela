import Phaser from "phaser";
import { characters, type PlayerCharacter } from "../config/characters";
import { getCharacterUnlocks, type CharacterUnlockService } from "../systems/CharacterUnlockService";
import { CharacterSelectView } from "../ui/CharacterSelectView";
import { mountSceneView } from "../ui/mountSceneView";

export class CharacterSelectScene extends Phaser.Scene {
    private selected: PlayerCharacter | null = null;
    private starting = false;
    private unlocks!: CharacterUnlockService;
    private view: CharacterSelectView | null = null;

    constructor() { super("CharacterSelectScene"); }

    init(): void {
        this.selected = null;
        this.starting = false;
        this.unlocks = getCharacterUnlocks(this.game);
    }

    create(): void {
        this.cameras.main.setBackgroundColor("#0b1014");
        this.view = new CharacterSelectView({
            select: id => this.select(id),
            redeem: code => this.redeem(code),
            start: () => this.startGame()
        });
        mountSceneView(this, this.view.element);
        this.view.render(this.unlocks, this.selected);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.view?.destroy();
            this.view = null;
        });
    }

    private select(id: PlayerCharacter): void {
        if (this.starting || !this.view) return;
        if (!this.unlocks.isUnlocked(id)) {
            this.view.message(`Introduce el código de ${characters[id].name} para desbloquearlo.`, true);
            return;
        }
        this.selected = id;
        this.view.render(this.unlocks, this.selected);
        this.view.message(`${characters[id].name} seleccionado. Todo listo para entrar.`);
    }

    private redeem(code: string): void {
        if (this.starting || !this.view) return;
        const result = this.unlocks.redeem(code);
        if (result.status === "empty" || result.status === "invalid") {
            this.view.message(result.status === "empty" ? "Introduce un código de acceso." : "Código incorrecto. Revisa el código e inténtalo de nuevo.", true);
        } else {
            if (!this.selected) this.selected = result.character;
            this.view.clearCode();
            this.view.message(result.status === "already"
                ? `${characters[result.character].name} ya estaba desbloqueado.`
                : `${characters[result.character].name} desbloqueado. Ya puedes seleccionarlo.`);
        }
        this.view.render(this.unlocks, this.selected);
    }

    private startGame(): void {
        if (this.starting || !this.selected || !this.unlocks.isUnlocked(this.selected)) return;
        this.starting = true;
        this.scene.start("IntroScene", { character: this.selected });
    }
}

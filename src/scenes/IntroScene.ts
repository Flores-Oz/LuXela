import Phaser from "phaser";
import type { PlayerCharacter } from "../config/characters";
import { DialogueManager } from "../dialogue/DialogueManager";
import { introDialogue } from "../dialogue/introDialogue";
import { getCharacterUnlocks } from "../systems/CharacterUnlockService";
import { IntroView } from "../ui/IntroView";
import { mountSceneView } from "../ui/mountSceneView";

export class IntroScene extends Phaser.Scene {
    private character: PlayerCharacter | null = null;
    private dialogue: DialogueManager | null = null;
    private view: IntroView | null = null;
    private leaving = false;

    constructor() { super("IntroScene"); }

    init(data: { character?: PlayerCharacter } = {}): void {
        this.character = data.character === "alex" || data.character === "lua" ? data.character : null;
        this.leaving = false;
    }

    create(): void {
        if (!this.character || !getCharacterUnlocks(this.game).isUnlocked(this.character)) {
            this.scene.start("CharacterSelectScene");
            return;
        }
        const sequence = introDialogue[this.character];
        this.dialogue = new DialogueManager(sequence.entries);
        this.view = new IntroView(this.character, sequence.provisional, {
            advance: () => this.advance(), skip: () => this.skip()
        });
        this.cameras.main.setBackgroundColor("#0b1014");
        mountSceneView(this, this.view.element);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.view?.destroy();
            this.view = null;
            this.dialogue = null;
        });
        if (this.dialogue.isComplete) this.finish();
        else {
            this.view.render(this.dialogue);
            this.view.focus();
        }
    }

    private advance(): void {
        if (this.leaving || !this.dialogue) return;
        this.dialogue.advance();
        if (this.dialogue.isComplete) this.finish();
        else this.view?.render(this.dialogue);
    }

    private skip(): void {
        if (this.leaving || !this.dialogue) return;
        this.dialogue.skip();
        this.finish();
    }

    private finish(): void {
        if (this.leaving) return;
        this.leaving = true;
        if (!this.character || !getCharacterUnlocks(this.game).isUnlocked(this.character)) {
            this.scene.start("CharacterSelectScene");
            return;
        }
        this.scene.start("GameScene", { roomIndex: 0, character: this.character });
    }
}

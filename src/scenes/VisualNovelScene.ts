import Phaser from "phaser";
import { isNarrativeRoute, type NarrativeRequest, type NarrativeSequence, type NarrativeEntry } from "../narrative/NarrativeTypes";
import { NarrativeRouteManager } from "../narrative/NarrativeRouteManager";
import { getNarrativeSaves, type NarrativeSaveService } from "../narrative/NarrativeSaveService";
import { NarrativeSequenceRunner } from "../narrative/NarrativeSequenceRunner";
import { CharacterPortraitManager } from "../narrative/CharacterPortraitManager";
import { BackgroundManager } from "../narrative/BackgroundManager";
import { NarrativeAudioManager, loadNarrativeAudio } from "../narrative/NarrativeAudioManager";
import { getCharacterUnlocks } from "../systems/CharacterUnlockService";
import { VisualNovelView } from "../ui/VisualNovelView";
import { mountSceneView } from "../ui/mountSceneView";

export class VisualNovelScene extends Phaser.Scene {
    private request: Partial<NarrativeRequest> = {};
    private sequence: NarrativeSequence | null = null;
    private runner: NarrativeSequenceRunner | null = null;
    private saves!: NarrativeSaveService;
    private view: VisualNovelView | null = null;
    private background: BackgroundManager | null = null;
    private portraits: CharacterPortraitManager | null = null;
    private audio: NarrativeAudioManager | null = null;
    private leaving = false;
    constructor() { super("VisualNovelScene"); }
    init(data: unknown = {}): void {
        this.request = data !== null && typeof data === "object" && !Array.isArray(data) ? data as Partial<NarrativeRequest> : {};
        this.leaving = false; this.sequence = null;
    }
    preload(): void { loadNarrativeAudio(this); }
    create(): void {
        const route = this.request.route;
        if (!isNarrativeRoute(route) || !getCharacterUnlocks(this.game).isUnlocked(route)) { this.reject("Selecciona un personaje desbloqueado para acceder a su ruta."); return; }
        if ((this.request.sequenceId !== undefined && typeof this.request.sequenceId !== "string") ||
            (this.request.resume !== undefined && typeof this.request.resume !== "boolean") ||
            (this.request.returnTo !== undefined && ![0, 1].includes(this.request.returnTo?.roomIndex))) {
            this.reject("Solicitud narrativa inválida."); return;
        }
        const routes = new NarrativeRouteManager();
        this.saves = getNarrativeSaves(this.game);
        const saved = this.saves.get(route);
        const resume = this.request.resume !== false && saved?.status === "reading";
        const id = this.request.sequenceId ?? (resume ? saved.sequenceId : undefined);
        const sequence = routes.resolve(route, id);
        if (!sequence) { this.reject("La secuencia solicitada no existe en esta ruta."); return; }
        this.sequence = sequence;
        this.view = new VisualNovelView(route, sequence.provisional, { advance: () => this.advance(), skip: () => this.skip(), back: () => this.back() });
        mountSceneView(this, this.view.element);
        this.cameras.main.setBackgroundColor("#0b1014");
        const report = (message: string) => this.view?.notice(message);
        this.background = new BackgroundManager(this.view.element.querySelector(".vn-background")!, report);
        this.portraits = new CharacterPortraitManager(this.view.element.querySelector(".vn-portraits")!, report);
        this.audio = new NarrativeAudioManager(this, report);
        this.runner = new NarrativeSequenceRunner(sequence, {
            effect: (entry, restoring) => this.effect(entry, restoring),
            dialogue: (entry, index) => {
                this.portraits?.highlight(entry.speakerId ?? entry.speaker);
                this.saves.save(route, { chapterId: sequence.chapterId, sequenceId: sequence.id, entryIndex: index, status: "reading" });
                this.view?.storageStatus(this.saves.storageStatus);
            },
            complete: () => this.finish("completed")
        });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.runner?.destroy(); this.runner = null;
            this.background?.destroy(); this.background = null;
            this.portraits?.destroy(); this.portraits = null;
            this.audio?.destroy(); this.audio = null;
            this.view?.destroy(); this.view = null;
        });
        const index = resume && saved.sequenceId === sequence.id && routes.validProgress(route, saved) ? saved.entryIndex : 0;
        const initialStatus = this.saves.storageStatus;
        this.runner.start(index);
        this.view.storageStatus(initialStatus === "corrupt" ? initialStatus : this.saves.storageStatus);
        this.view.render(this.runner);
        this.view.focus();
    }
    update(_time: number, delta: number): void {
        if (this.leaving || !this.runner) return;
        this.runner.update(delta);
        this.view?.render(this.runner);
    }
    private effect(entry: Exclude<NarrativeEntry, { type: "dialogue" }>, restoring: boolean): void {
        const handlers = {
            background: () => { if (entry.type === "background") this.background?.show(entry.key, !restoring && entry.transition === "fade"); },
            portrait: () => { if (entry.type === "portrait") this.portraits?.show(entry.character, entry.expression, entry.position, !restoring); },
            hidePortrait: () => { if (entry.type === "hidePortrait") this.portraits?.hide(entry.character, !restoring); },
            music: () => { if (entry.type === "music") { if (entry.action === "play") this.audio?.playMusic(entry.key, entry.volume); else this.audio?.stopMusic(entry.key); } },
            sound: () => { if (entry.type === "sound" && !restoring) this.audio?.playSound(entry.key, entry.volume); }
        };
        handlers[entry.type]();
    }
    private advance(): void { if (!this.leaving && this.runner) { this.runner.advance(); this.view?.render(this.runner); } }
    private skip(): void { this.finish("skipped"); }
    private back(): void { if (!this.leaving) { this.leaving = true; this.runner?.destroy(); this.scene.start("CharacterSelectScene"); } }
    private finish(status: "completed" | "skipped"): void {
        if (this.leaving || !this.sequence || !isNarrativeRoute(this.request.route)) return;
        this.leaving = true;
        this.runner?.destroy();
        if (!getCharacterUnlocks(this.game).isUnlocked(this.request.route)) { this.reject("Este personaje está bloqueado."); return; }
        this.saves.save(this.request.route, { chapterId: this.sequence.chapterId, sequenceId: this.sequence.id, entryIndex: this.sequence.entries.length, status });
        this.scene.start("GameScene", { character: this.request.route, roomIndex: this.request.returnTo?.roomIndex ?? 0 });
    }
    private reject(notice: string): void { this.scene.start("CharacterSelectScene", { notice }); }
}

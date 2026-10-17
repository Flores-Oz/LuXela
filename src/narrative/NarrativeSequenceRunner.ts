import { DialogueManager } from "../dialogue/DialogueManager";
import { NarrativeConfig } from "../config/NarrativeConfig";
import type { NarrativeEntry, NarrativeSequence } from "./NarrativeTypes";

type Effect = Exclude<NarrativeEntry, { type: "dialogue" }>;
export interface NarrativeHandlers {
    effect: (entry: Effect, restoring: boolean) => void;
    dialogue: (entry: Extract<NarrativeEntry, { type: "dialogue" }>, index: number) => void;
    complete: () => void;
}
/** Synchronous interpreter: effects run in order, each dialogue is a checkpoint. */
export class NarrativeSequenceRunner {
    private index = 0;
    private stopped = false;
    private line: DialogueManager | null = null;
    readonly sequence: NarrativeSequence;
    private readonly handlers: NarrativeHandlers;
    private readonly speed: number;
    constructor(sequence: NarrativeSequence, handlers: NarrativeHandlers, speed: number = NarrativeConfig.charactersPerSecond) {
        this.sequence = sequence; this.handlers = handlers; this.speed = speed;
    }
    get position(): number { return this.index; }
    get dialogue(): DialogueManager | null { return this.line; }
    get isComplete(): boolean { return this.index >= this.sequence.entries.length; }
    get dialogueNumber(): number { return this.sequence.entries.slice(0, this.index + 1).filter(entry => entry.type === "dialogue").length; }
    get dialogueTotal(): number { return this.sequence.entries.filter(entry => entry.type === "dialogue").length; }
    start(index = 0): void {
        if (!Number.isInteger(index) || index < 0 || index >= this.sequence.entries.length) index = 0;
        this.index = index;
        this.stopped = false;
        // Restore only final persistent presentation; never replay old sound cues.
        let background: Effect | null = null;
        let music: Effect | null = null;
        const portraits = new Map<string, Effect>();
        for (const entry of this.sequence.entries.slice(0, index)) {
            if (entry.type === "background") background = entry;
            if (entry.type === "music") {
                if (entry.action === "play") music = entry;
                else if (music?.type === "music" && music.key === entry.key) music = null;
            }
            if (entry.type === "portrait") portraits.set(entry.character, entry);
            if (entry.type === "hidePortrait") portraits.delete(entry.character);
        }
        if (background) this.handlers.effect(background, true);
        for (const portrait of portraits.values()) this.handlers.effect(portrait, true);
        if (music) this.handlers.effect(music, true);
        this.pump();
    }
    update(delta: number): void { if (!this.stopped) this.line?.update(delta); }
    advance(): void {
        if (this.stopped || this.isComplete) return;
        if (this.line?.isTyping) { this.line.completeLine(); return; }
        this.index++;
        this.pump();
    }
    private pump(): void {
        this.line = null;
        while (!this.stopped && this.index < this.sequence.entries.length) {
            const entry = this.sequence.entries[this.index]!;
            if (entry.type === "dialogue") {
                this.line = new DialogueManager([entry], this.speed);
                this.handlers.dialogue(entry, this.index);
                return;
            }
            this.handlers.effect(entry, false);
            this.index++;
        }
        if (!this.stopped) { this.stopped = true; this.handlers.complete(); }
    }
    destroy(): void { this.stopped = true; this.line = null; }
}

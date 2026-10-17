export interface DialogueEntry {
    readonly speaker: string;
    readonly text: string;
    readonly portraitKey?: string;
}

/** Reusable dialogue cursor and typewriter, independent of Phaser and rendering. */
export class DialogueManager {
    private readonly entries: readonly DialogueEntry[];
    private index = 0;
    private elapsed = 0;
    private revealed = 0;
    private readonly speed: number;

    constructor(entries: readonly DialogueEntry[], charactersPerSecond = 40) {
        this.entries = entries.map(entry => ({ ...entry }));
        this.speed = Number.isFinite(charactersPerSecond) && charactersPerSecond > 0 ? charactersPerSecond : 40;
    }

    get current(): DialogueEntry | null { return this.entries[this.index] ?? null; }
    get position(): number { return this.index; }
    get total(): number { return this.entries.length; }
    get isComplete(): boolean { return this.index >= this.total; }
    get isTyping(): boolean { return this.revealed < Array.from(this.current?.text ?? "").length; }
    get visibleText(): string { return Array.from(this.current?.text ?? "").slice(0, this.revealed).join(""); }

    update(deltaMs: number): void {
        if (!Number.isFinite(deltaMs) || deltaMs <= 0 || !this.isTyping) return;
        this.elapsed += deltaMs;
        this.revealed = Math.min(Array.from(this.current?.text ?? "").length, Math.floor(this.elapsed * this.speed / 1000));
    }

    completeLine(): void { this.revealed = Array.from(this.current?.text ?? "").length; }

    advance(): boolean {
        if (this.isComplete) return false;
        if (this.isTyping) { this.completeLine(); return false; }
        this.index++;
        this.elapsed = 0;
        this.revealed = 0;
        return true;
    }

    skip(): boolean {
        if (this.isComplete) return false;
        this.index = this.total;
        return true;
    }
}

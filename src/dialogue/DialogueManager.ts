export interface DialogueEntry {
    readonly speaker: string;
    readonly text: string;
    readonly portraitKey?: string;
}

export interface DialogueSequence {
    readonly id: string;
    readonly provisional: boolean;
    readonly entries: readonly DialogueEntry[];
}

/** Reusable dialogue cursor, independent of Phaser, rendering and input. */
export class DialogueManager {
    private readonly entries: readonly DialogueEntry[];
    private index = 0;

    constructor(entries: readonly DialogueEntry[]) {
        this.entries = entries.map(entry => ({ ...entry }));
    }

    get current(): DialogueEntry | null { return this.entries[this.index] ?? null; }
    get position(): number { return this.index; }
    get total(): number { return this.entries.length; }
    get isComplete(): boolean { return this.index >= this.total; }

    advance(): boolean {
        if (this.isComplete) return false;
        this.index++;
        return true;
    }

    skip(): boolean {
        if (this.isComplete) return false;
        this.index = this.total;
        return true;
    }
}

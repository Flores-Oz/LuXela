import { alexTest } from "./routes/alex/testSequence";
import { luaTest } from "./routes/lua/testSequence";
import { alexEnding } from "./routes/alex/ending";
import { luaEnding } from "./routes/lua/ending";
import {quimeraIntros} from './routes/quimeraIntro';
import { isNarrativeSequence, type NarrativeRouteId, type NarrativeSequence, type NarrativeProgress } from "./NarrativeTypes";

export class NarrativeRouteManager {
    private readonly sequences = new Map<string, NarrativeSequence>();
    readonly issues: string[] = [];
    constructor(sequences: readonly unknown[] = [alexTest, luaTest, alexEnding, luaEnding,...quimeraIntros]) {
        for (const sequence of sequences) {
            if (!isNarrativeSequence(sequence)) { this.issues.push("Guion narrativo inválido."); continue; }
            const key = `${sequence.route}:${sequence.id}`;
            if (this.sequences.has(key)) { this.issues.push(`Secuencia duplicada: ${sequence.id}`); continue; }
            this.sequences.set(key, sequence);
        }
    }
    resolve(route: NarrativeRouteId, id?: string): NarrativeSequence | null {
        return id !== undefined ? this.sequences.get(`${route}:${id}`) ?? null :
            [...this.sequences.values()].find(sequence => sequence.route === route) ?? null;
    }
    validProgress(route: NarrativeRouteId, value: unknown): value is NarrativeProgress {
        if (!value || typeof value !== "object") return false;
        const progress = value as NarrativeProgress;
        if (typeof progress.sequenceId !== "string" || !Number.isInteger(progress.entryIndex)) return false;
        const sequence = this.resolve(route, progress.sequenceId);
        if (!sequence || sequence.chapterId !== progress.chapterId) return false;
        if (progress.status === "reading") return progress.entryIndex >= 0 && sequence.entries[progress.entryIndex]?.type === "dialogue";
        return (progress.status === "completed" || progress.status === "skipped") && progress.entryIndex === sequence.entries.length;
    }
}

import type { PlayerCharacter } from "../config/characters";

export type NarrativeRouteId = PlayerCharacter;
export type CharacterExpression = "neutral" | "happy" | "sad" | "angry" | "surprised";
export type PortraitPosition = "left" | "center" | "right";
export type NarrativeEntry =
    | { type: "background"; key: string; transition?: "none" | "fade" }
    | { type: "portrait"; character: string; expression: string; position: PortraitPosition }
    | { type: "hidePortrait"; character: string }
    | { type: "dialogue"; speaker: string; text: string; speakerId?: string }
    | { type: "music"; key: string; action: "play" | "stop"; volume?: number }
    | { type: "sound"; key: string; volume?: number };
export interface NarrativeSequence {
    readonly id: string;
    readonly route: NarrativeRouteId;
    readonly chapterId: string;
    readonly provisional: boolean;
    readonly entries: readonly NarrativeEntry[];
}
export interface NarrativeRequest {
    route: NarrativeRouteId;
    sequenceId?: string;
    resume?: boolean;
    returnTo?: { roomIndex: number };
}
export interface NarrativeProgress {
    chapterId: string;
    sequenceId: string;
    entryIndex: number;
    status: "reading" | "completed" | "skipped";
}
export function isNarrativeRoute(value: unknown): value is NarrativeRouteId {
    return value === "alex" || value === "lua";
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const volume = (value: unknown) => value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1);
export function isNarrativeEntry(value: unknown): value is NarrativeEntry {
    if (!record(value)) return false;
    switch (value.type) {
        case "background": return text(value.key) && (value.transition === undefined || value.transition === "none" || value.transition === "fade");
        case "portrait": return text(value.character) && text(value.expression) && ["left", "center", "right"].includes(String(value.position));
        case "hidePortrait": return text(value.character);
        case "dialogue": return text(value.speaker) && text(value.text) && (value.speakerId === undefined || text(value.speakerId));
        case "music": return text(value.key) && (value.action === "play" || value.action === "stop") && volume(value.volume);
        case "sound": return text(value.key) && volume(value.volume);
        default: return false;
    }
}
export function isNarrativeSequence(value: unknown): value is NarrativeSequence {
    return record(value) && text(value.id) && isNarrativeRoute(value.route) && text(value.chapterId) &&
        typeof value.provisional === "boolean" && Array.isArray(value.entries) && value.entries.length > 0 &&
        value.entries.every(isNarrativeEntry) && value.entries.some(entry => entry.type === "dialogue");
}

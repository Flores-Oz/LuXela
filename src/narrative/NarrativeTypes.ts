import type { PlayerCharacter } from "../config/characters";

export type NarrativeRouteId = PlayerCharacter;
export type CharacterExpression = "neutral" | "happy" | "shy" | "surprised" | "angry" | "serious" | "sad" | "determined" | "crying" | "confident";
export type PortraitPosition = "left" | "center" | "right";
/** Positions are percentages of the visible stage; y is the actor's foot line. */
export interface StoryPosition { x: number; y: number; width?: number }
export type NarrativeEntry =
    | { type: "background"; key: string; transition?: "none" | "fade" }
    | { type: "portrait"; character: string; expression: string; position: PortraitPosition }
    | { type: "hidePortrait"; character: string }
    | ({ type: "actor"; id: string; animation: string; moveTo?: { x: number; y: number; durationMs: number } } & StoryPosition)
    | { type: "hideActor"; id: string }
    | ({ type: "prop"; id: string; key: string } & StoryPosition)
    | { type: "hideProp"; id: string }
    | { type: "cue"; effect: "shake" | "flash"; durationMs?: number }
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
    returnTo?: { roomIndex: number; runId?: number };
    destination?: { kind: "game"; roomIndex: number; runId?: number } | { kind: "completion"; runId: number };
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
const percent = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
const duration = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 10000;
const position = (value: Record<string, unknown>) => percent(value.x) && percent(value.y) &&
    (value.width === undefined || (typeof value.width === "number" && value.width > 0 && value.width <= 100));
export function isNarrativeEntry(value: unknown): value is NarrativeEntry {
    if (!record(value)) return false;
    switch (value.type) {
        case "background": return text(value.key) && (value.transition === undefined || value.transition === "none" || value.transition === "fade");
        case "portrait": return text(value.character) && text(value.expression) && ["left", "center", "right"].includes(String(value.position));
        case "hidePortrait": return text(value.character);
        case "actor": return text(value.id) && text(value.animation) && position(value) && (value.moveTo === undefined ||
            (record(value.moveTo) && percent(value.moveTo.x) && percent(value.moveTo.y) && duration(value.moveTo.durationMs)));
        case "hideActor": return text(value.id);
        case "prop": return text(value.id) && text(value.key) && position(value);
        case "hideProp": return text(value.id);
        case "cue": return ["shake", "flash"].includes(String(value.effect)) && (value.durationMs === undefined || duration(value.durationMs));
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

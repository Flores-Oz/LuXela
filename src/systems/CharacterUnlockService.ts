import type Phaser from "phaser";
import type { PlayerCharacter } from "../config/characters";
import { CHARACTER_CODES, CHARACTER_UNLOCK_STORAGE_KEY } from "../config/CharacterUnlockConfig";

export type CharacterUnlockState = Record<PlayerCharacter, boolean>;
type ProgressStorage = Pick<Storage, "getItem" | "setItem">;
type StorageStatus = "available" | "corrupt" | "unavailable";
export type UnlockResult =
    | { status: "empty" }
    | { status: "invalid" }
    | { status: "unlocked"; character: PlayerCharacter }
    | { status: "already"; character: PlayerCharacter };

/** One instance per game, shared through the Phaser registry, including memory fallback. */
export class CharacterUnlockService {
    private state: CharacterUnlockState = { alex: false, lua: false };
    private status: StorageStatus = "available";
    private readonly storage: () => ProgressStorage;

    constructor(storage: () => ProgressStorage = () => window.localStorage) {
        this.storage = storage;
        try {
            const saved = storage().getItem(CHARACTER_UNLOCK_STORAGE_KEY);
            if (saved === null) return;
            const parsed: unknown = JSON.parse(saved);
            if (typeof parsed !== "object" || parsed === null ||
                !("alex" in parsed) || !("lua" in parsed) ||
                typeof parsed.alex !== "boolean" || typeof parsed.lua !== "boolean") {
                this.status = "corrupt";
                return;
            }
            this.state = { alex: parsed.alex, lua: parsed.lua };
        } catch (error) {
            this.status = error instanceof SyntaxError ? "corrupt" : "unavailable";
        }
    }

    get unlocks(): CharacterUnlockState { return { ...this.state }; }
    get storageStatus(): StorageStatus { return this.status; }

    isUnlocked(character: unknown): boolean {
        return (character === "alex" || character === "lua") && this.state[character];
    }

    redeem(input: string): UnlockResult {
        const code = input.trim().toUpperCase();
        if (!code) return { status: "empty" };
        const character = (["alex", "lua"] as const).find(id => CHARACTER_CODES[id] === code);
        if (!character) return { status: "invalid" };
        const already = this.state[character];
        this.state[character] = true;
        // Retrying an already redeemed code also retries a previously failed save.
        try {
            this.storage().setItem(CHARACTER_UNLOCK_STORAGE_KEY, JSON.stringify(this.state));
            this.status = "available";
        } catch {
            this.status = "unavailable";
        }
        return { status: already ? "already" : "unlocked", character };
    }
}

const REGISTRY_KEY = "character-unlock-service";

export function getCharacterUnlocks(game: Phaser.Game): CharacterUnlockService {
    let service = game.registry.get(REGISTRY_KEY) as CharacterUnlockService | undefined;
    if (!service) {
        service = new CharacterUnlockService();
        game.registry.set(REGISTRY_KEY, service);
    }
    return service;
}

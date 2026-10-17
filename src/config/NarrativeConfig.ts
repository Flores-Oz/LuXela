import { characters } from "./characters";

export interface BackgroundAsset { src: string; crop?: { x: number; y: number; width: number; height: number } }
export interface PortraitAsset { name: string; expressions: Record<string, string> }
export interface AudioAsset { urls: string[] }

export const NarrativeConfig = {
    charactersPerSecond: 40,
    transitionMs: 200,
    musicVolume: 0.35,
    soundVolume: 0.5,
    storageKey: "berzerk_narrative_progress_v1"
} as const;

// Original 1536x1024 sheets have a 3x2 layout. Use one 512x512 region, not the mosaic.
export const narrativeBackgrounds: Record<string, BackgroundAsset> = {
    "alex-test": { src: "assets/sprites/player/alex-special-background.png", crop: { x: 0, y: 0, width: 512, height: 512 } },
    "lua-test": { src: "assets/sprites/player/lua-special-background.png", crop: { x: 0, y: 0, width: 512, height: 512 } }
};
export const narrativePortraits: Record<string, PortraitAsset> = {
    alex: { name: "Alex", expressions: { neutral: characters.alex.selectorPath } },
    lua: { name: "Lua", expressions: { neutral: characters.lua.selectorPath } }
};
// No narrative audio files supplied yet. Add keys here; missing cues are non-fatal.
export const narrativeAudio: Record<string, AudioAsset> = {};

export interface BackgroundAsset { src: string; crop?: { x: number; y: number; width: number; height: number } }
export interface PortraitFrame {
    src: string;
    crop: { x: number; y: number; width: number; height: number };
    anchorX: number;
    groundY: number;
    omit?: readonly { x: number; y: number; width: number; height: number }[];
}
export type PortraitSource = string | PortraitFrame;
export interface PortraitAsset { name: string; expressions: Record<string, PortraitSource> }
export interface AudioAsset { urls: string[] }

export const portraitLayout = { width: 400, height: 600, centerX: 200, groundY: 580 } as const;
export const portraitExpressionOrder = ["neutral", "happy", "shy", "surprised", "angry", "serious", "sad", "determined", "crying", "confident"] as const;
type PortraitCrop = readonly [x: number, y: number, width: number, height: number, anchorX: number, groundY: number, omit?: PortraitFrame["omit"]];
function expressionFrames(src: string, crops: readonly PortraitCrop[]): Record<string, PortraitSource> {
    return Object.fromEntries(crops.map(([x, y, width, height, anchorX, groundY, omit], index) => [portraitExpressionOrder[index]!,
        { src, crop: { x, y, width, height }, anchorX, groundY, omit }]));
}

export const NarrativeConfig = {
    charactersPerSecond: 40,
    transitionMs: 200,
    musicVolume: 0.35,
    soundVolume: 0.5,
    storageKey: "berzerk_narrative_progress_v1"
} as const;

// Dedicated illustrations use the whole source; cover preserves proportions on each viewport.
export const narrativeBackgrounds: Record<string, BackgroundAsset> = {
    "main-menu": { src: "assets/backgrounds/main-menu-background.png" },
    "alex-intro": { src: "assets/backgrounds/alex-intro-background.png" },
    "lua-intro": { src: "assets/backgrounds/lua-intro-background.png" },
    "alex-ending": { src: "assets/backgrounds/alex-ending-background.png" },
    "lua-ending": { src: "assets/backgrounds/lua-ending-background.png" },
    // Retain original effect-sheet regions for existing scripts and crop regression checks.
    "alex-test": { src: "assets/sprites/player/alex-special-background.png", crop: { x: 0, y: 0, width: 512, height: 512 } },
    "lua-test": { src: "assets/sprites/player/lua-special-background.png", crop: { x: 0, y: 0, width: 512, height: 512 } }
};
export const narrativePortraits: Record<string, PortraitAsset> = {
    // Original 1402x1122 sheets are irregularly spaced. Coordinates only; PNGs stay intact.
    alex: { name: "Alex", expressions: expressionFrames("assets/portraits/alex-expressions.png", [
        [62, 8, 230, 553, 175, 559], [341, 17, 220, 544, 450, 560],
        [628, 25, 182, 536, 715, 560], [879, 19, 244, 542, 1000, 560],
        [1170, 19, 194, 542, 1260, 559], [68, 562, 226, 543, 175, 1098],
        [357, 565, 184, 540, 450, 1098], [601, 562, 252, 543, 715, 1098],
        [906, 568, 196, 537, 1000, 1098], [1174, 561, 207, 550, 1275, 1103]
    ]) },
    lua: { name: "Lua", expressions: expressionFrames("assets/portraits/lua-expressions.png", [
        [0, 0, 308, 561, 160, 560], [308, 0, 268, 561, 445, 560],
        [576, 0, 270, 561, 710, 560], [846, 0, 267, 561, 985, 560],
        [1113, 0, 289, 561, 1260, 560], [12, 568, 288, 554, 160, 1115],
        [300, 568, 258, 554, 440, 1115], [558, 568, 288, 554, 710, 1113],
        [846, 572, 271, 550, 985, 1112],
        // Detached boot fragments from the row above overlap this frame's top margin.
        [1117, 561, 285, 561, 1260, 1113, [
            { x: 1178, y: 561, width: 30, height: 4 }, { x: 1316, y: 561, width: 18, height: 1 }
        ]]
    ]) }
};
// No narrative audio files supplied yet. Add keys here; missing cues are non-fatal.
export const narrativeAudio: Record<string, AudioAsset> = {};

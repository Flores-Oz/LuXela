export const roomThemeIds = ["industrial", "laboratory", "control"] as const;
export type RoomTheme = typeof roomThemeIds[number];
export type DecorationKind = "grate" | "panel" | "warning" | "circuit";
export interface DecorationConfig { readonly row: number; readonly column: number; readonly kind: DecorationKind }
export interface EnvironmentTheme {
    readonly textureKey: string;
    readonly source?: string;
    readonly provisional: boolean;
    readonly atlas?: EnvironmentAtlas;
    readonly floorAlpha?: number;
    readonly palette: { floor: string; floorLight: string; seam: string; wall: string; edge: string; inset: string; accent: string; warning: string };
}
export interface EnvironmentAtlas {
    readonly tileSize: number; readonly columns: number; readonly rows: number;
    readonly floors: readonly number[]; readonly walls: readonly number[]; readonly wallVariants: readonly number[];
    readonly decoration: Readonly<Record<DecorationKind, number>>;
    readonly door: Readonly<Record<"locked" | "unlocked" | "transitioning", number>>;
    readonly screenDecorations: readonly DecorationKind[];
    readonly edgeWalls?: Readonly<Record<"north" | "east" | "south" | "west", number>>;
    readonly wallDetails?: readonly number[];
    readonly floorAlpha?: number;
}
/** Supplied 4x4 sheets: no pixel changes or atlas repacking are needed. */
export const preparedEnvironmentAtlas: EnvironmentAtlas = {
    tileSize: 64, columns: 4, rows: 4, floors: [0, 1],
    walls: [10, 5, 4, 8, 5, 5, 6, 10, 4, 9, 4, 10, 7, 10, 10, 10],
    wallVariants: [11, 5, 4, 8, 5, 5, 6, 10, 4, 9, 4, 10, 7, 10, 10, 11],
    decoration: { grate: 3, panel: 12, warning: 13, circuit: 14 },
    door: { locked: 15, unlocked: 15, transitioning: 15 },
    screenDecorations: ["panel", "warning", "circuit"]
};
export const environmentThemes: Readonly<Record<RoomTheme, EnvironmentTheme>> = {
    industrial: { textureKey: "environment-industrial", source: "assets/environment/industrial/tileset.png", atlas: preparedEnvironmentAtlas, provisional: false, floorAlpha: .78,
        palette: { floor: "#242b32", floorLight: "#303a43", seam: "#1b2229", wall: "#59646d", edge: "#849099", inset: "#3d4851", accent: "#738b88", warning: "#a08c57" } },
    laboratory: { textureKey: "environment-laboratory", source: "assets/environment/laboratory/tileset.png", atlas: preparedEnvironmentAtlas, provisional: false, floorAlpha: .8,
        palette: { floor: "#354749", floorLight: "#405456", seam: "#293b3d", wall: "#70888b", edge: "#a1b5b4", inset: "#4c6569", accent: "#679e98", warning: "#9aab87" } },
    control: { textureKey: "environment-control", source: "assets/environment/control/tileset.png", atlas: preparedEnvironmentAtlas, provisional: false, floorAlpha: .78,
        palette: { floor: "#1d2935", floorLight: "#293846", seam: "#15222c", wall: "#4c6070", edge: "#7c93a4", inset: "#344957", accent: "#507e97", warning: "#8a976a" } }
};
/** Environment layers stay below unchanged entities (0), effects (9/10) and HUD (100). */
export const environmentDepth = { floor: -40, decoration: -32, decorationOverlay: -30, wall: -20, door: -10 } as const;
export const environmentAtlas = { tileSize: 32, columns: 8, rows: 6, floorCount: 4, wallStart: 4, wallVariantStart: 20,
    decoration: { grate: 36, panel: 37, warning: 38, circuit: 39 }, door: { locked: 40, unlocked: 41, transitioning: 42 } } as const;
export const placeholderAtlas: EnvironmentAtlas = {
    ...environmentAtlas, floors: [0, 1, 2, 3], walls: Array.from({length:16}, (_, index)=>4+index),
    wallVariants: Array.from({length:16}, (_, index)=>20+index), screenDecorations: []
};

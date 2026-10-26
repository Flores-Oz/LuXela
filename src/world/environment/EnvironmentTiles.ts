import Phaser from "phaser";
import { environmentAtlas as atlas, environmentThemes, placeholderAtlas, roomThemeIds, type EnvironmentAtlas, type RoomTheme } from "./RoomTheme";
import { environmentStyleIds, sheetTextureKey, type EnvironmentStyle } from "./EnvironmentSheets";
import { resolveSheetTiles } from "./EnvironmentSheetTiles";

/** Final atlases can be supplied by source. Missing art falls back to these simple original tiles. */
export function loadEnvironmentAssets(scene: Phaser.Scene): void {
    for (const theme of roomThemeIds) {
        const config = environmentThemes[theme];
        if (config.source && !scene.textures.exists(config.textureKey)) scene.load.image(config.textureKey, config.source);
    }
    for (const style of environmentStyleIds) if (!scene.textures.exists(sheetTextureKey(style))) scene.load.image(sheetTextureKey(style), `assets/environment/sources/${style}.png`);
}
export function ensureEnvironmentTiles(scene: Phaser.Scene, theme: RoomTheme): string {
    return resolveEnvironmentTiles(scene, theme).key;
}
export function resolveEnvironmentTiles(scene: Phaser.Scene, theme: RoomTheme, style?: EnvironmentStyle): { key: string; atlas: EnvironmentAtlas; provisional: boolean } {
    if (style) {
        const detailed = resolveSheetTiles(scene,theme,style);
        if (detailed) { registerDoorFrames(scene.textures.get(detailed.key),detailed.atlas); return detailed; }
    }
    const config = environmentThemes[theme];
    const expected = config.atlas ?? placeholderAtlas;
    let key = config.source ? `${config.textureKey}-fallback` : config.textureKey;
    if (scene.textures.exists(config.textureKey)) {
        const source = scene.textures.get(config.textureKey).source[0];
        if (source?.width === expected.columns * expected.tileSize && source.height === expected.rows * expected.tileSize) {
            registerDoorFrames(scene.textures.get(config.textureKey), expected);
            return { key: config.textureKey, atlas: expected, provisional: config.provisional };
        }
        key = `${config.textureKey}-fallback`;
    }
    if (scene.textures.exists(key)) { registerDoorFrames(scene.textures.get(key), placeholderAtlas); return { key, atlas: placeholderAtlas, provisional: true }; }
    const texture = scene.textures.createCanvas(key, atlas.columns * atlas.tileSize, atlas.rows * atlas.tileSize);
    if (!texture) throw new Error(`Cannot create environment texture: ${key}`);
    const ctx = texture.getContext(), p = config.palette, size = atlas.tileSize;
    ctx.imageSmoothingEnabled = false;
    const tile = (index: number, draw: () => void) => {
        ctx.save(); ctx.translate(index % atlas.columns * size, Math.floor(index / atlas.columns) * size); draw(); ctx.restore();
    };
    const rect = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
    for (let index = 0; index < 4; index++) tile(index, () => {
        rect(p.floor, 0, 0, 32, 32); rect(p.floorLight, 1, 1, 30, 1); rect(p.seam, 31, 0, 1, 32); rect(p.seam, 0, 31, 32, 1);
        if (index === 1) { rect(p.floorLight, 5, 8, 22, 1); rect(p.seam, 5, 9, 22, 1); }
        if (index === 2) { rect(p.floorLight, 3, 3, 2, 2); rect(p.seam, 27, 27, 2, 2); }
        if (index === 3) { rect(p.seam, 15, 2, 1, 28); rect(p.floorLight, 16, 2, 1, 28); }
    });
    for (let variant = 0; variant < 2; variant++) for (let mask = 0; mask < 16; mask++) tile(atlas.wallStart + variant * 16 + mask, () => {
        rect(p.wall, 0, 0, 32, 32); rect(p.inset, 4, 4, 24, 24); rect(p.wall, 5, 5, 22, 21);
        if (!(mask & 1)) { rect(p.edge, 0, 0, 32, 2); rect(p.inset, 0, 2, 32, 1); }
        if (!(mask & 2)) rect(p.inset, 29, 0, 3, 32);
        if (!(mask & 4)) rect(p.inset, 0, 29, 32, 3);
        if (!(mask & 8)) rect(p.edge, 0, 0, 2, 32);
        if (variant) { rect(p.inset, 8, 10, 16, 11); rect(p.accent, 10, 12, 12, 2); rect(p.edge, 10, 17, 4, 1); }
        else { rect(p.edge, 5, 5, 1, 1); rect(p.inset, 26, 26, 1, 1); }
    });
    tile(atlas.decoration.grate, () => {
        rect(p.seam, 6, 6, 20, 20); rect(p.floorLight, 7, 7, 18, 1);
        for (let y = 10; y < 25; y += 3) rect(p.floorLight, 8, y, 16, 1);
    });
    tile(atlas.decoration.panel, () => {
        rect(p.seam, 5, 9, 22, 15); rect(p.floorLight, 6, 10, 20, 12); rect(p.accent, 9, 12, 14, 3);
        rect(p.seam, 9, 18, 5, 1); rect(p.accent, 20, 18, 2, 2);
    });
    tile(atlas.decoration.warning, () => {
        for (let x = 5; x < 27; x += 6) { rect(p.warning, x, 12, 3, 2); rect(p.warning, x + 2, 14, 3, 2); rect(p.warning, x + 4, 16, 3, 2); }
    });
    tile(atlas.decoration.circuit, () => { rect(p.accent, 6, 9, 1, 14); rect(p.accent, 6, 22, 19, 1); rect(p.accent, 24, 18, 1, 5); rect(p.floorLight, 9, 9, 14, 1); });
    for (const [state, index] of Object.entries(atlas.door)) tile(index, () => {
        const signal = state === "locked" ? "#8a7771" : state === "unlocked" ? "#8cd5aa" : "#d5bb78";
        rect(p.inset, 2, 2, 28, 28); rect(p.edge, 3, 3, 26, 1); rect(p.seam, 4, 5, 24, 23);
        rect(p.wall, 6, 6, 20, 20); rect(p.inset, 15, 6, 2, 20); rect(signal, 8, 8, 16, 2);
        if (state === "locked") { rect(signal, 11, 15, 10, 8); rect(p.inset, 13, 13, 6, 3); }
        else { rect(signal, 15, 14, 2, 10); rect(signal, 13, 16, 6, 2); }
    });
    texture.refresh(); registerDoorFrames(texture, placeholderAtlas);
    return { key, atlas: placeholderAtlas, provisional: true };
}

function registerDoorFrames(texture: Phaser.Textures.Texture, layout: EnvironmentAtlas): void {
    for (const [state, index] of Object.entries(layout.door)) {
        const name = `door-${state}`;
        if (!texture.has(name)) texture.add(name, 0, index % layout.columns * layout.tileSize, Math.floor(index / layout.columns) * layout.tileSize, layout.tileSize, layout.tileSize);
    }
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

import Phaser from "phaser";
import type { RoomRenderer } from "../RoomRenderer";
import type { RoomLayout, RoomCell, LayoutDoor, RoomPresentation } from "../RoomLayout";
import type { DoorView } from "../DoorController";
import { buildEnvironmentPlan, type EnvironmentPlan } from "./EnvironmentPlan";
import { resolveEnvironmentTiles } from "./EnvironmentTiles";
import { environmentDepth, environmentThemes } from "./RoomTheme";

let nextCacheId = 0;

/** Visual Tilemap layers, using the same RoomLayout that builds Arcade collision zones. */
export class ModularRoomRenderer implements RoomRenderer {
    private readonly scene: Phaser.Scene;
    private map: Phaser.Tilemaps.Tilemap | null = null;
    private layers: Phaser.Tilemaps.TilemapLayer[] = [];
    private doors: Phaser.GameObjects.Image[] = [];
    private signals: Phaser.GameObjects.Rectangle[] = [];
    private plan: EnvironmentPlan | null = null;
    private textureKey = "";
    private cachedLayers: { image: Phaser.GameObjects.Image; key: string }[] = [];

    constructor(scene: Phaser.Scene) { this.scene = scene; }
    begin(layout: RoomLayout, presentation?: RoomPresentation): void {
        if (this.map) throw new Error("Environment renderer already initialized");
        const resolved = resolveEnvironmentTiles(this.scene, presentation?.theme ?? "industrial", presentation?.environmentStyle);
        this.plan = buildEnvironmentPlan(layout, presentation, resolved.atlas);
        this.textureKey = resolved.key;
        const size = resolved.atlas.tileSize, scale = layout.tileSize / size;
        const map = this.scene.make.tilemap({ tileWidth: size, tileHeight: size, width: layout.width / layout.tileSize, height: layout.height / layout.tileSize });
        this.map = map;
        const tileset = map.addTilesetImage(this.textureKey, this.textureKey, size, size, 0, 0);
        if (!tileset) throw new Error("Unable to create environment tileset");
        const addLayer = (name: string, data: number[][], depth: number, screen = false) => {
            const layer = map.createBlankLayer(name, tileset, 0, 0);
            if (!layer) throw new Error(`Unable to create environment layer ${name}`);
            layer.putTilesAt(data, 0, 0).setScale(scale).setDepth(depth).setName(`environment-${name}`).setData("environment-layer", true);
            if (screen) layer.setBlendMode(Phaser.BlendModes.SCREEN);
            this.layers.push(layer);
            return layer;
        };
        addLayer(presentation?.layers?.floor ?? "floor", this.plan.floor, environmentDepth.floor).setAlpha(resolved.atlas.floorAlpha ?? environmentThemes[this.plan.theme].floorAlpha ?? 1);
        addLayer(presentation?.layers?.decoration ?? "decoration", this.plan.decoration, environmentDepth.decoration);
        addLayer(`${presentation?.layers?.decoration ?? "decoration"}-overlay`, this.plan.decorationOverlay, environmentDepth.decorationOverlay, true);
        addLayer(presentation?.layers?.walls ?? "walls", this.plan.walls, environmentDepth.wall);
        this.cacheCanvasLayers();
        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    }

    /** Canvas otherwise culls and draws every static tile on every frame. WebGL keeps its batched Tilemaps. */
    private cacheCanvasLayers(): void {
        if (this.scene.game.renderer.type !== Phaser.CANVAS || !this.map) return;
        // Bound allocations: larger rooms retain normal Tilemap culling instead of a huge surface.
        if (this.map.widthInPixels * this.map.heightInPixels > 1024 * 1024) return;
        const source = this.scene.textures.get(this.textureKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
        const size = this.map.tileWidth;
        const columns = Math.floor(source.width / size);
        for (const layer of this.layers) {
            const tiles = layer.layer.data.flat().filter(tile => tile.index >= 0);
            const left = tiles.length ? Math.min(...tiles.map(tile => tile.x)) : 0;
            const top = tiles.length ? Math.min(...tiles.map(tile => tile.y)) : 0;
            const right = tiles.length ? Math.max(...tiles.map(tile => tile.x)) : 0;
            const bottom = tiles.length ? Math.max(...tiles.map(tile => tile.y)) : 0;
            const key = `room-cache-${++nextCacheId}`;
            const texture = this.scene.textures.createCanvas(key, (right - left + 1) * size, (bottom - top + 1) * size);
            if (!texture) continue;
            const context = texture.getContext();
            context.imageSmoothingEnabled = false;
            for (const tile of tiles) context.drawImage(source, (tile.index % columns) * size, Math.floor(tile.index / columns) * size,
                size, size, (tile.x - left) * size, (tile.y - top) * size, size, size);
            texture.refresh().setFilter(Phaser.Textures.FilterMode.NEAREST);
            const image = this.scene.add.image(left * size * layer.scaleX, top * size * layer.scaleY, key).setOrigin(0)
                .setScale(layer.scaleX, layer.scaleY).setDepth(layer.depth).setAlpha(layer.alpha).setBlendMode(layer.blendMode)
                .setName(`${layer.name}-cache`);
            layer.setVisible(false).setData("environment-cache", image);
            this.cachedLayers.push({ image, key });
        }
    }
    // Data was placed in batches in begin; callbacks keep the existing builder contract.
    floor(_cell: RoomCell): void {}
    wall(_cell: RoomCell): void {}
    door(cell: LayoutDoor): DoorView {
        const image = this.scene.add.image(cell.x, cell.y, this.textureKey, "door-locked")
            .setDisplaySize(cell.size, cell.size).setDepth(environmentDepth.door).setName("door-visual");
        this.doors.push(image);
        const signal = this.scene.add.rectangle(cell.x, cell.y + cell.size * .36, cell.size * .25, Math.max(2, cell.size / 32), 0x8a7771)
            .setDepth(environmentDepth.door + 1).setName("door-status");
        this.signals.push(signal);
        return { setState: state => {
            if (image.scene) image.setFrame(`door-${state}`);
            if (signal.scene) signal.setFillStyle(state === "locked" ? 0x8a7771 : state === "unlocked" ? 0x8cd5aa : 0xd5bb78);
        } };
    }
    destroy(): void {
        this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
        for (const image of this.doors) if (image.scene) image.destroy();
        for (const signal of this.signals) if (signal.scene) signal.destroy();
        for (const { image, key } of this.cachedLayers) {
            if (image.scene) image.destroy();
            this.scene.textures.remove(key);
        }
        for (const layer of [...this.layers]) if (layer.scene) layer.destroy();
        this.map?.destroy();
        this.map = null; this.plan = null; this.layers = []; this.doors = []; this.signals = []; this.cachedLayers = [];
        // Cached shared theme atlases intentionally survive scene transitions.
    }
}

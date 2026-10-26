import type Phaser from "phaser";
import type { Room } from "./Room";
import { GameSettings } from "../config/GameSettings";
import { DoorController, type DoorEntry } from "./DoorController";
import type { ExitConfig } from "../levels/WaveConfig";
import { createRoomLayout, type RoomLayout, type RoomPresentation } from "./RoomLayout";
import type { RoomRenderer } from "./RoomRenderer";
import { ModularRoomRenderer } from "./environment/ModularRoomRenderer";

/** Builds collision zones and triggers independently from the replaceable visual renderer. */
export class RoomBuilder {
    private readonly scene: Phaser.Scene;
    private readonly walls: Phaser.Physics.Arcade.StaticGroup;
    private readonly exits: Phaser.Physics.Arcade.StaticGroup;
    private readonly renderer: RoomRenderer;
    private doors: DoorController | null = null;
    private layout: RoomLayout | null = null;

    constructor(scene: Phaser.Scene, renderer?: RoomRenderer) {
        this.scene = scene; this.renderer = renderer ?? new ModularRoomRenderer(scene);
        this.walls = scene.physics.add.staticGroup(); this.exits = scene.physics.add.staticGroup();
    }
    build(room: Room, exitConfigs: readonly ExitConfig[] = [], presentation?: RoomPresentation): void {
        if (this.layout) throw new Error("RoomBuilder already built this room");
        const layout = createRoomLayout(room, exitConfigs);
        this.layout = layout; this.renderer.begin(layout, presentation);
        for (const floor of layout.floors) this.renderer.floor(floor);
        for (const wall of layout.walls) {
            this.renderer.wall(wall);
            const zone = this.scene.add.zone(wall.x, wall.y, wall.size, wall.size).setVisible(false).setName("wall-collider");
            this.scene.physics.add.existing(zone, true); this.walls.add(zone);
        }
        const entries: DoorEntry[] = [];
        for (const door of layout.doors) {
            const zone = this.scene.add.zone(door.x, door.y, door.size * .65, door.size * .65)
                .setVisible(false).setName("door-trigger").setData("door-id", door.config.id);
            this.scene.physics.add.existing(zone, true); this.exits.add(zone);
            entries.push({ id: door.config.id, trigger: zone, view: this.renderer.door(door) });
        }
        this.doors = new DoorController(entries);
        if (GameSettings.physicsDebug) for (const spawn of layout.enemyMarkers) {
            this.scene.add.rectangle(spawn.x, spawn.y, spawn.size * .55, spawn.size * .55, 0xff3333);
        }
    }
    getWalls(): Phaser.Physics.Arcade.StaticGroup { return this.walls; }
    getExits(): Phaser.Physics.Arcade.StaticGroup { return this.exits; }
    getDoors(): DoorController {
        if (!this.doors) throw new Error("Build the room before accessing doors");
        return this.doors;
    }
    getLayout(): RoomLayout {
        if (!this.layout) throw new Error("Build the room before accessing its layout");
        return this.layout;
    }
}

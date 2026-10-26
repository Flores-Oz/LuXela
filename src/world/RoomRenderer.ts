import type Phaser from "phaser";
import type { RoomLayout, RoomCell, LayoutDoor, RoomPresentation } from "./RoomLayout";
import type { DoorView } from "./DoorController";

/** A future Tilemap renderer can replace geometry without rebuilding bodies or progression. */
export interface RoomRenderer {
    begin: (layout: RoomLayout, presentation?: RoomPresentation) => void;
    floor: (cell: RoomCell) => void;
    wall: (cell: RoomCell) => void;
    door: (cell: LayoutDoor) => DoorView;
}
export class GeometryRoomRenderer implements RoomRenderer {
    private readonly scene: Phaser.Scene;
    constructor(scene: Phaser.Scene) { this.scene = scene; }
    begin(_layout: RoomLayout, _presentation?: RoomPresentation): void {}
    floor(cell: RoomCell): void {
        this.scene.add.rectangle(cell.x, cell.y, cell.size, cell.size, 0x181818).setName("floor-visual");
    }
    wall(cell: RoomCell): void {
        this.scene.add.rectangle(cell.x, cell.y, cell.size, cell.size, 0x777777).setName("wall-visual");
    }
    door(cell: LayoutDoor): DoorView {
        const visual = this.scene.add.rectangle(cell.x, cell.y, cell.size * .65, cell.size * .65, 0x52615e).setName("door-visual");
        return { setState: state => {
            visual.setFillStyle(state === "unlocked" ? 0x33ff66 : state === "transitioning" ? 0xffda55 : 0x52615e);
            visual.setStrokeStyle(2, state === "locked" ? 0x88908e : 0xb4dfbd);
        } };
    }
}

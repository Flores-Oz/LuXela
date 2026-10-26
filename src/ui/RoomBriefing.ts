import Phaser from "phaser";
import { UITheme } from "../config/UITheme";

/** A short tactical introduction, driven by gameplay time so pause also pauses its fade. */
export class RoomBriefing {
    private readonly scene: Phaser.Scene;
    private readonly text: Phaser.GameObjects.Text;
    private elapsed = 0;

    constructor(scene: Phaser.Scene, title: string, hint: string) {
        this.scene = scene;
        this.text = scene.add.text(0, 0, `${title}\n${hint}`, {
            fontFamily: UITheme.font, fontSize: "14px", color: "#d4ecde", backgroundColor: UITheme.overlay,
            padding: { x: 12, y: 10 }, lineSpacing: 6
        }).setOrigin(0, 1).setScrollFactor(0).setDepth(99).setName("room-briefing");
        this.layout();
    }

    update(delta: number): void {
        this.elapsed += delta;
        this.text.setAlpha(Phaser.Math.Clamp((8000 - this.elapsed) / 1000, 0, 1));
    }

    layout(): void {
        const camera = this.scene.cameras.main, zoom = camera.zoom, narrow = this.scene.scale.width < 650;
        const bottom = this.scene.scale.height - (narrow ? 96 : 16);
        this.text.setFontSize(narrow ? 12 : 14).setWordWrapWidth(Math.min(580, this.scene.scale.width - 56))
            .setScale(1 / zoom).setPosition(camera.width / 2 + (16 - camera.width / 2) / zoom,
                camera.height / 2 + (bottom - camera.height / 2) / zoom);
    }

    destroy(): void { this.text.destroy(); }
}

import Phaser from "phaser";
import { characters, type PlayerCharacter } from "../config/characters";
import { UITheme } from "../config/UITheme";

export const gameOverBackdropKey = "game-over-backdrop";
export function loadGameOverAssets(scene: Phaser.Scene): void {
    if (!scene.textures.exists("game-over-panel")) scene.load.image("game-over-panel", "assets/ui/game-over-panel.png");
}

/** One rendered frame, captured during the existing defeat animation on either renderer. */
export function captureGameOverBackdrop(scene: Phaser.Scene, valid: () => boolean): void {
    scene.game.renderer.snapshot(image => {
        if (!valid() || !(image instanceof HTMLImageElement)) return;
        if (scene.textures.exists(gameOverBackdropKey)) scene.textures.remove(gameOverBackdropKey);
        scene.textures.addImage(gameOverBackdropKey, image);
    });
}

export class GameOverView {
    private readonly scene: Phaser.Scene;
    private readonly actions: readonly (() => void)[];
    readonly buttons: Phaser.GameObjects.Text[];
    private readonly panel: Phaser.GameObjects.Image[] = [];
    private readonly backdrop: Phaser.GameObjects.Image | null;
    private readonly shade: Phaser.GameObjects.Rectangle;
    private readonly graphics: Phaser.GameObjects.Graphics;
    private readonly eyebrow: Phaser.GameObjects.Text;
    private readonly title: Phaser.GameObjects.Text;
    private readonly name: Phaser.GameObjects.Text;
    private readonly caption: Phaser.GameObjects.Text;
    private readonly levelLabel: Phaser.GameObjects.Text;
    private readonly levelValue: Phaser.GameObjects.Text;
    private readonly scoreLabel: Phaser.GameObjects.Text;
    private readonly scoreValue: Phaser.GameObjects.Text;
    private readonly hint: Phaser.GameObjects.Text;
    private readonly portrait: Phaser.GameObjects.Image;
    private selected = 0;
    private buttonWidth = 0;
    private buttonHeight = 0;
    private compact = false;

    constructor(scene: Phaser.Scene, character: PlayerCharacter, level: number, score: number,
        actions: readonly (() => void)[]) {
        this.scene = scene; this.actions = actions;
        const text = (value: string, size: number, color: string = UITheme.text) => scene.add.text(0, 0, value,
            { fontFamily: UITheme.font, fontSize: size, color, align: "center" }).setOrigin(.5).setDepth(3).setResolution(2);
        this.backdrop = scene.textures.exists(gameOverBackdropKey) ? scene.add.image(0, 0, gameOverBackdropKey).setOrigin(.5).setDepth(0) : null;
        this.shade = scene.add.rectangle(0, 0, 1, 1, 0x06101b, .78).setOrigin(0).setDepth(0);
        if (scene.textures.exists("game-over-panel")) {
            const texture = scene.textures.get("game-over-panel");
            const source = texture.getSourceImage() as HTMLImageElement;
            const top = Math.round(source.height * .293), bottom = Math.round(source.height * .14);
            if (!texture.has("game-over-top")) {
                texture.add("game-over-top", 0, 0, 0, source.width, top);
                texture.add("game-over-middle", 0, 0, top, source.width, source.height - top - bottom);
                texture.add("game-over-bottom", 0, 0, source.height - bottom, source.width, bottom);
            }
            for (const part of ["top", "middle", "bottom"]) this.panel.push(scene.add.image(0, 0, "game-over-panel", `game-over-${part}`).setOrigin(0).setDepth(1));
        }
        this.graphics = scene.add.graphics().setDepth(2);
        this.eyebrow = text("BERZERK / FIN DE LA PARTIDA", 11, UITheme.accent);
        this.title = text("GAME OVER", 52);
        this.name = text(characters[character].name.toUpperCase(), 20, characters[character].accent);
        this.caption = text("Una caída no termina tu historia.", 13, UITheme.muted);
        this.levelLabel = text("NIVEL ALCANZADO", 10, UITheme.muted);
        this.levelValue = text(String(level).padStart(2, "0"), 30);
        this.scoreLabel = text("PUNTUACIÓN", 10, UITheme.muted);
        this.scoreValue = text(String(score).padStart(5, "0"), 30);
        this.hint = text("↑ ↓ Elegir · ENTER Confirmar · R Reintentar", 11, UITheme.muted);
        const defeat = scene.textures.get(`${character}-defeat`), frame = defeat.get("front-7");
        if (!defeat.has("game-over-pose")) defeat.add("game-over-pose", 0, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight);
        this.portrait = scene.add.image(0, 0, `${character}-defeat`, "game-over-pose").setDepth(3);
        this.buttons = ["[ REINTENTAR ]", "CAMBIAR PERSONAJE", "VOLVER AL MENÚ"].map((label, index) => {
            const button = text(label, 16).setOrigin(.5, 0).setInteractive({ useHandCursor: true });
            button.on("pointerover", () => this.select(index));
            button.on("pointerdown", () => { this.select(index); this.activate(); });
            return button;
        });
        this.layout();
        scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) scene.cameras.main.fadeIn(220, 6, 16, 27);
    }

    select(index: number): void { this.selected = (index + this.buttons.length) % this.buttons.length; this.paint(); }
    move(delta: number): void { this.select(this.selected + delta); }
    activate(): void { this.actions[this.selected]?.(); }

    private layout(): void {
        const { width, height } = this.scene.scale;
        this.compact = width < 650;
        const w = this.compact ? Math.max(260, width - 16) : Math.min(1080, width - 32, (height - 24) * 1.5);
        const h = this.compact ? Math.min(680, height - 16) : w / 1.5;
        const x = (width - w) / 2, y = (height - h) / 2;
        const top = w * .1953, bottom = w * .0933;
        this.shade.setSize(width, height);
        if (this.backdrop) {
            const scale = Math.max(width / this.backdrop.width, height / this.backdrop.height);
            this.backdrop.setPosition(width / 2, height / 2).setScale(scale);
        }
        this.panel[0]?.setPosition(x, y).setDisplaySize(w, top);
        this.panel[1]?.setPosition(x, y + top).setDisplaySize(w, h - top - bottom);
        this.panel[2]?.setPosition(x, y + h - bottom).setDisplaySize(w, bottom);
        this.eyebrow.setVisible(!this.compact).setPosition(width / 2, y + top * .36);
        this.title.setFontSize(this.compact ? 30 : Math.min(54, w * .053)).setPosition(width / 2, y + top * .55);
        const left = x + w * .28, right = this.compact ? width / 2 : x + w * .68;
        const contentTop = y + top;
        const short = this.compact && h < 560;
        const tiny = this.compact && h < 400;
        this.name.setVisible(!tiny); this.portrait.setVisible(!tiny); this.caption.setVisible(!short);
        if (this.compact) {
            this.name.setPosition(width / 2, contentTop + 18).setFontSize(16);
            const portraitWidth = Math.min(150, w * .42);
            this.portrait.setDisplaySize(portraitWidth, portraitWidth * this.portrait.height / this.portrait.width).setPosition(width / 2, contentTop + 66);
            this.caption.setPosition(width / 2, contentTop + 111).setFontSize(11);
        } else {
            this.name.setPosition(left, y + h * .38).setFontSize(22);
            const portraitWidth = w * .26;
            this.portrait.setDisplaySize(portraitWidth, portraitWidth * this.portrait.height / this.portrait.width).setPosition(left, y + h * .56);
            this.caption.setPosition(left, y + h * .74).setFontSize(Math.min(14, w * .017));
        }
        const statsY = this.compact ? contentTop + (tiny ? 20 : short ? 115 : 155) : y + h * .34;
        const statGap = this.compact ? w * .23 : w * .095;
        this.levelLabel.setPosition(right - statGap, statsY).setFontSize(10);
        this.scoreLabel.setPosition(right + statGap, statsY).setFontSize(10);
        this.levelValue.setPosition(right - statGap, statsY + 30).setFontSize(this.compact ? 28 : 32);
        this.scoreValue.setPosition(right + statGap, statsY + 30).setFontSize(this.compact ? 28 : 32);
        this.buttonWidth = this.compact ? w * .78 : w * .36;
        this.buttonHeight = Math.max(tiny ? 30 : 34, Math.min(50, h * .078));
        const buttonsY = this.compact ? statsY + (tiny ? 55 : 65) : y + h * .48;
        this.buttons.forEach((button, index) => button.setFontSize(this.compact ? 14 : Math.min(17, w * .024))
            .setPadding(8, Math.max(6, (this.buttonHeight - 20) / 2)).setFixedSize(this.buttonWidth, this.buttonHeight)
            .setPosition(right, buttonsY + index * (this.buttonHeight + 10)));
        this.hint.setPosition(width / 2, y + h - Math.max(44, bottom * 1.05)).setFontSize(this.compact ? 10 : 11);
        this.paint();
    }
    private paint(): void {
        this.graphics.clear();
        this.buttons.forEach((button, index) => {
            const selected = index === this.selected;
            this.graphics.fillStyle(selected ? 0x17436a : 0x0b1b29, .95).lineStyle(1, selected ? 0x8dcfff : 0x39556c)
                .fillRoundedRect(button.x - this.buttonWidth / 2, button.y, this.buttonWidth, this.buttonHeight, 3)
                .strokeRoundedRect(button.x - this.buttonWidth / 2, button.y, this.buttonWidth, this.buttonHeight, 3);
            button.setColor(selected ? "#d8eeff" : UITheme.muted);
        });
    }
    destroy(): void {
        this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
        if (this.scene.textures.exists(gameOverBackdropKey)) this.scene.textures.remove(gameOverBackdropKey);
    }
}

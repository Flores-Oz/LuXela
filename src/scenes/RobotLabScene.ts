import Phaser from "phaser";
import { Enemy } from "../entities/enemies/Enemy";
import { Player } from "../entities/Player";
import { fireEnemyShots } from "../systems/EnemyProjectiles";
import { loadRobotAssets, createRobotAnimations } from "../systems/RobotAssets";
import { loadPlayerAssets, createPlayerAnimations } from "../systems/PlayerAnimations";
import { LineOfSight } from "../systems/LineOfSight";
import { robotDefinitions, type RobotType } from "../config/RobotConfig";
import { CombatBalance } from "../config/CombatBalance";

export type LabMode = "combat" | "special-a1" | "special-a2" | "special-b1" | "special-b2";

/** Isolated view of production AI/projectiles and the existing sprite animations. */
export class RobotLabScene extends Phaser.Scene {
    onChange: () => void = () => {};
    onReady: () => void = () => {};
    robotType: RobotType = "robot-red";
    mode: LabMode = "combat";
    shots = 0;
    hits = 0;
    enemy!: Enemy;
    player!: Player;
    projectiles!: Phaser.Physics.Arcade.Group;
    private walls!: Phaser.Physics.Arcade.StaticGroup;
    private enemies!: Phaser.Physics.Arcade.Group;
    private wallEnabled = false;
    private wall!: Phaser.Physics.Arcade.Image;
    private sight!: LineOfSight;
    private targetLabel!: Phaser.GameObjects.Text;
    private animationTimer?: Phaser.Time.TimerEvent;
    private nextReadout = 0;

    constructor() { super("RobotLabScene"); }
    preload(): void { loadRobotAssets(this); loadPlayerAssets(this); }

    create(): void {
        createRobotAnimations(this);
        createPlayerAnimations(this);
        this.physics.world.setBounds(0, 0, 960, 600);
        const grid = this.add.graphics();
        grid.fillStyle(0x182b3b).fillRect(0, 0, 960, 600);
        grid.lineStyle(1, 0x263f55);
        for (let x = 0; x <= 960; x += 40) grid.lineBetween(x, 0, x, 600);
        for (let y = 0; y <= 600; y += 40) grid.lineBetween(0, y, 960, y);
        grid.lineStyle(4, 0x557895).strokeRect(2, 2, 956, 596);
        this.walls = this.physics.add.staticGroup();
        const wallGraphic = this.add.graphics().fillStyle(0x5d758c).fillRect(0, 0, 40, 240);
        wallGraphic.lineStyle(2, 0xabc5dc).strokeRect(1, 1, 38, 238);
        wallGraphic.generateTexture("lab-wall", 40, 240);
        wallGraphic.destroy();
        this.wall = this.walls.create(440, 300, "lab-wall") as Phaser.Physics.Arcade.Image;
        this.wall.setData("room-perimeter", false);
        this.setWall(false);
        this.sight = new LineOfSight(this.walls);
        this.player = new Player(this, 620, 300, "alex");
        this.targetLabel = this.add.text(620, 365, "ALEX · INVULNERABLE", { fontSize: "12px", color: "#b5d6f2" }).setOrigin(.5);
        this.projectiles = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.physics.add.collider(this.enemies, this.walls);
        this.physics.add.collider(this.player.physicsSprite, this.walls);
        this.input.keyboard?.disableGlobalCapture();
        this.physics.add.collider(this.projectiles, this.walls, shot => {
            (shot as Phaser.Physics.Arcade.Image).getData("projectile")?.destroy();
        }, shot => !(shot as Phaser.Physics.Arcade.Image).getData("projectile")?.piercesInteriorWalls);
        this.physics.add.overlap(this.projectiles, this.player.physicsSprite, shot => {
            (shot as Phaser.Physics.Arcade.Image).getData("projectile")?.destroy();
            this.hits++;
            this.player.physicsSprite.setTint(0xaaddff);
            this.time.delayedCall(100, () => this.player.physicsSprite.clearTint());
        });
        const world = this.physics.world;
        const bounds = (body: Phaser.Physics.Arcade.Body) => body.gameObject.getData("projectile")?.destroy();
        world.on(Phaser.Physics.Arcade.Events.WORLD_BOUNDS, bounds);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            world.off(Phaser.Physics.Arcade.Events.WORLD_BOUNDS, bounds);
            this.animationTimer?.remove(false);
        });
        this.resetTest();
        this.onReady();
    }

    setWall(enabled: boolean): void {
        this.wallEnabled = enabled;
        const visible = enabled && this.mode === "combat";
        this.wall.setActive(visible).setVisible(visible);
        (this.wall.body as Phaser.Physics.Arcade.StaticBody).enable = visible;
        this.onChange();
    }

    configure(type: RobotType, mode: LabMode): void {
        this.robotType = type;
        this.mode = mode;
        this.resetTest();
    }

    resetTest(): void {
        this.animationTimer?.remove(false);
        this.enemy?.destroy();
        this.projectiles.clear(true, true);
        this.shots = this.hits = 0;
        this.player.physicsSprite.clearTint().setVisible(this.mode === "combat");
        this.player.physicsSprite.body!.reset(620, 300);
        (this.player.physicsSprite.body as Phaser.Physics.Arcade.Body).enable = this.mode === "combat";
        this.targetLabel.setVisible(this.mode === "combat");
        this.enemy = new Enemy(this, this.mode === "combat" ? 260 : 480, 300, this.robotType, {
            moveSpeed: 80, detectionRange: CombatBalance.detectionRanges[0], patrol: false
        });
        this.enemies.add(this.enemy);
        this.enemy.playIdle();
        if (this.mode !== "combat") {
            this.enemy.setScale(2);
            (this.enemy.body as Phaser.Physics.Arcade.Body).enable = false;
            const key = `${robotDefinitions[this.robotType].prefix}-${this.mode}`;
            const play = () => { if (this.enemy.active) this.enemy.play(key); };
            play();
            this.animationTimer = this.time.addEvent({ delay: 1200, loop: true, callback: play });
        }
        this.nextReadout = 0;
        this.setWall(this.wallEnabled);
        this.onChange();
    }

    update(time: number): void {
        if (!this.enemy) return;
        if (this.mode === "combat") {
            this.player.update();
            this.targetLabel.setPosition(this.player.x, this.player.y + 65);
            const shots = this.enemy.updateBehavior(this.player, this.sight, this.time.now);
            this.shots += fireEnemyShots(this, this.enemy, shots, this.projectiles);
        }
        if (time >= this.nextReadout) {
            this.nextReadout = time + 100;
            this.onChange();
        }
    }
}

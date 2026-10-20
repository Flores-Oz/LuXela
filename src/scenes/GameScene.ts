import Phaser from "phaser";

import { Room } from "../world/Room";
import { RoomBuilder } from "../world/RoomBuilder";
import { TileType } from "../types/RoomTypes";
import { Player } from "../entities/Player";
import { Projectile } from "../entities/Projectile";
import { testRoom } from "../data/rooms/testRoom";
import { testRoom2 } from "../data/rooms/testRoom2";
import { Enemy } from "../entities/enemies/Enemy";
import { LineOfSight } from "../systems/LineOfSight";
import { GameSettings } from "../config/GameSettings";
import type { PlayerCharacter } from "../config/characters";
import { loadPlayerAssets, createPlayerAnimations } from "../systems/PlayerAnimations";
import { CombatEvents } from "../systems/CombatEvents";
import { EnemyManager } from "../systems/EnemyManager";
import { getCharacterUnlocks } from "../systems/CharacterUnlockService";
import { loadSpecialAssets, SpecialAbilityManager } from "../abilities/SpecialAbilityManager";
import { getArcadeRun } from "../systems/ArcadeRunService";
import { startNarrative } from "../narrative/startNarrative";
import { UITheme } from "../config/UITheme";



export class GameScene extends Phaser.Scene {

    private player: Player | null = null;
    private specialAbilities: SpecialAbilityManager | null = null;
    private abilityCooldownMs = 0;

    private roomIndex = 0;

    private character: PlayerCharacter = "lua";

    private selectionValid = false;

    private combatState: "playing" | "defeat" | "game-over" | "victory" = "playing";
    private runId = 0;
    private pausedAt = 0;
    private pausedDuration = 0;
    private roomWidth = 0;
    private roomHeight = 0;
    private roomLabel: Phaser.GameObjects.Text | null = null;
    private pauseButton: Phaser.GameObjects.Text | null = null;

    private enemyManager: EnemyManager | null = null;

    private isChangingRoom = false;

    private enemies!: Phaser.Physics.Arcade.Group;

    private playerProjectiles!: Phaser.Physics.Arcade.Group;

    private enemyProjectiles!: Phaser.Physics.Arcade.Group;

    private lineOfSight: LineOfSight | null = null;

    private readonly rooms = [
        testRoom,
        testRoom2
    ];

    private walls: 
        Phaser.Physics.Arcade.StaticGroup | null = null;

    constructor() {
        super("GameScene");
    }

    preload(): void {
        loadPlayerAssets(this);
        loadSpecialAssets(this);

        if (!this.textures.exists("robot-red")) this.load.spritesheet(
            "robot-red",
            "assets/sprites/enemies/RobotRed-fixed.png",
            {
                frameWidth: 64,
                frameHeight: 64,
                endFrame: 65
            }
        );
    }

    create(): void {

        if (!this.selectionValid || !getCharacterUnlocks(this.game).isUnlocked(this.character)) {
            this.scene.start("CharacterSelectScene");
            return;
        }

        this.input.keyboard?.resetKeys();
        this.physics.resume();
        this.enemies = this.physics.add.group({ collideWorldBounds: true });
        this.enemyManager = new EnemyManager(this, this.enemies);
        this.playerProjectiles = this.physics.add.group();
        this.enemyProjectiles = this.physics.add.group();
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            // Arcade and the display list destroy bodies/groups on shutdown.
            // Group shutdown listeners run first; do not clear destroyed groups.
            this.enemyManager?.destroy();
            this.specialAbilities?.destroy();
            this.specialAbilities = null;
            this.enemyManager = null;
            this.player = null;
            this.walls = null;
            this.lineOfSight = null;
            this.roomLabel = null;
            this.pauseButton = null;
            this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutRoom, this);
            this.input.keyboard?.off("keydown-ESC", this.pauseGame, this);
        });

        const tileSize = 64;

        const roomMatrix =
            this.rooms[this.roomIndex];

        const room = new Room(
            roomMatrix,
            tileSize
        );

        const builder = new RoomBuilder(this);

        builder.build(room);

        createPlayerAnimations(this);
        this.createEnemyAnimations();

        this.walls = builder.getWalls();
        this.lineOfSight = new LineOfSight(this.walls);

        const spawn =
            room.findTile(TileType.PlayerSpawn);

        if (!spawn) {
            throw new Error(
                "Room does not contain a PlayerSpawn."
            );
        }

        const playerX =
            spawn.column * tileSize +
            tileSize / 2;

        const playerY =
            spawn.row * tileSize +
            tileSize / 2;

        this.player = new Player(
            this,
            playerX,
            playerY,
            this.character
        );

        this.player.physicsSprite.once(CombatEvents.PLAYER_DIED, this.beginDefeat, this);
        this.player.physicsSprite.once(CombatEvents.PLAYER_DEFEAT_COMPLETE, this.showGameOver, this);

        this.physics.add.collider(
            this.player.physicsSprite,
            this.walls
        );

        this.physics.world.setBounds(
            0,
            0,
            room.widthInPixels,
            room.heightInPixels
        );

        this.cameras.main.setBackgroundColor(UITheme.background);
        this.roomWidth = room.widthInPixels;
        this.roomHeight = room.heightInPixels;

        this.cameras.main.centerOn(
            room.widthInPixels / 2,
            room.heightInPixels / 2
        );

        const exits =
            builder.getExits();

        this.physics.add.overlap(
            this.player.physicsSprite,
            exits,
            () => {
                this.changeRoom();
            }
        );

        const playerSpawnCount =
            room.countTiles(
                TileType.PlayerSpawn
            );

        if (playerSpawnCount !== 1) {
            throw new Error(
                `Room must contain exactly one PlayerSpawn. Found: ${playerSpawnCount}`
            );
        }

        // Spawn only at RobotSpawn tiles; no hard-coded world coordinates.
        for (let row = 0; row < room.height; row++) {
            for (let column = 0; column < room.width; column++) {
                if (room.matrix[row][column] !== TileType.RobotSpawn) continue;
                const enemy = new Enemy(this,
                    column * tileSize + tileSize / 2,
                    row * tileSize + tileSize / 2, "robot-red",
                    { patrol: GameSettings.enemyPatrol });
                this.enemyManager.add(enemy);
                enemy.playIdle();
            }
        }

        this.physics.add.collider(this.enemies, this.walls);
        // Register once per group, rather than leaving one collider per shot.
        for (const projectiles of [this.playerProjectiles, this.enemyProjectiles]) {
            this.physics.add.collider(projectiles, this.walls, (shot) => {
                (shot as Phaser.Physics.Arcade.Image).getData("projectile")?.destroy();
            });
        }
        this.physics.add.overlap(this.playerProjectiles, this.enemies, (shot, target) => {
            const enemy = target as Enemy;
            const projectile = shot as Phaser.Physics.Arcade.Image;
            if (this.combatState !== "playing" || this.isChangingRoom || !projectile.active || enemy.isDead()) return;
            projectile.getData("projectile")?.destroy();
            enemy.die();
        });
        this.physics.add.overlap(this.enemyProjectiles, this.player.physicsSprite, (shot) => {
            const projectile = shot as Phaser.Physics.Arcade.Image;
            if (this.combatState !== "playing" || this.isChangingRoom || !projectile.active || !this.player || this.player.isDead()) return;
            projectile.getData("projectile")?.destroy();
            this.player.die();
        });
        this.roomLabel = this.add.text(16, 48, "", { fontFamily: UITheme.font, fontSize: "14px", color: UITheme.muted }).setScrollFactor(0).setDepth(100);
        this.pauseButton = this.add.text(0, 16, "PAUSA · ESC", { fontFamily: UITheme.font, fontSize: "14px", color: UITheme.text, backgroundColor: UITheme.overlay, padding: { x: 12, y: 10 } })
            .setScrollFactor(0).setDepth(100).setOrigin(1, 0).setInteractive({ useHandCursor: true }).on("pointerdown", this.pauseGame, this);
        this.events.on(CombatEvents.ROOM_CLEARED, this.roomCleared, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(CombatEvents.ROOM_CLEARED, this.roomCleared, this));
        this.enemyManager.start();
        this.specialAbilities = new SpecialAbilityManager(this, this.player, this.character, this.enemyManager, this.abilityCooldownMs);
        this.roomLabel.setText(`Habitación ${this.roomIndex + 1} / ${this.rooms.length} · ${this.enemyManager.isCleared ? "Salida disponible" : "Elimina a los robots para salir"}`);
        this.input.keyboard?.on("keydown-ESC", this.pauseGame, this);
        this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutRoom, this);
        this.layoutRoom();
    }

    update(time: number, delta = 1000 / 60): void {
        if (this.combatState !== "playing" || !this.player || !this.lineOfSight || this.isChangingRoom) return;
        this.specialAbilities?.update(delta);
        this.player.update();

        for (const child of this.enemies.getChildren()) {
            const enemy = child as Enemy;
            const direction = enemy.updateBehavior(this.player, this.lineOfSight, time - this.pausedDuration);
            if (direction) {
                // Spawn at the robot center so a muzzle offset cannot jump a wall.
                new Projectile(this, enemy.x, enemy.y, direction, "enemy", this.enemyProjectiles);
            }
        }

        const direction = this.player.consumeShootRequest();
        if (direction) this.createProjectile(direction);
    }

    private beginDefeat(): void {
        if (this.combatState !== "playing") return;
        this.combatState = "defeat";
        getArcadeRun(this.game).defeat(this.runId);
        this.specialAbilities?.cancel();
        // Pause only physics. Animation updates must continue until defeat ends.
        this.physics.pause();
        for (const child of this.enemies.getChildren()) (child as Enemy).stop();
        this.playerProjectiles.clear(true, true);
        this.enemyProjectiles.clear(true, true);
    }

    private showGameOver(): void {
        if (this.combatState !== "defeat") return;
        this.combatState = "game-over";
        this.scene.start("GameOverScene", { roomIndex: this.roomIndex, character: this.character, runId: this.runId });
    }

    private createEnemyAnimations(): void {

        if (!this.anims.exists("robot-idle")) this.anims.create({
            key: "robot-idle",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 0, end: 3 }
            ),
            frameRate: 4,
            repeat: -1
        });

        if (!this.anims.exists("robot-walk-up")) this.anims.create({
            key: "robot-walk-up",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 6, end: 11 }
            ),
            frameRate: 8,
            repeat: -1
        });

        if (!this.anims.exists("robot-walk-down")) this.anims.create({
            key: "robot-walk-down",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 12, end: 17 }
            ),
            frameRate: 8,
            repeat: -1
        });

        if (!this.anims.exists("robot-walk-right")) this.anims.create({
            key: "robot-walk-right",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 18, end: 23 }
            ),
            frameRate: 8,
            repeat: -1
        });

        if (!this.anims.exists("robot-walk-left")) this.anims.create({
            key: "robot-walk-left",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 24, end: 29 }
            ),
            frameRate: 8,
            repeat: -1
        });

        if (!this.anims.exists("robot-special-a1")) this.anims.create({
            key: "robot-special-a1",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 30, end: 33 }
            ),
            frameRate: 8,
            repeat: 0
        });

        if (!this.anims.exists("robot-special-a2")) this.anims.create({
            key: "robot-special-a2",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 36, end: 39 }
            ),
            frameRate: 8,
            repeat: 0
        });

        if (!this.anims.exists("robot-special-b1")) this.anims.create({
            key: "robot-special-b1",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 42, end: 45 }
            ),
            frameRate: 8,
            repeat: 0
        });

        if (!this.anims.exists("robot-special-b2")) this.anims.create({
            key: "robot-special-b2",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 48, end: 51 }
            ),
            frameRate: 8,
            repeat: 0
        });

        if (!this.anims.exists("robot-hit")) this.anims.create({
            key: "robot-hit",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 54, end: 56 }
            ),
            frameRate: 10,
            repeat: 0
        });

        if (!this.anims.exists("robot-death")) this.anims.create({
            key: "robot-death",
            frames: this.anims.generateFrameNumbers(
                "robot-red",
                { start: 60, end: 65 }
            ),
            frameRate: 10,
            repeat: 0
        });
    }

    private createProjectile(
        direction: Phaser.Math.Vector2
    ): void {

        if (this.combatState !== "playing" || this.isChangingRoom || !this.player || this.player.isDead()) {
            return;
        }

        const spawn =
            this.player.getProjectileSpawn(
                direction
            );

        // Existing muzzle offsets can cross a nearby wall. Reject that shot.
        if (!this.lineOfSight?.hasLineOfSight(this.player, spawn)) return;
        new Projectile(this, spawn.x, spawn.y, direction, "player", this.playerProjectiles);
    }

    private changeRoom(): void {
          if (this.combatState !== "playing" || this.isChangingRoom || !this.player || this.player.isDead()) {
            return;
        }

        if (!this.enemyManager?.isCleared) return;
        if (this.roomIndex === this.rooms.length - 1) {
            if (!getArcadeRun(this.game).finish(this.runId, this.roomIndex)) return;
            this.combatState = "victory";
            this.isChangingRoom = true;
            this.specialAbilities?.cancel();
            startNarrative(this, { route: this.character, sequenceId: `${this.character}_ending`, resume: false,
                destination: { kind: "completion", runId: this.runId } });
            return;
        }

        this.isChangingRoom = true;
        const abilityCooldownMs = this.specialAbilities?.cancel() ?? 0;

        const nextRoomIndex =
            (this.roomIndex + 1) %
            this.rooms.length;

        this.scene.restart({
            roomIndex: nextRoomIndex,
            abilityCooldownMs,
            runId: this.runId,
            character: this.character
        });
    }

    init(data: { roomIndex?: number; character?: PlayerCharacter; abilityCooldownMs?: number; runId?: number } = {}): void {
        this.abilityCooldownMs = typeof data.abilityCooldownMs === "number" && Number.isFinite(data.abilityCooldownMs) ?
            Math.max(0, data.abilityCooldownMs) : 0;
        this.roomIndex =
            data.roomIndex ?? 0;

        this.selectionValid = getCharacterUnlocks(this.game).isUnlocked(data.character);
        this.selectionValid = this.selectionValid && Number.isInteger(this.roomIndex) && this.roomIndex >= 0 && this.roomIndex < this.rooms.length;
        if (this.selectionValid && (data.character === "alex" || data.character === "lua")) {
            this.character = data.character;
        }
        this.combatState = "playing";
        this.isChangingRoom = false;
        this.pausedDuration = 0;
        const runs = getArcadeRun(this.game);
        this.runId = this.selectionValid && runs.continue(data.runId, this.character) ? data.runId! :
            this.selectionValid ? runs.begin(this.character) : 0;
    }

    get selectedCharacter(): PlayerCharacter { return this.character; }

    private roomCleared(): void {
        getArcadeRun(this.game).clearRoom(this.runId, this.roomIndex);
        this.roomLabel?.setText(`Habitación ${this.roomIndex + 1} / ${this.rooms.length} · Salida disponible`);
    }

    private pauseGame(event?: KeyboardEvent): void {
        if (event?.repeat || this.combatState !== "playing" || this.isChangingRoom || !this.player || this.player.isDead() || this.scene.isActive("PauseScene")) return;
        this.pausedAt = this.game.loop.time;
        this.input.keyboard?.resetKeys();
        this.scene.pause();
        this.scene.launch("PauseScene");
    }

    resumeFromPause(): void {
        this.pausedDuration += Math.max(0, this.game.loop.time - this.pausedAt);
        this.input.keyboard?.resetKeys();
    }

    private layoutRoom(): void {
        const camera = this.cameras.main;
        const zoom = Math.max(0.1, Math.min((this.scale.width - 24) / this.roomWidth, (this.scale.height - 112) / this.roomHeight));
        camera.setZoom(zoom).centerOn(this.roomWidth / 2, this.roomHeight / 2 - 32 / zoom);
        const positionHUD = (text: Phaser.GameObjects.Text | null, x: number, y: number) => {
            text?.setScale(1 / zoom).setPosition(camera.width / 2 + (x - camera.width / 2) / zoom, camera.height / 2 + (y - camera.height / 2) / zoom);
        };
        this.roomLabel?.setWordWrapWidth(this.scale.width - 32).setFontSize(this.scale.width < 650 ? 12 : 14);
        positionHUD(this.roomLabel, 16, 58);
        positionHUD(this.pauseButton, this.scale.width - 16, this.scale.width < 650 ? this.scale.height - 56 : 16);
        this.specialAbilities?.layoutHUD();
    }
}

import Phaser from "phaser";

import { RoomBuilder } from "../world/RoomBuilder";
import { TileType } from "../types/RoomTypes";
import { Player } from "../entities/Player";
import { Projectile } from "../entities/Projectile";
import { Enemy } from "../entities/enemies/Enemy";
import { LineOfSight } from "../systems/LineOfSight";
import type { PlayerCharacter } from "../config/characters";
import { loadPlayerAssets, createPlayerAnimations } from "../systems/PlayerAnimations";
import { CombatEvents } from "../systems/CombatEvents";
import { EnemyManager } from "../systems/EnemyManager";
import { getCharacterUnlocks } from "../systems/CharacterUnlockService";
import { loadSpecialAssets, SpecialAbilityManager } from "../abilities/SpecialAbilityManager";
import { getArcadeRun } from "../systems/ArcadeRunService";
import { LevelManager } from "../levels/LevelManager";
import { isLevelIndex } from "../levels/levels";
import { UITheme } from "../config/UITheme";
import { GameHUD } from "../ui/GameHUD";
import { WaveManager } from "../levels/WaveManager";
import { getWaves, type WaveConfig } from "../levels/WaveConfig";
import { planWaveSpawns } from "../levels/SpawnPlanner";
import type { Room } from "../world/Room";
import type { DoorController } from "../world/DoorController";
import { SpecialAbilityConfig } from "../config/SpecialAbilityConfig";
import { loadEnvironmentAssets } from "../world/environment/EnvironmentTiles";



export class GameScene extends Phaser.Scene {

    private player: Player | null = null;
    private specialAbilities: SpecialAbilityManager | null = null;

    private roomIndex = 0;

    private character: PlayerCharacter = "lua";

    private selectionValid = false;

    private combatState: "playing" | "defeat" | "game-over" | "victory" = "playing";
    private runId = 0;
    private pausedAt = 0;
    private pausedDuration = 0;
    private roomWidth = 0;
    private roomHeight = 0;
    private hud: GameHUD | null = null;
    private pauseButton: Phaser.GameObjects.Text | null = null;

    private enemyManager: EnemyManager | null = null;
    private waves: WaveManager | null = null;
    private doors: DoorController | null = null;

    private isChangingRoom = false;

    private enemies!: Phaser.Physics.Arcade.Group;

    private playerProjectiles!: Phaser.Physics.Arcade.Group;

    private enemyProjectiles!: Phaser.Physics.Arcade.Group;

    private lineOfSight: LineOfSight | null = null;

    private readonly levels = new LevelManager();

    private walls: 
        Phaser.Physics.Arcade.StaticGroup | null = null;

    constructor() {
        super("GameScene");
    }

    preload(): void {
        loadEnvironmentAssets(this);
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
            this.waves?.stop(); this.waves = null;
            this.doors = null;
            this.specialAbilities?.destroy();
            this.specialAbilities = null;
            this.enemyManager = null;
            this.player = null;
            this.walls = null;
            this.lineOfSight = null;
            this.hud?.destroy();
            this.hud = null;
            this.pauseButton = null;
            this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutRoom, this);
            this.input.keyboard?.off("keydown-ESC", this.pauseGame, this);
        });

        const tileSize = 64;

        const config = this.levels.getLevel(this.roomIndex);
        const room = this.levels.createRoom(this.roomIndex, tileSize);

        const builder = new RoomBuilder(this);

        builder.build(room, config.exits, config.presentation);
        this.doors = builder.getDoors();

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
            (_player, exit) => {
                this.changeRoom(exit as Phaser.GameObjects.GameObject);
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
        this.hud = new GameHUD(this, { level: this.roomIndex + 1, totalLevels: this.levels.count,
            score: getArcadeRun(this.game).getScore(this.runId), enemies: this.enemyManager.aliveCount }, this.character);
        this.pauseButton = this.add.text(0, 16, "PAUSA · ESC", { fontFamily: UITheme.font, fontSize: "14px", color: UITheme.text, backgroundColor: UITheme.overlay, padding: { x: 12, y: 10 } })
            .setScrollFactor(0).setDepth(100).setOrigin(1, 0).setInteractive({ useHandCursor: true }).on("pointerdown", this.pauseGame, this);
        this.events.on(CombatEvents.ENEMY_DEFEATED, this.enemyDefeated, this);
        this.events.on(CombatEvents.ENEMY_COUNT_CHANGED, this.updateHUD, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.events.off(CombatEvents.ENEMY_DEFEATED, this.enemyDefeated, this);
            this.events.off(CombatEvents.ENEMY_COUNT_CHANGED, this.updateHUD, this);
        });
        this.specialAbilities = new SpecialAbilityManager(this, this.player, this.character, this.enemyManager, this.runId);
        this.waves = new WaveManager(config.id, getWaves(config), {
            spawn: (wave, index) => this.spawnWave(room, wave, index),
            canSpawn: () => this.combatState === "playing" && !this.isChangingRoom && !!this.player && !this.player.isDead() && !this.specialAbilities?.ability.performing,
            changed: () => this.updateHUD(), completed: () => this.roomCleared(),
            started: index => this.events.emit(CombatEvents.WAVE_STARTED, index),
            ended: index => this.events.emit(CombatEvents.WAVE_COMPLETED, index)
        });
        this.waves.start();
        this.input.keyboard?.on("keydown-ESC", this.pauseGame, this);
        this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutRoom, this);
        this.layoutRoom();
    }

    update(time: number, delta = 1000 / 60): void {
        if (this.combatState !== "playing" || !this.player || !this.lineOfSight || this.isChangingRoom) return;
        const abilityState = this.specialAbilities?.ability.state;
        this.specialAbilities?.update(delta);
        if (this.specialAbilities?.ability.state !== abilityState) this.updateHUD();
        this.waves?.update(delta);
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
        this.waves?.stop();
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

    private changeRoom(exit?: Phaser.GameObjects.GameObject): void {
          if (this.combatState !== "playing" || this.isChangingRoom || !this.player || this.player.isDead()) {
            return;
        }

        if (!this.waves?.isComplete || !this.doors?.canUse(exit)) return;
        const nextRoomIndex = this.levels.nextIndex(this.roomIndex);
        if (nextRoomIndex === null) {
            if (!getArcadeRun(this.game).finish(this.runId, this.roomIndex)) return;
            this.combatState = "victory";
            this.isChangingRoom = true;
            this.doors.beginTransition(exit);
            this.prepareRoomExit();
            this.scene.start("CompletionScene", { character: this.character, runId: this.runId });
            return;
        }

        if (!getArcadeRun(this.game).advance(this.runId, this.roomIndex)) return;
        this.isChangingRoom = true;
        this.doors.beginTransition(exit);
        this.prepareRoomExit();

        this.scene.restart({
            roomIndex: nextRoomIndex,
            runId: this.runId,
            character: this.character
        });
    }

    private prepareRoomExit(): void {
        this.specialAbilities?.cancel();
        this.waves?.stop();
        this.input.keyboard?.resetKeys();
        this.player?.physicsSprite.setVelocity(0, 0);
        for (const child of this.enemies.getChildren()) (child as Enemy).stop();
        this.playerProjectiles.clear(true, true);
        this.enemyProjectiles.clear(true, true);
        this.physics.pause();
    }

    init(data: { roomIndex?: number; character?: PlayerCharacter; runId?: number } = {}): void {
        this.roomIndex =
            data.roomIndex ?? 0;

        this.selectionValid = getCharacterUnlocks(this.game).isUnlocked(data.character);
        this.selectionValid = this.selectionValid && isLevelIndex(this.roomIndex);
        if (this.selectionValid && (data.character === "alex" || data.character === "lua")) {
            this.character = data.character;
        }
        this.combatState = "playing";
        this.isChangingRoom = false;
        this.pausedDuration = 0;
        const runs = getArcadeRun(this.game);
        if (this.selectionValid && runs.continue(data.runId, this.character, this.roomIndex)) this.runId = data.runId!;
        else {
            this.roomIndex = 0;
            this.runId = this.selectionValid ? runs.begin(this.character) : 0;
        }
    }

    get selectedCharacter(): PlayerCharacter { return this.character; }

    private roomCleared(): void {
        if (this.combatState !== "playing" || this.isChangingRoom) return;
        getArcadeRun(this.game).clearRoom(this.runId, this.roomIndex);
        this.playerProjectiles.clear(true, true);
        this.enemyProjectiles.clear(true, true);
        this.doors?.unlock();
        this.events.emit(CombatEvents.ROOM_CLEARED);
    }

    private enemyDefeated(enemy: Enemy): void {
        if (this.combatState !== "playing" || this.isChangingRoom) return;
        const enemyId: unknown = enemy.getData("level-enemy-id");
        if (typeof enemyId === "string" && this.waves?.canDefeat(enemyId)) {
            getArcadeRun(this.game).awardKill(this.runId, this.roomIndex, enemyId, this.levels.getLevel(this.roomIndex).scorePerEnemy);
            this.waves.defeat(enemyId);
            // Residual bullets must not interfere with the next wave's preparation.
            if (this.waves.state !== "active") {
                this.playerProjectiles.clear(true, true); this.enemyProjectiles.clear(true, true);
            }
        }
        this.updateHUD();
    }

    private spawnWave(room: Room, wave: WaveConfig, waveIndex: number): boolean {
        if (!this.player || !this.enemyManager || !this.waves || this.enemyManager.aliveCount !== 0) return false;
        const config = this.levels.getLevel(this.roomIndex);
        const positions = planWaveSpawns(room, wave.enemies.spawns, this.player, config.difficulty.detectionRange);
        if (!positions) return false;
        for (const [index, position] of positions.entries()) {
            const enemy = new Enemy(this, (position.column + 0.5) * room.tileSize,
                (position.row + 0.5) * room.tileSize, wave.enemies.spawns[index]!.type, config.difficulty);
            enemy.setData("level-enemy-id", this.waves.enemyId(waveIndex, index));
            this.enemyManager.add(enemy); enemy.playIdle();
        }
        this.enemyManager.start();
        return true;
    }

    private updateHUD(): void {
        const config = this.levels.getLevel(this.roomIndex);
        const notice = this.waves?.isComplete ? "SALIDA DISPONIBLE" : this.waves?.waitingForSpace ? "LIBERA LA ZONA DE APARICIÓN" :
            this.waves?.state === "starting" ? "PREPARANDO OLEADA" : config.encounter === "special" ? "ENCUENTRO ESPECIAL" : config.encounter === "final" ? "ENCUENTRO FINAL" : "";
        this.hud?.update({ level: this.roomIndex + 1, totalLevels: this.levels.count,
            score: getArcadeRun(this.game).getScore(this.runId), enemies: this.enemyManager?.aliveCount ?? 0,
            wave: this.waves?.waveNumber, totalWaves: this.waves?.totalWaves,
            special: getArcadeRun(this.game).getSpecialCharge(this.runId), specialRequired: SpecialAbilityConfig[this.character].killsRequired,
            specialState: this.specialAbilities?.ability.state, notice });
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
        const zoom = Math.max(0.1, Math.min((this.scale.width - 24) / this.roomWidth, (this.scale.height - 160) / this.roomHeight));
        camera.setZoom(zoom).centerOn(this.roomWidth / 2, this.roomHeight / 2 - 48 / zoom);
        const positionHUD = (text: Phaser.GameObjects.Text | null, x: number, y: number) => {
            text?.setScale(1 / zoom).setPosition(camera.width / 2 + (x - camera.width / 2) / zoom, camera.height / 2 + (y - camera.height / 2) / zoom);
        };
        this.hud?.layout();
        positionHUD(this.pauseButton, this.scale.width - 16, this.scale.width < 650 ? this.scale.height - 56 : 16);
    }
}

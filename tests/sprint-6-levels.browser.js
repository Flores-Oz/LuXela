import Phaser from 'phaser';
import { gameConfig } from '../src/config/gameConfig';
import { GameScene } from '../src/scenes/GameScene';
import { LevelManager } from '../src/levels/LevelManager';
import { levels } from '../src/levels/levels';
import { arcadeRooms } from '../src/data/rooms/arcadeRooms';
import { validateLevelCatalog } from '../src/levels/validateLevelConfig';
import { RoomBuilder } from '../src/world/RoomBuilder';
import { TileType } from '../src/types/RoomTypes';
import { Player } from '../src/entities/Player';
import { Enemy } from '../src/entities/enemies/Enemy';
import { EnemyManager } from '../src/systems/EnemyManager';
import { LineOfSight } from '../src/systems/LineOfSight';
import { createPlayerAnimations } from '../src/systems/PlayerAnimations';
import { createRobotAnimations } from '../src/systems/RobotAssets';

const checks = [];
const check = (name, value) => { if (!value) throw Error(name); checks.push(name); };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async predicate => { for (let i = 0; i < 300; i++) { if (predicate()) return; await delay(20); } throw Error('Timeout loading level'); };
window.sprint6LevelsResults = { status: 'running' };
const manager = new LevelManager();
const testDifficulty = new URLSearchParams(location.search).has('difficulty');
let generation = 0;

// Isolate room loading from progression (stage 5), retaining production asset loaders.
class LevelLoadScene extends GameScene {
    init(data = {}) { this.testIndex = data.index ?? 0; this.testCharacter = data.character ?? 'alex'; }
    create() {
        this.readyGeneration = 0;
        this.testRoom = manager.createRoom(this.testIndex);
        const config = manager.getLevel(this.testIndex);
        const builder = new RoomBuilder(this); builder.build(this.testRoom);
        this.testWalls = builder.getWalls(); this.testExits = builder.getExits();
        this.physics.world.setBounds(0, 0, this.testRoom.widthInPixels, this.testRoom.heightInPixels);
        createPlayerAnimations(this); createRobotAnimations(this);
        const spawn = this.testRoom.findTile(TileType.PlayerSpawn);
        this.testPlayer = new Player(this, spawn.column * 64 + 32, spawn.row * 64 + 32, this.testCharacter);
        this.testEnemies = this.physics.add.group();
        this.testEnemyManager = new EnemyManager(this, this.testEnemies);
        for (const position of config.enemies.spawns) {
            const enemy = new Enemy(this, position.column * 64 + 32, position.row * 64 + 32, position.type, config.difficulty);
            this.testEnemyManager.add(enemy); enemy.playIdle();
        }
        this.testEnemyManager.start();
        this.physics.add.collider(this.testPlayer.physicsSprite, this.testWalls);
        this.physics.add.collider(this.testEnemies, this.testWalls);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.testEnemyManager.destroy());
        const zoom = Math.min((this.scale.width - 24) / this.testRoom.widthInPixels, (this.scale.height - 80) / this.testRoom.heightInPixels);
        this.cameras.main.setZoom(zoom).centerOn(this.testRoom.widthInPixels / 2, this.testRoom.heightInPixels / 2);
        this.readyGeneration = ++generation;
    }
    update() {} // Drive AI explicitly in tests using controlled timestamps.
}

const game = new Phaser.Game({ ...gameConfig, type: Phaser.CANVAS, scene: [LevelLoadScene] });
window.sprint6LevelsGame = game;
try {
    await until(() => game.scene.getScene('GameScene')?.readyGeneration > 0);
    check('Five valid configurations', levels.length === 5 && validateLevelCatalog(levels, arcadeRooms).length === 0);
    check('Five distinct distributions', new Set(levels.map(level => JSON.stringify(arcadeRooms[level.roomId]))).size === 5);
    check('Expected large-room counts 6, 8, 10, 12, 14', levels.map(level => level.enemies.count).join() === '6,8,10,12,14');
    check('No duplicate robot spawn source in maps', Object.values(arcadeRooms).every(matrix => matrix.flat().every(tile => tile !== TileType.RobotSpawn)));
    if (testDifficulty) {
        check('Movement speed increases at every level', levels.every((level, index) => index === 0 || level.difficulty.moveSpeed > levels[index - 1].difficulty.moveSpeed));
        check('Detection increases at every level', levels.every((level, index) => index === 0 || level.difficulty.detectionRange > levels[index - 1].difficulty.detectionRange));
        check('Shot interval decreases at every level', levels.every((level, index) => index === 0 || level.difficulty.shootCooldown < levels[index - 1].difficulty.shootCooldown));
    }
    for (const index of [-1, 5, NaN, 0.5]) {
        let rejected = false; try { manager.getLevel(index); } catch { rejected = true; }
        check(`Reject invalid index ${index}`, rejected);
    }
    const independent = manager.createRoom(0),originalSpawn=independent.findTile(TileType.PlayerSpawn); independent.matrix[originalSpawn.row][originalSpawn.column] = TileType.Wall;
    check('Room load does not mutate original map', manager.createRoom(0).matrix[originalSpawn.row][originalSpawn.column] === TileType.PlayerSpawn);
    for (const tileSize of [0, -1, Infinity]) {
        let rejected = false; try { manager.createRoom(0, tileSize); } catch { rejected = true; }
        check(`Reject invalid tile size ${tileSize}`, rejected);
    }
    for (const character of ['alex', 'lua']) {
        for (let index = 0; index < manager.count; index++) {
            const previous = generation;
            game.scene.getScene('GameScene').scene.restart({ index, character });
            await until(() => game.scene.getScene('GameScene').readyGeneration > previous);
            const scene = game.scene.getScene('GameScene'), config = manager.getLevel(index);
            await delay(60);
            const label = `${character}, level ${index + 1}`;
            check(`${label}: correct player texture`, scene.testPlayer.physicsSprite.texture.key === `${character}-walk`);
            check(`${label}: correct enemy count`, scene.testEnemyManager.aliveCount === config.enemies.count && scene.testEnemies.getLength() === config.enemies.count);
            check(`${label}: configured tile positions`, scene.testEnemies.getChildren().every((enemy, i) => enemy.x === config.enemies.spawns[i].column * 64 + 32 && enemy.y === config.enemies.spawns[i].row * 64 + 32));
            const obstacles = scene.testWalls.getChildren().map(wall => wall.body);
            const overlaps = body => obstacles.some(wall => Phaser.Geom.Intersects.RectangleToRectangle(body, wall));
            check(`${label}: bodies outside walls`, !overlaps(scene.testPlayer.physicsSprite.body) && scene.testEnemies.getChildren().every(enemy => !overlaps(enemy.body)));
            check(`${label}: spawn outside initial detection`, scene.testEnemies.getChildren().every(enemy => !enemy.detectPlayer(scene.testPlayer.physicsSprite)));
            check(`${label}: exit and complete room loaded`, scene.testExits.getLength() === 1 && scene.physics.world.bounds.width === scene.testRoom.widthInPixels && scene.physics.world.bounds.height === scene.testRoom.heightInPixels);
            check(`${label}: no residual dynamic bodies`, scene.physics.world.bodies.size === config.enemies.count + 1);
            check(`${label}: no duplicated colliders`, scene.physics.world.colliders.getActive().length === 2);
            // Drive each robot toward the left boundary with actual Arcade physics.
            let robot = scene.testEnemies.getChildren()[0];
            robot.setPosition(87, 160); robot.body.reset(87, 160); robot.moveLeft();
            await delay(180);
            check(`${label}: wall blocks robot movement`, robot.body.left >= 63.9);
            robot.stop();
            check(`${label}: wall occludes detection line`, !new LineOfSight(scene.testWalls).hasLineOfSight({ x: 32, y: 160 }, { x: 96, y: 160 }));
            if (testDifficulty) {
                const difficulty = config.difficulty;
                // Probe the basic soldier's level scaling independently of the room's featured color.
                robot = new Enemy(scene,160,160,'robot-red',difficulty);
                scene.testEnemyManager.add(robot);
                const player = scene.testPlayer;
                const sight = new LineOfSight(scene.testWalls);
                robot.body.reset(160, 160);
                check(`${label}: configured detection boundary`,
                    robot.detectPlayer({ x: robot.x + difficulty.detectionRange - 1, y: robot.y }) &&
                    !robot.detectPlayer({ x: robot.x + difficulty.detectionRange + 1, y: robot.y }));
                robot.moveRight();
                check(`${label}: configured movement velocity`, robot.body.velocity.x === difficulty.moveSpeed && robot.body.velocity.y === 0);
                robot.stop();
                player.physicsSprite.body.reset(224, 160);
                const time = 10000;
                const firstShot = robot.updateBehavior(player, sight, time);
                check(`${label}: visible player produces normalized shot`, firstShot?.length === 1 && firstShot[0].direction.x === 1 && firstShot[0].direction.y === 0);
                check(`${label}: no shot before configured cooldown`, robot.updateBehavior(player, sight, time + difficulty.shootCooldown - 1) === null);
                check(`${label}: shot resumes at configured cooldown`, robot.updateBehavior(player, sight, time + difficulty.shootCooldown) !== null);
                player.physicsSprite.body.reset(32, 160);
                check(`${label}: wall blocks shooting despite detection`, robot.updateBehavior(player, sight, time + difficulty.shootCooldown * 2) === null && robot.hasDetectedPlayer());
                player.physicsSprite.body.reset(850, 160);
                robot.updateBehavior(player, sight, time + difficulty.shootCooldown * 3);
                check(`${label}: patrol uses configured speed outside detection`, !robot.hasDetectedPlayer() && robot.body.velocity.length() === difficulty.moveSpeed);
                const alive = scene.testEnemyManager.aliveCount;
                robot.die(); robot.die();
                check(`${label}: one hit kills once and stops shooting`, robot.isDead() && !robot.body.enable && robot.body.velocity.length() === 0 && scene.testEnemyManager.aliveCount === alive - 1 && robot.updateBehavior(player, sight, time + 10000) === null);
                player.die(); player.die();
                check(`${label}: player still dies on one hit`, player.isDead() && !player.physicsSprite.body.enable);
            }
        }
    }
    window.sprint6LevelsResults = { status: 'passed', count: checks.length, checks };
} catch (error) {
    window.sprint6LevelsResults = { status: 'failed', count: checks.length, checks, error: String(error.stack ?? error) };
}

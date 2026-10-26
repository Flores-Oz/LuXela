import Phaser from 'phaser';
import { gameConfig } from '../src/config/gameConfig';
import { levels } from '../src/levels/levels';
import { CharacterUnlockService } from '../src/systems/CharacterUnlockService';
import { CHARACTER_CODES } from '../src/config/CharacterUnlockConfig';
import { NarrativeSaveService } from '../src/narrative/NarrativeSaveService';
import { getArcadeRun } from '../src/systems/ArcadeRunService';
import { Projectile } from '../src/entities/Projectile';
import { CombatEvents } from '../src/systems/CombatEvents';
import { SpecialAbilityConfig } from '../src/config/SpecialAbilityConfig';
import { RoomBuilder } from '../src/world/RoomBuilder';
import { LevelManager } from '../src/levels/LevelManager';
import { LineOfSight } from '../src/systems/LineOfSight';

const campaignScore=levels.reduce((sum,level)=>sum+level.waves.reduce((n,wave)=>n+wave.enemies.count*level.scorePerEnemy,0),0);
const checks = [];
const check = (name, condition) => { if (!condition) throw Error(name); checks.push(name); };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async predicate => { for (let i = 0; i < 400; i++) { if (predicate()) return; await delay(20); } throw Error('Sprint 7 timeout'); };
const memory = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }; };
const unlocks = new CharacterUnlockService(memory), saves = new NarrativeSaveService(undefined, memory);
for (const code of Object.values(CHARACTER_CODES)) unlocks.redeem(code);
const game = new Phaser.Game({ ...gameConfig, type: Phaser.CANVAS, callbacks: { preBoot(game) {
    game.registry.set('character-unlock-service', unlocks); game.registry.set('narrative-save-service', saves);
} } });
window.sprint7Game = game; window.sprint7Results = { status: 'running' };
const active = key => game.scene.isActive(key);
const scene = () => game.scene.getScene('GameScene');
const button = (root, label) => [...document.querySelectorAll(`${root} button`)].find(button => button.textContent === label);
const quiet = () => scene().enemyManager.getLivingEnemies().forEach(enemy => { enemy.stop(); enemy.updateBehavior = () => null; });
const entered = async (index, oldPlayer) => { await until(() => active('GameScene') && scene().roomIndex === index && scene().player && (!oldPlayer || scene().player !== oldPlayer)); quiet(); await delay(40); return scene(); };
const waveReady = async number => { await until(() => scene().waves.state === 'active' && scene().waves.waveNumber === number); quiet(); await delay(30); };
const pause = async () => { scene().pauseGame(); await until(() => game.scene.isPaused('GameScene') && document.querySelector('.pause-screen')); };
const resume = async () => { button('.pause-screen', 'Continuar').click(); await until(() => active('GameScene') && !active('PauseScene')); };

async function run() {
    await until(() => active('MainMenuScene') && document.querySelector('.main-screen'));
    for (const character of ['alex', 'lua']) {
        button('.main-screen', 'Comenzar').click(); await until(() => document.querySelector('.character-select'));
        document.querySelector(`[data-character=${character}]`).click(); document.querySelector('.select-start').click();
        await until(() => active('VisualNovelScene') && document.querySelector('.vn-skip'));
        check(`${character}: original intro route`, game.scene.getScene('VisualNovelScene').sequence.id === `${character}_test`);
        document.querySelector('.vn-skip').click(); let current = await entered(0);
        const runs = getArcadeRun(game), runId = current.runId, narrative = JSON.stringify(saves.get(character));
        let score = 0;
        check(`${character}: new run starts at 0/10 and time does not charge`, runs.getSpecialCharge(runId) === 0 && !current.specialAbilities.ability.activate());
        current.specialAbilities.update(100000); check(`${character}: no timed recharge`, runs.getSpecialCharge(runId) === 0 && current.specialAbilities.ability.state === 'locked');
        for (let roomIndex = 0; roomIndex < levels.length; roomIndex++) {
            current = scene(); const config = levels[roomIndex], label = `${character} room ${roomIndex + 1}`;
            if(config.availability==='reserved'||config.boss) {
                check(`${label}: boss arena without normal waves or premature victory`,current.waves===null&&current.enemyManager.aliveCount===0&&!runs.canComplete(character,runId)&&runs.getScore(runId)===campaignScore&&JSON.stringify(saves.get(character))===narrative);
                current.roomCleared();current.changeRoom();
                check(`${label}: boss exit remains locked and clearly identified`,current.doors.currentState==='locked'&&!current.isChangingRoom&&current.hud.text.text.includes('QUIMERA'));
                await pause();button('.pause-screen','Volver al menú principal').click();
                await until(()=>active('MainMenuScene')&&document.querySelector('.main-screen'));
                break;
            }
            let cleared = 0, ended = 0;
            const onCleared = () => cleared++, onEnded = () => ended++;
            current.events.on(CombatEvents.ROOM_CLEARED, onCleared);
            current.events.on(CombatEvents.WAVE_COMPLETED, onEnded);
            check(`${label}: session and configured order`, current.runId === runId && current.character === character && current.roomIndex + 1 === config.order);
            check(`${label}: locked visible door`, current.doors.currentState === 'locked' && !current.doors.canUse());
            check(`${label}: special encounter notice`, config.encounter !== 'special' || current.hud.text.text.includes('ENCUENTRO ESPECIAL'));
            current.changeRoom(); current.changeRoom(); check(`${label}: blocked transition`, !current.isChangingRoom);
            for (let waveIndex = 0; waveIndex < config.waves.length; waveIndex++) {
                await waveReady(waveIndex + 1); current = scene();
                const wave = config.waves[waveIndex], waveLabel = `${label} wave ${waveIndex + 1}`;
                check(`${waveLabel}: exactly one configured group`, current.enemyManager.aliveCount === wave.enemies.count && current.waves.aliveCount === wave.enemies.count);
                check(`${waveLabel}: real HUD values`, current.hud.text.text.includes(`OLEADA ${waveIndex + 1} / ${config.waves.length}`) && current.hud.text.text.includes(`ENEMIGOS ${wave.enemies.count}`) && current.hud.text.text.includes(`ESPECIAL ${runs.getSpecialCharge(runId)} / 10`));
                check(`${waveLabel}: no duplicate start`, !current.waves.start());
                const walls = current.walls.getChildren().map(wall => wall.body);
                const living = current.enemyManager.getLivingEnemies();
                check(`${waveLabel}: safe physical positions`, living.every(enemy => !walls.some(wall => Phaser.Geom.Intersects.RectangleToRectangle(enemy.body, wall)) && Math.hypot(enemy.x - current.player.x, enemy.y - current.player.y) >= config.difficulty.detectionRange + 63));
                check(`${waveLabel}: no duplicate spawn identity`, new Set(living.map(enemy => enemy.getData('level-enemy-id'))).size === wave.enemies.count);
                if (roomIndex === 2 && waveIndex === 0) {
                    check(`${character}: ten kills survive rooms and waves`, runs.getSpecialCharge(runId) === 10 && current.specialAbilities.ability.state === 'ready');
                    if (character === 'alex') {
                        const oldPlayer = current.player;
                        const stopped = current.waves;
                        current.specialAbilities.ability.activate(); current.specialAbilities.update(100);
                        current.player.die(); await until(() => active('GameOverScene'));
                        check('Death during charge has no victory', !active('CompletionScene') && !active('VisualNovelScene') && !scene().player);
                        game.scene.getScene('GameOverScene').input.keyboard.emit('keydown-ENTER'); current = await entered(roomIndex, oldPlayer);
                        check('Retry restores room score and charge checkpoint', current.runId === runId && runs.getScore(runId) === score && runs.getSpecialCharge(runId) === 10 && current.waves.waveNumber === 1);
                        // Own listeners were removed on shutdown; attach to the rebuilt encounter.
                        cleared = 0; ended = 0;
                        current.events.off(CombatEvents.ROOM_CLEARED, onCleared).on(CombatEvents.ROOM_CLEARED, onCleared);
                        current.events.off(CombatEvents.WAVE_COMPLETED, onEnded).on(CombatEvents.WAVE_COMPLETED, onEnded);
                        stopped.update(100000);
                        check('Stopped encounter cannot spawn after death', stopped.state === 'stopped');
                    }
                }
                const useSpecial = (roomIndex === 2 || roomIndex === 4) && waveIndex === 0;
                const residual = new Projectile(current, 160, 160, new Phaser.Math.Vector2(0, 1), 'enemy', current.enemyProjectiles);
                if (useSpecial) {
                    const manager = current.specialAbilities;
                    if (manager.ability.cooldownRemaining > 0) {
                        check(`${waveLabel}: ten kills alone do not bypass the cooldown`,!manager.ability.activate());
                        manager.update(manager.ability.cooldownRemaining);
                    }
                    const targets = current.enemyManager.getLivingEnemies().map(enemy => ({ x: enemy.x, y: enemy.y }));
                    check(`${waveLabel}: special consumes charge once`, manager.ability.activate() && runs.getSpecialCharge(runId) === 0 && !manager.ability.activate());
                    manager.update(SpecialAbilityConfig[character].chargeMs);
                    check(`${waveLabel}: current wave only is eliminated`, current.enemyManager.aliveCount === 0 && current.waves.state === 'starting');
                    if (character === 'alex') check(`${waveLabel}: original green impacts at targets`, JSON.stringify(manager.impactPositions) === JSON.stringify(targets) && current.playerProjectiles.getLength() === 0);
                    else check(`${waveLabel}: original electrical effect`, manager.electricity.commandBuffer.length > 0 && current.playerProjectiles.getLength() === 0);
                    current.waves.update(100000);
                    check(`${waveLabel}: no wave spawns during special animation`, current.waves.state === 'starting' && current.enemyManager.aliveCount === 0);
                    manager.update(SpecialAbilityConfig[character].durationMs + SpecialAbilityConfig[character].recoveryMs);
                    check(`${waveLabel}: special kills refill to the configured charge cap`, runs.getSpecialCharge(runId) === Math.min(SpecialAbilityConfig[character].killsRequired,wave.enemies.count));
                } else {
                    const enemies = current.enemyManager.getLivingEnemies();
                    for (const enemy of enemies.slice(0, -1)) enemy.die();
                    check(`${waveLabel}: last robot blocks next wave`, current.waves.state === 'active' && current.waves.aliveCount === 1);
                    const last = enemies.at(-1);
                    new Projectile(current, last.x - 18, last.y, new Phaser.Math.Vector2(1, 0), 'player', current.playerProjectiles);
                    await until(() => current.enemyManager.aliveCount === 0);
                    const charge = runs.getSpecialCharge(runId), points = runs.getScore(runId);
                    last.die(); check(`${waveLabel}: repeated death is ignored`, runs.getSpecialCharge(runId) === charge && runs.getScore(runId) === points && !current.waves.defeat(last.getData('level-enemy-id')));
                }
                score += wave.enemies.count * config.scorePerEnemy;
                check(`${waveLabel}: score accumulates with wave identity`, runs.getScore(runId) === score);
                check(`${waveLabel}: residual projectiles removed`, !residual.physicsBody.active && current.enemyProjectiles.getLength() === 0 && current.playerProjectiles.getLength() === 0);
                check(`${waveLabel}: one wave completion event`, ended === waveIndex + 1);
                if (waveIndex < config.waves.length - 1) {
                    check(`${waveLabel}: room stays locked between waves`, current.doors.currentState === 'locked' && cleared === 0 && current.waves.state === 'starting');
                    current.changeRoom(); check(`${waveLabel}: cannot escape between waves`, !current.isChangingRoom);
                    if (roomIndex === 1 && waveIndex === 0) {
                        await pause(); const wait = current.waves.waitMs;
                        await delay(100); check(`${character}: pause freezes wave preparation`, current.waves.waitMs === wait && current.enemyManager.aliveCount === 0);
                        await resume(); check(`${character}: resume retains charge`, runs.getSpecialCharge(runId) === Math.min(10, score / 100));
                    }
                    const nextSpawn = config.waves[waveIndex + 1].enemies.spawns[0];
                    current.player.physicsSprite.body.reset((nextSpawn.column + .5) * 64, (nextSpawn.row + .5) * 64);
                    current.waves.update(1000); await waveReady(waveIndex + 2);
                }
            }
            check(`${label}: only final wave unlocks door`, current.waves.isComplete && cleared === 1 && current.doors.currentState === 'unlocked' && current.hud.text.text.includes('SALIDA DISPONIBLE'));
            current.events.off(CombatEvents.ROOM_CLEARED, onCleared); current.events.off(CombatEvents.WAVE_COMPLETED, onEnded);
            const doors = current.doors, oldPlayer = current.player, oldManager = current.specialAbilities;
            // A real exit overlap starts the first and final transitions; repeated calls exercise the others.
            if (roomIndex === 0 || roomIndex === levels.length - 1) {
                const exit=config.exits[0].position;
                oldPlayer.physicsSprite.body.reset((exit.column+.5)*64,(exit.row+.5)*64);
            } else { current.changeRoom(); current.changeRoom(); }
            if (roomIndex < levels.length - 1) {
                current = await entered(roomIndex + 1, oldPlayer);
                check(`${label}: one transition preserves score and character`, current.runId === runId && current.character === character && runs.getScore(runId) === score);
                check(`${label}: previous door and effects stopped`, doors.currentState === 'transitioning' && !doors.beginTransition() && oldManager.destroyed && !oldPlayer.physicsSprite.active);
                check(`${label}: stable collision and event registrations`, current.physics.world.colliders.getActive().length === (current.bossEncounter?9:7) && current.input.keyboard.listenerCount('keydown-ESC') === 1 && current.events.listenerCount(CombatEvents.ENEMY_DEFEATED) === 1);
            } else {
                await until(() => active('CompletionScene') && document.querySelector('.completion-screen'));
                check(`${character}: all configured eliminations recorded`, score === campaignScore && runs.getScore(runId) === campaignScore);
                check(`${character}: final completion belongs to correct route`, runs.canComplete(character, runId) && document.querySelector('.completion-screen .presentation-eyebrow').textContent.toLowerCase().includes(character));
                check(`${character}: no new narrative or residual game`, !active('GameScene') && !active('VisualNovelScene') && JSON.stringify(saves.get(character)) === narrative && !oldPlayer.physicsSprite.active);
                button('.completion-screen', 'Volver al menú principal').click(); await until(() => active('MainMenuScene') && document.querySelector('.main-screen'));
                check(`${character}: victory consumed`, !runs.canComplete(character, runId));
            }
        }
    }
    game.scene.getScene('MainMenuScene').scene.start('GameScene', { character: 'alex' });
    let current = await entered(0); current.enemyManager.defeatLivingEnemies();
    const firstPlayer = current.player; current.changeRoom(); current = await entered(1, firstPlayer);
    const runs = getArcadeRun(game), oldId = current.runId;
    current.enemyManager.defeatLivingEnemies();
    const pending = current.waves, deadPlayer = current.player;
    check('Death fixture has a pending wave and capped kill charge', pending.state === 'starting' && runs.getSpecialCharge(oldId) === Math.min(10,levels[0].enemies.count+levels[1].enemies.count));
    current.player.die(); await until(() => active('GameOverScene'));
    pending.update(100000);
    check('Death between waves cancels all scheduled spawns', pending.state === 'stopped' && !scene().player && !active('CompletionScene'));
    game.scene.getScene('GameOverScene').input.keyboard.emit('keydown-ENTER'); current = await entered(1, deadPlayer);
    check('Retry begins first wave with room entry charge and score', current.waves.waveNumber === 1 && current.enemyManager.aliveCount === levels[1].enemies.count && runs.getSpecialCharge(oldId) === levels[0].enemies.count && runs.getScore(oldId) === levels[0].enemies.count*levels[0].scorePerEnemy);
    const restartedPlayer = current.player, restartedWaves = current.waves;
    await pause(); button('.pause-screen', 'Reiniciar partida').click(); current = await entered(0, restartedPlayer);
    check('Restart from advanced room resets room, wave, score and charge', current.runId !== oldId && current.waves.waveNumber === 1 && current.enemyManager.aliveCount === levels[0].enemies.count && runs.getScore(current.runId) === 0 && runs.getSpecialCharge(current.runId) === 0);
    check('Restart stops previous encounter and releases pause overlay', restartedWaves.state === 'stopped' && !active('PauseScene') && !document.querySelector('.pause-screen'));
    current.enemyManager.getLivingEnemies()[0].die(); const abandonedId = current.runId;
    await pause(); button('.pause-screen', 'Volver al menú principal').click(); await until(() => active('MainMenuScene') && document.querySelector('.main-screen'));
    check('Menu abandons combat without preserving run counters', !scene().player && runs.getSpecialCharge(abandonedId) === 0 && runs.getScore(abandonedId) === 0);
    class RendererTest extends Phaser.Scene {
        constructor() { super('RendererTest'); }
        create() {
            try {
                const manager = new LevelManager(), room = manager.createRoom(0), config = manager.getLevel(0);
                let metadata, colors = [];
                const renderer = { begin: (layout, presentation) => { metadata = { layout, presentation }; }, floor() {}, wall() {}, door: () => ({ setState: state => colors.push(state) }) };
                const builder = new RoomBuilder(this, renderer); builder.build(room, config.exits, config.presentation);
                check('Renderer receives reusable physical layout and future layer references', metadata.layout.walls.length > 0 && metadata.presentation.layers.collision === 'collision');
                check('Invisible wall bodies do not depend on any texture', builder.getWalls().getChildren().every(wall => wall.type === 'Zone' && wall.body.enable && !wall.visible));
                const wall=builder.getWalls().getChildren().find(wall=>!wall.getData('room-perimeter'));
                check('No visual renderer still has wall occlusion', !new LineOfSight(builder.getWalls()).hasLineOfSight({ x: wall.x-80, y: wall.y }, { x: wall.x+80, y: wall.y }));
                const doors = builder.getDoors(); doors.unlock(); doors.beginTransition();
                check('Door visual states are independent from trigger body', colors.join() === 'locked,unlocked,transitioning' && builder.getExits().getChildren()[0].body.enable);
                let duplicate = false; try { builder.build(room); } catch { duplicate = true; }
                check('Builder prevents duplicate physical initialization', duplicate);
                this.testDone = true;
            } catch (error) { this.testError = String(error.stack); this.testDone = true; }
        }
    }
    game.scene.add('RendererTest', RendererTest, true);
    await until(() => game.scene.getScene('RendererTest').testDone);
    if (game.scene.getScene('RendererTest').testError) throw Error(game.scene.getScene('RendererTest').testError);
    game.scene.stop('RendererTest');
    // Leave a safe production scene for native input and layout checks.
    game.scene.getScene('MainMenuScene').scene.start('GameScene', { character: 'alex' }); await entered(0);
    window.sprint7Results = { status: 'passed', count: checks.length, checks };
}
run().catch(error => { window.sprint7Results = { status: 'failed', count: checks.length, checks, error: String(error.stack ?? error) }; });

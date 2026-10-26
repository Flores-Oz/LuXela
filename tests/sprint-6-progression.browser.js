import Phaser from 'phaser';
import { gameConfig } from '../src/config/gameConfig';
import { levels } from '../src/levels/levels';
import { LevelManager } from '../src/levels/LevelManager';
import { ArcadeRunService, getArcadeRun } from '../src/systems/ArcadeRunService';
import { CharacterUnlockService } from '../src/systems/CharacterUnlockService';
import { CHARACTER_CODES } from '../src/config/CharacterUnlockConfig';
import { NarrativeSaveService } from '../src/narrative/NarrativeSaveService';
import { Projectile } from '../src/entities/Projectile';
import { CombatEvents } from '../src/systems/CombatEvents';
import { startNarrative } from '../src/narrative/startNarrative';
import { SpecialAbilityConfig } from '../src/config/SpecialAbilityConfig';

const checks = [];
const check = (name, value) => { if (!value) throw Error(name); checks.push(name); };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async predicate => { for (let i = 0; i < 400; i++) { if (predicate()) return; await delay(20); } throw Error('Timeout in progression'); };
const memory = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
const unlocks = new CharacterUnlockService(memory), saves = new NarrativeSaveService(undefined, memory);
unlocks.redeem(CHARACTER_CODES.alex); unlocks.redeem(CHARACTER_CODES.lua);
window.sprint6ProgressionResults = { status: 'running' };
const game = new Phaser.Game({ ...gameConfig, type: Phaser.CANVAS, callbacks: { preBoot(game) {
    game.registry.set('character-unlock-service', unlocks); game.registry.set('narrative-save-service', saves);
} } });
window.sprint6ProgressionGame = game;
const active = key => game.scene.isActive(key);
const scene = () => game.scene.getScene('GameScene');
const button = (root, label) => [...document.querySelectorAll(`${root} button`)].find(button => button.textContent === label);
const entered = async (index, oldPlayer) => {
    await until(() => active('GameScene') && scene().roomIndex === index && scene().player && (!oldPlayer || scene().player !== oldPlayer));
    // Isolate lifecycle tests from AI difficulty (covered separately in stage 4).
    scene().enemies.getChildren().forEach(enemy => { enemy.stop(); enemy.updateBehavior = () => null; });
    await delay(30); return scene();
};
const pause = async () => { scene().pauseGame(); await until(() => game.scene.isPaused('GameScene') && document.querySelector('.pause-screen')); };

async function run() {
    await until(() => active('MainMenuScene') && document.querySelector('.main-screen'));
    const manager = new LevelManager();
    check('Next index has no wraparound', manager.nextIndex(0) === 1 && manager.nextIndex(4) === null);
    const service = new ArcadeRunService(); const id = service.begin('alex');
    check('Run count follows catalog', service.roomCount === levels.length);
    check('Cannot skip uncleared level', !service.advance(id, 0));
    service.clearRoom(id, 4);
    check('Cannot clear or finish unvisited level', !service.finish(id, 4));
    service.clearRoom(id, 0);
    check('Advance once only', service.advance(id, 0) && !service.advance(id, 0));
    check('Cannot resume another room or character', !service.continue(id, 'alex', 2) && !service.continue(id, 'lua', 1));
    service.defeat(id);
    check('Cannot advance defeated session', !service.advance(id, 1));
    check('Retry valid current room', service.continue(id, 'alex', 1));
    for (let index = 1; index < levels.length; index++) {
        service.clearRoom(id, index);
        if (index < levels.length - 1) check(`Service advances level ${index + 1}`, service.advance(id, index));
    }
    check('Victory recorded once', service.finish(id, 4) && !service.finish(id, 4));
    check('Victory belongs to character and run', service.canComplete('alex', id) && !service.canComplete('lua', id) && !service.canComplete('alex', id + 1));
    check('Victory cannot resume gameplay', !service.continue(id, 'alex', 4));
    const retryService = new ArcadeRunService(); const retryId = retryService.begin('alex');
    retryService.clearRoom(retryId, 0); retryService.defeat(retryId); retryService.continue(retryId, 'alex', 0);
    check('Retry invalidates clearance of rebuilt room', !retryService.advance(retryId, 0));
    const scored = new ArcadeRunService(2), scoredId = scored.begin('alex');
    check('Score starts at zero', scored.getScore(scoredId) === 0);
    check('Kill is awarded once', scored.awardKill(scoredId, 0, 'robot-0', 100) && !scored.awardKill(scoredId, 0, 'robot-0', 100) && scored.getScore(scoredId) === 100);
    check('Invalid awards are rejected', !scored.awardKill(scoredId, 1, 'robot-1', 100) && !scored.awardKill(scoredId + 1, 0, 'robot-1', 100) && !scored.awardKill(scoredId, 0, 'robot-1', NaN) && !scored.awardKill(scoredId, 0, 'robot-1', -1));
    scored.clearRoom(scoredId, 0); scored.advance(scoredId, 0); scored.awardKill(scoredId, 1, 'robot-0', 100);
    check('Level score accumulates across rooms', scored.getScore(scoredId) === 200);
    scored.defeat(scoredId); scored.continue(scoredId, 'alex', 1);
    check('Retry rolls back only current room points', scored.getScore(scoredId) === 100 && scored.awardKill(scoredId, 1, 'robot-0', 100));
    scored.continue(scoredId, 'alex', 1);
    check('Narrative rebuild restores room entry score', scored.getScore(scoredId) === 100);

    for (const character of ['alex', 'lua']) {
        button('.main-screen', 'Comenzar').click(); await until(() => document.querySelector('.character-select'));
        document.querySelector(`[data-character=${character}]`).click(); document.querySelector('.select-start').click();
        await until(() => active('VisualNovelScene') && document.querySelector('.vn-skip'));
        check(`${character}: intro preserved`, game.scene.getScene('VisualNovelScene').sequence.id === `${character}_test`);
        document.querySelector('.vn-skip').click();
        let gameplay = await entered(0); const runId = gameplay.runId;
        check(`${character}: starts with three robots`, gameplay.enemyManager.aliveCount === 3 && getArcadeRun(game).currentRunId(character) === runId);
        const narrativeSnapshot = JSON.stringify(saves.get(character));
        let completedScore = 0;
        for (let index = 0; index < levels.length; index++) {
            gameplay = scene(); const config = levels[index], label = `${character}, level ${index + 1}`;
            check(`${label}: correct count and character`, gameplay.enemyManager.aliveCount === config.enemies.count && gameplay.character === character && gameplay.runId === runId);
            check(`${label}: exact configured AI`, gameplay.enemies.getChildren().every(enemy => enemy.moveSpeed === config.difficulty.moveSpeed && enemy.detectionRange === config.difficulty.detectionRange && enemy.shootCooldown === config.difficulty.shootCooldown));
            check(`${label}: HUD has level, score and enemy count`, gameplay.hud.text.text.includes(`NIVEL ${index + 1} / 5`) && gameplay.hud.text.text.includes(`PUNTOS ${completedScore}`) && gameplay.hud.text.text.includes(`ENEMIGOS ${config.enemies.count}`) && getArcadeRun(game).getScore(runId) === completedScore && !gameplay.specialAbilities.hud.visible);
            gameplay.changeRoom(); gameplay.changeRoom(); await delay(30);
            check(`${label}: living robots block exit`, gameplay.roomIndex === index && !gameplay.isChangingRoom);
            if (index === 1) {
                // Test the narrative bridge against the catalog's fifth valid index separately below.
                const oldPlayer = gameplay.player;
                gameplay.enemyManager.getLivingEnemies()[0].die();
                check(`${character}: partial room score is visible`, getArcadeRun(game).getScore(runId) === completedScore + config.scorePerEnemy && gameplay.hud.text.text.includes(`ENEMIGOS ${config.enemies.count - 1}`));
                const lethal = new Projectile(gameplay, oldPlayer.physicsSprite.body.center.x, oldPlayer.physicsSprite.body.center.y, new Phaser.Math.Vector2(0, 1), 'enemy', gameplay.enemyProjectiles);
                await until(() => active('GameOverScene'));
                check(`${character}: one enemy projectile causes defeat`, !lethal.physicsBody.active && !active('CompletionScene') && !active('VisualNovelScene'));
                game.scene.getScene('GameOverScene').input.keyboard.emit('keydown-ENTER');
                gameplay = await entered(index, oldPlayer);
                check(`${character}: retry preserves current level and run`, gameplay.roomIndex === index && gameplay.runId === runId && gameplay.character === character && gameplay.enemyManager.aliveCount === config.enemies.count && !gameplay.player.isDead());
                check(`${character}: retry has no residual shots`, gameplay.playerProjectiles.getLength() === 0 && gameplay.enemyProjectiles.getLength() === 0);
                check(`${character}: retry restores score checkpoint`, getArcadeRun(game).getScore(runId) === completedScore && gameplay.hud.text.text.includes(`PUNTOS ${completedScore}`));
                for (let cycle = 0; cycle < 3; cycle++) {
                    const player = gameplay.player;
                    await pause(); await delay(30);
                    check(`${character}: pause ${cycle + 1} freezes current scene`, game.scene.isPaused('GameScene') && gameplay.player === player && gameplay.roomIndex === index);
                    button('.pause-screen', 'Continuar').click();
                    await until(() => active('GameScene') && !active('PauseScene'));
                    check(`${character}: resume ${cycle + 1} keeps one listener`, gameplay.input.keyboard.listenerCount('keydown-ESC') === 1 && game.scene.getScenes(true).length === 1 && !document.querySelector('.pause-screen'));
                }
            }
            if (index === 4) {
                const oldPlayer = gameplay.player;
                gameplay.enemyManager.getLivingEnemies()[0].die();
                startNarrative(gameplay, { route: character, resume: false, returnTo: { roomIndex: index } });
                await until(() => active('VisualNovelScene') && document.querySelector('.vn-skip'));
                check(`${character}: narrative bridge accepts fifth level`, game.scene.getScene('VisualNovelScene').request.returnTo.roomIndex === 4);
                document.querySelector('.vn-skip').click(); gameplay = await entered(index, oldPlayer);
                check(`${character}: bridge preserves fifth level and session`, gameplay.runId === runId && gameplay.enemyManager.aliveCount === config.enemies.count);
                check(`${character}: bridge rolls back rebuilt room score`, getArcadeRun(game).getScore(runId) === completedScore);
            }
            const enemies = gameplay.enemyManager.getLivingEnemies();
            let cleared = 0; gameplay.events.once(CombatEvents.ROOM_CLEARED, () => cleared++);
            for (const enemy of enemies.slice(0, -1)) enemy.die();
            check(`${label}: last living enemy prevents clearance`, gameplay.enemyManager.aliveCount === 1 && !gameplay.enemyManager.isCleared);
            const last = enemies.at(-1);
            const residual = new Projectile(gameplay, 160, 160, new Phaser.Math.Vector2(0, 1), 'enemy', gameplay.enemyProjectiles);
            const hit = new Projectile(gameplay, last.x - 18, last.y, new Phaser.Math.Vector2(1, 0), 'player', gameplay.playerProjectiles);
            await until(() => gameplay.enemyManager.isCleared);
            last.die();
            completedScore += config.enemies.count * config.scorePerEnemy;
            check(`${label}: exact score without duplicate death awards`, getArcadeRun(game).getScore(runId) === completedScore && gameplay.hud.text.text.includes(`PUNTOS ${completedScore}`) && gameplay.hud.text.text.includes('ENEMIGOS 0'));
            check(`${label}: last projectile hit clears once`, last.isDead() && cleared === 1 && gameplay.enemyManager.aliveCount === 0);
            check(`${label}: clearance removes residual bullets`, !hit.physicsBody.active && !residual.physicsBody.active && gameplay.playerProjectiles.getLength() === 0 && gameplay.enemyProjectiles.getLength() === 0);
            check(`${label}: waits for exit after clearance`, active('GameScene') && !gameplay.isChangingRoom && !active('CompletionScene'));
            const oldPlayer = gameplay.player, oldEnemies = gameplay.enemies.getChildren().slice();
            // Exercise the real exit overlap at the first and final levels.
            if (index === 0 || index === 4) {
                const exit = gameplay.levels.createRoom(index).findTile(4);
                oldPlayer.physicsSprite.body.reset(exit.column * 64 + 32, exit.row * 64 + 32);
            } else { gameplay.changeRoom(); gameplay.changeRoom(); }
            if (index < 4) {
                gameplay = await entered(index + 1, oldPlayer);
                check(`${label}: transitions exactly one level`, gameplay.roomIndex === index + 1 && gameplay.runId === runId && gameplay.character === character);
                check(`${label}: old bodies destroyed`, !oldPlayer.physicsSprite.active && oldEnemies.every(enemy => !enemy.active));
                check(`${label}: new level starts without projectiles`, gameplay.playerProjectiles.getLength() === 0 && gameplay.enemyProjectiles.getLength() === 0);
                check(`${label}: stable collider and listener count`, gameplay.physics.world.colliders.getActive().length === 7 && gameplay.events.listenerCount(CombatEvents.ROOM_CLEARED) === 1 && gameplay.input.keyboard.listenerCount('keydown-ESC') === 1);
                check(`${label}: transition preserves score without cleanup awards`, getArcadeRun(game).getScore(runId) === completedScore);
            } else {
                await until(() => active('CompletionScene') && document.querySelector('.completion-screen'));
                check(`${character}: fifth exit shows test conclusion`, document.querySelector('.completion-screen h1').textContent === 'Niveles de prueba completados');
                check(`${character}: no narrative ending or gameplay remains`, !active('VisualNovelScene') && !active('GameScene') && !oldPlayer.physicsSprite.active && oldEnemies.every(enemy => !enemy.active));
                check(`${character}: conclusion has valid result and route`, getArcadeRun(game).canComplete(character, runId) && document.querySelector('.presentation-eyebrow').textContent.toLowerCase().includes(character));
                check(`${character}: no ending checkpoint written`, saves.get(character)?.sequenceId === `${character}_test` && saves.get(character)?.status === JSON.parse(narrativeSnapshot).status);
                button('.completion-screen', 'Volver al menú principal').click(); await until(() => active('MainMenuScene') && document.querySelector('.main-screen'));
                check(`${character}: returning to menu consumes victory`, !getArcadeRun(game).canComplete(character, runId));
            }
        }
    }
    game.scene.getScene('MainMenuScene').scene.start('CompletionScene', { character: 'alex', runId: 999999 });
    await delay(100); await until(() => active('MainMenuScene'));
    check('Forged completion is rejected', !active('CompletionScene'));
    game.scene.getScene('MainMenuScene').scene.start('GameScene', { character: 'alex', roomIndex: 4 });
    let gameplay = await entered(0);
    check('New run cannot enter fifth level by scene data', gameplay.roomIndex === 0 && gameplay.enemyManager.aliveCount === 3);
    const oldRun = gameplay.runId;
    await pause(); button('.pause-screen', 'Reiniciar partida').click(); gameplay = await entered(0, gameplay.player);
    check('Pause restart creates new run at level one', gameplay.runId !== oldRun && gameplay.character === 'alex' && gameplay.enemyManager.aliveCount === 3);
    const countBeforeDestroy = gameplay.enemyManager.aliveCount;
    gameplay.enemyManager.getLivingEnemies()[0].destroy();
    check('Destroying a live robot gives no score', getArcadeRun(game).getScore(gameplay.runId) === 0 && gameplay.enemyManager.aliveCount === countBeforeDestroy - 1 && gameplay.hud.text.text.includes(`ENEMIGOS ${countBeforeDestroy - 1}`));
    await pause(); button('.pause-screen', 'Volver al menú principal').click(); await until(() => active('MainMenuScene') && document.querySelector('.main-screen'));
    check('Pause menu removes game and pause scenes', !active('GameScene') && !active('PauseScene') && !scene().player);
    for (const character of ['alex', 'lua']) {
        game.scene.getScene('MainMenuScene').scene.start('GameScene', { character });
        gameplay = await entered(0);
        const special = gameplay.specialAbilities, oldPlayer = gameplay.player;
        special.ability.activate(); special.update(SpecialAbilityConfig[character].chargeMs);
        check(`${character}: existing special clears configured room`, gameplay.enemyManager.isCleared && gameplay.playerProjectiles.getLength() === 0);
        gameplay.changeRoom(); gameplay.changeRoom(); gameplay = await entered(1, oldPlayer);
        check(`${character}: special cooldown crosses one transition`, gameplay.specialAbilities.ability.state === 'cooldown' && gameplay.specialAbilities.ability.cooldownRemaining > 0 && gameplay.specialAbilities.ability.cooldownRemaining <= SpecialAbilityConfig[character].cooldownMs);
        check(`${character}: old special cannot affect new enemies`, special.destroyed && gameplay.enemyManager.aliveCount === 4 && !gameplay.player.isDead());
        check(`${character}: special awards configured points once`, getArcadeRun(game).getScore(gameplay.runId) === levels[0].enemies.count * levels[0].scorePerEnemy);
        await pause(); button('.pause-screen', 'Volver al menú principal').click();
        await until(() => active('MainMenuScene') && document.querySelector('.main-screen'));
    }
    window.sprint6ProgressionResults = { status: 'passed', count: checks.length, checks };
}
run().catch(error => { window.sprint6ProgressionResults = { status: 'failed', count: checks.length, checks, error: String(error.stack ?? error) }; });

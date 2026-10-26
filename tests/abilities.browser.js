import { levels } from '../src/levels/levels';
import Phaser from 'phaser';
import { gameConfig } from '../src/config/gameConfig';
import { CharacterUnlockService } from '../src/systems/CharacterUnlockService';
import { CHARACTER_CODES } from '../src/config/CharacterUnlockConfig';
import { getArcadeRun } from '../src/systems/ArcadeRunService';
import { SpecialAbilityConfig as config } from '../src/config/SpecialAbilityConfig';
import { Projectile } from '../src/entities/Projectile';
import { CombatEvents } from '../src/systems/CombatEvents';

const checks = [], check = (name, value) => { if (!value) throw Error(name); checks.push(name); };
window.abilityResults = { status: 'running' };
const game = new Phaser.Game({ ...gameConfig, type: Phaser.CANVAS, scale: { mode: Phaser.Scale.NONE }, scene: [{ key: 'AbilityTestBoot', create() {
    const unlocks = new CharacterUnlockService(() => ({ getItem: () => null, setItem() {} }));
    for (const code of Object.values(CHARACTER_CODES)) unlocks.redeem(code);
    this.game.registry.set('character-unlock-service', unlocks); this.scene.start('GameScene', { character: 'alex' });
} }, ...gameConfig.scene] });
window.abilityGame = game;
let now = 1000;
const tick = (count = 1) => { for (let i = 0; i < count; i++) game.scene.update(now += 1000 / 60, 1000 / 60); };
// Seed only the ability under test; complete real charging routes are covered in sprint-7.browser.js.
const prime = scene => { for (let i = 0; i < 10; i++) getArcadeRun(game).awardKill(scene.runId, scene.roomIndex, `fixture-${i}`, 0); };
async function run() {
    while (!game.scene.isActive('GameScene')) await new Promise(r => setTimeout(r, 20));
    game.loop.sleep(); let scene = game.scene.getScene('GameScene'); scene.sys.sceneUpdate = () => {};
    check('Original eight-frame atlases remain intact', ['alex', 'lua'].every(c => game.textures.get(`${c}-special`).getFrameNames().length === 8));
    for (const character of ['alex', 'lua']) {
        scene.scene.restart({ character }); tick(4); scene = game.scene.getScene('GameScene'); scene.sys.sceneUpdate = () => {};
        const manager = scene.specialAbilities, ability = manager.ability, runs = getArcadeRun(game);
        check(`${character}: correct ability and no timed availability`, ability.constructor.name === (character === 'alex' ? 'AlexSpecial' : 'LuaSpecial') && ability.state === 'locked' && !ability.activate());
        prime(scene); const enemies = scene.enemyManager.getLivingEnemies();
        let deaths = 0; for (const enemy of enemies) enemy.on(CombatEvents.ENEMY_DIED, () => deaths++);
        const wall=scene.walls.getChildren().find(wall=>!wall.getData('room-perimeter'));
        scene.player.physicsSprite.body.reset(wall.body.left-48,wall.y); enemies[0].body.reset(wall.body.right+128,wall.y);
        check(`${character}: wall occludes target before special`, !scene.lineOfSight.hasLineOfSight(scene.player, enemies[0]));
        const targets = enemies.map(enemy => ({ x: enemy.x, y: enemy.y }));
        check(`${character}: activation consumes kill charge once`, ability.activate() && runs.getSpecialCharge(scene.runId) === 0 && !ability.activate());
        manager.update(config[character].chargeMs - 1);
        check(`${character}: charging preserves living targets and original sprite`, scene.enemyManager.aliveCount === levels[0].enemies.count && manager.pose.visible && !scene.player.physicsSprite.visible && scene.player.physicsSprite.body.enable);
        scene.player.shootingKeys.UP.isDown = true; scene.player.update();
        check(`${character}: normal shooting waits during special`, scene.player.consumeShootRequest() === null); scene.player.shootingKeys.UP.isDown = false;
        manager.update(1);
        check(`${character}: one hit kills entire current wave through walls`, deaths === levels[0].enemies.count && scene.enemyManager.aliveCount === 0 && enemies.every(enemy => enemy.isDead()));
        check(`${character}: special creates no physical green bullets`, scene.playerProjectiles.getLength() === 0);
        check(`${character}: defeats replenish the configured wave count`, runs.getSpecialCharge(scene.runId) === levels[0].enemies.count);
        if (character === 'alex') {
            check('Alex green impacts use enemy coordinates', JSON.stringify(manager.impactPositions) === JSON.stringify(targets));
            manager.update(100); check('Alex machine gun animation advances', manager.pose.frame.name === '4');
            manager.update(config.alex.impactMs); check('Alex impact visuals expire', manager.impactPositions.length === 0 && manager.electricity.commandBuffer.length === 0);
        } else check('Lua original electricity remains visible', manager.electricity.commandBuffer.length > 0);
        scene.player.wasd.D.isDown = true; scene.player.update();
        check(`${character}: movement is preserved`, scene.player.physicsSprite.body.velocity.x === 220); scene.player.wasd.D.isDown = false;
        manager.update(config[character].durationMs + config[character].recoveryMs);
        check(`${character}: animation restores player while cooldown remains`, !manager.pose.visible && scene.player.physicsSprite.visible && ability.state === 'cooldown' && ability.cooldownRemaining > 0 && !ability.activate());
        manager.update(100000); check(`${character}: waiting does not recharge`, runs.getSpecialCharge(scene.runId) === levels[0].enemies.count && ability.state === 'locked');
        scene.player.shootingKeys.UP.isDown = true; scene.player.update();
        check(`${character}: normal shooting restored`, scene.player.consumeShootRequest() !== null); scene.player.shootingKeys.UP.isDown = false;
        const oldPlayer = scene.player; scene.changeRoom(); tick(4); scene = game.scene.getScene('GameScene'); scene.sys.sceneUpdate = () => {};
        check(`${character}: transition cleans visuals and preserves charge`, manager.destroyed && !manager.pose.scene && !manager.electricity.scene && scene.player !== oldPlayer && getArcadeRun(game).getSpecialCharge(scene.runId) === levels[0].enemies.count);
        scene.scene.restart({ character }); tick(4); scene = game.scene.getScene('GameScene'); scene.sys.sceneUpdate = () => {};
        const cancelled = scene.specialAbilities; prime(scene); cancelled.ability.activate(); cancelled.update(100);
        scene.player.die(); cancelled.update(10000);
        check(`${character}: death during charge cancels attack`, scene.enemyManager.aliveCount === levels[0].enemies.count && !cancelled.pose.visible && !cancelled.ability.performing && !cancelled.ability.activate());
        check(`${character}: defeat keeps original animation and disabled body`, scene.player.physicsSprite.visible && !scene.player.physicsSprite.body.enable && scene.player.physicsSprite.anims.currentAnim.key.includes('defeat'));
        scene.scene.restart({ character }); tick(4); scene = game.scene.getScene('GameScene'); scene.sys.sceneUpdate = () => {};
        prime(scene); const activeManager = scene.specialAbilities; activeManager.ability.activate(); activeManager.update(config[character].chargeMs);
        new Projectile(scene, scene.player.x, scene.player.y, new Phaser.Math.Vector2(1, 0), 'player', scene.playerProjectiles);
        scene.player.die();
        check(`${character}: death during attack clears effects and projectiles`, scene.playerProjectiles.getLength() === 0 && !activeManager.pose.visible && activeManager.electricity.commandBuffer.length === 0);
    }
    for (const character of ['alex','lua']) {
        scene.scene.restart({character});tick(4);scene=game.scene.getScene('GameScene');scene.sys.sceneUpdate=scene.update;
        const quiet=()=>scene.enemyManager.getLivingEnemies().forEach(enemy=>{enemy.stop();enemy.updateBehavior=()=>null;});quiet();
        const runs=getArcadeRun(game);prime(scene);
        check(`${character}: first ultimate is available at ten kills without an initial wait`,scene.specialAbilities.ability.activate());
        tick(250);
        const remaining=runs.getSpecialCooldown(scene.runId),id=scene.runId;
        check(`${character}: gameplay reduces the 45-second cooldown during the animation`,remaining>40000&&remaining<45000&&!scene.specialAbilities.ability.performing);
        scene.changeRoom();tick(4);scene=game.scene.getScene('GameScene');scene.sys.sceneUpdate=scene.update;quiet();
        check(`${character}: room transition preserves the active cooldown`,scene.runId===id&&runs.getSpecialCooldown(id)>remaining-200&&runs.getSpecialCooldown(id)<=remaining);
        scene.enemyManager.getLivingEnemies().slice(0,4).forEach(enemy=>enemy.die());
        check(`${character}: ten new real kills cannot bypass the cooldown`,runs.getSpecialCharge(id)===10&&scene.specialAbilities.ability.state==='cooldown'&&!scene.specialAbilities.ability.activate());
        check(`${character}: HUD shows both kill count and seconds remaining`,scene.hud.text.text.includes('ESPECIAL 10 / 10')&&scene.hud.text.text.includes('ESPERA'));
        scene.pauseGame();tick(3);const frozen=runs.getSpecialCooldown(id);tick(3600);
        check(`${character}: a full minute of paused frames does not advance the ultimate cooldown`,game.scene.isPaused('GameScene')&&runs.getSpecialCooldown(id)===frozen);
        [...document.querySelectorAll('.pause-screen button')].find(button=>button.textContent.trim()==='Continuar').click();tick(3);
        const manager=scene.specialAbilities;manager.update(runs.getSpecialCooldown(id)-1);
        check(`${character}: ultimate remains unavailable one millisecond before the cooldown ends`,manager.ability.cooldownRemaining>0&&!manager.ability.activate());
        manager.update(1);scene.updateHUD();
        check(`${character}: HUD announces readiness only when both requirements are met`,manager.ability.state==='ready'&&scene.hud.text.text.includes('LISTA [Q]'));
        check(`${character}: next activation consumes ten kills and restarts the 45-second wait`,manager.ability.activate()&&runs.getSpecialCharge(id)===0&&runs.getSpecialCooldown(id)===45000);
    }
    scene.scene.restart({ character: 'alex' }); tick(4); scene = game.scene.getScene('GameScene');
    scene.sys.sceneUpdate = scene.update; prime(scene);
    scene.enemyManager.getLivingEnemies().forEach(enemy => { enemy.stop(); enemy.updateBehavior = () => null; });
    game.loop.wake(); window.abilityResults = { status: 'passed', count: checks.length, checks };
}
run().catch(error => { window.abilityResults = { status: 'failed', count: checks.length, checks, error: String(error.stack ?? error) }; });

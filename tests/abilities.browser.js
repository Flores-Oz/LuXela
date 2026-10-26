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
        scene.player.physicsSprite.body.reset(352, 288); enemies[0].body.reset(480, 288);
        check(`${character}: wall occludes target before special`, !scene.lineOfSight.hasLineOfSight(scene.player, enemies[0]));
        const targets = enemies.map(enemy => ({ x: enemy.x, y: enemy.y }));
        check(`${character}: activation consumes kill charge once`, ability.activate() && runs.getSpecialCharge(scene.runId) === 0 && !ability.activate());
        manager.update(config[character].chargeMs - 1);
        check(`${character}: charging preserves living targets and original sprite`, scene.enemyManager.aliveCount === 3 && manager.pose.visible && !scene.player.physicsSprite.visible && scene.player.physicsSprite.body.enable);
        scene.player.shootingKeys.UP.isDown = true; scene.player.update();
        check(`${character}: normal shooting waits during special`, scene.player.consumeShootRequest() === null); scene.player.shootingKeys.UP.isDown = false;
        manager.update(1);
        check(`${character}: one hit kills entire current wave through walls`, deaths === 3 && scene.enemyManager.aliveCount === 0 && enemies.every(enemy => enemy.isDead()));
        check(`${character}: special creates no physical green bullets`, scene.playerProjectiles.getLength() === 0);
        check(`${character}: defeats replenish only three charge points`, runs.getSpecialCharge(scene.runId) === 3);
        if (character === 'alex') {
            check('Alex green impacts use enemy coordinates', JSON.stringify(manager.impactPositions) === JSON.stringify(targets));
            manager.update(100); check('Alex machine gun animation advances', manager.pose.frame.name === '4');
            manager.update(config.alex.impactMs); check('Alex impact visuals expire', manager.impactPositions.length === 0 && manager.electricity.commandBuffer.length === 0);
        } else check('Lua original electricity remains visible', manager.electricity.commandBuffer.length > 0);
        scene.player.wasd.D.isDown = true; scene.player.update();
        check(`${character}: movement is preserved`, scene.player.physicsSprite.body.velocity.x === 220); scene.player.wasd.D.isDown = false;
        manager.update(config[character].durationMs + config[character].recoveryMs);
        check(`${character}: animation restores player without timed recharge`, !manager.pose.visible && scene.player.physicsSprite.visible && ability.state === 'locked' && !ability.activate());
        manager.update(100000); check(`${character}: waiting does not recharge`, runs.getSpecialCharge(scene.runId) === 3 && ability.state === 'locked');
        scene.player.shootingKeys.UP.isDown = true; scene.player.update();
        check(`${character}: normal shooting restored`, scene.player.consumeShootRequest() !== null); scene.player.shootingKeys.UP.isDown = false;
        const oldPlayer = scene.player; scene.changeRoom(); tick(4); scene = game.scene.getScene('GameScene'); scene.sys.sceneUpdate = () => {};
        check(`${character}: transition cleans visuals and preserves charge`, manager.destroyed && !manager.pose.scene && !manager.electricity.scene && scene.player !== oldPlayer && getArcadeRun(game).getSpecialCharge(scene.runId) === 3);
        scene.scene.restart({ character }); tick(4); scene = game.scene.getScene('GameScene'); scene.sys.sceneUpdate = () => {};
        const cancelled = scene.specialAbilities; prime(scene); cancelled.ability.activate(); cancelled.update(100);
        scene.player.die(); cancelled.update(10000);
        check(`${character}: death during charge cancels attack`, scene.enemyManager.aliveCount === 3 && !cancelled.pose.visible && !cancelled.ability.performing && !cancelled.ability.activate());
        check(`${character}: defeat keeps original animation and disabled body`, scene.player.physicsSprite.visible && !scene.player.physicsSprite.body.enable && scene.player.physicsSprite.anims.currentAnim.key.includes('defeat'));
        scene.scene.restart({ character }); tick(4); scene = game.scene.getScene('GameScene'); scene.sys.sceneUpdate = () => {};
        prime(scene); const activeManager = scene.specialAbilities; activeManager.ability.activate(); activeManager.update(config[character].chargeMs);
        new Projectile(scene, scene.player.x, scene.player.y, new Phaser.Math.Vector2(1, 0), 'player', scene.playerProjectiles);
        scene.player.die();
        check(`${character}: death during attack clears effects and projectiles`, scene.playerProjectiles.getLength() === 0 && !activeManager.pose.visible && activeManager.electricity.commandBuffer.length === 0);
    }
    scene.scene.restart({ character: 'alex' }); tick(4); scene = game.scene.getScene('GameScene');
    scene.sys.sceneUpdate = scene.update; prime(scene);
    scene.enemyManager.getLivingEnemies().forEach(enemy => { enemy.stop(); enemy.updateBehavior = () => null; });
    game.loop.wake(); window.abilityResults = { status: 'passed', count: checks.length, checks };
}
run().catch(error => { window.abilityResults = { status: 'failed', count: checks.length, checks, error: String(error.stack ?? error) }; });

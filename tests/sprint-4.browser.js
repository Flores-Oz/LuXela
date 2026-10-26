import Phaser from 'phaser';
import { gameConfig } from '../src/config/gameConfig';
import { CharacterUnlockService } from '../src/systems/CharacterUnlockService';
import { NarrativeSaveService } from '../src/narrative/NarrativeSaveService';
import { CHARACTER_CODES } from '../src/config/CharacterUnlockConfig';
import { SpecialAbilityConfig } from '../src/config/SpecialAbilityConfig';
import { Projectile } from '../src/entities/Projectile';
import { getArcadeRun } from '../src/systems/ArcadeRunService';

const checks = [];
const check = (name, condition) => { if (!condition) throw new Error(name); checks.push(name); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async predicate => {
    for (let i = 0; i < 400; i++) { if (predicate()) return; await pause(20); }
    throw new Error('Tiempo de espera agotado en integración Sprint 4');
};
window.sprint4Results = { status: 'running' };
// These services never access real player storage.
const memory = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; };
const unlockStore = memory(), narrativeStore = memory();
const unlocks = new CharacterUnlockService(() => unlockStore);
const saves = new NarrativeSaveService(undefined, () => narrativeStore);
const game = new Phaser.Game({ ...gameConfig, type: Phaser.CANVAS, scale: { mode: Phaser.Scale.NONE },
    scene: [{ key: 'Sprint4TestBoot', create() {
        this.game.registry.set('character-unlock-service', unlocks);
        this.game.registry.set('narrative-save-service', saves);
        this.scene.start('CharacterSelectScene');
    } }, ...gameConfig.scene] });
window.sprint4Game = game;
const active = key => game.scene.isActive(key);
const gameplay = () => game.scene.getScene('GameScene');
const selector = () => document.querySelector('.character-select');
const quietEnemies = scene => scene.enemies.getChildren().forEach(enemy => { enemy.stop(); enemy.updateBehavior = () => null; });
const enterGameplay = async () => { await until(() => active('GameScene') && gameplay().player); quietEnemies(gameplay()); await pause(40); return gameplay(); };
const metrics = scene => ({ bodies: scene.physics.world.bodies.size, walls: scene.physics.world.staticBodies.size,
    colliders: scene.physics.world.colliders.getActive().length,
    keys: Object.values(scene.input.keyboard.keys).filter(Boolean).length,
    children: scene.children.list.length });
// Isolated ability regression fixture; real kill charging is tested by the Sprint 7 routes.
const prime = scene => { for (let i=0;i<10;i++) getArcadeRun(scene.game).awardKill(scene.runId,scene.roomIndex,`fixture-${i}`,0); };

async function run() {
    await until(() => active('CharacterSelectScene') && selector());
    check('Inicio real sin permisos ni gameplay', !unlocks.isUnlocked('alex') && !unlocks.isUnlocked('lua') && !active('GameScene'));
    for (const character of ['alex', 'lua']) {
        const root = selector();
        root.querySelector('input').value = CHARACTER_CODES[character];
        root.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        root.querySelector(`[data-character="${character}"]`).click();
        root.querySelector('.select-start').click();
        await until(() => active('VisualNovelScene') && document.querySelector('.intro-screen'));
        check(`${character}: desbloqueo conecta con ruta correcta`, unlocks.isUnlocked(character) && game.scene.getScene('VisualNovelScene').sequence.route === character && !active('GameScene'));
        if (character === 'alex') {
            for (let i = 0; i < 8 && active('VisualNovelScene'); i++) {
                document.querySelector('.intro-next')?.click(); await pause(30);
            }
        } else document.querySelector('.vn-skip').click();
        let scene = await enterGameplay();
        check(`${character}: narrativa conecta con entidad y habilidad correctas`, scene.character === character &&
            scene.player.physicsSprite.texture.key === `${character}-walk` && scene.specialAbilities.ability.constructor.name === (character === 'alex' ? 'AlexSpecial' : 'LuaSpecial'));
        check(`${character}: narrativa registra finalización independiente`, saves.get(character)?.status === (character === 'alex' ? 'completed' : 'skipped'));
        check(`${character}: una escena y un solo jugador`, game.scene.getScenes(true).length === 1 && scene.children.list.filter(c => c.texture?.key === `${character}-walk`).length === 1 && !selector() && !document.querySelector('.intro-screen'));
        const oldManager = scene.specialAbilities;
        prime(scene);
        oldManager.ability.activate(); oldManager.update(SpecialAbilityConfig[character].chargeMs);
        check(`${character}: especial elimina habitación tras selección y narrativa`, scene.enemyManager.aliveCount === 0 && !scene.player.isDead() && scene.playerProjectiles.getLength() === 0);
        // Exercise actual enemy-shot overlap, defeat animation, Game Over and retry.
        const body = scene.player.physicsSprite.body;
        new Projectile(scene, body.center.x, body.center.y, new Phaser.Math.Vector2(0, 1), 'enemy', scene.enemyProjectiles);
        await until(() => active('GameOverScene'));
        check(`${character}: impacto durante especial llega a Game Over y libera efectos`, oldManager.destroyed && !oldManager.pose.scene && !oldManager.electricity.scene && !active('GameScene'));
        const over = game.scene.getScene('GameOverScene');
        over.children.list.find(child => child.text === '[ REINTENTAR ]').emit('pointerdown');
        scene = await enterGameplay();
        check(`${character}: reintento conserva personaje y restablece combate`, scene.character === character && scene.roomIndex === 0 && !scene.player.isDead() && scene.enemyManager.aliveCount === 3 && scene.specialAbilities.ability.state === 'locked');
        check(`${character}: reintento no reproduce narrativa ni acumula atajos`, !active('VisualNovelScene') && over.input.keyboard.listenerCount('keydown-ENTER') === 0);
        scene.scene.start('CharacterSelectScene');
        await until(() => active('CharacterSelectScene') && selector());
        check(`${character}: retorno al selector conserva permisos y limpia HUD`, unlocks.isUnlocked(character) && !oldManager.hud.scene && game.scene.getScenes(true).length === 1);
    }
    check('Las dos rutas conservan progreso sin sobrescribirse', saves.get('alex')?.status === 'completed' && saves.get('lua')?.status === 'skipped');
    game.scene.getScene('CharacterSelectScene').scene.start('GameScene', { character: 'alex', roomIndex: 0 });
    let scene = await enterGameplay();
    const baseline = metrics(scene);
    for (let cycle = 0; cycle < 12; cycle++) {
        const character = cycle % 2 ? 'lua' : 'alex';
        const manager = scene.specialAbilities;
        prime(scene);
        manager.ability.activate(); manager.update(SpecialAbilityConfig[scene.character].chargeMs);
        scene.scene.restart({ character, roomIndex: 0 });
        await until(() => gameplay().specialAbilities && gameplay().specialAbilities !== manager && gameplay().character === character);
        scene = await enterGameplay();
        check(`Ciclo ${cycle + 1}: cuerpos, paredes, colliders, teclas y objetos estables`, JSON.stringify(metrics(scene)) === JSON.stringify(baseline));
        check(`Ciclo ${cycle + 1}: efectos anteriores destruidos y carga reiniciada`, manager.destroyed && !manager.pose.scene && !manager.electricity.scene && !manager.hud.scene && scene.specialAbilities.ability.state === 'locked' && game.scene.getScenes(true).length === 1);
    }
    window.sprint4Results = { status: 'passed', count: checks.length, checks, cycles: 12, baseline, renderer: 'Canvas' };
}
run().catch(error => { window.sprint4Results = { status: 'failed', checks, error: error.stack }; });

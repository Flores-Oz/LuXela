import Phaser from 'phaser';
import { gameConfig } from '../src/config/gameConfig';
import { CharacterUnlockService } from '../src/systems/CharacterUnlockService';
import { NarrativeSaveService } from '../src/narrative/NarrativeSaveService';
import { ArcadeRunService, getArcadeRun } from '../src/systems/ArcadeRunService';
import { CHARACTER_CODES } from '../src/config/CharacterUnlockConfig';
import { SpecialAbilityConfig } from '../src/config/SpecialAbilityConfig';
import { Projectile } from '../src/entities/Projectile';
import { loadIllustration } from '../src/narrative/VisualAssetCache';
import { startNarrative } from '../src/narrative/startNarrative';

const checks = [];
const check = (name, value) => { if (!value) throw new Error(name); checks.push(name); };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async predicate => { for (let i=0;i<400;i++) { if (predicate()) return; await delay(20); } throw new Error('Timeout de integración Sprint 5'); };
window.sprint5Results = { status:'running' };
const memory = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key,value) => map.set(key,value) }; };
const unlocks = new CharacterUnlockService(memory);
const saves = new NarrativeSaveService(undefined, memory);
const game = new Phaser.Game({ ...gameConfig, type:Phaser.CANVAS, callbacks:{ preBoot(game) {
    game.registry.set('character-unlock-service',unlocks); game.registry.set('narrative-save-service',saves);
} } });
window.sprint5Game = game;
const active = key => game.scene.isActive(key);
const scene = () => game.scene.getScene('GameScene');
const quiet = () => scene().enemies.getChildren().forEach(enemy => { enemy.stop(); enemy.updateBehavior=()=>null; });
const entered = async () => { await until(()=>active('GameScene') && scene().player); quiet(); await delay(40); return scene(); };
const button = (root,text) => [...document.querySelectorAll(`${root} button`)].find(b=>b.textContent===text);
const main = async () => { await until(()=>active('MainMenuScene') && document.querySelector('.main-screen')); };
const select = async character => {
    if (active('MainMenuScene')) { button('.main-screen','Comenzar').click(); await until(()=>document.querySelector('.character-select')); }
    document.querySelector(`[data-character=${character}]`).click(); document.querySelector('.select-start').click();
    await until(()=>active('VisualNovelScene') && document.querySelector('.intro-next'));
};
const pause = async () => { scene().pauseGame(); await until(()=>game.scene.isPaused('GameScene') && document.querySelector('.pause-screen')); await delay(30); };

async function run() {
    await main();
    check('Menú principal es el inicio, sin gameplay', !active('GameScene') && !unlocks.isUnlocked('alex') && !unlocks.isUnlocked('lua'));
    check('Tema compartido aplicado al menú', document.querySelector('.main-screen').style.getPropertyValue('--ui-accent') === '#b4dfbd');
    check('Canvas ocupa el viewport', game.canvas.width===innerWidth && game.canvas.height===innerHeight);
    const cacheA=loadIllustration('assets/sprites/player/alex-special-background.png');
    check('Ilustraciones reutilizan la misma carga', cacheA===loadIllustration('assets/sprites/player/alex-special-background.png'));
    await cacheA;
    button('.main-screen','Comenzar').click(); await until(()=>document.querySelector('.character-select'));
    for (const character of ['alex','lua']) {
        document.querySelector('#character-code').value=CHARACTER_CODES[character];
        document.querySelector('.select-code').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    }
    for (const character of ['alex','lua']) {
        await select(character);
        const narrative=game.scene.getScene('VisualNovelScene');
        check(`${character}: introducción independiente y provisional`, narrative.sequence.route===character && narrative.sequence.provisional && !active('GameScene'));
        check(`${character}: fondo y personaje correctos`, narrative.background.currentKey===`${character}-intro` && document.querySelector(`.vn-portrait[data-character=${character}]`));
        const root=document.querySelector('.intro-screen').getBoundingClientRect();
        check(`${character}: narrativa ocupa toda la pantalla`, Math.abs(root.width-innerWidth)<2 && Math.abs(root.height-innerHeight)<2);
        if (character==='alex') {
            document.querySelector('.intro-next').click();
            check('Completar texto no salta el diálogo', narrative.runner.position===2 && !narrative.runner.dialogue.isTyping);
            for (let i=0;i<5 && active('VisualNovelScene');i++) { document.querySelector('.intro-next')?.click(); await delay(30); }
        } else document.querySelector('.vn-skip').click();
        let gameplay=await entered();
        check(`${character}: entrada conserva personaje, permiso y una sola escena`, gameplay.character===character && unlocks.isUnlocked(character) && game.scene.getScenes(true).length===1);
        const initialRun=gameplay.runId;
        gameplay.changeRoom(); await delay(50);
        check(`${character}: salida bloqueada con robots vivos`, gameplay.roomIndex===0 && !gameplay.isChangingRoom);
        gameplay.player.physicsSprite.body.reset(352,352);
        gameplay.player.wasd.D.isDown=true;
        const shot=new Projectile(gameplay,352,352,new Phaser.Math.Vector2(1,0),'player',gameplay.playerProjectiles);
        gameplay.specialAbilities.ability.activate();
        await pause();
        const snapshot={ player:gameplay.player.x, robot:gameplay.enemies.getChildren()[0].x, shot:shot.physicsBody.x,
            state:gameplay.specialAbilities.ability.state, elapsed:gameplay.specialAbilities.ability.elapsed, timer:shot.expiration.elapsed };
        await delay(character==='alex'?2200:150);
        check(`${character}: pausa congela jugador, enemigos, balas, habilidad y temporizadores`, gameplay.player.x===snapshot.player && gameplay.enemies.getChildren()[0].x===snapshot.robot && shot.physicsBody.x===snapshot.shot && shot.physicsBody.active && gameplay.specialAbilities.ability.state===snapshot.state && gameplay.specialAbilities.ability.elapsed===snapshot.elapsed && shot.expiration.elapsed===snapshot.timer);
        check(`${character}: gameplay visible detrás de la pausa y menú operativo`, game.scene.isVisible('GameScene') && document.querySelectorAll('.pause-screen button').length===3);
        button('.pause-screen','Continuar').click(); await until(()=>active('GameScene') && !active('PauseScene')); await delay(70);
        check(`${character}: continuar libera entrada sin arrastre ni eventos duplicados`, !document.querySelector('.pause-screen') && !gameplay.player.wasd.D.isDown && gameplay.input.keyboard.listenerCount('keydown-ESC')===1);
        await pause(); button('.pause-screen','Reiniciar partida').click();
        await until(()=>active('GameScene') && scene().runId!==initialRun); gameplay=await entered();
        check(`${character}: reiniciar pausa crea partida nueva en primera habitación`, gameplay.character===character && gameplay.roomIndex===0 && gameplay.enemyManager.aliveCount===2 && gameplay.specialAbilities.ability.state==='ready' && !active('PauseScene'));
        const manager=gameplay.specialAbilities;
        manager.ability.activate(); manager.update(SpecialAbilityConfig[character].chargeMs);
        check(`${character}: especial sigue siendo letal de habitación sin balas especiales`, gameplay.enemyManager.isCleared && gameplay.playerProjectiles.getLength()===0);
        gameplay.changeRoom(); await until(()=>scene().roomIndex===1 && scene().player && scene().specialAbilities!==manager); gameplay=await entered();
        check(`${character}: segunda habitación conserva personaje y sesión`, gameplay.character===character && gameplay.enemyManager.isCleared);
        const introProgress=saves.get(character);
        gameplay.changeRoom(); await until(()=>active('VisualNovelScene') && game.scene.getScene('VisualNovelScene').sequence?.id===`${character}_ending`);
        check(`${character}: solo victoria válida activa cierre y detiene gameplay`, !active('GameScene') && getArcadeRun(game).canComplete(character,gameplay.runId));
        document.querySelector('.vn-skip').click(); await until(()=>active('CompletionScene') && document.querySelector('.completion-screen'));
        check(`${character}: conclusión identifica ruta y botones funcionan`, document.querySelector('.completion-screen .presentation-eyebrow').textContent.toLowerCase().includes(character) && document.querySelectorAll('.completion-screen button').length===2);
        check(`${character}: cierre no sobrescribe progreso de introducción`, JSON.stringify(saves.get(character))===JSON.stringify(introProgress));
        const validRun=gameplay.runId;
        button('.completion-screen',character==='alex'?'Elegir otro personaje':'Volver al menú principal').click();
        await until(()=>character==='alex'?active('CharacterSelectScene'):active('MainMenuScene'));
        check(`${character}: navegación final invalida resultado consumido`, !getArcadeRun(game).canComplete(character,validRun));
        if (character==='lua') await main();
    }
    game.scene.getScene('MainMenuScene').scene.start('CompletionScene',{character:'alex',runId:99999}); await delay(100); await main();
    check('Datos de escena no fabrican una victoria', !active('CompletionScene'));
    game.scene.getScene('MainMenuScene').scene.start('VisualNovelScene',{route:'alex',sequenceId:'alex_ending',destination:{kind:'completion',runId:99999}});
    await until(()=>active('CharacterSelectScene') && document.querySelector('.character-select'));
    check('Cierre narrativo rechaza destino sin victoria', !active('CompletionScene') && !active('VisualNovelScene'));
    await select('alex'); document.querySelector('.vn-skip').click(); let gameplay=await entered();
    const manager=gameplay.specialAbilities; gameplay.player.die(); await until(()=>active('GameOverScene'));
    check('Derrota conserva Game Over sin conclusión', !active('CompletionScene') && !active('VisualNovelScene') && manager.destroyed);
    game.scene.getScene('GameOverScene').input.keyboard.emit('keydown-ENTER'); gameplay=await entered();
    check('Reintento de derrota conserva personaje y controles', gameplay.character==='alex' && !gameplay.player.isDead() && gameplay.input.keyboard.listenerCount('keydown-ESC')===1);
    const listeners=gameplay.input.keyboard.listenerCount('keydown-ESC');
    for (let i=0;i<6;i++) {
        await pause(); button('.pause-screen','Continuar').click(); await until(()=>active('GameScene') && !active('PauseScene'));
        check(`Pausa repetida ${i+1}: una escena, un listener, sin overlay huérfano`, game.scene.getScenes(true).length===1 && gameplay.input.keyboard.listenerCount('keydown-ESC')===listeners && !document.querySelector('.pause-screen'));
    }
    await pause(); button('.pause-screen','Volver al menú principal').click(); await main();
    check('Menú desde pausa destruye gameplay y conserva desbloqueos', !active('GameScene') && !active('PauseScene') && !scene().player && unlocks.isUnlocked('alex') && unlocks.isUnlocked('lua'));
    const run=new ArcadeRunService(); const id=run.begin('alex'); run.clearRoom(id,1);
    check('No gana al omitir primera habitación', !run.finish(id,1)); run.clearRoom(id,0); run.defeat(id);
    check('Estado derrotado no puede ganar', !run.finish(id,1)); run.continue(id,'alex');
    check('Victoria exige salida final, no solo habitación despejada', !run.finish(id,0) && run.finish(id,1));
    check('Identidad de victoria no se mezcla entre personajes', run.canComplete('alex',id) && !run.canComplete('lua',id));
    // Safe gameplay for native Escape and viewport checks in the Node runner.
    button('.main-screen','Comenzar').click(); await until(()=>document.querySelector('.character-select'));
    await select('lua'); document.querySelector('.vn-skip').click(); await entered();
    const bridgeRunId=scene().runId;
    startNarrative(scene(),{route:'lua',resume:false,returnTo:{roomIndex:0}});
    await until(()=>active('VisualNovelScene') && document.querySelector('.vn-skip'));
    document.querySelector('.vn-skip').click(); await entered();
    check('Puente narrativo del personaje activo conserva identidad de partida', scene().runId===bridgeRunId && scene().character==='lua');
    window.sprint5Results={status:'passed',count:checks.length,checks};
}
run().catch(error=>{window.sprint5Results={status:'failed',checks,error:error.stack};});

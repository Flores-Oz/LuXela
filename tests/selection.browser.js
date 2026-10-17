import Phaser from 'phaser';
import { gameConfig } from '../src/config/gameConfig';
import { characters } from '../src/config/characters';
import { CHARACTER_CODES, CHARACTER_UNLOCK_STORAGE_KEY } from '../src/config/CharacterUnlockConfig';
import { CharacterUnlockService, getCharacterUnlocks } from '../src/systems/CharacterUnlockService';
import { NarrativeSaveService, getNarrativeSaves } from '../src/narrative/NarrativeSaveService';
import { NarrativeRouteManager } from '../src/narrative/NarrativeRouteManager';
import { NarrativeConfig } from '../src/config/NarrativeConfig';
import { testNarrativeEngine } from './visual-novel.browser.js';
import { startNarrative } from '../src/narrative/startNarrative';

const passed = [];
const check = (name, condition) => {
    if (!condition) throw new Error(name);
    passed.push(name);
};
const until = async condition => {
    for (let i = 0; i < 300; i++) {
        if (condition()) return;
        await new Promise(r => setTimeout(r, 20));
    }
    throw new Error('Tiempo agotado esperando la escena');
};
const memory = (initial = null) => {
    let saved = initial;
    return { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
};

// Namespace real localStorage so the suite never modifies a player's progress.
const storageKey = `test_${CHARACTER_UNLOCK_STORAGE_KEY}`;
const testStorage = {
    getItem: () => localStorage.getItem(storageKey),
    setItem: (_key, value) => localStorage.setItem(storageKey, value)
};
window.selectionStorageKey = storageKey;
const resume = new URLSearchParams(location.search).has('resume');
const narrativeStorageKey = `test_${NarrativeConfig.storageKey}`;
window.selectionNarrativeKey = narrativeStorageKey;
const narrativeStorage = {getItem: () => localStorage.getItem(narrativeStorageKey), setItem: (_key, value) => localStorage.setItem(narrativeStorageKey, value)};
if (!resume) { localStorage.removeItem(storageKey); localStorage.removeItem(narrativeStorageKey); }
window.selectionResults = { status: 'running' };

const game = new Phaser.Game({ ...gameConfig, type: Phaser.CANVAS,
    callbacks: { preBoot(game) {
        game.registry.set('character-unlock-service', new CharacterUnlockService(() => testStorage));
        game.registry.set('narrative-save-service', new NarrativeSaveService(new NarrativeRouteManager(), () => narrativeStorage));
    } }
});
window.selectionGame = game;
const active = key => game.scene.isActive(key);
const selector = () => game.scene.getScene('CharacterSelectScene');
const root = () => document.querySelector('.character-select');
const card = id => root().querySelector(`[data-character="${id}"]`);
const submit = code => {
    root().querySelector('input').value = code;
    root().querySelector('form').requestSubmit();
};
const start = async id => {
    card(id).click();
    root().querySelector('.select-start').click();
    await until(() => active('VisualNovelScene') && document.querySelector('.intro-next'));
    const intro = game.scene.getScene('VisualNovelScene');
    for (let i = 0; i < intro.runner.dialogueTotal * 2; i++) document.querySelector('.intro-next').click();
    await until(() => active('GameScene') && game.scene.getScene('GameScene').player);
};
window.resetSelectionProgress = async () => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(narrativeStorageKey);
    game.registry.set('narrative-save-service', new NarrativeSaveService(new NarrativeRouteManager(), () => narrativeStorage));
    game.registry.set('character-unlock-service', new CharacterUnlockService(() => testStorage));
    const before = root();
    game.scene.stop('GameScene');
    game.scene.stop('GameOverScene');
    game.scene.stop('VisualNovelScene');
    if (active('CharacterSelectScene')) selector().scene.restart();
    else game.scene.start('CharacterSelectScene');
    await until(() => active('CharacterSelectScene') && root() && root() !== before);
};

async function run() {
    await until(() => active('CharacterSelectScene') && root());
    if (resume) {
        const service = getCharacterUnlocks(game);
        check('Desbloqueos sobreviven recarga real de página', service.isUnlocked('alex') && service.isUnlocked('lua'));
        check('Selección no se impone tras recargar', root().querySelector('.select-start').disabled);
        check('Recarga recupera checkpoint Lua y progreso Alex separado', getNarrativeSaves(game).get('lua')?.entryIndex === 4 && getNarrativeSaves(game).get('lua')?.status === 'reading' && getNarrativeSaves(game).get('alex')?.status === 'skipped');
        return;
    }

    await testNarrativeEngine(game, check, until);

    const storage = memory();
    const service = new CharacterUnlockService(() => storage);
    check('Sin progreso: ambos bloqueados', !service.isUnlocked('alex') && !service.isUnlocked('lua'));
    check('Código vacío no cambia progreso', service.redeem('  ').status === 'empty' && !service.isUnlocked('alex'));
    check('Código incorrecto no desbloquea', service.redeem('INCORRECTO').status === 'invalid' && !service.isUnlocked('lua'));
    check('Códigos independientes', CHARACTER_CODES.alex !== CHARACTER_CODES.lua);
    check('Alex: normaliza espacios y minúsculas', service.redeem(`  ${CHARACTER_CODES.alex.toLowerCase()}  `).status === 'unlocked' &&
        service.isUnlocked('alex') && !service.isUnlocked('lua'));
    check('Código repetido es idempotente', service.redeem(CHARACTER_CODES.alex).status === 'already' && !service.isUnlocked('lua'));
    const savedAlex = new CharacterUnlockService(() => storage);
    check('Progreso serializado conserva solo Alex', savedAlex.isUnlocked('alex') && !savedAlex.isUnlocked('lua'));
    service.redeem(CHARACTER_CODES.lua);
    check('Lua desbloquea exclusivamente su estado', service.isUnlocked('alex') && service.isUnlocked('lua'));
    const copy = service.unlocks;
    copy.alex = false;
    check('Consulta no permite mutar estado interno', service.isUnlocked('alex'));
    check('Identificador inválido se rechaza', !service.isUnlocked('robot') && !service.isUnlocked(undefined));
    for (const corrupt of ['{', 'null', '[]', '{}', '{"alex":"true","lua":false}', '{"alex":true}']) {
        const invalid = new CharacterUnlockService(() => memory(corrupt));
        check(`Progreso corrupto seguro: ${corrupt}`, invalid.storageStatus === 'corrupt' && !invalid.isUnlocked('alex') && !invalid.isUnlocked('lua'));
    }
    const broken = new CharacterUnlockService(() => { throw new DOMException('denied', 'SecurityError'); });
    broken.redeem(CHARACTER_CODES.lua);
    check('localStorage inaccesible: desbloqueo en memoria', broken.storageStatus === 'unavailable' && broken.isUnlocked('lua') && !broken.isUnlocked('alex'));
    let writable = false;
    const retryStorage = memory();
    const retry = new CharacterUnlockService(() => ({
        getItem: retryStorage.getItem,
        setItem: (...args) => { if (!writable) throw new Error('quota'); retryStorage.setItem(...args); }
    }));
    retry.redeem(CHARACTER_CODES.alex);
    check('Fallo de escritura conserva sesión', retry.isUnlocked('alex') && retry.storageStatus === 'unavailable');
    writable = true;
    retry.redeem(CHARACTER_CODES.alex);
    check('Repetir código recupera guardado', retry.storageStatus === 'available' && new CharacterUnlockService(() => retryStorage).isUnlocked('alex'));

    check('Selector es primera escena y no hay jugador', active('CharacterSelectScene') && !active('GameScene'));
    check('Dos imágenes originales sin deformación', [...root().querySelectorAll('.card-portrait img')].every(img =>
        img.getAttribute('src') === characters[img.alt.toLowerCase()].selectorPath && getComputedStyle(img).objectFit === 'contain'));
    check('Tarjetas bloqueadas y comienzo deshabilitado', card('alex').getAttribute('aria-disabled') === 'true' &&
        card('lua').getAttribute('aria-disabled') === 'true' && root().querySelector('.select-start').disabled);
    card('alex').click();
    check('Clic no selecciona personaje bloqueado', selector().selected === null && root().querySelector('.select-start').disabled);
    selector().selected = 'alex';
    selector().startGame();
    check('Guardia del selector impide inicio forzado', !selector().starting);
    selector().selected = null;
    for (const data of [{ character: 'alex' }, { character: 'lua' }, {}, { character: 'robot' }]) {
        const before = root();
        selector().scene.start('GameScene', data);
        await until(() => active('CharacterSelectScene') && root() && root() !== before);
        check(`GameScene rechaza entrada sin permiso: ${JSON.stringify(data)}`, !active('GameScene') && !game.scene.getScene('GameScene').player);
        const beforeIntro = root();
        selector().scene.start('VisualNovelScene', {route: data.character});
        await until(() => active('CharacterSelectScene') && root() && root() !== beforeIntro);
        check(`VisualNovelScene rechaza entrada sin permiso: ${JSON.stringify(data)}`, !active('VisualNovelScene') && !document.querySelector('.intro-screen'));
    }
    const beforeGuard = root();
    selector().scene.start('GameOverScene', { character: 'alex', roomIndex: 0 });
    await until(() => active('CharacterSelectScene') && root() && root() !== beforeGuard);
    check('Game Over rechaza personaje bloqueado', !active('GameOverScene'));
    submit('');
    check('Formulario informa código vacío', root().querySelector('.select-message').classList.contains('is-error'));
    submit('NO-VALIDO');
    check('Formulario informa código inválido', root().querySelector('.select-message').textContent.includes('incorrecto'));
    submit(CHARACTER_CODES.alex.toLowerCase());
    check('Código Alex actualiza solo Alex y permite jugar', card('alex').classList.contains('is-unlocked') &&
        !card('lua').classList.contains('is-unlocked') && !root().querySelector('.select-start').disabled);
    card('lua').click();
    check('Lua bloqueada no sustituye selección de Alex', selector().selected === 'alex');
    submit(CHARACTER_CODES.alex);
    check('Código repetido informa sin error', root().querySelector('.select-message').textContent.includes('ya estaba') &&
        !root().querySelector('.select-message').classList.contains('is-error'));
    submit(CHARACTER_CODES.lua);
    check('Segundo código desbloquea Lua sin cambiar selección', card('lua').classList.contains('is-unlocked') && selector().selected === 'alex');
    card('lua').click();
    check('Seleccionar Lua actualiza indicador y botón', card('lua').getAttribute('aria-pressed') === 'true' &&
        card('alex').getAttribute('aria-pressed') === 'false' && root().querySelector('.select-start').textContent.includes('LUA'));
    const oldView = selector().view;
    root().querySelector('.select-start').click();
    selector().startGame();
    await until(() => active('VisualNovelScene') && document.querySelector('.intro-screen'));
    const intro = game.scene.getScene('VisualNovelScene');
    const introView = intro.view;
    check('Selector inicia ruta Lua sin combate', intro.sequence.route === 'lua' && !active('GameScene') && !active('CharacterSelectScene'));
    check('Selector libera formulario y callbacks', !root() && oldView.events.signal.aborted && selector().view === null);
    check('Muestra de prueba identificada', document.querySelector('.intro-draft').textContent.includes('PROVISIONAL'));
    check('Texto inicialmente progresivo y guion correcto', intro.runner.position === 2 && intro.runner.dialogue.current.text === 'Iniciando secuencia de prueba.');
    const next = document.querySelector('.intro-next');
    next.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
    next.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', repeat: true, bubbles: true, cancelable: true }));
    next.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
    check('Una pulsacion completa sin saltar entrada', intro.runner.position === 2 && !intro.runner.dialogue.isTyping);
    next.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
    next.dispatchEvent(new MouseEvent('click', { detail: 2, bubbles: true }));
    check('Doble clic no consume siguiente entrada', intro.runner.position === 2);
    check('Narrativa no crea jugador ni combate', !game.scene.getScene('GameScene').player && !active('GameScene'));
    next.click();
    check('Siguiente dialogo aplica expresion y posicion del guion', intro.runner.position === 4 && document.querySelector('.vn-center').dataset.expression === 'surprised');
    next.click();
    check('Linea final completa permite entrar', next.textContent === 'ENTRAR →');
    next.click(); intro.skip(); intro.advance();
    await until(() => active('GameScene') && game.scene.getScene('GameScene').player);
    let gameplay = game.scene.getScene('GameScene');
    check('Finalizar conserva Lua y un solo jugador', gameplay.character === 'lua' && gameplay.children.list.filter(c => c.texture?.key === 'lua-walk').length === 1);
    check('Final guarda estado completado solo en Lua', getNarrativeSaves(game).get('lua').status === 'completed' && !getNarrativeSaves(game).get('alex'));
    check('Motor libera eventos y managers al salir', !document.querySelector('.intro-screen') && introView.events.signal.aborted && intro.runner === null && intro.audio === null && introView.heldKeys.size === 0);
    gameplay.player.die();
    await until(() => active('GameOverScene'));
    game.scene.getScene('GameOverScene').children.list.find(c => c.text === 'CAMBIAR PERSONAJE').emit('pointerdown');
    await until(() => active('CharacterSelectScene') && root());
    check('Volver permite elegir y conserva desbloqueos', !selector().selected &&
        card('alex').classList.contains('is-unlocked') && card('lua').classList.contains('is-unlocked'));
    await start('alex');
    gameplay = game.scene.getScene('GameScene');
    check('Seleccionar Alex crea arte correcto', gameplay.character === 'alex' && gameplay.player.physicsSprite.texture.key === 'alex-walk');
    gameplay.changeRoom();
    await until(() => gameplay.roomIndex === 1 && gameplay.player);
    check('Cambio de habitación conserva Alex', gameplay.character === 'alex' && gameplay.player.physicsSprite.texture.key === 'alex-walk');
    gameplay.player.die();
    await until(() => active('GameOverScene'));
    game.scene.getScene('GameOverScene').input.keyboard.emit('keydown-ENTER');
    await until(() => active('GameScene') && gameplay.player);
    check('Reinicio conserva personaje y habitación desbloqueados', gameplay.character === 'alex' && gameplay.roomIndex === 1 && !gameplay.player.isDead());
    check('Reintento no vuelve a reproducir introducción', !active('VisualNovelScene') && !document.querySelector('.intro-screen'));

    // Re-enter and skip both characters; no stale dialogue or listeners remain.
    for (const id of ['alex', 'lua']) {
        gameplay.scene.start('CharacterSelectScene');
        await until(() => active('CharacterSelectScene') && root());
        card(id).click(); root().querySelector('.select-start').click();
        await until(() => active('VisualNovelScene') && document.querySelector('.intro-screen'));
        check(`Reentrada ${id} reinicia narrativa desde primera línea`, intro.runner.position === 2 && intro.sequence.route === id);
        document.querySelector('.vn-skip').click();
        intro.skip();
        await until(() => active('GameScene') && gameplay.player);
        check(`Omitir ${id} inicia una sola entidad correcta`, gameplay.character === id && gameplay.player.physicsSprite.texture.key === `${id}-walk` &&
            gameplay.children.list.filter(c => c.texture?.key === `${id}-walk`).length === 1);
    }

    for (const sequenceId of ['missing', 'lua_test']) {
        gameplay.scene.start('VisualNovelScene', {route:'alex', sequenceId});
        await until(() => active('CharacterSelectScene') && root());
        check(`Secuencia invalida controlada: ${sequenceId}`, root().querySelector('.select-message').classList.contains('is-error'));
        await start('alex');
    }
    for (const request of [null, { route: 'alex', sequenceId: 99 }, { route: 'alex', resume: 'bad' }, { route: 'alex', returnTo: { roomIndex: 99 } }]) {
        startNarrative(gameplay, request);
        await until(() => active('CharacterSelectScene') && root());
        check(`Solicitud malformada no inicia narrativa: ${JSON.stringify(request)}`, !active('VisualNovelScene') && root().querySelector('.select-message').classList.contains('is-error'));
        await start('alex');
    }
    // Return from gameplay without changing victory/room logic.
    startNarrative(gameplay, {route:'alex', sequenceId:'alex_test', resume:false, returnTo:{roomIndex:1}});
    await until(() => active('VisualNovelScene') && intro.runner);
    const firstRunView = intro.view;
    intro.advance(); intro.advance();
    check('Checkpoint guarda dialogo visible y no otra ruta', getNarrativeSaves(game).get('alex').entryIndex === 4 && getNarrativeSaves(game).get('lua').status === 'skipped');
    document.querySelector('.vn-back').click();
    await until(() => active('CharacterSelectScene') && root());
    check('Volver detiene escritura y limpia eventos', firstRunView.events.signal.aborted && intro.runner === null);
    card('alex').click(); root().querySelector('.select-start').click();
    await until(() => active('VisualNovelScene') && intro.runner);
    check('Seleccionar reanuda entrada y presentacion de Alex', intro.runner.position === 4 && document.querySelector('.vn-right').dataset.character === 'alex' && intro.background.currentKey === 'alex-test');
    intro.skip();
    await until(() => active('GameScene') && gameplay.player);
    startNarrative(gameplay, {route:'lua', resume:false, returnTo:{roomIndex:1}});
    await until(() => active('VisualNovelScene') && intro.runner);
    intro.skip();
    await until(() => active('GameScene') && gameplay.player);
    check('Puente gameplay narrativa gameplay conserva destino', gameplay.roomIndex === 1 && gameplay.character === 'lua');

    // Inaccessible storage must still work across scene transitions in this game.
    const temporary = new CharacterUnlockService(() => { throw new Error('storage disabled'); });
    temporary.redeem(CHARACTER_CODES.alex);
    game.registry.set('character-unlock-service', temporary);
    game.scene.getScene('GameScene').scene.start('CharacterSelectScene');
    await until(() => active('CharacterSelectScene') && root());
    check('Interfaz avisa de progreso temporal', !root().querySelector('.select-warning').hidden &&
        root().querySelector('.select-warning').textContent.includes('solo esta sesión'));
    await start('alex');
    check('Memoria compartida autoriza gameplay sin almacenamiento', game.scene.getScene('GameScene').character === 'alex' && getCharacterUnlocks(game) === temporary);

    const temporaryNarrative = new NarrativeSaveService(new NarrativeRouteManager(), () => { throw new Error('storage disabled'); });
    game.registry.set('narrative-save-service', temporaryNarrative);
    startNarrative(gameplay, { route: 'alex', resume: false });
    await until(() => active('VisualNovelScene') && intro.runner);
    intro.advance(); intro.advance();
    check('Visual Novel informa guardado narrativo temporal', temporaryNarrative.get('alex').entryIndex === 4 && document.querySelector('.vn-save-note').textContent.includes('temporal'));
    document.querySelector('.vn-back').click();
    await until(() => active('CharacterSelectScene') && root());
    card('alex').click(); root().querySelector('.select-start').click();
    await until(() => active('VisualNovelScene') && intro.runner);
    check('Progreso narrativo en memoria sobrevive cambio de escenas', intro.runner.position === 4 && getNarrativeSaves(game) === temporaryNarrative);
    intro.skip();
    await until(() => active('GameScene') && gameplay.player);

    game.registry.set('narrative-save-service', new NarrativeSaveService(new NarrativeRouteManager(), () => narrativeStorage));
    game.registry.set('character-unlock-service', new CharacterUnlockService(() => testStorage));
    game.scene.getScene('GameScene').scene.start('CharacterSelectScene');
    await until(() => active('CharacterSelectScene') && root());
}

run().then(() => {
    window.selectionResults = { status: 'passed', count: passed.length, passed };
    document.querySelector('#results').textContent = JSON.stringify(window.selectionResults, null, 2);
}).catch(error => {
    window.selectionResults = { status: 'failed', passed, error: error.stack };
    document.querySelector('#results').textContent = JSON.stringify(window.selectionResults, null, 2);
    console.error(error);
});

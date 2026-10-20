import { DialogueManager } from '../src/dialogue/DialogueManager';
import { NarrativeRouteManager } from '../src/narrative/NarrativeRouteManager';
import { NarrativeSaveService } from '../src/narrative/NarrativeSaveService';
import { NarrativeSequenceRunner } from '../src/narrative/NarrativeSequenceRunner';
import { isNarrativeSequence } from '../src/narrative/NarrativeTypes';
import { BackgroundManager } from '../src/narrative/BackgroundManager';
import { CharacterPortraitManager } from '../src/narrative/CharacterPortraitManager';
import { NarrativeAudioManager } from '../src/narrative/NarrativeAudioManager';
import { NarrativeConfig, narrativeBackgrounds, narrativePortraits, portraitExpressionOrder, portraitLayout } from '../src/config/NarrativeConfig';
import { loadPortraitFrame } from '../src/narrative/PortraitFrameRenderer';

const memory = initial => {
    let saved = initial ?? null;
    return { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
};
export async function testNarrativeEngine(game, check, until) {
    const line = new DialogueManager([{ speaker: 'Test', text: 'A🌟BC' }, { speaker: 'B', text: 'Next' }], 4);
    line.update(250);
    check('Typewriter respeta velocidad configurable', line.visibleText === 'A' && line.isTyping);
    line.update(250);
    check('Typewriter no corta pares Unicode', line.visibleText === 'A🌟');
    line.advance();
    check('Avanzar mientras escribe completa sin cambiar línea', line.position === 0 && line.visibleText === 'A🌟BC' && !line.isTyping);
    line.advance();
    check('Avanzar línea completa inicia siguiente desde cero', line.position === 1 && line.visibleText === '' && line.isTyping);
    line.update(10000); line.advance();
    check('Fin de diálogo idempotente', line.isComplete && !line.advance() && !line.skip());
    const empty = new DialogueManager([]);
    check('Diálogo vacío seguro', empty.isComplete && !empty.advance());

    const routes = new NarrativeRouteManager();
    check('Rutas iniciales independientes', routes.resolve('alex').id === 'alex_test' && routes.resolve('lua').id === 'lua_test');
    check('Secuencia ajena e inexistente se rechazan', !routes.resolve('alex', 'lua_test') && !routes.resolve('lua', 'missing'));
    const example = routes.resolve('alex');
    check('Guiones iniciales válidos', isNarrativeSequence(example) && isNarrativeSequence(routes.resolve('lua')));
    for (const bad of [
        { ...example, route: 'robot' }, { ...example, entries: [] },
        { ...example, entries: [{ type: 'dialogue', speaker: 'A', text: '' }] },
        { ...example, entries: [...example.entries, { type: 'music', key: 'x', action: 'play', volume: 2 }] },
        { ...example, entries: [...example.entries, { type: 'portrait', character: 'alex', expression: 'happy', position: 'invalid' }] },
        { ...example, entries: [...example.entries, { type: 'background', key: 'x', transition: 'bad' }] }
    ]) check(`Valida guion inválido ${JSON.stringify(bad.entries.at(-1))}`, !isNarrativeSequence(bad));
    const duplicates = new NarrativeRouteManager([example, example, { bad: true }]);
    check('Registro controla duplicados y guiones malformados', duplicates.issues.length === 2 && duplicates.resolve('alex').id === 'alex_test');
    const chapter2 = { ...example, id: 'alex_next', chapterId: 'chapter02' };
    check('Nuevo capítulo se registra por datos', new NarrativeRouteManager([example, chapter2]).resolve('alex', 'alex_next').chapterId === 'chapter02');

    const store = memory();
    const saves = new NarrativeSaveService(routes, () => store);
    const alex = { chapterId: 'test', sequenceId: 'alex_test', entryIndex: 2, status: 'reading' };
    const lua = { chapterId: 'test', sequenceId: 'lua_test', entryIndex: 4, status: 'reading' };
    saves.save('alex', alex); saves.save('lua', lua);
    check('Guardar Lua no sobrescribe Alex', saves.get('alex').entryIndex === 2 && saves.get('lua').entryIndex === 4);
    const reloaded = new NarrativeSaveService(routes, () => store);
    check('Carga versionada conserva ambas rutas', reloaded.get('alex').sequenceId === 'alex_test' && reloaded.get('lua').sequenceId === 'lua_test' && JSON.parse(store.getItem()).version === 1);
    check('Rechaza índices, capítulos y rutas inválidos', !saves.save('alex', lua) && !saves.save('alex', { ...alex, entryIndex: 1 }) &&
        !saves.save('alex', { ...alex, chapterId: 'other' }) && !saves.save('lua', { ...lua, entryIndex: 999 }));
    saves.save('alex', { ...alex, status: 'completed', entryIndex: 6 });
    check('Finalización no avanza capítulos automáticamente', saves.get('alex').chapterId === 'test' && saves.get('lua').status === 'reading');
    for (const corrupt of ['{', 'null', '{"version":2,"routes":{}}']) {
        const broken = new NarrativeSaveService(routes, () => memory(corrupt));
        check(`Guardado corrupto controlado: ${corrupt}`, broken.storageStatus === 'corrupt' && !broken.get('alex'));
    }
    const partial = new NarrativeSaveService(routes, () => memory(JSON.stringify({ version: 1, routes: { alex: { ...alex, entryIndex: 999 }, lua } })));
    check('Ruta corrupta no invalida otra ruta válida', partial.storageStatus === 'corrupt' && !partial.get('alex') && partial.get('lua').entryIndex === 4);
    const unavailable = new NarrativeSaveService(routes, () => { throw new Error('denied'); });
    unavailable.save('alex', alex);
    check('Progreso narrativo funciona en memoria sin storage', unavailable.storageStatus === 'unavailable' && unavailable.get('alex').entryIndex === 2);
    const noWrites = new NarrativeSaveService(routes, () => ({ getItem: () => null, setItem: () => { throw new Error('quota'); } }));
    noWrites.save('lua', lua);
    check('Error de escritura no pierde progreso en sesión', noWrites.storageStatus === 'unavailable' && noWrites.get('lua').entryIndex === 4);
    let key = '';
    new NarrativeSaveService(routes, () => ({ getItem: () => null, setItem: k => { key = k; } })).save('alex', alex);
    check('Guardado narrativo separado de desbloqueos', key === NarrativeConfig.storageKey && key !== 'berzerk_character_unlocks_v1');

    const sequence = { id: 'test', route: 'alex', chapterId: 'test', provisional: true, entries: [
        { type: 'sound', key: 'old' }, { type: 'background', key: 'bg1' },
        { type: 'portrait', character: 'alex', expression: 'neutral', position: 'left' },
        { type: 'music', key: 'track', action: 'play' }, { type: 'dialogue', speaker: 'A', text: 'First' },
        { type: 'hidePortrait', character: 'alex' }, { type: 'background', key: 'bg2' },
        { type: 'portrait', character: 'alex', expression: 'happy', position: 'center' },
        { type: 'music', key: 'track', action: 'stop' }, { type: 'music', key: 'track2', action: 'play' },
        { type: 'sound', key: 'new' }, { type: 'dialogue', speaker: 'A', text: 'Last' }, { type: 'hidePortrait', character: 'alex' }
    ] };
    let effects = []; let completions = 0;
    const runner = new NarrativeSequenceRunner(sequence, {
        effect: (entry, restoring) => effects.push({ ...entry, restoring }), dialogue: () => {}, complete: () => completions++
    });
    runner.start(4);
    check('Reanudación restaura fondo, retrato y música sin SFX antiguos', effects.map(e => e.type).join() === 'background,portrait,music' && effects.every(e => e.restoring));
    runner.advance();
    check('Intérprete completa texto antes de consumir instrucciones', runner.position === 4 && !runner.dialogue.isTyping);
    runner.advance();
    check('Intérprete ejecuta efectos en orden', runner.position === 11 && effects.slice(3).map(e => e.type).join() === 'hidePortrait,background,portrait,music,music,sound');
    runner.advance(); runner.advance(); runner.advance();
    check('Secuencia finaliza una sola vez y consume cierre', completions === 1 && runner.isComplete && effects.at(-1).type === 'hidePortrait');
    effects = [];
    const resumed = new NarrativeSequenceRunner(sequence, { effect: e => effects.push(e), dialogue: () => {}, complete: () => {} });
    resumed.start(11);
    check('Reanudación usa solo estado visual y musical final', effects.map(e => e.type).join() === 'background,portrait,music' &&
        effects[0].key === 'bg2' && effects[1].position === 'center' && effects[2].key === 'track2');
    resumed.destroy(); resumed.update(10000); resumed.advance();
    check('Intérprete cerrado no sigue escribiendo', resumed.dialogue === null && resumed.position === 11);
    const restoredMusic = [];
    const differentStop = new NarrativeSequenceRunner({ ...sequence, entries: [
        { type: 'music', key: 'active', action: 'play' }, { type: 'music', key: 'other', action: 'stop' },
        { type: 'dialogue', speaker: 'A', text: 'Resume' }
    ] }, { effect: e => restoredMusic.push(e), dialogue: () => {}, complete: () => {} });
    differentStop.start(2);
    check('Reanudar conserva música si stop apuntaba a otra pista', restoredMusic.length === 1 && restoredMusic[0].key === 'active');
    differentStop.destroy();

    const reports = [];
    const host = document.createElement('div');
    const background = new BackgroundManager(host, text => reports.push(text));
    background.show('alex-test', true);
    await until(() => background.canvas.width === 512 && background.animation?.playState === 'running');
    check('Fondo original carga región individual', background.canvas.width === 512 && background.canvas.height === 512);
    background.show('lua-test', true);
    await until(() => background.animation?.playState === 'running');
    check('Cambiar fondo conserva última clave y fundido', background.currentKey === 'lua-test' && background.animation !== null);
    background.show('unknown');
    check('Fondo desconocido usa alternativa controlada', reports.at(-1).includes('Fondo no disponible'));
    background.destroy();
    check('Fondo limpia carga y animación', host.childElementCount === 0 && background.image === null);
    const invalidCrop = new BackgroundManager(host, text => reports.push(text), { bad: { ...narrativeBackgrounds['alex-test'], crop: { x: 9999, y: 0, width: 1, height: 1 } } });
    invalidCrop.show('bad');
    await until(() => reports.at(-1).includes('Recorte inválido'));
    invalidCrop.destroy();
    check('Recorte inválido no cierra motor', reports.at(-1).includes('Recorte inválido'));

    const portraits = new CharacterPortraitManager(host, text => reports.push(text));
    portraits.show('alex', 'neutral', 'left', false);
    portraits.highlight('alex');
    check('Retrato aparece a izquierda y hablante destacado', host.querySelector('.vn-left.is-speaking img').alt === 'Alex');
    portraits.show('alex', 'unsupported', 'right', false);
    check('Expresión ausente conserva arte neutral identificado', host.querySelectorAll('figure').length === 1 &&
        host.querySelector('.vn-right figcaption').textContent.includes('neutral'));
    portraits.show('guest', 'sad', 'center', false);
    check('Personaje sin arte tiene alternativa visible', host.querySelector('.vn-center').textContent.includes('retrato no disponible'));
    portraits.hide('alex', false);
    check('Ocultar solo retira retrato indicado', !host.querySelector('[data-character=alex]') && host.querySelector('[data-character=guest]'));
    portraits.show('lua', 'neutral', 'left', true);
    portraits.destroy();
    check('Retratos limpian animaciones y referencias', host.childElementCount === 0 && portraits.animations.size === 0 && portraits.portraits.size === 0);

    for (const character of ['alex', 'lua']) {
        const urls = [], feet = [];
        for (const expression of portraitExpressionOrder) {
            const source = narrativePortraits[character].expressions[expression];
            const frame = await loadPortraitFrame(source);
            const image = new Image(); image.src = frame; await image.decode();
            if (image.naturalWidth !== portraitLayout.width || image.naturalHeight !== portraitLayout.height) throw new Error(`Lienzo de retrato incorrecto: ${character}/${expression}`);
            const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
            const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            for (const region of source.omit ?? []) {
                const left = portraitLayout.centerX - source.anchorX + region.x;
                const top = portraitLayout.groundY - source.groundY + region.y;
                for (let y = top; y < top + region.height; y++) for (let x = left; x < left + region.width; x++) {
                    if (pixels[(y * canvas.width + x) * 4 + 3] !== 0) throw new Error(`Restos de fila superior en ${character}/${expression}`);
                }
            }
            let ground = -1;
            for (let y = canvas.height - 1; y >= 0 && ground < 0; y--) {
                for (let x = 0; x < canvas.width; x++) if (pixels[(y * canvas.width + x) * 4 + 3] > 128) { ground = y; break; }
            }
            feet.push(ground); urls.push(frame);
        }
        check(`${character}: diez expresiones distintas recortadas desde hoja original`, urls.length === 10 && new Set(urls).size === 10);
        check(`${character}: todas las poses conservan escala y línea de suelo`, feet.every(y => y === portraitLayout.groundY));
        const source = narrativePortraits[character].expressions.neutral;
        check(`${character}: recortes reutilizan caché de render`, loadPortraitFrame(source) === loadPortraitFrame(source));
    }
    let badCrop = false;
    try { await loadPortraitFrame({ ...narrativePortraits.alex.expressions.neutral, crop: { x: -1, y: 0, width: 5, height: 5 } }); }
    catch (error) { badCrop = error.message.includes('Recorte de retrato inválido'); }
    let badMask = false;
    try { await loadPortraitFrame({ ...narrativePortraits.alex.expressions.neutral, omit: [{ x: 0, y: 0, width: 10, height: 10 }] }); }
    catch (error) { badMask = error.message.includes('Máscara de retrato inválida'); }
    check('Recortes y máscaras fuera de límites se rechazan sin publicar imagen', badCrop && badMask);
    const transient = new CharacterPortraitManager(host, text => reports.push(text));
    transient.show('lua', 'happy', 'left', false); transient.show('lua', 'angry', 'right', false); transient.destroy();
    await Promise.resolve(); await Promise.resolve();
    check('Render asíncrono de retratos no revive elementos destruidos', host.childElementCount === 0);

    const scene = game.scene.getScene('CharacterSelectScene');
    const before = scene.sound.listenerCount('unlocked');
    const audio = new NarrativeAudioManager(scene, text => reports.push(text));
    audio.playMusic('missing'); audio.playSound('missing');
    check('Motor funciona sin archivos de audio', audio.currentMusicKey === null && reports.at(-1).includes('Audio no disponible'));
    audio.destroy();
    check('Audio libera listener de desbloqueo', scene.sound.listenerCount('unlocked') === before);
    if (!game.sound.context) throw new Error('Web Audio no disponible para prueba de audio real');
    // Test-only AudioBuffer: no fake production music files are introduced.
    game.cache.audio.add('vn-test-tone', game.sound.context.createBuffer(1, 4410, 44100));
    const realAudio = new NarrativeAudioManager(scene, text => reports.push(text), { 'vn-test-tone': { urls: [] } });
    realAudio.playMusic('vn-test-tone', 0.3); realAudio.playMusic('vn-test-tone', 0.2);
    // A suspended AudioContext may not expose scheduled gain values until unlocked.
    check('Música real no duplica pista y ajusta volumen', game.sound.sounds.filter(s => s.key === 'vn-test-tone').length === 1 && realAudio.music.currentConfig.volume === 0.2);
    realAudio.playSound('vn-test-tone');
    realAudio.destroy();
    await until(() => !game.sound.sounds.some(s => s.key === 'vn-test-tone'));
    check('Audio limpia música y efectos propios', !game.sound.sounds.some(s => s.key === 'vn-test-tone'));
    game.cache.audio.remove('vn-test-tone');
}

import { openBrowserSession } from './browser-session.mjs';
const { send, evaluate, waitUntil, errors, baseUrl, close } = await openBrowserSession();
const key = async (key, code, windowsVirtualKeyCode) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode,
        ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode });
};
const click = async selector => {
    const point = await evaluate(`(() => {const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
        return {x:r.left+r.width/2, y:r.top+r.height/2};})()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
};
try {
    await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `${baseUrl}/tests/selection.html` });
    await waitUntil("window.selectionResults && window.selectionResults.status !== 'running'");
    const result = await evaluate('window.selectionResults');
    if (result.status !== 'passed') throw new Error(JSON.stringify(result));
    await evaluate('window.resetSelectionProgress()');
    await click('#character-code');
    await send('Input.insertText', { text: '  alex-001  ' });
    await key('Enter', 'Enter', 13);
    await waitUntil("document.querySelector('[data-character=alex]').classList.contains('is-unlocked')");
    await click('#character-code');
    await send('Input.insertText', { text: 'LUA-001' });
    await click('.select-code button');
    await waitUntil("document.querySelector('[data-character=lua]').classList.contains('is-unlocked')");
    await click('[data-character=alex]');
    await key('ArrowRight', 'ArrowRight', 39);
    await key('Enter', 'Enter', 13);
    await waitUntil("document.querySelector('[data-character=lua]').getAttribute('aria-pressed') === 'true'");
    await click('.select-start');
    await waitUntil("window.selectionGame.scene.isActive('IntroScene') && document.querySelector('.intro-next')");
    // A held Enter from the selector must not advance the newly focused intro.
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, autoRepeat: true });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    if (!(await evaluate("window.selectionGame.scene.getScene('IntroScene').dialogue.position === 0"))) {
        throw new Error('Held Enter leaked from selection into introduction');
    }
    await key('Enter', 'Enter', 13);
    if (!(await evaluate("window.selectionGame.scene.getScene('IntroScene').dialogue.position === 1"))) {
        throw new Error('Enter must advance exactly one dialogue line');
    }
    await key(' ', 'Space', 32);
    await click('.intro-next');
    await waitUntil("window.selectionGame.scene.isActive('GameScene')");
    if (!(await evaluate("window.selectionGame.scene.getScene('GameScene').character === 'lua'"))) {
        throw new Error('Native selector created wrong character');
    }
    result.nativeUiTests = ['Escritura y Enter canjean Alex', 'Clic canjea Lua', 'Flechas y Enter seleccionan Lua',
        'Enter mantenido no atraviesa transición', 'Enter avanza una sola línea', 'Espacio y clic completan introducción de Lua'];
    for (const [id, skipWithKey] of [['alex', false], ['lua', true]]) {
        await evaluate("void window.selectionGame.scene.getScene('GameScene').scene.start('CharacterSelectScene')");
        await waitUntil("document.querySelector('.select-start')");
        await click(`[data-character=${id}]`);
        await click('.select-start');
        await waitUntil("window.selectionGame.scene.isActive('IntroScene') && document.querySelector('.intro-skip')");
        if (skipWithKey) await key('Escape', 'Escape', 27);
        else await click('.intro-skip');
        await waitUntil("window.selectionGame.scene.isActive('GameScene')");
        if (!(await evaluate(`window.selectionGame.scene.getScene('GameScene').character === '${id}'`))) {
            throw new Error('Skip replaced the selected character');
        }
        result.nativeUiTests.push(`${skipWithKey ? 'Escape' : 'Botón omitir'} inicia ${id}`);
    }

    // A new document creates a new game/service and must recover actual localStorage.
    await send('Page.navigate', { url: `${baseUrl}/tests/selection.html?resume=1` });
    await waitUntil("window.selectionResults && window.selectionResults.status !== 'running'");
    const reload = await evaluate('window.selectionResults');
    if (reload.status !== 'passed') throw new Error(JSON.stringify(reload));
    result.reloadTests = reload.passed;

    // Exercise the shared FIT canvas/DOM layout at two viewport shapes.
    result.layoutTests = [];
    for (const [width, height] of [[800, 600], [390, 844]]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        await new Promise(r => setTimeout(r, 250));
        const fits = await evaluate(`(() => {
            const root = document.querySelector('.character-select').getBoundingClientRect();
            const button = document.querySelector('.select-start').getBoundingClientRect();
            return root.left >= -1 && root.top >= -1 && root.right <= innerWidth+1 && root.bottom <= innerHeight+1 &&
                button.left >= root.left && button.right <= root.right && button.bottom <= root.bottom;
        })()`);
        if (!fits) throw new Error(`Selector overflow at ${width}x${height}`);
        result.layoutTests.push(`${width}x${height}: selector y botón dentro del área visible`);
    }
    await click('[data-character=lua]');
    await click('.select-start');
    await waitUntil("window.selectionGame.scene.isActive('IntroScene') && document.querySelector('.intro-next')");
    result.introLayoutTests = [];
    for (const [width, height] of [[800, 600], [390, 844]]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        await new Promise(r => setTimeout(r, 250));
        const fits = await evaluate(`(() => {
            const root = document.querySelector('.intro-screen').getBoundingClientRect();
            const panel = document.querySelector('.intro-dialogue').getBoundingClientRect();
            const footer = document.querySelector('.intro-footer').getBoundingClientRect();
            return root.left >= -1 && root.top >= -1 && root.right <= innerWidth+1 && root.bottom <= innerHeight+1 &&
                panel.bottom <= footer.top && footer.bottom <= root.bottom;
        })()`);
        if (!fits) throw new Error(`Introduction overflow at ${width}x${height}`);
        result.introLayoutTests.push(`${width}x${height}: diálogo y controles visibles sin solaparse`);
    }
    await evaluate('localStorage.removeItem(window.selectionStorageKey)');
    console.log(JSON.stringify({ ...result, consoleErrors: errors }, null, 2));
    if (errors.length) process.exitCode = 1;
} finally {
    await send('Emulation.clearDeviceMetricsOverride');
    close();
}

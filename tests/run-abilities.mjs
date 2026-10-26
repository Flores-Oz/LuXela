import { openBrowserSession } from './browser-session.mjs';
const { send, evaluate, waitUntil, errors, baseUrl, close } = await openBrowserSession();
try {
    await send('Page.navigate', { url: `${baseUrl}/tests/abilities.html` });
    await waitUntil("window.abilityResults && window.abilityResults.status !== 'running'");
    const result = await evaluate('window.abilityResults');
    if (result.status === 'passed') {
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'q', code: 'KeyQ', windowsVirtualKeyCode: 81 });
        await waitUntil("window.abilityGame.scene.getScene('GameScene').specialAbilities.ability.performing");
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'q', code: 'KeyQ', windowsVirtualKeyCode: 81, autoRepeat: true });
        await waitUntil("window.abilityGame.scene.getScene('GameScene').specialAbilities.ability.state === 'locked'");
        await evaluate("window.abilityGame.scene.getScene('GameScene').specialAbilities.update(100000)");
        if (!(await evaluate("window.abilityGame.scene.getScene('GameScene').specialAbilities.ability.state === 'locked'"))) throw Error('Timed recharge returned');
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'q', code: 'KeyQ', windowsVirtualKeyCode: 81 });
        result.nativeInput = ['Q activa la habilidad con carga', 'Q mantenida/repetida no recarga sin bajas'];
    }
    console.log(JSON.stringify({ ...result, consoleErrors: errors }, null, 2));
    if (result.status !== 'passed' || errors.length) process.exitCode = 1;
} finally { close(); }

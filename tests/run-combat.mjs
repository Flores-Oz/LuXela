import { openBrowserSession } from './browser-session.mjs';
const { send, evaluate, waitUntil, errors, baseUrl, close } = await openBrowserSession();
try {
    await send('Page.navigate', { url: `${baseUrl}/tests/combat.html` });
    let result;
    for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 500));
        const response = await send('Runtime.evaluate', { expression: 'window.combatResults', returnByValue: true });
        result = response.result?.value;
        if (result && result.status !== 'running') break;
    }
    if (result?.status === 'passed') {
        await evaluate("window.combatGame.scene.getScene('GameScene').player.die()");
        await waitUntil("window.combatGame.scene.isActive('GameOverScene')");
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        await waitUntil("window.combatGame.scene.isActive('GameScene')");
        await evaluate("window.combatGame.scene.getScene('GameScene').player.die()");
        await waitUntil("window.combatGame.scene.isActive('GameOverScene')");
        const point = await evaluate(`(() => {
            const game = window.combatGame;
            const button = game.scene.getScene('GameOverScene').children.list.find(c => c.text === '[ REINTENTAR ]');
            const bounds = button.getBounds();
            const canvas = game.canvas.getBoundingClientRect();
            return { x: canvas.left + bounds.centerX * canvas.width / game.canvas.width,
                y: canvas.top + bounds.centerY * canvas.height / game.canvas.height };
        })()`);
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
        await waitUntil("window.combatGame.scene.isActive('GameScene')");
        result.nativeUiTests = ['Enter reinicia desde Game Over', 'Clic en REINTENTAR reinicia desde Game Over'];
    }
    console.log(JSON.stringify({ ...result, consoleErrors: errors }, null, 2));
    if (result?.status !== 'passed' || errors.length) process.exitCode = 1;
} finally {
    close();
}

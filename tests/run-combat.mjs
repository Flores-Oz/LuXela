// Connect to a dedicated Chrome/Edge test instance with remote debugging enabled.
// No extra dependencies. Requires Node 22+, Vite running and CDP on port 9224.
const port = process.env.CDP_PORT ?? '9224';
const baseUrl = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5173';
const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
const tab = tabs.find(t => t.type === 'page');
if (!tab) throw new Error('No browser test tab found');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0;
const pending = new Map();
const errors = [];
ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
        const callback = pending.get(message.id);
        pending.delete(message.id);
        callback?.(message);
    } else if (message.method === 'Runtime.exceptionThrown') {
        errors.push(message.params.exceptionDetails);
    } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        errors.push(message.params.args.map(a => a.description ?? a.value).join(' '));
    }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, message => message.error ? reject(message.error) : resolve(message.result));
    ws.send(JSON.stringify({ id: requestId, method, params }));
});
const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result?.value;
};
const waitUntil = async expression => {
    for (let i = 0; i < 60; i++) {
        if (await evaluate(expression)) return;
        await new Promise(r => setTimeout(r, 100));
    }
    throw new Error(`Timed out: ${expression}`);
};
try {
    await send('Runtime.enable');
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
    ws.close();
}

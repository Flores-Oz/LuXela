// Node 22+ CDP client. Use a dedicated Chrome/Edge instance, never a personal tab.
export async function openBrowserSession() {
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
            pending.get(message.id)?.(message);
            pending.delete(message.id);
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
        const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
        return response.result?.value;
    };
    const waitUntil = async expression => {
        for (let i = 0; i < 120; i++) {
            if (await evaluate(`Boolean(${expression})`)) return;
            await new Promise(r => setTimeout(r, 100));
        }
        throw new Error(`Timed out: ${expression}`);
    };
    await send('Runtime.enable');
    return { send, evaluate, waitUntil, errors, baseUrl, close: () => ws.close() };
}

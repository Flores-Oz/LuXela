import { openBrowserSession } from './browser-session.mjs';
const { send, evaluate, waitUntil, errors, baseUrl, close } = await openBrowserSession();
try {
    await send('Page.navigate', { url: `${baseUrl}/tests/sprint-4.html` });
    await waitUntil("window.sprint4Results && window.sprint4Results.status !== 'running'");
    const result = await evaluate('window.sprint4Results');
    console.log(JSON.stringify({ ...result, consoleErrors: errors }, null, 2));
    if (result.status !== 'passed' || errors.length) process.exitCode = 1;
} finally { close(); }

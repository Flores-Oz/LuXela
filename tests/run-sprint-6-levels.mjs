import { mkdirSync, writeFileSync } from 'node:fs';
import { openBrowserSession } from './browser-session.mjs';

const browser = await openBrowserSession();
const difficulty = process.argv.includes('--difficulty');
try {
    await browser.send('Page.navigate', { url: `${browser.baseUrl}/tests/sprint-6-levels.html${difficulty ? '?difficulty' : ''}` });
    await browser.waitUntil("window.sprint6LevelsResults && window.sprint6LevelsResults.status !== 'running'", 60000);
    const result = await browser.evaluate('window.sprint6LevelsResults');
    const report = { ...result, generatedAt: new Date().toISOString(), renderer: 'Canvas', consoleErrors: browser.errors };
    console.log(JSON.stringify(report, null, 2));
    if (result.status !== 'passed' || browser.errors.length) process.exitCode = 1;
    else {
        mkdirSync('docs/test-results', { recursive: true });
        writeFileSync(`docs/test-results/sprint-6-stage-${difficulty ? 4 : 3}.json`, `${JSON.stringify(report, null, 2)}\n`);
    }
} finally { browser.close(); }

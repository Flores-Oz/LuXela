import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const baseUrl = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5173';
const port = process.env.CDP_PORT ?? '9224';
// Fail early with an actionable message instead of timing out on a browser error page.
for (const url of [baseUrl, `http://127.0.0.1:${port}/json/version`]) {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        throw new Error(`No se puede acceder a ${url}. Inicia Vite y el navegador de pruebas dedicado.`, { cause: error });
    }
}
const browser = await fetch(`http://127.0.0.1:${port}/json/version`).then(response => response.json());
const suites = [];
const sprint = process.argv.includes('--sprint5') ? 5 : 4;
// Runners share a dedicated browser tab; execute sequentially.
for (const suite of ['selection', 'combat', 'abilities', 'sprint-4', ...(sprint === 5 ? ['sprint-5'] : [])]) {
    const result = spawnSync(process.execPath, [`tests/run-${suite}.mjs`], { encoding: 'utf8', timeout: 120000 });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        process.stdout.write(result.stdout ?? '');
        process.stderr.write(result.stderr ?? '');
        process.exit(result.status ?? 1);
    }
    const data = JSON.parse(result.stdout);
    const nativeCount = ['nativeUiTests', 'nativeInput', 'reloadTests', 'layoutTests', 'introLayoutTests']
        .reduce((sum, key) => sum + (data[key]?.length ?? 0), 0);
    const summary = { name: suite, status: data.status, checks: data.count + nativeCount,
        consoleErrors: data.consoleErrors.length, ...(data.cycles ? { cycles: data.cycles, baseline: data.baseline } : {}) };
    suites.push(summary);
    console.log(`${suite}: ${summary.checks} verificaciones aprobadas, ${summary.consoleErrors} errores de consola`);
}
const report = { status: 'passed', generatedAt: new Date().toISOString(), node: process.version,
    browser: browser.Browser, renderer: 'Canvas', suites,
    totalChecks: suites.reduce((sum, suite) => sum + suite.checks, 0) };
mkdirSync('docs/test-results', { recursive: true });
writeFileSync(`docs/test-results/sprint-${sprint}.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Total: ${report.totalChecks}. Informe: docs/test-results/sprint-${sprint}.json`);

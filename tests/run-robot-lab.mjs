import { mkdirSync, writeFileSync } from 'node:fs';
import { openBrowserSession } from './browser-session.mjs';

const browser = await openBrowserSession();
const checks = [];
async function check(expression, label) {
    if (!await browser.evaluate(expression)) throw new Error(label);
    checks.push(label);
}
try {
    await browser.send('Page.navigate', { url: `${browser.baseUrl}/robots.html` });
    await browser.waitUntil("document.querySelector('#status')?.textContent.startsWith('Rojo') && !document.querySelector('#pause').disabled");
    await browser.evaluate("(async()=>{window.lab=(await import(document.querySelector('script[src*=\"robot-lab.ts\"]').src)).robotLab.scene.getScene('RobotLabScene')})()");
    await browser.waitUntil('lab.shots > 0 && lab.hits > 0');
    await check('!lab.player.isDead()', 'Real projectiles hit Alex without ending the lab');
    await browser.evaluate("document.querySelector('#wall').click();document.querySelector('#reset').click()");
    await browser.waitUntil('lab.enemy.getState() === "CHASE"');
    await new Promise(resolve => setTimeout(resolve, 650));
    await check('lab.shots === 0 && lab.hits === 0', 'Interior wall blocks red line of sight and firing');
    await browser.evaluate("document.querySelector('[data-robot=robot-orange]').click()");
    await browser.waitUntil('lab.enemy.attack.phase === "charging"');
    await check('lab.shots === 0 && lab.enemy.chargeWarning.visible', 'Orange begins with a visible warning and no projectiles');
    await browser.evaluate("document.querySelector('#pause').click()");
    await browser.waitUntil('lab.scene.isPaused()');
    await browser.evaluate('window.chargeClock=lab.time.now');
    await new Promise(resolve => setTimeout(resolve, 2200));
    await check('lab.shots === 0 && lab.enemy.attack.phase === "charging" && lab.time.now === chargeClock', 'Pausing longer than the charge duration does not discharge the orange attack');
    await browser.evaluate("document.querySelector('#pause').click()");
    await browser.waitUntil('!lab.scene.isPaused()');
    await browser.waitUntil('lab.shots === 6');
    // Step into one of the six evenly spaced trajectories after its aim has locked.
    await browser.evaluate('lab.player.physicsSprite.body.reset(620,325);void 0');
    await browser.waitUntil('lab.shots > 0 && lab.hits > 0');
    await check('lab.enemy.piercesInteriorWalls && lab.hits > 0', 'Orange production projectile crosses the physical wall and hits Alex');
    await browser.evaluate("document.querySelector('#pause').click();window.pausedShots=lab.shots;window.pausedX=lab.player.x");
    await new Promise(resolve => setTimeout(resolve, 1200));
    await check('lab.scene.isPaused() && lab.shots === pausedShots && lab.player.x === pausedX', 'Pause freezes the scene and projectile simulation');
    await browser.evaluate("document.querySelector('#pause').click()");
    await browser.waitUntil('!lab.scene.isPaused()');
    await check('!lab.scene.isPaused()', 'Continue resumes the scene');
    for (const robot of ['robot-red', 'robot-blue', 'robot-yellow', 'robot-orange']) {
        await browser.evaluate(`document.querySelector('[data-robot=${robot}]').click()`);
        await check(`lab.robotType === '${robot}' && lab.enemies.getLength() === 1`, `${robot}: switching keeps exactly one robot`);
        for (const mode of ['special-a1', 'special-a2', 'special-b1', 'special-b2']) {
            await browser.evaluate(`document.querySelector('#mode').value='${mode}';document.querySelector('#mode').dispatchEvent(new Event('change'))`);
            await check(`lab.enemy.anims.currentAnim.key.endsWith('${mode}') && lab.shots === 0 && !lab.player.physicsSprite.visible && !lab.wall.active`, `${robot}: ${mode} plays original frames without fabricating an attack`);
        }
    }
    await browser.evaluate("document.querySelector('#mode').value='combat';document.querySelector('#mode').dispatchEvent(new Event('change'))");
    await check('lab.player.physicsSprite.visible && lab.wall.active && lab.enemy.scaleX === 1', 'Combat restores target, wall and native robot scale');
    await browser.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 's', code: 'KeyS', windowsVirtualKeyCode: 83 });
    await browser.waitUntil('lab.player.y > 330');
    await browser.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 's', code: 'KeyS', windowsVirtualKeyCode: 83 });
    await check('lab.player.y > 330', 'Native WASD input moves the real player');
    await browser.evaluate("document.querySelector('#reset').click()");
    await check('lab.player.y === 300 && lab.projectiles.getLength() === 0 && lab.hits === 0', 'Reset clears projectiles, counters and target position');
    await browser.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    await browser.waitUntil('document.querySelector("canvas").getBoundingClientRect().width <= 390');
    await check('document.documentElement.scrollWidth <= innerWidth', 'Narrow layout fits without horizontal overflow');
    await browser.send('Emulation.clearDeviceMetricsOverride');
    if (browser.errors.length) throw new Error(JSON.stringify(browser.errors));
    const report = { status: 'passed', count: checks.length, checks, consoleErrors: browser.errors, generatedAt: new Date().toISOString() };
    mkdirSync('docs/test-results', { recursive: true });
    writeFileSync('docs/test-results/robot-lab.json', JSON.stringify(report, null, 2) + '\n');
    console.log(`${checks.length} verificaciones aprobadas; cero errores de consola.`);
} finally { browser.close(); }

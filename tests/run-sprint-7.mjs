import { mkdirSync, writeFileSync } from 'node:fs';
import { openBrowserSession } from './browser-session.mjs';
const b = await openBrowserSession();
const key = async (key, code, number, type = 'both') => {
    if (type !== 'up') await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: number, ...(key === 'Enter' ? { text: '\r' } : {}) });
    if (type !== 'down') await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: number });
};
try {
    await b.send('Page.navigate', { url: `${b.baseUrl}/tests/sprint-7.html` });
    await b.waitUntil("window.sprint7Results && window.sprint7Results.status !== 'running'", 60000);
    const result = await b.evaluate('window.sprint7Results');
    if (result.status === 'passed') {
        await key('Escape', 'Escape', 27); await b.waitUntil("document.querySelector('.pause-screen')");
        await key('Enter', 'Enter', 13); await b.waitUntil("!window.sprint7Game.scene.isActive('PauseScene')");
        await key('q', 'KeyQ', 81); await new Promise(r => setTimeout(r, 80));
        if (!(await b.evaluate("!window.sprint7Game.scene.getScene('GameScene').specialAbilities.ability.performing"))) throw Error('Q activated without charge');
        result.nativeInput = ['Escape abre pausa', 'Enter reanuda sin duplicar entrada', 'Q no activa sin bajas'];
        result.layoutTests = [];
        for (const [width, height] of [[1920, 1080], [1366, 768], [800, 600], [390, 844], [844, 390]]) {
            await b.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
            await new Promise(r => setTimeout(r, 150));
            const fits = await b.evaluate(`(()=>{
                const s=window.sprint7Game.scene.getScene('GameScene'),c=s.cameras.main;
                s.hud.update({level:5,totalLevels:5,score:5300,enemies:7,wave:3,totalWaves:3,special:10,specialRequired:10,specialState:'ready',notice:'ENCUENTRO FINAL'});
                const r=s.hud.text.getBounds(),z=c.zoom,x=c.width/2+(r.x-c.width/2)*z,y=c.height/2+(r.y-c.height/2)*z;
                return x>=0&&x+r.width*z<=innerWidth&&y>=0&&y+r.height*z<=120&&c.worldView.width>=s.physics.world.bounds.width&&c.worldView.height>=s.physics.world.bounds.height;
            })()`);
            if (!fits) throw Error(`HUD or room does not fit ${width}x${height}`);
            result.layoutTests.push(`${width}x${height}: HUD completo y habitación sin recortes`);
        }
        await b.send('Emulation.clearDeviceMetricsOverride');
        // Reach charged state through actual required kills in the first two rooms.
        await b.evaluate(`(async()=>{
            const game=window.sprint7Game,pause=ms=>new Promise(r=>setTimeout(r,ms));
            for(let room=0;room<2;room++){
                let s=game.scene.getScene('GameScene');
                while(!s.waves.isComplete){s.enemyManager.defeatLivingEnemies();s.waves.update(1000);s.enemyManager.getLivingEnemies().forEach(e=>{e.stop();e.updateBehavior=()=>null;});}
                const old=s.player;s.changeRoom();
                for(let i=0;i<100&&game.scene.getScene('GameScene').player===old;i++)await pause(20);
                s=game.scene.getScene('GameScene');s.enemyManager.getLivingEnemies().forEach(e=>{e.stop();e.updateBehavior=()=>null;});
            }
        })()`);
        await key('q', 'KeyQ', 81, 'down');
        await b.waitUntil("window.sprint7Game.scene.getScene('GameScene').specialAbilities.ability.performing");
        await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'q', code: 'KeyQ', windowsVirtualKeyCode: 81, autoRepeat: true });
        await b.waitUntil("window.sprint7Game.scene.getScene('GameScene').specialAbilities.ability.state === 'locked'");
        await b.waitUntil("window.sprint7Game.scene.getScene('GameScene').waves.state === 'active'");
        await b.evaluate("void window.sprint7Game.scene.getScene('GameScene').enemyManager.defeatLivingEnemies()");
        await new Promise(r => setTimeout(r, 150));
        if (!(await b.evaluate("window.sprint7Game.scene.getScene('GameScene').specialAbilities.ability.state === 'ready'"))) throw Error('Held Q reactivated after charging again');
        await key('q', 'KeyQ', 81, 'up');
        result.nativeInput.push('Q activa tras diez bajas', 'Q mantenida no se reactiva tras nuevas bajas');
    }
    const report = { ...result, totalChecks: result.count + (result.nativeInput?.length ?? 0) + (result.layoutTests?.length ?? 0), generatedAt: new Date().toISOString(), renderer: 'Canvas', consoleErrors: b.errors };
    console.log(JSON.stringify(report, null, 2));
    if (result.status !== 'passed' || b.errors.length) process.exitCode = 1;
    else { mkdirSync('docs/test-results', { recursive: true }); writeFileSync('docs/test-results/sprint-7-integration.json', JSON.stringify(report, null, 2) + '\n'); }
} finally { await b.send('Emulation.clearDeviceMetricsOverride'); b.close(); }

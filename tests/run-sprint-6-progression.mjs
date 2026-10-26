import { mkdirSync, writeFileSync } from 'node:fs';
import { openBrowserSession } from './browser-session.mjs';
const browser = await openBrowserSession();
try {
    await browser.send('Page.navigate', { url: `${browser.baseUrl}/tests/sprint-6-progression.html` });
    await browser.waitUntil("window.sprint6ProgressionResults && window.sprint6ProgressionResults.status !== 'running'", 60000);
    const result = await browser.evaluate('window.sprint6ProgressionResults');
    if (result.status === 'passed') {
        await browser.evaluate("void window.sprint6ProgressionGame.scene.getScene('MainMenuScene').scene.start('GameScene',{character:'lua'})");
        await browser.waitUntil("window.sprint6ProgressionGame.scene.isActive('GameScene') && window.sprint6ProgressionGame.scene.getScene('GameScene').player");
        await browser.evaluate("void window.sprint6ProgressionGame.scene.getScene('GameScene').enemies.getChildren().forEach(enemy=>{enemy.stop();enemy.updateBehavior=()=>null;})");
        const key = async (key, code, number) => {
            await browser.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: number, ...(key === 'Enter' ? { text: '\r' } : {}) });
            await browser.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: number });
        };
        await key('Escape', 'Escape', 27);
        await browser.waitUntil("window.sprint6ProgressionGame.scene.isPaused('GameScene') && document.querySelector('.pause-screen')");
        await key('Enter', 'Enter', 13);
        await browser.waitUntil("window.sprint6ProgressionGame.scene.isActive('GameScene') && !window.sprint6ProgressionGame.scene.isActive('PauseScene')");
        result.nativeInput = ['Escape abre pausa con teclado real', 'Enter en Continuar reanuda la partida'];
        result.hudLayoutTests = [];
        for (const [width, height] of [[1920, 1080], [1366, 768], [800, 600], [390, 844], [844, 390]]) {
            await browser.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
            await new Promise(resolve => setTimeout(resolve, 150));
            const fits = await browser.evaluate(`(()=>{
                const scene=window.sprint6ProgressionGame.scene.getScene('GameScene'),camera=scene.cameras.main;
                scene.hud.update({level:5,totalLevels:5,score:2500,enemies:7});
                const bounds=scene.hud.text.getBounds(),z=camera.zoom;
                const left=camera.width/2+(bounds.left-camera.width/2)*z,top=camera.height/2+(bounds.top-camera.height/2)*z;
                const right=left+bounds.width*z,bottom=top+bounds.height*z;
                return left>=0&&top>=0&&right<=innerWidth&&bottom<=80&&!scene.specialAbilities.hud.visible&&
                    camera.worldView.width>=scene.physics.world.bounds.width&&camera.worldView.height>=scene.physics.world.bounds.height;
            })()`);
            if (!fits) throw Error(`HUD or room does not fit at ${width}x${height}`);
            result.hudLayoutTests.push(`${width}x${height}: HUD legible y habitación completa`);
        }
        // Create a valid service result for layout checks, separate from combat assertions above.
        await browser.evaluate(`(async()=>{
            const {getArcadeRun}=await import('/src/systems/ArcadeRunService.ts');
            const game=window.sprint6ProgressionGame, scene=game.scene.getScene('GameScene'), run=getArcadeRun(game);
            for(let index=0;index<run.roomCount;index++){run.clearRoom(scene.runId,index);if(index<run.roomCount-1)run.advance(scene.runId,index);}
            if(!run.finish(scene.runId,run.roomCount-1))throw Error('Invalid layout result');
            scene.scene.start('CompletionScene',{character:'lua',runId:scene.runId});
        })()`);
        await browser.waitUntil("document.querySelector('.completion-screen')");
        result.layoutTests = [];
        for (const [width, height] of [[1920, 1080], [1366, 768], [800, 600], [390, 844], [844, 390]]) {
            await browser.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
            await new Promise(resolve => setTimeout(resolve, 150));
            const fits = await browser.evaluate(`(()=>{
                const root=document.querySelector('.completion-screen');
                const title=root.querySelector('h1').getBoundingClientRect(),route=root.querySelector('.presentation-eyebrow').getBoundingClientRect();
                const subtitle=root.querySelector('.presentation-subtitle').getBoundingClientRect(),nav=root.querySelector('nav').getBoundingClientRect();
                return title.bottom<route.top&&route.bottom<subtitle.top&&subtitle.bottom<nav.top&&
                    [...root.querySelectorAll('button')].every(button=>{const r=button.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&r.height>=44;});
            })()`);
            if (!fits) throw Error(`Conclusion overlaps at ${width}x${height}`);
            result.layoutTests.push(`${width}x${height}: título, ruta y botones sin superposición`);
        }
    }
    const report = { ...result, totalChecks: result.count + (result.nativeInput?.length ?? 0) + (result.layoutTests?.length ?? 0) + (result.hudLayoutTests?.length ?? 0), generatedAt: new Date().toISOString(), renderer: 'Canvas', consoleErrors: browser.errors };
    console.log(JSON.stringify(report, null, 2));
    if (result.status !== 'passed' || browser.errors.length) process.exitCode = 1;
    else {
        mkdirSync('docs/test-results', { recursive: true });
        writeFileSync(`docs/test-results/sprint-6-stage-${process.argv.includes('--hud') ? 6 : 5}.json`, `${JSON.stringify(report, null, 2)}\n`);
    }
} finally { await browser.send('Emulation.clearDeviceMetricsOverride'); browser.close(); }

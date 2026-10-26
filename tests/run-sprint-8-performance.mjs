import { writeFileSync } from 'node:fs';
import { openBrowserSession } from './browser-session.mjs';

// Run after the environment suite, in its dedicated browser. Compare identical art and camera.
const browser = await openBrowserSession();
try {
    await browser.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await browser.send('Page.navigate', { url: `${browser.baseUrl}/tests/sprint-8.html` });
    await browser.waitUntil("window.sprint8Results?.status === 'passed'", 60000);
    const result = await browser.evaluate(`(async () => {
        const game = window.sprint8Game, scene = game.scene.getScene('EnvironmentBench');
        game.scale.resize(1920,1080);
        const previous = scene.ready;
        scene.scene.restart({width:15,height:11,kind:'modular',theme:'control',style:'data-blue',decorations:[{row:3,column:3,kind:'grate'},{row:6,column:10,kind:'circuit'},{row:7,column:8,kind:'warning'}]});
        while (scene.ready === previous) await new Promise(resolve => setTimeout(resolve, 20));
        // Native scale makes the pixel comparison independent of fractional camera resampling.
        scene.cameras.main.setZoom(1).setScroll(0,0);
        scene.cameras.main.roundPixels = false;
        scene.cameras.main.renderRoundPixels = false;
        const layers = scene.children.list.filter(object => object.type === 'TilemapLayer');
        const caches = layers.map(layer => layer.getData('environment-cache'));
        if (caches.length !== 4 || caches.some(image => !image)) throw Error('Missing static cache');
        const timings = { uncached: [], cached: [] }, drawCounts = {}, pixels = {};
        let layerDraws = 0;
        for (const layer of layers) {
            const render = layer.renderCanvas;
            layer.renderCanvas = function (...args) { layerDraws++; return render.apply(this,args); };
        }
        const render = () => { game.renderer.preRender(); scene.sys.render(game.renderer); game.renderer.postRender(); };
        for (let round = 0; round < 4; round++) for (const mode of (round % 2 ? ['cached','uncached'] : ['uncached','cached'])) {
            layers.forEach(layer => layer.setVisible(mode === 'uncached'));
            caches.forEach(image => image.setVisible(mode === 'cached'));
            render();
            if (!pixels[mode]) pixels[mode] = game.renderer.gameContext.getImageData(0,0,game.scale.width,game.scale.height).data;
            layerDraws = 0;
            const start = performance.now();
            for (let frame = 0; frame < 120; frame++) render();
            game.renderer.gameContext.getImageData(0,0,1,1);
            timings[mode].push((performance.now()-start)/120);
            drawCounts[mode] = layerDraws/120;
            await new Promise(resolve => setTimeout(resolve,20));
        }
        let maxPixelDifference = 0;
        for (let i=0;i<pixels.cached.length;i++) maxPixelDifference = Math.max(maxPixelDifference,Math.abs(pixels.cached[i]-pixels.uncached[i]));
        layers.forEach(layer=>layer.setVisible(false)); caches.forEach(image=>image.setVisible(true));
        if (drawCounts.cached !== 0 || drawCounts.uncached !== 4) throw Error('Static tiles still redrawn');
        if (maxPixelDifference > 1) throw Error('Cached environment changed source appearance: '+maxPixelDifference);
        return {status:'passed',renderer:'Canvas',style:'data-blue',viewport:[game.canvas.width,game.canvas.height],timingsMsPerFrame:timings,tilemapDrawsPerFrame:drawCounts,maxPixelDifference,
            scope:'Static scene drawing on a local headless Canvas renderer; not a device FPS measurement'};
    })()`);
    if (browser.errors.length) throw Error(JSON.stringify(browser.errors));
    const report = { ...result, consoleErrors: browser.errors, generatedAt: new Date().toISOString() };
    writeFileSync('docs/test-results/sprint-8-performance.json', JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
} finally { browser.close(); }

import { mkdirSync, writeFileSync } from 'node:fs';
import { openBrowserSession } from './browser-session.mjs';

const b = await openBrowserSession();
const directory = 'docs/test-results/visual-handoff';
mkdirSync(directory, { recursive: true });
const checks = [];
const check = async (label, expression) => {
    if (!await b.evaluate(expression)) throw new Error(label);
    checks.push(label);
};
const shot = async name => {
    const data = await b.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${directory}/${name}.png`, Buffer.from(data.data, 'base64'));
};
try {
    await b.send('Emulation.setDeviceMetricsOverride', { width:1280, height:800, deviceScaleFactor:1, mobile:false });
    await b.send('Page.navigate', { url:`${b.baseUrl}/tests/selection.html` });
    await b.waitUntil("window.selectionResults?.status !== 'running' && window.selectionResults?.status", 30000);
    await check('Selection and narrative integration passed', "window.selectionResults.status === 'passed'");
    await b.evaluate(`document.getElementById('results').style.display='none'; document.documentElement.style.overflow='hidden'; document.body.style.overflow='hidden'; document.querySelector('canvas').style.display='block';
        void window.selectionGame.scene.getScene('CharacterSelectScene').scene.start('VisualNovelScene', {route:'alex', resume:false});`);
    await b.waitUntil("document.querySelector('.vn-skip')");
    await b.evaluate("document.querySelector('.vn-skip').click()");
    await check('Narrative handoff immediately covers the viewport', "document.querySelector('.scene-transition')?.getBoundingClientRect().width === innerWidth");
    await shot('story-to-controls');
    await b.waitUntil("document.querySelector('.controls-start') && !document.querySelector('.scene-transition')");
    await check('Controls reveal without starting combat', "!window.selectionGame.scene.isActive('GameScene')");

    // A deliberately uncached asset and network latency exercise a real pending loader.
    await b.send('Network.enable');
    await b.send('Network.emulateNetworkConditions', {offline:false, latency:600, downloadThroughput:-1, uploadThroughput:-1});
    await b.evaluate(`(() => { const s=window.selectionGame.scene.getScene('GameScene'); window.originalGamePreload=s.preload;
        s.preload=function(){window.originalGamePreload.call(this);this.load.image('handoff-probe','assets/ui/alex-ability-icon.png?handoff='+Date.now());};
        document.querySelector('.controls-start').click(); })()`);
    await check('Game handoff immediately has a loading panel', "document.querySelector('.scene-transition p').textContent.includes('habitación')");
    await b.waitUntil("window.selectionGame.scene.getScene('GameScene').load.isLoading()");
    await check('Panel remains visible during delayed asset loading', "!document.querySelector('.scene-transition').classList.contains('is-ready') && getComputedStyle(document.querySelector('.scene-transition')).opacity === '1'");
    await shot('loading-room');
    await b.waitUntil("window.selectionGame.scene.isActive('GameScene') && !document.querySelector('.scene-transition')", 20000);
    await b.send('Network.emulateNetworkConditions', {offline:false, latency:0, downloadThroughput:-1, uploadThroughput:-1});
    await b.waitUntil("window.selectionGame.scene.getScene('GameScene').enemies.getChildren().every(e => !e.isSpawning)");
    await b.evaluate("window.selectionGame.scene.getScene('GameScene').preload=window.originalGamePreload; void window.selectionGame.scene.getScene('GameScene').physics.pause()");
    await check('Destination is ready and loading DOM is released', "!!window.selectionGame.scene.getScene('GameScene').player && !document.querySelector('.controls-screen') && !document.querySelector('.scene-transition')");
    await check('Red source uses the new 887x1774 sheet', "(() => {const i=window.selectionGame.textures.get('robot-red-source').getSourceImage();return i.width===887 && i.height===1774;})()");
    await check('Red frames preserve the 64px physics/render contract', "(() => {const g=window.selectionGame;return g.textures.get('robot-red').frameTotal===67 && g.anims.get('robot-death').frames.length===6 && g.anims.get('robot-walk-down').frames.every(f=>f.frame.width===64&&f.frame.height===64);})()");
    await shot('red-in-game');
    await b.evaluate(`(() => {
        const g=window.selectionGame, texture=g.textures.get('robot-red');
        const panel=document.createElement('section');panel.id='red-frame-preview';
        panel.style.cssText='position:fixed;inset:0;z-index:20000;background:#122333;color:white;padding:20px;font:16px sans-serif;display:flex;gap:24px;justify-content:center';
        const canvas=document.createElement('canvas');canvas.width=384;canvas.height=704;canvas.style.cssText='width:384px;height:704px;image-rendering:pixelated';
        const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
        const names=['idle','walk-up','walk-down','walk-right','walk-left','special-a1','special-a2','special-b1','special-b2','hit','death'];
        let used=0;
        for(let row=0;row<names.length;row++) {
            const anim=g.anims.get('robot-'+names[row]);
            for(let col=0;col<anim.frames.length;col++) {
                const f=anim.frames[col].frame;
                ctx.drawImage(texture.getSourceImage(),f.cutX,f.cutY,64,64,col*64,row*64,64,64);
                const pixels=ctx.getImageData(col*64,row*64,64,64).data;
                let opaque=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)opaque++;
                if(opaque<300)throw Error('Empty/corrupt red animation '+names[row]+' frame '+col);
                used++;
            }
        }
        const labels=document.createElement('div');labels.innerHTML=names.map(n=>'<div style="height:64px;display:flex;align-items:center">'+n+'</div>').join('');
        panel.append(canvas,labels);document.body.append(panel);window.redPreviewFrames=used;
    })()`);
    await check('All 53 used red animation frames contain visible artwork', 'window.redPreviewFrames === 53');
    await shot('red-animation-frames');
    await b.evaluate("document.getElementById('red-frame-preview').remove()");
    writeFileSync(`${directory}/integration.json`, JSON.stringify({status:'passed', checks, consoleErrors:b.errors},null,2));
    console.log(JSON.stringify({status:'passed', checks, consoleErrors:b.errors},null,2));
    if (b.errors.length) process.exitCode=1;
} finally {
    await b.send('Network.emulateNetworkConditions', {offline:false, latency:0, downloadThroughput:-1, uploadThroughput:-1});
    await b.send('Emulation.clearDeviceMetricsOverride');
    b.close();
}

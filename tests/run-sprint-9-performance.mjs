import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowserSession} from './browser-session.mjs';
const browser=await openBrowserSession();
try{
    await browser.send('Page.navigate',{url:`${browser.baseUrl}/tests/sprint-9.html`});
    await browser.waitUntil("window.sprint9Results && window.sprint9Results.status!=='running'",90000);
    if(await browser.evaluate("window.sprint9Results.status!=='passed'"))throw Error(JSON.stringify(await browser.evaluate('window.sprint9Results')));
    const result=await browser.evaluate(`(async()=>{
        const game=window.sprint9Game,scene=game.scene.getScene('GameScene');
        game.scale.resize(1920,1080);game.loop.sleep();
        const camera=scene.cameras.main;camera.stopFollow().setZoom(1).setScroll(0,0);camera.roundPixels=false;camera.renderRoundPixels=false;
        const layers=scene.children.list.filter(object=>object.type==='TilemapLayer');
        const chunks=layers.flatMap(layer=>layer.getData('environment-caches')??[]);
        const visibility=new Map(scene.children.list.map(object=>[object,object.visible]));
        const environment=new Set([...layers,...chunks]);
        for(const object of scene.children.list)if(!environment.has(object))object.visible=false;
        const render=()=>{game.renderer.preRender();scene.sys.render(game.renderer);game.renderer.postRender();};
        let layerDraws=0;const originalDraws=new Map();
        for(const layer of layers){originalDraws.set(layer,layer.renderCanvas);layer.renderCanvas=function(...args){layerDraws++;return originalDraws.get(this).apply(this,args);};}
        const timings={uncached:[],cached:[]},draws={},pixels={};
        for(let round=0;round<4;round++)for(const mode of round%2?['cached','uncached']:['uncached','cached']){
            layers.forEach(layer=>layer.visible=mode==='uncached');chunks.forEach(image=>image.visible=mode==='cached');
            render();
            if(!pixels[mode])pixels[mode]=game.renderer.gameContext.getImageData(0,0,1920,1080).data;
            layerDraws=0;const start=performance.now();
            for(let frame=0;frame<120;frame++)render();
            game.renderer.gameContext.getImageData(0,0,1,1);
            timings[mode].push((performance.now()-start)/120);draws[mode]=layerDraws/120;
            await new Promise(resolve=>setTimeout(resolve,20));
        }
        let maxPixelDifference=0;
        for(let i=0;i<pixels.cached.length;i++)maxPixelDifference=Math.max(maxPixelDifference,Math.abs(pixels.cached[i]-pixels.uncached[i]));
        for(const [layer,render]of originalDraws)layer.renderCanvas=render;
        for(const [object,visible]of visibility)object.visible=visible;
        scene.layoutRoom();game.loop.wake();
        if(maxPixelDifference>1||draws.cached!==0||draws.uncached!==4)throw Error('Chunk rendering regression: '+JSON.stringify({maxPixelDifference,draws}));
        if(chunks.some(image=>image.texture.source[0].width>512||image.texture.source[0].height>512))throw Error('Oversized static chunk');
        return {status:'passed',renderer:'Canvas',viewport:[1920,1080],room:[40,24],chunkCount:chunks.length,
            cachePixelBytes:chunks.reduce((sum,image)=>sum+image.texture.source[0].width*image.texture.source[0].height*4,0),timingsMsPerFrame:timings,tilemapDrawsPerFrame:draws,maxPixelDifference,
            scope:'Local static Canvas draw comparison at native scale, not a device FPS guarantee'};
    })()`);
    if(browser.errors.length)throw Error(JSON.stringify(browser.errors));
    const report={...result,consoleErrors:browser.errors,generatedAt:new Date().toISOString()};
    const directory=process.argv.includes('--sprint10')?'docs/test-results/sprint-10':'docs/test-results';
    mkdirSync(directory,{recursive:true});
    writeFileSync(`${directory}/${process.argv.includes('--sprint10')?'performance':'sprint-9-performance'}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{browser.close();}

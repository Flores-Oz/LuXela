import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowserSession} from './browser-session.mjs';
const browser=await openBrowserSession();
const directory='docs/test-results/sprint-10';
mkdirSync(directory,{recursive:true});
try {
    await browser.send('Emulation.setDeviceMetricsOverride',{width:1600,height:960,deviceScaleFactor:1,mobile:false});
    await browser.send('Page.navigate',{url:`${browser.baseUrl}/tests/sprint-9.html`});
    await browser.waitUntil("window.sprint9Results?.status==='passed'",90000);
    const summaries=[];
    for(let index=0;index<5;index++){
        await browser.waitUntil(`window.sprint9Game.scene.getScene('GameScene').roomIndex===${index} && window.sprint9Game.scene.getScene('GameScene').player`);
        summaries.push(await browser.evaluate(`(()=>{
            const game=window.sprint9Game,s=game.scene.getScene('GameScene'),config=s.levels.getLevel(${index});
            game.scale.resize(1600,960);s.physics.pause();s.cameras.main.stopFollow().setZoom(.625).centerOn(1280,768);s.hud.layout();s.briefing.layout();
            return {level:${index+1},title:config.presentation.title,availability:config.availability,style:config.presentation.environmentStyle,
                robots:[...new Set(s.enemyManager.getLivingEnemies().map(e=>e.texture.key))],walls:s.walls.getLength(),decorations:config.presentation.decorations.length};
        })()`));
        await new Promise(resolve=>setTimeout(resolve,180));
        const screenshot=await browser.send('Page.captureScreenshot',{format:'png'});
        writeFileSync(`${directory}/level-${index+1}.png`,Buffer.from(screenshot.data,'base64'));
        // Overview is for composition review; native-size screenshots retain the production camera.
        await browser.evaluate(`(()=>{const s=window.sprint9Game.scene.getScene('GameScene');s.layoutRoom();})()`);
        await new Promise(resolve=>setTimeout(resolve,180));
        const native=await browser.send('Page.captureScreenshot',{format:'png'});
        writeFileSync(`${directory}/level-${index+1}-native.png`,Buffer.from(native.data,'base64'));
        if(index<4)await browser.evaluate(`(()=>{const s=window.sprint9Game.scene.getScene('GameScene');while(!s.waves.isComplete){s.enemyManager.defeatLivingEnemies();s.waves.update(1000);}s.changeRoom();})()`);
    }
    if(browser.errors.length)throw Error(JSON.stringify(browser.errors));
    const report={generatedAt:new Date().toISOString(),renderer:'Canvas',overviewZoom:.625,nativeZoom:1,viewport:[1600,960],consoleErrors:browser.errors,rooms:summaries};
    writeFileSync(`${directory}/visual-review.json`,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
}finally{await browser.send('Emulation.clearDeviceMetricsOverride');browser.close();}

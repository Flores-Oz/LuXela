import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowserSession} from './browser-session.mjs';
const b=await openBrowserSession(), checks=[];
const g='window.combatGame', s=`${g}.scene.getScene('GameScene')`, over=`${g}.scene.getScene('GameOverScene')`;
const dir='docs/test-results/game-over';mkdirSync(dir,{recursive:true});
const check=async(name,expression)=>{if(!await b.evaluate(expression))throw Error(name);checks.push(name);};
const key=async(key,code,windowsVirtualKeyCode)=>{
    await b.send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode});
    await b.send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode});
};
async function defeat(character){
    await b.evaluate(`(()=>{const game=${g},runs=game.registry.get('arcade-run-service'),id=runs.begin('${character}');
        runs.awardKill(id,0,'entry',1200);runs.clearRoom(id,0);runs.advance(id,0);
        window.gameOverTestRun=id;window.previousPlayer=${s}.player;
        game.scene.getScenes(true)[0].scene.start('GameScene',{character:'${character}',roomIndex:1,runId:id});})()`);
    await b.waitUntil(`${g}.scene.isActive('GameScene') && ${s}.roomIndex===1 && ${s}.player && ${s}.player!==window.previousPlayer`);
    await b.evaluate(`(()=>{const scene=${s};scene.sys.sceneUpdate=()=>{};scene.game.registry.get('arcade-run-service').awardKill(scene.runId,1,'extra',300);scene.player.die();})()`);
    await b.waitUntil(`${g}.scene.isActive('GameOverScene') && ${over}.view`);
    await new Promise(r=>setTimeout(r,300));
}
try{
    await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await b.send('Page.navigate',{url:`${b.baseUrl}/tests/combat.html`});
    await b.waitUntil("window.combatResults && window.combatResults.status!=='running'",30000);
    await check('Existing combat and retry integration passes',"window.combatResults.status==='passed'");
    await b.evaluate(`document.getElementById('results').style.display='none';document.body.style.margin='0';document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';void ${g}.scale.resize(1280,800)`);
    for(const character of ['alex','lua']){
        await defeat(character);
        await check(`${character}: actual room snapshot survives gameplay cleanup`,`${g}.textures.exists('game-over-backdrop') && !${g}.scene.isActive('GameScene')`);
        await check(`${character}: score and level show the defeated run`,`${over}.view.scoreValue.text==='01500' && ${over}.view.levelValue.text==='02'`);
        await check(`${character}: correct defeated character and supplied panel`,`${over}.view.portrait.texture.key==='${character}-defeat' && ${over}.view.panel.length===3`);
        for(const [width,height] of [[1280,800],[1920,1080],[844,390],[390,844],[360,640]]){
            await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
            await b.evaluate(`void ${g}.scale.resize(${width},${height})`);
            await new Promise(r=>setTimeout(r,100));
            await check(`${character} ${width}x${height}: readable controls fit without overlap`,`(()=>{const v=${over}.view,rects=v.buttons.map(b=>b.getBounds());return rects.every((r,i)=>r.x>=0&&r.right<=${width}&&r.y>=0&&r.bottom<=${height}&&(!i||r.y>=rects[i-1].bottom+4))&&v.hint.getBounds().top>=rects[2].bottom;})()`);
            const image=await b.send('Page.captureScreenshot',{format:'png'});
            writeFileSync(`${dir}/${character}-${width}x${height}.png`,Buffer.from(image.data,'base64'));
        }
        await key('ArrowDown','ArrowDown',40);
        await check(`${character}: arrows select the next action`,`${over}.view.selected===1`);
        await key('r','KeyR',82);
        await b.waitUntil(`${g}.scene.isActive('GameScene') && ${s}.player && !${s}.player.isDead()`);
        await check(`${character}: R retries the same room and restores its checkpoint`,`${s}.roomIndex===1 && ${s}.selectedCharacter==='${character}' && ${s}.runId===window.gameOverTestRun && ${g}.registry.get('arcade-run-service').getScore(${s}.runId)===1200`);
        await check(`${character}: background and keyboard listeners released on retry`, `!${g}.textures.exists('game-over-backdrop') && ${over}.view===null && ${over}.input.keyboard.listenerCount('keydown-DOWN')===0`);
    }
    await defeat('alex');await key('ArrowDown','ArrowDown',40);
    await check('Keyboard focuses character selection before confirming',`${over}.view.selected===1`);
    await key('Enter','Enter',13);
    await b.waitUntil(`${g}.scene.isActive('CharacterSelectScene')`);
    await check('Enter confirms character selection instead of restarting',`!${g}.scene.isActive('GameScene')`);
    await defeat('lua');
    const point=await b.evaluate(`(()=>{${g}.scale.updateBounds();const r=${over}.view.buttons[2].getBounds(),c=${g}.canvas.getBoundingClientRect();return {x:c.left+r.centerX*c.width/${g}.canvas.width,y:c.top+r.centerY*c.height/${g}.canvas.height};})()`);
    await b.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
    await b.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
    await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
    await b.waitUntil(`${g}.scene.isActive('MainMenuScene')`);
    await check('Pointer returns to the main menu and releases the background',`!${g}.textures.exists('game-over-backdrop')`);
    const report={status:'passed',checks,count:checks.length,consoleErrors:b.errors};
    writeFileSync(`${dir}/integration.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
    if(b.errors.length)process.exitCode=1;
}finally{await b.send('Emulation.clearDeviceMetricsOverride');b.close();}

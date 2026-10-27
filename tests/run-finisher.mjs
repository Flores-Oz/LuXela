import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowserSession} from './browser-session.mjs';
const b=await openBrowserSession(),checks=[];
const directory='docs/test-results/quimera-finisher';mkdirSync(directory,{recursive:true});
const s="window.finisherGame.scene.getScene('GameScene')",e=`${s}?.bossEncounter`,c=`${e}.finisher.challenge`;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const check=async(name,expression)=>{if(!await b.evaluate(`Boolean(${expression})`))throw Error(name);checks.push(name);};
const key=async(code,repeat=false)=>{const vk={Space:32,ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Escape:27,Enter:13}[code];await b.send('Input.dispatchKeyEvent',{type:'keyDown',code,key:code==='Space'?' ':code,windowsVirtualKeyCode:vk,autoRepeat:repeat});await b.send('Input.dispatchKeyEvent',{type:'keyUp',code,key:code==='Space'?' ':code,windowsVirtualKeyCode:vk});await pause(40);};
const start=async(character)=>{
    const before=await b.evaluate(`${s}.previewGeneration??0`);
    await b.evaluate(`window.previewFinisher('${character}')`);
    await b.waitUntil(`${s}.previewGeneration>${before} && ${e}?.boss.controller.vulnerable`);
    await b.evaluate("document.querySelector('#trigger').click()");
    await check(`${character}: health below ten percent does not trigger from far away`,`${e}.boss.controller.health===6 && ${c}.state==='idle' && !${s}.physics.world.isPaused`);
    // Run the actual GameScene.update and walk into range using native keyboard input.
    await b.evaluate(`(()=>{const scene=${s};scene.player.physicsSprite.body.reset(1000,768);scene.liveCombat=true;})()`);
    await b.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyD',key:'d',windowsVirtualKeyCode:68});
    await b.waitUntil(`${c}.state==='prompt'`);
    await b.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyD',key:'d',windowsVirtualKeyCode:68});
    await check(`${character}: normal combat walking into range triggers the remate`, `Math.hypot(${s}.player.x-${e}.boss.x,${s}.player.y-${e}.boss.y)<=160 && ${e}.boss.controller.health===6`);
};
const capture=async(name)=>{const {data}=await b.send('Page.captureScreenshot',{format:'png'});writeFileSync(`${directory}/${name}.png`,Buffer.from(data,'base64'));};
try{
    await b.send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
    await b.send('Page.navigate',{url:`${b.baseUrl}/tests/quimera-finisher.html`});
    await b.waitUntil(`window.finisherGame && ${e}?.boss.controller.vulnerable`);
    for(const character of ['alex','lua']){
        await start(character);
        await check(`${character}: proximity pauses physics, clears projectiles and leaves boss alive`,`${e}.boss.controller.health===6 && ${e}.boss.active && ${s}.physics.world.isPaused && ${s}.playerProjectiles.getLength()===0 && ${s}.enemyProjectiles.getLength()===0`);
        await key(character==='alex'?'ArrowLeft':'ArrowUp',true);
        await check(`${character}: held keys cannot advance QTE`,`${c}.step===0`);
        await key('Escape');await b.waitUntil("document.querySelector('.pause-screen')");
        const remaining=await b.evaluate(`${c}.remaining`);await pause(180);
        await check(`${character}: pause freezes the input deadline`,`${c}.remaining===${remaining}`);
        await b.evaluate("[...document.querySelectorAll('.pause-screen button')].find(n=>n.textContent==='Continuar').click()");
        await b.waitUntil("!document.querySelector('.pause-screen')");
        if(character==='alex')await capture('quicktime-event');
        for(const code of ['ArrowLeft','ArrowUp','ArrowDown','ArrowRight','Space'])await key(code);
        await check(`${character}: actual keyboard sequence starts the correct finisher`,`${c}.state==='animating' && ${e}.boss.controller.state==='FINISHING' && ${e}.finisher.root.list[1].texture.key==='boss-finisher-${character}'`);
        await key('Escape');await b.waitUntil("document.querySelector('.pause-screen')");
        const elapsed=await b.evaluate(`${c}.elapsed`),frame=await b.evaluate(`${e}.finisher.root.list[1].frame.name`);await pause(180);
        await check(`${character}: pause freezes animation frame and clock`,`${c}.elapsed===${elapsed} && ${e}.finisher.root.list[1].frame.name===${JSON.stringify(frame)}`);
        await b.evaluate("[...document.querySelectorAll('.pause-screen button')].find(n=>n.textContent==='Continuar').click()");
        await b.waitUntil(`${c}.elapsed>1000`);await capture(`${character}-finisher`);
        await check(`${character}: boss cannot die before the animation ends`,`${e}.boss.controller.health>0 && ${s}.combatState==='playing'`);
        await b.waitUntil("window.finisherGame.scene.isActive('VisualNovelScene')");
        await check(`${character}: finisher leads to the existing correct ending`, `window.finisherGame.scene.getScene('VisualNovelScene').sequence.id==='${character}_ending'`);
    }
    await start('alex');await key('ArrowDown');
    await check('Wrong key resumes combat and spends the single attempt',`${c}.state==='failed' && !${s}.physics.world.isPaused && ${e}.boss.controller.finisherTriggered && ${e}.boss.controller.alive`);
    await b.evaluate(`(()=>{${e}.boss.receiveDamage(999);})()`);
    await check('Further hits defeat the boss normally without another QTE',`${e}.boss.isDead() && ${s}.combatState==='boss-destruction'`);
    await start('lua');await b.waitUntil(`${c}.state==='failed'`);
    await check('Timeout resumes combat without a false victory',`!${s}.physics.world.isPaused && ${e}.boss.controller.alive && !window.finisherGame.scene.isActive('VisualNovelScene')`);
    await start('alex');
    await b.evaluate(`(()=>{window.oldFinisher=${e}.finisher;window.oldBoss=${e}.boss;})()`);
    await start('lua');
    await check('Changing preview cleans up old challenge and boss',"window.oldFinisher.challenge.state==='cancelled' && !window.oldBoss.active");
    await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
    await pause(100);
    await check('Mobile QTE retains a readable on-screen button',`${e}.finisher.root.visible && ${e}.finisher.root.list[3].text==='\u2190'`);
    // Exercise Phaser's real pointer input, including inverse camera zoom.
    for(let i=0;i<5;i++){
        const p=await b.evaluate(`(()=>{const f=${e}.finisher,k=f.root.list[3],cam=${s}.cameras.main,z=cam.zoom;return {x:cam.width/2+(f.root.x+k.x*f.root.scaleX-cam.width/2)*z,y:56+cam.height/2+(f.root.y+k.y*f.root.scaleY-cam.height/2)*z};})()`);
        await b.send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});
        await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
        await pause(40);
    }
    await check('Mobile pointer can complete all five steps',`${c}.state==='animating'`);
    await capture('mobile-finisher');
    if(b.errors.length)throw Error(JSON.stringify(b.errors));
    const report={status:'passed',count:checks.length,checks,consoleErrors:b.errors,generatedAt:new Date().toISOString()};
    writeFileSync(`${directory}/integration.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await b.send('Emulation.clearDeviceMetricsOverride');b.close();}



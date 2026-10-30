import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowserSession} from './browser-session.mjs';
const b=await openBrowserSession(),checks=[],s="window.bossLab.game.scene.getScene('GameScene')",g='window.bossLab.game';
const check=async(name,expression)=>{if(!await b.evaluate(`Boolean(${expression})`))throw Error(name);checks.push(name);};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const ready=async(level,character,old=-1)=>b.waitUntil(`window.bossLab && ${s}?.roomIndex===${level-1} && ${s}.selectedCharacter==='${character}' && ${s}.runId!==${old} && ${s}.bossEncounter?.boss && ${g}.scene.isActive('GameScene')`,20000);
const click=async text=>b.evaluate(`[...document.querySelectorAll('.presentation-actions button')].find(button=>button.textContent==='${text}').click()`);
const quiet=()=>b.evaluate(`(()=>{const s=${s};s.sys.sceneUpdate=()=>{};s.physics.pause();})()`);
const choose=async(level,character)=>{
    const before=await b.evaluate(`${s}?.runId??-1`);
    await b.evaluate(`(()=>{document.querySelector('#boss-level').value='${level}';document.querySelector('#boss-character').value='${character}';document.querySelector('#boss-start').click();})()`);
    await ready(level,character,before);
};
try{
    await b.send('Page.navigate',{url:b.baseUrl+'/bosses.html'});await ready(5,'alex');
    const originalStorage=await b.evaluate('JSON.stringify({...localStorage})');
    await check('Default page boots directly into the first boss with no campaign menu',`${s}.roomIndex===4 && !${g}.scene.isActive('MainMenuScene') && !${g}.scene.isActive('BossPracticeBoot')`);
    const x=await b.evaluate(`${s}.player.x`);
    await b.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyD',key:'d',windowsVirtualKeyCode:68});await delay(160);
    await b.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyD',key:'d',windowsVirtualKeyCode:68});
    await check('Real keyboard input moves the player in the practice arena',`${s}.player.x>${x}+5`);
    for(const character of ['alex','lua'])for(const level of [5,11]){
        await choose(level,character);await quiet();
        await check(`${character} level ${level}: correct boss profile, no ordinary waves or intro`,`${s}.bossEncounter.boss.controller.config.phasePatterns.length===${level===5?2:3} && ${s}.enemyManager.aliveCount===0 && !${g}.scene.isActive('VisualNovelScene')`);
        const id=await b.evaluate(`${s}.runId`);
        await b.evaluate(`${s}.pauseGame()`);await b.waitUntil("document.querySelector('.pause-screen')");
        await click('Reintentar este jefe');await ready(level,character,id);await quiet();
        await check(`${character} level ${level}: pause restart stays on the selected boss`,`${s}.roomIndex===${level-1} && ${s}.bossEncounter.boss.controller.health===${level===5?72:144}`);
        await b.evaluate(`${s}.player.die()`);await b.waitUntil(`${g}.scene.isActive('GameOverScene')`,10000);
        const deadRun=await b.evaluate(`${s}.runId`);await click('Reintentar este jefe');await ready(level,character,deadRun);await quiet();
        await check(`${character} level ${level}: defeat retry restores the same encounter`,`${s}.roomIndex===${level-1} && !${s}.player.isDead()`);
        if(character==='alex'){
            await b.evaluate(`(()=>{const s=${s};s.cameras.main.stopFollow().setZoom(.5).centerOn(1280,768);})()`);await delay(80);
            mkdirSync('docs/test-results/boss-lab',{recursive:true});const {data}=await b.send('Page.captureScreenshot',{format:'png'});writeFileSync(`docs/test-results/boss-lab/level-${level}.png`,Buffer.from(data,'base64'));
        }
        await b.evaluate(`(()=>{const e=${s}.bossEncounter;e.update(1500);e.boss.receiveDamage(999);})()`);
        await b.waitUntil(`${g}.scene.isActive('CompletionScene')`,10000);
        await check(`${character} level ${level}: victory returns lab options instead of normal levels`, `document.querySelector('.completion-screen h1')?.textContent==='Quimera derrotado' && !${g}.scene.isActive('GameScene')`);
        await click('Probar el otro jefe');await ready(level===5?11:5,character);await quiet();
        await check(`${character} level ${level}: next fight is exclusively the other boss`,`${s}.roomIndex===${level===5?10:4}`);
    }
    await check('Practice unlocks never change persistent campaign storage',`JSON.stringify({...localStorage})===${JSON.stringify(originalStorage)}`);
    const report={status:'passed',count:checks.length,checks,consoleErrors:b.errors};mkdirSync('docs/test-results/boss-lab',{recursive:true});writeFileSync('docs/test-results/boss-lab/integration.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
    if(b.errors.length)process.exitCode=1;
}finally{b.close();}

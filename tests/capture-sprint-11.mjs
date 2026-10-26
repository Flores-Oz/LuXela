import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowserSession} from './browser-session.mjs';
const browser=await openBrowserSession(),directory='docs/test-results/sprint-11';
mkdirSync(directory,{recursive:true});
const resize=async(width,height)=>{await browser.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await new Promise(resolve=>setTimeout(resolve,180));};
const capture=async name=>{
    await new Promise(resolve=>setTimeout(resolve,160));
    const shot=await browser.send('Page.captureScreenshot',{format:'png'});
    writeFileSync(`${directory}/${name}.png`,Buffer.from(shot.data,'base64'));
};
try {
    await resize(1366,768);
    await browser.send('Page.navigate',{url:`${browser.baseUrl}/tests/sprint-11.html`});
    await browser.waitUntil("window.sprint11Results && window.sprint11Results.status!=='running'",90000);
    const integration=await browser.evaluate('window.sprint11Results');
    if(integration.status!=='passed')throw Error(integration.error);
    await browser.evaluate(`(()=>{
        const s=window.sprint11Game.scene.getScene('GameScene'),b=s.bossEncounter.boss;
        s.physics.pause();b.body.reset(1280,768);b.setVelocity(0,0);s.player.physicsSprite.body.reset(990,768);
        s.cameras.main.stopFollow().centerOn(1280,768);s.bossEncounter.update(1);b.setVelocity(0,0);s.bossEncounter.healthBar.update(b.controller,0);
    })()`);
    await capture('phase-1');
    // Render all 53 production atlas frames on a neutral QA background for orientation/anchor review.
    await resize(1152,1944);
    await browser.evaluate(`(()=>{
        const atlas=window.sprint11Game.textures.get('quimera').getSourceImage(),root=document.createElement('div');
        root.id='quimera-gallery';Object.assign(root.style,{position:'fixed',inset:'0',zIndex:'9999',display:'grid',gridTemplateColumns:'repeat(6,192px)',background:'#182026'});
        for(let i=0;i<54;i++){
            const card=document.createElement('div'),canvas=document.createElement('canvas');canvas.width=192;canvas.height=192;
            const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(atlas,(i%6)*192,Math.floor(i/6)*192,192,192,0,0,192,192);
            const label=document.createElement('div');label.textContent=i<53?'Frame '+i:'Celda sin uso';Object.assign(label.style,{color:'#eee',font:'14px monospace',height:'24px',textAlign:'center'});
            card.append(canvas,label);root.append(card);
        }
        document.body.append(root);
    })()`);
    await capture('animation-frames');
    await browser.evaluate("document.querySelector('#quimera-gallery').remove()");
    await resize(1366,768);
    const advance=`const advance=(condition)=>{for(let i=0;i<4000;i++){if(condition())return;e.update(50);s.enemyProjectiles.clear(true,true);}throw Error('Capture pattern timeout');};`;
    await browser.evaluate(`(()=>{
        const s=window.sprint11Game.scene.getScene('GameScene'),e=s.bossEncounter,b=e.boss;
        s.cameras.main.stopFollow().centerOn(1280,768);${advance}
        b.receiveDamage(22);advance(()=>b.controller.phase===2&&b.controller.state==='REPOSITION');
        advance(()=>b.controller.state==='CHARGING'&&b.controller.attack==='pulse');e.update(400);b.setVelocity(0,0);
    })()`);
    await capture('phase-2-pulse-warning');
    await browser.evaluate(`(()=>{
        const s=window.sprint11Game.scene.getScene('GameScene'),e=s.bossEncounter,b=e.boss;${advance}
        advance(()=>b.controller.state==='CHARGING'&&b.controller.attack==='module'&&b.controller.module==='robot-orange');e.update(500);b.setVelocity(0,0);
    })()`);
    await capture('orange-module-charge');
    await browser.evaluate(`(()=>{
        const s=window.sprint11Game.scene.getScene('GameScene'),e=s.bossEncounter,b=e.boss;
        e.update(500);s.physics.resume();
    })()`);
    await new Promise(resolve=>setTimeout(resolve,280));
    await browser.evaluate("(()=>{window.sprint11Game.scene.getScene('GameScene').physics.pause();})()");
    await capture('orange-module-volley');
    await browser.evaluate(`(()=>{
        const s=window.sprint11Game.scene.getScene('GameScene'),e=s.bossEncounter,b=e.boss;${advance}
        s.enemyProjectiles.clear(true,true);b.receiveDamage(25);advance(()=>b.controller.phase===3&&b.controller.state==='REPOSITION');
        advance(()=>b.controller.state==='CHARGING'&&b.controller.attack==='critical');e.update(700);b.setVelocity(0,0);
    })()`);
    await capture('phase-3-critical-warning');
    await resize(390,844);
    await browser.evaluate(`(()=>{const s=window.sprint11Game.scene.getScene('GameScene'),b=s.bossEncounter.boss;s.player.physicsSprite.body.reset(b.x-100,b.y+180);s.cameras.main.stopFollow().centerOn(s.player.x,s.player.y);s.bossEncounter.healthBar.update(b.controller,0);})()`);
    await capture('boss-mobile');
    await resize(1366,768);
    await browser.evaluate(`(()=>{
        const s=window.sprint11Game.scene.getScene('GameScene');s.cameras.main.stopFollow().centerOn(1280,768);
        s.bossEncounter.boss.receiveDamage(999);
    })()`);
    await capture('destruction');
    await browser.waitUntil("window.sprint11Game.scene.isActive('VisualNovelScene') && document.querySelector('.vn-skip')");
    await capture('alex-ending');
    if(browser.errors.length)throw Error(JSON.stringify(browser.errors));
    const report={status:'captured',generatedAt:new Date().toISOString(),renderer:'Canvas',consoleErrors:browser.errors,
        files:['phase-1','animation-frames','phase-2-pulse-warning','orange-module-charge','orange-module-volley','phase-3-critical-warning','boss-mobile','destruction','alex-ending'].map(name=>`${name}.png`)};
    writeFileSync(`${directory}/visual-review.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.send('Emulation.clearDeviceMetricsOverride');browser.close();}

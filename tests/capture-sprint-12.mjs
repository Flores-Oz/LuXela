import {mkdirSync,writeFileSync} from 'node:fs';import {openBrowserSession} from './browser-session.mjs';
const b=await openBrowserSession(),directory='docs/test-results/sprint-12',files=[];mkdirSync(directory,{recursive:true});
const s="window.sprint12Game.scene.getScene('GameScene')";
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const shot=async name=>{await delay(100);const {data}=await b.send('Page.captureScreenshot',{format:'png'});writeFileSync(`${directory}/${name}.png`,Buffer.from(data,'base64'));files.push(name+'.png');};
const layout=async()=>b.evaluate(`(()=>{const s=${s};s.cameras.main.stopFollow().setZoom(.5).centerOn(1280,768);s.hud.layout();s.briefing?.layout();s.bossEncounter?.healthBar.update(s.bossEncounter.boss.controller,0);})()`);
try{
    await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:768,deviceScaleFactor:1,mobile:false});
    await b.send('Page.navigate',{url:b.baseUrl+'/tests/sprint-12.html'});await b.waitUntil("window.sprint12Results?.status==='passed'",120000);
    await b.evaluate("window.previewSprint12('alex',0)");await b.waitUntil(`${s}.roomIndex===0 && ${s}.player`);await layout();await delay(400);await shot('wave-materialization');
    await b.evaluate(`(async()=>{const {Enemy}=await import('/src/entities/enemies/Enemy.ts'),s=${s};s.enemyManager.defeatLivingEnemies();s.player.physicsSprite.body.reset(600,750);const yellow=new Enemy(s,600,750,'robot-yellow');s.enemies.add(yellow);})()`);
    await b.waitUntil(`${s}.player.isDead()`);await shot('yellow-contact-explosion');
    for(let index=5;index<10;index++){
        await b.evaluate(`window.previewSprint12('alex',${index})`);await b.waitUntil(`${s}.roomIndex===${index} && ${s}.player`);await layout();await shot(`level-${index+1}`);
    }
    await b.evaluate("window.previewSprint12('alex',10)");await b.waitUntil("window.sprint12Game.scene.isActive('VisualNovelScene') && document.querySelector('.vn-skip')");await delay(600);await shot('quimera-intro');
    await b.evaluate("document.querySelector('.vn-skip').click()");await b.waitUntil(`${s}.bossEncounter?.boss.controller.advanced`);await layout();
    await b.evaluate(`(()=>{const s=${s},b=s.bossEncounter.boss;b.controller.update(1500,b,s.player,true);s.bossEncounter.healthBar.update(b.controller,0);})()`);await shot('level-11');
    await b.evaluate(`(async()=>{const {Projectile}=await import('/src/entities/Projectile.ts'),s=${s};s.cameras.main.stopFollow().setZoom(1).centerOn(1280,768);s.hud.layout();s.bossEncounter.healthBar.update(s.bossEncounter.boss.controller,0);
        for(let i=0;i<6;i++)new Projectile(s,1080+i*75,600,s.player.physicsSprite.body.velocity.clone().set(0,0),'enemy',s.enemyProjectiles,0,false,'single',{key:'quimera-projectiles',frame:i%2?4:0});
        new Projectile(s,1100,900,s.player.physicsSprite.body.velocity.clone().set(0,0),'player',s.playerProjectiles,0);
        new Projectile(s,1450,900,s.player.physicsSprite.body.velocity.clone().set(0,0),'enemy',s.enemyProjectiles,0);
    })()`);await shot('larger-projectiles');
    await b.evaluate(`(()=>{const s=${s};s.enemyProjectiles.clear(true,true);s.playerProjectiles.clear(true,true);})()`);await layout();
    await b.evaluate(`(async()=>{const {fireEnemyShots}=await import('/src/systems/EnemyProjectiles.ts'),s=${s},e=s.bossEncounter,c=e.boss.controller;c.health=70;s.player.physicsSprite.body.reset(1000,768);let f;
        for(let i=0;i<1000;i++){f=c.update(25,e.boss,s.player,true);if(f.shots.some(shot=>shot.piercesInteriorWalls))break;}
        fireEnemyShots(s,e.boss,f.shots,s.enemyProjectiles,72,true);e.healthBar.update(c,0);
    })()`);await delay(200);await shot('arsenal-orange-spread');
    await b.evaluate(`(()=>{const s=${s};s.enemyProjectiles.clear(true,true);})()`);
    await b.evaluate(`(async()=>{const {fireEnemyShots}=await import('/src/systems/EnemyProjectiles.ts'),s=${s},e=s.bossEncounter,c=e.boss.controller;let volleys=0;
        for(let i=0;i<1000&&volleys<2;i++){const f=c.update(25,e.boss,s.player,true);if(f.shots.length){fireEnemyShots(s,e.boss,f.shots,s.enemyProjectiles,72,true);volleys++;}}
    })()`);await delay(150);await shot('arsenal-red-blue');
    await b.evaluate(`(()=>{const s=${s},e=s.bossEncounter,c=e.boss.controller;s.enemyProjectiles.clear(true,true);for(let i=0;i<1000;i++){c.update(25,e.boss,s.player,true);if(c.state==='CHARGING'&&c.attack==='beam')break;}e.effects.update(0,{shots:[],pulse:false});})()`);await shot('arsenal-beam-warning');

    await b.evaluate(`(()=>{const s=${s},e=s.bossEncounter,b=e.boss;b.controller.health=22;b.controller.phase=4;b.controller.state='CHARGING';b.controller.attack='beam';b.controller.aim=0;s.player.physicsSprite.body.reset(600,768);e.effects.update(0,{shots:[],pulse:false});e.healthBar.update(b.controller,0);})()`);await shot('beam-warning');
    await b.evaluate(`(()=>{const s=${s},e=s.bossEncounter;e.effects.update(0,{shots:[],pulse:false,beam:true});})()`);await shot('beam-active');
    await b.evaluate(`(()=>{const e=${s}.bossEncounter;e.effects.clear();e.boss.controller.attack='shockwave';e.effects.update(650,{shots:[],pulse:false,shockwave:true});})()`);await shot('shockwave-active');
    await b.evaluate(`(()=>{const e=${s}.bossEncounter;e.effects.clear();e.reinforcements.request();e.reinforcements.update(500);})()`);await shot('reinforcement-warning');
    for(const [width,height]of [[390,844],[844,390],[1920,1080]]){
        await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(150);
        await shot(`final-${width}x${height}`);
    }
    if(b.errors.length)throw Error(JSON.stringify(b.errors));
    writeFileSync(`${directory}/visual-review.json`,JSON.stringify({generatedAt:new Date().toISOString(),files,consoleErrors:b.errors},null,2)+'\n');console.log(JSON.stringify({files,consoleErrors:b.errors},null,2));
}finally{await b.send('Emulation.clearDeviceMetricsOverride');b.close();}

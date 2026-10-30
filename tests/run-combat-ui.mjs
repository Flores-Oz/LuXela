import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowserSession} from './browser-session.mjs';
const b=await openBrowserSession(),directory='docs/test-results/combat-ui',checks=[],screenshots=[];
const check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name);};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const s="window.sprint12Game.scene.getScene('GameScene')";
const capture=async name=>{const {data}=await b.send('Page.captureScreenshot',{format:'png'});writeFileSync(`${directory}/${name}.png`,Buffer.from(data,'base64'));screenshots.push(name+'.png');};
async function preview(character,index){
    const old=await b.evaluate(`${s}.generation`);
    await b.evaluate(`void window.previewSprint12('${character}',${index})`);
    if(index===10){await b.waitUntil("document.querySelector('.vn-skip')");await b.evaluate("document.querySelector('.vn-skip').click()");}
    await b.waitUntil(`${s}.generation!==${old}&&${s}.roomIndex===${index}&&${s}.player`);
    await b.evaluate(`(()=>{const s=${s};s.manual=true;s.physics.pause();document.querySelector('#results')?.setAttribute('hidden','');document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';s.cameras.main.stopFollow();})()`);
}
try{
    mkdirSync(directory,{recursive:true});
    if(!process.argv.includes('--reuse'))await b.send('Page.navigate',{url:b.baseUrl+'/tests/sprint-13.html'});
    await b.waitUntil("window.sprint13Results && window.sprint13Results.status!=='running'",150000);
    check('Current campaign and boss combat pass before UI checks',await b.evaluate("window.sprint13Results.status==='passed'"));
    await b.evaluate("(async()=>{window.combatUI=await import('/src/ui/CombatUI.ts');})()");
    for(const character of ['alex','lua']){
        await preview(character,0);
        for(const [width,height]of [[1920,1080],[1280,768],[800,600],[390,844],[844,390]]){
            await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(170);
            for(const [count,state]of [[0,'locked'],[7,'locked'],[10,'ready']]){
                const info=await b.evaluate(`(()=>{
                    const s=${s},c=s.cameras.main;c.setZoom(Math.max(.65,c.width/s.physics.world.bounds.width,c.height/s.physics.world.bounds.height)).centerOn(1280,768);
                    const p=window.combatUI.combatUILayout(s.scale.width,s.scale.height).pause;window.combatUI.anchorCombatUI(s,s.pauseButton,p.x,p.y);
                    s.hud.update({level:1,totalLevels:11,score:12300,enemies:8,wave:1,totalWaves:1,special:${count},specialRequired:10,specialState:'${state}'});s.briefing.layout();
                    const screen=o=>{const r=o.getBounds(),z=c.zoom;return {x:c.width/2+(r.x-c.width/2)*z,y:c.height/2+(r.y-c.height/2)*z,width:r.width*z,height:r.height*z};};
                    const roots=[s.hud.root,s.hud.statsRoot,s.hud.specialRoot],boxes=roots.map(screen),pause=screen(s.pauseButton),brief=screen(s.briefing.root);
                    const inside=r=>r.x>=-1&&r.y>=-1&&r.x+r.width<=innerWidth+1&&r.y+r.height<=innerHeight+1;
                    const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
                    return {inside:[...boxes,pause,brief].every(inside),separated:boxes.every((a,i)=>boxes.every((other,j)=>i===j||!overlap(a,other)))&&!boxes.some(a=>overlap(a,pause)||overlap(a,brief)),
                        fixed:roots.every(root=>Math.abs(root.scaleX*c.zoom-1)<.001&&root.scrollFactorX===0),
                        name:s.hud.abilityName.text,status:s.hud.abilityStatus.text,charge:s.hud.chargeLabel.text,color:s.hud.abilityName.style.color,
                        assets:['hud-panel-frame','boss-hud-frame','level-banner-frame','alex-ability-icon','lua-ability-icon'].every(key=>s.textures.exists(key)),
                        colliders:s.physics.world.colliders.getActive().length};
                })()`);
                const label=`${character} ${width}x${height} ${count}/10`;
                check(`${label}: HUD fits and panels do not overlap`,info.inside&&info.separated);
                check(`${label}: scale stays fixed and supplied assets are loaded`,info.fixed&&info.assets);
                check(`${label}: correct ability identity and current charge`,info.name===(character==='alex'?'Shoot Vent':'Electro Dinamic')&&info.charge.startsWith(`${count} / 10`)&&info.color===(character==='alex'?'#8aff92':'#ffda55'));
                if(state==='ready')check(`${label}: ready input hint is visible`,info.status.includes('PRESIONA Q'));
                check(`${label}: UI adds no physics colliders`,info.colliders===8);
                if((width===1920||width===390)&&count===7){await delay(60);await capture(`${character}-${width}-charging`);}
                if(width===1280&&state==='ready'){await delay(60);await capture(`${character}-ready`);}
            }
        }
        for(const index of [4,10]){
            await preview(character,index);
            for(const [width,height]of [[1920,1080],[800,600],[390,844],[844,390]]){
                await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(170);
                const info=await b.evaluate(`(()=>{
                    const s=${s},e=s.bossEncounter,c=s.cameras.main;c.setZoom(Math.max(.65,c.width/s.physics.world.bounds.width,c.height/s.physics.world.bounds.height)).centerOn(1280,768);s.hud.layout();s.briefing.layout();
                    const p=window.combatUI.combatUILayout(s.scale.width,s.scale.height).pause;window.combatUI.anchorCombatUI(s,s.pauseButton,p.x,p.y);
                    e.boss.controller.state='REPOSITION';e.healthBar.update(e.boss.controller,0);
                    const box=o=>{const r=o.getBounds(),z=c.zoom;return {x:c.width/2+(r.x-c.width/2)*z,y:c.height/2+(r.y-c.height/2)*z,w:r.width*z,h:r.height*z};};
                    const bar=box(e.healthBar.root),top=[s.hud.root,s.hud.statsRoot,s.pauseButton].map(box);
                    return {visible:e.healthBar.root.visible,fits:bar.x>=0&&bar.y>=0&&bar.x+bar.w<=innerWidth+1&&bar.y+bar.h<=innerHeight+1,
                        below:top.every(r=>bar.y>=r.y+r.h),health:e.boss.controller.health,label:e.healthBar.label.text,colliders:s.physics.world.colliders.getActive().length};
                })()`);
                check(`${character} boss ${index+1} ${width}x${height}: frame fits below HUD`,info.visible&&info.fits&&info.below);
                check(`${character} boss ${index+1} ${width}x${height}: health and collisions unchanged`,info.health===(index===4?72:144)&&info.colliders===10&&info.label.includes('FASE 1/'));
                if(width===1920||width===390){await delay(60);await capture(`${character}-boss-${index+1}-${width}`);}
            }
        }
    }
    check('No browser errors',b.errors.length===0);
    const report={status:'passed',count:checks.length,checks,screenshots,consoleErrors:b.errors,generatedAt:new Date().toISOString()};
    writeFileSync(`${directory}/integration.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await b.send('Emulation.clearDeviceMetricsOverride');b.close();}

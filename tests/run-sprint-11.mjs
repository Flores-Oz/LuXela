import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowserSession} from './browser-session.mjs';
const browser=await openBrowserSession();
try{
    await browser.send('Page.navigate',{url:`${browser.baseUrl}/tests/sprint-11.html`});
    await browser.waitUntil("window.sprint11Results && window.sprint11Results.status!=='running'",90000);
    const result=await browser.evaluate('window.sprint11Results');
    if(result.status==='passed'){
        result.layoutTests=[];
        for(const [width,height]of [[1920,1080],[1366,768],[800,600],[390,844],[844,390]]){
            await browser.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
            await new Promise(resolve=>setTimeout(resolve,140));
            const fits=await browser.evaluate(`(()=>{
                const s=window.sprint11Game.scene.getScene('GameScene'),e=s.bossEncounter,c=s.cameras.main;
                e.healthBar.update(e.boss.controller,0);
                const root=e.healthBar.root,w=Math.min(700,s.scale.width-32),x=c.width/2+(root.x-c.width/2)*c.zoom,y=c.height/2+(root.y-c.height/2)*c.zoom;
                const hud=s.hud.text.getBounds(),hudBottom=c.height/2+(hud.bottom-c.height/2)*c.zoom;
                return root.visible&&Math.abs(root.scaleX*c.zoom-1)<.001&&x>=0&&x+w<=innerWidth+.01&&y>hudBottom&&y+49<=innerHeight;
            })()`);
            if(!fits)throw Error(`Boss health bar overlaps/clips at ${width}x${height}`);
            result.layoutTests.push(`${width}x${height}: boss bar fits beneath existing HUD`);
        }
        await browser.send('Emulation.clearDeviceMetricsOverride');
    }
    const report={...result,renderer:'Canvas',consoleErrors:browser.errors,generatedAt:new Date().toISOString()};
    console.log(JSON.stringify(report,null,2));
    mkdirSync('docs/test-results/sprint-11',{recursive:true});writeFileSync('docs/test-results/sprint-11/boss-integration.json',JSON.stringify(report,null,2)+'\n');
    if(result.status!=='passed'||browser.errors.length)process.exitCode=1;
}finally{await browser.send('Emulation.clearDeviceMetricsOverride');browser.close();}

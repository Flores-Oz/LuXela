import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowserSession} from './browser-session.mjs';
const b=await openBrowserSession(),tag=process.argv[2]??'current',directory='docs/test-results/runtime';let script;
try{
    await b.send('Page.enable');
    if(process.argv.includes('--canvas'))script=(await b.send('Page.addScriptToEvaluateOnNewDocument',{source:"(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args);};})()"})).identifier;
    await b.send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    await b.send('Page.navigate',{url:b.baseUrl+'/bosses.html?level=11&character=alex'});
    await b.waitUntil("window.bossLab?.game.scene.getScene('GameScene')?.bossEncounter?.boss");
    await b.evaluate(`(()=>{const s=window.bossLab.game.scene.getScene('GameScene');s.player.die=()=>{};s.bossEncounter.boss.controller.health=45;})()`);
    await new Promise(resolve=>setTimeout(resolve,2000));
    const result=await b.evaluate(`(async()=>{
        const s=window.bossLab.game.scene.getScene('GameScene'),g=s.game;
        const summary=a=>{const sorted=[...a].sort((x,y)=>x-y);return {mean:a.reduce((x,y)=>x+y,0)/a.length,p95:sorted[Math.floor(sorted.length*.95)],max:Math.max(...a)};};
        const calls={},cpu={};const restore=[];
        const wrap=(object,key,name)=>{const original=object[key];object[key]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{calls[name]=(calls[name]??0)+1;cpu[name]=(cpu[name]??0)+performance.now()-t;}};restore.push(()=>object[key]=original);};
        wrap(s.sys,'sceneUpdate','sceneUpdate');wrap(s.bossEncounter.healthBar,'update','bossHud');wrap(s.bossEncounter.boss,'updateCombat','bossAI');
        wrap(Object.getPrototypeOf(s.hud.text),'updateText','textRasterization');
        wrap(Object.getPrototypeOf(s.bossEncounter.healthBar.graphics),'clear','graphicsClear');
        const frames=[],render=[];let previous,start;
        await new Promise(resolve=>{
            const before=()=>{start=performance.now();};
            const after=()=>{const now=performance.now();if(previous!==undefined)frames.push(now-previous);previous=now;render.push(now-start);
                if(frames.length>=180){g.events.off('prerender',before);g.events.off('postrender',after);resolve();}};
            g.events.on('prerender',before);g.events.on('postrender',after);
        });
        for(const undo of restore)undo();
        return {renderer:g.renderer.type===1?'Canvas':'WebGL',selection:(await import('/src/config/RuntimeRenderer.ts')).runtimeRenderer,viewport:[s.scale.width,s.scale.height],frames:summary(frames),render:summary(render),calls,cpuMs:cpu,children:s.children.length,robots:s.enemyManager.aliveCount,projectiles:s.enemyProjectiles.getLength(),health:s.bossEncounter.boss.controller.health};
    })()`);
    const report={...result,consoleErrors:b.errors,generatedAt:new Date().toISOString()};mkdirSync(directory,{recursive:true});writeFileSync(`${directory}/${tag}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
    if(b.errors.length||result.selection.reason==='software-renderer'&&result.renderer!=='Canvas')process.exitCode=1;
}finally{if(script)await b.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script});await b.send('Emulation.clearDeviceMetricsOverride');b.close();}

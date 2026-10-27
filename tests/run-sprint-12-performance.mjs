import {mkdirSync,writeFileSync} from 'node:fs';import {openBrowserSession} from './browser-session.mjs';
const b=await openBrowserSession();try{
    await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:768,deviceScaleFactor:1,mobile:false});
    await b.send('Page.navigate',{url:b.baseUrl+'/tests/sprint-12.html'});await b.waitUntil("window.sprint12Results?.status==='passed'",120000);
    await b.evaluate("window.previewSprint12('alex',9)");await b.waitUntil("window.sprint12Game.scene.getScene('GameScene').player");
    await b.waitUntil("window.sprint12Game.scene.getScene('GameScene').enemyManager.getLivingEnemies().every(enemy=>!enemy.isSpawning)");
    await b.evaluate("(()=>{const s=window.sprint12Game.scene.getScene('GameScene');s.cameras.main.stopFollow().setZoom(.5).centerOn(1280,768);})()");
    const result=await b.evaluate(`(async()=>{
        const {fireEnemyShots}=await import('/src/systems/EnemyProjectiles.ts'),{AdvancedCombat}=await import('/src/config/QuimeraAdvancedConfig.ts'),s=sprint12Game.scene.getScene('GameScene'),cap=AdvancedCombat.maxProjectiles;
        const sample=stress=>new Promise(resolve=>{const deltas=[],base=s.children.length;let previous,peak=0;
            const tick=t=>{if(previous!==undefined)deltas.push(t-previous);previous=t;
                if(stress){const shots=Array.from({length:cap},(_,i)=>({direction:{x:Math.cos(i),y:Math.sin(i)},speed:150,attackType:'single',piercesInteriorWalls:false,visualFrame:i%2?4:0}));
                    fireEnemyShots(s,{x:1280,y:768,active:true,isDead:()=>false},shots,s.enemyProjectiles,cap,true);peak=Math.max(peak,s.enemyProjectiles.getLength());}
                if(deltas.length>=90){const sorted=[...deltas].sort((a,b)=>a-b);resolve({meanMs:deltas.reduce((a,b)=>a+b,0)/deltas.length,p95Ms:sorted[Math.floor(sorted.length*.95)],peakProjectiles:peak,initialChildren:base,children:s.children.length,colliders:s.physics.world.colliders.getActive().length});}
                else requestAnimationFrame(tick);
            };requestAnimationFrame(tick);
        });
        // The final-arena sheet is cached by the campaign fixture. Exercise the
        // enlarged animated projectiles while all ten mixed robots remain rendered.
        const baseline=await sample(false),stress=await sample(true);s.enemyProjectiles.clear(true,true);
        return {baseline,stress,maxAllowed:cap,remainingProjectiles:s.enemyProjectiles.getLength(),robots:s.enemyManager.aliveCount};
    })()`);
    if(result.stress.peakProjectiles>result.maxAllowed||result.remainingProjectiles||result.stress.colliders!==result.baseline.colliders||b.errors.length)throw Error(JSON.stringify({result,errors:b.errors}));
    const report={status:'passed',...result,renderer:'Canvas',viewport:'1280x768',cameraZoom:.5,consoleErrors:b.errors,generatedAt:new Date().toISOString()};
    mkdirSync('docs/test-results/sprint-12',{recursive:true});writeFileSync('docs/test-results/sprint-12/performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await b.send('Emulation.clearDeviceMetricsOverride');b.close();}

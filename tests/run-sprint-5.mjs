import { openBrowserSession } from './browser-session.mjs';
const {send,evaluate,waitUntil,errors,baseUrl,close}=await openBrowserSession();
const key=async (key,code,number)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:number,...(key==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:number});};
try {
    await send('Page.navigate',{url:`${baseUrl}/tests/sprint-5.html`});
    await waitUntil("window.sprint5Results && window.sprint5Results.status !== 'running'",60000);
    const result=await evaluate('window.sprint5Results');
    if(result.status==='passed') {
        await key('Escape','Escape',27);
        await waitUntil("window.sprint5Game.scene.isPaused('GameScene') && document.querySelector('.pause-screen')");
        await key('Enter','Enter',13);
        await waitUntil("window.sprint5Game.scene.isActive('GameScene') && !window.sprint5Game.scene.isActive('PauseScene')");
        result.nativeInput=['Escape abre pausa con teclado real','Enter en Continuar reanuda sin activar gameplay accidentalmente'];
        await key('Escape','Escape',27); await waitUntil("document.querySelector('.pause-screen')");
        await send('Input.dispatchMouseEvent',{type:'mousePressed',x:2,y:2,button:'left',clickCount:1});
        await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:2,y:2,button:'left',clickCount:1});
        await key('Escape','Escape',27); await waitUntil("window.sprint5Game.scene.isActive('GameScene') && !window.sprint5Game.scene.isActive('PauseScene')");
        result.nativeInput.push('Escape reanuda aunque se haya quitado el foco de los botones');
        result.layoutTests=[];
        for(const [width,height] of [[1920,1080],[1366,768],[800,600],[390,844]]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
            await new Promise(r=>setTimeout(r,150));
            const fits=await evaluate(`(()=>{const g=window.sprint5Game,s=g.scene.getScene('GameScene'),c=s.cameras.main,b=s.physics.world.bounds;return g.canvas.width===innerWidth&&g.canvas.height===innerHeight&&c.worldView.width>=b.width&&c.worldView.height>=b.height;})()`);
            if(!fits)throw new Error(`Viewport o habitación recortados: ${width}x${height}`);
            result.layoutTests.push(`${width}x${height}: canvas completo y habitación íntegra`);
        }
    }
    console.log(JSON.stringify({...result,consoleErrors:errors},null,2));
    if(result.status!=='passed'||errors.length)process.exitCode=1;
}finally{await send('Emulation.clearDeviceMetricsOverride');close();}

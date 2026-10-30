import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowserSession} from './browser-session.mjs';
const b=await openBrowserSession(),directory='docs/test-results/character-select',checks=[],screenshots=[];
const check=(name,passed)=>{if(!passed)throw Error(name);checks.push(name);};
const wait=()=>new Promise(resolve=>setTimeout(resolve,300));
const capture=async name=>{const {data}=await b.send('Page.captureScreenshot',{format:'png'});writeFileSync(`${directory}/${name}.png`,Buffer.from(data,'base64'));screenshots.push(name+'.png');};
try{
    mkdirSync(directory,{recursive:true});
    await b.send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    await b.send('Page.navigate',{url:b.baseUrl+'/tests/selection.html'});
    await b.waitUntil("window.selectionResults && window.selectionResults.status!=='running'");
    check('Existing functional selector fixture passes',await b.evaluate("window.selectionResults.status==='passed'"));
    // Match index.html: hide fixture output and prevent document scrollbars around the game.
    await b.evaluate("(()=>{document.querySelector('#results').hidden=true;document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';document.querySelector('canvas').style.display='block';})()");
    await b.evaluate('window.resetSelectionProgress()');await wait();
    await b.evaluate("(()=>{const message=document.querySelector('.select-message');message.textContent='Introduce un código para desbloquear tu primer personaje.';message.classList.remove('is-error');})()");
    await capture('desktop-locked');
    await b.evaluate(`(()=>{const form=document.querySelector('.select-code'),input=form.querySelector('input');for(const code of ['ALEX-001','LUA-001']){input.value=code;form.requestSubmit();}})()`);
    for(const [name,width,height,character]of [['desktop-alex',1920,1080,'alex'],['desktop-lua',1280,768,'lua'],['compact',800,600,'lua'],['mobile',390,844,'lua'],['landscape',844,390,'alex']]){
        await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await wait();
        await b.evaluate(`document.querySelector('[data-character=${character}]').click()`);
        await b.evaluate(`Promise.all([...document.querySelectorAll('.character-select img')].map(img=>img.decode()))`);await wait();
        const layout=await b.evaluate(`(()=>{
            const root=document.querySelector('.character-select'),button=root.querySelector('.select-start'),r=root.getBoundingClientRect();
            const card=root.querySelector('.is-selected'),start=getComputedStyle(button);
            return {horizontal:root.scrollWidth<=root.clientWidth+1,inside:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1,
                selected:card.dataset.character,accent:getComputedStyle(card).color,button:start.backgroundColor,
                visible:button.getBoundingClientRect().bottom<=r.bottom+1,background:getComputedStyle(root).backgroundImage.includes('select-background.png'),
                images:[...root.querySelectorAll('img')].every(img=>img.complete&&img.naturalWidth>0),
                separated:root.querySelector('.select-code').getBoundingClientRect().top>=root.querySelector('.select-cards').getBoundingClientRect().bottom&&
                    [...root.querySelectorAll('.select-card')].every(c=>c.querySelector('.card-charge').getBoundingClientRect().bottom<=c.getBoundingClientRect().bottom+1)};
        })()`);
        check(`${name}: selected character and all artwork load`,layout.selected===character&&layout.images&&layout.background);
        check(`${name}: selector fills viewport without horizontal overflow`,layout.horizontal&&layout.inside);
        check(`${name}: card content and unlock form do not overlap`,layout.separated);
        check(`${name}: blue action and character-specific accent`,layout.button==='rgb(146, 206, 250)'&&layout.accent===(character==='alex'?'rgb(138, 255, 146)':'rgb(255, 218, 85)'));
        if(height>=600)check(`${name}: confirm stays visible`,layout.visible);
        await capture(name);
        if(height<600){await b.evaluate("document.querySelector('.select-start').scrollIntoView({block:'end'})");await capture(name+'-controls');}
    }
    check('No browser errors',b.errors.length===0);
    const report={status:'passed',checks,screenshots,consoleErrors:b.errors,generatedAt:new Date().toISOString()};
    writeFileSync(`${directory}/visual.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await b.send('Emulation.clearDeviceMetricsOverride');b.close();}

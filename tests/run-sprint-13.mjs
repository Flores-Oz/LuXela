import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowserSession} from './browser-session.mjs';
const b=await openBrowserSession(),directory='docs/test-results/sprint-13';
try{
    await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:768,deviceScaleFactor:1,mobile:false});
    await b.send('Page.navigate',{url:b.baseUrl+'/tests/sprint-13.html'});
    await b.waitUntil("window.sprint13Results && window.sprint13Results.status!=='running'",150000);
    const result=await b.evaluate('window.sprint13Results');mkdirSync(directory,{recursive:true});
    const screenshots=[];
    for(const [name,data]of Object.entries(result.snapshots??{})){writeFileSync(`${directory}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));screenshots.push(name+'.png');}
    delete result.snapshots;const report={...result,screenshots,consoleErrors:b.errors,generatedAt:new Date().toISOString()};
    writeFileSync(`${directory}/integration.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
    if(result.status!=='passed'||b.errors.length)process.exitCode=1;
}finally{await b.send('Emulation.clearDeviceMetricsOverride');b.close();}

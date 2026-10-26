import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowserSession} from './browser-session.mjs';
const browser=await openBrowserSession();
try{
    await browser.send('Page.navigate',{url:`${browser.baseUrl}/tests/sprint-9.html`});
    await browser.waitUntil("window.sprint9Results && window.sprint9Results.status!=='running'",90000);
    const result=await browser.evaluate('window.sprint9Results');
    const report={...result,renderer:'Canvas',consoleErrors:browser.errors,generatedAt:new Date().toISOString()};
    console.log(JSON.stringify(report,null,2));
    if(result.status!=='passed'||browser.errors.length)process.exitCode=1;
    else{const directory=process.env.TEST_REPORT_DIR??'docs/test-results';mkdirSync(directory,{recursive:true});writeFileSync(`${directory}/sprint-9-large-rooms.json`,JSON.stringify(report,null,2)+'\n');}
}finally{browser.close();}

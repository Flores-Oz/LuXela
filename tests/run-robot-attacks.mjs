import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowserSession} from './browser-session.mjs';
const browser=await openBrowserSession();
try{
    await browser.send('Page.navigate',{url:`${browser.baseUrl}/tests/robot-attacks.html`});
    await browser.waitUntil("window.robotAttackResults && window.robotAttackResults.status!=='running'",90000);
    const result=await browser.evaluate('window.robotAttackResults');
    const report={...result,renderer:'Canvas',consoleErrors:browser.errors,generatedAt:new Date().toISOString()};
    console.log(JSON.stringify(report,null,2));
    if(result.status!=='passed'||browser.errors.length)process.exitCode=1;
    else{const directory=process.env.TEST_REPORT_DIR??'docs/test-results';mkdirSync(directory,{recursive:true});writeFileSync(`${directory}/robot-attacks.json`,JSON.stringify(report,null,2)+'\n');}
}finally{browser.close();}

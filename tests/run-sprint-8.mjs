import { mkdirSync, writeFileSync } from 'node:fs';
import { openBrowserSession } from './browser-session.mjs';
const b=await openBrowserSession();
try{
    await b.send('Page.navigate',{url:`${b.baseUrl}/tests/sprint-8.html`});
    await b.waitUntil("window.sprint8Results && window.sprint8Results.status!=='running'",60000);
    const result=await b.evaluate('window.sprint8Results');
    const report={...result,generatedAt:new Date().toISOString(),renderer:'Canvas',consoleErrors:b.errors};
    console.log(JSON.stringify(report,null,2));
    if(result.status!=='passed'||b.errors.length)process.exitCode=1;
    else{const directory=process.env.TEST_REPORT_DIR??'docs/test-results';mkdirSync(directory,{recursive:true});writeFileSync(`${directory}/sprint-8-environment.json`,JSON.stringify(report,null,2)+'\n');}
}finally{b.close();}

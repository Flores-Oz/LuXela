import {openBrowserSession} from './browser-session.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const b=await openBrowserSession();
try{
    await b.send('Page.navigate',{url:`${b.baseUrl}/tests/enemy-navigation.html`});
    await b.waitUntil("window.navigationResults && window.navigationResults.status!=='running'",60000);
    const report={...await b.evaluate('window.navigationResults'),consoleErrors:b.errors};
    mkdirSync('docs/test-results/enemy-navigation',{recursive:true});
    writeFileSync('docs/test-results/enemy-navigation/integration.json',JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
    if(report.status!=='passed'||b.errors.length)process.exitCode=1;
}finally{b.close();}

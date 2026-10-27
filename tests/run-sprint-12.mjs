import {mkdirSync,writeFileSync} from 'node:fs';import {openBrowserSession} from './browser-session.mjs';
const b=await openBrowserSession();try{
    await b.send('Page.navigate',{url:b.baseUrl+'/tests/sprint-12.html'});
    await b.waitUntil("window.sprint12Results && window.sprint12Results.status!=='running'",120000);
    const result=await b.evaluate('window.sprint12Results');const report={...result,consoleErrors:b.errors,generatedAt:new Date().toISOString()};
    mkdirSync('docs/test-results/sprint-12',{recursive:true});writeFileSync('docs/test-results/sprint-12/integration.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
    if(result.status!=='passed'||b.errors.length)process.exitCode=1;
}finally{b.close();}

import {spawnSync} from 'node:child_process';import {mkdirSync,readdirSync,writeFileSync} from 'node:fs';
const suites=[];
const unit=spawnSync(process.execPath,['--test',...readdirSync('tests').filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f)],{encoding:'utf8',timeout:60000});
if(unit.error)throw unit.error;if(unit.status!==0){process.stdout.write(unit.stdout);process.stderr.write(unit.stderr);process.exit(1);}
const count=Number(unit.stdout.match(/^# tests (\d+)$/m)?.[1]);suites.push({name:'unit',count});console.log(`unit: ${count} aprobadas`);
// Historical end-to-end campaigns assumed five levels. The current campaign replaces
// those progression fixtures; unchanged controls/combat/abilities/robots stay in regression.
for(const name of ['selection','combat','abilities','robot-attacks','finisher','sprint-12']){
    const r=spawnSync(process.execPath,[`tests/run-${name}.mjs`],{encoding:'utf8',timeout:150000,env:{...process.env,TEST_REPORT_DIR:'docs/test-results/sprint-12-regressions'}});
    if(r.error)throw r.error;if(r.status!==0){process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(1);}
    const data=JSON.parse(r.stdout),extra=['nativeUiTests','nativeInput','reloadTests','layoutTests','introLayoutTests','hudLayoutTests'].reduce((n,key)=>n+(data[key]?.length??0),0);
    suites.push({name,count:data.count+extra,consoleErrors:data.consoleErrors.length});console.log(`${name}: ${data.count+extra} aprobadas`);
}
mkdirSync('docs/test-results',{recursive:true});const report={status:'passed',generatedAt:new Date().toISOString(),suites,totalChecks:suites.reduce((n,s)=>n+s.count,0)};
writeFileSync('docs/test-results/sprint-12.json',JSON.stringify(report,null,2)+'\n');console.log(`Total: ${report.totalChecks}`);

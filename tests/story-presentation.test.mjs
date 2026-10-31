import assert from 'node:assert/strict';
import test from 'node:test';
import { tsModuleUrl } from './ts-module.mjs';

const { NarrativeSequenceRunner } = await import(tsModuleUrl(new URL('../src/narrative/NarrativeSequenceRunner.ts', import.meta.url)));
const { isNarrativeEntry } = await import(tsModuleUrl(new URL('../src/narrative/NarrativeTypes.ts', import.meta.url)));
const actor = { type:'actor', id:'kira', animation:'walk-right', x:30, y:52, width:9, moveTo:{x:68,y:52,durationMs:750} };
const prop = { type:'prop', id:'cake', key:'birthday-cake', x:49,y:50,width:13 };

test('Stage entries reject invalid positions, movement durations and effects', () => {
    for (const value of [actor,prop,{type:'cue',effect:'shake',durationMs:420},{type:'hideActor',id:'kira'},{type:'hideProp',id:'cake'}]) assert.ok(isNarrativeEntry(value));
    for (const value of [
        {...actor,x:-1},{...actor,y:Infinity},{...actor,width:0},
        {...actor,moveTo:{x:NaN,y:50,durationMs:750}}, {...actor,moveTo:{x:50,y:50,durationMs:-1}},
        {...prop,key:''}, {...prop,width:101}, {type:'cue',effect:'unknown'}, {type:'cue',effect:'flash',durationMs:Infinity}
    ]) assert.equal(isNarrativeEntry(value),false);
});

test('Resume restores only current actors/props and never replays flashes or removed objects', () => {
    const entries = [
        {type:'background',key:'kitchen'},actor,prop,{type:'cue',effect:'flash'},
        {type:'dialogue',speaker:'Alex',text:'Cake'},
        {type:'hideActor',id:'kira'},{type:'hideProp',id:'cake'},
        {type:'background',key:'invasion'},{type:'cue',effect:'shake'},
        {type:'dialogue',speaker:'Alex',text:'Robots'}
    ];
    const sequence={id:'test',route:'alex',chapterId:'stage',provisional:false,entries};
    for (const [index,expected] of [[4,['background','actor','prop']],[9,['background']]]) {
        const effects=[];
        const runner=new NarrativeSequenceRunner(sequence,{effect:(e,restoring)=>effects.push({...e,restoring}),dialogue:()=>{},complete:()=>{}});
        runner.start(index);
        assert.deepEqual(effects.map(e=>e.type),expected);
        assert.ok(effects.every(e=>e.restoring));
        runner.destroy();
    }
});

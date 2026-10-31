import test from 'node:test';
import assert from 'node:assert/strict';
import {tsModuleUrl} from './ts-module.mjs';
const {isSoftwareRenderer,detectRuntimeRenderer}=await import(tsModuleUrl(new URL('../src/config/RuntimeRenderer.ts',import.meta.url)));
test('known software adapters choose the Canvas path while hardware and private labels retain AUTO',()=>{
    for(const device of ['ANGLE (Microsoft, Microsoft Basic Render Driver (0x0000008C) Direct3D11)','Google SwiftShader','llvmpipe (LLVM)','softpipe','Microsoft WARP'])assert.ok(isSoftwareRenderer(device));
    for(const device of ['ANGLE (NVIDIA GeForce RTX)','Intel Iris Xe','AMD Radeon','Apple M2','WebKit WebGL',''])assert.equal(isSoftwareRenderer(device),false);
});
test('renderer detection is safe without DOM, without WebGL and with a hidden debug extension',()=>{
    assert.equal(detectRuntimeRenderer().type,'auto');
    const before=globalThis.document;
    try{
        globalThis.document={createElement:()=>({getContext:()=>null})};assert.equal(detectRuntimeRenderer().type,'canvas');
        let released=0;
        const context={RENDERER:1,getParameter:()=> 'WebKit WebGL',getExtension:name=>name==='WEBGL_lose_context'?{loseContext(){released++;}}:null};
        globalThis.document={createElement:()=>({getContext:()=>context})};
        assert.equal(detectRuntimeRenderer().type,'auto');assert.equal(released,1);
        context.getParameter=()=> 'Microsoft Basic Render Driver';assert.equal(detectRuntimeRenderer().type,'canvas');
        globalThis.document={createElement(){throw Error('blocked');}};assert.equal(detectRuntimeRenderer().type,'auto');
    }finally{if(before===undefined)delete globalThis.document;else globalThis.document=before;}
});

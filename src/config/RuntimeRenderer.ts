export function isSoftwareRenderer(name:string):boolean {
    return /microsoft basic render driver|swiftshader|llvmpipe|softpipe|software rasterizer|software rendering|warp\b/i.test(name);
}

/** WebGL availability alone does not imply hardware acceleration. */
export function detectRuntimeRenderer():{type:'auto'|'canvas';reason:string;device:string} {
    if(typeof document==='undefined')return {type:'auto',reason:'no-document',device:''};
    let context:WebGLRenderingContext|null=null;
    try{
        const canvas=document.createElement('canvas');
        context=canvas.getContext('webgl');
        if(!context)return {type:'canvas',reason:'webgl-unavailable',device:''};
        const debug=context.getExtension('WEBGL_debug_renderer_info');
        // An unavailable debug extension is not evidence of software rendering.
        const device=String(context.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:context.RENDERER)??'');
        return {type:isSoftwareRenderer(device)?'canvas':'auto',reason:isSoftwareRenderer(device)?'software-renderer':'hardware-or-unknown',device};
    }catch{return {type:'auto',reason:'probe-unavailable',device:''};}
    finally{try{context?.getExtension('WEBGL_lose_context')?.loseContext();}catch{/* A failed probe must not block boot. */}}
}

export const runtimeRenderer=detectRuntimeRenderer();

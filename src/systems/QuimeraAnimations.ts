import Phaser from 'phaser';

export const quimeraAnimations=[['idle',0,3,5,-1],['walk-down',4,9,8,-1],['walk-up',10,15,8,-1],['walk-left',16,21,8,-1],['walk-right',22,27,8,-1],
    ['attack-down',28,31,10,0],['attack-up',32,35,10,0],['attack-left',36,39,10,0],['attack-right',40,43,10,0],['hit',44,46,12,0],['death',47,52,7,0]] as const;
export function loadQuimeraAssets(scene:Phaser.Scene):void {
    if(!scene.textures.exists('quimera-source'))scene.load.image('quimera-source','assets/sprites/enemies/RobotQuimera.png');
}
/** Measured transparent gaps: the source has nine irregularly spaced rows, not a regular grid. */
export const quimeraSourceRows=[0,165,324,485,647,806,968,1131,1310,1500] as const;
/** Preserve source pixels/alpha and align feet to a common ground line in logical 192px frames. */
export function createQuimeraAnimations(scene:Phaser.Scene):void {
    if(!scene.textures.exists('quimera')){
        const source=scene.textures.get('quimera-source').getSourceImage() as HTMLImageElement;
        if(source.width!==1024||source.height!==1536)throw Error('RobotQuimera.png: se esperaba la lámina inspeccionada de 1024 × 1536');
        const texture=scene.textures.createCanvas('quimera',1152,1728);
        if(!texture)throw Error('No se pudo preparar la lámina de Quimera');
        const context=texture.getContext();context.imageSmoothingEnabled=false;
        const original=document.createElement('canvas');original.width=source.width;original.height=source.height;
        const sourceContext=original.getContext('2d',{willReadFrequently:true});
        if(!sourceContext)throw Error('No se pudo inspeccionar el alfa de Quimera');
        sourceContext.drawImage(source,0,0);
        const pixels=sourceContext.getImageData(0,0,source.width,source.height).data;
        for(let i=0;i<53;i++){
            const column=i%6,row=Math.floor(i/6),x=Math.round(column*source.width/6),y=quimeraSourceRows[row]!;
            const width=Math.round((column+1)*source.width/6)-x,height=quimeraSourceRows[row+1]!-y;
            let bottom=y-1;
            for(let sy=y;sy<y+height;sy++)for(let sx=x;sx<x+width;sx++)if(pixels[(sy*source.width+sx)*4+3]!>180)bottom=sy;
            if(bottom<y)throw Error(`Quimera: el frame ${i} está vacío`);
            context.save();context.beginPath();context.rect(column*192,row*192,192,192);context.clip();
            context.drawImage(source,x,y,width,height,column*192+(192-width)/2,row*192+184-(bottom-y+1),width,height);
            context.restore();
            texture.add(String(i),0,column*192,row*192,192,192);
        }
        texture.refresh().setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    for(const [name,start,end,frameRate,repeat]of quimeraAnimations)if(!scene.anims.exists(`quimera-${name}`))scene.anims.create({key:`quimera-${name}`,
        frames:Array.from({length:end-start+1},(_,i)=>({key:'quimera',frame:String(start+i)})),frameRate,repeat});
}

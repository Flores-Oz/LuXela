import Phaser from "phaser";
import { robotTypes,robotDefinitions } from "../config/RobotConfig";

export function loadRobotAssets(scene:Phaser.Scene):void {
    for(const type of robotTypes){
        if(scene.textures.exists(type))continue;
        const path=`assets/sprites/enemies/${robotDefinitions[type].file}`;
        if(!scene.textures.exists(`${type}-source`))scene.load.image(`${type}-source`,path);
    }
}
/** Normalize the provided larger sheets in memory, keeping the existing 64px robot body contract. */
export function createRobotAnimations(scene:Phaser.Scene):void {
    for(const type of robotTypes){
        if(!scene.textures.exists(type)){
            const source=scene.textures.get(`${type}-source`).getSourceImage() as HTMLImageElement;
            const texture=scene.textures.createCanvas(type,384,768);
            if(!texture)throw new Error(`Cannot prepare ${type}`);
            const context=texture.getContext();context.imageSmoothingEnabled=false;
            for(let row=0;row<11;row++)for(let column=0;column<6;column++){
                const x=8+column*148,y=20+row*152,width=Math.min(139,source.width-x),height=144;
                context.drawImage(source,x,y,width,height,column*64+1,row*64,width*64/height,64);
                texture.add(String(row*6+column),0,column*64,row*64,64,64);
            }
            // Some supplied sheets have opaque black margins. Preserve all non-black sprite pixels.
            const pixels=context.getImageData(0,0,384,768);
            for(let index=0;index<pixels.data.length;index+=4)if(pixels.data[index]!<8&&pixels.data[index+1]!<8&&pixels.data[index+2]!<8)pixels.data[index+3]=0;
            context.putImageData(pixels,0,0);texture.refresh().setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        const prefix=robotDefinitions[type].prefix;
        for(const [name,start,end,repeat] of [["idle",0,3,-1],["walk-up",6,11,-1],["walk-down",12,17,-1],["walk-right",18,23,-1],["walk-left",24,29,-1],["special-a1",30,33,0],["special-a2",36,39,0],["special-b1",42,45,0],["special-b2",48,51,0],["hit",54,56,0],["death",60,65,0]] as const){
            const key=`${prefix}-${name}`;
            if(!scene.anims.exists(key))scene.anims.create({key,frames:scene.anims.generateFrameNumbers(type,{start,end}),frameRate:name==="idle"?4:name==="hit"||name==="death"?10:8,repeat});
        }
    }
}

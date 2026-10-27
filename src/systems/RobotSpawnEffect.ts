import Phaser from 'phaser';

export const RobotSpawnConfig={durationMs:900,frames:12,displaySize:110} as const;
export function loadRobotSpawnAsset(scene:Phaser.Scene):void {
    if(!scene.textures.exists('robot-spawn'))scene.load.spritesheet('robot-spawn','assets/effects/robot-spawn.png',{frameWidth:256,frameHeight:256});
}
/** One delta-clock visual reused by every wave and Quimera's summon telegraph. */
export class RobotSpawnEffect {
    private readonly visual:Phaser.GameObjects.Image;
    private elapsed=0;
    private ended=false;
    constructor(scene:Phaser.Scene,x:number,y:number){
        this.visual=scene.add.image(x,y,'robot-spawn',0).setDisplaySize(RobotSpawnConfig.displaySize,RobotSpawnConfig.displaySize).setDepth(2).setName('robot-spawn-effect');
    }
    get active():boolean{return !this.ended;}
    get progress():number{return Math.min(1,this.elapsed/RobotSpawnConfig.durationMs);}
    setPosition(x:number,y:number):void {if(!this.ended)this.visual.setPosition(x,y);}
    update(delta:number):void {
        if(this.ended||!Number.isFinite(delta)||delta<=0)return;
        this.elapsed+=delta;
        if(this.progress>=1){this.destroy();return;}
        this.visual.setFrame(Math.min(RobotSpawnConfig.frames-1,Math.floor(this.progress*RobotSpawnConfig.frames)));
    }
    destroy():void {if(this.ended)return;this.ended=true;this.visual.destroy();}
}

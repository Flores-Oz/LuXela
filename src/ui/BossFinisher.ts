import Phaser from 'phaser';
import {BossFinisherConfig as config} from '../config/BossFinisherConfig';
import {FinisherChallenge} from '../entities/boss/FinisherChallenge';
import type {PlayerCharacter} from '../config/characters';
import {UITheme} from '../config/UITheme';

interface Timing {durations:number[];durationMs:number;frames:number}
export function loadFinisherAssets(scene:Phaser.Scene,character:PlayerCharacter):void {
    if(!scene.cache.json.exists('boss-finisher-timings'))scene.load.json('boss-finisher-timings','assets/special/derived/timings.json');
    const key=`boss-finisher-${character}`;
    if(!scene.textures.exists(key))scene.load.spritesheet(key,`assets/special/derived/${character}-finisher.png`,{frameWidth:config.frameSize,frameHeight:config.frameSize,endFrame:config.frames[character]-1});
}
const labels:Record<string,string>={ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Space:'ESPACIO'};

export class BossFinisher {
    readonly challenge:FinisherChallenge;
    readonly root:Phaser.GameObjects.Container;
    private readonly scene:Phaser.Scene;
    private readonly character:PlayerCharacter;
    private readonly timing:Timing;
    private readonly graphics:Phaser.GameObjects.Graphics;
    private readonly title:Phaser.GameObjects.Text;
    private readonly key:Phaser.GameObjects.Text;
    private readonly hint:Phaser.GameObjects.Text;
    private readonly portrait:Phaser.GameObjects.Image;
    private readonly failed:()=>void;
    private readonly accepted:()=>void;
    private readonly finished:()=>void;
    private resolved=false;
    constructor(scene:Phaser.Scene,character:PlayerCharacter,accepted:()=>void,failed:()=>void,finished:()=>void){
        this.scene=scene;this.character=character;this.accepted=accepted;this.failed=failed;this.finished=finished;
        this.timing=(scene.cache.json.get('boss-finisher-timings') as Record<PlayerCharacter,Timing>)[character];
        this.challenge=new FinisherChallenge(character,this.timing.durationMs);
        this.graphics=scene.add.graphics();
        const style={fontFamily:UITheme.font,fontSize:'22px',color:UITheme.text,align:'center' as const};
        this.title=scene.add.text(0,0,'REMATE DISPONIBLE',style).setOrigin(.5);
        this.key=scene.add.text(0,0,'',{...style,fontSize:'38px',color:UITheme.accent,padding:{x:28,y:12},backgroundColor:'#18292b'}).setOrigin(.5).setScrollFactor(0).setInteractive({useHandCursor:true});
        this.hint=scene.add.text(0,0,'',{...style,fontSize:'14px',lineSpacing:6}).setOrigin(.5);
        this.portrait=scene.add.image(0,0,`boss-finisher-${character}`,0).setVisible(false);
        this.root=scene.add.container(0,0,[this.graphics,this.portrait,this.title,this.key,this.hint]).setScrollFactor(0).setDepth(200).setVisible(false).setName('boss-finisher');
        this.key.on('pointerdown',()=>this.input(this.challenge.sequence[this.challenge.step]!));
        scene.input.keyboard?.on('keydown',this.keydown,this);
    }
    get active():boolean{return this.challenge.active;}
    start():void {if(this.challenge.start()){this.root.setVisible(true);this.layout();}}
    update(delta:number):void {if(!this.active)return;this.challenge.update(delta);this.resolve();this.layout();}
    private keydown(event:KeyboardEvent):void {
        if(!this.active||this.challenge.state!=='prompt'||event.repeat||event.ctrlKey||event.altKey||event.metaKey)return;
        const code=event.code;
        if(!Object.hasOwn(labels,code))return;
        event.preventDefault();this.input(code);
    }
    input(code:string):void {
        if(this.challenge.state!=='prompt')return;
        const accepted=this.challenge.input(code);
        if(accepted&&this.challenge.step===this.challenge.sequence.length)this.accepted();
        this.resolve();this.layout();
    }
    private resolve():void {
        if(this.resolved)return;
        if(this.challenge.state==='failed'){this.resolved=true;this.root.setVisible(false);this.failed();}
        else if(this.challenge.state==='complete'){this.resolved=true;this.root.setVisible(false);this.finished();}
    }
    layout():void {
        if(!this.active)return;
        const width=this.scene.scale.width,height=this.scene.scale.height,camera=this.scene.cameras.main,zoom=camera.zoom;
        this.root.setScale(1/zoom).setPosition(camera.width/2-camera.width/2/zoom,camera.height/2-camera.height/2/zoom);
        const c=this.challenge,animating=c.state==='animating',color=this.character==='alex'?0x66ff33:0xffdf52;
        this.graphics.clear().fillStyle(0x070d12,animating?.94:.7).fillRect(0,0,width,height);
        this.title.setText(animating?`REMATE · ${this.character.toUpperCase()}`:'QUIMERA · REMATE DISPONIBLE').setFontSize(width<600?16:22).setPosition(width/2,animating?48:height*.35);
        this.key.setVisible(!animating);this.portrait.setVisible(animating);
        if(animating){
            let end=0,frame=this.timing.frames-1;
            for(let i=0;i<this.timing.durations.length;i++){end+=this.timing.durations[i]!;if(c.elapsed<end){frame=i;break;}}
            const size=Math.min(width*.95,height*.85,700);
            this.portrait.setFrame(frame).setPosition(width/2,height/2).setDisplaySize(size,size);
            this.hint.setText(this.character==='alex'?'¡Ahora pagarás!\n¡SHOOT BOOSTER!':'¡Ahora conocerás el rayo!\n¡ELECTRO DINAMIC!')
                .setFontSize(width<600?18:24).setColor(this.character==='alex'?'#66ff33':'#ffdf52')
                .setWordWrapWidth(width-32).setOrigin(.5,1).setPosition(width/2,height-24);
            const radius=35+c.elapsed/12;
            this.graphics.lineStyle(3,color,.4).strokeCircle(width/2,height*.56,radius);
        }else{
            this.key.setText(labels[c.sequence[c.step]!]!).setPosition(width/2,height*.49);
            this.hint.setText(`${c.sequence.map((key,index)=>index<c.step?'✓':labels[key]).join('   ›   ')}\nPresioná la tecla o tocá el símbolo\nSi fallás, la pelea continúa`).setFontSize(14).setColor(UITheme.text).setOrigin(.5).setWordWrapWidth(width-32).setPosition(width/2,height*.67);
            const bar=Math.min(380,width-48);
            this.graphics.fillStyle(0x26363a).fillRect((width-bar)/2,height*.57,bar,7).fillStyle(color).fillRect((width-bar)/2,height*.57,bar*c.remaining/config.stepMs,7);
        }
    }
    cancel():void {this.challenge.cancel();this.root.setVisible(false);}
    destroy():void {this.cancel();this.scene.input.keyboard?.off('keydown',this.keydown,this);this.root.destroy(true);}
}

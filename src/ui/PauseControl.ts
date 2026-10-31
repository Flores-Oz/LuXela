import Phaser from 'phaser';
import {UITheme} from '../config/UITheme';
import {anchorCombatUI,CombatPanel,combatUILayout} from './CombatUI';

export class PauseControl extends Phaser.GameObjects.Container {
    constructor(scene:Phaser.Scene,pause:()=>void){
        super(scene,0,0);scene.add.existing(this);
        const panel=new CombatPanel(scene,'hud-panel-frame').resize(128,44);
        const label=scene.add.text(64,22,'ESC · PAUSA',{fontFamily:UITheme.font,fontSize:11,color:'#d9eeff'}).setOrigin(.5).setResolution(2);
        this.add([panel,label]);this.setSize(128,44).setScrollFactor(0).setDepth(101).setName('combat-pause');
        // Arcade input normalizes Container coordinates by its half-size origin.
        this.setInteractive(new Phaser.Geom.Rectangle(64,22,128,44),Phaser.Geom.Rectangle.Contains);
        this.input!.cursor='pointer';
        this.on('pointerdown',()=>{label.setColor('#ffffff');pause();});
        this.on('pointerover',()=>label.setColor('#ffffff'));
        this.on('pointerout',()=>label.setColor('#d9eeff'));
        this.layout();
    }
    layout():void {
        const p=combatUILayout(this.scene.scale.width,this.scene.scale.height).pause;
        anchorCombatUI(this.scene,this,p.x-this.width,p.y);
    }
}

import Phaser from 'phaser';
import {UITheme} from '../config/UITheme';
import {anchorCombatUI,CombatPanel,combatUILayout} from './CombatUI';

/** A tactical introduction whose fade advances only with gameplay time. */
export class RoomBriefing {
    readonly root:Phaser.GameObjects.Container;
    private readonly panel:CombatPanel;
    private readonly title:Phaser.GameObjects.Text;
    private readonly hint:Phaser.GameObjects.Text;
    private readonly scene:Phaser.Scene;
    private readonly bossEncounter:boolean;
    private elapsed=0;
    constructor(scene:Phaser.Scene,title:string,hint:string,bossEncounter=false){
        this.scene=scene;this.bossEncounter=bossEncounter;
        this.panel=new CombatPanel(scene,'level-banner-frame');
        this.title=scene.add.text(0,0,title,{fontFamily:UITheme.font,fontSize:14,color:'#deeffb'}).setResolution(2);
        this.hint=scene.add.text(0,0,hint,{fontFamily:UITheme.font,fontSize:12,color:'#b0c7d9',lineSpacing:3}).setResolution(2);
        this.root=scene.add.container(0,0,[this.panel,this.title,this.hint]).setScrollFactor(0).setDepth(99).setName('room-briefing');this.layout();
    }
    update(delta:number):void {this.elapsed+=delta;this.root.setAlpha(Phaser.Math.Clamp((8000-this.elapsed)/1000,0,1));}
    layout():void {
        const layout=combatUILayout(this.scene.scale.width,this.scene.scale.height),box=layout.briefing;
        this.panel.resize(box.width,box.height);this.root.setSize(box.width,box.height);
        this.title.setPosition(22,14).setFontSize(layout.compact?12:14).setWordWrapWidth(box.width-44);
        this.hint.setPosition(22,36).setFontSize(layout.compact?10:11).setWordWrapWidth(box.width-44);
        this.root.setVisible(!(this.bossEncounter&&layout.compact&&this.scene.scale.height<600));
        anchorCombatUI(this.scene,this.root,box.x,box.y);
    }
    destroy():void {this.root.destroy(true);}
}

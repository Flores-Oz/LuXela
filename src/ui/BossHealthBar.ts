import Phaser from 'phaser';
import type {QuimeraController} from '../entities/boss/QuimeraController';
import {UITheme} from '../config/UITheme';
import {anchorCombatUI,CombatPanel,combatUILayout} from './CombatUI';

export class BossHealthBar {
    readonly root:Phaser.GameObjects.Container;
    private readonly label:Phaser.GameObjects.Text;
    private readonly graphics:Phaser.GameObjects.Graphics;
    private readonly panel:CombatPanel;
    private lag=1;
    private layoutKey='';
    private renderKey='';
    private box:ReturnType<typeof combatUILayout>['boss']|null=null;
    private readonly scene:Phaser.Scene;
    constructor(scene:Phaser.Scene){
        this.scene=scene;this.panel=new CombatPanel(scene,'boss-hud-frame');
        this.label=scene.add.text(0,0,'E.X.P.-01 QUIMERA',{fontFamily:UITheme.font,fontSize:13,color:'#e1eff9'}).setResolution(2);
        this.graphics=scene.add.graphics();
        this.root=scene.add.container(0,0,[this.graphics,this.panel,this.label]).setScrollFactor(0).setDepth(100).setName('quimera-health-bar').setVisible(false);
    }
    update(controller:QuimeraController,delta:number):void {
        this.root.setVisible(controller.alive&&controller.state!=='INTRO'&&controller.state!=='STOPPED');
        if(!this.root.visible)return;
        const ratio=Phaser.Math.Clamp(controller.health/controller.config.maxHealth,0,1);
        this.lag=Math.max(ratio,this.lag-(delta/1000)*.6);
        const layoutKey=`${this.scene.scale.width}:${this.scene.scale.height}:${this.scene.cameras.main.zoom}`;
        if(layoutKey!==this.layoutKey){
            this.layoutKey=layoutKey;
            const layout=combatUILayout(this.scene.scale.width,this.scene.scale.height);this.box=layout.boss;
            this.panel.resize(this.box.width,this.box.height);this.root.setSize(this.box.width,this.box.height);
            this.label.setFontSize(layout.compact?10:13).setPosition(this.box.width*.065,this.box.height*.26);
            anchorCombatUI(this.scene,this.root,this.box.x,this.box.y);
        }
        const box=this.box!;
        this.label.setText(controller.finisherAvailable
            ?`QUIMERA · ${Math.ceil(controller.health)} / ${controller.config.maxHealth} · ACÉRCATE PARA REMATAR`
            :`E.X.P.-01 QUIMERA · FASE ${controller.phase}/${controller.config.phasePatterns.length} · ${Math.ceil(controller.health)} / ${controller.config.maxHealth}`);
        const renderKey=`${box.width}:${box.height}:${ratio}:${this.lag}:${controller.phase}`;
        if(renderKey===this.renderKey)return;
        this.renderKey=renderKey;
        const color=controller.phase>=3?0xff9b68:controller.phase===2?0x6de8ff:0x8dcfff;
        const x=box.width*.065,width=box.width*.87,y=box.height*.55,height=box.height*.13;
        this.graphics.clear().fillStyle(0x06111d,.9).fillRect(10,8,box.width-20,box.height-16)
            .fillStyle(0x253c50).fillRect(x,y,width,height)
            .fillStyle(0x64819b,.8).fillRect(x,y,width*this.lag,height)
            .fillStyle(color).fillRect(x,y,width*ratio,height);
    }
    hide():void {this.root.setVisible(false);}
    destroy():void {this.root.destroy(true);}
}

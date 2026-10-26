import Phaser from 'phaser';
import {QuimeraConfig} from '../config/QuimeraConfig';
import type {QuimeraController} from '../entities/boss/QuimeraController';
import {UITheme} from '../config/UITheme';

export class BossHealthBar {
    readonly root:Phaser.GameObjects.Container;
    private readonly label:Phaser.GameObjects.Text;
    private readonly graphics:Phaser.GameObjects.Graphics;
    private lag=1;
    private readonly scene:Phaser.Scene;
    constructor(scene:Phaser.Scene){
        this.scene=scene;
        this.label=scene.add.text(10,6,'E.X.P.-01 QUIMERA',{fontFamily:UITheme.font,fontSize:'13px',color:'#eef2e9'});
        this.graphics=scene.add.graphics();
        this.root=scene.add.container(0,0,[this.graphics,this.label]).setScrollFactor(0).setDepth(100).setName('quimera-health-bar');
        this.root.setVisible(false);
    }
    update(controller:QuimeraController,delta:number):void {
        this.root.setVisible(controller.alive&&controller.state!=='INTRO'&&controller.state!=='STOPPED');
        const ratio=controller.health/QuimeraConfig.maxHealth;
        this.lag=Math.max(ratio,this.lag-(delta/1000)*.6);
        const width=Math.min(700,this.scene.scale.width-32);
        const color=controller.phase===3?0xff9b68:controller.phase===2?0x6de8ff:0xb4dfbd;
        this.graphics.clear().fillStyle(0x0b1014,.9).fillRect(0,0,width,49)
            .fillStyle(0x26363a).fillRect(10,30,width-20,9)
            .fillStyle(0x748783,.8).fillRect(10,30,(width-20)*this.lag,9)
            .fillStyle(color).fillRect(10,30,(width-20)*ratio,9);
        this.label.setText(`E.X.P.-01 QUIMERA · FASE ${controller.phase} · ${Math.ceil(controller.health)} / ${QuimeraConfig.maxHealth}`).setFontSize(width<400?10:13);
        const camera=this.scene.cameras.main,zoom=camera.zoom,x=(camera.width-width)/2,y=this.scene.scale.width<1000?112:80;
        this.root.setScale(1/zoom).setPosition(camera.width/2+(x-camera.width/2)/zoom,camera.height/2+(y-camera.height/2)/zoom);
    }
    hide():void {this.root.setVisible(false);}
    destroy():void {this.root.destroy(true);}
}

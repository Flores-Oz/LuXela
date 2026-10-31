import Phaser from 'phaser';
import {UITheme} from '../config/UITheme';
import {characters,type PlayerCharacter} from '../config/characters';
import type {AbilityState} from '../abilities/SpecialAbility';
import {anchorCombatUI,CombatPanel,combatUILayout} from './CombatUI';

export interface GameHUDState {
    level:number;totalLevels:number;score:number;enemies:number;
    wave?:number;totalWaves?:number;special?:number;specialRequired?:number;
    specialState?:AbilityState;notice?:string;specialCooldown?:number;bossEncounter?:boolean;exitUnlocked?:boolean;
}

/** All objects are allocated once and remain in screen pixels as the camera moves/zooms. */
export class GameHUD {
    readonly root:Phaser.GameObjects.Container;
    readonly statsRoot:Phaser.GameObjects.Container;
    readonly specialRoot:Phaser.GameObjects.Container;
    readonly exitRoot:Phaser.GameObjects.Container;
    readonly text:Phaser.GameObjects.Text;
    private readonly scene:Phaser.Scene;
    private readonly character:PlayerCharacter;
    private readonly progressPanel:CombatPanel;
    private readonly statsPanel:CombatPanel;
    private readonly specialPanel:CombatPanel;
    private readonly exitPanel:CombatPanel;
    private readonly exitTitle:Phaser.GameObjects.Text;
    private readonly exitHint:Phaser.GameObjects.Text;
    private readonly wave:Phaser.GameObjects.Text;
    private readonly statsLabel:Phaser.GameObjects.Text;
    private readonly scoreLabel:Phaser.GameObjects.Text;
    private readonly enemyCount:Phaser.GameObjects.Text;
    private readonly score:Phaser.GameObjects.Text;
    private readonly abilityName:Phaser.GameObjects.Text;
    private readonly abilityStatus:Phaser.GameObjects.Text;
    private readonly chargeLabel:Phaser.GameObjects.Text;
    private readonly notice:Phaser.GameObjects.Text;
    private readonly meter:Phaser.GameObjects.Graphics;
    private readonly icon:Phaser.GameObjects.Image;
    private readonly key:Phaser.GameObjects.Text;
    private state:GameHUDState;
    constructor(scene:Phaser.Scene,state:GameHUDState,character:PlayerCharacter='alex'){
        this.scene=scene;this.state=state;this.character=character;
        const text=(size:number,color='#eaf3fa')=>scene.add.text(0,0,'',{fontFamily:UITheme.font,fontSize:size,color}).setResolution(2);
        const root=(name:string)=>scene.add.container(0,0).setDepth(100).setScrollFactor(0).setName(name);
        this.root=root('combat-progress');this.statsRoot=root('combat-stats');this.specialRoot=root('combat-special');
        this.exitRoot=root('combat-exit-unlocked');
        this.exitPanel=new CombatPanel(scene,'level-banner-frame');
        this.exitTitle=text(18,'#ffd477').setText('SALIDA DESBLOQUEADA').setFontStyle('bold').setStroke('#07111c',2).setOrigin(.5,0);
        this.exitHint=text(12,'#ffe7b0').setText('Dirígete a una puerta para continuar.').setOrigin(.5,0);
        this.exitRoot.add([this.exitPanel,this.exitTitle,this.exitHint]);
        this.progressPanel=new CombatPanel(scene,'hud-panel-frame');this.statsPanel=new CombatPanel(scene,'hud-panel-frame');this.specialPanel=new CombatPanel(scene,'hud-panel-frame');
        this.text=text(24);this.wave=text(11,'#adcadf');
        const progressLabel=text(9,'#91b9d5').setText('HABITACIÓN').setPosition(18,11);
        this.root.add([this.progressPanel,progressLabel,this.text,this.wave]);
        this.statsLabel=text(9,'#91b9d5');this.scoreLabel=text(9,'#91b9d5').setText('PUNTOS');this.enemyCount=text(24);this.score=text(24);
        this.statsRoot.add([this.statsPanel,this.statsLabel,this.scoreLabel,this.enemyCount,this.score]);
        this.icon=scene.add.image(34,37,`${character}-ability-icon`).setDisplaySize(40,40);
        this.abilityName=text(16,characters[character].accent).setText(characters[character].abilityName);
        this.abilityStatus=text(10,'#b9cedd');this.chargeLabel=text(10,'#b9cedd');
        this.key=text(12,'#c9e7ff').setText('Q').setBackgroundColor('#183a53').setPadding(6,3);
        this.meter=scene.add.graphics();this.notice=text(10,'#bddff6');
        this.specialRoot.add([this.specialPanel,this.icon,this.abilityName,this.key,this.abilityStatus,this.meter,this.chargeLabel,this.notice]);
        this.layout();
    }
    get summary():string {
        const s=this.state;
        return `HABITACIÓN ${s.level} / ${s.totalLevels}${s.bossEncounter?'':` · OLEADA ${s.wave??1} / ${s.totalWaves??1}`} · ENEMIGOS ${s.enemies} · PUNTOS ${s.score} · ESPECIAL ${s.special??0} / ${s.specialRequired??10}${s.specialState==='ready'?' · LISTA [Q]':''}${s.notice?` · ${s.notice}`:''}`;
    }
    update(state:GameHUDState):void {this.state=state;this.layout();}
    layout():void {
        const l=combatUILayout(this.scene.scale.width,this.scene.scale.height),s=this.state;
        this.exitPanel.resize(l.exit.width,l.exit.height);this.exitRoot.setSize(l.exit.width,l.exit.height).setVisible(s.exitUnlocked===true);
        this.exitTitle.setPosition(l.exit.width/2,17);this.exitHint.setPosition(l.exit.width/2,45);
        anchorCombatUI(this.scene,this.exitRoot,l.exit.x,l.exit.y);
        for(const [root,panel,box]of [[this.root,this.progressPanel,l.progress],[this.statsRoot,this.statsPanel,l.stats],[this.specialRoot,this.specialPanel,l.special]] as const){
            panel.resize(box.width,box.height);root.setSize(box.width,box.height);anchorCombatUI(this.scene,root,box.x,box.y);
        }
        this.text.setText(`${String(s.level).padStart(2,'0')} / ${String(s.totalLevels).padStart(2,'0')}`).setFontSize(l.compact?20:24).setPosition(18,23);
        this.wave.setText(s.bossEncounter?'ENFRENTAMIENTO ESPECIAL':`OLEADA ${s.wave??1} / ${s.totalWaves??1}`).setFontSize(l.compact?8:10).setPosition(18,l.compact?48:56);
        const half=l.stats.width/2;
        this.statsLabel.setText('ENEMIGOS').setPosition(16,11);
        this.scoreLabel.setPosition(half+6,11);
        this.enemyCount.setText(String(s.enemies).padStart(2,'0')).setFontSize(l.compact?21:26).setPosition(16,27);
        this.score.setText(String(s.score).padStart(4,'0')).setFontSize(l.compact?18:26).setPosition(half+6,27);
        this.abilityName.setPosition(62,15);this.key.setPosition(l.special.width-40,13);
        const count=Math.max(0,Math.min(s.special??0,s.specialRequired??10)),required=Math.max(1,s.specialRequired??10);
        const ready=s.specialState==='ready',active=s.specialState==='active'||s.specialState==='recovering';
        const status=ready?'LISTA · PRESIONA Q':s.specialState==='charging'?'CARGANDO':active?'EN EJECUCIÓN':s.specialCooldown?`ESPERA ${Math.ceil(s.specialCooldown/1000)} s`:'CARGA POR BAJAS';
        this.abilityStatus.setText(status).setColor(ready?characters[this.character].accent:'#b9cedd').setPosition(62,38);
        this.chargeLabel.setText(`${count} / ${required} BAJAS`).setPosition(18,82);
        this.notice.setText(s.exitUnlocked||s.notice==='SALIDA DISPONIBLE'?'':s.notice??'').setFontSize(9).setPosition(l.special.width-18,84).setOrigin(1,0);
        const width=l.special.width-36,gap=4,segments=required,cell=(width-(segments-1)*gap)/segments;
        const color=Phaser.Display.Color.HexStringToColor(characters[this.character].accent).color;
        this.meter.clear();
        for(let i=0;i<segments;i++)this.meter.fillStyle(i<count?color:0x244358,i<count?1:.9).fillRect(18+i*(cell+gap),63,cell,9);
        if(ready)this.meter.lineStyle(1,color,.85).strokeRect(15,60,width+6,15);
    }
    destroy():void {this.root.destroy(true);this.statsRoot.destroy(true);this.specialRoot.destroy(true);this.exitRoot.destroy(true);}
}

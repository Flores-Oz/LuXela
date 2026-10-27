// Development-only arena: production encounter and inputs, with boss attacks held for inspection.
import Phaser from 'phaser';
import {gameConfig} from '../src/config/gameConfig';
import {GameScene} from '../src/scenes/GameScene';
import {CharacterUnlockService} from '../src/systems/CharacterUnlockService';
import {CHARACTER_CODES} from '../src/config/CharacterUnlockConfig';
import {getArcadeRun} from '../src/systems/ArcadeRunService';
let generation=0;
class PreviewScene extends GameScene {
    liveCombat=false;
    create(){super.create();this.previewGeneration=++generation;}
    update(time,delta){
        if(this.liveCombat||this.bossEncounter?.finisher.active||this.combatState!=='playing'){super.update(time,delta);return;}
        this.player?.update();
        if(this.bossEncounter?.boss.controller.state==='INTRO')this.bossEncounter.update(delta);
        else if(this.bossEncounter){this.bossEncounter.boss.tryStartFinisher(this.player,this.lineOfSight);this.bossEncounter.healthBar.update(this.bossEncounter.boss.controller,delta);}
    }
}
const game=new Phaser.Game({...gameConfig,type:Phaser.CANVAS,scale:{...gameConfig.scale,width:'100%',height:'100%'},scene:gameConfig.scene.map(Scene=>Scene===GameScene?PreviewScene:Scene),callbacks:{preBoot(game){
    const unlocks=new CharacterUnlockService(()=>({getItem:()=>null,setItem(){}}));
    for(const code of Object.values(CHARACTER_CODES))unlocks.redeem(code);
    game.registry.set('character-unlock-service',unlocks);
}}});
window.finisherGame=game;
window.previewFinisher=character=>{
    for(const scene of game.scene.getScenes(false))if(scene.scene.isActive()||scene.scene.isPaused())game.scene.stop(scene.scene.key);
    const runs=getArcadeRun(game),runId=runs.begin(character);
    for(let i=0;i<4;i++){runs.clearRoom(runId,i);runs.advance(runId,i);}
    game.scene.start('GameScene',{character,roomIndex:4,runId});
};
for(const character of ['alex','lua'])document.getElementById(character).onclick=()=>window.previewFinisher(character);
document.getElementById('trigger').onclick=()=>{
    const boss=game.scene.getScene('GameScene').bossEncounter?.boss;
    if(boss?.controller.vulnerable)boss.receiveDamage(Math.max(0,boss.controller.health-6));
    document.activeElement?.blur();
};
const boot=setInterval(()=>{if(game.scene.isActive('MainMenuScene')){clearInterval(boot);window.previewFinisher('alex');}},50);

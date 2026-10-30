import Phaser from 'phaser';
import './boss-lab.css';
import {gameConfig} from './config/gameConfig';
import {GameScene} from './scenes/GameScene';
import {Quimera} from './entities/boss/Quimera';
import {CharacterUnlockService} from './systems/CharacterUnlockService';
import {CHARACTER_CODES} from './config/CharacterUnlockConfig';
import {getArcadeRun} from './systems/ArcadeRunService';
import type {PlayerCharacter} from './config/characters';
import {MenuView,type MenuAction} from './ui/MenuView';
import {mountSceneView} from './ui/mountSceneView';

const level=document.querySelector<HTMLSelectElement>('#boss-level')!;
const character=document.querySelector<HTMLSelectElement>('#boss-character')!;
const start=document.querySelector<HTMLButtonElement>('#boss-start')!;
const help=document.querySelector<HTMLElement>('#boss-help')!;
const params=new URLSearchParams(location.search);
level.value=params.get('level')==='11'?'11':'5';
character.value=params.get('character')==='lua'?'lua':'alex';
let selected:{index:4|10;character:PlayerCharacter}={index:4,character:'alex'};
let game:Phaser.Game;

function launch():void {
    selected={index:level.value==='11'?10:4,character:character.value==='lua'?'lua':'alex'};
    for(const scene of game.scene.getScenes(false))if(scene.scene.isActive()||scene.scene.isPaused())game.scene.stop(scene.scene.key);
    history.replaceState(null,'',`?level=${selected.index+1}&character=${selected.character}`);
    game.scene.start('GameScene');start.blur();
    document.querySelector<HTMLCanvasElement>('#game-container canvas')?.focus();
}
function otherBoss():void {level.value=selected.index===4?'11':'5';launch();}

/** Real production combat, with an isolated checkpoint containing only the selected arena. */
class BossPracticeScene extends GameScene {
    init():void {
        const runs=getArcadeRun(this.game),runId=runs.begin(selected.character);
        for(let index=0;index<selected.index;index++){runs.clearRoom(runId,index);runs.advance(runId,index);}
        if(selected.index===10)runs.acknowledgeBossIntro(runId);
        super.init({character:selected.character,roomIndex:selected.index,runId});
    }
    create():void {
        super.create();if(this.input.keyboard){this.input.keyboard.enabled=true;this.input.keyboard.disableGlobalCapture();}
        const index=selected.index;
        const boss=this.children.getChildren().find(child=>child instanceof Quimera) as Quimera|undefined;
        if(index===4)boss?.once('quimera-destroyed',()=>this.scene.start('CompletionScene'));
        help.textContent=`Nivel ${index+1} · ${selected.character==='alex'?'Alex':'Lua'} · WASD: mover · Flechas: disparar · Q: especial por 10 bajas · Esc: pausa · Un impacto = muerte`;
    }
}

/** Lab navigation never routes a retry, pause or victory into ordinary campaign rooms. */
class PracticeOverlay extends Phaser.Scene {
    constructor(key:string){super(key);}
    create():void {
        const paused=this.scene.key==='PauseScene',won=this.scene.key==='CompletionScene',lost=this.scene.key==='GameOverScene';
        const resume=()=>{(this.scene.get('GameScene') as GameScene).resumeFromPause();this.scene.resume('GameScene');this.scene.stop();};
        const actions:MenuAction[]=[];
        if(paused)actions.push({label:'Continuar',primary:true,action:resume});
        actions.push({label:'Reintentar este jefe',primary:!paused,action:launch},{label:'Probar el otro jefe',action:otherBoss});
        const view=new MenuView({kind:paused?'pause':'completion',eyebrow:`Prueba de jefes · Nivel ${selected.index+1}`,
            title:paused?'Pausa':won?'Quimera derrotado':lost?'Intentá de nuevo':'Elegí tu combate',
            subtitle:won?'Podés repetir el encuentro o enfrentar a la otra versión de Quimera.':'Elegí Alex o Lua en la barra superior y practicá cualquiera de los dos encuentros.',actions});
        mountSceneView(this,view.element);view.focus();
        const key=(event:KeyboardEvent)=>{
            if(event.repeat||event.target instanceof HTMLSelectElement)return;
            if(paused&&event.code==='Escape'){event.preventDefault();resume();}
            else if(lost&&(event.code==='KeyR'||event.code==='Enter'&&!(event.target instanceof HTMLButtonElement))){event.preventDefault();launch();}
        };
        window.addEventListener('keydown',key);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{window.removeEventListener('keydown',key);view.destroy();});
    }
}
class PracticeBoot extends Phaser.Scene {
    constructor(){super('BossPracticeBoot');}
    create():void {level.disabled=false;character.disabled=false;start.disabled=false;launch();this.scene.stop();}
}

game=new Phaser.Game({...gameConfig,scene:[new PracticeBoot(),new BossPracticeScene(),...['PauseScene','GameOverScene','CompletionScene','MainMenuScene','CharacterSelectScene'].map(key=>new PracticeOverlay(key))],
    callbacks:{preBoot(instance){
        // Practice unlocks live only in this game instance; campaign localStorage is untouched.
        const unlocks=new CharacterUnlockService(()=>({getItem:()=>null,setItem(){}}));
        for(const code of Object.values(CHARACTER_CODES))unlocks.redeem(code);
        instance.registry.set('character-unlock-service',unlocks);
    }}});
start.addEventListener('click',launch);
// Native selectors keep arrow keys; return keyboard control to the arena after applying.
const header=document.querySelector<HTMLElement>('.boss-controls')!;
const keyboardFocus=()=>{
    const scene=game.scene.getScene('GameScene'),keyboard=scene?.input?.keyboard;
    if(keyboard){keyboard.resetKeys();keyboard.enabled=!header.contains(document.activeElement);}
};
header.addEventListener('focusin',keyboardFocus);
header.addEventListener('focusout',()=>queueMicrotask(keyboardFocus));
game.events.on(Phaser.Core.Events.READY,()=>{
    const canvas=game.canvas;canvas.tabIndex=0;
});

declare global {interface Window {bossLab:{game:Phaser.Game;launch:()=>void}}}
window.bossLab={game,launch};

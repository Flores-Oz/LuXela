import Phaser from 'phaser';
import { gameConfig } from '../src/config/gameConfig';
import { CharacterUnlockService } from '../src/systems/CharacterUnlockService';
import { CHARACTER_CODES } from '../src/config/CharacterUnlockConfig';
import { NarrativeSaveService } from '../src/narrative/NarrativeSaveService';
import { NarrativeRouteManager } from '../src/narrative/NarrativeRouteManager';
import { getArcadeRun } from '../src/systems/ArcadeRunService';
import { StoryStageManager } from '../src/narrative/StoryStageManager';

// Test fixtures are session-only and cannot overwrite a player's browser progress.
const memory = () => { let value=null; return {getItem:()=>value,setItem:(_key,next)=>{value=next;}}; };
const routes = new NarrativeRouteManager();
const game = new Phaser.Game({...gameConfig,type:Phaser.CANVAS,callbacks:{preBoot(game){
    const unlocks=new CharacterUnlockService(memory());
    unlocks.redeem(CHARACTER_CODES.alex);unlocks.redeem(CHARACTER_CODES.lua);
    game.registry.set('character-unlock-service',unlocks);
    game.registry.set('narrative-save-service',new NarrativeSaveService(routes,memory));
}}});
window.storyGame=game;window.storyRoutes=routes;window.StoryStageManager=StoryStageManager;
window.startStory=(data={route:'alex',resume:false})=>{
    const scene=game.scene.getScenes(true)[0];scene.scene.start('VisualNovelScene',data);
};
window.startFinalStoryFixture=()=>{
    const runs=getArcadeRun(game),runId=runs.begin('alex');
    for(let index=0;index<10;index++){runs.clearRoom(runId,index);if(!runs.advance(runId,index))throw Error('Fixture progression failed');}
    runs.acknowledgeBossIntro(runId);
    game.scene.getScenes(true)[0].scene.start('GameScene',{character:'alex',roomIndex:10,runId});
};

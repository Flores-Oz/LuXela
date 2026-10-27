import Phaser from 'phaser';
import {gameConfig} from '../src/config/gameConfig';
import {GameScene} from '../src/scenes/GameScene';
import {CharacterUnlockService} from '../src/systems/CharacterUnlockService';
import {CHARACTER_CODES} from '../src/config/CharacterUnlockConfig';
import {getArcadeRun} from '../src/systems/ArcadeRunService';
import {levels} from '../src/levels/levels';
import {Projectile} from '../src/entities/Projectile';
import {QuimeraConfig as config} from '../src/config/QuimeraConfig';
import {SpecialAbilityConfig} from '../src/config/SpecialAbilityConfig';
import {quimeraAnimations} from '../src/systems/QuimeraAnimations';

const checks=[],check=(name,value)=>{if(!value)throw Error(name);checks.push(name);};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const until=async predicate=>{for(let i=0;i<500;i++){if(predicate())return;await delay(20);}throw Error('Sprint 11 timeout');};
let generation=0;
class BossTestScene extends GameScene {
    manual=true;
    create(){super.create();this.generation=++generation;}
    update(time,delta){if(!this.manual){super.update(time,delta);return;}this.player?.update();this.waves?.update(delta);}
}
const game=new Phaser.Game({...gameConfig,type:Phaser.CANVAS,scene:gameConfig.scene.map(Scene=>Scene===GameScene?BossTestScene:Scene),callbacks:{preBoot(game){
    const unlocks=new CharacterUnlockService(()=>({getItem:()=>null,setItem(){}}));
    for(const code of Object.values(CHARACTER_CODES))unlocks.redeem(code);
    game.registry.set('character-unlock-service',unlocks);
}}});
window.sprint11Game=game;window.sprint11Results={status:'running'};
const scene=()=>game.scene.getScene('GameScene');
const button=(root,label)=>[...document.querySelectorAll(`${root} button`)].find(node=>node.textContent===label);
const entered=async(index,oldPlayer)=>{await until(()=>game.scene.isActive('GameScene')&&scene().roomIndex===index&&scene().player&&(!oldPlayer||scene().player!==oldPlayer));await delay(40);return scene();};
const toBoss=async(character)=>{
    game.scene.getScene('MainMenuScene').scene.start('GameScene',{character});
    let s=await entered(0);
    for(let index=0;index<4;index++){
        check(`${character} level ${index+1}: original themed waves and seven colliders`,s.enemyManager.aliveCount===levels[index].enemies.count&&s.physics.world.colliders.getActive().length===7&&!s.bossEncounter);
        while(!s.waves.isComplete){s.enemyManager.defeatLivingEnemies();s.waves.update(1100);}
        const old=s.player;s.changeRoom();s=await entered(index+1,old);
    }
    return s;
};
async function run(){
    await until(()=>game.scene.isActive('MainMenuScene'));
    for(const character of ['alex','lua']){
        let s=await toBoss(character),encounter=s.bossEncounter,boss=encounter.boss;
        const runs=getArcadeRun(game),runId=s.runId;
        check(`${character}: only level five creates one full-health boss without normal waves`,s.roomIndex===4&&boss.controller.health===72&&boss.controller.phase===1&&boss.controller.state==='INTRO'&&s.waves===null&&s.enemyManager.aliveCount===0);
        check(`${character}: existing HUD counts the boss without displaying nonexistent waves`,s.hud.text.text.includes('ENEMIGOS 1')&&!s.hud.text.text.includes('OLEADA'));
        check(`${character}: safe spawn and stable hitbox`,Math.hypot(boss.x-s.player.x,boss.y-s.player.y)>600&&!s.walls.getChildren().some(w=>Phaser.Geom.Intersects.RectangleToRectangle(boss.body,w.body))&&Math.abs(boss.body.width-config.body.width*config.spriteScale)<.01);
        check(`${character}: original accumulated kills carry into boss arena`,runs.getSpecialCharge(runId)===10&&runs.getScore(runId)===6400);
        check(`${character}: two scoped boss collisions and one shared projectile-bounds listener`,s.physics.world.colliders.getActive().length===9&&s.physics.world.listenerCount('worldbounds')===1);
        for(const [name,start,end]of quimeraAnimations){
            const animation=s.anims.get(`quimera-${name}`);
            check(`${character}: ${name} maps real supplied frames`,animation.frames.length===end-start+1&&animation.frames[0].textureFrame===String(start)&&animation.frames.at(-1).textureFrame===String(end));
        }
        const atlas=s.textures.get('quimera').getSourceImage(),ctx=atlas.getContext('2d');
        const alpha=ctx.getImageData(0,0,192,192).data;
        check(`${character}: original alpha preserved without an opaque source-cell box`,alpha[3]===0&&alpha.some((value,index)=>index%4===3&&value>200));
        check(`${character}: unused 54th normalized cell remains transparent`,ctx.getImageData(5*192,8*192,192,192).data.every((value,index)=>index%4!==3||value===0));
        const grounds=[];
        for(let i=0;i<53;i++){
            const pixels=ctx.getImageData((i%6)*192,Math.floor(i/6)*192,192,192).data;let bottom=-1;
            for(let y=0;y<192;y++)for(let x=0;x<192;x++)if(pixels[(y*192+x)*4+3]>180)bottom=y;
            grounds.push(bottom);
        }
        check(`${character}: all 53 measured source crops share a stable ground line`,grounds.every(bottom=>bottom===183));
        check(`${character}: intro health bar is initially hidden`,!encounter.healthBar.root.visible);
        const introShot=new Projectile(s,boss.x,boss.y,new Phaser.Math.Vector2(1,0),'player',s.playerProjectiles);
        await delay(60);check(`${character}: activation consumes a shot without premature damage`,!introShot.physicsBody.active&&boss.controller.health===72);
        encounter.update(1500);check(`${character}: activation exposes health bar and starts phase one`,encounter.healthBar.root.visible&&boss.controller.state==='REPOSITION');
        const oneShot=new Projectile(s,boss.x,boss.y,new Phaser.Math.Vector2(1,0),'player',s.playerProjectiles);
        await delay(60);check(`${character}: one real projectile deals exactly configured damage once`,!oneShot.physicsBody.active&&boss.controller.health===70);
        const hitbox=[boss.body.width,boss.body.height,boss.body.offset.x,boss.body.offset.y];
        for(const name of ['walk-down','walk-up','walk-left','walk-right','attack-down','attack-up','attack-left','attack-right','hit']){
            boss.play(`quimera-${name}`);await delay(20);
            check(`${character}: ${name} does not move or resize hitbox`,[boss.body.width,boss.body.height,boss.body.offset.x,boss.body.offset.y].every((value,index)=>value===hitbox[index]));
        }
        const originalPlayer={x:s.player.x,y:s.player.y};
        s.player.physicsSprite.body.reset(boss.x,boss.y-250);s.cameras.main.stopFollow().centerOn(boss.x,boss.y);
        // worldView is refreshed by render; allow one frame after centering before selecting an attack.
        await delay(30);encounter.update(1800);encounter.update(500);
        check(`${character}: actual upward emission retains the correct attack pose into recovery`,s.enemyProjectiles.getLength()===1&&boss.anims.currentAnim.key==='quimera-attack-up');
        s.enemyProjectiles.clear(true,true);encounter.update(1100);boss.setVelocity(0,0);s.player.physicsSprite.body.reset(originalPlayer.x,originalPlayer.y);
        boss.receiveDamage(22);encounter.update(1);check(`${character}: threshold enters phase two transition`,boss.controller.phase===2&&boss.controller.state==='PHASE_TRANSITION');
        encounter.update(700);boss.receiveDamage(24);encounter.update(1);check(`${character}: threshold enters phase three transition`,boss.controller.phase===3&&boss.controller.state==='PHASE_TRANSITION');encounter.update(700);
        if(character==='lua')check('Lua cannot damage the boss beyond the configured area range',encounter.specialHit('lua')===null);
        s.player.physicsSprite.body.reset(boss.x-350,boss.y);
        const beforeSpecial=boss.controller.health;
        check(`${character}: existing special activation consumes the kill charge`,s.specialAbilities.ability.activate()&&runs.getSpecialCharge(runId)===0);
        s.specialAbilities.update(SpecialAbilityConfig[character].chargeMs);
        check(`${character}: special applies bounded boss damage instead of one-hit destruction`,boss.controller.health===beforeSpecial-config.specialDamage[character]&&!boss.isDead());
        if(character==='alex')check('Alex preserves green impacts at the boss position',s.specialAbilities.impactPositions.some(p=>p.x===boss.x&&p.y===boss.y));
        const afterSpecial=boss.controller.health;s.specialAbilities.update(SpecialAbilityConfig[character].durationMs+SpecialAbilityConfig[character].recoveryMs);
        check(`${character}: one discharge never damages every frame`,boss.controller.health===afterSpecial);
        if(character==='lua')check('Lua remains an area special with its existing electricity effect',s.specialAbilities.ability.state==='cooldown');
        s.specialAbilities.update(100000);check(`${character}: time alone never replenishes special kills`,runs.getSpecialCharge(runId)===0&&s.specialAbilities.ability.state==='locked');
        // Verify real physical movement against an exterior wall, using the same wall collider.
        boss.body.reset(200,500);boss.setVelocity(-200,0);await delay(600);boss.setVelocity(0,0);
        check(`${character}: boss respects solid exterior walls`,boss.body.left>=63.9);
        boss.body.reset(1280,768);s.player.physicsSprite.body.reset(1000,768);
        encounter.update(1000);s.enemyProjectiles.clear(true,true);
        s.manual=false;s.pauseGame();await until(()=>game.scene.isPaused('GameScene')&&document.querySelector('.pause-screen'));
        const snapshot={health:boss.controller.health,time:boss.controller.time,state:boss.controller.state,x:boss.x,y:boss.y,frame:boss.frame.name};
        await delay(150);
        check(`${character}: pause freezes boss HP, clock, state, position and animation`,Object.entries(snapshot).every(([key,value])=>({health:boss.controller.health,time:boss.controller.time,state:boss.controller.state,x:boss.x,y:boss.y,frame:boss.frame.name})[key]===value));
        button('.pause-screen','Continuar').click();await until(()=>game.scene.isActive('GameScene'));await delay(80);s.manual=true;
        check(`${character}: resume advances without resetting health or phase`,boss.controller.time>snapshot.time&&boss.controller.health===snapshot.health&&boss.controller.phase===3);
        const oldBoss=boss,oldPlayer=s.player,oldController=boss.controller;
        const lethalShot=new Projectile(s,s.player.x,s.player.y,new Phaser.Math.Vector2(0,1),'enemy',s.enemyProjectiles);
        await until(()=>game.scene.isActive('GameOverScene'));
        check(`${character}: one enemy hit kills player and stops the boss without victory`,oldPlayer.isDead()&&oldController.state==='STOPPED'&&!runs.canComplete(character,runId)&&!lethalShot.physicsBody.active);
        game.scene.getScene('GameOverScene').input.keyboard.emit('keydown-ENTER');s=await entered(4,oldPlayer);encounter=s.bossEncounter;boss=encounter.boss;
        check(`${character}: retry restores full HP, phase, kills and entry score without duplicates`,boss!==oldBoss&&!oldBoss.active&&boss.controller.health===72&&boss.controller.phase===1&&boss.controller.state==='INTRO'&&runs.getSpecialCharge(runId)===10&&runs.getScore(runId)===6400&&s.physics.world.colliders.getActive().length===9);
        if(character==='alex'){
            s.pauseGame();await until(()=>document.querySelector('.pause-screen'));const previous=s.player;
            button('.pause-screen','Reiniciar partida').click();s=await entered(0,previous);
            check('Restart abandons boss and resets the normal campaign',!s.bossEncounter&&s.runId!==runId&&runs.getScore(s.runId)===0&&s.physics.world.colliders.getActive().length===7);
            for(let index=0;index<4;index++){while(!s.waves.isComplete){s.enemyManager.defeatLivingEnemies();s.waves.update(1100);}const player=s.player;s.changeRoom();s=await entered(index+1,player);}
            encounter=s.bossEncounter;boss=encounter.boss;
        }
        encounter.update(1500);
        const winningId=s.runId;
        for(let hit=0;hit<config.maxHealth/config.normalDamage;hit++){
            const shot=new Projectile(s,boss.x,boss.y,new Phaser.Math.Vector2(1,0),'player',s.playerProjectiles);
            await until(()=>!shot.physicsBody.active);
            if(encounter.finisher.active)encounter.finisher.input('wrong');
        }
        check(`${character}: normal shots alone defeat the boss`,boss.isDead()&&boss.controller.state==='DEAD'&&s.combatState==='boss-destruction');
        check(`${character}: destruction disables damage and clears projectiles before victory`,!boss.body.enable&&s.enemyProjectiles.getLength()===0&&s.playerProjectiles.getLength()===0&&!encounter.healthBar.root.visible&&!runs.canComplete(character,winningId)&&boss.anims.currentAnim.key==='quimera-death');
        const deathFrame=boss.frame.name;
        await delay(160);check(`${character}: destruction plays before the narrative starts`,boss.frame.name!==deathFrame&&!game.scene.isActive('VisualNovelScene'));
        await until(()=>game.scene.isActive('VisualNovelScene')&&document.querySelector('.vn-skip'));
        check(`${character}: real victory activates the existing character ending exactly once`,game.scene.getScene('VisualNovelScene').sequence.id===`${character}_ending`&&runs.canComplete(character,winningId)&&runs.getScore(winningId)===7400&&!oldBoss.active);
        s.bossDestroyed();check(`${character}: repeated completion callback cannot duplicate score`,runs.getScore(winningId)===7400);
        document.querySelector('.vn-skip').click();await until(()=>game.scene.isActive('CompletionScene')&&document.querySelector('.completion-screen'));
        check(`${character}: narrative leads to the existing completion screen`,document.querySelector('.completion-screen .presentation-eyebrow').textContent.toLowerCase().includes(character));
        button('.completion-screen','Volver al menú principal').click();await until(()=>game.scene.isActive('MainMenuScene'));
        check(`${character}: leaving completion releases boss and result`,!scene().bossEncounter&&!runs.canComplete(character,winningId));
    }
    const live=await toBoss('alex'),liveBoss=live.bossEncounter.boss;
    live.player.physicsSprite.body.reset(1000,768);const start={x:liveBoss.x,y:liveBoss.y};live.manual=false;
    await until(()=>live.enemyProjectiles.getLength()>0);
    check('Live scene AI repositions and emits a real warned projectile without manually advancing the controller',liveBoss.controller.time>config.introMs&&Math.hypot(liveBoss.x-start.x,liveBoss.y-start.y)>30&&live.enemyProjectiles.getChildren().every(shot=>shot.getData('projectile').owner==='enemy'));
    check('Live boss movement stays outside solid machinery',!live.walls.getChildren().some(wall=>Phaser.Geom.Intersects.RectangleToRectangle(liveBoss.body,wall.body)));
    live.manual=true;liveBoss.setVelocity(0,0);live.enemyProjectiles.clear(true,true);live.bossEncounter.update(1500);
    window.sprint11Results={status:'passed',count:checks.length,checks};
}
run().catch(error=>{window.sprint11Results={status:'failed',count:checks.length,checks,error:String(error.stack??error)};});

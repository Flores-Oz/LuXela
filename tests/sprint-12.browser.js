import Phaser from 'phaser';
import {gameConfig} from '../src/config/gameConfig';
import {GameScene} from '../src/scenes/GameScene';
import {CharacterUnlockService} from '../src/systems/CharacterUnlockService';
import {CHARACTER_CODES} from '../src/config/CharacterUnlockConfig';
import {getArcadeRun} from '../src/systems/ArcadeRunService';
import {levels} from '../src/levels/levels';
import {AdvancedCombat} from '../src/config/QuimeraAdvancedConfig';
import {Projectile} from '../src/entities/Projectile';
import {BossFinisherConfig} from '../src/config/BossFinisherConfig';
import {Enemy} from '../src/entities/enemies/Enemy';
import {RobotSpawnConfig} from '../src/systems/RobotSpawnEffect';
import {ProjectileConfig} from '../src/config/ProjectileConfig';
const checks=[],check=(name,condition)=>{if(!condition)throw Error(name);checks.push(name);};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const until=async predicate=>{for(let n=0;n<700;n++){if(predicate())return;await delay(20);}throw Error('Sprint 12 timeout');};
let serial=0;
class TestScene extends GameScene {
    manual=true;
    create(){this.manual=true;super.create();if(this.player)this.generation=++serial;}
    update(time,delta){if(!this.manual)super.update(time,delta);}
}
const game=new Phaser.Game({...gameConfig,type:Phaser.CANVAS,scene:gameConfig.scene.map(Scene=>Scene===GameScene?TestScene:Scene),callbacks:{preBoot(game){
    const unlocks=new CharacterUnlockService(()=>({getItem:()=>null,setItem(){}}));for(const code of Object.values(CHARACTER_CODES))unlocks.redeem(code);game.registry.set('character-unlock-service',unlocks);
}}});
window.sprint12Game=game;window.sprint12Results={status:'running'};
window.previewSprint12=(character,index)=>{
    for(const active of game.scene.getScenes(false))if(active.scene.isActive()||active.scene.isPaused())game.scene.stop(active.scene.key);
    const runs=getArcadeRun(game),runId=runs.begin(character);for(let i=0;i<index;i++){runs.clearRoom(runId,i);runs.advance(runId,i);}
    game.scene.start('GameScene',{character,roomIndex:index,runId});
};
const scene=()=>game.scene.getScene('GameScene');
const entered=async(index,previous)=>{await until(()=>game.scene.isActive('GameScene')&&scene().roomIndex===index&&scene().player&&scene().generation!==previous);await delay(40);return scene();};
const button=(selector,label)=>[...document.querySelectorAll(`${selector} button`)].find(b=>b.textContent===label);
async function run(){
    await until(()=>game.scene.isActive('MainMenuScene'));
    for(const character of ['alex','lua']){
        game.scene.getScene('MainMenuScene').scene.start('GameScene',{character});let s=await entered(0,-1);
        const runs=getArcadeRun(game),runId=s.runId;
        for(let index=0;index<10;index++){
            const level=levels[index],generation=s.generation;
            check(`${character} level ${index+1}: full physical room and correct variants`,s.physics.world.bounds.width===2560&&s.physics.world.bounds.height===1536&&s.enemies.getChildren().every(enemy=>level.enemies.types.includes(enemy.texture.key)));
            if(index===4){
                check(`${character}: trial boss has 72 health, two phases and shared effects`,s.bossEncounter.boss.controller.health===72&&!!s.bossEncounter.effects&&s.bossEncounter.boss.controller.config.phasePatterns.length===2);
                s.bossEncounter.update(1500);s.bossEncounter.boss.receiveDamage(999);
                await until(()=>s.combatState==='playing'&&s.bossEncounter.boss.isDead());
                check(`${character}: first destruction unlocks exit without victory or epilogue`,!runs.canComplete(character,runId)&&s.doors.currentState==='unlocked'&&!game.scene.isActive('CompletionScene')&&!game.scene.isActive('VisualNovelScene'));
            }else{
                check(`${character} level ${index+1}: safe distributed spawns and active cap`,s.enemies.getLength()===level.enemies.count&&s.enemies.getLength()<=14&&s.enemies.getChildren().every(enemy=>!s.walls.getChildren().some(w=>Phaser.Geom.Intersects.RectangleToRectangle(enemy.body,w.body))));
                if(index===3)check(`${character}: introductory orange charges in 650ms with fourteen robots`,s.enemies.getChildren().every(e=>e.attack.config.chargeDuration===650)&&s.enemies.getLength()===14);
                let teleports=true;
                while(!s.waves.isComplete){
                    const living=s.enemyManager.getLivingEnemies();
                    teleports&&=living.every(enemy=>enemy.isSpawning)&&s.children.getChildren().filter(child=>child.name==='robot-spawn-effect').length===living.length;
                    s.enemyManager.defeatLivingEnemies();s.waves.update(1100);
                }
                check(`${character} level ${index+1}: every wave teleports and cancelled effects are cleaned`,teleports&&!s.children.getChildren().some(child=>child.name==='robot-spawn-effect'));
                check(`${character} level ${index+1}: every configured wave completes`,s.doors.currentState==='unlocked');
            }
            s.changeRoom();
            if(index===9){
                await until(()=>game.scene.isActive('VisualNovelScene')&&document.querySelector('.vn-skip'));
                const vn=game.scene.getScene('VisualNovelScene');
                check(`${character}: final intro uses exact lines and no combat entities`,vn.sequence.entries.filter(e=>e.type==='dialogue').map(e=>e.text).join('|')==='Datos obtenidos.|Patrones aprendidos.|Prepárate para el verdadero combate.'&&!scene().bossEncounter&&!scene().player);
                document.querySelector('.vn-skip').click();
            }
            s=await entered(index+1,generation);
            check(`${character} transition ${index+1}: one bounds listener and stable colliders`,s.physics.world.listenerCount('worldbounds')===1&&s.physics.world.colliders.getActive().length===(s.bossEncounter?10:8));
        }
        const encounter=s.bossEncounter,boss=encounter.boss,c=boss.controller;
        check(`${character}: same Quimera sprite, advanced profile and effects loaded`,boss.texture.key==='quimera'&&c.health===144&&c.advanced&&!!encounter.effects&&!!encounter.reinforcements);
        const visualShot=new Projectile(s,boss.x,boss.y,new Phaser.Math.Vector2(0,0),'enemy',s.enemyProjectiles,0,false,'single',{key:'quimera-projectiles',frame:0});
        await delay(40);
        for(const [key,count]of [['quimera-core-charge',8],['quimera-projectiles',16],['quimera-beam',12],['quimera-shockwave',12],['robot-spawn',12]])check(`${character}: ${key} frames registered`,s.textures.get(key).frameTotal===count+1&&(key!=='quimera-projectiles'||Math.abs(visualShot.physicsBody.body.width-8)<.01&&visualShot.physicsBody.anims.isPlaying));
        const energyDisplayWidth=visualShot.physicsBody.displayWidth;visualShot.destroy();
        const normalShot=new Projectile(s,s.player.x,s.player.y,new Phaser.Math.Vector2(0,0),'player',s.playerProjectiles);
        await delay(30);check(`${character}: larger projectiles preserve their original hit areas`,energyDisplayWidth===ProjectileConfig.energyDisplaySize&&normalShot.physicsBody.displayWidth===ProjectileConfig.displaySize.player&&Math.abs(normalShot.physicsBody.body.width-16)<.01);
        normalShot.destroy();
        encounter.update(1500);s.player.physicsSprite.body.reset(1000,768);
        // Verify a real shared projectile consumes exactly one normal hit.
        const before=c.health,shot=new Projectile(s,boss.x,boss.y,new Phaser.Math.Vector2(1,0),'player',s.playerProjectiles);
        await until(()=>!shot.physicsBody.active);check(`${character}: real projectile damage remains single and bounded`,c.health===before-2);
        const advance=predicate=>{for(let i=0;i<5000;i++){if(predicate())return;const f=boss.updateCombat(50,s.player,s.lineOfSight);encounter.effects.update(0,{shots:[],pulse:false});if(f.shots.length)window.observedShot=true;}throw Error('Advanced pattern timeout');};
        // Cancel attacks on pause and restart through actual scene lifecycle.
        s.pauseGame();await until(()=>document.querySelector('.pause-screen'));
        const time=c.time;await delay(120);check(`${character}: pause freezes boss state`,c.time===time);
        button('.pause-screen','Continuar').click();await until(()=>game.scene.isActive('GameScene'));
        c.health=60;advance(()=>c.phase===2&&c.state==='REPOSITION');
        s.player.physicsSprite.body.reset(350,800);
        // Phase-one supports now reserve before this fixture relocates the player.
        // Reset that reservation so this check measures clearance at the new position.
        encounter.reinforcements.cancelPending();encounter.reinforcements.update(AdvancedCombat.summonIntervalMs);encounter.reinforcements.request();
        check(`${character}: summon telegraphs reserve bounded slots`,encounter.reinforcements.pendingCount>0&&encounter.reinforcements.pendingCount<=AdvancedCombat.maxSummons);
        encounter.reinforcements.update(900);
        check(`${character}: summoned robots use existing variants and respect clearance`,s.enemyManager.aliveCount>0&&s.enemyManager.aliveCount<=AdvancedCombat.maxSummons&&s.enemyManager.getLivingEnemies().every(enemy=>Math.hypot(enemy.x-s.player.x,enemy.y-s.player.y)>=360&&!s.walls.getChildren().some(w=>Phaser.Geom.Intersects.RectangleToRectangle(enemy.body,w.body))));
        encounter.reinforcements.update(10000);encounter.reinforcements.request();encounter.reinforcements.update(900);encounter.reinforcements.request();
        check(`${character}: repeated summons never exceed the configured active cap`,s.enemyManager.aliveCount===AdvancedCombat.maxSummons&&encounter.reinforcements.pendingCount===0);
        const score=runs.getScore(runId);s.enemyManager.defeatLivingEnemies();check(`${character}: reinforcement kills count toward score and special charge`,runs.getScore(runId)>score&&runs.getSpecialCharge(runId)>0);
        // Beam stops at an actual solid wall; moving behind the wall remains safe.
        boss.body.reset(1300,768);c.aim=0;s.player.physicsSprite.body.reset(900,500);
        encounter.effects.update(0,{shots:[],pulse:false,beam:true});
        const beam=encounter.effects.activeAttack;
        check(`${character}: beam length is clipped within room boundaries`,beam.length>0&&beam.length<1500);
        encounter.effects.update(651,{shots:[],pulse:false});check(`${character}: beam damage window ends with its visual`,!encounter.effects.busy&&!s.player.isDead());
        encounter.effects.update(0,{shots:[],pulse:false,shockwave:true});check(`${character}: shockwave has a visible active window`,encounter.effects.busy);
        encounter.effects.update(1201,{shots:[],pulse:false});check(`${character}: shockwave leaves no active damage after fading`,!encounter.effects.busy&&!s.player.isDead());
        // Lethal beam uses the original one-hit player defeat and cleans pending summons.
        s.player.physicsSprite.body.reset(1400,768);encounter.effects.update(0,{shots:[],pulse:false,beam:true});
        await delay(30);encounter.effects.update(1,{shots:[],pulse:false});
        check(`${character}: active beam kills player in one valid hit`,s.player.isDead());
        await until(()=>game.scene.isActive('GameOverScene'));
        game.scene.getScene('GameOverScene').input.keyboard.emit('keydown-ENTER');const old=s.generation;s=await entered(10,old);
        check(`${character}: retry rebuilds final boss without replaying intro or leftovers`,s.bossEncounter.boss.controller.health===144&&s.enemyManager.aliveCount===0&&s.enemyProjectiles.getLength()===0&&runs.hasBossIntro(runId));
        s.bossEncounter.update(1500);s.bossEncounter.boss.receiveDamage(s.bossEncounter.boss.controller.config.maxHealth*.91);
        s.player.physicsSprite.body.reset(s.bossEncounter.boss.x-140,s.bossEncounter.boss.y);
        s.bossEncounter.update(1);
        check(`${character}: final boss preserves the proximity finisher below ten percent`,s.bossEncounter.finisher.active&&s.bossEncounter.finisher.challenge.remaining===600);
        for(const key of BossFinisherConfig.sequences[character])s.bossEncounter.finisher.input(key);
        s.bossEncounter.finisher.update(3000);
        await until(()=>game.scene.isActive('CompletionScene')&&document.querySelector('.completion-screen'));
        check(`${character}: only final destruction grants campaign victory without definitive epilogue`,runs.canComplete(character,runId)&&!game.scene.isActive('VisualNovelScene')&&document.querySelector('.completion-screen').textContent.includes('Campaña completada'));
        button('.completion-screen','Volver al menú principal').click();await until(()=>game.scene.isActive('MainMenuScene'));
    }
    for(const character of ['alex','lua']){
        window.previewSprint12(character,0);const contact=await entered(0,-1);
        contact.enemyManager.defeatLivingEnemies();
        contact.player.physicsSprite.body.reset(600,750);
        const red=new Enemy(contact,600,750,'robot-red');contact.enemies.add(red);
        await delay(80);check(`${character}: ordinary red contact does not hurt`,!contact.player.isDead()&&!red.isDead());red.destroy();
        const yellow=new Enemy(contact,600,750,'robot-yellow',{spawnEffect:true});contact.enemies.add(yellow);contact.enemyManager.add(yellow);
        await delay(80);check(`${character}: yellow cannot detonate during materialization`,!contact.player.isDead()&&!yellow.isDead());
        // Keep overlapping bodies until the materialization ends: use the real registered overlap.
        await until(()=>contact.player.isDead());
        check(`${character}: yellow touch detonates once and kills immediately`,yellow.isDead()&&contact.combatState==='defeat'&&!!contact.children.getByName('yellow-contact-explosion')&&!yellow.detonateOnContact());
        check(`${character}: contact death clears projectiles and pending attacks`,contact.enemyProjectiles.getLength()===0&&yellow.attack.phase==='ready');
    }
    window.previewSprint12('alex',0);const spawnScene=await entered(0,-1);
    spawnScene.physics.pause();
    const spawning=new Enemy(spawnScene,600,750,'robot-red',{spawnEffect:true});
    const startAlpha=spawning.alpha;await delay(100);
    check('Materialization freezes with paused physics and suppresses movement/attacks',spawning.isSpawning&&spawning.alpha===startAlpha&&spawning.updateBehavior(spawnScene.player,spawnScene.lineOfSight,100000)===null&&spawning.body.velocity.lengthSq()===0);
    spawnScene.physics.resume();await until(()=>!spawning.isSpawning);
    check('Materialization completes all frames and restores the robot',spawning.alpha===1&&RobotSpawnConfig.frames===12);
    spawning.destroy();
    window.previewSprint12('alex',10);
    await until(()=>game.scene.isActive('VisualNovelScene')&&document.querySelector('.vn-skip'));document.querySelector('.vn-skip').click();
    const live=await entered(10,-1),e=live.bossEncounter;
    live.player.physicsSprite.body.reset(500,768);live.cameras.main.stopFollow().setZoom(.65).centerOn(1280,768);
    e.boss.controller.health=22;live.manual=false;
    await until(()=>e.boss.controller.state==='CHARGING'&&e.boss.controller.attack==='beam');
    check('Live production AI shows its beam warning before emission',!e.effects.busy&&e.boss.controller.phase===3);
    live.player.physicsSprite.body.reset(500,1100);
    await until(()=>e.effects.activeAttack?.kind==='beam');
    check('Live production update emits the warned beam and allows dodging locked aim',!live.player.isDead()&&e.effects.busy);
    live.pauseGame();await until(()=>document.querySelector('.pause-screen'));const elapsed=e.effects.activeAttack.elapsed;
    await delay(180);check('Pause freezes the active beam damage/visual clock',e.effects.activeAttack.elapsed===elapsed);
    button('.pause-screen','Volver al menú principal').click();await until(()=>game.scene.isActive('MainMenuScene'));
    check('Leaving during a live advanced attack releases boss, effects and summons',e.boss.controller.state==='STOPPED'&&!e.effects.busy&&e.reinforcements.pendingCount===0&&!scene().bossEncounter);
    window.sprint12Results={status:'passed',count:checks.length,checks};
}
run().catch(error=>{window.sprint12Results={status:'failed',count:checks.length,checks,error:String(error.stack??error)};});

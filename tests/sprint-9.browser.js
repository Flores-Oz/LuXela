import Phaser from 'phaser';
import {gameConfig} from '../src/config/gameConfig';
import {GameScene} from '../src/scenes/GameScene';
import {CharacterUnlockService} from '../src/systems/CharacterUnlockService';
import {CHARACTER_CODES} from '../src/config/CharacterUnlockConfig';
import {getArcadeRun} from '../src/systems/ArcadeRunService';
import {levels} from '../src/levels/levels';
import {Enemy} from '../src/entities/enemies/Enemy';
import {Projectile} from '../src/entities/Projectile';
import {robotTypes,robotDefinitions} from '../src/config/RobotConfig';

const campaignScore=levels.reduce((sum,level)=>sum+level.waves.reduce((n,wave)=>n+wave.enemies.count*level.scorePerEnemy,0),0);
const checks=[],check=(name,value)=>{if(!value)throw Error(name);checks.push(name);};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const until=async predicate=>{for(let i=0;i<500;i++){if(predicate())return;await delay(20);}throw Error('Sprint 9 timeout');};
let generation=0;
class LargeRoomScene extends GameScene{
    init(data={}){super.init({...data,character:data.character??'alex'});}
    create(){super.create();this.generation=++generation;}
    // Keep the real physics, input, waves and camera; directed tests exercise AI separately.
    update(){this.player?.update();this.waves?.update(1000/60);}
}
const game=new Phaser.Game({...gameConfig,type:Phaser.CANVAS,scale:{mode:Phaser.Scale.NONE},scene:[LargeRoomScene,...gameConfig.scene.filter(Scene=>Scene!==GameScene)],callbacks:{preBoot(game){
    const unlocks=new CharacterUnlockService(()=>({getItem:()=>null,setItem(){}}));
    for(const code of Object.values(CHARACTER_CODES))unlocks.redeem(code);
    game.registry.set('character-unlock-service',unlocks);
}}});
window.sprint9Game=game;window.sprint9Results={status:'running'};
const scene=()=>game.scene.getScene('GameScene');
const caches=s=>s.children.list.filter(object=>object.name?.endsWith('-cache'));
const layers=s=>s.children.list.filter(object=>object.type==='TilemapLayer');
const load=async character=>{const previous=generation;game.scene.stop('CompletionScene');scene().scene.restart({character});await until(()=>generation>previous&&scene().player);await delay(50);return scene();};
const contained=camera=>camera.worldView.left>=-.01&&camera.worldView.top>=-.01&&camera.worldView.right<=2560.01&&camera.worldView.bottom<=1536.01;
async function run(){
    await until(()=>scene()?.player&&scene().enemyManager.aliveCount>0);
    let s=scene();game.scale.resize(1366,768);await delay(100);
    check('Rooms are physically 40x24 tiles and 2560x1536 world pixels',s.physics.world.bounds.width===2560&&s.physics.world.bounds.height===1536&&layers(s).every(layer=>layer.tilemap.width===40&&layer.tilemap.height===24));
    check('All 960 floor cells are populated at uniform 64px world scale',layers(s)[0].layer.data.flat().every(tile=>tile.index>=0)&&layers(s)[0].layer.data.flat().length===960&&layers(s).every(layer=>layer.scaleX===1&&layer.scaleY===1));
    check('Large Canvas rooms use bounded static chunks',caches(s).length>4&&caches(s).every(image=>image.texture.source[0].width<=512&&image.texture.source[0].height<=512)&&layers(s).every(layer=>!layer.visible));
    check('Only walls and the exit create static bodies',s.physics.world.staticBodies.size===s.walls.getLength()+1&&s.physics.world.staticBodies.size<960/4);
    check('Perimeter is marked separately from interior walls',s.walls.getChildren().some(wall=>wall.getData('room-perimeter'))&&s.walls.getChildren().some(wall=>!wall.getData('room-perimeter')));
    check('Large rooms have denser waves and grouped tactical scenery',s.enemyManager.aliveCount>=6&&levels[0].presentation.decorations.length>20&&levels[0].presentation.decorations.length<100&&s.walls.getChildren().filter(wall=>!wall.getData('room-perimeter')).length>=70);
    const aggressive=new Enemy(s,300,200,'robot-red',{...levels[0].difficulty,patrol:false});
    const attackTarget={x:620,y:200,isDead:()=>false,physicsSprite:{x:620,y:200,active:true}};
    const clearSight={hasLineOfSight:()=>true};
    check('Robots engage at 320px instead of waiting until point-blank range',aggressive.updateBehavior(attackTarget,clearSight,0)?.[0].direction.x===1);
    check('Basic soldier respects the specified 1.5 second interval',aggressive.updateBehavior(attackTarget,clearSight,1499)===null&&aggressive.updateBehavior(attackTarget,clearSight,1500)?.[0].direction.x===1);
    aggressive.body.blocked.right=true;aggressive.chasePlayer({x:620,y:200});
    check('Blocked pursuit changes axis instead of pushing the same wall',aggressive.body.velocity.y!==0&&aggressive.body.velocity.x===0);
    aggressive.destroy();
    for(const type of robotTypes){
        const robot=new Enemy(s,500,300,type,{patrol:false});robot.playIdle();
        check(`${type}: existing sprite art and complete animations load at 64px`,robot.frame.width===64&&robot.frame.height===64&&['idle','walk-up','walk-down','walk-left','walk-right','death'].every(name=>s.anims.exists(`${robotDefinitions[type].prefix}-${name}`)));
        check(`${type}: collision dimensions stay 44x52`,robot.body.width===44&&robot.body.height===52);
        robot.destroy();
    }
    const robotArt=document.createElement('canvas');robotArt.width=384;robotArt.height=768;
    for(const type of robotTypes.slice(1)){
        const ctx=robotArt.getContext('2d');ctx.clearRect(0,0,384,768);ctx.drawImage(s.textures.get(type).getSourceImage(),0,0);
        const pixels=ctx.getImageData(0,0,64,64).data;
        check(`${type}: normalized art has visible pixels and transparent margins`,pixels.filter((_,i)=>i%4===3&&pixels[i]>0).length>500&&pixels[3]===0);
    }
    const originalScale=s.player.physicsSprite.scaleX;
    for(const [width,height]of [[1366,768],[1920,1080],[390,844],[3440,1440],[3840,2160]]){
        game.scale.resize(width,height);await delay(80);
        check(`${width}x${height}: camera fills the viewport without letterboxing`,s.cameras.main.width===width&&s.cameras.main.height===height&&contained(s.cameras.main)&&s.cameras.main.worldView.width<=2560.01&&s.cameras.main.worldView.height<=1536.01);
        check(`${width}x${height}: player proportions and fixed HUD stay intact`,s.player.physicsSprite.scaleX===originalScale&&s.hud.text.scrollFactorX===0&&Math.abs(s.hud.text.scaleX*s.cameras.main.zoom-1)<.001);
    }
    game.scale.resize(1366,768);await delay(80);
    s.player.physicsSprite.body.reset(1600,900);const before=s.cameras.main.scrollX;await delay(40);
    check('Camera follows with interpolation rather than jumping to the target',s.cameras.main.scrollX>before&&s.cameras.main.scrollX<1600-s.cameras.main.width/2-1);
    for(const [x,y]of [[96,96],[2464,96],[96,1440],[2464,1440]]){
        s.player.physicsSprite.body.reset(x,y);await delay(500);
        check(`Camera remains inside the map near ${x},${y}`,contained(s.cameras.main));
    }
    s.player.physicsSprite.body.reset(1200,220);await delay(100);
    const body=s.player.physicsSprite.body,startX=body.x;
    s.player.wasd.D.isDown=true;await delay(450);s.player.wasd.D.isDown=false;s.player.update();
    check('Player can move through real world space with the camera following',body.x>startX+70&&body.x<startX+130&&contained(s.cameras.main));
    s.player.physicsSprite.body.reset(80,220);s.player.wasd.A.isDown=true;await delay(180);s.player.wasd.A.isDown=false;s.player.update();
    check('Player still collides with the outer wall',s.player.physicsSprite.body.left>=63.9);
    const wall=s.walls.getChildren().find(wall=>!wall.getData('room-perimeter'));
    const target={x:wall.x+160,y:wall.y,isDead:()=>false,physicsSprite:{x:wall.x+160,y:wall.y,active:true}};
    const red=new Enemy(s,wall.x-96,wall.y,'robot-red',{detectionRange:600,patrol:false});
    const orange=new Enemy(s,wall.x-96,wall.y,'robot-orange',{detectionRange:600,patrol:false});
    check('Normal robot cannot shoot through interior walls',red.updateBehavior(target,s.lineOfSight,10000)===null);red.stop();
    check('Orange charges before firing through interior walls',orange.updateBehavior(target,s.lineOfSight,10000)===null&&orange.getState()==='CHARGING');
    const volley=orange.updateBehavior(target,s.lineOfSight,11000);orange.stop();
    check('Orange robot can aim through interior walls while remaining physically solid',volley?.length===6&&volley[2].direction.x>0&&orange.piercesInteriorWalls&&orange.body.width===44);
    const redShot=new Projectile(s,wall.x-96,wall.y,new Phaser.Math.Vector2(1,0),'enemy',s.enemyProjectiles);
    const orangeShot=new Projectile(s,wall.x-96,wall.y,new Phaser.Math.Vector2(1,0),'enemy',s.enemyProjectiles,500,true);
    await delay(650);
    check('Normal projectile hits the wall while the orange projectile crosses it',!redShot.physicsBody.active&&orangeShot.physicsBody.active&&orangeShot.physicsBody.x>wall.x+160);
    orangeShot.destroy();red.destroy();orange.destroy();
    const outerShot=new Projectile(s,2400,150,new Phaser.Math.Vector2(1,0),'enemy',s.enemyProjectiles,500,true);
    await delay(350);check('Orange projectile is destroyed by the outer wall',!outerShot.physicsBody.active);
    const boundsShot=new Projectile(s,2550,220,new Phaser.Math.Vector2(1,0),'enemy',s.enemyProjectiles,500,true);
    await delay(80);check('World bounds also destroy projectiles',!boundsShot.physicsBody.active);
    const runs=getArcadeRun(game);
    for(const character of ['alex','lua']){
        s=await load(character);const runId=s.runId;
        for(let index=0;index<levels.length;index++){
            const config=levels[index],current=s,oldCaches=caches(s).map(image=>({image,key:image.texture.key}));
            if(config.availability==='reserved'||config.boss) {
                check(`${character}: final arena has no normal waves or provisional robots`,s.roomIndex===index&&s.waves===null&&s.enemyManager.aliveCount===0&&!!s.bossEncounter);
                s.roomCleared();s.changeRoom();await delay(50);
                check(`${character}: final arena cannot complete before boss destruction`,s.doors.currentState==='locked'&&!s.isChangingRoom&&!game.scene.isActive('CompletionScene')&&!runs.canComplete(character,runId)&&runs.getScore(runId)===campaignScore);
                break;
            }
            check(`${character} room ${index+1}: large world and configured wave load`,s.roomIndex===index&&s.physics.world.bounds.width===2560&&s.enemyManager.aliveCount===config.waves[0].enemies.count);
            const door=s.children.list.find(object=>object.name==='door-visual');
            check(`${character} room ${index+1}: exit uses current map coordinates`,door.x===(config.exits[0].position.column+.5)*64&&door.y===(config.exits[0].position.row+.5)*64);
            for(let wave=0;wave<config.waves.length;wave++){
                await until(()=>s.waves.state==='active');
                const living=s.enemyManager.getLivingEnemies();
                check(`${character} room ${index+1} wave ${wave+1}: distributed safe spawns`,living.every(enemy=>!s.walls.getChildren().some(wall=>Phaser.Geom.Intersects.RectangleToRectangle(enemy.body,wall.body))&&Math.hypot(enemy.x-s.player.x,enemy.y-s.player.y)>=config.difficulty.detectionRange+63&&Math.hypot(enemy.x-door.x,enemy.y-door.y)>=120));
                s.enemyManager.defeatLivingEnemies();s.waves.update(1100);await delay(30);
            }
            check(`${character} room ${index+1}: waves unlock the existing exit`,s.waves.isComplete&&s.doors.currentState==='unlocked');
            new Projectile(s,400,300,new Phaser.Math.Vector2(1,0),'player',s.playerProjectiles);
            const before=generation;s.player.physicsSprite.body.reset(door.x,door.y);
            if(index<levels.length-1){
                await until(()=>generation>before&&scene().player);s=scene();await delay(40);
                check(`${character} transition ${index+1}: old caches and bullets are released`,oldCaches.every(({image,key})=>!image.scene&&!s.textures.exists(key))&&current.playerProjectiles.getLength()===0);
                check(`${character} transition ${index+1}: one bounds listener and stable colliders`,s.physics.world.listenerCount('worldbounds')===1&&s.physics.world.colliders.getActive().length===(s.bossEncounter?9:7));
            }else{
                await until(()=>game.scene.isActive('CompletionScene'));
                check(`${character}: completion and score survive the enlarged campaign`,runs.canComplete(character,runId)&&runs.getScore(runId)===campaignScore);
                check(`${character}: final room cache is released`,oldCaches.every(({image,key})=>!image.scene&&!game.textures.exists(key)));
            }
        }
    }
    s=await load('alex');
    const firstGeneration=s.generation,cacheKeys=caches(s).map(image=>image.texture.key),chunkCount=caches(s).length;
    s.player.physicsSprite.body.reset(1200,220);s.player.wasd.D.isDown=true;await delay(400);s.player.wasd.D.isDown=false;
    check('Moving the camera does not rebuild room textures or chunks',s.generation===firstGeneration&&caches(s).length===chunkCount&&cacheKeys.every(key=>s.textures.exists(key)));
    window.sprint9Results={status:'passed',count:checks.length,checks,room:{columns:40,rows:24,tileSize:64,width:2560,height:1536},chunks:chunkCount};
}
run().catch(error=>{window.sprint9Results={status:'failed',count:checks.length,checks,error:String(error.stack??error)};});

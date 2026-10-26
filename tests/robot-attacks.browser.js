import Phaser from 'phaser';
import {gameConfig} from '../src/config/gameConfig';
import {GameScene} from '../src/scenes/GameScene';
import {Enemy} from '../src/entities/enemies/Enemy';
import {Projectile} from '../src/entities/Projectile';
import {fireEnemyShots} from '../src/systems/EnemyProjectiles';
import {getArcadeRun} from '../src/systems/ArcadeRunService';
import {CharacterUnlockService} from '../src/systems/CharacterUnlockService';
import {CHARACTER_CODES} from '../src/config/CharacterUnlockConfig';

const checks=[],check=(name,value)=>{if(!value)throw Error(name);checks.push(name);};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let generation=0,now=1000;
class AttackTestScene extends GameScene {
    init(data={}){super.init({...data,character:data.character??'alex'});}
    create(){super.create();this.generation=++generation;}
    update(){} // Drive production AI with exact timestamps; retain real Arcade collision callbacks.
}
const game=new Phaser.Game({...gameConfig,type:Phaser.CANVAS,scene:[AttackTestScene,...gameConfig.scene.filter(Scene=>Scene!==GameScene)],callbacks:{preBoot(game){
    const unlocks=new CharacterUnlockService(()=>({getItem:()=>null,setItem(){}}));
    for(const code of Object.values(CHARACTER_CODES))unlocks.redeem(code);
    game.registry.set('character-unlock-service',unlocks);
}}});
window.robotAttackGame=game;window.robotAttackResults={status:'running'};
const tick=(count=1)=>{for(let i=0;i<count;i++)game.scene.update(now+=1000/60,1000/60);};
const scene=()=>game.scene.getScene('GameScene');
async function ready(previous=0){for(let i=0;i<500;i++){if(scene()?.generation>previous&&scene().player)return;tick();await delay(10);}throw Error('Scene did not load');}
const reset=(sprite,x,y)=>sprite.body.reset(x,y);
async function run(){
    while(!scene()?.player)await delay(20);
    game.loop.sleep();
    for(const character of ['alex','lua']){
        const previous=generation;scene().scene.restart({character});await ready(previous);tick(2);
        const s=scene(),label=name=>`${character}: ${name}`;
        s.enemies.getChildren().forEach(enemy=>enemy.disableBody(true,true));
        reset(s.player.physicsSprite,500,160);
        const probes=[];
        const make=(type,x=260,y=160)=>{const enemy=new Enemy(s,x,y,`robot-${type}`,{moveSpeed:80,detectionRange:420,patrol:false});s.enemies.add(enemy);probes.push(enemy);return enemy;};
        const emit=(enemy,time)=>{const shots=enemy.updateBehavior(s.player,s.lineOfSight,time);fireEnemyShots(s,enemy,shots,s.enemyProjectiles);return shots;};
        const clear=()=>s.enemyProjectiles.clear(true,true);
        const interior=s.add.zone(380,160,32,128);s.physics.add.existing(interior,true);interior.setData('room-perimeter',false);s.walls.add(interior);
        interior.setActive(false);interior.body.enable=false;
        const wall=enabled=>{interior.setActive(enabled);interior.body.enable=enabled;};
        const red=make('red');
        let shots=emit(red,0);
        check(label('red emits one 300px/s instant-kill projectile'),shots.length===1&&s.enemyProjectiles.getLength()===1&&s.enemyProjectiles.getChildren()[0].body.velocity.x===300&&s.enemyProjectiles.getChildren()[0].getData('projectile').damageType==='instant-kill');
        check(label('red waits exactly 1500ms'),emit(red,1499)===null&&emit(red,1500)?.length===1);clear();red.destroy();

        const blue=make('blue');
        check(label('blue starts with one 350px/s projectile'),emit(blue,10000)?.length===1&&s.enemyProjectiles.getChildren()[0].body.velocity.length()===350);
        check(label('blue waits 200ms between shots'),emit(blue,10199)===null);
        reset(s.player.physicsSprite,500,200);shots=emit(blue,10200);
        check(label('blue second shot re-aims at current player position'),shots?.length===1&&shots[0].direction.y>0);
        reset(s.player.physicsSprite,500,120);shots=emit(blue,10400);
        check(label('blue third shot re-aims'),shots?.length===1&&shots[0].direction.y<0&&s.enemyProjectiles.getLength()===3);
        check(label('blue fourth shot follows after 200ms'),emit(blue,10600)?.length===1&&s.enemyProjectiles.getLength()===4);
        check(label('blue fifth shot completes the burst'),emit(blue,10800)?.length===1&&s.enemyProjectiles.getLength()===5);
        check(label('blue rests two seconds after the fifth shot'),emit(blue,12799)===null&&emit(blue,12800)?.length===1);clear();
        wall(true);reset(s.player.physicsSprite,500,160);
        check(label('blue cancels pending shots when the real wall blocks sight'),emit(blue,13000)===null&&blue.attack.phase==='ready');
        wall(false);check(label('blue does not resume cancelled burst early'),emit(blue,13200)===null);
        reset(s.player.physicsSprite,350,160);blue.updateBehavior(s.player,s.lineOfSight,13500);
        check(label('blue retreats from a nearby player'),blue.getState()==='RETREAT'&&blue.body.velocity.x<0);blue.destroy();

        reset(s.player.physicsSprite,560,160);const yellow=make('yellow');
        check(label('yellow chases at twice the base speed outside short attack range'),emit(yellow,20000)===null&&yellow.getState()==='CHASE'&&yellow.body.velocity.x===160);
        reset(s.player.physicsSprite,410,160);shots=emit(yellow,20100);
        check(label('yellow fires one 400px/s shot within 160px'),shots?.length===1&&shots[0].speed===400);
        check(label('yellow keeps walking and its movement animation when firing'),yellow.body.velocity.x===160&&yellow.getState()==='CHASE'&&yellow.anims.currentAnim.key==='robot-yellow-walk-right');
        const yellowX=yellow.x;tick(5);
        check(label('yellow physically advances after firing'),yellow.x>yellowX+10);
        check(label('yellow uses an 800ms interval'),emit(yellow,20899)===null&&emit(yellow,20900)?.length===1);clear();
        wall(true);reset(s.player.physicsSprite,500,160);reset(yellow,340,160);
        check(label('yellow cannot shoot through the interior wall'),emit(yellow,22000)===null);
        tick(40);check(label('yellow physical body stays outside walls'),yellow.body.right<=interior.body.left+.01);
        wall(false);yellow.destroy();

        reset(s.player.physicsSprite,500,160);const orange=make('orange');
        wall(true);check(label('orange starts charging through an interior wall'),emit(orange,30000)===null&&orange.getState()==='CHARGING');
        check(label('orange charge is visible and stationary'),orange.chargeWarning?.visible&&orange.body.velocity.length()===0&&orange.anims.currentAnim.key==='robot-orange-special-a1');
        check(label('orange does not fire before one second'),emit(orange,30999)===null);
        reset(s.player.physicsSprite,500,180);shots=emit(orange,31000);
        const aim=Math.atan2(20,240);
        check(label('orange emits six simultaneous projectiles in a symmetric spread'),shots?.length===6&&shots.every((shot,i)=>Math.abs(Math.atan2(shot.direction.y,shot.direction.x)-aim-[-20,-12,-4,4,12,20][i]*Math.PI/180)<1e-10));
        check(label('all six orange shots are 320px/s piercing projectiles'),s.enemyProjectiles.getLength()===6&&s.enemyProjectiles.getChildren().every(shot=>Math.abs(shot.body.velocity.length()-320)<1e-8&&shot.getData('projectile').piercesInteriorWalls));
        const center=s.enemyProjectiles.getChildren()[2],fixedVelocity=center.body.velocity.clone();
        reset(s.player.physicsSprite,1000,1000);tick(45);
        check(label('orange inner projectile crosses the real interior wall'),center.active&&center.x>interior.body.right);
        check(label('fired orange projectile never tracks a moving player'),center.body.velocity.equals(fixedVelocity));clear();wall(false);
        reset(s.player.physicsSprite,500,160);
        check(label('orange recovery prevents another attack for 2.5s'),emit(orange,33499)===null&&orange.attack.phase==='recovering');
        check(label('orange starts a fresh charge after recovery'),emit(orange,33500)===null&&orange.attack.phase==='charging');
        reset(s.player.physicsSprite,1000,160);emit(orange,34000);
        check(label('orange loses pending charge when player leaves perception'),orange.attack.phase==='ready'&&!orange.chargeWarning&&!orange.hasDetectedPlayer());
        check(label('orange never starts charging outside perception'),emit(orange,40000)===null&&orange.attack.phase==='ready');orange.destroy();

        // A projectile fired before a wall appears must still collide with that wall.
        reset(s.player.physicsSprite,500,160);const normal=make('red');emit(normal,50000);wall(true);
        reset(s.player.physicsSprite,1000,1000);tick(35);
        check(label('normal projectile is destroyed by an interior wall'),s.enemyProjectiles.getLength()===0);wall(false);normal.destroy();
        for(const piercing of [false,true]){
            const shot=new Projectile(s,2450,160,new Phaser.Math.Vector2(1,0),'enemy',s.enemyProjectiles,320,piercing);
            tick(20);check(label(`${piercing?'piercing':'normal'} projectile cannot cross the exterior wall`),!shot.physicsBody.active);
            const outside=new Projectile(s,2550,160,new Phaser.Math.Vector2(1,0),'enemy',s.enemyProjectiles,320,piercing);
            tick(5);check(label(`${piercing?'piercing':'normal'} projectile is destroyed at world bounds`),!outside.physicsBody.active);
        }
        reset(s.player.physicsSprite,500,160);const shooter=make('red'),friendly=make('red',340,160);emit(shooter,60000);reset(s.player.physicsSprite,1000,1000);tick(25);
        check(label('enemy projectiles do not damage other robots'),!friendly.isDead());clear();shooter.destroy();friendly.destroy();

        reset(s.player.physicsSprite,500,160);
        const runs=getArcadeRun(game),score=runs.getScore(s.runId),charge=runs.getSpecialCharge(s.runId),alive=s.enemyManager.aliveCount;
        for(const type of ['red','blue','yellow','orange']){
            // Reuse a real wave identity while probing every variant in the red teaching room.
            const replaced=s.enemyManager.getLivingEnemies()[0],identity=replaced.getData('level-enemy-id');
            replaced.destroy();
            const enemy=make(type);enemy.setData('level-enemy-id',identity);s.enemyManager.add(enemy);
            enemy.enableBody(true,260,160,true,true);
            if(type==='blue'||type==='orange')emit(enemy,70000);
            // Use the production player-projectile overlap rather than calling die().
            new Projectile(s,enemy.x,enemy.y,new Phaser.Math.Vector2(0,1),'player',s.playerProjectiles,0);
            tick(2);
            check(label(`${type} dies from a single player projectile and cannot fire again`),enemy.isDead()&&!enemy.body.enable&&enemy.updateBehavior(s.player,s.lineOfSight,80000)===null);
            check(label(`${type} discards attack phase and charge warning on death`),enemy.attack.phase==='ready'&&!enemy.chargeWarning);
            clear();
        }
        check(label('all four variant kills award score and special charge once'),runs.getScore(s.runId)===score+400&&runs.getSpecialCharge(s.runId)===charge+4&&s.enemyManager.aliveCount===alive-4);
        const pendingBlue=make('blue'),pendingOrange=make('orange');emit(pendingBlue,90000);emit(pendingOrange,90000);
        new Projectile(s,s.player.x,s.player.y,new Phaser.Math.Vector2(0,1),'enemy',s.enemyProjectiles,0);
        tick(2);
        check(label('one valid enemy hit kills the player'),s.player.isDead()&&s.combatState==='defeat');
        check(label('player death cancels blue and orange pending attacks immediately'),pendingBlue.attack.phase==='ready'&&pendingOrange.attack.phase==='ready'&&!pendingOrange.chargeWarning);
        check(label('player death clears emitted projectiles'),s.enemyProjectiles.getLength()===0&&s.playerProjectiles.getLength()===0);
        check(label('no enemy attacks the dead player'),emit(pendingBlue,100000)===null&&emit(pendingOrange,100000)===null);

        const oldProjectiles=s.enemyProjectiles,oldWarning=pendingOrange.chargeWarning;
        const oldGeneration=generation;s.scene.restart({character});await ready(oldGeneration);tick(2);
        check(label('restart releases previous projectile groups and warnings'),!oldProjectiles.scene&&!oldWarning?.scene);
        check(label('restart has no pending attack callbacks'),scene().time._active.length===0&&scene().time._pendingInsertion.length===0);
    }
    // Preparation for room transitions cancels the same production attack state.
    const s=scene();s.enemies.getChildren().forEach(enemy=>enemy.disableBody(true,true));reset(s.player.physicsSprite,500,160);
    const orange=new Enemy(s,260,160,'robot-orange',{detectionRange:420});s.enemies.add(orange);orange.updateBehavior(s.player,s.lineOfSight,0);
    const warning=orange.chargeWarning;s.prepareRoomExit();
    check('Room exit cancels charge and warning before scene shutdown',orange.attack.phase==='ready'&&!warning.scene&&s.enemyProjectiles.getLength()===0);
    window.robotAttackResults={status:'passed',count:checks.length,checks};
}
run().catch(error=>{window.robotAttackResults={status:'failed',count:checks.length,checks,error:String(error.stack??error)};}).finally(()=>{document.querySelector('#results').textContent=JSON.stringify(window.robotAttackResults,null,2);});

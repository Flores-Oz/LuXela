// Reuse the full current campaign fixture (both characters, eleven rooms, victory and QTE).
import './sprint-12.browser.js';
import Phaser from 'phaser';
import {Enemy} from '../src/entities/enemies/Enemy';
import {fireEnemyShots} from '../src/systems/EnemyProjectiles';
import {getArcadeRun} from '../src/systems/ArcadeRunService';
import {Projectile} from '../src/entities/Projectile';
const checks=[],snapshots={},check=(name,value)=>{if(!value)throw Error(name);checks.push(name);};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const until=async predicate=>{for(let i=0;i<1500;i++){if(predicate())return;await delay(20);}throw Error('Sprint 13 timeout');};
const scene=()=>window.sprint12Game.scene.getScene('GameScene');
window.sprint13Results={status:'running'};
async function preview(character,index){
    const previous=scene().generation;window.previewSprint12(character,index);
    if(index===10){await until(()=>document.querySelector('.vn-skip'));document.querySelector('.vn-skip').click();}
    await until(()=>scene().generation!==previous&&scene().roomIndex===index&&scene().player);
    const s=scene();await delay(80);s.cameras.main.stopFollow().setZoom(.5).centerOn(1280,768);await delay(40);return s;
}
const capture=async name=>{await delay(60);snapshots[name]=document.querySelector('canvas').toDataURL('image/png');};
async function run(){
    await until(()=>window.sprint12Results?.status==='passed'||window.sprint12Results?.status==='failed');
    check('Entire previous campaign still passes for Alex and Lua',window.sprint12Results.status==='passed');
    for(const character of ['alex','lua']){
        const s=await preview(character,0);s.enemies.clear(true,true);s.player.physicsSprite.body.reset(1140,160);
        const red=new Enemy(s,400,160,'robot-red',{moveSpeed:80,detectionRange:600});s.enemies.add(red);
        check(`${character}: red detects at 740px, beyond the previous 600px`,red.detectPlayer(s.player.physicsSprite));
        const wall=s.add.zone(800,160,64,128);s.physics.add.existing(wall,true);s.walls.add(wall);
        check(`${character}: new red range still respects actual solid cover`,red.updateBehavior(s.player,s.lineOfSight,0)===null);red.stop();wall.destroy();
        const shots=red.updateBehavior(s.player,s.lineOfSight,1500);red.stop();
        check(`${character}: red fires normally across the extended range`,shots?.length===1&&shots[0].speed===300&&shots[0].lifetimeMs===2500);
        fireEnemyShots(s,red,shots,s.enemyProjectiles);
        await until(()=>s.player.isDead());check(`${character}: real red projectile reaches the new distance and kills with one hit`,s.combatState==='defeat');
    }
    for(const character of ['alex','lua'])for(const [index,phases]of [[4,2],[10,3]]){
        const s=await preview(character,index),e=s.bossEncounter,b=e.boss,c=b.controller,label=`${character} level ${index+1}`;
        s.physics.pause();s.player.physicsSprite.body.reset(400,750);
        const colliders=s.physics.world.colliders.getActive().length,health=c.health;
        check(`${label}: shared controller exposes the configured phase count`,c.config.phasePatterns.length===phases);
        e.update(1500);
        if(index===10)check(`${label}: six supports are reserved at full health in phase one`,c.health===144&&c.phase===1&&e.reinforcements.pendingCount===6);
        e.update(1100);
        check(`${label}: tactical teleport reserves a destination before moving`,c.state==='TELEPORTING'&&!!e.teleport.pendingDestination);
        const origin={x:b.x,y:b.y},destination={...e.teleport.pendingDestination};
        const warningElapsed=Math.floor(c.tactics.teleportWarningMs*.45);e.update(warningElapsed);
        check(`${label}: teleport animation matches the encounter warning duration`,e.teleport.visuals.every(v=>Math.abs(v.progress-.45)<.01));
        if(character==='alex')await capture(`level-${index+1}-teleport-warning`);
        s.pauseGame();await until(()=>document.querySelector('.pause-screen'));
        const clock=c.time;await delay(80);check(`${label}: pause freezes teleport clock and origin`,c.time===clock&&b.x===origin.x&&b.y===origin.y);
        [...document.querySelectorAll('.pause-screen button')].find(button=>button.textContent==='Continuar').click();
        await until(()=>window.sprint12Game.scene.isActive('GameScene'));s.physics.pause();await delay(60);
        s.cameras.main.stopFollow().setZoom(.5).centerOn(1280,768);await delay(40);
        e.update(c.tactics.teleportWarningMs-warningElapsed-1);check(`${label}: no movement or shots before the full teleport warning`,b.x===origin.x&&b.y===origin.y&&s.enemyProjectiles.getLength()===0);
        e.update(1);
        check(`${label}: teleport arrives at a clear distant position with no instant shot`,b.x===destination.x&&b.y===destination.y&&Math.hypot(b.x-s.player.x,b.y-s.player.y)>=260&&s.enemyProjectiles.getLength()===0&&!s.walls.getChildren().some(w=>Phaser.Geom.Intersects.RectangleToRectangle(b.body,w.body)));
        e.update(c.tactics.postTeleportMs);check(`${label}: arrival starts a new attack warning`,c.state==='CHARGING');
        e.update(c.config.warningMs.aim-1);check(`${label}: post-teleport warning remains nonlethal`,s.enemyProjectiles.getLength()===0&&!s.player.isDead());
        e.update(1);check(`${label}: the warned attack emits once after arrival`,s.enemyProjectiles.getLength()===1&&c.health===health);
        s.enemyProjectiles.clear(true,true);e.update(c.config.recoveryMs[0]);
        c.health=health*.5;if(index===10)c.health=health*.7;
        e.update(1);check(`${label}: exact threshold does not trigger the next phase`,c.phase===1);
        c.health-=.01;const before=c.health;e.update(1);
        check(`${label}: crossing the threshold transitions once without healing`,c.phase===2&&c.state==='PHASE_TRANSITION'&&c.health===before);
        e.update(c.config.transitionMs);
        if(index===10){
            const advance=predicate=>{for(let i=0;i<4000;i++){if(predicate())return;b.updateCombat(25,s.player,s.lineOfSight);}throw Error('Adaptive area timeout');};
            advance(()=>c.state==='CHARGING'&&c.attack==='target-area');e.effects.update(0,{shots:[],pulse:false});
            const locked={...c.warningTarget};if(character==='alex')await capture('final-stationary-area-warning');
            // Bound the escape route by the current warning and actual player speed.
            const matrix=s.levels.createRoom(index,64).matrix,start={row:Math.floor(locked.y/64),column:Math.floor(locked.x/64),steps:0};
            const maxSteps=Math.floor((c.config.warningMs['target-area']*.22-Math.hypot((start.column+.5)*64-locked.x,(start.row+.5)*64-locked.y))/64);
            const queue=[start],seen=new Set([`${start.row},${start.column}`]),choices=[];
            for(let i=0;i<queue.length;i++){
                const p=queue[i];choices.push({x:(p.column+.5)*64,y:(p.row+.5)*64});if(p.steps>=maxSteps)continue;
                for(const [dr,dc]of [[1,0],[-1,0],[0,1],[0,-1]]){const row=p.row+dr,column=p.column+dc,k=`${row},${column}`;if(matrix[row]?.[column]!==undefined&&matrix[row][column]!==1&&!seen.has(k)){seen.add(k);queue.push({row,column,steps:p.steps+1});}}
            }
            choices.splice(0,choices.length,...choices.filter(p=>Math.hypot(p.x-locked.x,p.y-locked.y)>=200));
            const escape=choices.find(p=>p.x>100&&p.x<2460&&p.y>100&&p.y<1436&&!s.walls.getChildren().some(w=>Phaser.Geom.Intersects.RectangleToRectangle(new Phaser.Geom.Rectangle(p.x-24,p.y-30,48,60),w.body)));
            check(`${label}: targeted area provides a reachable escape point`,!!escape);
            s.player.physicsSprite.body.reset(escape.x,escape.y);
            let frame=b.updateCombat(c.config.warningMs['target-area']-1,s.player,s.lineOfSight);check(`${label}: area warning creates no premature damage`,!frame.area&&!s.player.isDead());
            frame=b.updateCombat(1,s.player,s.lineOfSight);e.effects.update(0,frame);
            check(`${label}: area stays locked and an actual dodge survives`,frame.area?.x===locked.x&&frame.area?.y===locked.y&&!s.player.isDead());
            e.effects.update(901,{shots:[],pulse:false});check(`${label}: area visual and damage end together`,!e.effects.busy);
            c.health=health*.35;c.state='REPOSITION';c.dueAt=c.time+1000;b.updateCombat(1,s.player,s.lineOfSight);check(`${label}: 35 percent remains in phase two`,c.phase===2);
            c.health-=.01;b.updateCombat(1,s.player,s.lineOfSight);check(`${label}: below 35 percent enters the final phase`,c.phase===3&&c.state==='PHASE_TRANSITION');
            b.updateCombat(c.config.transitionMs,s.player,s.lineOfSight);
        }
        s.player.physicsSprite.body.reset(400,750);
        const runs=getArcadeRun(s.game),score=runs.getScore(s.runId),limit=c.tactics.summons;
        for(let i=0;i<3;i++){e.reinforcements.request();e.reinforcements.update(900);e.reinforcements.update(limit.intervalMs);}
        check(`${label}: existing summon system enforces its encounter-specific cap`,s.enemyManager.aliveCount===limit.maxActive&&e.reinforcements.pendingCount===0);
        s.enemyManager.defeatLivingEnemies();check(`${label}: summoned kills still count toward score and specials`,runs.getScore(s.runId)===score+limit.maxActive*100&&runs.getSpecialCharge(s.runId)>0);
        if(index===10){
            e.reinforcements.update(1);
            check(`${label}: last support death automatically reserves a new complete cohort`,e.reinforcements.pendingCount===limit.batch&&s.enemyManager.aliveCount===0);
            e.reinforcements.update(899);
            check(`${label}: supports cannot materialize before their warning completes`,s.enemyManager.aliveCount===0);
            e.reinforcements.update(1);
            const cohort=s.enemyManager.getLivingEnemies(),ids=cohort.map(enemy=>enemy.getData('level-enemy-id'));
            check(`${label}: automatic cohort contains a full batch of red blue or orange robots`,cohort.length===limit.batch&&cohort.every(enemy=>limit.types.includes(enemy.animationPrefix==='robot'?'robot-red':enemy.animationPrefix)));
            cohort[0].die();e.reinforcements.update(5000);e.reinforcements.request();
            check(`${label}: surviving supports prevent early replacements`,s.enemyManager.aliveCount===limit.maxActive-1&&e.reinforcements.pendingCount===0);
            s.enemyManager.defeatLivingEnemies();e.reinforcements.update(1);e.reinforcements.update(900);
            check(`${label}: a second full replacement cohort has unique identities`,s.enemyManager.aliveCount===limit.maxActive&&s.enemyManager.getLivingEnemies().every(enemy=>!ids.includes(enemy.getData('level-enemy-id'))));
            s.enemyManager.defeatLivingEnemies();
        }
        check(`${label}: effects and summons add no colliders or bounds listeners`,s.physics.world.colliders.getActive().length===colliders&&s.physics.world.listenerCount('worldbounds')===1);
        // Cancel a real reserved teleport via the encounter lifecycle.
        b.body.reset(1300,768);c.state='REPOSITION';c.dueAt=c.time;c.nextTeleportAt=0;e.update(1);
        check(`${label}: another valid tactical reposition can be prepared`,c.state==='TELEPORTING'&&!!e.teleport.pendingDestination);
        e.stop();e.update(10000);
        check(`${label}: stop cancels teleport, damage, summons and all future shots`,c.state==='STOPPED'&&!e.teleport.pendingDestination&&!e.effects.busy&&e.reinforcements.pendingCount===0&&s.enemyProjectiles.getLength()===0);
    }
    for(const character of ['alex','lua']){
        const s=await preview(character,10),e=s.bossEncounter,b=e.boss,c=b.controller,label=`${character} evasion`;
        s.physics.pause();e.update(1500);e.reinforcements.cancelPending();
        s.enemyManager.defeatLivingEnemies();s.enemyProjectiles.clear(true,true);
        const clear=[];
        for(let x=350;x<2200;x+=100)for(let y=350;y<1200;y+=100){
            const area=new Phaser.Geom.Rectangle(x-240,y-230,400,460);
            if(!s.walls.getChildren().some(w=>Phaser.Geom.Intersects.RectangleToRectangle(area,w.body)))clear.push({x,y});
        }
        check(`${label}: arena offers a clear physical sidestep route`,clear.length>0);
        const point=clear[0];b.body.reset(point.x,point.y);b.body.updateFromGameObject();
        s.player.physicsSprite.body.reset(2300,1200);
        c.state='REPOSITION';c.dueAt=c.time+10000;c.nextTeleportAt=Infinity;
        e.evasion.random=()=>0; // Deterministic success; probability/cooldown also have unit tests.
        const origin={x:b.x,y:b.y},health=c.health,center={x:b.body.center.x,y:b.body.center.y};
        new Projectile(s,center.x-200,center.y,new Phaser.Math.Vector2(1,0),'player',s.playerProjectiles);
        e.update(1);
        check(`${label}: incoming player projectile starts a lateral dodge`,b.body.velocity.x===0&&Math.abs(b.body.velocity.y)===560);
        s.physics.resume();
        for(let i=0;i<4;i++){await delay(60);e.update(60);}
        c.state='RECOVERING';c.dueAt=c.time+10000;b.setVelocity(0,0);
        await delay(230);
        check(`${label}: actual physics moves the boss aside and the projectile misses`,Math.abs(b.y-origin.y)>70&&c.health===health);
        s.playerProjectiles.clear(true,true);
        new Projectile(s,b.body.center.x-130,b.body.center.y,new Phaser.Math.Vector2(1,0),'player',s.playerProjectiles);
        e.update(1);
        check(`${label}: recovery cancels evasion without invulnerability`,b.body.velocity.lengthSq()===0);
        await until(()=>c.health<health);
        check(`${label}: a real subsequent hit applies the normal recovery damage`,c.health===health-3);
        e.stop();s.physics.pause();
        check(`${label}: stopping removes any active evasion`,e.evasion.velocity===null);
    }
    window.sprint13Results={status:'passed',count:checks.length,checks,snapshots,campaignChecks:window.sprint12Results.count};
}
run().catch(error=>{window.sprint13Results={status:'failed',count:checks.length,checks,snapshots,error:String(error.stack??error)};});


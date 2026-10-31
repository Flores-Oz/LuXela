import Phaser from 'phaser';
import { Enemy } from '../src/entities/enemies/Enemy';
import { LineOfSight } from '../src/systems/LineOfSight';
import { loadRobotAssets,createRobotAnimations } from '../src/systems/RobotAssets';

const checks=[];
const check=(name,value)=>{if(!value)throw Error(name);checks.push(name);};
let clock=0;
class NavigationScene extends Phaser.Scene {
    constructor(){super('NavigationTest');}
    preload(){loadRobotAssets(this);}
    create(){
        createRobotAnimations(this);this.physics.world.setBounds(0,0,960,640);
        this.walls=this.physics.add.staticGroup();this.robots=this.physics.add.group({collideWorldBounds:true});
        this.physics.add.collider(this.robots,this.walls);
        this.target={x:600,y:448,physicsSprite:{x:600,y:448,active:true},isDead:()=>false};
        this.sight=new LineOfSight(this.walls);
        this.display=this.add.graphics();
        window.navigationScene=this;
    }
    update(time){this.robots.getChildren().forEach(e=>this.routeOnly?e.chasePlayer(this.target.physicsSprite,this.sight,time):e.updateBehavior(this.target,this.sight,time));}
    setup(type,boxes,position,target,patrol=false){
        this.robots.clear(true,true);this.walls.clear(true,true);this.display.clear().fillStyle(0x122b3c).fillRect(0,0,960,640);
        for(const box of boxes){const zone=this.add.zone(box.x+box.width/2,box.y+box.height/2,box.width,box.height);zone.setData('room-perimeter',false);this.physics.add.existing(zone,true);this.walls.add(zone);this.display.fillStyle(0x607d94).fillRect(box.x,box.y,box.width,box.height);}
        this.target.x=this.target.physicsSprite.x=target.x;this.target.y=this.target.physicsSprite.y=target.y;
        this.display.fillStyle(0x8dcfff).fillCircle(target.x,target.y,12);
        this.enemy=new Enemy(this,position.x,position.y,`robot-${type}`,{moveSpeed:100,detectionRange:1000,patrol});
        this.routeOnly=!patrol;
        if(patrol)this.enemy.detectPlayer=()=>false;
        this.robots.add(this.enemy);this.enemy.playIdle();this.enemy.body.reset(position.x,position.y);return this.enemy;
    }
}
const game=new Phaser.Game({type:Phaser.CANVAS,width:960,height:640,parent:'game-container',pixelArt:true,physics:{default:'arcade',arcade:{gravity:{x:0,y:0},debug:false}},scene:[NavigationScene]});
window.navigationGame=game;window.navigationResults={status:'running'};
const tick=(frames=1)=>{for(let i=0;i<frames;i++)game.scene.update(clock+=1000/60,1000/60);};
const intersects=(a,b)=>a.x<b.right-.1&&a.right>b.x+.1&&a.y<b.bottom-.1&&a.bottom>b.y+.1;
async function run(){
    while(!window.navigationScene)await new Promise(r=>setTimeout(r,20));
    game.loop.sleep();const s=window.navigationScene;
    const barriers=[{x:320,y:192,width:64,height:256}];
    for(const type of ['red','blue','yellow','orange']){
        let e=s.setup(type,barriers,{x:298,y:316},{x:600,y:320});
        let movement=0,previous={x:e.x,y:e.y},overlap=false;
        for(let i=0;i<1100;i++){
            tick();overlap ||= s.walls.getChildren().some(w=>intersects(e.body,w.body));
            movement+=Math.hypot(e.x-previous.x,e.y-previous.y);previous={x:e.x,y:e.y};
            if(e.x>440)break;
        }
        check(`${type}: escapes a wall end without oscillating against it`,e.x>440);
        check(`${type}: never crosses solid walls`,!overlap);
        check(`${type}: bounded detour distance`,movement<1300);
    }
    const u=[{x:256,y:128,width:64,height:320},{x:512,y:128,width:64,height:320},{x:256,y:384,width:320,height:64}];
    const trapped=s.setup('yellow',u,{x:416,y:354},{x:416,y:544});let escaped=false,overlap=false;
    for(let i=0;i<1500;i++){tick();escaped ||= trapped.y<100;overlap ||= s.walls.getChildren().some(w=>intersects(trapped.body,w.body));if(trapped.y>480)break;}
    check('U-shaped obstacle: robot goes away from target to exit the enclosure',escaped&&trapped.y>480);
    check('U-shaped obstacle: no corner cutting',!overlap);
    const charging=s.setup('orange',barriers,{x:298,y:316},{x:600,y:320});s.routeOnly=false;
    tick(40);check('orange: actual charge stays stationary beside a wall',charging.getState()==='CHARGING'&&charging.body.velocity.lengthSq()===0&&Math.abs(charging.x-298)<.01);
    for(const corner of [{x:22,y:22},{x:938,y:22},{x:22,y:606},{x:938,y:606}]){
        const e=s.setup('red',[],corner,{x:480,y:320},true);let changes=0,last='';
        for(let i=0;i<60;i++){tick();const key=e.anims.currentAnim.key;if(last&&last!==key)changes++;last=key;}
        check(`Patrol ${corner.x},${corner.y}: stable escape from outer corner`,Math.hypot(e.x-corner.x,e.y-corner.y)>50&&changes<=2);
    }
    const perimeter=[{x:0,y:0,width:960,height:64},{x:0,y:576,width:960,height:64},{x:0,y:64,width:64,height:512},{x:896,y:64,width:64,height:512}];
    for(const corner of [{x:86,y:86},{x:874,y:86},{x:86,y:546},{x:874,y:546}]){
        const e=s.setup('red',perimeter,corner,{x:480,y:320},true);let overlap=false;
        for(let i=0;i<120;i++){tick();overlap ||= s.walls.getChildren().some(w=>intersects(e.body,w.body));}
        check(`Patrol ${corner.x},${corner.y}: leaves exact contact with two perimeter walls`,!overlap&&Math.hypot(e.x-corner.x,e.y-corner.y)>70);
    }
    const retreating=s.setup('blue',[],{x:22,y:22},{x:110,y:110});s.routeOnly=false;
    tick(240);const resting={x:retreating.x,y:retreating.y};tick(120);
    check('Blue retreat settles at a world corner instead of repeatedly reversing',retreating.getState()==='RETREAT'&&Math.hypot(retreating.x-resting.x,retreating.y-resting.y)<1);
    const grid=s.sight.movementGrid(44,52,clock);
    check('Robots share the cached navigation grid across updates',grid===s.sight.movementGrid(44,52,clock+1));
    // A physically unreachable target should settle, not alternate endlessly.
    const e=s.setup('yellow',[{x:320,y:0,width:64,height:640}],{x:280,y:316},{x:600,y:320});
    tick(500);let reversals=0,last=0;
    for(let i=0;i<180;i++){tick();const sign=Math.sign(e.body.velocity.y);if(sign&&last&&sign!==last)reversals++;if(sign)last=sign;}
    check('Unreachable target: no repeated vertical reversals',reversals<=1);
    e.die();tick(5);check('Dead robot never resumes a cached route',!e.active||e.body?.velocity.lengthSq()===0);
    window.navigationResults={status:'passed',checks,count:checks.length};
}
run().catch(error=>{window.navigationResults={status:'failed',checks,error:error.stack};console.error(error);});

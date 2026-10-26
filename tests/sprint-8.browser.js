import Phaser from 'phaser';
import { gameConfig } from '../src/config/gameConfig';
import { GameScene } from '../src/scenes/GameScene';
import { CharacterUnlockService } from '../src/systems/CharacterUnlockService';
import { CHARACTER_CODES } from '../src/config/CharacterUnlockConfig';
import { LevelManager } from '../src/levels/LevelManager';
import { levels } from '../src/levels/levels';
import { Room } from '../src/world/Room';
import { RoomBuilder } from '../src/world/RoomBuilder';
import { GeometryRoomRenderer } from '../src/world/RoomRenderer';
import { ModularRoomRenderer } from '../src/world/environment/ModularRoomRenderer';
import { environmentThemes, environmentAtlas, roomThemeIds } from '../src/world/environment/RoomTheme';
import { ensureEnvironmentTiles } from '../src/world/environment/EnvironmentTiles';
import { environmentStyleIds, environmentSheets, detailedEnvironmentAtlas, sheetTextureKey } from '../src/world/environment/EnvironmentSheets';
import { Projectile } from '../src/entities/Projectile';
import { LineOfSight } from '../src/systems/LineOfSight';

const checks=[],check=(name,value)=>{if(!value)throw Error(name);checks.push(name);};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const until=async predicate=>{for(let i=0;i<400;i++){if(predicate())return;await delay(20);}throw Error('Environment timeout');};
let generation=0;
class EnvironmentScene extends GameScene {
    init(data={}) {
        this.testTheme=data.theme??'industrial';
        // Override appearance only in this isolated test catalog, retaining all combat data.
        this.levels=new LevelManager(data.catalog ? levels : levels.map(level=>({...level,presentation:{...level.presentation,theme:this.testTheme,environmentStyle:data.style}})));
        super.init({character:data.character??'alex'});
        // Direct visual inspection of each layout; progression itself is covered by the Sprint 7 suite.
        if(data.catalog)this.roomIndex=data.roomIndex??0;
    }
    create(){super.create();this.testGeneration=++generation;}
    update(){} // Physics runs normally; AI is exercised by the combat and difficulty regressions.
}
const game=new Phaser.Game({...gameConfig,type:Phaser.CANVAS,scene:[EnvironmentScene],callbacks:{preBoot(game){
    const unlocks=new CharacterUnlockService(()=>({getItem:()=>null,setItem(){}}));
    for(const code of Object.values(CHARACTER_CODES))unlocks.redeem(code);
    game.registry.set('character-unlock-service',unlocks);
}}});
window.sprint8Game=game;window.sprint8Results={status:'running'};
const scene=()=>game.scene.getScene('GameScene');
const layers=s=>s.children.list.filter(object=>object.type==='TilemapLayer');
const snapshot=s=>({map:layers(s)[0].tilemap,layers:layers(s).slice(),doors:s.children.list.filter(object=>object.name==='door-visual'),caches:layers(s).flatMap(layer=>layer.getData('environment-caches')??[]).map(image=>({image,key:image.texture.key}))});
const restart=async(theme,character='alex')=>{const old=generation;scene().scene.restart({theme,character});await until(()=>scene().testGeneration>old);await delay(40);return scene();};
const metrics=s=>({bodies:s.physics.world.bodies.size,walls:s.physics.world.staticBodies.size,colliders:s.physics.world.colliders.getActive().length,keys:Object.values(s.input.keyboard.keys).filter(Boolean).length,objects:s.children.list.length});

async function run(){
    await until(()=>scene()?.testGeneration>0);await delay(40);
    const physics=[];
    for(const theme of roomThemeIds){
        const s=await restart(theme),all=layers(s),map=all[0].tilemap;
        const floor=map.getLayer('floor').tilemapLayer,wall=map.getLayer('walls').tilemapLayer,deco=map.getLayer('decoration').tilemapLayer,overlay=map.getLayer('decoration-overlay').tilemapLayer;
        const atlas=environmentThemes[theme].atlas;
        check(`${theme}: four reusable tile layers`,all.length===4&&map.width===s.roomWidth/64&&map.height===s.roomHeight/64);
        check(`${theme}: static Canvas layers reuse four cached images`,all.every(layer=>!layer.visible&&layer.getData('environment-cache')?.visible&&layer.getData('environment-cache').depth===layer.depth&&layer.getData('environment-cache').alpha===layer.alpha&&layer.getData('environment-cache').blendMode===layer.blendMode));
        check(`${theme}: complete uniformly scaled floor`,floor.layer.data.every(row=>row.length===map.width&&row.every(tile=>atlas.floors.includes(tile.index)))&&floor.scaleX===64/atlas.tileSize&&floor.scaleY===64/atlas.tileSize&&map.widthInPixels*floor.scaleX===s.roomWidth&&map.heightInPixels*floor.scaleY===s.roomHeight);
        const walls=s.walls.getChildren();
        check(`${theme}: visual walls exactly cover physical cells`,wall.layer.data.flat().filter(tile=>tile.index>=0).length===walls.length&&walls.every(zone=>wall.getTileAt(Math.floor(zone.x/64),Math.floor(zone.y/64))?.index>=4));
        check(`${theme}: decoration is purely visual`,[...deco.layer.data.flat(),...overlay.layer.data.flat()].filter(tile=>tile.index>=0).length===levels[0].presentation.decorations.length&&[...deco.layer.data.flat(),...overlay.layer.data.flat()].every(tile=>!tile.collides)&&!deco.body&&!overlay.body);
        const spawn=new LevelManager().createRoom(0).findTile(2),exit=levels[0].exits[0].position;
        check(`${theme}: spawn and exit remain visually clear`,deco.getTileAt(spawn.column,spawn.row)===null&&deco.getTileAt(exit.column,exit.row)===null);
        const door=s.children.list.find(object=>object.name==='door-visual');
        const shot=new Projectile(s,352,416,new Phaser.Math.Vector2(0,1),'player',s.playerProjectiles);
        check(`${theme}: floor, decals, walls and doors stay below entities`,floor.depth<deco.depth&&deco.depth<wall.depth&&wall.depth<door.depth&&door.depth<s.player.physicsSprite.depth&&door.depth<s.enemyManager.getLivingEnemies()[0].depth&&door.depth<shot.physicsBody.depth&&s.specialAbilities.pose.depth<s.hud.text.depth);
        shot.destroy();
        check(`${theme}: expected theme texture and nearest filter`,floor.tileset[0].image.key===environmentThemes[theme].textureKey&&floor.tileset[0].image.source[0].scaleMode===Phaser.Textures.FilterMode.NEAREST);
        const image=s.textures.get(environmentThemes[theme].textureKey).getSourceImage(),inspection=document.createElement('canvas');inspection.width=image.width;inspection.height=image.height;inspection.getContext('2d').drawImage(image,0,0);
        const pixels=inspection.getContext('2d').getImageData(0,0,image.width,image.height).data;
        let opaque=true;
        for(const frame of new Set([...atlas.floors,...atlas.walls,...atlas.wallVariants]))for(let y=0;y<atlas.tileSize;y++)for(let x=0;x<atlas.tileSize;x++)if(pixels[((Math.floor(frame/atlas.columns)*atlas.tileSize+y)*image.width+frame%atlas.columns*atlas.tileSize+x)*4+3]!==255)opaque=false;
        check(`${theme}: floor and wall source pixels have no transparent holes`,opaque&&image.width===256&&image.height===256);
        const corner=(Math.floor(atlas.decoration.panel/atlas.columns)*atlas.tileSize*image.width+(atlas.decoration.panel%atlas.columns)*atlas.tileSize)*4;
        check(`${theme}: original black decoration margins use screen compositing`,pixels[corner]===0&&pixels[corner+1]===0&&pixels[corner+2]===0&&overlay.blendMode===Phaser.BlendModes.SCREEN);
        check(`${theme}: no texture owns collision geometry`,walls.every(zone=>zone.type==='Zone'&&!zone.visible&&zone.body.width===64&&zone.body.height===64));
        physics.push({walls:walls.map(zone=>[zone.x,zone.y,zone.body.width,zone.body.height]),stats:s.enemyManager.getLivingEnemies().map(enemy=>[enemy.moveSpeed,enemy.detectionRange,enemy.shootCooldown]),colliders:s.physics.world.colliders.getActive().length});
        check(`${theme}: door starts locked`,door.frame.name==='door-locked'&&s.doors.currentState==='locked');
        s.enemyManager.defeatLivingEnemies();check(`${theme}: unlock changes graphic without changing trigger`,door.frame.name==='door-unlocked'&&s.doors.currentState==='unlocked');
        s.doors.beginTransition();check(`${theme}: transition has independent visual frame`,door.frame.name==='door-transitioning');
    }
    check('Changing themes leaves physical walls and enemy rules identical',physics.every(data=>JSON.stringify(data)===JSON.stringify(physics[0])));
    const inspectLoad=async data=>{const old=generation;scene().scene.restart(data);await until(()=>scene().testGeneration>old);await delay(40);return scene();};
    for(const style of environmentStyleIds){
        const s=await inspectLoad({style,theme:'industrial'}),all=layers(s),atlas=detailedEnvironmentAtlas(style),key=`environment-detail-industrial-${style}`;
        check(`${style}: measured source sheets compile to a cached 512px atlas`,all.every(layer=>layer.tileset[0].image.key===key)&&s.textures.get(key).source[0].width===512&&s.textures.get(key).source[0].height===512);
        check(`${style}: primary and companion originals load at full resolution`,[style,environmentSheets[style].companion].every(id=>s.textures.get(sheetTextureKey(id)).source[0].width===1254));
        const source=s.textures.get(key).getSourceImage(),ctx=source.getContext('2d'),pixels=ctx.getImageData(0,0,512,512).data;
        const used=new Set([...all[0].layer.data.flat(),...all[3].layer.data.flat()].map(tile=>tile.index).filter(frame=>frame>=0));
        let opaque=true;
        for(const frame of used)for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(pixels[((Math.floor(frame/8)*64+y)*512+frame%8*64+x)*4+3]!==255)opaque=false;
        check(`${style}: cropped floors and wall fixtures remain opaque and cover the same physical cells`,opaque&&all[0].layer.data.flat().every(tile=>atlas.floors.includes(tile.index))&&all[3].layer.data.flat().filter(tile=>tile.index>=0).length===s.walls.getChildren().length);
        check(`${style}: detailed art retains static caches and all existing collision rules`,all.every(layer=>!layer.visible&&layer.getData('environment-cache')?.visible)&&s.physics.world.colliders.getActive().length===physics[0].colliders&&s.player.physicsSprite.body&&s.enemyManager.getLivingEnemies().length===levels[0].enemies.count);
    }
    for(let index=0;index<levels.length;index++){
        const s=await inspectLoad({catalog:true,roomIndex:index}),config=levels[index],all=layers(s);
        check(`${config.roomId}: campaign uses its configured detailed style`,all[0].tileset[0].image.key===`environment-detail-${config.presentation.theme}-${config.presentation.environmentStyle}`);
        const spawn=s.levels.createRoom(index).findTile(2),exit=config.exits[0].position;
        check(`${config.roomId}: floor details are non-blocking and keep spawn and door clear`,all[1].layer.data.flat().filter(tile=>tile.index>=0).length===config.presentation.decorations.length&&all[1].getTileAt(spawn.column,spawn.row)===null&&all[1].getTileAt(exit.column,exit.row)===null&&!all[1].body);
        check(`${config.roomId}: fixture positions exactly match existing collision walls`,s.walls.getChildren().every(zone=>all[3].getTileAt(Math.floor(zone.x/64),Math.floor(zone.y/64))?.index>=0)&&all[3].layer.data.flat().filter(tile=>tile.index>=0).length===s.walls.getChildren().length);
    }
    for(const character of ['alex','lua']){
        const s=await restart('laboratory',character),robot=s.enemyManager.getLivingEnemies()[0];
        s.player.physicsSprite.body.reset(80,160);s.player.wasd.A.isDown=true;s.player.update();await delay(150);s.player.wasd.A.isDown=false;s.player.update();
        check(`${character}: player still collides near wall`,s.player.physicsSprite.body.left>=63.9);
        robot.body.reset(87,160);robot.moveLeft();await delay(180);robot.stop();
        check(`${character}: robot still collides near wall`,robot.body.left>=63.9);
        for(const [owner,group] of [['player',s.playerProjectiles],['enemy',s.enemyProjectiles]]){
            const shot=new Projectile(s,96,96,new Phaser.Math.Vector2(-1,0),owner,group);await until(()=>!shot.physicsBody.active);
            check(`${character}: ${owner} shot still hits textured wall`,!group.contains(shot.physicsBody));
        }
        const wall=s.walls.getChildren().find(wall=>!wall.getData('room-perimeter'));
        robot.body.reset(wall.x-80,wall.y);s.player.physicsSprite.body.reset(wall.x+80,wall.y);
        check(`${character}: physical line of sight still blocks enemy fire`,!s.lineOfSight.hasLineOfSight(robot,s.player)&&robot.updateBehavior(s.player,s.lineOfSight,10000)===null);
        robot.stop();s.player.physicsSprite.body.reset(160,160);s.player.shootingKeys.RIGHT.isDown=true;s.player.update();
        check(`${character}: existing movement and shooting input remain usable`,s.player.consumeShootRequest()?.x===1&&s.player.physicsSprite.texture.key===`${character}-walk`);s.player.shootingKeys.RIGHT.isDown=false;
    }
    // Wrong final-atlas dimensions must not rewrite the supplied image or prevent rendering.
    await restart('control');scene().textures.remove('environment-industrial');scene().textures.createCanvas('environment-industrial',16,16);
    const fallback=ensureEnvironmentTiles(scene(),'industrial');
    check('Invalid external atlas dimensions use a separate cached fallback',fallback==='environment-industrial-fallback'&&scene().textures.get('environment-industrial').source[0].width===16&&scene().textures.get(fallback).source[0].width===256&&ensureEnvironmentTiles(scene(),'industrial')===fallback);
    let s=await restart('industrial');const baseline=metrics(s),textureKeys=s.textures.getTextureKeys().filter(key=>key.startsWith('environment-')).sort(),perTheme=new Map();
    for(let cycle=0;cycle<12;cycle++){
        const old=snapshot(s);s=await restart(roomThemeIds[cycle%3],cycle%2?'lua':'alex');
        check(`Reload ${cycle+1}: old tilemap and door images destroyed`,old.layers.every(layer=>!layer.scene)&&old.doors.every(door=>!door.scene)&&old.map.layers.length===0);
        check(`Reload ${cycle+1}: cached images and private textures released`,old.caches.length>=4&&old.caches.every(({image,key})=>!image.scene&&!s.textures.exists(key))&&s.textures.getTextureKeys().filter(key=>key.startsWith('room-cache-')).length===snapshot(s).caches.length);
        const measured=metrics(s),theme=roomThemeIds[cycle%3];
        if(!perTheme.has(theme))perTheme.set(theme,measured.objects);
        check(`Reload ${cycle+1}: bodies, colliders, keys and objects stable`,measured.bodies===baseline.bodies&&measured.walls===baseline.walls&&measured.colliders===baseline.colliders&&measured.keys===baseline.keys&&measured.objects===perTheme.get(theme));
        check(`Reload ${cycle+1}: atlases are reused without accumulation`,JSON.stringify(s.textures.getTextureKeys().filter(key=>key.startsWith('environment-')).sort())===JSON.stringify(textureKeys));
    }
    game.scene.stop('GameScene');await until(()=>!game.scene.isActive('GameScene'));
    let benchGeneration=0;
    class EnvironmentBench extends Phaser.Scene{
        constructor(){super('EnvironmentBench');}
        init(data={}){this.options=data;}
        create(){
            const {width=15,height=11,kind='modular',theme='industrial',style}=this.options;
            const matrix=Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>r===0||c===0||r===height-1||c===width-1?1:0));matrix[1][1]=2;matrix[height-2][width-2]=4;
            const renderer=kind==='geometry'?new GeometryRoomRenderer(this):new ModularRoomRenderer(this),builder=new RoomBuilder(this,renderer);
            const start=performance.now();builder.build(new Room(matrix,64),[],{scenarioId:'size-check',theme,environmentStyle:style,decorations:this.options.decorations??[]});
            this.buildMs=performance.now()-start;this.builder=builder;this.environment=renderer;
            this.cameras.main.setZoom(Math.min(this.scale.width/(width*64),this.scale.height/(height*64))).centerOn(width*32,height*32);
            this.metrics={objects:this.children.list.length,bodies:this.physics.world.staticBodies.size,buildMs:this.buildMs};this.ready=++benchGeneration;
        }
    }
    game.scene.add('EnvironmentBench',EnvironmentBench,true);await until(()=>game.scene.getScene('EnvironmentBench').ready>0);
    const bench=game.scene.getScene('EnvironmentBench'),benchLoad=async options=>{const previous=benchGeneration;bench.scene.restart(options);await until(()=>bench.ready>previous);return bench;};
    for(const [width,height] of [[9,7],[20,12],[28,18]]){
        await benchLoad({width,height,theme:'laboratory'});const map=layers(bench)[0].tilemap;
        check(`${width}x${height}: dimensions and uniform tile scale`,map.width===width&&map.height===height&&layers(bench).every(layer=>layer.scaleX===64/environmentThemes.laboratory.atlas.tileSize&&layer.scaleY===64/environmentThemes.laboratory.atlas.tileSize));
        check(`${width}x${height}: floor covers every cell`,map.getLayer('floor').data.flat().filter(tile=>tile.index>=0).length===width*height);
    }
    const timings={geometry:[],modular:[]},samples={};
    for(const kind of ['geometry','modular'])for(let i=0;i<5;i++){await benchLoad({width:28,height:18,kind,theme:'control'});timings[kind].push(bench.buildMs);samples[kind]=bench.metrics;}
    check('Modular rendering uses fewer objects for the same physical room',samples.modular.objects<samples.geometry.objects&&samples.modular.bodies===samples.geometry.bodies);
    check('Repeated environment builds stay within a bounded local construction budget',Math.max(...timings.modular)<250);
    const performanceResults={timingsMs:timings,objectComparison:samples,scope:'Headless Canvas room construction, not a device-wide FPS guarantee'};
    window.sprint8Results={status:'passed',count:checks.length,checks,performance:performanceResults};
}
run().catch(error=>{window.sprint8Results={status:'failed',count:checks.length,checks,error:String(error.stack??error)};});

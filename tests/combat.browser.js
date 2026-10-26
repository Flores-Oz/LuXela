import Phaser from 'phaser';
import { gameConfig } from '../src/config/gameConfig';
import { Projectile } from '../src/entities/Projectile';
import { Enemy } from '../src/entities/enemies/Enemy';
import { EnemyState } from '../src/entities/enemies/EnemyState';
import { CombatEvents } from '../src/systems/CombatEvents';
import { characters } from '../src/config/characters';
import { CharacterUnlockService } from '../src/systems/CharacterUnlockService';
import { CHARACTER_CODES } from '../src/config/CharacterUnlockConfig';
import { levels } from '../src/levels/levels';

// Real Arcade bodies, colliders, animations, input and room lifecycle in Canvas.
const results = [];
const check = (name, condition) => {
    if (!condition) throw new Error(name);
    results.push(name);
};
window.combatResults = { status: 'running' };
const game = new Phaser.Game({ ...gameConfig, type: Phaser.CANVAS,
    scale: { mode: Phaser.Scale.NONE },
    // Authorized characters in isolated memory: regression never changes real progress.
    scene: [{ key: 'CombatTestBoot', create() {
        const service = new CharacterUnlockService(() => ({ getItem: () => null, setItem: () => {} }));
        service.redeem(CHARACTER_CODES.alex);
        service.redeem(CHARACTER_CODES.lua);
        this.game.registry.set('character-unlock-service', service);
        this.scene.start('GameScene', { character: 'lua' });
    } }, ...gameConfig.scene]
});
// Test-page only: permits native keyboard/pointer smoke checks via CDP.
window.combatGame = game;
let now = 1000;
const tick = (count = 1) => {
    for (let i = 0; i < count; i++) game.scene.update(now += 1000 / 60, 1000 / 60);
};
const reset = (sprite, x, y) => sprite.body.reset(x, y);

async function run() {
    while (!game.scene.isActive('GameScene')) await new Promise(r => setTimeout(r, 20));
    game.loop.sleep();
    let scene = game.scene.getScene('GameScene');
    const normalUpdate = scene.update;
    scene.sys.sceneUpdate = () => {};
    tick(2);
    let player = scene.player;
    let enemy = scene.enemies.getChildren()[0];
    check('Tres robots creados desde configuración del nivel', scene.enemies.getLength() === levels[0].enemies.count);
    check('Spawns sin solapamiento con paredes', scene.enemies.getChildren().every(e =>
        !scene.walls.getChildren().some(w => Phaser.Geom.Intersects.RectangleToRectangle(e.body, w.body))));
    enemy.stop();
    check('Idle y frames de muerte registrados', enemy.anims.currentAnim.key === 'robot-idle' &&
        scene.anims.get('robot-death').frames.map(f => Number(f.textureFrame)).join() === '60,61,62,63,64,65');

    for (const [method, vx, vy, animation] of [
        ['moveUp', 0, -80, 'up'], ['moveDown', 0, 80, 'down'],
        ['moveLeft', -80, 0, 'left'], ['moveRight', 80, 0, 'right']
    ]) {
        enemy[method]();
        check(`Movimiento y animación ${method}`, enemy.body.velocity.x === vx &&
            enemy.body.velocity.y === vy && enemy.anims.currentAnim.key === `robot-walk-${animation}`);
    }
    const interiorWalls=scene.walls.getChildren().filter(wall=>!wall.getData('room-perimeter'));
    const wall=interiorWalls.find(candidate=>!interiorWalls.some(other=>other.y===candidate.y&&other.x===candidate.x+64));
    const wallRight=wall.body.right,wallY=wall.y,wallLeft=Math.min(...interiorWalls.filter(candidate=>candidate.y===wallY).map(candidate=>candidate.body.left));
    reset(enemy, wallRight+36, wallY);
    enemy.moveLeft();
    tick(90);
    check('Robot detenido por pared', enemy.body.left >= wallRight - 0.01);
    enemy.stop();

    reset(player.physicsSprite, 160, 160);
    reset(enemy, 608, 160);
    enemy.patrolDirection = -1;
    enemy.nextPatrolTurn = 0;
    check('Fuera de rango: PATROL sin disparo', enemy.updateBehavior(player, scene.lineOfSight, now) === null &&
        enemy.getState() === EnemyState.PATROL && enemy.body.velocity.x === 80);
    const patrolX = enemy.x;
    tick(10);
    check('Patrulla desplaza robot sin detectar jugador', enemy.x > patrolX);
    enemy.updateBehavior(player, scene.lineOfSight, now + 1500);
    check('Patrulla gira por tiempo', enemy.body.velocity.y === 80);
    reset(enemy, scene.physics.world.bounds.width-88, 352);
    enemy.patrolDirection = 0;
    enemy.nextPatrolTurn = now + 10000;
    enemy.moveRight();
    for (let i = 0; i < 20; i++) {
        tick();
        enemy.updateBehavior(player, scene.lineOfSight, now);
    }
    check('Patrulla gira al chocar sin atravesar pared', enemy.body.right <= scene.physics.world.bounds.width-64 + 0.01 && enemy.body.velocity.y === 80);
    reset(enemy, wallRight+24, wallY);
    reset(player.physicsSprite, wallRight-152, wallY);
    check('Proximidad detecta a través de pared', enemy.detectPlayer(player.physicsSprite));
    check('Pared bloquea visión', !scene.lineOfSight.hasLineOfSight(enemy, player));
    check('Visión bloqueada: CHASE sin disparo', enemy.updateBehavior(player, scene.lineOfSight, now) === null &&
        enemy.getState() === EnemyState.CHASE && enemy.body.velocity.x < 0);
    reset(enemy, 224, 160);
    reset(player.physicsSprite, 160, 160);
    const shotTime = 10000;
    const aim = enemy.updateBehavior(player, scene.lineOfSight, shotTime);
    check('Visión despejada: ATTACK_READY y disparo dirigido', aim?.length === 1 && aim[0].direction.x === -1 && aim[0].direction.y === 0 &&
        enemy.getState() === EnemyState.ATTACK_READY && enemy.body.velocity.lengthSq() === 0);
    check('Recarga bloquea disparos prematuros', enemy.updateBehavior(player, scene.lineOfSight, shotTime + levels[0].difficulty.shootCooldown - 1) === null);
    check('Recarga usa milisegundos', enemy.updateBehavior(player, scene.lineOfSight, shotTime + levels[0].difficulty.shootCooldown) !== null);

    const custom = new Enemy(scene, 608, 224, 'robot-red', { shootCooldown: 500 });
    reset(player.physicsSprite, 608, 160);
    check('Cadencia configurable', custom.updateBehavior(player, scene.lineOfSight, 0) !== null &&
        custom.updateBehavior(player, scene.lineOfSight, 499) === null &&
        custom.updateBehavior(player, scene.lineOfSight, 500) !== null);
    custom.destroy();

    reset(player.physicsSprite, 160, 160);
    reset(enemy, 224, 160);
    enemy.attack.cancel(-Infinity);
    player.shootingKeys.RIGHT.isDown = true;
    normalUpdate.call(scene, now + 2000);
    player.shootingKeys.RIGHT.isDown = false;
    check('Escena crea disparo enemigo desde IA', scene.enemyProjectiles.getLength() === 1 &&
        scene.enemyProjectiles.getChildren()[0].getData('projectile').owner === 'enemy');
    check('Escena consume disparo del jugador', scene.playerProjectiles.getLength() === 1 &&
        scene.playerProjectiles.getChildren()[0].getData('projectile').owner === 'player');
    scene.enemyProjectiles.clear(true, true);
    scene.playerProjectiles.clear(true, true);

    reset(player.physicsSprite, 160, 160);
    for (const [owner, group] of [['player', scene.playerProjectiles], ['enemy', scene.enemyProjectiles]]) {
        const shot = new Projectile(scene, wallLeft-48, wallY, new Phaser.Math.Vector2(1, 0), owner, group);
        tick(15);
        check(`Bala ${owner} destruida por pared`, !shot.physicsBody.active);
    }
    const fixed = new Projectile(scene, 608, 160, new Phaser.Math.Vector2(1, 0), 'enemy', scene.enemyProjectiles);
    const velocity = fixed.physicsBody.body.velocity.clone();
    reset(player.physicsSprite, 96, 96);
    tick(2);
    check('Bala sin seguimiento automático', fixed.physicsBody.body.velocity.equals(velocity));
    fixed.destroy();

    const colliderCount = scene.physics.world.colliders.getActive().length;
    for (let i = 0; i < 30; i++) {
        new Projectile(scene, 608, 352, new Phaser.Math.Vector2(1, 0), 'player', scene.playerProjectiles).destroy();
    }
    tick(1);
    check('Disparos no acumulan colliders', scene.physics.world.colliders.getActive().length === colliderCount);
    const expiring = new Projectile(scene, 352, 352, new Phaser.Math.Vector2(0, 0), 'player', scene.playerProjectiles);
    tick(125);
    check('Proyectil expira y sale del grupo', !expiring.physicsBody.active && !scene.playerProjectiles.contains(expiring.physicsBody));

    reset(player.physicsSprite, 96, 96);
    reset(enemy, 608, 160);
    new Projectile(scene, enemy.x, enemy.y, new Phaser.Math.Vector2(1, 0), 'player', scene.playerProjectiles);
    new Projectile(scene, enemy.x, enemy.y, new Phaser.Math.Vector2(1, 0), 'player', scene.playerProjectiles);
    tick(3);
    check('Un impacto mata robot y deshabilita cuerpo inmediatamente', enemy.isDead() && !enemy.body.enable && enemy.active);
    check('Muerte reproduce animación de una sola ejecución', enemy.anims.currentAnim.key === 'robot-death' && enemy.anims.currentAnim.repeat === 0);
    enemy.die(); enemy.moveRight(); enemy.playIdle();
    check('Muerte idempotente: robot no actúa ni dispara', enemy.body.velocity.lengthSq() === 0 &&
        enemy.anims.currentAnim.key === 'robot-death' && enemy.updateBehavior(player, scene.lineOfSight, now + 9000) === null);
    tick(45);
    check('Robot se destruye al terminar animación', !enemy.active && !scene.enemies.contains(enemy));

    reset(player.physicsSprite, 160, 160);
    player.wasd.A.isDown = true;
    player.update();
    tick(45);
    check('Jugador detenido por pared', player.physicsSprite.body.left >= 64 - 0.01);
    player.wasd.A.isDown = false;
    player.physicsSprite.setVelocity(0);
    reset(player.physicsSprite, 160, 160);
    player.shootingKeys.RIGHT.isDown = true;
    player.update();
    check('Disparo del jugador conserva controles', player.consumeShootRequest()?.x === 1);
    player.shootingKeys.RIGHT.isDown = false;
    // Muzzle is 58 px away: ensure it cannot skip a solid wall.
    reset(player.physicsSprite, wallLeft-16, wallY);
    const shotsBeforeMuzzle = scene.playerProjectiles.getLength();
    scene.createProjectile(new Phaser.Math.Vector2(1, 0));
    check('Muzzle no permite disparar a través de pared', scene.playerProjectiles.getLength() === shotsBeforeMuzzle);

    let deathEvents = 0;
    let defeatEvents = 0;
    let shutdownClears = 0;
    const onShutdownClear = () => shutdownClears++;
    scene.events.on(CombatEvents.ROOM_CLEARED, onShutdownClear);
    player.physicsSprite.on(CombatEvents.PLAYER_DIED, () => deathEvents++);
    player.physicsSprite.on(CombatEvents.PLAYER_DEFEAT_COMPLETE, () => defeatEvents++);
    reset(player.physicsSprite, 160, 160);
    tick(2);
    const center = player.physicsSprite.body.center;
    new Projectile(scene, center.x, center.y, new Phaser.Math.Vector2(1, 0), 'enemy', scene.enemyProjectiles);
    new Projectile(scene, center.x, center.y, new Phaser.Math.Vector2(1, 0), 'enemy', scene.enemyProjectiles);
    tick(3);
    check('Un impacto mata jugador y deshabilita cuerpo', player.isDead() && !player.physicsSprite.body.enable);
    check('Derrota visible y sin bucle antes de Game Over', player.physicsSprite.visible && player.physicsSprite.active &&
        player.physicsSprite.anims.currentAnim.key.startsWith('lua-defeat-') && player.physicsSprite.anims.currentAnim.repeat === 0 &&
        !game.scene.isActive('GameOverScene'));
    check('Combate detenido y proyectiles limpiados', scene.combatState === 'defeat' && scene.physics.world.isPaused &&
        scene.enemyProjectiles.getLength() === 0 && scene.playerProjectiles.getLength() === 0 &&
        scene.enemies.getChildren().every(e => e.body.velocity.lengthSq() === 0));
    player.die();
    player.wasd.D.isDown = true;
    player.shootingKeys.RIGHT.isDown = true;
    player.update();
    check('Jugador muerto no se mueve ni dispara', player.physicsSprite.body.velocity.lengthSq() === 0 && player.consumeShootRequest() === null);
    const survivor = scene.enemies.getChildren()[0];
    check('Robot no ataca jugador muerto', survivor.updateBehavior(player, scene.lineOfSight, now + 9999) === null);
    scene.changeRoom();
    check('Jugador muerto no activa salida', !scene.isChangingRoom);
    tick(70);
    check('T-02 y T-06: una muerte, un fin de derrota y Game Over', deathEvents === 1 && defeatEvents === 1 &&
        !player.physicsSprite.active && game.scene.isActive('GameOverScene') && !game.scene.isActive('GameScene'));
    check('Cerrar escena no emite habitación despejada por destruir supervivientes', shutdownClears === 0);
    scene.events.off(CombatEvents.ROOM_CLEARED, onShutdownClear);
    let gameOver = game.scene.getScene('GameOverScene');
    check('Game Over muestra texto y reinicio', gameOver.children.list.some(c => c.text === 'GAME OVER') &&
        gameOver.children.list.some(c => c.text === '[ REINTENTAR ]' && c.input.enabled));
    check('Un listener por atajo de reinicio', gameOver.input.keyboard.listenerCount('keydown-ENTER') === 1 &&
        gameOver.input.keyboard.listenerCount('keydown-R') === 1);
    gameOver.input.keyboard.emit('keydown-ENTER');
    gameOver.input.keyboard.emit('keydown-ENTER');
    tick(4);
    scene = game.scene.getScene('GameScene');
    scene.sys.sceneUpdate = () => {};
    check('T-07: reinicio por Enter restaura habitación', game.scene.isActive('GameScene') && scene.roomIndex === 0 &&
        !scene.player.isDead() && scene.player.physicsSprite.body.enable && !scene.physics.world.isPaused &&
        scene.enemies.getLength() === levels[0].enemies.count && scene.enemyProjectiles.getLength() === 0 && scene.combatState === 'playing');
    check('Game Over libera listeners al salir', gameOver.input.keyboard.listenerCount('keydown-ENTER') === 0 &&
        gameOver.input.keyboard.listenerCount('keydown-R') === 0);
    scene.player.wasd.D.isDown = true;
    scene.player.update();
    check('Reinicio recupera controles de movimiento', scene.player.physicsSprite.body.velocity.x === 220);
    scene.player.wasd.D.isDown = false;
    scene.player.physicsSprite.setVelocity(0);
    const animationCount = scene.anims.anims.size;
    const updateListeners = scene.events.listenerCount('update');

    for (const [index, character] of ['alex', 'lua', 'alex'].entries()) {
        scene.scene.restart({ roomIndex: 0, character });
        tick(4);
        scene.sys.sceneUpdate = () => {};
        const currentPlayer = scene.player;
        currentPlayer.direction = index === 0 ? 'down' : index === 1 ? 'right' : 'left';
        reset(currentPlayer.physicsSprite, 160, 160);
        tick(2);
        const position = currentPlayer.physicsSprite.body.center;
        new Projectile(scene, position.x, position.y, new Phaser.Math.Vector2(1, 0), 'enemy', scene.enemyProjectiles);
        tick(3);
        const expected = `${character}-defeat-${index === 0 ? 'front' : 'side'}`;
        check(`Derrota ${character} ${index}: arte, frames y escala`, currentPlayer.physicsSprite.anims.currentAnim.key === expected &&
            currentPlayer.physicsSprite.anims.currentAnim.frames.length === characters[character][index === 0 ? 'front' : 'side'].length &&
            currentPlayer.physicsSprite.scaleX === 0.35 && currentPlayer.physicsSprite.frame.realWidth === 256);
        tick(70);
        gameOver = game.scene.getScene('GameOverScene');
        check(`Reinicio ${index}: Game Over único`, game.scene.isActive('GameOverScene') &&
            gameOver.input.keyboard.listenerCount('keydown-ENTER') === 1);
        if (index === 1) {
            const button = gameOver.children.list.find(c => c.text === '[ REINTENTAR ]');
            button.emit('pointerdown'); button.emit('pointerdown');
        } else {
            gameOver.input.keyboard.emit(index === 0 ? 'keydown-R' : 'keydown-ENTER');
        }
        tick(4);
        scene.sys.sceneUpdate = () => {};
        check(`T-08 reinicio ${index}: sin acumulación y personaje conservado`, scene.character === character &&
            !scene.player.isDead() && scene.enemies.getLength() === levels[0].enemies.count && scene.enemyManager.aliveCount === levels[0].enemies.count &&
            scene.physics.world.colliders.getActive().length === colliderCount &&
            scene.events.listenerCount('update') === updateListeners && scene.anims.anims.size === animationCount);
    }

    let clearedEvents = 0;
    scene.enemyManager.getLivingEnemies().slice(2).forEach(robot => robot.die());
    scene.events.on(CombatEvents.ROOM_CLEARED, () => clearedEvents++);
    const robots = scene.enemyManager.getLivingEnemies().slice();
    robots.forEach(robot => { robot.stop(); reset(robot, 608, 160); });
    new Projectile(scene, 608, 160, new Phaser.Math.Vector2(1, 0), 'player', scene.playerProjectiles);
    tick(3);
    check('Una bala no mata dos robots solapados', robots.filter(e => e.isDead()).length === 1 &&
        scene.enemyManager.aliveCount === 1 && !scene.enemyManager.isCleared && clearedEvents === 0);
    const lastRobot = robots.find(e => !e.isDead());
    new Projectile(scene, lastRobot.x, lastRobot.y, new Phaser.Math.Vector2(1, 0), 'player', scene.playerProjectiles);
    tick(3);
    check('T-09: despejada al impacto del último robot, durante animación', scene.enemyManager.aliveCount === 0 &&
        scene.enemyManager.isCleared && clearedEvents === 1 && lastRobot.active);
    lastRobot.die();
    tick(45);
    check('Habitación despejada emite una sola vez', clearedEvents === 1 && scene.enemies.getLength() === 0);
    scene.events.removeAllListeners(CombatEvents.ROOM_CLEARED);

    // Restart to exercise actual exit overlap with a living player.
    scene.scene.restart({ roomIndex: 0, character: 'alex' });
    tick(3);
    scene = game.scene.getScene('GameScene');
    scene.sys.sceneUpdate = () => {};
    const oldEnemies = scene.enemies.getChildren().slice();
    scene.enemyManager.defeatLivingEnemies();
    const oldWalls = scene.walls;
    let emptyRoomClears = 0;
    const onEmptyClear = () => { if (scene.roomIndex === 1) emptyRoomClears++; };
    scene.events.on(CombatEvents.ROOM_CLEARED, onEmptyClear);
    const oldShot = new Projectile(scene, 352, 352, new Phaser.Math.Vector2(0, 0), 'enemy', scene.enemyProjectiles);
    const exit=levels[scene.roomIndex].exits[0].position;
    reset(scene.player.physicsSprite, (exit.column+.5)*64, (exit.row+.5)*64);
    tick(4);
    check('Salida cambia a segunda habitación', scene.roomIndex === 1);
    check('Cambio limpia robots, balas y referencias', oldEnemies.every(e => !e.active) && !oldShot.physicsBody.active &&
        scene.enemies.getLength() === levels[1].enemies.count && scene.enemyProjectiles.getLength() === 0);
    const nextWall=scene.walls.getChildren().find(wall=>!wall.getData('room-perimeter'));
    check('T-14: paredes y visión se actualizan tras combate', scene.walls !== oldWalls &&
        scene.lineOfSight.obstacles === scene.walls &&
        !scene.lineOfSight.hasLineOfSight({ x: nextWall.x-80, y: nextWall.y }, { x: nextWall.x+80, y: nextWall.y }));
    check('Segunda habitación espera eliminar sus cuatro robots', emptyRoomClears === 0 && !scene.enemyManager.isCleared);
    scene.player.die();
    tick(70);
    gameOver.input.keyboard.emit('keydown-ENTER');
    tick(4);
    check('Reintento conserva segunda habitación y personaje', scene.roomIndex === 1 && scene.character === 'alex' &&
        !scene.player.isDead() && scene.enemyManager.aliveCount === levels[1].enemies.count && !scene.enemyManager.isCleared && emptyRoomClears === 0);
    scene.events.off(CombatEvents.ROOM_CLEARED, onEmptyClear);
    scene.sys.sceneUpdate = () => {};
    for (let index = 1; index < levels.length - 1; index++) {
        while (!scene.waves.isComplete) { scene.enemyManager.defeatLivingEnemies(); scene.waves.update(1000); }
        const exit=levels[scene.roomIndex].exits[0].position;
        reset(scene.player.physicsSprite, (exit.column+.5)*64, (exit.row+.5)*64); tick(4);
        if (index < levels.length - 1) scene.sys.sceneUpdate = () => {};
    }
    check('Reactor con jefe exige derrotarlo antes de la conclusión', scene.roomIndex===4 && scene.waves===null && scene.enemyManager.aliveCount===0 && !!scene.bossEncounter && !game.scene.isActive('CompletionScene') && !game.scene.isActive('VisualNovelScene'));
    scene.scene.restart({ character: 'alex', roomIndex: 0 });
    tick(4);
    scene.sys.sceneUpdate = () => {};
    check('Nueva partida reconstruye primera habitación', scene.roomIndex === 0 && scene.enemies.getLength() === levels[0].enemies.count);
    check('Personaje se conserva entre habitaciones', scene.character === 'alex' && scene.player.physicsSprite.texture.key === 'alex-walk');
    check('Colliders estables tras cambios', scene.physics.world.colliders.getActive().length === colliderCount);
    scene.sys.sceneUpdate = normalUpdate;
    game.loop.wake();
    return results;
}

run().then(passed => {
    window.combatResults = { status: 'passed', count: passed.length, passed };
    document.querySelector('#results').textContent = JSON.stringify(window.combatResults, null, 2);
}).catch(error => {
    window.combatResults = { status: 'failed', passed: results, error: error.stack };
    document.querySelector('#results').textContent = JSON.stringify(window.combatResults, null, 2);
    console.error(error);
});

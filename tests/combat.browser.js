import Phaser from 'phaser';
import { gameConfig } from '../src/config/gameConfig';
import { Projectile } from '../src/entities/Projectile';
import { Enemy } from '../src/entities/enemies/Enemy';
import { EnemyState } from '../src/entities/enemies/EnemyState';

// Real Arcade bodies, colliders, animations, input and room lifecycle in Canvas.
const results = [];
const check = (name, condition) => {
    if (!condition) throw new Error(name);
    results.push(name);
};
window.combatResults = { status: 'running' };
const game = new Phaser.Game({ ...gameConfig, type: Phaser.CANVAS });
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
    check('Dos robots creados en tiles RobotSpawn', scene.enemies.getLength() === 2);
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
    reset(enemy, 480, 160);
    enemy.moveLeft();
    tick(90);
    check('Robot detenido por pared', enemy.body.left >= 448 - 0.01);
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
    reset(enemy, 680, 352);
    enemy.patrolDirection = 0;
    enemy.nextPatrolTurn = now + 10000;
    enemy.moveRight();
    for (let i = 0; i < 20; i++) {
        tick();
        enemy.updateBehavior(player, scene.lineOfSight, now);
    }
    check('Patrulla gira al chocar sin atravesar pared', enemy.body.right <= 704 + 0.01 && enemy.body.velocity.y === 80);
    reset(enemy, 352, 224);
    reset(player.physicsSprite, 224, 224);
    check('Proximidad detecta a través de pared', enemy.detectPlayer(player.physicsSprite));
    check('Pared bloquea visión', !scene.lineOfSight.hasLineOfSight(enemy, player));
    check('Visión bloqueada: CHASE sin disparo', enemy.updateBehavior(player, scene.lineOfSight, now) === null &&
        enemy.getState() === EnemyState.CHASE && enemy.body.velocity.x < 0);
    reset(enemy, 224, 160);
    reset(player.physicsSprite, 160, 160);
    const aim = enemy.updateBehavior(player, scene.lineOfSight, now);
    check('Visión despejada: ATTACK_READY y disparo dirigido', aim?.x === -1 && aim.y === 0 &&
        enemy.getState() === EnemyState.ATTACK_READY && enemy.body.velocity.lengthSq() === 0);
    check('Recarga bloquea disparos prematuros', enemy.updateBehavior(player, scene.lineOfSight, now + 999) === null);
    check('Recarga usa milisegundos', enemy.updateBehavior(player, scene.lineOfSight, now + 1000) !== null);

    const custom = new Enemy(scene, 608, 224, 'robot-red', { shootCooldown: 500 });
    reset(player.physicsSprite, 608, 160);
    check('Cadencia configurable', custom.updateBehavior(player, scene.lineOfSight, 0) !== null &&
        custom.updateBehavior(player, scene.lineOfSight, 499) === null &&
        custom.updateBehavior(player, scene.lineOfSight, 500) !== null);
    custom.destroy();

    reset(player.physicsSprite, 160, 160);
    reset(enemy, 224, 160);
    enemy.lastShotTime = -Infinity;
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
        const shot = new Projectile(scene, 224, 224, new Phaser.Math.Vector2(1, 0), owner, group);
        tick(15);
        check(`Bala ${owner} destruida por pared`, !shot.physicsBody.active);
    }
    const fixed = new Projectile(scene, 608, 352, new Phaser.Math.Vector2(1, 0), 'enemy', scene.enemyProjectiles);
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
    reset(player.physicsSprite, 240, 224);
    const shotsBeforeMuzzle = scene.playerProjectiles.getLength();
    scene.createProjectile(new Phaser.Math.Vector2(1, 0));
    check('Muzzle no permite disparar a través de pared', scene.playerProjectiles.getLength() === shotsBeforeMuzzle);

    reset(player.physicsSprite, 160, 160);
    tick(2);
    const center = player.physicsSprite.body.center;
    new Projectile(scene, center.x, center.y, new Phaser.Math.Vector2(1, 0), 'enemy', scene.enemyProjectiles);
    new Projectile(scene, center.x, center.y, new Phaser.Math.Vector2(1, 0), 'enemy', scene.enemyProjectiles);
    tick(3);
    check('Un impacto mata jugador y deshabilita cuerpo', player.isDead() && !player.physicsSprite.body.enable);
    player.die();
    player.wasd.D.isDown = true;
    player.shootingKeys.RIGHT.isDown = true;
    player.update();
    check('Jugador muerto no se mueve ni dispara', player.physicsSprite.body.velocity.lengthSq() === 0 && player.consumeShootRequest() === null);
    const survivor = scene.enemies.getChildren()[0];
    check('Robot no ataca jugador muerto', survivor.updateBehavior(player, scene.lineOfSight, now + 9999) === null);
    scene.changeRoom();
    check('Jugador muerto no activa salida', !scene.isChangingRoom);
    game.loop.wake();
    await new Promise(r => setTimeout(r, 600));
    game.loop.sleep();
    check('Efecto de muerte desactiva jugador', !player.physicsSprite.active);

    // Restart to exercise actual exit overlap with a living player.
    scene.scene.restart({ roomIndex: 0 });
    tick(3);
    scene = game.scene.getScene('GameScene');
    scene.sys.sceneUpdate = () => {};
    const oldEnemies = scene.enemies.getChildren().slice();
    const oldShot = new Projectile(scene, 352, 352, new Phaser.Math.Vector2(0, 0), 'enemy', scene.enemyProjectiles);
    reset(scene.player.physicsSprite, 672, 480);
    tick(4);
    check('Salida cambia a segunda habitación', scene.roomIndex === 1);
    check('Cambio limpia robots, balas y referencias', oldEnemies.every(e => !e.active) && !oldShot.physicsBody.active &&
        scene.enemies.getLength() === 0 && scene.enemyProjectiles.getLength() === 0);
    scene.sys.sceneUpdate = () => {};
    reset(scene.player.physicsSprite, 544, 96);
    tick(4);
    check('Regreso reconstruye primera habitación', scene.roomIndex === 0 && scene.enemies.getLength() === 2);
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

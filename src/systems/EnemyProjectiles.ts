import Phaser from "phaser";
import { Projectile } from "../entities/Projectile";
import type { Enemy } from "../entities/enemies/Enemy";
import type { EnemyShot } from "../entities/enemies/EnemyAttackController";

/** Both the arcade game and robot lab emit exactly the same production volleys. */
export function fireEnemyShots(scene: Phaser.Scene, enemy: Pick<Enemy,'x'|'y'|'isDead'|'active'>, shots: readonly EnemyShot[] | null, group: Phaser.Physics.Arcade.Group): number {
    if (!shots || enemy.isDead() || !enemy.active) return 0;
    for (const shot of shots) {
        // Keep the origin inside the body so a muzzle offset cannot jump a wall.
        new Projectile(scene, enemy.x, enemy.y, new Phaser.Math.Vector2(shot.direction.x, shot.direction.y), "enemy", group, shot.speed, shot.piercesInteriorWalls, shot.attackType);
    }
    return shots.length;
}

import Phaser from "phaser";
import { Projectile } from "../entities/Projectile";
import type { Enemy } from "../entities/enemies/Enemy";
import type { EnemyShot } from "../entities/enemies/EnemyAttackController";

/** Both the arcade game and robot lab emit exactly the same production volleys. */
export function fireEnemyShots(scene: Phaser.Scene, enemy: Pick<Enemy,'x'|'y'|'isDead'|'active'>, shots: readonly EnemyShot[] | null, group: Phaser.Physics.Arcade.Group,limit=Infinity,advanced=false): number {
    if (!shots || enemy.isDead() || !enemy.active) return 0;
    let fired=0;
    for (const shot of shots) {
        if(group.getLength()>=limit)break;
        // Keep the origin inside the body so a muzzle offset cannot jump a wall.
        new Projectile(scene, enemy.x+(shot.originOffset?.x??0), enemy.y+(shot.originOffset?.y??0), new Phaser.Math.Vector2(shot.direction.x, shot.direction.y), "enemy", group, shot.speed, shot.piercesInteriorWalls, shot.attackType,advanced?{key:'quimera-projectiles',frame:shot.visualFrame??(fired%2?4:0)}:undefined,shot.lifetimeMs);
        fired++;
    }
    return fired;
}

import Phaser from "phaser";
import { Enemy } from "../entities/enemies/Enemy";
import { CombatEvents } from "./CombatEvents";

/** Counts living enemies, independently of destruction animation duration. */
export class EnemyManager {
    private readonly living = new Set<Enemy>();
    private started = false;
    private cleared = false;
    private readonly scene: Phaser.Scene;
    private readonly group: Phaser.Physics.Arcade.Group;

    constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group) {
        this.scene = scene;
        this.group = group;
    }

    add(enemy: Enemy): void {
        this.group.add(enemy);
        this.living.add(enemy);
        enemy.once(CombatEvents.ENEMY_DIED, this.remove, this);
        enemy.once(Phaser.GameObjects.Events.DESTROY, this.remove, this);
    }

    start(): void {
        this.started = true;
        this.checkCleared();
    }

    get aliveCount(): number { return this.living.size; }
    getLivingEnemies(): readonly Enemy[] { return [...this.living]; }
    defeatLivingEnemies(): void {
        // die() updates the living set synchronously, so iterate over a snapshot.
        for (const enemy of this.getLivingEnemies()) {
            if (enemy.active && !enemy.isDead()) enemy.die();
        }
    }
    get isCleared(): boolean { return this.cleared; }

    private remove(enemy: Enemy): void {
        enemy.off(CombatEvents.ENEMY_DIED, this.remove, this);
        enemy.off(Phaser.GameObjects.Events.DESTROY, this.remove, this);
        if (this.living.delete(enemy)) this.checkCleared();
    }

    private checkCleared(): void {
        if (this.started && !this.cleared && this.living.size === 0 &&
            this.scene.sys.settings.status < Phaser.Scenes.SHUTDOWN) {
            this.cleared = true;
            this.scene.events.emit(CombatEvents.ROOM_CLEARED);
        }
    }

    destroy(): void {
        // Stop notifications before the display list destroys remaining sprites.
        this.started = false;
        for (const enemy of this.living) {
            enemy.off(CombatEvents.ENEMY_DIED, this.remove, this);
            enemy.off(Phaser.GameObjects.Events.DESTROY, this.remove, this);
        }
        this.living.clear();
    }
}

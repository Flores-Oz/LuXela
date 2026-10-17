import type { Player } from "../entities/Player";
import type { EnemyManager } from "../systems/EnemyManager";
import { SpecialAbilityConfig } from "../config/SpecialAbilityConfig";
import { SpecialAbility } from "./SpecialAbility";

export class AlexSpecial extends SpecialAbility {
    private readonly showImpacts: (positions: readonly { x: number; y: number }[]) => void;
    private readonly enemies: EnemyManager;
    constructor(player: Player, enemies: EnemyManager, showImpacts: (positions: readonly { x: number; y: number }[]) => void) {
        super(player, SpecialAbilityConfig.alex);
        this.enemies = enemies;
        this.showImpacts = showImpacts;
    }
    protected onDischarge(): void {
        const targets = this.enemies.getLivingEnemies().filter(enemy => enemy.active && !enemy.isDead());
        this.showImpacts(targets.map(enemy => ({ x: enemy.x, y: enemy.y })));
        this.enemies.defeatLivingEnemies();
    }
}

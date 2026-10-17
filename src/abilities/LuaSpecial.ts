import type { Player } from "../entities/Player";
import type { EnemyManager } from "../systems/EnemyManager";
import { SpecialAbilityConfig } from "../config/SpecialAbilityConfig";
import { SpecialAbility } from "./SpecialAbility";

export class LuaSpecial extends SpecialAbility {
    private readonly enemies: EnemyManager;
    constructor(player: Player, enemies: EnemyManager) { super(player, SpecialAbilityConfig.lua); this.enemies = enemies; }
    protected onDischarge(): void {
        this.enemies.defeatLivingEnemies();
    }
}

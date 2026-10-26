import type { Player } from "../entities/Player";
import type { EnemyManager } from "../systems/EnemyManager";
import { SpecialAbilityConfig } from "../config/SpecialAbilityConfig";
import { SpecialAbility, type AbilityCharge } from "./SpecialAbility";

export class LuaSpecial extends SpecialAbility {
    private readonly enemies: EnemyManager;
    constructor(player: Player, enemies: EnemyManager, charge: AbilityCharge) { super(player, SpecialAbilityConfig.lua, charge); this.enemies = enemies; }
    protected onDischarge(): void {
        this.enemies.defeatLivingEnemies();
    }
}

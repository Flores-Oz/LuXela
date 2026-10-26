import Phaser from "phaser";
import type { PlayerCharacter } from "../config/characters";
import { characters } from "../config/characters";
import { SpecialAbilityConfig } from "../config/SpecialAbilityConfig";
import type { Player } from "../entities/Player";
import type { EnemyManager } from "../systems/EnemyManager";
import { AlexSpecial } from "./AlexSpecial";
import { LuaSpecial } from "./LuaSpecial";
import type { SpecialAbility } from "./SpecialAbility";
import { getArcadeRun } from "../systems/ArcadeRunService";

/** Original 4x2 sheets, with a stable ground line on a logical 512x544 canvas. */
export function loadSpecialAssets(scene: Phaser.Scene): void {
    for (const character of ["alex", "lua"] as const) {
        if (scene.textures.exists(`${character}-special`)) continue;
        const frames: Record<string, object> = {};
        const columns = [0, 444, 887, 1330, 1774];
        for (let index = 0; index < 8; index++) {
            const column = index % 4;
            const row = Math.floor(index / 4);
            const x = columns[column]!;
            const w = columns[column + 1]! - x;
            const y = row === 0 ? 0 : 443;
            const h = row === 0 ? 443 : 444;
            const ground = character === "alex" ? (row === 0 ? 434 : 435) : (row === 0 ? 405 : 394);
            frames[String(index)] = { frame: { x, y, w, h }, rotated: false, trimmed: true,
                sourceSize: { w: 512, h: 544 },
                spriteSourceSize: { x: Math.round((512 - w) / 2), y: 480 - ground, w, h } };
        }
        scene.load.atlas(`${character}-special`, `assets/sprites/player/${character}-special.png`, { frames });
    }
}

export class SpecialAbilityManager {
    readonly ability: SpecialAbility;
    private readonly key: Phaser.Input.Keyboard.Key;
    private readonly pose: Phaser.GameObjects.Sprite;
    private readonly electricity: Phaser.GameObjects.Graphics;
    private readonly hud: Phaser.GameObjects.Text;
    private destroyed = false;
    private visualClock = 0;
    private impactPositions: readonly { x: number; y: number }[] = [];
    private impactStartedAt = 0;
    private readonly advanceCooldown: (delta: number) => void;

    private readonly scene: Phaser.Scene;
    private readonly player: Player;
    private readonly character: PlayerCharacter;
    constructor(scene: Phaser.Scene, player: Player,
        character: PlayerCharacter, enemies: EnemyManager, runId: number, specialTarget?:()=>{x:number;y:number}|null) {
        this.scene = scene;
        this.player = player;
        this.character = character;
        const runs = getArcadeRun(scene.game);
        const charge = { count: () => runs.getSpecialCharge(runId), consume: () => runs.consumeSpecial(runId), cooldownRemaining: () => runs.getSpecialCooldown(runId) };
        this.advanceCooldown = delta => runs.advanceSpecialCooldown(runId, delta);
        this.ability = character === "lua" ? new LuaSpecial(player, enemies, charge) : new AlexSpecial(player, enemies, positions => {
            this.impactPositions = positions;
            this.impactStartedAt = this.visualClock;
        }, charge);
        if(specialTarget)this.ability.onDischarged(()=>{
            const point=specialTarget();
            if(character==='alex'&&point){this.impactPositions=[...this.impactPositions,point];this.impactStartedAt=this.visualClock;}
        });
        this.key = scene.input.keyboard!.addKey(SpecialAbilityConfig.key);
        this.pose = scene.add.sprite(player.x, player.y, `${character}-special`, "0")
            .setOrigin(0.5, 480 / 544).setScale(0.25).setDepth(10).setVisible(false);
        this.electricity = scene.add.graphics().setDepth(9);
        this.hud = scene.add.text(16, 16, "", { fontFamily: "monospace", fontSize: "16px",
            color: characters[character].accent, backgroundColor: "#10141fee", padding: { x: 10, y: 8 } })
            .setScrollFactor(0).setDepth(100).setVisible(false);
        this.render();
    }

    update(delta: number): void {
        if (this.destroyed || !Number.isFinite(delta) || delta <= 0) return;
        this.advanceCooldown(delta);
        this.visualClock += delta;
        this.ability.update(delta);
        if (Phaser.Input.Keyboard.JustDown(this.key)) this.ability.activate();
        this.render();
    }

    layoutHUD(): void {
        const camera = this.scene.cameras.main;
        this.hud.setScale(1 / camera.zoom).setPosition(camera.width / 2 + (16 - camera.width / 2) / camera.zoom,
            camera.height / 2 + (16 - camera.height / 2) / camera.zoom);
    }

    private render(): void {
        const ability = this.ability;
        this.player.setSpecialPerforming(ability.performing);
        this.player.physicsSprite.setVisible(!ability.performing);
        this.pose.setVisible(ability.performing).setPosition(this.player.x, this.player.y + 32.2);
        let frame = 0;
        if (ability.state === "charging") frame = Math.min(2, Math.floor(ability.elapsed / (SpecialAbilityConfig[this.character].chargeMs / 3)));
        else if (ability.state === "active") frame = this.character === "lua" ? 3 + Math.min(2, Math.floor(ability.elapsed / 170)) : 3 + Math.floor(ability.elapsed / 90) % 4;
        else if (ability.state === "recovering") frame = this.character === "lua" ?
            6 + Math.min(1, Math.floor(ability.elapsed / (SpecialAbilityConfig.lua.recoveryMs / 2))) : 7;
        this.pose.setFrame(String(frame));
        this.electricity.clear();
        if (this.character === "lua" && ability.performing) this.drawElectricity();
        if (this.character === "alex" && ability.performing && this.impactPositions.length > 0) {
            const age = this.visualClock - this.impactStartedAt;
            if (age < SpecialAbilityConfig.alex.impactMs) {
                this.electricity.fillStyle(0x66ff33, 1 - age / SpecialAbilityConfig.alex.impactMs);
                for (const point of this.impactPositions) {
                    this.electricity.fillCircle(point.x, point.y, SpecialAbilityConfig.alex.impactRadius);
                }
            } else this.impactPositions = [];
        }
        const status = ability.state === "ready" ? "LISTA" : ability.state === "cooldown" ? `ESPERA ${Math.ceil(ability.cooldownRemaining / 1000)} s` : ability.state === "locked" ? "ELIMINA ROBOTS" : ability.state === "charging" ? "CARGANDO" : "ACTIVA";
        this.hud.setText(`[${SpecialAbilityConfig.key}] ${characters[this.character].abilityName} · ${status}`);
    }

    private drawElectricity(): void {
        const graphics = this.electricity;
        const { x, y } = this.player;
        const phase = this.ability.state;
        graphics.lineStyle(3, 0xffe64b, 0.85);
        if (phase === "charging") {
            graphics.strokeCircle(x, y, 12 + this.ability.elapsed / 20);
            return;
        }
        if (phase !== "active") return;
        const bounds = this.scene.physics.world.bounds;
        graphics.fillStyle(0xffdf33, 0.09).fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        const pulse = Math.floor(this.visualClock / 70);
        for (let ray = 0; ray < 12; ray++) {
            const angle = ray * Math.PI / 6;
            const dx = Math.cos(angle), dy = Math.sin(angle);
            const maxX = dx > 0 ? (bounds.right - x) / dx : dx < 0 ? (bounds.left - x) / dx : Infinity;
            const maxY = dy > 0 ? (bounds.bottom - y) / dy : dy < 0 ? (bounds.top - y) / dy : Infinity;
            const distance = Math.min(maxX, maxY);
            graphics.beginPath().moveTo(x, y);
            for (let step = 1; step <= 12; step++) {
                const travel = distance * step / 12;
                const jitter = step === 12 ? 0 : Math.sin(step * 13 + ray * 7 + pulse) * 14;
                graphics.lineTo(Phaser.Math.Clamp(x + dx * travel - dy * jitter, bounds.left, bounds.right),
                    Phaser.Math.Clamp(y + dy * travel + dx * jitter, bounds.top, bounds.bottom));
            }
            graphics.strokePath();
        }
        const radius = Math.max(0, Math.min(30 + this.ability.elapsed * 1.5,
            x - bounds.left - 2, bounds.right - x - 2, y - bounds.top - 2, bounds.bottom - y - 2));
        graphics.strokeCircle(x, y, radius);
    }

    /** Cancels visuals; the session owns elimination charge and checkpoints. */
    cancel(): void {
        this.ability.cancel();
        this.player.setSpecialPerforming(false);
        if (this.player.physicsSprite.active) this.player.physicsSprite.setVisible(true);
        this.pose.setVisible(false);
        this.electricity.clear();
        this.impactPositions = [];
        this.hud.setVisible(false);
    }

    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        this.ability.destroy();
        this.impactPositions = [];
        this.player.setSpecialPerforming(false);
        if (this.player.physicsSprite.active) this.player.physicsSprite.setVisible(true);
        this.pose.destroy();
        this.electricity.destroy();
        this.hud.destroy();
        this.scene.input.keyboard?.removeKey(this.key, true);
    }
}

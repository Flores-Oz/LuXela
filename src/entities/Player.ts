import Phaser from "phaser";
import { characters, type PlayerCharacter } from "../config/characters";
import { CombatEvents } from "../systems/CombatEvents";

type MovementKeys = {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
};

type PlayerDirection =
    | "down"
    | "up"
    | "left"
    | "right";

type ShootingKeys = {
    UP: Phaser.Input.Keyboard.Key;
    DOWN: Phaser.Input.Keyboard.Key;
    LEFT: Phaser.Input.Keyboard.Key;
    RIGHT: Phaser.Input.Keyboard.Key;
};

export class Player {

    private dead = false;

    private readonly sprite: 
        Phaser.Physics.Arcade.Sprite;

    private readonly shootingKeys:
        ShootingKeys;

    private shootRequested:
        Phaser.Math.Vector2 | null = null;

    private readonly wasd: MovementKeys;

    private readonly character: PlayerCharacter;

    private readonly speed = 220;

    private readonly shootCooldown = 250;

    private lastShotTime = -Infinity;

    private direction:
        PlayerDirection = "down";

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        character: PlayerCharacter = "lua"
    ) {

        this.character = character;

        this.sprite = scene.physics.add.sprite(
            x,
            y,
            `${character}-walk`,
            0
        );
        this.sprite.setScale(0.35);

                
        this.sprite.body?.setSize(
            70,
            70
        );

        this.sprite.body?.setOffset(
            93,
            150
        );

        if (!scene.input.keyboard) {
            throw new Error(
                "Keyboard input is not available."
            );
        }

        this.wasd =
            scene.input.keyboard.addKeys({
                W: Phaser.Input.Keyboard.KeyCodes.W,
                A: Phaser.Input.Keyboard.KeyCodes.A,
                S: Phaser.Input.Keyboard.KeyCodes.S,
                D: Phaser.Input.Keyboard.KeyCodes.D
            }) as MovementKeys;
        
        this.shootingKeys = {
            UP: scene.input.keyboard.addKey(
                Phaser.Input.Keyboard.KeyCodes.UP
            ),

            DOWN: scene.input.keyboard.addKey(
                Phaser.Input.Keyboard.KeyCodes.DOWN
            ),

            LEFT: scene.input.keyboard.addKey(
                Phaser.Input.Keyboard.KeyCodes.LEFT
            ),

            RIGHT: scene.input.keyboard.addKey(
                Phaser.Input.Keyboard.KeyCodes.RIGHT
            )
        };

        this.sprite.setCollideWorldBounds(true);
    }

    update(): void {

        if (this.dead || !this.sprite.active || !this.sprite.body) {
            return;
        }

        this.updateShooting();

        this.sprite.setVelocity(0);

        let x = 0;
        let y = 0;

        if (
            this.wasd.A.isDown
        ) {
            x -= 1;
        }

        if (
            this.wasd.D.isDown
        ) {
            x += 1;
        }

        if (
            this.wasd.W.isDown
        ) {
            y -= 1;
        }

        if (
            this.wasd.S.isDown
        ) {
            y += 1;
        }

        const direction =
            new Phaser.Math.Vector2(x, y);

        if (direction.lengthSq() === 0) {
            this.stopMovementAnimation();
            return;
        }

        direction.normalize();

        this.sprite.setVelocity(
            direction.x * this.speed,
            direction.y * this.speed
        )

        this.updateDirection(x,y);

        this.playMovementAnimation();
    }

    private updateShooting(): void {

        let x = 0;
        let y = 0;

       if (this.shootingKeys.LEFT.isDown) {
            x -= 1;
        }

        if (this.shootingKeys.RIGHT.isDown) {
            x += 1;
        }

        if (this.shootingKeys.UP.isDown) {
            y -= 1;
        }

        if (this.shootingKeys.DOWN.isDown) {
            y += 1;
        }

        if (x === 0 && y === 0) {
            return;
        }

        const currentTime =
            this.sprite.scene.time.now;

        if (
            currentTime - this.lastShotTime <
            this.shootCooldown
        ) {
            return;
        }

        this.lastShotTime = currentTime;

        this.shootRequested =
            new Phaser.Math.Vector2(x, y);
        }

    //Constructores
    private updateDirection(
        x: number,
        y: number
    ): void{
        if (y > 0){
            this.direction = "down";
            return;
        }

        if (y < 0){
            this.direction = "up";
            return;
        }

        if (x < 0){
            this.direction = "left";
            return;
        }

        if (x > 0){
            this.direction = "right";
            return;
        }
    }

    private playMovementAnimation(): void{
        this.sprite.play(
            `${this.character}-walk-${this.direction}`, true
        );
    }

    private stopMovementAnimation(): void {
        this.sprite.stop();
    }

    get physicsSprite():
        Phaser.Physics.Arcade.Sprite {
        return this.sprite;
    }

    consumeShootRequest():
        Phaser.Math.Vector2 | null {

        if (this.dead) {
            return null;
        }

        const request = this.shootRequested;
        this.shootRequested = null;
        return request;
    }

    isDead(): boolean {
        return this.dead;
    }

    die(): void {
        if (this.dead || !this.sprite.active || !this.sprite.body) {
            return;
        }

        this.dead = true;
        this.shootRequested = null;
        this.sprite.setVelocity(0, 0);
        this.sprite.stop();
        this.sprite.disableBody(false, false);
        const side = this.direction === "left" || this.direction === "right";
        const pose = side && characters[this.character].side.length ? "side" : "front";
        const animation = `${this.character}-defeat-${pose}`;
        this.sprite.setFlipX(this.direction === "left");
        this.sprite.once(`${Phaser.Animations.Events.ANIMATION_COMPLETE_KEY}${animation}`, () => {
            this.sprite.setActive(false);
            this.sprite.emit(CombatEvents.PLAYER_DEFEAT_COMPLETE);
        });
        this.sprite.play(animation);
        this.sprite.emit(CombatEvents.PLAYER_DIED);
    }

    get x(): number {
        return this.sprite.x;
    }

    get y(): number {
        return this.sprite.y;
    }

    getProjectileSpawn(
        direction: Phaser.Math.Vector2
    ): Phaser.Math.Vector2 {

        const x = this.sprite.x;
        const y = this.sprite.y;

        if (direction.x > 0) {
            return new Phaser.Math.Vector2(
                x + 58,
                y - 9
            );
        }

        if (direction.x < 0) {
            return new Phaser.Math.Vector2(
                x - 58,
                y - 9
            );
        }

        if (direction.y < 0) {
            return new Phaser.Math.Vector2(
                x,
                y - 58
            );
        }

        return new Phaser.Math.Vector2(
            x,
            y + 58
        );
    }
}

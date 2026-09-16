import Phaser from "phaser";

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

export class Player {

    private readonly sprite: 
        Phaser.Physics.Arcade.Sprite;

    private readonly cursors:
        Phaser.Types.Input.Keyboard.CursorKeys;

    private readonly wasd: MovementKeys;

    private readonly speed = 220;

    private direction:
        PlayerDirection = "down";

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number
    ) {

        this.sprite = scene.physics.add.sprite(
            x,
            y,
            "player-walk",
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

        this.cursors =
            scene.input.keyboard.createCursorKeys();

        this.wasd =
            scene.input.keyboard.addKeys({
                W: Phaser.Input.Keyboard.KeyCodes.W,
                A: Phaser.Input.Keyboard.KeyCodes.A,
                S: Phaser.Input.Keyboard.KeyCodes.S,
                D: Phaser.Input.Keyboard.KeyCodes.D
            }) as MovementKeys;
    }

    update(): void {

        this.sprite.setVelocity(0);

        let x = 0;
        let y = 0;

        if (
            this.cursors.left.isDown ||
            this.wasd.A.isDown
        ) {
            x -= 1;
        }

        if (
            this.cursors.right.isDown ||
            this.wasd.D.isDown
        ) {
            x += 1;
        }

        if (
            this.cursors.up.isDown ||
            this.wasd.W.isDown
        ) {
            y -= 1;
        }

        if (
            this.cursors.down.isDown ||
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
            `player-walk-${this.direction}`, true
        );
    }

    private stopMovementAnimation(): void {
        this.sprite.stop();
    }

    get physicsSprite():
        Phaser.Physics.Arcade.Sprite {
        return this.sprite;
    }
}
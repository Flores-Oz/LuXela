import Phaser from "phaser";

type MovementKeys = {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
};

export class Player {

    private readonly body: Phaser.GameObjects.Sprite;

    private readonly cursors:
        Phaser.Types.Input.Keyboard.CursorKeys;

    private readonly wasd: MovementKeys;

    private readonly speed = 220;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number
    ) {

        this.body = scene.add.sprite(
            x,
            y,
            "player-walk",
            0
        );
        this.body.setScale(0.35);

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

    update(delta: number): void {

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
            return;
        }

        direction.normalize();

        const deltaSeconds = delta / 1000;

        this.body.x +=
            direction.x *
            this.speed *
            deltaSeconds;

        this.body.y +=
            direction.y *
            this.speed *
            deltaSeconds;
    }
}
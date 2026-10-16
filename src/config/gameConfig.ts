import Phaser from "phaser";
import { GameSettings } from "./GameSettings";
import { GameScene } from "../scenes/GameScene";
import { GameOverScene } from "../scenes/GameOverScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {

    type: Phaser.AUTO,

    width: 1024,
    height: 768,

    backgroundColor: "#000000",

    parent: "game-container",

    pixelArt: true,

    physics: {
        default: "arcade",

        arcade: {
            gravity: {
                x: 0,
                y: 0
            },

            debug: GameSettings.physicsDebug
        }
    },

    scene: [
        GameScene,
        GameOverScene
    ]
};

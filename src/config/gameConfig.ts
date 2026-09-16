import Phaser from "phaser";
import { GameScene } from "../scenes/GameScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {

    type: Phaser.AUTO,

    width: 1024,
    height: 768,

    backgroundColor: "#000000",

    parent: "game-container",

    physics: {
        default: "arcade",

        arcade: {
            gravity: {
                x: 0,
                y: 0
            },

            debug: true
        }
    },

    scene: [
        GameScene
    ]
};
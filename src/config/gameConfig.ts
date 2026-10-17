import Phaser from "phaser";
import { GameSettings } from "./GameSettings";
import { GameScene } from "../scenes/GameScene";
import { GameOverScene } from "../scenes/GameOverScene";
import { CharacterSelectScene } from "../scenes/CharacterSelectScene";
import { VisualNovelScene } from "../scenes/VisualNovelScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {

    type: Phaser.AUTO,

    width: 1024,
    height: 768,

    backgroundColor: "#000000",

    parent: "game-container",

    pixelArt: true,

    dom: { createContainer: true },

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

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
        CharacterSelectScene,
        VisualNovelScene,
        GameScene,
        GameOverScene
    ]
};

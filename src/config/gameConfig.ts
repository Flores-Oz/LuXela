import Phaser from "phaser";
import {runtimeRenderer} from './RuntimeRenderer';
import { GameSettings } from "./GameSettings";
import { GameScene } from "../scenes/GameScene";
import { GameOverScene } from "../scenes/GameOverScene";
import { CharacterSelectScene } from "../scenes/CharacterSelectScene";
import { VisualNovelScene } from "../scenes/VisualNovelScene";
import { MainMenuScene } from "../scenes/MainMenuScene";
import { PauseScene } from "../scenes/PauseScene";
import { CompletionScene } from "../scenes/CompletionScene";
import { ControlsScene } from "../scenes/ControlsScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {

    type: runtimeRenderer.type==='canvas'?Phaser.CANVAS:Phaser.AUTO,

    width: 1024,
    height: 768,

    backgroundColor: "#000000",

    parent: "game-container",

    pixelArt: true,

    dom: { createContainer: true },

    scale: {
        mode: Phaser.Scale.RESIZE,
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
        MainMenuScene,
        CharacterSelectScene,
        VisualNovelScene,
        ControlsScene,
        GameScene,
        GameOverScene,
        PauseScene,
        CompletionScene
    ]
};

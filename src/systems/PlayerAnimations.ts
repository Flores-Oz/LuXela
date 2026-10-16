import Phaser from "phaser";
import { characters, defeatAtlas, type PlayerCharacter } from "../config/characters";

export function loadPlayerAssets(scene: Phaser.Scene): void {
    for (const id of Object.keys(characters) as PlayerCharacter[]) {
        scene.load.spritesheet(`${id}-walk`, characters[id].walkPath,
            { frameWidth: 256, frameHeight: 256 });
        scene.load.atlas(`${id}-defeat`, characters[id].defeatPath, defeatAtlas(id));
    }
}

export function createPlayerAnimations(scene: Phaser.Scene): void {
    for (const id of Object.keys(characters) as PlayerCharacter[]) {
        ["down", "up", "left", "right"].forEach((direction, row) => {
            const key = `${id}-walk-${direction}`;
            if (!scene.anims.exists(key)) scene.anims.create({
                key,
                frames: scene.anims.generateFrameNumbers(`${id}-walk`, { start: row * 8, end: row * 8 + 7 }),
                frameRate: 10,
                repeat: -1
            });
        });
        for (const pose of ["front", "side"] as const) {
            const key = `${id}-defeat-${pose}`;
            if (!characters[id][pose].length) continue;
            if (!scene.anims.exists(key)) scene.anims.create({
                key,
                frames: characters[id][pose].map((_, index) => ({ key: `${id}-defeat`, frame: `${pose}-${index}` })),
                frameRate: characters[id].defeatFrameRate,
                repeat: 0
            });
        }
    }
}

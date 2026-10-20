import type Phaser from "phaser";
import { applyUITheme } from "../config/UITheme";

/** Share Phaser's scaled DOM container without overriding a view's flex layout. */
export function mountSceneView(scene: Phaser.Scene, element: HTMLElement): void {
    const wrapper = document.createElement("div");
    const resize = () => {
        wrapper.style.width = `${scene.scale.width}px`;
        wrapper.style.height = `${scene.scale.height}px`;
    };
    resize();
    applyUITheme(element);
    scene.scale.on("resize", resize);
    wrapper.append(element);
    scene.add.dom(0, 0, wrapper).setOrigin(0, 0);
    // Captures persist across scenes; text fields and native buttons need defaults.
    const keyboard = scene.input.keyboard;
    const captures = keyboard?.manager.preventDefault ?? false;
    keyboard?.disableGlobalCapture();
    scene.events.once("shutdown", () => {
        scene.scale.off("resize", resize);
        if (keyboard) keyboard.manager.preventDefault = captures;
    });
}

import type Phaser from "phaser";

/** Share Phaser's scaled DOM container without overriding a view's flex layout. */
export function mountSceneView(scene: Phaser.Scene, element: HTMLElement): void {
    const wrapper = document.createElement("div");
    wrapper.style.width = `${scene.scale.width}px`;
    wrapper.style.height = `${scene.scale.height}px`;
    wrapper.append(element);
    scene.add.dom(0, 0, wrapper).setOrigin(0, 0);
    // Captures persist across scenes; text fields and native buttons need defaults.
    const keyboard = scene.input.keyboard;
    const captures = keyboard?.manager.preventDefault ?? false;
    keyboard?.disableGlobalCapture();
    scene.events.once("shutdown", () => {
        if (keyboard) keyboard.manager.preventDefault = captures;
    });
}

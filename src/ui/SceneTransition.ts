import Phaser from "phaser";
import "./scene-transition.css";

const active = new WeakMap<Phaser.Game, () => void>();

/** Lives above the scene DOM so it survives shutdown and covers asynchronous preload. */
export function startSceneTransition(scene: Phaser.Scene, target: "ControlsScene" | "GameScene", data: object): void {
    const game = scene.game;
    active.get(game)?.();
    const destination = scene.scene.get(target);
    const overlay = document.createElement("div");
    overlay.className = "scene-transition";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.innerHTML = `<div class="scene-transition-panel"><span class="scene-transition-brand">BERZERK<span>_</span></span>
        <p></p><div class="scene-transition-track"><span></span></div></div>`;
    overlay.querySelector("p")!.textContent = target === "GameScene" ? "Preparando la habitación…" : "Preparando los controles…";
    const progress = overlay.querySelector<HTMLElement>(".scene-transition-track span")!;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let firstFrame = 0;
    let nextFrame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const loaded = (value: number) => { progress.style.width = `${Math.round(value * 100)}%`; };
    const dispose = () => {
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(firstFrame); cancelAnimationFrame(nextFrame);
        clearTimeout(timer);
        destination.events.off(Phaser.Scenes.Events.CREATE, ready);
        destination.load.off(Phaser.Loader.Events.PROGRESS, loaded);
        game.events.off(Phaser.Core.Events.POST_RENDER, rendered);
        game.events.off(Phaser.Core.Events.DESTROY, dispose);
        overlay.remove();
        if (active.get(game) === dispose) active.delete(game);
    };
    const rendered = () => {
        // Let the destination canvas and its DOM paint before revealing them.
        nextFrame = requestAnimationFrame(() => {
            if (disposed) return;
            loaded(1);
            overlay.classList.add("is-ready");
            timer = setTimeout(dispose, reducedMotion ? 0 : 240);
        });
    };
    const ready = () => {
        destination.load.off(Phaser.Loader.Events.PROGRESS, loaded);
        game.events.once(Phaser.Core.Events.POST_RENDER, rendered);
    };
    active.set(game, dispose);
    game.events.once(Phaser.Core.Events.DESTROY, dispose);
    destination.events.once(Phaser.Scenes.Events.CREATE, ready);
    destination.load.on(Phaser.Loader.Events.PROGRESS, loaded);
    document.body.append(overlay);
    // Paint the loading panel before synchronous scene setup or asset work begins.
    firstFrame = requestAnimationFrame(() => {
        nextFrame = requestAnimationFrame(() => { if (!disposed) scene.scene.start(target, data); });
    });
}

import { loadIllustration } from "./VisualAssetCache";
import { storyActors, type StoryActorConfig } from "./StoryActorConfig";
import type { NarrativeEntry, StoryPosition } from "./NarrativeTypes";

type ActorEntry = Extract<NarrativeEntry, { type: "actor" }>;
type Actor = { node: HTMLCanvasElement; config: StoryActorConfig; image: HTMLImageElement | null;
    animation: string; elapsed: number; frame: number; settled: boolean };
const props: Record<string, string> = {
    "birthday-cake": "assets/story/alex/objects/birthday-cake.png",
    "birthday-cake-unlit": "assets/story/alex/objects/birthday-cake-unlit.png"
};

/** Presentation only: no physics, gameplay timers, or changes to source PNGs. */
export class StoryStageManager {
    private readonly actors = new Map<string, Actor>();
    private readonly objects = new Map<string, HTMLImageElement>();
    private readonly animations = new Set<Animation>();
    private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    private disposed = false;
    private readonly host: HTMLElement;
    private readonly report: (message: string) => void;
    constructor(host: HTMLElement, report: (message: string) => void) { this.host = host; this.report = report; }

    showActor(entry: ActorEntry, restoring = false): void {
        const config = Object.hasOwn(storyActors, entry.id) ? storyActors[entry.id] : undefined;
        if (!config || !Object.hasOwn(config.animations, entry.animation)) {
            this.report(`Animación no disponible: ${entry.id} / ${entry.animation}.`); return;
        }
        let actor = this.actors.get(entry.id);
        if (!actor) {
            const node = document.createElement("canvas");
            node.width = config.layout.width; node.height = config.layout.height;
            node.className = "vn-story-actor"; node.dataset.actor = entry.id;
            node.setAttribute("role", "img"); node.setAttribute("aria-label", config.name);
            actor = { node, config, image: null, animation: entry.animation, elapsed: 0, frame: -1, settled: false };
            this.actors.set(entry.id, actor); this.host.append(node);
            const target = actor;
            void loadIllustration(config.src).then(image => {
                if (this.disposed || this.actors.get(entry.id) !== target) return;
                target.image = image; this.draw(target, 0);
            }).catch(() => {
                if (this.disposed || this.actors.get(entry.id) !== target) return;
                // A later actor event can retry instead of keeping an empty cached node.
                this.hideActor(entry.id); this.report(`No se pudo cargar: ${config.name}.`);
            });
        }
        // A restored movement has already happened. Restore the destination, never replay it.
        for (const animation of actor.node.getAnimations()) animation.cancel();
        const end = entry.moveTo ?? entry;
        this.position(actor.node, restoring ? { ...entry, x: end.x, y: end.y } : entry);
        actor.animation = entry.animation; actor.elapsed = 0; actor.frame = -1;
        actor.settled = !!entry.moveTo;
        actor.node.dataset.animation = entry.animation;
        this.draw(actor, 0);
        if (entry.moveTo) {
            actor.node.style.left = `${end.x}%`; actor.node.style.top = `${end.y}%`;
            if (!restoring && !this.reducedMotion) this.track(actor.node.animate([
                { left: `${entry.x}%`, top: `${entry.y}%` }, { left: `${end.x}%`, top: `${end.y}%` }
            ], { duration: entry.moveTo.durationMs, easing: "linear" }));
            // End walking when the tween ends instead of walking forever in place.
            actor.elapsed = restoring || this.reducedMotion ? entry.moveTo.durationMs : 0;
            actor.node.dataset.moveDuration = String(entry.moveTo.durationMs);
        } else delete actor.node.dataset.moveDuration;
    }

    showProp(entry: Extract<NarrativeEntry, { type: "prop" }>): void {
        const src = Object.hasOwn(props, entry.key) ? props[entry.key] : undefined;
        if (!src) { this.report(`Objeto no disponible: ${entry.key}.`); return; }
        let node = this.objects.get(entry.id);
        if (!node) {
            node = document.createElement("img"); node.className = "vn-story-prop";
            node.dataset.prop = entry.id; node.alt = "Pastel de cumpleaños";
            this.objects.set(entry.id, node); this.host.append(node);
        }
        node.src = src; this.position(node, entry);
        node.onerror = () => { if (!this.disposed) this.report(`No se pudo cargar el objeto: ${entry.key}.`); };
    }

    private position(node: HTMLElement, position: StoryPosition): void {
        node.style.left = `${position.x}%`; node.style.top = `${position.y}%`;
        node.style.width = `${position.width ?? 10}%`;
    }
    hideActor(id: string): void {
        const actor = this.actors.get(id);
        if (actor) { for (const animation of actor.node.getAnimations()) animation.cancel(); actor.node.remove(); }
        this.actors.delete(id);
    }
    hideProp(id: string): void {
        const node = this.objects.get(id); if (node) { node.onerror = null; node.remove(); }
        this.objects.delete(id);
    }
    update(delta: number): void {
        if (this.disposed || !Number.isFinite(delta) || delta < 0) return;
        for (const actor of this.actors.values()) {
            actor.elapsed += delta;
            const moveDuration = Number(actor.node.dataset.moveDuration);
            if (actor.settled && actor.elapsed >= moveDuration) {
                actor.animation = "idle"; actor.elapsed = 0; actor.frame = -1; actor.settled = false;
                actor.node.dataset.animation = "idle";
            }
            const animation = actor.config.animations[actor.animation]!;
            const n = this.reducedMotion ? 0 : Math.floor(actor.elapsed * animation.frameRate / 1000);
            const index = animation.repeat ? n % animation.frames.length : Math.min(n, animation.frames.length - 1);
            if (actor.frame !== index) this.draw(actor, index);
        }
    }
    private draw(actor: Actor, index: number): void {
        if (!actor.image) return;
        const context = actor.node.getContext("2d");
        const config = actor.config;
        const frame = config.frames[config.animations[actor.animation]!.frames[index]!]!;
        if (!context || !frame) return;
        const { x, y, width, height } = frame.crop;
        context.clearRect(0, 0, actor.node.width, actor.node.height);
        context.imageSmoothingEnabled = false;
        context.drawImage(actor.image, x, y, width, height,
            config.layout.centerX - frame.anchorX + x, config.layout.groundY - frame.groundY + y, width, height);
        actor.frame = index;
        actor.node.dataset.frame = config.animations[actor.animation]!.frames[index]!;
    }
    cue(entry: Extract<NarrativeEntry, { type: "cue" }>): void {
        if (this.disposed || this.reducedMotion) return;
        if (entry.effect === "shake") this.track(this.host.parentElement!.animate([
            { transform: "translateX(0)" }, { transform: "translateX(-6px)" },
            { transform: "translateX(5px)" }, { transform: "translateX(-3px)" }, { transform: "translateX(0)" }
        ], { duration: entry.durationMs ?? 350 }));
        else {
            const flash = document.createElement("div"); flash.className = "vn-story-flash"; this.host.append(flash);
            this.track(flash.animate([{ opacity: .35 }, { opacity: 0 }], { duration: entry.durationMs ?? 150 }), () => flash.remove());
        }
    }
    private track(animation: Animation, complete?: () => void): void {
        this.animations.add(animation);
        animation.finished.then(() => { this.animations.delete(animation); complete?.(); }).catch(() => { this.animations.delete(animation); complete?.(); });
    }
    destroy(): void {
        this.disposed = true;
        for (const animation of this.animations) animation.cancel();
        this.animations.clear();
        for (const id of this.actors.keys()) this.hideActor(id);
        for (const id of this.objects.keys()) this.hideProp(id);
        this.host.replaceChildren();
    }
}

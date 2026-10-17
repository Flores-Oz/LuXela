import { narrativePortraits, NarrativeConfig, type PortraitAsset } from "../config/NarrativeConfig";
import type { PortraitPosition } from "./NarrativeTypes";

export class CharacterPortraitManager {
    private readonly portraits = new Map<string, HTMLElement>();
    private readonly animations = new Set<Animation>();
    private speaker = "";
    private readonly host: HTMLElement;
    private readonly report: (message: string) => void;
    private readonly assets: Record<string, PortraitAsset>;
    constructor(host: HTMLElement, report: (message: string) => void,
        assets: Record<string, PortraitAsset> = narrativePortraits) { this.host = host; this.report = report; this.assets = assets; }

    show(character: string, expression: string, position: PortraitPosition, fade = true): void {
        const existing = this.portraits.get(character);
        const node = existing ?? document.createElement("figure");
        node.className = `vn-portrait vn-${position}`;
        node.dataset.character = character;
        node.dataset.expression = expression;
        node.replaceChildren();
        const asset = Object.hasOwn(this.assets, character) ? this.assets[character] : undefined;
        const caption = document.createElement("figcaption");
        caption.textContent = asset?.name ?? character;
        const desired = asset && Object.hasOwn(asset.expressions, expression) ? asset.expressions[expression] : undefined;
        const source = desired ?? asset?.expressions.neutral;
        if (source) {
            const image = document.createElement("img");
            image.alt = asset?.name ?? character;
            image.src = source;
            image.onerror = () => { image.hidden = true; caption.textContent = `${asset?.name ?? character} · retrato no disponible`; };
            node.append(image);
            if (!desired) {
                caption.textContent += ` · ${expression} no disponible; neutral`;
                this.report(`Expresión ${expression} de ${asset?.name ?? character}: se reutiliza neutral.`);
            }
        } else {
            node.classList.add("vn-portrait-missing");
            caption.textContent += " · retrato no disponible";
            this.report(`Retrato no disponible: ${character}.`);
        }
        node.append(caption);
        this.portraits.set(character, node);
        if (!existing) {
            this.host.append(node);
            if (fade) this.animate(node, [{ opacity: 0 }, { opacity: 1 }]);
        }
        this.highlight(this.speaker);
    }
    hide(character: string, fade = true): void {
        const node = this.portraits.get(character);
        if (!node) return;
        this.portraits.delete(character);
        if (!fade) { node.remove(); return; }
        this.animate(node, [{ opacity: 1 }, { opacity: 0 }], () => node.remove());
    }
    highlight(speaker: string): void {
        this.speaker = speaker;
        for (const [id, node] of this.portraits) {
            const name = this.assets[id]?.name ?? id;
            node.classList.toggle("is-speaking", id === speaker || name.toLowerCase() === speaker.toLowerCase());
        }
    }
    private animate(node: HTMLElement, frames: Keyframe[], complete?: () => void): void {
        const animation = node.animate(frames, { duration: NarrativeConfig.transitionMs });
        this.animations.add(animation);
        animation.finished.then(() => { this.animations.delete(animation); complete?.(); }).catch(() => {});
    }
    destroy(): void {
        for (const animation of this.animations) animation.cancel();
        this.animations.clear();
        for (const image of this.host.querySelectorAll("img")) image.onerror = null;
        this.host.replaceChildren(); this.portraits.clear();
    }
}

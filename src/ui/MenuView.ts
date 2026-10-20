import { applyUITheme } from "../config/UITheme";
import "./presentation.css";

export interface MenuAction { label: string; action: () => void; primary?: boolean }
/** Native focus, arrows, Enter/Space and pointer share the same actions. */
export class MenuView {
    readonly element = document.createElement("section");
    private readonly events = new AbortController();
    constructor(options: { kind: "main" | "pause" | "completion"; eyebrow: string; title: string; subtitle: string; actions: MenuAction[]; portrait?: { src: string; name: string } }) {
        const root = this.element;
        root.className = `presentation-screen ${options.kind}-screen`;
        root.setAttribute("aria-label", options.title);
        applyUITheme(root);
        root.innerHTML = `<div class="presentation-background"></div><div class="presentation-shade"></div>
            <header class="presentation-brand">BERZERK<span>_</span></header>
            <main class="presentation-panel"><p class="presentation-eyebrow"></p><h1></h1><p class="presentation-subtitle"></p>
                <nav class="presentation-actions" aria-label="Opciones"></nav></main>
            <footer class="presentation-footer">ALEX / LUA <span>ARCADE · UN IMPACTO</span></footer>`;
        root.querySelector(".presentation-eyebrow")!.textContent = options.eyebrow;
        root.querySelector("h1")!.textContent = options.title;
        root.querySelector(".presentation-subtitle")!.textContent = options.subtitle;
        if (options.portrait) {
            const image = document.createElement("img");
            image.className = "presentation-portrait";
            image.src = options.portrait.src;
            image.alt = options.portrait.name;
            image.onerror = () => { image.hidden = true; root.querySelector(".presentation-subtitle")!.textContent = `Ilustración no disponible: ${options.portrait!.name}.`; };
            root.querySelector(".presentation-shade")!.before(image);
        }
        const nav = root.querySelector("nav")!;
        for (const entry of options.actions) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = entry.label;
            if (entry.primary) button.className = "is-primary";
            button.addEventListener("click", entry.action, { signal: this.events.signal });
            nav.append(button);
        }
        root.addEventListener("keydown", event => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const buttons = [...nav.querySelectorAll("button")];
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
            const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 :
                (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
            buttons[next]?.focus();
        }, { signal: this.events.signal });
    }
    focus(): void { this.element.querySelector("button")?.focus({ preventScroll: true }); }
    destroy(): void { this.events.abort(); for (const image of this.element.querySelectorAll("img")) image.onerror = null; }
}

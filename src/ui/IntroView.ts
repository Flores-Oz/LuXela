import { characters, type PlayerCharacter } from "../config/characters";
import type { DialogueManager } from "../dialogue/DialogueManager";
import "./intro.css";

type IntroActions = { advance: () => void; skip: () => void };

export class IntroView {
    readonly element = document.createElement("section");
    private readonly events = new AbortController();
    private readonly heldKeys = new Set<string>();

    constructor(character: PlayerCharacter, provisional: boolean, actions: IntroActions) {
        const config = characters[character];
        const root = this.element;
        root.className = "intro-screen";
        root.style.setProperty("--intro-accent", config.accent);
        root.setAttribute("aria-label", "Introducción narrativa");
        root.innerHTML = `
            <header class="intro-header"><span>BERZERK<span class="intro-underscore">_</span></span>
                <span class="intro-draft">${provisional ? "INTRODUCCIÓN PROVISIONAL" : "INTRODUCCIÓN"}</span></header>
            <div class="intro-stage">
                <div class="intro-transmission"><p class="intro-eyebrow">ENLACE DE ENTRADA / 01</p>
                    <h1>Antes de<br>cruzar.</h1><p class="intro-stage-caption">Una señal.<br>La próxima habitación.</p>
                    <span class="intro-online">● TRANSMISIÓN ACTIVA</span>
                </div>
                <div class="intro-character"><img src="${config.selectorPath}" alt="${config.name}" draggable="false">
                    <span>${config.name.toUpperCase()} <small>PERSONAJE SELECCIONADO</small></span></div>
            </div>
            <div class="intro-dialogue" aria-live="polite" aria-atomic="true">
                <div class="intro-portrait"><span aria-hidden="true">TX</span><img alt="" hidden></div>
                <div class="intro-content"><div class="intro-line-header"><strong class="intro-speaker"></strong><span class="intro-progress"></span></div>
                    <p class="intro-text"></p></div>
            </div>
            <footer class="intro-footer"><div><span>ENTER / ESPACIO · avanzar</span><span>ESC · omitir introducción</span></div>
                <button class="intro-skip" type="button">OMITIR INTRO</button>
                <button class="intro-next" type="button">CONTINUAR →</button></footer>`;

        const options = { signal: this.events.signal };
        const next = root.querySelector<HTMLButtonElement>(".intro-next")!;
        const skip = root.querySelector<HTMLButtonElement>(".intro-skip")!;
        next.addEventListener("click", event => { if (event.detail <= 1) actions.advance(); }, options);
        skip.addEventListener("click", () => actions.skip(), options);
        root.addEventListener("keydown", event => {
            if (!["Enter", " ", "Escape"].includes(event.key)) return;
            // Prevent the button's default click from advancing a second line.
            event.preventDefault();
            if (event.repeat || this.heldKeys.has(event.code)) return;
            this.heldKeys.add(event.code);
            if (event.key === "Escape" || event.target === skip) actions.skip();
            else actions.advance();
        }, options);
        root.addEventListener("keyup", event => this.heldKeys.delete(event.code), options);
        window.addEventListener("blur", () => this.heldKeys.clear(), options);
    }

    render(dialogue: DialogueManager): void {
        const entry = dialogue.current;
        if (!entry) return;
        this.element.querySelector(".intro-speaker")!.textContent = entry.speaker;
        this.element.querySelector(".intro-text")!.textContent = entry.text;
        this.element.querySelector(".intro-progress")!.textContent = `${String(dialogue.position + 1).padStart(2, "0")} / ${String(dialogue.total).padStart(2, "0")}`;
        this.element.querySelector(".intro-next")!.textContent = dialogue.position === dialogue.total - 1 ? "ENTRAR →" : "CONTINUAR →";
        const portrait = this.element.querySelector<HTMLImageElement>(".intro-portrait img")!;
        const character = entry.portraitKey === "alex" || entry.portraitKey === "lua" ? entry.portraitKey : null;
        portrait.hidden = !character;
        this.element.querySelector<HTMLElement>(".intro-portrait span")!.hidden = !!character;
        if (character) {
            portrait.src = characters[character].selectorPath;
            portrait.alt = characters[character].name;
        }
    }

    focus(): void { this.element.querySelector<HTMLButtonElement>(".intro-next")!.focus({ preventScroll: true }); }

    destroy(): void {
        this.events.abort();
        this.heldKeys.clear();
    }
}

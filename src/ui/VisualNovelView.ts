import { characters, type PlayerCharacter } from "../config/characters";
import type { NarrativeSequenceRunner } from "../narrative/NarrativeSequenceRunner";
import "./visual-novel.css";

type IntroActions = { advance: () => void; skip: () => void; back: () => void };

export class VisualNovelView {
    readonly element = document.createElement("section");
    private readonly events = new AbortController();
    private readonly heldKeys = new Set<string>();

    constructor(character: PlayerCharacter, provisional: boolean, actions: IntroActions) {
        const config = characters[character];
        const root = this.element;
        root.className = "intro-screen";
        root.style.setProperty("--intro-accent", config.accent);
        root.setAttribute("aria-label", "Presentación narrativa");
        root.innerHTML = `
            <header class="intro-header"><span>BERZERK<span class="intro-underscore">_</span></span>
                <span class="intro-draft">${provisional ? "SECUENCIA DE PRUEBA · PROVISIONAL" : "PRESENTACIÓN NARRATIVA"}</span></header>
            <div class="intro-stage">
                <div class="vn-background"></div><div class="vn-story-layer"></div><div class="vn-portraits"></div>
                <span class="vn-route">RUTA ${config.name.toUpperCase()}</span>
            </div>
            <div class="intro-dialogue">
                <div class="intro-content"><div class="intro-line-header"><strong class="intro-speaker"></strong><span class="intro-progress"></span></div>
                    <p class="intro-text" aria-hidden="true"></p><p class="vn-announcement" role="status" aria-live="polite"></p></div>
                <span class="vn-advance-indicator" aria-hidden="true" hidden></span>
            </div>
            <div class="vn-status"><span class="vn-notice" role="status"></span><span class="vn-save-note"></span></div>
            <footer class="intro-footer"><div><span>ENTER / ESPACIO · completar / avanzar</span><span>ESC · omitir secuencia</span></div>
                <button class="vn-back intro-skip" type="button">VOLVER</button>
                <button class="intro-skip vn-skip" type="button">OMITIR</button>
                <button class="intro-next" type="button">CONTINUAR →</button></footer>`;

        const options = { signal: this.events.signal };
        const next = root.querySelector<HTMLButtonElement>(".intro-next")!;
        const skip = root.querySelector<HTMLButtonElement>(".vn-skip")!;
        const back = root.querySelector<HTMLButtonElement>(".vn-back")!;
        next.addEventListener("click", event => { if (event.detail <= 1) actions.advance(); }, options);
        skip.addEventListener("click", () => actions.skip(), options);
        back.addEventListener("click", () => actions.back(), options);
        root.addEventListener("keydown", event => {
            if (!["Enter", " ", "Escape"].includes(event.key)) return;
            // Prevent the button's default click from advancing a second line.
            event.preventDefault();
            if (event.repeat || this.heldKeys.has(event.code)) return;
            this.heldKeys.add(event.code);
            if (event.key === "Escape" || event.target === skip) actions.skip();
            else if (event.target === back) actions.back();
            else actions.advance();
        }, options);
        root.addEventListener("keyup", event => this.heldKeys.delete(event.code), options);
        window.addEventListener("blur", () => this.heldKeys.clear(), options);
    }

    render(runner: NarrativeSequenceRunner): void {
        const dialogue = runner.dialogue;
        const entry = dialogue?.current;
        this.element.querySelector<HTMLElement>(".vn-advance-indicator")!.hidden = !entry || dialogue!.isTyping || runner.isComplete;
        if (!entry) return;
        this.element.querySelector(".intro-speaker")!.textContent = entry.speaker;
        this.element.querySelector(".intro-text")!.textContent = dialogue.visibleText;
        const announcement = this.element.querySelector(".vn-announcement")!;
        if (announcement.textContent !== `${entry.speaker}: ${entry.text}`) announcement.textContent = `${entry.speaker}: ${entry.text}`;
        this.element.querySelector(".intro-progress")!.textContent = `${String(runner.dialogueNumber).padStart(2, "0")} / ${String(runner.dialogueTotal).padStart(2, "0")}`;
        this.element.querySelector(".intro-next")!.textContent = dialogue.isTyping ? "COMPLETAR ▸" : runner.dialogueNumber === runner.dialogueTotal ? "CONTINUAR →" : "CONTINUAR ▸";
    }

    notice(message: string): void { this.element.querySelector(".vn-notice")!.textContent = message; }
    storageStatus(status: string): void {
        this.element.querySelector(".vn-save-note")!.textContent = status === "unavailable"
            ? "Guardado no disponible: progreso temporal en esta sesión."
            : status === "corrupt" ? "Progreso narrativo inválido: se inicia desde un punto seguro." : "";
    }

    focus(): void { this.element.querySelector<HTMLButtonElement>(".intro-next")!.focus({ preventScroll: true }); }

    destroy(): void {
        this.events.abort();
        this.heldKeys.clear();
    }
}

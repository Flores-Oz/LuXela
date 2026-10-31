import { characters, type PlayerCharacter } from "../config/characters";
import { SpecialAbilityConfig } from "../config/SpecialAbilityConfig";
import "./controls.css";

/** Native buttons and semantic keycaps remain readable at every game resolution. */
export class ControlsView {
    readonly element = document.createElement("section");
    private readonly events = new AbortController();

    constructor(character: PlayerCharacter, start: () => void) {
        const config = characters[character];
        const root = this.element;
        root.className = "controls-screen";
        root.setAttribute("aria-labelledby", "controls-title");
        root.style.setProperty("--character-accent", config.accent);
        root.innerHTML = `
            <main class="controls-panel">
                <header><p class="controls-eyebrow">BERZERK / PREPARACIÓN</p>
                    <h1 id="controls-title">Antes de entrar</h1>
                    <p class="controls-subtitle">Estos son tus controles. Muévete y dispara en direcciones independientes.</p></header>
                <div class="controls-grid">
                    <article><div class="controls-keys" aria-label="W, A, S, D"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></div>
                        <h2>Moverse</h2><p>Combina las teclas para desplazarte en diagonal y esquivar.</p></article>
                    <article><div class="controls-keys" aria-label="Flechas del teclado"><kbd>↑</kbd><span><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span></div>
                        <h2>Disparar</h2><p>Mantén las flechas para disparar. Combínalas para apuntar en diagonal.</p></article>
                    <article class="controls-special"><div class="controls-keys"><kbd>Q</kbd></div>
                        <h2></h2><p></p></article>
                    <article><div class="controls-keys"><kbd class="controls-wide-key">ESC</kbd></div>
                        <h2>Pausa</h2><p>Detén la partida para continuar, reiniciar o volver al menú.</p></article>
                </div>
                <p class="controls-tip"><strong>Un impacto puede ser fatal.</strong> Usa las coberturas y elimina a todos los enemigos y oleadas para desbloquear la salida.</p>
                <footer><span class="controls-route"></span><button type="button" class="controls-start">COMENZAR NIVEL <span aria-hidden="true">→</span></button></footer>
            </main>`;
        root.querySelector(".controls-special h2")!.textContent = config.abilityName;
        root.querySelector(".controls-special p")!.textContent = `Elimina ${SpecialAbilityConfig[character].killsRequired} enemigos para cargar tu habilidad. Pulsa Q cuando el HUD indique que está lista.`;
        root.querySelector(".controls-route")!.textContent = `TODO LISTO, ${config.name.toUpperCase()}`;
        const button = root.querySelector<HTMLButtonElement>(".controls-start")!;
        button.addEventListener("click", () => {
            if (button.disabled) return;
            button.disabled = true;
            start();
        }, { signal: this.events.signal });
        // A held Enter/Space from the final dialogue must not dismiss this screen.
        root.addEventListener("keydown", event => {
            if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
        }, { signal: this.events.signal });
    }

    focus(): void { this.element.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true }); }
    destroy(): void { this.events.abort(); }
}

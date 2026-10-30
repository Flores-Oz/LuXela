import { characters, type PlayerCharacter } from "../config/characters";
import { SpecialAbilityConfig } from "../config/SpecialAbilityConfig";
import type { CharacterUnlockService } from "../systems/CharacterUnlockService";
import "./character-select.css";

type SelectionActions = {
    select: (id: PlayerCharacter) => void;
    redeem: (code: string) => void;
    start: () => void;
    back: () => void;
};

export class CharacterSelectView {
    readonly element = document.createElement("section");
    private readonly events = new AbortController();

    constructor(actions: SelectionActions) {
        const root = this.element;
        root.className = "character-select";
        root.setAttribute("aria-label", "Selección de personajes");
        root.innerHTML = `
            <header class="select-header"><span class="select-brand"><span aria-hidden="true">◇</span> SELECCIÓN DE PERSONAJE</span>
                <button class="select-menu" type="button"><span aria-hidden="true">←</span> VOLVER AL MENÚ</button></header>
            <div class="select-heading"><p class="select-eyebrow">DOS PERSONAJES. DOS RUTAS.</p>
                <h1>Elige tu <span>historia.</span></h1><p>Una elección. Tu forma de entrar en combate.</p></div>
            <div class="select-cards" role="group" aria-label="Personajes">
                ${(["alex", "lua"] as const).map((id,index) => {
                    const config = characters[id];
                    const traits=id==='alex'?['Armamento Pesado','Estrategia','Supresión']:['Experimento','Energía','Descarga'];
                    const description=id==='alex'?'Impactos de energía sobre todos los robots de la sala.':'Una descarga eléctrica elimina a los robots de la sala.';
                    return `<button type="button" class="select-card" data-character="${id}"
                        style="--accent:${config.accent}" aria-pressed="false" aria-disabled="true">
                        <span class="card-stage">
                        <span class="card-header"><strong>${config.name.toUpperCase()}</strong><span class="card-state">BLOQUEADO</span></span>
                        <span class="card-traits">${traits.map(trait=>`<span>${trait}</span>`).join('')}</span>
                        <span class="card-number" aria-hidden="true">0${index+1}<small>RUTA<br>INDIVIDUAL</small></span>
                        <span class="card-portrait"><img src="${config.selectorPath}" alt="${config.name} con su ${id==='alex'?'gato':'perro'}" draggable="false">
                            <span class="card-lock" aria-hidden="true"><svg viewBox="0 0 32 36" width="32" height="36" fill="none">
                                <path d="M8 14V9a8 8 0 0 1 16 0v5M3 14h26v20H3z" stroke="currentColor" stroke-width="3"/>
                                <path d="M16 22v5" stroke="currentColor" stroke-width="3"/></svg></span>
                        </span>
                        </span>
                        <span class="card-footer"><span class="card-ability-icon"><img src="assets/ui/${id}-ability-icon.png" alt="" draggable="false"></span>
                            <span class="card-ability"><small>HABILIDAD · ${SpecialAbilityConfig.key}</small><span>${config.abilityName}</span></span>
                            <span class="card-description">${description}</span>
                            <span class="card-check" aria-hidden="true">✓</span></span>
                        <span class="card-charge">Se recarga con ${SpecialAbilityConfig[id].killsRequired} bajas</span>
                    </button>`;
                }).join("")}
            </div>
            <form class="select-code" novalidate>
                <span class="select-code-symbol" aria-hidden="true">⌘</span><label for="character-code">¿Tienes un código?<span>Desbloquea a Alex o Lua y comienza tu historia.</span></label>
                <input id="character-code" name="code" type="text" placeholder="INTRODUCE TU CÓDIGO"
                    maxlength="64" autocomplete="off" autocapitalize="characters" spellcheck="false">
                <button type="submit">DESBLOQUEAR <span>↗</span></button>
            </form>
            <div class="select-feedback"><p class="select-message" role="status" aria-live="polite">Introduce un código para desbloquear tu primer personaje.</p>
                <p class="select-warning" role="status" hidden></p></div>
            <footer class="select-bottom"><span><kbd>←</kbd> <kbd>→</kbd> Navegar <span>·</span> <kbd>Enter</kbd> Seleccionar <span>·</span> <kbd>Tab</kbd> Continuar</span>
                <button class="select-start" type="button" disabled>SELECCIONA UN PERSONAJE <span>→</span></button></footer>`;

        const options = { signal: this.events.signal };
        root.querySelector(".select-menu")!.addEventListener("click", actions.back, options);
        const cards = [...root.querySelectorAll<HTMLButtonElement>("[data-character]")];
        cards.forEach((card, index) => {
            card.addEventListener("click", () => actions.select(card.dataset.character as PlayerCharacter), options);
            card.addEventListener("keydown", event => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                cards[(index + 1) % cards.length]?.focus();
            }, options);
        });
        root.querySelector("form")!.addEventListener("submit", event => {
            event.preventDefault();
            actions.redeem(root.querySelector<HTMLInputElement>("input")!.value);
        }, options);
        root.querySelector(".select-start")!.addEventListener("click", actions.start, options);
    }

    render(service: CharacterUnlockService, selected: PlayerCharacter | null): void {
        for (const id of ["alex", "lua"] as const) {
            const card = this.element.querySelector<HTMLButtonElement>(`[data-character="${id}"]`)!;
            const unlocked = service.isUnlocked(id);
            card.classList.toggle("is-unlocked", unlocked);
            card.classList.toggle("is-selected", selected === id && unlocked);
            card.setAttribute("aria-disabled", String(!unlocked));
            card.setAttribute("aria-pressed", String(selected === id && unlocked));
            card.querySelector(".card-state")!.textContent = unlocked ? "DESBLOQUEADO" : "BLOQUEADO";
            card.querySelector(".card-check")!.textContent = selected === id&&unlocked ? "✓" : unlocked?"+":"";
        }
        const start = this.element.querySelector<HTMLButtonElement>(".select-start")!;
        start.disabled = !service.isUnlocked(selected);
        start.innerHTML = selected && service.isUnlocked(selected)
            ? `JUGAR CON ${characters[selected].name.toUpperCase()} <span>→</span>`
            : "SELECCIONA UN PERSONAJE <span>→</span>";
        const warning = this.element.querySelector<HTMLElement>(".select-warning")!;
        warning.hidden = service.storageStatus === "available";
        warning.textContent = service.storageStatus === "corrupt"
            ? "El progreso guardado no es válido. Vuelve a introducir tus códigos."
            : "No se puede guardar el progreso. Los desbloqueos durarán solo esta sesión.";
    }

    message(text: string, error = false): void {
        const message = this.element.querySelector<HTMLElement>(".select-message")!;
        message.textContent = text;
        message.classList.toggle("is-error", error);
    }

    clearCode(): void { this.element.querySelector<HTMLInputElement>("input")!.value = ""; }

    destroy(): void { this.events.abort(); }
}

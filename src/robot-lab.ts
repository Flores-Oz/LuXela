import Phaser from "phaser";
import "./robot-lab.css";
import { RobotLabScene, type LabMode } from "./scenes/RobotLabScene";
import { robotTypes, type RobotType } from "./config/RobotConfig";

const scene = new RobotLabScene();
const controls = document.querySelectorAll<HTMLButtonElement | HTMLSelectElement | HTMLInputElement>("button, select, input");
controls.forEach(control => { control.disabled = true; });
const names: Record<RobotType, string> = { "robot-red": "Rojo", "robot-blue": "Azul", "robot-yellow": "Amarillo", "robot-orange": "Naranja" };
const description = document.querySelector<HTMLElement>("#description")!;
const pause = document.querySelector<HTMLButtonElement>("#pause")!;
const mode = document.querySelector<HTMLSelectElement>("#mode")!;
const wall = document.querySelector<HTMLInputElement>("#wall")!;
const states: Record<string, string> = { IDLE: "En reposo", PATROL: "Patrullando", CHASE: "Acercándose para atacar", ATTACK_READY: "Apuntando y disparando", RETREAT: "Tomando distancia", BURST: "Ráfaga en curso", CHARGING: "Cargando · prepará la evasión", RECOVERY: "Recuperándose" };
const patterns: Record<RobotType, string> = {
    "robot-red": "Un disparo cada 1,5 s, a 300 px/s. Necesita una línea de tiro despejada.",
    "robot-blue": "Cinco disparos a 350 px/s, separados por 200 ms. Descansa 2 s y retrocede si te acercás. Una pared cancela la ráfaga.",
    "robot-yellow": "Persigue al doble de la velocidad base y dispara mientras camina, hasta 160 px. Proyectiles a 400 px/s, cada 0,8 s.",
    "robot-orange": "Carga visible de 1 s, seis proyectiles en abanico a 320 px/s y recuperación de 2,5 s. Atraviesa paredes interiores."
};
const refresh = () => {
    if (!scene.enemy) return;
    document.querySelector("#status")!.textContent = `${names[scene.robotType]} · ${scene.mode === "combat" ? states[scene.enemy.getState()] : "Vista de animación"}`;
    document.querySelector("#counts")!.textContent = `Disparos: ${scene.shots} · Impactos: ${scene.hits}`;
    description.textContent = scene.mode !== "combat" ? "Vista ampliada de los frames originales, sin proyectiles. Elegí Patrón de ataque para probar el comportamiento completo." : patterns[scene.robotType];
    pause.textContent = scene.scene.isPaused() ? "Continuar" : "Pausar";
};
scene.onChange = refresh;
scene.onReady = () => {
    controls.forEach(control => { control.disabled = false; });
    refresh();
};
document.querySelectorAll<HTMLButtonElement>("[data-robot]").forEach(button => {
    button.addEventListener("click", () => {
        const type = button.dataset.robot as RobotType;
        if (!robotTypes.includes(type)) return;
        document.querySelectorAll("[data-robot]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
        scene.configure(type, mode.value as LabMode);
    });
});
mode.addEventListener("change", () => scene.configure(scene.robotType, mode.value as LabMode));
wall.addEventListener("change", () => scene.setWall(wall.checked));
document.querySelector("#reset")!.addEventListener("click", () => scene.resetTest());
pause.addEventListener("click", () => {
    const paused = scene.scene.isPaused();
    if (paused) scene.scene.resume(); else scene.scene.pause();
    pause.textContent = paused ? "Pausar" : "Continuar";
});
export const robotLab = new Phaser.Game({ type: Phaser.AUTO, parent: "robot-arena", width: 960, height: 600, pixelArt: true,
    backgroundColor: "#18261f", scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } }, scene: [scene]
});

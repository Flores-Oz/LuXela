# Prueba aislada de jefes

Abrir `/bosses.html` con Vite. Enlaces directos:

- `/bosses.html?level=5&character=alex`
- `/bosses.html?level=11&character=lua`

La barra superior permite seleccionar cualquiera de los dos encuentros y Alex/Lua. Iniciar/reiniciar reconstruye exclusivamente esa arena. Se conservan la dificultad, teletransportes, invocaciones, muerte de un impacto, especiales por bajas y remate del juego real. Se omite la introducción para entrar directamente al combate.

Pausa con Esc; reintento y victoria ofrecen repetir el mismo jefe o cambiar al otro. Los desbloqueos de práctica viven en memoria y no alteran el almacenamiento de la campaña.

La página usa `GameScene` y Quimera existentes; `src/boss-lab.ts` adapta únicamente la entrada y navegación de práctica. `bosses.html` y `src/boss-lab.css` contienen los controles. `vite.config.ts` incluye la página en la compilación de producción.

El balance actual incluye más patrones para el primero y combos de cuatro etapas de ráfagas para el final. Desde su primera fase, el final tiene 144 de vida e invoca seis apoyos exclusivamente rojos, azules y naranjas, y repone la tanda cuando mueren todos. Se aplica también en campaña; ajustes y pruebas en `docs/sprint-13.md`.

Validación: `npm run build` y `node tests/run-boss-lab.mjs`. Las 23 comprobaciones de navegador aprobaron: entrada directa, teclado real, ambos encuentros/personajes, reinicio desde pausa, reintento tras muerte, victoria, cambio de jefe y almacenamiento intacto. Cero errores de consola. Informe y capturas examinadas en `docs/test-results/boss-lab/`.

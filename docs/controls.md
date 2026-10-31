# Pantalla de controles

Flujo de campaña: selección de personaje → introducción narrativa → controles → primer nivel.

La pantalla aparece al terminar u omitir la introducción inicial de Alex o Lua. No se intercala en las escenas posteriores, los reintentos ni las transiciones entre habitaciones. No inicia una partida hasta confirmar «Comenzar nivel»; conserva el personaje y los datos de destino de la narrativa.

Información mostrada:

- WASD: movimiento, incluidas diagonales.
- Flechas: disparo continuo y diagonal, independiente del movimiento.
- Q: Shoot Vent o Electro Dinamic según el personaje. El requisito de bajas se lee de `SpecialAbilityConfig`.
- Esc: pausa.
- Aviso de impactos y desbloqueo de salidas al completar las oleadas.

`ControlsScene` reutiliza el montaje DOM de las pantallas narrativas. `ControlsView` presenta tarjetas adaptables, controles nativos y un botón azul. La escena de combate permanece detenida mientras se lee. Los eventos se eliminan al salir y las repeticiones de Enter/Espacio no cierran la pantalla accidentalmente.

Los pasos historia → controles y controles → juego utilizan `SceneTransition`: un panel azul que permanece fuera de las escenas durante la carga. Muestra el progreso del cargador y se desvanece después de renderizar el destino. No carga imágenes adicionales y respeta la preferencia de movimiento reducido.

Validación: `npm run build` y `node tests/run-selection.mjs`. Este último recorre introducciones completadas/omitidas, ambos personajes, reintentos, guardado narrativo, teclado real y limpieza del DOM. Genera capturas y comprobaciones de distribución en 1280×800, 800×450 y 390×844 en `docs/test-results/controls/`.

`node tests/run-visual-handoff.mjs` comprueba la transición con un recurso sin caché y latencia de red simulada, la limpieza del panel y los 53 frames utilizados por las animaciones del nuevo robot rojo. Sus capturas e informe están en `docs/test-results/visual-handoff/`. La hoja roja de 887×1774 se adapta en memoria a frames de 64×64 con el mismo procedimiento de los demás colores; los PNG originales y las dimensiones de colisión se conservan.

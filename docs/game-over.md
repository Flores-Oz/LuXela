# Presentación de Game Over

`GameOverScene` utiliza el panel proporcionado en `public/assets/ui/game-over-panel.png`, sin modificar el PNG. `GameOverView` lo presenta con tres segmentos verticales para conservar las esquinas y adaptar el cuerpo del marco a pantallas estrechas.

La pantalla incluye el personaje derrotado de la ruta actual, nivel alcanzado, puntuación al perder y tres opciones: reintentar, cambiar personaje y volver al menú. Las poses se recortan desde los atlas de derrota existentes; mantienen el verde de Alex y amarillo de Lua, con controles comunes azules.

Durante la animación de derrota se solicita una captura del renderer. La imagen queda detrás del panel, oscurecida y congelada; el escenario y sus entidades se destruyen con la limpieza normal al pasar a Game Over. Si no hay una captura disponible, se usa el fondo azul oscuro. La captura se libera al abandonar Game Over y una captura tardía de una escena cerrada se descarta.

El panel se precarga durante la carga habitual de la partida. La entrada utiliza un fundido de 220 ms, respetando movimiento reducido. Las flechas arriba/abajo cambian de opción, Enter confirma y R reintenta directamente. Los eventos repetidos no cambian dos veces la selección ni activan varias transiciones. El reintento conserva la misma habitación, personaje e identidad de partida, restaurando su punto de control con el servicio existente.

Antes de los cambios se guardó y verificó la copia `backups.local/berzerk-before-game-over-20261030-231507.zip`, incluidos los cambios locales de navegación de robots y el nuevo recurso.

Verificación específica: `node tests/run-game-over.mjs`, con 26 comprobaciones aprobadas de ambos personajes, puntuación, reintento, captura y limpieza de recursos, acciones con teclado real y clic, y cinco tamaños: 1280×800, 1920×1080, 844×390, 390×844 y 360×640. Las capturas examinadas y el informe se encuentran en `docs/test-results/game-over/`.

La página de práctica de jefes conserva su menú propio de reintentos; esta presentación corresponde al Game Over de campaña.

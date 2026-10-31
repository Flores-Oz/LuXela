# Historia de Alex: el cumpleaños robado

Para reutilizar este proceso en la futura ruta de Lua, consultar [la guía de estilo y secuencias](lua-story-guide.md) y [la plantilla de planificación](templates/lua-story-plan.md). Su argumento continúa pendiente de definir.

## Flujo implementado

Selección de Alex → introducción de ocho escenas → controles → campaña existente (11 niveles) → destrucción final de Quimera → rescate y cumpleaños → Historia completada.

La introducción contiene 25 líneas y el epílogo 23. Se mantienen los IDs `alex_test` y `alex_ending` para no romper los puntos de entrada existentes; los capítulos cambian a `alex-birthday-v1` y `alex-birthday-ending-v1`, evitando reanudar índices del guion anterior.

El final solo acepta el resultado de una victoria real de `ArcadeRunService`. El primer encuentro con Quimera en el nivel 5 continúa hacia la segunda etapa sin reproducir el epílogo. Tanto completar como omitir el final llevan a la conclusión existente; salir de la historia libera actores, objetos y efectos. Lua mantiene su introducción y conclusión actuales.

## Archivos principales

- `src/narrative/routes/alex/testSequence.ts` y `ending.ts`: guiones y puesta en escena.
- `src/config/NarrativeConfig.ts`: registro de fondos.
- `src/narrative/NarrativeTypes.ts` y `NarrativeSequenceRunner.ts`: actores, objetos y efectos visuales; restauración del estado persistente sin repetir sacudidas, flashes o movimientos.
- `src/narrative/StoryActorConfig.ts`: 48 recortes de Kira; conserva PNG y alinea pies sobre canvas 128×128.
- `src/narrative/StoryStageManager.ts`: animación por fotogramas, caminar hasta un destino y quedar en reposo, objetos transparentes y limpieza de efectos. Respeta movimiento reducido.
- `src/narrative/BackgroundManager.ts` y `src/scenes/VisualNovelScene.ts`: conservar el fondo durante la carga siguiente y anticipar las próximas dos ilustraciones.
- `src/scenes/GameScene.ts` y `CompletionScene.ts`: epílogo de Alex después de la victoria final y conclusión personalizada.
- `src/ui/VisualNovelView.ts` y `visual-novel.css`: capa de actores, pixel art y conservación de los controles existentes.

## Validación

- `npm.cmd run build`: TypeScript y producción correctos; continúa el aviso de tamaño del paquete Phaser.
- `node --test tests/*.test.mjs`: pruebas unitarias del proyecto, incluyendo guiones, atlas y restauración de actores/objetos.
- Suites de selección/narrativa, combate, habilidades, robots, remate y campaña/IA: informe `docs/test-results/alex-story/regressions.json`. Una recarga de desarrollo interrumpió el primer intento del remate; las suites afectadas pasaron al repetirlas sin ediciones simultáneas.
- `npm.cmd run test:story`: prueba de navegador específica: recorrido íntegro de introducción, controles y nivel 1; reanudación; rechazo de un final sin victoria; destrucción real del jefe final en una partida de prueba; epílogo completo y regreso al menú; aislamiento de Lua. Usa servicios en memoria, sin escribir guardados del jugador.
- Capturas de escritorio 1280×800 y móvil 390×844 en `docs/test-results/alex-story/`. Se inspeccionaron la cocina con Kira, versión móvil, regreso a la casa dañada, cierre y conclusión. La puesta en escena de Kira al regresar se ajustó para que el diálogo no lo oculte.

## Límites y pendientes

Las interacciones complejas (cocinar, captura, abrazo y comer) se representan con ilustraciones completas y transiciones. Los ciclos de Kira se usan en las escenas con fondo vacío; no se promete animación esquelética de las ilustraciones. No se añadieron archivos de música, voces ni efectos de audio porque no existen recursos de audio narrativo en el repositorio; permanecen como retoque final. El chihuahua queda preparado como recurso gráfico para una historia posterior de Lua. No se alteraron combate, niveles ni ataques.

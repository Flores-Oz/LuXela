# Sprint 7 — habitaciones, oleadas y preparación visual

## Fase 1 — inspección e integración

Se reutilizan Phaser 4.2.1, `LevelManager`, los cinco mapas de matrices, `RoomBuilder`, `EnemyManager`, `ArcadeRunService`, la física Arcade, línea de visión, proyectiles, pausa, derrota, selector, narrativa y conclusión existentes. El Sprint 6 está en el árbol de trabajo; sus cambios se conservan.

Incompatibilidades confirmadas: las habilidades usan cooldown temporal y comienzan listas; no hay carga por bajas. No existe la pantalla de controles mencionada como contexto. El ataque de Alex ya fue personalizado por el usuario: animación con impactos verdes en los enemigos y eliminación de la habitación. Se conservará ese ataque, no se sustituirá por disparos multidireccionales. No se añadirá una pantalla de controles, porque no forma parte de las tareas del Sprint 7.

Plan incremental: configuración de encuentros reutilizando los cinco mapas; administrador de oleadas con inicio diferido y aparición segura; puertas con estado; carga por eliminaciones y HUD; separación de gráficos y cuerpos con referencias para futuros Tilemaps; pruebas consolidadas y documentación. No se necesitan ocho escenarios ni un segundo sistema de combate. La carga inicial será 0/10, configurable por personaje. Reintentar una habitación reconstruida recuperará su checkpoint de puntuación y carga para impedir el farmeo de bajas.

Se verificará cada fase mediante compilación o pruebas aplicables. La autorización para este sprint no exige detenerse entre fases. Los recursos visuales definitivos, diálogos nuevos y jefes permanecen fuera del alcance.

## Resultado y configuración

Sprint implementado. Se conserva la secuencia de cinco habitaciones y se incorporan diez oleadas, 53 robots obligatorios y 5300 puntos posibles. No hay enemigos nuevos ni jefes. El daño continúa siendo letal de un solo impacto para jugador y robots comunes.

| Habitación | Distribución física reutilizada | Encuentro | Oleadas | Robots por oleada |
|---|---|---|---:|---|
| 1 | Abierta | normal | 1 | 3 |
| 2 | Corredores | multiwave | 2 | 4 + 4 |
| 3 | Mixta | special | 3 | 5 + 5 + 5 |
| 4 | Laberinto | normal | 1 | 6 |
| 5 | Arena | final | 3 | 7 + 7 + 7 |

Los parámetros de IA siguen siendo los del Sprint 6: velocidad 80/88/96/104/112 px/s, detección 180/192/204/216/228 px e intervalo de disparo 1400/1300/1200/1100/1000 ms. La dificultad adicional procede de las oleadas y de posiciones de refuerzo diferentes, no de daño o velocidades nuevas. Es un balance inicial configurable, pendiente de evaluación mediante partidas humanas.

## Fase 2 — configuración y progresión

`EncounterConfig` extiende el contrato existente con orden, tipo de encuentro, oleadas, siguiente habitación y salidas. `WaveConfig` define identidad, grupo de enemigos y condición de finalización. Los datos del catálogo aportan toda la secuencia, incluidos los enlaces y las posiciones de las puertas. `LevelManager` resuelve la siguiente habitación desde ese enlace y conserva la construcción de `Room`.

Para compatibilidad, las configuraciones antiguas con solo `enemies` se interpretan como una única oleada mediante `getWaves`. En el catálogo nuevo, `enemies` es una referencia al primer grupo, no una segunda lista de apariciones; el generador solo utiliza `waves`. El validador comprueba la correspondencia, todas las oleadas, posiciones, tipos, ids, enlaces, orden y salidas. Los metadatos parciales de encuentro se rechazan. Los mapas y grupos se validan antes de crear cuerpos.

Verificación intermedia: compilación y 37 pruebas de configuración aprobadas. No se sustituyeron las transiciones ni el estado de partida del Sprint 6.

## Fase 3 — oleadas y apariciones

`WaveManager` es independiente de Phaser. Mantiene estados `idle`, `starting`, `active`, `completed` y `stopped`; registra las identidades obligatorias por habitación/oleada/aparición y rechaza inicios y bajas repetidos. Una oleada nueva espera a la eliminación de todos los enemigos obligatorios de la anterior. Se emiten `WAVE_STARTED`, `WAVE_COMPLETED` y una única finalización real de habitación.

`EnemyManager` continúa administrando los cuerpos vivos. Su evento de grupo vacío se distingue ahora de `ROOM_CLEARED`, que solo corresponde al encuentro completo. Así, vaciar una oleada intermedia no abre las puertas ni registra la habitación como superada.

La preparación usa delta de escena, con 1000 ms entre oleadas. No se crean temporizadores de oleada externos: la pausa congela el avance y la muerte, el cambio de habitación o el cierre llaman a `stop`. Las animaciones de habilidades deben terminar antes de preparar los refuerzos, evitando que una descarga borre varias oleadas consecutivas.

`SpawnPlanner` calcula todas las posiciones antes de crear un robot. Prefiere las posiciones configuradas y, si el jugador las ocupa o está cerca, busca tiles transitables y alcanzables, separados entre sí y alejados al menos `max(2 tiles, detectionRange + 1 tile)` del jugador. Nunca usa paredes, salidas o el inicio original del jugador. Si no puede ubicar todo el grupo, no crea una parte: espera, muestra «LIBERA LA ZONA DE APARICIÓN» y reintenta. No genera mapas proceduralmente; solo resuelve posiciones seguras sobre el mapa existente.

Una oleada de cero enemigos termina sin recursión ni eventos duplicados; una lista vacía se resuelve inmediatamente en el administrador, mientras que un encuentro de catálogo debe declarar al menos una oleada, aunque sea vacía. Las configuraciones malformadas se rechazan antes de jugar.

Verificación intermedia: pruebas puras de secuencia, vacíos, duplicados, retrasos, suspensión, parada y ubicaciones seguras, además de compilación correcta. La batería final amplía esas comprobaciones.

## Fase 4 — encuentros y puertas

Los encuentros especiales y finales utilizan el mismo combate y administrador de oleadas. El HUD muestra su tipo y, al terminar, «SALIDA DISPONIBLE». No se añadió otro administrador de encuentros porque duplicaría esas responsabilidades.

`DoorController` controla los estados `locked`, `unlocked` y `transitioning`. El indicador temporal pasa de gris a verde y después amarillo. Las puertas solo permiten avanzar tras completar el encuentro. Un segundo intento durante la transición se rechaza. Se conserva el mecanismo de overlap y reconstrucción de escena existente, junto con la limpieza de cuerpos, proyectiles, input y referencias.

La apariencia es provisional. El trigger físico de salida mantiene su tamaño; el permiso de progresión depende del estado del encuentro, no del color ni de una textura.

Verificación intermedia: compilación correcta. La prueba final verifica puertas bloqueadas entre oleadas, desbloqueo único, transiciones repetidas, overlap real en primera y última habitación y estados visuales independientes.

## Fase 5 — habilidades e interfaz

Se eliminó el cooldown temporal de habilidades. `SpecialAbilityConfig` define `killsRequired: 10` por personaje. Una nueva partida comienza en 0/10; cada baja obligatoria válida suma una unidad hasta el máximo, sin contar dos veces la misma identidad. Activar consume la carga completa antes de la animación. No se acumulan usos adicionales más allá de una carga. Las bajas causadas por la propia habilidad cuentan normalmente para la siguiente carga.

`ArcadeRunService` conserva puntos y carga entre oleadas y habitaciones. Reintentar una habitación reconstruida recupera ambos valores de entrada: no conserva el beneficio de las bajas de un intento fallido. Un puente narrativo que reconstruya esa habitación sigue la misma regla. Reiniciar la partida o volver al menú descarta los contadores de la sesión. Pausar no los cambia.

Las duraciones de preparación, ataque y recuperación solo gobiernan animaciones; esperar no vuelve disponible una habilidad. La muerte y la transición cancelan los efectos sin reembolsar un uso consumido. Alex conserva la animación y los impactos verdes sobre los robots; Lua conserva la descarga eléctrica. Ambos atacan únicamente el grupo vivo de la oleada actual.

`GameHUD` reutiliza un objeto de texto y se actualiza por cambios de estado y redimensionamiento. Muestra habitación, oleada/total, enemigos restantes, puntos y carga real de habilidad, con avisos discretos. Alex usa verde suave y Lua amarillo. La disposición pasa a tres líneas en pantallas estrechas y la cámara reserva el área superior para mantener el escenario visible. No se recrean indicadores cada frame.

Verificación: pruebas puras de carga, consumo, límite, identidades, muerte, ausencia de recarga temporal y checkpoints; pruebas físicas de ambos ataques e input nativo de Q. Los fixtures de carga de las regresiones aisladas no sustituyen el recorrido integrado, donde la carga se obtiene eliminando robots obligatorios reales.

## Fase 6 — preparación visual para el Sprint 8

`RoomLayout` normaliza la matriz existente en piso, paredes, inicios, marcadores y puertas. `RoomPresentation` admite `scenarioId`, una clave futura de Tilemap y referencias a capas de piso, paredes, colisión y decoración. Son metadatos validados, no una carga de assets inexistentes.

`RoomRenderer` recibe el layout y esos metadatos. `GeometryRoomRenderer` mantiene la apariencia sencilla actual. `RoomBuilder` crea zonas físicas invisibles para paredes y triggers, separadas de los rectángulos visuales, y rechaza una segunda construcción con la misma instancia. Cambiar el renderer no cambia sus cuerpos ni las reglas de progresión.

La prueba con un renderer que no dibuja nada conserva cuerpos y oclusión por paredes; las puertas notifican sus tres estados sin desactivar su trigger. Las regresiones verifican colisión del jugador, robots y proyectiles, línea de visión y estabilidad tras cambiar de habitación. No se generaron ni añadieron texturas, Tilemaps, decoración, iluminación o parallax.

El Sprint 8 deberá aportar recursos y un renderer para las capas visuales definitivas. Si se importan colisiones desde un Tilemap, deberán transformarse al contrato físico de `RoomLayout`; la referencia reservada a esa capa todavía no es un parser ni una migración implementada. Ese trabajo no requiere rehacer la lógica de oleadas o `GameScene`.

## Fase 7 — finalización y pruebas

La quinta habitación exige sus tres oleadas y usar la salida. Solo entonces `ArcadeRunService` registra la victoria y se reutiliza `CompletionScene`, con la ruta correspondiente y acceso al menú o selector. La presentación toma el número de habitaciones del catálogo. No se escriben diálogos ni finales nuevos ni se modifica el progreso narrativo al ganar.

### Comandos y evidencia

```powershell
npm.cmd run build
npm.cmd run test:sprint7:unit
npm.cmd run test:sprint7:integration
npm.cmd run test:sprint7
git diff --check
```

Las pruebas de navegador requieren Vite en 5173 y una instancia dedicada de Edge/Chrome con CDP en 9224, igual que en los sprints anteriores. `TEST_BASE_URL` y `CDP_PORT` permiten cambiar esos valores. Los runners se ejecutan secuencialmente y las pruebas usan almacenamiento aislado.

| Suite | Comprobaciones |
|---|---:|
| Configuración, oleadas y carga por bajas | 62 |
| Selección, narrativa, persistencia y recursos | 147 |
| Combate y Game Over | 69 |
| Ataques especiales e input | 39 |
| Integración de rutas y 12 reinicios | 44 |
| Pausa y presentación | 58 |
| Mapas, dificultad y colisiones | 205 |
| Recorridos híbridos, puertas, checkpoints, renderer, teclado y tamaños | 350 |
| **Total** | **974** |

La compilación y todas las comprobaciones aprobaron, sin errores de consola. Se mantiene el aviso previo del bundle de Phaser mayor de 500 kB. Informe consolidado: `docs/test-results/sprint-7.json`. Detalle integrado: `docs/test-results/sprint-7-integration.json`. Sus fechas están expresadas en UTC.

La integración recorre las diez oleadas con Alex y Lua, valida 5300 puntos, carga real, identidad entre habitaciones, eliminaciones simultáneas, muerte del último robot mediante un proyectil físico, espera durante el especial, apariciones reubicadas cuando el jugador ocupa el punto previsto, bloqueo intermedio de puertas, consumo de victoria y limpieza. También comprueba morir durante la preparación del especial o entre oleadas, reintentar con el checkpoint correcto y reiniciar desde una habitación avanzada.

Escape, Enter y Q se prueban con eventos nativos. Q sin bajas no activa; con diez bajas sí activa; mantenerla pulsada no consume una segunda carga al obtener nuevas bajas. El HUD y el mapa completo se validan en 1920 × 1080, 1366 × 768, 800 × 600, 390 × 844 y 844 × 390.

Se inspeccionaron capturas de los HUD de Alex y Lua y la disposición móvil. La versión compilada arranca en Vite preview a 1920 × 1080, con canvas y menú completos, fondo cargado y sin errores de consola. Informe: `docs/test-results/sprint-7-production.json`. Es una comprobación del arranque de producción; la suite completa utiliza el servidor de desarrollo.

### Archivos creados en este sprint

- `src/levels/WaveConfig.ts`, `WaveManager.ts` y `SpawnPlanner.ts`.
- `src/world/DoorController.ts`, `RoomLayout.ts` y `RoomRenderer.ts`.
- `tests/ts-module.mjs`, `waves.test.mjs`, `special-charge.test.mjs`, `sprint-7.html`, `sprint-7.browser.js` y `run-sprint-7.mjs`.
- Este informe y los informes JSON del Sprint 7.

### Archivos modificados en este sprint

- Configuración y progresión: `src/levels/LevelConfig.ts`, `levels.ts`, `LevelManager.ts`, `validateLevelConfig.ts`; `src/scenes/GameScene.ts`; `src/systems/ArcadeRunService.ts`, `EnemyManager.ts` y `CombatEvents.ts`.
- Habilidades: `src/config/SpecialAbilityConfig.ts` y `src/abilities/SpecialAbility.ts`, `SpecialAbilityManager.ts`, `AlexSpecial.ts`, `LuaSpecial.ts`.
- Presentación y mapas: `src/ui/GameHUD.ts`, `src/world/RoomBuilder.ts`, `src/scenes/CompletionScene.ts`.
- Herramientas y regresiones: `package.json`, `tests/level-config.test.mjs`, `abilities.browser.js`, `run-abilities.mjs`, `combat.browser.js`, `sprint-4.browser.js`, `sprint-5.browser.js` y `run-all.mjs`; `pendiente.md`.

El árbol ya contenía el Sprint 6 sin commit antes de comenzar; se conservaron esos cambios. Los scripts npm de progresión/HUD/cierre del Sprint 6 ahora remiten a la validación vigente del Sprint 7; los fixtures y los informes antiguos se conservan como historial. El comando recomendado es `test:sprint7`.

### Errores y riesgos corregidos

- El grupo vacío ya no equivale a encuentro completado: se evita abrir una puerta después de una oleada intermedia.
- Las identidades incluyen la oleada, evitando perder puntuación o carga al reutilizar posiciones.
- El último robot registra puntos y carga antes de finalizar el encuentro.
- Los refuerzos se planifican completos y no aparecen sobre el jugador ni durante una descarga anterior.
- La muerte detiene la preparación pendiente; los reintentos no conservan beneficios de bajas de un intento fallido.
- Los triggers, las paredes físicas y los gráficos dejan de depender del mismo objeto visual.
- Se rechazan oleadas, enlaces, salidas y referencias visuales inconsistentes.
- Los listeners de observación de las pruebas se liberan entre reinicios para no confundir eventos duplicados del test con eventos del juego.

### Limitaciones y pendientes

La validación automatizada usa Edge/Canvas. No certifica WebGL, todos los dispositivos ni el balance mediante partidas humanas. En los escenarios de ciclo de vida se detiene la IA y se programan bajas para aislar las transiciones; otras suites sí ejercitan IA, física, proyectiles y colisiones. No se afirma haber completado manualmente una partida con combate libre.

No hay errores críticos conocidos introducidos por el sprint. Para el Sprint 8 quedan los recursos definitivos, renderizado de Tilemaps y capas, decoración y animaciones de puertas, manteniendo los contratos preparados. Los diálogos y audio definitivos continúan en `pendiente.md`. No se añadieron dependencias, guardado persistente, personajes, armas, poderes, jefes ni inventario.

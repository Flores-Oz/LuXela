# Sprint 6 — progresión de niveles y habitaciones

## Estado

Las siete etapas están completadas. La partida principal recorre cinco niveles con Alex o Lua, aumenta la dificultad, conserva la puntuación entre salas y muestra un HUD de nivel, puntos y enemigos restantes. La autorización del usuario para implementar todas las etapas pendientes sustituyó la solicitud de autorización entre las etapas 6 y 7.

## Arquitectura e integración prevista

El proyecto usa Phaser 4.2.1 y TypeScript. Se reutilizan `Room`, `RoomBuilder`, `EnemyConfig`, la IA y `LineOfSight`, `EnemyManager`, `ArcadeRunService`, la pausa y las escenas de derrota y conclusión. Los parámetros de movimiento, detección y disparo ya existen en `EnemyConfig`; no hace falta otro administrador de dificultad.

El catálogo describe los cinco niveles y `LevelManager` resuelve el nivel actual y el siguiente. `ArcadeRunService` conserva la identidad, el estado y la puntuación de partida, evitando duplicar esa responsabilidad. El cierre de los niveles de prueba reutiliza la presentación de conclusión, sin ejecutar el final narrativo. `GameHUD` presenta los tres indicadores solicitados.

## Etapa 2 — configuración tipada y validación

### Archivos

- `src/levels/LevelConfig.ts`: contrato de nivel con identificadores de nivel y mapa; cantidad, tipos y posiciones de robots; dificultad; condición de finalización y puntuación por baja. `LevelDifficulty` reutiliza los campos de `EnemyConfig`. Las posiciones usan fila y columna de tiles; el mapa conserva las posiciones iniciales del jugador y las salidas.
- `src/levels/validateLevelConfig.ts`: validación pura del catálogo y sus mapas, sin crear objetos de Phaser ni modificar los datos. `validateLevelCatalog` devuelve errores contextualizados; `assertValidLevelCatalog` lanza un error con todos los problemas para impedir una futura carga inválida.
- `tests/level-config.test.mjs`: pruebas de configuraciones válidas e inválidas usando fixtures exclusivos de pruebas. TypeScript se transpila en memoria con la dependencia ya instalada; no se generan archivos ni se necesita navegador.
- `package.json`: comando `npm.cmd run test:sprint6:config`.

### Validaciones

Se comprueban identificadores únicos, referencias a mapas propios del catálogo, matrices rectangulares y tiles conocidos, un único inicio de jugador, al menos una salida, correspondencia entre cantidad y posiciones de enemigos, tipos soportados y disponibles, ausencia de posiciones duplicadas, posiciones enteras dentro del mapa sobre suelo libre, parámetros finitos positivos y puntuaciones enteras no negativas. Solo está permitido el robot común existente y la condición `eliminate-all-enemies`.

Un recorrido por tiles transitables comprueba que las salidas y las apariciones de enemigos sean alcanzables desde el jugador. Se permite reutilizar un mapa en distintos niveles y utilizar sus marcadores antiguos de aparición como suelo. Los futuros niveles deberán crear enemigos desde sus configuraciones, evitando una segunda generación desde los marcadores del mapa.

### Verificación ejecutada

- `npm.cmd run test:sprint6:config`: **37 pruebas aprobadas**, ninguna fallida.
- `npm.cmd run build`: TypeScript y compilación de producción correctos. Se mantiene el aviso previo de tamaño del bundle de Phaser.
- `git diff --check`: correcto.

Se cumplen los criterios de S6-02 relativos a contratos tipados, definición mediante datos, validación reutilizable y detección de configuraciones inválidas. Las pruebas usan datos de ejemplo; no son los cinco niveles jugables de S6-03.

### Límites de esta etapa

No se han modificado `GameScene`, los mapas, la IA, la narrativa, las habilidades ni el HUD. El validador todavía no está conectado a la carga de habitaciones. La conectividad estática no certifica el balance, el recorrido con cuerpos físicos ni la ausencia de disparos injustos al aparecer; eso requiere las pruebas de las siguientes etapas. No se hicieron nuevas pruebas manuales ni de navegador para esta capa de datos.

## Etapa 3 — cinco niveles de prueba

### Archivos y cambios

- `src/data/rooms/arcadeRooms.ts`: cinco distribuciones de 15 × 11 tiles (960 × 704 píxeles usando tiles de 64), con paredes perimetrales, un inicio y una salida. Reutiliza los gráficos geométricos de `RoomBuilder` y no añade imágenes. No contiene marcadores de robots: las apariciones proceden exclusivamente de la configuración.
- `src/levels/levels.ts`: catálogo tipado con las cinco configuraciones, sus apariciones y 100 puntos por robot como dato para la etapa de puntuación. Los parámetros de IA permanecen en los valores existentes: velocidad 80, detección 200 y cooldown de disparo de 1000 ms, con patrulla habilitada. Su progresión corresponde a la etapa 4.
- `src/levels/LevelManager.ts`: valida el catálogo y resuelve configuraciones y objetos `Room` por índice. Cada carga copia la matriz para no contaminar cargas futuras. Rechaza índices y tamaños de tile inválidos. No duplica el estado de partida de `ArcadeRunService` ni implementa todavía transiciones.
- `tests/sprint-6-levels.html`, `tests/sprint-6-levels.browser.js` y `tests/run-sprint-6-levels.mjs`: carga aislada de los cinco niveles con ambos personajes mediante los recursos, animaciones, cuerpos físicos, `RoomBuilder`, `EnemyManager` y colisiones existentes. La página se sirve desde Vite en `/tests/sprint-6-levels.html`.
- `package.json`: comando `npm.cmd run test:sprint6:levels`; requiere Vite y un navegador dedicado con CDP, igual que las suites anteriores.

| Nivel | Mapa | Robots |
|---|---|---:|
| 1 | Habitación abierta con cobertura | 3 |
| 2 | Corredores | 4 |
| 3 | Distribución mixta | 5 |
| 4 | Laberinto | 6 |
| 5 | Arena de combate | 7 |

### Verificación ejecutada

- `npm.cmd run test:sprint6:config`: **37 pruebas aprobadas**.
- `npm.cmd run test:sprint6:levels`: **112 comprobaciones aprobadas**, sin errores de consola. Informe en `docs/test-results/sprint-6-stage-3.json`.
- `npm.cmd run build`: compilación correcta, con el aviso previo de tamaño del bundle.
- `git diff --check`: correcto.

El catálogo pasa la validación de conectividad para enemigos y salidas. Las cargas de Alex y Lua verifican las cantidades y posiciones, cuerpos fuera de paredes, robots fuera del rango inicial de detección, tamaño del mundo y salida, aislamiento de matrices, ausencia de cuerpos dinámicos y colliders acumulados, colisión real de un robot con el perímetro y oclusión de línea de visión por paredes. Se inspeccionaron capturas de los niveles 1, 4 y 5.

Se cumplen los criterios de S6-03 relativos a cinco niveles cargables, configuraciones correspondientes y apariciones válidas. La accesibilidad se comprueba por tiles; no se afirma haber completado manualmente las cinco habitaciones ni haber certificado su balance. La página de prueba mantiene la IA detenida al inspeccionar las apariciones y activa movimiento explícito en la comprobación de colisión. La progresión jugable, el combate de una partida completa y el resultado del quinto nivel corresponden a las etapas 4, 5 y 7.

Limitación visual previa detectada en esta etapa: `RoomBuilder` no dibujaba suelo en el tile `PlayerSpawn`. Se corrigió durante el cierre de la etapa 7 reutilizando el suelo existente, sin modificar la física.

## Etapa 4 — dificultad progresiva

### Cambios

`src/levels/levels.ts` define explícitamente los parámetros de cada nivel. Se reutiliza `EnemyConfig` y el constructor de `Enemy` sin modificar la IA, el movimiento del jugador, los proyectiles ni las reglas de muerte. No se añade `DifficultyManager` porque duplicaría la aplicación de los parámetros ya admitidos por `Enemy`.

| Nivel | Robots | Velocidad (px/s) | Detección (px) | Intervalo de disparo (ms) |
|---|---:|---:|---:|---:|
| 1 | 3 | 80 | 180 | 1400 |
| 2 | 4 | 88 | 192 | 1300 |
| 3 | 5 | 96 | 204 | 1200 |
| 4 | 6 | 104 | 216 | 1100 |
| 5 | 7 | 112 | 228 | 1000 |

La patrulla permanece habilitada en todos los niveles. El cambio por nivel es de +8 px/s, +12 px de detección y -100 ms entre disparos. El nivel inicial dispara con menor frecuencia que los valores originales; el último alcanza el intervalo original de 1000 ms. La velocidad máxima de los robots continúa por debajo de la velocidad de 220 px/s del jugador. Estos valores son un balance inicial configurable, no una certificación de dificultad justa mediante partidas humanas.

Se ampliaron `tests/sprint-6-levels.browser.js` y `tests/run-sprint-6-levels.mjs` con un modo de dificultad (`?difficulty`, `--difficulty`) y se añadió `npm.cmd run test:sprint6:difficulty` a `package.json`. El modo original de carga sigue disponible y su informe histórico permanece separado.

### Verificación ejecutada

- `npm.cmd run test:sprint6:difficulty`: **205 comprobaciones aprobadas**, sin errores de consola. Incluye las 112 comprobaciones de carga y 93 de progresión y comportamiento. Evidencia: `docs/test-results/sprint-6-stage-4.json`.
- `npm.cmd run build`: compilación correcta; persiste el aviso previo de tamaño del bundle.
- `git diff --check`: correcto.

Se verifican con Alex y Lua la progresión de parámetros, la velocidad física, los límites de detección, la dirección normalizada de disparo, el bloqueo de disparos antes del cooldown y su disponibilidad al cumplirse, la oclusión por paredes, la patrulla, la colisión real con paredes a las nuevas velocidades y la muerte por un impacto. También se comprueba que las apariciones originales queden fuera del rango inicial de detección en cada nivel.

Las llamadas a la IA usan el código real de `Enemy.updateBehavior` y tiempos controlados; la prueba no simula una partida completa ni impactos de proyectiles. La comprobación de muerte invoca los métodos existentes de jugador y robot. No se ha conectado todavía el catálogo a `GameScene`: esa integración y las transiciones se realizan en la etapa 5. No hay nuevos sistemas de combate, habilidades, contenido narrativo ni enemigos.

## Etapa 5 — progresión integrada y transiciones

### Archivos y comportamiento

- `src/scenes/GameScene.ts`: sustituye las dos salas incrustadas por `LevelManager`, carga un mapa independiente y crea los robots exclusivamente desde las posiciones y parámetros del nivel. Conserva la regla de despejar la habitación y pisar su salida. El último robot habilita la salida y elimina los proyectiles de ambos grupos. Al salir se cancelan los efectos activos, se detienen cuerpos y física, se restablecen las teclas y se limpian las balas antes de reconstruir la escena. Las guardas impiden más de una transición. Se conservan personaje, sesión y cooldown de la habilidad existente.
- `src/levels/LevelManager.ts`: `nextIndex` determina el siguiente nivel o devuelve `null` al terminar; no hay retorno circular al nivel inicial.
- `src/levels/levels.ts`: `isLevelIndex` ofrece una validación común del índice contra el catálogo.
- `src/systems/ArcadeRunService.ts`: toma el número de niveles del catálogo y registra el índice actual de la sesión. Solo permite completar o avanzar desde ese índice, reanudarlo con el personaje correspondiente y registrar una victoria tras despejar todos los niveles en orden. Un reintento conserva las habitaciones anteriores y reconstruye la actual, invalidando su despeje anterior. Una partida nueva o un intento de entrar mediante datos de escena sin una sesión correspondiente empieza en el nivel uno.
- `src/scenes/VisualNovelScene.ts`: solo sustituye las dos validaciones fijas `[0, 1]` por el catálogo. No cambia instrucciones, textos, guardado ni ejecución narrativa. El puente narrativo puede volver al nivel quinto con su sesión válida.
- `src/scenes/CompletionScene.ts`: muestra directamente «Niveles de prueba completados» y la ruta del personaje tras salir del quinto nivel. Reutiliza los botones y el overlay existentes con el fondo de menú; no se ejecutan finales narrativos ni se añaden nuevas escenas finales. Continúa exigiendo un resultado válido de sesión.
- `src/ui/presentation.css`: adapta el tamaño del título de conclusión para que el nuevo texto no se superponga con la ruta.
- `tests/sprint-6-progression.html`, `tests/sprint-6-progression.browser.js`, `tests/run-sprint-6-progression.mjs` y `package.json`: suite y comando `npm.cmd run test:sprint6:progression`.

`GameOverScene` y `PauseScene` ya transportaban el personaje, índice e identidad necesarios, por lo que no requirieron cambios. Reintentar tras morir vuelve a la habitación actual; «Reiniciar partida» desde pausa crea otra sesión desde el nivel uno. La puntuación y el nuevo HUD se mantienen fuera de esta etapa.

### Verificación ejecutada

- `npm.cmd run test:sprint6:config`: **37 pruebas aprobadas**.
- `npm.cmd run test:sprint6:progression`: **170 comprobaciones aprobadas**, sin errores de consola: 163 de integración, 2 de teclado nativo y 5 tamaños de pantalla. Informe en `docs/test-results/sprint-6-stage-5.json`.
- `npm.cmd run build`: compilación correcta, con el aviso previo de tamaño del bundle.
- `git diff --check`: correcto.

La suite recorre los cinco niveles con ambos personajes y verifica configuración, sesión y selección conservadas, salida bloqueada mientras quedan robots, una sola notificación del último enemigo, limpieza de proyectiles, destrucción de cuerpos anteriores, grupos nuevos vacíos de balas y cantidades estables de colliders y listeners. Se disparan proyectiles reales para eliminar al último robot de cada nivel y para provocar la muerte del jugador en el segundo; se reintenta esa habitación y se completa la ruta. Se ejercita la salida mediante overlap real en el primer y quinto nivel, y mediante solicitudes repetidas en los intermedios.

También se comprueban el puente narrativo al quinto nivel, la conclusión sin final narrativo, rechazo de resultados fabricados, consumo de victoria, ausencia de saltos de nivel mediante datos de escena, pausas repetidas, reinicio y regreso al menú. Las habilidades ya implementadas siguen despejando la habitación y conservando su cooldown al avanzar; sus efectos anteriores no alcanzan a los robots de la siguiente sala.

Escape y Enter se prueban con entrada nativa del navegador. La conclusión conserva título, ruta, subtítulo y botones sin superposiciones en 1920 × 1080, 1366 × 768, 800 × 600, 390 × 844 y 844 × 390.

### Límites y trabajo posterior

Las rutas se verifican automáticamente con la IA detenida en las comprobaciones de ciclo de vida y con bajas programadas para todos los enemigos salvo el último, que recibe un proyectil real. Esto no equivale a completar manualmente cinco niveles con combate libre ni certifica su balance. La IA y la dificultad tienen las pruebas separadas de la etapa 4. Las pruebas se ejecutaron en Edge/Canvas; no se certifica WebGL ni otros navegadores.

Al terminar esta etapa, las suites heredadas todavía contenían expectativas de dos robots, segunda sala vacía y final narrativo después de esa sala. Se adaptaron y ejecutaron durante la etapa 7. Sus informes anteriores permanecen históricos; el informe consolidado del Sprint 6 es la evidencia vigente.

Se cumplen los criterios de S6-05: despeje reconocido, transición única al siguiente nivel, conservación de personaje, limpieza de instancias y proyectiles, y finalización del quinto nivel. El HUD mínimo y la puntuación de S6-06 siguen pendientes.

## Etapa 6 — puntuación y HUD

### Cambios

- `src/ui/GameHUD.ts`: presenta exclusivamente nivel actual/total, puntuación acumulada y enemigos restantes. La paleta y fuente proceden de `UITheme`. Mantiene el tamaño de texto en píxeles de pantalla al variar el zoom y utiliza dos líneas en pantallas estrechas, por encima del área de juego. No captura entrada.
- `src/systems/CombatEvents.ts` y `src/systems/EnemyManager.ts`: notifican las bajas reales y los cambios de cantidad. Una baja se notifica una sola vez, antes de `ROOM_CLEARED`; destruir un robot vivo o limpiar una escena no otorga puntos.
- `src/systems/ArcadeRunService.ts`: acumula puntos mediante `awardKill`, con identidad estable por aparición y protección contra duplicados, índices ajenos a la sesión y valores inválidos. El valor por baja procede de `LevelConfig.scorePerEnemy`.
- `src/scenes/GameScene.ts`: identifica cada aparición, conecta las bajas y el contador con el HUD y libera sus objetos y listeners al salir.
- `src/abilities/SpecialAbilityManager.ts`: mantiene oculto el indicador previo de habilidad; se conserva su comportamiento y sus recursos sin desarrollar habilidades adicionales.

Cada nivel guarda la puntuación con que se ingresó. Al reintentar después de morir o volver de un puente narrativo que reconstruye esa habitación, recupera ese valor; los puntos de las salas anteriores permanecen. Pausar y continuar no reconstruye la sala ni cambia los puntos. Reiniciar la partida comienza en cero. Esto evita sumar repetidamente las mismas bajas mediante reintentos.

Con los valores actuales, cada robot vale 100 puntos. Las entradas a los niveles son 0, 300, 700, 1200 y 1800 puntos; completar los 25 robots da **2500 puntos**. Las habilidades existentes puntúan las mismas bajas mediante el mismo evento.

### Verificación

`npm.cmd run test:sprint6:hud` incluye **218 comprobaciones**: 206 de integración y puntuación, 2 de entrada nativa, 5 de conclusión y 5 del HUD. Se prueban el contador tras bajas y destrucción sin baja, puntos exactos tras cada nivel, muerte repetida sin doble puntuación, rollback de la sala actual, conservación de puntos anteriores, puntos por habilidades y ausencia de premios al limpiar escenas. Los cinco tamaños son 1920 × 1080, 1366 × 768, 800 × 600, 390 × 844 y 844 × 390. El HUD se comprueba con la puntuación máxima actual de 2500 y la habitación completa visible. Informe: `docs/test-results/sprint-6-stage-6.json`.

## Etapa 7 — cierre y regresiones

### Adaptación de pruebas

Las pruebas de selección, combate, habilidades e integración de los sprints 4 y 5 se actualizaron para el catálogo de cinco salas, los tres robots iniciales, las nuevas paredes, los parámetros de disparo y la conclusión de prueba. Se mantienen las comprobaciones de muerte por un impacto, animaciones, input nativo, colisiones, reinicios y estabilidad. Cambiar de personaje mediante un puente narrativo inicia una nueva sesión en el nivel uno; conservar personaje y sesión permite volver al nivel actual.

Se añadió `npm.cmd run test:sprint6`, que ejecuta las pruebas de configuración y después todas las suites de navegador secuencialmente, usando una pestaña dedicada. No se ejecutan runners de navegador en paralelo ni se usa el almacenamiento real del jugador. El informe consolidado solo se escribe cuando todas las suites pasan.

### Resultados

| Suite | Comprobaciones aprobadas |
|---|---:|
| Configuración | 37 |
| Selección, narrativa, persistencia y presentación | 147 |
| Combate y Game Over | 69 |
| Habilidades existentes | 52 |
| Integración Sprint 4 y 12 reinicios | 44 |
| Presentación, pausa y navegación Sprint 5 | 58 |
| Carga de niveles y dificultad | 205 |
| Progresión, puntuación, HUD, teclado y tamaños de pantalla | 218 |
| **Total** | **830** |

`npm.cmd run test:sprint6`: todas aprobadas, sin errores de consola. Evidencia vigente en `docs/test-results/sprint-6.json`, con fecha UTC, versión de Node y navegador. `npm.cmd run build`: TypeScript y compilación de producción correctos. Permanece el aviso previo del bundle de Phaser mayor de 500 kB. `git diff --check`: correcto.

Se inspeccionaron capturas del HUD con una baja real registrada (100 puntos y dos enemigos restantes) en 1366 × 768 y 390 × 844. La compilación final se sirvió con Vite preview en 4173 y se comprobó el arranque del menú a 1920 × 1080, canvas y vista completos, fondo cargado y ausencia de errores de consola. Evidencia en `docs/test-results/sprint-6-production.json`. Esta comprobación de producción cubre el arranque, no repite las 830 comprobaciones sobre el bundle.

`src/world/RoomBuilder.ts` ahora dibuja el suelo existente también bajo `PlayerSpawn`, resolviendo el tile negro registrado en la etapa 3. No se alteran sus paredes, salidas ni cuerpos físicos.

### Alcance de la validación y pendientes finales

La validación es automatizada en Edge/Canvas. Los recorridos de ciclo de vida utilizan bajas programadas, proyectiles reales para el último robot y la muerte del jugador, y pausas de IA donde se necesita aislar transiciones. Otras suites ejecutan la IA, la física y las colisiones reales. No se afirma haber ganado manualmente cinco niveles con combate libre. Las partidas humanas para balance, WebGL y otros navegadores/dispositivos quedan como comprobaciones finales en `pendiente.md`, junto a los diálogos y audio definitivos.

No se añadieron jefes, personajes, inventario, mejoras, experiencia, multijugador, tutoriales, nuevas habilidades ni dependencias. No hay errores críticos conocidos introducidos por este sprint. Los recursos y guiones narrativos existentes se conservaron.

# Sprint 3 — Combate, derrota y Game Over

Validación: 16 de octubre de 2026.

## Objetivo

Cerrar el ciclo impacto → muerte inmediata → animación → Game Over → reintento sin recargar el navegador. Mantener el combate de un impacto, reconocer habitaciones despejadas y conservar las habitaciones, paredes, patrulla y controles existentes.

## Estado inicial auditado

- Arcade ya resolvía impactos letales, paredes, proyectiles por origen, detección híbrida, persecución y patrulla opcional.
- El robot ya reproducía destrucción antes de desaparecer, pero no notificaba su muerte a un gestor de enemigos.
- El jugador estaba fijado a Lua y al morir usaba un tinte y desaparición; no notificaba finalización ni había Game Over/reintento.
- Existían `alex-walk.png`, `lua-walk.png`, `alex-derrota.png` y `lua-derrota.png`. Las hojas de derrota tienen dos filas de ocho poses, empaquetadas con separaciones irregulares.
- No había conteo de robots vivos ni evento de habitación despejada.
- El entorno real usa Phaser **4.2.1**, TypeScript y Vite. Se conserva esa versión y la API Arcade ya instalada; la referencia a Phaser 3 del documento no se aplica como una migración de dependencias.
- No se encontraron instrucciones AGENTS.md aplicables. No se añadieron dependencias.

## Historias y estado

| ID | Resultado | Estado |
|---|---|---|
| S3-01 | Muerte idempotente, bloqueo inmediato, derrota visible y evento de finalización | Verificada |
| S3-02 | Destrucción de robot, cese ofensivo y notificación inmediata al gestor | Verificada |
| S3-03 | Derrotas originales de Alex/Lua y destrucción del robot; sin bucle | Verificada |
| S3-04 | Escena Game Over única, combate detenido, texto y botón de reintento | Verificada |
| S3-05 | Reinicio con Enter, R o clic; habitación/personaje conservados y entidades restauradas | Verificada |
| S3-06 | Conteo de vivos y evento único de habitación despejada | Verificada |
| S3-07 | Cambios de habitación con limpieza, nuevas paredes y línea de visión actualizada | Verificada |
| S3-08 | Temporizadores, listeners, cuerpos y colliders sin acumulación en los ciclos probados | Verificada |

Las verificaciones se ejecutaron en Edge headless con renderer Canvas. Esto no equivale a certificar todos los navegadores/renderers.

## Archivos

Nuevos:

- `src/config/characters.ts`: personajes, rutas, recortes de derrota y velocidad de reproducción.
- `src/systems/PlayerAnimations.ts`: carga y registro de caminar/derrota por personaje.
- `src/systems/CombatEvents.ts`: nombres de eventos compartidos.
- `src/systems/EnemyManager.ts`: conteo de enemigos vivos y habitación despejada.
- `src/scenes/GameOverScene.ts`: interfaz de derrota y reintento.
- `docs/sprints/sprint-3.md`: informe del sprint.

Modificados:

- `src/config/GameSettings.ts`: personaje inicial configurable.
- `src/config/gameConfig.ts`: registro de GameOverScene y renderizado pixelArt.
- `src/entities/Player.ts`: personaje, animaciones de derrota y eventos de muerte.
- `src/entities/enemies/Enemy.ts`: evento de muerte y protección ante entidades destruidas.
- `src/scenes/GameScene.ts`: coordinación de derrota, gestor, selección de personaje y datos de reintento/transición.
- `tests/combat.browser.js`: 66 comprobaciones de integración con Phaser real.
- `tests/run-combat.mjs`: pruebas adicionales con entradas nativas de teclado y ratón vía CDP.

No se modificaron spritesheets, mapas ni mecánicas de movimiento/disparo del Sprint 1. Se conserva la patrulla solicitada después del Sprint 2.

## Muerte y responsabilidades

`Player.die()` y `Enemy.die()` validan primero que la entidad siga disponible y no esté muerta. Marcan muerte y detienen/deshabilitan el cuerpo inmediatamente. Por ello varias colisiones en un mismo frame no ejecutan otra muerte ni permiten continuar disparando.

El jugador descarta disparos pendientes y reproduce la derrota una sola vez. Emite `player-died` sobre su sprite al iniciar y `player-defeat-complete` al terminar. Permanece visible durante la secuencia y se desactiva al completarla. GameScene escucha ambos eventos con `once`.

El robot reproduce la destrucción existente 60–65 y emite `enemy-died` sobre sí mismo con su referencia. EnemyManager lo excluye del conjunto de vivos en ese instante, sin esperar a que termine la explosión. El sprite se destruye al completar la animación.

Se conserva Projectile para ambos bandos. Los callbacks comprueban el origen por su grupo y la disponibilidad de la bala antes de consumirla; una misma bala no elimina dos robots aunque estén solapados. No hay puntos de vida, inmunidad ni daño acumulativo.

## Arte y configuración de derrota

Se inspeccionaron las hojas originales y sus regiones alfa:

| Recurso | Dimensiones | Contenido |
|---|---|---|
| `lua-derrota.png` | 1774 × 413 | Ocho poses frontales y ocho laterales |
| `alex-derrota.png` | 1774 × 474 | Ocho poses frontales y ocho laterales |

No son hojas uniformes de 256 × 256. `characters.ts` define rectángulos fuente medidos para cada pose, con nombres `front-0`…`front-7` y `side-0`…`side-7`; el loader crea metadatos de atlas sobre las imágenes originales.

Cada frame utiliza un lienzo lógico de 256 × 256, centrado horizontalmente y con línea de suelo y=220. Se mantiene escala 0.35. Esto evita cambiar proporciones o desplazar verticalmente al personaje según la altura de su pose. También se inspeccionó visualmente una previsualización de las 32 poses recortadas.

La derrota se reproduce a 8 fps y repeat 0. La dirección horizontal usa la fila lateral y refleja hacia la izquierda cuando corresponde. Arriba/abajo reutilizan la fila frontal existente: las hojas no aportan una secuencia de derrota vista desde atrás. Se necesitaría ese arte solo si en el futuro se exige una derrota específica de espalda.

Para ajustar frames o cadencia, editar `front`, `side` y `defeatFrameRate` del personaje en `characters.ts`. Para iniciar como Alex, cambiar `GameSettings.playerCharacter` a `"alex"`; Lua sigue siendo el valor predeterminado. No se introduce un menú de selección fuera del alcance.

## Game Over y reinicio

GameScene mantiene los estados `playing`, `defeat` y `game-over`. Al recibir `player-died`:

1. Cambia a `defeat` e impide nuevas actualizaciones ofensivas y salidas.
2. Pausa solo Arcade Physics, detiene robots y elimina las balas activas, cancelando sus temporizadores existentes.
3. Mantiene las actualizaciones de animación hasta recibir `player-defeat-complete`.
4. Inicia GameOverScene y cierra GameScene, sin combate en segundo plano.

GameOverScene muestra `GAME OVER`, `[ REINTENTAR ]` y los atajos Enter/R. El botón acepta clic. Una bandera evita iniciar múltiples reinicios por eventos simultáneos o repetición de tecla. Al salir se eliminan exactamente sus listeners de teclado.

**Decisión de reintento:** restaurar la habitación donde ocurrió la derrota y conservar Alex/Lua. No se reinicia obligatoriamente desde la primera habitación. El nuevo GameScene restablece física, controles, cadencias, variables, robots, proyectiles y gestor. No hay recarga del navegador.

## Robots y habitaciones

EnemyManager mantiene un Set de robots vivos. Registra cada robot al generarlo desde RobotSpawn y comienza a comprobar el vacío una vez terminados todos los spawns. Ofrece `aliveCount`, `isCleared` y el evento `room-cleared` sobre `scene.events`.

Una habitación sin RobotSpawn, como testRoom2, se considera despejada una vez al inicializarse. Un robot en destrucción no cuenta como vivo. La bandera de despejada evita emisiones repetidas durante la misma instancia de habitación. El evento reconoce el estado; no agrega victoria final ni bloquea las salidas existentes.

Al cambiar de habitación se conservan `isChangingRoom`, los mapas y el spawn del jugador. Se transporta también el personaje seleccionado. Arcade y la display list limpian cuerpos, grupos, sprites y colliders; GameScene libera sus referencias y el gestor desregistra sus listeners.

La limpieza por shutdown no emite habitación despejada: EnemyManager comprueba el estado de la escena antes de notificar. Cada habitación nueva crea su propio gestor y LineOfSight con las paredes nuevas. El estado de eliminación de una habitación no se persiste al volver a ella, conforme al mecanismo previo de reconstrucción.

## Validación

- `npm.cmd run build`: TypeScript (`vue-tsc -b`) y Vite correctos.
- `git diff --check`: sin errores de whitespace.
- `node tests/run-combat.mjs`: **66 comprobaciones de integración aprobadas**, más **2 verificaciones de interfaz con entradas nativas** de Enter y clic; cero errores JavaScript/console.error durante las pruebas.
- Se prueban reinicios consecutivos, cambio de personajes, las dos habitaciones, continuidad de controles y estabilidad de colliders, animaciones y listeners.
- Los cuerpos, overlaps, paredes, animaciones y ciclo de escenas son reales de Phaser, sin mocks de Arcade.

| Prueba solicitada | Evidencia ejecutada | Resultado |
|---|---|---|
| T-01 | Proyectil enemigo produce muerte inmediata y cuerpo deshabilitado | Pasa |
| T-02 | Dos balas simultáneas: un inicio y un fin de derrota | Pasa |
| T-03 | Proyectil del jugador destruye robot; una bala no mata dos solapados | Pasa |
| T-04 | Robot muerto no devuelve disparos ni vuelve a moverse | Pasa |
| T-05 | Comandos después de morir no mueven ni disparan | Pasa |
| T-06 | Animación visible y sin bucle antes de Game Over único | Pasa |
| T-07 | Enter restaura jugador, robots, habitación y física | Pasa |
| T-08 | Reinicios consecutivos con Alex/Lua, Enter/R/botón, listeners y colliders estables | Pasa |
| T-09 | Último impacto marca despejada antes de terminar destrucción; evento único | Pasa |
| T-10 | Cambio elimina robots/balas anteriores y reconstruye entidades | Pasa |
| T-11 | Balas de ambos bandos desaparecen al impactar paredes | Pasa |
| T-12 | Visión bloqueada causa CHASE sin disparos; rango/visión respetados | Pasa |
| T-13 | Reinicio después de derrota sin errores de consola | Pasa |
| T-14 | Nuevas paredes y referencia LineOfSight; ida/vuelta después del combate | Pasa |

Para reproducir:

1. Ejecutar `npm.cmd run dev -- --host 127.0.0.1`.
2. Abrir `http://127.0.0.1:5173/tests/combat.html` para las 66 comprobaciones.
3. Para las dos pruebas nativas adicionales, iniciar una instancia dedicada de Chrome/Edge con depuración remota en puerto 9224 y un perfil de pruebas, y ejecutar `node tests/run-combat.mjs` con Node 22+. El runner navega su primera pestaña al harness. Se pueden cambiar `CDP_PORT` y `TEST_BASE_URL`.

El harness expone `window.combatGame` únicamente en su página de pruebas para permitir las entradas nativas del runner. No se incluye en la entrada de producción.

## Errores y soluciones

- **Derrotas empaquetadas irregularmente:** usar atlas con recortes medidos, no índices uniformes supuestos ni archivos de arte nuevos.
- **Falso evento de habitación despejada al cerrar escena:** el cierre destruye sprites antes de algunos callbacks propios; suprimir notificaciones cuando el estado es SHUTDOWN/DESTROYED.
- **Posible física pausada tras reintento:** restablecer explícitamente Arcade al crear GameScene.
- **Repetición de reinicio por tecla/clic:** guardas de estado y limpieza de listeners al salir de GameOverScene.
- **Actualizaciones sobre jugador ya destruido:** comprobar disponibilidad del sprite/cuerpo antes de update o die.
- **Aviso de build:** Vite señala el bundle de Phaser mayor de 500 kB. Es un aviso de tamaño, sin fallo de TypeScript o compilación.

## Pendientes y límites

- No quedan criterios funcionales S3-01 a S3-08 pendientes en el entorno verificado.
- Falta validación manual prolongada de balance y compatibilidad en WebGL, otros navegadores y dispositivos.
- La interfaz utiliza texto monospace y renderizado pixelArt; no se incorporan fuentes ni recursos gráficos externos.
- Las secuencias frontales se reutilizan para derrota mirando arriba, ya que no existe arte de espalda.
- Continúa la persecución por eje sin búsqueda de rutas avanzada. No se añadieron colisiones de contacto entre robots/jugador, poderes, puntuación, vidas ni otros elementos ajenos al alcance.

## Consideraciones para Sprint 4

Usar los eventos de combate y la selección de personaje existentes como puntos de integración. Definir el contrato de introducción/diálogos antes de añadir escenas, mantener el reintento por habitación y la limpieza de listeners al incorporar nuevos flujos, y conservar estas pruebas como regresión. Validar WebGL y los dispositivos objetivo antes de publicar.

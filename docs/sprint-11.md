# Sprint 11 — E.X.P.-01 Quimera

Quimera aparece exclusivamente en el Núcleo energético del nivel 5. La campaña conserva sus cuatro niveles temáticos y siete oleadas de robots; el quinto nivel contiene un único jefe y no añade enemigos auxiliares. Se mantiene la arena del Sprint 10, de 40 × 24 tiles, con centro despejado, infraestructura periférica y posiciones seguras.

## Arquitectura y archivos

| Archivo | Responsabilidad |
| --- | --- |
| `src/config/QuimeraConfig.ts` — nuevo | Vida, daños, fases, cadencias, advertencias, recuperación, movimiento, módulos y tamaño físico. |
| `src/entities/boss/QuimeraController.ts` — nuevo | Máquina de estados independiente de Phaser, control de fases y ataques mediante delta de juego. |
| `src/entities/boss/Quimera.ts` — nuevo | Sprite físico, movimiento, orientación, animaciones, iluminación y destrucción. |
| `src/systems/QuimeraAnimations.ts` — nuevo | Carga del PNG original y atlas de 53 frames con recortes medidos y pies alineados. |
| `src/systems/QuimeraEncounter.ts` — nuevo | Colisiones específicas del jefe, uso de proyectiles compartidos, pulso y recepción de especiales. |
| `src/ui/BossHealthBar.ts` — nuevo | Barra exclusiva con vida inmediata, estela suave, nombre y fase; escala independiente de cámara. |
| `src/ui/GameHUD.ts` | Conserva sus indicadores; en el encuentro final cuenta al jefe y omite la etiqueta de oleadas inexistentes. |
| `src/levels/LevelConfig.ts`, `RoomScenarios.ts`, `levels.ts` | Declaración del encuentro y aparición central mediante coordenadas de tiles. El nivel 5 deja de estar reservado. |
| `src/levels/validateLevelConfig.ts` | Valida jefe único en la arena final, ausencia de robots/oleadas normales y huella libre de obstáculos. |
| `src/scenes/GameScene.ts` | Conecta el encuentro, pausa/derrota, destrucción y transición narrativa; conserva los sistemas actuales. |
| `src/systems/EnemyProjectiles.ts` | Acepta el contrato estructural de emisor del jefe; reutiliza exactamente `Projectile` y sus grupos. |
| `src/abilities/SpecialAbility.ts`, `SpecialAbilityManager.ts` | Aviso único de descarga para añadir un objetivo con vida sin cambiar la eliminación de robots normales. |

Los nuevos tests son `quimera.test.mjs`, `sprint-11.browser.js`, su HTML, `run-sprint-11.mjs` y `capture-sprint-11.mjs`. Se actualizaron las expectativas del quinto nivel en las pruebas de mapas, carga, combate y progresión anteriores. `tests/run-all.mjs` y `package.json` incorporan Sprint 11; `pendiente.md` refleja el jefe integrado y los retoques de contenido restantes.

El README de los recursos de entorno también identifica el reactor como la arena activa de Quimera. Los documentos de los sprints anteriores se conservan como registro de sus entregas.

## Recurso visual inspeccionado

Se utiliza **`public/assets/sprites/enemies/RobotQuimera.png`**, con **1024 × 1536 px y canal alfa real**. `RobotQuimera1.png` es una variante aportada que se conserva sin sustituir el recurso principal. Ningún PNG se modificó ni se generó arte adicional.

La imagen tiene seis columnas y nueve filas, pero **no es una cuadrícula regular de 192 px ni de 1536/9 px de alto**. La revisión visual detectó cabezas y extremidades de otra pose al dividirla regularmente. Se midieron los intervalos transparentes: límites verticales `0, 165, 324, 485, 647, 806, 968, 1131, 1310, 1500`. Las columnas utilizan los límites relativos redondeados del ancho real.

El atlas se prepara una vez en memoria con celdas lógicas de 192 × 192. Conserva los píxeles y la transparencia originales, alinea el último píxel sólido de cada pose en la fila 183 y recorta cada celda para impedir contaminación entre frames. No estira las piezas ni desplaza la hitbox según la animación. Solo se registran los frames 0–52; la celda 54 del atlas queda transparente y sin uso.

Se inspeccionaron las 53 poses normalizadas: idle frontal 0–3; abajo 4–9; arriba 10–15; izquierda 16–21; derecha 22–27; ataques abajo 28–31, arriba 32–35, izquierda 36–39 y derecha 40–43; reacción 44–46; destrucción 47–52. Las animaciones se registran una vez y usan velocidades independientes para caminar, disparar y morir.

## Fases, ataques y vulnerabilidad

La fase y el estado de acción son independientes. Los estados son `INTRO`, `REPOSITION`, `CHARGING`, `ATTACKING`, `RECOVERING`, `PHASE_TRANSITION`, `DEAD` y `STOPPED`. La selección forma parte de la salida del reposicionamiento, sin añadir una abstracción aparte.

| Fase | Umbral | Patrones |
| --- | --- | --- |
| 1 — Análisis | Más del 70 % | Disparo dirigido y ráfaga corta de tres disparos con dirección fijada durante la advertencia. |
| 2 — Experimental | 70 % a más del 35 % | Abanico de cinco disparos, pulso de radio anticipado y módulos experimentales alternados. |
| 3 — Sobrecarga | 35 % o menos | Abanico seguido de disparo dirigido con pausa advertida, descarga radial con sector seguro, módulos y pulso. |

Los cambios de fase se resuelven durante reposicionamiento o después de terminar el ataque y la recuperación. Nunca retroceden ni superponen dos patrones. El jefe puede recibir daño durante movimiento, carga, disparo y recuperación; únicamente la introducción breve y la transición de fase protegen temporalmente su vida. La recuperación ofrece daño adicional y detiene el movimiento.

Los módulos usan **`EnemyAttackController` y `robotAttacks` existentes**:

- Rojo: disparo individual, 300 px/s.
- Azul: cinco disparos, 350 px/s, separación de 200 ms y cancelación al perder visión.
- Amarillo: desplazamiento rápido mientras dispara a corta distancia, 400 px/s e intervalo de 800 ms. La persecución del módulo tiene un límite temporal para evitar quedarse atrapado.
- Naranja: carga visible de 1000 ms y seis proyectiles simultáneos de 320 px/s, distribuidos entre −20° y +20°. Puede atravesar cobertura interior, conserva su rango y se cancela si el jugador sale de él.

El jefe busca mantener distancia y se desplaza lateralmente. Su distancia objetivo se limita según el área visible en pantallas pequeñas. Respeta paredes mediante Arcade Physics y gira al bloquearse. Si sale del área visible, no inicia ni termina una descarga sin que se pueda ver su advertencia; se reposiciona antes de atacar.

## Balance inicial configurable

Todos estos valores están en `QuimeraConfig.ts`; los módulos leen además el balance real de `RobotConfig.ts`.

| Parámetro | Valor inicial |
| --- | --- |
| Vida máxima | 72 |
| Daño normal | 2 por proyectil consumido; 36 impactos normales fuera de recuperación |
| Especial Alex / Lua | 12 / 14 por descarga válida |
| Alcance del especial contra el jefe, Alex / Lua | 1600 / 720 px |
| Multiplicador de daño durante recuperación | 1,5 |
| Activación / transición de fase | 1500 / 700 ms |
| Velocidad base de fases 1 / 2 / 3 | 75 / 100 / 125 px/s |
| Reposicionamiento | 1800 / 1300 / 950 ms |
| Recuperación | 1100 / 1400 / 1700 ms |
| Advertencias de dirigido / ráfaga / abanico | 500 / 650 / 850 ms |
| Advertencias de pulso / combinado / crítico | 1100 / 1000 / 1600 ms |
| Pulso | Radio 180 px, un único evento de impacto tras la advertencia |
| Ráfaga corta | 3 disparos separados 230 ms |
| Abanico | 5 proyectiles, de −32° a +32° |
| Combinado | Abanico, 800 ms de pausa advertida, disparo dirigido |
| Descarga crítica | 12 posiciones radiales; se omite la dirección central del sector seguro de 60° |
| Premio | 1000 puntos; campaña completa hasta 7400 |

Las secuencias y el orden de módulos también son configurables. No se reemplaza el balance ni la IA de los cuatro robots normales.

## Proyectiles, especiales y colisiones

Se reutiliza `Projectile`, su propietario, colores, vida útil, destrucción, grupos y validación de límites. Los tiros normales del jefe colisionan con todas las paredes. Solo el módulo naranja activa `piercesInteriorWalls`; las paredes exteriores y los límites del mundo siguen destruyéndolos. No dañan a otros robots ni pasan a otra habitación.

El jefe añade dos registros de física: collider contra paredes y overlap de sus disparos recibidos. Los niveles 1–4 mantienen siete registros y el nivel 5 tiene nueve. Su cuerpo fijo mide 104 × 116 px antes de la escala 1,1, independientemente de la pose. No se añade daño por contacto ni salud al jugador. El pulso utiliza la intersección real de su círculo advertido con el rectángulo físico del jugador y se evalúa una sola vez.

Arcade entrega primero el sprite en overlaps sprite/grupo; se ordenó explícitamente el callback para consumir **la bala** antes de aplicar daño. Esto evita impactos repetidos por frame. La limpieza también tolera cuerpos, animaciones y colliders que Phaser ya haya destruido al cerrar la escena.

Alex conserva la animación y los impactos verdes sobre objetivos; Lua conserva su electricidad de área. El aviso de descarga añade daño limitado a Quimera una sola vez, con su alcance configurable. Los robots normales siguen muriendo de un impacto y las habilidades siguen eliminándolos según el sistema anterior. Se conserva la carga acumulada al entrar al jefe y su checkpoint al reintentar.

La especificación describe una metralleta para Alex y señala no reemplazar las bajas por cooldown. El repositorio real, ajustado previamente por el usuario, usa impactos verdes directos y **diez bajas más 45 segundos entre usos**. Ese funcionamiento se conserva: el tiempo nunca genera nuevas bajas ni recarga la habilidad por sí solo. No hay invocaciones para obtener cargas durante el jefe, y puede terminarse la pelea solo con disparos normales.

## Destrucción, derrota y finales

Al llegar a cero se cancela el controlador, se deshabilita la hitbox, se detiene al jugador y se eliminan los proyectiles de ambos grupos. La física se pausa y la animación de destrucción sigue hasta su último frame. La barra se oculta inmediatamente. Solo su finalización registra el premio, limpia el quinto nivel, valida la victoria de `ArcadeRunService` e inicia `VisualNovelScene` mediante `startNarrative`.

La secuencia es **`alex_ending` o `lua_ending`**, con destino a la pantalla de conclusión existente. No se inventaron diálogos, rutas ni decisiones. Los textos de esos finales todavía son provisionales —algunas líneas mencionan el antiguo recorrido de dos habitaciones— y siguen documentados en `pendiente.md`.

La muerte del jugador sigue siendo inmediata. Detiene al jefe y conserva Game Over y el reintento del nivel, que crea vida completa, fase 1 y el checkpoint de puntuación/carga. Reiniciar desde pausa vuelve al nivel 1 con partida nueva. Volver al menú libera el encuentro. La pausa suspende el delta del controlador, la física, los proyectiles y las animaciones sin perder vida ni fase. No se crean timers de ataque independientes.

## Validación y capturas

Comandos disponibles:

- `npm run build`: comprobación de tipos y compilación de producción.
- `npm run test:sprint11`: lógica, regresiones anteriores e integración del jefe.
- `npm run test:sprint11:unit`: controladores, mapas, validadores, oleadas, especiales y recursos.
- `npm run test:sprint11:boss`: integración real con Phaser/Canvas, ambos personajes y vistas de 1920 × 1080, 1366 × 768, 800 × 600, 390 × 844 y 844 × 390.
- `npm run test:sprint11:visual`: genera las capturas reproducibles después de completar las pruebas del encuentro.

La compilación termina correctamente. No hay script de lint en el repositorio y no se añadió una dependencia para ello. Vite mantiene su advertencia de tamaño del paquete que incluye Phaser.

La suite completa terminó con **1475 verificaciones aprobadas y cero errores de consola**: 162 pruebas de lógica y regresiones del juego, incluyendo 125 comprobaciones de integración y presentación del jefe. Se verificaron tanto Alex como Lua, sus finales válidos y los cuatro niveles anteriores.

[Informe completo de regresión](test-results/sprint-11.json), [integración del jefe](test-results/sprint-11/boss-integration.json) y [registro de capturas](test-results/sprint-11/visual-review.json).

La integración prueba vida, daño único, umbrales, especiales limitados, pies alineados en las 53 poses, tamaño físico estable, paredes, pausa, muerte de un impacto, reintento, reinicio, destrucción previa al final y victoria única de Alex y Lua. También ejecuta la IA real de la escena hasta reposicionarse y emitir un proyectil advertido. Los tests puros cubren todos los módulos, su cadencia, pérdidas de visión/rango, sector seguro, pulso, cancelación y ausencia de ataques fuera de pantalla.

Capturas reales para revisión visual:

| Comprobación | Archivo |
| --- | --- |
| Las 53 poses normalizadas | [Frames](test-results/sprint-11/animation-frames.png) |
| Fase 1 y barra de vida | [Captura](test-results/sprint-11/phase-1.png) |
| Advertencia del pulso | [Captura](test-results/sprint-11/phase-2-pulse-warning.png) |
| Carga del módulo naranja | [Captura](test-results/sprint-11/orange-module-charge.png) |
| Seis proyectiles naranjas | [Captura](test-results/sprint-11/orange-module-volley.png) |
| Descarga crítica y sector seguro | [Captura](test-results/sprint-11/phase-3-critical-warning.png) |
| Vista estrecha | [Captura](test-results/sprint-11/boss-mobile.png) |
| Secuencia de destrucción | [Captura](test-results/sprint-11/destruction.png) |
| Final existente de Alex | [Captura](test-results/sprint-11/alex-ending.png) |

La validación automatizada y visual utiliza Edge/Canvas. El equilibrio definitivo requiere partidas manuales con combate libre y revisión en WebGL, otros navegadores y dispositivos. Los diálogos y audio finales siguen pendientes; no impiden el funcionamiento del encuentro ni de las transiciones. No se avanzó a otro sprint.

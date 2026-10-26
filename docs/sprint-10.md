# Sprint 10 — composición de mapas e identidad de niveles

Implementado sobre el motor de habitaciones existente. Se conservan las salas físicas de **40 × 24 tiles de 64 px (2560 × 1536)**, la cámara con seguimiento, las puertas y la progresión híbrida. No se añadieron dependencias ni se modificaron imágenes originales.

## Distribución y combate

| Nivel | Estructura e intención | Recursos | Oleadas / robots |
| --- | --- | --- | --- |
| 1 — Sector de cuarentena | Bancos horizontales de cobertura, tres líneas largas de tiro y circulación lateral. Introduce el disparo individual rojo. | `quarantine-red`, `industrial-green`, piezas de `maintenance-teal` | 1 × 6 rojos |
| 2 — Centro de datos | Dos bancos de filas de servidores alineados, avenidas paralelas, pasillo transversal y escapes laterales para cortar ráfagas. | `data-blue`, `maintenance-teal` | 2 × 8 azules |
| 3 — Almacén y mantenimiento | Islas de depósitos de tamaños distintos y estaciones periféricas. Giros y circuitos conectados para persecución y escape. Marcas amarillas identifican zonas de carga. | `cargo-olive`, `assembly-amber` | 3 × 10 amarillos |
| 4 — Hangar industrial | Cuatro compartimentos abiertos en L, escudo central y estaciones de operación. Las rutas conectadas permiten esquivar ataques perforantes en lugar de depender solo de un muro. | `hangar-amber`, `assembly-amber` | 1 × 12 naranjas |
| 5 — Núcleo energético | Arena central despejada e infraestructura energética periférica. Acceso desde el cuarto nivel y exploración con los controles habituales. | `reactor-cyan`, `industrial-green` | Reservado; sin enemigos ni oleadas |

Las cantidades de habitaciones y oleadas de los cuatro niveles de combate permanecen iguales. Se retiraron **únicamente las tres oleadas mixtas provisionales del quinto nivel**, como exige su reserva expresa: actualmente hay siete oleadas, 64 robots y hasta 6400 puntos. El quinto nivel muestra «JEFE PENDIENTE», mantiene la salida bloqueada y permite volver al menú desde Esc/pausa. No se genera un jefe ni se activa la pantalla de conclusión al llegar, intentar salir o emitir una limpieza de sala.

## Composición y tilesets

Se inspeccionaron visualmente los ocho PNG originales de `public/assets/environment/sources/` y sus dimensiones reales, 1254 × 1254. Todos están disponibles. Se mantienen sus rutas, nombres y SHA-256 de `provenance.json`. Los recortes continúan usando límites medidos por pieza y excluyen los separadores irregulares; se extrae un cuadrado central y se reduce uniformemente a 64 px con NEAREST. No se asume una cuadrícula contigua de 256 px.

`sheetFunctions` documenta cinco funciones: piso, pared, obstáculo, decoración y pieza temática. Los atlas detallados se componen una vez en memoria: principal 0–15, apoyo 16–31, atlas pequeños heredados 32–47, paredes rotadas 48–52 y apoyo neutro opcional 53–56. Si falta una lámina requerida o tiene dimensiones incorrectas se informa su nombre mediante un error, sin sustituirla silenciosamente.

La geometría sólida determina grupos conectados de maquinaria. Cada grupo comparte material, con un terminal o núcleo como referencia; ya no cambia aleatoriamente de consola, ventilador o caja en cada celda. Los servidores azules forman bancos coherentes; los depósitos reciben material principal o de ensamblaje por grupo. El perímetro conserva segmentos orientados y esquinas explícitas.

El piso principal es uniforme. El material secundario delimita áreas de servicio alrededor de estructuras. Rejillas, marcas de carga y señales se agrupan junto a maquinaria, con límites de señales llamativas por ambiente y separación respecto de aparición/salida. Se eliminó la rejilla anterior de 128 adornos repartidos por toda la habitación. Las señales no representan daño adicional.

Se reutilizan las capas existentes: piso, decoración inferior opaca, decoración con mezcla y obstáculos; actores/proyectiles mantienen sus profundidades actuales. No fue necesario añadir una capa superior de objetos ni nuevos colliders. Los detalles con apariencia sólida pertenecen a celdas físicas sólidas; los adornos de suelo son transitables.

## Archivos de implementación

| Archivo | Cambio |
| --- | --- |
| `src/data/rooms/arcadeRooms.ts` | Redistribución física de bancos, racks, depósitos, compartimentos y arena; dimensiones relativas conservadas. |
| `src/levels/RoomScenarios.ts` | Identidades, temas, apoyos y reserva explícita del reactor. |
| `src/levels/levels.ts` | Composición contextual de suelo y cero oleadas para contenido reservado. |
| `src/levels/LevelConfig.ts` | Estado opcional `available` / `reserved`. |
| `src/levels/validateLevelConfig.ts` | Rechaza contenido reservado con enemigos/oleadas o fuera del final del catálogo. |
| `src/world/environment/EnvironmentComposition.ts` — nuevo | Agrupación de obstáculos conectados y decoración junto a sus bordes. |
| `src/world/environment/EnvironmentPlan.ts` | Material por grupo, pisos coherentes y esquinas del perímetro. |
| `src/world/environment/EnvironmentSheets.ts` | Clasificación funcional, apoyos compatibles y selección auditada de piezas. |
| `src/world/environment/EnvironmentSheetTiles.ts` | Apoyo neutro medido y detección explícita de recursos ausentes. |
| `src/world/environment/RoomTheme.ts` | Metadatos opcionales de materiales y esquinas, compatibles con atlas anteriores. |
| `src/scenes/GameScene.ts` | Arena reservada sin gestor de oleadas ni limpieza/victoria automática; aviso mediante HUD existente. |
| `src/config/CombatBalance.ts` | Retira el límite de adornos aleatorios ya reemplazado; parámetros de combate intactos. |

`tests/map-composition.test.mjs` añade pruebas de identidad, agrupación, pisos, contexto de decoración, esquinas, racks, hangar, arena y rechazo de reservas inválidas. Se actualizaron las expectativas de mapas/progresión en `large-rooms.test.mjs`, `waves.test.mjs`, `combat.browser.js`, `sprint-5.browser.js`, `sprint-6-levels.browser.js`, `sprint-7.browser.js` y `sprint-9.browser.js`. Las pruebas de presentación de conclusión usan una campaña completa aislada de un nivel; no fabrican una victoria en la campaña de producción reservada.

`tests/run-all.mjs` y `package.json` incorporan Sprint 10; los runners de salas y rendimiento permiten conservar informes por sprint. `tests/capture-sprint-10.mjs` genera las capturas reproducibles. Se actualizan también `pendiente.md` y el README de recursos.

## Pruebas y revisión visual

- `npm run build`: compilación TypeScript y producción correctas. Vite conserva la advertencia de tamaño del paquete que incluye Phaser.
- `npm run test:sprint10`: **1328 verificaciones aprobadas, cero errores de consola**. Incluye 140 pruebas de lógica y regresiones de selección/desbloqueos, combate, habilidades, narrativa/presentación, niveles, oleadas, entornos, cámara y ataques. [Informe completo](test-results/sprint-10.json).
- La navegación se valida a 40 × 24, 48 × 30, 24 × 16 y 20 × 14: todos los espacios transitables conectados, apariciones fuera de sólidos, salidas accesibles, distancias de seguridad y reubicación de refuerzos.
- Las pruebas de navegador recorren los cuatro niveles con Alex y Lua y llegan al reactor sin victoria; verifican colisiones reales de cuerpos/proyectiles, perforación exclusiva del naranja, limpieza de texturas/balas y siete colliders estables. Los ataques siguen siendo rojo individual, azul cinco disparos, amarillo móvil con intervalo de 800 ms y naranja con carga visible de 1000 ms y seis proyectiles. No se modificaron sus implementaciones.
- Se conservan muerte de un impacto, especiales con diez bajas y 45 s de espera, puntuación, controles, pausa y rutas narrativas.
- `npm run test:sprint10:visual`: capturas reales con Edge/Canvas de las cinco habitaciones completas a 1600 × 960 y sus vistas con cámara a escala nativa. La vista completa usa zoom 0,625 solo en la herramienta de revisión, sin cambiar la cámara de producción.

| Nivel | Composición completa | Cámara nativa |
| --- | --- | --- |
| Cuarentena | [Captura](test-results/sprint-10/level-1.png) | [Captura](test-results/sprint-10/level-1-native.png) |
| Datos | [Captura](test-results/sprint-10/level-2.png) | [Captura](test-results/sprint-10/level-2-native.png) |
| Almacén | [Captura](test-results/sprint-10/level-3.png) | [Captura](test-results/sprint-10/level-3-native.png) |
| Hangar | [Captura](test-results/sprint-10/level-4.png) | [Captura](test-results/sprint-10/level-4-native.png) |
| Reactor reservado | [Captura](test-results/sprint-10/level-5.png) | [Captura](test-results/sprint-10/level-5-native.png) |

Las capturas se revisan para continuidad, recortes, limpieza del suelo, distribución, contraste de personajes, puertas e identidad visual. Los personajes y el escenario conservan su escala; las pruebas adicionales cubren cámara/HUD en resoluciones estrechas, estándar y ultrapanorámicas. [Metadatos de capturas](test-results/sprint-10/visual-review.json).

## Rendimiento y límites

Se conservan Tilemaps y la caché estática por bloques de hasta 512 × 512 en Canvas, con renderizado por lotes en WebGL. La composición solo se calcula al construir la sala, nunca en cada actualización. Las texturas de sala se liberan al abandonarla; los atlas de recursos se comparten.

`npm run test:sprint10:performance` pasó: en una sala representativa a 1920 × 1080, el dibujo estático con caché midió **0,19–0,25 ms por frame**, frente a **1,86–2,10 ms** dibujando directamente los cuatro Tilemaps. Se mantienen 44 bloques, aproximadamente 27,45 MiB de píxeles de caché y una diferencia máxima de un nivel de canal entre ambas imágenes. Es una comparación local del dibujo del escenario, no una medición de FPS de la partida completa. [Informe de rendimiento](test-results/sprint-10/performance.json).

La validación automatizada y visual se realizó en Edge/Canvas. Quedan para publicación las partidas manuales de balance con combate libre y las comprobaciones en WebGL, otros navegadores y dispositivos. No se afirma una garantía de FPS en otros equipos.

## Pendientes fuera de alcance

Definir e implementar el jefe del nivel 5, su encuentro y mapa definitivo, y entonces habilitar el cierre de campaña. Los diálogos y audio definitivos siguen en `pendiente.md`. No se implementaron jefes, salud, resistencias, inventarios ni funcionalidades de otro sprint.

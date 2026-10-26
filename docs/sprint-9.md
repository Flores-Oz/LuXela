# Sprint 9 — habitaciones grandes y cámara dinámica

La ampliación está implementada y verificada. Las cinco habitaciones pasan de 15 × 11 a **40 × 24 tiles**, con tiles físicos de 64 px: **2560 × 1536 píxeles de mundo** y 960 celdas por sala. Se conserva el arte modular del Sprint 8. No se agregaron dependencias.

## Geometría, apariciones y progresión

`createArcadeRooms(columns, rows)` genera matrices físicas con perímetro cerrado y obstáculos interiores definidos mediante proporciones. Las distribuciones mantienen áreas abiertas y rutas conectadas. La posición inicial y la salida dependen de las dimensiones de la matriz. El tamaño de referencia está en `arcadeRoomSize` dentro de `src/data/rooms/arcadeRooms.ts`.

`createLevelCatalog(rooms)` obtiene las salidas de las matrices y resuelve zonas de aparición mediante `RoomPlacement`. Las apariciones configuradas quedan fuera del alcance de detección más un tile respecto del inicio, con tres tiles entre robots y dos respecto de la salida. Los cuerpos de robots permanecen en 44 × 52 px y los sprites usan frames de 64 px. Las 48 decoraciones de piso por habitación se colocan únicamente sobre suelo libre y conservan su función visual; su cantidad se reduce en mapas pequeños.

El planificador de refuerzos sigue comprobando conectividad y distancia respecto del jugador actual. Ahora también mantiene dos tiles de separación entre robots y respecto de la salida. Si no existe una distribución segura, espera y vuelve a intentarlo mediante el mecanismo existente de oleadas.

Se conservan cinco salas y diez oleadas. El balance de salas grandes configura 6, 8, 10, 12 y 14 robots por oleada según la habitación: 106 robots en la campaña, 100 puntos por eliminación y un máximo de 10600 puntos. Continúan la muerte por un impacto, las habilidades por bajas, las pausas, los reintentos y la conclusión de campaña.

## Ajuste de actividad y densidad

`CombatBalance.ts` centraliza la cantidad de robots, el alcance de detección, la cadencia roja y el máximo de detalles. La detección aumenta progresivamente de 420 a 540 px y el intervalo del soldado rojo baja de 1500 a 1100 ms. La velocidad base aumenta de 80 a 112 px/s, con multiplicadores por variante. Esto corrige los encuentros demasiado separados que producían los antiguos grupos de 3–7 robots y su detección de 180–228 px en las salas ampliadas. Los patrones y tiempos completos se documentan en [sprint-9-ataques.md](sprint-9-ataques.md).

Cuando un robot encuentra bloqueado su eje de persecución, intenta desplazarse por el otro eje para rodear el obstáculo. Es un desvío local, no un sistema de búsqueda de rutas. Las habitaciones incorporan más grupos de maquinaria con colisiones reales, mientras los detalles de suelo no bloquean el movimiento. Las pruebas comprueban que las zonas transitables siguen conectadas y que los obstáculos interiores ocupan menos del 12 % del suelo interior.

## Cámara y pantalla

`RoomCamera.ts` configura una cámara que ocupa todo el viewport, limita su recorrido a las dimensiones físicas del mapa y sigue a Alex o Lua con interpolación 0,1. Se mantiene zoom nativo mientras el mapa es mayor que la pantalla. Para pantallas que exceden el tamaño del mundo se aplica un zoom uniforme suficiente para cubrir ambos ejes; no se estiran texturas ni sprites. Cuando coincide el tamaño del mapa y el área visible, los límites impiden desplazamiento adicional.

El HUD y el botón de pausa permanecen fijados a la pantalla mediante su scroll factor y ajuste inverso del zoom. El movimiento, las coordenadas de disparo y las colisiones siguen usando coordenadas del mundo. No hay margen reservado alrededor de la habitación ni franjas añadidas para encajar el mapa completo.

## Variantes de robots y proyectiles

Se conectaron los sprites existentes de RobotRed, RobotBlue, RobotYellow y RobotOrange. `RobotConfig.ts` identifica cada textura y su prefijo de animaciones. `RobotAssets.ts` reutiliza el spritesheet rojo corregido y prepara las tres láminas grandes a frames de 64 px en memoria, con escala uniforme y márgenes transparentes. Los archivos originales no se modifican.

Las cuatro variantes reutilizan la percepción, las colisiones y un controlador de ataque compartido. El rojo dispara individualmente; el azul dispara ráfagas de cinco y mantiene distancia; el amarillo persigue al doble de la velocidad base y dispara a corta distancia mientras camina, cada 0,8 segundos; el naranja carga 1 segundo, dispara un abanico de seis proyectiles perforantes y se recupera durante 2,5 segundos. Las colisiones físicas de todos los cuerpos siguen activas. Rojo, azul y amarillo conservan el bloqueo normal de línea de visión y proyectiles. El naranja puede apuntar y disparar a través de paredes interiores, siempre dentro de su percepción. La ulti de ambos protagonistas requiere diez bajas y 45 segundos de espera entre usos; ver el informe de ataques para sus reglas de pausa y checkpoints y las pruebas del ajuste posterior del amarillo.

`RoomBuilder` etiqueta los muros del perímetro. `LineOfSight` puede ignorar únicamente los interiores para el naranja. El proceso de colisión de sus proyectiles usa la misma distinción: atraviesan interiores y se destruyen en los muros exteriores. Los límites del mundo también destruyen los proyectiles mediante un listener compartido por sala. Ese listener se libera al salir, capturando el mundo físico correspondiente para respetar el orden de apagado de Phaser.

## Rendimiento y limpieza

Canvas reutiliza las capas estáticas mediante bloques de hasta 512 px para las salas grandes. No hay reconstrucción por cuadro ni una textura única del tamaño completo del mundo. Las habitaciones pequeñas conservan la caché sencilla anterior. Los Tilemaps permanecen como definición visual y WebGL mantiene su renderizado por lotes.

Solo las paredes y la salida generan cuerpos estáticos, sin cuerpos físicos para las 960 celdas de piso ni para la decoración. Se mantienen siete registros de colisión/overlap por grupo y un listener compartido para límites de proyectiles. Los cambios de sala liberan enemigos, balas, capas, imágenes de caché y texturas privadas. Los atlas compartidos permanecen disponibles.

La medición local a 1920 × 1080 con la decoración adicional utilizó 45 bloques y aproximadamente 28,1 MiB de superficies de caché. El dibujo estático tardó aproximadamente **1,41–1,83 ms sin caché**, frente a **0,20–0,27 ms con caché**. La comparación a escala nativa presentó como máximo una unidad de diferencia por canal de píxel y verificó cero llamadas al renderizador de Tilemaps cuando la caché está activa. Es una medición local de dibujo Canvas, no una garantía de FPS en todos los equipos.

## Verificaciones ejecutadas

`npm.cmd run build` pasó la comprobación de tipos y la compilación de producción. Vite conserva el aviso por el tamaño del bundle de Phaser.

`npm.cmd run test:sprint9` aprobó **1426 verificaciones**, con cero errores de consola:

| Suite | Verificaciones |
| --- | ---: |
| Configuración, oleadas, habilidades, atlas, habitaciones grandes y tiempos de ataque | 122 |
| Selección | 147 |
| Combate | 69 |
| Habilidades | 57 |
| Integración Sprint 4 | 44 |
| Presentación Sprint 5 | 58 |
| Niveles Sprint 6 | 205 |
| Progresión Sprint 7 | 352 |
| Escenarios Sprint 8 | 159 |
| Habitaciones grandes Sprint 9 | 114 |
| Patrones de ataque con Alex y Lua | 99 |
| **Total** | **1426** |

Las pruebas puras incluyen mapas de 40 × 24, 48 × 30, 24 × 16 y 20 × 14, conectividad de todas sus zonas transitables, perímetros, separación y validez de apariciones y rutas de salida. Las pruebas de navegador comprueban dimensiones físicas, cobertura de 960 pisos, cachés acotadas, arte y cuerpos de las cuatro variantes, seguimiento gradual, movimiento real y colisiones.

Se probaron viewports de 1366 × 768, 1920 × 1080, 390 × 844, 3440 × 1440 y 3840 × 2160. Las regresiones de interfaz también cambian el viewport mediante eventos nativos de navegador. Se recorrieron las diez oleadas con Alex y Lua mediante derrotas dirigidas de los robots, usando los triggers físicos de salida, la puntuación y el servicio de progresión reales. Se comprobó la liberación de cachés, balas y listeners durante las transiciones. No se presentan estas pruebas dirigidas como partidas manuales con combate libre.

Las pruebas anteriores se adaptaron para consultar dimensiones, paredes, spawn y salidas del mapa actual, en lugar de conservar coordenadas de las antiguas salas. Las verificaciones de presentación ahora comprueban cobertura y límites de cámara, ya que la habitación completa puede exceder la pantalla.

`npm.cmd run test:sprint9:performance` aprobó la comparación independiente de dibujo. Los resultados están en `docs/test-results/sprint-9.json`, `sprint-9-large-rooms.json`, `sprint-9-performance.json` y `sprint-9-regressions/`. Se preservaron los informes históricos de sprints anteriores.

Se revisaron capturas locales de la sala grande, las cuatro variantes en la segunda habitación y la presentación estrecha: `.preview.local/sprint9-room-large.png`, `sprint9-four-robots.png` y `sprint9-narrow.png`.

## Archivos principales

| Archivo o grupo | Responsabilidad |
| --- | --- |
| `src/data/rooms/arcadeRooms.ts` | Dimensiones y geometría física de las cinco salas |
| `src/config/CombatBalance.ts` | Cantidad de robots, detección, cadencia y detalles de las salas grandes |
| `src/levels/RoomPlacement.ts`, `levels.ts`, `SpawnPlanner.ts` | Distribución proporcional, salidas y refuerzos seguros |
| `src/levels/LevelConfig.ts`, `validateLevelConfig.ts` | Tipos y validación de las cuatro variantes |
| `src/world/RoomCamera.ts`, `src/scenes/GameScene.ts` | Seguimiento, viewport, carga de robots y límites de proyectiles |
| `src/world/RoomBuilder.ts`, `src/systems/LineOfSight.ts` | Distinción de perímetro e interiores |
| `src/config/RobotConfig.ts`, `src/systems/RobotAssets.ts` | Recursos y animaciones por variante |
| `src/entities/enemies/Enemy.ts`, `src/entities/Projectile.ts` | IA común y excepción de disparo del naranja |
| `src/world/environment/ModularRoomRenderer.ts` | Caché por bloques y limpieza |
| `src/ui/GameHUD.ts` | Aclaración de su contrato de posición fija |
| `tests/large-rooms.test.mjs`, `tests/sprint-9.*`, `tests/run-sprint-9*.mjs` | Pruebas de la ampliación y rendimiento |
| Runners y fixtures de regresión, `package.json` | Integración y adaptación de las verificaciones previas |
| `pendiente.md`, documentación de assets e informes | Entrega y validaciones finales |

## Validación pendiente de acabado

Quedan las partidas manuales de balance en mapas grandes y las comprobaciones WebGL y de otros dispositivos/navegadores. La suite automatizada utiliza Edge/Canvas. Los diálogos y el audio finales siguen en `pendiente.md`; esta ampliación no cambia su contenido.

# Sprint 8 — escenarios modulares

Estado: implementado y verificado, incluida la ampliación con las ocho láminas detalladas. Se reutilizan las definiciones físicas y la progresión del Sprint 7. Las habitaciones se dibujan con Tilemaps, tres temas, ocho ambientes gráficos configurables y recursos aportados por el usuario. No se agregaron dependencias.

## Análisis y arquitectura

La arquitectura existente separaba `RoomLayout`, `RoomBuilder`, el contrato `RoomRenderer` y `DoorController`. Se conservan estas responsabilidades: `RoomBuilder` sigue creando los mismos cuerpos estáticos y triggers, mientras su renderizador predeterminado pasa a ser `ModularRoomRenderer`. El renderizador geométrico anterior permanece disponible.

`levels.ts` añade exclusivamente tema y decoraciones a la presentación. `GameScene.preload` carga los recursos configurados; el resto de su lógica permanece igual. `EnvironmentPlan` deriva pisos y paredes de la misma definición física que consume el constructor, evitando un segundo mapa de colisiones. Las conexiones de pared usan una máscara norte=1, este=2, sur=4 y oeste=8; las dieciséis combinaciones se traducen a las piezas disponibles de rectas, esquinas, terminaciones, paneles y obstáculos.

`ModularRoomRenderer` selecciona el atlas y crea cuatro capas: piso, decoración opaca, decoración con mezcla SCREEN y paredes. Sus profundidades son -40, -32, -30 y -20. Puertas e indicadores se sitúan por encima de paredes y debajo de actores y proyectiles; efectos y HUD mantienen sus profundidades existentes. El piso cubre también las celdas bajo muros. Las variaciones son deterministas, sin introducir aleatoriedad en la partida.

La escala convierte uniformemente cada celda del atlas al tile físico de 64 px. Se usa filtrado NEAREST. Las decoraciones no tienen cuerpos ni propiedades de colisión; se rechazan posiciones inválidas, duplicadas o reservadas para el jugador y la salida. Los mapas, capas, imágenes e indicadores se destruyen en SHUTDOWN; los atlas se comparten en caché entre habitaciones.

Los temas de las cinco habitaciones son, en orden: industrial, laboratorio, control, industrial y control. Sus ambientes detallados son instalación industrial, laboratorio de energía, servidores, depósito de carga y hangar técnico. Cada habitación tiene ocho decoraciones de piso y equipos visuales sobre sus muros existentes. Se conservan cinco habitaciones, diez oleadas, 53 robots y un máximo de 5300 puntos. Permanecen las muertes de un impacto, las habilidades cargadas por bajas, los disparos, la IA, la línea de visión, los personajes y las rutas narrativas.

## Revisión de los recursos aportados

| Recurso en `public/assets/environment/` | Dimensiones | Uso |
| --- | --- | --- |
| `industrial/tileset.png` | 256 × 256 | Piezas auxiliares y respaldo industrial |
| `laboratory/tileset.png` | 256 × 256 | Piezas auxiliares y respaldo de laboratorio |
| `control/tileset.png` | 256 × 256 | Piezas auxiliares y respaldo de control |
| Ocho láminas en `sources/` | 1254 × 1254 cada una | Recortes medidos, integrados en las cinco habitaciones |

Los tres atlas preparados contienen una cuadrícula regular de 4 × 4 piezas de 64 px. Se cargan directamente, conservando intactos los PNG originales. Se usan los índices 0–1 para pisos, 4–11 para muros, 3 y 12–14 para decoración y 15 para la puerta. Los estados de puerta comparten esa imagen y se diferencian mediante una pequeña barra de color; no se presentan como tres animaciones distintas.

Las piezas decorativas 12–14 incluyen negro opaco alrededor. Se componen con SCREEN en una capa independiente, mientras la rejilla usa mezcla normal. La opacidad del piso se reduce ligeramente en el renderizador para mejorar el contraste de los muros, sin editar imágenes.

Las ocho láminas grandes tienen márgenes y separaciones irregulares: dividirlas directamente en cuatro columnas cortaría piezas incorrectamente. Se midieron los límites de sus 128 piezas en `EnvironmentSheets.ts`. Se toma la región cuadrada central de cada recorte y se escala uniformemente a 64 px con NEAREST, sin deformar su proporción. `EnvironmentSheetTiles.ts` compone atlas de 512 × 512 en memoria. Cada uno combina dieciséis piezas principales, dieciséis complementarias, dieciséis auxiliares del atlas pequeño y cinco paredes rotadas; las celdas restantes se reservan.

Las fuentes se organizaron y renombraron en `public/assets/environment/sources/`. `provenance.json` conserva los nombres anteriores y hashes SHA-256, verificados por pruebas. No se reescribieron los PNG. Las combinaciones activas son industrial-green + maintenance-teal; reactor-cyan + industrial-green; data-blue + maintenance-teal; cargo-olive + assembly-amber; hangar-amber + quarantine-red. Todas las láminas aportan piezas visibles en la campaña.

Se incorporan consolas, servidores, ventiladores, cajas y equipos sobre celdas que ya eran muros. Los pisos reciben rejillas, superficies gastadas, cableado y marcas ambientales. Esos gráficos no añaden daño ni nuevas colisiones. El catálogo completo y las funciones de cada fuente están en `public/assets/environment/README.md`.

Si falta un atlas o sus dimensiones no coinciden con el contrato, se utiliza un respaldo provisional sencillo generado por código: 256 × 192 px, celdas de 32 px. Se guarda bajo una clave separada cuando existe un recurso original incorrecto. Este respaldo no modifica el archivo ni sustituye silenciosamente su textura en caché. Los tres temas actuales usan los PNG aportados, no el respaldo. El contrato para añadir recursos se documenta en `public/assets/environment/README.md`.

## Archivos creados y modificados

| Archivo o grupo | Responsabilidad |
| --- | --- |
| `src/world/environment/RoomTheme.ts` | Temas, atlas, índices, profundidades y contrato de decoración |
| `src/world/environment/EnvironmentSheets.ts` | Ocho ambientes, 128 recortes medidos, roles y combinaciones |
| `src/world/environment/EnvironmentSheetTiles.ts` | Composición de atlas detallados y rotaciones de pared en memoria |
| `src/world/environment/EnvironmentPlan.ts` | Matrices visuales derivadas de `RoomLayout` |
| `src/world/environment/EnvironmentTiles.ts` | Carga, validación, frames de puerta y respaldo provisional |
| `src/world/environment/ModularRoomRenderer.ts` | Tilemaps, composición, puertas y limpieza |
| `src/world/RoomLayout.ts` | Tema y decoraciones opcionales en la presentación |
| `src/world/RoomBuilder.ts` | Selección del renderizador modular predeterminado |
| `src/levels/levels.ts` | Presentación de las cinco habitaciones |
| `src/levels/validateLevelConfig.ts` | Validación de temas, capas y decoraciones |
| `src/scenes/GameScene.ts` | Precarga de atlas configurados |
| `public/assets/environment/` | Once PNG aportados, ocho fuentes organizadas, procedencia con hashes y documentación |
| `tests/environment.test.mjs` | Pruebas puras del plan, atlas y configuración |
| `tests/sprint-8.html`, `tests/sprint-8.browser.js`, `tests/run-sprint-8.mjs` | Pruebas del renderizador y regresión física en navegador |
| `tests/level-config.test.mjs` | Reutilización del cargador TS para las nuevas dependencias de tipos y temas |
| `tests/run-all.mjs`, `package.json` | Comandos y agregado de comprobaciones del sprint |
| `tests/run-sprint-6-levels.mjs`, `tests/run-sprint-7.mjs` | Directorio configurable de resultados para conservar informes históricos |
| `docs/test-results/sprint-8*.json`, `docs/test-results/sprint-8-regressions/` | Evidencia de pruebas actuales |
| `docs/sprint-8.md`, `pendiente.md` | Entrega técnica y retoques finales pendientes |

## Verificación ejecutada

`npm.cmd run build` terminó correctamente: comprobación de tipos y compilación de producción. Vite mantiene el aviso de tamaño del bundle de Phaser; no es un error de compilación.

`npm.cmd run test:sprint8` terminó con **1161 comprobaciones aprobadas y cero errores de consola**, usando Edge 156 y Canvas, después de integrar las ocho láminas detalladas:

| Suite | Comprobaciones |
| --- | ---: |
| Configuración, oleadas, carga especial y plan visual | 90 |
| Selección | 147 |
| Combate | 69 |
| Habilidades | 39 |
| Integración Sprint 4 | 44 |
| Presentación Sprint 5 | 58 |
| Niveles Sprint 6 | 205 |
| Progresión Sprint 7 | 350 |
| Escenarios Sprint 8 | 159 |
| **Total** | **1161** |

Las 90 comprobaciones puras incluyen 28 del entorno: hashes de las ocho fuentes, dimensiones de imágenes, límites y separación de los recortes, cobertura de cada estilo y presencia de las ocho fuentes en la campaña. Las 159 del navegador verifican los tres atlas pequeños y los ocho ambientes detallados, cobertura del piso, coincidencia exacta de paredes visuales y físicas, profundidad, decoración sin cuerpos, estados de puerta, fallback ante dimensiones incorrectas, conservación de reglas al cambiar de tema y creación y liberación de cachés estáticas. Se prueban además las cinco presentaciones de la campaña con sus ocho decoraciones y posiciones reales de obstáculos.

Se probaron Alex y Lua cerca de una pared con posición inicial válida: colisión de jugador y robot, impactos de proyectiles de ambos propietarios, bloqueo de línea de visión y entrada existente de movimiento/disparo. La regresión completa comprueba muerte, habilidades, oleadas, transiciones y progresión.

Doce reinicios alternando temas y personajes comprobaron destrucción de mapas y puertas, estabilidad de cuerpos, colliders, teclas y objetos, y reutilización de atlas. Se verificaron mapas de 9 × 7, 20 × 12 y 28 × 18 celdas, sin huecos ni deformación de escala.

En el escenario de 28 × 18, la representación geométrica creó 594 objetos y la modular 95, con los mismos 89 cuerpos físicos. Cinco construcciones medidas por variante tardaron aproximadamente 2,0–4,1 ms para geometría y 2,8–4,0 ms para Tilemaps en esta ejecución. Esto valida construcción acotada y menor cantidad de objetos; no demuestra una mejora de FPS universal.

Se capturaron y revisaron los tres temas iniciales en escritorio a 1366 × 768 y una vista estrecha a 390 × 844. Tras ampliar los recursos se revisaron también las cinco habitaciones detalladas a 1366 × 768: `.preview.local/detailed-room-1.png` a `detailed-room-5.png`. La pantalla estrecha mantiene el escenario completo con espacio vertical libre, siguiendo el encuadre existente.

Resultados reproducibles: `docs/test-results/sprint-8.json` y `docs/test-results/sprint-8-environment.json`. Los resultados de regresión se guardan por separado para no sobrescribir los informes históricos.

## Límites y acabado posterior

Las comprobaciones automatizadas usan Edge/Canvas; no se ejecutó validación WebGL ni una matriz de dispositivos. Las capturas y las pruebas dirigidas no equivalen a partidas manuales completas con combate libre. Esa revisión de balance, los diálogos definitivos y el audio final siguen en `pendiente.md`.

Las ocho láminas grandes ya están integradas. Siguen siendo opcionales las animaciones específicas de puertas: cada ambiente usa la puerta de su lámina con el indicador de estado existente. Los 128 recortes están disponibles en el catálogo, aunque una habitación no muestra todas las piezas simultáneamente. El sistema modular y su integración con la física y progresión existentes quedan implementados dentro del alcance del Sprint 8.

## Revisión de fluidez tras integrar los tilesets

Ante la percepción de lentitud se verificó que `Player.speed` sigue en 220 px/s: no se redujo la velocidad del personaje. La comparación inicial medía construcción de habitaciones, no el coste de dibujarlas continuamente. Se añadió una medición del renderizado repetido: el Tilemap nuevo sí exigía más tiempo de CPU con Canvas que la geometría previa.

`ModularRoomRenderer` ahora almacena cada capa estática en una textura Canvas al cargar habitaciones pequeñas y medianas. Se recorta cada superficie a sus tiles ocupados, conserva escala, profundidad, opacidad y composición, y dibuja cuatro imágenes durante la partida. Los Tilemaps originales siguen disponibles como definición visual; quedan ocultos mientras se utilizan sus cachés. No hay trabajo de reconstrucción por cuadro. Al salir se destruyen imágenes y texturas privadas, además del Tilemap. No se modifican los atlas originales.

La optimización se aplica a Canvas. WebGL conserva sus Tilemaps y su renderizado por lotes. Se limita a mapas de hasta 1 048 576 píxeles de atlas para acotar memoria; las habitaciones mayores conservan el culling original. Una habitación actual usa aproximadamente 5–6 MB de superficies adicionales, según los recortes de decoración; no se conservan superficies de habitaciones anteriores.

`npm.cmd run test:sprint8:performance` compara los mismos tiles y cámara, con y sin caché, a escala nativa y sin redondeo de cámara para comprobar los píxeles. En la medición a 1920 × 1080 el dibujo pasó de aproximadamente 1,06–1,34 ms a 0,11–0,13 ms por cuadro. Se verificaron cero diferencias de píxel en ese escenario y cero llamadas de dibujo al Tilemap mientras la caché está activa. Esto mide trabajo de renderizado local, no los FPS del navegador del usuario ni la causa completa de cualquier lentitud en otros equipos.

La evidencia adicional está en `docs/test-results/sprint-8-performance.json`, con el runner `tests/run-sprint-8-performance.mjs`. La medición actual usa el atlas detallado `data-blue`, con tres decoraciones de piso: aproximadamente 1,49–1,82 ms sin caché frente a 0,11–0,14 ms con caché, sin diferencias de píxel a escala nativa. Las 159 comprobaciones de entorno incluyen los tres temas, los ocho ambientes detallados, las cinco habitaciones de campaña y doce cambios consecutivos que verifican la liberación de imágenes y texturas privadas.

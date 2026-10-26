# Sprint 9 — presentación progresiva y mapas tácticos

Los niveles 1–4 presentan exclusivamente un robot por nivel, en orden rojo, azul, amarillo y naranja. Se rediseñó su geometría para favorecer el patrón presentado, conservando habitaciones físicas de 40 × 24 tiles, cámara, colisiones y progresión existentes.

| Nivel | Escenario | Enemigos | Ventaja del terreno |
| --- | --- | --- | --- |
| 1 | Patio de tiro | Solo rojos | Tres líneas horizontales largas entre bancos de maquinaria, para tiro directo y fuego cruzado |
| 2 | Galería de ensamblaje | Solo azules | Avenidas verticales y racks alternados, con espacio para mantener distancia y cubrir el paso con ráfagas |
| 3 | Circuito de mantenimiento | Solo amarillos | Islas de equipos desplazadas, curvas cortas y recorridos conectados para su persecución rápida |
| 4 | Celdas del reactor | Solo naranjas | Pantallas interiores que bloquean balas normales; el abanico naranja puede atravesarlas, con rutas laterales para evadir |
| 5 | Arena de entrenamiento | Mixtos, provisional | Mantiene el encuentro jugable existente mientras se define el jefe |

**El jefe del nivel 5 queda pendiente por instrucción del usuario.** No se implementaron comandante, inmunidades, ventanas de vulnerabilidad, barras de vida ni ataques de jefe. La sala temporal no se presenta como un jefe terminado. Su concepto, reglas y mapa definitivo se registraron en `pendiente.md`.

## Composición y presentación

Las primeras cuatro salas tienen respectivamente 88, 108, 126 y 114 tiles de maquinaria interior con colisión, además de sus perímetros. Antes había grupos pequeños separados sobre amplias zonas vacías. Los bancos, racks, islas y pantallas ahora organizan el movimiento y las líneas de tiro. Todos los tiles de suelo transitables siguen conectados; la salida conserva acceso.

Cada sala de tamaño normal incorpora **128 detalles de piso**, en lugar de 48. Rejillas, paneles, marcas y conducciones se colocan sobre suelo libre; las conducciones y advertencias cercanas a maquinaria refuerzan los bordes. La decoración no añade cuerpos físicos ni bloquea rutas, puertas o el inicio. En los mapas pequeños la cantidad se adapta al área disponible.

Se reutilizan las ocho láminas existentes mediante estas combinaciones: quarantine-red + data-blue; data-blue + maintenance-teal; cargo-olive + assembly-amber; reactor-cyan + industrial-green; hangar-amber + quarantine-red. No se generan ni modifican imágenes.

`RoomBriefing` presenta el nombre de la sala y una pista táctica durante los primeros ocho segundos de combate, con desvanecimiento durante el último segundo. Se adapta al viewport y al zoom; pausar también congela su tiempo. No incorpora temporizadores de ataque ni altera la visual novel.

## Generación, física y rendimiento

`RoomScenarios.ts` centraliza identidad, color, ambientación y zonas de aparición. `arcadeRooms.ts` define los bloques en una referencia de 40 × 24 y los adapta proporcionalmente. `levels.ts` aplica el color de cada escenario a **todas sus oleadas**, no solo a la primera.

Se conservan los conteos 6, 8, 10, 12 y 14 por oleada, las diez oleadas y los 106 robots / 10600 puntos posibles de la campaña provisional. No se cambian patrones de ataque, muerte de un impacto, ulti de diez bajas y 45 segundos ni checkpoints.

Las posiciones se resuelven contra el suelo real con separación entre robots, distancia al jugador y protección de puertas. `RoomPlacement` selecciona el punto seguro más cercano mediante un recorrido y retira los candidatos demasiado próximos; evita ordenar y comparar contra todas las posiciones anteriores repetidamente al aumentar la decoración.

El escenario estático sigue usando Tilemaps y cachés Canvas de hasta 512 px. La primera sala usa 46 bloques, unos 32,5 MiB. En la medición local de dibujo a 1920 × 1080, el coste estático fue aproximadamente 2,38–3,14 ms sin caché y 0,23–0,36 ms con caché, con diferencia máxima de un valor por canal de píxel y cero llamadas de dibujo a Tilemaps al usar caché. No es una garantía de FPS en otros equipos.

## Validación y archivos

- `npm.cmd run build`: tipos y producción aprobados; se conserva el aviso de tamaño del bundle de Phaser.
- `npm.cmd run test:sprint9`: **1434 verificaciones**, cero errores de consola.
- `node tests/run-sprint-9-performance.mjs`: comparación de renderizado aprobada.
- Matrices 40 × 24, 48 × 30, 24 × 16 y 20 × 14: conectividad, salidas, separación y apariciones válidas.
- Se recorrieron las salas y oleadas con ambos personajes mediante eliminaciones dirigidas y transiciones reales; estas pruebas no sustituyen partidas manuales de balance.
- Se inspeccionaron capturas de las cinco salas y se comprobó el color exclusivo de las cuatro primeras y sus títulos. Las vistas generales usan una cámara reducida solo para revisar el mapa completo; el juego conserva su cámara de seguimiento.

Archivos principales: `src/data/rooms/arcadeRooms.ts`, `src/levels/RoomScenarios.ts`, `src/levels/levels.ts`, `src/levels/RoomPlacement.ts`, `src/config/CombatBalance.ts`, `src/world/RoomLayout.ts`, `src/ui/RoomBriefing.ts` y `src/scenes/GameScene.ts`.

Se adaptaron las pruebas de dificultad para comprobar el soldado básico independientemente del color de cada sala, y las pruebas de bajas para conservar identidades válidas de oleada al probar todas las variantes. Los informes están en `docs/test-results/sprint-9.json`, `sprint-9-large-rooms.json`, `sprint-9-performance.json` y `robot-attacks.json`.

Las capturas locales de revisión están en `.preview.local/tactical-level-1.png` hasta `tactical-level-5.png`. Quedan las partidas manuales de balance y la validación en WebGL/otros dispositivos, además del diseño del jefe.

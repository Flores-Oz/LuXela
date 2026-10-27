# Sprint 12 — Segunda etapa y verdadero combate

## Campaña y mapas

La campaña tiene 11 niveles, 22 oleadas normales y 217 robots de oleada. Los cuatro primeros conservan sus mapas y patrones; su presión se incrementó en el ajuste posterior solicitado por el usuario. Quimera usa la misma entidad, spritesheet y hitbox en ambas apariciones.

| Nivel | Escenario | Robots | Oleadas × activos máximos | Composición |
| --- | --- | --- | --- | --- |
| 5 | Núcleo energético | Quimera, prueba | Sin oleadas | Conserva 72 puntos y tres fases; su derrota habilita la salida al nivel 6. |
| 6 | Zona de convergencia | Rojo y azul | 3 × 9 | Bancos horizontales, rutas laterales y conductos azules/equipamiento rojo y azul. |
| 7 | Reactor industrial | Amarillo y naranja | 3 × 9 | Islas desplazadas de maquinaria, circuitos de persecución y conductos naranjas. |
| 8 | Sistema de defensa | Rojo, azul y amarillo | 3 × 10 | Servidores alineados, sectores conectados y pasos transversales. |
| 9 | Máxima seguridad | Azul, naranja y rojo | 3 × 9 | Compartimentos abiertos, divisiones, carga y accesos por distintas direcciones. |
| 10 | Última línea de defensa | Los cuatro | 3 × 10 | Coberturas escalonadas y rutas alternativas. |
| 11 | Verdadero combate | Quimera avanzado y refuerzos limitados | Hasta 6 refuerzos activos | Arena central amplia y coberturas periféricas energéticas. |

Todos los mapas tienen 40 × 24 tiles de 64 px (2560 × 1536), generación proporcional, puertas y circulación conectada. Se validaron también tamaños mayores. Suelos, decoración y maquinaria usan las capas de Tilemap existentes y las colisiones lógicas previas. En Canvas se mantienen los fragmentos estáticos cacheados; WebGL conserva los Tilemaps.

El límite por oleada se configura en `CombatBalance.maxActivePerLevel`. Los niveles 6–9 comparten velocidad base de 144 px/s, detección de 550–560 px y tres oleadas, tomando el nivel 9 como referencia. Los niveles 1–4 tienen 8/10/12/12 robots por oleada, mayor detección y más movilidad; el rojo dispara cada 1100 ms en el primer nivel. La dificultad combina variantes y geometría; no se añadieron nuevas clases de robots. La puntuación base completa es 23700; los refuerzos derrotados suman puntos adicionales.

## Quimera avanzado

`QuimeraController` recibe un modo `trial` o `advanced`. `QuimeraAdvancedConfig` fija 96 puntos de integridad y umbrales de 75 %, 50 % y 25 %. Se conserva el daño normal de 2 y los especiales de Alex/Lua de 12/14, con multiplicador 1,5 durante recuperación.

| Fase | Patrones |
| --- | --- |
| 1 — Análisis | Disparos alternados desde los cañones, ráfagas cortas y dirigido. |
| 2 — Sobrecarga | Ráfagas cruzadas secuenciales rojas/azules, abanico y alternados. |
| 3 — Defensa | Invocaciones, alternados, rayo y abanico. |
| 4 — Exterminio | Rayo, onda expansiva, ráfagas cruzadas, invocaciones, combinado y descarga radial con sector seguro. |

Las fases se resuelven en límites seguros de acción, sin restaurar vida. Los ataques conservan advertencia, dirección fijada y recuperación. Las velocidades, secuencias y tiempos son configurables.
El ajuste posterior amplía los alternados a seis disparos y las ráfagas cruzadas a cinco tandas, separadas 260 ms. Los abanicos avanzados tienen siete proyectiles entre −38° y +38°, manteniendo huecos para esquivar.

- **Rayo:** advertencia de 1500 ms, alcance máximo 1500 px, anchura de daño 16 px y ventana activa de 650 ms. Se recorta contra la primera pared interior o exterior; las coberturas protegen al jugador. Usa un segmento con anchura contra el cuerpo real del jugador. Al terminar desaparecen imagen y daño.
- **Onda:** advertencia de 1500 ms; anillo que crece de 40 a 240 px durante 1200 ms, con grosor de daño de 18 px. El centro y el exterior del anillo no son daño invisible. El radio visual se ajusta a los fotogramas inspeccionados. Es un ataque de área como el pulso anterior; la cobertura no sustituye escapar del anillo.
- **Refuerzos:** máximo 6 vivos, lote máximo de 3 y 7 segundos entre solicitudes, en las fases 3 y 4. Los puntos requieren suelo con espacio alrededor, separación mínima de 360 px del jugador y 140 px entre entidades. Se anticipan con teletransporte durante 900 ms y se vuelven a comprobar antes de aparecer. Son los mismos cuatro robots; sus bajas puntúan y cargan los especiales. No es obligatorio eliminarlos para derrotar al jefe.
- **Adaptación:** observa desplazamiento y tiempo quieto. Cada tercera selección puede priorizar un dirigido contra quien permanece inmóvil o un rayo de largo alcance en fase 4. La anticipación está limitada a 180 ms/70 px y queda fijada durante la advertencia. No usa información futura ni guarda aprendizaje entre sesiones.
- **Límites:** hasta 72 proyectiles enemigos simultáneos en la segunda etapa, compartidos por jefe y robots. Los proyectiles animados reutilizan `Projectile`, sus grupos, expiración y reglas de paredes. Solo las mecánicas perforantes anteriores atraviesan paredes interiores.

## Legibilidad y materialización de robots

Los disparos del jugador pasan de 16 a 22 px, los de robots normales de 16 a 24 px y las celdas de energía del jefe de 32 a 56 px. Sus áreas de impacto se conservan: diámetro de 16 px para proyectiles normales y 8 px para la energía con transparencia. `ProjectileConfig.ts` separa presentación e impacto.

`RobotSpawnEffect` comparte los doce frames de `robot-spawn.png` entre las invocaciones y todas las oleadas de los niveles 1–4 y 6–10. En las oleadas, el robot aparece gradualmente durante 900 ms y no se mueve ni dispara hasta materializarse. Conserva la muerte de un impacto. La animación se detiene con la pausa y se destruye al eliminar el robot o cambiar de escena. En los niveles 5 y 11 no se inventan robots ordinarios: el primero sigue sin refuerzos y el final utiliza sus invocaciones configuradas.

Los relojes avanzan con el delta de escena: pausa, muerte, salida y reinicio cancelan o congelan ataques y efectos según corresponda. No se registran colliders nuevos para cada rayo, onda o invocación.

## Introducción y final

Antes del nivel 11 se utiliza `VisualNovelScene` con la ilustración aportada y estas líneas, en este orden:

1. Datos obtenidos.
2. Patrones aprendidos.
3. Prepárate para el verdadero combate.

La ilustración aparece con el fondo oscurecido y la transición existente. Los textos usan la escritura progresiva y los controles habituales de continuar/omitir. No hay jefe ni ataques activos durante el diálogo. La introducción se marca como vista solo para ese encuentro de la partida; el reintento de la arena no la repite.

El nivel 5 no concede victoria ni abre un epílogo: muestra «Prueba de combate finalizada», desbloquea su puerta y conserva la partida. Solo destruir al Quimera del nivel 11 valida la campaña completa y abre una pantalla provisional de victoria. No se escribieron epílogos definitivos.

Se conserva el remate solicitado previamente: 10 % o menos mientras el jefe viva, proximidad de 160 px, visión despejada, secuencia ← ↑ ↓ → Espacio y 0,6 s por tecla, con animaciones y frases de Alex/Lua. Funciona en ambos encuentros.

Conforme al requisito explícito del Sprint 12, los especiales requieren diez bajas nuevas por uso y ya no imponen la espera anterior de 45 s. El tiempo nunca proporciona bajas ni recarga por sí solo; se conservan los tiempos de animación y recuperación propios de cada ataque.

## Recursos organizados

Se vació `public/assets/Recursos a verificar/` trasladando sus archivos, sin sobrescribir recursos anteriores:

| Destino en `public/assets/` | Dimensiones reales y uso |
| --- | --- |
| `tilesets/advanced-industrial.png` | Atlas técnico 512 × 512 armado con las 64 piezas aportadas de 64 × 64, sin márgenes. |
| `tilesets/advanced-industrial-frames/tile_00.png` … `tile_63.png` | Los 64 recortes originales preservados. |
| `tilesets/sources/advanced-industrial-original.png` | Lámina original de 1254 × 1254 preservada. No se usa como mapa completo. |
| `effects/quimera-core-charge.png` | 1024 × 512, ocho celdas de 256 × 256. |
| `effects/quimera-projectiles.png` | 512 × 512, dieciséis celdas de 128 × 128; cuatro fases por variante de color/tamaño. |
| `effects/quimera-beam.png` | 2048 × 384, doce celdas de 512 × 128; los frames 4–7 muestran el rayo completo activo. |
| `effects/quimera-shockwave.png` | 1024 × 768, doce celdas de 256 × 256; se usan los anillos continuos 3–8 para el daño expansivo. |
| `effects/robot-spawn.png` | 1024 × 768, doce celdas de 256 × 256. |
| `bosses/quimera-intro.png` | Ilustración 1920 × 1080. |

Los cinco efectos son RGBA y conservan su transparencia. La introducción y la lámina industrial original son RGB. La única incompatibilidad dimensional fue la lámina industrial de 1254 px: se resolvió utilizando los recortes de 64 px suministrados, en lugar de tratarla incorrectamente como un atlas de 512 px. No se generaron ilustraciones nuevas.

`scripts/prepare-advanced-tileset.ps1` permite reconstruir el atlas. `public/assets/tilesets/sprint-12-provenance.json` registra dimensiones, formato y SHA-256 de los recursos de ejecución.

## Archivos principales

- `levels/levels.ts`, `LevelConfig.ts`, `RoomScenarios.ts`, `validateLevelConfig.ts`, `data/rooms/arcadeRooms.ts` y `CombatBalance.ts`: campaña, mapas, variantes y límites.
- `AdvancedIndustrialTiles.ts`, `EnvironmentPlan.ts`, `EnvironmentTiles.ts`, `RoomTheme.ts`: registro y selección de las piezas del nuevo atlas.
- `QuimeraAdvancedConfig.ts`, `QuimeraController.ts`, `Quimera.ts`, `CombatObservation.ts`: perfiles, fases, ataques y observación.
- `BossAttackGeometry.ts`, `QuimeraEffects.ts`, `QuimeraReinforcements.ts`: geometría, efectos y refuerzos.
- `Projectile.ts`, `EnemyProjectiles.ts`, `EnemyAttackController.ts`: apariencia animada, posiciones de cañones y límite común; sin cambiar ataques normales.
- `ProjectileConfig.ts`, `RobotSpawnEffect.ts`, `Enemy.ts`: tamaño visible separado de hitbox y materialización de oleadas, con suspensión de IA y limpieza.
- `SpecialAbilityConfig.ts`, `SpecialAbility.ts`: disponibilidad por diez bajas nuevas sin cooldown temporal; mantiene animación y recuperación.
- `GameScene.ts`, `QuimeraEncounter.ts`, `BossHealthBar.ts`, `ArcadeRunService.ts`: combate, HUD, puntuación, pausa, limpieza y progresión.
- `quimeraIntro.ts`, `NarrativeRouteManager.ts`, `NarrativeConfig.ts`, `VisualNovelScene.ts`, `CompletionScene.ts`: introducción y victoria provisional.
- `tests/sprint-12*`, sus runners y las pruebas de mapas anteriores actualizadas: validación de campaña, ataques y recursos.

## Validación

Comandos: `npm run build`, `npm run test:sprint12`, `npm run test:sprint12:visual`, `npm run test:sprint12:performance` y `npm run test:finisher`.

La suite actual utiliza todos los tests de lógica y las regresiones de selección, controles, combate, habilidades y robots. Sustituye los recorridos históricos de cinco niveles por un recorrido de once niveles con ambos personajes. Los runners históricos permanecen disponibles como referencia del alcance anterior; el comando de aceptación de la campaña actual es `test:sprint12`.

La integración incluye una carga y emisión de rayo por la IA real de producción, evasión de la dirección fijada, pausa durante el rayo activo, abandono durante el ataque y limpieza posterior. El ajuste de balance añade comprobaciones de tamaños físicos conservados, materialización en todas las oleadas, pausa y limpieza del efecto, además de los seis refuerzos máximos. `npm run build` aprueba tipos y compilación; permanece la advertencia previa de Vite por el tamaño del paquete Phaser. El resultado actualizado se registra en `docs/test-results/sprint-12.json`.
Resultado del ajuste: **748 comprobaciones aprobadas** (192 unitarias, 147 de selección, 69 de combate, 57 de habilidades, 103 de robots, 32 de remates y 148 de campaña/materialización), sin errores de consola. Las capturas `wave-materialization.png` y `larger-projectiles.png` muestran los dos cambios visuales nuevos y fueron examinadas.

Informes y capturas: `docs/test-results/sprint-12.json` y `docs/test-results/sprint-12/`. Se examinaron las vistas completas de los niveles 6–11, la introducción, el rayo, la onda y las vistas estrechas. Las capturas generales usan una cámara de inspección para mostrar todo el mapa; el juego conserva el seguimiento dinámico normal.

La prueba de estrés utiliza diez robots y hasta 72 proyectiles ampliados, comprueba colliders constantes y cero proyectiles residuales después de limpiar. La medición actual está en `docs/test-results/sprint-12/performance.json`. Es una medición controlada en Edge/Canvas, no una garantía para todos los dispositivos.
Con toda la sala visible a 1280 × 768, la última medición dio 16,85 ms por fotograma de base y 18,70 ms bajo estrés (aproximadamente 59/53 FPS), con siete colliders y cero proyectiles residuales. El estrés repone hasta 72 disparos continuamente; ese límite es un techo compartido, no una cantidad emitida en cada ataque normal.

Pendientes de acabado: balance mediante partidas libres, audio definitivo, WebGL y otros navegadores/dispositivos. El aprendizaje no se transporta desde el nivel 5, algo opcional en la especificación. Los epílogos definitivos siguen reservados para otro sprint. No se instalaron dependencias.

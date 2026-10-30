# Sprint 13 — Balance, IA reactiva y Quimera

## Resultado y alcance

Se conserva el controlador y la entidad de Quimera. El nivel 5 tiene dos fases y el nivel 11 tres, con 72/144 puntos de integridad. La dificultad procede de selección contextual, teletransporte anticipado, combinaciones y recuperaciones más cortas. El proyecto usa Phaser 4.2.1; no se cambió el motor ni se instalaron dependencias.

Continúan los once niveles, las rutas e introducción narrativa existentes, el remate con proximidad/QTE, las especiales mediante diez bajas y la muerte de un impacto para jugadores y robots normales. La pantalla de victoria del nivel 11 conserva el cierre provisional existente; los epílogos definitivos siguen pendientes.

## Robot rojo

`redRobotRangeMultiplier = 1.25` en `RobotConfig.ts` multiplica exclusivamente su detección y su alcance de ataque: 600 → 750 px para el disparo. Por ejemplo, la detección configurada del primer nivel pasa de 520 a 650 px. El soldado mantiene velocidad, cadencia configurada por nivel, textura y línea de visión.

La bala roja dura 2500 ms en lugar de 2000: a 300 px/s necesita ese tiempo para recorrer los 750 px. Esta excepción viaja con el disparo; los proyectiles del jugador y de los otros tres robots mantienen su duración y tamaño. Azul conserva cinco disparos separados 200 ms; amarillo conserva persecución, disparo cada 800 ms y explosión por contacto; naranja conserva seis perforantes, carga de 1000 ms y la excepción de 650 ms del nivel 4.

## Nivel 5

| Fase | Vida | Comportamiento |
| --- | --- | --- |
| 1 — Análisis | 100–50 % inclusive | Dirigido, ráfaga, abanico, módulos, alternados, combinado y rayo; alternancia con memoria reciente. Puede reaccionar con pulso cercano o largo alcance y reposicionarse mediante teletransporte. |
| 2 — Respuesta | Menos de 50 % | Secuencias de ráfaga → rayo y dirigido → pulso, módulos, ráfagas cruzadas, abanico, combinado y onda. Hasta dos refuerzos vivos, uno por solicitud y 14 s entre solicitudes. |

Desplazamiento de 85/100 px/s, reposición de 750/550 ms y recuperación ordinaria de 850/950 ms. Los proyectiles propios avanzan a 330/360 px/s. El encuentro permite aprender patrones, sin descarga radial, área dirigida ni arsenal completo del final.

## Nivel 11

| Fase | Vida | Comportamiento |
| --- | --- | --- |
| 1 — Reconocimiento | 100–70 % inclusive | Alternados, ráfaga, abanico y dirigido; movilidad y teletransporte táctico desde el comienzo. |
| 2 — Adaptación | Menos de 70 %, hasta 35 % inclusive | Selección reactiva por cercanía, distancia, región estática y dirección sostenida. Arsenal perforante, presión de proyectiles/rayo e invocaciones limitadas. |
| 3 — Sobrecarga | Menos de 35 % | Añade área dirigida → ráfagas cruzadas y conserva arsenal, onda, descarga radial con sector seguro y ataques combinados existentes. Recuperaciones y advertencias completas. |

La introducción mantiene exactamente «Datos obtenidos.», «Patrones aprendidos.» y «Prepárate para el verdadero combate.». Los umbrales son estrictos: estar exactamente en 70/50/35 % no activa todavía la fase inferior. El cambio ocurre en reposición o al terminar una recuperación, cancela las etapas pendientes incompatibles, limpia efectos/invocaciones pendientes y nunca restaura vida.

## IA reactiva y combinaciones

`CombatObservation` observa posiciones reales, incluyendo los getters de `Player`. Detecta permanencia dentro de una región de 60 px y dirección sostenida; descarta saltos incompatibles con desplazamiento normal. No conserva datos entre encuentros ni utiliza aprendizaje automático.

- Estático: desde fase 2 del final, después de 1500 ms en una región puede preparar un área sobre la posición observada. Su centro queda fijado y se muestra durante 1150 ms antes de producir daño. Reutiliza la onda existente y un relleno visible para delimitar el disco dañino; radio máximo 140 px, duración 900 ms. El área deja de dañar al desaparecer.
- Lejano: a más de 650 px prioriza largo alcance y puede buscar un destino con visión despejada.
- Cercano: a menos de 240 px prioriza una onda advertida. El primer encuentro usa un pulso y umbral de 230 px.
- Dirección sostenida: después de 900 ms puede preparar un dirigido anticipado usando velocidad observada. La anticipación está limitada a 180 ms y 70 px; queda fijada durante el aviso, sin proyectiles perseguidores.

Cada reacción tiene separación mínima de 3200 ms en el final y 5000 ms en la prueba. La memoria de tres ataques recientes evita castigos inmediatamente repetidos. La selección también descarta combos fuera de alcance e invocaciones que no estén disponibles.

Secuencias reutilizadas:

1. Presión: ráfaga → recuperación breve → advertencia completa → rayo.
2. Reposición: aviso de teletransporte → traslado → pausa → advertencia de dirigido/rayo → disparo.
3. Proximidad: onda/pulso advertido → recuperación → nueva reposición.
4. Sobrecarga, exclusiva de fase 3 final: área advertida → recuperación hasta terminar el efecto → ráfagas cruzadas advertidas.
5. Arsenal existente: seis perforantes → cinco tandas rojas/azules → rayo, cada etapa con su advertencia.

La recuperación entre etapas es como mínimo de 650 ms en la prueba y 450 ms en el final. Se prolonga cuando es necesario para terminar la ventana de daño de rayo/onda/área, con 150 ms adicionales. Los efectos nuevos empiezan en tiempo cero al emitirse; el delta del fotograma de emisión pertenece a la advertencia anterior.

## Teletransporte y seguridad

`QuimeraTeleport` reutiliza los doce cuadros de `robot-spawn.png` en origen y destino. El controlador avisa durante 900 ms en la prueba y 550 ms en el final, sin disparos durante el traslado; después espera 350/180 ms y prepara el siguiente ataque con su aviso completo. La animación completa se ajusta al aviso del encuentro sin acelerar la materialización de robots normales.

Se cachean candidatos del suelo una vez por encuentro. La selección y la confirmación comprueban paredes, perímetro, cuerpo completo con su offset real, otros robots, visión y viewport actual. Requiere al menos 260 px del jugador, 240 px del origen y 160 px de otros enemigos. Si el jugador se acerca al destino o cambia la cámara durante el aviso, se vuelve a validar; un destino inválido cancela el traslado. Si no hay un destino seguro visible, se conserva el desplazamiento normal.

Los intervalos mínimos entre intentos son 12/9,5 s en el nivel 5 y 5/4/3 s en el nivel 11. Los avisos se congelan con la escena y se destruyen al morir, salir o iniciar el remate. Se sincronizan los offsets del cuerpo de Arcade después del traslado para evitar una colisión desplazada durante el primer fotograma.

Los tiros normales y el rayo chocan con paredes. Solo los perforantes atraviesan paredes interiores y todos los proyectiles respetan el perímetro. Las áreas conservan la semántica de la onda: salir de la zona advertida es la defensa; una pared no sustituye esa evasión. El techo compartido de 72 proyectiles se aplica también a los refuerzos de ambos jefes.

## Archivos y parámetros

| Archivos | Responsabilidad |
| --- | --- |
| `src/config/RobotConfig.ts`, `src/entities/enemies/Enemy.ts`, `EnemyAttackController.ts` | Alcance exclusivo del rojo y metadatos de duración. |
| `src/entities/Projectile.ts`, `src/systems/EnemyProjectiles.ts` | Duración por disparo, conservando física y limpieza existentes. |
| `src/config/QuimeraConfig.ts`, `QuimeraAdvancedConfig.ts` | Umbrales, movilidad, advertencias, recuperaciones y patrones por encuentro. |
| `src/config/BossTacticsConfig.ts` | Reacciones, límites de invocación, tiempos y distancias del teletransporte. |
| `src/entities/boss/QuimeraController.ts`, `CombatObservation.ts`, `Quimera.ts` | Cola existente de combos, selección reactiva, memoria y fases. |
| `src/entities/boss/BossTeleportGeometry.ts`, `src/systems/QuimeraTeleport.ts` | Selección geométrica, aviso, revalidación y sincronización del cuerpo. |
| `src/systems/QuimeraEffects.ts`, `QuimeraReinforcements.ts`, `QuimeraEncounter.ts` | Efectos compartidos en ambos encuentros, área dirigida, cupos y ciclo de vida. |
| `src/scenes/GameScene.ts`, `src/ui/BossHealthBar.ts` | Carga de efectos en ambos jefes, bajas de refuerzos y etiqueta de fases según perfil. |
| `tests/sprint-13.*`, `tests/run-sprint-13.mjs` | Lógica, combate real, capturas y resultados. |
| `tests/quimera.test.mjs`, `sprint-12.test.mjs`, `sprint-12.browser.js`, `combat.browser.js` | Regresiones actualizadas a los umbrales y alcance nuevos. |
| `tests/run-sprint-12-all.mjs`, `run-sprint-12-performance.mjs`, `package.json` | Reutilización de runners con selección de Sprint 13. |

Para balance posterior: `redRobotRangeMultiplier`, `phaseThresholds`, `phasePatterns`, `repositionMs`, `recoveryMs`, `warningMs`, `teleportCooldownMs`, `reactionCooldownMs`, `stationaryMs`, `nearDistance`, `farDistance`, `repeatDirectionMs`, `summons` y los límites de predicción/área.

## Validación

- `npm run build`: TypeScript y compilación aprobados. Permanece la advertencia previa de tamaño del paquete Phaser.
- `npm run test:sprint13`: **870 comprobaciones aprobadas**: 208 de lógica, 147 de selección, 69 de combate, 68 de habilidades, 103 de robots, 32 de remates y 243 de campaña/Sprint 13. Cero errores de consola. El informe es `docs/test-results/sprint-13.json`.
- El recorrido conserva los once niveles y ambas victorias/QTE. Los casos específicos verifican un tiro rojo real desde 740 px, bloqueo por pared, teletransporte en ambos niveles con ambos personajes, pausa, avisos sin daño prematuro, llegada con cuerpo libre, umbrales exactos, evasión de área, cupos de invocación, puntuación/carga y limpieza.
- Las pruebas de selección, predicción y combos usan el reloj real del controlador con escenarios deterministas. Los casos de navegador ejecutan Phaser/Canvas, física, colisiones y escenas reales; algunos tiempos y movimientos se controlan desde el fixture para reproducirlos.
- Capturas generadas y examinadas: `docs/test-results/sprint-13/level-5-teleport-warning.png`, `level-11-teleport-warning.png` y `final-stationary-area-warning.png`. Los avisos de traslado se capturan al 45 % de su duración para mostrar un cuadro visible de la animación.
- Rendimiento y quince teletransportes consecutivos controlados: `npm run test:sprint13:performance`, informe `docs/test-results/sprint-13/performance.json`.

La medición a 1280 × 768 en Canvas, con toda la sala visible, registró 16,67 ms de media tanto en reposo como con diez robots y 72 proyectiles animados (aproximadamente 60 FPS); p95 de 16,70/16,80 ms. Los quince teletransportes emplearon 33,4 ms de CPU en total en la simulación controlada: 237 objetos antes/después, diez colliders constantes, cero temporizadores y ningún destino pendiente. El estrés normal conservó ocho colliders y dejó cero proyectiles tras limpiar. Estas cifras describen esta ejecución y no garantizan el rendimiento de otros equipos.

## Ajuste de agresividad posterior

Los jefes tienen 72/144 puntos de integridad y la cantidad de proyectiles por patrón. La ráfaga corta ahora separa sus disparos 170 ms (antes 230); las tandas avanzadas, 170 ms (antes 260). El combinado deja 600 ms entre sus dos emisiones.

El jefe final utiliza velocidades de proyectil de 390/420/450 px/s, reposición de 500/400/300 ms y recuperación ordinaria de 800/950/1100 ms por fase. Sus advertencias de alternados, ráfagas cruzadas, rayo y área son 500/750/950/1150 ms. El pulso mantiene 1100 ms y la onda dispone de 1300 ms para conservar espacio de evasión.

Los módulos de colores se clonan al preparar el ataque: velocidad ×1,1 y tiempos ×0,8 en la prueba; velocidad ×1,25 y tiempos ×0,65 en el final. Esto acelera también la carga perforante del jefe a 800/650 ms, sin modificar las configuraciones de los robots normales. La medición de rendimiento anterior precede este ajuste de tiempos; los límites de entidades y proyectiles se conservan.

## Ampliación de patrones y tandas de apoyo

El primer encuentro añade alternados, combinado y rayo en fase 1, y ráfagas cruzadas y onda en fase 2. Se reutilizan los efectos, avisos y colisiones existentes.

El final añade en todas sus fases el combo `barrage`: ráfaga corta → ráfagas cruzadas → ráfaga corta → ráfagas cruzadas, 36 proyectiles en total distribuidos en cuatro etapas. Cada etapa vuelve a apuntar y recibe su aviso completo. La separación entre disparos/tandas es 130 ms y la recuperación entre etapas 450 ms; las recuperaciones de rayo/onda/área siguen cubriendo toda su ventana activa. Su velocidad de movimiento es 125/135/145 px/s. El límite compartido sigue siendo 72 proyectiles.

Desde fase 2, el final invoca automáticamente tandas completas de cuatro robots, exclusivamente rojos, azules y naranjas. Mientras sobreviva cualquiera de los seis no hay reemplazos. Al caer el último se reserva otra tanda con animación previa de 900 ms, sin esperar a seleccionar el patrón de invocación. El intervalo mínimo entre reservas es 1200 ms; normalmente transcurre mientras los apoyos están vivos. Si el jugador invade una aparición durante el aviso, se cancela la tanda y se vuelve a buscar una ubicación segura. Las reservas incompletas también se cancelan. Se conservan las bajas, puntuación, carga especial y cancelación por muerte, remate, transición o salida.

Validación de esta ampliación: `npm run build`, 209 pruebas de lógica y `node tests/run-sprint-13.mjs`: 158 comprobaciones de campaña más 95 de combate específicas, todas aprobadas con Alex y Lua, cero errores de consola. Se verifican tandas completas, exclusión del amarillo, reposición automática repetida, supervivientes que bloquean reemplazos, identidades únicas y limpieza. El informe actualizado está en `docs/test-results/sprint-13/integration.json`. El total de 870 anterior corresponde a la ejecución completa previa a esta ampliación.

## Límites y pendientes

### Rayos más frecuentes del final

La advertencia/carga del rayo final pasa de 950 a 650 ms. Cada fase sustituye el rayo individual programado por `beam-chain`, que ejecuta dos rayos consecutivos con apuntado nuevo y aviso completo para cada uno. El combo de presión del final también pasa a ráfaga → rayo → rayo. El arsenal mantiene su rayo de cierre y las reacciones contextuales conservan su disparo individual. El primer jefe mantiene su carga de 1100 ms y su presión con un solo rayo.

Se conserva la duración activa de 650 ms, la recuperación mínima que cubre el efecto más 150 ms, el bloqueo por paredes y la dirección fijada durante cada aviso. No se superponen los rayos. Configuración en `QuimeraAdvancedConfig.ts`, tipo en `QuimeraConfig.ts` y secuencia en la cola existente de `QuimeraController.ts`. Una prueba determinista adicional verifica ambos avisos de 650 ms, el nuevo apuntado y la separación de efectos; las 217 pruebas de lógica y la compilación aprueban.

### Evasión ocasional del final

`BossEvasion.ts` detecta exclusivamente proyectiles activos del jugador cuya trayectoria intersecta el cuerpo del jefe en los próximos 450 ms, con al menos 160 ms de reacción y sin pared intermedia. Cada proyectil se considera una sola vez: 35 % de probabilidad de intentar un paso lateral, 500 ms entre intentos fallidos y 3500 ms después de una esquiva exitosa. El movimiento dura hasta 240 ms a 560 px/s, mediante velocidad física; no desplaza instantáneamente el cuerpo ni concede invulnerabilidad.

Solo se activa en `REPOSITION` del jefe final. Carga, ataque, recuperación, efectos activos, transiciones, teletransporte y QTE interrumpen la evasión. Las recuperaciones siguen ofreciendo su bonificación de daño. No detecta ni evita automáticamente las especiales. La ruta completa y su revalidación respetan paredes, límites, jugador y robots de apoyo; se intenta el lado contrario si el primero está ocupado. Un aro celeste acompaña el paso y se reutiliza la animación de caminar.

Archivos: nuevo `src/entities/boss/BossEvasion.ts`; integración en `QuimeraEncounter.ts` y representación en `Quimera.ts`. Pruebas: seis casos nuevos en `tests/boss-evasion.test.mjs` y doce comprobaciones físicas en `tests/sprint-13.browser.js`. Compilación aprobada; 216 pruebas de lógica y 158 + 109 comprobaciones de campaña/combate aprobadas con ambos personajes, sin errores de consola. Se verifica un disparo real que falla por el desplazamiento y otro que causa el daño esperado durante la recuperación. La validación física es controlada en Canvas; el balance de partidas libres continúa pendiente.

Último ajuste del final: integridad 96 → 144 (+50 %), apoyos 4 → 6 desde fase 1 e IA reactiva desde fase 1. La apertura selecciona el combo de cuatro etapas de ráfagas y permite arsenal perforante/rayo desde el inicio. Movimiento 125/135/145 px/s, proyectiles 420/435/450 px/s, reposición 350/300/250 ms y enfriamiento de teletransporte 4000/3500/2500 ms. Conserva aviso de traslado de 550 ms, aparición de apoyos de 900 ms y reemplazo solo al caer toda la tanda. Prueba actual: compilación correcta, 210 pruebas de lógica y 158 + 97 comprobaciones de campaña/combate aprobadas con ambos personajes, cero errores de consola. Estas cantidades y pruebas sustituyen los valores de los ajustes anteriores.

La validación automatizada usa Edge/Canvas. No equivale a una partida libre completa ni prueba todas las posibles posiciones de evasión. Quedan balance manual prolongado, WebGL y otros navegadores/dispositivos. En vistas que no ofrecen un destino seguro se omite el teletransporte; se conserva la persecución/reposición normal.

Audio y epílogos definitivos siguen pendientes de contenido. El mosaico de la ulti de Alex del ajuste anterior se conserva. No se incorporaron personajes, niveles, armas, arte ni sistemas narrativos nuevos.

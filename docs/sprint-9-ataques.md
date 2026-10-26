# Sprint 9 — variantes y patrones de ataque

Los cuatro patrones están integrados en la partida y en `/robots.html`, reutilizando los sprites originales y las reglas de un impacto. El ajuste de balance mantiene geometría, cámara, narrativa y efectos de los protagonistas; su ulti ahora exige diez bajas y una espera de 45 segundos entre usos.

## Comportamientos

| Robot | Ataque | Velocidad de bala | Tiempos iniciales | Movimiento |
| --- | --- | ---: | --- | --- |
| Rojo | Un proyectil dirigido | 300 px/s | 1500 ms entre disparos | Velocidad base y patrulla existentes |
| Azul | Cinco disparos que vuelven a apuntar individualmente | 350 px/s | 200 ms entre balas; 2000 ms de descanso tras la quinta | 0,9 veces la velocidad base; se acerca por encima de 300 px y retrocede por debajo de 160 px |
| Amarillo | Un disparo de corto alcance, hasta 160 px, mientras camina | 400 px/s | 800 ms entre disparos | Dos veces la velocidad base, continúa persiguiendo mientras dispara; se detiene a 48 px |
| Naranja | Seis disparos simultáneos en abanico de −20° a +20° | 320 px/s | 1000 ms de carga, 2500 ms de recuperación | 0,65 veces la velocidad base, inmóvil durante carga y recuperación |

La percepción conserva los alcances de las salas grandes (420–540 px). Rojo, azul y amarillo necesitan línea de visión despejada. El naranja puede ver a través de interiores, pero nunca adquiere un objetivo fuera de su percepción ni ignora el perímetro. Si el objetivo abandona su percepción durante la carga, esta se cancela. La dirección del abanico se fija con la posición válida del jugador al completar la carga; las balas mantienen su velocidad y dirección.

El azul cancela los disparos pendientes si pierde visión o sale del alcance de ataque; comienza entonces su descanso. Sus desvíos y retrocesos siguen usando cuerpos Arcade y la persecución por eje existente. El amarillo conserva movimiento y animación de caminata durante el disparo, con un destello de ataque; su intervalo se ajustó a 800 ms. No se implementa navegación global ni daño por contacto.

La primera habitación conserva el intervalo rojo de 1500 ms; las siguientes lo reducen a 1400, 1300, 1200 y 1100 ms mediante la dificultad existente. El ajuste posterior solicitado aumenta la ráfaga azul de tres a cinco, reduce la carga naranja a 1 segundo y amplía su abanico a seis proyectiles y aumenta la velocidad amarilla de 1,6 a 2 veces la base (25 % más). Se conservan los descansos, velocidades de bala y reglas de colisión de cada patrón.

## Ulti: diez bajas y 45 segundos entre usos

Alex y Lua necesitan diez bajas válidas para activar Q. La primera activación no tiene una espera inicial. Cada uso consume el contador e inicia 45000 ms de cooldown; la siguiente activación requiere tanto otras diez bajas como que ese tiempo haya terminado. Las bajas, incluidas las producidas por la ulti, pueden acumularse durante la espera y se limitan a diez. Esperar sin eliminar enemigos no carga la habilidad.

El reloj avanza únicamente mediante las actualizaciones de combate. Pausar lo congela y cambiar de sala conserva el tiempo restante. Reintentar restaura contador y cooldown del checkpoint de entrada a la habitación; una partida nueva comienza en cero bajas y sin cooldown. El HUD muestra el contador junto con «ESPERA … s» y solo anuncia «LISTA [Q]» cuando se cumplen ambos requisitos.

`ArcadeRunService` valida el consumo y mantiene tiempo restante/checkpoints. `SpecialAbilityManager` avanza ese reloj y `SpecialAbility` combina contador y cooldown para determinar disponibilidad. Los efectos de eliminación de Alex y Lua conservan su comportamiento.

## Arquitectura, visuales y cancelación

`RobotConfig.ts` define ataques y multiplicadores de movimiento. `EnemyAttackController.ts` es una máquina de estados compartida basada en el reloj de la escena: no programa temporizadores de ataque ni callbacks externos. Cada actualización devuelve una descarga o `null`; una ráfaga nunca emite todas sus balas acumuladas en un único frame lento.

`Enemy.ts` combina percepción, movimiento y fases. La carga naranja reproduce A1, ilumina el robot y muestra un círculo pulsante. B1 y un destello indican el disparo. Se reutilizan las animaciones existentes y no se generan imágenes nuevas. La advertencia se destruye al disparar o cancelar.

La muerte del robot, la muerte del jugador y la preparación de salida cancelan el estado pendiente. La destrucción de la entidad también limpia su advertencia. Pausar la partida detiene su reloj efectivo; la página de prueba usa el reloj pausado de Phaser. Los reinicios y cambios de habitación destruyen los grupos de proyectiles y sus temporizadores de caducidad como antes.

`fireEnemyShots` es el punto común de emisión de la partida y del laboratorio. `Projectile.ts` conserva dirección fija, velocidad, propietario, tipo de ataque, daño instantáneo y marca de perforación. Sus colores distinguen rojo, azul, amarillo y naranja. Los proyectiles del jugador conservan sus reglas.

## Colisiones y progreso

Se reutilizan los grupos físicos de la partida. El proceso de colisión omite únicamente paredes interiores para las balas perforantes. Las paredes exteriores y los límites del mundo destruyen todas las balas. No existe colisión ofensiva de balas enemigas contra robots; no hay fuego amigo ni tránsito de proyectiles entre salas.

Los overlaps existentes siguen matando a Alex, Lua o cualquier robot con un único impacto válido. Las cuatro variantes conservan su identificador de oleada; sus bajas actualizan puntuación, limpieza y contador de especial mediante los mismos servicios del Sprint 7.

Se conservan cinco habitaciones y diez oleadas. La distribución posterior solicitada presenta exclusivamente rojos en el nivel 1, azules en el 2, amarillos en el 3 y naranjas en el 4. El nivel 5 conserva un combate mixto provisional mientras se define el jefe; no se ha implementado ningún jefe. La campaña provisional mantiene 106 robots y 10600 puntos posibles. Los mapas y sus ventajas tácticas se detallan en [sprint-9-mapas.md](sprint-9-mapas.md).

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/config/RobotConfig.ts`, `CombatBalance.ts` | Configuración de patrones, movilidad y cadencia roja por nivel |
| `src/entities/enemies/EnemyAttackController.ts` | Nuevo controlador compartido |
| `src/entities/enemies/Enemy.ts`, `EnemyState.ts` | Movimiento por variante, fases y avisos |
| `src/systems/EnemyProjectiles.ts` | Nueva emisión común de descargas |
| `src/entities/Projectile.ts` | Tipo de ataque y colores de proyectil |
| `src/scenes/GameScene.ts` | Emisión y cancelación en el ciclo real de juego |
| `src/config/SpecialAbilityConfig.ts`, `src/systems/ArcadeRunService.ts`, `src/abilities/SpecialAbility.ts`, `SpecialAbilityManager.ts`, `src/ui/GameHUD.ts` | Requisito combinado de diez bajas y 45 segundos, checkpoints y contador visible |
| `src/scenes/RobotLabScene.ts`, `src/robot-lab.ts`, `robots.html` | Patrones reales en la página de prueba |
| `tests/enemy-attacks.test.mjs`, `robot-attacks.browser.js`, `robot-attacks.html`, `run-robot-attacks.mjs` | Nuevas pruebas de tiempos e integración |
| `tests/combat.browser.js`, `sprint-6-levels.browser.js`, `sprint-9.browser.js`, `run-all.mjs`, `package.json` | Adaptación al retorno de descargas e integración de las pruebas |

## Validación

Las pruebas específicas incluyen tiempos exactos, reorientación de ráfagas, pérdida de visión, carga y recuperación, abanico, percepción, colisiones físicas interiores/exteriores, límites, ausencia de fuego amigo, muerte de un impacto y bajas reales de las cuatro variantes con Alex y Lua. También comprueban cancelación al morir cualquiera de los dos bandos, reinicio y preparación de salida sin callbacks de ataque pendientes.

Comandos: `npm.cmd run build`, `npm.cmd run test:sprint9`, `npm.cmd run test:robot-lab`.

La compilación de tipos y producción pasó. La regresión completa aprobó **1426 verificaciones**, incluidas 15 pruebas puras de ataques, 11 de carga/cooldown de protagonistas, 99 comprobaciones de integración de patrones y 57 de habilidades con ambos personajes. Se verificó la disponibilidad de la ulti a 44999/45000 ms, diez bajas acumuladas durante la espera, continuidad entre salas, checkpoint de reintento, HUD y una pausa de 60 segundos simulados sin avance del cooldown. El laboratorio aprobó otras **31 comprobaciones**, incluyendo pausar la carga naranja sin que avance su reloj. Cero errores de consola en las suites de navegador. Se conserva el aviso de Vite sobre el tamaño del bundle de Phaser.

Los informes están en `docs/test-results/robot-attacks.json`, `robot-lab.json` y `sprint-9.json`. Las partidas manuales de balance y las comprobaciones WebGL/otros dispositivos siguen pendientes de acabado; las verificaciones automatizadas usan Edge/Canvas.

El ajuste final del naranja usa 1000 ms de carga y seis proyectiles simultáneos, distribuidos uniformemente a −20°, −12°, −4°, +4°, +12° y +20° respecto del objetivo. La recuperación sigue siendo de 2500 ms. Pasaron la compilación, las 15 pruebas puras de patrones, 103 de integración de ataques, 31 del laboratorio y 114 de habitaciones/progresión. El laboratorio comprueba el impacto al mover a Alex a una trayectoria después de fijarse la dirección del abanico.

Tras el ajuste posterior para que el amarillo camine mientras dispara cada 800 ms, se repitieron la compilación, las 15 pruebas puras de patrones, la integración de ataques (ahora **103 comprobaciones**) y las **31 del laboratorio**. Todas pasaron, sin errores de consola. El informe completo de 1426 verificaciones corresponde al balance anterior a este último ajuste; los informes específicos reflejan el comportamiento actualizado.

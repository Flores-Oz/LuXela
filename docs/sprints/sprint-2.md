# Sprint 2 — Enemigos y combate

Validación: 16 de octubre de 2026.

## Objetivo y alcance

Completar robots con detección híbrida, IA de cuatro direcciones, disparos con línea de visión y muerte inmediata de jugador y robots. Un impacto válido equivale a muerte; no existen puntos de vida. Se preservan los controles WASD, flechas para disparar y las dos habitaciones actuales.

## Auditoría inicial

- El repositorio usa **Phaser 4.2.1**, TypeScript y Vite, aunque el documento de alcance menciona Phaser 3. Se mantiene la versión instalada y Arcade Physics.
- Había cambios locales en `Enemy.ts`, `GameScene.ts` y un `EnemyState.ts` sin seguimiento. Se continuó sobre esos cambios.
- Enemy ya tenía movimiento, proximidad y muerte idempotente, pero desaparecía inmediatamente y no reproducía destrucción.
- La IA estaba en la escena; no existían disparos enemigos, impactos contra entidades ni muerte del jugador.
- Se creaba un solo enemigo en coordenadas fijas y un collider nuevo por proyectil.
- El build inicial fallaba por dos imports sin uso y un enum incompatible con `erasableSyntaxOnly`.

## Estado de tareas

| ID | Tarea | Estado validado |
|---|---|---|
| S2-01 | Enemy base | Completa: cuerpo físico, límites y muerte idempotente |
| S2-02 | Animaciones | Completa: idle, cuatro direcciones y muerte de una ejecución |
| S2-03 | Movimiento | Completa: velocidad 80, colisión y spawns desde matriz |
| S2-04 | Detección híbrida | Completa: proximidad 200 independiente de paredes; visión geométrica para disparar |
| S2-05 | IA básica | Completa: IDLE, CHASE y ATTACK_READY en Enemy |
| S2-06 | Disparo enemigo | Completa: dirección fija, recarga configurable en milisegundos |
| S2-07 | Player → robot | Completa: proyectil consumido, cuerpo deshabilitado, animación y destrucción |
| S2-08 | Robot → player | Completa: bloqueo inmediato y efecto visual de muerte |
| S2-09 | Colisiones | Completa: paredes para entidades y ambos orígenes de bala; impactos por origen |
| S2-10 | Integración | Completa en Edge/Canvas: 42 comprobaciones; build TypeScript/Vite correcto |

## Archivos creados y modificados

- `src/entities/enemies/Enemy.ts`: encapsula IA, cadencia, configuración, hitbox y muerte animada.
- `src/entities/enemies/EnemyState.ts`: constantes y unión literal compatibles con TypeScript del proyecto.
- `src/entities/Player.ts`: muerte idempotente, interrupción de solicitudes y efecto de desaparición.
- `src/entities/Projectile.ts`: origen player/enemy, grupos compartidos, color y cancelación del temporizador al destruirse.
- `src/scenes/GameScene.ts`: robots desde RobotSpawn, coordinación de disparos e impactos, colliders por grupo y ciclo de habitación.
- `src/data/rooms/testRoom2.ts`: elimina import sin uso; matriz sin cambios funcionales.
- `tests/combat.html`, `tests/combat.browser.js`: pruebas reproducibles con Arcade real.
- `tests/run-combat.mjs`: ejecución de las pruebas vía Chrome DevTools Protocol sin dependencias adicionales.
- `docs/sprints/sprint-2.md`: este informe.

## Decisiones técnicas

- `Enemy.updateBehavior(player, lineOfSight, time)` decide estado, mueve y devuelve una dirección cuando puede disparar. La escena crea el proyectil en el grupo correspondiente. El enemigo vivo solo dispara contra jugador vivo, detectado, visible, en ATTACK_READY y después de la recarga.
- El tiempo proviene del reloj de la escena; no se cuentan frames. Cadencia por defecto: 1000 ms. La bala apunta a la posición al disparar y conserva su velocidad.
- Se registran transiciones únicamente cuando cambian y en desarrollo. CHASE selecciona el eje predominante; no hay búsqueda de rutas.
- `die()` cambia primero la bandera de muerte y detiene/deshabilita física. El robot sigue visible durante `robot-death`; se destruye al completar la animación. El jugador pierde sus solicitudes pendientes y entradas de movimiento/disparo.
- No hay frames de muerte del jugador en su hoja de caminar. Se usa tinte y desaparición de 350 ms, sin inventar una animación de sprites.
- Hitbox del robot: 44 × 52 con offset (10, 10) en celdas de 64. Se conserva la hitbox del jugador del Sprint 1.
- Las balas conservan velocidad 500, radio 8 y duración 2000 ms. Se añaden al grupo antes de asignar velocidad porque Arcade aplica valores por defecto al añadir objetos.
- Un collider por grupo contra paredes y un overlap por combinación ofensiva. No se generan colliders por bala ni impactos contra su propio bando.
- El disparo enemigo nace en el centro para evitar saltar paredes con un offset. Se comprueba el segmento jugador → muzzle antes de crear su bala, conservando los offsets del Sprint 1.
- Arcade y las listas de escena gestionan cuerpos, grupos, colliders y objetos al reiniciar. El callback de shutdown limpia referencias propias; destruir cada bala cancela su temporizador. Las animaciones globales se registran solo si faltan.

## Spritesheets verificados

Se inspeccionaron ambas imágenes, sin modificarlas. `RobotRed.png` mide 384 × 704 y su contenido no mantiene la misma alineación vertical que la variante corregida. El proyecto **ya cargaba `RobotRed-fixed.png`**, de 384 × 768; se conserva esa fuente bajo la textura `robot-red`, con celdas 64 × 64 y `endFrame: 65`.

En la variante corregida, la secuencia de destrucción ocupa los frames 60–65: robot, sobrecarga, explosión y restos. La prueba verifica esa secuencia, repetición cero, reproducción y eliminación final. Se conservan los grupos especiales existentes sin asignarles comportamientos. Las hojas incluyen pequeños fragmentos en bordes; no se retocaron los originales.

## Problemas y soluciones

| Problema | Solución |
|---|---|
| Spawn fijo fuera del contrato de la matriz | Generar todos los robots en el centro de RobotSpawn; verificar ausencia de solapamiento |
| Muertes sin animación y jugador sin estado de muerte | Bloqueo físico/ofensivo inmediato y finalización visual independiente |
| Colliders acumulados por disparo | Grupos persistentes por habitación con colliders únicos |
| Registro de animaciones repetido al volver | Comprobar existencia en el gestor global |
| Muzzle podía saltar una pared cercana | Verificar línea de visión hasta el punto de aparición |
| Limpieza manual duplicaba destrucción de grupos | Respetar lifecycle de Arcade; confirmado mediante reinicios reales |
| Enum incompatible e imports sin usar | Unión literal y eliminación de imports innecesarios |
| PowerShell bloqueaba npm.ps1 | Usar `npm.cmd`, sin cambiar políticas del equipo |

## Pruebas realizadas

- `npm.cmd run build`: pasa TypeScript (`vue-tsc -b`) y build Vite. Persiste aviso de bundle mayor de 500 kB por Phaser; no impide compilar.
- `git diff --check`: sin errores de whitespace.
- `node tests/run-combat.mjs`: **42 comprobaciones aprobadas**, cero errores JavaScript/console.error de la página durante la prueba.
- Pruebas con Edge headless y renderer Canvas, usando cuerpos, colliders, animaciones y lifecycle reales de Phaser; sin sustituir Arcade por mocks.
- Casos: dos spawns válidos, idle y muerte, cuatro movimientos, paredes para robot/jugador/ambas balas, rango y visión bloqueada, tres estados, cadencia configurable e independiente de FPS, integración de ambos disparos en la escena, trayectoria fija, expiración, colliders estables, impactos letales, muerte idempotente, bloqueo de acciones, efecto de muerte y salida con jugador vivo/muerto.
- Se verifica transición primera → segunda → primera habitación, destrucción de objetos previos y reconstrucción sin colliders adicionales.

### Reproducción

1. Ejecutar `npm.cmd run dev -- --host 127.0.0.1` en la raíz del proyecto.
2. Abrir `http://127.0.0.1:5173/tests/combat.html` para ver resultados en navegador.
3. Para ejecución automatizada, iniciar una instancia **dedicada** de Edge/Chrome con depuración remota en el puerto 9224 y perfil temporal propio, y ejecutar `node tests/run-combat.mjs` con Node 22 o posterior. `CDP_PORT` y `TEST_BASE_URL` permiten cambiar puerto y URL.

El runner usa la primera pestaña de esa instancia dedicada y la navega al harness. El harness controla el reloj de escena para física y usa el reloj real para verificar el tween de muerte. No se incluye en el build de producción.

## Agregar un nuevo tipo de robot

1. Registrar su spritesheet con una textura única, conservando los recursos existentes.
2. Registrar animaciones con prefijo propio: `<prefijo>-idle`, `-walk-up`, `-walk-down`, `-walk-left`, `-walk-right` y `-death`. Movimiento repite; muerte usa repeat 0. Usar los frames reales de la nueva hoja.
3. Instanciar `new Enemy(scene, x, y, "nueva-textura", { animationPrefix: "nuevo", moveSpeed: 80, detectionRange: 200, shootCooldown: 1200 })` en una posición válida y añadirlo al grupo de enemigos.
4. Los colliders, disparos y muertes se reutilizan automáticamente. Para robots con tamaño diferente, ajustar la hitbox del subtipo después de crearlo. No duplicar Projectile, IA ni puntos de vida.
5. Si una habitación mezcla tipos, definir la selección de configuración en sus datos antes de extender el spawn; actualmente RobotSpawn crea el robot rojo.

## Limitaciones y pendientes

- CHASE puede quedar bloqueado por paredes: es persecución por eje, sin navegación compleja, conforme al alcance.
- La segunda habitación no contiene RobotSpawn; no genera robots artificialmente.
- Se valida Canvas en Edge. Quedan fuera de esta validación WebGL, otros navegadores/dispositivos y una sesión manual prolongada de balance/jugabilidad.
- No se implementan Game Over, vidas, reinicio tras muerte, puntos ni nuevos tipos de enemigos porque carecen de contrato para este sprint.
- No hay criterios funcionales pendientes dentro de S2-01 a S2-10 en el entorno comprobado. La compatibilidad visual entre renderers y el balance requieren validación adicional antes de una publicación.

## Recomendaciones para Sprint 3

Definir primero el flujo posterior a muerte y el contrato de progresión. Después validar WebGL y controles en los dispositivos objetivo, revisar dificultad/cadencia y decidir si hace falta navegación más avanzada. Mantener las pruebas de combate y lifecycle como regresión.

## Ajuste posterior ? patrulla para observar el entorno

A petici?n del usuario, los robots ahora patrullan desde el inicio cuando no detectan al jugador. `GameSettings.enemyPatrol` activa esta opci?n en la escena y `EnemyConfig.patrol` permite configurarla por robot (por defecto false para conservar IDLE en otros usos).

El nuevo estado PATROL recorre cuatro direcciones, gira al detectar una pared y cambia de direcci?n cada 1500 ms. Conserva Arcade Physics, velocidad 80 y las transiciones de persecuci?n/ataque cuando detecta al jugador. Despu?s de la muerte del jugador se detiene, como antes.

Archivos adicionales afectados: `GameSettings.ts`, `EnemyState.ts`, `Enemy.ts`, `GameScene.ts` y la prueba de integraci?n. Se verifican desplazamiento aut?nomo, giro por tiempo y giro al chocar sin atravesar paredes: 42 comprobaciones aprobadas, sin errores de consola. TypeScript y build Vite pasan.

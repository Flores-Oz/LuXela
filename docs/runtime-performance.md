# Revisión de rendimiento general

Se revisó la fluidez de ejecución y renderizado, conservando las velocidades, cadencias y temporizadores de combate.

## Hallazgos y cambios

El navegador de pruebas identifica su dispositivo WebGL como `Microsoft Basic Render Driver`, un controlador por software. Phaser AUTO aceptaba WebGL por estar disponible. En el combate de prueba, Canvas funcionó mejor que ese WebGL por software.

`src/config/RuntimeRenderer.ts` detecta adaptadores conocidos de software: Microsoft Basic Render Driver/WARP, SwiftShader, llvmpipe y softpipe. En esos casos `gameConfig` selecciona Canvas. Las GPU normales y los identificadores desconocidos conservan AUTO; si no hay WebGL se utiliza Canvas. La sonda temporal libera su contexto y un fallo de inspección no impide arrancar. No se requiere configuración manual. La selección se aplica al cargar la página, también en las páginas de práctica que reutilizan `gameConfig`.

También se eliminaron actualizaciones visuales redundantes:

- `BossHealthBar`: solo recalcula la distribución al cambiar tamaño/zoom; reconstruye la geometría cuando cambian salud, rastro de daño, fase o dimensiones. Sigue actualizando la salud y el aviso de remate cuando corresponde.
- `CombatPanel`: evita recalcular las tres piezas si conserva las dimensiones.
- `SpecialAbilityManager`: evita actualizar pose invisible, gráficos vacíos y texto auxiliar cada frame mientras la habilidad está inactiva y su estado no cambia. La animación activa y el reloj de carga continúan actualizándose.
- `RoomBriefing`: deja de actualizar la transparencia cuando termina su desvanecimiento.

## Medición

`tests/profile-runtime.mjs` mide 180 intervalos de fotograma en la página aislada del jefe final, ventana 1920×1080 y área de juego 1920×990. El jugador permanece inmóvil; el fixture anula su muerte para sostener la muestra, fija al jefe en 45 puntos de salud y mantiene el combate y los seis apoyos activos. Estas modificaciones existen únicamente en la página de medición. Se instrumentan llamadas a gráficos, textos, IA y HUD; los tiempos anidados no deben sumarse.

| Ejecución | Backend | Media por fotograma | FPS aproximados | p95 | Llamadas a limpiar gráficos |
| --- | --- | --- | --- | --- | --- |
| Antes | WebGL por software | 22,33 ms | 44,8 | 28,70 ms | 731 |
| Después, selección automática | Canvas | 17,43 ms | 57,4 | 21,30 ms | 404 |

Los informes originales están en `docs/test-results/runtime/before.json` y `automatic.json`. `after.json` recoge las optimizaciones visuales manteniendo todavía WebGL; redujo trabajo del HUD, pero no mejoró por sí solo la media de FPS. `canvas.json` contiene la prueba de Canvas previa a la selección automática, con 16,80 ms de media. Una comparación con la escena congelada alcanzó aproximadamente 60 FPS en los tres casos: escena completa, HUD oculto y mapa oculto. Esto no mostró una caída constante en una escena estática.

Son muestras breves con instrumentación y un controlador concreto; los ataques visibles y la planificación del navegador pueden variar entre ejecuciones. No prueban una mejora universal en cualquier equipo. El tiempo JavaScript de render de Canvas y WebGL no es directamente comparable porque WebGL delega trabajo al controlador.

Comando reproducible: `node tests/profile-runtime.mjs automatic`. La opción `--canvas` fuerza la indisponibilidad de WebGL únicamente en el documento de prueba mediante CDP y retira la inyección al finalizar.

## Validación

- `npm run build`: tipos y producción aprobados; permanece la advertencia previa de tamaño del paquete Phaser.
- `npm run test:sprint13`: 905 comprobaciones aprobadas, incluyendo ambos personajes, especiales, remate y los once niveles. Cero errores de consola.
- `tests/runtime-renderer.test.mjs`: adaptadores por software y GPU normales, ausencia de DOM/WebGL, extensión de inspección oculta, fallo de sonda y liberación del contexto.
- El recorrido específico del HUD aprueba 170 comprobaciones. Verifica que 120 actualizaciones sin cambios no reconstruyan la barra, que un impacto y su rastro sigan actualizándola y que las habilidades inactivas eviten limpiar gráficos repetidamente.

La verificación real de una GPU acelerada diferente del controlador de pruebas queda pendiente. En navegadores que oculten la identificación del dispositivo se conserva la elección automática de Phaser.

# Sprint 4 — Cierre de Fase 5

## Resultado

S4-15 (integración y regresión) y S4-16 (documentación) completadas. El alcance técnico S4-01 a S4-16 está implementado y verificado en Edge/Canvas, con **303 comprobaciones aprobadas**, sin errores de consola en las suites y compilación de producción correcta. Se conserva Phaser 4.2.1; no se agregaron dependencias ni se alteraron los assets originales.

Alex conserva la animación de metralleta y elimina a los robots de la habitación al terminar la carga, con bolas verdes en sus posiciones durante 450 ms. No emite proyectiles especiales. Lua elimina a los robots con descarga y rayos amarillos. Ambos conservan movimiento, muerte de un impacto, cooldown, cancelación y limpieza.

Los guiones siguen siendo muestras provisionales. Las expresiones adicionales, la historia y los archivos definitivos de música/SFX no se presentan como terminados por existir el motor. No hay una condición de victoria global nueva: despejar una habitación emite ROOM_CLEARED y las salidas mantienen el comportamiento existente.

## Evidencia ejecutada

| Suite | Comprobaciones | Cobertura |
|---|---:|---|
| selection | 139 | Servicios, desbloqueo, almacenamiento, selección, VN, recarga, teclado/ratón y layout |
| combat | 68 | Movimiento, IA/patrulla, visión, balas/paredes, muerte, Game Over, reintento y habitaciones |
| abilities | 52 | Especiales, impactos, cooldown, Q mantenida, muerte, reinicio y cambio de habitación |
| sprint-4 | 44 | Flujo integrado de ambos personajes y estabilidad de recursos en 12 reinicios |
| Total | **303** | Cuatro suites en secuencia, cero errores de consola |

Informe generado por el runner: [test-results/sprint-4.json](test-results/sprint-4.json). Registra hora UTC, versión de Node/navegador, resultados y contadores. Solo se sobrescribe al completar todas las suites con éxito; revisar generatedAt para distinguirlo de ejecuciones posteriores fallidas.

La nueva suite parte de ambos personajes bloqueados y canjea sus códigos mediante el formulario. Alex recorre la VN completa; Lua la omite. Cada ruta entra al combate con un jugador y su habilidad correspondiente, elimina enemigos, recibe un impacto real de proyectil enemigo durante el especial, reproduce derrota/Game Over y reintenta. Volver al selector conserva permisos y progreso independiente.

Los 12 reinicios alternan Alex/Lua y comparan la habitación 0 recién creada contra su referencia: 3 cuerpos dinámicos, 51 estáticos, 7 colliders, 9 teclas y 117 objetos. Se comprueba también la destrucción de poses, efectos y HUD anteriores. Esto detecta acumulación observable en esos recursos, sin afirmar que sustituya un perfil de heap o una sesión prolongada.

`npm.cmd run build` aprueba TypeScript y Vite. Persiste el aviso no bloqueante del bundle Phaser mayor de 500 kB. `git diff --check` no detecta errores de whitespace.

La compilación de `dist/` se sirvió mediante Vite preview en 4173: selector visible, canvas de 1024 × 768 y ambas imágenes originales de 1024 × 1536 cargadas; sin errores de consola. [test-results/sprint-4-production.json](test-results/sprint-4-production.json) conserva esa comprobación de arranque. El recorrido completo se ejecuta contra Vite de desarrollo; no se declara un recorrido integral del bundle de producción.

## Matriz de aceptación

| Criterio del Sprint | Evidencia | Resultado |
|---|---|---|
| Alex y Lua visibles con arte original | selection y arranque de producción | Aprobado |
| Ambos bloqueados inicialmente | selection e integración | Aprobado |
| Códigos exclusivos por personaje | selection | Aprobado; códigos de prueba identificados |
| Desbloqueos persisten tras recarga | selection con navegación real | Aprobado |
| Solo se seleccionan personajes autorizados | selection, guardas entre escenas | Aprobado |
| Personaje correcto en gameplay | selection e integración de ambas rutas | Aprobado |
| Introducción narrativa funcional | selection y VN completa/omitida en integración | Aprobado; textos provisionales |
| Diálogos avanzan, se completan y se omiten | selection, entradas nativas y runner VN | Aprobado |
| Especial eléctrico de Lua | abilities e integración | Aprobado |
| Especial de Alex | abilities e integración | Aprobado con adaptación solicitada: animación e impactos sobre enemigos |
| Muerte instantánea de un impacto | combat, abilities, impacto enemigo en integración | Aprobado |
| Efectos/animaciones originales integrados | abilities y revisión visual de Fase 4 | Aprobado |
| Sin errores críticos conocidos en lo verificado | Cuatro suites y arranque de producción | Aprobado dentro de la matriz probada |
| Regresión de Sprints anteriores | combat, selection e integración | Aprobado |
| Proyecto compilable | TypeScript y Vite | Aprobado |
| Documentación actualizada | sprint-4.md, VN, este cierre e informes | Completado |

## Reproducción

Requiere dependencias instaladas, Node 22+, Vite y un navegador dedicado con CDP. No usar una pestaña personal: los runners navegan la primera pestaña de esa instancia.

1. Desde la raíz, ejecutar `npm.cmd run dev -- --host 127.0.0.1` y mantenerlo abierto.
2. En otra terminal, iniciar Edge con un perfil de pruebas dentro de una carpeta ignorada por Git. En este entorno se usó:

```powershell
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --no-sandbox --in-process-gpu --disable-gpu --disable-software-rasterizer --no-first-run --remote-debugging-port=9224 --user-data-dir="$PWD/.browser-test2.local" about:blank
```

Estos flags corresponden al entorno de pruebas restringido y fuerzan Canvas; no son una configuración de distribución del juego. Usar un perfil dedicado sin cuentas personales.

3. Ejecutar `npm.cmd run test:sprint4`. El comando comprueba que servidor y CDP respondan, ejecuta suites secuencialmente y genera el informe. No requiere dependencias adicionales. `TEST_BASE_URL` y `CDP_PORT` permiten cambiar la conexión.
4. Ejecutar `npm.cmd run build` y `git diff --check` para compilación y revisión de formato.
5. Para repetir la comprobación manual de producción, ejecutar `npm.cmd run preview -- --host 127.0.0.1 --port 4173` y abrir esa dirección. Confirmar selector, imágenes y canvas sin errores de consola.

Las páginas individuales son `/tests/selection.html`, `/tests/combat.html`, `/tests/abilities.html` y `/tests/sprint-4.html`. La suite de selección usa claves test_ separadas y las limpia; combate, habilidades e integración usan servicios aislados en memoria. No se borran los datos reales del jugador.

## Límites y pendientes de publicación

- El navegador de esta instancia no ofrece WebGL: la consulta de contexto devuelve false. WebGL y otros navegadores/dispositivos no están certificados por esta entrega.
- La selección y VN se verificaron en 800 × 600 y 390 × 844; el combate usa teclado. No se implementaron controles táctiles.
- Narrativa oficial, variantes de expresiones, retratos transparentes y archivos reales de música/SFX siguen siendo trabajo de contenido. El audio del motor se valida mediante AudioBuffer de prueba; no se certifica sonido final ni autoplay en todos los dispositivos.
- ALEX-001 y LUA-001 son códigos provisionales configurables. El desbloqueo cliente sigue siendo inspeccionable; no se añadió backend.
- Balance de duraciones/cooldowns y sesiones largas requieren evaluación de juego. Los contadores de 12 reinicios no equivalen a una auditoría exhaustiva de memoria.
- El debug físico permanece configurable en GameSettings. Los marcadores de spawn y la apariencia de las habitaciones existentes no se modificaron durante este cierre.

Estas limitaciones quedan registradas como trabajo de contenido/publicación posterior, sin dejar tareas técnicas S4-15/S4-16 abiertas.

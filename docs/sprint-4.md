# Sprint 4 — Selección, desbloqueos, narrativa y habilidades

## Entrega actual: Fases 2 y 3

Se implementaron y validaron selección/desbloqueos (S4-01 a S4-07) e introducción/diálogos (S4-08 a S4-10), autorizados por separado. El flujo actual es selección → introducción narrativa → combate, conservando personaje y permisos. Las habilidades de la Fase 4 aún no están implementadas.

Se conserva Phaser 4.2.1, TypeScript, Arcade, el combate de un impacto, la patrulla, las dos habitaciones y el flujo de derrota/Game Over del Sprint 3. No se añadieron dependencias, ni se modificaron spritesheets o mapas.

## Estado del backlog

| ID | Funcionalidad | Estado |
|---|---|---|
| S4-01 | Pantalla de selección con arte original | Completada y validada |
| S4-02 | Estados bloqueado/desbloqueado y selección visible | Completada y validada |
| S4-03 | Campo de código, botón y mensajes | Completada y validada |
| S4-04 | Códigos independientes y normalización | Completada y validada |
| S4-05 | localStorage y alternativa temporal | Completada y validada |
| S4-06 | Selección de personajes desbloqueados | Completada y validada |
| S4-07 | Personaje conservado en introducción, gameplay, habitaciones y reintentos | Completada y validada |
| S4-08 | Introducción narrativa | Completada y validada; contenido provisional identificado |
| S4-09 | Sistema modular de diálogos | Completada y validada |
| S4-10 | Selección → introducción → gameplay | Completada y validada |
| S4-11 | Infraestructura de habilidades | Pendiente |
| S4-12 | Descarga eléctrica de Lua | Pendiente |
| S4-13 | Metralleta de Alex | Pendiente |
| S4-14 | Animaciones y efectos especiales | Pendiente; hojas originales identificadas |
| S4-15 | Integración y regresión | Parcial: Fases 2 y 3 validadas; habilidades pendientes |
| S4-16 | Documentación | Parcial: actualizada hasta Fase 3 |

El Sprint 4 completo todavía no está terminado.

## Arquitectura y archivos

Nuevos:

- `src/config/CharacterUnlockConfig.ts`: códigos provisionales y clave de almacenamiento.
- `src/systems/CharacterUnlockService.ts`: lectura/validación/persistencia de desbloqueos, canje de códigos y estado de almacenamiento. Una instancia por juego en el registro nativo de Phaser; sin singleton global.
- `src/scenes/CharacterSelectScene.ts`: coordina interfaz, selección y transición única hacia IntroScene.
- `src/scenes/IntroScene.ts`: valida selección, presenta la conversación y coordina una única entrada a GameScene al finalizar u omitir.
- `src/dialogue/DialogueManager.ts`: modelo y cursor reutilizable de diálogo, independiente de Phaser, interfaz y controles.
- `src/dialogue/introDialogue.ts`: secuencias provisionales editables de Alex y Lua.
- `src/ui/IntroView.ts`, `src/ui/intro.css`: presentación narrativa con retratos originales, interlocutor, progreso y botones/atajos.
- `src/ui/mountSceneView.ts`: wrapper DOM y restauración de captura de teclado compartidos por selector e introducción.
- `src/ui/CharacterSelectView.ts`: formulario y tarjetas HTML semánticas dentro de un DOMElement de Phaser; actualizaciones visuales y limpieza de callbacks.
- `src/ui/character-select.css`: presentación del selector, estados, foco, colores y tipografía.
- `tests/selection.html`, `tests/selection.browser.js`: pruebas del servicio y de integración con escenas reales.
- `tests/browser-session.mjs`: cliente CDP compartido por ambos runners, sin dependencias adicionales.
- `tests/run-selection.mjs`: entradas nativas, recarga real y comprobaciones de escalado.
- `docs/sprint-4.md`: este documento.

Modificados:

- `src/config/characters.ts`: reutiliza PlayerCharacter y agrega nombre, retrato de selección, color y nombre de habilidad prevista; no duplica el catálogo.
- `src/config/gameConfig.ts`: selector como primera escena, registro de IntroScene, contenedor DOM y escalado FIT centrado.
- `src/config/GameSettings.ts`: elimina la antigua selección fija `playerCharacter`; la partida ahora exige una selección válida.
- `src/scenes/GameScene.ts`: comprueba desbloqueo antes de crear entidades y rechaza datos ausentes, inválidos o bloqueados. Se conserva el transporte de personaje entre habitaciones y Game Over.
- `src/scenes/GameOverScene.ts`: valida permiso al entrar/reintentar y permite volver al selector mediante «CAMBIAR PERSONAJE».
- `index.html`: contenedor del juego con tamaño de viewport para mantener alineados canvas y selector al escalar.
- `tests/combat.browser.js`: arranque explícito de prueba con Lua y permisos en memoria aislada, independiente de la pantalla inicial o progreso del jugador.
- `tests/run-combat.mjs`: reutiliza el cliente CDP común; mantiene las verificaciones de interfaz del Sprint 3.

Player, Enemy, Projectile, EnemyManager y LineOfSight mantienen sus reglas de combate. No se alteraron los nuevos assets RobotBlue/Orange/Yellow del usuario.

## Desbloqueos

### Configuración y códigos de prueba

En `CharacterUnlockConfig.ts`:

| Personaje | Código provisional |
|---|---|
| Alex | `ALEX-001` |
| Lua | `LUA-001` |

Estos valores son de desarrollo, no códigos definitivos de distribución. Se sustituyen en un solo módulo. Deben mantenerse únicos.

`redeem()` elimina espacios exteriores y normaliza a mayúsculas. No elimina espacios interiores. Un código vacío o incorrecto no modifica el progreso. Cada código correcto desbloquea solo su personaje; repetirlo informa «ya estaba desbloqueado» y vuelve a intentar guardar si antes falló.

### Persistencia

Clave: `berzerk_character_unlocks_v1`.

```json
{"alex":true,"lua":false}
```

Sin dato guardado, ambos están bloqueados. Se validan JSON y los dos booleanos explícitamente; datos corruptos o de tipo incorrecto no conceden permisos y muestran un aviso. Si el almacenamiento no puede leerse o escribirse, el servicio mantiene los desbloqueos en memoria durante la sesión del juego y muestra que el progreso no se podrá guardar. Esa misma instancia se reutiliza entre escenas.

No se persiste la selección. Tras recargar o volver al selector hay que elegir uno de los personajes ya desbloqueados.

Para reiniciar el progreso de pruebas manuales, ejecutar en la consola del navegador:

```js
localStorage.removeItem("berzerk_character_unlocks_v1");
location.reload();
```

Solo se borra la clave del juego. No usar `localStorage.clear()`. Después de eliminar el dato hace falta recargar, porque el servicio de la sesión conserva su copia en memoria.

### Limitación de seguridad

Es un desbloqueo funcional de cliente: los códigos están en el bundle y el almacenamiento puede modificarse mediante herramientas de desarrollo. Las guardas impiden saltarse el selector mediante navegación normal entre escenas, pero no constituyen protección criptográfica. No se añade backend ni autenticación.

## Selección e integración de escenas

Flujo actual:

```text
CharacterSelectScene → IntroScene → GameScene → GameOverScene
        ↑                              ↑              │
        └──── cambiar personaje ───────┴─ reintentar ──┘
```

El selector muestra Alex y Lua con las imágenes originales `alex-selector.png` y `lua-selector.png` (1024 × 1536). Se conserva su proporción mediante object-fit: contain. Bloqueados se ven oscuros y con candado; desbloqueados recuperan su imagen y color. La tarjeta seleccionada muestra borde, marca y el botón «JUGAR CON …».

Se permite seleccionar mediante clic o enfocando las tarjetas con Tab/flechas y confirmando con Enter. El formulario admite Enter o el botón «DESBLOQUEAR». Desbloquear el primer personaje lo selecciona; canjear el segundo no reemplaza una selección existente. Un personaje bloqueado nunca sustituye a uno válido.

El selector no permite comenzar sin permiso. IntroScene lo verifica al entrar y antes de pasar al combate. GameScene vuelve a comprobarlo antes de crear jugador, robots o colliders. GameOverScene comprueba el mismo servicio al entrar y al reintentar. Un dato de personaje inválido o ausente dirige al selector, sin usar un personaje predeterminado que permita evadir el bloqueo.

La selección viaja por datos de escena, como en Sprint 3, incluyendo la introducción. Se crea un solo Player y se conservan su identidad, habitación y reinicio. «CAMBIAR PERSONAJE» en Game Over regresa al selector con los desbloqueos intactos; empezar desde el selector reproduce la introducción y comienza en la primera habitación. Reintentar desde Game Over vuelve directamente a la habitación actual, sin repetir narrativa.

El layout lógico es 1024 × 768 y se escala conjuntamente con canvas usando FIT, sin deformación. Se verificaron límites en 800 × 600 y 390 × 844; en pantallas estrechas el escalado reduce el texto y conviene orientación horizontal para jugar. No se implementaron controles táctiles de gameplay.

### Recursos y entradas

Los listeners nativos del formulario usan AbortController y se liberan al cerrar el selector. Phaser elimina su DOMElement y el wrapper. La captura global de teclas se desactiva temporalmente en el selector y se restaura al salir, para que escribir códigos no se vea afectado por las capturas WASD/flechas del combate.

El DOM renderer de Phaser fuerza display:block sobre el nodo que administra; por eso el layout flex vive dentro de un wrapper de dimensiones explícitas. No se agregan listeners globales ni temporizadores de selector.

## Narrativa y diálogos — Fase 3 implementada

No se encontró una historia oficial en el repositorio. Se incorporaron tres líneas provisionales por personaje y el rótulo visible «INTRODUCCIÓN PROVISIONAL»: transmisión de contexto, intervención propia de Alex/Lua e instrucciones de movimiento/disparo y salidas. El texto vive en `src/dialogue/introDialogue.ts`; no se presenta como historia definitiva.

`DialogueEntry` define speaker, text y portraitKey opcional. `DialogueSequence` agrupa id, provisional y entries. `DialogueManager` copia los datos, expone current/position/total/isComplete y permite advance/skip. Una secuencia vacía o ya terminada no produce avances adicionales. El gestor no importa Phaser ni crea listeners/temporizadores; puede reutilizarse en otros contextos.

IntroScene selecciona la secuencia del personaje autorizado, monta IntroView y espera al final. No inicia GameScene en segundo plano: durante el diálogo no existen jugador, IA ni proyectiles activos. Al terminar u omitir, una bandera `leaving` impide duplicar la transición y GameScene recibe el personaje seleccionado con habitación inicial 0.

La vista muestra interlocutor, texto, contador de líneas, retrato opcional y arte original del personaje. Los recursos se reutilizan desde selectorPath sin modificar imágenes. La aparición usa una transición CSS breve que respeta prefers-reduced-motion; no se agregan vídeos, arte generado ni temporizadores de narrativa.

Controles:

- Enter o espacio: una línea por pulsación.
- Botón CONTINUAR / ENTRAR: avanzar o comenzar la partida desde la última línea.
- Escape o botón OMITIR INTRO: entrar directamente con el mismo personaje.
- Tab: alternar botones; Enter/espacio sobre OMITIR ejecuta esa acción.

El foco inicial está en CONTINUAR. Los keydown repetidos y las pulsaciones duplicadas sin keyup se ignoran; se previene el clic nativo adicional de Enter/espacio. Un doble clic de ratón no salta una segunda línea. El Enter mantenido al salir del selector tampoco avanza accidentalmente la nueva escena. Los handlers se limitan al contenedor enfocado; el listener de blur y los demás eventos se abortan al cerrar, y se vacía el conjunto de teclas mantenidas.

Para modificar la narrativa, editar las entries de introDialogue.alex/lua. Para agregar una secuencia, crear un DialogueSequence y pasarlo a DialogueManager; el gestor no necesita cambios. portraitKey puede omitirse para narración/sistema; la vista actual resuelve alex/lua mediante el catálogo de personajes. Otros interlocutores con retrato requerirán añadir su correspondencia visual sin cambiar el gestor. Solo debe retirarse provisional cuando el contenido haya sido aprobado.

## Habilidades especiales — Fase 4 pendiente

### Alex

`alex-special.png` (1774 × 887) incluye poses de cambio de arma, metralleta y destellos, pero aún no se carga como animación ni dispara ráfagas. La futura habilidad reutilizará Projectile y sus grupos/colliders, con duración, cadencia, velocidad, cantidad, dispersión y recarga configurables.

### Lua

`lua-special.png` (1774 × 887) incluye acumulación y descarga. La futura habilidad seleccionará únicamente enemigos vivos de la habitación actual, sin exigir línea de visión individual, y llamará al `die()` existente. No se implementó aún el efecto de habitación ni su recarga.

Las tarjetas muestran «HABILIDAD PREVISTA» para no presentar esas funciones como disponibles. Las hojas especiales y sus fondos ya existen; los recortes y su alineación deberán verificarse antes de integrarlos. No se han inventado índices ni sustituido diseños. No hay assets faltantes que bloqueen el selector.

## Cambios futuros y extensión

- **Códigos:** modificar `CHARACTER_CODES` y conservar correspondencia independiente por personaje.
- **Fondos/retratos:** cambiar selectorPath/accent en `characters.ts` o el estilo del retrato, conservando la proporción del arte original. No hace falta editar la escena para sustituir una imagen.
- **Añadir personajes:** queda fuera del alcance actual. En el futuro ampliar PlayerCharacter, catálogo, esquema de desbloqueos, migración de almacenamiento, códigos y lista de tarjetas/pruebas conjuntamente. No basta añadir una imagen.
- **Diálogos:** añadir/editar DialogueSequence en los datos y reutilizar DialogueManager. Para otra presentación, implementar una vista que consuma current/position/total; no duplicar navegación ni callbacks de finalización.
- **Habilidades/recargas:** crear la infraestructura compartida de Fase 4 y luego módulos por personaje; centralizar parámetros y cancelar efectos al morir, reiniciar o cambiar de habitación. No están implementados todavía.

## Validación de Fases 2 y 3

Comandos ejecutados:

- `npm.cmd run build`: TypeScript y Vite correctos. Persiste el aviso del bundle de Phaser mayor de 500 kB.
- `git diff --check`: sin errores de whitespace.
- `node tests/run-selection.mjs`: 67 comprobaciones de servicio/diálogo/escenas, 8 de interfaz con entradas nativas, 2 de recarga real y 4 de layout (selector e introducción); todas aprobadas, cero errores de consola.
- `node tests/run-combat.mjs`: 66 comprobaciones de regresión y 2 de interfaz nativa de Game Over; todas aprobadas, cero errores de consola.

Se verifican códigos vacíos/incorrectos/repetidos, normalización, exclusividad, datos corruptos, errores de lectura/escritura y recuperación de guardado. También selección de ambos personajes, rechazo al navegar con personaje bloqueado/ausente/inválido (incluida IntroScene), cambios de habitación, reintentos y liberación del formulario. La recarga crea un documento, juego y servicio nuevos y recupera ambos desbloqueos de localStorage.

La narrativa se recorre completamente y se omite tanto con botón como con Escape. Se verifican orden, interlocutor, retrato, primera/última línea, secuencia vacía, tecla mantenida, doble clic, bloqueo del gameplay, limpieza y reentradas con ambos personajes. Enter y espacio se prueban con eventos reales del navegador. Reintentar después de morir no repite la introducción. El diálogo y sus botones permanecen dentro del área visible y sin solaparse en 800 × 600 y 390 × 844. Se inspeccionó visualmente la pantalla narrativa.

Total: **149 verificaciones aprobadas**, sumando los dos runners y sus controles nativos, recarga y layout. Las pruebas de habilidades siguen pendientes porque aún no se implementaron.

La regresión conserva movimiento, disparos, colisiones, IA, visión, muertes únicas, limpieza, habitación despejada, Game Over y reinicio. Las pruebas de combate autorizan ambos personajes mediante el servicio real con almacenamiento aislado en memoria; no agregan una excepción de producción.

Las pruebas del selector utilizan la clave `test_berzerk_character_unlocks_v1`, independiente del progreso real. El runner la elimina al terminar. No se borran ni canjean códigos en la clave del jugador. Se inspeccionó visualmente el selector de la entrada principal con ambos retratos cargados.

### Reproducción

1. Ejecutar `npm.cmd run dev -- --host 127.0.0.1`.
2. Abrir `http://127.0.0.1:5173/` para jugar con el selector.
3. Abrir `/tests/selection.html` para las 67 comprobaciones del servicio, narrativa y escenas, o `/tests/combat.html` para la regresión de combate.
4. Para las entradas nativas, iniciar una instancia dedicada de Edge/Chrome con perfil de pruebas y depuración remota en puerto 9224; ejecutar los dos runners anteriores con Node 22+. `CDP_PORT` y `TEST_BASE_URL` permiten cambiar puerto/URL.

Los runners navegan la primera pestaña de esa instancia dedicada. Edge se comprobó en renderer Canvas. No se certifican WebGL, todos los navegadores, reinicio del sistema operativo ni controles móviles; quedan como validación adicional antes de publicar.

## Problemas encontrados y riesgos restantes

- El antiguo test de derrota asumía Lua desde la configuración global. El harness ahora declara explícitamente Lua y sus permisos de prueba, sin depender de la escena inicial.
- Los datos compartidos deben permanecer en el registro de Phaser: recrear el servicio por escena perdería el progreso temporal cuando localStorage no está disponible.
- La captura de teclado heredada del combate podía interferir con campos nativos; se desactiva/restaura durante el selector y se probó con entradas reales después de jugar.
- El wrapper evita que el renderer DOM cambie el layout flex. Las dimensiones del contenedor principal y el escalado evitan desalinear canvas e interfaz.
- Los códigos siguen siendo provisionales y visibles en cliente. Deben revisarse antes de distribución.
- La introducción usa contenido provisional y retratos reutilizados del selector; queda pendiente la aprobación de narrativa definitiva. El sistema y las transiciones de Fase 3 están implementados y validados.
- El wrapper y la restauración de capturas de teclado se extrajeron a mountSceneView para reutilizarlos entre selector e introducción. Se mantiene la limpieza de listeners en cada vista.
- El cliente CDP ahora convierte condiciones de espera a booleanos y evita serializar referencias circulares de escenas Phaser en los runners.
- Las habilidades no forman parte de esta entrega. Deben completarse y validarse antes de declarar terminado todo el Sprint 4.

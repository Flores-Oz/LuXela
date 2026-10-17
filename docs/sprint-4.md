# Sprint 4 — Selección, desbloqueos, narrativa y habilidades

## Entrega final: Fase 5 completada

Se implementaron y validaron selección/desbloqueos (S4-01 a S4-07), narrativa (S4-08 a S4-10) y habilidades especiales (S4-11 a S4-14). La introducción se amplió al motor Visual Novel por datos descrito en [sprint-4-visual-novel.md](sprint-4-visual-novel.md): typewriter, fondos, retratos/expresiones, audio opcional y progreso independiente por ruta. El flujo actual es selección → Visual Novel → combate, conservando personaje y permisos. Q activa la habilidad del personaje elegido.

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
| S4-11 | Infraestructura de habilidades | Completada y validada |
| S4-12 | Descarga eléctrica de Lua | Completada y validada |
| S4-13 | Metralleta de Alex | Completada y validada |
| S4-14 | Animaciones y efectos especiales | Completada con hojas originales, rayos y destellos |
| S4-15 | Integración y regresión | Completada: 303 verificaciones, recorrido integral y 12 reinicios en Canvas |
| S4-16 | Documentación | Completada: arquitectura, configuración, reproducción, informe y límites de validación |

El alcance técnico del Sprint 4 está completado (S4-01 a S4-16) con las adaptaciones solicitadas para Alex: eliminación de habitación, animación de metralleta e impactos verdes sobre enemigos, sin proyectiles especiales. El cierre y la matriz de aceptación se detallan en [sprint-4-cierre.md](sprint-4-cierre.md). Esto no declara terminados los contenidos narrativos, expresiones o audio definitivos ni certifica plataformas no probadas.

## Arquitectura y archivos

Nuevos:

- `src/config/CharacterUnlockConfig.ts`: códigos provisionales y clave de almacenamiento.
- `src/systems/CharacterUnlockService.ts`: lectura/validación/persistencia de desbloqueos, canje de códigos y estado de almacenamiento. Una instancia por juego en el registro nativo de Phaser; sin singleton global.
- `src/scenes/CharacterSelectScene.ts`: coordina interfaz, selección y transición única hacia VisualNovelScene.
- `src/scenes/VisualNovelScene.ts`: sustituye IntroScene y coordina guiones, presentación, checkpoints y entrada a GameScene.
- `src/dialogue/DialogueManager.ts`: modelo y cursor reutilizable de diálogo, independiente de Phaser, interfaz y controles.
- `src/narrative/routes/alex/testSequence.ts`, `src/narrative/routes/lua/testSequence.ts`: muestras provisionales alex_test y lua_test; sustituyen introDialogue.ts.
- `src/ui/VisualNovelView.ts`, `src/ui/visual-novel.css`: sustituyen IntroView y su CSS con presentación VN.
- `src/narrative/`: intérprete, validación, rutas, guardado independiente, fondos, retratos, audio y puente de escenas.
- `src/config/NarrativeConfig.ts`: recursos y parámetros narrativos.
- `src/ui/mountSceneView.ts`: wrapper DOM y restauración de captura de teclado compartidos por selector e introducción.
- `src/ui/CharacterSelectView.ts`: formulario y tarjetas HTML semánticas dentro de un DOMElement de Phaser; actualizaciones visuales y limpieza de callbacks.
- `src/ui/character-select.css`: presentación del selector, estados, foco, colores y tipografía.
- `tests/selection.html`, `tests/selection.browser.js`: pruebas del servicio y de integración con escenas reales.
- `tests/browser-session.mjs`: cliente CDP compartido por ambos runners, sin dependencias adicionales.
- `tests/run-selection.mjs`: entradas nativas, recarga real y comprobaciones de escalado.
- `docs/sprint-4.md`: este documento.
- `src/config/SpecialAbilityConfig.ts`: tecla, duraciones, cooldowns y tamaño/duración de impactos verdes.
- `src/abilities/SpecialAbility.ts`: fases, activación, cancelación y ciclo de vida compartidos.
- `src/abilities/AlexSpecial.ts`, `LuaSpecial.ts`: eliminación de enemigos de habitación mediante EnemyManager; Alex muestra impactos verdes sobre sus objetivos.
- `src/abilities/SpecialAbilityManager.ts`: entrada, asociación de personaje, atlas originales, poses, electricidad y HUD.
- `tests/abilities.html`, `abilities.browser.js`, `run-abilities.mjs`: integración y tecla nativa en navegador.
- `tests/sprint-4.html`, `sprint-4.browser.js`, `run-sprint-4.mjs`: recorrido integral con ambos personajes y estabilidad durante 12 reinicios.
- `tests/run-all.mjs` y script `test:sprint4`: ejecutan las cuatro suites en secuencia y generan `docs/test-results/sprint-4.json`.
- `docs/sprint-4-cierre.md`, `docs/test-results/`: aceptación final, resultados de pruebas y comprobación de arranque de producción.

Modificados:

- `src/config/characters.ts`: reutiliza PlayerCharacter y agrega nombre, retrato de selección, color y nombre de habilidad prevista; no duplica el catálogo.
- `src/config/gameConfig.ts`: selector como primera escena, registro de VisualNovelScene, contenedor DOM y escalado FIT centrado.
- `src/config/GameSettings.ts`: elimina la antigua selección fija `playerCharacter`; la partida ahora exige una selección válida.
- `src/scenes/GameScene.ts`: comprueba desbloqueo antes de crear entidades y rechaza datos ausentes, inválidos o bloqueados. Se conserva el transporte de personaje entre habitaciones y Game Over.
- `src/scenes/GameOverScene.ts`: valida permiso al entrar/reintentar y permite volver al selector mediante «CAMBIAR PERSONAJE».
- `index.html`: contenedor del juego con tamaño de viewport para mantener alineados canvas y selector al escalar.
- `tests/combat.browser.js`: arranque explícito de prueba con Lua y permisos en memoria aislada, independiente de la pantalla inicial o progreso del jugador.
- `tests/run-combat.mjs`: reutiliza el cliente CDP común; mantiene las verificaciones de interfaz del Sprint 3.

Player, Enemy, Projectile, EnemyManager y LineOfSight mantienen sus reglas de combate. No se alteraron los nuevos assets RobotBlue/Orange/Yellow del usuario.

En Fase 4, GameScene carga/crea/destruye SpecialAbilityManager, cancela al morir y transporta cooldown al cambiar habitación. Player añade una suspensión temporal de disparo normal; Projectile permite velocidad opcional; EnemyManager expone una copia de sus enemigos vivos. CharacterSelectView indica la tecla de habilidad configurada. Enemy y LineOfSight no necesitan cambios.

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
CharacterSelectScene → VisualNovelScene → GameScene → GameOverScene
        ↑                              ↑              │
        └──── cambiar personaje ───────┴─ reintentar ──┘
```

El selector muestra Alex y Lua con las imágenes originales `alex-selector.png` y `lua-selector.png` (1024 × 1536). Se conserva su proporción mediante object-fit: contain. Bloqueados se ven oscuros y con candado; desbloqueados recuperan su imagen y color. La tarjeta seleccionada muestra borde, marca y el botón «JUGAR CON …».

Se permite seleccionar mediante clic o enfocando las tarjetas con Tab/flechas y confirmando con Enter. El formulario admite Enter o el botón «DESBLOQUEAR». Desbloquear el primer personaje lo selecciona; canjear el segundo no reemplaza una selección existente. Un personaje bloqueado nunca sustituye a uno válido.

El selector no permite comenzar sin permiso. VisualNovelScene lo verifica al entrar y antes de pasar al combate. GameScene vuelve a comprobarlo antes de crear jugador, robots o colliders. GameOverScene comprueba el mismo servicio al entrar y al reintentar. Un dato de personaje inválido o ausente dirige al selector, sin usar un personaje predeterminado que permita evadir el bloqueo.

La selección viaja por datos de escena, como en Sprint 3, incluyendo la introducción. Se crea un solo Player y se conservan su identidad, habitación y reinicio. «CAMBIAR PERSONAJE» en Game Over regresa al selector con los desbloqueos intactos; empezar desde el selector reproduce la introducción y comienza en la primera habitación. Reintentar desde Game Over vuelve directamente a la habitación actual, sin repetir narrativa.

El layout lógico es 1024 × 768 y se escala conjuntamente con canvas usando FIT, sin deformación. Se verificaron límites en 800 × 600 y 390 × 844; en pantallas estrechas el escalado reduce el texto y conviene orientación horizontal para jugar. No se implementaron controles táctiles de gameplay.

### Recursos y entradas

Los listeners nativos del formulario usan AbortController y se liberan al cerrar el selector. Phaser elimina su DOMElement y el wrapper. La captura global de teclas se desactiva temporalmente en el selector y se restaura al salir, para que escribir códigos no se vea afectado por las capturas WASD/flechas del combate.

El DOM renderer de Phaser fuerza display:block sobre el nodo que administra; por eso el layout flex vive dentro de un wrapper de dimensiones explícitas. No se agregan listeners globales ni temporizadores de selector.

## Narrativa y diálogos — Fase 3 implementada

No se encontró una historia oficial. La introducción inicial fue sustituida por dos secuencias técnicas provisionales (alex_test/lua_test), con los textos de prueba solicitados. No representan capítulos definitivos. El contenido vive en `src/narrative/routes/`, separado del motor.

DialogueManager sigue siendo el único gestor de diálogo y ahora ofrece escritura progresiva configurable: una pulsación completa la línea, la siguiente avanza. NarrativeSequence define ruta/capítulo/ID e instrucciones validadas para fondos, retratos, diálogos, música y sonidos. NarrativeSequenceRunner las interpreta en orden hasta cada diálogo, sin ramas ni decisiones.

VisualNovelScene verifica el personaje, resuelve su secuencia y monta VisualNovelView. No inicia GameScene en segundo plano. Al terminar u omitir, una bandera impide duplicar la transición y GameScene recibe el personaje y destino permitido (habitaciones actuales 0/1). El selector utiliza habitación inicial 0. El puente startNarrative también permite iniciar una secuencia desde gameplay sin agregar una condición de victoria.

La vista muestra interlocutor, typewriter, contador, fondo y retratos posicionados. Las expresiones sin ilustración utilizan neutral con leyenda; no se deforman los originales. Se reutilizan las láminas de fondos con recortes explícitos. El audio tiene infraestructura preparada y se prueba sin archivos y con un AudioBuffer de prueba; todavía no hay pistas narrativas de producción.

Controles:

- Enter o espacio: completar texto en escritura; una nueva pulsación avanza.
- Botón COMPLETAR / CONTINUAR / ENTRAR: completar, avanzar o comenzar al final.
- Escape o botón OMITIR: entrar directamente con el mismo personaje.
- VOLVER: regresar al selector conservando el checkpoint de lectura.
- Tab: alternar botones; Enter/espacio sobre OMITIR ejecuta esa acción.

El foco inicial está en CONTINUAR. Los keydown repetidos y las pulsaciones duplicadas sin keyup se ignoran; se previene el clic nativo adicional de Enter/espacio. Un doble clic de ratón no salta una segunda línea. El Enter mantenido al salir del selector tampoco avanza accidentalmente la nueva escena. Los handlers se limitan al contenedor enfocado; el listener de blur y los demás eventos se abortan al cerrar, y se vacía el conjunto de teclas mantenidas.

Para agregar guiones, capítulos, fondos, personajes narrativos y audio, consultar los ejemplos de [sprint-4-visual-novel.md](sprint-4-visual-novel.md). El catálogo y los datos se amplían sin modificar la lógica de la escena. El progreso usa berzerk_narrative_progress_v1, separado de los códigos; reanuda diálogos reconstruyendo presentación sin repetir efectos sonoros anteriores. Finalizar u omitir no inventa un capítulo siguiente.

## Habilidades especiales — Fase 4 implementada

`SpecialAbilityConfig.ts` centraliza tecla y parámetros. `SpecialAbility` administra los estados lista → carga → activa → recuperación → reutilización mediante delta de escena, sin temporizadores propios. `SpecialAbilityManager` elige el módulo por personaje, consume Q con JustDown y administra HUD, poses originales y electricidad. Player conserva movimiento y cuerpo físico durante la habilidad y suspende disparos normales hasta terminar. No concede invulnerabilidad: un impacto enemigo sigue siendo letal.

Los recortes de las hojas originales se cargan como atlas en memoria sobre un lienzo lógico de 512 × 544, con línea de suelo fija. Un sprite visual acompaña al cuerpo de Player sin cambiar sus dimensiones ni colisiones; al terminar vuelve a mostrarse el sprite normal. No se editan ni sustituyen imágenes originales.

### Alex

`AlexSpecial` carga durante 350 ms y, al empezar la fase activa, elimina a todos los enemigos vivos registrados en la habitación actual, igual que Lua. Esta eliminación ignora paredes, distancia y dirección de disparo y reutiliza EnemyManager.defeatLivingEnemies(), que llama a die() una vez por enemigo válido. No afecta al jugador ni a otras habitaciones, y se cancela si Alex muere durante la carga.

Conserva su animación de metralleta durante 3000 ms y recupera el arma en 250 ms, con cooldown de 8000 ms. No crea proyectiles durante el especial: al terminar la carga, aparece una bola verde de radio 8 px en la posición de cada robot alcanzado, con desvanecimiento de 450 ms. Los valores impactRadius e impactMs son configurables. Las poses originales muestran cambio de arma, disparo/retroceso, destellos y retorno al arma habitual. La eliminación de pantalla ocurre una sola vez por activación.

Las bolas verdes se dibujan con Graphics, sin cuerpo físico, velocidad ni colisiones. Permanecen donde estaba cada enemigo al recibir el impacto y desaparecen sin temporizadores. Una habitación vacía no genera impactos. Se limpian también al morir, reiniciar o cambiar de habitación. Los disparos normales siguen usando Projectile y las colisiones existentes, con velocidad y vida útil originales.

### Lua

`LuaSpecial` carga durante 650 ms, descarga durante 500 ms y se recupera en 200 ms; después espera 12000 ms. Al iniciar la descarga usa EnemyManager.defeatLivingEnemies(), compartido con Alex, para eliminar una copia de los enemigos vivos de la escena activa sin consultar línea de visión. No opera sobre otra escena ni aplica daño al jugador. EnemyManager sigue contando muertes y emitiendo ROOM_CLEARED una sola vez.

La hoja original muestra carga, expansión y disipación; Graphics añade rayos amarillos hasta los límites físicos de la habitación, destello y anillo expansivo. Todos los efectos se retiran al terminar/cancelar. Las tarjetas indican la tecla configurada. No faltan sprites para estas habilidades; no se añaden sonidos porque no hay archivos de audio especiales proporcionados.

### Cancelación y extensión

La muerte cancela inmediatamente la habilidad y conserva visible la animación de derrota. Cambiar de habitación cancela ataques y transporta el cooldown restante; si había una habilidad en curso, empieza el cooldown completo. Reintentar desde Game Over inicia una partida lista para usarla. Cerrar la escena destruye poses, Graphics, HUD y tecla; los grupos existentes destruyen balas y sus temporizadores. Las habilidades destruidas ignoran nuevas actualizaciones y activaciones.

Para incorporar otra habilidad, extender SpecialAbility, implementar onDischarge y opcionalmente onActiveUpdate, configurar sus tiempos y asociarla en SpecialAbilityManager. Mantener muertes y colisiones en las entidades/sistemas existentes. Los fondos especiales usados por la VN no se modifican.

## Cambios futuros y extensión

- **Códigos:** modificar `CHARACTER_CODES` y conservar correspondencia independiente por personaje.
- **Fondos/retratos:** cambiar selectorPath/accent en `characters.ts` o el estilo del retrato, conservando la proporción del arte original. No hace falta editar la escena para sustituir una imagen.
- **Añadir personajes:** queda fuera del alcance actual. En el futuro ampliar PlayerCharacter, catálogo, esquema de desbloqueos, migración de almacenamiento, códigos y lista de tarjetas/pruebas conjuntamente. No basta añadir una imagen.
- **Diálogos:** añadir NarrativeSequence al catálogo de rutas y reutilizar el intérprete, gestores y vista existentes. No duplicar el motor para cada personaje/capítulo.
- **Habilidades/recargas:** modificar SpecialAbilityConfig; las fases y la limpieza compartidas están en abilities/. Los módulos concretos reutilizan EnemyManager o Projectile.

## Validación final — Fase 5

Comandos ejecutados:

- `npm.cmd run build`: TypeScript y Vite correctos. Persiste el aviso del bundle de Phaser mayor de 500 kB.
- `git diff --check`: sin errores de whitespace.
- `node tests/run-selection.mjs`: 124 comprobaciones de servicios/motor/escenas, 8 de interfaz con entradas nativas, 3 de recarga real y 4 de layout (selector y VN); todas aprobadas, cero errores de consola.
- `node tests/run-combat.mjs`: 66 comprobaciones de regresión y 2 de interfaz nativa de Game Over; todas aprobadas, cero errores de consola.
- `node tests/run-abilities.mjs`: 50 comprobaciones de habilidades con escenas, cuerpos y efectos reales y 2 de tecla Q nativa; todas aprobadas, cero errores de consola.
- `node tests/run-sprint-4.mjs`: 44 comprobaciones del recorrido integrado y estabilidad durante 12 reinicios; todas aprobadas, cero errores de consola.
- `npm.cmd run test:sprint4`: ejecuta las cuatro suites y escribe el informe final solo si todas pasan. Comprueba primero acceso al servidor y al navegador dedicado.
- Arranque de `dist/` mediante `npm.cmd run preview -- --host 127.0.0.1 --port 4173`: selector, canvas 1024 × 768 e imágenes originales cargan sin errores de consola. Evidencia en `docs/test-results/sprint-4-production.json`.

Se verifican códigos vacíos/incorrectos/repetidos, normalización, exclusividad, datos corruptos, errores de lectura/escritura y recuperación de guardado. También selección de ambos personajes, rechazo al navegar con personaje bloqueado/ausente/inválido (incluida VisualNovelScene), cambios de habitación, reintentos y liberación del formulario. La recarga crea un documento, juego y servicios nuevos y recupera desbloqueos y progreso narrativo independiente.

La narrativa se recorre completamente y se omite tanto con botón como con Escape. Se verifican orden, interlocutor, retrato, primera/última línea, secuencia vacía, tecla mantenida, doble clic, bloqueo del gameplay, limpieza y reentradas con ambos personajes. Enter y espacio se prueban con eventos reales del navegador. Reintentar después de morir no repite la introducción. El diálogo y sus botones permanecen dentro del área visible y sin solaparse en 800 × 600 y 390 × 844. Se inspeccionó visualmente la pantalla narrativa.

Total: **303 verificaciones aprobadas**, sumando los cuatro runners y sus controles nativos, recarga y layout. Habilidades: carga, cooldown, repeticiones, exclusividad, habitación vacía, eliminación de pantalla detrás de paredes con Alex y Lua, impactos verdes en las posiciones de los enemigos sin proyectiles físicos, animación de metralleta, expiración de efectos, movimiento, retorno de arma, muerte en carga/descarga/ráfaga, reinicio y cambio de habitación. Alex añade verificaciones de eliminación única, cancelación al morir durante carga y aislamiento de otros robots al cambiar habitación. Se inspeccionaron visualmente las poses originales de Alex y Lua y sus efectos en Canvas.

El recorrido final enlaza formulario real → selección → VN (Alex completa; Lua omite) → especial → impacto de bala enemiga → derrota → Game Over → reintento → selector. Los servicios de esta suite usan almacenamiento en memoria. En 12 reinicios alternados de personajes, la habitación 0 mantiene 3 cuerpos dinámicos, 51 estáticos, 7 colliders, 9 teclas y 117 objetos al empezar. No se observó acumulación en esos contadores; no constituye un perfil exhaustivo de memoria.

La regresión conserva movimiento, disparos, colisiones, IA, visión, muertes únicas, limpieza, habitación despejada, Game Over y reinicio. Las pruebas de combate autorizan ambos personajes mediante el servicio real con almacenamiento aislado en memoria; no agregan una excepción de producción.

Las pruebas utilizan `test_berzerk_character_unlocks_v1` y `test_berzerk_narrative_progress_v1`, independientes del progreso real. El runner las elimina al terminar. No se borran datos del jugador. Se inspeccionaron visualmente selector y presentación VN.

### Reproducción

1. Ejecutar `npm.cmd run dev -- --host 127.0.0.1`.
2. Abrir `http://127.0.0.1:5173/` para jugar con el selector.
3. Abrir `/tests/selection.html` para servicios/VN, `/tests/combat.html` para combate, `/tests/abilities.html` para habilidades o `/tests/sprint-4.html` para integración final.
4. Para entradas nativas e informe, iniciar una instancia dedicada de Edge/Chrome con perfil de pruebas y depuración remota en puerto 9224; ejecutar `npm.cmd run test:sprint4` con Node 22+. `CDP_PORT` y `TEST_BASE_URL` permiten cambiar puerto/URL. Ver el comando de navegador y los pasos exactos en [sprint-4-cierre.md](sprint-4-cierre.md).

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
- Las habilidades y el recorrido completo están verificados en Canvas. La instancia dedicada no ofrece contexto WebGL; otros navegadores/dispositivos, perfiles de memoria prolongados y balance manual quedan como validación de publicación. La narrativa y el audio definitivos siguen pendientes de contenido.

# Guía para producir e integrar la futura historia de Lua

Estado: **preparación documentada; argumento de Lua pendiente de definir**. Este documento no establece acontecimientos, motivaciones, nombre de la mascota ni desenlace. No se ha sustituido el guion provisional de Lua ni conectado su epílogo.

## 1. Qué reutilizar de Alex

El proceso completo ya se aplicó a Alex: leer la historia, separar escenas y recursos, fijar referencias visuales, generar y revisar imágenes, guardar variantes, medir los PNG, registrar fondos, preparar recortes de Kira, escribir las secuencias, conectar el resultado de campaña y probarlas en navegador.

| Referencia del proyecto | Qué contiene |
| --- | --- |
| [Integración de Alex](alex-story-integration.md) | Recorrido implementado, archivos, validación y límites |
| [Prompts reales de Alex y mascotas](story-assets-prompts.json) | Instrucciones finales y procedencia de las 19 imágenes |
| [Atlas de Kira](story-actor-atlas.md) | Recortes irregulares, transparencia y alineación de animaciones |
| [Recursos narrativos](../public/assets/story/README.md) | Carpetas, dimensiones reales y recursos disponibles |
| [Guion de introducción de Alex](../src/narrative/routes/alex/testSequence.ts) | Diálogos, retratos, CG, actor, objeto y efectos |
| [Guion final de Alex](../src/narrative/routes/alex/ending.ts) | Epílogo y cierre después de la victoria |
| [Capturas de la integración](test-results/alex-story/integration.json) | Comprobaciones y lista de capturas finales |

Reutilizar el motor actual. No crear otro reproductor de historias, otro gestor de guardado ni un cargador de imágenes paralelo. La cantidad de escenas y diálogos de Alex no es una obligación para Lua.

## 2. Definir la historia antes de producir recursos

Completar [la plantilla de planificación](templates/lua-story-plan.md) cuando exista el argumento. Para cada escena hay que saber: qué ocurre, qué ve el jugador, quién habla, qué cambia visualmente y qué recurso hace falta.

Clasificar cada plano:

- **Fondo vacío + retrato:** diálogo con cambios de expresión. Permite reutilizar escenario y expresiones existentes.
- **Fondo vacío + actor/objeto:** desplazamientos simples, reposo, ladrido o presentación de un objeto.
- **CG completa:** ilustración que ya contiene a los personajes y la acción. Usarla para interacciones complejas que no existen en las animaciones disponibles.

El resultado usado en Alex es híbrido. Kira camina, se sienta y maúlla en fondos vacíos; cocinar, captura, abrazo y celebración se representan con CG. No se animaron por separado las extremidades de las ilustraciones.

No deducir que Lua necesita secuestro, cumpleaños, la misma casa o una réplica de la historia de Alex. El chihuahua es un recurso disponible; su papel narrativo y nombre siguen pendientes.

## 3. Dirección de arte compartida

### Referencias y prioridades

1. **Identidad de Lua:** [lua-expressions.png](../public/assets/portraits/lua-expressions.png). Conservar rostro, ojos verdes, peinado oscuro, accesorios, traje negro y detalles amarillos de esta referencia. No cambiar vestuario o proporciones entre planos sin una decisión narrativa explícita.
2. **Lenguaje visual común:** [alex-expressions.png](../public/assets/portraits/alex-expressions.png), los retratos de Lua y las ilustraciones finales de Alex. Alex sirve como referencia de acabado; no transferir su ropa, audífonos ni diseño a Lua.
3. **Mascota:** [chihuahua-spritesheet.png](../public/assets/story/lua/characters/chihuahua-spritesheet.png). Mantener orejas grandes, silueta pequeña, cola y distribución de colores oscuros, canela y crema de esa hoja. No sustituirlo por otra raza o por Kira.
4. **Continuidad de escenario:** después de aprobar el primer fondo de cada lugar, usarlo como referencia para todas sus variantes y CG. Identificar su función en el prompt: estilo, identidad, espacio u objeto.

### Rasgos que deben mantenerse

- Anime japonés en **pixel art**: contornos oscuros limpios, bordes escalonados y grupos de píxeles deliberados.
- Sombreado por bloques y paleta contenida por material; siluetas legibles a tamaño de juego.
- Sin acabado fotográfico, pintura suave, aerógrafo, 3D, desenfoque o texturas minúsculas que contrasten con los personajes.
- Los fondos deben compartir el acabado de los personajes; no basta con insertar un personaje pixelado sobre un fondo realista.
- Luz y color pueden variar por escena, conservando identidad, materiales, arquitectura y dirección de iluminación dentro de un mismo momento.
- Lua conserva su identidad amarilla/eléctrica; Alex conserva la verde. Los botones y paneles comunes mantienen el azul de la interfaz existente. No incrustar interfaz en las ilustraciones.
- La habilidad de Lua se llama **Electro Dinamic**; la de Alex, **Shoot Vent**. Respetar estos nombres al escribir diálogos.

### Composición y formato

Solicitar fondos y CG horizontales de proporción 16:9, con objetivo inicial de 1920×1080. Reservar el sector inferior para el diálogo y mantener caras/acciones principales visibles por encima del panel. No dibujar paneles, texto, logotipos, marcas de agua ni collages dentro del recurso.

Las escenas de Alex se entregaron realmente a 1672×941, salvo armamento a 1672×940. Es una lección del proceso: **el tamaño solicitado no garantiza el tamaño generado**. Inspeccionar y registrar el archivo real; no inventar dimensiones en el manifiesto ni estirar la imagen para hacerla coincidir. El motor conserva proporciones con `cover`, que puede recortar laterales en móvil.

Para actores y objetos, solicitar PNG con transparencia real. Un damero dibujado o un fondo negro no equivalen a canal alfa. Preservar transparencia, bordes y márgenes útiles; comprobar el resultado sobre un fondo claro y uno oscuro.

## 4. Prompts base para reutilizar

Sustituir los campos entre corchetes por datos aprobados. Adjuntar las referencias indicadas al generador; describirlas en texto no reemplaza proporcionar las imágenes.

### Bloque de estilo común

Este bloque deriva de las instrucciones usadas en las imágenes finales de Alex:

```text
Match the ART STYLE of the supplied Berzerk character expression sheets:
Japanese anime PIXEL ART, dark clean pixel outlines, clearly stepped edges,
flat cel-shaded blocks with a restrained palette per material, simplified
shapes and readable silhouettes. Make pixel clusters visibly deliberate at
game scale. Match the characters' visual language and pixel contour weight,
even in backgrounds. NOT realistic rendering, NOT painted fine texture,
NOT airbrush, NO smooth gradients, NO 3D, NO photographic materials or blur.
```

### Fondo vacío

```text
Use case: illustration-story.
Asset: reusable empty background for Berzerk's visual novel.
Reference 1: Lua expression sheet, visual style authority only; do not draw Lua.
Reference 2: [approved environment reference, if one exists], spatial continuity.
[Insert the common style block above.]
Scene: [approved location, architecture and objects].
Fixed composition: [camera height, entrance positions, foreground and routes].
Lighting and time: [approved conditions]. Preserve the approved room layout.
Landscape 16:9, requested 1920x1080, one full-bleed image.
Keep [specified surfaces/areas] empty for separate actors or objects.
Leave usable lower-quarter dialogue space without drawing a dialogue panel.
No people, no animals, no story props that will be added separately.
No text, UI, watermark, collage or multiple panels.
```

### Ilustración narrativa completa (CG)

```text
Use case: illustration-story.
Asset: one complete narrative CG for Berzerk.
Reference 1: Lua expression sheet, exact character identity and visual style.
Reference 2: [approved empty background], exact environment and camera continuity.
Reference 3: [companion or object reference, only if present in this scene].
[Insert the common style block above.]
Action: [approved action, expressions and positions; do not invent story events].
Keep Lua's appearance and costume consistent with reference 1.
Keep architecture, furniture, object design and lighting consistent with the
approved references. Preserve the companion's markings and proportions.
Landscape 16:9, requested 1920x1080, one full-bleed image.
Keep important faces and action above the lower dialogue region.
No additional characters, text, UI, watermark, panels or collage.
```

### Hoja de mascota, solo si hacen falta animaciones nuevas

Primero revisar la hoja existente del chihuahua. No generar otra por defecto. Si faltan poses, pedir únicamente las necesarias y reutilizar su identidad:

```text
Use case: stylized-concept.
Asset: 2D pixel-art animation sheet for Berzerk.
Reference 1: existing chihuahua sheet, exact dog identity.
Reference 2: Lua expression sheet, shared pixel-art finish only; no person.
[Insert the common style block above.]
Only the same small chihuahua. Preserve coat markings, ears, tail and scale.
Animations: [approved required cycles only].
Requested layout: [columns] by [rows], [cell size] cells, [total dimensions].
Consistent body size and foot alignment, coherent consecutive poses, no
sprite crossing into another cell. Genuine transparent alpha background.
No cat, characters, scenery, labels, grid lines, text or external shadows.
```

Comprobar después la distribución real. Ni la petición de cuadrícula ni la palabra «spritesheet» garantizan celdas uniformes. Si hacen falta poses nuevas de interacción, una CG suele ser más fiable que intentar construirlas con caminar/reposo.

## 5. Proceso de generación y control de continuidad

1. Inspeccionar las referencias locales y elegir un pequeño conjunto de imágenes que fije el estilo y la identidad de Lua.
2. Crear el primer fondo vacío del lugar aprobado. Revisar composición, acabado y zona de diálogo antes de producir sus variantes.
3. Generar CG usando ese fondo y la hoja de expresiones como referencias. Reutilizar referencias de mascota y objetos cuando aparezcan.
4. Comparar cada salida con los retratos originales y con las escenas ya aceptadas. Revisar rostro, pelo, vestuario, mascota, puertas, muebles, luz, escala y orientación.
5. Ante un error, solicitar una corrección concreta conservando el resto. En Alex se corrigieron fondos demasiado pictóricos y un robot incrustado por error en un fondo que debía estar vacío.
6. Guardar los resultados elegidos en el proyecto. En Alex se usó la herramienta integrada `image_gen.imagegen`; sus originales permanecieron en el directorio de generación y se copiaron las versiones elegidas a `public/assets/story/`.
7. Conservar los originales. No sustituir retratos o recursos existentes sin autorización; guardar revisiones con nombres claros. Una variante descartada no debe quedar registrada como recurso final.
8. Medir dimensiones y transparencia, y registrar ruta, tipo de recurso, prompt final, referencias utilizadas, revisión elegida y estado de integración.
9. Revisar en el juego: una imagen aceptable aislada puede ocultar a la mascota detrás del panel o perder personajes por el recorte en móvil.

Guardar los futuros prompts de Lua en un documento separado, por ejemplo `docs/lua-story-assets-prompts.json`, con referencias relativas al proyecto cuando sea posible. No sobrescribir el registro histórico de Alex.

## 6. Organización de archivos

Estructura prevista; crear únicamente carpetas y recursos que requiera la historia aprobada:

```text
public/assets/story/lua/
  backgrounds/       fondos vacíos
  illustrations/     CG con personajes y acción ya dibujados
  characters/        chihuahua-spritesheet.png ya existe
  objects/           objetos separados, si hacen falta

src/narrative/routes/lua/
  testSequence.ts    introducción provisional actual
  ending.ts          final provisional actual
```

Usar nombres descriptivos en minúsculas separados por guiones, prefijo `lua-` para fondos/CG y claves igualmente claras. Registrar los fondos en `narrativeBackgrounds`, dentro de `src/config/NarrativeConfig.ts`. En las rutas del registro actual se usa `assets/...`, sin el prefijo `public/`.

Las secuencias reales del proyecto son TypeScript; no añadir `intro.json`/`ending.json` esperando que el motor los cargue automáticamente. No existe ese cargador en la implementación actual.

## 7. Preparar al chihuahua como actor

El PNG existe y se verificó con transparencia real y tamaño **948×1659**. Actualmente `storyActors` solo registra a Kira: el perro aún no tiene atlas ni animaciones utilizables por el motor.

Cuando su participación esté definida:

1. Inspeccionar su hoja propia y medir bandas, separación y límites alfa de las poses necesarias. No copiar los rectángulos de Kira.
2. Elegir pocos cuadros coherentes por ciclo; comprobar especialmente las vistas de espalda y los cambios de dirección.
3. Añadir una entrada al registro existente de `StoryActorConfig.ts`, con `name`, `src`, `sourceSize`, `layout`, `frames` y `animations`. El nombre mostrado deberá seguir la decisión del usuario.
4. Para cada cuadro registrar `crop: {x,y,width,height}`, `anchorX` y `groundY` absolutos en la hoja.
5. Alinear los recortes sobre un canvas común. Kira usa 128×128, centro x=64 y suelo y=120; ese es un destino lógico, no el tamaño de las celdas de origen.
6. Verificar que los recortes caben tanto en la fuente como en el canvas, mantienen escala y no incluyen partes del cuadro vecino.
7. Registrar `frames`, `frameRate` y `repeat` por animación. Un ladrido puede ser finito; caminar puede repetirse. Mantener una animación `idle`: el gestor vuelve a ella al terminar un desplazamiento.
8. Validar patas y silueta durante el ciclo en navegador, sin saltos de tamaño ni desplazamientos involuntarios.

El cálculo usado para alinear un cuadro es:

```ts
const dx = config.layout.centerX - frame.anchorX + frame.crop.x;
const dy = config.layout.groundY - frame.groundY + frame.crop.y;
// Dibujar el crop con tamaño original en (dx,dy), sin suavizado.
```

Recortar y alinear en memoria conserva el PNG original. Revisar [el atlas de Kira](story-actor-atlas.md) y su prueba como ejemplo técnico.

## 8. Construir las secuencias con el motor existente

| Evento actual | Uso y precauciones |
| --- | --- |
| `background` | Clave registrada; transición `none` o `fade` |
| `portrait` / `hidePortrait` | Retratos y expresiones existentes; posiciones `left`, `center`, `right` |
| `actor` / `hideActor` | Actor registrado y nombre de animación válido; movimiento opcional |
| `prop` / `hideProp` | Objeto con clave registrada; no basta con crear el PNG |
| `cue` | `shake` o `flash`; duración opcional; respeta movimiento reducido |
| `dialogue` | Punto de avance y guardado; `speaker`, `text` y `speakerId` opcional |
| `music` / `sound` | Requieren archivos y claves reales; todavía no hay audio narrativo registrado |

El intérprete es **síncrono**: ejecuta los efectos consecutivos hasta llegar a un diálogo. No tiene `wait`, decisiones, ramificaciones, vinculación física de objetos a manos ni sincronización labial. `moveTo` inicia el movimiento junto al diálogo; no detiene el avance hasta terminarlo. No encadenar varias supuestas «escenas temporizadas» sin diálogos esperando que el motor espere entre ellas.

Ejemplo exclusivamente técnico, con campos pendientes; no representa la trama de Lua ni debe registrarse tal cual:

```ts
import type { NarrativeSequence } from "../../NarrativeTypes";

export const luaSequenceExample: NarrativeSequence = {
    id: "lua_test", route: "lua", chapterId: "lua-story-v1", provisional: true,
    entries: [
        { type: "background", key: "<fondo-vacio-registrado>", transition: "fade" },
        { type: "portrait", character: "lua", expression: "neutral", position: "right" },
        { type: "dialogue", speaker: "Lua", speakerId: "lua", text: "<diálogo aprobado>" },
        // Solo si hay mascota y se registraron su actor y animaciones:
        { type: "actor", id: "<id-mascota>", animation: "walk-right",
          x: 45, y: 52, width: 9, moveTo: { x: 65, y: 52, durationMs: 750 } },
        { type: "dialogue", speaker: "Narración", text: "<acción aprobada>" },
        // Limpiar las capas antes de mostrar una CG que ya contiene personajes.
        { type: "hideActor", id: "<id-mascota>" },
        { type: "hidePortrait", character: "lua" },
        { type: "background", key: "<cg-registrada>", transition: "fade" },
        { type: "dialogue", speaker: "Lua", speakerId: "lua", text: "<diálogo aprobado>" }
    ]
};
```

Ocultar también cualquier `prop` activo antes de una CG que ya lo contenga. No duplicar Lua, mascota u objetos. Cambiar de fondo no borra automáticamente las demás capas.

### Posiciones y duración

`x` e `y` son porcentajes del área visible; `y` corresponde al apoyo inferior del canvas del actor y `width` al ancho porcentual. El ancho predeterminado es 10 %. Las coordenadas aceptadas van de 0 a 100; el ancho debe ser mayor que 0 y como máximo 100. La duración de movimiento/efecto debe ser positiva y no superar 10000 ms.

El CSS aplica `translate(-50%, -100%)`, con mínimos de 58 px para actores y 64 px para objetos. Las posiciones no son coordenadas exactas de la ilustración original cuando `cover` recorta el fondo. Revisar las superficies de apoyo y el panel en cada formato. En Alex se movió la puesta en escena de Kira al volver a casa porque el diálogo lo tapaba.

### Guardado, restauración y limpieza

- Los diálogos son los puntos de guardado. No guardar un índice intermedio de efecto.
- Al reanudar se restauran fondo, retratos, actores, objetos y música persistentes. Un actor desplazado vuelve al destino, sin repetir la caminata.
- No se repiten sonidos puntuales, flashes ni sacudidas anteriores.
- Cambiar `chapterId` al sustituir o reordenar sustancialmente un guion. No borrar el guardado de Alex ni resetear `localStorage` para incorporar Lua.
- Mantener los gestores existentes: cancelan animaciones y descartan cargas tardías al salir. No añadir temporizadores independientes sin limpieza.
- `BackgroundManager` conserva la ilustración anterior durante la carga y reutiliza la caché compartida; `VisualNovelScene.warmUpcomingBackgrounds()` anticipa los siguientes dos fondos. No duplicar esta lógica.

## 9. Puntos exactos de integración futura de Lua

| Archivo | Trabajo pendiente cuando se defina la historia |
| --- | --- |
| `src/narrative/routes/lua/testSequence.ts` | Sustituir introducción provisional; conservar ID `lua_test` si no hay motivo para migrarlo; capítulo versionado nuevo |
| `src/narrative/routes/lua/ending.ts` | Sustituir final provisional; conservar ID `lua_ending` y la convención `_ending` para mantener la protección existente |
| `src/narrative/NarrativeRouteManager.ts` | Mantener introducción como primera secuencia de Lua y registrar ambas sin duplicados |
| `src/config/NarrativeConfig.ts` | Fondos, expresiones adicionales solo si faltan y audio real cuando exista |
| `src/narrative/StoryActorConfig.ts` | Atlas propio del chihuahua si la historia lo utiliza |
| `src/narrative/StoryStageManager.ts` | Añadir claves de objetos de Lua si hacen falta; generalizar su texto alternativo, que hoy dice «Pastel de cumpleaños» |
| `src/scenes/GameScene.ts` | Extender `startCampaignEnding()` para enviar Lua a `lua_ending` tras la victoria final |
| `src/scenes/CompletionScene.ts` | Usar texto y fondo del cierre de Lua; quitar su aviso de epílogo pendiente al estar implementado |

Actualmente Lua sigue teniendo `provisional: true` en ambos guiones. Su final está registrado, pero **no se reproduce desde la victoria de campaña**: solo Alex pasa por su epílogo. No cambiar eso hasta disponer del contenido definitivo; entonces comprobar todas las rutas de victoria existentes.

El contrato de salida del epílogo debe usar `destination: { kind: "completion", runId }`. `VisualNovelScene` exige personaje desbloqueado y una victoria válida mediante `canComplete()`. No fabricar un resultado para mostrar el final ni desactivar estos controles. El encuentro del **nivel 5 (índice 4)** no es el final de campaña; el cierre corresponde a la victoria del **nivel 11 (índice 10)**. Preservar `finish()`, limpieza del combate y el comportamiento de Alex.

La introducción, si sigue siendo la primera secuencia de la ruta y conduce al nivel inicial, ya termina en `ControlsScene` y luego `GameScene`. No saltarse las instrucciones. El epílogo no se guarda ni reanuda como introducción; omitirlo lleva igualmente a la conclusión válida.

## 10. Audio y funcionalidades fuera del motor actual

`narrativeAudio` está vacío. El soporte de música repetida, efectos puntuales, volumen entre 0 y 1, desbloqueo del navegador y limpieza existe. Para usarlo, primero incorporar archivos y registrar claves; no añadir eventos con nombres inventados que generen avisos de recursos ausentes.

Voces, sincronización labial, edición esquelética de CG, elecciones y ramas requerirían trabajo adicional. No asumir que están implementadas ni introducirlas al preparar la historia sin necesidad. Música y efectos de audio quedaron pendientes también para Alex.

## 11. Validación y cierre de la futura implementación

Comandos actuales desde PowerShell:

```powershell
npm.cmd run build
node --test tests/*.test.mjs
npm.cmd run test:story:unit
npm.cmd run test:story
npm.cmd run test:sprint13
```

`test:story` recorre **Alex** y comprueba el estado actual de Lua; no será por sí solo una prueba de su futura historia. Crear una prueba equivalente de Lua usando como base `tests/alex-story.browser.js`, `tests/alex-story.html` y `tests/run-alex-story.mjs`. No sobrescribir esos archivos ni los informes de Alex para guardar los de Lua.

Las pruebas de navegador necesitan Vite y un navegador dedicado con CDP. La configuración actual es `http://127.0.0.1:5173` y CDP `9224`; consultar `tests/browser-session.mjs`. Comparten pestaña y deben ejecutarse secuencialmente; evitar ediciones que provoquen recarga HMR durante la ejecución. Usar guardados en memoria o claves de prueba, nunca progreso del jugador.

Actualizar las expectativas que hoy dicen que Lua es provisional o que no tiene actores, especialmente `tests/alex-story.test.mjs`, `tests/sprint-5.browser.js` y `tests/run-alex-story.mjs`. Conservar la comprobación de independencia entre las rutas; reformularla para permitir la futura mascota sin introducir elementos de Alex en Lua.

Comprobar al menos:

- Introducción completa y omisión → instrucciones → Lua en nivel 1.
- Reanudación del diálogo y capas correctas, sin repetir efectos o movimientos anteriores.
- Nivel 5 sin epílogo; victoria auténtica en nivel 11 → final de Lua → conclusión.
- Rechazo de final sin victoria, personaje bloqueado o `runId` inválido.
- Omisión del final, salida a selección, vuelta al menú y limpieza de actores, objetos, animaciones y audio.
- Ausencia de errores de compilación, consola, imágenes faltantes y recortes fuera de límites.
- Alex conserva guiones, celebración, combate y guardados independientes.
- Capturas e inspección real en escritorio 1280×800 y móvil 390×844, incluyendo una escena con mascota y el cierre; añadir otros formatos si la composición lo necesita.
- Sin personajes duplicados, actores ocultos por diálogo, saltos de escala, imágenes deformadas o mascotas flotando fuera de su superficie.
- Respeto de movimiento reducido y legibilidad del diálogo y botones.

Guardar capturas e informes en `docs/test-results/lua-story/` y documentar recursos utilizados, pruebas, límites y pendientes. Marcar `provisional: false` únicamente cuando la secuencia definitiva esté aprobada e integrada. Conservar la distinción entre recurso generado, recurso registrado y escena efectivamente probada.

## 12. Instrucción de continuidad para una futura sesión

```text
Implementa la historia de Lua únicamente a partir del argumento que acompaña
esta instrucción. Lee docs/lua-story-guide.md y la planificación aprobada.
Usa las hojas originales de Lua como identidad y el acabado pixel art de las
escenas de Alex como referencia compartida. Reutiliza el motor narrativo,
los registros de recursos, los controles y la validación de victoria actuales.
Inspecciona recursos y código antes de modificar nada; no asumas cuadrículas
uniformes ni funciones narrativas que el motor no tiene. Conserva la ruta de
Alex. Genera solo los recursos que falten y registra prompts y dimensiones
reales. Conecta el epílogo de Lua exclusivamente después de la victoria final.
Prueba introducción, reanudación, omisión, controles, campaña, cierre y ambas
rutas, con capturas reales de escritorio y móvil. Si el argumento todavía
no está definido, mantén este trabajo como preparación y no inventes la trama.
```

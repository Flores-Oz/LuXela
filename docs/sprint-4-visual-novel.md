# Sprint 4 — Motor Visual Novel

## Alcance y estado

Motor lineal por datos para las rutas independientes Alex/Lua. Sustituye la introducción anterior; no conviven dos motores narrativos. Se mantienen el selector, códigos, controles del gameplay, combate, enemigos, muerte de un impacto, habitaciones, Game Over y reintento.

| ID | Componente | Estado |
|---|---|---|
| VN-01 | VisualNovelScene | Implementada; entradas válidas y errores controlados |
| VN-02 | Diálogos/typewriter | Implementado; completar antes de avanzar |
| VN-03 | Retratos/expresiones | Implementado con alternativa neutral identificada |
| VN-04 | Fondos/fundidos | Implementado con recortes de recursos originales |
| VN-05 | Rutas | Independientes, lineales y extensibles por datos |
| VN-06 | Guiones | Tipados, validados e interpretados en orden |
| VN-07 | Audio | Infraestructura implementada y probada; faltan pistas narrativas de producción |
| VN-08 | Progreso | Versionado, independiente por ruta y separado de desbloqueos |
| VN-09 | Transiciones | Selección → VN → gameplay y puente de regreso reutilizable |
| VN-10 | Muestras | alex_test y lua_test; no son capítulos oficiales |
| VN-11 | Validación | Integración, entradas nativas, recarga y regresión ejecutadas |
| VN-12 | Documentación | Este documento y resumen de sprint actualizados |

No se crean historias definitivas, decisiones, bifurcaciones, finales, niveles ni habilidades especiales. Esos contenidos no se consideran terminados por existir el motor.

## Arquitectura

| Clase/archivo | Responsabilidad |
|---|---|
| `src/scenes/VisualNovelScene.ts` | Validar solicitud y permiso, coordinar managers, checkpoint, entradas y destino |
| `src/dialogue/DialogueManager.ts` | Texto progresivo y cursor, sin dependencia de Phaser |
| `src/narrative/NarrativeTypes.ts` | Tipos de guion/solicitud/progreso y validación runtime |
| `NarrativeSequenceRunner.ts` | Ejecutar efectos en orden y detenerse en cada diálogo |
| `NarrativeRouteManager.ts` | Registrar/resolver secuencias por ruta y validar checkpoints |
| `NarrativeSaveService.ts` | Persistencia versionada y alternativa de sesión en memoria |
| `CharacterPortraitManager.ts` | Aparición, expresión, posición, hablante, ocultación y limpieza |
| `BackgroundManager.ts` | Carga, recorte, ajuste visual, fundido y cancelación de cargas anteriores |
| `NarrativeAudioManager.ts` | Música/efectos propios, volumen, desbloqueo de audio y destrucción |
| `startNarrative.ts` | Interfaz de entrada reutilizable desde cualquier escena activa |
| `src/ui/VisualNovelView.ts` | Panel, texto, progreso, avisos, botones y protección de entradas |
| `src/ui/visual-novel.css` | Presentación proporcional y estados visuales |
| `src/config/NarrativeConfig.ts` | Catálogos y parámetros configurables |
| `routes/alex/testSequence.ts`, `routes/lua/testSequence.ts` | Contenido temporal separado del motor |

Se reutiliza `mountSceneView` para el contenedor DOM escalado y la restauración de captura de teclado. El servicio de desbloqueos conserva su función; el nuevo guardado no escribe su clave. No se agregaron dependencias.

Migración: se reemplazaron IntroScene, IntroView, intro.css e introDialogue por la escena/vista/configuración y guiones nuevos. Se amplió el único DialogueManager existente. CharacterSelectScene ahora llama al puente narrativo; `gameConfig.ts` registra VisualNovelScene. No se modificaron las entidades ni las reglas de GameScene para introducir narrativa.

## Flujo de ejecución

1. El selector valida el personaje y solicita su ruta.
2. VisualNovelScene vuelve a comprobar desbloqueo y tipos de la solicitud.
3. NarrativeRouteManager resuelve una secuencia de esa ruta. Un identificador inexistente o de otra ruta vuelve al selector con un mensaje; no lanza una excepción ni adivina otra secuencia.
4. Si hay un checkpoint `reading` válido y se permite reanudar, se utiliza su secuencia/entrada. Una secuencia solicitada explícitamente tiene prioridad sobre una distinta guardada.
5. El intérprete aplica instrucciones hasta encontrar un diálogo. Se guarda ese índice y comienza la escritura.
6. La primera acción de avance durante escritura completa la línea. La siguiente consume las instrucciones posteriores hasta otro diálogo o el final.
7. Finalizar u omitir guarda el estado terminal, limpia el motor e inicia GameScene con el mismo personaje y destino permitido.

Durante VN no hay gameplay ejecutándose debajo. La actualización de Phaser aporta delta al typewriter; no se crean intervalos. Al salir se detienen runner, cargas, animaciones, audio y listeners.

## Guiones y validación

```ts
const sequence: NarrativeSequence = {
    id: "alex_demo_v2",
    route: "alex",
    chapterId: "demo",
    provisional: true,
    entries: [
        { type: "background", key: "alex-test", transition: "fade" },
        { type: "portrait", character: "alex", expression: "neutral", position: "left" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Texto de prueba." },
        { type: "hidePortrait", character: "alex" }
    ]
};
```

Instrucciones admitidas: background, portrait, hidePortrait, dialogue, music y sound. Las claves son identificadores de catálogos, no nombres de clase. speakerId es opcional y permite destacar un retrato independientemente del nombre visible del interlocutor.

Se validan ruta, ID, capítulo, provisional, lista no vacía con al menos un diálogo, tipos de instrucción, campos requeridos, posiciones, transiciones y volumen entre 0 y 1. Los guiones inválidos/duplicados no se registran y quedan descritos en `NarrativeRouteManager.issues`. Los assets desconocidos generan alternativas/avisos; un asset ausente no invalida toda la historia.

### Agregar una secuencia o capítulo

1. Crear un archivo de datos tipado en `src/narrative/routes/<ruta>/`.
2. Definir ID único dentro de esa ruta, chapterId y entries.
3. Importarlo en NarrativeRouteManager y añadirlo al catálogo de su constructor.
4. Invocarlo mediante sequenceId. No hay que modificar VisualNovelScene, el selector o el intérprete.

La primera secuencia registrada de una ruta es su entrada predeterminada. No se pasa automáticamente al siguiente elemento del catálogo: terminar un guion no crea capítulos ni etapas. Para revisar guiones ya publicados conviene cambiar su ID o versionar/migrar el guardado; un índice antiguo que ya no señale diálogo se descarta como inválido.

## Diálogo y entradas

`NarrativeConfig.charactersPerSecond` configura la escritura (inicialmente 40 caracteres por segundo). DialogueManager utiliza puntos de código para evitar cortar pares Unicode; no es un sistema de composición tipográfica/traducción por grafemas.

- Enter/espacio/botón COMPLETAR: revela la línea si todavía se escribe.
- Una nueva acción sobre línea completa: CONTINUAR o ENTRAR al finalizar.
- Escape/botón OMITIR: omite explícitamente toda la secuencia.
- VOLVER: regresa al selector manteniendo el checkpoint de lectura.
- Tab navega los controles; Enter/espacio activan el botón enfocado.

Se ignoran auto-repeat, duplicados sin keyup y el segundo clic de un doble clic. Se previene el clic nativo adicional causado por teclado. El foco inicial está en avanzar. El panel ofrece el texto completo a lectores de pantalla sin anunciar cada carácter del efecto visual. Los textos largos se ajustan y pueden desplazarse dentro del panel sin cubrir botones.

## Fondos

El catálogo `narrativeBackgrounds` acepta cualquier clave con src y crop opcional. BackgroundManager no contiene las claves de Alex/Lua.

Los recursos originales de efectos miden 1536 × 1024 y contienen seis variantes de 512 × 512. Las muestras usan la región superior izquierda; no muestran el mosaico completo ni alteran las imágenes. Se dibuja el recorte en un canvas de presentación y se ajusta con object-fit: cover, manteniendo proporción aunque los bordes puedan recortarse.

```ts
narrativeBackgrounds["sala-demo"] = {
    src: "assets/narrative/sala.png"
};
// En un guion:
{ type: "background", key: "sala-demo", transition: "fade" }
```

Si se utiliza una hoja, añadir crop con x/y/width/height. Se comprueban valores finitos y límites reales. Un identificador desconocido mantiene un fondo neutro y muestra aviso. Las cargas anteriores quedan invalidadas por generación; una imagen tardía no pisa el fondo nuevo. El tiempo del fundido se configura mediante transitionMs (200 ms iniciales).

## Retratos, expresiones y personajes narrativos

Posiciones: left, center y right. Las figuras mantienen proporción mediante object-fit: contain; el hablante se destaca sin cambiar su diseño.

El catálogo prepara neutral/happy/sad/angry/surprised y permite más claves de expresión. Solo existe una ilustración neutral original utilizable por personaje: se reutilizan alex-selector.png y lua-selector.png, que ya incluyen su propio fondo. No se simulan emociones deformando los sprites.

Las muestras solicitan happy/surprised para demostrar el fallback. Se conserva neutral con una leyenda de expresión no disponible. Esto no representa una ilustración feliz/sorprendida terminada.

Para incorporar una expresión real:

```ts
narrativePortraits.alex.expressions.happy = "assets/narrative/alex-happy.png";
```

Para agregar un personaje **solo narrativo**, registrar cualquier clave en narrativePortraits con name y expressions; después usarla en portrait y speakerId. No es necesario añadirlo a personajes jugables ni al sistema de códigos. Si falta todo el arte se muestra un recuadro identificado; si falla una imagen, su caption lo indica.

## Audio

El catálogo narrativeAudio está vacío porque no se proporcionaron pistas narrativas. Las muestras funcionan en silencio; no se inventan recursos de producción.

```ts
narrativeAudio["tema-demo"] = { urls: ["assets/audio/tema.ogg", "assets/audio/tema.mp3"] };
// Instrucciones de datos:
{ type: "music", key: "tema-demo", action: "play", volume: 0.3 }
{ type: "sound", key: "puerta", volume: 0.5 }
{ type: "music", key: "tema-demo", action: "stop" }
```

También hay que registrar el recurso puerta si se usa ese ejemplo. Los archivos del catálogo se cargan en preload. Play repetido de la misma música ajusta volumen sin duplicar pista. Los efectos son puntuales. Los valores iniciales de volumen son 0.35 para música y 0.5 para efectos; las instrucciones pueden sobrescribirlos.

Se utiliza el SoundManager nativo de Phaser y su desbloqueo por interacción. Las claves ausentes se omiten con aviso. La limpieza destruye únicamente sonidos propiedad del motor y retira el listener de desbloqueo; no detiene indiscriminadamente todo el audio del juego. La prueba usa un AudioBuffer de prueba real para verificar creación única, configuración de volumen y destrucción; no certifica calidad musical ni audibilidad de archivos que aún no existen.

## Guardado y rutas independientes

Clave exclusiva: `berzerk_narrative_progress_v1`.

```json
{
  "version": 1,
  "routes": {
    "alex": { "chapterId": "test", "sequenceId": "alex_test", "entryIndex": 2, "status": "reading" },
    "lua": { "chapterId": "test", "sequenceId": "lua_test", "entryIndex": 6, "status": "skipped" }
  }
}
```

Los índices corresponden a **instrucciones**, no al contador visual de diálogos. Solo se guarda reading al entrar en un diálogo: no se escribe en localStorage por carácter/frame. Reanudar vuelve a escribir esa línea desde el principio.

- reading: checkpoint válido de diálogo, reanudable.
- completed: todas las instrucciones fueron consumidas.
- skipped: el usuario omitió explícitamente la secuencia.

Los estados terminales usan índice entries.length. Volver a elegir una ruta terminada reproduce su muestra inicial, sin avanzar capítulos. `resume: false` fuerza inicio de la secuencia solicitada. Una ruta no sobrescribe la otra.

El servicio valida versión, ruta/ID/capítulo e índice contra el catálogo. Una ruta corrupta se descarta sin perder la otra válida. Si el almacenamiento falla, se usa la misma instancia de memoria entre escenas y se informa que el progreso es temporal. La instancia se aloja en el registro de Phaser, separada del servicio de desbloqueo.

Al reanudar se reconstruyen el último fondo, los retratos que seguían visibles y la música final activa. No se vuelven a ejecutar diálogos anteriores ni sonidos puntuales consumidos. No hay avance automático a capítulos que todavía no existen.

Para restablecer solo narrativa durante pruebas:

```js
localStorage.removeItem("berzerk_narrative_progress_v1");
location.reload();
```

Esto conserva `berzerk_character_unlocks_v1`. No usar localStorage.clear().

## Integración desde selección o gameplay

```ts
import { startNarrative } from "../narrative/startNarrative";

startNarrative(this, {
    route: "alex",
    sequenceId: "alex_test",
    resume: false,
    returnTo: { roomIndex: 1 }
});
```

`this` debe ser la escena activa. El helper usa scene.start y cierra esa escena; al finalizar/omitir VN inicia GameScene con el mismo personaje. Los destinos admitidos son las habitaciones actuales 0 y 1; otros índices son rechazados. Una futura ampliación de habitaciones deberá actualizar ese contrato explícito.

El selector utiliza solamente route y permite reanudación automática. Game Over mantiene su reintento directo sin volver a reproducir narrativa. El puente desde gameplay está disponible y se prueba, pero no se conecta a victoria, habitación despejada ni otra condición no definida. No se añaden capítulos jugables.

## Muestras

- alex_test: fondo verde, Alex a la izquierda, «Esta es una prueba del motor narrativo», cambio a derecha/happy (fallback neutral), «Los sistemas están funcionando correctamente», ocultación y finalización.
- lua_test: fondo amarillo, Lua a la derecha, «Iniciando secuencia de prueba», cambio a centro/surprised (fallback neutral), «El sistema narrativo está listo», ocultación y finalización.

Ambas están marcadas como provisionales y se ejecutan independientemente. No incluyen decisiones ni historia oficial.

## Pruebas y reproducción

1. Ejecutar `npm.cmd run dev -- --host 127.0.0.1`.
2. Abrir `http://127.0.0.1:5173/`, desbloquear con los códigos provisionales existentes y seleccionar una ruta.
3. Para pruebas en navegador, abrir `/tests/selection.html` (servicios, VN y escenas) o `/tests/combat.html`.
4. Para entradas nativas/recarga, usar Node 22+ y una instancia dedicada de Edge/Chrome con perfil de prueba y depuración remota en puerto 9224; ejecutar `node tests/run-selection.mjs` y `node tests/run-combat.mjs`. Los runners navegan su primera pestaña. CDP_PORT y TEST_BASE_URL permiten cambiar conexión.
5. Ejecutar `npm.cmd run build` para TypeScript y producción.

Las pruebas utilizan claves `test_berzerk_character_unlocks_v1` y `test_berzerk_narrative_progress_v1`, independientes del progreso del jugador. Los runners las limpian al terminar.

Validaciones registradas:

- Suite de selección/VN: 124 comprobaciones de servicio/motor/escenas, 8 de entrada nativa, 3 de recarga y 4 de layout.
- Combate: 66 comprobaciones de regresión y 2 de Game Over con entrada nativa.
- Subtotal de las suites VN/selección y combate: **207 comprobaciones aprobadas**, sin errores JavaScript/console.error. El cierre posterior de Sprint 4 suma **303** con habilidades e integración; ver [sprint-4-cierre.md](sprint-4-cierre.md).
- TypeScript y build Vite correctos; permanece aviso de bundle Phaser mayor de 500 kB.
- `git diff --check`: sin errores de whitespace.
- Revisión visual de la pantalla narrativa con fondo y arte originales.

Se cubren escritura/velocidad/Unicode, completar/avanzar/omitir, validación de guiones, registro de capítulos, independencia de rutas, guardado corrupto/inaccesible, reanudación visual real tras recargar, audio sin assets y con AudioBuffer, cambios de fondos y expresiones, limpieza, solicitudes malformadas, guardas de desbloqueo y puente gameplay → VN → gameplay. Se mantiene la regresión de movimiento, balas, paredes, IA, muerte, Game Over, reinicios y habitaciones.

## Limitaciones y próximos pasos

- Solo hay neutral; faltan ilustraciones específicas de expresiones. Las alternativas están identificadas visualmente.
- Faltan archivos narrativos de música/SFX y prueba auditiva con recursos finales.
- Las ilustraciones actuales no son retratos transparentes independientes. Pueden sustituirse en catálogo cuando se proporcionen originales adecuados.
- No existe historia aprobada, capítulo oficial ni integración automática con una condición de victoria.
- Validación realizada en Edge/Canvas. WebGL, otros navegadores, audibilidad/autoplay por dispositivo y reinicio completo del navegador/sistema requieren comprobación adicional. La persistencia sí se verifica con navegación real a un documento y servicio nuevos.
- En móviles estrechos el FIT reduce texto; se recomienda orientación horizontal. No se añadieron controles táctiles del combate.
- El motor es lineal: no incluye elecciones, ramas, finales múltiples, localización ni guardado en nube.
- Las habilidades de Alex/Lua ya están implementadas y validadas en las Fases 4 y 5; consultar [sprint-4.md](sprint-4.md). Este documento describe únicamente el motor narrativo y sus contenidos de muestra.

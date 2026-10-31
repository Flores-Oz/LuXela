# Recursos narrativos de Berzerk

19 PNG generados con la herramienta integrada image_gen.imagegen, tomando como referencia el pixel art de `public/assets/portraits/alex-expressions.png` y las mascotas proporcionadas por el usuario.

## Organización

- `alex/backgrounds/`: 5 fondos vacíos (casa nocturna, cocina, casa dañada, equipo y fábrica).
- `alex/illustrations/`: 10 escenas completas de preparación del pastel, invasión, secuestro, armamento, entrada a la fábrica, cautiverio, rescate, regreso y celebración; incluyen personajes.
- `alex/objects/`: 2 versiones del pastel, con velas encendidas o apagadas, con transparencia real.
- `alex/characters/`: hoja del gato Kira.
- `lua/characters/`: hoja del chihuahua.

## Comprobaciones realizadas

Se revisaron visualmente las imágenes durante la generación. Se verificaron los 19 PNG mediante System.Drawing: escenas de 1672×941 (armamento: 1672×940), pasteles de 1254×1254 y hojas de mascotas de 948×1659. Las cuatro imágenes de mascotas y objetos tienen píxeles realmente transparentes; los fondos y escenas son opacos. Los tamaños reales difieren de los solicitados al generador y están registrados en `manifest.json`.

La historia de Alex está integrada: introducción de ocho escenas → instrucciones → nivel 1; victoria final en el nivel 11 → rescate de Kira y celebración → Historia completada. La ruta de Lua conserva su comportamiento. Se validaron campaña, guion, atlas, reanudación y escenas en navegador; véase `docs/alex-story-integration.md`.

## Integración y pendientes

Kira utiliza 48 recortes explícitos sobre un canvas común de 128×128, registrados en `src/narrative/StoryActorConfig.ts`, sin modificar el PNG. Camina, se sienta y maúlla durante escenas con fondo vacío; las interacciones complejas usan ilustraciones completas. Las hojas de origen son irregulares: no usar frameWidth/frameHeight de 128. La hoja del chihuahua queda para una historia posterior de Lua.

Los fondos, objetos y escenas de Alex están registrados. Las ilustraciones que ya contienen personajes se muestran sin superponer otra copia de Alex o Kira. `alex-ending-cg.png` se usa para el cierre cercano de la celebración. El fondo vacío del cuarto de equipo y el pastel apagado quedan disponibles como variantes. No se añadieron música ni efectos de audio nuevos.

Los prompts finales y rutas de los originales están en `docs/story-assets-prompts.json`. Los originales de generación se conservaron fuera del repositorio; ningún portrait o sprite original del proyecto se sustituyó.

## Continuidad para Lua

La guía de estilo, prompts, preparación de recursos, atlas y secuencias está en [docs/lua-story-guide.md](../../../docs/lua-story-guide.md). La [plantilla de planificación](../../../docs/templates/lua-story-plan.md) conserva el argumento como pendiente. No se ha cambiado la historia provisional de Lua.


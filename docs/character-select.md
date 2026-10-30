# Selector de personajes — presentación visual

La pantalla usa el título «Elige tu historia», dos tarjetas amplias, rasgos de cada personaje, estados de bloqueo/selección y habilidades con iconos, descripción y carga por diez bajas. Los controles comunes usan azul acero/azul hielo; Alex mantiene verde y Lua amarillo, incluido el brillo de selección.

## Recursos y archivos

- `public/assets/backgrounds/select-background.png`: fondo industrial proporcionado, conservando su nombre.
- `public/assets/ui/alex-ability-icon.png` y `lua-ability-icon.png`: iconos proporcionados.
- Se reutilizan `alex-selector.png` y `lua-selector.png`, con sus mascotas y escenarios integrados; se muestran completos mediante `object-fit: contain`, sin alterar las imágenes.
- `src/ui/CharacterSelectView.ts`: composición, textos e integración de iconos. Conserva las acciones y los nombres de habilidades existentes.
- `src/ui/character-select.css`: distribución adaptable, marcos y esquinas, paleta, foco, hover, pulsación, bloqueo y selección. No se añaden dependencias ni fuentes externas.
- `tests/selection.browser.js`: identifica el personaje por su tarjeta, permitiendo un texto alternativo descriptivo en las imágenes.
- `tests/capture-character-select.mjs`: revisión reproducible de recursos, colores, selección, dimensiones y ausencia de solapamientos, con capturas.

Los códigos, almacenamiento, controles y entrada a las rutas narrativas reutilizan los sistemas existentes.

## Validación

- `npm run build`: tipos y compilación aprobados; permanece la advertencia anterior de tamaño del paquete Phaser.
- `node tests/run-selection.mjs`: 147 comprobaciones aprobadas, incluyendo teclado y ratón reales, canje de ambos personajes, progreso tras recarga, selección, introducciones y disposición. Cero errores de consola.
- `node tests/capture-character-select.mjs`: 26 comprobaciones aprobadas. Vistas de 1920×1080, 1280×768, 800×600, 390×844 y 844×390. Recursos cargados, acentos independientes, controles azules y contenido sin solapamiento ni desbordamiento horizontal.
- Capturas generadas y examinadas en `docs/test-results/character-select/`; informe en `visual.json`. El fixture oculta sus resultados y reproduce las reglas de contenedor de `index.html` para las capturas. En pantallas bajas se conserva desplazamiento vertical interno para acceder al código y al inicio.

Capturas: [Alex en escritorio](test-results/character-select/desktop-alex.png), [Lua en escritorio](test-results/character-select/desktop-lua.png), [móvil](test-results/character-select/mobile.png), [pantalla compacta](test-results/character-select/compact.png).

La revisión visual se realizó en Edge/Canvas. Otros navegadores y dispositivos quedan para la validación general del proyecto.

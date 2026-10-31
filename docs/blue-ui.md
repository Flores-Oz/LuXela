# Paleta azul de interfaz

La paleta común usa azul claro `#8dcfff`, azul secundario `#82b8dc` y fondos azul oscuro. Se aplica mediante `UITheme` a menús, narrativa y etiquetas compartidas. También se actualizaron los estados de botones, reintentar en Game Over y las páginas de prueba de robots y jefes.

Los marcos de pausa y diálogo y el indicador de avance conservan sus PNG originales. El ajuste de tono se aplica con CSS exclusivamente a sus capas decorativas, para mantener los retratos, el escenario y el texto sin alteraciones. Alex conserva sus acentos verdes y Lua los amarillos; los avisos de peligro y salida mantienen sus colores semánticos.

Antes de modificar la paleta se guardó `backups.local/berzerk-before-blue-ui-20261030-213239.zip`: 579 archivos, incluidos código, recursos, pruebas y documentación con los cambios locales existentes. El ZIP pasó su verificación de integridad y contiene `BACKUP-MANIFEST.json` con tamaños y hashes SHA-256. Excluye dependencias, compilaciones, perfiles del navegador y metadatos de Git; está en una carpeta ignorada por Git.

Validación realizada:

- `npm run build`: compilación y tipos aprobados.
- `node tests/run-selection.mjs`: 186 comprobaciones de integración, navegación con teclado real y distribuciones adaptables aprobadas.
- `node tests/run-sprint-5.mjs`: 53 comprobaciones, teclado de pausa y tamaños de pantalla aprobados.
- Capturas examinadas de menú principal, diálogo y pausa en `docs/test-results/blue-ui/`; también se guardaron selección de personajes y Game Over.
- Sin errores de consola en estas pruebas.

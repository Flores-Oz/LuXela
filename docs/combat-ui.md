# Interfaz de combate

El HUD separa habitación/oleada, enemigos/puntos y habilidad. Paneles y pausa usan azul; Shoot Vent usa verde y Electro Dinamic amarillo. El especial muestra su icono, tecla Q, estado y segmentos correspondientes a las bajas configuradas. No introduce salud para los personajes ni tiempos de recarga nuevos.

El aviso de sector ocupa la esquina inferior derecha en escritorio y una posición sobre el especial en pantallas estrechas. Conserva sus ocho segundos y el desvanecimiento final según el reloj del juego. En un encuentro de jefe con pantalla estrecha de menos de 600 px de alto se oculta el aviso para dejar espacio al combate y al especial. La barra de Quimera muestra salud, fase y aviso de remate, con el nuevo marco.

El control `ESC · PAUSA` usa ahora el mismo marco industrial azul, con área de interacción de 128×44 píxeles y estados de enfoque por puntero. Conserva el atajo Esc y el menú de pausa existente. Su contenedor se ancla a la esquina superior derecha y se adapta al zoom.

Al desbloquear las puertas aparece un panel independiente con «SALIDA DESBLOQUEADA» y «Dirígete a una puerta para continuar». Se coloca en el centro de la pantalla, con título ámbar de mayor tamaño y texto secundario claro, y persiste hasta abandonar la habitación. Su visibilidad depende del estado real de las puertas, tanto en salas normales como después del jefe del nivel 5; desaparece al entrar en otra sala. El mensaje se retira del pie del especial para evitar duplicación. La victoria del último jefe conserva su pantalla de conclusión.

## Recursos

Se cargan una sola vez por juego y se reutilizan al cambiar de habitación. Se conservan los PNG originales. Las medidas se verificaron sobre las imágenes suministradas; sus márgenes transparentes se excluyen mediante frames de textura:

| Archivo en `public/assets/ui/` | Tamaño PNG | Rectángulo utilizado: x, y, ancho, alto |
| --- | --- | --- |
| `hud-panel-frame.png` | 1983×793 | 0, 136, 1983, 513 |
| `boss-hud-frame.png` | 2172×724 | 12, 177, 2149, 352 |
| `level-banner-frame.png` | 2172×724 | 2, 164, 2168, 365 |

Cada marco se construye con tres imágenes para mantener las esquinas y adaptar la sección central al ancho disponible. Funciona en Canvas y WebGL; el NineSlice nativo de esta versión solo tiene renderer WebGL. Los iconos de las habilidades se reutilizan del selector.

## Código

- `src/ui/CombatUI.ts`: carga, metadatos de recorte, panel reutilizable y distribución compartida.
- `src/ui/PauseControl.ts`: marco de pausa, etiqueta, área completa de clic y colocación.
- `src/ui/GameHUD.ts`: indicadores, iconos, estados y medidor segmentado. Los objetos se crean al entrar y se actualizan sin reconstruirlos cada frame. `summary` expone los valores para diagnóstico y pruebas.
- `src/ui/RoomBriefing.ts`: marco y textos del aviso, colocación y desvanecimiento.
- `src/ui/BossHealthBar.ts`: marco, relleno dinámico, rastro de daño, salud/fase y remate.
- `src/scenes/GameScene.ts`: precarga, integración y anclaje de pausa. La escala inversa al zoom conserva el tamaño del HUD cuando se mueve la cámara.

## Validación

- `npm run build`: tipos y producción aprobados. Persiste la advertencia anterior de tamaño del paquete Phaser.
- `npm run test:sprint13`: 905 comprobaciones aprobadas: 219 de lógica, 147 de selección, 69 de combate, 68 de habilidades, 103 de robots, 32 de remates y 267 de campaña/jefes. Cero errores de consola. Informe: `docs/test-results/sprint-13.json`.
- `node tests/run-combat-ui.mjs`: 218 comprobaciones específicas aprobadas. Recorre la campaña de prueba y valida el HUD con ambos personajes. Comprueba 0/10, 7/10 y 10/10, nombres y colores correctos, aviso de Q, carga de recursos, escala fija, límites, separación de paneles y conservación de colliders. También revisa las barras de ambos jefes. La opción `--reuse` permite reutilizar una ejecución de campaña ya aprobada en la pestaña dedicada.
- Capturas y resultados específicos en `docs/test-results/combat-ui/`. Se revisaron representaciones de Alex/Lua, especial listo y jefes en escritorio/móvil. Las capturas usan Canvas y una cámara de prueba que respeta las dimensiones de la sala.

La validación específica cubre 1920×1080, 1280×768, 800×600, 390×844 y 844×390. Quedan para la revisión general WebGL, otros dispositivos y el balance visual durante partidas prolongadas. La decoración de los mapas no forma parte de esta integración.

La ampliación de pausa/salida comprueba clics reales en ambos lados del botón, reanudación con Escape, aviso oculto durante combate y panel desbloqueado sin solapamientos en los cinco tamaños. La campaña también verifica que las puertas y el aviso se habiliten al completar las oleadas y al derrotar al primer jefe. Capturas examinadas: `alex-1280-exit-unlocked.png` y `lua-390-exit-unlocked.png`.

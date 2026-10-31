# Navegación de robots en esquinas

El cambio instantáneo de eje al detectar un choque hacía que los robots volvieran al obstáculo en el siguiente paso de física. Ahora una persecución bloqueada mantiene una ruta de desvío hasta recuperar un acceso libre.

- `EnemyNavigationGrid` calcula rutas con el ancho y alto reales del cuerpo. Incluye paredes interiores, maquinaria sólida y límites exteriores. Permite salir de un contacto exacto sin atravesar obstáculos ni cortar esquinas.
- `LineOfSight` conserva su función de visibilidad y comparte las cuadrículas de navegación entre robots. Solo vuelve a construirlas cuando cambian las paredes físicas o las dimensiones del mapa.
- `Enemy` detecta bloqueos y falta de desplazamiento, sigue puntos de ruta estables y recalcula si el objetivo cambia o el robot deja de avanzar. Los objetivos inaccesibles terminan en una posición alcanzable, sin alternar direcciones continuamente.
- La patrulla comprueba el espacio disponible antes de girar. En un contacto simultáneo con dos paredes puede dar un paso diagonal hacia una posición libre y retomar la patrulla.

Se mantienen los estados de ataque, velocidades máximas, distancias de detección, colisiones, proyectiles y reglas de muerte. El azul conserva su retirada; el naranja permanece inmóvil durante carga y recuperación. La navegación no crea temporizadores de Phaser.

Verificaciones específicas:

- `node --test tests/enemy-navigation.test.mjs`: seis pruebas geométricas, incluidos obstáculos en U, pasillos de 64 px, objetivos fuera de límites e inaccesibles.
- `node tests/run-enemy-navigation.mjs`: 27 comprobaciones con cuerpos y colisiones reales de Phaser, las cuatro variantes, ocho esquinas, retirada del azul y carga del naranja. Informe en `docs/test-results/enemy-navigation/integration.json`.
- `node tests/run-robot-attacks.mjs`: 103 comprobaciones de ataques y colisiones.
- `npm run build`: tipos y compilación.
- `npm run test:sprint13`: 965 comprobaciones aprobadas de configuración, selección, combate, habilidades, robots, remates y campaña completa. Sin errores de consola.

Las rutas consideran geometría estática; no se añadieron colisiones entre robots ni navegación para el jefe.

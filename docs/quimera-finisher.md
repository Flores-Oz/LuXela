# Prueba de remate de Quimera

Con un 10 % de vida o menos (hasta 7,2 de 72), Quimera permite un QTE una vez por encuentro mientras siga vivo. Se activa automáticamente al acercarse a 160 píxeles o menos y con línea de visión despejada. Se comprueba continuamente durante el combate: no requiere recibir otro golpe ni quedar exactamente al 10 %. La barra muestra «Acercate para rematar» cuando está disponible. Los robots normales conservan la muerte de un impacto; los golpes letales al jefe siguen siendo letales.

- Alex y Lua: izquierda → arriba → abajo → derecha → espacio (← ↑ ↓ → Espacio).
- Cada paso permite 0,6 segundos; también se puede tocar el símbolo.
- Una tecla de dirección o espacio incorrecta, o agotar el tiempo, cancela la oportunidad y reanuda el combate. Se puede terminar con disparos normales.
- Completar la secuencia reproduce la animación del personaje; solo después destruye al jefe y activa el cierre narrativo existente.
- Escape permite pausar durante la secuencia o la animación. La física se detiene y los proyectiles se limpian al comenzar. Abandonar o reiniciar cancela la secuencia.

## Recursos

Se reutilizan `public/assets/special/alex-special.gif` (16 fotogramas, 2950 ms) y `lua-special.gif` (12 fotogramas, 2890 ms). No se modifican los GIF. Las copias técnicas PNG de 512 px por celda y sus tiempos están en `public/assets/special/derived/`. Para regenerarlas en Windows: `powershell -ExecutionPolicy Bypass -File scripts/prepare-finishers.ps1`.

`FinisherChallenge` controla entrada y tiempos sin temporizadores independientes. `BossFinisher` presenta la interfaz y los fotogramas. `QuimeraController`, `Quimera` y `QuimeraEncounter` coordinan umbral, cancelación y destrucción. `GameScene` detiene y reanuda el combate.

## Probar

Con Vite encendido, abrir <http://localhost:5173/tests/quimera-finisher.html>. Elegir Alex o Lua y pulsar **Dejar al 8 %**. Acercarse al jefe usando WASD para activar el QTE. La página de desarrollo entra directamente a la arena y retiene los ataques del jefe para facilitar la inspección; el juego principal mantiene su combate normal. Cambiar de personaje inicia otra prueba sin modificar desbloqueos persistentes.

`npm run test:finisher` ejecuta pruebas del modelo y entradas reales de teclado/puntero en el navegador dedicado CDP 9224. Capturas e informe: `docs/test-results/quimera-finisher/`. La regresión completa se ejecuta con `npm run test:sprint11`; compilación con `npm run build`.

La secuencia, ventana de tiempo, alcance y umbral se ajustan en `src/config/BossFinisherConfig.ts`. Es una primera prueba de presentación del remate; no incorpora nuevas barras de vida a robots normales ni modifica las habilidades especiales.

## Resultado verificado

Primera versión (2026-10-27): regresión completa de 1501 comprobaciones aprobadas. Informe histórico: `docs/test-results/sprint-11.json`.

Ajuste de proximidad: 29 pruebas unitarias de jefe/remate y 32 verificaciones de integración del remate aprobadas. La integración ejecuta `GameScene.update` de producción y camina con la tecla D hasta entrar en alcance, tanto con Alex como con Lua; verifica que con 6 de 72 puntos de vida no se active desde lejos. Incluye pausa, error, tiempo agotado, limpieza, controles táctiles y finales de ambas rutas. Informe específico y capturas actualizadas: `docs/test-results/quimera-finisher/`.

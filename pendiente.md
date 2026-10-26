# Pendientes — retoques finales

Los sprints 5, 6, 7 y 8 tienen su integración funcional terminada. Los siguientes ajustes de contenido se dejan pendientes para el acabado final del juego.

La ampliación del Sprint 9 también está implementada: salas físicas de 40 × 24 tiles, cámara con seguimiento, pantalla cubierta por el escenario y cuatro variantes de robots. Ver `docs/sprint-9.md` para las verificaciones y los límites de la validación.

Los patrones de ataque del Sprint 9 también están conectados: disparo rojo, ráfaga azul, persecución amarilla y carga con abanico naranja. Se pueden revisar por separado en `/robots.html`; los tiempos, archivos y pruebas están en `docs/sprint-9-ataques.md`. El balance manual sigue pendiente en las validaciones finales.

Los niveles 1–4 ahora presentan exclusivamente rojo, azul, amarillo y naranja, con mapas diseñados para sus patrones. Ver `docs/sprint-9-mapas.md`.

## Jefe del nivel 5 — pendiente de definir

- [ ] Definir concepto, apariencia y recursos del jefe.
- [ ] Definir ataques y reglas del encuentro, compatibles con las reglas de combate que se acuerden.
- [ ] Diseñar su mapa definitivo e integrarlo en la progresión.
- [ ] Sustituir el combate mixto temporal de la «Arena de entrenamiento» cuando se defina ese diseño.

No se implementa la propuesta de comandante ni ventanas de vulnerabilidad. El usuario indicó que los jefes todavía no están definidos; el nivel 5 conserva una sala provisional jugable.

## Diálogos definitivos

- [ ] Sustituir los textos provisionales de las introducciones de Alex y Lua por la narrativa definitiva.
- [ ] Sustituir los textos provisionales de los finales de ambos personajes y revisar el texto de la pantalla de conclusión.
- [ ] Ajustar las expresiones y los tiempos de presentación al texto definitivo.
- [ ] Revisar ortografía, coherencia de cada personaje y lectura en distintos tamaños de pantalla.

Archivos principales: `src/narrative/routes/alex/testSequence.ts`, `src/narrative/routes/lua/testSequence.ts`, `src/narrative/routes/alex/ending.ts`, `src/narrative/routes/lua/ending.ts` y `src/scenes/CompletionScene.ts`.

## Música y efectos de sonido

- [ ] Seleccionar los archivos finales de música para el menú, las introducciones, el combate y los cierres.
- [ ] Incorporar los efectos de sonido definitivos para la interfaz, los disparos, impactos, habilidades y resultados de partida.
- [ ] Registrar el audio narrativo en `src/config/NarrativeConfig.ts` y conectarlo con las secuencias correspondientes.
- [ ] Ajustar volúmenes, bucles y transiciones; comprobar la pausa, la reanudación y la salida de cada escena.
- [ ] Escuchar el resultado completo con los archivos finales y verificar el inicio del audio tras la interacción del usuario en el navegador.

Estos pendientes corresponden al acabado final de contenido; los fondos y las veinte expresiones de los personajes ya están integrados.

## Validaciones finales de publicación

- [ ] Realizar partidas manuales de las cinco habitaciones y diez oleadas con Alex y Lua para ajustar el balance con combate libre.
- [ ] Validar WebGL y otros navegadores/dispositivos; la suite automatizada actual usa Edge/Canvas.
- [ ] Ajustar mediante partidas manuales el recorrido, la distribución y el balance de las salas grandes con las cuatro variantes de robots.

El Sprint 6 ya incluye los cinco niveles, dificultad progresiva, transiciones, puntuación y HUD. Su conclusión es «Niveles de prueba completados»; los guiones de finales narrativos se conservan para el trabajo posterior de contenido.

## Sprint 8 — escenarios visuales

- [x] Integrar los tres tilesets aportados de pisos, paredes y decoración: industrial, laboratorio y sala de control.
- [x] Integrar la puerta del atlas y distinguir los estados bloqueado, disponible y en transición mediante un indicador de color.
- [x] Implementar el renderer de Tilemaps con cuatro capas visuales, selección de tema y limpieza al cambiar de habitación.
- [x] Conservar las colisiones de `RoomLayout` y comprobar paredes, proyectiles y línea de visión.
- [x] Ordenar las ocho láminas adicionales, medir sus recortes e integrar piezas de todas ellas en las cinco habitaciones.
- [ ] Opcional: aportar animaciones específicas de puerta para sustituir la imagen compartida entre estados.

El informe y los resultados del Sprint 8 están en `docs/sprint-8.md`. Las colisiones siguen usando los grupos estáticos existentes; importar física desde Tilemaps sería una ampliación opcional, no un requisito pendiente de este sprint.

El Sprint 7 ya incluye oleadas, encuentros especiales, carga de habilidades mediante diez bajas configurables, puertas funcionales y separación de gráficos y física. El balance actual añade 45 segundos de espera entre usos de la ulti, además de las diez bajas; el tiempo se congela al pausar y se conserva al cambiar de sala. Con las salas grandes del Sprint 9, las diez oleadas contienen 106 robots y permiten obtener 10600 puntos.

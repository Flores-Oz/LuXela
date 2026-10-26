# Pendientes — retoques finales

Los sprints 5, 6 y 7 tienen su integración funcional terminada. Los siguientes ajustes de contenido se dejan pendientes para el acabado final del juego.

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

El Sprint 6 ya incluye los cinco niveles, dificultad progresiva, transiciones, puntuación y HUD. Su conclusión es «Niveles de prueba completados»; los guiones de finales narrativos se conservan para el trabajo posterior de contenido.

## Sprint 8 — escenarios visuales

- [ ] Aportar texturas o tilesets definitivos de pisos y paredes.
- [ ] Aportar el arte y las animaciones de puertas bloqueadas, disponibles y en transición.
- [ ] Implementar el renderer de Tilemaps y asociar las capas visuales y de decoración a las referencias configuradas.
- [ ] Si se importan colisiones desde Tilemaps, adaptarlas al contrato físico de `RoomLayout` y verificar paredes y línea de visión.

El Sprint 7 ya incluye oleadas, encuentros especiales, carga de habilidades mediante diez bajas configurables, puertas funcionales y separación de gráficos y física. No usa cooldown temporal para habilidades. Las diez oleadas contienen 53 robots y permiten obtener 5300 puntos.

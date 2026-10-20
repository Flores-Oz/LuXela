# Pendientes — retoques finales

El Sprint 5 tiene su integración funcional terminada. Los siguientes ajustes de contenido se dejan pendientes para el acabado final del juego.

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

# Pendientes — retoques finales

## Sprint 13 — balance e IA de jefes

- [x] Aumentar un 25 % la detección y el alcance del rojo, conservando velocidad, cadencia y visión.
- [x] Conservar las mecánicas del azul, amarillo y naranja.
- [x] Configurar dos fases en el nivel 5 y tres en el nivel 11, sin aumentar la vida.
- [x] Integrar teletransporte advertido y seguro, IA reactiva y combinaciones sobre el controlador existente.
- [x] Reutilizar efectos y límites de invocación según el encuentro; conservar especiales por bajas y muerte de un impacto.
- [x] Validar lógica, campaña y combate en navegador con ambos personajes: 870 comprobaciones aprobadas tras el ajuste de agresividad.
- [x] Ampliar patrones del primer jefe y añadir al final combos de cuatro etapas de ráfagas, disparos cada 130 ms y desplazamiento más rápido.
- [x] Jefe final con 144 de vida, apertura agresiva y tandas de seis rojos, azules o naranjas desde fase 1; reponer automáticamente al morir todos. Balance actual validado con 210 pruebas de lógica y 255 comprobaciones de campaña/combate.
- [x] Evasión ocasional del final: 35 % ante disparos entrantes, paso lateral físico y 3,5 s entre esquivas exitosas, solo al reposicionarse. Validación actual: 216 pruebas de lógica y 267 comprobaciones de campaña/combate aprobadas; recibe daño normalmente durante la recuperación.
- [x] Rayo final con carga de 650 ms y secuencias de dos rayos en todas las fases y en el combo de presión, cada uno con aviso y apuntado propios. Compilación y 217 pruebas de lógica aprobadas.
- [ ] Ajustar el balance mediante partidas libres prolongadas y validar WebGL/otros navegadores.

El estado vigente de los jefes está en `docs/sprint-13.md`. Sustituye las cantidades de fases de las notas históricas de Sprints 11–12. Los diálogos y epílogos definitivos continúan pendientes.

## Sprint 12 — segunda etapa integrada

- [x] Ampliar a 11 niveles y añadir cinco mapas de combate mixto.
- [x] Permitir continuar después de Quimera en el nivel 5.
- [x] Integrar la introducción y el combate final de cuatro fases, rayo, onda, aprendizaje limitado y refuerzos.
- [x] Organizar los recursos aportados en `assets/tilesets`, `assets/effects` y `assets/bosses`.
- [x] Conservar el QTE y habilitar la victoria provisional solamente después del nivel 11.
- [x] Ajustar proyectiles visibles, dificultad inicial y de niveles 6–9, ampliar a seis refuerzos del jefe y aplicar teletransporte a todas las oleadas.
- [ ] Ajustar el balance con partidas libres y validar otros navegadores/dispositivos y WebGL.
- [ ] Escribir los epílogos definitivos de Alex y Lua en un sprint posterior.

Detalles, recursos, pruebas y capturas: `docs/sprint-12.md`. La campaña actual reemplaza el final definitivo del nivel 5 descrito en las notas históricas inferiores: ese encuentro ahora habilita la segunda etapa.
La restricción del Sprint 12 también sustituye la espera histórica de 45 segundos: las especiales actuales se recargan únicamente con diez bajas nuevas, además de completar su animación y recuperación.

Los sprints 5, 6, 7 y 8 tienen su integración funcional terminada. Los siguientes ajustes de contenido se dejan pendientes para el acabado final del juego.

La ampliación del Sprint 9 también está implementada: salas físicas de 40 × 24 tiles, cámara con seguimiento, pantalla cubierta por el escenario y cuatro variantes de robots. Ver `docs/sprint-9.md` para las verificaciones y los límites de la validación.

Los patrones de ataque del Sprint 9 también están conectados: disparo rojo, ráfaga azul, persecución amarilla y carga con abanico naranja. Se pueden revisar por separado en `/robots.html`; los tiempos, archivos y pruebas están en `docs/sprint-9-ataques.md`. El balance manual sigue pendiente en las validaciones finales.

Los niveles 1–4 ahora presentan exclusivamente rojo, azul, amarillo y naranja, con mapas diseñados para sus patrones. Ver `docs/sprint-9-mapas.md`.

## Jefe del nivel 5 — Sprint 11 implementado

- [x] Integrar E.X.P.-01 Quimera y las 53 poses del recurso aportado.
- [x] Implementar tres fases, cuatro módulos, recuperación, daño configurable y barra de vida exclusiva.
- [x] Integrar el encuentro en la arena del Núcleo energético mediante el gestor actual.
- [x] Habilitar la destrucción y los finales existentes de Alex y Lua tras una victoria válida.
- [ ] Ajustar el balance final mediante partidas libres y comprobar otros navegadores/dispositivos.

El Sprint 11 habilita el nivel 5 con Quimera, sin oleadas mixtas ni enemigos auxiliares. El jefe recibe daño durante el combate y daño adicional al recuperar energía. Su destrucción completa activa la ruta final del personaje; llegar a la arena no otorga victoria. Ver `docs/sprint-11.md`, sus pruebas y capturas.

## Diálogos definitivos

- [ ] Sustituir los textos provisionales de las introducciones de Alex y Lua por la narrativa definitiva.
- [ ] Sustituir los textos provisionales de los finales de ambos personajes y revisar el texto de la pantalla de conclusión. Los finales existentes ya se ejecutan tras Quimera; algunas líneas todavía hacen referencia al antiguo recorrido de dos habitaciones.
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

- [ ] Realizar partidas manuales de los cuatro niveles de robots y sus siete oleadas con Alex y Lua para ajustar el balance con combate libre; revisar también el enfrentamiento con Quimera.
- [ ] Validar WebGL y otros navegadores/dispositivos; la suite automatizada actual usa Edge/Canvas.
- [ ] Ajustar mediante partidas manuales el recorrido, la distribución y el balance de las salas grandes con las cuatro variantes de robots.

El Sprint 6 incluye niveles, dificultad progresiva, transiciones, puntuación y HUD. Desde el Sprint 11 la campaña activa el final individual y la pantalla de conclusión después de destruir a Quimera. Los guiones siguen siendo provisionales y quedan para el trabajo posterior de contenido.

## Sprint 8 — escenarios visuales

- [x] Integrar los tres tilesets aportados de pisos, paredes y decoración: industrial, laboratorio y sala de control.
- [x] Integrar la puerta del atlas y distinguir los estados bloqueado, disponible y en transición mediante un indicador de color.
- [x] Implementar el renderer de Tilemaps con cuatro capas visuales, selección de tema y limpieza al cambiar de habitación.
- [x] Conservar las colisiones de `RoomLayout` y comprobar paredes, proyectiles y línea de visión.
- [x] Ordenar las ocho láminas adicionales, medir sus recortes e integrar piezas de todas ellas en las cinco habitaciones.
- [ ] Opcional: aportar animaciones específicas de puerta para sustituir la imagen compartida entre estados.

El informe y los resultados del Sprint 8 están en `docs/sprint-8.md`. Las colisiones siguen usando los grupos estáticos existentes; importar física desde Tilemaps sería una ampliación opcional, no un requisito pendiente de este sprint.

El Sprint 7 incluye oleadas, encuentros especiales, carga de habilidades mediante diez bajas configurables, puertas funcionales y separación de gráficos y física. El balance conserva 45 segundos entre usos de la ulti, además de las diez bajas; el tiempo se congela al pausar y se conserva al cambiar de sala. Hay siete oleadas en los primeros cuatro niveles: 64 robots y 6400 puntos. Quimera añade 1000 puntos, hasta 7400 por campaña; el quinto nivel no tiene oleadas normales ni recarga especial automática.

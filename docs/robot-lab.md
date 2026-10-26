# Prueba aislada de robots

Abrir `/robots.html` en el servidor de desarrollo o en el build de producción. La página permite elegir rojo, azul, amarillo o naranja; mover a Alex con WASD; activar una pared interior; pausar y reiniciar. Alex recibe impactos sin morir y los contadores muestran disparos e impactos.

El modo de combate reutiliza `Enemy.updateBehavior`, `EnemyAttackController`, `fireEnemyShots`, `LineOfSight`, `Player` y `Projectile` del juego. Usa el alcance de detección de la primera habitación y los tiempos iniciales de cada variante. Los proyectiles se destruyen al impactar, caducar o alcanzar los límites exteriores; el naranja atraviesa la pared interior. Cada selección mantiene un único robot y limpia las balas y la carga de la prueba anterior. No se escribe progreso de campaña ni desbloqueos.

Las opciones de animación A1, A2, B1 y B2 reproducen las secuencias existentes a doble escala, sin lanzar proyectiles. El modo «Patrón de ataque» ejecuta los cuatro comportamientos completos del Sprint 9: disparo individual rojo, ráfaga azul de cinco, persecución amarilla al doble de velocidad base y carga naranja de 1 segundo con abanico de seis proyectiles. La carga usa la secuencia A1 y un aviso circular pulsante; los disparos usan B1. Ver [sprint-9-ataques.md](sprint-9-ataques.md) para tiempos y reglas.

`vite.config.ts` incorpora `robots.html` como segunda entrada. El juego principal conserva su entrada y escenas.

## Verificación

`npm.cmd run build` compila las dos páginas. Con Edge/Chrome dedicado en el puerto CDP 9224 y Vite en 5173, ejecutar `node tests/run-robot-lab.mjs`.

La prueba verifica impactos reales, invulnerabilidad del objetivo, bloqueo de visión del rojo, proyectiles naranjas atravesando la pared, pausa y reanudación (incluyendo una carga naranja pausada durante más de dos segundos), las dieciséis combinaciones de robot/animación, ausencia de robots acumulados, vuelta al combate, WASD mediante eventos nativos, reinicio y presentación estrecha. Resultado: **31 verificaciones, cero errores de consola**, en `docs/test-results/robot-lab.json`.

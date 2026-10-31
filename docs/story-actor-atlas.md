# Atlas narrativo de Kira

`src/narrative/StoryActorConfig.ts` describe recortes no destructivos de
`public/assets/story/alex/characters/kira-spritesheet.png`.

La hoja real mide **948 × 1659 px**, tiene canal alfa y no corresponde a una
cuadrícula uniforme de 128 px. Se inspeccionó la hoja completa y se midieron
las bandas de alfa de cada fila para elegir cuatro poses por animación. El
PNG original no se modifica.

Se registran 48 cuadros: reposo, caminar/correr en cuatro direcciones,
sentarse, dormir y maullar. Las filas de daño y desmayo no se utilizan.
Las variaciones de pose ya existentes en el arte se conservan.

Cada cuadro se dibuja en un canvas de **128 × 128 px**, con suavizado
desactivado y las patas en **y=120**. `anchorX` y `groundY` son coordenadas
absolutas en la hoja de origen:

```ts
const dx = actor.layout.centerX - frame.anchorX + frame.crop.x;
const dy = actor.layout.groundY - frame.groundY + frame.crop.y;
context.drawImage(image, frame.crop.x, frame.crop.y,
    frame.crop.width, frame.crop.height, dx, dy,
    frame.crop.width, frame.crop.height);
```

El margen de dos píxeles de cada recorte conserva el borde. El reposo mantiene
primero la pose neutral y después parpadea; el maullido se reproduce una vez.
El actor debe usarse sobre fondos vacíos. Las ilustraciones que ya contienen
a Kira no deben superponer una segunda mascota.

El perro queda disponible en su PNG original, sin incorporarlo a la ruta de
Lua ni inventar una historia adicional. Este atlas pertenece únicamente a Kira.

Validación: `node --test tests/story-actor-config.test.mjs` comprueba dimensiones
reales del PNG, coordenadas válidas, alineación de patas, límites del canvas
y referencias de todas las animaciones.


# Tilesets de escenarios — recursos integrados

Los once PNG aportados están disponibles. Las cinco habitaciones utilizan ahora recortes de las ocho láminas detalladas. Los tres atlas pequeños de `industrial/tileset.png`, `laboratory/tileset.png` y `control/tileset.png` se conservan como piezas auxiliares y como presentación alternativa de respaldo; cada uno mide **256 × 256 px**, con **4 × 4 celdas de 64 px**.

## Atlas pequeños de respaldo

Sus temas e índices se configuran en `src/world/environment/RoomTheme.ts`, mediante `preparedEnvironmentAtlas`. Los pisos emplean las piezas 0 y 1; las paredes utilizan 4–11; las decoraciones 3 y 12–14; la puerta base es la pieza 15. Los estados de puerta reutilizan esa imagen y añaden un indicador de color independiente. El piso se presenta con opacidad ligeramente inferior para distinguir los muros, sin modificar el PNG.

Las decoraciones 12–14 tienen fondo negro opaco. Una capa separada con mezcla `SCREEN` elimina visualmente ese margen durante la composición. La rejilla (pieza 3) usa mezcla normal. No se altera el canal alfa del archivo original ni se generan obstáculos físicos a partir de decoraciones.

## Láminas detalladas organizadas e integradas

Las ocho láminas de **1254 × 1254 px** están en `sources/`, con nombres legibles por ambiente. `sources/provenance.json` conserva sus nombres anteriores y hashes SHA-256. Se movieron y renombraron, sin modificar su contenido. Las pruebas verifican sus hashes.

| Archivo | Piezas principales |
| --- | --- |
| `sources/industrial-green.png` | Acero gastado, rejillas, consolas verdes y ventilación |
| `sources/assembly-amber.png` | Ensamblaje, señalización ámbar, mecanismos y equipos |
| `sources/reactor-cyan.png` | Paneles cian, laboratorio de energía y conductos |
| `sources/cargo-olive.png` | Depósito, cajas, rejillas y marcas de carga |
| `sources/quarantine-red.png` | Paneles de cuarentena, equipos rojos y puertas |
| `sources/data-blue.png` | Servidores, terminales y circuitos azules y violetas |
| `sources/hangar-amber.png` | Hangar, plataformas, ventilación y luces ámbar |
| `sources/maintenance-teal.png` | Mantenimiento, tuberías, mallas y equipos de ventilación |

`EnvironmentSheets.ts` registra los límites medidos de las dieciséis piezas de cada lámina, sus funciones y el ambiente complementario. `EnvironmentSheetTiles.ts` recorta la región cuadrada central de cada pieza y la presenta a 64 px con NEAREST. No se divide la lámina completa entre cuatro ni se incluyen sus separadores. La extracción ocurre en memoria al crear el atlas, sin escribir PNG derivados.

Cada atlas detallado mide **512 × 512 px**, con 8 × 8 celdas: 0–15 son las piezas del ambiente principal, 16–31 las del complementario, 32–47 las del atlas pequeño del tema y 48–52 versiones rotadas de las paredes. Las celdas 53–56 permiten piezas neutras de mantenimiento cuando están declaradas. Los tres estados de puerta comparten el arte base y conservan su indicador independiente.

Las asignaciones actuales son:

| Habitación | Principal | Complementario |
| --- | --- | --- |
| Sector de cuarentena | quarantine-red | industrial-green, apoyo maintenance-teal |
| Centro de datos | data-blue | maintenance-teal |
| Almacén y mantenimiento | cargo-olive | assembly-amber |
| Hangar industrial | hangar-amber | assembly-amber |
| Núcleo energético, Quimera | reactor-cyan | industrial-green |

Todas las láminas aportan piezas visibles. `sheetFunctions` clasifica pisos, paredes, obstáculos, decoración y piezas temáticas. `EnvironmentComposition.ts` agrupa las celdas sólidas conectadas en bancos de maquinaria; `EnvironmentPlan.ts` les asigna un material coherente y un terminal, con piso secundario en su zona de servicio. Las marcas, rejillas y señales se sitúan junto a esas estructuras; el piso principal permanece limpio y uniforme. La decoración no crea colisiones ni daño.

## Sustituir o añadir recursos

Cada tema define `source`, `textureKey`, `atlas`, `provisional` y una paleta de respaldo. Cada habitación puede añadir `presentation.environmentStyle` con uno de los ocho nombres anteriores. `GameScene.preload` carga las imágenes declaradas. Para una lámina diferente, medir sus regiones y registrar los roles y su combinación en `EnvironmentSheets.ts`; para un atlas regular, adaptar sus dimensiones y tablas de índices. El tamaño visual de cada celda se escala uniformemente al tile físico de 64 px.

Los bits de conexión de pared son norte **1**, este **2**, sur **4** y oeste **8**. Las tablas `walls` y `wallVariants` traducen las dieciséis combinaciones a las piezas disponibles: rectas, esquinas, extremos, paneles y obstáculos aislados. Mantener los muros visualmente sólidos dentro de sus celdas para que coincidan con las colisiones.

## Respaldo provisional

Cuando se solicita explícitamente una lámina detallada, su ausencia o dimensiones incorrectas producen un error con el nombre del recurso; no se sustituye silenciosamente. Todos los ocho PNG detallados están disponibles y conservan sus hashes originales. Para temas genéricos sin lámina detallada sigue disponible el respaldo de `EnvironmentTiles.ts`, bajo una clave `-fallback` cuando hay una imagen original. Usa **256 × 192 px**, ocho columnas y seis filas de 32 px, escalados uniformemente al tile físico.

| Frames | Meaning |
|---|---|
| 0–3 | Four opaque floor variants |
| 4–19 | Wall connections, variant 0: frame = 4 + mask |
| 20–35 | Wall connections, variant 1: frame = 20 + mask |
| 36 | Grate decal |
| 37 | Flat panel/console decal |
| 38 | Warning paint decal |
| 39 | Circuit-line decal |
| 40–42 | Door locked / unlocked / transitioning |
| 43–47 | Reserved, unused |

Las decoraciones permanecen debajo de actores y proyectiles y no crean cuerpos físicos. Cualquier objeto que deba bloquear el paso se registra en la estructura física de la habitación.

Los atlas se comparten en caché, incluidos los detallados ya compuestos. Canvas conserva las capas estáticas en caché: las salas pequeñas usan una imagen por capa y las salas grandes del Sprint 9 se dividen en bloques de hasta 512 × 512 px de atlas. Sus texturas privadas se eliminan al salir. WebGL conserva el renderizado por lotes de Tilemaps. Las cuatro capas son piso, decoración opaca, decoración con mezcla y paredes. Las colisiones siguen en los grupos estáticos Arcade existentes. Sustituir texturas solo cuando no haya escenas utilizándolas, por ejemplo al recargar el juego.

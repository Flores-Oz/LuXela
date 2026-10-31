import type { NarrativeSequence } from "../../NarrativeTypes";

/** The route id remains stable; the new chapter id invalidates checkpoints from the old test script. */
export const alexTest: NarrativeSequence = {
    id: "alex_test", route: "alex", chapterId: "alex-birthday-v1", provisional: false,
    entries: [
        // 01. Llegada a casa.
        { type: "background", key: "alex-intro", transition: "fade" },
        { type: "portrait", character: "alex", expression: "neutral", position: "left" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "¡Kira! Ya llegué. ¿Dónde estás?" },
        { type: "dialogue", speaker: "Narración", text: "Desde la cocina llegan golpes de utensilios y un delicioso olor a vainilla." },
        { type: "portrait", character: "alex", expression: "surprised", position: "left" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "¿Kira? Ese ruido no suena a una siesta..." },

        // 02. Algo en la cocina. Kira is already present in this illustration.
        { type: "hidePortrait", character: "alex" },
        { type: "background", key: "alex-kira-baking", transition: "fade" },
        { type: "dialogue", speaker: "Narración", text: "El horno ilumina la cocina. Sobre un taburete, Kira mezcla la masa con una concentración extraordinaria." },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "¿Qué estás haciendo? ¿Estás... cocinando?" },
        { type: "dialogue", speaker: "Kira", speakerId: "kira", text: "¡Miau!" },

        // 03. Feliz cumpleaños. The empty kitchen supports animated Kira and the cake prop.
        { type: "background", key: "alex-house-kitchen", transition: "fade" },
        { type: "portrait", character: "alex", expression: "surprised", position: "left" },
        { type: "actor", id: "kira", animation: "walk-right", x: 57, y: 52, width: 9, moveTo: { x: 68, y: 52, durationMs: 750 } },
        { type: "prop", id: "cake", key: "birthday-cake", x: 49, y: 50, width: 13 },
        { type: "dialogue", speaker: "Narración", text: "Kira presenta su obra sobre la mesa: un pastel de fresas y tres pequeñas velas encendidas." },
        { type: "actor", id: "kira", animation: "sit", x: 68, y: 52, width: 9 },
        { type: "portrait", character: "alex", expression: "happy", position: "left" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "¡Aaahhh! ¡Te acordaste de mi cumpleaños! No puedo creer que hayas preparado todo esto." },
        { type: "actor", id: "kira", animation: "meow", x: 68, y: 52, width: 9 },
        { type: "dialogue", speaker: "Kira", speakerId: "kira", text: "¡Miaaau!" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Ven aquí, pequeño. Vamos a celebrar como se debe." },

        // 04. Una interrupción. Remove overlays before showing the complete CG.
        { type: "hideActor", id: "kira" },
        { type: "hideProp", id: "cake" },
        { type: "hidePortrait", character: "alex" },
        { type: "background", key: "alex-robot-home-invasion", transition: "fade" },
        { type: "cue", effect: "flash", durationMs: 140 },
        { type: "cue", effect: "shake", durationMs: 420 },
        { type: "dialogue", speaker: "Narración", text: "Las luces parpadean. Un golpe metálico derriba la puerta y varios robots rojos irrumpen en la casa." },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "¡¡¿QUÉ DEMONIOS?!! ¡Esta es mi casa!" },
        { type: "dialogue", speaker: "Robot rojo", text: "OBJETIVOS LOCALIZADOS. INICIANDO EXTRACCIÓN." },

        // 05. El secuestro.
        { type: "background", key: "alex-kira-captured", transition: "fade" },
        { type: "dialogue", speaker: "Narración", text: "Un robot encierra a Kira en una cápsula. Otro protege el pastel bajo una cubierta transparente. Ambos retroceden hacia la puerta." },
        { type: "dialogue", speaker: "Kira", speakerId: "kira", text: "¡MIAU!" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "¡SUELTEN A KIRA! ¡Y DEVUELVAN MI PASTEL!" },
        { type: "dialogue", speaker: "Narración", text: "Alex corre tras ellos, pero los vehículos de la fábrica desaparecen entre las calles oscuras." },

        // 06. La decisión.
        { type: "background", key: "alex-house-damaged", transition: "fade" },
        { type: "portrait", character: "alex", expression: "sad", position: "left" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Kira... Solo querías darme una sorpresa." },
        { type: "portrait", character: "alex", expression: "determined", position: "left" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Te prometo que voy a encontrarte. No voy a dejarte en esa fábrica." },

        // 07. Armamento pesado. Alex is already present in the CG.
        { type: "hidePortrait", character: "alex" },
        { type: "background", key: "alex-arming-up", transition: "fade" },
        { type: "dialogue", speaker: "Narración", text: "El armario de equipo se abre. Alex toma su arma, revisa la munición y prepara el armamento pesado." },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Arma lista. Shoot Vent preparado. Ahora sí tenemos algo de qué hablar." },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Te recuperaré, Kira. Cueste lo que cueste." },

        // 08. La fábrica.
        { type: "background", key: "alex-factory-entrance", transition: "fade" },
        { type: "dialogue", speaker: "Narración", text: "Las luces rojas de la instalación cortan la noche. Al otro lado de la entrada, los robots continúan su patrulla." },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Muy bien... Vengan por mí. Voy a cruzar cada sector hasta encontrarte, Kira." },
        { type: "dialogue", speaker: "Sector de cuarentena", text: "Nivel 1 — Sector rojo. La búsqueda comienza." }
    ]
};

import type { NarrativeSequence } from "../../NarrativeTypes";

/** Played only after the final campaign victory, before the existing completion screen. */
export const alexEnding: NarrativeSequence = {
    id: "alex_ending", route: "alex", chapterId: "alex-birthday-ending-v1", provisional: false,
    entries: [
        // 01. La caída de Quimera.
        { type: "background", key: "alex-factory-exterior", transition: "fade" },
        { type: "portrait", character: "alex", expression: "serious", position: "left" },
        { type: "dialogue", speaker: "Narración", text: "E.X.P.-01 Quimera deja de moverse. Una a una, las alarmas de la fábrica se apagan. Por primera vez, todo queda en silencio." },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Se acabó... Once sectores. Más robots de los que quiero recordar. Pero todavía me falta alguien." },
        { type: "dialogue", speaker: "Kira", speakerId: "kira", text: "...Miau." },
        { type: "portrait", character: "alex", expression: "surprised", position: "left" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "¿Kira? ¡Kira, estoy aquí!" },

        // 02. El reencuentro. Both CGs contain Kira; the second also contains Alex.
        { type: "hidePortrait", character: "alex" },
        { type: "background", key: "alex-kira-containment", transition: "fade" },
        { type: "dialogue", speaker: "Narración", text: "Tras una puerta lateral, Kira espera dentro de una cámara de contención. A su lado, los robots conservan el pastel como si fuera un objeto de investigación." },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "¡Estás bien! Apártate un poquito, pequeño. Voy a abrirla." },
        { type: "background", key: "alex-kira-reunion", transition: "fade" },
        { type: "dialogue", speaker: "Narración", text: "La cámara se abre. Kira corre hacia Alex, que se arrodilla para recibirlo." },
        { type: "dialogue", speaker: "Kira", speakerId: "kira", text: "¡Miaaau!" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Vámonos a casa, pequeño. Ya pasó todo." },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Pero primero... tenemos que recuperar algo. Nadie secuestra mi pastel y se queda con él." },

        // 03. El regreso.
        { type: "background", key: "alex-return-home-dawn", transition: "fade" },
        { type: "dialogue", speaker: "Narración", text: "El amanecer alcanza las calles. Alex vuelve a casa llevando el pastel, mientras Kira camina a su lado." },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Sabes, Kira... Este probablemente ha sido el cumpleaños más extraño de toda mi vida." },
        { type: "dialogue", speaker: "Kira", speakerId: "kira", text: "¡Miau!" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Sí, sí. También el tuyo." },

        // 04. Una casa hecha desastre.
        { type: "background", key: "alex-house-damaged", transition: "fade" },
        { type: "portrait", character: "alex", expression: "sad", position: "left" },
        { type: "actor", id: "kira", animation: "walk-right", x: 57, y: 52, width: 9, moveTo: { x: 68, y: 52, durationMs: 850 } },
        { type: "dialogue", speaker: "Narración", text: "La puerta sigue rota y los muebles permanecen fuera de lugar. El desastre no ha ido a ninguna parte." },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Bueno... Creo que mañana tendremos bastante que limpiar." },
        { type: "actor", id: "kira", animation: "sit", x: 68, y: 52, width: 9 },
        { type: "portrait", character: "alex", expression: "happy", position: "left" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Pero eso puede esperar. Hay algo mucho más importante que hacer." },

        // 05. El cumpleaños que nos debían. CG includes both Alex and Kira.
        { type: "hideActor", id: "kira" },
        { type: "hidePortrait", character: "alex" },
        { type: "background", key: "alex-ending-birthday", transition: "fade" },
        { type: "dialogue", speaker: "Narración", text: "El pastel vuelve al centro de la mesa. Las pequeñas velas se encienden de nuevo y Kira ocupa su taburete favorito." },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Por cierto, Kira... Gracias por acordarte de mi cumpleaños." },
        { type: "dialogue", speaker: "Kira", speakerId: "kira", text: "¡Miaaau!" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Bueno, ahora sí... ¡Vamos a comer pastel!" },

        // 06. Una celebración tranquila.
        { type: "background", key: "alex-ending-celebration", transition: "fade" },
        { type: "dialogue", speaker: "Narración", text: "No hay robots. No hay alarmas. Solo Alex, Kira y dos porciones de pastel al comenzar un nuevo día." },
        { type: "dialogue", speaker: "El cumpleaños recuperado", text: "A veces, lo único que necesitas es volver a casa." }
    ]
};

import type { NarrativeSequence } from "../../NarrativeTypes";
export const alexEnding: NarrativeSequence = {
    id: "alex_ending", route: "alex", chapterId: "arcade-ending", provisional: true,
    entries: [
        { type: "background", key: "alex-ending", transition: "fade" },
        { type: "portrait", character: "alex", expression: "happy", position: "right" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Las dos habitaciones están despejadas. Por ahora, puedo bajar el arma." },
        { type: "portrait", character: "alex", expression: "confident", position: "right" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Recorrido completado. Es hora de tomar un respiro." }
    ]
};

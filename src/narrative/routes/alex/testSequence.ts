import type { NarrativeSequence } from "../../NarrativeTypes";
export const alexTest: NarrativeSequence = {
    id: "alex_test", route: "alex", chapterId: "test", provisional: true,
    entries: [
        { type: "background", key: "alex-intro", transition: "fade" },
        { type: "portrait", character: "alex", expression: "neutral", position: "left" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Arma lista. Un solo impacto basta, así que tengo que seguir moviéndome." },
        { type: "portrait", character: "alex", expression: "determined", position: "right" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Primero despejo la habitación. Después busco la salida. Mi especial puede abrirme el camino." },
        { type: "hidePortrait", character: "alex" }
    ]
};

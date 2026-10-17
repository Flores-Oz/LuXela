import type { NarrativeSequence } from "../../NarrativeTypes";
export const alexTest: NarrativeSequence = {
    id: "alex_test", route: "alex", chapterId: "test", provisional: true,
    entries: [
        { type: "background", key: "alex-test", transition: "fade" },
        { type: "portrait", character: "alex", expression: "neutral", position: "left" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Esta es una prueba del motor narrativo." },
        { type: "portrait", character: "alex", expression: "happy", position: "right" },
        { type: "dialogue", speaker: "Alex", speakerId: "alex", text: "Los sistemas están funcionando correctamente." },
        { type: "hidePortrait", character: "alex" }
    ]
};

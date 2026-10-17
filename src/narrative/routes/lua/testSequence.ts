import type { NarrativeSequence } from "../../NarrativeTypes";
export const luaTest: NarrativeSequence = {
    id: "lua_test", route: "lua", chapterId: "test", provisional: true,
    entries: [
        { type: "background", key: "lua-test", transition: "fade" },
        { type: "portrait", character: "lua", expression: "neutral", position: "right" },
        { type: "dialogue", speaker: "Lua", speakerId: "lua", text: "Iniciando secuencia de prueba." },
        { type: "portrait", character: "lua", expression: "surprised", position: "center" },
        { type: "dialogue", speaker: "Lua", speakerId: "lua", text: "El sistema narrativo está listo." },
        { type: "hidePortrait", character: "lua" }
    ]
};

import type { NarrativeSequence } from "../../NarrativeTypes";
export const luaTest: NarrativeSequence = {
    id: "lua_test", route: "lua", chapterId: "test", provisional: true,
    entries: [
        { type: "background", key: "lua-intro", transition: "fade" },
        { type: "portrait", character: "lua", expression: "neutral", position: "right" },
        { type: "dialogue", speaker: "Lua", speakerId: "lua", text: "La energía está lista. Una descarga puede despejar la habitación, pero yo tampoco puedo recibir un impacto." },
        { type: "portrait", character: "lua", expression: "determined", position: "center" },
        { type: "dialogue", speaker: "Lua", speakerId: "lua", text: "Me mantendré en movimiento. Cuando no queden robots, buscaré la salida." },
        { type: "hidePortrait", character: "lua" }
    ]
};

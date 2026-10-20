import type { NarrativeSequence } from "../../NarrativeTypes";
export const luaEnding: NarrativeSequence = {
    id: "lua_ending", route: "lua", chapterId: "arcade-ending", provisional: true,
    entries: [
        { type: "background", key: "lua-ending", transition: "fade" },
        { type: "portrait", character: "lua", expression: "happy", position: "left" },
        { type: "dialogue", speaker: "Lua", speakerId: "lua", text: "No quedan robots en estas habitaciones. La descarga hizo su trabajo." },
        { type: "portrait", character: "lua", expression: "confident", position: "left" },
        { type: "dialogue", speaker: "Lua", speakerId: "lua", text: "El recorrido termina aquí. Puedo dejar que la energía se calme." }
    ]
};

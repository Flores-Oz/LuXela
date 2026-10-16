import type { PlayerCharacter } from "../config/characters";
import type { DialogueSequence } from "./DialogueManager";

// Draft narrative, not official story. Edit content here without changing scenes.
export const introDialogue: Record<PlayerCharacter, DialogueSequence> = {
    alex: {
        id: "intro-alex-v1",
        provisional: true,
        entries: [
            { speaker: "Transmisión", text: "El acceso está abierto. Al otro lado, los robots patrullan una red de habitaciones. Cada salida es una oportunidad para seguir adelante." },
            { speaker: "Alex", portraitKey: "alex", text: "Mantendré la distancia y buscaré un paso entre sus disparos. Vamos a entrar." },
            { speaker: "Sistema", text: "Muévete con WASD y dispara con las flechas. Un impacto termina la partida. Busca las salidas verdes para cambiar de habitación." }
        ]
    },
    lua: {
        id: "intro-lua-v1",
        provisional: true,
        entries: [
            { speaker: "Transmisión", text: "El acceso está abierto. Al otro lado, los robots patrullan una red de habitaciones. Cada salida es una oportunidad para seguir adelante." },
            { speaker: "Lua", portraitKey: "lua", text: "Seguiré moviéndome. Solo necesito una abertura para avanzar. Estoy lista." },
            { speaker: "Sistema", text: "Muévete con WASD y dispara con las flechas. Un impacto termina la partida. Busca las salidas verdes para cambiar de habitación." }
        ]
    }
};

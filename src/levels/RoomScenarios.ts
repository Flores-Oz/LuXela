import type { RobotType } from "../config/RobotConfig";
import type { RoomTheme } from "../world/environment/RoomTheme";
import type { EnvironmentStyle } from "../world/environment/EnvironmentSheets";
import type { RoomAnchor } from "./RoomPlacement";

interface RoomScenario {
    readonly roomId: string;
    readonly title: string;
    readonly hint: string;
    readonly robots: readonly RobotType[];
    readonly theme: RoomTheme;
    readonly environmentStyle: EnvironmentStyle;
    readonly zones: readonly RoomAnchor[];
    readonly reserved?: boolean;
    readonly boss?: boolean;
}

/** Four combat identities followed by Quimera's reactor arena. */
export const roomScenarios: readonly RoomScenario[] = [
    { roomId: "open-room", title: "Sector de cuarentena", hint: "Robots rojos · Usá las coberturas entre las líneas de tiro.", robots: ["robot-red"],
        theme: "industrial", environmentStyle: "quarantine-red",
        zones: [[.14,.38],[.14,.64],[.14,.86],[.46,.32],[.46,.59],[.46,.86],[.83,.28],[.83,.64],[.83,.86],[.46,.46],[.83,.46],[.14,.5],[.83,.15],[.46,.15]] },
    { roomId: "corridors", title: "Centro de datos", hint: "Robots azules · Cambiá de pasillo para cortar sus ráfagas.", robots: ["robot-blue"],
        theme: "control", environmentStyle: "data-blue",
        zones: [[.28,.44],[.66,.43],[.20,.76],[.66,.76],[.84,.18],[.45,.18],[.86,.90],[.40,.90],[.86,.55],[.12,.55],[.50,.55],[.75,.30],[.45,.72],[.86,.72]] },
    { roomId: "mixed-room", title: "Almacén y mantenimiento", hint: "Robots amarillos · Rodeá los depósitos y evitá quedar acorralado.", robots: ["robot-yellow"],
        theme: "industrial", environmentStyle: "cargo-olive",
        zones: [[.33,.33],[.63,.31],[.28,.72],[.70,.72],[.83,.15],[.83,.52],[.46,.87],[.48,.51],[.88,.88],[.18,.53],[.88,.32],[.13,.90],[.50,.14],[.63,.90]] },
    { roomId: "maze", title: "Hangar industrial", hint: "Robots naranjas · Sus proyectiles atraviesan las divisiones del hangar.", robots: ["robot-orange"],
        theme: "industrial", environmentStyle: "hangar-amber",
        zones: [[.20,.34],[.67,.34],[.37,.65],[.85,.65],[.25,.90],[.67,.90],[.65,.18],[.86,.40],[.16,.70],[.48,.42],[.86,.84],[.50,.77],[.86,.18],[.50,.18]] },
    { roomId: "combat-arena", title: "Núcleo energético", hint: "E.X.P.-01 Quimera · Observá sus señales y aprovechá la recuperación del núcleo.", robots: [],boss:true,
        theme: "laboratory", environmentStyle: "reactor-cyan",
        zones: [[.16,.25],[.38,.22],[.22,.48],[.60,.40],[.40,.66],[.72,.68],[.18,.78],[.78,.23],[.52,.86],[.84,.48],[.46,.46],[.68,.86],[.85,.80],[.18,.92]] }
];

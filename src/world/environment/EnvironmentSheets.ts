import type { EnvironmentAtlas } from "./RoomTheme";

export const environmentStyleIds = ["industrial-green", "assembly-amber", "reactor-cyan", "cargo-olive", "quarantine-red", "data-blue", "hangar-amber", "maintenance-teal"] as const;
export type EnvironmentStyle = typeof environmentStyleIds[number];
type Span = readonly [start: number, end: number];
interface SheetRoles { readonly floor: number; readonly alternate: number; readonly grate: number; readonly warning: number; readonly console: number; readonly obstacle: number; readonly conduit: number; readonly vent: number }
export interface EnvironmentSheet {
    readonly label: string;
    readonly columns: readonly Span[];
    readonly rows: readonly Span[];
    readonly roles: SheetRoles;
    readonly companion: EnvironmentStyle;
}
/** Measured bounds, excluding the irregular gutters of the original 1254px illustrations. */
export const environmentSheets: Readonly<Record<EnvironmentStyle, EnvironmentSheet>> = {
    "industrial-green": { label: "Instalación industrial", columns: [[18,304],[322,617],[636,930],[950,1236]], rows: [[19,306],[323,618],[637,915],[934,1226]],
        roles: {floor:0,alternate:9,grate:2,warning:3,console:10,obstacle:15,conduit:13,vent:14}, companion:"maintenance-teal" },
    "assembly-amber": { label: "Línea de ensamblaje", columns: [[18,301],[326,615],[638,927],[951,1241]], rows: [[16,301],[324,615],[636,919],[942,1230]],
        roles: {floor:0,alternate:9,grate:1,warning:2,console:10,obstacle:11,conduit:13,vent:14}, companion:"cargo-olive" },
    "reactor-cyan": { label: "Laboratorio de energía", columns: [[18,304],[326,616],[638,930],[951,1236]], rows: [[18,303],[323,617],[637,915],[935,1226]],
        roles: {floor:0,alternate:9,grate:1,warning:3,console:10,obstacle:15,conduit:13,vent:14}, companion:"industrial-green" },
    "cargo-olive": { label: "Depósito de carga", columns: [[19,304],[324,616],[637,929],[950,1235]], rows: [[18,303],[323,615],[635,910],[932,1228]],
        roles: {floor:0,alternate:12,grate:9,warning:8,console:10,obstacle:11,conduit:14,vent:2}, companion:"assembly-amber" },
    "quarantine-red": { label: "Sector de cuarentena", columns: [[18,306],[326,616],[637,928],[949,1237]], rows: [[18,301],[321,616],[637,915],[936,1232]],
        roles: {floor:0,alternate:9,grate:9,warning:3,console:10,obstacle:15,conduit:13,vent:14}, companion:"data-blue" },
    "data-blue": { label: "Sala de servidores", columns: [[17,304],[325,615],[636,930],[951,1238]], rows: [[17,302],[323,616],[638,914],[935,1224]],
        roles: {floor:0,alternate:13,grate:3,warning:2,console:10,obstacle:8,conduit:9,vent:14}, companion:"maintenance-teal" },
    "hangar-amber": { label: "Hangar técnico", columns: [[19,309],[329,618],[637,931],[952,1236]], rows: [[19,304],[323,617],[637,917],[936,1229]],
        roles: {floor:0,alternate:9,grate:12,warning:8,console:10,obstacle:11,conduit:13,vent:14}, companion:"quarantine-red" },
    "maintenance-teal": { label: "Sector de mantenimiento", columns: [[19,303],[326,615],[637,929],[951,1236]], rows: [[20,305],[325,615],[638,915],[936,1227]],
        roles: {floor:0,alternate:0,grate:9,warning:1,console:10,obstacle:11,conduit:8,vent:2}, companion:"industrial-green" }
};
export const sheetTextureKey = (style: EnvironmentStyle): string => `environment-source-${style}`;
export function sheetCell(style: EnvironmentStyle, index: number): { x: number; y: number; width: number; height: number } {
    const sheet = environmentSheets[style], column = sheet.columns[index % 4]!, row = sheet.rows[Math.floor(index / 4)]!;
    return { x:column[0], y:row[0], width:column[1]-column[0], height:row[1]-row[0] };
}
/** Primary 0..15, companion 16..31, original small atlas 32..47, wall rotations 48..52. */
export function detailedEnvironmentAtlas(style: EnvironmentStyle): EnvironmentAtlas {
    const sheet = environmentSheets[style], companion = environmentSheets[sheet.companion];
    const walls = [sheet.roles.obstacle,50,5,48,50,50,4,15,5,49,5,15,6,15,15,15];
    return { tileSize:64, columns:8, rows:8,
        floors:[sheet.roles.floor,sheet.roles.floor,sheet.roles.floor,sheet.roles.floor,sheet.roles.floor,16+companion.roles.floor,sheet.roles.floor,sheet.roles.alternate],
        walls, wallVariants:walls.map((frame,index)=>index===0||index===15?16+companion.roles.obstacle:frame),
        decoration:{grate:sheet.roles.grate,panel:16+companion.roles.alternate,warning:sheet.roles.warning,circuit:16+companion.roles.conduit},
        door:{locked:7,unlocked:7,transitioning:7},screenDecorations:[],
        edgeWalls:{north:5,east:52,south:51,west:50},
        wallDetails:[sheet.roles.console,16+companion.roles.console,sheet.roles.vent,16+companion.roles.obstacle],
        floorAlpha:.62
    };
}

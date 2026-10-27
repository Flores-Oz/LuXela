import type {EnvironmentAtlas} from './RoomTheme';
/** Same inspected atlas, with coherent floor/equipment/light banks for each sector. */
const sectors:Record<string,readonly [clean:number,machine:number,support:number,console:number,conduit:number]>={
    convergence:[1,46,45,42,29],
    'industrial-reactor':[2,47,44,40,30],
    'defense-system':[3,42,43,48,28],
    'maximum-security':[0,44,45,51,29],
    'last-defense':[5,47,45,48,28],
    'true-quimera-arena':[1,49,50,55,30]
};
export function advancedIndustrialAtlas(id:string,base:EnvironmentAtlas):EnvironmentAtlas {
    const sector=sectors[id];if(!sector||!base.materials)return base;
    const [clean,machine,supportMachine,console,conduit]=sector;
    return {...base,floors:[clean,0,2],decoration:{...base.decoration,circuit:conduit,panel:conduit},
        materials:{...base.materials,clean,machine,supportMachine,console}};
}

export type PlayerCharacter = "lua" | "alex";

type Crop = readonly [x: number, y: number, width: number, height: number];

// Measured from the original, irregularly packed defeat sheets (8 poses/row).
// Atlas metadata only: images are never resized or rewritten.
export const characters = {
    lua: {
        walkPath: "assets/sprites/player/lua-walk.png",
        defeatPath: "assets/sprites/player/lua-derrota.png",
        defeatFrameRate: 8,
        front: [
            [30,6,156,198], [246,3,160,202], [459,9,159,195], [666,32,157,173],
            [845,60,200,144], [1063,94,218,112], [1308,120,216,89], [1550,122,215,88]
        ] as readonly Crop[],
        side: [
            [30,210,173,198], [246,212,159,196], [454,219,145,186], [666,242,138,157],
            [865,276,193,125], [1078,299,214,108], [1315,321,216,85], [1552,323,212,84]
        ] as readonly Crop[]
    },
    alex: {
        walkPath: "assets/sprites/player/alex-walk.png",
        defeatPath: "assets/sprites/player/alex-derrota.png",
        defeatFrameRate: 8,
        front: [
            [54,43,101,212], [265,63,105,192], [479,85,104,170], [692,117,112,137],
            [857,137,186,119], [1073,174,203,85], [1314,178,210,82], [1557,182,207,79]
        ] as readonly Crop[],
        side: [
            [64,268,113,200], [282,279,101,185], [484,294,102,172], [674,316,118,145],
            [880,353,173,109], [1075,394,209,75], [1311,395,209,76], [1554,399,206,72]
        ] as readonly Crop[]
    }
} as const;

export function defeatAtlas(character: PlayerCharacter): object {
    const frames: Record<string, object> = {};
    for (const pose of ["front", "side"] as const) {
        characters[character][pose].forEach(([x, y, w, h], index) => {
            frames[`${pose}-${index}`] = {
                frame: { x, y, w, h },
                trimmed: true,
                rotated: false,
                sourceSize: { w: 256, h: 256 },
                // Fixed logical canvas and ground line preserve scale/foot position.
                spriteSourceSize: { x: Math.round((256 - w) / 2), y: 220 - h, w, h }
            };
        });
    }
    return { frames };
}

/** Hand-picked frames from the supplied irregular sheet. Source PNGs stay unchanged. */
export interface StoryActorCrop {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface StoryActorFrame {
    crop: StoryActorCrop;
    /** Absolute source coordinates; align these with layout.centerX / layout.groundY. */
    anchorX: number;
    groundY: number;
}
export interface StoryActorAnimation {
    frames: string[];
    frameRate: number;
    repeat: boolean;
}
export interface StoryActorConfig {
    name: string;
    src: string;
    sourceSize: { width: number; height: number };
    layout: { width: number; height: number; centerX: number; groundY: number };
    frames: Record<string, StoryActorFrame>;
    animations: Record<string, StoryActorAnimation>;
}

type Bounds = readonly [x: number, y: number, width: number, height: number];
const frames: Record<string, StoryActorFrame> = {};
const animations: Record<string, StoryActorAnimation> = {};
function register(name: string, bounds: readonly Bounds[], frameRate: number, repeat = true): void {
    const ids = bounds.map(([x, y, width, height], index) => {
        const id = `${name}-${index}`;
        // Two source pixels of transparent padding retain antialiased outline edges.
        frames[id] = {
            crop: { x: x - 2, y: y - 2, width: width + 4, height: height + 4 },
            anchorX: x + width / 2,
            groundY: y + height,
        };
        return id;
    });
    animations[name] = { frames: ids, frameRate, repeat };
}

// Four coherent poses per cycle. Adjacent hurt/faint rows and stray effects are excluded.
register("idle", [[28,43,91,87],[150,42,75,87],[500,43,78,87],[618,43,86,87]], 3);
register("walk-down", [[35,139,62,101],[155,139,63,101],[387,139,62,101],[504,139,61,102]], 6);
register("walk-up", [[35,251,63,103],[154,249,62,105],[388,253,62,102],[504,253,62,101]], 6);
register("walk-left", [[21,370,102,83],[140,372,100,80],[375,375,96,78],[490,373,98,80]], 6);
register("walk-right", [[16,475,104,84],[135,479,102,84],[369,475,97,88],[484,476,102,85]], 6);
register("run-down", [[30,573,81,107],[151,575,68,105],[386,578,64,102],[503,573,66,109]], 10);
register("run-up", [[33,694,66,108],[151,694,66,109],[388,694,66,110],[502,698,65,106]], 10);
register("run-left", [[20,820,104,81],[136,819,104,80],[368,828,103,73],[484,828,105,73]], 10);
register("run-right", [[16,919,111,85],[139,928,102,81],[367,925,103,85],[482,924,108,87]], 10);
register("sit", [[29,1039,79,99],[150,1041,81,97],[386,1041,78,97],[849,1042,77,96]], 2);
register("sleep", [[15,1175,102,60],[133,1175,102,60],[250,1175,102,60],[368,1175,98,60]], 2);
register("meow", [[23,1391,91,94],[144,1393,93,92],[380,1392,73,93],[479,1393,102,92]], 5, false);

// Hold the neutral face, blink, then return to neutral instead of twitching constantly.
animations.idle!.frames = ["idle-0","idle-0","idle-0","idle-0","idle-1","idle-2","idle-3","idle-0"];

export const storyActors: Record<string, StoryActorConfig> = {
    kira: {
        name: "Kira",
        src: "/assets/story/alex/characters/kira-spritesheet.png",
        sourceSize: { width: 948, height: 1659 },
        layout: { width: 128, height: 128, centerX: 64, groundY: 120 },
        frames,
        animations,
    },
};


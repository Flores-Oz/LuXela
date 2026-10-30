/** Enlarge the artwork without enlarging one-hit collision areas. */
export const ProjectileConfig={
    displaySize:{player:16,enemy:16},normalHitRadius:8,
    // Boss-only 128px cells include transparent padding around the energy core.
    energyDisplaySize:128,energyHitRadius:4
} as const;

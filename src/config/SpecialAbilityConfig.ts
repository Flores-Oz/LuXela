// All durations are in milliseconds. Alex's green impacts are visual only.
export const SpecialAbilityConfig = {
    key: "Q",
    cooldownMs: 0, // Sprint 12: only ten validated kills recharge the special.
    alex: { chargeMs: 350, durationMs: 3000, recoveryMs: 250, killsRequired: 10,
        impactMs: 450, impactRadius: 8, backgroundFrameMs: 100 },
    lua: { chargeMs: 650, durationMs: 500, recoveryMs: 200, killsRequired: 10 }
} as const;

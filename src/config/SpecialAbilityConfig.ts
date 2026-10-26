// All durations are in milliseconds. Alex's green impacts are visual only.
export const SpecialAbilityConfig = {
    key: "Q",
    cooldownMs: 45000,
    alex: { chargeMs: 350, durationMs: 3000, recoveryMs: 250, killsRequired: 10,
        impactMs: 450, impactRadius: 8 },
    lua: { chargeMs: 650, durationMs: 500, recoveryMs: 200, killsRequired: 10 }
} as const;

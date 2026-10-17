// All durations are in milliseconds. Alex's green impacts are visual only.
export const SpecialAbilityConfig = {
    key: "Q",
    alex: { chargeMs: 350, durationMs: 3000, recoveryMs: 250, cooldownMs: 8000,
        impactMs: 450, impactRadius: 8 },
    lua: { chargeMs: 650, durationMs: 500, recoveryMs: 200, cooldownMs: 12000 }
} as const;

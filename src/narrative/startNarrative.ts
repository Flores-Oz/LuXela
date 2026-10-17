import type Phaser from "phaser";
import type { NarrativeRequest } from "./NarrativeTypes";

/** Can be called by any active scene, including gameplay, once a stage contract exists. */
export function startNarrative(scene: Phaser.Scene, request: NarrativeRequest): void {
    // Phaser reuses previous scene data if given null/undefined. Send an explicit
    // empty object for malformed JS callers so stale route data cannot be reused.
    const data = request !== null && typeof request === "object" && !Array.isArray(request) ? request : {};
    scene.scene.start("VisualNovelScene", data);
}

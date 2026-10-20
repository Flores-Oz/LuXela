import type Phaser from "phaser";
import type { NarrativeRequest } from "./NarrativeTypes";
import { getArcadeRun } from "../systems/ArcadeRunService";

/** Can be called by any active scene, including gameplay, once a stage contract exists. */
export function startNarrative(scene: Phaser.Scene, request: NarrativeRequest): void {
    // Phaser reuses previous scene data if given null/undefined. Send an explicit
    // empty object for malformed JS callers so stale route data cannot be reused.
    const data: Partial<NarrativeRequest> = request !== null && typeof request === "object" && !Array.isArray(request) ? request : {};
    const runId = "route" in data && scene.sys.settings.key === "GameScene" ? getArcadeRun(scene.game).currentRunId(data.route) : undefined;
    if (runId !== undefined && "route" in data && data.destination?.kind !== "completion") {
        scene.scene.start("VisualNovelScene", data.destination?.kind === "game" ?
            { ...data, destination: { ...data.destination, runId } } :
            { ...data, returnTo: { roomIndex: data.returnTo?.roomIndex ?? 0, runId } });
    } else scene.scene.start("VisualNovelScene", data);
}

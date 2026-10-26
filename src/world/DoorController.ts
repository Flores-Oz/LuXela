import type Phaser from "phaser";

export type DoorState = "locked" | "unlocked" | "transitioning";
export interface DoorView { setState: (state: DoorState) => void }
export interface DoorEntry { id: string; trigger: Phaser.GameObjects.GameObject; view: DoorView }

/** Controls permission and notifies visuals; physics triggers keep their original shape. */
export class DoorController {
    private state: DoorState = "locked";
    private readonly entries: readonly DoorEntry[];
    constructor(entries: readonly DoorEntry[]) { this.entries = entries; this.paint(); }
    get currentState(): DoorState { return this.state; }
    canUse(trigger?: Phaser.GameObjects.GameObject): boolean {
        return this.state === "unlocked" && this.entries.some(entry => !trigger || entry.trigger === trigger);
    }
    unlock(): void { if (this.state === "locked") { this.state = "unlocked"; this.paint(); } }
    beginTransition(trigger?: Phaser.GameObjects.GameObject): boolean {
        if (!this.canUse(trigger)) return false;
        this.state = "transitioning"; this.paint(); return true;
    }
    private paint(): void { for (const entry of this.entries) entry.view.setState(this.state); }
}

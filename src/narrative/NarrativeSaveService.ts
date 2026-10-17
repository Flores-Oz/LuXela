import type Phaser from "phaser";
import { NarrativeConfig } from "../config/NarrativeConfig";
import { NarrativeRouteManager } from "./NarrativeRouteManager";
import type { NarrativeRouteId, NarrativeProgress } from "./NarrativeTypes";

type Store = Pick<Storage, "getItem" | "setItem">;
export class NarrativeSaveService {
    private readonly routes: NarrativeRouteManager;
    private readonly storage: () => Store;
    private progress: Partial<Record<NarrativeRouteId, NarrativeProgress>> = {};
    storageStatus: "available" | "corrupt" | "unavailable" = "available";
    constructor(routes = new NarrativeRouteManager(), storage: () => Store = () => window.localStorage) {
        this.routes = routes;
        this.storage = storage;
        try {
            const saved = storage().getItem(NarrativeConfig.storageKey);
            if (saved === null) return;
            const parsed = JSON.parse(saved);
            if (!parsed || parsed.version !== 1 || !parsed.routes || typeof parsed.routes !== "object" || Array.isArray(parsed.routes)) {
                this.storageStatus = "corrupt"; return;
            }
            for (const route of ["alex", "lua"] as const) {
                const value = parsed.routes[route];
                if (value === undefined || value === null) continue;
                if (routes.validProgress(route, value)) this.progress[route] = { ...value };
                else this.storageStatus = "corrupt";
            }
        } catch (error) { this.storageStatus = error instanceof SyntaxError ? "corrupt" : "unavailable"; }
    }
    get(route: NarrativeRouteId): NarrativeProgress | null {
        const value = this.progress[route];
        return value ? { ...value } : null;
    }
    save(route: NarrativeRouteId, progress: NarrativeProgress): boolean {
        if (!this.routes.validProgress(route, progress)) return false;
        this.progress[route] = { ...progress };
        try {
            this.storage().setItem(NarrativeConfig.storageKey, JSON.stringify({ version: 1, routes: this.progress }));
            this.storageStatus = "available";
        } catch { this.storageStatus = "unavailable"; }
        return true;
    }
}
export function getNarrativeSaves(game: Phaser.Game): NarrativeSaveService {
    let service = game.registry.get("narrative-save-service") as NarrativeSaveService | undefined;
    if (!service) { service = new NarrativeSaveService(); game.registry.set("narrative-save-service", service); }
    return service;
}

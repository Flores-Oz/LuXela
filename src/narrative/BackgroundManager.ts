import { narrativeBackgrounds, NarrativeConfig, type BackgroundAsset } from "../config/NarrativeConfig";
import { loadIllustration } from "./VisualAssetCache";

export class BackgroundManager {
    private readonly canvas = document.createElement("canvas");
    private generation = 0;
    private image: HTMLImageElement | null = null;
    private animation: Animation | null = null;
    currentKey: string | null = null;
    private readonly report: (message: string) => void;
    private readonly assets: Record<string, BackgroundAsset>;
    constructor(host: HTMLElement, report: (message: string) => void,
        assets: Record<string, BackgroundAsset> = narrativeBackgrounds) {
        this.report = report; this.assets = assets;
        host.append(this.canvas);
        this.canvas.setAttribute("aria-label", "Fondo narrativo");
    }
    show(key: string, fade = false): void {
        const token = ++this.generation;
        const hadImage = this.canvas.dataset.key !== undefined;
        this.detachImage();
        this.animation?.cancel();
        this.currentKey = key;
        const asset = Object.hasOwn(this.assets, key) ? this.assets[key] : undefined;
        const context = this.canvas.getContext("2d");
        // Keep the previous illustration visible while the next one decodes.
        // On first load (or a missing asset) retain a safe neutral fallback.
        if (!hadImage || !asset) {
            this.canvas.width = this.canvas.height = 512;
            if (context) { context.fillStyle = "#101c1a"; context.fillRect(0, 0, 512, 512); }
        }
        if (!asset) { this.report(`Fondo no disponible: ${key}. Se usa un fondo neutro.`); return; }
        void loadIllustration(asset.src).then(image => {
            if (token !== this.generation) return;
            this.image = image;
            const crop = asset.crop ?? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
            if (![crop.x, crop.y, crop.width, crop.height].every(Number.isFinite) ||
                crop.width <= 0 || crop.height <= 0 || crop.x < 0 || crop.y < 0 ||
                crop.x + crop.width > image.naturalWidth || crop.y + crop.height > image.naturalHeight) {
                this.report(`Recorte inválido para fondo: ${key}.`); return;
            }
            this.canvas.width = crop.width; this.canvas.height = crop.height;
            const target = this.canvas.getContext("2d");
            if (target) { target.imageSmoothingEnabled = false; target.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height); }
            this.canvas.dataset.key = key;
            if (fade) this.animation = this.canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: NarrativeConfig.transitionMs });
        }).catch(() => { if (token === this.generation) this.report(`No se pudo cargar el fondo: ${key}.`); });
    }
    private detachImage(): void { if (this.image) this.image = null; }
    destroy(): void { this.generation++; this.detachImage(); this.animation?.cancel(); this.canvas.remove(); }
}

import { portraitLayout, type PortraitSource } from "../config/NarrativeConfig";
import { loadIllustration } from "./VisualAssetCache";

/** Crop and align in memory, at source pixel scale. Never rewrite the source sheets. */
const frames = new Map<string, Promise<string>>();
export function loadPortraitFrame(source: PortraitSource): Promise<string> {
    if (typeof source === "string") return Promise.resolve(source);
    const key = JSON.stringify(source);
    const cached = frames.get(key);
    if (cached) return cached;
    const frame = loadIllustration(source.src).then(image => {
        const { x, y, width, height } = source.crop;
        const dx = portraitLayout.centerX - source.anchorX + x;
        const dy = portraitLayout.groundY - source.groundY + y;
        if (![x, y, width, height, source.anchorX, source.groundY].every(Number.isFinite) ||
            x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > image.naturalWidth || y + height > image.naturalHeight ||
            dx < 0 || dy < 0 || dx + width > portraitLayout.width || dy + height > portraitLayout.height) {
            throw new Error(`Recorte de retrato inválido: ${source.src}`);
        }
        const canvas = document.createElement("canvas");
        canvas.width = portraitLayout.width; canvas.height = portraitLayout.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("No se puede dibujar el retrato.");
        context.imageSmoothingEnabled = false;
        context.drawImage(image, x, y, width, height, dx, dy, width, height);
        for (const region of source.omit ?? []) {
            if (![region.x, region.y, region.width, region.height].every(Number.isFinite) || region.width <= 0 || region.height <= 0 ||
                region.x < x || region.y < y || region.x + region.width > x + width || region.y + region.height > y + height) {
                throw new Error(`Máscara de retrato inválida: ${source.src}`);
            }
            context.clearRect(dx + region.x - x, dy + region.y - y, region.width, region.height);
        }
        return canvas.toDataURL("image/png");
    }).catch(error => { frames.delete(key); throw error; });
    frames.set(key, frame);
    return frame;
}

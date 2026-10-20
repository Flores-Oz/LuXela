/** Share decoded originals across narrative/menu backgrounds. Failed loads remain retryable. */
const illustrations = new Map<string, Promise<HTMLImageElement>>();
export function loadIllustration(src: string): Promise<HTMLImageElement> {
    const existing = illustrations.get(src);
    if (existing) return existing;
    const pending = new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => { image.onload = null; image.onerror = null; resolve(image); };
        image.onerror = () => { image.onload = null; image.onerror = null; illustrations.delete(src); reject(new Error(`Imagen no disponible: ${src}`)); };
        image.src = src;
    });
    illustrations.set(src, pending);
    return pending;
}

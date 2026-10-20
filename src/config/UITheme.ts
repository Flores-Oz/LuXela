/** Shared palette for DOM presentation and Phaser labels. */
export const UITheme = {
    background: "#0b1012", text: "#f2f0e9", muted: "#b4c0bc",
    accent: "#b4dfbd", secondary: "#88c8bf", border: "#ffffff30",
    overlay: "#080d10cc", font: '"Segoe UI", Arial, sans-serif', transitionMs: 200
} as const;

export function applyUITheme(element: HTMLElement): void {
    for (const [key, value] of Object.entries(UITheme)) element.style.setProperty(`--ui-${key}`, String(value));
}

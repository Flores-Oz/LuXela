/** Shared palette for DOM presentation and Phaser labels. */
export const UITheme = {
    background: "#0b141e", text: "#eaf3fa", muted: "#b0c7d9",
    accent: "#8dcfff", secondary: "#82b8dc", border: "#8dcfff50",
    overlay: "#08121dcc", font: '"Segoe UI", Arial, sans-serif', transitionMs: 200
} as const;

export function applyUITheme(element: HTMLElement): void {
    for (const [key, value] of Object.entries(UITheme)) element.style.setProperty(`--ui-${key}`, String(value));
}

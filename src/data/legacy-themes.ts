// The original GRATEAPEX app's 15 themes — copied VERBATIM from
// old-reference/src/theme.tsx (definitions, and colorsOf, its derived colours).
// Preserved exactly: colours, contrast, unlock levels and achievement locks are
// unchanged. NOT wired into Appearance yet — which themes join and how they
// unlock is the owner's decision (docs/experiences-architecture.md). A test
// (tests/legacy-themes.test.mjs) fails if any value drifts from the original.

export type LegacyThemeDef = {
  id: string; icon: string; name: string; desc: string; unlock: number;
  bg1: string; bg2: string; bg3: string; ink: string; silver: string; dim: string;
  panel: string; panelBrd: string; accent: string; gold: string; light: boolean;
  gradient?: string[]; // optional custom background gradient (rainbow)
  ach?: string;        // achievement id that must be earned to unlock this theme (see achievements.ts)
  adminOnly?: boolean; // only shown to (and usable by) admins
};

export const LEGACY_THEMES: readonly LegacyThemeDef[] = [
  {
    id: "dark", icon: "🌙", name: "Dark", desc: "The classic look.", unlock: 0, light: false,
    bg1: "#2553ff", bg2: "#0a1fa0", bg3: "#000266", ink: "#ffffff", silver: "#c7cefa", dim: "#93a4e8",
    panel: "rgba(255,255,255,0.06)", panelBrd: "rgba(255,255,255,0.12)", accent: "#8fb3ff", gold: "#ffd34d"
  },
  {
    id: "light", icon: "☀️", name: "Light", desc: "Bright and clean.", unlock: 0, light: true,
    bg1: "#e8eeff", bg2: "#dbe6ff", bg3: "#eef2ff", ink: "#0e1633", silver: "#3a4780", dim: "#6a76ad",
    panel: "rgba(10,31,160,0.05)", panelBrd: "rgba(10,31,160,0.14)", accent: "#1d4ed8", gold: "#c98a00"
  },
  {
    id: "pink", icon: "🌸", name: "Pink", desc: "Soft pink accents.", unlock: 0, light: true,
    bg1: "#ffe3f3", bg2: "#ffc2e6", bg3: "#ff9bd6", ink: "#4a0f36", silver: "#8a3a68", dim: "#b5679b",
    panel: "rgba(255,20,147,0.06)", panelBrd: "rgba(255,20,147,0.18)", accent: "#ff2d92", gold: "#e0218a"
  },
  {
    id: "charcoal", icon: "⚫", name: "Charcoal", desc: "Sleek matte grey and black.", unlock: 0, light: false,
    bg1: "#3a3a3d", bg2: "#232326", bg3: "#131315", ink: "#f2f2f2", silver: "#b7b7bc", dim: "#86868c",
    panel: "rgba(255,255,255,0.05)", panelBrd: "rgba(255,255,255,0.12)", accent: "#9a9aa4", gold: "#d8b45a"
  },
  {
    id: "blackout", icon: "🕶️", name: "Blackout", desc: "Pure black. Easy on the eyes and OLED screens.", unlock: 0, light: false,
    bg1: "#000000", bg2: "#000000", bg3: "#000000", ink: "#f5f5f5", silver: "#b5b5b5", dim: "#7d7d7d",
    panel: "rgba(255,255,255,0.06)", panelBrd: "rgba(255,255,255,0.14)", accent: "#6ea8ff", gold: "#ffd34d"
  },
  {
    id: "matcha", icon: "🍵", name: "Matcha", desc: "Calm green tones.", unlock: 5, light: true,
    bg1: "#c8e6a0", bg2: "#8fbc5a", bg3: "#5c7a3a", ink: "#2b3a1a", silver: "#4a5c30", dim: "#6b7d4a",
    panel: "rgba(74,92,48,0.08)", panelBrd: "rgba(74,92,48,0.22)", accent: "#6b8e3d", gold: "#a97a2f"
  },
  {
    id: "gold", icon: "🏆", name: "Gold", desc: "Rich gold and black luxury.", unlock: 8, light: false,
    bg1: "#2b2308", bg2: "#1a1504", bg3: "#0d0a02", ink: "#fff6df", silver: "#d8b968", dim: "#a4893f",
    panel: "rgba(255,211,77,0.07)", panelBrd: "rgba(255,211,77,0.28)", accent: "#ffd34d", gold: "#ffd34d"
  },
  {
    id: "cyberpunk", icon: "🤖", name: "Cyberpunk", desc: "Neon grid, night city.", unlock: 10, light: false,
    bg1: "#170a2e", bg2: "#2a0f52", bg3: "#1a0533", ink: "#ecfeff", silver: "#c9a6ff", dim: "#9a86c9",
    panel: "rgba(255,0,200,0.07)", panelBrd: "rgba(0,255,242,0.28)", accent: "#ff2bd6", gold: "#00fff2"
  },
  {
    id: "desert", icon: "🏜️", name: "Desert Dune", desc: "Warm sand and sun.", unlock: 12, light: true,
    bg1: "#f4dba0", bg2: "#e8b872", bg3: "#d99a5b", ink: "#4a2c12", silver: "#7a4f26", dim: "#9c7248",
    panel: "rgba(120,72,20,0.06)", panelBrd: "rgba(120,72,20,0.2)", accent: "#c1440e", gold: "#d98324"
  },
  {
    id: "retro", icon: "👾", name: "8-Bit Retro", desc: "Pixel arcade vibes.", unlock: 15, light: false,
    bg1: "#0f0f1b", bg2: "#1e1e3f", bg3: "#2d2d5f", ink: "#f8f8f8", silver: "#ff6b9d", dim: "#9a9ad4",
    panel: "rgba(255,255,255,0.05)", panelBrd: "rgba(57,255,20,0.3)", accent: "#39ff14", gold: "#ffd700"
  },
  {
    id: "lavender", icon: "💜", name: "Lavender Haze", desc: "Soft dreamy purple.", unlock: 18, light: true,
    bg1: "#e8e0fc", bg2: "#d4c5f9", bg3: "#c3aef5", ink: "#3a2a5c", silver: "#6b5490", dim: "#8f7aad",
    panel: "rgba(90,60,150,0.05)", panelBrd: "rgba(90,60,150,0.18)", accent: "#9b7ede", gold: "#b48cd9"
  },
  {
    id: "rainbow", icon: "🌈", name: "Rainbow", desc: "Full colour party mode.", unlock: 20, light: false,
    bg1: "#ff5f6d", bg2: "#7873f5", bg3: "#4facfe", ink: "#ffffff", silver: "#f3ecff", dim: "#e2d6ff",
    panel: "rgba(30,10,70,0.30)", panelBrd: "rgba(255,255,255,0.38)", accent: "#ffe066", gold: "#ffe066",
    gradient: ["#ff5f6d", "#ffc371", "#f9f871", "#7afcc6", "#4facfe", "#a06cff"]
  },
  // --- Achievement themes: unlocked by earning the matching achievement (ignores level) ---
  {
    id: "christmas", icon: "🎄", name: "Christmas", desc: "Pine green, holly red and a little gold.", unlock: 0, light: false, ach: "xmas",
    bg1: "#14633d", bg2: "#0c4529", bg3: "#06281a", ink: "#fff8ee", silver: "#cfe9d6", dim: "#8fc2a0",
    panel: "rgba(255,255,255,0.07)", panelBrd: "rgba(255,214,120,0.32)", accent: "#e63946", gold: "#ffd34d"
  },
  {
    id: "valentine", icon: "💘", name: "Valentine", desc: "Deep rose and candy-heart pink.", unlock: 0, light: false, ach: "val",
    bg1: "#9a1a45", bg2: "#661032", bg3: "#38061c", ink: "#fff0f5", silver: "#ffc4d8", dim: "#d98ba7",
    panel: "rgba(255,255,255,0.07)", panelBrd: "rgba(255,150,185,0.34)", accent: "#ff5c8f", gold: "#ffb3cb"
  },
  // --- Admin-only ---
  {
    id: "brat", icon: "💚", name: "brat", desc: "Lime green. Black text. That's it. (Admins only)", unlock: 0, light: true, adminOnly: true,
    bg1: "#8ace00", bg2: "#8ace00", bg3: "#8ace00", ink: "#000000", silver: "#1a1a1a", dim: "#3f5c00",
    panel: "rgba(0,0,0,0.07)", panelBrd: "rgba(0,0,0,0.38)", accent: "#000000", gold: "#111111"
  },
];

export type LegacyColors = {
  bg: string; card: string; border: string; text: string; muted: string; silver: string;
  primary: string; onPrimary: string; accent: string; danger: string;
  ok: string; okBg: string; badBg: string; light: boolean; gradient: string[]; id: string;
};

const bright = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
};

export function legacyColorsOf(t: LegacyThemeDef): LegacyColors {
  return {
    id: t.id, light: t.light,
    bg: t.bg3, card: t.panel, border: t.panelBrd, text: t.ink, muted: t.dim, silver: t.silver,
    primary: t.accent, onPrimary: bright(t.accent) ? "#04123a" : "#ffffff", accent: t.gold,
    danger: t.light ? "#dc2626" : "#ff7b7b",
    ok: t.light ? "#15803d" : "#4ade80",
    okBg: t.light ? "rgba(21,128,61,0.14)" : "rgba(74,222,128,0.16)",
    badBg: t.light ? "rgba(220,38,38,0.12)" : "rgba(255,123,123,0.16)",
    gradient: t.gradient ?? [t.bg1, t.bg2, t.bg3],
  };
}

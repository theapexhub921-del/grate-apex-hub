// Two themes added in this app (2026-10-10), in the original themes' format
// so every experience can draw them the way it draws the legacy themes.
// They unlock late (Level 22 and 25) and fill the theme grid's last row.
import type { LegacyThemeDef } from '@/data/legacy-themes';

export const EXTRA_THEMES: readonly LegacyThemeDef[] = [
  {
    id: 'parchment', icon: '📜', name: 'Parchment', desc: 'Warm paper and ink, made for long reading.', unlock: 22, light: true,
    bg1: '#fdf7e8', bg2: '#f6ead0', bg3: '#f3e6c6', ink: '#33240f', silver: '#584529', dim: '#6f5a3b',
    panel: 'rgba(120,80,30,0.06)', panelBrd: 'rgba(120,80,30,0.2)', accent: '#9a4f1c', gold: '#8a5a08',
  },
  {
    id: 'aurora', icon: '🌌', name: 'Aurora', desc: 'Northern lights over a night sky.', unlock: 25, light: false,
    bg1: '#0f4c4a', bg2: '#1b2a6b', bg3: '#070b1f', ink: '#eef6ff', silver: '#c2dcea', dim: '#93b2c6',
    panel: 'rgba(120,255,214,0.06)', panelBrd: 'rgba(120,255,214,0.2)', accent: '#5ff2c4', gold: '#cfa8ff',
    gradient: ['#0f4c4a', '#16376a', '#2a1650', '#070b1f'],
  },
];

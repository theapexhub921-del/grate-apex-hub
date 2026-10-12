// The atmosphere palettes for this app's themes (pure data, also used by tests).
import type { ColorSchemeName } from '@/constants/theme';

export type Tint = readonly [color: string, opacity: number];

export type AtmospherePalette = {
  base: string;
  fieldA: Tint; // light from the top-left
  fieldB: Tint; // side field (right)
  fieldC: Tint; // depth at the bottom
  auroraA: Tint;
  auroraB: Tint;
  auroraC: Tint; // the gold one
  grid: Tint;
  ray: Tint;
  gold: Tint; // localized glow behind the hero area
  vignette: Tint;
  grain: number; // opacity of the noise layer
  grainBlend: 'overlay' | 'multiply' | 'soft-light';
};

export const ATMOSPHERE: Record<ColorSchemeName, AtmospherePalette> = {
  apex: {
    base: '#132A9B',
    fieldA: ['#4B83FF', 0.52],
    fieldB: ['#080F63', 0.9],
    fieldC: ['#070E4F', 0.88],
    auroraA: ['#648EFF', 0.28],
    auroraB: ['#6179E6', 0.14],
    auroraC: ['#FDC00A', 0.12],
    grid: ['#D4E0FF', 0.035],
    ray: ['#CAD8FF', 0.055],
    gold: ['#FDC00A', 0.16],
    vignette: ['#03083F', 0.32],
    grain: 0.1,
    grainBlend: 'overlay',
  },
  light: {
    base: '#F6F6F2',
    fieldA: ['#1677F2', 0.1],
    fieldB: ['#7EB2FF', 0.11],
    fieldC: ['#E0E8F8', 0.8],
    auroraA: ['#1677F2', 0.11],
    auroraB: ['#91BCFF', 0.16],
    auroraC: ['#FDC00A', 0.09],
    grid: ['#122864', 0.045],
    ray: ['#1677F2', 0.055],
    gold: ['#FDC00A', 0.1],
    vignette: ['#1A2E6E', 0.07],
    grain: 0.05,
    grainBlend: 'multiply',
  },
  dark: {
    base: '#0B0D12',
    fieldA: ['#3678E7', 0.2],
    fieldB: ['#25458C', 0.24],
    fieldC: ['#05060A', 0.9],
    auroraA: ['#5A97FF', 0.19],
    auroraB: ['#5B83EA', 0.12],
    auroraC: ['#FDC00A', 0.05],
    grid: ['#FFFFFF', 0.03],
    ray: ['#9DB6FF', 0.045],
    gold: ['#FDC00A', 0.06],
    vignette: ['#000000', 0.5],
    grain: 0.07,
    grainBlend: 'overlay',
  },
  violet: {
    base: '#160F21', fieldA: ['#8A61CC', 0.22], fieldB: ['#392153', 0.52], fieldC: ['#090610', 0.88],
    auroraA: ['#B794FF', 0.2], auroraB: ['#8A61CC', 0.14], auroraC: ['#D9B8FF', 0.07], grid: ['#E0C8FF', 0.03], ray: ['#D4BEFF', 0.04], gold: ['#D9B8FF', 0.07], vignette: ['#08040E', 0.5], grain: 0.07, grainBlend: 'overlay',
  },
  black: {
    base: '#000000', fieldA: ['#FFFFFF', 0.045], fieldB: ['#8A8A91', 0.06], fieldC: ['#000000', 0.96],
    auroraA: ['#FFFFFF', 0.035], auroraB: ['#D4D4D8', 0.025], auroraC: ['#FFFFFF', 0.02], grid: ['#FFFFFF', 0.025], ray: ['#FFFFFF', 0.02], gold: ['#FFFFFF', 0.025], vignette: ['#000000', 0.7], grain: 0.055, grainBlend: 'overlay',
  },
  pink: {
    base: '#211019', fieldA: ['#FF8FBC', 0.2], fieldB: ['#73344F', 0.45], fieldC: ['#10070C', 0.88],
    auroraA: ['#FF8FBC', 0.18], auroraB: ['#A94B74', 0.13], auroraC: ['#FFC1D7', 0.07], grid: ['#FFD0E0', 0.03], ray: ['#FFD0E0', 0.04], gold: ['#FFC1D7', 0.07], vignette: ['#0C0308', 0.5], grain: 0.07, grainBlend: 'overlay',
  },
  emerald: {
    base: '#0D1915', fieldA: ['#2B986E', 0.3], fieldB: ['#174A37', 0.52], fieldC: ['#050B08', 0.9],
    auroraA: ['#52D6A2', 0.2], auroraB: ['#338A68', 0.14], auroraC: ['#8AE8C2', 0.07], grid: ['#A2F0D0', 0.03], ray: ['#7CE2B8', 0.04], gold: ['#8AE8C2', 0.07], vignette: ['#020A07', 0.52], grain: 0.07, grainBlend: 'overlay',
  },};

// How strongly each layer shows, per mood (0–1 multipliers).
export type MoodLevels = {
  fields: number;
  aurora: number;
  rays: number;
  grid: number;
  gold: number;
  grain: number;
  vignette: number;
  animate: boolean;
};

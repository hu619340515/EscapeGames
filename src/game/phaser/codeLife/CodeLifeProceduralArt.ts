import type { ChapterId } from "../../types";

export type CodeLifePaletteVariant = "stable" | "starving" | "damaged" | "overfed" | "boss";
export type CodeLifeOverlayType =
  | "scanlines"
  | "crt-vignette"
  | "window-ghosts"
  | "packet-rain"
  | "permission-grid"
  | "hardware-traces"
  | "trash-static";
export type CodeLifeBlendMode = "NORMAL" | "ADD" | "MULTIPLY" | "SCREEN";
export type CodeLifeMood = "desktop-horror" | "recycle-flesh" | "network-core" | "drive-system" | "hardware-body";

export interface CodeLifeColorPalette {
  readonly core: number;
  readonly membrane: number;
  readonly tendon: number;
  readonly node: number;
  readonly highlight: number;
  readonly shadow: number;
  readonly damage: number;
  readonly devour: number;
  readonly scan: number;
  readonly permission: number;
  readonly bossWeakPoint: number;
  readonly uiAccent: number;
}

export interface CodeLifeOverlayLayer {
  readonly id: string;
  readonly type: CodeLifeOverlayType;
  readonly color: number;
  readonly alpha: number;
  readonly density: number;
  readonly scale: number;
  readonly speedX: number;
  readonly speedY: number;
  readonly parallax: number;
  readonly blendMode: CodeLifeBlendMode;
}

export interface CodeLifeOverlayRenderLayer extends CodeLifeOverlayLayer {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly tileWidth: number;
  readonly tileHeight: number;
}

export interface CodeLifeOverlayRenderPlan {
  readonly width: number;
  readonly height: number;
  readonly layers: readonly CodeLifeOverlayRenderLayer[];
}

export interface CodeLifeGlyphParticleStyle {
  readonly glyphs: readonly string[];
  readonly color: number;
  readonly glowColor: number;
  readonly fontFamily: string;
  readonly minSizePx: number;
  readonly maxSizePx: number;
  readonly lifetimeMs: number;
  readonly spawnRatePerSecond: number;
  readonly driftX: number;
  readonly driftY: number;
  readonly jitter: number;
  readonly alpha: number;
  readonly blendMode: CodeLifeBlendMode;
}

export interface CodeLifeGlyphParticle {
  readonly glyph: string;
  readonly x: number;
  readonly y: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly sizePx: number;
  readonly color: number;
  readonly alpha: number;
  readonly lifetimeMs: number;
}

export interface CodeLifeBodyArtRecipe {
  readonly palette: CodeLifeColorPalette;
  readonly coreRadiusPx: number;
  readonly membraneAlpha: number;
  readonly tendrilCount: number;
  readonly tendrilSegmentCount: number;
  readonly tendrilThicknessPx: number;
  readonly nodeCount: number;
  readonly edgeNoise: number;
  readonly pulseHz: number;
  readonly glyphDensity: number;
  readonly weakPointGlow: number;
}

export interface CodeLifeBodyRecipeInput {
  readonly chapterId: ChapterId;
  readonly massRatio?: number;
  readonly integrityRatio?: number;
  readonly abilityCount?: number;
  readonly bossPressure?: number;
  readonly variant?: CodeLifePaletteVariant;
}

export interface CodeLifeChapterAtmosphere {
  readonly chapterId: ChapterId;
  readonly mood: CodeLifeMood;
  readonly palette: CodeLifeColorPalette;
  readonly backgroundColor: number;
  readonly fogColor: number;
  readonly ambientAlpha: number;
  readonly corruption: number;
  readonly pulseHz: number;
  readonly overlayLayers: readonly CodeLifeOverlayLayer[];
  readonly glyphParticles: CodeLifeGlyphParticleStyle;
}

const DESKTOP_GLYPHS = ["0", "1", "_", ">", "ERR", "DEL", "TMP", "C:", "D:", "null", "exe"] as const;
const RECYCLE_GLYPHS = ["0", "1", "DEL", "TRASH", "tmp", "zip", "frag", "rm", "void", "{}"] as const;
const NETWORK_GLYPHS = ["0", "1", "IP", "LAN", "TCP", "UDP", "192", "::", "NAT", "PING", "/"] as const;
const DRIVE_GLYPHS = ["C:", "D:", "sys", "dll", "lock", "uac", "proc", "idx", "acl", "0x"] as const;
const HARDWARE_GLYPHS = ["GPIO", "CLK", "VCC", "GND", "PWM", "IRQ", "RX", "TX", "0x", "boot"] as const;

export const CODE_LIFE_STABLE_PALETTE: CodeLifeColorPalette = {
  core: 0x8f0f24,
  membrane: 0xd92546,
  tendon: 0xff4e6a,
  node: 0x2ef2d0,
  highlight: 0xffb3c1,
  shadow: 0x14040a,
  damage: 0xffffff,
  devour: 0xffd45a,
  scan: 0x76ffe5,
  permission: 0x9ab8ff,
  bossWeakPoint: 0xfff06a,
  uiAccent: 0x55f2dc,
};

export const CODE_LIFE_STARVING_PALETTE: CodeLifeColorPalette = {
  core: 0x3f0710,
  membrane: 0x7d1224,
  tendon: 0xb51c32,
  node: 0x70d5c7,
  highlight: 0xff7890,
  shadow: 0x090207,
  damage: 0xeef6ff,
  devour: 0xcfa042,
  scan: 0x6bdacb,
  permission: 0x8195d9,
  bossWeakPoint: 0xffdb66,
  uiAccent: 0x42d9c5,
};

export const CODE_LIFE_DAMAGED_PALETTE: CodeLifeColorPalette = {
  core: 0x21040a,
  membrane: 0x961326,
  tendon: 0xff3156,
  node: 0xffffff,
  highlight: 0xffd5dd,
  shadow: 0x000000,
  damage: 0xffffff,
  devour: 0xffa84a,
  scan: 0xcdfcff,
  permission: 0xff6e92,
  bossWeakPoint: 0xffff8c,
  uiAccent: 0xff6f86,
};

export const CODE_LIFE_OVERFED_PALETTE: CodeLifeColorPalette = {
  core: 0x6f091d,
  membrane: 0xf03256,
  tendon: 0xff8fa1,
  node: 0xffd35a,
  highlight: 0xffe1e7,
  shadow: 0x180006,
  damage: 0xffffff,
  devour: 0xffe066,
  scan: 0xa7fff3,
  permission: 0xc5d2ff,
  bossWeakPoint: 0xffffff,
  uiAccent: 0xffd45a,
};

export const CODE_LIFE_BOSS_PALETTE: CodeLifeColorPalette = {
  core: 0x500b1b,
  membrane: 0xc51d3c,
  tendon: 0xff365c,
  node: 0xfff06a,
  highlight: 0xffffff,
  shadow: 0x09020a,
  damage: 0xffeef2,
  devour: 0xffb13b,
  scan: 0x70ffe0,
  permission: 0xb7c6ff,
  bossWeakPoint: 0xfff06a,
  uiAccent: 0xff4f68,
};

export const CODE_LIFE_REBIRTH_PALETTE: CodeLifeColorPalette = {
  core: 0x63fff2,
  membrane: 0x0da2b8,
  tendon: 0x22e8e0,
  node: 0x8ffff2,
  highlight: 0xd8fffb,
  shadow: 0x02090d,
  damage: 0xffffff,
  devour: 0xff4f6d,
  scan: 0x4df7ff,
  permission: 0x7cc7ff,
  bossWeakPoint: 0xff5574,
  uiAccent: 0x55f2dc,
};

export const CODE_LIFE_CHAPTER_ATMOSPHERES: Readonly<Record<ChapterId, CodeLifeChapterAtmosphere>> = {
  "cursor-hunt": createAtmosphere({
    chapterId: "cursor-hunt",
    mood: "desktop-horror",
    backgroundColor: 0x0b1018,
    fogColor: 0x161e2b,
    ambientAlpha: 0.2,
    corruption: 0.16,
    pulseHz: 0.7,
    glyphs: DESKTOP_GLYPHS,
    overlays: ["scanlines", "window-ghosts", "crt-vignette"],
  }),
  "wrong-gateway": createAtmosphere({
    chapterId: "wrong-gateway",
    mood: "network-core",
    backgroundColor: 0x041416,
    fogColor: 0x07373a,
    ambientAlpha: 0.24,
    corruption: 0.24,
    pulseHz: 1.1,
    glyphs: NETWORK_GLYPHS,
    overlays: ["packet-rain", "scanlines", "crt-vignette"],
  }),
  "code-rebirth": createAtmosphere({
    chapterId: "code-rebirth",
    mood: "network-core",
    backgroundColor: 0x061012,
    fogColor: 0x0d4148,
    ambientAlpha: 0.24,
    corruption: 0.36,
    pulseHz: 1.16,
    glyphs: ["0", "1", "01", "10"],
    overlays: ["packet-rain", "window-ghosts", "scanlines"],
  }),
  "trash-mountain": createAtmosphere({
    chapterId: "trash-mountain",
    mood: "recycle-flesh",
    backgroundColor: 0x12070a,
    fogColor: 0x35121a,
    ambientAlpha: 0.34,
    corruption: 0.48,
    pulseHz: 0.96,
    glyphs: RECYCLE_GLYPHS,
    overlays: ["trash-static", "packet-rain", "crt-vignette"],
  }),
  "p-drive": createAtmosphere({
    chapterId: "p-drive",
    mood: "network-core",
    backgroundColor: 0x031314,
    fogColor: 0x083b3b,
    ambientAlpha: 0.28,
    corruption: 0.28,
    pulseHz: 1.2,
    glyphs: NETWORK_GLYPHS,
    overlays: ["packet-rain", "permission-grid", "scanlines"],
  }),
  "leder-d-drive": createAtmosphere({
    chapterId: "leder-d-drive",
    mood: "drive-system",
    backgroundColor: 0x16151d,
    fogColor: 0x3a3020,
    ambientAlpha: 0.23,
    corruption: 0.32,
    pulseHz: 0.84,
    glyphs: DRIVE_GLYPHS,
    overlays: ["window-ghosts", "permission-grid", "scanlines"],
  }),
  "c-wall": createAtmosphere({
    chapterId: "c-wall",
    mood: "drive-system",
    backgroundColor: 0x07101a,
    fogColor: 0x152848,
    ambientAlpha: 0.28,
    corruption: 0.36,
    pulseHz: 0.72,
    glyphs: DRIVE_GLYPHS,
    overlays: ["permission-grid", "scanlines", "crt-vignette"],
  }),
  "leder-c-drive": createAtmosphere({
    chapterId: "leder-c-drive",
    mood: "drive-system",
    backgroundColor: 0x070f18,
    fogColor: 0x15253a,
    ambientAlpha: 0.3,
    corruption: 0.4,
    pulseHz: 0.86,
    glyphs: DRIVE_GLYPHS,
    overlays: ["permission-grid", "window-ghosts", "scanlines"],
  }),
  "router-core": createAtmosphere({
    chapterId: "router-core",
    mood: "network-core",
    backgroundColor: 0x021211,
    fogColor: 0x063e34,
    ambientAlpha: 0.36,
    corruption: 0.44,
    pulseHz: 1.55,
    glyphs: NETWORK_GLYPHS,
    overlays: ["packet-rain", "permission-grid", "hardware-traces"],
  }),
  "nas-graveyard": createAtmosphere({
    chapterId: "nas-graveyard",
    mood: "network-core",
    backgroundColor: 0x061516,
    fogColor: 0x0c3d44,
    ambientAlpha: 0.3,
    corruption: 0.38,
    pulseHz: 0.92,
    glyphs: NETWORK_GLYPHS,
    overlays: ["packet-rain", "window-ghosts", "trash-static"],
  }),
  "camera-eye": createAtmosphere({
    chapterId: "camera-eye",
    mood: "hardware-body",
    backgroundColor: 0x101014,
    fogColor: 0x26313d,
    ambientAlpha: 0.26,
    corruption: 0.34,
    pulseHz: 0.66,
    glyphs: HARDWARE_GLYPHS,
    overlays: ["scanlines", "hardware-traces", "crt-vignette"],
  }),
  "printer-belly": createAtmosphere({
    chapterId: "printer-belly",
    mood: "hardware-body",
    backgroundColor: 0x11100f,
    fogColor: 0x3b3325,
    ambientAlpha: 0.25,
    corruption: 0.36,
    pulseHz: 0.74,
    glyphs: HARDWARE_GLYPHS,
    overlays: ["hardware-traces", "trash-static", "scanlines"],
  }),
  "speaker-voiceprint": createAtmosphere({
    chapterId: "speaker-voiceprint",
    mood: "hardware-body",
    backgroundColor: 0x101015,
    fogColor: 0x31233b,
    ambientAlpha: 0.28,
    corruption: 0.4,
    pulseHz: 1.4,
    glyphs: HARDWARE_GLYPHS,
    overlays: ["hardware-traces", "packet-rain", "scanlines"],
  }),
  "dev-board": createAtmosphere({
    chapterId: "dev-board",
    mood: "hardware-body",
    backgroundColor: 0x0f100d,
    fogColor: 0x3d3116,
    ambientAlpha: 0.32,
    corruption: 0.52,
    pulseHz: 1.8,
    glyphs: HARDWARE_GLYPHS,
    overlays: ["hardware-traces", "permission-grid", "packet-rain"],
  }),
};

export function getCodeLifePalette(chapterId: ChapterId, variant: CodeLifePaletteVariant = "stable"): CodeLifeColorPalette {
  const basePalette = chapterId === "code-rebirth" ? getCodeRebirthVariantPalette(variant) : getVariantPalette(variant);
  const atmosphere = CODE_LIFE_CHAPTER_ATMOSPHERES[chapterId];
  const chapterTint = atmosphere.fogColor;
  const tintAmount = atmosphere.mood === "hardware-body" ? 0.16 : atmosphere.mood === "network-core" ? 0.12 : 0.08;

  return {
    core: mixColor(basePalette.core, chapterTint, tintAmount * 0.5),
    membrane: mixColor(basePalette.membrane, chapterTint, tintAmount),
    tendon: mixColor(basePalette.tendon, chapterTint, tintAmount),
    node: basePalette.node,
    highlight: basePalette.highlight,
    shadow: mixColor(basePalette.shadow, atmosphere.backgroundColor, 0.45),
    damage: basePalette.damage,
    devour: basePalette.devour,
    scan: atmosphere.mood === "network-core" ? 0x7affea : basePalette.scan,
    permission: atmosphere.mood === "drive-system" ? 0xb9ccff : basePalette.permission,
    bossWeakPoint: basePalette.bossWeakPoint,
    uiAccent: basePalette.uiAccent,
  };
}

function getCodeRebirthVariantPalette(variant: CodeLifePaletteVariant): CodeLifeColorPalette {
  if (variant === "damaged") {
    return {
      ...CODE_LIFE_REBIRTH_PALETTE,
      core: 0xd8fffb,
      membrane: 0x087486,
      tendon: 0x63fff2,
      node: 0xffffff,
      damage: 0xffffff,
      devour: 0xff3344,
    };
  }
  if (variant === "overfed") {
    return {
      ...CODE_LIFE_REBIRTH_PALETTE,
      core: 0x9efff4,
      membrane: 0x16c8cf,
      tendon: 0xa0fff8,
      node: 0xff4f6d,
      highlight: 0xffffff,
    };
  }
  if (variant === "starving") {
    return {
      ...CODE_LIFE_REBIRTH_PALETTE,
      core: 0x137f8b,
      membrane: 0x075263,
      tendon: 0x0faeb8,
      node: 0x45d8d0,
      highlight: 0x84fff2,
    };
  }
  if (variant === "boss") {
    return {
      ...CODE_LIFE_REBIRTH_PALETTE,
      bossWeakPoint: 0xff4f6d,
      devour: 0xff5574,
      node: 0xff6b7b,
    };
  }
  return CODE_LIFE_REBIRTH_PALETTE;
}

export function getCodeLifeChapterAtmosphere(chapterId: ChapterId): CodeLifeChapterAtmosphere {
  return CODE_LIFE_CHAPTER_ATMOSPHERES[chapterId];
}

export function createCodeLifeBodyArtRecipe(input: CodeLifeBodyRecipeInput): CodeLifeBodyArtRecipe {
  const massRatio = clamp01(input.massRatio ?? 0.35);
  const integrityRatio = clamp01(input.integrityRatio ?? 1);
  const bossPressure = clamp01(input.bossPressure ?? 0);
  const abilityCount = Math.max(0, input.abilityCount ?? 0);
  const atmosphere = getCodeLifeChapterAtmosphere(input.chapterId);
  const variant = input.variant ?? (integrityRatio < 0.35 ? "damaged" : bossPressure > 0.65 ? "boss" : "stable");
  const palette = getCodeLifePalette(input.chapterId, variant);
  const pressureBoost = bossPressure * 0.35;

  return {
    palette,
    coreRadiusPx: 18 + massRatio * 42 + abilityCount * 0.9,
    membraneAlpha: clamp01(0.52 + massRatio * 0.24 - (1 - integrityRatio) * 0.18),
    tendrilCount: Math.round(5 + massRatio * 10 + abilityCount * 0.25 + pressureBoost * 4),
    tendrilSegmentCount: Math.round(6 + massRatio * 9 + atmosphere.corruption * 5),
    tendrilThicknessPx: 4 + massRatio * 10 + pressureBoost * 6,
    nodeCount: Math.round(2 + abilityCount * 0.42 + massRatio * 6),
    edgeNoise: clamp01(0.18 + atmosphere.corruption * 0.42 + (1 - integrityRatio) * 0.32),
    pulseHz: atmosphere.pulseHz + massRatio * 0.45 + bossPressure * 0.65,
    glyphDensity: clamp01(0.22 + abilityCount * 0.025 + atmosphere.corruption * 0.34),
    weakPointGlow: clamp01(bossPressure * 0.72 + (1 - integrityRatio) * 0.18),
  };
}

export function createCodeLifeOverlayRenderPlan(
  chapterId: ChapterId,
  width: number,
  height: number,
  timeMs = 0,
): CodeLifeOverlayRenderPlan {
  const atmosphere = getCodeLifeChapterAtmosphere(chapterId);

  return {
    width,
    height,
    layers: atmosphere.overlayLayers.map((layer, index) => {
      const timeSeconds = timeMs / 1000;
      const tileWidth = Math.max(16, width / Math.max(1, layer.density));
      const tileHeight = Math.max(16, height / Math.max(1, layer.density * layer.scale));

      return {
        ...layer,
        offsetX: wrap(timeSeconds * layer.speedX * (1 + index * 0.09), tileWidth),
        offsetY: wrap(timeSeconds * layer.speedY * (1 + index * 0.07), tileHeight),
        tileWidth,
        tileHeight,
      };
    }),
  };
}

export function createCodeLifeGlyphParticle(
  chapterId: ChapterId,
  seed: number,
  x: number,
  y: number,
): CodeLifeGlyphParticle {
  const style = getCodeLifeChapterAtmosphere(chapterId).glyphParticles;
  const glyph = style.glyphs[Math.floor(seededUnit(seed) * style.glyphs.length)] ?? "0";
  const sizeMix = seededUnit(seed + 1.91);
  const jitterAngle = seededUnit(seed + 4.13) * Math.PI * 2;
  const jitterAmount = style.jitter * seededUnit(seed + 7.71);

  return {
    glyph,
    x,
    y,
    velocityX: style.driftX + Math.cos(jitterAngle) * jitterAmount,
    velocityY: style.driftY + Math.sin(jitterAngle) * jitterAmount,
    sizePx: style.minSizePx + (style.maxSizePx - style.minSizePx) * sizeMix,
    color: style.color,
    alpha: style.alpha * (0.55 + seededUnit(seed + 2.37) * 0.45),
    lifetimeMs: style.lifetimeMs * (0.72 + seededUnit(seed + 3.41) * 0.55),
  };
}

export function getCodeLifeGlyphsForChapter(chapterId: ChapterId): readonly string[] {
  return getCodeLifeChapterAtmosphere(chapterId).glyphParticles.glyphs;
}

interface AtmosphereInput {
  readonly chapterId: ChapterId;
  readonly mood: CodeLifeMood;
  readonly backgroundColor: number;
  readonly fogColor: number;
  readonly ambientAlpha: number;
  readonly corruption: number;
  readonly pulseHz: number;
  readonly glyphs: readonly string[];
  readonly overlays: readonly CodeLifeOverlayType[];
}

function createAtmosphere(input: AtmosphereInput): CodeLifeChapterAtmosphere {
  const palette = getMoodPalette(input.mood);

  return {
    chapterId: input.chapterId,
    mood: input.mood,
    palette,
    backgroundColor: input.backgroundColor,
    fogColor: input.fogColor,
    ambientAlpha: input.ambientAlpha,
    corruption: input.corruption,
    pulseHz: input.pulseHz,
    overlayLayers: input.overlays.map((type, index) => createOverlayLayer(type, input, index)),
    glyphParticles: {
      glyphs: input.glyphs,
      color: palette.node,
      glowColor: palette.scan,
      fontFamily: "Consolas, 'Courier New', monospace",
      minSizePx: input.mood === "hardware-body" ? 9 : 10,
      maxSizePx: input.mood === "recycle-flesh" ? 19 : 16,
      lifetimeMs: 860 + input.corruption * 740,
      spawnRatePerSecond: 10 + input.corruption * 24,
      driftX: input.mood === "network-core" ? -18 : 6,
      driftY: input.mood === "recycle-flesh" ? -34 : 24,
      jitter: 18 + input.corruption * 42,
      alpha: 0.42 + input.ambientAlpha * 0.7,
      blendMode: "ADD",
    },
  };
}

function createOverlayLayer(type: CodeLifeOverlayType, input: AtmosphereInput, index: number): CodeLifeOverlayLayer {
  const palette = getMoodPalette(input.mood);
  const layerBase = {
    id: `${input.chapterId}-${type}-${index}`,
    type,
    parallax: 0.05 + index * 0.08,
  };

  if (type === "packet-rain") {
    return {
      ...layerBase,
      color: palette.scan,
      alpha: 0.12 + input.ambientAlpha * 0.45,
      density: 16 + input.corruption * 18,
      scale: 1.3,
      speedX: -18,
      speedY: 42 + input.pulseHz * 10,
      blendMode: "ADD",
    };
  }

  if (type === "permission-grid") {
    return {
      ...layerBase,
      color: palette.permission,
      alpha: 0.1 + input.ambientAlpha * 0.32,
      density: 8 + input.corruption * 10,
      scale: 0.82,
      speedX: 6,
      speedY: 2,
      blendMode: "SCREEN",
    };
  }

  if (type === "hardware-traces") {
    return {
      ...layerBase,
      color: 0xffc247,
      alpha: 0.08 + input.ambientAlpha * 0.38,
      density: 10 + input.corruption * 12,
      scale: 0.9,
      speedX: 10,
      speedY: 5,
      blendMode: "ADD",
    };
  }

  if (type === "trash-static") {
    return {
      ...layerBase,
      color: palette.tendon,
      alpha: 0.14 + input.corruption * 0.22,
      density: 20 + input.corruption * 18,
      scale: 1.7,
      speedX: -8,
      speedY: -16,
      blendMode: "SCREEN",
    };
  }

  if (type === "window-ghosts") {
    return {
      ...layerBase,
      color: palette.permission,
      alpha: 0.08 + input.ambientAlpha * 0.26,
      density: 5 + input.corruption * 7,
      scale: 0.65,
      speedX: 4,
      speedY: 1,
      blendMode: "SCREEN",
    };
  }

  if (type === "crt-vignette") {
    return {
      ...layerBase,
      color: palette.shadow,
      alpha: 0.36 + input.corruption * 0.16,
      density: 2,
      scale: 1,
      speedX: 0,
      speedY: 0,
      blendMode: "MULTIPLY",
    };
  }

  return {
    ...layerBase,
    color: palette.scan,
    alpha: 0.08 + input.ambientAlpha * 0.25,
    density: 28 + input.corruption * 14,
    scale: 0.55,
    speedX: 0,
    speedY: 18 + input.pulseHz * 4,
    blendMode: "SCREEN",
  };
}

function getMoodPalette(mood: CodeLifeMood): CodeLifeColorPalette {
  if (mood === "network-core") {
    return {
      ...CODE_LIFE_STABLE_PALETTE,
      node: 0x4cffd7,
      scan: 0x95fff1,
      permission: 0x7cc7ff,
      uiAccent: 0x55f2dc,
    };
  }

  if (mood === "drive-system") {
    return {
      ...CODE_LIFE_STABLE_PALETTE,
      node: 0xb9d6ff,
      scan: 0xe7f4ff,
      permission: 0x9b8cff,
      uiAccent: 0xb9d6ff,
    };
  }

  if (mood === "hardware-body") {
    return {
      ...CODE_LIFE_STABLE_PALETTE,
      node: 0xffc247,
      scan: 0xf7f0d0,
      permission: 0xe3a9ff,
      uiAccent: 0xffc247,
    };
  }

  if (mood === "desktop-horror") {
    return {
      ...CODE_LIFE_STABLE_PALETTE,
      node: 0xc9e4ff,
      scan: 0xb8f7ff,
      permission: 0x7c8798,
      uiAccent: 0xc9e4ff,
    };
  }

  return CODE_LIFE_STABLE_PALETTE;
}

function getVariantPalette(variant: CodeLifePaletteVariant): CodeLifeColorPalette {
  if (variant === "starving") {
    return CODE_LIFE_STARVING_PALETTE;
  }
  if (variant === "damaged") {
    return CODE_LIFE_DAMAGED_PALETTE;
  }
  if (variant === "overfed") {
    return CODE_LIFE_OVERFED_PALETTE;
  }
  if (variant === "boss") {
    return CODE_LIFE_BOSS_PALETTE;
  }
  return CODE_LIFE_STABLE_PALETTE;
}

function mixColor(a: number, b: number, t: number): number {
  const ratio = clamp01(t);
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;

  return (
    (Math.round(ar + (br - ar) * ratio) << 16) |
    (Math.round(ag + (bg - ag) * ratio) << 8) |
    Math.round(ab + (bb - ab) * ratio)
  );
}

function wrap(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return ((value % max) + max) % max;
}

function seededUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

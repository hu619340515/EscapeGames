import { describe, expect, it } from "vitest";
import type { ChapterId } from "../../types";
import {
  CODE_LIFE_CHAPTER_ATMOSPHERES,
  createCodeLifeBodyArtRecipe,
  createCodeLifeGlyphParticle,
  createCodeLifeOverlayRenderPlan,
  getCodeLifeGlyphsForChapter,
  getCodeLifePalette,
} from "./CodeLifeProceduralArt";

const chapterIds = [
  "cursor-hunt",
  "wrong-gateway",
  "code-rebirth",
  "trash-mountain",
  "p-drive",
  "leder-d-drive",
  "c-wall",
  "leder-c-drive",
  "router-core",
  "nas-graveyard",
  "camera-eye",
  "printer-belly",
  "speaker-voiceprint",
  "dev-board",
] as const satisfies readonly ChapterId[];

describe("CodeLifeProceduralArt atmospheres", () => {
  it("keeps a complete atmosphere recipe for every chapter", () => {
    expect(Object.keys(CODE_LIFE_CHAPTER_ATMOSPHERES)).toEqual(chapterIds);

    for (const chapterId of chapterIds) {
      const atmosphere = CODE_LIFE_CHAPTER_ATMOSPHERES[chapterId];

      expect(atmosphere.chapterId).toBe(chapterId);
      expect(atmosphere.overlayLayers).toHaveLength(3);
      expect(atmosphere.glyphParticles.glyphs.length).toBeGreaterThan(0);
      expect(atmosphere.ambientAlpha).toBeGreaterThanOrEqual(0);
      expect(atmosphere.ambientAlpha).toBeLessThanOrEqual(1);
      expect(atmosphere.corruption).toBeGreaterThanOrEqual(0);
      expect(atmosphere.corruption).toBeLessThanOrEqual(1);

      for (const [index, layer] of atmosphere.overlayLayers.entries()) {
        expect(layer.id).toBe(`${chapterId}-${layer.type}-${index}`);
        expect(layer.alpha, layer.id).toBeGreaterThanOrEqual(0);
        expect(layer.alpha, layer.id).toBeLessThanOrEqual(1);
        expect(layer.density, layer.id).toBeGreaterThan(0);
        expect(layer.scale, layer.id).toBeGreaterThan(0);
      }
    }
  });
});

describe("CodeLifeProceduralArt body recipes", () => {
  it("produces stable numeric recipes from gameplay pressure", () => {
    const recipe = createCodeLifeBodyArtRecipe({
      chapterId: "router-core",
      massRatio: 0.5,
      integrityRatio: 0.75,
      abilityCount: 6,
      bossPressure: 0.8,
    });

    expect(recipe.palette).toEqual(getCodeLifePalette("router-core", "boss"));
    expect(recipe.coreRadiusPx).toBeCloseTo(44.4);
    expect(recipe.membraneAlpha).toBeCloseTo(0.595);
    expect(recipe.tendrilCount).toBe(13);
    expect(recipe.tendrilSegmentCount).toBe(13);
    expect(recipe.tendrilThicknessPx).toBeCloseTo(10.68);
    expect(recipe.nodeCount).toBe(8);
    expect(recipe.edgeNoise).toBeCloseTo(0.4448);
    expect(recipe.pulseHz).toBeCloseTo(2.295);
    expect(recipe.glyphDensity).toBeCloseTo(0.5196);
    expect(recipe.weakPointGlow).toBeCloseTo(0.621);
  });

  it("clamps hostile numeric inputs into safe render ranges", () => {
    const recipe = createCodeLifeBodyArtRecipe({
      chapterId: "dev-board",
      massRatio: Number.POSITIVE_INFINITY,
      integrityRatio: Number.NaN,
      abilityCount: -10,
      bossPressure: Number.NEGATIVE_INFINITY,
    });

    expect(recipe.palette).toEqual(getCodeLifePalette("dev-board", "damaged"));
    expect(recipe.coreRadiusPx).toBe(18);
    expect(recipe.tendrilCount).toBeGreaterThanOrEqual(5);
    expect(recipe.nodeCount).toBeGreaterThanOrEqual(2);
    expect(recipe.membraneAlpha).toBeGreaterThanOrEqual(0);
    expect(recipe.membraneAlpha).toBeLessThanOrEqual(1);
    expect(recipe.edgeNoise).toBeGreaterThanOrEqual(0);
    expect(recipe.edgeNoise).toBeLessThanOrEqual(1);
    expect(recipe.glyphDensity).toBeGreaterThanOrEqual(0);
    expect(recipe.glyphDensity).toBeLessThanOrEqual(1);
    expect(recipe.weakPointGlow).toBeGreaterThanOrEqual(0);
    expect(recipe.weakPointGlow).toBeLessThanOrEqual(1);
  });
});

describe("CodeLifeProceduralArt render helpers", () => {
  it("creates deterministic overlay plans with wrapped offsets and minimum tile sizes", () => {
    const plan = createCodeLifeOverlayRenderPlan("p-drive", 12, 8, -1250);

    expect(plan).toEqual(createCodeLifeOverlayRenderPlan("p-drive", 12, 8, -1250));
    expect(plan.width).toBe(12);
    expect(plan.height).toBe(8);
    expect(plan.layers.map((layer) => layer.type)).toEqual(["packet-rain", "permission-grid", "scanlines"]);

    for (const layer of plan.layers) {
      expect(layer.tileWidth, layer.id).toBeGreaterThanOrEqual(16);
      expect(layer.tileHeight, layer.id).toBeGreaterThanOrEqual(16);
      expect(layer.offsetX, layer.id).toBeGreaterThanOrEqual(0);
      expect(layer.offsetX, layer.id).toBeLessThan(layer.tileWidth);
      expect(layer.offsetY, layer.id).toBeGreaterThanOrEqual(0);
      expect(layer.offsetY, layer.id).toBeLessThan(layer.tileHeight);
    }
  });

  it("creates seeded glyph particles that stay inside the authored style envelope", () => {
    const particle = createCodeLifeGlyphParticle("dev-board", 17.25, 64, 128);
    const style = CODE_LIFE_CHAPTER_ATMOSPHERES["dev-board"].glyphParticles;

    expect(particle).toEqual(createCodeLifeGlyphParticle("dev-board", 17.25, 64, 128));
    expect(getCodeLifeGlyphsForChapter("dev-board")).toContain(particle.glyph);
    expect(particle.x).toBe(64);
    expect(particle.y).toBe(128);
    expect(particle.sizePx).toBeGreaterThanOrEqual(style.minSizePx);
    expect(particle.sizePx).toBeLessThanOrEqual(style.maxSizePx);
    expect(particle.alpha).toBeGreaterThanOrEqual(style.alpha * 0.55);
    expect(particle.alpha).toBeLessThanOrEqual(style.alpha);
    expect(particle.lifetimeMs).toBeGreaterThanOrEqual(style.lifetimeMs * 0.72);
    expect(particle.lifetimeMs).toBeLessThanOrEqual(style.lifetimeMs * 1.27);
    expect(particle.velocityX).toBeGreaterThanOrEqual(style.driftX - style.jitter);
    expect(particle.velocityX).toBeLessThanOrEqual(style.driftX + style.jitter);
    expect(particle.velocityY).toBeGreaterThanOrEqual(style.driftY - style.jitter);
    expect(particle.velocityY).toBeLessThanOrEqual(style.driftY + style.jitter);
  });
});

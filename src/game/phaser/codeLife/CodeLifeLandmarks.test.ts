import { describe, expect, it } from "vitest";
import type { ChapterId } from "../../types";
import { createCodeLifeLandmarkPlan, getCodeLifeLandmarkKinds } from "./CodeLifeLandmarks";

const chapterIds = [
  "cursor-hunt",
  "wrong-gateway",
  "permanent-delete",
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

describe("CodeLife landmarks", () => {
  it("assigns a visible landmark identity to every chapter", () => {
    const kinds = getCodeLifeLandmarkKinds();

    expect(Object.keys(kinds)).toEqual(chapterIds);
    expect(new Set(Object.values(kinds)).size).toBe(chapterIds.length);

    for (const chapterId of chapterIds) {
      const plan = createCodeLifeLandmarkPlan(chapterId, 3200, 1500);

      expect(plan.chapterId).toBe(chapterId);
      expect(plan.kind).toBe(kinds[chapterId]);
      expect(plan.width).toBeGreaterThan(300);
      expect(plan.height).toBeGreaterThan(200);
      expect(plan.alpha).toBeGreaterThan(0);
      expect(plan.alpha).toBeLessThanOrEqual(1);
      expect(plan.nodes.length).toBeGreaterThanOrEqual(7);
      expect(plan.lineCount).toBeGreaterThanOrEqual(10);

      for (const node of plan.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.x).toBeLessThanOrEqual(3200);
        expect(node.y).toBeGreaterThanOrEqual(0);
        expect(node.y).toBeLessThanOrEqual(1500);
        expect(node.radius).toBeGreaterThan(0);
      }
    }
  });

  it("gives hardware chapters distinct machine silhouettes", () => {
    expect(createCodeLifeLandmarkPlan("camera-eye", 3200, 1500).kind).toBe("camera-iris");
    expect(createCodeLifeLandmarkPlan("printer-belly", 3200, 1500).kind).toBe("printer-throat");
    expect(createCodeLifeLandmarkPlan("speaker-voiceprint", 3200, 1500).kind).toBe("speaker-chamber");
    expect(createCodeLifeLandmarkPlan("dev-board", 3600, 1700).kind).toBe("dev-board");
  });
});

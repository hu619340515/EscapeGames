import { describe, expect, it } from "vitest";
import { chapters } from "../../data";
import { CHAPTER_MUSIC_URLS } from "./chapterMusic";

describe("chapter music", () => {
  it("provides one background track for every chapter", () => {
    const chapterIds = chapters.map((chapter) => chapter.id);

    expect(Object.keys(CHAPTER_MUSIC_URLS)).toEqual(chapterIds);
    for (const chapterId of chapterIds) {
      expect(CHAPTER_MUSIC_URLS[chapterId]).toContain(".wav");
    }
  });
});

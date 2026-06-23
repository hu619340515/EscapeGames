import { describe, expect, it } from "vitest";
import { isAnimalPetChapter } from "./petSprites";

describe("animal pet chapter routing", () => {
  it("keeps chapters 3-7 in transitional lifeform mode and restores pets from chapter 8 onward", () => {
    expect(isAnimalPetChapter("code-rebirth")).toBe(false);
    expect(isAnimalPetChapter("trash-mountain")).toBe(false);
    expect(isAnimalPetChapter("p-drive")).toBe(false);
    expect(isAnimalPetChapter("leder-d-drive")).toBe(false);
    expect(isAnimalPetChapter("c-wall")).toBe(false);

    expect(isAnimalPetChapter("leder-c-drive")).toBe(true);
    expect(isAnimalPetChapter("router-core")).toBe(true);
    expect(isAnimalPetChapter("dev-board")).toBe(true);
  });
});

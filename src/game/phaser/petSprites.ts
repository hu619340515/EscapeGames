import Phaser from "phaser";
import type { ChapterId, PetSpecies } from "../types";

export const PET_SPRITE_FRAME_WIDTH = 48;
export const PET_SPRITE_FRAME_HEIGHT = 48;

export type PetAnimationName = "idle" | "run" | "jump" | "climb";

export const PET_SPRITE_TEXTURE_KEYS: Record<PetSpecies, string> = {
  pig: "player-pet-pig",
  panda: "player-pet-panda",
  cat: "player-pet-cat",
};

const ANIMAL_PET_CHAPTER_IDS = new Set<ChapterId>(["generation", "cursor-hunt", "wrong-gateway"]);

export function getPetTextureKey(petSpecies: PetSpecies): string {
  return PET_SPRITE_TEXTURE_KEYS[petSpecies];
}

export function isAnimalPetChapter(chapterId: ChapterId): boolean {
  return ANIMAL_PET_CHAPTER_IDS.has(chapterId);
}

export function getPetAnimationKey(textureKey: string, animation: PetAnimationName): string {
  return `${textureKey}-${animation}`;
}

export function createPetAnimations(scene: Phaser.Scene): void {
  for (const textureKey of Object.values(PET_SPRITE_TEXTURE_KEYS)) {
    createLoopingAnimation(scene, textureKey, "idle", [0, 1], 2);
    createLoopingAnimation(scene, textureKey, "run", [2, 3, 4, 5], 12);
    createSingleFrameAnimation(scene, textureKey, "jump", 6);
    createLoopingAnimation(scene, textureKey, "climb", [7, 8], 6);
  }
}

function createLoopingAnimation(
  scene: Phaser.Scene,
  textureKey: string,
  animation: PetAnimationName,
  frames: number[],
  frameRate: number,
): void {
  const key = getPetAnimationKey(textureKey, animation);
  if (scene.anims.exists(key)) {
    return;
  }

  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(textureKey, { frames }),
    frameRate,
    repeat: -1,
  });
}

function createSingleFrameAnimation(
  scene: Phaser.Scene,
  textureKey: string,
  animation: PetAnimationName,
  frame: number,
): void {
  const key = getPetAnimationKey(textureKey, animation);
  if (scene.anims.exists(key)) {
    return;
  }

  scene.anims.create({
    key,
    frames: [{ key: textureKey, frame }],
    frameRate: 1,
    repeat: 0,
  });
}

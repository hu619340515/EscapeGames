import Phaser from "phaser";
import cursorHuntDesktopUrl from "../../assets/chapter1/cursor-hunt-desktop.png";
import recycleMouthUrl from "../../../素材/回收站/recycle_monster_mouth.png";
import catSpritesheetUrl from "../../../素材/第一章/cat_spritesheet_run6_image2.png";
import pandaSpritesheetUrl from "../../../素材/第一章/panda_spritesheet_run6_image2.png";
import pigSpritesheetUrl from "../../../素材/第一章/pig_spritesheet_run6_image2.png";
import { createPixelTextures } from "./createPixelTextures";
import { GameplayScene } from "./GameplayScene";
import {
  createPetAnimations,
  PET_SPRITE_FRAME_HEIGHT,
  PET_SPRITE_FRAME_WIDTH,
  PET_SPRITE_TEXTURE_KEYS,
} from "./petSprites";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.image("cursor-hunt-desktop-bg", cursorHuntDesktopUrl);
    this.load.image("recycle-mouth", recycleMouthUrl);
    this.load.spritesheet(PET_SPRITE_TEXTURE_KEYS.pig, pigSpritesheetUrl, {
      frameWidth: PET_SPRITE_FRAME_WIDTH,
      frameHeight: PET_SPRITE_FRAME_HEIGHT,
    });
    this.load.spritesheet(PET_SPRITE_TEXTURE_KEYS.panda, pandaSpritesheetUrl, {
      frameWidth: PET_SPRITE_FRAME_WIDTH,
      frameHeight: PET_SPRITE_FRAME_HEIGHT,
    });
    this.load.spritesheet(PET_SPRITE_TEXTURE_KEYS.cat, catSpritesheetUrl, {
      frameWidth: PET_SPRITE_FRAME_WIDTH,
      frameHeight: PET_SPRITE_FRAME_HEIGHT,
    });
  }

  create(): void {
    createPixelTextures(this);
    createPetAnimations(this);
    this.scene.add("GameplayScene", GameplayScene, true);
  }
}

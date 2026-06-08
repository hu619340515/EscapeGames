import Phaser from "phaser";
import { createPixelTextures } from "./createPixelTextures";
import { GameplayScene } from "./GameplayScene";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    createPixelTextures(this);
    this.scene.add("GameplayScene", GameplayScene, true);
  }
}

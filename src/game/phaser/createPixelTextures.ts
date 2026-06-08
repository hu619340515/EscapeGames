import Phaser from "phaser";
import { themeTileKeys } from "../assets/manifest";
import type { ChapterTheme } from "../types";

const themeColors: Record<ChapterTheme, number> = {
  desktop: 0x778399,
  settings: 0x2ad9c5,
  recycle: 0x8f2639,
  trash: 0x76313f,
  network: 0x22bfa6,
  "d-drive": 0xb38b45,
  "c-drive": 0x88a9d6,
  router: 0xff6b3f,
  nas: 0x62d7ff,
  camera: 0xb6e1ff,
  printer: 0xffe2a8,
  speaker: 0xdba4ff,
  hardware: 0xffc247,
};

export function createPixelTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists("player-code")) {
    return;
  }

  const g = scene.add.graphics();

  g.clear();
  g.fillStyle(0xdbe8ff, 1);
  g.fillRect(6, 6, 12, 12);
  g.fillStyle(0x8ee6ff, 1);
  g.fillRect(9, 4, 6, 4);
  g.fillStyle(0x202436, 1);
  g.fillRect(9, 10, 2, 2);
  g.fillRect(14, 10, 2, 2);
  g.fillStyle(0xff7aa8, 1);
  g.fillRect(18, 13, 4, 3);
  g.generateTexture("player-pet", 24, 24);

  g.clear();
  g.fillStyle(0x571321, 1);
  g.fillRect(5, 7, 18, 11);
  g.fillStyle(0xc91f45, 1);
  g.fillRect(2, 10, 24, 7);
  g.fillRect(7, 3, 10, 18);
  g.fillStyle(0xff688a, 1);
  g.fillRect(9, 8, 3, 3);
  g.fillRect(15, 11, 2, 2);
  g.fillStyle(0xffc3d0, 1);
  g.fillRect(3, 5, 4, 2);
  g.fillRect(20, 17, 5, 2);
  g.generateTexture("player-code", 28, 22);

  g.clear();
  g.fillStyle(0xdedede, 1);
  g.fillRect(4, 6, 14, 10);
  g.fillStyle(0xffffff, 1);
  g.fillRect(8, 9, 3, 2);
  g.generateTexture("player-clone", 22, 18);

  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(8, 8, 56, 38);
  g.fillStyle(0x1a1020, 1);
  g.fillRect(15, 18, 42, 18);
  g.fillStyle(0xffffff, 1);
  g.fillRect(29, 3, 14, 8);
  g.fillRect(19, 46, 34, 5);
  g.generateTexture("boss-core", 72, 54);

  g.clear();
  g.fillStyle(0x111111, 1);
  g.fillRect(0, 0, 18, 18);
  g.fillStyle(0x42f5b9, 1);
  g.fillRect(2, 2, 14, 14);
  g.fillStyle(0x0c312b, 1);
  g.fillRect(5, 5, 2, 8);
  g.fillRect(11, 5, 2, 8);
  g.generateTexture("code-block", 18, 18);

  g.clear();
  g.fillStyle(0xff4f6d, 1);
  g.fillRect(0, 0, 64, 10);
  g.fillStyle(0xffd5df, 1);
  g.fillRect(0, 4, 64, 2);
  g.generateTexture("hazard-scan", 64, 10);

  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(2, 0, 6, 10);
  g.fillRect(0, 2, 10, 6);
  g.fillStyle(0xff4f6d, 1);
  g.fillRect(3, 3, 4, 4);
  g.generateTexture("boss-bullet", 10, 10);

  g.clear();
  g.fillStyle(0x00e6ff, 1);
  g.fillRect(8, 0, 24, 48);
  g.fillStyle(0x001b24, 1);
  g.fillRect(13, 7, 14, 34);
  g.fillStyle(0xbff8ff, 1);
  g.fillRect(18, 14, 4, 20);
  g.generateTexture("exit-node", 40, 48);

  for (const [theme, key] of Object.entries(themeTileKeys) as Array<[ChapterTheme, string]>) {
    g.clear();
    const color = themeColors[theme];
    g.fillStyle(color, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x101018, 0.45);
    g.fillRect(0, 0, 32, 4);
    g.fillRect(0, 0, 4, 32);
    g.fillStyle(0xffffff, 0.12);
    g.fillRect(6, 9, 10, 3);
    g.fillRect(19, 19, 8, 3);
    g.generateTexture(key, 32, 32);
  }

  g.destroy();
}

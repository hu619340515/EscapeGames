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

  g.clear();
  g.fillStyle(0x130309, 1);
  g.fillRect(0, 0, 256, 256);
  g.fillStyle(0x2b0711, 1);
  g.fillRect(0, 38, 256, 22);
  g.fillRect(0, 146, 256, 30);
  g.fillStyle(0x5a1423, 0.85);
  g.fillRect(18, 20, 90, 8);
  g.fillRect(116, 82, 112, 10);
  g.fillRect(42, 204, 156, 9);
  g.fillStyle(0xff4f6d, 0.16);
  g.fillCircle(44, 112, 22);
  g.fillCircle(188, 42, 16);
  g.fillCircle(206, 178, 28);
  g.lineStyle(1, 0xff8aa0, 0.2);
  for (let y = 18; y < 256; y += 44) {
    g.lineBetween(0, y, 256, y + 16);
  }
  g.generateTexture("pd-background", 256, 256);

  g.clear();
  g.fillStyle(0x2a0710, 1);
  g.fillRect(0, 0, 96, 28);
  g.fillStyle(0x681d2d, 1);
  g.fillRect(4, 4, 88, 20);
  g.fillStyle(0xff9aad, 0.28);
  g.fillRect(8, 8, 34, 4);
  g.fillRect(52, 16, 28, 3);
  g.generateTexture("pd-file-block", 96, 28);

  g.clear();
  g.fillStyle(0xffd6df, 1);
  g.fillTriangle(16, 0, 32, 56, 0, 56);
  g.fillStyle(0x7b1625, 0.42);
  g.fillTriangle(16, 14, 25, 52, 7, 52);
  g.generateTexture("pd-tooth", 32, 56);

  g.clear();
  g.fillStyle(0x4c0612, 1);
  g.fillCircle(18, 18, 17);
  g.fillStyle(0xff4f6d, 1);
  g.fillCircle(18, 18, 10);
  g.fillStyle(0xffd2dc, 1);
  g.fillCircle(18, 18, 4);
  g.generateTexture("pd-anchor", 36, 36);

  g.clear();
  g.fillStyle(0x19040a, 1);
  g.fillCircle(48, 48, 46);
  g.fillStyle(0xffc3d0, 1);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const x = 48 + Math.cos(angle) * 35;
    const y = 48 + Math.sin(angle) * 35;
    g.fillCircle(x, y, 9);
  }
  g.fillStyle(0x72182a, 1);
  g.fillCircle(48, 48, 28);
  g.fillStyle(0x16040a, 1);
  g.fillCircle(48, 48, 12);
  g.generateTexture("pd-gear", 96, 96);

  g.clear();
  g.fillStyle(0x061712, 1);
  g.fillRoundedRect(2, 5, 42, 30, 8);
  g.fillStyle(0x42f5b9, 1);
  g.fillRoundedRect(7, 9, 32, 22, 6);
  g.fillStyle(0x0d4036, 1);
  g.fillRect(14, 14, 4, 12);
  g.fillRect(27, 14, 4, 12);
  g.generateTexture("pd-cache", 46, 40);

  g.clear();
  g.fillStyle(0xd7d0c8, 1);
  g.fillRect(0, 0, 82, 52);
  g.fillStyle(0xf7f1e8, 1);
  g.fillRect(6, 6, 70, 40);
  g.fillStyle(0x4b1020, 1);
  g.fillRect(10, 12, 38, 5);
  g.fillRect(10, 23, 54, 5);
  g.fillRect(10, 34, 28, 5);
  g.fillStyle(0xff4f6d, 0.8);
  g.fillRect(58, 8, 14, 14);
  g.generateTexture("pd-file-shell", 82, 52);

  g.clear();
  g.fillStyle(0x151921, 1);
  g.fillRoundedRect(2, 3, 44, 34, 8);
  g.fillStyle(0xffffff, 1);
  g.fillRect(10, 12, 26, 4);
  g.fillRect(10, 21, 20, 4);
  g.fillStyle(0xff4f6d, 1);
  g.fillRect(36, 9, 8, 22);
  g.generateTexture("pd-process", 48, 40);

  g.clear();
  g.fillStyle(0x05080c, 1);
  g.fillRect(0, 0, 78, 92);
  g.fillStyle(0xff4f6d, 1);
  g.fillRect(8, 4, 12, 84);
  g.fillRect(58, 4, 12, 84);
  g.fillStyle(0xffd6df, 1);
  g.fillRect(24, 18, 28, 6);
  g.fillRect(24, 44, 28, 6);
  g.fillRect(24, 70, 28, 6);
  g.generateTexture("pd-exit", 78, 92);

  g.clear();
  g.fillStyle(0xff153c, 1);
  g.fillTriangle(3, 2, 58, 34, 24, 43);
  g.fillTriangle(20, 39, 34, 78, 45, 72);
  g.fillStyle(0x5b0012, 1);
  g.fillTriangle(14, 13, 45, 31, 23, 35);
  g.lineStyle(3, 0xffc1cb, 0.8);
  g.strokeTriangle(3, 2, 58, 34, 24, 43);
  g.lineStyle(2, 0xff3153, 0.35);
  g.strokeTriangle(0, 0, 66, 38, 27, 50);
  g.generateTexture("cursor-hunter", 68, 82);

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

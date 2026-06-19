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
  g.lineStyle(7, 0x35050d, 0.9);
  g.lineBetween(44, 36, 8, 14);
  g.lineBetween(45, 37, 12, 58);
  g.lineBetween(52, 34, 87, 10);
  g.lineBetween(55, 41, 88, 60);
  g.lineStyle(3, 0xff4467, 0.88);
  g.lineBetween(44, 36, 8, 14);
  g.lineBetween(45, 37, 12, 58);
  g.lineBetween(52, 34, 87, 10);
  g.lineBetween(55, 41, 88, 60);
  g.fillStyle(0x3a0610, 0.95);
  g.fillEllipse(46, 36, 54, 38);
  g.fillEllipse(36, 31, 35, 29);
  g.fillEllipse(58, 42, 39, 30);
  g.fillStyle(0xbf183a, 0.9);
  g.fillEllipse(46, 36, 42, 29);
  g.fillEllipse(32, 32, 24, 20);
  g.fillEllipse(62, 40, 27, 21);
  g.fillStyle(0xff7f96, 0.88);
  g.fillCircle(35, 31, 4);
  g.fillCircle(53, 39, 3);
  g.fillCircle(63, 31, 2);
  g.fillStyle(0x42f5b9, 0.95);
  for (let index = 0; index < 8; index += 1) {
    const x = 27 + (index % 4) * 10;
    const y = 25 + Math.floor(index / 4) * 13;
    g.fillRect(x, y, index % 2 === 0 ? 2 : 5, 8);
  }
  g.fillStyle(0xffd2dc, 0.75);
  g.fillRect(16, 15, 9, 2);
  g.fillRect(72, 13, 8, 2);
  g.fillRect(14, 57, 10, 2);
  g.fillRect(74, 60, 7, 2);
  g.generateTexture("player-code", 96, 72);

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

  createCodeLifeHazardTextures(g);
  createCodeLifeBossTextures(g);
  createCodeLifeGateTextures(g);

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

function createCodeLifeHazardTextures(g: Phaser.GameObjects.Graphics): void {
  g.clear();
  g.fillStyle(0x05080c, 1);
  g.fillCircle(48, 48, 44);
  g.lineStyle(5, 0xffef9a, 0.95);
  g.strokeCircle(48, 48, 30);
  g.fillStyle(0xffffff, 0.92);
  g.fillCircle(48, 48, 10);
  g.lineStyle(3, 0xffef9a, 0.42);
  g.lineBetween(48, 48, 92, 36);
  g.lineBetween(48, 48, 92, 60);
  g.generateTexture("pd-hazard-optic", 96, 96);

  g.clear();
  g.fillStyle(0x19120a, 1);
  g.fillRoundedRect(4, 24, 88, 48, 16);
  g.fillStyle(0xf7f0d0, 0.95);
  g.fillCircle(26, 48, 18);
  g.fillCircle(70, 48, 18);
  g.lineStyle(4, 0xffc247, 0.75);
  g.lineBetween(18, 48, 78, 48);
  g.generateTexture("pd-hazard-roller", 96, 96);

  g.clear();
  g.fillStyle(0x13091a, 1);
  g.fillCircle(48, 48, 38);
  for (let index = 0; index < 4; index += 1) {
    g.lineStyle(3, 0xe3a9ff, 0.9 - index * 0.14);
    g.strokeCircle(48, 48, 12 + index * 10);
  }
  g.fillStyle(0x7affea, 0.8);
  g.fillRect(44, 20, 8, 56);
  g.generateTexture("pd-hazard-audio", 96, 96);

  g.clear();
  g.fillStyle(0x1f1604, 1);
  g.fillRoundedRect(14, 12, 68, 72, 10);
  g.fillStyle(0xffc247, 0.92);
  for (let index = 0; index < 5; index += 1) {
    g.fillRect(24 + index * 10, 4, 4, 18);
    g.fillRect(24 + index * 10, 74, 4, 18);
  }
  g.lineStyle(4, 0xffffff, 0.5);
  g.lineBetween(28, 66, 68, 30);
  g.generateTexture("pd-hazard-firmware", 96, 96);

  g.clear();
  g.fillStyle(0x180510, 1);
  g.fillRoundedRect(10, 18, 76, 60, 8);
  g.lineStyle(4, 0xff6e91, 0.9);
  g.strokeRect(18, 26, 60, 44);
  g.lineStyle(3, 0xffffff, 0.5);
  g.lineBetween(34, 20, 34, 76);
  g.lineStyle(2, 0xff6e91, 0.42);
  for (let index = 0; index < 5; index += 1) {
    const y = 30 + index * 9;
    g.lineBetween(18, y, 78, y);
  }
  g.generateTexture("pd-hazard-scan", 96, 96);

  g.clear();
  g.fillStyle(0x07131a, 1);
  g.fillRect(12, 24, 72, 48);
  g.lineStyle(5, 0xb9ccff, 0.85);
  g.lineBetween(12, 28, 84, 68);
  g.lineBetween(12, 68, 84, 28);
  g.generateTexture("pd-hazard-permission", 96, 96);

  g.clear();
  g.fillStyle(0x1c0705, 1);
  g.fillCircle(48, 48, 42);
  g.lineStyle(5, 0xff7a47, 0.9);
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    g.lineBetween(48, 48, 48 + Math.cos(angle) * 42, 48 + Math.sin(angle) * 42);
  }
  g.generateTexture("pd-hazard-firewall", 96, 96);

  g.clear();
  g.fillStyle(0x041715, 1);
  g.fillCircle(48, 48, 40);
  g.lineStyle(3, 0x7affea, 0.85);
  g.strokeCircle(48, 48, 18);
  g.strokeCircle(48, 48, 34);
  g.fillStyle(0x95fff1, 0.8);
  g.fillRect(22, 46, 52, 4);
  g.generateTexture("pd-hazard-sync", 96, 96);

  g.clear();
  g.fillStyle(0x101800, 1);
  g.fillCircle(48, 48, 38);
  g.fillStyle(0xb8ff6a, 0.9);
  g.fillCircle(34, 48, 16);
  g.fillCircle(58, 42, 22);
  g.fillCircle(62, 62, 12);
  g.generateTexture("pd-hazard-sludge", 96, 96);

  g.clear();
  g.fillStyle(0x24050b, 1);
  g.fillCircle(48, 48, 42);
  g.fillStyle(0xffd1dc, 0.95);
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2;
    g.fillTriangle(48, 48, 48 + Math.cos(angle - 0.08) * 42, 48 + Math.sin(angle - 0.08) * 42, 48 + Math.cos(angle + 0.08) * 42, 48 + Math.sin(angle + 0.08) * 42);
  }
  g.generateTexture("pd-hazard-shredder", 96, 96);
}

function createCodeLifeBossTextures(g: Phaser.GameObjects.Graphics): void {
  createBossTexture(g, "boss-gateway-warden", 0x42f5b9, "gateway");
  createBossTexture(g, "boss-firewall-heart", 0xff4f2e, "firewall");
  createBossTexture(g, "boss-sync-mother", 0x65d7ff, "sync");
  createBossTexture(g, "boss-lens-keeper", 0xb6e1ff, "lens");
  createBossTexture(g, "boss-print-queue-beast", 0xfff2c7, "printer");
  createBossTexture(g, "boss-wake-word-guard", 0xe3a9ff, "speaker");
  createBossTexture(g, "boss-firmware-burner", 0xffc247, "board");
}

function createBossTexture(g: Phaser.GameObjects.Graphics, key: string, color: number, kind: string): void {
  g.clear();
  g.fillStyle(0x09030a, 1);
  g.fillEllipse(64, 48, 116, 76);
  g.fillStyle(color, 0.92);
  g.fillEllipse(64, 48, 88, 54);
  g.lineStyle(4, 0xffffff, 0.34);
  if (kind === "lens") {
    g.strokeCircle(64, 48, 28);
    g.fillStyle(0xffffff, 0.86);
    g.fillCircle(64, 48, 10);
  } else if (kind === "printer") {
    g.fillStyle(0x111111, 0.75);
    g.fillRect(26, 42, 76, 12);
    g.lineBetween(30, 28, 98, 68);
  } else if (kind === "speaker") {
    g.strokeCircle(64, 48, 18);
    g.strokeCircle(64, 48, 34);
  } else if (kind === "board") {
    for (let index = 0; index < 6; index += 1) {
      g.fillStyle(0x09030a, 0.85);
      g.fillRect(30 + index * 11, 18, 5, 16);
      g.fillRect(30 + index * 11, 62, 5, 16);
    }
  } else if (kind === "firewall") {
    g.lineBetween(20, 48, 108, 48);
    g.lineBetween(64, 14, 64, 82);
  } else {
    g.strokeRoundedRect(28, 24, 72, 48, 10);
  }
  g.fillStyle(0xff365c, 0.72);
  g.fillCircle(44, 45, 7);
  g.fillCircle(82, 52, 6);
  g.generateTexture(key, 128, 96);
}

function createCodeLifeGateTextures(g: Phaser.GameObjects.Graphics): void {
  createGateTexture(g, "pd-gate-material", 0xf7f0d0, "qr");
  createGateTexture(g, "pd-gate-voiceprint", 0xe3a9ff, "wave");
  createGateTexture(g, "pd-gate-hardware", 0xffc247, "pins");
  createGateTexture(g, "pd-gate-vision", 0xffef9a, "eye");
  createGateTexture(g, "pd-gate-network", 0x7affea, "net");
  createGateTexture(g, "pd-gate-permission", 0xb9ccff, "lock");
}

function createGateTexture(g: Phaser.GameObjects.Graphics, key: string, color: number, motif: string): void {
  g.clear();
  g.fillStyle(0x06080d, 1);
  g.fillRoundedRect(0, 0, 96, 64, 10);
  g.lineStyle(4, color, 0.92);
  g.strokeRoundedRect(6, 6, 84, 52, 8);
  g.fillStyle(color, 0.78);
  if (motif === "qr") {
    for (let x = 18; x <= 62; x += 14) {
      for (let y = 16; y <= 44; y += 14) {
        if ((x + y) % 3 !== 0) g.fillRect(x, y, 8, 8);
      }
    }
  } else if (motif === "wave") {
    for (let index = 0; index < 5; index += 1) g.fillRect(18 + index * 12, 32 - index % 2 * 10, 6, 18 + index % 2 * 12);
  } else if (motif === "pins") {
    for (let index = 0; index < 6; index += 1) g.fillRect(18 + index * 10, 14, 4, 36);
  } else if (motif === "eye") {
    g.strokeEllipse(48, 32, 48, 24);
    g.fillCircle(48, 32, 8);
  } else if (motif === "net") {
    g.fillCircle(28, 24, 5);
    g.fillCircle(66, 22, 5);
    g.fillCircle(48, 44, 5);
    g.lineStyle(3, color, 0.7);
    g.lineBetween(28, 24, 66, 22);
    g.lineBetween(28, 24, 48, 44);
    g.lineBetween(66, 22, 48, 44);
  } else {
    g.fillRect(34, 30, 28, 18);
    g.strokeRoundedRect(38, 16, 20, 20, 8);
  }
  g.generateTexture(key, 96, 64);
}

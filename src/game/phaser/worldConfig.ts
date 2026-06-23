import type { ChapterId } from "../types";

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 900;
export const CURSOR_HUNT_WORLD_WIDTH = 1672;
export const CURSOR_HUNT_WORLD_HEIGHT = 941;
export const WRONG_GATEWAY_WORLD_WIDTH = 2880;
export const WRONG_GATEWAY_WORLD_HEIGHT = 1080;
export const CODE_REBIRTH_WORLD_WIDTH = 1440;
export const CODE_REBIRTH_WORLD_HEIGHT = 2560;
export const TRASH_MOUNTAIN_WORLD_WIDTH = 1440;
export const TRASH_MOUNTAIN_WORLD_HEIGHT = 2600;
export const PLAYER_SPEED = 250;
export const JUMP_SPEED = 480;

export type PlatformDef = readonly [x: number, y: number, width: number, height: number];
export type LadderDef = readonly [x: number, y: number, width: number, height: number];

export interface WorldBounds {
  width: number;
  height: number;
}

export interface ChapterEnemyRoute {
  readonly x: number;
  readonly y: number;
  readonly minX: number;
  readonly maxX: number;
  readonly speed: number;
  readonly hp: number;
  readonly contactDamage: number;
  readonly displayWidth: number;
  readonly displayHeight: number;
}

export const HEALTH_PICKUP_COUNT = 4;

const CURSOR_HUNT_PLATFORM_SURFACE_HEIGHT = 12;

function cursorHuntSurface(
  x: number,
  top: number,
  width: number,
  height = CURSOR_HUNT_PLATFORM_SURFACE_HEIGHT,
): PlatformDef {
  return [x, top + height / 2, width, height];
}

const cursorHuntPlatforms: PlatformDef[] = [
  cursorHuntSurface(CURSOR_HUNT_WORLD_WIDTH / 2, 884, CURSOR_HUNT_WORLD_WIDTH, 18),
  cursorHuntSurface(154, 164, 294),
  cursorHuntSurface(170, 282, 120),
  cursorHuntSurface(480, 256, 285),
  cursorHuntSurface(332, 400, 330),
  cursorHuntSurface(320, 614, 330),
  cursorHuntSurface(300, 710, 190),
  cursorHuntSurface(565, 731, 160),
  cursorHuntSurface(670, 120, 160),
  cursorHuntSurface(755, 342, 54),
  cursorHuntSurface(812, 478, 280),
  cursorHuntSurface(785, 630, 220),
  cursorHuntSurface(1040, 416, 250),
  cursorHuntSurface(1130, 710, 300),
  cursorHuntSurface(1310, 121, 190),
  cursorHuntSurface(1310, 411, 210),
  cursorHuntSurface(1525, 411, 260),
];

const cursorHuntCollectibles = [
  { x: 418, y: 365 },
  { x: 720, y: 330 },
  { x: 1005, y: 382 },
  { x: 1175, y: 704 },
  { x: 1400, y: 378 },
  { x: 520, y: 690 },
  { x: 1540, y: 850 },
] as const;

const cursorHuntHazards = [
  { x: 395, y: 684 },
  { x: 845, y: 525 },
  { x: 1190, y: 815 },
  { x: 1480, y: 510 },
] as const;

function wrongGatewaySurface(x: number, top: number, width: number, height = 22): PlatformDef {
  return [x, top + height / 2, width, height];
}

const wrongGatewayPlatforms: PlatformDef[] = [
  wrongGatewaySurface(340, 982, 680, 28),
  wrongGatewaySurface(1110, 982, 600, 28),
  wrongGatewaySurface(1810, 982, 520, 28),
  wrongGatewaySurface(2540, 982, 680, 28),

  wrongGatewaySurface(176, 895, 210),
  wrongGatewaySurface(438, 812, 210),
  wrongGatewaySurface(706, 720, 260),
  wrongGatewaySurface(1012, 625, 270),
  wrongGatewaySurface(1246, 534, 220),
  wrongGatewaySurface(1510, 440, 260),
  wrongGatewaySurface(806, 344, 360),
  wrongGatewaySurface(1212, 344, 300),
  wrongGatewaySurface(1604, 344, 310),

  wrongGatewaySurface(318, 650, 150),
  wrongGatewaySurface(542, 552, 150),
  wrongGatewaySurface(666, 464, 150),
  wrongGatewaySurface(286, 410, 170),

  wrongGatewaySurface(1820, 500, 260),
  wrongGatewaySurface(2080, 620, 250),
  wrongGatewaySurface(2356, 740, 240),
  wrongGatewaySurface(2612, 862, 470, 28),

  wrongGatewaySurface(1710, 720, 150),
  wrongGatewaySurface(1936, 812, 150),
  wrongGatewaySurface(2210, 884, 150),

  wrongGatewaySurface(2264, 408, 180),
  wrongGatewaySurface(2484, 520, 180),
  wrongGatewaySurface(2708, 640, 180),
];

const wrongGatewayLadders: LadderDef[] = [
  [330, 892, 64, 180],
  [1168, 758, 64, 442],
  [2160, 808, 64, 350],
  [2520, 700, 64, 340],
];

const wrongGatewayHazards = [
  { x: 520, y: 812 },
  { x: 1840, y: 812 },
] as const;

const codeRebirthPlatforms: PlatformDef[] = [
  [CODE_REBIRTH_WORLD_WIDTH / 2, 2427, CODE_REBIRTH_WORLD_WIDTH, 47],
  [456, 2258, 360, 39],
  [704, 2098, 340, 39],
  [944, 1942, 360, 39],
  [744, 1786, 360, 39],
  [512, 1630, 380, 39],
  [314, 1474, 340, 39],
  [542, 1318, 360, 39],
  [760, 1162, 380, 39],
  [1012, 1006, 360, 39],
  [804, 850, 360, 39],
  [560, 694, 400, 39],
  [330, 538, 360, 39],
  [548, 382, 420, 39],
  [806, 246, 360, 39],
];

const codeRebirthCollectibles = [
  { x: 456, y: 2210 },
  { x: 944, y: 1894 },
  { x: 512, y: 1582 },
  { x: 542, y: 1270 },
  { x: 1012, y: 958 },
  { x: 330, y: 490 },
  { x: 806, y: 198 },
] as const;

const codeRebirthHazards = [
  { x: 704, y: 2055 },
  { x: 744, y: 1743 },
  { x: 760, y: 1119 },
  { x: 548, y: 339 },
] as const;

const trashMountainPlatforms: PlatformDef[] = [
  [720, 2528, 1380, 84],
  [250, 2367, 380, 34],
  [610, 2227, 360, 34],
  [980, 2087, 380, 34],
  [690, 1947, 320, 34],
  [390, 1807, 360, 34],
  [720, 1667, 330, 34],
  [1080, 1527, 360, 34],
  [820, 1387, 330, 34],
  [500, 1247, 360, 34],
  [850, 1107, 330, 34],
  [1160, 967, 360, 34],
  [840, 827, 330, 34],
  [520, 687, 360, 34],
  [860, 547, 340, 34],
  [1135, 407, 340, 34],
  [1180, 302, 360, 34],
];

const trashMountainCollectibles = [
  { x: 245, y: 2310 },
  { x: 650, y: 2170 },
  { x: 1015, y: 2030 },
  { x: 410, y: 1760 },
  { x: 1110, y: 1480 },
  { x: 525, y: 642 },
  { x: 1185, y: 352 },
] as const;

const trashMountainHazards = [
  { x: 520, y: 2460 },
  { x: 870, y: 1900 },
  { x: 610, y: 1200 },
  { x: 1020, y: 920 },
  { x: 690, y: 505 },
] as const;

export function getWorldBounds(chapterId: ChapterId): WorldBounds {
  if (chapterId === "cursor-hunt") {
    return {
      width: CURSOR_HUNT_WORLD_WIDTH,
      height: CURSOR_HUNT_WORLD_HEIGHT,
    };
  }
  if (chapterId === "wrong-gateway") {
    return {
      width: WRONG_GATEWAY_WORLD_WIDTH,
      height: WRONG_GATEWAY_WORLD_HEIGHT,
    };
  }
  if (chapterId === "code-rebirth") {
    return {
      width: CODE_REBIRTH_WORLD_WIDTH,
      height: CODE_REBIRTH_WORLD_HEIGHT,
    };
  }
  if (chapterId === "trash-mountain") {
    return {
      width: TRASH_MOUNTAIN_WORLD_WIDTH,
      height: TRASH_MOUNTAIN_WORLD_HEIGHT,
    };
  }

  return {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
  };
}

export function getPlatformDefs(chapterId: ChapterId, chapterIndex: number): PlatformDef[] {
  if (chapterId === "cursor-hunt") {
    return [...cursorHuntPlatforms];
  }
  if (chapterId === "wrong-gateway") {
    return [...wrongGatewayPlatforms];
  }
  if (chapterId === "code-rebirth") {
    return [...codeRebirthPlatforms];
  }
  if (chapterId === "trash-mountain") {
    return [...trashMountainPlatforms];
  }

  const yOffset = chapterIndex % 2 === 0 ? 0 : 32;
  return [
    [WORLD_WIDTH / 2, 850, WORLD_WIDTH, 80],
    [280, 690 - yOffset, 340, 32],
    [690, 590 + yOffset, 310, 32],
    [1050, 705, 270, 32],
    [1430, 585 - yOffset, 330, 32],
    [1780, 700 + yOffset, 280, 32],
    [2110, 620, 260, 32],
    [1320, 430, 220, 26],
  ];
}

export function getLadderDefs(chapterId: ChapterId): LadderDef[] {
  if (chapterId === "wrong-gateway") {
    return [...wrongGatewayLadders];
  }

  return [];
}

export function getCollectibleCount(chapterId: ChapterId): number {
  if (chapterId === "cursor-hunt") {
    return cursorHuntCollectibles.length;
  }
  if (chapterId === "wrong-gateway") {
    return 0;
  }
  if (chapterId === "code-rebirth") {
    return codeRebirthCollectibles.length;
  }
  if (chapterId === "trash-mountain") {
    return trashMountainCollectibles.length;
  }

  return chapterId === "leder-d-drive" ? 9 : 7;
}

export function getCollectiblePosition(
  index: number,
  chapterId: ChapterId,
  chapterIndex: number,
): { x: number; y: number } {
  if (chapterId === "cursor-hunt") {
    return cursorHuntCollectibles[index] ?? cursorHuntCollectibles[0];
  }
  if (chapterId === "code-rebirth") {
    return codeRebirthCollectibles[index] ?? codeRebirthCollectibles[0];
  }
  if (chapterId === "trash-mountain") {
    return trashMountainCollectibles[index] ?? trashMountainCollectibles[0];
  }

  return {
    x: 260 + index * 250,
    y: 520 - (index % 3) * 90 + (chapterIndex % 2) * 30,
  };
}

function platformTop(platform: PlatformDef): number {
  return platform[1] - platform[3] / 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getWalkablePlatforms(chapterId: ChapterId, chapterIndex: number): PlatformDef[] {
  return getPlatformDefs(chapterId, chapterIndex)
    .filter((platform) => platform[2] >= 120)
    .sort((a, b) => platformTop(b) - platformTop(a));
}

export function getHealthPickupPosition(
  index: number,
  chapterId: ChapterId,
  chapterIndex: number,
): { x: number; y: number } {
  const platforms = getWalkablePlatforms(chapterId, chapterIndex);
  const bounds = getWorldBounds(chapterId);
  const platform =
    platforms[
      Math.min(
        platforms.length - 1,
        Math.round((clamp(index, 0, HEALTH_PICKUP_COUNT - 1) / Math.max(1, HEALTH_PICKUP_COUNT - 1)) * (platforms.length - 1)),
      )
    ] ?? [bounds.width / 2, bounds.height - 70, 320, 28];
  const offsets = [-0.28, 0.26, -0.2, 0.32] as const;
  const x = clamp(platform[0] + platform[2] * offsets[index % offsets.length], 48, bounds.width - 48);

  return {
    x,
    y: clamp(platformTop(platform) - 38, 42, bounds.height - 48),
  };
}

export function getThrowSkillPickupPosition(
  chapterId: ChapterId,
  chapterIndex: number,
  preferStartPlatform = false,
): { x: number; y: number } {
  const platforms = getWalkablePlatforms(chapterId, chapterIndex);
  const bounds = getWorldBounds(chapterId);
  const platform =
    platforms[preferStartPlatform ? 0 : Math.min(platforms.length - 1, Math.max(0, Math.floor(platforms.length * 0.22)))] ?? [
      bounds.width / 2,
      bounds.height - 92,
      320,
      28,
    ];
  const x = preferStartPlatform
    ? clamp(platform[0] - platform[2] * 0.38, 56, bounds.width - 56)
    : clamp(platform[0] + Math.min(180, platform[2] * 0.22), 56, bounds.width - 56);

  return {
    x,
    y: clamp(platformTop(platform) - 46, 52, bounds.height - 56),
  };
}

export function getChapterEnemyRoutes(chapterId: ChapterId, chapterIndex: number): ChapterEnemyRoute[] {
  const platforms = getWalkablePlatforms(chapterId, chapterIndex);
  const bounds = getWorldBounds(chapterId);
  const spawnPlatforms = platforms.length > 0 ? platforms : [[bounds.width / 2, bounds.height - 80, 420, 32] as PlatformDef];
  const enemyCount = Math.min(8, Math.max(1, 1 + Math.floor(chapterIndex / 2)));
  const hp = Math.min(4, 1 + Math.floor((chapterIndex - 1) / 4));
  const contactDamage = 20 + Math.floor((chapterIndex - 1) / 5) * 20;

  return Array.from({ length: enemyCount }, (_, index) => {
    const platform = spawnPlatforms[(index * 2 + chapterIndex) % spawnPlatforms.length];
    const top = platformTop(platform);
    const platformLeft = platform[0] - platform[2] / 2 + 34;
    const platformRight = platform[0] + platform[2] / 2 - 34;
    const offsetDirection = index % 2 === 0 ? -1 : 1;
    const x = clamp(platform[0] + offsetDirection * Math.min(platform[2] * 0.22, 170), platformLeft, platformRight);
    const patrolSpan = Math.min(platform[2] - 72, 220 + chapterIndex * 18 + index * 10);
    const minX = clamp(x - patrolSpan / 2, platformLeft, platformRight);
    const maxX = clamp(x + patrolSpan / 2, platformLeft, platformRight);
    const speed = (index % 2 === 0 ? 1 : -1) * (42 + chapterIndex * 6 + index * 4);
    const displayWidth = Math.min(58, 34 + chapterIndex * 1.7);
    const displayHeight = Math.min(42, 24 + chapterIndex * 1.15);

    return {
      x,
      y: clamp(top - displayHeight / 2 - 2, 32, bounds.height - 32),
      minX,
      maxX,
      speed,
      hp,
      contactDamage,
      displayWidth,
      displayHeight,
    };
  });
}

export function getHazardCount(chapterId: ChapterId, chapterIndex: number): number {
  if (chapterId === "cursor-hunt") {
    return cursorHuntHazards.length;
  }
  if (chapterId === "wrong-gateway") {
    return 0;
  }
  if (chapterId === "code-rebirth") {
    return codeRebirthHazards.length;
  }
  if (chapterId === "trash-mountain") {
    return trashMountainHazards.length;
  }

  return chapterIndex < 4 ? 4 : 5;
}

export function getHazardPosition(index: number, chapterId: ChapterId): { x: number; y: number } {
  if (chapterId === "cursor-hunt") {
    return cursorHuntHazards[index] ?? cursorHuntHazards[0];
  }
  if (chapterId === "wrong-gateway") {
    return wrongGatewayHazards[index] ?? wrongGatewayHazards[0];
  }
  if (chapterId === "code-rebirth") {
    return codeRebirthHazards[index] ?? codeRebirthHazards[0];
  }
  if (chapterId === "trash-mountain") {
    return trashMountainHazards[index] ?? trashMountainHazards[0];
  }

  return {
    x: 430 + index * 370,
    y: 812,
  };
}

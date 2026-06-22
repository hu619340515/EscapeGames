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
  [250, 2294, 330, 34],
  [620, 2118, 310, 34],
  [1038, 1944, 340, 34],
  [780, 1766, 280, 34],
  [390, 1588, 330, 34],
  [742, 1408, 290, 34],
  [1110, 1228, 330, 34],
  [840, 1044, 300, 34],
  [460, 862, 340, 34],
  [805, 682, 290, 34],
  [1120, 512, 350, 34],
  [776, 354, 430, 34],
  [1210, 324, 260, 34],
];

const trashMountainCollectibles = [
  { x: 245, y: 2254 },
  { x: 650, y: 2078 },
  { x: 1075, y: 1904 },
  { x: 410, y: 1548 },
  { x: 1110, y: 1188 },
  { x: 470, y: 822 },
  { x: 1185, y: 472 },
] as const;

const trashMountainHazards = [
  { x: 520, y: 2460 },
  { x: 900, y: 1850 },
  { x: 610, y: 1338 },
  { x: 1020, y: 936 },
  { x: 690, y: 594 },
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

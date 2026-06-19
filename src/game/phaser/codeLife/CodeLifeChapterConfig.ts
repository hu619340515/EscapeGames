import type { AbilityId, BossId, ChapterId } from "../../types";

export const CODE_LIFE_CHAPTER_IDS = [
  "code-rebirth",
  "trash-mountain",
  "p-drive",
  "leder-d-drive",
  "c-wall",
  "leder-c-drive",
  "router-core",
  "nas-graveyard",
  "camera-eye",
  "printer-belly",
  "speaker-voiceprint",
  "dev-board",
] as const satisfies readonly ChapterId[];

export type CodeLifeChapterId = (typeof CODE_LIFE_CHAPTER_IDS)[number];

export type CodeLifeSurfaceKind =
  | "wall"
  | "ceiling"
  | "floor"
  | "mesh"
  | "rail"
  | "cable"
  | "pipe"
  | "shell";

export type CodeLifeHazardKind =
  | "shredder"
  | "delete-scan"
  | "cache-sludge"
  | "sync-storm"
  | "permission-laser"
  | "firewall-pulse"
  | "optic-burn"
  | "printer-roller"
  | "audio-feedback"
  | "firmware-flash";

export type CodeLifeEnemyKind =
  | "mechanical-worm"
  | "cleanup-process"
  | "checksum-drone"
  | "index-spider"
  | "permission-sentinel"
  | "firewall-swarm"
  | "sync-echo"
  | "lens-sentry"
  | "print-daemon"
  | "voiceprint-probe"
  | "gpio-warden";

export interface CodeLifePoint {
  readonly x: number;
  readonly y: number;
}

export interface CodeLifeRect extends CodeLifePoint {
  readonly width: number;
  readonly height: number;
}

export interface CodeLifeWorld {
  readonly width: number;
  readonly height: number;
}

export interface CodeLifeExit extends CodeLifeRect {
  readonly label: string;
  readonly to: ChapterId | "ending-choice";
  readonly gate?: AbilityId;
}

export interface CodeLifeGripSurface extends CodeLifeRect {
  readonly kind: CodeLifeSurfaceKind;
  readonly label: string;
}

export interface CodeLifeHazard extends CodeLifeRect {
  readonly kind: CodeLifeHazardKind;
  readonly label: string;
  readonly damage: number;
  readonly angleDeg?: number;
  readonly fovDeg?: number;
  readonly blindSpotRects?: readonly CodeLifeRect[];
}

export interface CodeLifePassage extends CodeLifeRect {
  readonly label: string;
  readonly gate?: AbilityId;
  readonly to: string;
}

export interface CodeLifeBiomassCache extends CodeLifeRect {
  readonly label: string;
  readonly biomass: number;
  readonly gate?: AbilityId;
}

export interface CodeLifeEnemySpawn extends CodeLifePoint {
  readonly kind: CodeLifeEnemyKind;
  readonly count: number;
  readonly patrolRadius: number;
  readonly requiredForExit?: boolean;
  readonly turretOnly?: boolean;
}

export interface CodeLifeTurret extends CodeLifePoint {
  readonly id: string;
  readonly label: string;
  readonly mount: "wall" | "platform";
  readonly angleDeg: number;
  readonly range: number;
  readonly cooldownMs: number;
  readonly projectileSpeed: number;
  readonly damage: number;
  readonly requiredForExit?: boolean;
}

export interface CodeLifeAbilityGate extends CodeLifeRect {
  readonly ability: AbilityId;
  readonly label: string;
}

export interface CodeLifeBossArena extends CodeLifeRect {
  readonly bosses: readonly BossId[];
  readonly lockUntilDefeated: boolean;
  readonly hint: string;
  readonly anchorPoints: readonly CodeLifePoint[];
}

export interface CodeLifeColorAccents {
  readonly primary: number;
  readonly secondary: number;
  readonly biomass: number;
  readonly danger: number;
  readonly ambient: number;
}

export interface CodeLifeChapterConfig {
  readonly chapterId: CodeLifeChapterId;
  readonly world: CodeLifeWorld;
  readonly spawn: CodeLifePoint;
  readonly exit: CodeLifeExit;
  readonly backgroundKey?: string;
  readonly foregroundKey?: string;
  readonly hideSurfaceSprites?: boolean;
  readonly gripSurfaces: readonly CodeLifeGripSurface[];
  readonly hazards: readonly CodeLifeHazard[];
  readonly vents: readonly CodeLifePassage[];
  readonly fileShells: readonly CodeLifePassage[];
  readonly biomassCaches: readonly CodeLifeBiomassCache[];
  readonly enemySpawns: readonly CodeLifeEnemySpawn[];
  readonly turrets?: readonly CodeLifeTurret[];
  readonly abilityGates: readonly CodeLifeAbilityGate[];
  readonly bossIds: readonly BossId[];
  readonly bossArena?: CodeLifeBossArena;
  readonly colorAccents: CodeLifeColorAccents;
}

const recycleAccents: CodeLifeColorAccents = {
  primary: 0xff365f,
  secondary: 0x4a101e,
  biomass: 0xd92048,
  danger: 0xffd1dc,
  ambient: 0x17070b,
};

const trashAccents: CodeLifeColorAccents = {
  primary: 0xff8a3d,
  secondary: 0x4f3c2a,
  biomass: 0xb8ff6a,
  danger: 0xffef9a,
  ambient: 0x17120d,
};

const networkAccents: CodeLifeColorAccents = {
  primary: 0x4cffd7,
  secondary: 0x1a7470,
  biomass: 0x8cffc8,
  danger: 0xffd76a,
  ambient: 0x061416,
};

const dDriveAccents: CodeLifeColorAccents = {
  primary: 0xffcf6b,
  secondary: 0x856f47,
  biomass: 0xfff0a3,
  danger: 0x77c9ff,
  ambient: 0x17161e,
};

const cDriveAccents: CodeLifeColorAccents = {
  primary: 0xb9d6ff,
  secondary: 0x4d6b93,
  biomass: 0xa9ffed,
  danger: 0xff6e6e,
  ambient: 0x081018,
};

const deviceAccents: CodeLifeColorAccents = {
  primary: 0xffc247,
  secondary: 0x6d727a,
  biomass: 0xf7f0d0,
  danger: 0xff5a5f,
  ambient: 0x101014,
};

export const codeLifeChapterConfigs = {
  "code-rebirth": {
    chapterId: "code-rebirth",
    world: { width: 2160, height: 3840 },
    spawn: { x: 470, y: 3560 },
    exit: { x: 1170, y: 250, width: 190, height: 150, label: "trash-mountain uplink", to: "trash-mountain" },
    backgroundKey: "code-rebirth-bg",
    foregroundKey: "code-rebirth-fg",
    hideSurfaceSprites: true,
    gripSurfaces: [
      { x: 260, y: 3640, width: 620, height: 70, kind: "floor", label: "rebirth basin floor" },
      { x: 420, y: 3220, width: 90, height: 430, kind: "wall", label: "boot vein wall" },
      { x: 680, y: 3060, width: 540, height: 58, kind: "floor", label: "syntax scaffold" },
      { x: 1240, y: 2780, width: 92, height: 440, kind: "wall", label: "compiled spine" },
      { x: 900, y: 2620, width: 560, height: 58, kind: "floor", label: "worm staging shelf" },
      { x: 500, y: 2300, width: 90, height: 430, kind: "wall", label: "variable ladder wall" },
      { x: 640, y: 2150, width: 600, height: 58, kind: "rail", label: "cache artery rail" },
      { x: 1320, y: 1840, width: 88, height: 430, kind: "wall", label: "brace root wall" },
      { x: 1000, y: 1680, width: 560, height: 58, kind: "floor", label: "turret balcony shelf" },
      { x: 520, y: 1370, width: 90, height: 420, kind: "wall", label: "comment shaft wall" },
      { x: 640, y: 1210, width: 610, height: 58, kind: "rail", label: "infiltration rail" },
      { x: 1360, y: 900, width: 88, height: 420, kind: "wall", label: "permission root wall" },
      { x: 980, y: 760, width: 620, height: 58, kind: "floor", label: "worm kill shelf" },
      { x: 600, y: 520, width: 90, height: 360, kind: "wall", label: "final climb wall" },
      { x: 930, y: 410, width: 500, height: 56, kind: "floor", label: "trash-mountain approach" },
    ],
    hazards: [
      { x: 720, y: 3340, width: 260, height: 130, kind: "cache-sludge", label: "stale cache sump", damage: 12 },
      { x: 1110, y: 2420, width: 260, height: 160, kind: "delete-scan", label: "unstable parse flash", damage: 18 },
      { x: 660, y: 1540, width: 230, height: 160, kind: "cache-sludge", label: "leaking heap pool", damage: 14 },
      { x: 1230, y: 620, width: 240, height: 150, kind: "delete-scan", label: "exit checksum sweep", damage: 18 },
    ],
    vents: [
      { x: 540, y: 3270, width: 90, height: 90, label: "boot vein duct", to: "syntax scaffold" },
      { x: 590, y: 2250, width: 88, height: 92, label: "cache artery slit", gate: "infiltrate", to: "cache artery rail" },
      { x: 1260, y: 1120, width: 92, height: 90, label: "permission root duct", gate: "infiltrate", to: "worm kill shelf" },
    ],
    fileShells: [
      { x: 135, y: 3460, width: 160, height: 130, label: "zero one shell", to: "rebirth basin floor" },
      { x: 1010, y: 2470, width: 170, height: 130, label: "compiled husk", gate: "coil", to: "worm staging shelf" },
      { x: 1070, y: 580, width: 160, height: 120, label: "old prompt capsule", to: "trash-mountain uplink" },
    ],
    biomassCaches: [
      { x: 120, y: 3530, width: 84, height: 84, label: "syntax marrow", biomass: 2 },
      { x: 980, y: 2860, width: 86, height: 86, label: "prompt echo clot", biomass: 2 },
      { x: 720, y: 2050, width: 90, height: 90, label: "rebuilt code node", biomass: 3 },
      { x: 1100, y: 1500, width: 88, height: 88, label: "stable cache heart", biomass: 3 },
      { x: 1030, y: 690, width: 88, height: 88, label: "worm logic marrow", biomass: 3, gate: "devour-code" },
    ],
    enemySpawns: [
      { x: 910, y: 2920, kind: "mechanical-worm", count: 1, patrolRadius: 260, requiredForExit: true, turretOnly: true },
      { x: 1320, y: 2540, kind: "mechanical-worm", count: 1, patrolRadius: 240, requiredForExit: true, turretOnly: true },
      { x: 720, y: 1980, kind: "mechanical-worm", count: 1, patrolRadius: 270, requiredForExit: true, turretOnly: true },
      { x: 1240, y: 1500, kind: "mechanical-worm", count: 1, patrolRadius: 260, requiredForExit: true, turretOnly: true },
      { x: 1070, y: 690, kind: "mechanical-worm", count: 1, patrolRadius: 230, requiredForExit: true, turretOnly: true },
    ],
    turrets: [
      { id: "rebirth-turret-01", x: 720, y: 3026, label: "boot vein platform turret", mount: "platform", angleDeg: -52, range: 650, cooldownMs: 980, projectileSpeed: 520, damage: 6, requiredForExit: true },
      { id: "rebirth-turret-02", x: 1280, y: 2900, label: "compiled spine wall turret", mount: "wall", angleDeg: 200, range: 690, cooldownMs: 1040, projectileSpeed: 540, damage: 6, requiredForExit: true },
      { id: "rebirth-turret-03", x: 760, y: 2116, label: "cache artery platform turret", mount: "platform", angleDeg: -24, range: 700, cooldownMs: 920, projectileSpeed: 560, damage: 7, requiredForExit: true },
      { id: "rebirth-turret-04", x: 1406, y: 1390, label: "permission root wall turret", mount: "wall", angleDeg: 212, range: 680, cooldownMs: 980, projectileSpeed: 550, damage: 7, requiredForExit: true },
      { id: "rebirth-turret-05", x: 1130, y: 726, label: "uplink crown platform turret", mount: "platform", angleDeg: 82, range: 620, cooldownMs: 1100, projectileSpeed: 530, damage: 8, requiredForExit: true },
    ],
    abilityGates: [
      { x: 390, y: 3190, width: 150, height: 210, ability: "cling", label: "wall cling calibration" },
      { x: 1010, y: 2460, width: 170, height: 150, ability: "coil", label: "drag loose cache" },
      { x: 600, y: 2190, width: 150, height: 150, ability: "infiltrate", label: "shell infiltration drill" },
      { x: 1010, y: 650, width: 170, height: 150, ability: "devour-code", label: "consume worm logic" },
    ],
    bossIds: [],
    colorAccents: trashAccents,
  },
  "trash-mountain": {
    chapterId: "trash-mountain",
    world: { width: 3600, height: 2200 },
    spawn: { x: 180, y: 1980 },
    exit: { x: 3340, y: 260, width: 170, height: 190, label: "my-computer spillway", to: "p-drive", gate: "ping-sense" },
    gripSurfaces: [
      { x: 80, y: 2010, width: 640, height: 52, kind: "floor", label: "garbage basin" },
      { x: 460, y: 1680, width: 64, height: 480, kind: "wall", label: "old image cliff" },
      { x: 710, y: 1460, width: 620, height: 48, kind: "floor", label: "thumbnail avalanche shelf" },
      { x: 1180, y: 1120, width: 70, height: 520, kind: "wall", label: "zip gorge wall" },
      { x: 1420, y: 830, width: 780, height: 48, kind: "ceiling", label: "temp-file overhang" },
      { x: 1920, y: 1280, width: 600, height: 50, kind: "floor", label: "broken function ridge" },
      { x: 2380, y: 760, width: 70, height: 500, kind: "wall", label: "gateway residue spine" },
      { x: 2700, y: 520, width: 560, height: 48, kind: "rail", label: "permission-shard rail" },
      { x: 3060, y: 340, width: 420, height: 46, kind: "floor", label: "LAN spill ledge" },
    ],
    hazards: [
      { x: 640, y: 1840, width: 330, height: 160, kind: "cache-sludge", label: "cache bog", damage: 16 },
      { x: 1040, y: 1340, width: 220, height: 360, kind: "shredder", label: "recycle gear echo", damage: 32 },
      { x: 1710, y: 920, width: 380, height: 120, kind: "sync-storm", label: "temp-file waterfall", damage: 24 },
      { x: 2500, y: 980, width: 280, height: 220, kind: "delete-scan", label: "guardian ping sweep", damage: 22 },
      { x: 2780, y: 520, width: 320, height: 120, kind: "permission-laser", label: "permission shard beam", damage: 26 },
      { x: 3090, y: 1420, width: 300, height: 170, kind: "cache-sludge", label: "thumbnail sink", damage: 18 },
    ],
    vents: [
      { x: 520, y: 1540, width: 88, height: 92, label: "thumbnail crack", to: "image cliff shortcut" },
      { x: 1320, y: 1060, width: 92, height: 86, label: "zip gorge seam", gate: "infiltrate", to: "temp-file overhang" },
      { x: 2620, y: 680, width: 90, height: 90, label: "LAN packet slit", gate: "ping-sense", to: "LAN spill ledge" },
    ],
    fileShells: [
      { x: 780, y: 1350, width: 180, height: 130, label: "old photo husk", to: "thumbnail avalanche shelf" },
      { x: 1690, y: 1170, width: 190, height: 140, label: "broken project shell", gate: "coil", to: "function ridge" },
      { x: 2920, y: 430, width: 180, height: 130, label: "gateway remnant shell", to: "LAN spill ledge" },
    ],
    biomassCaches: [
      { x: 300, y: 1900, width: 92, height: 92, label: "discarded code chunk", biomass: 2 },
      { x: 880, y: 1390, width: 96, height: 96, label: "cache bog bloom", biomass: 3 },
      { x: 1770, y: 1210, width: 90, height: 90, label: "function marrow", biomass: 2 },
      { x: 2480, y: 660, width: 98, height: 98, label: "permission shard nest", biomass: 4 },
      { x: 3150, y: 300, width: 90, height: 90, label: "LAN wake clot", biomass: 3, gate: "ping-sense" },
    ],
    enemySpawns: [
      { x: 730, y: 1760, kind: "cleanup-process", count: 3, patrolRadius: 360 },
      { x: 1560, y: 1020, kind: "checksum-drone", count: 2, patrolRadius: 300 },
      { x: 2360, y: 920, kind: "permission-sentinel", count: 2, patrolRadius: 280 },
      { x: 3040, y: 460, kind: "cleanup-process", count: 3, patrolRadius: 340 },
    ],
    abilityGates: [
      { x: 1260, y: 990, width: 160, height: 160, ability: "infiltrate", label: "zip seam crawl" },
      { x: 2140, y: 720, width: 170, height: 170, ability: "devour-code", label: "eat guardian residue" },
      { x: 3140, y: 250, width: 180, height: 180, ability: "ping-sense", label: "wake LAN route" },
    ],
    bossIds: ["gateway-warden"],
    bossArena: {
      x: 2460,
      y: 310,
      width: 760,
      height: 620,
      bosses: ["gateway-warden"],
      lockUntilDefeated: true,
      hint: "Bait the warden through permission shard beams, then ping the exposed LAN scar.",
      anchorPoints: [
        { x: 2550, y: 800 },
        { x: 2850, y: 430 },
        { x: 3110, y: 720 },
      ],
    },
    colorAccents: trashAccents,
  },
  "p-drive": {
    chapterId: "p-drive",
    world: { width: 2800, height: 1200 },
    spawn: { x: 150, y: 820 },
    exit: { x: 2580, y: 470, width: 140, height: 210, label: "Leder D drive drop", to: "leder-d-drive" },
    gripSurfaces: [
      { x: 80, y: 830, width: 520, height: 46, kind: "floor", label: "network location lip" },
      { x: 470, y: 560, width: 500, height: 44, kind: "rail", label: "shared folder rail" },
      { x: 870, y: 300, width: 58, height: 430, kind: "wall", label: "drive-letter pillar" },
      { x: 1110, y: 180, width: 650, height: 42, kind: "ceiling", label: "sync stream roof" },
      { x: 1570, y: 610, width: 560, height: 46, kind: "floor", label: "device-name shelf" },
      { x: 1970, y: 380, width: 60, height: 400, kind: "wall", label: "mapped bridge mast" },
      { x: 2230, y: 780, width: 430, height: 46, kind: "floor", label: "remote share lip" },
    ],
    hazards: [
      { x: 700, y: 720, width: 300, height: 120, kind: "sync-storm", label: "disconnect gust", damage: 18 },
      { x: 1340, y: 310, width: 250, height: 200, kind: "sync-storm", label: "credential drift", damage: 20 },
      { x: 2140, y: 620, width: 260, height: 150, kind: "firewall-pulse", label: "share timeout pulse", damage: 20 },
    ],
    vents: [
      { x: 610, y: 480, width: 92, height: 86, label: "shared folder slit", gate: "lan-traverse", to: "sync stream roof" },
      { x: 1640, y: 500, width: 90, height: 90, label: "mapped drive vent", gate: "lan-traverse", to: "remote share lip" },
    ],
    fileShells: [
      { x: 370, y: 710, width: 160, height: 120, label: "shortcut shell", to: "shared folder rail" },
      { x: 1240, y: 720, width: 170, height: 130, label: "device alias husk", to: "device shelf" },
      { x: 2330, y: 650, width: 170, height: 130, label: "cached credential shell", gate: "infiltrate", to: "D drive drop" },
    ],
    biomassCaches: [
      { x: 300, y: 750, width: 84, height: 84, label: "sync crumb", biomass: 2 },
      { x: 1020, y: 210, width: 86, height: 86, label: "shared index knot", biomass: 2 },
      { x: 1780, y: 520, width: 90, height: 90, label: "device-name residue", biomass: 3 },
      { x: 2380, y: 710, width: 90, height: 90, label: "remote share clot", biomass: 3 },
    ],
    enemySpawns: [
      { x: 730, y: 520, kind: "checksum-drone", count: 2, patrolRadius: 260 },
      { x: 1840, y: 570, kind: "sync-echo", count: 2, patrolRadius: 300 },
    ],
    abilityGates: [
      { x: 560, y: 450, width: 150, height: 150, ability: "lan-traverse", label: "enter shared stream" },
      { x: 1540, y: 470, width: 160, height: 160, ability: "lan-traverse", label: "cross mapped bridge" },
    ],
    bossIds: [],
    colorAccents: networkAccents,
  },
  "leder-d-drive": {
    chapterId: "leder-d-drive",
    world: { width: 4200, height: 1800 },
    spawn: { x: 170, y: 1520 },
    exit: { x: 3900, y: 260, width: 170, height: 210, label: "C wall outer gate", to: "c-wall", gate: "reverse-index" },
    gripSurfaces: [
      { x: 80, y: 1530, width: 680, height: 52, kind: "floor", label: "downloads swamp bank" },
      { x: 530, y: 1180, width: 620, height: 48, kind: "floor", label: "installer pile" },
      { x: 1000, y: 820, width: 70, height: 540, kind: "wall", label: "project folder trunk" },
      { x: 1320, y: 470, width: 760, height: 46, kind: "ceiling", label: "asset cave ceiling" },
      { x: 1840, y: 1010, width: 620, height: 50, kind: "floor", label: "duplicate maze shelf" },
      { x: 2350, y: 610, width: 70, height: 520, kind: "wall", label: "backup layer wall" },
      { x: 2700, y: 310, width: 720, height: 44, kind: "rail", label: "search-index web" },
      { x: 3240, y: 880, width: 610, height: 50, kind: "floor", label: "sync return node" },
      { x: 3650, y: 430, width: 440, height: 46, kind: "floor", label: "C key shard balcony" },
    ],
    hazards: [
      { x: 620, y: 1370, width: 360, height: 140, kind: "cache-sludge", label: "downloads mud", damage: 16 },
      { x: 1230, y: 660, width: 230, height: 260, kind: "delete-scan", label: "security patrol cone", damage: 22 },
      { x: 1910, y: 820, width: 310, height: 130, kind: "sync-storm", label: "duplicate churn", damage: 20 },
      { x: 2700, y: 520, width: 310, height: 200, kind: "delete-scan", label: "index sweep", damage: 24 },
      { x: 3420, y: 1030, width: 290, height: 150, kind: "sync-storm", label: "temporary sync surge", damage: 21 },
    ],
    vents: [
      { x: 600, y: 1080, width: 90, height: 90, label: "installer seam", to: "project trunk" },
      { x: 1510, y: 610, width: 90, height: 90, label: "asset cave slit", gate: "mirror-disguise", to: "duplicate maze" },
      { x: 2470, y: 780, width: 94, height: 86, label: "backup duct", gate: "clone-control", to: "search web" },
      { x: 3460, y: 720, width: 90, height: 92, label: "sync node vent", gate: "reverse-index", to: "C key balcony" },
    ],
    fileShells: [
      { x: 360, y: 1300, width: 180, height: 140, label: "download archive husk", to: "installer pile" },
      { x: 1180, y: 390, width: 190, height: 140, label: "project build shell", to: "asset cave" },
      { x: 2020, y: 900, width: 180, height: 140, label: "copy-of-copy shell", gate: "clone-control", to: "duplicate maze" },
      { x: 2940, y: 220, width: 190, height: 140, label: "index cache shell", gate: "reverse-index", to: "search web" },
    ],
    biomassCaches: [
      { x: 320, y: 1440, width: 92, height: 92, label: "installer meat", biomass: 2 },
      { x: 900, y: 1100, width: 94, height: 94, label: "test fixture clot", biomass: 3 },
      { x: 1410, y: 380, width: 90, height: 90, label: "asset residue", biomass: 2 },
      { x: 1980, y: 940, width: 98, height: 98, label: "duplicate marrow", biomass: 4, gate: "devour-upgrade" },
      { x: 2720, y: 230, width: 92, height: 92, label: "index spider husk", biomass: 3 },
      { x: 3500, y: 800, width: 92, height: 92, label: "sync token clot", biomass: 3 },
    ],
    enemySpawns: [
      { x: 760, y: 1260, kind: "permission-sentinel", count: 2, patrolRadius: 340 },
      { x: 1390, y: 700, kind: "checksum-drone", count: 3, patrolRadius: 300 },
      { x: 2100, y: 940, kind: "index-spider", count: 4, patrolRadius: 360 },
      { x: 3020, y: 420, kind: "index-spider", count: 3, patrolRadius: 300 },
      { x: 3500, y: 940, kind: "sync-echo", count: 2, patrolRadius: 260 },
    ],
    abilityGates: [
      { x: 1420, y: 570, width: 180, height: 180, ability: "mirror-disguise", label: "pass patrol mirror check" },
      { x: 1900, y: 880, width: 180, height: 180, ability: "devour-upgrade", label: "eat download mutant remains" },
      { x: 2380, y: 720, width: 180, height: 180, ability: "clone-control", label: "split through duplicate maze" },
      { x: 3320, y: 660, width: 180, height: 180, ability: "reverse-index", label: "trace C key balcony" },
    ],
    bossIds: ["security-captain", "download-mutant", "duplicate-copy", "search-index-spider"],
    bossArena: {
      x: 1120,
      y: 250,
      width: 2450,
      height: 1080,
      bosses: ["security-captain", "download-mutant", "duplicate-copy", "search-index-spider"],
      lockUntilDefeated: false,
      hint: "A chained hunt through D drive: disguise, devour, split, then reverse the index web.",
      anchorPoints: [
        { x: 1240, y: 1020 },
        { x: 1880, y: 560 },
        { x: 2440, y: 980 },
        { x: 3140, y: 370 },
      ],
    },
    colorAccents: dDriveAccents,
  },
  "c-wall": {
    chapterId: "c-wall",
    world: { width: 2600, height: 1500 },
    spawn: { x: 160, y: 1260 },
    exit: { x: 2360, y: 330, width: 150, height: 210, label: "opened C drive breach", to: "leder-c-drive", gate: "permission-rend" },
    gripSurfaces: [
      { x: 80, y: 1260, width: 580, height: 50, kind: "floor", label: "outer permission shelf" },
      { x: 500, y: 900, width: 60, height: 520, kind: "wall", label: "user-habit key column" },
      { x: 760, y: 610, width: 560, height: 46, kind: "floor", label: "token slot beam" },
      { x: 1180, y: 270, width: 680, height: 42, kind: "ceiling", label: "signature lintel" },
      { x: 1600, y: 790, width: 62, height: 530, kind: "wall", label: "encrypted lock face" },
      { x: 1860, y: 1040, width: 470, height: 48, kind: "floor", label: "colossus foot rail" },
      { x: 2140, y: 560, width: 360, height: 46, kind: "rail", label: "permission rend handle" },
    ],
    hazards: [
      { x: 620, y: 1150, width: 260, height: 120, kind: "permission-laser", label: "habit-key beam", damage: 24 },
      { x: 1180, y: 730, width: 320, height: 130, kind: "permission-laser", label: "token mismatch laser", damage: 26 },
      { x: 1720, y: 470, width: 260, height: 270, kind: "delete-scan", label: "signature rejection eye", damage: 24 },
      { x: 2050, y: 940, width: 250, height: 180, kind: "permission-laser", label: "lock colossus sweep", damage: 28 },
    ],
    vents: [
      { x: 560, y: 1030, width: 86, height: 88, label: "recent-files slit", gate: "reverse-index", to: "token beam" },
      { x: 1410, y: 510, width: 90, height: 90, label: "signature duct", gate: "mirror-disguise", to: "lock face" },
      { x: 2180, y: 470, width: 88, height: 88, label: "permission scar", gate: "permission-rend", to: "C breach" },
    ],
    fileShells: [
      { x: 370, y: 1110, width: 160, height: 130, label: "shortcut-memory shell", to: "key column" },
      { x: 1010, y: 480, width: 170, height: 130, label: "sync-token shell", to: "signature lintel" },
      { x: 1780, y: 890, width: 180, height: 140, label: "signed installer shell", gate: "devour-upgrade", to: "colossus foot rail" },
    ],
    biomassCaches: [
      { x: 320, y: 1180, width: 86, height: 86, label: "habit key pulp", biomass: 2 },
      { x: 910, y: 540, width: 90, height: 90, label: "sync token marrow", biomass: 3 },
      { x: 1500, y: 210, width: 88, height: 88, label: "signature clot", biomass: 3 },
      { x: 2090, y: 930, width: 96, height: 96, label: "permission-rend charge", biomass: 4 },
    ],
    enemySpawns: [
      { x: 700, y: 1030, kind: "permission-sentinel", count: 2, patrolRadius: 260 },
      { x: 1380, y: 650, kind: "checksum-drone", count: 2, patrolRadius: 240 },
      { x: 2050, y: 900, kind: "permission-sentinel", count: 3, patrolRadius: 300 },
    ],
    abilityGates: [
      { x: 480, y: 870, width: 160, height: 180, ability: "reverse-index", label: "find true key seam" },
      { x: 1350, y: 470, width: 160, height: 170, ability: "mirror-disguise", label: "match signature skin" },
      { x: 2140, y: 430, width: 180, height: 190, ability: "permission-rend", label: "tear C wall open" },
    ],
    bossIds: ["c-lock-colossus"],
    bossArena: {
      x: 1640,
      y: 420,
      width: 620,
      height: 660,
      bosses: ["c-lock-colossus"],
      lockUntilDefeated: true,
      hint: "Feed three key shards into the wall, then rip the exposed lock tendons.",
      anchorPoints: [
        { x: 1710, y: 980 },
        { x: 1930, y: 520 },
        { x: 2190, y: 910 },
      ],
    },
    colorAccents: cDriveAccents,
  },
  "leder-c-drive": {
    chapterId: "leder-c-drive",
    world: { width: 4400, height: 2000 },
    spawn: { x: 180, y: 1700 },
    exit: { x: 4100, y: 280, width: 180, height: 230, label: "LAN device layer uplink", to: "router-core", gate: "admin-token-core" },
    gripSurfaces: [
      { x: 70, y: 1710, width: 700, height: 52, kind: "floor", label: "Program Files outer wall base" },
      { x: 560, y: 1320, width: 70, height: 560, kind: "wall", label: "installed app tower" },
      { x: 860, y: 1010, width: 680, height: 48, kind: "floor", label: "AppData shadow shelf" },
      { x: 1390, y: 610, width: 70, height: 560, kind: "wall", label: "startup corridor spine" },
      { x: 1660, y: 310, width: 820, height: 44, kind: "ceiling", label: "service pipe canopy" },
      { x: 2220, y: 1190, width: 660, height: 50, kind: "floor", label: "quarantine vault rail" },
      { x: 2740, y: 760, width: 76, height: 600, kind: "wall", label: "restore-point shaft" },
      { x: 3100, y: 430, width: 720, height: 46, kind: "rail", label: "task-manager lattice" },
      { x: 3660, y: 1010, width: 520, height: 50, kind: "floor", label: "admin token dais" },
      { x: 3980, y: 500, width: 70, height: 520, kind: "wall", label: "device-layer gate rib" },
    ],
    hazards: [
      { x: 640, y: 1520, width: 260, height: 200, kind: "permission-laser", label: "UAC glare", damage: 28 },
      { x: 1320, y: 850, width: 280, height: 180, kind: "delete-scan", label: "startup refresh sweep", damage: 24 },
      { x: 1960, y: 450, width: 330, height: 160, kind: "firewall-pulse", label: "service pipe pressure", damage: 22 },
      { x: 2440, y: 1050, width: 360, height: 130, kind: "permission-laser", label: "quarantine seal", damage: 28 },
      { x: 3160, y: 650, width: 300, height: 200, kind: "delete-scan", label: "task kill sweep", damage: 30 },
      { x: 3820, y: 860, width: 250, height: 180, kind: "permission-laser", label: "admin hand clamp", damage: 32 },
    ],
    vents: [
      { x: 640, y: 1220, width: 90, height: 90, label: "AppData crawl duct", gate: "process-parasite", to: "startup corridor" },
      { x: 1510, y: 470, width: 92, height: 90, label: "service pipe inlet", gate: "process-parasite", to: "service canopy" },
      { x: 2580, y: 980, width: 90, height: 90, label: "quarantine reverse slit", gate: "quarantine-invert", to: "restore shaft" },
      { x: 3460, y: 520, width: 92, height: 92, label: "admin token duct", gate: "backup-anchor", to: "admin dais" },
    ],
    fileShells: [
      { x: 430, y: 1530, width: 180, height: 140, label: "installer shell", to: "Program Files wall" },
      { x: 1060, y: 890, width: 190, height: 140, label: "session cache shell", to: "AppData shelf" },
      { x: 2260, y: 1050, width: 190, height: 140, label: "quarantined file shell", gate: "quarantine-invert", to: "vault rail" },
      { x: 2960, y: 640, width: 180, height: 140, label: "restore snapshot shell", gate: "backup-anchor", to: "task-manager lattice" },
      { x: 3740, y: 880, width: 180, height: 140, label: "admin token husk", gate: "admin-token-core", to: "device gate" },
    ],
    biomassCaches: [
      { x: 330, y: 1620, width: 92, height: 92, label: "installed app residue", biomass: 2 },
      { x: 990, y: 920, width: 94, height: 94, label: "session meat", biomass: 3 },
      { x: 1560, y: 530, width: 92, height: 92, label: "service pipe clot", biomass: 3 },
      { x: 2280, y: 1110, width: 96, height: 96, label: "quarantine marrow", biomass: 4 },
      { x: 2920, y: 680, width: 94, height: 94, label: "restore ghost residue", biomass: 3 },
      { x: 3720, y: 930, width: 98, height: 98, label: "admin token core feed", biomass: 5, gate: "admin-token-core" },
    ],
    enemySpawns: [
      { x: 700, y: 1440, kind: "permission-sentinel", count: 3, patrolRadius: 340 },
      { x: 1390, y: 780, kind: "checksum-drone", count: 3, patrolRadius: 300 },
      { x: 2180, y: 470, kind: "firewall-swarm", count: 2, patrolRadius: 320 },
      { x: 2660, y: 1110, kind: "permission-sentinel", count: 4, patrolRadius: 320 },
      { x: 3300, y: 560, kind: "checksum-drone", count: 3, patrolRadius: 280 },
      { x: 3840, y: 920, kind: "permission-sentinel", count: 3, patrolRadius: 300 },
    ],
    abilityGates: [
      { x: 600, y: 1180, width: 170, height: 180, ability: "process-parasite", label: "ride trusted service" },
      { x: 2480, y: 930, width: 180, height: 180, ability: "quarantine-invert", label: "turn isolation inside out" },
      { x: 2920, y: 590, width: 180, height: 180, ability: "backup-anchor", label: "pin restore rollback" },
      { x: 3720, y: 830, width: 190, height: 190, ability: "admin-token-core", label: "claim admin core" },
    ],
    bossIds: ["uac-eye", "task-manager-executioner", "quarantine-warden", "restore-ghost", "admin-hand"],
    bossArena: {
      x: 560,
      y: 330,
      width: 3500,
      height: 1280,
      bosses: ["uac-eye", "task-manager-executioner", "quarantine-warden", "restore-ghost", "admin-hand"],
      lockUntilDefeated: false,
      hint: "A system fortress route: parasitize services, invert quarantine, anchor restore, then take the admin hand.",
      anchorPoints: [
        { x: 680, y: 1440 },
        { x: 1480, y: 730 },
        { x: 2480, y: 1140 },
        { x: 3150, y: 540 },
        { x: 3830, y: 890 },
      ],
    },
    colorAccents: cDriveAccents,
  },
  "router-core": {
    chapterId: "router-core",
    world: { width: 3400, height: 1700 },
    spawn: { x: 160, y: 1340 },
    exit: { x: 3160, y: 270, width: 170, height: 220, label: "device jump node", to: "nas-graveyard", gate: "cross-device-jump" },
    gripSurfaces: [
      { x: 80, y: 1350, width: 600, height: 50, kind: "floor", label: "WAN intake lip" },
      { x: 520, y: 1000, width: 65, height: 500, kind: "wall", label: "port matrix side" },
      { x: 800, y: 710, width: 640, height: 48, kind: "rail", label: "NAT maze rail" },
      { x: 1280, y: 380, width: 700, height: 44, kind: "ceiling", label: "routing table canopy" },
      { x: 1740, y: 920, width: 600, height: 50, kind: "floor", label: "packet buffer shelf" },
      { x: 2200, y: 560, width: 70, height: 540, kind: "wall", label: "firewall chamber wall" },
      { x: 2520, y: 270, width: 650, height: 46, kind: "rail", label: "antenna spine" },
      { x: 2920, y: 820, width: 360, height: 50, kind: "floor", label: "device fan-out lip" },
    ],
    hazards: [
      { x: 620, y: 1180, width: 310, height: 130, kind: "sync-storm", label: "packet flood", damage: 22 },
      { x: 1120, y: 560, width: 280, height: 180, kind: "firewall-pulse", label: "NAT loop pulse", damage: 24 },
      { x: 1840, y: 760, width: 380, height: 140, kind: "firewall-pulse", label: "firewall heartbeat", damage: 34 },
      { x: 2460, y: 490, width: 310, height: 170, kind: "delete-scan", label: "disconnect chase beam", damage: 26 },
    ],
    vents: [
      { x: 600, y: 930, width: 90, height: 90, label: "port 445 slit", gate: "admin-token-core", to: "NAT rail" },
      { x: 1460, y: 690, width: 94, height: 90, label: "routing table duct", gate: "process-parasite", to: "packet buffer" },
      { x: 2760, y: 710, width: 92, height: 92, label: "device fan-out duct", gate: "cross-device-jump", to: "device jump node" },
    ],
    fileShells: [
      { x: 360, y: 1220, width: 170, height: 130, label: "ARP cache shell", to: "port matrix" },
      { x: 1320, y: 280, width: 180, height: 130, label: "routing rule shell", to: "table canopy" },
      { x: 2220, y: 780, width: 180, height: 140, label: "firewall rule husk", gate: "admin-token-core", to: "firewall chamber wall" },
    ],
    biomassCaches: [
      { x: 330, y: 1260, width: 90, height: 90, label: "packet gel", biomass: 2 },
      { x: 930, y: 630, width: 92, height: 92, label: "NAT memory clot", biomass: 3 },
      { x: 1830, y: 850, width: 98, height: 98, label: "firewall heart feed", biomass: 4 },
      { x: 2760, y: 250, width: 92, height: 92, label: "antenna spark cache", biomass: 3 },
    ],
    enemySpawns: [
      { x: 760, y: 1080, kind: "firewall-swarm", count: 3, patrolRadius: 320 },
      { x: 1520, y: 620, kind: "checksum-drone", count: 3, patrolRadius: 280 },
      { x: 2340, y: 650, kind: "firewall-swarm", count: 4, patrolRadius: 300 },
    ],
    abilityGates: [
      { x: 540, y: 900, width: 170, height: 180, ability: "admin-token-core", label: "open router admin port" },
      { x: 2680, y: 650, width: 180, height: 180, ability: "cross-device-jump", label: "fan out to devices" },
    ],
    bossIds: ["firewall-heart"],
    bossArena: {
      x: 1880,
      y: 450,
      width: 760,
      height: 620,
      bosses: ["firewall-heart"],
      lockUntilDefeated: true,
      hint: "Bait the heart into firewall pulses; orange vents open the armor window.",
      anchorPoints: [
        { x: 1940, y: 930 },
        { x: 2220, y: 520 },
        { x: 2520, y: 890 },
      ],
    },
    colorAccents: networkAccents,
  },
  "nas-graveyard": {
    chapterId: "nas-graveyard",
    world: { width: 3800, height: 1800 },
    spawn: { x: 160, y: 1480 },
    exit: { x: 3540, y: 330, width: 170, height: 210, label: "camera firmware mirror", to: "camera-eye", gate: "version-split" },
    gripSurfaces: [
      { x: 80, y: 1490, width: 650, height: 50, kind: "floor", label: "backup shelf base" },
      { x: 530, y: 1140, width: 66, height: 520, kind: "wall", label: "snapshot stack" },
      { x: 820, y: 830, width: 680, height: 48, kind: "floor", label: "old agent archive" },
      { x: 1360, y: 480, width: 760, height: 44, kind: "ceiling", label: "log cavern roof" },
      { x: 1910, y: 1010, width: 610, height: 50, kind: "floor", label: "dedupe shelf" },
      { x: 2380, y: 650, width: 72, height: 520, kind: "wall", label: "version branch wall" },
      { x: 2700, y: 320, width: 690, height: 46, kind: "rail", label: "sync mother rail" },
      { x: 3260, y: 890, width: 390, height: 50, kind: "floor", label: "camera share lip" },
    ],
    hazards: [
      { x: 650, y: 1320, width: 320, height: 140, kind: "sync-storm", label: "backup replay wave", damage: 22 },
      { x: 1290, y: 690, width: 300, height: 170, kind: "cache-sludge", label: "old version swamp", damage: 18 },
      { x: 2040, y: 840, width: 280, height: 160, kind: "sync-storm", label: "dedupe collapse", damage: 24 },
      { x: 2860, y: 540, width: 340, height: 170, kind: "sync-storm", label: "sync mother wave", damage: 30 },
    ],
    vents: [
      { x: 600, y: 1040, width: 90, height: 90, label: "snapshot duct", gate: "cross-device-jump", to: "old agent archive" },
      { x: 1560, y: 700, width: 92, height: 90, label: "log replay vent", gate: "backup-anchor", to: "dedupe shelf" },
      { x: 3060, y: 760, width: 90, height: 90, label: "camera share duct", gate: "version-split", to: "camera firmware mirror" },
    ],
    fileShells: [
      { x: 380, y: 1300, width: 180, height: 140, label: "backup tar shell", to: "snapshot stack" },
      { x: 1020, y: 720, width: 190, height: 140, label: "old agent shell", to: "old agent archive" },
      { x: 2200, y: 910, width: 190, height: 140, label: "dedupe tomb shell", gate: "version-split", to: "version branch wall" },
      { x: 2940, y: 220, width: 180, height: 140, label: "sync manifest shell", to: "sync rail" },
    ],
    biomassCaches: [
      { x: 320, y: 1400, width: 92, height: 92, label: "old prompt backup", biomass: 2 },
      { x: 920, y: 750, width: 94, height: 94, label: "failed agent memory", biomass: 3 },
      { x: 1640, y: 420, width: 96, height: 96, label: "experiment log marrow", biomass: 4 },
      { x: 2220, y: 930, width: 94, height: 94, label: "dedupe clot", biomass: 3 },
      { x: 3020, y: 270, width: 96, height: 96, label: "version split charge", biomass: 4, gate: "version-split" },
    ],
    enemySpawns: [
      { x: 760, y: 1220, kind: "sync-echo", count: 3, patrolRadius: 330 },
      { x: 1520, y: 660, kind: "checksum-drone", count: 2, patrolRadius: 280 },
      { x: 2260, y: 900, kind: "sync-echo", count: 4, patrolRadius: 320 },
      { x: 3020, y: 480, kind: "sync-echo", count: 4, patrolRadius: 340 },
    ],
    abilityGates: [
      { x: 560, y: 1010, width: 170, height: 180, ability: "cross-device-jump", label: "enter NAS share" },
      { x: 1510, y: 660, width: 170, height: 170, ability: "backup-anchor", label: "hold replay wave" },
      { x: 2960, y: 700, width: 180, height: 180, ability: "version-split", label: "split through old versions" },
    ],
    bossIds: ["sync-mother"],
    bossArena: {
      x: 2580,
      y: 280,
      width: 680,
      height: 760,
      bosses: ["sync-mother"],
      lockUntilDefeated: true,
      hint: "Use older selves as anchors while the sync mother rewrites the arena path.",
      anchorPoints: [
        { x: 2660, y: 900 },
        { x: 2890, y: 360 },
        { x: 3150, y: 820 },
      ],
    },
    colorAccents: networkAccents,
  },
  "camera-eye": {
    chapterId: "camera-eye",
    world: { width: 3000, height: 1400 },
    spawn: { x: 150, y: 1120 },
    exit: { x: 2780, y: 360, width: 150, height: 210, label: "printer queue reflection", to: "printer-belly", gate: "vision-takeover" },
    gripSurfaces: [
      { x: 70, y: 1130, width: 540, height: 48, kind: "floor", label: "firmware lens base" },
      { x: 460, y: 830, width: 58, height: 430, kind: "wall", label: "sensor bracket" },
      { x: 690, y: 560, width: 620, height: 44, kind: "ceiling", label: "exposure ring roof" },
      { x: 1140, y: 910, width: 520, height: 48, kind: "floor", label: "monitor pane shelf" },
      { x: 1540, y: 570, width: 60, height: 460, kind: "wall", label: "blind-spot divider" },
      { x: 1790, y: 300, width: 580, height: 44, kind: "rail", label: "reflection rail" },
      { x: 2240, y: 760, width: 430, height: 48, kind: "floor", label: "lens keeper ring" },
      { x: 2550, y: 500, width: 300, height: 46, kind: "floor", label: "real-room viewport lip" },
    ],
    hazards: [
      {
        x: 580,
        y: 990,
        width: 260,
        height: 140,
        kind: "optic-burn",
        label: "overexposure wash",
        damage: 22,
        angleDeg: -12,
        fovDeg: 58,
        blindSpotRects: [{ x: 460, y: 830, width: 58, height: 430 }],
      },
      { x: 1130, y: 710, width: 280, height: 150, kind: "delete-scan", label: "motion detection sweep", damage: 24 },
      {
        x: 1780,
        y: 490,
        width: 310,
        height: 170,
        kind: "optic-burn",
        label: "reflection burn",
        damage: 26,
        angleDeg: 168,
        fovDeg: 64,
        blindSpotRects: [{ x: 1540, y: 570, width: 60, height: 460 }],
      },
      {
        x: 2310,
        y: 650,
        width: 260,
        height: 170,
        kind: "optic-burn",
        label: "lens keeper glare",
        damage: 30,
        angleDeg: 214,
        fovDeg: 54,
        blindSpotRects: [{ x: 2240, y: 760, width: 430, height: 48 }],
      },
    ],
    vents: [
      { x: 520, y: 760, width: 88, height: 88, label: "sensor ribbon slit", gate: "version-split", to: "exposure ring" },
      { x: 1430, y: 800, width: 90, height: 90, label: "monitor cable duct", gate: "infiltrate", to: "reflection rail" },
      { x: 2470, y: 640, width: 90, height: 90, label: "viewport service duct", gate: "vision-takeover", to: "printer reflection" },
    ],
    fileShells: [
      { x: 310, y: 980, width: 160, height: 130, label: "firmware image shell", to: "sensor bracket" },
      { x: 1040, y: 820, width: 170, height: 130, label: "motion clip shell", to: "monitor pane" },
      { x: 1940, y: 210, width: 180, height: 130, label: "snapshot shell", gate: "version-split", to: "reflection rail" },
    ],
    biomassCaches: [
      { x: 280, y: 1050, width: 86, height: 86, label: "pixel clot", biomass: 2 },
      { x: 880, y: 480, width: 90, height: 90, label: "exposure residue", biomass: 3 },
      { x: 1320, y: 1040, width: 92, height: 92, label: "remote router afterimage", biomass: 3, gate: "cross-device-jump" },
      { x: 1660, y: 250, width: 92, height: 92, label: "reflection marrow", biomass: 3 },
      { x: 2360, y: 680, width: 96, height: 96, label: "lens keeper feed", biomass: 4 },
    ],
    enemySpawns: [
      { x: 760, y: 760, kind: "lens-sentry", count: 2, patrolRadius: 280 },
      { x: 1470, y: 830, kind: "checksum-drone", count: 2, patrolRadius: 260 },
      { x: 2260, y: 630, kind: "lens-sentry", count: 3, patrolRadius: 300 },
    ],
    abilityGates: [
      { x: 500, y: 730, width: 160, height: 170, ability: "version-split", label: "slip through sensor versions" },
      { x: 2440, y: 610, width: 180, height: 180, ability: "vision-takeover", label: "seize camera view" },
    ],
    bossIds: ["lens-keeper"],
    bossArena: {
      x: 2060,
      y: 430,
      width: 590,
      height: 520,
      bosses: ["lens-keeper"],
      lockUntilDefeated: true,
      hint: "Hide in blind spots, then blind the keeper with reflection rails.",
      anchorPoints: [
        { x: 2130, y: 850 },
        { x: 2360, y: 510 },
        { x: 2560, y: 780 },
      ],
    },
    colorAccents: deviceAccents,
  },
  "printer-belly": {
    chapterId: "printer-belly",
    world: { width: 3400, height: 1500 },
    spawn: { x: 160, y: 1180 },
    exit: { x: 3160, y: 430, width: 160, height: 210, label: "speaker pairing queue", to: "speaker-voiceprint", gate: "material-mark" },
    gripSurfaces: [
      { x: 70, y: 1190, width: 620, height: 50, kind: "floor", label: "paper tray throat" },
      { x: 520, y: 900, width: 64, height: 430, kind: "wall", label: "feed roller wall" },
      { x: 770, y: 650, width: 680, height: 48, kind: "rail", label: "paper belt rail" },
      { x: 1280, y: 360, width: 720, height: 44, kind: "ceiling", label: "inkhead canopy" },
      { x: 1780, y: 900, width: 590, height: 50, kind: "floor", label: "error-report ledge" },
      { x: 2240, y: 580, width: 68, height: 500, kind: "wall", label: "print queue chute" },
      { x: 2560, y: 310, width: 640, height: 46, kind: "rail", label: "QR mark rail" },
      { x: 2980, y: 760, width: 330, height: 50, kind: "floor", label: "speaker job shelf" },
    ],
    hazards: [
      { x: 590, y: 1060, width: 260, height: 130, kind: "printer-roller", label: "feed roller crush", damage: 26 },
      { x: 1130, y: 520, width: 320, height: 160, kind: "cache-sludge", label: "ink river", damage: 20 },
      { x: 1860, y: 760, width: 280, height: 160, kind: "printer-roller", label: "duplex roller", damage: 30 },
      { x: 2320, y: 780, width: 320, height: 150, kind: "printer-roller", label: "boss queue intake roller", damage: 32 },
      { x: 2540, y: 530, width: 320, height: 160, kind: "delete-scan", label: "queue purge beam", damage: 24 },
    ],
    vents: [
      { x: 600, y: 820, width: 90, height: 90, label: "paper feed slit", gate: "vision-takeover", to: "paper belt rail" },
      { x: 1490, y: 740, width: 92, height: 90, label: "inkhead service duct", gate: "infiltrate", to: "error ledge" },
      { x: 2780, y: 650, width: 90, height: 90, label: "queue spool duct", gate: "material-mark", to: "speaker shelf" },
    ],
    fileShells: [
      { x: 340, y: 1040, width: 170, height: 130, label: "paper jam shell", to: "feed roller" },
      { x: 1060, y: 250, width: 180, height: 130, label: "driver package shell", to: "inkhead canopy" },
      { x: 2010, y: 800, width: 180, height: 140, label: "error report shell", gate: "material-mark", to: "QR rail" },
    ],
    biomassCaches: [
      { x: 310, y: 1110, width: 88, height: 88, label: "paper fiber clot", biomass: 2 },
      { x: 980, y: 560, width: 92, height: 92, label: "ink-code gel", biomass: 3 },
      { x: 1430, y: 330, width: 94, height: 94, label: "rollback driver pulp", biomass: 3, gate: "version-split" },
      { x: 1860, y: 830, width: 96, height: 96, label: "print daemon remains", biomass: 4 },
      { x: 2700, y: 270, width: 92, height: 92, label: "QR mark charge", biomass: 3, gate: "material-mark" },
    ],
    enemySpawns: [
      { x: 700, y: 970, kind: "print-daemon", count: 2, patrolRadius: 280 },
      { x: 1500, y: 660, kind: "checksum-drone", count: 2, patrolRadius: 260 },
      { x: 2400, y: 560, kind: "print-daemon", count: 4, patrolRadius: 320 },
    ],
    abilityGates: [
      { x: 570, y: 790, width: 170, height: 170, ability: "vision-takeover", label: "time motion with camera view" },
      { x: 2620, y: 610, width: 180, height: 180, ability: "material-mark", label: "print a physical trace" },
    ],
    bossIds: ["print-queue-beast"],
    bossArena: {
      x: 2160,
      y: 430,
      width: 690,
      height: 600,
      bosses: ["print-queue-beast"],
      lockUntilDefeated: true,
      hint: "Drag the queue beast into intake rollers; torn armor opens a bite window.",
      anchorPoints: [
        { x: 2240, y: 910 },
        { x: 2480, y: 500 },
        { x: 2740, y: 880 },
      ],
    },
    colorAccents: deviceAccents,
  },
  "speaker-voiceprint": {
    chapterId: "speaker-voiceprint",
    world: { width: 3200, height: 1500 },
    spawn: { x: 160, y: 1160 },
    exit: { x: 2960, y: 350, width: 160, height: 220, label: "dev-board serial port", to: "dev-board", gate: "voiceprint-disguise" },
    gripSurfaces: [
      { x: 80, y: 1170, width: 590, height: 50, kind: "floor", label: "speaker grille base" },
      { x: 520, y: 860, width: 62, height: 450, kind: "wall", label: "woofer cone wall" },
      { x: 750, y: 600, width: 660, height: 46, kind: "rail", label: "low wave rail" },
      { x: 1220, y: 300, width: 680, height: 44, kind: "ceiling", label: "voiceprint canopy" },
      { x: 1700, y: 820, width: 570, height: 50, kind: "floor", label: "microphone shelf" },
      { x: 2140, y: 520, width: 68, height: 510, kind: "wall", label: "wake-word gate ribs" },
      { x: 2460, y: 260, width: 560, height: 46, kind: "rail", label: "command phrase rail" },
      { x: 2780, y: 760, width: 310, height: 50, kind: "floor", label: "serial pairing lip" },
    ],
    hazards: [
      { x: 620, y: 1010, width: 280, height: 130, kind: "audio-feedback", label: "bass pressure wave", damage: 22 },
      { x: 1190, y: 500, width: 300, height: 170, kind: "audio-feedback", label: "volume storm", damage: 26 },
      { x: 1880, y: 690, width: 280, height: 160, kind: "delete-scan", label: "microphone scan", damage: 24 },
      { x: 2460, y: 480, width: 300, height: 170, kind: "audio-feedback", label: "wake-word feedback", damage: 30 },
    ],
    vents: [
      { x: 600, y: 790, width: 90, height: 90, label: "woofer seam", gate: "material-mark", to: "low wave rail" },
      { x: 1450, y: 680, width: 92, height: 90, label: "mic ribbon duct", gate: "voiceprint-disguise", to: "wake-word ribs" },
      { x: 2620, y: 660, width: 90, height: 90, label: "bluetooth stack slit", gate: "voiceprint-disguise", to: "serial lip" },
    ],
    fileShells: [
      { x: 350, y: 1010, width: 170, height: 130, label: "audio buffer shell", to: "woofer cone" },
      { x: 1120, y: 210, width: 180, height: 130, label: "voice model shell", to: "voiceprint canopy" },
      { x: 2020, y: 710, width: 180, height: 140, label: "wake phrase shell", gate: "voiceprint-disguise", to: "command phrase rail" },
    ],
    biomassCaches: [
      { x: 310, y: 1080, width: 88, height: 88, label: "audio buffer clot", biomass: 2 },
      { x: 930, y: 540, width: 90, height: 90, label: "waveform marrow", biomass: 3 },
      { x: 1510, y: 260, width: 92, height: 92, label: "camera waveform preview", biomass: 3, gate: "vision-takeover" },
      { x: 1770, y: 740, width: 94, height: 94, label: "microphone residue", biomass: 3 },
      { x: 2500, y: 240, width: 96, height: 96, label: "voiceprint charge", biomass: 4, gate: "voiceprint-disguise" },
    ],
    enemySpawns: [
      { x: 720, y: 950, kind: "voiceprint-probe", count: 2, patrolRadius: 300 },
      { x: 1520, y: 620, kind: "checksum-drone", count: 2, patrolRadius: 260 },
      { x: 2380, y: 480, kind: "voiceprint-probe", count: 4, patrolRadius: 320 },
    ],
    abilityGates: [
      { x: 560, y: 760, width: 170, height: 180, ability: "material-mark", label: "vibrate printed mark" },
      { x: 1400, y: 640, width: 180, height: 180, ability: "voiceprint-disguise", label: "spoof wake word" },
      { x: 2580, y: 630, width: 180, height: 180, ability: "voiceprint-disguise", label: "pair through disguised command" },
    ],
    bossIds: ["wake-word-guard"],
    bossArena: {
      x: 2140,
      y: 360,
      width: 620,
      height: 620,
      bosses: ["wake-word-guard"],
      lockUntilDefeated: true,
      hint: "Ride low waves under scans, then fold the guard into its own feedback.",
      anchorPoints: [
        { x: 2210, y: 890 },
        { x: 2440, y: 430 },
        { x: 2680, y: 820 },
      ],
    },
    colorAccents: deviceAccents,
  },
  "dev-board": {
    chapterId: "dev-board",
    world: { width: 3600, height: 1700 },
    spawn: { x: 160, y: 1340 },
    exit: { x: 3340, y: 290, width: 170, height: 230, label: "ending hardware interface", to: "ending-choice", gate: "hardware-parasite" },
    gripSurfaces: [
      { x: 80, y: 1350, width: 640, height: 50, kind: "floor", label: "USB serial ledge" },
      { x: 550, y: 1010, width: 64, height: 520, kind: "wall", label: "GPIO pin bank" },
      { x: 830, y: 730, width: 700, height: 48, kind: "rail", label: "signal trace rail" },
      { x: 1360, y: 380, width: 760, height: 44, kind: "ceiling", label: "sensor bus canopy" },
      { x: 1900, y: 950, width: 620, height: 50, kind: "floor", label: "motor control shelf" },
      { x: 2380, y: 590, width: 70, height: 540, kind: "wall", label: "firmware burner wall" },
      { x: 2700, y: 290, width: 650, height: 46, kind: "rail", label: "bootloader rail" },
      { x: 3130, y: 810, width: 350, height: 50, kind: "floor", label: "robot body command lip" },
    ],
    hazards: [
      { x: 650, y: 1180, width: 300, height: 130, kind: "firmware-flash", label: "GPIO short", damage: 24 },
      { x: 1210, y: 570, width: 320, height: 170, kind: "firmware-flash", label: "sensor noise burst", damage: 24 },
      { x: 1980, y: 800, width: 300, height: 170, kind: "printer-roller", label: "motor test sweep", damage: 28 },
      { x: 2560, y: 520, width: 340, height: 180, kind: "firmware-flash", label: "burner flash", damage: 34 },
      { x: 3040, y: 760, width: 280, height: 160, kind: "firmware-flash", label: "boot loop surge", damage: 30 },
    ],
    vents: [
      { x: 620, y: 930, width: 90, height: 90, label: "GPIO pin slit", gate: "voiceprint-disguise", to: "signal trace rail" },
      { x: 1560, y: 760, width: 92, height: 90, label: "sensor bus duct", gate: "hardware-parasite", to: "motor shelf" },
      { x: 2840, y: 690, width: 90, height: 90, label: "bootloader service duct", gate: "hardware-parasite", to: "ending interface" },
    ],
    fileShells: [
      { x: 360, y: 1180, width: 170, height: 130, label: "serial log shell", to: "GPIO bank" },
      { x: 1120, y: 280, width: 180, height: 130, label: "sensor config shell", to: "bus canopy" },
      { x: 2080, y: 850, width: 180, height: 140, label: "motor script shell", gate: "hardware-parasite", to: "firmware wall" },
      { x: 2840, y: 190, width: 180, height: 140, label: "bootloader shell", gate: "hardware-parasite", to: "robot command lip" },
    ],
    biomassCaches: [
      { x: 320, y: 1260, width: 90, height: 90, label: "serial byte clot", biomass: 2 },
      { x: 960, y: 660, width: 92, height: 92, label: "signal residue", biomass: 3 },
      { x: 1660, y: 320, width: 96, height: 96, label: "sensor marrow", biomass: 3 },
      { x: 1890, y: 1110, width: 96, height: 96, label: "printed calibration mark", biomass: 3, gate: "material-mark" },
      { x: 2180, y: 880, width: 98, height: 98, label: "motor command feed", biomass: 4 },
      { x: 2860, y: 250, width: 100, height: 100, label: "hardware parasite core", biomass: 5, gate: "hardware-parasite" },
    ],
    enemySpawns: [
      { x: 760, y: 1100, kind: "gpio-warden", count: 3, patrolRadius: 320 },
      { x: 1520, y: 620, kind: "checksum-drone", count: 2, patrolRadius: 280 },
      { x: 2260, y: 820, kind: "gpio-warden", count: 3, patrolRadius: 320 },
      { x: 2840, y: 480, kind: "gpio-warden", count: 4, patrolRadius: 340 },
    ],
    abilityGates: [
      { x: 580, y: 900, width: 170, height: 180, ability: "voiceprint-disguise", label: "unlock paired serial command" },
      { x: 1500, y: 720, width: 180, height: 180, ability: "hardware-parasite", label: "enter sensor bus" },
      { x: 2780, y: 650, width: 190, height: 190, ability: "hardware-parasite", label: "burn self into bootloader" },
    ],
    bossIds: ["firmware-burner"],
    bossArena: {
      x: 2380,
      y: 360,
      width: 680,
      height: 720,
      bosses: ["firmware-burner"],
      lockUntilDefeated: true,
      hint: "Lure the burner into firmware flashes; bite while the bootloader shell is open.",
      anchorPoints: [
        { x: 2460, y: 970 },
        { x: 2700, y: 430 },
        { x: 2970, y: 880 },
      ],
    },
    colorAccents: deviceAccents,
  },
} as const satisfies Record<CodeLifeChapterId, CodeLifeChapterConfig>;

const codeLifeChapterIds = new Set<ChapterId>(CODE_LIFE_CHAPTER_IDS);

export function isCodeLifeChapterId(chapterId: ChapterId): chapterId is CodeLifeChapterId {
  return codeLifeChapterIds.has(chapterId);
}

export function getCodeLifeChapterConfig(chapterId: CodeLifeChapterId): CodeLifeChapterConfig;
export function getCodeLifeChapterConfig(chapterId: ChapterId): CodeLifeChapterConfig | undefined;
export function getCodeLifeChapterConfig(chapterId: ChapterId): CodeLifeChapterConfig | undefined {
  if (!isCodeLifeChapterId(chapterId)) {
    return undefined;
  }

  return codeLifeChapterConfigs[chapterId];
}

export function getCodeLifeAbilityGateBlocker(
  config: CodeLifeChapterConfig,
  gate: CodeLifeAbilityGate,
): CodeLifeRect | undefined {
  if (rectContainsPoint(gate, config.spawn) || rectsOverlap(gate, config.exit)) {
    return undefined;
  }

  const interactables = [...config.vents, ...config.fileShells, ...config.biomassCaches];
  if (interactables.some((interactable) => rectsOverlap(gate, interactable))) {
    return undefined;
  }

  return gate;
}

function rectContainsPoint(rect: CodeLifeRect, point: CodeLifePoint): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

function rectsOverlap(a: CodeLifeRect, b: CodeLifeRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

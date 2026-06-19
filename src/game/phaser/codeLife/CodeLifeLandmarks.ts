import type { ChapterId } from "../../types";

export type CodeLifeLandmarkKind =
  | "cursor-desktop"
  | "gateway-rift"
  | "recycle-mouth"
  | "rebirth-capsule"
  | "trash-peak"
  | "packet-router"
  | "drive-shelves"
  | "permission-wall"
  | "uac-citadel"
  | "router-core"
  | "nas-racks"
  | "camera-iris"
  | "printer-throat"
  | "speaker-chamber"
  | "dev-board";

export interface CodeLifeLandmarkNode {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly label: string;
}

export interface CodeLifeLandmarkPlan {
  readonly chapterId: ChapterId;
  readonly kind: CodeLifeLandmarkKind;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly primaryColor: number;
  readonly secondaryColor: number;
  readonly dangerColor: number;
  readonly alpha: number;
  readonly lineCount: number;
  readonly nodes: readonly CodeLifeLandmarkNode[];
}

const LANDMARK_KINDS: Readonly<Record<ChapterId, CodeLifeLandmarkKind>> = {
  "cursor-hunt": "cursor-desktop",
  "wrong-gateway": "gateway-rift",
  "code-rebirth": "rebirth-capsule",
  "trash-mountain": "trash-peak",
  "p-drive": "packet-router",
  "leder-d-drive": "drive-shelves",
  "c-wall": "permission-wall",
  "leder-c-drive": "uac-citadel",
  "router-core": "router-core",
  "nas-graveyard": "nas-racks",
  "camera-eye": "camera-iris",
  "printer-belly": "printer-throat",
  "speaker-voiceprint": "speaker-chamber",
  "dev-board": "dev-board",
};

export function createCodeLifeLandmarkPlan(chapterId: ChapterId, width: number, height: number): CodeLifeLandmarkPlan {
  const kind = LANDMARK_KINDS[chapterId];
  const safeWidth = Math.max(640, width);
  const safeHeight = Math.max(480, height);
  const base = getLandmarkBase(kind, safeWidth, safeHeight);
  const nodeCount = getNodeCount(kind);
  const nodes = Array.from({ length: nodeCount }, (_, index) => {
    const unit = nodeCount === 1 ? 0.5 : index / (nodeCount - 1);
    const angle = unit * Math.PI * 2 + seededUnit(chapterId.length * 13 + index) * 0.38;
    const radiusX = base.width * (0.28 + seededUnit(index + 1.7) * 0.18);
    const radiusY = base.height * (0.22 + seededUnit(index + 4.3) * 0.2);
    return {
      x: base.x + Math.cos(angle) * radiusX,
      y: base.y + Math.sin(angle) * radiusY,
      radius: Math.max(6, Math.min(base.width, base.height) * (0.025 + seededUnit(index + 2.9) * 0.018)),
      label: `${kind}-node-${index + 1}`,
    };
  });

  return {
    chapterId,
    kind,
    ...base,
    primaryColor: getLandmarkPrimaryColor(kind),
    secondaryColor: getLandmarkSecondaryColor(kind),
    dangerColor: getLandmarkDangerColor(kind),
    alpha: getLandmarkAlpha(kind),
    lineCount: getLandmarkLineCount(kind),
    nodes,
  };
}

export function getCodeLifeLandmarkKinds(): Readonly<Record<ChapterId, CodeLifeLandmarkKind>> {
  return LANDMARK_KINDS;
}

function getLandmarkBase(
  kind: CodeLifeLandmarkKind,
  worldWidth: number,
  worldHeight: number,
): Pick<CodeLifeLandmarkPlan, "x" | "y" | "width" | "height"> {
  const wide = Math.max(360, worldWidth * 0.34);
  const tall = Math.max(260, worldHeight * 0.34);

  if (kind === "camera-iris" || kind === "speaker-chamber" || kind === "router-core") {
    return { x: worldWidth * 0.62, y: worldHeight * 0.42, width: wide * 0.88, height: tall * 1.05 };
  }
  if (kind === "printer-throat" || kind === "dev-board") {
    return { x: worldWidth * 0.66, y: worldHeight * 0.52, width: wide, height: tall * 0.9 };
  }
  if (kind === "nas-racks" || kind === "drive-shelves" || kind === "uac-citadel") {
    return { x: worldWidth * 0.56, y: worldHeight * 0.5, width: wide * 1.08, height: tall * 1.04 };
  }
  if (kind === "permission-wall") {
    return { x: worldWidth * 0.58, y: worldHeight * 0.48, width: wide * 0.74, height: tall * 1.28 };
  }
  if (kind === "trash-peak" || kind === "recycle-mouth" || kind === "rebirth-capsule") {
    return { x: worldWidth * 0.55, y: worldHeight * 0.58, width: wide * 1.05, height: tall };
  }
  return { x: worldWidth * 0.56, y: worldHeight * 0.48, width: wide, height: tall };
}

function getLandmarkPrimaryColor(kind: CodeLifeLandmarkKind): number {
  if (kind === "camera-iris") return 0xffef9a;
  if (kind === "printer-throat") return 0xf7f0d0;
  if (kind === "speaker-chamber") return 0xe3a9ff;
  if (kind === "dev-board") return 0xffc247;
  if (kind === "router-core" || kind === "packet-router") return 0x7affea;
  if (kind === "permission-wall" || kind === "uac-citadel") return 0xb9ccff;
  return 0xff5574;
}

function getLandmarkSecondaryColor(kind: CodeLifeLandmarkKind): number {
  if (kind === "camera-iris" || kind === "router-core" || kind === "packet-router") return 0x95fff1;
  if (kind === "dev-board") return 0xf7f0d0;
  if (kind === "speaker-chamber") return 0x7affea;
  if (kind === "printer-throat") return 0xffc247;
  if (kind === "nas-racks" || kind === "drive-shelves") return 0xb9d6ff;
  return 0xffd0dc;
}

function getLandmarkDangerColor(kind: CodeLifeLandmarkKind): number {
  if (kind === "permission-wall" || kind === "uac-citadel") return 0xff6e91;
  if (kind === "dev-board") return 0xffa735;
  if (kind === "speaker-chamber") return 0xff7cf0;
  if (kind === "camera-iris") return 0xffffff;
  return 0xff365c;
}

function getLandmarkAlpha(kind: CodeLifeLandmarkKind): number {
  return kind === "cursor-desktop" || kind === "gateway-rift" ? 0.18 : 0.34;
}

function getNodeCount(kind: CodeLifeLandmarkKind): number {
  if (kind === "dev-board") return 12;
  if (kind === "router-core" || kind === "packet-router" || kind === "nas-racks") return 10;
  if (kind === "camera-iris" || kind === "speaker-chamber") return 8;
  return 7;
}

function getLandmarkLineCount(kind: CodeLifeLandmarkKind): number {
  if (kind === "dev-board") return 18;
  if (kind === "router-core" || kind === "packet-router") return 16;
  if (kind === "printer-throat" || kind === "speaker-chamber") return 14;
  return 10;
}

function seededUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

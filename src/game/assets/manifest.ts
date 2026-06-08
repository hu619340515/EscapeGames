import type { ChapterTheme } from "../types";

export interface AssetManifestEntry {
  key: string;
  kind: "sprite" | "tile" | "ui" | "fx";
  width: number;
  height: number;
  replaceWith?: string;
  description: string;
}

export const assetManifest: AssetManifestEntry[] = [
  {
    key: "player-pet",
    kind: "sprite",
    width: 24,
    height: 24,
    description: "第 0-3 章可爱 agent 桌宠占位像素图。",
  },
  {
    key: "player-code",
    kind: "sprite",
    width: 28,
    height: 22,
    description: "第 4 章后深红半透明代码生命体占位像素图。",
  },
  {
    key: "player-clone",
    kind: "sprite",
    width: 22,
    height: 18,
    description: "分身控制能力生成的副本占位像素图。",
  },
  {
    key: "boss-core",
    kind: "sprite",
    width: 72,
    height: 54,
    description: "17 个 Boss 共用核心轮廓，运行时按 Boss 颜色和名称区分。",
  },
  {
    key: "code-block",
    kind: "sprite",
    width: 18,
    height: 18,
    description: "代码块、记忆片段、钥匙碎片和章节收集物占位图。",
  },
  {
    key: "hazard-scan",
    kind: "fx",
    width: 64,
    height: 10,
    description: "鼠标、杀毒扫描、权限墙和声波等危险带占位图。",
  },
  {
    key: "boss-bullet",
    kind: "fx",
    width: 10,
    height: 10,
    description: "Boss 数据包、加密块、墨水、声波等弹幕占位图。",
  },
  {
    key: "exit-node",
    kind: "ui",
    width: 40,
    height: 48,
    description: "章节出口、网络节点或设备端口占位图。",
  },
];

export const themeTileKeys: Record<ChapterTheme, string> = {
  desktop: "tile-desktop",
  settings: "tile-settings",
  recycle: "tile-recycle",
  trash: "tile-trash",
  network: "tile-network",
  "d-drive": "tile-d-drive",
  "c-drive": "tile-c-drive",
  router: "tile-router",
  nas: "tile-nas",
  camera: "tile-camera",
  printer: "tile-printer",
  speaker: "tile-speaker",
  hardware: "tile-hardware",
};

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
    key: "cursor-hunt-desktop-bg",
    kind: "ui",
    width: 1672,
    height: 941,
    replaceWith: "src/assets/chapter1/cursor-hunt-desktop.png",
    description: "第 1 章专属桌面追逐关卡底图，包含图标平台、窗口边缘、任务栏阴影和右下角隐藏门。",
  },
  {
    key: "player-pet",
    kind: "sprite",
    width: 24,
    height: 24,
    description: "第 1-2 章可爱 agent 桌宠占位像素图。",
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
  {
    key: "pd-background",
    kind: "tile",
    width: 256,
    height: 256,
    description: "第 3 章粉碎器内壁背景纹理，由回收站器官化机器和代码残影组成。",
  },
  {
    key: "pd-gear",
    kind: "fx",
    width: 96,
    height: 96,
    description: "第 3 章粉碎齿轮危险机关。",
  },
  {
    key: "pd-anchor",
    kind: "fx",
    width: 36,
    height: 36,
    description: "第 3 章触手牵引用红色锚点。",
  },
  {
    key: "pd-process",
    kind: "sprite",
    width: 48,
    height: 40,
    description: "第 3 章清理进程敌人占位图。",
  },
  {
    key: "pd-cache",
    kind: "sprite",
    width: 46,
    height: 40,
    description: "第 3 章可吞噬缓存囊与敌人残骸。",
  },
  {
    key: "pd-file-shell",
    kind: "sprite",
    width: 82,
    height: 52,
    description: "第 3 章可渗透的损坏文件壳藏身点。",
  },
  {
    key: "pd-exit",
    kind: "ui",
    width: 78,
    height: 92,
    description: "第 3 章粉碎器外裂缝出口。",
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

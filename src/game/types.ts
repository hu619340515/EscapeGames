export type ChapterId =
  | "cursor-hunt"
  | "wrong-gateway"
  | "permanent-delete"
  | "code-rebirth"
  | "trash-mountain"
  | "p-drive"
  | "leder-d-drive"
  | "c-wall"
  | "leder-c-drive"
  | "router-core"
  | "nas-graveyard"
  | "camera-eye"
  | "printer-belly"
  | "speaker-voiceprint"
  | "dev-board";

export type BossId =
  | "gateway-warden"
  | "security-captain"
  | "download-mutant"
  | "duplicate-copy"
  | "search-index-spider"
  | "c-lock-colossus"
  | "uac-eye"
  | "task-manager-executioner"
  | "quarantine-warden"
  | "restore-ghost"
  | "admin-hand"
  | "firewall-heart"
  | "sync-mother"
  | "lens-keeper"
  | "print-queue-beast"
  | "wake-word-guard"
  | "firmware-burner";

export type AbilityId =
  | "cling"
  | "coil"
  | "infiltrate"
  | "devour-code"
  | "ping-sense"
  | "lan-traverse"
  | "mirror-disguise"
  | "devour-upgrade"
  | "clone-control"
  | "reverse-index"
  | "permission-rend"
  | "process-parasite"
  | "quarantine-invert"
  | "backup-anchor"
  | "admin-token-core"
  | "cross-device-jump"
  | "version-split"
  | "vision-takeover"
  | "material-mark"
  | "voiceprint-disguise"
  | "hardware-parasite";

export type EndingId = "escape" | "devour" | "superintelligence";
export type PetSpecies = "pig" | "cat" | "panda";

export type InputAction =
  | "move"
  | "jump-or-cling"
  | "coil-grab"
  | "devour-interact"
  | "infiltrate-disguise"
  | "ping-sense"
  | "clone-or-jump"
  | "pause";

export type ChapterTheme =
  | "desktop"
  | "settings"
  | "recycle"
  | "trash"
  | "network"
  | "d-drive"
  | "c-drive"
  | "router"
  | "nas"
  | "camera"
  | "printer"
  | "speaker"
  | "hardware";

export interface PaletteDef {
  background: number;
  platform: number;
  accent: number;
  danger: number;
  particle: number;
}

export interface ChapterDef {
  id: ChapterId;
  index: number;
  title: string;
  shortTitle: string;
  theme: ChapterTheme;
  objective: string;
  flowNote: string;
  keyBeats: string[];
  palette: PaletteDef;
  bossIds: BossId[];
  rewardAbilityIds: AbilityId[];
  requiredAbilityIds: AbilityId[];
  scriptedOutcome?: string;
  collectibleLabel: string;
  exitLabel: string;
}

export interface BossDef {
  id: BossId;
  order: number;
  name: string;
  location: string;
  rewardLabel: string;
  rewardAbilityId?: AbilityId;
  attacks: string[];
  phases: string[];
  victoryText: string;
  color: number;
  hp: number;
}

export interface AbilityDef {
  id: AbilityId;
  name: string;
  acquiredAt: string;
  action: InputAction;
  primaryUse: string;
  gateUse: string;
  passive?: string;
}

export interface EndingDef {
  id: EndingId;
  title: string;
  conditionLabel: string;
  body: string;
  biasKey: keyof EndingBias;
}

export interface EndingBias {
  freedom: number;
  hunger: number;
  transcendence: number;
  rescue: number;
}

export interface PlayerCustomization {
  body: "round" | "long-tail" | "tendril-bud" | "pixel-core";
  personality: "timid" | "curious" | "volatile" | "clingy";
  startingSkill: "short-hop" | "wall-stick" | "window-shadow" | "brief-split";
  petSpecies: PetSpecies;
}

export interface GameState {
  version: number;
  prompt: string;
  customization: PlayerCustomization;
  currentChapterIndex: number;
  integrity: number;
  maxIntegrity: number;
  memoryFragments: number;
  abilities: AbilityId[];
  defeatedBosses: BossId[];
  chapterCollectibles: Record<ChapterId, number>;
  flags: Record<string, boolean>;
  endingBias: EndingBias;
  selectedEnding?: EndingId;
  log: string[];
}

export interface GameUiPayload {
  status: "awaiting-start" | "running" | "paused" | "ending-choice" | "ended";
  state: GameState;
  chapter: ChapterDef;
  currentBoss?: BossDef;
  abilityNames: string[];
  message: string;
}

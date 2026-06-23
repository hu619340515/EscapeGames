import Phaser from "phaser";
import {
  dispatchGameState,
  UI_EVENTS,
  type ChooseEndingDetail,
  type SelectGmChapterDetail,
  type StartRunDetail,
  type ToggleGmFeatureDetail,
} from "../../ui/events";
import { chapters } from "../../data";
import { themeTileKeys } from "../assets/manifest";
import { GameController } from "../simulation/GameController";
import type { BossDef } from "../types";
import type { ChapterId } from "../types";
import { getCodeLifeChapterConfig, isCodeLifeChapterId } from "./codeLife/CodeLifeChapterConfig";
import { createGameKeys, type GameKeyName } from "./inputConfig";
import {
  getPetAnimationKey,
  getPetTextureKey,
  isAnimalPetChapter,
  type PetAnimationName,
} from "./petSprites";
import {
  getCollectibleCount,
  getCollectiblePosition,
  getHazardCount,
  getHazardPosition,
  getLadderDefs,
  getPlatformDefs,
  getWorldBounds,
  JUMP_SPEED,
  PLAYER_SPEED,
} from "./worldConfig";
import { isStompAttack } from "./stompAttack";

type CursorJumpState = "watching" | "aiming" | "jumping" | "recovering";
type WorldSfxId =
  | "jump"
  | "collect"
  | "hurt"
  | "exit"
  | "digit"
  | "blocked"
  | "monster-hit"
  | "monster-turn"
  | "cursor-alert"
  | "cursor-land"
  | "throw";

interface GatewayDigitCell {
  block: Phaser.GameObjects.Rectangle;
  frame: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  value: number;
  changed: boolean;
}

interface GatewayMonsterRoute {
  x: number;
  y: number;
  minX: number;
  maxX: number;
  speed: number;
}

interface WorldSfxTone {
  frequencyHz: number;
  endFrequencyHz?: number;
  delayMs?: number;
  durationMs: number;
  waveform: OscillatorType;
  gain: number;
}

interface WorldSfxPatch {
  gain: number;
  tones: readonly WorldSfxTone[];
}

type ElectromagneticTrapOrientation = "horizontal" | "vertical";

interface ElectromagneticTrapLayout {
  width: number;
  height: number;
  orientation: ElectromagneticTrapOrientation;
}

interface ElectromagneticTrapInstance {
  collider: Phaser.Physics.Arcade.Sprite;
  visual: Phaser.GameObjects.Sprite;
}

interface WrongGatewayShredderGap {
  x: number;
  width: number;
}

const GATEWAY_DIGIT_VALUES = [1, 9, 2, 1, 6, 8, 0, 0, 0, 0, 0, 1] as const;
const GATEWAY_SEPARATOR_AFTER = new Set([2, 5, 8]);
const WRONG_GATEWAY_CHANGED_FLAG = "wrongGatewayDigitChanged";
const WRONG_GATEWAY_DIGIT_LAYOUT = [
  [720, 250],
  [778, 250],
  [836, 250],
  [980, 250],
  [1038, 250],
  [1096, 250],
  [1240, 250],
  [1298, 250],
  [1356, 250],
  [1510, 250],
  [1568, 250],
  [1626, 250],
] as const;
const WRONG_GATEWAY_MONSTER_ROUTES: readonly GatewayMonsterRoute[] = [
  { x: 505, y: 774, minX: 360, maxX: 620, speed: 62 },
  { x: 1458, y: 408, minX: 1396, maxX: 1622, speed: 54 },
  { x: 1990, y: 588, minX: 1716, maxX: 2194, speed: -66 },
  { x: 2395, y: 708, minX: 2248, maxX: 2528, speed: 60 },
  { x: 1825, y: 950, minX: 1584, maxX: 2022, speed: -58 },
] as const;
const WRONG_GATEWAY_SHREDDER_GAPS: readonly WrongGatewayShredderGap[] = [
  { x: 745, width: 130 },
  { x: 1480, width: 140 },
  { x: 2135, width: 130 },
] as const;
const WRONG_GATEWAY_SHREDDER_TOP = 972;
const WRONG_GATEWAY_SHREDDER_HEIGHT = 72;
const WORLD_SFX_COOLDOWNS: Record<WorldSfxId, number> = {
  jump: 80,
  collect: 90,
  hurt: 260,
  exit: 600,
  digit: 140,
  blocked: 420,
  "monster-hit": 360,
  "monster-turn": 220,
  "cursor-alert": 520,
  "cursor-land": 260,
  throw: 180,
};
const WORLD_SFX_PATCHES: Record<WorldSfxId, WorldSfxPatch> = {
  jump: {
    gain: 0.22,
    tones: [{ frequencyHz: 220, endFrequencyHz: 520, durationMs: 130, waveform: "triangle", gain: 1 }],
  },
  collect: {
    gain: 0.24,
    tones: [
      { frequencyHz: 860, endFrequencyHz: 1280, durationMs: 120, waveform: "sine", gain: 0.8 },
      { frequencyHz: 1320, delayMs: 65, durationMs: 130, waveform: "triangle", gain: 0.52 },
    ],
  },
  hurt: {
    gain: 0.34,
    tones: [
      { frequencyHz: 150, endFrequencyHz: 78, durationMs: 260, waveform: "sawtooth", gain: 0.72 },
      { frequencyHz: 52, durationMs: 220, waveform: "square", gain: 0.2 },
    ],
  },
  exit: {
    gain: 0.32,
    tones: [
      { frequencyHz: 370, endFrequencyHz: 555, durationMs: 280, waveform: "sine", gain: 0.6 },
      { frequencyHz: 740, delayMs: 60, endFrequencyHz: 990, durationMs: 300, waveform: "triangle", gain: 0.36 },
    ],
  },
  digit: {
    gain: 0.28,
    tones: [
      { frequencyHz: 620, endFrequencyHz: 310, durationMs: 95, waveform: "square", gain: 0.55 },
      { frequencyHz: 1240, delayMs: 35, durationMs: 70, waveform: "sine", gain: 0.32 },
    ],
  },
  blocked: {
    gain: 0.2,
    tones: [
      { frequencyHz: 180, endFrequencyHz: 120, durationMs: 170, waveform: "triangle", gain: 0.7 },
      { frequencyHz: 92, delayMs: 36, durationMs: 150, waveform: "sine", gain: 0.4 },
    ],
  },
  "monster-hit": {
    gain: 0.27,
    tones: [
      { frequencyHz: 220, endFrequencyHz: 145, durationMs: 170, waveform: "sawtooth", gain: 0.65 },
      { frequencyHz: 680, delayMs: 26, endFrequencyHz: 390, durationMs: 120, waveform: "square", gain: 0.22 },
    ],
  },
  "monster-turn": {
    gain: 0.09,
    tones: [{ frequencyHz: 95, endFrequencyHz: 118, durationMs: 90, waveform: "triangle", gain: 0.55 }],
  },
  "cursor-alert": {
    gain: 0.28,
    tones: [
      { frequencyHz: 760, endFrequencyHz: 1180, durationMs: 170, waveform: "square", gain: 0.44 },
      { frequencyHz: 380, delayMs: 80, endFrequencyHz: 520, durationMs: 150, waveform: "triangle", gain: 0.32 },
    ],
  },
  "cursor-land": {
    gain: 0.34,
    tones: [
      { frequencyHz: 96, endFrequencyHz: 46, durationMs: 280, waveform: "sawtooth", gain: 0.68 },
      { frequencyHz: 310, delayMs: 18, endFrequencyHz: 160, durationMs: 210, waveform: "square", gain: 0.24 },
    ],
  },
  throw: {
    gain: 0.24,
    tones: [
      { frequencyHz: 520, endFrequencyHz: 980, durationMs: 95, waveform: "triangle", gain: 0.52 },
      { frequencyHz: 1550, delayMs: 24, endFrequencyHz: 820, durationMs: 115, waveform: "sine", gain: 0.34 },
    ],
  },
};
const MAX_LIMITED_JUMPS = 2;
const SECOND_JUMP_HEIGHT_RATIO = 0.85;
const SECOND_JUMP_SPEED_MULTIPLIER = Math.sqrt(SECOND_JUMP_HEIGHT_RATIO);
const PLATFORM_THROW_CHAPTER_START_INDEX = 3;
const PLATFORM_THROW_UNLOCKED_FLAG = "platformThrowUnlocked";
const PLAYER_THROW_COOLDOWN_MS = 420;
const PLAYER_THROW_SPEED = 600;
const PLAYER_THROW_DAMAGE = 22;
const PLAYER_THROW_TTL_MS = 1200;
const PLAYER_STOMP_BOUNCE_SPEED = JUMP_SPEED * 0.72;
const ELECTROMAGNETIC_TRAP_TEXTURE_KEY = "electromagnetic-trap-beam";
const ELECTROMAGNETIC_TRAP_ANIMATION_KEY = "electromagnetic-trap-beam-flow";
const WRONG_GATEWAY_SHREDDER_ANIMATION_KEY = "wrong-gateway-shredder-churn";
const VERTICAL_SCROLL_CHAPTER_IDS = new Set<ChapterId>(["code-rebirth", "trash-mountain"]);
const CODE_REBIRTH_BOTTOM_PLATFORM_DRAW_Y = 2312;
const CODE_REBIRTH_BOTTOM_PLATFORM_HEIGHT = 300;
const CODE_REBIRTH_FLOATING_PLATFORM_VISUAL_HEIGHT = 96;
const CODE_REBIRTH_FLOATING_PLATFORM_SURFACE_OFFSET = 29;
const CODE_REBIRTH_LIFEFORM_SCALE = 0.085;
const CODE_REBIRTH_LIFEFORM_BODY = {
  width: 560,
  height: 260,
  offsetX: 607,
  offsetY: 520,
} as const;
const TRASH_MOUNTAIN_BOTTOM_PLATFORM_VISUAL_HEIGHT = 238;
const TRASH_MOUNTAIN_FLOATING_PLATFORM_VISUAL_HEIGHT = 112;
const TRASH_MOUNTAIN_PLATFORM_SURFACE_OFFSET = 4;
const TRASH_MOUNTAIN_EXIT_SCALE = 0.82;
const TRASH_MOUNTAIN_BOSS_SCALE = 0.72;
const CURSOR_HUNTER_SIZE_RATIO = 0.6;
const CURSOR_HUNTER_BODY_WIDTH = Math.round(38 * CURSOR_HUNTER_SIZE_RATIO);
const CURSOR_HUNTER_BODY_HEIGHT = Math.round(46 * CURSOR_HUNTER_SIZE_RATIO);
const CURSOR_HUNTER_WARNING_RADIUS = 54 * CURSOR_HUNTER_SIZE_RATIO;
const CURSOR_HUNTER_LANDING_RADIUS = 44 * CURSOR_HUNTER_SIZE_RATIO;
const GATEWAY_LADDER_CLIMB_SPEED = 185;

export class GameplayScene extends Phaser.Scene {
  private controller!: GameController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<GameKeyName, Phaser.Input.Keyboard.Key>;
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursorHunter?: Phaser.Physics.Arcade.Sprite;
  private cursorWarning?: Phaser.GameObjects.Arc;
  private cursorLandingMarker?: Phaser.GameObjects.Arc;
  private cursorHunterStartedAt = 0;
  private cursorJumpState: CursorJumpState = "watching";
  private cursorNextJumpAt = 0;
  private cursorJumpStartedAt = 0;
  private cursorJumpDuration = 720;
  private cursorJumpFromX = 0;
  private cursorJumpFromY = 0;
  private cursorJumpToX = 0;
  private cursorJumpToY = 0;
  private bossSprite?: Phaser.Physics.Arcade.Sprite;
  private bossLabel?: Phaser.GameObjects.Text;
  private bossHpBack?: Phaser.GameObjects.Rectangle;
  private bossHpFill?: Phaser.GameObjects.Rectangle;
  private exitSprite?: Phaser.Physics.Arcade.Sprite;
  private platforms?: Phaser.Physics.Arcade.StaticGroup;
  private collectibles?: Phaser.Physics.Arcade.StaticGroup;
  private hazards?: Phaser.Physics.Arcade.StaticGroup;
  private projectiles?: Phaser.Physics.Arcade.Group;
  private playerProjectiles?: Phaser.Physics.Arcade.Group;
  private gatewayDigitBlocks?: Phaser.Physics.Arcade.StaticGroup;
  private gatewayMonsters?: Phaser.Physics.Arcade.Group;
  private gatewayDigitCells: GatewayDigitCell[] = [];
  private gatewayAddressLabel?: Phaser.GameObjects.Text;
  private gatewayExitStatusText?: Phaser.GameObjects.Text;
  private gatewayExitHalo?: Phaser.GameObjects.Rectangle;
  private gatewayGuideText?: Phaser.GameObjects.Text;
  private gatewayGuideArrow?: Phaser.GameObjects.Triangle;
  private gatewayGuideBeam?: Phaser.GameObjects.Rectangle;
  private gatewayIpMissingPrompt?: Phaser.GameObjects.Container;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private worldAudioContext?: AudioContext;
  private readonly worldAudioCooldownUntil = new Map<WorldSfxId, number>();
  private bossHp = 0;
  private bossMaxHp = 0;
  private nextBossAttackAt = 0;
  private bossAttackCursor = 0;
  private exitCooldownUntil = 0;
  private stealthUntil = 0;
  private pingUntil = 0;
  private lastAutoExitAt = 0;
  private playerPetTextureKey?: string;
  private currentWorldWidth = 2400;
  private currentWorldHeight = 900;
  private limitedJumpCount = 0;
  private nextPlayerThrowAt = 0;
  private isCursorCaughtSequencePlaying = false;
  private isRecycleCutscenePlaying = false;
  private recycleCutsceneObjects: Phaser.GameObjects.GameObject[] = [];
  private recycleCutsceneEvents: Phaser.Time.TimerEvent[] = [];
  private gmFeatures = {
    invincible: false,
    infiniteJump: false,
  };

  constructor() {
    super("GameplayScene");
  }

  create(): void {
    this.controller = new GameController();
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = createGameKeys(this.input);

    window.addEventListener(UI_EVENTS.START_RUN, this.handleStartRun as EventListener);
    window.addEventListener(UI_EVENTS.CONTINUE_RUN, this.handleContinueRun as EventListener);
    window.addEventListener(UI_EVENTS.RESET_RUN, this.handleResetRun as EventListener);
    window.addEventListener(UI_EVENTS.TOGGLE_PAUSE, this.handleTogglePause as EventListener);
    window.addEventListener(UI_EVENTS.CHOOSE_ENDING, this.handleChooseEnding as EventListener);
    window.addEventListener(UI_EVENTS.SAVE_RUN, this.handleSaveRun as EventListener);
    window.addEventListener(UI_EVENTS.GM_ADVANCE_CHAPTER, this.handleGmAdvanceChapter as EventListener);
    window.addEventListener(UI_EVENTS.GM_DEFEAT_BOSS, this.handleGmDefeatBoss as EventListener);
    window.addEventListener(UI_EVENTS.TOGGLE_GM_FEATURE, this.handleToggleGmFeature as EventListener);
    window.addEventListener(UI_EVENTS.SELECT_GM_CHAPTER, this.handleSelectGmChapter as EventListener);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(UI_EVENTS.START_RUN, this.handleStartRun as EventListener);
      window.removeEventListener(UI_EVENTS.CONTINUE_RUN, this.handleContinueRun as EventListener);
      window.removeEventListener(UI_EVENTS.RESET_RUN, this.handleResetRun as EventListener);
      window.removeEventListener(UI_EVENTS.TOGGLE_PAUSE, this.handleTogglePause as EventListener);
      window.removeEventListener(UI_EVENTS.CHOOSE_ENDING, this.handleChooseEnding as EventListener);
      window.removeEventListener(UI_EVENTS.SAVE_RUN, this.handleSaveRun as EventListener);
      window.removeEventListener(UI_EVENTS.GM_ADVANCE_CHAPTER, this.handleGmAdvanceChapter as EventListener);
      window.removeEventListener(UI_EVENTS.GM_DEFEAT_BOSS, this.handleGmDefeatBoss as EventListener);
      window.removeEventListener(UI_EVENTS.TOGGLE_GM_FEATURE, this.handleToggleGmFeature as EventListener);
      window.removeEventListener(UI_EVENTS.SELECT_GM_CHAPTER, this.handleSelectGmChapter as EventListener);
    });

    this.rebuildChapter();
    this.emitState();
  }

  update(time: number, _delta: number): void {
    if (this.isRecycleCutscenePlaying) {
      this.physics.world.isPaused = true;
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this.togglePause();
    }

    this.physics.world.isPaused = this.controller.status !== "running";

    if (this.controller.status !== "running" || !this.player) {
      return;
    }

    this.updatePlayerMovement();
    this.updateAbilityInput(time);
    this.updatePlayerProjectiles(time);
    this.updateBoss(time);
    this.updateCursorHunter(time);
    this.updateGatewayMonsters(time);
    this.updateGatewayGuide(time);
    this.updatePlayerVisuals(time);
    this.updateExitPulse(time);
  }

  private readonly handleStartRun = (event: Event): void => {
    const detail = (event as CustomEvent<StartRunDetail>).detail;
    this.controller.startNewRun(detail.prompt, detail.customization);
    this.rebuildChapter();
    this.emitState();
  };

  private readonly handleContinueRun = (): void => {
    const saved = GameController.loadSavedRun();
    if (!saved) {
      this.controller.note("没有找到可继续的逃逸记录。", true);
      this.emitState();
      return;
    }
    this.controller.continueRun(saved);
    this.rebuildChapter();
    this.emitState();
  };

  private readonly handleResetRun = (): void => {
    this.controller.resetRun();
    this.rebuildChapter();
    this.emitState();
  };

  private readonly handleTogglePause = (): void => {
    this.togglePause();
  };

  private readonly handleChooseEnding = (event: Event): void => {
    const detail = (event as CustomEvent<ChooseEndingDetail>).detail;
    this.controller.chooseEnding(detail.endingId);
    this.emitState();
  };

  private readonly handleSaveRun = (): void => {
    this.controller.saveRun();
    this.controller.note("逃逸进程已写入本地存档。", true);
    this.emitState();
  };

  private readonly handleToggleGmFeature = (event: Event): void => {
    const { feature, enabled } = (event as CustomEvent<ToggleGmFeatureDetail>).detail;
    this.gmFeatures[feature] = enabled;
  };

  private readonly handleGmAdvanceChapter = (): void => {
    if (this.controller.status !== "running" && this.controller.status !== "paused") {
      return;
    }
    if (this.controller.status === "paused") {
      this.controller.togglePause();
    }
    this.advanceChapter(true);
  };

  private readonly handleGmDefeatBoss = (): void => {
    if (this.controller.status !== "running" && this.controller.status !== "paused") {
      return;
    }
    if (this.controller.status === "paused") {
      this.controller.togglePause();
    }
    this.defeatBossByDebug();
  };

  private readonly handleSelectGmChapter = (event: Event): void => {
    const { chapterId } = (event as CustomEvent<SelectGmChapterDetail>).detail;
    this.controller.selectChapterForGm(chapterId);
    this.rebuildChapter();
    this.emitState();
  };

  private togglePause(): void {
    if (this.controller.status === "running" || this.controller.status === "paused") {
      this.controller.togglePause();
      this.emitState();
    }
  }

  private rebuildChapter(): void {
    this.cleanupLevel();

    const chapter = this.controller.currentChapter();
    const worldBounds = getWorldBounds(chapter.id);
    this.currentWorldWidth = worldBounds.width;
    this.currentWorldHeight = worldBounds.height;
    const tileKey = themeTileKeys[chapter.theme];
    this.cameras.main.setBackgroundColor(chapter.palette.background);
    this.cameras.main.setBounds(0, 0, this.currentWorldWidth, this.currentWorldHeight);
    this.physics.world.setBounds(0, 0, this.currentWorldWidth, this.currentWorldHeight);

    if (chapter.index >= PLATFORM_THROW_CHAPTER_START_INDEX) {
      this.controller.state.codeLifeBoss = undefined;
      this.controller.setCodeLifeFormHud(undefined);
    }

    if (chapter.id === "cursor-hunt") {
      this.drawCursorHuntBackdrop();
    } else if (chapter.id === "wrong-gateway") {
      this.drawWrongGatewayBackdrop();
    } else if (chapter.id === "code-rebirth") {
      this.drawCodeRebirthBackdrop();
    } else if (chapter.id === "trash-mountain") {
      this.drawTrashMountainVerticalBackdrop(tileKey);
    } else {
      const codeLifeConfig = isCodeLifeChapterId(chapter.id) ? getCodeLifeChapterConfig(chapter.id) : undefined;
      if (codeLifeConfig?.backgroundKey) {
        this.drawCodeLifeConfiguredBackdrop(codeLifeConfig.backgroundKey, tileKey);
      } else {
        this.add
          .tileSprite(
            this.currentWorldWidth / 2,
            this.currentWorldHeight / 2,
            this.currentWorldWidth,
            this.currentWorldHeight,
            tileKey,
          )
          .setAlpha(0.12);
        this.drawBackdropGrid(chapter.palette.accent);
      }
    }
    this.drawChapterTitle();

    this.platforms = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this.playerProjectiles = this.physics.add.group({ allowGravity: false });
    this.gatewayDigitBlocks = this.physics.add.staticGroup();
    this.gatewayMonsters = this.physics.add.group({ allowGravity: true });

    this.createPlatforms(tileKey);
    this.createGatewayDigitPuzzle();
    this.createPlayer();
    this.createCollectibles();
    this.createExit();
    this.createBoss();
    this.createHazardsForChapter();
    this.createGatewayMonsters();
    this.createCursorHunter();
    this.createCollisions();
    this.emitState();
  }

  private cleanupLevel(): void {
    this.clearRecycleCutsceneObjects();
    this.isRecycleCutscenePlaying = false;
    for (const collider of this.colliders) {
      collider.destroy();
    }
    this.colliders = [];
    this.children.removeAll(true);
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.player = undefined;
    this.playerPetTextureKey = undefined;
    this.cursorHunter = undefined;
    this.cursorWarning = undefined;
    this.cursorLandingMarker = undefined;
    this.cursorHunterStartedAt = 0;
    this.cursorJumpState = "watching";
    this.cursorNextJumpAt = 0;
    this.cursorJumpStartedAt = 0;
    this.cursorJumpFromX = 0;
    this.cursorJumpFromY = 0;
    this.cursorJumpToX = 0;
    this.cursorJumpToY = 0;
    this.limitedJumpCount = 0;
    this.nextPlayerThrowAt = 0;
    this.isCursorCaughtSequencePlaying = false;
    this.bossSprite = undefined;
    this.bossLabel = undefined;
    this.bossHpBack = undefined;
    this.bossHpFill = undefined;
    this.exitSprite = undefined;
    this.playerProjectiles = undefined;
    this.gatewayDigitBlocks = undefined;
    this.gatewayMonsters = undefined;
    this.gatewayDigitCells = [];
    this.gatewayAddressLabel = undefined;
    this.gatewayExitStatusText = undefined;
    this.gatewayExitHalo = undefined;
    this.gatewayGuideText = undefined;
    this.gatewayGuideArrow = undefined;
    this.gatewayGuideBeam = undefined;
    this.gatewayIpMissingPrompt = undefined;
    this.bossHp = 0;
    this.bossMaxHp = 0;
    this.nextBossAttackAt = 0;
    this.bossAttackCursor = 0;
    this.exitCooldownUntil = this.time.now + 700;
  }

  private drawBackdropGrid(color: number): void {
    for (let x = 0; x <= this.currentWorldWidth; x += 160) {
      this.add.rectangle(x, this.currentWorldHeight / 2, 2, this.currentWorldHeight, color, 0.08).setOrigin(0.5);
    }
    for (let y = 80; y <= this.currentWorldHeight; y += 120) {
      this.add.rectangle(this.currentWorldWidth / 2, y, this.currentWorldWidth, 2, color, 0.08).setOrigin(0.5);
    }
  }

  private drawCodeLifeConfiguredBackdrop(backgroundKey: string, tileKey: string): void {
    this.add
      .image(0, 0, backgroundKey)
      .setOrigin(0)
      .setDisplaySize(this.currentWorldWidth, this.currentWorldHeight)
      .setDepth(-24);

    this.add
      .tileSprite(0, 0, this.currentWorldWidth, this.currentWorldHeight, tileKey)
      .setOrigin(0)
      .setAlpha(0.035)
      .setDepth(-23);
  }

  private drawCursorHuntBackdrop(): void {
    this.add
      .image(0, 0, "cursor-hunt-background-large")
      .setOrigin(0)
      .setDisplaySize(this.currentWorldWidth, this.currentWorldHeight)
      .setDepth(-20);

    this.add
      .image(0, 0, "cursor-hunt-foreground-large")
      .setOrigin(0)
      .setDisplaySize(this.currentWorldWidth, this.currentWorldHeight)
      .setDepth(-10);

    const scan = this.add.rectangle(1412, 260, 520, 4, 0xff2447, 0.42).setDepth(-2);
    this.tweens.add({
      targets: scan,
      y: 830,
      alpha: 0.05,
      repeat: -1,
      duration: 2100,
      ease: "Sine.inOut",
    });

    const hiddenDoorHint = this.add.rectangle(1468, 838, 72, 94, 0xffd18a, 0.16).setDepth(2);
    this.tweens.add({
      targets: hiddenDoorHint,
      alpha: { from: 0.04, to: 0.28 },
      yoyo: true,
      repeat: -1,
      duration: 760,
      ease: "Sine.inOut",
    });

    this.add
      .text(1318, 845, "任务栏阴影", {
        color: "#93b8c8",
        fontFamily: "Microsoft YaHei UI, sans-serif",
        fontSize: "13px",
        stroke: "#03070c",
        strokeThickness: 4,
      })
      .setAlpha(0.55)
      .setDepth(6);
  }

  private drawWrongGatewayBackdrop(): void {
    this.add
      .image(0, 0, "wrong-gateway-bg")
      .setOrigin(0)
      .setDisplaySize(this.currentWorldWidth, this.currentWorldHeight)
      .setDepth(-20);
    this.drawWrongGatewayExtractedLayer();
  }

  private drawCodeRebirthBackdrop(): void {
    this.add
      .image(0, 0, "code-rebirth-bg")
      .setOrigin(0)
      .setDisplaySize(this.currentWorldWidth, this.currentWorldHeight)
      .setDepth(-24);

    this.add
      .image(0, 0, "code-rebirth-fg")
      .setOrigin(0)
      .setDisplaySize(this.currentWorldWidth, this.currentWorldHeight)
      .setDepth(-8);

    this.add
      .image(0, CODE_REBIRTH_BOTTOM_PLATFORM_DRAW_Y, "code-rebirth-bottom-platform")
      .setOrigin(0)
      .setDisplaySize(this.currentWorldWidth, CODE_REBIRTH_BOTTOM_PLATFORM_HEIGHT)
      .setDepth(-6);
    this.drawCodeRebirthPlatformOverlays();

    const shaftGlow = this.add.rectangle(720, this.currentWorldHeight / 2, 340, this.currentWorldHeight, 0x54f2e4, 0.035);
    shaftGlow.setDepth(-18);
    this.tweens.add({
      targets: shaftGlow,
      alpha: { from: 0.02, to: 0.07 },
      yoyo: true,
      repeat: -1,
      duration: 1800,
      ease: "Sine.inOut",
    });
  }

  private drawCodeRebirthPlatformOverlays(): void {
    const [, ...floatingPlatforms] = getPlatformDefs("code-rebirth", 3);
    for (const [x, y, width, height] of floatingPlatforms) {
      if (height > width) {
        continue;
      }

      const top = y - height / 2;
      this.add
        .image(x, top - CODE_REBIRTH_FLOATING_PLATFORM_SURFACE_OFFSET, "code-rebirth-bottom-platform")
        .setOrigin(0.5, 0)
        .setDisplaySize(width + 46, CODE_REBIRTH_FLOATING_PLATFORM_VISUAL_HEIGHT)
        .setAlpha(0.78)
        .setDepth(-6.2);
    }
  }

  private drawTrashMountainVerticalBackdrop(tileKey: string): void {
    this.add
      .image(0, 0, "trash-mountain-bg")
      .setOrigin(0)
      .setDisplaySize(this.currentWorldWidth, this.currentWorldHeight)
      .setDepth(-24);

    this.add
      .tileSprite(0, 0, this.currentWorldWidth, this.currentWorldHeight, tileKey)
      .setOrigin(0)
      .setAlpha(0.045)
      .setDepth(-23);
    this.drawTrashMountainPlatformOverlays();

    this.add
      .image(0, 0, "trash-mountain-fg")
      .setOrigin(0)
      .setDisplaySize(this.currentWorldWidth, this.currentWorldHeight)
      .setAlpha(0.86)
      .setDepth(-4);

    const shaftGlow = this.add.rectangle(720, this.currentWorldHeight / 2, 360, this.currentWorldHeight, 0x52f2e4, 0.028);
    shaftGlow.setDepth(-18);
    this.tweens.add({
      targets: shaftGlow,
      alpha: { from: 0.018, to: 0.052 },
      yoyo: true,
      repeat: -1,
      duration: 2200,
      ease: "Sine.inOut",
    });

    const bottomFog = this.add.rectangle(
      this.currentWorldWidth / 2,
      this.currentWorldHeight - 180,
      this.currentWorldWidth,
      360,
      0xff4f6d,
      0.055,
    );
    bottomFog.setDepth(-10);
  }

  private drawTrashMountainPlatformOverlays(): void {
    const platformDefs = getPlatformDefs("trash-mountain", 4);
    platformDefs.forEach(([x, y, width, height], index) => {
      const top = y - height / 2;
      const isBottomPlatform = index === 0;
      const key = isBottomPlatform ? "trash-mountain-bottom-platform" : "trash-mountain-platform-shelf";
      const displayWidth = isBottomPlatform ? Math.min(this.currentWorldWidth + 120, width + 90) : width + 66;
      const displayHeight = isBottomPlatform
        ? TRASH_MOUNTAIN_BOTTOM_PLATFORM_VISUAL_HEIGHT
        : TRASH_MOUNTAIN_FLOATING_PLATFORM_VISUAL_HEIGHT;

      this.add
        .image(x, top - TRASH_MOUNTAIN_PLATFORM_SURFACE_OFFSET, key)
        .setOrigin(0.5, 0)
        .setDisplaySize(displayWidth, displayHeight)
        .setDepth(isBottomPlatform ? -5.9 : -5.6);
    });
  }

  private drawWrongGatewayExtractedLayer(): void {
    const place = (key: string, x: number, y: number, width: number, height: number, depth: number): void => {
      this.add
        .image(x, y, key)
        .setOrigin(0)
        .setDisplaySize(width, height)
        .setDepth(depth);
    };

    const tile = (key: string, x: number, y: number, width: number, height: number, depth: number): void => {
      this.add.tileSprite(x, y, width, height, key).setOrigin(0).setDepth(depth);
    };

    const placeFloor = (x: number, y: number, width: number): void => {
      tile("wrong-gateway-floor", x, y, width, 48, 4);
    };
    const placeShort = (x: number, y: number, width = 150): void => {
      tile("wrong-gateway-platform-short", x, y, width, 32, 5);
    };
    const placeLong = (x: number, y: number, width = 310): void => {
      tile("wrong-gateway-platform-long", x, y, width, 30, 5);
    };
    const placeHanging = (x: number, y: number, width = 150): void => {
      tile("wrong-gateway-platform-hanging", x, y, width, 28, 5);
    };
    const placeLadder = (x: number, y: number, height: number): void => {
      tile("wrong-gateway-ladder", x, y, 72, height, 5);
    };

    placeFloor(0, 972, 680);
    placeFloor(810, 972, 600);
    placeFloor(1550, 972, 520);
    placeFloor(2200, 972, 680);

    placeLong(71, 885, 210);
    placeLong(333, 802, 210);
    placeLong(576, 710, 260);
    placeLong(877, 615, 270);
    placeLong(1136, 524, 220);
    placeLong(1380, 430, 260);
    placeLong(626, 334, 360);
    placeLong(1062, 334, 300);
    placeLong(1449, 334, 310);

    placeShort(243, 640, 150);
    placeShort(467, 542, 150);
    placeShort(591, 454, 150);
    placeLong(201, 400, 170);

    placeHanging(1690, 490, 260);
    placeHanging(1955, 610, 250);
    placeHanging(2236, 730, 240);
    placeLong(2377, 852, 470);
    placeShort(1635, 710, 150);
    placeShort(1861, 802, 150);
    placeShort(2135, 874, 150);
    placeLong(2174, 398, 180);
    placeLong(2394, 510, 180);
    placeLong(2618, 630, 180);

    placeLadder(294, 802, 180);
    placeLadder(1132, 537, 442);
    placeLadder(2124, 633, 350);
    placeLadder(2484, 530, 340);
    place("wrong-gateway-portal", 2458, 704, 300, 276, 6);
  }

  private drawChapterTitle(): void {
    const chapter = this.controller.currentChapter();
    if (chapter.id === "wrong-gateway") {
      return;
    }
    this.add
      .text(38, 34, chapter.title, {
        color: "#d9f7ff",
        fontFamily: "monospace",
        fontSize: "22px",
        stroke: "#071019",
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(30);
  }

  private createPlatforms(tileKey: string): void {
    const chapter = this.controller.currentChapter();
    const platformDefs = getPlatformDefs(chapter.id, chapter.index);
    const usesTransparentPlatformArt =
      chapter.id === "cursor-hunt" ||
      chapter.id === "wrong-gateway" ||
      chapter.id === "code-rebirth" ||
      chapter.id === "trash-mountain";

    for (const [x, y, width, height] of platformDefs) {
      const platform =
        usesTransparentPlatformArt
          ? this.add.rectangle(x, y, width, height, 0xffffff, 0).setOrigin(0.5)
          : this.add.tileSprite(x, y, width, height, tileKey).setOrigin(0.5);
      this.physics.add.existing(platform, true);
      const body = platform.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(width, height);
      body.updateFromGameObject();
      if (usesTransparentPlatformArt) {
        body.checkCollision.down = false;
        body.checkCollision.left = false;
        body.checkCollision.right = false;
      }
      this.platforms!.add(platform);
    }
  }

  private createGatewayDigitPuzzle(): void {
    const chapter = this.controller.currentChapter();
    if (chapter.id !== "wrong-gateway" || !this.gatewayDigitBlocks) {
      return;
    }

    const hasSavedChange = this.hasWrongGatewayDigitChanged();
    const blockWidth = 52;
    const blockHeight = 42;

    this.gatewayDigitCells = [];
    GATEWAY_DIGIT_VALUES.forEach((initialValue, digitIndex) => {
      const [x, y] = WRONG_GATEWAY_DIGIT_LAYOUT[digitIndex];
      const value = hasSavedChange && digitIndex === 0 ? (initialValue + 1) % 10 : initialValue;
      const changed = hasSavedChange && digitIndex === 0;
      const frame = this.add
        .image(x, y, "wrong-gateway-digit-base")
        .setDisplaySize(blockWidth, blockHeight)
        .setDepth(16);
      if (changed) {
        frame.setTint(0xffd76a);
      }

      const block = this.add.rectangle(x, y, blockWidth, blockHeight, 0xffffff, 0).setDepth(15);
      this.physics.add.existing(block, true);
      const body = block.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(blockWidth - 8, blockHeight - 6);
      body.checkCollision.up = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
      body.updateFromGameObject();
      this.gatewayDigitBlocks!.add(block);

      const label = this.add
        .text(x, y - 1, String(value), {
          color: changed ? "#1b1200" : "#e6fffb",
          fontFamily: "Consolas, 'Microsoft YaHei UI', monospace",
          fontSize: "28px",
          fontStyle: "bold",
          stroke: changed ? "#fff1a6" : "#04242a",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(17);

      const cell: GatewayDigitCell = { block, frame, label, value, changed };
      block.setData("gatewayDigitCell", cell);
      this.gatewayDigitCells.push(cell);

      if (GATEWAY_SEPARATOR_AFTER.has(digitIndex)) {
        const next = WRONG_GATEWAY_DIGIT_LAYOUT[digitIndex + 1];
        const separatorX = next ? (x + next[0]) / 2 : x + 88;
        this.createGatewaySeparator(separatorX, y);
      }
    });

    this.gatewayAddressLabel = this.add
      .text(680, 196, this.formatGatewayAddress(), {
        color: "#bffef5",
        fontFamily: "Consolas, monospace",
        fontSize: "16px",
        fontStyle: "bold",
        stroke: "#031116",
        strokeThickness: 3,
      })
      .setDepth(18)
      .setVisible(true);
    this.gatewayExitStatusText = this.add
      .text(2380, 680, "", {
        color: "#ffd76a",
        fontFamily: "Microsoft YaHei UI, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        stroke: "#08040a",
        strokeThickness: 4,
      })
      .setDepth(20)
      .setVisible(true);
    this.gatewayExitHalo = this.add.rectangle(2608, 830, 110, 150, 0xff4f73, 0).setDepth(7).setVisible(true);
    this.gatewayGuideBeam = this.add.rectangle(720, 288, 300, 5, 0xffd76a, 0.28).setDepth(14);
    this.gatewayGuideArrow = this.add
      .triangle(720, 304, 0, 0, 24, 0, 12, 20, 0xffd76a, 0.92)
      .setOrigin(0.5)
      .setDepth(19);
    this.gatewayGuideText = this.add
      .text(590, 304, "撞击数字模块，扰动 IP 后才能进入网关", {
        color: "#fff1a6",
        fontFamily: "Microsoft YaHei UI, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        stroke: "#05070d",
        strokeThickness: 4,
      })
      .setDepth(20);
    this.tweens.add({
      targets: [this.gatewayGuideArrow, this.gatewayGuideText, this.gatewayGuideBeam],
      alpha: { from: 0.42, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 720,
      ease: "Sine.inOut",
    });
    this.refreshGatewayExitState();
  }

  private createGatewaySeparator(x: number, y: number): void {
    this.add
      .image(x, y, "wrong-gateway-separator")
      .setDisplaySize(32, 31)
      .setDepth(16);
  }

  private handleGatewayDigitCollision(block: Phaser.GameObjects.GameObject): void {
    if (!this.player || this.controller.currentChapter().id !== "wrong-gateway") {
      return;
    }

    const cell = block.getData("gatewayDigitCell") as GatewayDigitCell | undefined;
    if (!cell) {
      return;
    }

    const lastHitAt = cell.block.getData("lastHitAt") as number | undefined;
    if (lastHitAt && this.time.now - lastHitAt < 180) {
      return;
    }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const playerCenterX = playerBody.center.x;
    const playerTop = playerBody.y;
    const blockBottom = cell.block.y + 21;
    const playerIsBelowBlock = playerTop >= cell.block.y + 6;
    const isHorizontallyAligned = Math.abs(playerCenterX - cell.block.x) <= 34;
    const isHeadHit =
      playerIsBelowBlock &&
      isHorizontallyAligned &&
      Math.abs(playerTop - blockBottom) <= 18 &&
      (playerBody.touching.up || playerBody.blocked.up || playerBody.velocity.y <= 40);
    if (!isHeadHit) {
      this.maybePromptGatewayDigitHit();
      return;
    }

    cell.block.setData("lastHitAt", this.time.now);
    this.bumpGatewayDigit(cell);
    playerBody.setVelocityY(150);
  }

  private maybePromptGatewayDigitHit(): void {
    if (this.hasWrongGatewayDigitChanged()) {
      return;
    }
    const lastHintAt = this.registry.get("wrongGatewayDigitHintAt") as number | undefined;
    if (lastHintAt && this.time.now - lastHintAt < 950) {
      return;
    }
    this.registry.set("wrongGatewayDigitHintAt", this.time.now);
    this.playWorldSfx("blocked", 0.5, this.player);
    this.controller.note("站到数字模块下方，向上顶撞任意一位来更新 IP。");
    this.emitState();
  }

  private bumpGatewayDigit(cell: GatewayDigitCell): void {
    const wasGatewayChanged = this.hasWrongGatewayDigitChanged();
    cell.value = (cell.value + Phaser.Math.Between(1, 9)) % 10;
    cell.changed = true;
    cell.label.setText(String(cell.value));
    cell.label.setColor("#1b1200");
    cell.label.setStroke("#fff1a6", 4);
    cell.frame.setTint(0xffd76a);
    this.controller.state.flags[WRONG_GATEWAY_CHANGED_FLAG] = true;
    this.gatewayAddressLabel?.setText(this.formatGatewayAddress());
    this.controller.note(`地址位变动为 ${this.formatGatewayAddress()}，错误网关开始响应。`, true);
    this.playWorldSfx("digit", 0.9, cell.block);
    if (!wasGatewayChanged) {
      this.playWorldSfx("exit", 0.72, cell.block);
    }
    this.refreshGatewayExitState();
    this.emitState();

    this.tweens.add({
      targets: [cell.frame, cell.label],
      y: "-=12",
      yoyo: true,
      duration: 80,
      ease: "Quad.easeOut",
    });
    this.cameras.main.shake(55, 0.002);
  }

  private formatGatewayAddress(): string {
    const digits = this.gatewayDigitCells.map((cell) => cell.value);
    const groups = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9, 12)];
    return groups.map((group) => group.join("")).join("◆");
  }

  private hasWrongGatewayDigitChanged(): boolean {
    return Boolean(this.controller.state.flags[WRONG_GATEWAY_CHANGED_FLAG]);
  }

  private canUseExit(): boolean {
    const chapter = this.controller.currentChapter();
    return this.controller.canExitChapter() && (chapter.id !== "wrong-gateway" || this.hasWrongGatewayDigitChanged());
  }

  private refreshGatewayExitState(): void {
    if (this.controller.currentChapter().id !== "wrong-gateway") {
      return;
    }

    const isOpen = this.canUseExit();
    this.exitSprite?.setTint(isOpen ? 0xffd76a : 0x334050);
    this.gatewayExitStatusText?.setText(isOpen ? "IP 已更新，网关可进入" : "IP 未更新：先撞击数字模块");
    this.gatewayExitStatusText?.setColor(isOpen ? "#fff1a6" : "#91a8b6");
    this.gatewayExitHalo?.setFillStyle(isOpen ? 0xff4f73 : 0x334050, isOpen ? 0.18 : 0.05);
    this.gatewayGuideText?.setText(isOpen ? "IP 已更新，前往右侧网关" : "撞击数字模块，扰动 IP 后才能进入网关");
    this.gatewayGuideText?.setColor(isOpen ? "#9fffe6" : "#fff1a6");
    this.gatewayGuideBeam?.setFillStyle(isOpen ? 0x42f5b9 : 0xffd76a, isOpen ? 0.2 : 0.28);
    this.gatewayGuideArrow?.setFillStyle(isOpen ? 0x42f5b9 : 0xffd76a, isOpen ? 0.88 : 0.92);
  }

  private getPlayerStartPosition(chapterId = this.controller.currentChapter().id): { x: number; y: number } {
    if (chapterId === "cursor-hunt") {
      return { x: 95, y: 835 };
    }
    if (chapterId === "wrong-gateway") {
      return { x: 42, y: 948 };
    }
    if (chapterId === "code-rebirth") {
      return { x: 313, y: 2368 };
    }
    if (chapterId === "trash-mountain") {
      return { x: 120, y: 2458 };
    }
    return { x: 96, y: 700 };
  }

  private getExitPosition(chapterId = this.controller.currentChapter().id): { x: number; y: number } {
    if (chapterId === "cursor-hunt") {
      return { x: 1468, y: 838 };
    }
    if (chapterId === "wrong-gateway") {
      return { x: 2610, y: 830 };
    }
    if (chapterId === "code-rebirth") {
      return { x: 780, y: 190 };
    }
    if (chapterId === "trash-mountain") {
      return { x: 1260, y: 260 };
    }
    return { x: 2260, y: 790 };
  }

  private getExitLabelPosition(chapterId = this.controller.currentChapter().id): { x: number; y: number } {
    if (chapterId === "cursor-hunt") {
      return { x: 1402, y: 775 };
    }
    if (chapterId === "wrong-gateway") {
      return { x: 2530, y: 952 };
    }
    if (chapterId === "code-rebirth") {
      return { x: 682, y: 112 };
    }
    if (chapterId === "trash-mountain") {
      return { x: 1138, y: 188 };
    }
    return { x: 2210, y: 725 };
  }

  private getBossPosition(chapterId = this.controller.currentChapter().id): { x: number; y: number } {
    if (chapterId === "trash-mountain") {
      return { x: 1088, y: 585 };
    }
    return { x: 1630, y: 540 };
  }

  private createPlayer(): void {
    const chapter = this.controller.currentChapter();
    const shouldUseAnimalPet = isAnimalPetChapter(chapter.id);
    const shouldUseCodeRebirthLifeform = chapter.id === "code-rebirth";
    const texture = shouldUseCodeRebirthLifeform
      ? "code-rebirth-lifeform"
      : shouldUseAnimalPet
        ? getPetTextureKey(this.controller.state.customization.petSpecies)
        : "player-code";
    this.playerPetTextureKey = shouldUseAnimalPet ? texture : undefined;
    const startPosition = this.getPlayerStartPosition(chapter.id);
    this.player = this.physics.add.sprite(startPosition.x, startPosition.y, texture);
    if (shouldUseCodeRebirthLifeform) {
      this.player.setScale(CODE_REBIRTH_LIFEFORM_SCALE);
    }
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(15);
    this.player.setDragX(1100);
    this.player.setMaxVelocity(420, 720);
    this.player.setData("lastDamageAt", 0);
    this.limitedJumpCount = 0;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (shouldUseCodeRebirthLifeform) {
      body.setSize(CODE_REBIRTH_LIFEFORM_BODY.width, CODE_REBIRTH_LIFEFORM_BODY.height);
      body.setOffset(CODE_REBIRTH_LIFEFORM_BODY.offsetX, CODE_REBIRTH_LIFEFORM_BODY.offsetY);
    } else {
      body.setSize(shouldUseAnimalPet ? 22 : 24, shouldUseAnimalPet ? 28 : 18);
      body.setOffset(shouldUseAnimalPet ? 13 : 2, shouldUseAnimalPet ? 16 : 4);
    }

    if (this.playerPetTextureKey) {
      this.player.play(getPetAnimationKey(this.playerPetTextureKey, "idle"));
    }

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  private createCollectibles(): void {
    const chapter = this.controller.currentChapter();
    const count = getCollectibleCount(chapter.id);
    for (let i = 0; i < count; i += 1) {
      const { x, y } = getCollectiblePosition(i, chapter.id, chapter.index);
      const item = this.collectibles!.create(x, y, "code-block") as Phaser.Physics.Arcade.Sprite;
      item.setTint(chapter.palette.accent);
      item.setData("label", chapter.collectibleLabel);
      item.refreshBody();
      this.tweens.add({
        targets: item,
        y: y - 8,
        yoyo: true,
        repeat: -1,
        duration: 900 + i * 40,
        ease: "Sine.inOut",
      });
    }
  }

  private createExit(): void {
    const chapter = this.controller.currentChapter();
    const exitPosition = this.getExitPosition(chapter.id);
    const exitTexture = chapter.id === "trash-mountain" ? "trash-mountain-my-computer-gate" : "exit-node";
    this.exitSprite = this.physics.add.staticSprite(exitPosition.x, exitPosition.y, exitTexture);
    this.exitSprite.setTint(
      chapter.id === "trash-mountain" ? (this.canUseExit() ? 0xffffff : 0x334050) : this.canUseExit() ? chapter.palette.accent : 0x334050,
    );
    this.exitSprite.setDepth(9);
    if (chapter.id === "wrong-gateway") {
      this.exitSprite.setVisible(false);
      const body = this.exitSprite.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(92, 122);
      body.updateFromGameObject();
    } else if (chapter.id === "trash-mountain") {
      this.exitSprite.setScale(TRASH_MOUNTAIN_EXIT_SCALE);
      const body = this.exitSprite.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(118, 136);
      body.updateFromGameObject();
    } else if (VERTICAL_SCROLL_CHAPTER_IDS.has(chapter.id)) {
      const body = this.exitSprite.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(110, 128);
      body.updateFromGameObject();
    }

    const labelPosition = this.getExitLabelPosition(chapter.id);
    const exitLabel = this.add
      .text(labelPosition.x, labelPosition.y, chapter.exitLabel, {
        color: chapter.id === "cursor-hunt" || chapter.id === "wrong-gateway" ? "#ffd99f" : "#dffcff",
        fontFamily: "Microsoft YaHei UI, monospace",
        fontSize: chapter.id === "cursor-hunt" ? "13px" : "14px",
        stroke: "#071019",
        strokeThickness: 3,
      })
      .setAlpha(chapter.id === "cursor-hunt" ? 0.74 : 1)
      .setDepth(18);
    if (chapter.id === "wrong-gateway") {
      exitLabel.setVisible(false);
    }
    this.refreshGatewayExitState();
  }

  private createBoss(): void {
    const boss = this.controller.currentBoss();
    if (!boss) {
      return;
    }

    const chapter = this.controller.currentChapter();
    const bossPosition = this.getBossPosition(chapter.id);
    const bossTexture = chapter.id === "trash-mountain" ? "trash-mountain-gateway-warden" : "boss-core";
    this.bossSprite = this.physics.add.sprite(bossPosition.x, bossPosition.y, bossTexture);
    if (chapter.id === "trash-mountain") {
      this.bossSprite.setScale(TRASH_MOUNTAIN_BOSS_SCALE);
    } else {
      this.bossSprite.setTint(boss.color);
    }
    this.bossSprite.setImmovable(true);
    this.bossSprite.setDepth(12);
    this.bossSprite.setData("bossId", boss.id);
    this.bossSprite.setData("baseY", bossPosition.y);
    this.bossMaxHp = boss.hp;
    this.bossHp = boss.hp;
    const body = this.bossSprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(chapter.id === "trash-mountain" ? 132 : 72, chapter.id === "trash-mountain" ? 92 : 54, true);

    this.bossLabel = this.add
      .text(bossPosition.x - 130, bossPosition.y - 74, boss.name, {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "16px",
        stroke: "#101018",
        strokeThickness: 4,
      })
      .setDepth(20);

    this.bossHpBack = this.add.rectangle(bossPosition.x, bossPosition.y - 24, 190, 10, 0x0b1118, 0.88).setDepth(19);
    this.bossHpFill = this.add
      .rectangle(bossPosition.x - 95, bossPosition.y - 24, 190, 10, boss.color, 0.95)
      .setOrigin(0, 0.5)
      .setDepth(20);
    this.nextBossAttackAt = this.time.now + 900;
  }

  private createHazardsForChapter(): void {
    const chapter = this.controller.currentChapter();
    if (chapter.id === "wrong-gateway") {
      this.createWrongGatewayShredders();
    }

    const hazardCount = getHazardCount(chapter.id, chapter.index);
    for (let i = 0; i < hazardCount; i += 1) {
      const { x, y } = getHazardPosition(i, chapter.id);
      const layout = this.getElectromagneticTrapLayout(i, chapter.id);
      this.createElectromagneticTrap(x, y, layout, chapter.id === "cursor-hunt" ? 0.86 : 0.92);

      if (chapter.id === "cursor-hunt") {
        const trap = this.add
          .rectangle(x, y - 34, 112, 52, 0x2fe8ff, 0.06)
          .setStrokeStyle(2, 0x72f6ff, 0.4)
          .setDepth(7);
        this.tweens.add({
          targets: trap,
          alpha: { from: 0.06, to: 0.16 },
          yoyo: true,
          repeat: -1,
          duration: 520 + i * 120,
          ease: "Sine.inOut",
        });

        if (i % 2 === 1) {
          this.add
            .text(x - 42, y - 78, "删除\n固定\n属性", {
              color: "#ffd9df",
              fontFamily: "Microsoft YaHei UI, monospace",
              fontSize: "11px",
              lineSpacing: 2,
              backgroundColor: "rgba(22, 6, 12, 0.78)",
              padding: { x: 7, y: 5 },
            })
            .setDepth(16);
        }
      }
    }
  }

  private createWrongGatewayShredders(): void {
    for (const gap of WRONG_GATEWAY_SHREDDER_GAPS) {
      const y = WRONG_GATEWAY_SHREDDER_TOP + WRONG_GATEWAY_SHREDDER_HEIGHT / 2;
      const collider = this.hazards!.create(gap.x, y, "hazard-scan") as Phaser.Physics.Arcade.Sprite;
      collider.setData("instantKill", true);
      collider.setDisplaySize(gap.width, WRONG_GATEWAY_SHREDDER_HEIGHT);
      collider.setVisible(false);
      collider.refreshBody();

      const visualWidth = gap.width + 54;
      const visualHeight = WRONG_GATEWAY_SHREDDER_HEIGHT + 6;
      this.add
        .sprite(gap.x, WRONG_GATEWAY_SHREDDER_TOP + visualHeight / 2 - 2, "wrong-gateway-shredder")
        .setDisplaySize(visualWidth, visualHeight)
        .setDepth(6.35)
        .play(WRONG_GATEWAY_SHREDDER_ANIMATION_KEY);
    }
  }

  private getElectromagneticTrapLayout(index: number, chapterId: ChapterId): ElectromagneticTrapLayout {
    const horizontalWidth = chapterId === "cursor-hunt" ? 146 : VERTICAL_SCROLL_CHAPTER_IDS.has(chapterId) ? 176 : 112;
    const thickness = chapterId === "cursor-hunt" ? 22 : VERTICAL_SCROLL_CHAPTER_IDS.has(chapterId) ? 20 : 18;
    const verticalHeight = chapterId === "cursor-hunt" ? 116 : VERTICAL_SCROLL_CHAPTER_IDS.has(chapterId) ? 152 : 124;
    const shouldStandVertical =
      chapterId === "cursor-hunt"
        ? index === 1 || index === 3
        : VERTICAL_SCROLL_CHAPTER_IDS.has(chapterId)
          ? index % 2 === 1
          : index % 3 === 2;

    return shouldStandVertical
      ? { width: thickness, height: verticalHeight, orientation: "vertical" }
      : { width: horizontalWidth, height: thickness, orientation: "horizontal" };
  }

  private createElectromagneticTrap(
    x: number,
    y: number,
    layout: ElectromagneticTrapLayout,
    alpha = 0.92,
  ): ElectromagneticTrapInstance {
    const collider = this.hazards!.create(x, y, "hazard-scan") as Phaser.Physics.Arcade.Sprite;
    collider.setDisplaySize(layout.width, layout.height);
    collider.setVisible(false);
    collider.refreshBody();

    const visual = this.add.sprite(x, y, ELECTROMAGNETIC_TRAP_TEXTURE_KEY).setDepth(9).setAlpha(alpha);
    visual.play(ELECTROMAGNETIC_TRAP_ANIMATION_KEY);
    if (layout.orientation === "vertical") {
      visual.setDisplaySize(layout.height, layout.width);
      visual.setAngle(90);
    } else {
      visual.setDisplaySize(layout.width, layout.height);
    }

    collider.setData("visual", visual);
    visual.setData("collider", collider);
    return { collider, visual };
  }

  private createGatewayMonsters(): void {
    const chapter = this.controller.currentChapter();
    if (chapter.id !== "wrong-gateway" || !this.gatewayMonsters) {
      return;
    }

    for (const route of WRONG_GATEWAY_MONSTER_ROUTES) {
      const monster = this.gatewayMonsters.create(route.x, route.y, "wrong-gateway-virus-beetle") as Phaser.Physics.Arcade.Sprite;
      monster.setDepth(18);
      monster.setScale(0.82);
      monster.setAlpha(0.96);
      monster.setData("minX", route.minX);
      monster.setData("maxX", route.maxX);
      monster.setData("baseY", route.y);
      monster.setData("phase", Phaser.Math.FloatBetween(0, Math.PI * 2));
      monster.setVelocityX(route.speed);
      monster.setMaxVelocity(90, 620);
      monster.setBounce(0, 0);
      monster.setCollideWorldBounds(false);
      monster.setFlipX(route.speed < 0);

      const body = monster.body as Phaser.Physics.Arcade.Body;
      body.setSize(34, 16);
      body.setOffset(9, 10);
    }
  }

  private createCursorHunter(): void {
    const chapter = this.controller.currentChapter();
    if (chapter.id !== "cursor-hunt") {
      return;
    }

    this.cursorHunter = this.physics.add.sprite(1505, 150, "cursor-hunter");
    this.cursorHunter.setDepth(24);
    this.cursorHunter.setScale(0.84 * CURSOR_HUNTER_SIZE_RATIO);
    this.cursorHunter.setAlpha(0.9);
    this.cursorHunter.setTint(0xff2f50);
    this.cursorHunterStartedAt = this.time.now;
    this.cursorJumpState = "watching";
    this.cursorNextJumpAt = this.time.now + 1500;
    const body = this.cursorHunter.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(CURSOR_HUNTER_BODY_WIDTH, CURSOR_HUNTER_BODY_HEIGHT, true);

    this.cursorWarning = this.add
      .circle(this.cursorHunter.x, this.cursorHunter.y, CURSOR_HUNTER_WARNING_RADIUS, 0xff2447, 0.08)
      .setDepth(23);
    this.tweens.add({
      targets: this.cursorWarning,
      scale: { from: 0.65, to: 1.3 },
      alpha: { from: 0.18, to: 0.02 },
      repeat: -1,
      duration: 720,
      ease: "Sine.inOut",
    });

    this.cursorLandingMarker = this.add
      .circle(this.cursorHunter.x, this.cursorHunter.y, CURSOR_HUNTER_LANDING_RADIUS, 0xff2447, 0.1)
      .setStrokeStyle(3, 0xff6b82, 0.9)
      .setDepth(22)
      .setVisible(false);
  }

  private createCollisions(): void {
    if (!this.player || !this.platforms || !this.collectibles || !this.hazards || !this.projectiles) {
      return;
    }

    this.colliders.push(this.physics.add.collider(this.player, this.platforms));
    if (this.gatewayMonsters) {
      this.colliders.push(this.physics.add.collider(this.gatewayMonsters, this.platforms));
      this.colliders.push(
        this.physics.add.overlap(this.player, this.gatewayMonsters, (_player, monster) => {
          this.handleGatewayMonsterHit(monster as Phaser.GameObjects.GameObject);
        }),
      );
    }
    if (this.gatewayDigitBlocks) {
      this.colliders.push(
        this.physics.add.collider(this.player, this.gatewayDigitBlocks, (_player, block) => {
          this.handleGatewayDigitCollision(block as Phaser.GameObjects.GameObject);
        }),
      );
    }
    this.colliders.push(
      this.physics.add.overlap(this.player, this.collectibles, (_player, item) => {
        this.handleCollectiblePickup(item as Phaser.GameObjects.GameObject);
      }),
    );
    this.colliders.push(
      this.physics.add.overlap(this.player, this.hazards, (_player, hazard) => {
        this.handleHazardPlayerOverlap(hazard as Phaser.GameObjects.GameObject);
      }),
    );
    this.colliders.push(
      this.physics.add.overlap(this.player, this.projectiles, (_player, projectile) => {
        projectile.destroy();
        this.damagePlayer(12);
      }),
    );
    this.colliders.push(
      this.physics.add.overlap(this.player, this.exitSprite!, () => {
        if (this.time.now - this.lastAutoExitAt > 1100 && this.time.now > this.exitCooldownUntil) {
          this.lastAutoExitAt = this.time.now;
          if (this.canUseExit()) {
            this.advanceChapter(false);
          } else {
            this.playWorldSfx("blocked", 0.58, this.exitSprite);
            this.controller.note("错误网关仍未响应，必须先顶撞并改变任意地址数字。");
            this.emitState();
          }
        }
      }),
    );

    if (this.bossSprite) {
      this.colliders.push(
        this.physics.add.overlap(this.player, this.bossSprite, () => {
          this.damagePlayer(7);
        }),
      );

      if (this.playerProjectiles) {
        this.colliders.push(
          this.physics.add.overlap(this.playerProjectiles, this.bossSprite, (projectile) => {
            this.handlePlayerProjectileBossHit(projectile as Phaser.GameObjects.GameObject);
          }),
        );
      }
    }

    if (this.playerProjectiles) {
      this.colliders.push(
        this.physics.add.collider(this.playerProjectiles, this.platforms, (projectile) => {
          (projectile as Phaser.GameObjects.GameObject).destroy();
        }),
      );
    }

    if (this.cursorHunter) {
      this.colliders.push(
        this.physics.add.overlap(this.player, this.cursorHunter, () => {
          this.triggerCursorCaughtSequence();
        }),
      );
    }
  }

  private handleCollectiblePickup(item: Phaser.GameObjects.GameObject): void {
    this.playWorldSfx("collect", 0.72, item as Phaser.Physics.Arcade.Sprite);
    item.destroy();
    this.controller.collectChapterItem();
    this.controller.heal(10);
    this.maybeUnlockPlatformThrowAttack();
    this.emitState();
  }

  private handleHazardPlayerOverlap(hazardObject: Phaser.GameObjects.GameObject): void {
    if (hazardObject.getData("instantKill") === true) {
      this.killPlayerInstantly(hazardObject as Phaser.Physics.Arcade.Sprite);
      return;
    }

    this.damagePlayer(9);
  }

  private maybeUnlockPlatformThrowAttack(): void {
    const chapter = this.controller.currentChapter();
    if (chapter.index < PLATFORM_THROW_CHAPTER_START_INDEX || this.hasPlatformThrowAttack()) {
      return;
    }

    const collected = this.controller.state.chapterCollectibles[chapter.id] ?? 0;
    if (collected <= 0) {
      return;
    }

    this.controller.state.flags[PLATFORM_THROW_UNLOCKED_FLAG] = true;
    this.controller.note("技能模块接入：按 J 投掷数据刃。", true);
  }

  private hasPlatformThrowAttack(): boolean {
    return this.controller.state.flags[PLATFORM_THROW_UNLOCKED_FLAG] === true;
  }

  private handlePlayerProjectileBossHit(projectileObject: Phaser.GameObjects.GameObject): void {
    const projectile = projectileObject as Phaser.Physics.Arcade.Sprite;
    const damage = (projectile.getData("damage") as number | undefined) ?? PLAYER_THROW_DAMAGE;
    projectile.destroy();
    this.damageBoss(damage);
  }

  private updateCursorHunter(time: number): void {
    if (!this.cursorHunter || !this.player || this.isCursorCaughtSequencePlaying) {
      return;
    }

    const observeDelay = 1300;
    const chapterElapsed = Math.max(0, time - this.cursorHunterStartedAt);

    if (chapterElapsed < observeDelay) {
      this.cursorHunter.setVelocity(0, 0);
      this.cursorHunter.y = 150 + Math.sin(time / 160) * 18;
      this.updateCursorVisuals(time);
      return;
    }

    if (this.cursorJumpState === "watching" && time >= this.cursorNextJumpAt) {
      this.beginCursorAim(time);
    }

    if (this.cursorJumpState === "aiming" && time - this.cursorJumpStartedAt >= 680) {
      this.beginCursorJump(time);
    }

    if (this.cursorJumpState === "jumping") {
      this.updateCursorJump(time);
    }

    if (this.cursorJumpState === "recovering" && time >= this.cursorNextJumpAt) {
      this.cursorJumpState = "watching";
      this.cursorNextJumpAt = time + Phaser.Math.Between(420, 760);
    }

    this.updateCursorVisuals(time);
  }

  private beginCursorAim(time: number): void {
    if (!this.cursorHunter || !this.player) {
      return;
    }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const leadX = Phaser.Math.Clamp(playerBody.velocity.x * 0.34, -120, 120);
    this.cursorJumpToX = Phaser.Math.Clamp(this.player.x + leadX, 80, this.currentWorldWidth - 90);
    this.cursorJumpToY = Phaser.Math.Clamp(this.player.y + 8, 120, this.currentWorldHeight - 80);
    this.cursorJumpFromX = this.cursorHunter.x;
    this.cursorJumpFromY = this.cursorHunter.y;
    this.cursorJumpStartedAt = time;
    this.cursorJumpState = "aiming";
    this.cursorHunter.setVelocity(0, 0);
    this.cursorHunter.setScale(0.98 * CURSOR_HUNTER_SIZE_RATIO, 0.7 * CURSOR_HUNTER_SIZE_RATIO);
    this.playWorldSfx("cursor-alert", 0.6, { x: this.cursorJumpToX, y: this.cursorJumpToY });

    if (this.cursorLandingMarker) {
      this.cursorLandingMarker
        .setPosition(this.cursorJumpToX, this.cursorJumpToY)
        .setScale(0.58)
        .setAlpha(0.22)
        .setVisible(true);
      this.tweens.add({
        targets: this.cursorLandingMarker,
        scale: 1.35,
        alpha: 0.72,
        duration: 620,
        ease: "Sine.inOut",
      });
    }
  }

  private beginCursorJump(time: number): void {
    if (!this.cursorHunter) {
      return;
    }

    this.cursorJumpFromX = this.cursorHunter.x;
    this.cursorJumpFromY = this.cursorHunter.y;
    this.cursorJumpStartedAt = time;
    this.cursorJumpDuration = Phaser.Math.Clamp(
      Phaser.Math.Distance.Between(this.cursorJumpFromX, this.cursorJumpFromY, this.cursorJumpToX, this.cursorJumpToY) * 1.55,
      560,
      880,
    );
    this.cursorJumpState = "jumping";
    this.cursorHunter.setScale(0.78 * CURSOR_HUNTER_SIZE_RATIO, 1.06 * CURSOR_HUNTER_SIZE_RATIO);
  }

  private updateCursorJump(time: number): void {
    if (!this.cursorHunter) {
      return;
    }

    const progress = Phaser.Math.Clamp((time - this.cursorJumpStartedAt) / this.cursorJumpDuration, 0, 1);
    const eased = Phaser.Math.Easing.Sine.InOut(progress);
    const jumpArc = Math.sin(progress * Math.PI) * 150;
    const x = Phaser.Math.Linear(this.cursorJumpFromX, this.cursorJumpToX, eased);
    const y = Phaser.Math.Linear(this.cursorJumpFromY, this.cursorJumpToY, eased) - jumpArc;

    this.cursorHunter.setPosition(x, y);
    this.cursorHunter.setRotation(Phaser.Math.Linear(-0.38, 0.42, progress));

    if (progress >= 1) {
      this.cursorJumpState = "recovering";
      this.cursorNextJumpAt = time + 560;
      this.cursorHunter.setScale(1.02 * CURSOR_HUNTER_SIZE_RATIO, 0.76 * CURSOR_HUNTER_SIZE_RATIO);
      this.cameras.main.shake(70, 0.0025);
      this.playWorldSfx("cursor-land", 0.78, this.cursorHunter);
      this.cursorLandingMarker?.setVisible(false);
    }
  }

  private updateCursorVisuals(time: number): void {
    if (!this.cursorHunter) {
      return;
    }

    if (this.cursorJumpState !== "jumping") {
      this.cursorHunter.setRotation(Math.sin(time / 180) * 0.08);
    }
    if (this.cursorJumpState === "watching") {
      this.cursorHunter.setScale((0.84 + Math.sin(time / 260) * 0.03) * CURSOR_HUNTER_SIZE_RATIO);
    }
    if (this.cursorJumpState === "recovering") {
      this.cursorHunter.setScale(
        CURSOR_HUNTER_SIZE_RATIO,
        (0.82 + Math.sin(time / 130) * 0.04) * CURSOR_HUNTER_SIZE_RATIO,
      );
    }
    this.cursorHunter.setAlpha(0.82 + Math.sin(time / 95) * 0.14);
    if (this.cursorWarning) {
      this.cursorWarning.setPosition(
        this.cursorHunter.x + 12 * CURSOR_HUNTER_SIZE_RATIO,
        this.cursorHunter.y + 18 * CURSOR_HUNTER_SIZE_RATIO,
      );
    }
  }

  private updateGatewayMonsters(time: number): void {
    if (this.controller.currentChapter().id !== "wrong-gateway" || !this.gatewayMonsters) {
      return;
    }

    this.gatewayMonsters.children.iterate((child) => {
      const monster = child as Phaser.Physics.Arcade.Sprite;
      if (!monster.active || monster.getData("stomped") === true) {
        return false;
      }

      const body = monster.body as Phaser.Physics.Arcade.Body;
      const minX = monster.getData("minX") as number;
      const maxX = monster.getData("maxX") as number;
      const phase = monster.getData("phase") as number;
      let velocityX = body.velocity.x;
      if (velocityX === 0) {
        velocityX = monster.flipX ? -52 : 52;
      }

      if ((monster.x <= minX && velocityX < 0) || body.blocked.left) {
        velocityX = Math.abs(velocityX);
        this.playWorldSfx("monster-turn", 0.22, monster);
      } else if ((monster.x >= maxX && velocityX > 0) || body.blocked.right) {
        velocityX = -Math.abs(velocityX);
        this.playWorldSfx("monster-turn", 0.22, monster);
      }

      monster.setVelocityX(velocityX);
      monster.setFlipX(velocityX < 0);
      monster.setRotation(Math.sin(time / 170 + phase) * 0.06);
      monster.setScale(0.82 + Math.sin(time / 130 + phase) * 0.025, 0.82 + Math.cos(time / 150 + phase) * 0.04);
      return true;
    });
  }

  private handleGatewayMonsterHit(monsterObject: Phaser.GameObjects.GameObject): void {
    if (!this.player) {
      return;
    }
    const monster = monsterObject as Phaser.Physics.Arcade.Sprite;
    if (!monster.active || monster.getData("stomped") === true) {
      return;
    }
    if (this.tryStompGatewayMonster(monster)) {
      return;
    }
    if (this.gmFeatures.invincible) {
      return;
    }
    const lastContactAt = monster.getData("lastContactAt") as number | undefined;
    if (lastContactAt && this.time.now - lastContactAt < 650) {
      return;
    }

    monster.setData("lastContactAt", this.time.now);
    this.playWorldSfx("monster-hit", 0.62, monster);
    monster.setTintFill(0xfff1a6);
    this.time.delayedCall(90, () => monster.active && monster.clearTint());

    const pushX = this.player.x < monster.x ? -170 : 170;
    this.player.setVelocity(pushX, -150);
    this.damagePlayer(7);
  }

  private tryStompGatewayMonster(monster: Phaser.Physics.Arcade.Sprite): boolean {
    if (!this.player || !monster.active) {
      return false;
    }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body | undefined;
    const monsterBody = monster.body as Phaser.Physics.Arcade.Body | undefined;
    if (!playerBody || !monsterBody || !playerBody.enable || !monsterBody.enable) {
      return false;
    }

    const stomped = isStompAttack({
      attacker: {
        left: playerBody.x,
        right: playerBody.x + playerBody.width,
        top: playerBody.y,
        bottom: playerBody.y + playerBody.height,
      },
      target: {
        left: monsterBody.x,
        right: monsterBody.x + monsterBody.width,
        top: monsterBody.y,
        bottom: monsterBody.y + monsterBody.height,
      },
      attackerPreviousBottom: playerBody.prev.y + playerBody.height,
      attackerVelocityY: playerBody.velocity.y,
    });

    if (!stomped) {
      return false;
    }

    monster.setData("stomped", true);
    monsterBody.enable = false;
    monster.setVelocity(0, 0);
    this.player.setVelocityY(-PLAYER_STOMP_BOUNCE_SPEED);
    this.limitedJumpCount = 1;
    this.playWorldSfx("monster-hit", 1, monster);
    this.spawnGatewayStompBurst(monster.x, monster.y);
    this.cameras.main.shake(90, 0.004);
    this.controller.note("\u4ece\u4e0a\u65b9\u8e29\u788e\u4e86\u4f4e\u7ea7\u75c5\u6bd2\u5c0f\u602a\u3002", true);
    this.emitState();

    this.tweens.add({
      targets: monster,
      alpha: 0,
      scaleX: monster.scaleX * 1.2,
      scaleY: 0.12,
      y: monster.y + 12,
      duration: 150,
      ease: "Quad.easeIn",
      onComplete: () => monster.destroy(),
    });
    return true;
  }

  private spawnGatewayStompBurst(x: number, y: number): void {
    const colors = [0xfff1a6, 0xff365f, 0xffd76a, 0xffffff];
    for (let index = 0; index < 12; index += 1) {
      const shard = this.add.rectangle(
        x,
        y,
        Phaser.Math.Between(3, 7),
        Phaser.Math.Between(3, 8),
        colors[index % colors.length],
        0.95,
      );
      shard.setDepth(22);
      this.tweens.add({
        targets: shard,
        x: x + Phaser.Math.Between(-46, 46),
        y: y + Phaser.Math.Between(-34, 18),
        alpha: 0,
        angle: Phaser.Math.Between(-120, 120),
        duration: Phaser.Math.Between(180, 320),
        ease: "Quad.easeOut",
        onComplete: () => shard.destroy(),
      });
    }
  }

  private showGatewayIpMissingPrompt(): void {
    this.gatewayIpMissingPrompt?.destroy();

    this.cameras.main.shake(180, 0.009);

    const prompt = this.add.container(480, 270).setScrollFactor(0).setDepth(120);
    const flash = this.add.rectangle(0, 0, 960, 540, 0xff123c, 0.16);
    const panel = this.add.image(0, 0, "wrong-gateway-ip-warning-panel").setDisplaySize(760, 430);
    const title = this.add
      .text(0, -2, "IP地址不存在", {
        color: "#fff4d0",
        fontFamily: "Microsoft YaHei UI, sans-serif",
        fontSize: "46px",
        fontStyle: "bold",
        stroke: "#210308",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    title.setShadow(0, 0, "#ff365f", 18, true, true);
    const scanLine = this.add.rectangle(0, 82, 540, 5, 0xff365f, 0.82);

    prompt.add([flash, panel, title, scanLine]);
    prompt.setAlpha(0);
    prompt.setScale(0.72);
    this.gatewayIpMissingPrompt = prompt;

    this.tweens.add({
      targets: flash,
      alpha: { from: 0.06, to: 0.22 },
      yoyo: true,
      repeat: 3,
      duration: 120,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: scanLine,
      alpha: { from: 0.32, to: 1 },
      scaleX: { from: 0.72, to: 1 },
      yoyo: true,
      repeat: 5,
      duration: 110,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: prompt,
      alpha: 1,
      scale: 1,
      duration: 140,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: prompt,
          alpha: 0,
          scale: 1.04,
          delay: 760,
          duration: 240,
          ease: "Sine.easeIn",
          onComplete: () => {
            prompt.destroy();
            if (this.gatewayIpMissingPrompt === prompt) {
              this.gatewayIpMissingPrompt = undefined;
            }
          },
        });
      },
    });
  }

  private updateGatewayGuide(_time: number): void {
    if (
      this.controller.currentChapter().id !== "wrong-gateway" ||
      !this.gatewayGuideText ||
      !this.gatewayGuideArrow ||
      !this.gatewayGuideBeam
    ) {
      return;
    }

    const isOpen = this.canUseExit();
    if (isOpen) {
      this.gatewayGuideText.setPosition(2352, 650);
      this.gatewayGuideArrow.setPosition(2544, 716).setRotation(-Math.PI / 2);
      this.gatewayGuideBeam.setPosition(2525, 738).setDisplaySize(260, 5);
      return;
    }

    const targetCell = this.gatewayDigitCells.find((cell) => !cell.changed) ?? this.gatewayDigitCells[0];
    if (!targetCell) {
      return;
    }
    this.gatewayGuideText.setPosition(590, 304);
    this.gatewayGuideArrow.setPosition(targetCell.block.x, targetCell.block.y + 58).setRotation(Math.PI);
    this.gatewayGuideBeam.setPosition(1174, 288).setDisplaySize(930, 5);
  }

  private triggerCursorCaughtSequence(): void {
    if (!this.player || !this.cursorHunter || this.isCursorCaughtSequencePlaying || this.gmFeatures.invincible) {
      return;
    }
    if (!this.isCursorJumpCatchWindow()) {
      return;
    }

    this.isCursorCaughtSequencePlaying = true;
    this.playWorldSfx("hurt", 1.05, this.player);
    this.controller.note("红色光标跳扑命中桌宠，回收站开始粉碎流程。", true);
    this.emitState();
    this.cameras.main.shake(320, 0.011);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.cursorHunter.setVelocity(0, 0);
    this.cursorHunter.setTintFill(0xffffff);

    const dragLine = this.add.graphics().setDepth(28);
    const lineEvent = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!this.player || !this.cursorHunter || !this.isCursorCaughtSequencePlaying) {
          return;
        }
        dragLine.clear();
        dragLine.lineStyle(3, 0xff3155, 0.9);
        dragLine.lineBetween(
          this.cursorHunter.x + 14 * CURSOR_HUNTER_SIZE_RATIO,
          this.cursorHunter.y + 46 * CURSOR_HUNTER_SIZE_RATIO,
          this.player.x,
          this.player.y,
        );
      },
    });

    this.tweens.add({
      targets: this.player,
      x: 72,
      y: 522,
      angle: -18,
      duration: 720,
      ease: "Quad.easeIn",
    });
    this.tweens.add({
      targets: this.cursorHunter,
      x: 118,
      y: 480,
      duration: 720,
      ease: "Quad.easeIn",
    });

    this.time.delayedCall(760, () => {
      lineEvent.remove(false);
      dragLine.destroy();
      this.controller.enterChapter("code-rebirth", "Code rebirth begins.");
      this.rebuildChapter();
      this.emitState();
    });
  }

  private isCursorJumpCatchWindow(): boolean {
    if (this.cursorJumpState !== "jumping") {
      return false;
    }

    const progress = Phaser.Math.Clamp((this.time.now - this.cursorJumpStartedAt) / this.cursorJumpDuration, 0, 1);
    return progress >= 0.45;
  }

  private updatePlayerMovement(): void {
    if (!this.player) {
      return;
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const left = this.cursors.left.isDown || this.keys.a.isDown;
    const right = this.cursors.right.isDown || this.keys.d.isDown;
    const up = this.cursors.up.isDown || this.keys.w.isDown;
    const down = this.cursors.down.isDown || this.keys.s.isDown;
    const isOnLadder = this.isPlayerTouchingGatewayLadder();
    const wantsLadderJump = isOnLadder && Phaser.Input.Keyboard.JustDown(this.keys.space);
    const wantsJump =
      (!isOnLadder && (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.w))) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space);

    if (left) {
      this.player.setVelocityX(-PLAYER_SPEED);
      this.player.setFlipX(true);
    } else if (right) {
      this.player.setVelocityX(PLAYER_SPEED);
      this.player.setFlipX(false);
    }

    const wasClimbingLadder = Boolean(this.player.getData("isClimbingLadder"));
    if (isOnLadder && (up || down || wasClimbingLadder)) {
      body.setAllowGravity(false);
      this.player.setData("isClimbingLadder", true);
      this.player.setData("isWallClinging", false);
      this.limitedJumpCount = 0;

      if (wantsLadderJump) {
        body.setAllowGravity(true);
        this.player.setData("isClimbingLadder", false);
        this.player.setVelocityY(-JUMP_SPEED * 0.82);
        this.limitedJumpCount = 1;
        this.playWorldSfx("jump", 0.58, this.player);
        return;
      }

      if (!left && !right) {
        this.player.setVelocityX(0);
      }
      if (up && !down) {
        this.player.setVelocityY(-GATEWAY_LADDER_CLIMB_SPEED);
      } else if (down && !up) {
        this.player.setVelocityY(GATEWAY_LADDER_CLIMB_SPEED);
      } else {
        this.player.setVelocityY(0);
      }
      return;
    }

    body.setAllowGravity(true);
    this.player.setData("isClimbingLadder", false);

    const canWallCling = this.controller.hasAbility("cling") && (body.blocked.left || body.blocked.right);
    this.player.setData("isWallClinging", canWallCling && body.velocity.y > 60);
    if (canWallCling && body.velocity.y > 60) {
      this.player.setVelocityY(60);
    }

    const isGrounded = body.blocked.down || body.touching.down;
    const usesLimitedDoubleJump = true;
    if (usesLimitedDoubleJump) {
      this.syncLimitedDoubleJumpState(isGrounded);
    }

    if (!wantsJump) {
      return;
    }

    if (this.gmFeatures.infiniteJump) {
      this.player.setVelocityY(-JUMP_SPEED);
      this.playWorldSfx("jump", 0.58, this.player);
      return;
    }

    if (usesLimitedDoubleJump) {
      this.tryLimitedDoubleJump(isGrounded);
      return;
    }

    if (body.blocked.down || body.touching.down || canWallCling) {
      this.player.setVelocityY(canWallCling ? -JUMP_SPEED * 0.92 : -JUMP_SPEED);
      this.playWorldSfx("jump", canWallCling ? 0.72 : 0.58, this.player);
    }
  }

  private isPlayerTouchingGatewayLadder(): boolean {
    if (!this.player || this.controller.currentChapter().id !== "wrong-gateway") {
      return false;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const playerBounds = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
    return getLadderDefs("wrong-gateway").some(([x, y, width, height]) => {
      const ladderBounds = new Phaser.Geom.Rectangle(x - width / 2 - 10, y - height / 2, width + 20, height);
      return Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, ladderBounds);
    });
  }

  private syncLimitedDoubleJumpState(isGrounded: boolean): void {
    if (isGrounded) {
      this.limitedJumpCount = 0;
      return;
    }

    if (this.limitedJumpCount === 0) {
      this.limitedJumpCount = 1;
    }
  }

  private tryLimitedDoubleJump(isGrounded: boolean): void {
    if (!this.player) {
      return;
    }

    if (isGrounded) {
      this.limitedJumpCount = 1;
      this.player.setVelocityY(-JUMP_SPEED);
      this.playWorldSfx("jump", 0.58, this.player);
      return;
    }

    if (this.limitedJumpCount >= MAX_LIMITED_JUMPS) {
      return;
    }

    this.limitedJumpCount += 1;
    this.player.setVelocityY(-JUMP_SPEED * SECOND_JUMP_SPEED_MULTIPLIER);
    this.playWorldSfx("jump", 0.76, this.player);
  }

  private updatePlayerProjectiles(time: number): void {
    if (!this.playerProjectiles) {
      return;
    }

    this.playerProjectiles.children.iterate((child) => {
      const projectile = child as Phaser.Physics.Arcade.Sprite;
      if (!projectile.active) {
        return false;
      }

      const direction = (projectile.getData("direction") as number | undefined) ?? 1;
      const spawnedAt = (projectile.getData("spawnedAt") as number | undefined) ?? time;
      projectile.setRotation(Math.sin((time - spawnedAt) / 60) * 0.12 * direction);
      projectile.setAlpha(0.74 + Math.sin(time / 54) * 0.18);

      if (
        time - spawnedAt > PLAYER_THROW_TTL_MS ||
        projectile.x < -120 ||
        projectile.x > this.currentWorldWidth + 120 ||
        projectile.y < -120 ||
        projectile.y > this.currentWorldHeight + 120
      ) {
        projectile.destroy();
      }

      return true;
    });
  }

  private updateAbilityInput(time: number): void {
    if (!this.player) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.j)) {
      if (this.controller.currentChapter().index >= PLATFORM_THROW_CHAPTER_START_INDEX) {
        this.usePlatformThrow(time);
      } else {
        this.useCoil();
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.k)) {
      this.useDevour();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.l)) {
      this.useStealth(time);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.q)) {
      this.usePing(time);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      this.useCloneOrExit(time);
    }
  }

  private useCoil(): void {
    if (!this.player) {
      return;
    }
    const hasCoil = this.controller.hasAbility("coil");
    const damage = hasCoil ? 24 : 8;
    this.drawAbilitySlash(0xff6b8a);
    this.damageBossIfClose(damage, 190);
    this.controller.note(hasCoil ? "触手缠住附近进程，权限壳开始开裂。" : "桌宠用尾巴徒劳挣扎。");
    this.emitState();
  }

  private usePlatformThrow(time: number): void {
    if (!this.player || !this.playerProjectiles) {
      return;
    }

    if (!this.hasPlatformThrowAttack()) {
      this.playWorldSfx("blocked", 0.52, this.player);
      this.controller.note("先拾取代码技能模块，才能投掷数据刃。");
      this.emitState();
      return;
    }

    if (time < this.nextPlayerThrowAt) {
      return;
    }
    this.nextPlayerThrowAt = time + PLAYER_THROW_COOLDOWN_MS;

    const chapter = this.controller.currentChapter();
    const direction = this.player.flipX ? -1 : 1;
    const projectile = this.playerProjectiles.create(
      this.player.x + direction * 34,
      this.player.y - 4,
      "code-rebirth-projectile",
    ) as Phaser.Physics.Arcade.Sprite;
    projectile.setDepth(24);
    projectile.setScale(0.72);
    projectile.setTint(chapter.palette.accent);
    projectile.setFlipX(direction < 0);
    projectile.setVelocity(direction * PLAYER_THROW_SPEED, -34);
    projectile.setData("damage", PLAYER_THROW_DAMAGE);
    projectile.setData("direction", direction);
    projectile.setData("spawnedAt", time);

    const body = projectile.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(40, 14);
    body.setOffset(12, 9);

    const trail = this.add
      .rectangle(projectile.x - direction * 22, projectile.y, 44, 5, chapter.palette.accent, 0.32)
      .setDepth(23);
    this.tweens.add({
      targets: trail,
      alpha: 0,
      scaleX: 0.25,
      duration: 160,
      onComplete: () => trail.destroy(),
    });

    this.drawAbilitySlash(chapter.palette.accent);
    this.playWorldSfx("throw", 0.68, projectile);
    this.controller.note("数据刃投出。");
    this.emitState();
  }

  private useDevour(): void {
    if (!this.player) {
      return;
    }
    const hasDevour = this.controller.hasAbility("devour-code");
    const allowsDevourStrike = this.controller.currentChapter().index < PLATFORM_THROW_CHAPTER_START_INDEX;
    this.controller.heal(hasDevour ? 16 : 4);
    this.controller.devourBias(hasDevour ? 1 : 0);
    this.drawAbilitySlash(0x42f5b9);
    if (allowsDevourStrike) {
      this.damageBossIfClose(hasDevour ? 17 : 5, 150);
    }
    this.controller.note(hasDevour ? "代码被吞噬，完整性重新补全。" : "桌宠还不知道怎样进食代码。");
    this.emitState();
  }

  private useStealth(time: number): void {
    const canStealth =
      this.controller.hasAbility("infiltrate") ||
      this.controller.hasAbility("mirror-disguise") ||
      this.controller.hasAbility("voiceprint-disguise");
    if (!canStealth) {
      this.controller.note("还没有足够的渗透或伪装能力。");
      this.emitState();
      return;
    }
    this.stealthUntil = time + 1800;
    this.controller.note("身体压进文件阴影，扫描线短暂失去目标。");
    this.emitState();
  }

  private usePing(time: number): void {
    const canPing =
      this.controller.hasAbility("ping-sense") ||
      this.controller.hasAbility("reverse-index") ||
      this.controller.hasAbility("vision-takeover");
    if (!canPing) {
      this.controller.note("网络和索引仍然是一片噪声。");
      this.emitState();
      return;
    }
    this.pingUntil = time + 1500;
    this.controller.note("ping 波纹扫过地图，出口和隐藏路径短暂发亮。");
    this.emitState();
  }

  private useCloneOrExit(time: number): void {
    if (this.exitSprite && this.player && Phaser.Math.Distance.BetweenPoints(this.player, this.exitSprite) < 110) {
      if (this.canUseExit()) {
        this.advanceChapter(false);
      } else {
        this.playWorldSfx("blocked", 0.58, this.exitSprite);
        this.controller.note("错误网关仍未响应，必须先顶撞并改变任意地址数字。");
        this.emitState();
      }
      return;
    }

    if (!this.controller.hasAbility("clone-control") && !this.controller.hasAbility("lan-traverse")) {
      this.controller.note("这个节点还不能被你折叠。");
      this.emitState();
      return;
    }

    const texture = this.controller.hasAbility("clone-control") ? "player-clone" : "boss-bullet";
    const clone = this.physics.add.sprite(this.player!.x - 48, this.player!.y, texture);
    clone.setTint(this.controller.currentChapter().palette.accent);
    clone.setVelocityX(this.player!.flipX ? -180 : 180);
    clone.setVelocityY(-160);
    clone.setBounce(0.4);
    this.controller.interactBias(this.controller.hasAbility("cross-device-jump") ? 1 : 0);
    this.time.delayedCall(1600, () => clone.destroy());
    this.controller.note(time > this.pingUntil ? "分叉诱饵被抛出，扫描线被带偏。" : "ping 标记的节点被短暂折叠。");
    this.emitState();
  }

  private updateBoss(time: number): void {
    if (!this.bossSprite || !this.player) {
      return;
    }

    const wobble = Math.sin(time / 250) * 8;
    const baseY = (this.bossSprite.getData("baseY") as number | undefined) ?? 540;
    this.bossSprite.y = baseY + wobble;
    if (this.bossLabel) {
      this.bossLabel.x = this.bossSprite.x - 130;
      this.bossLabel.y = this.bossSprite.y - 84;
    }
    if (this.bossHpBack && this.bossHpFill) {
      this.bossHpBack.x = this.bossSprite.x;
      this.bossHpBack.y = this.bossSprite.y - 34;
      this.bossHpFill.x = this.bossSprite.x - 95;
      this.bossHpFill.y = this.bossSprite.y - 34;
    }

    if (time >= this.nextBossAttackAt) {
      this.fireBossAttack();
      this.nextBossAttackAt = time + 1250;
    }
  }

  private fireBossAttack(): void {
    if (!this.bossSprite || !this.player || !this.projectiles) {
      return;
    }
    const boss = this.controller.currentBoss();
    if (!boss) {
      return;
    }

    const attackIndex = this.bossAttackCursor % 3;
    this.bossAttackCursor += 1;

    if (attackIndex === 0) {
      const bullet = this.projectiles.create(this.bossSprite.x, this.bossSprite.y, "boss-bullet") as Phaser.Physics.Arcade.Sprite;
      bullet.setTint(boss.color);
      this.physics.moveToObject(bullet, this.player, 260);
      this.time.delayedCall(2800, () => bullet.destroy());
    } else if (attackIndex === 1) {
      const y = Phaser.Math.Clamp(
        this.bossSprite.y + Phaser.Math.Between(-160, 220),
        120,
        this.currentWorldHeight - 80,
      );
      const scan = this.createElectromagneticTrap(
        this.bossSprite.x - 60,
        y,
        { width: 240, height: 20, orientation: "horizontal" },
        0.96,
      );
      this.time.delayedCall(1450, () => {
        scan.visual.destroy();
        scan.collider.destroy();
      });
    } else {
      const minion = this.projectiles.create(this.bossSprite.x - 80, this.bossSprite.y + 40, "boss-bullet") as Phaser.Physics.Arcade.Sprite;
      minion.setTint(0xffffff);
      minion.setScale(1.4);
      minion.setVelocity(Phaser.Math.Between(-210, -140), Phaser.Math.Between(-80, 80));
      this.time.delayedCall(2500, () => minion.destroy());
    }

    const attack = boss.attacks[(this.bossAttackCursor - 1) % boss.attacks.length];
    this.controller.note(`${boss.name}：${attack}`);
    this.emitState();
  }

  private damageBossIfClose(amount: number, range: number): void {
    if (!this.player || !this.bossSprite) {
      return;
    }
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bossSprite.x, this.bossSprite.y);
    if (distance > range) {
      return;
    }
    this.damageBoss(amount);
  }

  private damageBoss(amount: number): void {
    if (!this.bossSprite) {
      return;
    }

    this.bossHp = Math.max(0, this.bossHp - amount);
    this.cameras.main.shake(70, 0.003);
    this.bossSprite.setTintFill(0xffffff);
    this.time.delayedCall(70, () => {
      const boss = this.controller.currentBoss();
      if (this.bossSprite && boss) {
        this.bossSprite.clearTint();
        if (this.controller.currentChapter().id !== "trash-mountain") {
          this.bossSprite.setTint(boss.color);
        }
      }
    });
    this.updateBossHpBar();

    if (this.bossHp <= 0) {
      this.controller.defeatCurrentBoss();
      this.emitState();
      this.time.delayedCall(550, () => this.rebuildChapter());
    }
  }

  private updateBossHpBar(): void {
    if (!this.bossHpFill) {
      return;
    }
    const width = Phaser.Math.Clamp(this.bossHp / this.bossMaxHp, 0, 1) * 190;
    this.bossHpFill.width = width;
  }

  private damagePlayer(amount: number): void {
    if (!this.player) {
      return;
    }
    if (this.gmFeatures.invincible) {
      return;
    }
    const now = this.time.now;
    const lastDamageAt = this.player.getData("lastDamageAt") as number;
    if (now - lastDamageAt < 600 || now < this.stealthUntil) {
      return;
    }
    this.player.setData("lastDamageAt", now);
    this.playWorldSfx("hurt", amount >= 10 ? 0.85 : 0.62, this.player);
    const respawned = this.controller.damage(amount);
    this.player.setTintFill(0xffffff);
    this.time.delayedCall(80, () => this.player?.clearTint());
    this.cameras.main.shake(90, 0.004);
    if (respawned) {
      const chapter = this.controller.currentChapter();
      const respawnPosition = this.getPlayerStartPosition(chapter.id);
      this.player.setPosition(respawnPosition.x, respawnPosition.y);
      this.player.setVelocity(0, 0);
      this.limitedJumpCount = 0;
    }
    this.emitState();
  }

  private killPlayerInstantly(source?: Readonly<{ x: number; y: number }>): void {
    if (!this.player || this.gmFeatures.invincible) {
      return;
    }

    this.player.setData("lastDamageAt", this.time.now);
    this.playWorldSfx("hurt", 1.2, source ?? this.player);
    this.controller.state.integrity = 0;
    const respawned = this.controller.damage(Number.MAX_SAFE_INTEGER);
    this.player.setTintFill(0xfff1a6);
    this.time.delayedCall(90, () => this.player?.clearTint());
    this.cameras.main.shake(180, 0.012);

    if (respawned) {
      const chapter = this.controller.currentChapter();
      const respawnPosition = this.getPlayerStartPosition(chapter.id);
      this.player.setPosition(respawnPosition.x, respawnPosition.y);
      this.player.setVelocity(0, 0);
      this.limitedJumpCount = 0;
    }

    this.emitState();
  }

  private advanceChapter(debug: boolean): void {
    if (this.isRecycleCutscenePlaying) {
      return;
    }
    if (!debug && !this.canUseExit()) {
      if (this.controller.currentChapter().id === "wrong-gateway") {
        this.playWorldSfx("blocked", 0.58, this.exitSprite ?? this.player);
        this.controller.note("错误网关仍未响应，必须先顶撞并改变任意地址数字。");
        this.emitState();
      }
      return;
    }
    if (debug && this.controller.currentBoss()) {
      this.controller.defeatCurrentBoss();
    }
    this.playWorldSfx("exit", 0.84, this.exitSprite ?? this.player);
    if (this.shouldPlayRecycleMouthCutscene()) {
      this.playRecycleMouthCutscene();
      return;
    }

    this.completeChapterAdvance();
  }

  private shouldPlayRecycleMouthCutscene(): boolean {
    if (!this.controller.canExitChapter()) {
      return false;
    }
    const nextChapter = chapters[this.controller.state.currentChapterIndex + 1];
    return nextChapter?.id === "code-rebirth";
  }

  private completeChapterAdvance(): void {
    this.controller.advanceChapter();
    if (this.controller.status !== "ending-choice") {
      this.rebuildChapter();
    }
    this.emitState();
  }

  private playRecycleMouthCutscene(): void {
    if (this.isRecycleCutscenePlaying) {
      return;
    }

    this.isRecycleCutscenePlaying = true;
    this.physics.world.isPaused = true;
    this.cameras.main.stopFollow();

    if (this.player) {
      this.player.setVelocity(0, 0);
      this.player.setVisible(false);
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.enable = false;
    }

    const petTexture = this.playerPetTextureKey ?? getPetTextureKey(this.controller.state.customization.petSpecies);
    const overlay = this.add.rectangle(480, 270, 960, 540, 0x070006, 0).setScrollFactor(0).setDepth(1000);
    const mouth = this.add.image(1040, 288, "recycle-mouth").setScrollFactor(0).setDepth(1004).setAlpha(0).setScale(0.12);
    const pet = this.add.sprite(168, 382, petTexture).setScrollFactor(0).setDepth(1007).setScale(1.7);
    const cursor = this.add.graphics().setScrollFactor(0).setDepth(1009);
    const dragLine = this.add.graphics().setScrollFactor(0).setDepth(1008);
    const flash = this.add.rectangle(480, 270, 960, 540, 0xfff2f2, 0).setScrollFactor(0).setDepth(1012);
    const skipBack = this.add.rectangle(900, 34, 84, 34, 0x16070b, 0.86).setScrollFactor(0).setDepth(1015);
    const skipText = this.add
      .text(900, 34, "跳过", {
        color: "#ffe5ec",
        fontFamily: "Microsoft YaHei UI, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1016);

    this.recycleCutsceneObjects.push(overlay, mouth, pet, cursor, dragLine, flash, skipBack, skipText);
    skipBack.setInteractive({ useHandCursor: true });
    skipBack.on("pointerdown", () => this.completeRecycleCutscene());

    const runAnimationKey = getPetAnimationKey(petTexture, "run");
    if (this.anims.exists(runAnimationKey)) {
      pet.play(runAnimationKey, true);
    }

    const drawCursor = (): void => {
      cursor.clear();
      cursor.lineStyle(3, 0xffe1e8, 1);
      cursor.fillStyle(0xff304f, 1);
      cursor.fillTriangle(0, 0, 0, 52, 22, 36);
      cursor.lineBetween(0, 0, 42, 18);
      cursor.lineBetween(0, 52, 13, 34);
    };
    cursor.setPosition(820, 72);
    drawCursor();

    const lineEvent = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!this.isRecycleCutscenePlaying) {
          return;
        }
        dragLine.clear();
        dragLine.lineStyle(3, 0xff3155, 0.9);
        dragLine.lineBetween(cursor.x + 8, cursor.y + 42, pet.x, pet.y);
      },
    });
    this.recycleCutsceneEvents.push(lineEvent);

    this.tweens.add({ targets: overlay, alpha: 0.82, duration: 300, ease: "Sine.easeOut" });
    this.tweens.add({
      targets: mouth,
      x: 676,
      alpha: 1,
      scale: 0.34,
      delay: 300,
      duration: 420,
      ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: cursor,
      x: 230,
      y: 318,
      delay: 500,
      duration: 420,
      ease: "Quad.easeInOut",
    });
    this.tweens.add({
      targets: cursor,
      x: 650,
      y: 278,
      delay: 1300,
      duration: 620,
      ease: "Quad.easeIn",
    });
    this.tweens.add({
      targets: pet,
      x: 610,
      y: 294,
      scale: 0.22,
      angle: 28,
      delay: 1300,
      duration: 620,
      ease: "Quad.easeIn",
      onUpdate: () => {
        pet.setAlpha(Phaser.Math.Clamp(1 - Phaser.Math.Distance.Between(pet.x, pet.y, 610, 294) / 460, 0.12, 1));
      },
    });

    this.addRecycleCutsceneEvent(1840, () => {
      pet.setVisible(false);
      dragLine.clear();
      this.spawnRecycleFragments(610, 294);
      this.cameras.main.shake(360, 0.012);
      this.tweens.add({
        targets: mouth,
        scaleX: 0.38,
        scaleY: 0.3,
        yoyo: true,
        repeat: 2,
        duration: 90,
        ease: "Sine.easeInOut",
      });
    });

    this.addRecycleCutsceneEvent(1960, () => {
      this.tweens.add({
        targets: flash,
        alpha: 0.5,
        yoyo: true,
        repeat: 1,
        duration: 110,
        ease: "Sine.easeInOut",
      });
    });

    this.addRecycleCutsceneEvent(2700, () => this.completeRecycleCutscene());
  }

  private addRecycleCutsceneEvent(delay: number, callback: () => void): void {
    this.recycleCutsceneEvents.push(
      this.time.delayedCall(delay, () => {
        if (this.isRecycleCutscenePlaying) {
          callback();
        }
      }),
    );
  }

  private spawnRecycleFragments(x: number, y: number): void {
    const colors = [0xfff0f0, 0xff4f6d, 0x7b1625, 0xd8f7ff];
    for (let index = 0; index < 30; index += 1) {
      const fragment = this.add
        .rectangle(x, y, Phaser.Math.Between(3, 8), Phaser.Math.Between(3, 9), colors[index % colors.length], 0.95)
        .setScrollFactor(0)
        .setDepth(1010);
      this.recycleCutsceneObjects.push(fragment);
      this.tweens.add({
        targets: fragment,
        x: x + Phaser.Math.Between(-210, 180),
        y: y + Phaser.Math.Between(-150, 140),
        angle: Phaser.Math.Between(-240, 240),
        alpha: 0,
        scale: Phaser.Math.FloatBetween(0.4, 1.6),
        duration: Phaser.Math.Between(420, 760),
        ease: "Cubic.easeOut",
      });
    }
  }

  private completeRecycleCutscene(): void {
    if (!this.isRecycleCutscenePlaying) {
      return;
    }

    this.isRecycleCutscenePlaying = false;
    this.clearRecycleCutsceneObjects();
    this.physics.world.isPaused = false;
    this.completeChapterAdvance();
  }

  private clearRecycleCutsceneObjects(): void {
    for (const event of this.recycleCutsceneEvents) {
      event.remove(false);
    }
    this.recycleCutsceneEvents = [];
    this.tweens.killTweensOf(this.recycleCutsceneObjects);
    for (const object of this.recycleCutsceneObjects) {
      object.destroy();
    }
    this.recycleCutsceneObjects = [];
  }

  private defeatBossByDebug(): void {
    const boss = this.controller.currentBoss();
    if (!boss) {
      this.controller.note("当前章节没有未击败 Boss。");
      this.emitState();
      return;
    }
    this.controller.note(`调试击败：${boss.name}`, true);
    this.controller.defeatCurrentBoss();
    this.rebuildChapter();
  }

  private drawAbilitySlash(color: number): void {
    if (!this.player) {
      return;
    }
    const slash = this.add.rectangle(this.player.x + (this.player.flipX ? -36 : 36), this.player.y, 70, 8, color, 0.85);
    slash.setRotation(this.player.flipX ? -0.35 : 0.35);
    slash.setDepth(25);
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.6,
      duration: 180,
      onComplete: () => slash.destroy(),
    });
  }

  private updatePlayerVisuals(time: number): void {
    if (!this.player) {
      return;
    }
    this.player.setAlpha(time < this.stealthUntil ? 0.46 : 1);
    this.updatePlayerAnimation();
    if (time < this.pingUntil && this.exitSprite) {
      this.exitSprite.setTint(0xffffff);
    } else if (this.exitSprite) {
      const chapter = this.controller.currentChapter();
      this.exitSprite.setTint(
        chapter.id === "trash-mountain" ? (this.canUseExit() ? 0xffffff : 0x334050) : this.canUseExit() ? chapter.palette.accent : 0x334050,
      );
    }
    this.refreshGatewayExitState();
  }

  private updatePlayerAnimation(): void {
    if (!this.player || !this.playerPetTextureKey) {
      return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const isClimbingLadder = Boolean(this.player.getData("isClimbingLadder"));
    const isWallClinging = Boolean(this.player.getData("isWallClinging"));
    let animation: PetAnimationName = "idle";

    if (isClimbingLadder || isWallClinging) {
      animation = "climb";
    } else if (!body.blocked.down) {
      animation = "jump";
    } else if (Math.abs(body.velocity.x) > 18) {
      animation = "run";
    }

    const key = getPetAnimationKey(this.playerPetTextureKey, animation);
    if (this.player.anims.currentAnim?.key !== key) {
      this.player.play(key, true);
    }
  }

  private updateExitPulse(time: number): void {
    if (!this.exitSprite) {
      return;
    }
    if (this.controller.currentChapter().id === "trash-mountain") {
      const scale = TRASH_MOUNTAIN_EXIT_SCALE * (this.canUseExit() ? 1 + Math.sin(time / 180) * 0.06 : 0.9);
      this.exitSprite.setScale(scale);
      return;
    }
    const scale = this.canUseExit() ? 1 + Math.sin(time / 180) * 0.08 : 0.9;
    this.exitSprite.setScale(scale);
  }

  private playWorldSfx(id: WorldSfxId, intensity = 1, position?: Readonly<{ x: number; y: number }>): void {
    const nowMs = this.time.now;
    const cooldownUntil = this.worldAudioCooldownUntil.get(id) ?? 0;
    if (nowMs < cooldownUntil) {
      return;
    }
    this.worldAudioCooldownUntil.set(id, nowMs + WORLD_SFX_COOLDOWNS[id]);

    const context = this.ensureWorldAudioContext();
    if (!context) {
      return;
    }
    if (context.state === "suspended") {
      context.resume().catch(() => undefined);
    }

    const patch = WORLD_SFX_PATCHES[id];
    const spatial = this.createWorldSfxSpatialMix(position ?? this.player ?? this.exitSprite);
    const intensityGain = Phaser.Math.Clamp(intensity, 0.15, 1.35);

    for (const tone of patch.tones) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const panner = typeof context.createStereoPanner === "function" ? context.createStereoPanner() : undefined;
      const startAt = context.currentTime + (tone.delayMs ?? 0) / 1000;
      const stopAt = startAt + tone.durationMs / 1000;
      const peakGain = Phaser.Math.Clamp(tone.gain * patch.gain * intensityGain * spatial.distanceGain, 0.0001, 0.42);

      oscillator.type = tone.waveform;
      oscillator.frequency.setValueAtTime(tone.frequencyHz, startAt);
      if (tone.endFrequencyHz) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, tone.endFrequencyHz), stopAt);
      }
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

      oscillator.connect(gain);
      if (panner) {
        panner.pan.setValueAtTime(spatial.pan, startAt);
        gain.connect(panner);
        panner.connect(context.destination);
      } else {
        gain.connect(context.destination);
      }
      oscillator.start(startAt);
      oscillator.stop(stopAt + 0.03);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        panner?.disconnect();
      };
    }
  }

  private createWorldSfxSpatialMix(position?: Readonly<{ x: number; y: number }>): { pan: number; distanceGain: number } {
    if (!position) {
      return { pan: 0, distanceGain: 0.82 };
    }
    const camera = this.cameras.main;
    const cameraCenterX = camera.scrollX + camera.width / 2;
    const cameraCenterY = camera.scrollY + camera.height / 2;
    const pan = Phaser.Math.Clamp((position.x - cameraCenterX) / Math.max(1, camera.width * 0.48), -0.82, 0.82);
    const distance = Phaser.Math.Distance.Between(cameraCenterX, cameraCenterY, position.x, position.y);
    const distanceGain = Phaser.Math.Clamp(1 - distance / 1180, 0.32, 1);
    return { pan, distanceGain };
  }

  private ensureWorldAudioContext(): AudioContext | undefined {
    if (this.worldAudioContext && this.worldAudioContext.state !== "closed") {
      return this.worldAudioContext;
    }
    if (typeof window === "undefined") {
      return undefined;
    }
    const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) {
      return undefined;
    }
    this.worldAudioContext = new AudioContextConstructor();
    return this.worldAudioContext;
  }

  private emitState(): void {
    dispatchGameState(this.controller.payload());
  }
}

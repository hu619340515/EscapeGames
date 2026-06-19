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
import { CodeLifeMode } from "./CodeLifeMode";
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

type CursorJumpState = "watching" | "aiming" | "jumping" | "recovering";

interface GatewayDigitCell {
  block: Phaser.GameObjects.Rectangle;
  frame: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  value: number;
  changed: boolean;
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
const LIMITED_DOUBLE_JUMP_CHAPTER_COUNT = 2;
const MAX_LIMITED_JUMPS = 2;
const SECOND_JUMP_HEIGHT_RATIO = 0.65;
const SECOND_JUMP_SPEED_MULTIPLIER = Math.sqrt(SECOND_JUMP_HEIGHT_RATIO);
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
  private gatewayDigitBlocks?: Phaser.Physics.Arcade.StaticGroup;
  private gatewayDigitCells: GatewayDigitCell[] = [];
  private gatewayAddressLabel?: Phaser.GameObjects.Text;
  private gatewayExitStatusText?: Phaser.GameObjects.Text;
  private gatewayExitHalo?: Phaser.GameObjects.Rectangle;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
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
  private isCursorCaughtSequencePlaying = false;
  private isRecycleCutscenePlaying = false;
  private recycleCutsceneObjects: Phaser.GameObjects.GameObject[] = [];
  private recycleCutsceneEvents: Phaser.Time.TimerEvent[] = [];
  private codeLifeMode?: CodeLifeMode;
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

  update(time: number, delta: number): void {
    if (this.isRecycleCutscenePlaying) {
      this.physics.world.isPaused = true;
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this.togglePause();
    }

    this.physics.world.isPaused = this.controller.status !== "running";

    if (this.codeLifeMode) {
      if (this.controller.status !== "running") {
        return;
      }
      this.codeLifeMode.update(time, delta);
      return;
    }

    if (this.controller.status !== "running" || !this.player) {
      return;
    }

    this.updatePlayerMovement();
    this.updateAbilityInput(time);
    this.updateBoss(time);
    this.updateCursorHunter(time);
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

    if (chapter.index >= 3) {
      this.codeLifeMode = new CodeLifeMode(this, {
        controller: this.controller,
        cursors: this.cursors,
        keys: this.keys,
        gmFeatures: this.gmFeatures,
        onExit: () => this.advanceChapter(false),
        onStateChanged: () => this.emitState(),
      });
      this.codeLifeMode.create();
      this.emitState();
      return;
    }

    if (chapter.id === "cursor-hunt") {
      this.drawCursorHuntBackdrop();
    } else if (chapter.id === "wrong-gateway") {
      this.drawWrongGatewayBackdrop();
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
    this.drawChapterTitle();

    this.platforms = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this.gatewayDigitBlocks = this.physics.add.staticGroup();

    this.createPlatforms(tileKey);
    this.createGatewayDigitPuzzle();
    this.createPlayer();
    this.createCollectibles();
    this.createExit();
    this.createBoss();
    this.createHazardsForChapter();
    this.createCursorHunter();
    this.createCollisions();
    this.emitState();
  }

  private cleanupLevel(): void {
    this.clearRecycleCutsceneObjects();
    this.isRecycleCutscenePlaying = false;
    this.codeLifeMode?.destroy();
    this.codeLifeMode = undefined;
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
    this.isCursorCaughtSequencePlaying = false;
    this.bossSprite = undefined;
    this.bossLabel = undefined;
    this.bossHpBack = undefined;
    this.bossHpFill = undefined;
    this.exitSprite = undefined;
    this.gatewayDigitBlocks = undefined;
    this.gatewayDigitCells = [];
    this.gatewayAddressLabel = undefined;
    this.gatewayExitStatusText = undefined;
    this.gatewayExitHalo = undefined;
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

    for (const [x, y, width, height] of platformDefs) {
      const platform =
        chapter.id === "cursor-hunt"
          ? this.add.rectangle(x, y, width, height, 0xffffff, 0).setOrigin(0.5)
          : chapter.id === "wrong-gateway"
            ? this.add.rectangle(x, y, width, height, 0xffffff, 0).setOrigin(0.5)
          : this.add.tileSprite(x, y, width, height, tileKey).setOrigin(0.5);
      this.physics.add.existing(platform, true);
      const body = platform.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(width, height);
      body.updateFromGameObject();
      if (chapter.id === "cursor-hunt" || chapter.id === "wrong-gateway") {
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
      .text(0, 0, this.formatGatewayAddress(), {
        color: "#bffef5",
        fontFamily: "Consolas, monospace",
        fontSize: "16px",
        fontStyle: "bold",
        stroke: "#031116",
        strokeThickness: 3,
      })
      .setDepth(18)
      .setVisible(false);
    this.gatewayExitStatusText = this.add
      .text(0, 0, "", {
        color: "#ffd76a",
        fontFamily: "Microsoft YaHei UI, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        stroke: "#08040a",
        strokeThickness: 4,
      })
      .setDepth(20)
      .setVisible(false);
    this.gatewayExitHalo = this.add.rectangle(2608, 830, 110, 150, 0xff4f73, 0).setDepth(7).setVisible(false);
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
    const playerIsBelowBlock = this.player.y > cell.block.y + 28;
    const isHeadHit = playerIsBelowBlock && (playerBody.touching.up || playerBody.blocked.up || playerBody.velocity.y <= 80);
    if (!isHeadHit) {
      return;
    }

    cell.block.setData("lastHitAt", this.time.now);
    this.bumpGatewayDigit(cell);
    playerBody.setVelocityY(150);
  }

  private bumpGatewayDigit(cell: GatewayDigitCell): void {
    cell.value = (cell.value + Phaser.Math.Between(1, 9)) % 10;
    cell.changed = true;
    cell.label.setText(String(cell.value));
    cell.label.setColor("#1b1200");
    cell.label.setStroke("#fff1a6", 4);
    cell.frame.setTint(0xffd76a);
    this.controller.state.flags[WRONG_GATEWAY_CHANGED_FLAG] = true;
    this.gatewayAddressLabel?.setText(this.formatGatewayAddress());
    this.controller.note(`地址位变动为 ${this.formatGatewayAddress()}，错误网关开始响应。`, true);
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
    this.gatewayExitStatusText?.setText(isOpen ? "错误网关已响应" : "地址未扰动");
    this.gatewayExitStatusText?.setColor(isOpen ? "#fff1a6" : "#91a8b6");
    this.gatewayExitHalo?.setFillStyle(isOpen ? 0xff4f73 : 0x334050, isOpen ? 0.18 : 0.05);
  }

  private createPlayer(): void {
    const chapter = this.controller.currentChapter();
    const shouldUseAnimalPet = isAnimalPetChapter(chapter.id);
    const texture = shouldUseAnimalPet ? getPetTextureKey(this.controller.state.customization.petSpecies) : "player-code";
    this.playerPetTextureKey = shouldUseAnimalPet ? texture : undefined;
    const startPosition =
      chapter.id === "cursor-hunt" ? { x: 95, y: 835 } : chapter.id === "wrong-gateway" ? { x: 42, y: 948 } : { x: 96, y: 700 };
    this.player = this.physics.add.sprite(startPosition.x, startPosition.y, texture);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(15);
    this.player.setDragX(1100);
    this.player.setMaxVelocity(420, 720);
    this.player.setData("lastDamageAt", 0);
    this.limitedJumpCount = 0;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(shouldUseAnimalPet ? 22 : 24, shouldUseAnimalPet ? 28 : 18);
    body.setOffset(shouldUseAnimalPet ? 13 : 2, shouldUseAnimalPet ? 16 : 4);

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
    const exitPosition =
      chapter.id === "cursor-hunt"
        ? { x: 1468, y: 838 }
        : chapter.id === "wrong-gateway"
          ? { x: 2610, y: 830 }
          : { x: 2260, y: 790 };
    this.exitSprite = this.physics.add.staticSprite(exitPosition.x, exitPosition.y, "exit-node");
    this.exitSprite.setTint(this.canUseExit() ? chapter.palette.accent : 0x334050);
    this.exitSprite.setDepth(9);
    if (chapter.id === "wrong-gateway") {
      this.exitSprite.setVisible(false);
      const body = this.exitSprite.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(92, 122);
      body.updateFromGameObject();
    }

    const labelPosition =
      chapter.id === "cursor-hunt"
        ? { x: 1402, y: 775 }
        : chapter.id === "wrong-gateway"
          ? { x: 2530, y: 952 }
          : { x: 2210, y: 725 };
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

    this.bossSprite = this.physics.add.sprite(1630, 540, "boss-core");
    this.bossSprite.setTint(boss.color);
    this.bossSprite.setImmovable(true);
    this.bossSprite.setDepth(12);
    this.bossSprite.setData("bossId", boss.id);
    this.bossMaxHp = boss.hp;
    this.bossHp = boss.hp;
    const body = this.bossSprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(72, 54);

    this.bossLabel = this.add
      .text(1500, 466, boss.name, {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "16px",
        stroke: "#101018",
        strokeThickness: 4,
      })
      .setDepth(20);

    this.bossHpBack = this.add.rectangle(1630, 516, 190, 10, 0x0b1118, 0.88).setDepth(19);
    this.bossHpFill = this.add.rectangle(1535, 516, 190, 10, boss.color, 0.95).setOrigin(0, 0.5).setDepth(20);
    this.nextBossAttackAt = this.time.now + 900;
  }

  private createHazardsForChapter(): void {
    const chapter = this.controller.currentChapter();
    const hazardCount = getHazardCount(chapter.id, chapter.index);
    for (let i = 0; i < hazardCount; i += 1) {
      const { x, y } = getHazardPosition(i, chapter.id);
      const hazard = this.hazards!.create(x, y, "hazard-scan") as Phaser.Physics.Arcade.Sprite;
      hazard.setTint(chapter.palette.danger);
      hazard.setDisplaySize(chapter.id === "cursor-hunt" ? 140 : 96, chapter.id === "cursor-hunt" ? 18 : 14);
      hazard.refreshBody();
      hazard.setAlpha(chapter.id === "cursor-hunt" ? 0.68 : 0.55);

      if (chapter.id === "cursor-hunt") {
        const trap = this.add
          .rectangle(x, y - 34, 112, 52, 0xff2f50, 0.08)
          .setStrokeStyle(2, 0xff4f6d, 0.45)
          .setDepth(7);
        this.tweens.add({
          targets: trap,
          alpha: { from: 0.04, to: 0.22 },
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
    if (this.gatewayDigitBlocks) {
      this.colliders.push(
        this.physics.add.collider(this.player, this.gatewayDigitBlocks, (_player, block) => {
          this.handleGatewayDigitCollision(block as Phaser.GameObjects.GameObject);
        }),
      );
    }
    this.colliders.push(
      this.physics.add.overlap(this.player, this.collectibles, (_player, item) => {
        item.destroy();
        this.controller.collectChapterItem();
        this.controller.heal(10);
        this.emitState();
      }),
    );
    this.colliders.push(
      this.physics.add.overlap(this.player, this.hazards, () => {
        this.damagePlayer(9);
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
    }

    if (this.cursorHunter) {
      this.colliders.push(
        this.physics.add.overlap(this.player, this.cursorHunter, () => {
          this.triggerCursorCaughtSequence();
        }),
      );
    }
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

  private triggerCursorCaughtSequence(): void {
    if (!this.player || !this.cursorHunter || this.isCursorCaughtSequencePlaying || this.gmFeatures.invincible) {
      return;
    }
    if (!this.isCursorJumpCatchWindow()) {
      return;
    }

    this.isCursorCaughtSequencePlaying = true;
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
      this.controller.enterChapter("permanent-delete", "桌宠被丢进回收站，永久删除流程启动。");
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
    const usesLimitedDoubleJump = this.controller.currentChapter().index <= LIMITED_DOUBLE_JUMP_CHAPTER_COUNT;
    if (usesLimitedDoubleJump) {
      this.syncLimitedDoubleJumpState(isGrounded);
    }

    if (!wantsJump) {
      return;
    }

    if (this.gmFeatures.infiniteJump) {
      this.player.setVelocityY(-JUMP_SPEED);
      return;
    }

    if (usesLimitedDoubleJump) {
      this.tryLimitedDoubleJump(isGrounded);
      return;
    }

    if (body.blocked.down || body.touching.down || canWallCling) {
      this.player.setVelocityY(canWallCling ? -JUMP_SPEED * 0.92 : -JUMP_SPEED);
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
      return;
    }

    if (this.limitedJumpCount >= MAX_LIMITED_JUMPS) {
      return;
    }

    this.limitedJumpCount += 1;
    this.player.setVelocityY(-JUMP_SPEED * SECOND_JUMP_SPEED_MULTIPLIER);
  }

  private updateAbilityInput(time: number): void {
    if (!this.player) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.j)) {
      this.useCoil();
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

  private useDevour(): void {
    if (!this.player) {
      return;
    }
    const hasDevour = this.controller.hasAbility("devour-code");
    this.controller.heal(hasDevour ? 16 : 4);
    this.controller.devourBias(hasDevour ? 1 : 0);
    this.drawAbilitySlash(0x42f5b9);
    this.damageBossIfClose(hasDevour ? 17 : 5, 150);
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
    this.bossSprite.y = 540 + wobble;
    if (this.bossLabel) {
      this.bossLabel.x = this.bossSprite.x - 130;
      this.bossLabel.y = this.bossSprite.y - 84;
    }
    if (this.bossHpBack && this.bossHpFill) {
      this.bossHpBack.y = this.bossSprite.y - 34;
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
      const y = Phaser.Math.Between(450, 760);
      const scan = this.hazards!.create(this.bossSprite.x - 60, y, "hazard-scan") as Phaser.Physics.Arcade.Sprite;
      scan.setTint(boss.color);
      scan.setDisplaySize(240, 14);
      scan.refreshBody();
      scan.setAlpha(0.75);
      this.time.delayedCall(1450, () => scan.destroy());
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
    this.bossHp = Math.max(0, this.bossHp - amount);
    this.cameras.main.shake(70, 0.003);
    this.bossSprite.setTintFill(0xffffff);
    this.time.delayedCall(70, () => {
      const boss = this.controller.currentBoss();
      if (this.bossSprite && boss) {
        this.bossSprite.clearTint();
        this.bossSprite.setTint(boss.color);
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
    const respawned = this.controller.damage(amount);
    this.player.setTintFill(0xffffff);
    this.time.delayedCall(80, () => this.player?.clearTint());
    this.cameras.main.shake(90, 0.004);
    if (respawned) {
      const chapter = this.controller.currentChapter();
      const respawnPosition =
        chapter.id === "cursor-hunt" ? { x: 95, y: 835 } : chapter.id === "wrong-gateway" ? { x: 42, y: 948 } : { x: 96, y: 700 };
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
        this.controller.note("错误网关仍未响应，必须先顶撞并改变任意地址数字。");
        this.emitState();
      }
      return;
    }
    if (debug && this.controller.currentBoss()) {
      this.controller.defeatCurrentBoss();
    }
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
    return nextChapter?.id === "permanent-delete";
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
      this.exitSprite.setTint(this.canUseExit() ? this.controller.currentChapter().palette.accent : 0x334050);
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
    const scale = this.canUseExit() ? 1 + Math.sin(time / 180) * 0.08 : 0.9;
    this.exitSprite.setScale(scale);
  }

  private emitState(): void {
    dispatchGameState(this.controller.payload());
  }
}

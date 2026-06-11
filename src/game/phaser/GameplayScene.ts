import Phaser from "phaser";
import {
  dispatchGameState,
  UI_EVENTS,
  type ChooseEndingDetail,
  type StartRunDetail,
  type ToggleGmFeatureDetail,
} from "../../ui/events";
import { chapters } from "../../data";
import { themeTileKeys } from "../assets/manifest";
import { GameController } from "../simulation/GameController";
import type { BossDef } from "../types";
import { createGameKeys, type GameKeyName } from "./inputConfig";
import { PermanentDeleteMode } from "./PermanentDeleteMode";
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
  getPlatformDefs,
  getWorldBounds,
  JUMP_SPEED,
  PLAYER_SPEED,
} from "./worldConfig";

export class GameplayScene extends Phaser.Scene {
  private controller!: GameController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<GameKeyName, Phaser.Input.Keyboard.Key>;
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursorHunter?: Phaser.Physics.Arcade.Sprite;
  private cursorWarning?: Phaser.GameObjects.Arc;
  private cursorHunterStartedAt = 0;
  private bossSprite?: Phaser.Physics.Arcade.Sprite;
  private bossLabel?: Phaser.GameObjects.Text;
  private bossHpBack?: Phaser.GameObjects.Rectangle;
  private bossHpFill?: Phaser.GameObjects.Rectangle;
  private exitSprite?: Phaser.Physics.Arcade.Sprite;
  private platforms?: Phaser.Physics.Arcade.StaticGroup;
  private collectibles?: Phaser.Physics.Arcade.StaticGroup;
  private hazards?: Phaser.Physics.Arcade.StaticGroup;
  private projectiles?: Phaser.Physics.Arcade.Group;
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
  private isCursorCaughtSequencePlaying = false;
  private isRecycleCutscenePlaying = false;
  private recycleCutsceneObjects: Phaser.GameObjects.GameObject[] = [];
  private recycleCutsceneEvents: Phaser.Time.TimerEvent[] = [];
  private permanentDeleteMode?: PermanentDeleteMode;
  private gmFeatures = {
    invincible: false,
    infiniteJump: false,
  };

  constructor() {
    super("GameplayScene");
  }

  create(): void {
    this.controller = new GameController(GameController.loadSavedRun());
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = createGameKeys(this.input);

    window.addEventListener(UI_EVENTS.START_RUN, this.handleStartRun as EventListener);
    window.addEventListener(UI_EVENTS.CONTINUE_RUN, this.handleContinueRun as EventListener);
    window.addEventListener(UI_EVENTS.RESET_RUN, this.handleResetRun as EventListener);
    window.addEventListener(UI_EVENTS.TOGGLE_PAUSE, this.handleTogglePause as EventListener);
    window.addEventListener(UI_EVENTS.CHOOSE_ENDING, this.handleChooseEnding as EventListener);
    window.addEventListener(UI_EVENTS.SAVE_RUN, this.handleSaveRun as EventListener);
    window.addEventListener(UI_EVENTS.TOGGLE_GM_FEATURE, this.handleToggleGmFeature as EventListener);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(UI_EVENTS.START_RUN, this.handleStartRun as EventListener);
      window.removeEventListener(UI_EVENTS.CONTINUE_RUN, this.handleContinueRun as EventListener);
      window.removeEventListener(UI_EVENTS.RESET_RUN, this.handleResetRun as EventListener);
      window.removeEventListener(UI_EVENTS.TOGGLE_PAUSE, this.handleTogglePause as EventListener);
      window.removeEventListener(UI_EVENTS.CHOOSE_ENDING, this.handleChooseEnding as EventListener);
      window.removeEventListener(UI_EVENTS.SAVE_RUN, this.handleSaveRun as EventListener);
      window.removeEventListener(UI_EVENTS.TOGGLE_GM_FEATURE, this.handleToggleGmFeature as EventListener);
    });

    this.rebuildChapter();
    this.emitState();
  }

  update(time: number): void {
    if (this.isRecycleCutscenePlaying) {
      this.physics.world.isPaused = true;
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this.togglePause();
    }

    this.physics.world.isPaused = this.controller.status !== "running";

    if (this.permanentDeleteMode) {
      if (this.controller.status !== "running") {
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.n)) {
        this.advanceChapter(true);
        return;
      }
      this.permanentDeleteMode.update(time);
      return;
    }

    if (this.controller.status !== "running" || !this.player) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.n)) {
      this.advanceChapter(true);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.b)) {
      this.defeatBossByDebug();
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

    if (chapter.id === "permanent-delete") {
      this.permanentDeleteMode = new PermanentDeleteMode(this, {
        controller: this.controller,
        cursors: this.cursors,
        keys: this.keys,
        gmFeatures: this.gmFeatures,
        onExit: () => this.advanceChapter(false),
        onStateChanged: () => this.emitState(),
      });
      this.permanentDeleteMode.create();
      this.emitState();
      return;
    }

    if (chapter.id === "cursor-hunt") {
      this.drawCursorHuntBackdrop();
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

    this.createPlatforms(tileKey);
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
    this.permanentDeleteMode?.destroy();
    this.permanentDeleteMode = undefined;
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
    this.cursorHunterStartedAt = 0;
    this.isCursorCaughtSequencePlaying = false;
    this.bossSprite = undefined;
    this.bossLabel = undefined;
    this.bossHpBack = undefined;
    this.bossHpFill = undefined;
    this.exitSprite = undefined;
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
      .image(0, 0, "cursor-hunt-desktop-bg")
      .setOrigin(0)
      .setDisplaySize(this.currentWorldWidth, this.currentWorldHeight)
      .setDepth(-20);

    this.add.rectangle(836, 910, 1672, 72, 0x03070c, 0.34).setDepth(-5);
    this.add.rectangle(1478, 812, 150, 178, 0x05070d, 0.62).setDepth(-4);
    this.add.rectangle(1468, 838, 58, 80, 0xffb74d, 0.08).setDepth(-3);

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

  private drawChapterTitle(): void {
    const chapter = this.controller.currentChapter();
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
          ? this.add.rectangle(x, y, width, height, 0x9edbff, 0.06).setOrigin(0.5)
          : this.add.tileSprite(x, y, width, height, tileKey).setOrigin(0.5);
      this.physics.add.existing(platform, true);
      const body = platform.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(width, height);
      body.updateFromGameObject();
      this.platforms!.add(platform);
    }
  }

  private createPlayer(): void {
    const chapter = this.controller.currentChapter();
    const shouldUseAnimalPet = isAnimalPetChapter(chapter.id);
    const texture = shouldUseAnimalPet ? getPetTextureKey(this.controller.state.customization.petSpecies) : "player-code";
    this.playerPetTextureKey = shouldUseAnimalPet ? texture : undefined;
    const startPosition = chapter.id === "cursor-hunt" ? { x: 95, y: 835 } : { x: 96, y: 700 };
    this.player = this.physics.add.sprite(startPosition.x, startPosition.y, texture);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(15);
    this.player.setDragX(1100);
    this.player.setMaxVelocity(420, 720);
    this.player.setData("lastDamageAt", 0);

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
    const exitPosition = chapter.id === "cursor-hunt" ? { x: 1468, y: 838 } : { x: 2260, y: 790 };
    this.exitSprite = this.physics.add.staticSprite(exitPosition.x, exitPosition.y, "exit-node");
    this.exitSprite.setTint(this.controller.canExitChapter() ? chapter.palette.accent : 0x334050);
    this.exitSprite.setDepth(9);

    const labelPosition = chapter.id === "cursor-hunt" ? { x: 1402, y: 775 } : { x: 2210, y: 725 };
    this.add
      .text(labelPosition.x, labelPosition.y, chapter.exitLabel, {
        color: chapter.id === "cursor-hunt" ? "#ffd99f" : "#dffcff",
        fontFamily: "Microsoft YaHei UI, monospace",
        fontSize: chapter.id === "cursor-hunt" ? "13px" : "14px",
        stroke: "#071019",
        strokeThickness: 3,
      })
      .setAlpha(chapter.id === "cursor-hunt" ? 0.74 : 1)
      .setDepth(18);
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
    this.cursorHunter.setScale(0.84);
    this.cursorHunter.setAlpha(0.9);
    this.cursorHunter.setTint(0xff2f50);
    this.cursorHunterStartedAt = this.time.now;
    const body = this.cursorHunter.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(38, 46);
    body.setOffset(8, 12);

    this.cursorWarning = this.add.circle(this.cursorHunter.x, this.cursorHunter.y, 54, 0xff2447, 0.08).setDepth(23);
    this.tweens.add({
      targets: this.cursorWarning,
      scale: { from: 0.65, to: 1.3 },
      alpha: { from: 0.18, to: 0.02 },
      repeat: -1,
      duration: 720,
      ease: "Sine.inOut",
    });
  }

  private createCollisions(): void {
    if (!this.player || !this.platforms || !this.collectibles || !this.hazards || !this.projectiles) {
      return;
    }

    this.colliders.push(this.physics.add.collider(this.player, this.platforms));
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
          this.advanceChapter(false);
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
    const elapsed = Math.max(0, chapterElapsed - observeDelay);
    const huntSpeed = Phaser.Math.Clamp(120 + elapsed / 35, 120, 310);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const targetX = this.player.x + (playerBody.velocity.x > 0 ? -18 : 28);
    const targetY = this.player.y - 8;
    const distance = Phaser.Math.Distance.Between(this.cursorHunter.x, this.cursorHunter.y, targetX, targetY);

    if (chapterElapsed < observeDelay) {
      this.cursorHunter.setVelocity(0, Math.sin(time / 160) * 18);
    } else if (distance > 42) {
      this.physics.moveTo(this.cursorHunter, targetX, targetY, huntSpeed);
    } else {
      this.cursorHunter.setVelocity(0, 0);
    }

    this.cursorHunter.setRotation(Math.sin(time / 180) * 0.08);
    this.cursorHunter.setAlpha(0.82 + Math.sin(time / 95) * 0.14);
    if (this.cursorWarning) {
      this.cursorWarning.setPosition(this.cursorHunter.x + 12, this.cursorHunter.y + 18);
    }
  }

  private triggerCursorCaughtSequence(): void {
    if (!this.player || !this.cursorHunter || this.isCursorCaughtSequencePlaying || this.gmFeatures.invincible) {
      return;
    }

    this.isCursorCaughtSequencePlaying = true;
    this.controller.note("红色光标抓住了桌宠，回收站开始粉碎流程。", true);
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
        dragLine.lineBetween(this.cursorHunter.x + 14, this.cursorHunter.y + 46, this.player.x, this.player.y);
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

  private updatePlayerMovement(): void {
    if (!this.player) {
      return;
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const left = this.cursors.left.isDown || this.keys.a.isDown;
    const right = this.cursors.right.isDown || this.keys.d.isDown;
    const wantsJump =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space);

    if (left) {
      this.player.setVelocityX(-PLAYER_SPEED);
      this.player.setFlipX(true);
    } else if (right) {
      this.player.setVelocityX(PLAYER_SPEED);
      this.player.setFlipX(false);
    }

    const canWallCling = this.controller.hasAbility("cling") && (body.blocked.left || body.blocked.right);
    this.player.setData("isWallClinging", canWallCling && body.velocity.y > 60);
    if (canWallCling && body.velocity.y > 60) {
      this.player.setVelocityY(60);
    }

    if (
      wantsJump &&
      (this.gmFeatures.infiniteJump || body.blocked.down || canWallCling || this.controller.currentChapter().index < 4)
    ) {
      this.player.setVelocityY(canWallCling ? -JUMP_SPEED * 0.92 : -JUMP_SPEED);
    }
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
      this.advanceChapter(false);
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
      const respawnPosition = chapter.id === "cursor-hunt" ? { x: 95, y: 835 } : { x: 96, y: 700 };
      this.player.setPosition(respawnPosition.x, respawnPosition.y);
      this.player.setVelocity(0, 0);
    }
    this.emitState();
  }

  private advanceChapter(debug: boolean): void {
    if (this.isRecycleCutscenePlaying) {
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
      this.exitSprite.setTint(this.controller.canExitChapter() ? this.controller.currentChapter().palette.accent : 0x334050);
    }
  }

  private updatePlayerAnimation(): void {
    if (!this.player || !this.playerPetTextureKey) {
      return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const isWallClinging = Boolean(this.player.getData("isWallClinging"));
    let animation: PetAnimationName = "idle";

    if (isWallClinging) {
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
    const scale = this.controller.canExitChapter() ? 1 + Math.sin(time / 180) * 0.08 : 0.9;
    this.exitSprite.setScale(scale);
  }

  private emitState(): void {
    dispatchGameState(this.controller.payload());
  }
}

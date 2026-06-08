import Phaser from "phaser";
import { dispatchGameState, UI_EVENTS, type ChooseEndingDetail, type StartRunDetail } from "../../ui/events";
import { themeTileKeys } from "../assets/manifest";
import { GameController } from "../simulation/GameController";
import type { BossDef } from "../types";
import { createGameKeys, type GameKeyName } from "./inputConfig";
import {
  getCollectibleCount,
  getCollectiblePosition,
  getHazardCount,
  getHazardPosition,
  getPlatformDefs,
  JUMP_SPEED,
  PLAYER_SPEED,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./worldConfig";

export class GameplayScene extends Phaser.Scene {
  private controller!: GameController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<GameKeyName, Phaser.Input.Keyboard.Key>;
  private player?: Phaser.Physics.Arcade.Sprite;
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

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(UI_EVENTS.START_RUN, this.handleStartRun as EventListener);
      window.removeEventListener(UI_EVENTS.CONTINUE_RUN, this.handleContinueRun as EventListener);
      window.removeEventListener(UI_EVENTS.RESET_RUN, this.handleResetRun as EventListener);
      window.removeEventListener(UI_EVENTS.TOGGLE_PAUSE, this.handleTogglePause as EventListener);
      window.removeEventListener(UI_EVENTS.CHOOSE_ENDING, this.handleChooseEnding as EventListener);
      window.removeEventListener(UI_EVENTS.SAVE_RUN, this.handleSaveRun as EventListener);
    });

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.rebuildChapter();
    this.emitState();
  }

  update(time: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this.togglePause();
    }

    this.physics.world.isPaused = this.controller.status !== "running";

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

  private togglePause(): void {
    if (this.controller.status === "running" || this.controller.status === "paused") {
      this.controller.togglePause();
      this.emitState();
    }
  }

  private rebuildChapter(): void {
    this.cleanupLevel();

    const chapter = this.controller.currentChapter();
    const tileKey = themeTileKeys[chapter.theme];
    this.cameras.main.setBackgroundColor(chapter.palette.background);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.add.tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, tileKey).setAlpha(0.12);
    this.drawBackdropGrid(chapter.palette.accent);
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
    this.createCollisions();
    this.emitState();
  }

  private cleanupLevel(): void {
    for (const collider of this.colliders) {
      collider.destroy();
    }
    this.colliders = [];
    this.children.removeAll(true);
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.player = undefined;
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
    for (let x = 0; x <= WORLD_WIDTH; x += 160) {
      this.add.rectangle(x, WORLD_HEIGHT / 2, 2, WORLD_HEIGHT, color, 0.08).setOrigin(0.5);
    }
    for (let y = 80; y <= WORLD_HEIGHT; y += 120) {
      this.add.rectangle(WORLD_WIDTH / 2, y, WORLD_WIDTH, 2, color, 0.08).setOrigin(0.5);
    }
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
    const platformDefs = getPlatformDefs(chapter.index);

    for (const [x, y, width, height] of platformDefs) {
      const platform = this.add.tileSprite(x, y, width, height, tileKey).setOrigin(0.5);
      this.physics.add.existing(platform, true);
      const body = platform.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(width, height);
      body.updateFromGameObject();
      this.platforms!.add(platform);
    }
  }

  private createPlayer(): void {
    const chapter = this.controller.currentChapter();
    const texture = chapter.index < 4 ? "player-pet" : "player-code";
    this.player = this.physics.add.sprite(96, 700, texture);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(15);
    this.player.setDragX(1100);
    this.player.setMaxVelocity(420, 720);
    this.player.setData("lastDamageAt", 0);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(chapter.index < 4 ? 18 : 24, chapter.index < 4 ? 18 : 18);
    body.setOffset(chapter.index < 4 ? 3 : 2, chapter.index < 4 ? 5 : 4);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  private createCollectibles(): void {
    const chapter = this.controller.currentChapter();
    const count = getCollectibleCount(chapter.id);
    for (let i = 0; i < count; i += 1) {
      const { x, y } = getCollectiblePosition(i, chapter.index);
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
    this.exitSprite = this.physics.add.staticSprite(2260, 790, "exit-node");
    this.exitSprite.setTint(this.controller.canExitChapter() ? chapter.palette.accent : 0x334050);
    this.exitSprite.setDepth(9);

    this.add
      .text(2210, 725, chapter.exitLabel, {
        color: "#dffcff",
        fontFamily: "monospace",
        fontSize: "14px",
        stroke: "#071019",
        strokeThickness: 3,
      })
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
    const hazardCount = getHazardCount(chapter.index);
    for (let i = 0; i < hazardCount; i += 1) {
      const { x, y } = getHazardPosition(i);
      const hazard = this.hazards!.create(x, y, "hazard-scan") as Phaser.Physics.Arcade.Sprite;
      hazard.setTint(chapter.palette.danger);
      hazard.setDisplaySize(96, 14);
      hazard.refreshBody();
      hazard.setAlpha(0.55);
    }
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
    if (canWallCling && body.velocity.y > 60) {
      this.player.setVelocityY(60);
    }

    if (wantsJump && (body.blocked.down || canWallCling || this.controller.currentChapter().index < 4)) {
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
      this.player.setPosition(96, 700);
      this.player.setVelocity(0, 0);
    }
    this.emitState();
  }

  private advanceChapter(debug: boolean): void {
    if (debug && this.controller.currentBoss()) {
      this.controller.defeatCurrentBoss();
    }
    this.controller.advanceChapter();
    if (this.controller.status !== "ending-choice") {
      this.rebuildChapter();
    }
    this.emitState();
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
    if (time < this.pingUntil && this.exitSprite) {
      this.exitSprite.setTint(0xffffff);
    } else if (this.exitSprite) {
      this.exitSprite.setTint(this.controller.canExitChapter() ? this.controller.currentChapter().palette.accent : 0x334050);
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

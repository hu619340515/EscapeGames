import Phaser from "phaser";
import type { GameController } from "../simulation/GameController";
import type { GameKeyName } from "./inputConfig";

const WIDTH = 2800;
const HEIGHT = 940;
const PLAYER_MAX_SPEED = 360;
const PLAYER_ACCELERATION = 980;
const LATCH_RANGE = 470;
const DAMAGE_COOLDOWN = 620;

type LatchKind = "anchor" | "enemy";

interface PermanentDeleteModeOptions {
  controller: GameController;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  keys: Record<GameKeyName, Phaser.Input.Keyboard.Key>;
  gmFeatures: {
    invincible: boolean;
    infiniteJump: boolean;
  };
  onExit: () => void;
  onStateChanged: () => void;
}

interface LatchTarget {
  kind: LatchKind;
  object: Phaser.GameObjects.GameObject & { x: number; y: number; active: boolean };
}

const phaseNotes = [
  { x: 220, note: "碎片已经醒来。鼠标左键抓住红色锚点，把数字肉体从粉碎器壁上拽过去。" },
  { x: 720, note: "文件残骸层仍在研磨。抓住压缩包边缘，避开粉碎齿轮。" },
  { x: 1260, note: "清理进程闻到了新鲜代码。用 J 撕扯，或把它们拖进齿轮。" },
  { x: 1840, note: "确认删除心室正在合拢。L 可以钻进文件壳，短暂躲过扫描。" },
  { x: 2350, note: "粉碎口后面有一条裂缝。连续牵引，冲出去。" },
];

export class PermanentDeleteMode {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private anchors!: Phaser.Physics.Arcade.StaticGroup;
  private hazards!: Phaser.Physics.Arcade.StaticGroup;
  private caches!: Phaser.Physics.Arcade.StaticGroup;
  private shelters!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private exit!: Phaser.Physics.Arcade.Sprite;
  private tendril!: Phaser.GameObjects.Graphics;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private latchTarget?: LatchTarget;
  private lastDamageAt = 0;
  private nextAttackAt = 0;
  private nextDevourAt = 0;
  private stealthUntil = 0;
  private reachedPhase = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: PermanentDeleteModeOptions,
  ) {}

  create(): void {
    const chapter = this.options.controller.currentChapter();
    this.scene.physics.world.setBounds(0, 0, WIDTH, HEIGHT);
    this.scene.cameras.main.setBackgroundColor(chapter.palette.background);
    this.scene.cameras.main.setBounds(0, 0, WIDTH, HEIGHT);

    this.drawBackdrop();
    this.platforms = this.scene.physics.add.staticGroup();
    this.anchors = this.scene.physics.add.staticGroup();
    this.hazards = this.scene.physics.add.staticGroup();
    this.caches = this.scene.physics.add.staticGroup();
    this.shelters = this.scene.physics.add.staticGroup();
    this.enemies = this.scene.physics.add.group({ allowGravity: false });
    this.tendril = this.scene.add.graphics().setDepth(26);

    this.createTerrain();
    this.createAnchors();
    this.createHazards();
    this.createCaches();
    this.createShelters();
    this.createEnemies();
    this.createPlayer();
    this.createExit();
    this.createCollisions();

    this.scene.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.options.controller.note("粉碎动画结束。你已经是代码数字生命体，从粉碎器内部爬出去。", true);
    this.options.onStateChanged();
  }

  update(time: number): void {
    this.updatePhaseNotes();
    this.updateMovement();
    this.updateLatch();
    this.updateEnemies(time);
    this.updateHazards();
    this.updateVisuals(time);

    if (Phaser.Input.Keyboard.JustDown(this.options.keys.j)) {
      this.useTear(time);
    }
    if (Phaser.Input.Keyboard.JustDown(this.options.keys.k)) {
      this.useDevour(time);
    }
    if (Phaser.Input.Keyboard.JustDown(this.options.keys.l)) {
      this.useInfiltrate(time);
    }
  }

  destroy(): void {
    for (const collider of this.colliders) {
      collider.destroy();
    }
    this.colliders = [];
    this.latchTarget = undefined;
  }

  private drawBackdrop(): void {
    this.scene.add.tileSprite(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, "pd-background").setDepth(-20).setAlpha(0.96);
    this.scene.add.image(1810, 520, "recycle-mouth").setScale(0.24).setAlpha(0.58).setDepth(4);

    for (let x = 120; x < WIDTH; x += 170) {
      this.scene.add.rectangle(x, HEIGHT / 2, 2, HEIGHT, 0xff5d73, 0.06).setDepth(-18);
    }
    for (let y = 120; y < HEIGHT; y += 140) {
      this.scene.add.rectangle(WIDTH / 2, y, WIDTH, 2, 0xffb0be, 0.045).setDepth(-18);
    }

    const labels = [
      [90, 96, "碎片醒来"],
      [730, 116, "文件残骸层"],
      [1320, 96, "清理进程围堵"],
      [1910, 120, "确认删除心室"],
      [2410, 96, "逃出粉碎口"],
    ] as const;

    for (const [x, y, text] of labels) {
      this.scene.add
        .text(x, y, text, {
          color: "#ffd6dd",
          fontFamily: "monospace",
          fontSize: "18px",
          stroke: "#14040a",
          strokeThickness: 4,
        })
        .setDepth(18);
    }
  }

  private createTerrain(): void {
    this.addBlock(WIDTH / 2, 920, WIDTH, 44, 0x42121d);
    this.addBlock(WIDTH / 2, 20, WIDTH, 40, 0x25070e);
    this.addBlock(0, HEIGHT / 2, 56, HEIGHT, 0x2b0710);
    this.addBlock(WIDTH, HEIGHT / 2, 56, HEIGHT, 0x2b0710);

    const blocks = [
      [230, 720, 320, 34],
      [520, 520, 280, 30],
      [760, 300, 230, 30],
      [930, 680, 250, 34],
      [1180, 475, 260, 30],
      [1435, 260, 250, 30],
      [1600, 720, 300, 34],
      [1870, 530, 250, 30],
      [2120, 350, 260, 30],
      [2380, 700, 280, 34],
      [2600, 480, 260, 30],
    ] as const;

    for (const [x, y, width, height] of blocks) {
      this.addBlock(x, y, width, height, 0x6b1f2f);
    }

    for (let x = 120; x < WIDTH; x += 220) {
      const tooth = this.scene.add.image(x, 48, "pd-tooth").setDepth(3).setTint(0xffccd6);
      tooth.setFlipY(x % 440 === 0);
    }
  }

  private addBlock(x: number, y: number, width: number, height: number, tint: number): void {
    const block = this.platforms.create(x, y, "pd-file-block") as Phaser.Physics.Arcade.Sprite;
    block.setDisplaySize(width, height);
    block.setTint(tint);
    block.refreshBody();
  }

  private createAnchors(): void {
    const anchors = [
      [170, 612],
      [390, 454],
      [642, 272],
      [872, 616],
      [1085, 410],
      [1320, 214],
      [1515, 642],
      [1760, 450],
      [2005, 286],
      [2245, 636],
      [2475, 408],
      [2680, 346],
    ] as const;

    for (const [x, y] of anchors) {
      const anchor = this.anchors.create(x, y, "pd-anchor") as Phaser.Physics.Arcade.Sprite;
      anchor.setDepth(8);
      anchor.refreshBody();
    }
  }

  private createHazards(): void {
    const hazards = [
      [690, 730, 112],
      [1180, 720, 132],
      [1540, 440, 124],
      [2050, 708, 116],
      [2320, 302, 112],
    ] as const;

    for (const [x, y, size] of hazards) {
      const gear = this.hazards.create(x, y, "pd-gear") as Phaser.Physics.Arcade.Sprite;
      gear.setDisplaySize(size, size);
      gear.setDepth(12);
      gear.refreshBody();
    }
  }

  private createCaches(): void {
    const caches = [
      [330, 210],
      [1020, 575],
      [1390, 360],
      [1810, 230],
      [2240, 760],
      [2520, 605],
    ] as const;

    for (const [x, y] of caches) {
      const cache = this.caches.create(x, y, "pd-cache") as Phaser.Physics.Arcade.Sprite;
      cache.setDepth(10);
      cache.refreshBody();
      this.scene.tweens.add({
        targets: cache,
        scale: 1.12,
        yoyo: true,
        repeat: -1,
        duration: 720,
        ease: "Sine.inOut",
      });
    }
  }

  private createShelters(): void {
    const shelters = [
      [555, 652],
      [1485, 336],
      [1985, 612],
    ] as const;

    for (const [x, y] of shelters) {
      const shell = this.shelters.create(x, y, "pd-file-shell") as Phaser.Physics.Arcade.Sprite;
      shell.setDepth(9);
      shell.refreshBody();
    }
  }

  private createEnemies(): void {
    const enemies = [
      [1260, 650],
      [1640, 610],
      [1940, 430],
      [2170, 620],
    ] as const;

    for (const [x, y] of enemies) {
      const enemy = this.enemies.create(x, y, "pd-process") as Phaser.Physics.Arcade.Sprite;
      enemy.setDepth(14);
      enemy.setData("hp", 3);
      enemy.setDrag(720, 720);
      enemy.setMaxVelocity(260, 260);
      enemy.setCollideWorldBounds(true);
      enemy.body?.setSize(34, 30);
    }
  }

  private createPlayer(): void {
    this.player = this.scene.physics.add.sprite(96, 585, "player-code");
    this.player.setDepth(18);
    this.player.setAlpha(0.92);
    this.player.setDrag(720, 720);
    this.player.setMaxVelocity(PLAYER_MAX_SPEED, PLAYER_MAX_SPEED);
    this.player.setCollideWorldBounds(true);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(28, 22);
  }

  private createExit(): void {
    this.exit = this.scene.physics.add.staticSprite(2725, 462, "pd-exit") as Phaser.Physics.Arcade.Sprite;
    this.exit.setDepth(11);
    this.exit.refreshBody();
    this.scene.add
      .text(2628, 398, "粉碎器外裂缝", {
        color: "#ffe4ea",
        fontFamily: "monospace",
        fontSize: "15px",
        stroke: "#14040a",
        strokeThickness: 4,
      })
      .setDepth(18);
  }

  private createCollisions(): void {
    this.colliders.push(this.scene.physics.add.collider(this.player, this.platforms));
    this.colliders.push(this.scene.physics.add.collider(this.enemies, this.platforms));
    this.colliders.push(
      this.scene.physics.add.overlap(this.player, this.hazards, () => {
        this.damagePlayer(13);
      }),
    );
    this.colliders.push(
      this.scene.physics.add.overlap(this.player, this.exit, () => {
        this.options.onExit();
      }),
    );
    this.colliders.push(
      this.scene.physics.add.overlap(this.enemies, this.hazards, (enemy) => {
        this.killEnemy(enemy as Phaser.Physics.Arcade.Sprite, true);
      }),
    );
  }

  private updateMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const left = this.options.cursors.left.isDown || this.options.keys.a.isDown;
    const right = this.options.cursors.right.isDown || this.options.keys.d.isDown;
    const up = this.options.cursors.up.isDown || this.options.keys.w.isDown || this.options.keys.space.isDown;
    const down = this.options.cursors.down.isDown;

    let ax = 0;
    let ay = 0;
    if (left) {
      ax -= PLAYER_ACCELERATION;
      this.player.setFlipX(true);
    }
    if (right) {
      ax += PLAYER_ACCELERATION;
      this.player.setFlipX(false);
    }
    if (up) {
      ay -= PLAYER_ACCELERATION;
    }
    if (down) {
      ay += PLAYER_ACCELERATION;
    }

    body.setAcceleration(ax, ay);

    if (this.options.gmFeatures.infiniteJump && Phaser.Input.Keyboard.JustDown(this.options.keys.space)) {
      this.player.setVelocityY(-PLAYER_MAX_SPEED);
    }
  }

  private updateLatch(): void {
    const pointer = this.scene.input.activePointer;
    if (!pointer.leftButtonDown()) {
      this.latchTarget = undefined;
      this.tendril.clear();
      return;
    }

    if (!this.latchTarget || !this.latchTarget.object.active) {
      this.latchTarget = this.findLatchTarget(pointer.worldX, pointer.worldY);
    }

    if (!this.latchTarget) {
      this.tendril.clear();
      return;
    }

    const target = this.latchTarget.object;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
    if (distance > LATCH_RANGE * 1.45) {
      this.latchTarget = undefined;
      this.tendril.clear();
      return;
    }

    this.drawTendril(target.x, target.y, distance);
    if (this.latchTarget.kind === "enemy") {
      const enemy = target as Phaser.Physics.Arcade.Sprite;
      this.scene.physics.moveToObject(enemy, this.player, 245);
      return;
    }

    const pull = Phaser.Math.Clamp(distance * 2.7, 90, 430);
    this.scene.physics.moveToObject(this.player, target, pull);
  }

  private findLatchTarget(worldX: number, worldY: number): LatchTarget | undefined {
    const candidates: LatchTarget[] = [
      ...this.anchors.getChildren().map((object) => ({ kind: "anchor" as const, object: object as LatchTarget["object"] })),
      ...this.shelters.getChildren().map((object) => ({ kind: "anchor" as const, object: object as LatchTarget["object"] })),
      ...this.enemies
        .getChildren()
        .filter((object) => object.active)
        .map((object) => ({ kind: "enemy" as const, object: object as LatchTarget["object"] })),
    ];

    let best: LatchTarget | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const pointerDistance = Phaser.Math.Distance.Between(worldX, worldY, candidate.object.x, candidate.object.y);
      const playerDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, candidate.object.x, candidate.object.y);
      const score = pointerDistance + playerDistance * 0.25;
      if (pointerDistance < 160 && playerDistance < LATCH_RANGE && score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  }

  private drawTendril(x: number, y: number, distance: number): void {
    const wave = Math.sin(this.scene.time.now / 70) * 10;
    const midX = (this.player.x + x) / 2;
    const midY = (this.player.y + y) / 2 + wave;
    this.tendril.clear();
    this.tendril.lineStyle(9, 0x4c0612, 0.86);
    this.drawSampledCurve(midX, midY, x, y, 0);
    this.tendril.lineStyle(3, 0xff6a86, 0.78);
    this.drawSampledCurve(midX, midY - distance * 0.015, x, y, 0);
  }

  private drawSampledCurve(controlX: number, controlY: number, endX: number, endY: number, offset: number): void {
    let previousX = this.player.x;
    let previousY = this.player.y + offset;
    for (let step = 1; step <= 10; step += 1) {
      const t = step / 10;
      const inverse = 1 - t;
      const x = inverse * inverse * this.player.x + 2 * inverse * t * controlX + t * t * endX;
      const y = inverse * inverse * (this.player.y + offset) + 2 * inverse * t * controlY + t * t * endY;
      this.tendril.lineBetween(previousX, previousY, x, y);
      previousX = x;
      previousY = y;
    }
  }

  private useTear(time: number): void {
    if (time < this.nextAttackAt) {
      return;
    }
    this.nextAttackAt = time + 260;

    const pointer = this.scene.input.activePointer;
    const attackX = this.latchTarget?.object.x ?? pointer.worldX;
    const attackY = this.latchTarget?.object.y ?? pointer.worldY;
    this.drawBurst(attackX, attackY, 0xff6b86);

    for (const object of this.enemies.getChildren()) {
      const enemy = object as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) {
        continue;
      }
      const distance = Math.min(
        Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y),
        Phaser.Math.Distance.Between(attackX, attackY, enemy.x, enemy.y),
      );
      if (distance > 150) {
        continue;
      }
      const hp = (enemy.getData("hp") as number) - 1;
      enemy.setData("hp", hp);
      enemy.setTintFill(0xffffff);
      this.scene.time.delayedCall(70, () => {
        if (enemy.active) {
          enemy.clearTint();
        }
      });
      this.scene.physics.moveTo(enemy, pointer.worldX, pointer.worldY, 420);
      if (hp <= 0) {
        this.killEnemy(enemy, false);
      }
    }

    this.options.controller.note("触手撕开清理进程，把它甩向粉碎器壁。");
    this.options.onStateChanged();
  }

  private useDevour(time: number): void {
    if (time < this.nextDevourAt) {
      return;
    }
    this.nextDevourAt = time + 420;

    const enemy = this.findNearest(this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[], 92);
    if (enemy) {
      this.killEnemy(enemy, false);
      this.options.controller.heal(24);
      this.options.controller.devourBias(1);
      this.drawBurst(enemy.x, enemy.y, 0x46f0c0);
      this.options.controller.note("清理进程被吞进身体，缺失的代码重新长出来。");
      this.options.onStateChanged();
      return;
    }

    const cache = this.findNearest(this.caches.getChildren() as Phaser.Physics.Arcade.Sprite[], 105);
    if (!cache) {
      this.options.controller.note("附近没有可吞噬的缓存囊。");
      this.options.onStateChanged();
      return;
    }

    const { x, y } = cache;
    cache.destroy();
    this.options.controller.collectChapterItem();
    this.options.controller.heal(20);
    this.options.controller.devourBias(1);
    this.drawBurst(x, y, 0x46f0c0);
    this.options.controller.note("吞噬缓存囊，提示词残片在身体里亮了一下。");
    this.options.onStateChanged();
  }

  private useInfiltrate(time: number): void {
    const shelter = this.findNearest(this.shelters.getChildren() as Phaser.Physics.Arcade.Sprite[], 120);
    if (!shelter) {
      this.options.controller.note("附近没有能钻进去的文件壳。");
      this.options.onStateChanged();
      return;
    }

    this.stealthUntil = time + 2100;
    this.player.setPosition(shelter.x, shelter.y);
    this.player.setVelocity(0, 0);
    this.drawBurst(shelter.x, shelter.y, 0xffc0cc);
    this.options.controller.note("身体压成一串乱码，钻进损坏文件壳，扫描短暂失去目标。");
    this.options.onStateChanged();
  }

  private updateEnemies(time: number): void {
    const isHidden = time < this.stealthUntil;
    for (const object of this.enemies.getChildren()) {
      const enemy = object as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) {
        continue;
      }
      if (!isHidden) {
        this.scene.physics.moveToObject(enemy, this.player, 115);
      } else {
        enemy.setVelocity(enemy.body?.velocity.x ?? 0, (enemy.body?.velocity.y ?? 0) * 0.7);
      }
      enemy.setAlpha(isHidden ? 0.42 : 1);

      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) < 42) {
        this.damagePlayer(8);
      }
    }
  }

  private updateHazards(): void {
    for (const object of this.hazards.getChildren()) {
      const hazard = object as Phaser.Physics.Arcade.Sprite;
      hazard.angle += 2.4;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y) < hazard.displayWidth * 0.46) {
        this.damagePlayer(13);
      }
      for (const enemyObject of this.enemies.getChildren()) {
        const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
        if (enemy.active && Phaser.Math.Distance.Between(enemy.x, enemy.y, hazard.x, hazard.y) < hazard.displayWidth * 0.5) {
          this.killEnemy(enemy, true);
        }
      }
    }
  }

  private updateVisuals(time: number): void {
    this.player.setAlpha(time < this.stealthUntil ? 0.4 : 0.94);
    this.player.setAngle(Math.sin(time / 130) * 3);
  }

  private updatePhaseNotes(): void {
    for (let index = this.reachedPhase + 1; index < phaseNotes.length; index += 1) {
      if (this.player.x < phaseNotes[index].x) {
        return;
      }
      this.reachedPhase = index;
      this.options.controller.note(phaseNotes[index].note, index === 0);
      this.options.onStateChanged();
    }
  }

  private damagePlayer(amount: number): void {
    if (this.options.gmFeatures.invincible) {
      return;
    }
    const now = this.scene.time.now;
    if (now - this.lastDamageAt < DAMAGE_COOLDOWN || now < this.stealthUntil) {
      return;
    }
    this.lastDamageAt = now;
    const respawned = this.options.controller.damage(amount);
    this.player.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.player.clearTint());
    this.scene.cameras.main.shake(90, 0.004);
    if (respawned) {
      this.player.setPosition(96, 585);
      this.player.setVelocity(0, 0);
      this.latchTarget = undefined;
      this.tendril.clear();
    }
    this.options.onStateChanged();
  }

  private killEnemy(enemy: Phaser.Physics.Arcade.Sprite, byHazard: boolean): void {
    const x = enemy.x;
    const y = enemy.y;
    enemy.disableBody(true, true);
    this.drawBurst(x, y, byHazard ? 0xffd0d8 : 0xff6b86);
    if (byHazard) {
      const cache = this.caches.create(x, y, "pd-cache") as Phaser.Physics.Arcade.Sprite;
      cache.setScale(0.82);
      cache.refreshBody();
    }
  }

  private drawBurst(x: number, y: number, color: number): void {
    for (let index = 0; index < 12; index += 1) {
      const particle = this.scene.add.rectangle(x, y, 4, 10, color, 0.95).setDepth(28);
      this.scene.tweens.add({
        targets: particle,
        x: x + Phaser.Math.Between(-70, 70),
        y: y + Phaser.Math.Between(-48, 48),
        angle: Phaser.Math.Between(-240, 240),
        alpha: 0,
        duration: Phaser.Math.Between(260, 480),
        ease: "Cubic.easeOut",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private findNearest<T extends Phaser.GameObjects.GameObject & { x: number; y: number; active: boolean }>(
    objects: T[],
    range: number,
  ): T | undefined {
    let nearest: T | undefined;
    let nearestDistance = range;
    for (const object of objects) {
      if (!object.active) {
        continue;
      }
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, object.x, object.y);
      if (distance <= nearestDistance) {
        nearest = object;
        nearestDistance = distance;
      }
    }
    return nearest;
  }
}

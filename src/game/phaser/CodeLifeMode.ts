import Phaser from "phaser";
import { themeTileKeys } from "../assets/manifest";
import type { GameController } from "../simulation/GameController";
import type { AbilityId, BossDef, ChapterDef, CodeLifeBossRuntimeHud } from "../types";
import { CodeFluidBody } from "./codeLife/CodeFluidBody";
import type { CodeFluidNode } from "./codeLife/CodeFluidTypes";
import { resolveCodeLifeBossAttackPattern } from "./codeLife/CodeLifeBossAttackPattern";
import {
  applyBite,
  applyGrab,
  applyHazard,
  applySlam,
  createEnemyState,
  isDevourable,
  updateEnemy,
  type CodeLifeEnemyState,
} from "./codeLife/CodeLifeCombat";
import {
  getCodeLifeAbilityGateBlocker,
  getCodeLifeChapterConfig,
  type CodeLifeChapterConfig,
  type CodeLifeEnemyKind,
  type CodeLifeHazardKind,
  type CodeLifeRect,
  type CodeLifeTurret,
} from "./codeLife/CodeLifeChapterConfig";
import { getCodeLifeAudioPatch, triggerCodeLifeAudio, type CodeLifeSfxId } from "./codeLife/CodeLifeAudio";
import { createCodeLifeAmbienceMix, type CodeLifeAmbienceMix } from "./codeLife/CodeLifeAudioState";
import {
  getCodeLifeDeviceBossInteraction,
  getCodeLifeDeviceCueColor,
  getCodeLifeDeviceWeaknesses,
  type CodeLifeBossDeviceCue,
} from "./codeLife/CodeLifeDeviceBossMechanics";
import {
  createCodeLifeFormState,
  createCodeLifeVersionFormState,
  getNextCodeLifeVersionForm,
  type CodeLifeVersionFormId,
} from "./codeLife/CodeLifeForm";
import { createCodeLifeHazardRuntime, isCodeLifeHazardTargetExposed } from "./codeLife/CodeLifeHazardMechanics";
import { createCodeLifeLandmarkPlan, type CodeLifeLandmarkPlan } from "./codeLife/CodeLifeLandmarks";
import {
  getCodeLifeAbilityGateTextureKey,
  getCodeLifeBossTextureKey,
  getCodeLifeEnemyTextureKey,
  getCodeLifeHazardTextureKey,
  getCodeLifeSurfaceTextureKey,
  getCodeLifeTurretProjectileTextureKey,
  getCodeLifeTurretTextureKey,
} from "./codeLife/CodeLifeVisuals";
import {
  computeCodeLifeCarrionLocomotion,
  type CodeLifeCarrionLocomotionOutput,
} from "./codeLife/locomotion";
import {
  createCodeLifeBodyArtRecipe,
  createCodeLifeGlyphParticle,
  createCodeLifeOverlayRenderPlan,
  getCodeLifeChapterAtmosphere,
  getCodeLifeGlyphsForChapter,
  type CodeLifeBlendMode,
} from "./codeLife/CodeLifeProceduralArt";
import type { GameKeyName } from "./inputConfig";

const FALLBACK_WIDTH = 3000;
const FALLBACK_HEIGHT = 1080;
const CORE_DRAG = 0.88;
const DRIFT_ACCELERATION = 26;
const TENDRIL_RANGE = 640;
const POINTER_GRAB_RADIUS = 210;
const DAMAGE_COOLDOWN = 620;
const REASSEMBLY_GRACE_MS = 1400;
const VISION_HIJACK_MS = 2400;
const VOICEPRINT_SPOOF_MS = 2200;
const MAX_MATERIAL_MARKS = 3;
const MIN_MASS = 0.68;
const MAX_MASS = 2.85;
const TURRET_CONTROL_MS = 6000;
const CODE_REBIRTH_CORE_RADIUS = 18;
const CODE_REBIRTH_BODY_MIN_WIDTH = 205;
const CODE_REBIRTH_BODY_MAX_WIDTH = 318;
const CODE_REBIRTH_VIRTUAL_GRIP_SPACING = 360;
const CODE_LIFE_VIRTUAL_GRIP_SPACING = 540;
const VIRTUAL_GRIP_THICKNESS = 22;
const VIRTUAL_GRIP_LABEL_PREFIX = "virtual-grip";
const ELECTROMAGNETIC_TRAP_TEXTURE_KEY = "electromagnetic-trap-beam";
const ELECTROMAGNETIC_TRAP_ANIMATION_KEY = "electromagnetic-trap-beam-flow";

const FALLBACK_GLYPHS = ["0", "1", "let", "fn", "/tmp", "ERR", "{}", "agent", "null", "grep", "pid", "while"];
const SENSE_ABILITY_IDS: readonly AbilityId[] = ["ping-sense", "reverse-index", "vision-takeover"];
const TRAVERSE_ABILITY_IDS: readonly AbilityId[] = [
  "lan-traverse",
  "clone-control",
  "admin-token-core",
  "cross-device-jump",
  "version-split",
  "hardware-parasite",
];
const VERSION_SPLIT_DEFAULT_FORM: CodeLifeVersionFormId = "packet";
const VERSION_SPLIT_PACKET_FORM: CodeLifeVersionFormId = "packet";

type GripKind = "surface" | "anchor" | "gate" | "shell" | "enemy" | "cache" | "turret";
interface CodeLifeModeOptions {
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

interface ActiveTendril {
  target: Phaser.GameObjects.GameObject & { x: number; y: number; active: boolean };
  kind: GripKind;
  targetPoint?: { x: number; y: number };
}

interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  tint?: number;
  gate?: AbilityId;
  to?: string;
  target?: { x: number; y: number };
  textureKey?: string;
  preserveTextureColor?: boolean;
}

interface HazardLayout extends LayoutRect {
  damage: number;
  kind?: CodeLifeHazardKind;
  angleDeg?: number;
  fovDeg?: number;
  blindSpotRects?: readonly CodeLifeRect[];
}

interface CacheLayout extends LayoutRect {
  biomass: number;
  gate?: AbilityId;
}

interface AnchorLayout {
  x: number;
  y: number;
  gate?: AbilityId;
  label?: string;
}

interface EnemyLayout {
  x: number;
  y: number;
  hp: number;
  kind: CodeLifeEnemyKind;
  patrolRadius: number;
  requiredForExit?: boolean;
  turretOnly?: boolean;
}

interface TurretLayout {
  x: number;
  y: number;
  id: string;
  label: string;
  mount: CodeLifeTurret["mount"];
  angleDeg: number;
  range: number;
  cooldownMs: number;
  projectileSpeed: number;
  damage: number;
  requiredForExit?: boolean;
}

interface AbilityGateLayout extends LayoutRect {
  ability: AbilityId;
  blocker?: LayoutRect;
}

interface PassageTargetCandidate extends LayoutRect {
  label: string;
}

interface ChapterLayout {
  width: number;
  height: number;
  config?: CodeLifeChapterConfig;
  spawn: { x: number; y: number };
  exit: LayoutRect;
  surfaces: LayoutRect[];
  gripOnlySurfaces: LayoutRect[];
  anchors: AnchorLayout[];
  hazards: HazardLayout[];
  abilityGates: AbilityGateLayout[];
  caches: CacheLayout[];
  shells: LayoutRect[];
  enemies: EnemyLayout[];
  turrets: TurretLayout[];
}

interface AmbienceNodes {
  gain: GainNode;
  filter: BiquadFilterNode;
  sources: OscillatorNode[];
  bossGain: GainNode;
  bossSource: OscillatorNode;
  lastMode: string;
}

export class CodeLifeMode {
  private chapter!: ChapterDef;
  private layout!: ChapterLayout;
  private worldWidth = FALLBACK_WIDTH;
  private worldHeight = FALLBACK_HEIGHT;
  private core!: Phaser.Physics.Arcade.Sprite;
  private surfaces!: Phaser.Physics.Arcade.StaticGroup;
  private anchors!: Phaser.Physics.Arcade.StaticGroup;
  private hazards!: Phaser.Physics.Arcade.StaticGroup;
  private abilityGates!: Phaser.Physics.Arcade.StaticGroup;
  private abilityGateBlockers!: Phaser.Physics.Arcade.StaticGroup;
  private caches!: Phaser.Physics.Arcade.StaticGroup;
  private shells!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private turrets!: Phaser.Physics.Arcade.StaticGroup;
  private turretProjectiles!: Phaser.Physics.Arcade.Group;
  private exit!: Phaser.Physics.Arcade.Sprite;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private hazardGraphics!: Phaser.GameObjects.Graphics;
  private bodyGraphics!: Phaser.GameObjects.Graphics;
  private tendrilGraphics!: Phaser.GameObjects.Graphics;
  private codeGlyphs: Phaser.GameObjects.Text[] = [];
  private gateLabels: Phaser.GameObjects.Text[] = [];
  private materialMarks: Phaser.Physics.Arcade.Sprite[] = [];
  private electromagneticTrapVisuals: Phaser.GameObjects.Sprite[] = [];
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private fluidBody!: CodeFluidBody;
  private nodes: CodeFluidNode[] = [];
  private chapterGlyphs: readonly string[] = FALLBACK_GLYPHS;
  private activeTendril?: ActiveTendril;
  private lastLocomotion?: CodeLifeCarrionLocomotionOutput;
  private activeTurret?: Phaser.Physics.Arcade.Sprite;
  private mass = 1;
  private stealthUntil = 0;
  private nextAttackAt = 0;
  private nextDevourAt = 0;
  private nextSenseAt = 0;
  private nextTraverseAt = 0;
  private nextVersionSplitAt = 0;
  private versionSplitForm?: CodeLifeVersionFormId;
  private lastDamageAt = 0;
  private lastGateNoteAt = 0;
  private bossArenaEntered = false;
  private bossArenaHintShown = false;
  private bossArenaUnlockFeedbackShown = false;
  private lastArenaNoteAt = 0;
  private lockedTraverseGate?: AbilityId;
  private lockedTraverseTarget?: Phaser.GameObjects.GameObject & { x: number; y: number; active: boolean };
  private bossLabel?: Phaser.GameObjects.Text;
  private bossHpBack?: Phaser.GameObjects.Rectangle;
  private bossHpFill?: Phaser.GameObjects.Rectangle;
  private bossWindowGraphics?: Phaser.GameObjects.Graphics;
  private audioContext?: AudioContext;
  private ambience?: AmbienceNodes;
  private readonly audioCooldownUntil = new Map<CodeLifeSfxId, number>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: CodeLifeModeOptions,
  ) {}

  create(): void {
    this.chapter = this.options.controller.currentChapter();
    this.layout = this.createLayout(this.chapter);
    this.mass = Phaser.Math.Clamp(this.options.controller.state.codeLifeMass, MIN_MASS, MAX_MASS);
    this.syncCodeLifeMass();
    this.worldWidth = this.layout.width;
    this.worldHeight = this.layout.height;
    this.chapterGlyphs = getCodeLifeGlyphsForChapter(this.chapter.id);
    const atmosphere = getCodeLifeChapterAtmosphere(this.chapter.id);
    this.stealthUntil = this.scene.time.now + REASSEMBLY_GRACE_MS;

    this.scene.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.scene.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.scene.cameras.main.setBackgroundColor(atmosphere.backgroundColor);

    this.drawBackdrop();
    this.surfaces = this.scene.physics.add.staticGroup();
    this.anchors = this.scene.physics.add.staticGroup();
    this.hazards = this.scene.physics.add.staticGroup();
    this.abilityGates = this.scene.physics.add.staticGroup();
    this.abilityGateBlockers = this.scene.physics.add.staticGroup();
    this.caches = this.scene.physics.add.staticGroup();
    this.shells = this.scene.physics.add.staticGroup();
    this.enemies = this.scene.physics.add.group({ allowGravity: false });
    this.turrets = this.scene.physics.add.staticGroup();
    this.turretProjectiles = this.scene.physics.add.group({ allowGravity: false });
    this.overlayGraphics = this.scene.add.graphics().setDepth(-8);
    this.hazardGraphics = this.scene.add.graphics().setDepth(12);
    this.bodyGraphics = this.scene.add.graphics().setDepth(25);
    this.tendrilGraphics = this.scene.add.graphics().setDepth(27);

    this.createSurfaces();
    this.createAnchors();
    this.createHazards();
    this.createAbilityGates();
    this.createCaches();
    this.createShells();
    this.createEnemies();
    this.createTurrets();
    this.createCore();
    this.createExit();
    this.createCodeGlyphs();
    this.createCollisions();

    this.scene.cameras.main.startFollow(this.core, true, 0.12, 0.12);
    this.options.controller.note(
      this.chapter.id === "code-rebirth"
        ? "粉碎过场结束。按住左键像红怪一样贴着废墟爬行，右键伸出交互触须，入侵小炮台清理红色蠕虫病毒。"
        : `${this.chapter.shortTitle} 已载入。代码肉体继续扩张，寻找下一处可寄生出口。`,
      true,
    );
    this.options.onStateChanged();
  }

  update(time: number, deltaMs = 1000 / 60): void {
    this.updateTurretControl(time);
    this.updateMovement();
    this.updateTendril();
    this.updateFluid(deltaMs);
    this.updateEnemies(time, deltaMs);
    this.updateAbilityGates();
    this.updateHazards(time, deltaMs);
    this.updateBossArenaLock(time);
    this.drawOverlay(time);
    this.drawFluid(time);
    this.updateBossUi();
    this.tryStartAmbienceFromInput();
    this.updateAmbienceMix();

    if (Phaser.Input.Keyboard.JustDown(this.options.keys.f)) {
      this.useTear(time);
    }
    if (Phaser.Input.Keyboard.JustDown(this.options.keys.k)) {
      this.useDevour(time);
    }
    if (Phaser.Input.Keyboard.JustDown(this.options.keys.l)) {
      this.useInfiltrate(time);
    }
    if (Phaser.Input.Keyboard.JustDown(this.options.keys.q)) {
      this.useSensePulse(time);
    }
    if (Phaser.Input.Keyboard.JustDown(this.options.keys.v)) {
      this.cycleVersionSplitForm(time, 1);
    }
    if (Phaser.Input.Keyboard.JustDown(this.options.keys.e)) {
      this.useTraverse(time);
    }
  }

  destroy(): void {
    for (const collider of this.colliders) {
      collider.destroy();
    }
    this.colliders = [];
    this.nodes = [];
    this.activeTendril = undefined;
    this.activeTurret = undefined;
    this.lastLocomotion = undefined;
    for (const glyph of this.codeGlyphs) {
      glyph.destroy();
    }
    this.codeGlyphs = [];
    for (const label of this.gateLabels) {
      label.destroy();
    }
    this.gateLabels = [];
    for (const visual of this.electromagneticTrapVisuals) {
      visual.destroy();
    }
    this.electromagneticTrapVisuals = [];
    this.materialMarks = [];
    this.clearBossUi();
    this.overlayGraphics?.clear();
    this.hazardGraphics?.clear();
    this.bodyGraphics?.clear();
    this.tendrilGraphics?.clear();
    this.stopAmbience();
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => undefined);
    }
  }

  private createCore(): void {
    this.core = this.scene.physics.add.sprite(this.layout.spawn.x, this.layout.spawn.y, "boss-bullet");
    const isCodeRebirth = this.chapter.id === "code-rebirth";
    this.core.setVisible(false);
    this.core.setMaxVelocity(isCodeRebirth ? 380 : 440, isCodeRebirth ? 380 : 440);
    this.core.setDrag(isCodeRebirth ? 520 : 620, isCodeRebirth ? 520 : 620);
    this.core.setCollideWorldBounds(true);
    const body = this.core.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    const coreRadius = isCodeRebirth ? CODE_REBIRTH_CORE_RADIUS : 30;
    body.setCircle(coreRadius);
    body.setOffset(16 - coreRadius, 16 - coreRadius);

    this.fluidBody = new CodeFluidBody(
      { x: this.core.x, y: this.core.y },
      isCodeRebirth
        ? {
            mass: this.mass,
            minMass: MIN_MASS,
            maxMass: MAX_MASS,
            baseRadius: 38,
            nodeCount: 34,
            minNodeCount: 26,
            maxNodeCount: 54,
            targetForce: 720,
            tendrilForce: 3300,
            springStiffness: 64,
            bendStiffness: 14,
            shapeStiffness: 24,
            pressureStrength: 72,
            damping: 4.2,
          }
        : {
            mass: this.mass,
            minMass: MIN_MASS,
            maxMass: MAX_MASS,
            baseRadius: 48,
            nodeCount: 24,
            minNodeCount: 16,
            maxNodeCount: 42,
            targetForce: 980,
            tendrilForce: 2700,
            damping: 5.4,
          },
    );
    this.syncVersionFormBody();
    this.nodes = this.fluidBody.getNodes();
  }

  private createSurfaces(): void {
    for (const surfaceLayout of this.layout.surfaces) {
      const textureKey = surfaceLayout.textureKey ?? "pd-file-block";
      const surface = this.surfaces.create(surfaceLayout.x, surfaceLayout.y, textureKey) as Phaser.Physics.Arcade.Sprite;
      surface.setDisplaySize(surfaceLayout.width, surfaceLayout.height);
      if (surfaceLayout.preserveTextureColor) {
        surface.clearTint();
      } else {
        surface.setTint(surfaceLayout.tint ?? this.chapter.palette.platform);
      }
      surface.setAlpha(this.layout.config?.hideSurfaceSprites ? 0 : 0.86);
      surface.setVisible(!this.layout.config?.hideSurfaceSprites);
      surface.setData("label", surfaceLayout.label ?? "grip-surface");
      surface.refreshBody();
    }
  }

  private createAnchors(): void {
    for (const anchorLayout of this.layout.anchors) {
      const anchor = this.anchors.create(anchorLayout.x, anchorLayout.y, "pd-anchor") as Phaser.Physics.Arcade.Sprite;
      anchor.setTint(anchorLayout.gate ? 0xff5574 : (this.layout.config?.colorAccents.primary ?? this.chapter.palette.accent));
      anchor.setDepth(12);
      anchor.setAlpha(0.86);
      anchor.setData("label", anchorLayout.label ?? "traverse-anchor");
      if (anchorLayout.gate) {
        anchor.setData("gate", anchorLayout.gate);
      }
      anchor.refreshBody();
    }
  }

  private createHazards(): void {
    for (const hazardLayout of this.layout.hazards) {
      const isElectromagneticTrap = hazardLayout.kind === "delete-scan";
      const hazard = this.hazards.create(
        hazardLayout.x,
        hazardLayout.y,
        getCodeLifeHazardTextureKey(hazardLayout.kind),
      ) as Phaser.Physics.Arcade.Sprite;
      hazard.setDisplaySize(hazardLayout.width, hazardLayout.height);
      if (isElectromagneticTrap) {
        hazard.setVisible(false);
      } else {
        hazard.setTint(this.getHazardTint(hazardLayout.kind));
      }
      hazard.setDepth(13);
      hazard.setAlpha(isElectromagneticTrap ? 0 : 0.9);
      hazard.setData("damage", hazardLayout.damage);
      hazard.setData("kind", hazardLayout.kind ?? "delete-scan");
      hazard.setData("baseWidth", hazardLayout.width);
      hazard.setData("baseHeight", hazardLayout.height);
      if (isElectromagneticTrap) {
        const visual = this.scene.add.sprite(hazardLayout.x, hazardLayout.y, ELECTROMAGNETIC_TRAP_TEXTURE_KEY).setDepth(13);
        visual.play(ELECTROMAGNETIC_TRAP_ANIMATION_KEY);
        hazard.setData("electromagneticVisual", visual);
        this.electromagneticTrapVisuals.push(visual);
        this.syncElectromagneticTrapVisual(hazard, hazardLayout.width, hazardLayout.height, 0.96);
      }
      if (hazardLayout.angleDeg !== undefined) {
        hazard.setData("angleDeg", hazardLayout.angleDeg);
        hazard.angle = hazardLayout.angleDeg;
      }
      if (hazardLayout.fovDeg !== undefined) {
        hazard.setData("fovDeg", hazardLayout.fovDeg);
      }
      if (hazardLayout.blindSpotRects) {
        hazard.setData("blindSpotRects", hazardLayout.blindSpotRects);
      }
      hazard.refreshBody();
    }
  }

  private syncElectromagneticTrapVisual(
    hazard: Phaser.Physics.Arcade.Sprite,
    width: number,
    height: number,
    alpha: number,
  ): void {
    const visual = hazard.getData("electromagneticVisual") as Phaser.GameObjects.Sprite | undefined;
    if (!visual?.active) {
      return;
    }

    const isVertical = height > width;
    visual.setPosition(hazard.x, hazard.y);
    visual.setAlpha(alpha);
    visual.setVisible(hazard.active);
    if (isVertical) {
      visual.setDisplaySize(height, width);
      visual.setAngle(90);
    } else {
      visual.setDisplaySize(width, height);
      visual.setAngle(0);
    }
  }

  private createAbilityGates(): void {
    for (const gateLayout of this.layout.abilityGates) {
      const gate = this.abilityGates.create(
        gateLayout.x,
        gateLayout.y,
        getCodeLifeAbilityGateTextureKey(gateLayout.ability),
      ) as Phaser.Physics.Arcade.Sprite;
      gate.setDisplaySize(gateLayout.width, gateLayout.height);
      gate.setDepth(14);
      gate.setData("gate", gateLayout.ability);
      gate.setData("label", gateLayout.label ?? this.formatAbilityLabel(gateLayout.ability));
      gate.refreshBody();

      if (gateLayout.blocker) {
        const blocker = this.abilityGateBlockers.create(gateLayout.blocker.x, gateLayout.blocker.y, "pd-file-block") as Phaser.Physics.Arcade.Sprite;
        blocker.setDisplaySize(gateLayout.blocker.width, gateLayout.blocker.height);
        blocker.setVisible(false);
        blocker.setData("gate", gateLayout.ability);
        blocker.setData("visual", gate);
        blocker.refreshBody();
      }

      const labelText = gateLayout.label ?? this.formatAbilityLabel(gateLayout.ability);
      const label = this.scene.add
        .text(gateLayout.x - gateLayout.width * 0.44, gateLayout.y - gateLayout.height * 0.56, labelText, {
          color: "#e9fbff",
          fontFamily: "Consolas, Microsoft YaHei UI, monospace",
          fontSize: "12px",
          stroke: "#05080e",
          strokeThickness: 3,
          wordWrap: { width: Math.max(140, gateLayout.width * 1.25) },
        })
        .setDepth(25);
      this.gateLabels.push(label);
    }

    this.updateAbilityGates();
  }

  private updateAbilityGates(): void {
    for (const object of this.abilityGates.getChildren()) {
      const gate = object as Phaser.Physics.Arcade.Sprite;
      const ability = gate.getData("gate") as AbilityId | undefined;
      const unlocked = this.canUseGateAbility(ability);
      gate.setTint(unlocked ? (this.layout.config?.colorAccents.primary ?? 0x60ffd8) : 0xff5574);
      gate.setAlpha(unlocked ? 0.24 : 0.68 + Math.sin(this.scene.time.now / 180 + gate.x * 0.01) * 0.08);
      gate.setBlendMode(unlocked ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    }

    for (const object of this.abilityGateBlockers.getChildren()) {
      const blocker = object as Phaser.Physics.Arcade.Sprite;
      const ability = blocker.getData("gate") as AbilityId | undefined;
      const unlocked = this.canUseGateAbility(ability);
      const body = blocker.body as Phaser.Physics.Arcade.StaticBody | undefined;
      if (body) {
        body.enable = !unlocked;
      }
    }
  }

  private createCaches(): void {
    for (const cacheLayout of this.layout.caches) {
      const cache = this.caches.create(cacheLayout.x, cacheLayout.y, "pd-cache") as Phaser.Physics.Arcade.Sprite;
      cache.setDisplaySize(cacheLayout.width, cacheLayout.height);
      cache.setTint(this.layout.config?.colorAccents.biomass ?? 0x56ffd0);
      cache.setDepth(15);
      cache.setData("biomass", cacheLayout.biomass);
      if (cacheLayout.gate) {
        cache.setData("gate", cacheLayout.gate);
      }
      cache.refreshBody();
      this.scene.tweens.add({
        targets: cache,
        scaleX: 1.12,
        scaleY: 1.12,
        alpha: 0.72,
        yoyo: true,
        repeat: -1,
        duration: 620 + cacheLayout.biomass * 80,
        ease: "Sine.inOut",
      });
    }
  }

  private createShells(): void {
    for (const shellLayout of this.layout.shells) {
      const shell = this.shells.create(shellLayout.x, shellLayout.y, "pd-file-shell") as Phaser.Physics.Arcade.Sprite;
      shell.setDisplaySize(shellLayout.width, shellLayout.height);
      shell.setTint(shellLayout.tint ?? 0xffd7e0);
      shell.setDepth(11);
      shell.setAlpha(0.88);
      shell.setData("label", shellLayout.label ?? "file shell");
      if (shellLayout.gate) {
        shell.setData("gate", shellLayout.gate);
      }
      if (shellLayout.to) {
        shell.setData("to", shellLayout.to);
      }
      if (shellLayout.target) {
        shell.setData("targetX", shellLayout.target.x);
        shell.setData("targetY", shellLayout.target.y);
      }
      shell.refreshBody();
    }
  }

  private createEnemies(): void {
    for (const enemyLayout of this.layout.enemies) {
      this.spawnEnemy(
        enemyLayout.x,
        enemyLayout.y,
        enemyLayout.hp,
        enemyLayout.kind,
        enemyLayout.patrolRadius,
        {
          requiredForExit: enemyLayout.requiredForExit,
          turretOnly: enemyLayout.turretOnly,
        },
      );
    }
    this.spawnCurrentBoss();
  }

  private spawnEnemy(
    x: number,
    y: number,
    hp: number,
    kind: CodeLifeEnemyKind | "boss" = "cleanup-process",
    patrolRadius = 260,
    flags: { requiredForExit?: boolean; turretOnly?: boolean } = {},
  ): Phaser.Physics.Arcade.Sprite {
    const enemy = this.enemies.create(x, y, kind === "boss" ? "boss-core" : getCodeLifeEnemyTextureKey(kind)) as Phaser.Physics.Arcade.Sprite;
    enemy.setDepth(kind === "boss" ? 18 : 16);
    enemy.setData("hp", hp);
    enemy.setData("maxHp", hp);
    enemy.setData("kind", kind);
    enemy.setData("requiredForExit", flags.requiredForExit === true);
    enemy.setData("turretOnly", flags.turretOnly === true);
    enemy.setData("grabbedUntil", 0);
    enemy.setData("homeX", x);
    enemy.setData("homeY", y);
    enemy.setData("patrolRadius", patrolRadius);
    enemy.setDrag(760, 760);
    enemy.setMaxVelocity(kind === "boss" ? 240 : 300, kind === "boss" ? 240 : 300);
    enemy.setCollideWorldBounds(true);
    enemy.setTint(this.getEnemyTint(kind));
    if (kind !== "boss") {
      enemy.setDisplaySize(kind === "mechanical-worm" ? 34 : 42, kind === "mechanical-worm" ? 18 : 34);
      this.setCombatState(
        enemy,
        createEnemyState(
          {
            id: kind,
            name: kind.replaceAll("-", " "),
            hp,
            color: this.getEnemyTint(kind),
            patrolSpeed: kind === "mechanical-worm" ? 30 : 58,
            alertSpeed: kind === "mechanical-worm" ? 46 : 126,
            slamStunForce: kind === "mechanical-worm" ? 24 : 70,
            biteDamage: kind === "mechanical-worm" ? 2 : Math.max(3, Math.ceil(hp * 0.38)),
            mass: kind === "mechanical-worm" ? 0.42 : kind === "permission-sentinel" || kind === "gpio-warden" ? 1.35 : 1,
          },
          { x, y },
        ),
      );
    }
    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(kind === "boss" ? 76 : kind === "mechanical-worm" ? 26 : 34, kind === "boss" ? 58 : kind === "mechanical-worm" ? 14 : 30);
    return enemy;
  }

  private createTurrets(): void {
    for (const turretLayout of this.layout.turrets) {
      const turret = this.turrets.create(
        turretLayout.x,
        turretLayout.y,
        getCodeLifeTurretTextureKey(turretLayout.mount),
      ) as Phaser.Physics.Arcade.Sprite;
      turret.setDepth(15);
      turret.setDisplaySize(turretLayout.mount === "platform" ? 48 : 44, turretLayout.mount === "platform" ? 40 : 36);
      turret.setTint(0xbffcff);
      turret.setAlpha(0.92);
      turret.setAngle(turretLayout.angleDeg);
      turret.setData("id", turretLayout.id);
      turret.setData("label", turretLayout.label);
      turret.setData("mount", turretLayout.mount);
      turret.setData("range", turretLayout.range);
      turret.setData("cooldownMs", turretLayout.cooldownMs);
      turret.setData("projectileSpeed", turretLayout.projectileSpeed);
      turret.setData("damage", turretLayout.damage);
      turret.setData("requiredForExit", turretLayout.requiredForExit === true);
      turret.setData("invadedUntil", 0);
      turret.setData("nextFireAt", 0);
      turret.refreshBody();
    }
  }

  private spawnCurrentBoss(): void {
    const boss = this.options.controller.currentBoss();
    if (!boss) {
      return;
    }

    const { x, y } = this.getBossSpawnPoint(boss);
    const enemy = this.spawnEnemy(x, y, boss.hp, "boss", 420);
    enemy.setTexture(getCodeLifeBossTextureKey(boss.id));
    enemy.setTint(boss.color);
    enemy.setDisplaySize(128, 96);
    enemy.setData("bossId", boss.id);
    enemy.setData("nextSpecialAt", this.scene.time.now + 1700);
    this.setCombatState(enemy, createEnemyState(boss, { x, y }));
    enemy.body?.setSize(82, 62);
    this.createBossUi(enemy, boss);
    this.syncBossHud(enemy);
  }

  private createExit(): void {
    this.exit = this.scene.physics.add.staticSprite(this.layout.exit.x, this.layout.exit.y, "pd-exit") as Phaser.Physics.Arcade.Sprite;
    this.exit.setDisplaySize(this.layout.exit.width, this.layout.exit.height);
    this.exit.setTint(this.layout.config?.colorAccents.primary ?? this.chapter.palette.accent);
    this.exit.setDepth(10);
    this.exit.setAlpha(0.9);
    if (this.layout.exit.gate) {
      this.exit.setData("gate", this.layout.exit.gate);
    }
    this.exit.refreshBody();
    this.scene.add
      .text(this.layout.exit.x - this.layout.exit.width * 0.48, this.layout.exit.y - this.layout.exit.height * 0.56, this.layout.exit.label ?? this.chapter.exitLabel, {
        color: "#f4fbff",
        fontFamily: "Microsoft YaHei UI, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        stroke: "#05080e",
        strokeThickness: 4,
      })
      .setDepth(20);
  }

  private createCollisions(): void {
    if (this.chapter.id !== "code-rebirth") {
      this.colliders.push(this.scene.physics.add.collider(this.core, this.surfaces));
    }
    this.colliders.push(this.scene.physics.add.collider(this.enemies, this.surfaces));
    this.colliders.push(
      this.scene.physics.add.collider(
        this.core,
        this.abilityGateBlockers,
        (_, blocker) => this.onAbilityGateBlocked(blocker as Phaser.Physics.Arcade.Sprite),
        (_, blocker) => this.isAbilityGateLocked(blocker as Phaser.Physics.Arcade.Sprite),
      ),
    );
    this.colliders.push(
      this.scene.physics.add.overlap(
        this.core,
        this.abilityGates,
        (_, gate) => this.onAbilityGateBlocked(gate as Phaser.Physics.Arcade.Sprite),
        (_, gate) => this.isAbilityGateLocked(gate as Phaser.Physics.Arcade.Sprite),
      ),
    );
    this.colliders.push(
      this.scene.physics.add.overlap(this.core, this.hazards, (_, hazard) => {
        this.handleHazardTouch(hazard as Phaser.Physics.Arcade.Sprite);
      }),
    );
    this.colliders.push(
      this.scene.physics.add.overlap(this.core, this.turrets, (_, turret) => {
        const turretSprite = turret as Phaser.Physics.Arcade.Sprite;
        const lastPromptAt = (turretSprite.getData("lastPromptAt") as number | undefined) ?? 0;
        if (this.scene.time.now - lastPromptAt < 1200) {
          return;
        }
        turretSprite.setData("lastPromptAt", this.scene.time.now);
        this.options.controller.note("按 L 入侵小炮台，鼠标瞄准，左键发射清理红色蠕虫病毒。");
        this.options.onStateChanged();
      }),
    );
    this.colliders.push(
      this.scene.physics.add.overlap(this.core, this.exit, () => {
        const requiredWorms = this.getRemainingRequiredWorms();
        if (requiredWorms > 0) {
          this.options.controller.note(`还有 ${requiredWorms} 只红色蠕虫病毒在啃食重生路径，先入侵小炮台清理它们。`);
          this.options.onStateChanged();
          return;
        }
        if (!this.options.controller.canExitChapter()) {
          const boss = this.options.controller.currentBoss();
          this.options.controller.note(boss ? `必须先吞噬 ${boss.name}。` : "出口仍被锁定。");
          this.options.onStateChanged();
          return;
        }
        const gate = this.exit.getData("gate") as AbilityId | undefined;
        const exitLockReason = this.getGateLockReason(gate, "打开这个出口");
        if (exitLockReason) {
          this.options.controller.note(exitLockReason);
          this.playSfx("permission-gate", 0.72, this.layout.exit);
          this.options.onStateChanged();
          return;
        }
        this.options.onExit();
      }),
    );
    this.colliders.push(
      this.scene.physics.add.overlap(this.turretProjectiles, this.enemies, (projectile, enemy) => {
        this.handleTurretProjectileHit(projectile as Phaser.Physics.Arcade.Sprite, enemy as Phaser.Physics.Arcade.Sprite);
      }),
    );
    this.colliders.push(
      this.scene.physics.add.overlap(this.enemies, this.hazards, (enemy, hazard) => {
        const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
        const hazardSprite = hazard as Phaser.Physics.Arcade.Sprite;
        if (this.isTargetExposedToHazard(hazardSprite, enemySprite, this.scene.time.now)) {
          this.damageEnemyFromHazard(enemySprite, hazardSprite);
        }
      }),
    );
  }

  private onAbilityGateBlocked(gate: Phaser.Physics.Arcade.Sprite): void {
    const now = this.scene.time.now;
    if (now - this.lastGateNoteAt < 720) {
      return;
    }

    const ability = gate.getData("gate") as AbilityId | undefined;
    this.lastGateNoteAt = now;
    this.spawnBurst(gate.x, gate.y, 0xff5574, 10);
    this.playSfx("permission-gate", 0.5, gate);
    this.options.controller.note(this.getGateLockReason(ability, "穿过这层权限膜") ?? "权限膜仍未打开。");
    this.options.onStateChanged();
  }

  private isAbilityGateLocked(gate: Phaser.Physics.Arcade.Sprite): boolean {
    const ability = gate.getData("gate") as AbilityId | undefined;
    return !this.canUseGateAbility(ability);
  }

  private getGateLockReason(ability: AbilityId | undefined, actionLabel: string): string | undefined {
    if (!ability) {
      return undefined;
    }
    if (this.options.controller.hasAbility(ability)) {
      if (ability === "version-split" && this.getActiveVersionForm() !== VERSION_SPLIT_PACKET_FORM) {
        return "Version split gate needs 数据包体. Press V to enter packet flow.";
      }
      return undefined;
    }
    return `需要 ${this.formatAbilityLabel(ability)} 才能${actionLabel}。`;
  }

  private createCodeGlyphs(): void {
    const count =
      this.chapter.id === "code-rebirth" ? 13 : Phaser.Math.Clamp(18 + this.options.controller.state.abilities.length, 18, 32);
    for (let index = 0; index < count; index += 1) {
      const glyph = this.scene.add
        .text(this.core.x, this.core.y, this.chapterGlyphs[index % this.chapterGlyphs.length] ?? "0", {
          color: "#7dffd7",
          fontFamily: "Consolas, monospace",
          fontSize: this.chapter.id === "code-rebirth" ? `${10 + (index % 2) * 3}px` : `${10 + (index % 3) * 2}px`,
        })
        .setAlpha(this.chapter.id === "code-rebirth" ? 0.5 : 0.72)
        .setDepth(26);
      glyph.setBlendMode(Phaser.BlendModes.ADD);
      this.codeGlyphs.push(glyph);
    }
  }

  private drawBackdrop(): void {
    const atmosphere = getCodeLifeChapterAtmosphere(this.chapter.id);
    const backgroundKey = this.layout.config?.backgroundKey;
    if (backgroundKey) {
      this.scene.add
        .image(this.worldWidth / 2, this.worldHeight / 2, backgroundKey)
        .setDisplaySize(this.worldWidth, this.worldHeight)
        .setDepth(-30);

      if (this.layout.config?.foregroundKey) {
        this.scene.add
          .image(this.worldWidth / 2, this.worldHeight / 2, this.layout.config.foregroundKey)
          .setDisplaySize(this.worldWidth, this.worldHeight)
          .setDepth(26);
      }

      this.scene.add
        .text(38, 30, this.chapter.title, {
          color: "#e9fbff",
          fontFamily: "Microsoft YaHei UI, sans-serif",
          fontSize: "22px",
          fontStyle: "bold",
          stroke: "#04070d",
          strokeThickness: 5,
        })
        .setScrollFactor(0)
        .setDepth(60);
      return;
    }

    const tileKey = themeTileKeys[this.chapter.theme];
    this.scene.add
      .tileSprite(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, tileKey)
      .setDepth(-30)
      .setTint(atmosphere.fogColor)
      .setAlpha(0.34 + atmosphere.ambientAlpha * 0.24);
    this.drawChapterLandmark();

    for (let x = 80; x < this.worldWidth; x += 150) {
      this.scene.add.rectangle(x, this.worldHeight / 2, 2, this.worldHeight, atmosphere.palette.scan, 0.04).setDepth(-20);
    }
    for (let y = 100; y < this.worldHeight; y += 130) {
      this.scene.add.rectangle(this.worldWidth / 2, y, this.worldWidth, 2, atmosphere.palette.node, 0.032).setDepth(-20);
    }

    this.scene.add
      .text(38, 30, this.chapter.title, {
        color: "#e9fbff",
        fontFamily: "Microsoft YaHei UI, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        stroke: "#04070d",
        strokeThickness: 5,
      })
      .setScrollFactor(0)
      .setDepth(60);
  }

  private drawChapterLandmark(): void {
    const plan = createCodeLifeLandmarkPlan(this.chapter.id, this.worldWidth, this.worldHeight);
    const graphics = this.scene.add.graphics().setDepth(-18);
    graphics.setBlendMode(Phaser.BlendModes.ADD);
    graphics.setAlpha(plan.alpha);

    if (plan.kind === "camera-iris") {
      this.drawIrisLandmark(graphics, plan);
    } else if (plan.kind === "printer-throat") {
      this.drawPrinterLandmark(graphics, plan);
    } else if (plan.kind === "speaker-chamber") {
      this.drawSpeakerLandmark(graphics, plan);
    } else if (plan.kind === "dev-board") {
      this.drawBoardLandmark(graphics, plan);
    } else if (plan.kind === "router-core" || plan.kind === "packet-router") {
      this.drawRouterLandmark(graphics, plan);
    } else if (plan.kind === "nas-racks" || plan.kind === "drive-shelves") {
      this.drawRackLandmark(graphics, plan);
    } else if (plan.kind === "permission-wall" || plan.kind === "uac-citadel") {
      this.drawPermissionLandmark(graphics, plan);
    } else if (plan.kind === "trash-peak" || plan.kind === "recycle-mouth" || plan.kind === "rebirth-capsule") {
      this.drawRecycleLandmark(graphics, plan);
    } else {
      this.drawGenericLandmark(graphics, plan);
    }
  }

  private drawIrisLandmark(graphics: Phaser.GameObjects.Graphics, plan: CodeLifeLandmarkPlan): void {
    graphics.lineStyle(7, plan.primaryColor, 0.48);
    graphics.strokeCircle(plan.x, plan.y, plan.width * 0.22);
    graphics.strokeCircle(plan.x, plan.y, plan.width * 0.34);
    graphics.fillStyle(plan.dangerColor, 0.18);
    graphics.fillCircle(plan.x, plan.y, plan.width * 0.12);
    for (let index = 0; index < plan.lineCount; index += 1) {
      const angle = (index / plan.lineCount) * Math.PI * 2;
      graphics.lineStyle(3, index % 2 === 0 ? plan.secondaryColor : plan.primaryColor, 0.44);
      graphics.lineBetween(
        plan.x + Math.cos(angle) * plan.width * 0.16,
        plan.y + Math.sin(angle) * plan.height * 0.13,
        plan.x + Math.cos(angle) * plan.width * 0.44,
        plan.y + Math.sin(angle) * plan.height * 0.36,
      );
    }
    this.drawLandmarkNodes(graphics, plan);
  }

  private drawPrinterLandmark(graphics: Phaser.GameObjects.Graphics, plan: CodeLifeLandmarkPlan): void {
    graphics.lineStyle(6, plan.primaryColor, 0.36);
    graphics.strokeRoundedRect(plan.x - plan.width * 0.45, plan.y - plan.height * 0.28, plan.width * 0.9, plan.height * 0.54, 24);
    graphics.fillStyle(plan.secondaryColor, 0.16);
    for (let index = 0; index < 5; index += 1) {
      const y = plan.y - plan.height * 0.22 + index * plan.height * 0.11;
      graphics.fillRect(plan.x - plan.width * 0.38, y, plan.width * 0.76, 8);
    }
    graphics.lineStyle(4, plan.dangerColor, 0.42);
    graphics.strokeCircle(plan.x - plan.width * 0.24, plan.y + plan.height * 0.16, plan.height * 0.14);
    graphics.strokeCircle(plan.x + plan.width * 0.24, plan.y + plan.height * 0.16, plan.height * 0.14);
    this.drawLandmarkNodes(graphics, plan);
  }

  private drawSpeakerLandmark(graphics: Phaser.GameObjects.Graphics, plan: CodeLifeLandmarkPlan): void {
    for (let index = 0; index < 5; index += 1) {
      graphics.lineStyle(4, index % 2 === 0 ? plan.primaryColor : plan.secondaryColor, 0.32 - index * 0.035);
      graphics.strokeEllipse(plan.x, plan.y, plan.width * (0.22 + index * 0.13), plan.height * (0.18 + index * 0.1));
    }
    graphics.fillStyle(plan.dangerColor, 0.14);
    graphics.fillCircle(plan.x, plan.y, plan.height * 0.12);
    this.drawLandmarkNodes(graphics, plan);
  }

  private drawBoardLandmark(graphics: Phaser.GameObjects.Graphics, plan: CodeLifeLandmarkPlan): void {
    graphics.lineStyle(5, plan.primaryColor, 0.38);
    graphics.strokeRoundedRect(plan.x - plan.width * 0.46, plan.y - plan.height * 0.36, plan.width * 0.92, plan.height * 0.72, 16);
    graphics.fillStyle(plan.secondaryColor, 0.12);
    for (let index = 0; index < plan.lineCount; index += 1) {
      const x = plan.x - plan.width * 0.4 + (index % 6) * plan.width * 0.16;
      const y = plan.y - plan.height * 0.28 + Math.floor(index / 6) * plan.height * 0.2;
      graphics.fillRect(x, y, plan.width * 0.09, plan.height * 0.055);
      graphics.lineStyle(2, index % 2 === 0 ? plan.primaryColor : plan.dangerColor, 0.32);
      graphics.lineBetween(x, y, plan.x, plan.y);
    }
    this.drawLandmarkNodes(graphics, plan);
  }

  private drawRouterLandmark(graphics: Phaser.GameObjects.Graphics, plan: CodeLifeLandmarkPlan): void {
    graphics.lineStyle(5, plan.primaryColor, 0.42);
    graphics.strokeCircle(plan.x, plan.y, plan.height * 0.2);
    for (const node of plan.nodes) {
      graphics.lineStyle(3, plan.secondaryColor, 0.34);
      graphics.lineBetween(plan.x, plan.y, node.x, node.y);
    }
    this.drawLandmarkNodes(graphics, plan);
  }

  private drawRackLandmark(graphics: Phaser.GameObjects.Graphics, plan: CodeLifeLandmarkPlan): void {
    for (let index = 0; index < 6; index += 1) {
      const y = plan.y - plan.height * 0.36 + index * plan.height * 0.14;
      graphics.lineStyle(4, index % 2 === 0 ? plan.primaryColor : plan.secondaryColor, 0.34);
      graphics.strokeRect(plan.x - plan.width * 0.42, y, plan.width * 0.84, plan.height * 0.08);
    }
    this.drawLandmarkNodes(graphics, plan);
  }

  private drawPermissionLandmark(graphics: Phaser.GameObjects.Graphics, plan: CodeLifeLandmarkPlan): void {
    for (let index = 0; index < 4; index += 1) {
      const x = plan.x - plan.width * 0.34 + index * plan.width * 0.22;
      graphics.lineStyle(5, index % 2 === 0 ? plan.primaryColor : plan.dangerColor, 0.38);
      graphics.lineBetween(x, plan.y - plan.height * 0.44, x + plan.width * 0.08, plan.y + plan.height * 0.44);
    }
    graphics.lineStyle(4, plan.secondaryColor, 0.28);
    graphics.strokeRoundedRect(plan.x - plan.width * 0.42, plan.y - plan.height * 0.38, plan.width * 0.84, plan.height * 0.76, 18);
    this.drawLandmarkNodes(graphics, plan);
  }

  private drawRecycleLandmark(graphics: Phaser.GameObjects.Graphics, plan: CodeLifeLandmarkPlan): void {
    graphics.fillStyle(plan.primaryColor, 0.16);
    graphics.fillTriangle(
      plan.x - plan.width * 0.44,
      plan.y + plan.height * 0.34,
      plan.x,
      plan.y - plan.height * 0.36,
      plan.x + plan.width * 0.44,
      plan.y + plan.height * 0.34,
    );
    graphics.lineStyle(5, plan.secondaryColor, 0.32);
    graphics.strokeEllipse(plan.x, plan.y, plan.width * 0.56, plan.height * 0.28);
    this.drawLandmarkNodes(graphics, plan);
  }

  private drawGenericLandmark(graphics: Phaser.GameObjects.Graphics, plan: CodeLifeLandmarkPlan): void {
    graphics.lineStyle(5, plan.primaryColor, 0.32);
    graphics.strokeRoundedRect(plan.x - plan.width * 0.4, plan.y - plan.height * 0.32, plan.width * 0.8, plan.height * 0.64, 18);
    for (const node of plan.nodes) {
      graphics.lineStyle(2, plan.secondaryColor, 0.24);
      graphics.lineBetween(plan.x, plan.y, node.x, node.y);
    }
    this.drawLandmarkNodes(graphics, plan);
  }

  private drawLandmarkNodes(graphics: Phaser.GameObjects.Graphics, plan: CodeLifeLandmarkPlan): void {
    for (const node of plan.nodes) {
      graphics.fillStyle(plan.primaryColor, 0.28);
      graphics.fillCircle(node.x, node.y, node.radius);
      graphics.lineStyle(2, plan.secondaryColor, 0.36);
      graphics.strokeCircle(node.x, node.y, node.radius * 1.7);
    }
  }

  private updateMovement(): void {
    const body = this.core.body as Phaser.Physics.Arcade.Body;
    const pointer = this.scene.input.activePointer;

    if (this.activeTurret?.active) {
      body.setVelocity(0, 0);
      this.lastLocomotion = undefined;
      return;
    }

    const result = computeCodeLifeCarrionLocomotion(
      {
        body: {
          center: { x: this.core.x, y: this.core.y },
          velocity: { x: body.velocity.x, y: body.velocity.y },
          mass: this.mass,
          nodes: this.nodes.map((node) => ({
            x: node.x,
            y: node.y,
            vx: node.vx,
            vy: node.vy,
            radius: node.radius,
          })),
        },
        pointerTarget: { x: pointer.worldX, y: pointer.worldY },
        isPrimaryDown: pointer.leftButtonDown(),
        gripSurfaces: [...this.layout.surfaces, ...this.layout.gripOnlySurfaces].map((surface, index) => ({
          id: surface.label ?? index,
          x: surface.x - surface.width / 2,
          y: surface.y - surface.height / 2,
          width: surface.width,
          height: surface.height,
        })),
        dtMs: this.scene.game.loop.delta,
      },
      {
        baseMaxSpeed: 470 * this.getFormState().accelerationScale,
        maxGripDistance: this.getLocomotionGripDistance(),
        airSpeedLimit: this.chapter.id === "code-rebirth" ? 74 : 58,
        airAcceleration: this.chapter.id === "code-rebirth" ? 120 : 86,
      },
    );

    this.lastLocomotion = result;
    body.setVelocity(result.nextVelocity.x, result.nextVelocity.y);
    this.scene.cameras.main.setFollowOffset(
      -result.leadingDirection.x * Phaser.Math.Clamp(result.tractionStrength * 46, 0, 120),
      -result.leadingDirection.y * Phaser.Math.Clamp(result.tractionStrength * 32, 0, 90),
    );
  }

  private getLocomotionGripDistance(): number {
    const baseDistance = this.chapter.id === "code-rebirth" ? 620 : 520;
    return baseDistance + this.mass * 28;
  }

  private updateTendril(): void {
    const pointer = this.scene.input.activePointer;
    this.tendrilGraphics.clear();
    this.drawLocomotionTendrils();

    if (!pointer.rightButtonDown()) {
      this.activeTendril = undefined;
      return;
    }

    const previousTarget = this.activeTendril?.target;
    if (!this.activeTendril || !this.activeTendril.target.active) {
      this.activeTendril = this.findGripTarget(pointer.worldX, pointer.worldY);
      if (this.activeTendril && this.activeTendril.target !== previousTarget) {
        this.playSfx("tentacle-grab", this.activeTendril.kind === "enemy" ? 1.1 : 0.72, this.activeTendril.target);
      }
    }

    if (!this.activeTendril) {
      this.tendrilGraphics.clear();
      return;
    }

    const target = this.activeTendril.target;
    const targetPoint = this.activeTendril.targetPoint ?? { x: target.x, y: target.y };
    const distance = Phaser.Math.Distance.Between(this.core.x, this.core.y, targetPoint.x, targetPoint.y);
    if (distance > TENDRIL_RANGE * 1.45) {
      this.activeTendril = undefined;
      this.fluidBody?.clearTendril();
      return;
    }

    const form = this.getFormState();
    this.fluidBody.startTendril(
      targetPoint,
      (this.activeTendril.kind === "enemy" ? 1.35 : 1.05) * form.tendrilStrengthScale,
    );
    this.drawTendrilStrands(targetPoint.x, targetPoint.y, distance, this.activeTendril.kind === "enemy" ? 5 : 3, 1);
    if (this.activeTendril.kind === "enemy") {
      const enemy = target as Phaser.Physics.Arcade.Sprite;
      const combat = this.getCombatState(enemy);
      if (combat && combat.status !== "grabbed") {
        const grabbed = applyGrab(combat, { grabbedBy: "tendril", at: this.scene.time.now / 1000 });
        this.setCombatState(enemy, grabbed);
        if (grabbed.lastEvent === "grab-blocked") {
          this.spawnBurst(enemy.x, enemy.y, this.layout.config?.colorAccents.secondary ?? 0xb9ccff, 12);
          this.playSfx("permission-gate", 0.64, enemy);
          this.activeTendril = undefined;
          this.fluidBody.clearTendril();
          this.tendrilGraphics.clear();
          return;
        }
      }
      enemy.setData("grabbedUntil", this.scene.time.now + 180);
      this.scene.physics.moveToObject(enemy, this.core, 300 * form.tendrilStrengthScale);
      return;
    }

    if (this.activeTendril.kind === "turret") {
      const turret = target as Phaser.Physics.Arcade.Sprite;
      turret.setTint(0x95fff1);
      turret.setData("lastTouchedAt", this.scene.time.now);
      return;
    }

    const pull = Phaser.Math.Clamp(distance * 2.25 * form.tendrilStrengthScale, 130, 650);
    this.scene.physics.moveTo(this.core, targetPoint.x, targetPoint.y, pull);
  }

  private findGripTarget(worldX: number, worldY: number): ActiveTendril | undefined {
    const candidates: ActiveTendril[] = [
      ...this.anchors.getChildren().map((object) => ({ kind: "anchor" as const, target: object as ActiveTendril["target"] })),
      ...this.abilityGates
        .getChildren()
        .filter((object) => object.active && !this.isAbilityGateLocked(object as Phaser.Physics.Arcade.Sprite))
        .map((object) => ({ kind: "gate" as const, target: object as ActiveTendril["target"] })),
      ...this.shells.getChildren().map((object) => ({ kind: "shell" as const, target: object as ActiveTendril["target"] })),
      ...this.caches.getChildren().map((object) => ({ kind: "cache" as const, target: object as ActiveTendril["target"] })),
      ...this.surfaces.getChildren().map((object) => ({ kind: "surface" as const, target: object as ActiveTendril["target"] })),
      ...this.turrets
        .getChildren()
        .filter((object) => object.active)
        .map((object) => ({ kind: "turret" as const, target: object as ActiveTendril["target"] })),
      ...this.enemies
        .getChildren()
        .filter((object) => object.active)
        .map((object) => ({ kind: "enemy" as const, target: object as ActiveTendril["target"] })),
    ];

    let best: ActiveTendril | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const targetPoint = this.getTendrilTargetPoint(candidate.target, worldX, worldY, candidate.kind);
      const pointerDistance = Phaser.Math.Distance.Between(worldX, worldY, targetPoint.x, targetPoint.y);
      const coreDistance = Phaser.Math.Distance.Between(this.core.x, this.core.y, targetPoint.x, targetPoint.y);
      const score = pointerDistance + coreDistance * 0.2;
      const pointerLimit = candidate.kind === "surface" ? POINTER_GRAB_RADIUS * 1.35 : POINTER_GRAB_RADIUS;
      if (pointerDistance <= pointerLimit && coreDistance <= TENDRIL_RANGE && score < bestScore) {
        best = { ...candidate, targetPoint };
        bestScore = score;
      }
    }
    return best;
  }

  private getTendrilTargetPoint(
    target: Phaser.GameObjects.GameObject & { x: number; y: number; active: boolean },
    worldX: number,
    worldY: number,
    kind: GripKind,
  ): { x: number; y: number } {
    if (kind !== "surface") {
      return { x: target.x, y: target.y };
    }
    const sprite = target as Phaser.Physics.Arcade.Sprite;
    const width = sprite.displayWidth || 1;
    const height = sprite.displayHeight || 1;
    const left = sprite.x - width / 2;
    const right = sprite.x + width / 2;
    const top = sprite.y - height / 2;
    const bottom = sprite.y + height / 2;
    const clampedX = Phaser.Math.Clamp(worldX, left, right);
    const clampedY = Phaser.Math.Clamp(worldY, top, bottom);
    const edgeDistances = [
      { x: left, y: clampedY, d: Math.abs(worldX - left) },
      { x: right, y: clampedY, d: Math.abs(worldX - right) },
      { x: clampedX, y: top, d: Math.abs(worldY - top) },
      { x: clampedX, y: bottom, d: Math.abs(worldY - bottom) },
    ];
    const closest = edgeDistances.reduce((best, edge) => (edge.d < best.d ? edge : best));
    return { x: closest.x, y: closest.y };
  }

  private updateFluid(deltaMs: number): void {
    const body = this.core.body as Phaser.Physics.Arcade.Body;
    const tendrilTarget = this.activeTendril
      ? (this.activeTendril.targetPoint ?? { x: this.activeTendril.target.x, y: this.activeTendril.target.y })
      : (this.lastLocomotion?.locomotionTendrils[0]?.target ?? null);
    const move = body.velocity.lengthSq() > 0.1 ? { x: body.velocity.x, y: body.velocity.y } : null;

    this.fluidBody.update(
      Phaser.Math.Clamp(deltaMs / 1000, 1 / 120, 1 / 30),
      {
        move,
        target: { x: this.core.x, y: this.core.y },
        targetWeight: 1.35,
        traction: tendrilTarget,
        tractionStrength: this.activeTendril ? 1.25 : (this.lastLocomotion?.tractionStrength ?? 0),
      },
      { width: this.worldWidth, height: this.worldHeight },
    );
    this.nodes = this.fluidBody.getNodes();
  }

  private drawOverlay(time: number): void {
    this.overlayGraphics.clear();
    const plan = createCodeLifeOverlayRenderPlan(this.chapter.id, this.worldWidth, this.worldHeight, time);

    for (const layer of plan.layers) {
      this.overlayGraphics.setBlendMode(this.toPhaserBlendMode(layer.blendMode));
      if (layer.type === "packet-rain" || layer.type === "scanlines") {
        const step = Phaser.Math.Clamp(layer.tileHeight, 24, 120);
        this.overlayGraphics.lineStyle(1, layer.color, layer.alpha);
        for (let y = -step + layer.offsetY; y < this.worldHeight + step; y += step) {
          this.overlayGraphics.lineBetween(0, y, this.worldWidth, y + layer.scale * 8);
        }
      } else if (layer.type === "permission-grid" || layer.type === "hardware-traces") {
        const stepX = Phaser.Math.Clamp(layer.tileWidth, 60, 210);
        const stepY = Phaser.Math.Clamp(layer.tileHeight, 38, 160);
        this.overlayGraphics.lineStyle(1, layer.color, layer.alpha);
        for (let x = -stepX + layer.offsetX; x < this.worldWidth + stepX; x += stepX) {
          this.overlayGraphics.lineBetween(x, 0, x + layer.scale * 12, this.worldHeight);
        }
        for (let y = -stepY + layer.offsetY; y < this.worldHeight + stepY; y += stepY) {
          this.overlayGraphics.lineBetween(0, y, this.worldWidth, y);
        }
      } else if (layer.type === "window-ghosts") {
        const step = Phaser.Math.Clamp(layer.tileWidth, 120, 260);
        this.overlayGraphics.lineStyle(2, layer.color, layer.alpha);
        for (let x = -step + layer.offsetX; x < this.worldWidth; x += step) {
          for (let y = -step + layer.offsetY; y < this.worldHeight; y += step * 0.72) {
            this.overlayGraphics.strokeRect(x, y, step * 0.52, step * 0.32);
          }
        }
      } else {
        const step = Phaser.Math.Clamp(layer.tileWidth, 38, 120);
        this.overlayGraphics.fillStyle(layer.color, layer.alpha * 0.42);
        for (let x = -step + layer.offsetX; x < this.worldWidth; x += step) {
          this.overlayGraphics.fillRect(x, (x * 1.7 + layer.offsetY) % this.worldHeight, step * 0.16, step * 0.16);
        }
      }
    }
    this.overlayGraphics.setBlendMode(Phaser.BlendModes.NORMAL);
    this.drawHazardTelegraphs(time);
    this.drawBossArenaSeal(time);
  }

  private drawHazardTelegraphs(time: number): void {
    this.hazardGraphics.clear();
    this.hazardGraphics.setBlendMode(Phaser.BlendModes.ADD);

    for (const object of this.hazards.getChildren()) {
      const hazard = object as Phaser.Physics.Arcade.Sprite;
      const kind = hazard.getData("kind") as CodeLifeHazardKind | undefined;
      const runtime = createCodeLifeHazardRuntime(kind, time, this.getHazardSeed(hazard));
      const suppressed = this.isHazardSuppressed(hazard, time);

      if (kind === "optic-burn") {
        this.drawOpticBurnTelegraph(hazard, runtime, suppressed);
      } else if (kind === "printer-roller") {
        this.drawPrinterRollerTelegraph(hazard, runtime);
      } else if (kind === "delete-scan") {
        this.drawDeleteScanTelegraph(hazard, runtime, suppressed);
      } else if (kind === "audio-feedback" || kind === "firmware-flash") {
        this.drawPulseHazardTelegraph(hazard, runtime, suppressed);
      }

      if (suppressed) {
        this.drawHijackedHazardTelegraph(hazard);
      }
    }

    this.hazardGraphics.setBlendMode(Phaser.BlendModes.NORMAL);
  }

  private drawOpticBurnTelegraph(
    hazard: Phaser.Physics.Arcade.Sprite,
    runtime: ReturnType<typeof createCodeLifeHazardRuntime>,
    suppressed: boolean,
  ): void {
    const fovDeg = (hazard.getData("fovDeg") as number | undefined) ?? 66;
    const range = Math.max(hazard.displayWidth, hazard.displayHeight) * 1.24;
    const angleRad = degreesToRadians(hazard.angle);
    const halfFov = degreesToRadians(fovDeg) / 2;
    const color = suppressed ? 0x7affea : this.getHazardTint("optic-burn");
    const alpha = suppressed ? 0.045 : runtime.damageActive ? 0.16 + runtime.alpha * 0.16 : 0.05;
    const points: Phaser.Geom.Point[] = [new Phaser.Geom.Point(hazard.x, hazard.y)];

    for (let index = 0; index <= 10; index += 1) {
      const t = index / 10;
      const theta = angleRad - halfFov + t * halfFov * 2;
      points.push(new Phaser.Geom.Point(hazard.x + Math.cos(theta) * range, hazard.y + Math.sin(theta) * range));
    }

    this.hazardGraphics.fillStyle(color, alpha);
    this.hazardGraphics.fillPoints(points, true);
    this.hazardGraphics.lineStyle(runtime.damageActive && !suppressed ? 2 : 1, color, suppressed ? 0.24 : runtime.damageActive ? 0.56 : 0.22);
    this.hazardGraphics.strokePoints(points, true);

    const left = angleRad - halfFov;
    const right = angleRad + halfFov;
    this.hazardGraphics.lineStyle(1, suppressed ? 0x7affea : 0xfff3b0, suppressed ? 0.34 : runtime.damageActive ? 0.68 : 0.24);
    this.hazardGraphics.lineBetween(hazard.x, hazard.y, hazard.x + Math.cos(left) * range, hazard.y + Math.sin(left) * range);
    this.hazardGraphics.lineBetween(hazard.x, hazard.y, hazard.x + Math.cos(right) * range, hazard.y + Math.sin(right) * range);

    const irisRadius = Math.min(range * 0.16, 70);
    const innerRadius = Math.max(18, irisRadius * 0.46);
    const sweep = this.scene.time.now / 260 + this.getHazardSeed(hazard) * 0.07;
    this.hazardGraphics.lineStyle(3, color, suppressed ? 0.22 : runtime.damageActive ? 0.62 : 0.34);
    this.hazardGraphics.strokeCircle(hazard.x, hazard.y, irisRadius);
    this.hazardGraphics.lineStyle(2, 0xffffff, suppressed ? 0.12 : runtime.damageActive ? 0.4 : 0.2);
    this.hazardGraphics.strokeCircle(hazard.x, hazard.y, innerRadius);
    for (let index = 0; index < 8; index += 1) {
      const theta = sweep + (index / 8) * Math.PI * 2;
      const outerX = hazard.x + Math.cos(theta) * irisRadius;
      const outerY = hazard.y + Math.sin(theta) * irisRadius;
      const innerX = hazard.x + Math.cos(theta + 0.22) * innerRadius;
      const innerY = hazard.y + Math.sin(theta + 0.22) * innerRadius;
      this.hazardGraphics.lineBetween(innerX, innerY, outerX, outerY);
    }
    this.hazardGraphics.lineStyle(1, color, suppressed ? 0.16 : runtime.damageActive ? 0.34 : 0.18);
    for (let index = -2; index <= 2; index += 1) {
      const theta = angleRad + (index / 2) * halfFov * 0.72;
      const start = irisRadius * 0.72;
      this.hazardGraphics.lineBetween(
        hazard.x + Math.cos(theta) * start,
        hazard.y + Math.sin(theta) * start,
        hazard.x + Math.cos(theta) * range * 0.92,
        hazard.y + Math.sin(theta) * range * 0.92,
      );
    }

    const blindSpots = hazard.getData("blindSpotRects") as Array<{ x: number; y: number; width: number; height: number }> | undefined;
    for (const rect of blindSpots ?? []) {
      this.hazardGraphics.fillStyle(0x071018, 0.24);
      this.hazardGraphics.fillRect(rect.x, rect.y, rect.width, rect.height);
      this.hazardGraphics.lineStyle(1, this.layout.config?.colorAccents.primary ?? 0x60ffd8, 0.34);
      this.hazardGraphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
      this.hazardGraphics.lineStyle(1, 0x7affea, 0.18);
      for (let offset = -rect.height; offset < rect.width; offset += 18) {
        this.hazardGraphics.lineBetween(rect.x + offset, rect.y + rect.height, rect.x + offset + rect.height, rect.y);
      }
    }
  }

  private drawPrinterRollerTelegraph(hazard: Phaser.Physics.Arcade.Sprite, runtime: ReturnType<typeof createCodeLifeHazardRuntime>): void {
    const horizontal = hazard.displayWidth >= hazard.displayHeight;
    const direction = runtime.conveyorForce >= 0 ? 1 : -1;
    const color = this.getHazardTint("printer-roller");
    const beltAlpha = runtime.damageActive ? 0.18 : 0.1;
    const stripeOffset = ((this.scene.time.now * 0.09) % 32) * direction;
    this.hazardGraphics.fillStyle(color, beltAlpha);
    this.hazardGraphics.fillRect(
      hazard.x - hazard.displayWidth * 0.45,
      hazard.y - hazard.displayHeight * 0.3,
      hazard.displayWidth * 0.9,
      hazard.displayHeight * 0.6,
    );
    this.hazardGraphics.lineStyle(2, color, 0.42);

    for (let index = -1; index <= 1; index += 1) {
      const offset = index * 0.22;
      if (horizontal) {
        const y = hazard.y + hazard.displayHeight * offset;
        this.hazardGraphics.lineBetween(hazard.x - hazard.displayWidth * 0.42, y, hazard.x + hazard.displayWidth * 0.42, y);
        this.hazardGraphics.fillStyle(color, 0.5);
        this.hazardGraphics.fillTriangle(
          hazard.x + hazard.displayWidth * 0.28 * direction,
          y,
          hazard.x + hazard.displayWidth * 0.14 * direction,
          y - 8,
          hazard.x + hazard.displayWidth * 0.14 * direction,
          y + 8,
        );
      } else {
        const x = hazard.x + hazard.displayWidth * offset;
        this.hazardGraphics.lineBetween(x, hazard.y - hazard.displayHeight * 0.42, x, hazard.y + hazard.displayHeight * 0.42);
        this.hazardGraphics.fillStyle(color, 0.5);
        this.hazardGraphics.fillTriangle(
          x,
          hazard.y + hazard.displayHeight * 0.28 * direction,
          x - 8,
          hazard.y + hazard.displayHeight * 0.14 * direction,
          x + 8,
          hazard.y + hazard.displayHeight * 0.14 * direction,
        );
      }
    }

    this.hazardGraphics.lineStyle(2, 0xffffff, runtime.damageActive ? 0.28 : 0.14);
    if (horizontal) {
      this.hazardGraphics.strokeCircle(hazard.x - hazard.displayWidth * 0.42, hazard.y, Math.max(14, hazard.displayHeight * 0.24));
      this.hazardGraphics.strokeCircle(hazard.x + hazard.displayWidth * 0.42, hazard.y, Math.max(14, hazard.displayHeight * 0.24));
      for (let x = -hazard.displayWidth * 0.48 + stripeOffset; x < hazard.displayWidth * 0.5; x += 32) {
        this.hazardGraphics.lineBetween(
          hazard.x + x,
          hazard.y - hazard.displayHeight * 0.28,
          hazard.x + x + 18 * direction,
          hazard.y + hazard.displayHeight * 0.28,
        );
      }
    } else {
      this.hazardGraphics.strokeCircle(hazard.x, hazard.y - hazard.displayHeight * 0.42, Math.max(14, hazard.displayWidth * 0.24));
      this.hazardGraphics.strokeCircle(hazard.x, hazard.y + hazard.displayHeight * 0.42, Math.max(14, hazard.displayWidth * 0.24));
      for (let y = -hazard.displayHeight * 0.48 + stripeOffset; y < hazard.displayHeight * 0.5; y += 32) {
        this.hazardGraphics.lineBetween(
          hazard.x - hazard.displayWidth * 0.28,
          hazard.y + y,
          hazard.x + hazard.displayWidth * 0.28,
          hazard.y + y + 18 * direction,
        );
      }
    }
  }

  private drawDeleteScanTelegraph(
    hazard: Phaser.Physics.Arcade.Sprite,
    runtime: ReturnType<typeof createCodeLifeHazardRuntime>,
    suppressed: boolean,
  ): void {
    const color = suppressed ? 0x7affea : this.getHazardTint("delete-scan");
    const width = hazard.displayWidth;
    const height = hazard.displayHeight;
    const left = hazard.x - width * 0.5;
    const top = hazard.y - height * 0.5;
    const alpha = suppressed ? 0.12 : runtime.damageActive ? 0.5 : 0.18;
    const sweep = ((this.scene.time.now * 0.16 + this.getHazardSeed(hazard)) % Math.max(width, height)) / Math.max(width, height);
    const scanX = left + width * sweep;

    this.hazardGraphics.fillStyle(color, suppressed ? 0.025 : runtime.damageActive ? 0.08 : 0.035);
    this.hazardGraphics.fillRect(left, top, width, height);
    this.hazardGraphics.lineStyle(runtime.damageActive && !suppressed ? 3 : 1, color, alpha);
    this.hazardGraphics.strokeRect(left, top, width, height);
    this.hazardGraphics.lineStyle(2, 0xffffff, alpha * 0.72);
    this.hazardGraphics.lineBetween(scanX, top - 12, scanX, top + height + 12);
    this.hazardGraphics.lineStyle(1, color, alpha * 0.42);
    for (let index = 0; index <= 6; index += 1) {
      const y = top + (index / 6) * height;
      this.hazardGraphics.lineBetween(left, y, left + width, y);
    }
    for (let index = 0; index < 7; index += 1) {
      const t = (index / 7 + sweep) % 1;
      const x = left + t * width;
      this.hazardGraphics.fillStyle(index % 2 === 0 ? color : 0xffffff, alpha * 0.38);
      this.hazardGraphics.fillRect(x - 6, top + height * 0.12, 12, height * 0.76);
    }
  }

  private drawPulseHazardTelegraph(
    hazard: Phaser.Physics.Arcade.Sprite,
    runtime: ReturnType<typeof createCodeLifeHazardRuntime>,
    suppressed: boolean,
  ): void {
    const kind = hazard.getData("kind") as CodeLifeHazardKind | undefined;
    const color = suppressed ? 0xe3a9ff : this.getHazardTint(kind);
    const radius = Math.max(hazard.displayWidth, hazard.displayHeight) * (kind === "audio-feedback" ? 0.72 : 0.5) * runtime.pulseScale;
    const alpha = suppressed ? 0.16 : runtime.damageActive ? 0.46 : 0.16;

    this.hazardGraphics.lineStyle(runtime.damageActive && !suppressed ? 3 : 1, color, alpha);
    this.hazardGraphics.strokeCircle(hazard.x, hazard.y, radius);
    this.hazardGraphics.lineStyle(1, color, alpha * 0.45);
    this.hazardGraphics.strokeCircle(hazard.x, hazard.y, radius * 0.62);

    if (kind === "audio-feedback") {
      const waveAlpha = suppressed ? 0.18 : runtime.damageActive ? 0.54 : 0.24;
      this.hazardGraphics.lineStyle(2, color, waveAlpha);
      for (let ring = 1; ring <= 3; ring += 1) {
        this.hazardGraphics.strokeCircle(hazard.x, hazard.y, radius * (0.28 + ring * 0.24));
      }
      this.hazardGraphics.lineStyle(3, 0xffffff, waveAlpha * 0.72);
      for (let index = -5; index <= 5; index += 1) {
        const x = hazard.x + index * 18;
        const wave = (10 + Math.sin(this.scene.time.now / 105 + index * 0.72) * 9) * runtime.pulseScale;
        this.hazardGraphics.lineBetween(x, hazard.y - wave, x, hazard.y + wave);
      }
      return;
    }

    if (kind === "firmware-flash") {
      const core = Math.max(32, Math.min(hazard.displayWidth, hazard.displayHeight) * 0.34);
      const left = hazard.x - core * 0.5;
      const top = hazard.y - core * 0.5;
      const pinAlpha = suppressed ? 0.18 : runtime.damageActive ? 0.58 : 0.24;
      this.hazardGraphics.lineStyle(2, color, pinAlpha);
      this.hazardGraphics.strokeRect(left, top, core, core);
      this.hazardGraphics.lineStyle(2, 0xffffff, pinAlpha * 0.68);
      for (let index = -2; index <= 2; index += 1) {
        const offset = (index / 3) * core;
        this.hazardGraphics.lineBetween(hazard.x + offset, top - 14, hazard.x + offset, top);
        this.hazardGraphics.lineBetween(hazard.x + offset, top + core, hazard.x + offset, top + core + 14);
        this.hazardGraphics.lineBetween(left - 14, hazard.y + offset, left, hazard.y + offset);
        this.hazardGraphics.lineBetween(left + core, hazard.y + offset, left + core + 14, hazard.y + offset);
      }
      this.hazardGraphics.lineStyle(1, color, pinAlpha * 0.55);
      for (let index = 0; index < 8; index += 1) {
        const theta = (index / 8) * Math.PI * 2 + this.scene.time.now / 210;
        this.hazardGraphics.lineBetween(
          hazard.x + Math.cos(theta) * core * 0.72,
          hazard.y + Math.sin(theta) * core * 0.72,
          hazard.x + Math.cos(theta) * radius,
          hazard.y + Math.sin(theta) * radius,
        );
      }
    }
  }

  private drawHijackedHazardTelegraph(hazard: Phaser.Physics.Arcade.Sprite): void {
    const pulse = 0.42 + Math.sin(this.scene.time.now / 120 + hazard.x * 0.02) * 0.14;
    this.hazardGraphics.lineStyle(2, 0x7affea, pulse);
    this.hazardGraphics.strokeRect(
      hazard.x - hazard.displayWidth * 0.5,
      hazard.y - hazard.displayHeight * 0.5,
      hazard.displayWidth,
      hazard.displayHeight,
    );
    this.hazardGraphics.lineStyle(1, 0xd9fff8, pulse * 0.7);
    this.hazardGraphics.lineBetween(
      hazard.x - hazard.displayWidth * 0.28,
      hazard.y,
      hazard.x + hazard.displayWidth * 0.28,
      hazard.y,
    );
    this.hazardGraphics.lineBetween(
      hazard.x,
      hazard.y - hazard.displayHeight * 0.28,
      hazard.x,
      hazard.y + hazard.displayHeight * 0.28,
    );
  }

  private drawBossArenaSeal(time: number): void {
    const arena = this.layout.config?.bossArena;
    if (!arena || !this.bossArenaEntered || !this.options.controller.currentBoss()) {
      return;
    }

    const pulse = 0.48 + Math.sin(time / 180) * 0.14;
    this.overlayGraphics.setBlendMode(Phaser.BlendModes.ADD);
    this.overlayGraphics.lineStyle(5, this.layout.config?.colorAccents.danger ?? 0xff5574, pulse);
    this.overlayGraphics.strokeRect(arena.x, arena.y, arena.width, arena.height);
    this.overlayGraphics.lineStyle(1, this.layout.config?.colorAccents.primary ?? 0x60ffd8, pulse * 0.62);
    for (let x = arena.x + 28; x < arena.x + arena.width; x += 74) {
      this.overlayGraphics.lineBetween(x, arena.y, x - 32, arena.y + arena.height);
    }
    this.overlayGraphics.setBlendMode(Phaser.BlendModes.NORMAL);
  }

  private drawFluid(time: number): void {
    const hidden = time < this.stealthUntil;
    const recipe = this.createBodyRecipe(hidden);
    const palette = recipe.palette;
    this.bodyGraphics.clear();

    if (this.chapter.id === "code-rebirth") {
      this.drawCodeRebirthFluidBody(time, hidden, recipe);
      this.updateCodeGlyphs(time, hidden, palette.node);
      return;
    }

    const points = this.nodes.map((node) => new Phaser.Geom.Point(node.x, node.y));
    if (points.length < 3) {
      return;
    }

    this.bodyGraphics.setBlendMode(Phaser.BlendModes.NORMAL);
    this.bodyGraphics.fillStyle(palette.shadow, hidden ? 0.16 : 0.28);
    this.bodyGraphics.fillPoints(
      points.map((point) => new Phaser.Geom.Point(this.core.x + (point.x - this.core.x) * 1.08, this.core.y + (point.y - this.core.y) * 1.08)),
      true,
    );

    this.bodyGraphics.setBlendMode(Phaser.BlendModes.ADD);
    this.bodyGraphics.fillStyle(palette.membrane, hidden ? 0.3 : recipe.membraneAlpha);
    this.bodyGraphics.fillPoints(points, true);
    this.bodyGraphics.lineStyle(Phaser.Math.Clamp(recipe.tendrilThicknessPx * 0.72, 5, 14), palette.highlight, hidden ? 0.18 : 0.36);
    this.bodyGraphics.strokePoints(
      points.map((point, index) => {
        const wobble = Math.sin(time / 110 + index * 1.41) * recipe.edgeNoise * 10;
        return new Phaser.Geom.Point(point.x + Math.cos(index) * wobble, point.y + Math.sin(index * 0.9) * wobble);
      }),
      true,
    );
    this.bodyGraphics.setBlendMode(Phaser.BlendModes.NORMAL);
    this.bodyGraphics.lineStyle(Phaser.Math.Clamp(recipe.tendrilThicknessPx * 0.55, 4, 11), palette.shadow, hidden ? 0.36 : 0.72);
    this.bodyGraphics.strokePoints(points, true);

    this.drawInternalCodeVeins(time, hidden, recipe);

    this.bodyGraphics.fillStyle(palette.core, hidden ? 0.22 : 0.52);
    this.bodyGraphics.fillEllipse(this.core.x, this.core.y, recipe.coreRadiusPx * 2.3, recipe.coreRadiusPx * 1.55);
    this.bodyGraphics.lineStyle(2, palette.tendon, hidden ? 0.24 : 0.5);

    for (let index = 0; index < this.nodes.length; index += 3) {
      const node = this.nodes[index];
      this.bodyGraphics.lineBetween(this.core.x, this.core.y, node.x, node.y);
      this.bodyGraphics.fillStyle(index % 2 === 0 ? palette.node : palette.highlight, hidden ? 0.3 : 0.74);
      this.bodyGraphics.fillCircle(node.x, node.y, node.radius * (hidden ? 0.5 : 0.82));
    }

    if (recipe.weakPointGlow > 0.12) {
      this.bodyGraphics.fillStyle(palette.bossWeakPoint, recipe.weakPointGlow * 0.42);
      this.bodyGraphics.fillCircle(this.core.x, this.core.y, recipe.coreRadiusPx * 0.52);
    }

    this.updateCodeGlyphs(time, hidden, palette.node);
  }

  private drawCodeRebirthFluidBody(
    time: number,
    hidden: boolean,
    recipe: ReturnType<typeof createCodeLifeBodyArtRecipe>,
  ): void {
    if (this.activeTurret?.active) {
      return;
    }

    const body = this.core.body as Phaser.Physics.Arcade.Body;
    const velocity = { x: body.velocity.x, y: body.velocity.y };
    const velocityLength = Math.hypot(velocity.x, velocity.y);
    const lastDirection = this.lastLocomotion?.leadingDirection;
    const direction =
      velocityLength > 18
        ? { x: velocity.x / velocityLength, y: velocity.y / velocityLength }
        : lastDirection && Math.hypot(lastDirection.x, lastDirection.y) > 0.001
          ? lastDirection
          : { x: 1, y: 0 };
    const speedRatio = Phaser.Math.Clamp(velocityLength / 420, 0, 1);
    const traction = Phaser.Math.Clamp(this.lastLocomotion?.tractionStrength ?? 0, 0, 1.9);
    const width = Phaser.Math.Clamp(
      CODE_REBIRTH_BODY_MIN_WIDTH + this.mass * 24 + speedRatio * 42 + traction * 14 + recipe.glyphDensity * 8,
      CODE_REBIRTH_BODY_MIN_WIDTH,
      CODE_REBIRTH_BODY_MAX_WIDTH,
    );
    const height = Phaser.Math.Clamp(width * (0.38 - speedRatio * 0.035 + traction * 0.018), 72, 124);
    const breathe = Math.sin(time / 260) * (2.6 + traction * 1.3);
    const center = {
      x: this.core.x - direction.x * speedRatio * width * 0.08 + Math.sin(time / 430) * 1.4,
      y: this.core.y + height * 0.08 + Math.cos(time / 380) * 1.2,
    };
    const alpha = hidden ? 0.28 : 1;
    const transformedNodes = this.nodes.map((node, index) => {
      const phase = node.phase ?? index / Math.max(1, this.nodes.length);
      const relative = { x: node.x - this.core.x, y: node.y - this.core.y };
      const wave = Math.sin(time / 95 + phase * Math.PI * 2);
      const tailBias = Phaser.Math.Clamp(-relative.x / Math.max(1, width * 0.36), -1, 1);

      return new Phaser.Geom.Point(
        center.x +
          relative.x * (1.62 + speedRatio * 0.14) -
          direction.x * speedRatio * width * 0.07 * tailBias +
          wave * 2.4,
        center.y +
          relative.y * (0.46 - speedRatio * 0.035) +
          direction.y * speedRatio * height * 0.08 * tailBias +
          Math.abs(relative.x) * 0.026 +
          breathe * 0.35,
      );
    });

    this.bodyGraphics.setBlendMode(Phaser.BlendModes.NORMAL);
    this.bodyGraphics.fillStyle(0x02080c, hidden ? 0.16 : 0.32);
    this.bodyGraphics.fillEllipse(center.x, center.y + height * 0.34, width * 1.02, height * 0.38);
    this.bodyGraphics.setBlendMode(Phaser.BlendModes.ADD);
    const moundBaseY = center.y + height * 0.27;
    const moundPoints = [
      new Phaser.Geom.Point(center.x - width * 0.52, moundBaseY),
      ...Array.from({ length: 17 }, (_, pointIndex) => {
        const unit = pointIndex / 16;
        const arch = Math.sin(unit * Math.PI);
        const tailDip = Math.abs(unit - 0.5) * height * 0.18;
        return new Phaser.Geom.Point(
          center.x - width * 0.5 + unit * width + Math.sin(time / 240 + pointIndex) * 1.4,
          moundBaseY - arch * height * (0.82 + Math.sin(time / 310) * 0.04) + tailDip,
        );
      }),
      new Phaser.Geom.Point(center.x + width * 0.52, moundBaseY),
      new Phaser.Geom.Point(center.x + width * 0.42, moundBaseY + height * 0.12),
      new Phaser.Geom.Point(center.x - width * 0.42, moundBaseY + height * 0.12),
    ];
    this.bodyGraphics.fillStyle(0x06384a, 0.38 * alpha);
    this.bodyGraphics.fillPoints(moundPoints, true);
    this.bodyGraphics.lineStyle(2, 0x13c7c4, 0.08 * alpha);
    this.bodyGraphics.strokePoints(moundPoints, true);
    this.bodyGraphics.fillStyle(0x10b8bf, 0.11 * alpha);
    this.bodyGraphics.fillEllipse(center.x + direction.x * width * 0.04, center.y - height * 0.13, width * 0.54, height * 0.42);

    if (transformedNodes.length >= 3) {
      this.bodyGraphics.setBlendMode(Phaser.BlendModes.ADD);
      this.bodyGraphics.fillStyle(0x075264, 0.52 * alpha);
      this.bodyGraphics.fillPoints(transformedNodes, true);
      this.bodyGraphics.lineStyle(5, 0x0b8296, 0.34 * alpha);
      this.bodyGraphics.strokePoints(transformedNodes, true);
    }

    this.bodyGraphics.setBlendMode(Phaser.BlendModes.ADD);
    for (let index = 0; index < 124; index += 1) {
      const seed = index * 13.37;
      const unit = seededVisualUnit(seed) * 2 - 1;
      const arch = Math.pow(Math.max(0, 1 - Math.abs(unit) ** 1.72), 0.72);
      const row = seededVisualUnit(seed + 9.4);
      const axial = unit * width * (0.48 + seededVisualUnit(seed + 2.2) * 0.06);
      const lateral = (row - 0.5) * height * 0.46 - arch * height * (0.54 + seededVisualUnit(seed + 1.3) * 0.26);
      const flow = Math.sin(time / (96 + (index % 5) * 18) + index * 0.73);
      const x = center.x + axial + direction.x * flow * (3 + speedRatio * 5);
      const y = center.y + lateral + direction.y * flow * (1.4 + speedRatio * 2.6);
      const size = 2 + Math.floor(seededVisualUnit(seed + 4.8) * 7);
      const color = index % 6 === 0 ? 0xacfdf4 : index % 3 === 0 ? 0x2df4e6 : index % 2 === 0 ? 0x079fb8 : 0x064f67;
      this.bodyGraphics.fillStyle(color, (0.22 + arch * 0.44 + seededVisualUnit(seed + 0.8) * 0.14) * alpha);
      this.bodyGraphics.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    }

    for (let index = 0; index < 22; index += 1) {
      const unit = index / 21;
      const tailLift = Math.sin(time / 130 + index * 0.42) * 2.2;
      const x = center.x - width * 0.5 + unit * width;
      const y = center.y + height * 0.24 + tailLift;
      const color = index % 2 === 0 ? 0x13d2d3 : 0x07596f;
      this.bodyGraphics.fillStyle(color, (0.34 + Math.sin(time / 180 + index) * 0.08) * alpha);
      this.bodyGraphics.fillRect(Math.round(x), Math.round(y), 5 + (index % 3), 3);
    }

    for (const [index, tendril] of (this.lastLocomotion?.locomotionTendrils ?? []).entries()) {
      if (index >= 5) {
        break;
      }
      const source = transformedNodes[(index * 5) % Math.max(1, transformedNodes.length)] ?? center;
      this.bodyGraphics.lineStyle(1 + (index % 2), index % 2 === 0 ? 0x0bc8d4 : 0x53fff0, 0.11 * alpha);
      this.drawCurveOnGraphics(
        this.bodyGraphics,
        source,
        (source.x + tendril.target.x) / 2 + Math.sin(time / 150 + index) * 14,
        (source.y + tendril.target.y) / 2 + Math.cos(time / 160 + index) * 8,
        tendril.target.x,
        tendril.target.y,
        0,
      );
    }

    const eyeX = center.x + direction.x * width * 0.035;
    const eyeY = center.y - height * 0.08 + direction.y * height * 0.055;
    const blink = Math.sin(time / 1320) > 0.94 ? 0.56 : 1;
    this.bodyGraphics.fillStyle(0x7ffff1, 0.24 * alpha);
    this.bodyGraphics.fillCircle(eyeX, eyeY, height * 0.15);
    this.bodyGraphics.lineStyle(2, 0xd8fffb, 0.78 * alpha * blink);
    this.bodyGraphics.strokeCircle(eyeX, eyeY, height * 0.11);
    this.bodyGraphics.fillStyle(0x03141b, 0.92 * alpha);
    this.bodyGraphics.fillCircle(eyeX + direction.x * 2, eyeY + direction.y * 2, height * 0.052 * blink);
    this.bodyGraphics.fillStyle(0xeafffb, 0.95 * alpha * blink);
    this.bodyGraphics.fillRect(Math.round(eyeX + height * 0.055), Math.round(eyeY - height * 0.06), 4, 4);
    this.bodyGraphics.setBlendMode(Phaser.BlendModes.NORMAL);
  }

  private drawInternalCodeVeins(time: number, hidden: boolean, recipe: ReturnType<typeof createCodeLifeBodyArtRecipe>): void {
    const palette = recipe.palette;
    const integrityRatio = this.options.controller.state.integrity / Math.max(1, this.options.controller.state.maxIntegrity);
    const veinCount = Phaser.Math.Clamp(Math.round(5 + this.mass * 3 + recipe.glyphDensity * 6), 7, 18);
    this.bodyGraphics.setBlendMode(Phaser.BlendModes.ADD);

    for (let vein = 0; vein < veinCount; vein += 1) {
      const nodeA = this.nodes[(vein * 3 + Math.floor(time / 760)) % this.nodes.length];
      const nodeB = this.nodes[(this.nodes.length - 1 - vein * 5 + this.nodes.length * 4) % this.nodes.length];
      if (!nodeA || !nodeB) {
        continue;
      }

      const alpha = (hidden ? 0.12 : 0.24 + recipe.glyphDensity * 0.18) * Phaser.Math.Clamp(integrityRatio + 0.22, 0.35, 1.15);
      this.bodyGraphics.lineStyle(1 + (vein % 3), vein % 2 === 0 ? palette.tendon : palette.node, alpha);
      let previousX = nodeA.x;
      let previousY = nodeA.y;
      for (let step = 1; step <= 6; step += 1) {
        const t = step / 6;
        const ease = t * t * (3 - 2 * t);
        const wave = Math.sin(time / 135 + vein * 2.1 + step * 1.8) * recipe.edgeNoise * 28;
        const x = Phaser.Math.Linear(Phaser.Math.Linear(nodeA.x, this.core.x, 0.38), nodeB.x, ease) + Math.cos(vein + step) * wave;
        const y = Phaser.Math.Linear(Phaser.Math.Linear(nodeA.y, this.core.y, 0.38), nodeB.y, ease) + Math.sin(vein * 0.7 + step) * wave;
        this.bodyGraphics.lineBetween(previousX, previousY, x, y);
        previousX = x;
        previousY = y;
      }

      if (vein % 2 === 0) {
        const glyph = this.chapterGlyphs[(vein + Math.floor(time / 260)) % this.chapterGlyphs.length] ?? "01";
        const text = integrityRatio < 0.35 && Math.sin(time / 80 + vein) > 0.35 ? "ERR" : glyph;
        this.bodyGraphics.fillStyle(vein % 4 === 0 ? palette.highlight : palette.node, hidden ? 0.12 : 0.24);
        this.bodyGraphics.fillCircle(previousX, previousY, 2 + (text.length % 3));
      }
    }

    this.bodyGraphics.setBlendMode(Phaser.BlendModes.NORMAL);
  }

  private updateCodeGlyphs(time: number, hidden: boolean, color: number): void {
    if (this.chapter.id === "code-rebirth") {
      this.updateCodeRebirthGlyphs(time, hidden);
      return;
    }

    for (let index = 0; index < this.codeGlyphs.length; index += 1) {
      const glyph = this.codeGlyphs[index];
      const node = this.nodes[(index * 2 + Math.floor(time / 1000)) % this.nodes.length];
      const angle = (index / this.codeGlyphs.length) * Math.PI * 2 + time / (900 + index * 13);
      const radius = 12 + (index % 5) * 7 + this.mass * 8;
      const integrityRatio = this.options.controller.state.integrity / Math.max(1, this.options.controller.state.maxIntegrity);
      const glitch = integrityRatio < 0.35 && Math.sin(time / 72 + index * 1.7) > 0.5;
      glyph.setText(glitch ? (index % 2 === 0 ? "ERR" : "0x0") : (this.chapterGlyphs[(index + Math.floor(time / 640)) % this.chapterGlyphs.length] ?? "0"));
      glyph.setPosition(
        (node?.x ?? this.core.x) * 0.72 + this.core.x * 0.28 + Math.cos(angle) * radius,
        (node?.y ?? this.core.y) * 0.72 + this.core.y * 0.28 + Math.sin(angle) * radius * 0.62,
      );
      glyph.setAlpha(hidden ? 0.14 : glitch ? 0.78 : 0.38 + Math.sin(time / 180 + index) * 0.18);
      glyph.setRotation(Math.sin(time / 230 + index) * (glitch ? 0.7 : 0.24));
      glyph.setColor(colorToCss(color));
    }
  }

  private updateCodeRebirthGlyphs(time: number, hidden: boolean): void {
    const width = Phaser.Math.Clamp(CODE_REBIRTH_BODY_MIN_WIDTH + this.mass * 24, CODE_REBIRTH_BODY_MIN_WIDTH, CODE_REBIRTH_BODY_MAX_WIDTH);
    const height = width * 0.5;
    for (let index = 0; index < this.codeGlyphs.length; index += 1) {
      const glyph = this.codeGlyphs[index];
      const unit = seededVisualUnit(index * 11.7);
      const high = seededVisualUnit(index * 19.3 + 4.1);
      const sideBias = index % 5 === 0 ? 1.18 : index % 4 === 0 ? -1.08 : 0.86;
      const driftX = Math.sin(time / (520 + index * 17) + index) * (3 + high * 5);
      const driftY = Math.cos(time / (620 + index * 23) + index * 0.7) * (2 + unit * 4);
      const x = this.core.x + (unit - 0.5) * width * sideBias + driftX;
      const y = this.core.y - height * (0.12 + high * 1.18) + driftY;
      const text = this.chapterGlyphs[(index + Math.floor(time / 900)) % this.chapterGlyphs.length] ?? (index % 2 === 0 ? "0" : "1");
      glyph.setText(text);
      glyph.setPosition(x, y);
      glyph.setAlpha(hidden ? 0.1 : 0.22 + seededVisualUnit(index + 3.5) * 0.28);
      glyph.setRotation(Math.sin(time / 480 + index) * 0.08);
      glyph.setColor(index % 3 === 0 ? "#9ffff6" : "#18e1df");
      glyph.setShadow(0, 0, "#18f6ef", 5, true, true);
    }
  }

  private drawTendrils(x: number, y: number, distance: number): void {
    this.tendrilGraphics.clear();
    this.drawTendrilStrands(x, y, distance, this.activeTendril?.kind === "enemy" ? 5 : 3, 1);
  }

  private drawLocomotionTendrils(): void {
    const locomotion = this.lastLocomotion;
    if (!locomotion?.locomotionTendrils.length) {
      return;
    }
    const count = Math.min(6, locomotion.locomotionTendrils.length);
    for (let index = 0; index < count; index += 1) {
      const tendril = locomotion.locomotionTendrils[index];
      const isVirtualGrip = String(tendril.surfaceId ?? "").startsWith(VIRTUAL_GRIP_LABEL_PREFIX);
      const distance = Phaser.Math.Distance.Between(tendril.source.x, tendril.source.y, tendril.target.x, tendril.target.y);
      this.drawTendrilStrands(tendril.target.x, tendril.target.y, distance, 1, isVirtualGrip ? 0.14 : 0.42, tendril.source);
    }
  }

  private drawTendrilStrands(
    x: number,
    y: number,
    distance: number,
    strandCount: number,
    alphaScale: number,
    source?: { x: number; y: number },
  ): void {
    const recipe = this.createBodyRecipe(false);
    const start = source ?? { x: this.core.x, y: this.core.y };
    for (let strand = 0; strand < strandCount; strand += 1) {
      const wave = Math.sin(this.scene.time.now / 70 + strand * 1.7) * (12 + strand * 2);
      const offset = (strand - (strandCount - 1) / 2) * 8;
      const midX = (start.x + x) / 2 + Math.sin(this.scene.time.now / 180 + strand) * 22;
      const midY = (start.y + y) / 2 + wave;
      this.tendrilGraphics.lineStyle(Math.max(2, recipe.tendrilThicknessPx - strand * 1.6), recipe.palette.shadow, 0.74 * alphaScale);
      this.drawCurve(midX, midY, x + offset, y - offset, distance * 0.012, start);
      this.tendrilGraphics.lineStyle(1 + Math.min(2, alphaScale * 2), strand % 2 === 0 ? recipe.palette.tendon : recipe.palette.node, 0.76 * alphaScale);
      this.drawCurve(midX, midY - 5, x + offset, y - offset, 0, start);
    }
  }

  private drawCurve(controlX: number, controlY: number, endX: number, endY: number, lift: number, source?: { x: number; y: number }): void {
    const start = source ?? { x: this.core.x, y: this.core.y };
    this.drawCurveOnGraphics(this.tendrilGraphics, start, controlX, controlY, endX, endY, lift);
  }

  private drawCurveOnGraphics(
    graphics: Phaser.GameObjects.Graphics,
    start: { x: number; y: number },
    controlX: number,
    controlY: number,
    endX: number,
    endY: number,
    lift: number,
  ): void {
    let previousX = start.x;
    let previousY = start.y;
    for (let step = 1; step <= 12; step += 1) {
      const t = step / 12;
      const inverse = 1 - t;
      const x = inverse * inverse * start.x + 2 * inverse * t * controlX + t * t * endX;
      const y = inverse * inverse * start.y + 2 * inverse * t * (controlY - lift) + t * t * endY;
      graphics.lineBetween(previousX, previousY, x, y);
      previousX = x;
      previousY = y;
    }
  }

  private useTear(time: number): void {
    if (time < this.nextAttackAt) {
      return;
    }
    const form = this.getFormState();
    this.nextAttackAt = time + 240;
    const targetX = this.activeTendril?.target.x ?? this.scene.input.activePointer.worldX;
    const targetY = this.activeTendril?.target.y ?? this.scene.input.activePointer.worldY;
    this.spawnBurst(targetX, targetY, 0xff5574, 18);

    let hitAny = false;
    for (const object of this.enemies.getChildren()) {
      const enemy = object as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) {
        continue;
      }
      const distance = Math.min(
        Phaser.Math.Distance.Between(this.core.x, this.core.y, enemy.x, enemy.y),
        Phaser.Math.Distance.Between(targetX, targetY, enemy.x, enemy.y),
      );
      if (distance > form.tearRadiusPx) {
        continue;
      }
      hitAny = true;
      const isBoss = Boolean(enemy.getData("bossId"));
      if (enemy.getData("turretOnly")) {
        enemy.setData("grabbedUntil", time + 460);
        this.scene.physics.moveTo(enemy, targetX, targetY, 260 * form.tendrilStrengthScale);
        enemy.setTintFill(0xffffff);
        this.scene.time.delayedCall(70, () => this.restoreEnemyTint(enemy));
        continue;
      }
      const combat = this.getCombatState(enemy);
      if (combat) {
        const slammed = applySlam(combat, {
          force: (isBoss ? 280 : 145) * form.tearDamageScale,
          damage: Math.ceil((isBoss ? 34 : Math.max(3, combat.maxHp * 0.48)) * form.tearDamageScale),
          stunDuration: isBoss ? 1.35 : 1.55,
        });
        this.setCombatState(enemy, slammed);
        this.emitCombatFeedback(enemy, slammed);
        if (this.isCombatTerminal(slammed)) {
          this.killEnemy(enemy, slammed.status !== "devoured");
          continue;
        }
      } else {
        const rawHp = (enemy.getData("hp") as number) - (isBoss ? 26 : 2);
        const hp = isBoss ? Math.max(1, rawHp) : rawHp;
        enemy.setData("hp", hp);
        if (isBoss) {
          this.syncBossHud(enemy);
        }
        if (hp <= 0) {
          this.killEnemy(enemy, false);
          continue;
        }
      }
      enemy.setData("grabbedUntil", time + 360);
      this.scene.physics.moveTo(enemy, targetX, targetY, 470 * form.tendrilStrengthScale);
      enemy.setTintFill(0xffffff);
      this.scene.time.delayedCall(70, () => this.restoreEnemyTint(enemy));
    }
    if (hitAny) {
      this.playSfx("boss-hit", 0.82);
    }
    this.options.controller.note("代码触手撕开进程外壳，碎片被甩进空隙。");
    this.options.onStateChanged();
  }

  private useDevour(time: number): void {
    if (time < this.nextDevourAt) {
      return;
    }
    const form = this.getFormState();
    this.nextDevourAt = time + 420;

    const enemy = this.findNearest(this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[], 124);
    if (enemy) {
      const isBoss = Boolean(enemy.getData("bossId"));
      if (enemy.getData("turretOnly")) {
        enemy.setData("grabbedUntil", time + 520);
        this.scene.physics.moveToObject(enemy, this.core, 120);
        this.spawnBurst(enemy.x, enemy.y, 0xff4f6d, 10);
        this.playSfx("permission-gate", 0.42, enemy);
        this.options.controller.note("红色电脑蠕虫太小又满是病毒壳，普通吞噬只会感染身体；入侵小炮台清理它。");
        this.options.onStateChanged();
        return;
      }
      const combat = this.getCombatState(enemy);
      if (combat) {
        const wasDevourable = isDevourable(combat);
        let next = combat;
        if (isBoss) {
          next = applyBite(next, { damage: Math.ceil(42 * form.biteDamageScale) });
        } else {
          if (!isDevourable(next)) {
            next = applySlam(next, {
              force: 175,
              damage: Math.ceil(next.maxHp * 0.76 * form.biteDamageScale),
              stunDuration: 1.25,
            });
          }
          next = applyBite(next);
        }
        this.setCombatState(enemy, next);
        this.emitCombatFeedback(enemy, next);

        const consumed = next.status === "devoured" || (!isBoss && this.isCombatTerminal(next));
        const gain = (consumed ? (isBoss ? 0.24 : 0.22) : isBoss ? 0.055 : 0.08) * form.biomassGainScale;
        this.mass = Phaser.Math.Clamp(this.mass + gain, MIN_MASS, MAX_MASS);
        this.syncCodeLifeMass();
        this.fluidBody.devour(gain, { x: enemy.x, y: enemy.y });
        this.options.controller.heal(consumed ? (isBoss ? 26 : 26) : 8);
        this.options.controller.devourBias(consumed ? 1 : 0.35);
        this.spawnBurst(enemy.x, enemy.y, consumed ? 0x60ffd8 : 0xffe0ec, isBoss ? 32 : 24);
        this.playSfx(consumed ? "devour" : "boss-hit", isBoss ? 1.2 : 0.95, enemy);

        if (consumed) {
          this.killEnemy(enemy, false);
        } else if (isBoss && !wasDevourable && (!next.lastEvent || next.lastEvent === "alerted")) {
          this.options.controller.note("你咬下一段高权限外壳，代码胃里短暂亮起新的路由。");
        }
        this.options.onStateChanged();
        return;
      }

      const hp = (enemy.getData("hp") as number) - (isBoss ? 42 : 999);
      const gain = isBoss ? 0.12 : 0.22;
      enemy.setData("hp", hp);
      if (isBoss) {
        this.syncBossHud(enemy);
      }
      this.mass = Phaser.Math.Clamp(this.mass + gain, MIN_MASS, MAX_MASS);
      this.syncCodeLifeMass();
      this.fluidBody.devour(gain, { x: enemy.x, y: enemy.y });
      this.options.controller.heal(isBoss ? 12 : 26);
      this.options.controller.devourBias(1);
      this.spawnBurst(enemy.x, enemy.y, 0x60ffd8, isBoss ? 32 : 24);
      this.playSfx("devour", isBoss ? 1.25 : 0.95, enemy);
      if (hp <= 0) {
        this.killEnemy(enemy, false);
      } else {
        this.options.controller.note("你咬下一段高权限进程，身体里长出新的代码腱。");
      }
      this.options.onStateChanged();
      return;
    }

    const cache = this.findNearest(this.caches.getChildren() as Phaser.Physics.Arcade.Sprite[], 132);
    if (!cache) {
      if (this.options.controller.hasAbility("material-mark")) {
        this.placeMaterialMark();
        this.options.onStateChanged();
        return;
      }
      this.options.controller.note("附近没有能被吞噬的代码质量。");
      this.options.onStateChanged();
      return;
    }

    const { x, y } = cache;
    const gate = cache.getData("gate") as AbilityId | undefined;
    const cacheLockReason = this.getGateLockReason(gate, "devour this encrypted cache");
    if (cacheLockReason && gate) {
      this.options.controller.note(`需要 ${this.formatAbilityLabel(gate)} 才能吞噬这个加密缓存。`);
      this.playSfx("permission-gate", 0.72, cache);
      this.options.controller.note(cacheLockReason);
      this.options.onStateChanged();
      return;
    }
    const biomass = (cache.getData("biomass") as number | undefined) ?? 2;
    const gain = (0.1 + biomass * 0.045) * form.biomassGainScale;
    cache.destroy();
    this.mass = Phaser.Math.Clamp(this.mass + gain, MIN_MASS, MAX_MASS);
    this.syncCodeLifeMass();
    this.fluidBody.devour(gain, { x, y });
    this.options.controller.collectChapterItem();
    this.options.controller.heal(20 + biomass * 3);
    this.options.controller.devourBias(1);
    this.spawnBurst(x, y, 0x60ffd8, 18 + biomass * 4);
    this.playSfx("devour", 0.82 + biomass * 0.08, { x, y });
    this.options.controller.note("缓存囊融进身体，0 和 1 像血流一样重新循环。");
    this.options.onStateChanged();
  }

  private placeMaterialMark(): void {
    const existingNearby = this.materialMarks.find(
      (mark) => mark.active && Phaser.Math.Distance.Between(mark.x, mark.y, this.core.x, this.core.y) < 110,
    );
    if (existingNearby) {
      this.options.controller.note("A physical mark is already printed here; hook it or jump through it.");
      this.playSfx("permission-gate", 0.44, existingNearby);
      return;
    }

    const oldMark = this.materialMarks.length >= MAX_MATERIAL_MARKS ? this.materialMarks.shift() : undefined;
    if (oldMark?.active) {
      this.spawnBurst(oldMark.x, oldMark.y, 0x7affea, 8);
      oldMark.destroy();
    }

    const mark = this.anchors.create(this.core.x, this.core.y, "pd-anchor") as Phaser.Physics.Arcade.Sprite;
    mark.setDisplaySize(76, 76);
    mark.setTint(this.layout.config?.colorAccents.primary ?? 0x60ffd8);
    mark.setDepth(12);
    mark.setAlpha(0.92);
    mark.setData("label", "printed material mark");
    mark.setData("materialMark", true);
    mark.refreshBody();
    this.materialMarks.push(mark);

    this.mass = Phaser.Math.Clamp(this.mass - 0.035, MIN_MASS, MAX_MASS);
    this.syncCodeLifeMass();
    this.fluidBody.devour(0.018, { x: mark.x, y: mark.y });
    this.spawnBurst(mark.x, mark.y, 0x7affea, 18);
    this.playSfx("material-mark", 0.74, mark);
    this.options.controller.interactBias(0.5);
    this.options.controller.note("Material mark printed into the real layer; it can be hooked or used as a packet anchor.");
  }

  private spoofNearbyVoiceprintSystems(range: number, time: number): number {
    let spoofed = 0;
    for (const object of this.hazards.getChildren()) {
      const hazard = object as Phaser.Physics.Arcade.Sprite;
      if (hazard.getData("kind") !== "audio-feedback" || Phaser.Math.Distance.Between(this.core.x, this.core.y, hazard.x, hazard.y) > range) {
        continue;
      }

      hazard.setData("hijackedUntil", Math.max((hazard.getData("hijackedUntil") as number | undefined) ?? 0, time + VOICEPRINT_SPOOF_MS));
      hazard.setTint(0xe3a9ff);
      this.scene.time.delayedCall(VOICEPRINT_SPOOF_MS, () => {
        if (hazard.active && !this.isHazardSuppressed(hazard, this.scene.time.now)) {
          hazard.setTint(this.getHazardTint("audio-feedback"));
        }
      });
      this.spawnBurst(hazard.x, hazard.y, 0xe3a9ff, 12);
      spoofed += 1;
    }

    for (const object of this.enemies.getChildren()) {
      const enemy = object as Phaser.Physics.Arcade.Sprite;
      if (
        !enemy.active ||
        enemy.getData("kind") !== "voiceprint-probe" ||
        Phaser.Math.Distance.Between(this.core.x, this.core.y, enemy.x, enemy.y) > range
      ) {
        continue;
      }

      enemy.setData("grabbedUntil", time + VOICEPRINT_SPOOF_MS * 0.55);
      enemy.setTintFill(0xe3a9ff);
      this.scene.time.delayedCall(180, () => this.restoreEnemyTint(enemy));
      this.spawnBurst(enemy.x, enemy.y, 0xe3a9ff, 9);
      spoofed += 1;
    }

    if (spoofed > 0) {
      this.stealthUntil = Math.max(this.stealthUntil, time + 700);
      this.playSfx("voiceprint-spoof", 0.74);
      this.options.controller.interactBias(0.75);
    }
    return spoofed;
  }

  private useInfiltrate(time: number): void {
    if (this.tryInfiltrateTurret(time)) {
      return;
    }

    const form = this.getFormState();
    const shell = this.findNearest(this.shells.getChildren() as Phaser.Physics.Arcade.Sprite[], 145);
    if (!shell) {
      if (this.options.controller.hasAbility("voiceprint-disguise")) {
        const spoofed = this.spoofNearbyVoiceprintSystems(560 + this.mass * 80, time);
        if (spoofed > 0) {
          this.options.controller.note(`Voiceprint disguise spoofed ${spoofed} listening system${spoofed > 1 ? "s" : ""}; feedback windows collapse for a moment.`);
          this.options.onStateChanged();
          return;
        }
      }
      this.options.controller.note("附近没有可钻入的文件壳或狭缝。");
      this.options.onStateChanged();
      return;
    }

    const gate = shell.getData("gate") as AbilityId | undefined;
    const shellLockReason = this.getGateLockReason(gate, "drill into this slit");
    if (shellLockReason && gate) {
      this.options.controller.note(`需要 ${this.formatAbilityLabel(gate)} 才能钻进这条狭缝。`);
      this.playSfx("permission-gate", 0.72, shell);
      this.options.controller.note(shellLockReason);
      this.options.onStateChanged();
      return;
    }

    this.stealthUntil = time + 2300 + form.stealthMsBonus;
    const targetX = (shell.getData("targetX") as number | undefined) ?? shell.x;
    const targetY = (shell.getData("targetY") as number | undefined) ?? shell.y;
    if (!this.canLeaveCurrentArena({ x: targetX, y: targetY })) {
      this.options.controller.note("Arena seal rejects that tunnel until the resident process is consumed.");
      this.playSfx("permission-gate", 0.7, shell);
      this.options.onStateChanged();
      return;
    }
    this.core.setPosition(targetX, targetY);
    this.core.setVelocity(0, 0);
    this.mass = Math.max(0.82, this.mass - 0.04);
    this.syncCodeLifeMass();
    this.fluidBody.reset({ x: targetX, y: targetY }, this.mass);
    this.spawnBurst(shell.x, shell.y, 0xd7fff4, 14);
    this.spawnBurst(targetX, targetY, 0xd7fff4, 20);
    this.playSfx("permission-gate", 0.7, shell);
    this.options.controller.interactBias(1);
    this.options.controller.note("流体代码压成一条薄线，钻进损坏文件壳，扫描暂时丢失目标。");
    this.options.onStateChanged();
  }

  private tryInfiltrateTurret(time: number): boolean {
    const linkedTurret =
      this.activeTendril?.kind === "turret" && this.activeTendril.target.active
        ? (this.activeTendril.target as Phaser.Physics.Arcade.Sprite)
        : undefined;
    const turret = linkedTurret ?? this.findNearest(this.turrets.getChildren() as Phaser.Physics.Arcade.Sprite[], 132);
    if (!turret) {
      return false;
    }

    this.activeTurret = turret;
    turret.setData("invadedUntil", time + TURRET_CONTROL_MS);
    turret.setData("nextFireAt", time + 120);
    turret.setTint(0x95fff1);
    turret.setAlpha(1);
    this.core.setPosition(turret.x, turret.y);
    this.core.setVelocity(0, 0);
    this.stealthUntil = Math.max(this.stealthUntil, time + TURRET_CONTROL_MS);
    this.fluidBody.reset({ x: turret.x, y: turret.y }, Math.max(MIN_MASS, this.mass * 0.72));
    this.spawnBurst(turret.x, turret.y, 0x95fff1, 18);
    this.playSfx("device-overload", 0.72, turret);
    this.options.controller.interactBias(0.6);
    this.options.controller.note("已入侵小炮台。鼠标瞄准，左键发射，右键脱离。");
    this.options.onStateChanged();
    return true;
  }

  private updateTurretControl(time: number): void {
    const turret = this.activeTurret;
    if (!turret?.active) {
      this.activeTurret = undefined;
      return;
    }

    const invadedUntil = (turret.getData("invadedUntil") as number | undefined) ?? 0;
    if (time > invadedUntil) {
      this.releaseActiveTurret();
      return;
    }

    this.core.setPosition(turret.x, turret.y);
    this.core.setVelocity(0, 0);
    const pointer = this.scene.input.activePointer;
    const angle = Phaser.Math.Angle.Between(turret.x, turret.y, pointer.worldX, pointer.worldY);
    turret.setRotation(angle);

    if (pointer.leftButtonDown()) {
      this.fireActiveTurret(time, turret, angle);
    }
  }

  private releaseActiveTurret(): void {
    const turret = this.activeTurret;
    if (!turret) {
      return;
    }
    turret.setData("invadedUntil", 0);
    turret.setTint(0xbffcff);
    this.activeTurret = undefined;
    this.stealthUntil = Math.max(this.stealthUntil, this.scene.time.now + 420);
    this.spawnBurst(turret.x, turret.y, 0x95fff1, 10);
  }

  private fireActiveTurret(time: number, turret: Phaser.Physics.Arcade.Sprite, angle: number): void {
    const nextFireAt = (turret.getData("nextFireAt") as number | undefined) ?? 0;
    if (time < nextFireAt) {
      return;
    }
    const cooldownMs = (turret.getData("cooldownMs") as number | undefined) ?? 1000;
    const projectileSpeed = (turret.getData("projectileSpeed") as number | undefined) ?? 540;
    const damage = (turret.getData("damage") as number | undefined) ?? 6;
    turret.setData("nextFireAt", time + cooldownMs);

    const projectile = this.turretProjectiles.create(
      turret.x + Math.cos(angle) * 26,
      turret.y + Math.sin(angle) * 26,
      getCodeLifeTurretProjectileTextureKey(),
    ) as Phaser.Physics.Arcade.Sprite;
    projectile.setDepth(31);
    projectile.setDisplaySize(18, 10);
    projectile.setRotation(angle);
    projectile.setData("damage", damage);
    projectile.setData("spawnedAt", time);
    projectile.setData("owner", turret.getData("id"));
    const projectileBody = projectile.body as Phaser.Physics.Arcade.Body | undefined;
    projectileBody?.setAllowGravity(false);
    projectileBody?.setSize(18, 10);
    projectile.setVelocity(Math.cos(angle) * projectileSpeed, Math.sin(angle) * projectileSpeed);
    this.spawnBurst(projectile.x, projectile.y, 0x95fff1, 5);
    this.playSfx("boss-hit", 0.34, turret);
    this.scene.time.delayedCall(1800, () => {
      if (projectile.active) {
        projectile.destroy();
      }
    });
  }

  private handleTurretProjectileHit(projectile: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite): void {
    if (!projectile.active || !enemy.active) {
      return;
    }
    projectile.destroy();
    if (enemy.getData("kind") !== "mechanical-worm") {
      this.spawnBurst(enemy.x, enemy.y, 0x95fff1, 5);
      return;
    }

    const damage = (projectile.getData("damage") as number | undefined) ?? 6;
    const combat = this.getCombatState(enemy);
    if (combat) {
      const next = applyHazard(combat, { damage, force: 50, ignoresArmor: true });
      this.setCombatState(enemy, next);
      this.emitCombatFeedback(enemy, next);
      this.spawnBurst(enemy.x, enemy.y, 0xff4f6d, 12);
      this.playSfx("hurt", 0.5, enemy);
      if (this.isCombatTerminal(next)) {
        this.killEnemy(enemy, true);
      }
      return;
    }

    const hp = ((enemy.getData("hp") as number | undefined) ?? 1) - damage;
    enemy.setData("hp", hp);
    this.spawnBurst(enemy.x, enemy.y, 0xff4f6d, 12);
    if (hp <= 0) {
      this.killEnemy(enemy, true);
    }
  }

  private useSensePulse(time: number): void {
    if (time < this.nextSenseAt) {
      return;
    }
    this.nextSenseAt = time + 1500;
    if (!this.hasAnyAbility(SENSE_ABILITY_IDS)) {
      this.options.controller.note("还没有能反向读取环境的感知能力。");
      this.playSfx("permission-gate", 0.58);
      this.options.onStateChanged();
      return;
    }

    const range = 700 + this.mass * 90;
    const ring = this.scene.add.circle(this.core.x, this.core.y, 34).setDepth(32);
    ring.setStrokeStyle(3, 0x7affea, 0.8);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: ring,
      scale: range / 34,
      alpha: 0,
      duration: 640,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    let marked = 0;
    let hijacked = 0;
    for (const object of this.enemies.getChildren()) {
      const enemy = object as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active || Phaser.Math.Distance.Between(this.core.x, this.core.y, enemy.x, enemy.y) > range) {
        continue;
      }
      marked += 1;
      enemy.setData("grabbedUntil", time + 720);
      enemy.setTintFill(0x7affea);
      this.scene.time.delayedCall(140, () => this.restoreEnemyTint(enemy));
      this.spawnBurst(enemy.x, enemy.y, 0x7affea, enemy.getData("bossId") ? 12 : 7);
    }

    if (this.options.controller.hasAbility("vision-takeover")) {
      this.stealthUntil = Math.max(this.stealthUntil, time + 900);
      hijacked = this.hijackNearbyCameraHazards(range, time);
    }
    this.playSfx("scan-alarm", 0.72);
    this.options.controller.interactBias(1);
    if (hijacked > 0) {
      this.options.controller.note(`Vision takeover hijacked ${hijacked} camera scan${hijacked > 1 ? "s" : ""}; exposed cones go dark for a short window.`);
      this.options.onStateChanged();
      return;
    }
    this.options.controller.note(marked > 0 ? `感知脉冲标记了 ${marked} 个进程。` : "感知脉冲扫过空目录，出口方向短暂发亮。");
    this.options.onStateChanged();
  }

  private cycleVersionSplitForm(time: number, direction: 1 | -1): void {
    if (time < this.nextVersionSplitAt) {
      return;
    }
    this.nextVersionSplitAt = time + 260;
    if (!this.options.controller.hasAbility("version-split")) {
      this.options.controller.note("Version split is still locked; consume the NAS sync core first.");
      this.playSfx("permission-gate", 0.52);
      this.options.onStateChanged();
      return;
    }

    const current = this.getActiveVersionForm() ?? VERSION_SPLIT_DEFAULT_FORM;
    this.versionSplitForm = getNextCodeLifeVersionForm(current, direction);
    const form = this.getFormState();
    this.syncVersionFormBody();
    this.syncCodeLifeFormHud();
    this.stealthUntil = Math.max(this.stealthUntil, time + Math.max(120, form.stealthMsBonus));
    this.spawnBurst(this.core.x, this.core.y, this.getVersionFormColor(this.versionSplitForm), this.versionSplitForm === "brute" ? 30 : 22);
    this.playSfx(this.versionSplitForm === "brute" ? "device-overload" : "material-mark", this.versionSplitForm === "packet" ? 0.82 : 0.68);
    this.options.controller.interactBias(0.25);
    this.options.controller.note(`Version split: ${form.label}.`);
    this.options.onStateChanged();
  }

  private useTraverse(time: number): void {
    if (time < this.nextTraverseAt) {
      return;
    }
    this.nextTraverseAt = time + 1350;
    if (!this.hasAnyAbility(TRAVERSE_ABILITY_IDS)) {
      this.options.controller.note("还没有能跨节点穿梭的网络化身体。");
      this.playSfx("permission-gate", 0.58);
      this.options.onStateChanged();
      return;
    }

    const target = this.findTraverseTarget();
    if (!target) {
      const lockedGate = this.lockedTraverseGate;
      this.emitLockedTraverseFeedback(this.lockedTraverseTarget, lockedGate);
      this.options.controller.note(
        this.getGateLockReason(lockedGate, "沿这个节点穿梭") ?? "附近没有可穿梭的锚点、文件壳或缓存节点。",
      );
      this.options.onStateChanged();
      return;
    }

    const from = { x: this.core.x, y: this.core.y };
    if (!this.canLeaveCurrentArena(target)) {
      this.options.controller.note("Arena seal rejects that network hop until the resident process is consumed.");
      this.playSfx("permission-gate", 0.72, target);
      this.options.onStateChanged();
      return;
    }
    this.core.setPosition(target.x, target.y);
    this.core.setVelocity(0, 0);
    this.mass = Math.max(0.82, this.mass - 0.03);
    this.syncCodeLifeMass();
    this.fluidBody.reset({ x: target.x, y: target.y }, this.mass);
    this.spawnBurst(from.x, from.y, 0x95fff1, 16);
    this.spawnBurst(target.x, target.y, 0x95fff1, 24);
    this.playSfx("permission-gate", 0.82, target);
    this.options.controller.interactBias(1);
    this.options.controller.note("身体拆成一串数据包，沿着最近的节点重新聚合。");
    this.options.onStateChanged();
  }

  private emitLockedTraverseFeedback(
    target: (Phaser.GameObjects.GameObject & { x: number; y: number; active: boolean }) | undefined,
    gate: AbilityId | undefined,
  ): void {
    const x = target?.x ?? this.core.x;
    const y = target?.y ?? this.core.y;
    const color = gate === "hardware-parasite" ? 0xffc247 : gate === "voiceprint-disguise" ? 0xe3a9ff : 0xff5574;
    this.spawnBurst(x, y, color, target ? 16 : 10);
    this.playSfx("permission-gate", target ? 0.74 : 0.56, { x, y });
    if (!target) {
      return;
    }

    const ring = this.scene.add.graphics().setDepth(31);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    ring.lineStyle(3, color, 0.72);
    ring.strokeCircle(x, y, 58);
    ring.lineStyle(2, 0xffffff, 0.38);
    ring.lineBetween(x - 42, y - 42, x + 42, y + 42);
    ring.lineBetween(x - 42, y + 42, x + 42, y - 42);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 1.32,
      scaleY: 1.32,
      duration: 360,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  private hijackNearbyCameraHazards(range: number, time: number): number {
    let hijacked = 0;
    for (const object of this.hazards.getChildren()) {
      const hazard = object as Phaser.Physics.Arcade.Sprite;
      const kind = hazard.getData("kind") as CodeLifeHazardKind | undefined;
      if (!this.isVisionHijackableHazard(kind) || Phaser.Math.Distance.Between(this.core.x, this.core.y, hazard.x, hazard.y) > range) {
        continue;
      }

      hazard.setData("hijackedUntil", Math.max((hazard.getData("hijackedUntil") as number | undefined) ?? 0, time + VISION_HIJACK_MS));
      hazard.setTint(0x7affea);
      this.scene.time.delayedCall(VISION_HIJACK_MS, () => {
        if (hazard.active && !this.isHazardSuppressed(hazard, this.scene.time.now)) {
          hazard.setTint(this.getHazardTint(kind));
        }
      });
      this.spawnBurst(hazard.x, hazard.y, 0x7affea, 12);
      hijacked += 1;
    }
    return hijacked;
  }

  private isVisionHijackableHazard(kind: CodeLifeHazardKind | undefined): boolean {
    return kind === "optic-burn" || kind === "delete-scan";
  }

  private updateEnemies(time: number, deltaMs: number): void {
    const hidden = time < this.stealthUntil;
    for (const object of this.enemies.getChildren()) {
      const enemy = object as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) {
        continue;
      }

      const isBoss = Boolean(enemy.getData("bossId"));
      const combat = this.getCombatState(enemy);
      const updatedCombat = combat ? updateEnemy(combat, { x: enemy.x, y: enemy.y }, deltaMs) : undefined;
      if (updatedCombat) {
        this.setCombatState(enemy, updatedCombat);
        if (updatedCombat.intent.shouldDetachGrab && this.activeTendril?.target === enemy) {
          this.activeTendril = undefined;
          this.fluidBody.clearTendril();
        }
        if (this.isCombatTerminal(updatedCombat)) {
          this.killEnemy(enemy, updatedCombat.status !== "devoured");
          continue;
        }
      }
      let latestCombat = updatedCombat ?? combat;
      if (latestCombat?.status === "grabbed" && this.activeTendril?.target !== enemy) {
        latestCombat = this.releaseCombatGrab(latestCombat);
        this.setCombatState(enemy, latestCombat);
      }
      const grabbedUntil = enemy.getData("grabbedUntil") as number;
      const kind = enemy.getData("kind") as CodeLifeEnemyKind | "boss";
      const distance = Phaser.Math.Distance.Between(this.core.x, this.core.y, enemy.x, enemy.y);
      const bodyDistance = this.getBodyDistanceTo(enemy.x, enemy.y);
      if (latestCombat?.status === "stunned") {
        enemy.setVelocity((enemy.body?.velocity.x ?? 0) * 0.42, (enemy.body?.velocity.y ?? 0) * 0.42);
      } else if (kind === "mechanical-worm") {
        if (time < grabbedUntil) {
          enemy.setVelocity((enemy.body?.velocity.x ?? 0) * 0.78, (enemy.body?.velocity.y ?? 0) * 0.78);
        } else if (!hidden && distance < 170) {
          const fleeAngle = Phaser.Math.Angle.Between(this.core.x, this.core.y, enemy.x, enemy.y);
          enemy.setVelocity(Math.cos(fleeAngle) * 64, Math.sin(fleeAngle) * 42);
        } else {
          this.patrolEnemy(enemy, time, latestCombat?.patrolSpeed ?? 30);
        }
      } else if (time >= grabbedUntil && !hidden) {
        if (isBoss || distance < (isBoss ? 860 : 560)) {
          this.scene.physics.moveToObject(enemy, this.core, latestCombat?.alertSpeed ?? (isBoss ? 92 : 130));
        } else {
          this.patrolEnemy(enemy, time, latestCombat?.patrolSpeed);
        }
      } else if (hidden) {
        enemy.setVelocity((enemy.body?.velocity.x ?? 0) * 0.8, (enemy.body?.velocity.y ?? 0) * 0.8);
      }

      if (isBoss && !hidden && latestCombat?.status !== "stunned" && latestCombat?.boss?.window !== "devour") {
        this.updateBossSpecial(enemy, time, distance);
      }
      if (!isBoss && latestCombat?.status !== "stunned") {
        this.updateDeviceEnemyTrait(enemy, kind, time, distance, bodyDistance, hidden);
      }

      enemy.setAlpha(hidden ? 0.38 : 1);
      if (bodyDistance < (isBoss ? 68 : 44)) {
        this.damagePlayer(isBoss ? 12 : kind === "mechanical-worm" ? 2 : 7);
      }
    }
  }

  private updateDeviceEnemyTrait(
    enemy: Phaser.Physics.Arcade.Sprite,
    kind: CodeLifeEnemyKind | "boss",
    time: number,
    distance: number,
    bodyDistance: number,
    hidden: boolean,
  ): void {
    if (hidden || kind === "boss" || time < ((enemy.getData("grabbedUntil") as number | undefined) ?? 0)) {
      return;
    }

    const trait = this.getDeviceEnemyTrait(kind);
    if (!trait || distance > trait.range) {
      return;
    }

    const lastTraitAt = (enemy.getData("lastTraitAt") as number | undefined) ?? 0;
    if (time - lastTraitAt < trait.cooldownMs) {
      return;
    }
    enemy.setData("lastTraitAt", time);

    if (kind === "lens-sentry") {
      this.focusNearestOpticHazard(enemy);
      return;
    }
    if (kind === "print-daemon") {
      this.shoveCoreTowardRoller(enemy, bodyDistance);
      return;
    }
    if (kind === "voiceprint-probe") {
      this.emitVoiceprintLock(enemy, bodyDistance);
      return;
    }
    if (kind === "gpio-warden") {
      this.emitFirmwarePulse(enemy, bodyDistance);
    }
  }

  private getDeviceEnemyTrait(kind: CodeLifeEnemyKind | "boss"): { readonly range: number; readonly cooldownMs: number } | undefined {
    if (kind === "lens-sentry") {
      return { range: 620, cooldownMs: 1700 };
    }
    if (kind === "print-daemon") {
      return { range: 460, cooldownMs: 1300 };
    }
    if (kind === "voiceprint-probe") {
      return { range: 520, cooldownMs: 1600 };
    }
    if (kind === "gpio-warden") {
      return { range: 440, cooldownMs: 1800 };
    }
    return undefined;
  }

  private focusNearestOpticHazard(enemy: Phaser.Physics.Arcade.Sprite): void {
    const hazard = this.findNearestHazard("optic-burn", enemy, 760) ?? this.findNearestHazard("delete-scan", enemy, 620);
    if (!hazard) {
      return;
    }
    hazard.angle = Phaser.Math.RadToDeg(Math.atan2(this.core.y - hazard.y, this.core.x - hazard.x));
    hazard.setAlpha(0.96);
    hazard.setTint(0xffef9a);
    this.scene.time.delayedCall(260, () => {
      if (hazard.active && !this.isHazardSuppressed(hazard, this.scene.time.now)) {
        hazard.setTint(this.getHazardTint(hazard.getData("kind") as CodeLifeHazardKind | undefined));
      }
    });
    this.spawnBurst(hazard.x, hazard.y, 0xffef9a, 10);
    this.playSfx("scan-alarm", 0.38, hazard);
  }

  private shoveCoreTowardRoller(enemy: Phaser.Physics.Arcade.Sprite, bodyDistance: number): void {
    const roller = this.findNearestHazard("printer-roller", enemy, 720);
    if (!roller) {
      return;
    }

    const angle = Math.atan2(roller.y - this.core.y, roller.x - this.core.x);
    if (bodyDistance < 210) {
      this.core.setVelocity(
        (this.core.body?.velocity.x ?? 0) + Math.cos(angle) * 145,
        (this.core.body?.velocity.y ?? 0) + Math.sin(angle) * 145,
      );
      this.spawnBurst(this.core.x, this.core.y, 0xf7f0d0, 9);
    }
    this.scene.physics.moveTo(enemy, roller.x, roller.y, 102);
    this.playSfx("permission-gate", 0.34, enemy);
  }

  private emitVoiceprintLock(enemy: Phaser.Physics.Arcade.Sprite, bodyDistance: number): void {
    const ring = this.scene.add.circle(enemy.x, enemy.y, 30).setDepth(28);
    ring.setStrokeStyle(3, 0xe3a9ff, 0.78);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: ring,
      scale: 7.2,
      alpha: 0,
      duration: 460,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
    this.spawnBurst(enemy.x, enemy.y, 0xe3a9ff, 8);
    if (bodyDistance < 230) {
      this.damagePlayer(6);
    }
    this.playSfx("scan-alarm", 0.42, enemy);
  }

  private emitFirmwarePulse(enemy: Phaser.Physics.Arcade.Sprite, bodyDistance: number): void {
    const radius = 190;
    const ring = this.scene.add.circle(enemy.x, enemy.y, 28).setDepth(28);
    ring.setStrokeStyle(4, 0xffc247, 0.72);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: ring,
      scale: radius / 28,
      alpha: 0,
      duration: 380,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
    this.spawnBurst(enemy.x, enemy.y, 0xffc247, 11);
    if (bodyDistance < radius) {
      this.damagePlayer(8);
    }
    this.playSfx("boss-hit", 0.36, enemy);
  }

  private findNearestHazard(
    kind: CodeLifeHazardKind,
    origin: Readonly<{ x: number; y: number }>,
    maxDistance: number,
  ): Phaser.Physics.Arcade.Sprite | undefined {
    let nearest: Phaser.Physics.Arcade.Sprite | undefined;
    let nearestDistance = maxDistance;
    for (const object of this.hazards.getChildren()) {
      const hazard = object as Phaser.Physics.Arcade.Sprite;
      if (!hazard.active || hazard.getData("kind") !== kind) {
        continue;
      }
      const distance = Phaser.Math.Distance.Between(origin.x, origin.y, hazard.x, hazard.y);
      if (distance <= nearestDistance) {
        nearest = hazard;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  private updateBossSpecial(enemy: Phaser.Physics.Arcade.Sprite, time: number, distance: number): void {
    const nextSpecialAt = (enemy.getData("nextSpecialAt") as number | undefined) ?? 0;
    if (time < nextSpecialAt || distance > 920) {
      return;
    }

    const bossId = String(enemy.getData("bossId") ?? "");
    const combat = this.getCombatState(enemy);
    const pattern = resolveCodeLifeBossAttackPattern({
      bossId,
      phaseIndex: combat?.boss?.phaseIndex ?? 0,
      phaseCount: combat?.boss?.phaseCount ?? 1,
      healthRatio: combat ? combat.hp / combat.maxHp : undefined,
    });
    enemy.setData("nextSpecialAt", time + pattern.cooldownMs);

    if (pattern.style === "pulse") {
      this.fireBossPulse(enemy, pattern.damageScale, pattern.telegraphColor);
    } else if (pattern.style === "sweep") {
      this.fireBossSweep(enemy, pattern.damageScale, pattern.telegraphColor);
    } else {
      this.fireBossProjectile(enemy, pattern.damageScale, pattern.telegraphColor);
    }
  }

  private fireBossPulse(enemy: Phaser.Physics.Arcade.Sprite, damageScale = 1, telegraphColor?: number): void {
    const radius = 330 + this.chapter.index * 10;
    const ring = this.scene.add.circle(enemy.x, enemy.y, 38).setDepth(28);
    ring.setStrokeStyle(4, telegraphColor ?? this.layout.config?.colorAccents.danger ?? 0xff6e91, 0.8);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: ring,
      scale: radius / 38,
      alpha: 0,
      duration: 520,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
    this.scene.time.delayedCall(220, () => {
      if (enemy.active && this.getBodyDistanceTo(enemy.x, enemy.y) < radius) {
        this.damagePlayer(Math.round((10 + this.chapter.index) * damageScale));
      }
    });
    this.playSfx("scan-alarm", 0.65, enemy);
  }

  private fireBossSweep(enemy: Phaser.Physics.Arcade.Sprite, damageScale = 1, telegraphColor?: number): void {
    const targetX = this.core.x;
    const targetY = this.core.y;
    const vertical = Math.abs(enemy.x - this.core.x) > Math.abs(enemy.y - this.core.y);
    const beam = vertical
      ? this.scene.add.rectangle(targetX, this.worldHeight / 2, 32, this.worldHeight, telegraphColor ?? this.layout.config?.colorAccents.danger ?? 0xff6e91, 0.18)
      : this.scene.add.rectangle(this.worldWidth / 2, targetY, this.worldWidth, 32, telegraphColor ?? this.layout.config?.colorAccents.danger ?? 0xff6e91, 0.18);
    beam.setDepth(23);
    beam.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: beam,
      alpha: 0.54,
      yoyo: true,
      duration: 120,
      repeat: 2,
      onComplete: () => beam.destroy(),
    });
    this.scene.time.delayedCall(260, () => {
      const distanceToBeam = vertical ? Math.abs(this.core.x - targetX) : Math.abs(this.core.y - targetY);
      if (enemy.active && distanceToBeam < 58) {
        this.damagePlayer(Math.round((14 + this.chapter.index) * damageScale));
      }
    });
    this.playSfx("permission-gate", 0.58, { x: targetX, y: targetY });
  }

  private fireBossProjectile(enemy: Phaser.Physics.Arcade.Sprite, damageScale = 1, telegraphColor?: number): void {
    const target = { x: this.core.x, y: this.core.y };
    const bolt = this.scene.add.circle(enemy.x, enemy.y, 12, telegraphColor ?? this.layout.config?.colorAccents.primary ?? 0x7affea, 0.86).setDepth(31);
    bolt.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: bolt,
      x: target.x,
      y: target.y,
      scale: 1.8,
      alpha: 0.1,
      duration: 520,
      ease: "Cubic.easeIn",
      onComplete: () => {
        if (enemy.active && this.getBodyDistanceTo(target.x, target.y) < 84) {
          this.damagePlayer(Math.round((12 + Math.floor(this.chapter.index * 0.8)) * damageScale));
        }
        this.spawnBurst(target.x, target.y, telegraphColor ?? this.layout.config?.colorAccents.primary ?? 0x7affea, 10);
        bolt.destroy();
      },
    });
    this.playSfx("boss-hit", 0.46, enemy);
  }

  private patrolEnemy(enemy: Phaser.Physics.Arcade.Sprite, time: number, speed = 70): void {
    const homeX = (enemy.getData("homeX") as number | undefined) ?? enemy.x;
    const homeY = (enemy.getData("homeY") as number | undefined) ?? enemy.y;
    const radius = (enemy.getData("patrolRadius") as number | undefined) ?? 220;
    const phase = homeX * 0.013 + homeY * 0.009;
    const targetX = homeX + Math.sin(time / 900 + phase) * radius * 0.34;
    const targetY = homeY + Math.cos(time / 1100 + phase) * radius * 0.18;
    this.scene.physics.moveTo(enemy, targetX, targetY, speed);
  }

  private updateHazards(time: number, deltaMs: number): void {
    for (const object of this.hazards.getChildren()) {
      const hazard = object as Phaser.Physics.Arcade.Sprite;
      const kind = hazard.getData("kind") as CodeLifeHazardKind | undefined;
      const runtime = createCodeLifeHazardRuntime(kind, time, this.getHazardSeed(hazard));
      const suppressed = this.isHazardSuppressed(hazard, time);
      const previousDamageActive = hazard.getData("lastDamageActive") as boolean | undefined;
      const damageActive = runtime.damageActive && !suppressed;
      if (previousDamageActive === false && damageActive) {
        this.emitHazardActivationCue(hazard, kind);
      }
      hazard.setData("lastDamageActive", damageActive);
      if (kind !== "delete-scan") {
        hazard.angle += runtime.angularVelocityDeg;
      }
      hazard.setAlpha(suppressed ? 0.2 : runtime.alpha);
      const baseWidth = (hazard.getData("baseWidth") as number | undefined) ?? hazard.displayWidth;
      const baseHeight = (hazard.getData("baseHeight") as number | undefined) ?? hazard.displayHeight;
      hazard.setDisplaySize(baseWidth * runtime.pulseScale, baseHeight * runtime.pulseScale);
      hazard.refreshBody();
      if (kind === "delete-scan") {
        this.syncElectromagneticTrapVisual(
          hazard,
          hazard.displayWidth,
          hazard.displayHeight,
          suppressed ? 0.28 : runtime.alpha,
        );
      }

      if (kind === "printer-roller") {
        this.applyPrinterRollerForce(hazard, runtime.conveyorForce, deltaMs);
      }

      if (this.isCoreExposedToHazard(hazard, time)) {
        this.damagePlayer((hazard.getData("damage") as number | undefined) ?? 13);
      }
      for (const enemyObject of this.enemies.getChildren()) {
        const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
        if (enemy.active && this.isTargetExposedToHazard(hazard, enemy, time)) {
          this.damageEnemyFromHazard(enemy, hazard);
        }
      }
    }
  }

  private emitHazardActivationCue(hazard: Phaser.Physics.Arcade.Sprite, kind: CodeLifeHazardKind | undefined): void {
    if (kind !== "optic-burn" && kind !== "audio-feedback" && kind !== "firmware-flash") {
      return;
    }
    const color = this.getHazardTint(kind);
    this.spawnBurst(hazard.x, hazard.y, color, kind === "firmware-flash" ? 8 : 6);
    this.playSfx(kind === "firmware-flash" ? "device-overload" : "scan-alarm", kind === "audio-feedback" ? 0.34 : 0.28, hazard);
  }

  private handleHazardTouch(hazard: Phaser.Physics.Arcade.Sprite): void {
    if (this.isCoreExposedToHazard(hazard, this.scene.time.now)) {
      this.damagePlayer((hazard.getData("damage") as number | undefined) ?? 13);
    }
  }

  private isHazardSuppressed(hazard: Phaser.Physics.Arcade.Sprite, time: number): boolean {
    return time < ((hazard.getData("hijackedUntil") as number | undefined) ?? 0);
  }

  private isCoreExposedToHazard(hazard: Phaser.Physics.Arcade.Sprite, time: number): boolean {
    return this.isTargetExposedToHazard(hazard, this.core, time);
  }

  private isTargetExposedToHazard(
    hazard: Phaser.Physics.Arcade.Sprite,
    target: Readonly<{ x: number; y: number }>,
    time: number,
  ): boolean {
    const kind = hazard.getData("kind") as CodeLifeHazardKind | undefined;
    return isCodeLifeHazardTargetExposed(
      kind,
      {
        x: hazard.x,
        y: hazard.y,
        width: hazard.displayWidth,
        height: hazard.displayHeight,
        angleDeg: hazard.angle,
        fovDeg: hazard.getData("fovDeg") as number | undefined,
        blindSpotRects: hazard.getData("blindSpotRects") as Array<{ x: number; y: number; width: number; height: number }> | undefined,
        suppressed: this.isHazardSuppressed(hazard, time),
      },
      target,
      time,
      this.getHazardSeed(hazard),
    );
  }

  private applyPrinterRollerForce(hazard: Phaser.Physics.Arcade.Sprite, conveyorForce: number, deltaMs: number): void {
    if (!this.isTargetExposedToHazard(hazard, this.core, this.scene.time.now)) {
      return;
    }
    const horizontal = hazard.displayWidth >= hazard.displayHeight;
    const impulse = conveyorForce * (deltaMs / 1000);
    if (horizontal) {
      this.core.x = Phaser.Math.Clamp(this.core.x + impulse, 36, this.worldWidth - 36);
      this.core.setVelocityX((this.core.body?.velocity.x ?? 0) + conveyorForce * 0.22);
    } else {
      this.core.y = Phaser.Math.Clamp(this.core.y + impulse, 36, this.worldHeight - 36);
      this.core.setVelocityY((this.core.body?.velocity.y ?? 0) + conveyorForce * 0.22);
    }
  }

  private getHazardSeed(hazard: Phaser.Physics.Arcade.Sprite): number {
    if (this.chapter.id === "speaker-voiceprint" && hazard.getData("kind") === "audio-feedback") {
      return 0;
    }
    return Math.round(hazard.x * 5.7 + hazard.y * 3.1);
  }

  private updateBossArenaLock(time: number): void {
    const arena = this.layout.config?.bossArena;
    if (!arena?.lockUntilDefeated) {
      return;
    }

    const currentBoss = this.options.controller.currentBoss();
    if (currentBoss) {
      if (!this.bossArenaEntered && this.isPointInsideArena(this.core, arena)) {
        this.bossArenaEntered = true;
        if (!this.bossArenaHintShown) {
          this.bossArenaHintShown = true;
          this.options.controller.note(arena.hint, true);
          this.options.onStateChanged();
        }
      }
      if (this.bossArenaEntered) {
        this.constrainCoreToArena(arena, time);
      }
      return;
    }

    if (this.bossArenaEntered && !this.bossArenaUnlockFeedbackShown) {
      this.bossArenaUnlockFeedbackShown = true;
      this.spawnBurst(this.layout.exit.x, this.layout.exit.y, this.layout.config?.colorAccents.primary ?? 0x60ffd8, 26);
      this.playSfx("permission-gate", 0.82, this.layout.exit);
      this.options.controller.note("Arena seal dissolved. Exit signal exposed.", true);
      this.options.onStateChanged();
    }
  }

  private constrainCoreToArena(arena: NonNullable<CodeLifeChapterConfig["bossArena"]>, time: number): void {
    const margin = 42;
    const clampedX = Phaser.Math.Clamp(this.core.x, arena.x + margin, arena.x + arena.width - margin);
    const clampedY = Phaser.Math.Clamp(this.core.y, arena.y + margin, arena.y + arena.height - margin);
    if (clampedX === this.core.x && clampedY === this.core.y) {
      return;
    }

    this.core.setPosition(clampedX, clampedY);
    this.core.setVelocity((this.core.body?.velocity.x ?? 0) * 0.25, (this.core.body?.velocity.y ?? 0) * 0.25);
    if (time - this.lastArenaNoteAt > 900) {
      this.lastArenaNoteAt = time;
      this.options.controller.note("Arena seal is holding until the resident process is consumed.");
      this.options.onStateChanged();
    }
  }

  private canLeaveCurrentArena(target: Readonly<{ x: number; y: number }>): boolean {
    const arena = this.layout.config?.bossArena;
    return !arena?.lockUntilDefeated || !this.bossArenaEntered || !this.options.controller.currentBoss() || this.isPointInsideArena(target, arena);
  }

  private isPointInsideArena(point: Readonly<{ x: number; y: number }>, arena: NonNullable<CodeLifeChapterConfig["bossArena"]>): boolean {
    return point.x >= arena.x && point.x <= arena.x + arena.width && point.y >= arena.y && point.y <= arena.y + arena.height;
  }

  private damagePlayer(amount: number): void {
    if (this.options.gmFeatures.invincible) {
      return;
    }
    const effectiveAmount = Math.max(1, Math.round(amount * this.getFormState().damageTakenScale));
    const now = this.scene.time.now;
    if (now - this.lastDamageAt < DAMAGE_COOLDOWN || now < this.stealthUntil) {
      return;
    }
    this.lastDamageAt = now;
    this.mass = Phaser.Math.Clamp(this.mass - effectiveAmount / 90, MIN_MASS, MAX_MASS);
    this.syncCodeLifeMass();
    this.fluidBody.applyDamage(effectiveAmount / 90, { x: this.core.x, y: this.core.y });
    const respawned = this.options.controller.damage(effectiveAmount);
    this.spawnBurst(this.core.x, this.core.y, 0xffd4df, 18);
    this.playSfx("hurt", 0.86);
    this.scene.cameras.main.shake(90, 0.004);
    if (respawned) {
      this.core.setPosition(this.layout.spawn.x, this.layout.spawn.y);
      this.core.setVelocity(0, 0);
      this.activeTendril = undefined;
      this.bossArenaEntered = false;
      this.stealthUntil = this.scene.time.now + REASSEMBLY_GRACE_MS;
      this.mass = Math.max(1, this.mass);
      this.syncCodeLifeMass();
      this.fluidBody.reset({ x: this.layout.spawn.x, y: this.layout.spawn.y }, this.mass);
    }
    this.options.onStateChanged();
  }

  private damageEnemyFromHazard(enemy: Phaser.Physics.Arcade.Sprite, hazard?: Phaser.Physics.Arcade.Sprite): void {
    const now = this.scene.time.now;
    const lastHazardAt = (enemy.getData("lastHazardAt") as number | undefined) ?? 0;
    if (now - lastHazardAt < 520) {
      return;
    }
    if (enemy.getData("turretOnly")) {
      enemy.setData("grabbedUntil", now + 240);
      return;
    }

    const isBoss = Boolean(enemy.getData("bossId"));
    if (isBoss && this.layout.config?.bossArena?.lockUntilDefeated && !this.bossArenaEntered) {
      return;
    }
    enemy.setData("lastHazardAt", now);
    const bossId = enemy.getData("bossId") as string | undefined;
    const hazardKind = hazard?.getData("kind") as CodeLifeHazardKind | undefined;
    const interaction = getCodeLifeDeviceBossInteraction({ bossId, hazardKind, isBoss });
    const cueColor = getCodeLifeDeviceCueColor(interaction.cue);
    const combat = this.getCombatState(enemy);
    if (combat) {
      const next = applyHazard(combat, {
        damage: interaction.damage,
        force: interaction.force,
        ignoresArmor: interaction.ignoresArmor,
      });
      this.setCombatState(enemy, next);
      this.emitCombatFeedback(enemy, next);
      this.spawnBurst(enemy.x, enemy.y, interaction.cue ? cueColor : 0xffd0d8, isBoss ? (interaction.cue ? 24 : 14) : 20);
      if (interaction.cue && hazard) {
        this.emitDeviceWeaknessFeedback(enemy, hazard, interaction.cue);
      }
      this.playSfx(interaction.cue ? "device-overload" : isBoss ? "boss-hit" : "hurt", isBoss ? 0.75 : 0.62, enemy);
      this.noteDeviceBossInteraction(enemy, interaction.note, now);
      if (this.isCombatTerminal(next)) {
        this.killEnemy(enemy, true);
      }
      return;
    }

    if (!isBoss) {
      this.killEnemy(enemy, true);
      return;
    }

    const hp = Math.max(1, (enemy.getData("hp") as number) - interaction.damage);
    enemy.setData("hp", hp);
    this.syncBossHud(enemy);
    this.spawnBurst(enemy.x, enemy.y, interaction.cue ? cueColor : 0xffd0d8, interaction.cue ? 24 : 14);
    if (interaction.cue && hazard) {
      this.emitDeviceWeaknessFeedback(enemy, hazard, interaction.cue);
    }
    this.playSfx(interaction.cue ? "device-overload" : "boss-hit", 0.75, enemy);
    this.noteDeviceBossInteraction(enemy, interaction.note, now);
  }

  private noteDeviceBossInteraction(enemy: Phaser.Physics.Arcade.Sprite, note: string | undefined, now: number): void {
    if (!note) {
      return;
    }
    const lastNoteAt = (enemy.getData("lastWeaknessNoteAt") as number | undefined) ?? 0;
    if (now - lastNoteAt < 2600) {
      return;
    }
    enemy.setData("lastWeaknessNoteAt", now);
    this.options.controller.note(note);
    this.options.onStateChanged();
  }

  private emitDeviceWeaknessFeedback(
    enemy: Phaser.Physics.Arcade.Sprite,
    hazard: Phaser.Physics.Arcade.Sprite,
    cue: CodeLifeBossDeviceCue,
  ): void {
    const color = getCodeLifeDeviceCueColor(cue);
    const graphics = this.scene.add.graphics();
    graphics.setDepth(34);
    graphics.setBlendMode(Phaser.BlendModes.ADD);

    const dx = enemy.x - hazard.x;
    const dy = enemy.y - hazard.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const normalX = -dy / distance;
    const normalY = dx / distance;
    graphics.lineStyle(7, color, 0.72);
    graphics.lineBetween(hazard.x, hazard.y, enemy.x, enemy.y);
    graphics.lineStyle(2, 0xffffff, 0.52);
    graphics.lineBetween(
      hazard.x + normalX * 8,
      hazard.y + normalY * 8,
      enemy.x + normalX * 8,
      enemy.y + normalY * 8,
    );
    graphics.lineBetween(
      hazard.x - normalX * 8,
      hazard.y - normalY * 8,
      enemy.x - normalX * 8,
      enemy.y - normalY * 8,
    );

    graphics.fillStyle(color, 0.38);
    for (let index = 1; index < 8; index += 1) {
      const t = index / 8;
      const jitter = Math.sin(this.scene.time.now / 80 + index * 1.7) * 12;
      const x = Phaser.Math.Linear(hazard.x, enemy.x, t) + normalX * jitter;
      const y = Phaser.Math.Linear(hazard.y, enemy.y, t) + normalY * jitter;
      graphics.fillRect(x - 8, y - 8, 16, 16);
    }

    const enemyRadius = Math.max(enemy.displayWidth, enemy.displayHeight) * 0.48;
    graphics.lineStyle(3, color, 0.78);
    graphics.strokeCircle(enemy.x, enemy.y, enemyRadius);
    graphics.lineStyle(2, 0xffffff, 0.48);
    graphics.strokeCircle(hazard.x, hazard.y, Math.max(hazard.displayWidth, hazard.displayHeight) * 0.42);
    this.drawDeviceWeaknessCueMark(graphics, enemy.x, enemy.y, enemyRadius, cue, color);

    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 440,
      ease: "Cubic.easeOut",
      onComplete: () => graphics.destroy(),
    });
    this.spawnBurst(hazard.x, hazard.y, color, 10);
    this.spawnBurst(enemy.x, enemy.y, color, 18);
    this.scene.cameras.main.shake(90, 0.0035);
  }

  private drawDeviceWeaknessCueMark(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    cue: CodeLifeBossDeviceCue,
    color: number,
  ): void {
    graphics.lineStyle(2, color, 0.74);
    if (cue === "roller-rip") {
      for (let index = -2; index <= 2; index += 1) {
        const startX = x + index * radius * 0.16;
        graphics.lineBetween(startX, y - radius * 0.7, startX + radius * 0.28, y - radius * 0.18);
        graphics.lineBetween(startX + radius * 0.28, y - radius * 0.18, startX - radius * 0.12, y + radius * 0.58);
      }
      return;
    }
    if (cue === "lens-overload") {
      graphics.strokeCircle(x, y, radius * 0.7);
      graphics.strokeCircle(x, y, radius * 0.34);
      graphics.lineBetween(x - radius * 0.76, y, x + radius * 0.76, y);
      graphics.lineBetween(x, y - radius * 0.76, x, y + radius * 0.76);
      return;
    }
    if (cue === "voiceprint-desync") {
      for (let index = -4; index <= 4; index += 1) {
        const wave = Math.sin(index * 1.4) * radius * 0.2;
        graphics.lineBetween(x + index * radius * 0.12, y - radius * 0.42 - wave, x + index * radius * 0.12, y + radius * 0.42 + wave);
      }
      graphics.strokeCircle(x, y, radius * 0.86);
      return;
    }
    if (cue === "firmware-short") {
      const core = radius * 0.78;
      graphics.strokeRect(x - core * 0.5, y - core * 0.5, core, core);
      for (let index = -2; index <= 2; index += 1) {
        const offset = (index / 3) * core;
        graphics.lineBetween(x + offset, y - core * 0.66, x + offset, y - core * 0.5);
        graphics.lineBetween(x + offset, y + core * 0.5, x + offset, y + core * 0.66);
      }
      return;
    }
    graphics.lineBetween(x - radius * 0.7, y - radius * 0.24, x - radius * 0.18, y + radius * 0.36);
    graphics.lineBetween(x - radius * 0.18, y + radius * 0.36, x + radius * 0.72, y - radius * 0.44);
    graphics.strokeCircle(x, y, radius * 0.72);
  }

  private killEnemy(enemy: Phaser.Physics.Arcade.Sprite, byHazard: boolean): void {
    const x = enemy.x;
    const y = enemy.y;
    const isBoss = Boolean(enemy.getData("bossId"));
    const combat = this.getCombatState(enemy);
    if (isBoss && combat && combat.status !== "devoured") {
      const protectedBoss: CodeLifeEnemyState = {
        ...combat,
        hp: Math.max(1, combat.hp),
        status: combat.status === "dead" ? "stunned" : combat.status,
      };
      this.setCombatState(enemy, protectedBoss);
      this.syncBossHud(enemy);
      return;
    }
    enemy.disableBody(true, true);
    const wasRequiredWorm = enemy.getData("requiredForExit") === true && enemy.getData("kind") === "mechanical-worm";
    this.spawnBurst(x, y, wasRequiredWorm ? 0xff4f6d : byHazard ? 0xffd0d8 : 0xff5574, isBoss ? 34 : wasRequiredWorm ? 16 : 26);

    if (isBoss) {
      const defeated = this.options.controller.defeatCurrentBoss();
      this.clearBossUi();
      this.options.onStateChanged();
      const nextBoss = this.options.controller.currentBoss();
      if (nextBoss) {
        this.scene.time.delayedCall(760, () => {
          this.spawnCurrentBoss();
          this.options.controller.note(`${defeated?.name ?? "Boss"} 被吞噬，${nextBoss.name} 从更深的目录里醒来。`);
          this.options.onStateChanged();
        });
      } else if (this.layout.config?.bossArena?.lockUntilDefeated) {
        this.bossArenaUnlockFeedbackShown = true;
        this.spawnBurst(this.layout.exit.x, this.layout.exit.y, this.layout.config.colorAccents.primary, 28);
        this.playSfx("permission-gate", 0.86, this.layout.exit);
        this.options.controller.note("Arena seal dissolved. Exit signal exposed.", true);
        this.options.onStateChanged();
      }
      return;
    }

    if (wasRequiredWorm) {
      const remaining = this.getRemainingRequiredWorms();
      if (remaining === 0) {
        this.spawnBurst(this.layout.exit.x, this.layout.exit.y, this.layout.config?.colorAccents.primary ?? 0x60ffd8, 24);
        this.playSfx("permission-gate", 0.78, this.layout.exit);
        this.options.controller.note("最后一只红色电脑蠕虫病毒被小炮台打碎，顶部重生出口已解锁。", true);
      } else {
        this.options.controller.note(`红色电脑蠕虫病毒清理完一只，还剩 ${remaining} 只。`);
      }
      this.options.onStateChanged();
      return;
    }

    if (byHazard) {
      const cache = this.caches.create(x, y, "pd-cache") as Phaser.Physics.Arcade.Sprite;
      cache.setScale(0.78);
      cache.setTint(this.layout.config?.colorAccents.biomass ?? 0x56ffd0);
      cache.setData("biomass", 1);
      cache.refreshBody();
    }
  }

  private getRemainingRequiredWorms(): number {
    return this.enemies
      .getChildren()
      .filter((object) => {
        const enemy = object as Phaser.Physics.Arcade.Sprite;
        return enemy.active && enemy.getData("requiredForExit") === true && enemy.getData("kind") === "mechanical-worm";
      }).length;
  }

  private createBossUi(enemy: Phaser.Physics.Arcade.Sprite, boss: BossDef): void {
    this.clearBossUi();
    this.bossLabel = this.scene.add
      .text(enemy.x - 112, enemy.y - 92, boss.name, {
        color: "#fff0f4",
        fontFamily: "Microsoft YaHei UI, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        stroke: "#12030a",
        strokeThickness: 4,
      })
      .setDepth(30);
    this.bossHpBack = this.scene.add.rectangle(enemy.x, enemy.y - 54, 190, 10, 0x12030a, 0.9).setDepth(29);
    this.bossHpFill = this.scene.add.rectangle(enemy.x - 95, enemy.y - 54, 190, 10, boss.color, 0.95).setOrigin(0, 0.5).setDepth(30);
  }

  private updateBossUi(): void {
    if (!this.bossLabel || !this.bossHpBack || !this.bossHpFill) {
      return;
    }
    const bossEnemy = this.enemies
      .getChildren()
      .find((object) => object.active && Boolean((object as Phaser.Physics.Arcade.Sprite).getData("bossId"))) as
      | Phaser.Physics.Arcade.Sprite
      | undefined;
    if (!bossEnemy) {
      return;
    }
    const combat = this.getCombatState(bossEnemy);
    const hp = combat?.hp ?? (bossEnemy.getData("hp") as number);
    const maxHp = combat?.maxHp ?? (bossEnemy.getData("maxHp") as number);
    this.syncBossHud(bossEnemy);
    this.drawBossWindowFeedback(bossEnemy, combat);
    const boss = this.options.controller.currentBoss();
    if (boss) {
      const phaseName = combat?.boss?.phaseName;
      const armorLabel = combat?.boss ? `ARMOR ${Math.round((combat.boss.armor / Math.max(1, combat.boss.maxArmor)) * 100)}%` : "";
      const windowLabel =
        combat?.boss?.window === "devour" ? "DEVOUR" : combat?.boss?.window === "damage" ? "BITE WINDOW" : "";
      this.bossLabel.setText([boss.name, phaseName, armorLabel, windowLabel].filter(Boolean).join("\n"));
    }
    this.bossLabel.setPosition(bossEnemy.x - 112, bossEnemy.y - 92);
    this.bossHpBack.setPosition(bossEnemy.x, bossEnemy.y - 54);
    this.bossHpFill.setPosition(bossEnemy.x - 95, bossEnemy.y - 54);
    this.bossHpFill.width = Phaser.Math.Clamp(hp / maxHp, 0, 1) * 190;
  }

  private drawBossWindowFeedback(bossEnemy: Phaser.Physics.Arcade.Sprite, combat: CodeLifeEnemyState | undefined): void {
    const bossRuntime = combat?.boss;
    if (!bossRuntime || bossRuntime.window === "closed" || bossRuntime.windowRemaining <= 0) {
      this.bossWindowGraphics?.clear();
      return;
    }

    if (!this.bossWindowGraphics) {
      this.bossWindowGraphics = this.scene.add.graphics().setDepth(31);
      this.bossWindowGraphics.setBlendMode(Phaser.BlendModes.ADD);
    }

    const graphics = this.bossWindowGraphics;
    const color = bossRuntime.window === "devour" ? 0xff5574 : 0x7affea;
    const accent = bossRuntime.window === "devour" ? 0xfff06a : 0xffffff;
    const radius = Math.max(bossEnemy.displayWidth, bossEnemy.displayHeight) * 0.64;
    const pulse = 0.5 + Math.sin(this.scene.time.now / 120) * 0.16;
    const progress = Phaser.Math.Clamp(bossRuntime.windowRemaining / Math.max(0.001, bossRuntime.windowDuration), 0, 1);

    graphics.clear();
    graphics.lineStyle(5, color, 0.34 + pulse * 0.28);
    graphics.strokeCircle(bossEnemy.x, bossEnemy.y, radius + pulse * 16);
    graphics.lineStyle(2, accent, 0.28 + pulse * 0.22);
    graphics.strokeCircle(bossEnemy.x, bossEnemy.y, radius * 0.78);
    graphics.lineStyle(7, color, 0.82);
    this.strokeCountdownArc(graphics, bossEnemy.x, bossEnemy.y, radius + 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    graphics.lineStyle(2, accent, 0.66);
    for (let index = 0; index < 8; index += 1) {
      const theta = (index / 8) * Math.PI * 2 + this.scene.time.now / 420;
      const inner = radius * (0.42 + (index % 3) * 0.07);
      const outer = radius * (0.76 + (index % 2) * 0.14);
      graphics.lineBetween(
        bossEnemy.x + Math.cos(theta) * inner,
        bossEnemy.y + Math.sin(theta) * inner,
        bossEnemy.x + Math.cos(theta + 0.22) * outer,
        bossEnemy.y + Math.sin(theta + 0.22) * outer,
      );
    }
  }

  private strokeCountdownArc(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
  ): void {
    const span = endAngle - startAngle;
    if (span <= 0) {
      return;
    }
    let previousX = x + Math.cos(startAngle) * radius;
    let previousY = y + Math.sin(startAngle) * radius;
    for (let index = 1; index <= 42; index += 1) {
      const theta = startAngle + span * (index / 42);
      const nextX = x + Math.cos(theta) * radius;
      const nextY = y + Math.sin(theta) * radius;
      graphics.lineBetween(previousX, previousY, nextX, nextY);
      previousX = nextX;
      previousY = nextY;
    }
  }

  private clearBossUi(): void {
    this.bossLabel?.destroy();
    this.bossHpBack?.destroy();
    this.bossHpFill?.destroy();
    this.bossWindowGraphics?.destroy();
    this.bossLabel = undefined;
    this.bossHpBack = undefined;
    this.bossHpFill = undefined;
    this.bossWindowGraphics = undefined;
    this.options.controller.setCodeLifeBossHud(undefined);
  }

  private spawnBurst(x: number, y: number, color: number, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const text = index % 3 === 0;
      const particlePlan = createCodeLifeGlyphParticle(this.chapter.id, this.scene.time.now + index * 13.37, x, y);
      const particle = text
        ? this.scene.add.text(x, y, particlePlan.glyph, {
            color: colorToCss(color || particlePlan.color),
            fontFamily: "Consolas, monospace",
            fontSize: `${Math.round(particlePlan.sizePx)}px`,
          })
        : this.scene.add.rectangle(x, y, Phaser.Math.Between(3, 7), Phaser.Math.Between(4, 14), color, 0.92);
      particle.setDepth(35);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: particle,
        x: x + particlePlan.velocityX * 2.1 + Phaser.Math.Between(-60, 60),
        y: y + particlePlan.velocityY * 2.1 + Phaser.Math.Between(-46, 46),
        angle: Phaser.Math.Between(-260, 260),
        alpha: 0,
        duration: Phaser.Math.Between(300, Math.max(420, Math.round(particlePlan.lifetimeMs * 0.62))),
        ease: "Cubic.easeOut",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private createBodyRecipe(hidden: boolean) {
    const integrityRatio = this.options.controller.state.integrity / Math.max(1, this.options.controller.state.maxIntegrity);
    const massRatio = (this.mass - MIN_MASS) / (MAX_MASS - MIN_MASS);
    return createCodeLifeBodyArtRecipe({
      chapterId: this.chapter.id,
      massRatio,
      integrityRatio,
      abilityCount: this.options.controller.state.abilities.length,
      bossPressure: this.options.controller.currentBoss() ? 0.68 : 0,
      variant: hidden ? "starving" : integrityRatio < 0.36 ? "damaged" : this.mass > 2.25 ? "overfed" : undefined,
    });
  }

  private syncCodeLifeMass(): void {
    this.options.controller.setCodeLifeMass(this.mass);
    this.syncCodeLifeFormHud();
  }

  private createLayout(chapter: ChapterDef): ChapterLayout {
    const config = getCodeLifeChapterConfig(chapter.id);
    if (!config) {
      return this.createFallbackLayout(chapter);
    }

    const worldFloorTextureKey = getCodeLifeSurfaceTextureKey(config.chapterId, "floor", "world floor", true);
    const surfaces: LayoutRect[] = [
      {
        x: config.world.width / 2,
        y: config.world.height - 24,
        width: config.world.width,
        height: 48,
        label: "world floor",
        textureKey: worldFloorTextureKey,
        preserveTextureColor: worldFloorTextureKey !== undefined,
      },
      { x: config.world.width / 2, y: 24, width: config.world.width, height: 48, label: "world ceiling" },
      { x: 24, y: config.world.height / 2, width: 48, height: config.world.height, label: "left wall" },
      { x: config.world.width - 24, y: config.world.height / 2, width: 48, height: config.world.height, label: "right wall" },
      ...config.gripSurfaces.map((surface) => {
        const textureKey = getCodeLifeSurfaceTextureKey(config.chapterId, surface.kind, surface.label);
        return {
          ...centerRect(surface),
          label: surface.label,
          tint: this.getSurfaceTint(surface.kind, config),
          textureKey,
          preserveTextureColor: textureKey !== undefined,
        };
      }),
    ];

    const anchors: AnchorLayout[] = [
      ...config.vents.map((vent) => ({
        x: vent.x + vent.width / 2,
        y: vent.y + vent.height / 2,
        gate: vent.gate,
        label: vent.label,
      })),
      ...(config.bossArena?.anchorPoints.map((point) => ({
        x: point.x,
        y: point.y,
        label: "boss arena anchor",
      })) ?? []),
    ];

    const passages = [...config.fileShells, ...config.vents];
    const passageTargetCandidates: PassageTargetCandidate[] = [
      ...config.gripSurfaces.map((surface) => ({ ...centerRect(surface), label: surface.label })),
      ...passages.map((passage) => ({ ...centerRect(passage), label: passage.label })),
      { ...centerRect(config.exit), label: config.exit.label },
    ];
    const passageTargets = passages.map((passage, index) => {
      const explicitTarget = this.resolvePassageTarget(passage.to, passageTargetCandidates);
      if (explicitTarget) {
        return explicitTarget;
      }
      const next = passages[index + 1];
      return next ? centerRect(next) : centerRect(config.exit);
    });
    const shells: LayoutRect[] = passages.map((passage, index) => ({
      ...centerRect(passage),
      label: passage.label,
      tint: index < config.fileShells.length ? 0xffd7e0 : config.colorAccents.secondary,
      gate: passage.gate,
      to: passage.to,
      target: passageTargets[index],
    }));

    return {
      width: config.world.width,
      height: config.world.height,
      config,
      spawn: config.spawn,
      exit: { ...centerRect(config.exit), label: config.exit.label, gate: config.exit.gate, to: config.exit.to },
      surfaces,
      gripOnlySurfaces: this.createVirtualGripSurfaces(config),
      anchors,
      abilityGates: config.abilityGates.map((gate) => {
        const blocker = getCodeLifeAbilityGateBlocker(config, gate);
        return {
          ...centerRect(gate),
          label: gate.label,
          ability: gate.ability,
          gate: gate.ability,
          blocker: blocker ? centerRect(blocker) : undefined,
        };
      }),
      hazards: config.hazards.map((hazard) => ({
        ...centerRect(hazard),
        label: hazard.label,
        damage: hazard.damage,
        kind: hazard.kind,
        angleDeg: hazard.angleDeg,
        fovDeg: hazard.fovDeg,
        blindSpotRects: hazard.blindSpotRects,
      })),
      caches: config.biomassCaches.map((cache) => ({
        ...centerRect(cache),
        label: cache.label,
        biomass: cache.biomass,
        gate: cache.gate,
      })),
      shells,
      enemies: config.enemySpawns.flatMap((spawn) => {
        const count = Math.max(1, spawn.count);
        return Array.from({ length: count }, (_, index) => {
          const angle = (index / count) * Math.PI * 2 + spawn.x * 0.017;
          const radius = Math.min(180, spawn.patrolRadius * 0.38);
          return {
            x: Phaser.Math.Clamp(spawn.x + Math.cos(angle) * radius, 70, config.world.width - 70),
            y: Phaser.Math.Clamp(spawn.y + Math.sin(angle) * radius * 0.72, 70, config.world.height - 70),
            hp: this.getEnemyHp(spawn.kind),
            kind: spawn.kind,
            patrolRadius: spawn.patrolRadius,
            requiredForExit: spawn.requiredForExit,
            turretOnly: spawn.turretOnly,
          };
        });
      }),
      turrets: (config.turrets ?? []).map((turret) => ({ ...turret })),
    };
  }

  private createVirtualGripSurfaces(config: CodeLifeChapterConfig): LayoutRect[] {
    const spacing = config.chapterId === "code-rebirth" ? CODE_REBIRTH_VIRTUAL_GRIP_SPACING : CODE_LIFE_VIRTUAL_GRIP_SPACING;
    return this.createVirtualGripGrid(config.world.width, config.world.height, spacing);
  }

  private createFallbackVirtualGripSurfaces(): LayoutRect[] {
    return this.createVirtualGripGrid(FALLBACK_WIDTH, FALLBACK_HEIGHT, CODE_LIFE_VIRTUAL_GRIP_SPACING);
  }

  private createVirtualGripGrid(width: number, height: number, spacing: number): LayoutRect[] {
    const safeSpacing = Math.max(160, spacing);
    const insetX = Math.min(120, width * 0.06);
    const insetY = Math.min(120, height * 0.06);
    const surfaces: LayoutRect[] = [];

    for (let y = insetY + safeSpacing * 0.5, index = 0; y < height - insetY; y += safeSpacing, index += 1) {
      surfaces.push({
        x: width / 2,
        y,
        width: Math.max(1, width - insetX * 2),
        height: VIRTUAL_GRIP_THICKNESS,
        label: `${VIRTUAL_GRIP_LABEL_PREFIX}-horizontal-${index}`,
      });
    }

    for (let x = insetX + safeSpacing * 0.5, index = 0; x < width - insetX; x += safeSpacing, index += 1) {
      surfaces.push({
        x,
        y: height / 2,
        width: VIRTUAL_GRIP_THICKNESS,
        height: Math.max(1, height - insetY * 2),
        label: `${VIRTUAL_GRIP_LABEL_PREFIX}-vertical-${index}`,
      });
    }

    return surfaces;
  }

  private resolvePassageTarget(to: string | undefined, candidates: readonly PassageTargetCandidate[]): LayoutRect | undefined {
    if (!to) {
      return undefined;
    }
    const normalizedTo = normalizePassageTargetLabel(to);
    const exactTarget = candidates.find((candidate) => {
      const normalizedLabel = normalizePassageTargetLabel(candidate.label);
      return normalizedLabel === normalizedTo || normalizedLabel.includes(normalizedTo) || normalizedTo.includes(normalizedLabel);
    });
    if (exactTarget) {
      return { ...exactTarget };
    }

    const targetWords = tokenizePassageTarget(to);
    let best: PassageTargetCandidate | undefined;
    let bestScore = 0;
    let tiedBest = 0;
    for (const candidate of candidates) {
      const candidateWords = tokenizePassageTarget(candidate.label);
      const score = targetWords.filter((word) => candidateWords.some((candidateWord) => candidateWord === word || candidateWord.startsWith(word) || word.startsWith(candidateWord))).length;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
        tiedBest = 1;
      } else if (score === bestScore && score > 0) {
        tiedBest += 1;
      }
    }

    if (best && (bestScore >= 2 || (bestScore === 1 && tiedBest === 1))) {
      return { ...best };
    }
    return undefined;
  }

  private createFallbackLayout(chapter: ChapterDef): ChapterLayout {
    const high = chapter.index % 2 === 0;
    return {
      width: FALLBACK_WIDTH,
      height: FALLBACK_HEIGHT,
      spawn: { x: 110, y: 820 },
      exit: { x: 2860, y: high ? 420 : 650, width: 128, height: 128, label: chapter.exitLabel },
      surfaces: [
        { x: FALLBACK_WIDTH / 2, y: 1038, width: FALLBACK_WIDTH, height: 56 },
        { x: FALLBACK_WIDTH / 2, y: 24, width: FALLBACK_WIDTH, height: 48 },
        { x: 24, y: FALLBACK_HEIGHT / 2, width: 48, height: FALLBACK_HEIGHT },
        { x: FALLBACK_WIDTH - 24, y: FALLBACK_HEIGHT / 2, width: 48, height: FALLBACK_HEIGHT },
        { x: 260, y: 810, width: 380, height: 34 },
        { x: 580, y: 610, width: 320, height: 30 },
        { x: 1120, y: 760, width: 360, height: 34 },
        { x: 1940, y: 730, width: 360, height: 34 },
        { x: 2520, y: 350, width: 360, height: 30 },
      ],
      gripOnlySurfaces: this.createFallbackVirtualGripSurfaces(),
      anchors: [
        { x: 190, y: 690 },
        { x: 430, y: 540 },
        { x: 960, y: 720 },
        { x: 1500, y: 260 },
        { x: 2050, y: 455 },
        { x: 2680, y: 600 },
      ],
      hazards: [
        { x: 740, y: 815, width: 112, height: 112, damage: 20 },
        { x: 1300, y: 815, width: 126, height: 126, damage: 24 },
        { x: 2300, y: 810, width: 122, height: 122, damage: 22 },
      ],
      abilityGates: [],
      caches: [
        { x: 330, y: 260, width: 84, height: 84, biomass: 2 },
        { x: 990, y: 620, width: 84, height: 84, biomass: 2 },
        { x: 1880, y: 230, width: 84, height: 84, biomass: 2 },
      ],
      shells: [
        { x: 520, y: 748, width: 150, height: 120 },
        { x: 2020, y: 638, width: 150, height: 120 },
      ],
      enemies: [
        { x: 960, y: 690, hp: 5, kind: "cleanup-process", patrolRadius: 250 },
        { x: 1380, y: 640, hp: 5, kind: "checksum-drone", patrolRadius: 250 },
        { x: 2220, y: 610, hp: 5, kind: "cleanup-process", patrolRadius: 250 },
      ],
      turrets: [],
    };
  }

  private getBossSpawnPoint(boss: BossDef): { x: number; y: number } {
    const arena = this.layout.config?.bossArena;
    if (!arena) {
      return { x: this.layout.exit.x - 420, y: this.layout.exit.y + (this.chapter.index % 2 === 0 ? 90 : -90) };
    }
    const bossIndex = Math.max(0, arena.bosses.indexOf(boss.id));
    const xMix = 0.32 + (bossIndex % 3) * 0.18;
    const yMix = 0.32 + (bossIndex % 2) * 0.28;
    return {
      x: Phaser.Math.Clamp(arena.x + arena.width * xMix, 80, this.worldWidth - 80),
      y: Phaser.Math.Clamp(arena.y + arena.height * yMix, 80, this.worldHeight - 80),
    };
  }

  private getEnemyHp(kind: CodeLifeEnemyKind): number {
    const hpByKind: Record<CodeLifeEnemyKind, number> = {
      "mechanical-worm": 6,
      "cleanup-process": 5,
      "checksum-drone": 6,
      "index-spider": 7,
      "permission-sentinel": 8,
      "firewall-swarm": 6,
      "sync-echo": 7,
      "lens-sentry": 8,
      "print-daemon": 7,
      "voiceprint-probe": 7,
      "gpio-warden": 9,
    };
    return hpByKind[kind];
  }

  private getEnemyTint(kind: CodeLifeEnemyKind | "boss"): number {
    const tintByKind: Record<CodeLifeEnemyKind | "boss", number> = {
      boss: 0xff5574,
      "mechanical-worm": 0xff3344,
      "cleanup-process": 0xffd0dc,
      "checksum-drone": 0x7affea,
      "index-spider": 0xffcf6b,
      "permission-sentinel": 0xb9ccff,
      "firewall-swarm": 0xff6e6e,
      "sync-echo": 0x95fff1,
      "lens-sentry": 0xffef9a,
      "print-daemon": 0xf7f0d0,
      "voiceprint-probe": 0xe3a9ff,
      "gpio-warden": 0xffc247,
    };
    return tintByKind[kind];
  }

  private getHazardTint(kind?: CodeLifeHazardKind): number {
    const tintByKind: Partial<Record<CodeLifeHazardKind, number>> = {
      shredder: 0xffd1dc,
      "delete-scan": 0x72f6ff,
      "cache-sludge": 0xb8ff6a,
      "sync-storm": 0x7affea,
      "permission-laser": 0xb9ccff,
      "firewall-pulse": 0xff7a47,
      "optic-burn": 0xffef9a,
      "printer-roller": 0xf7f0d0,
      "audio-feedback": 0xe3a9ff,
      "firmware-flash": 0xffc247,
    };
    return (kind && tintByKind[kind]) || this.chapter.palette.danger;
  }

  private getSurfaceTint(kind: string, config: CodeLifeChapterConfig): number {
    if (kind === "ceiling" || kind === "wall") {
      return config.colorAccents.secondary;
    }
    if (kind === "cable" || kind === "pipe" || kind === "rail") {
      return config.colorAccents.primary;
    }
    if (kind === "mesh" || kind === "shell") {
      return config.colorAccents.biomass;
    }
    return this.chapter.palette.platform;
  }

  private restoreEnemyTint(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (!enemy.active) {
      return;
    }
    const combat = this.getCombatState(enemy);
    if (combat) {
      this.syncEnemyTint(enemy, combat);
      return;
    }
    const boss = this.options.controller.currentBoss();
    if (enemy.getData("bossId") && boss) {
      enemy.setTint(boss.color);
      return;
    }
    enemy.setTint(this.getEnemyTint((enemy.getData("kind") as CodeLifeEnemyKind | "boss") ?? "cleanup-process"));
  }

  private findTraverseTarget(): (Phaser.GameObjects.GameObject & { x: number; y: number; active: boolean }) | undefined {
    this.lockedTraverseGate = undefined;
    this.lockedTraverseTarget = undefined;
    const explicitTarget =
      this.activeTendril && this.activeTendril.kind !== "enemy" && this.activeTendril.target.active
        ? this.activeTendril.target
        : undefined;
    if (explicitTarget && Phaser.Math.Distance.Between(this.core.x, this.core.y, explicitTarget.x, explicitTarget.y) <= TENDRIL_RANGE) {
      const gate = this.getTargetGate(explicitTarget);
      if (this.canUseGateAbility(gate)) {
        return explicitTarget;
      }
      this.lockedTraverseGate = gate;
      this.lockedTraverseTarget = explicitTarget;
      return undefined;
    }

    const candidates = [
      ...(this.anchors.getChildren() as Array<Phaser.GameObjects.GameObject & { x: number; y: number; active: boolean }>),
      ...(this.abilityGates.getChildren() as Array<Phaser.GameObjects.GameObject & { x: number; y: number; active: boolean }>),
      ...(this.shells.getChildren() as Array<Phaser.GameObjects.GameObject & { x: number; y: number; active: boolean }>),
      ...(this.caches.getChildren() as Array<Phaser.GameObjects.GameObject & { x: number; y: number; active: boolean }>),
    ];
    let nearestLockedGate: AbilityId | undefined;
    let nearestLockedTarget: (Phaser.GameObjects.GameObject & { x: number; y: number; active: boolean }) | undefined;
    let nearestLockedScore = Number.POSITIVE_INFINITY;
    let best: (Phaser.GameObjects.GameObject & { x: number; y: number; active: boolean }) | undefined;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      if (!candidate.active) {
        continue;
      }
      const score = Phaser.Math.Distance.Between(this.core.x, this.core.y, candidate.x, candidate.y);
      if (score > 760) {
        continue;
      }
      const gate = this.getTargetGate(candidate);
      if (!this.canUseGateAbility(gate)) {
        if (score < nearestLockedScore) {
          nearestLockedScore = score;
          nearestLockedGate = gate;
          nearestLockedTarget = candidate;
        }
        continue;
      }
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    if (!best) {
      this.lockedTraverseGate = nearestLockedGate;
      this.lockedTraverseTarget = nearestLockedTarget;
    }
    return best;
  }

  private getTargetGate(target: Phaser.GameObjects.GameObject): AbilityId | undefined {
    return target.getData("gate") as AbilityId | undefined;
  }

  private getBodyDistanceTo(x: number, y: number): number {
    let distance = Phaser.Math.Distance.Between(this.core.x, this.core.y, x, y) - 30;
    for (const node of this.nodes) {
      distance = Math.min(distance, Phaser.Math.Distance.Between(node.x, node.y, x, y) - node.radius);
    }
    return distance;
  }

  private getFormState() {
    const versionForm = this.getActiveVersionForm();
    return versionForm ? createCodeLifeVersionFormState(this.mass, versionForm) : createCodeLifeFormState(this.mass);
  }

  private getActiveVersionForm(): CodeLifeVersionFormId | undefined {
    if (!this.options.controller.hasAbility("version-split")) {
      return undefined;
    }
    return this.versionSplitForm ?? VERSION_SPLIT_DEFAULT_FORM;
  }

  private canUseGateAbility(ability: AbilityId | undefined): boolean {
    if (!ability) {
      return true;
    }
    if (!this.options.controller.hasAbility(ability)) {
      return false;
    }
    return ability !== "version-split" || this.getActiveVersionForm() === VERSION_SPLIT_PACKET_FORM;
  }

  private syncVersionFormBody(): void {
    const body = this.core.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) {
      return;
    }
    const versionForm = this.getActiveVersionForm();
    const radius =
      this.chapter.id === "code-rebirth"
        ? CODE_REBIRTH_CORE_RADIUS
        : versionForm === "packet"
          ? 22
          : versionForm === "thread"
            ? 24
            : versionForm === "brute"
              ? 36
              : 30;
    body.setCircle(radius);
    body.setOffset(16 - radius, 16 - radius);
    if (this.fluidBody) {
      const visualMass = versionForm === "packet" ? Math.max(MIN_MASS, this.mass * 0.72) : versionForm === "thread" ? Math.max(MIN_MASS, this.mass * 0.82) : this.mass;
      this.fluidBody.reset({ x: this.core.x, y: this.core.y }, visualMass);
      this.nodes = this.fluidBody.getNodes();
    }
    this.syncCodeLifeFormHud();
  }

  private syncCodeLifeFormHud(): void {
    const versionForm = this.getActiveVersionForm();
    if (!versionForm) {
      this.options.controller.setCodeLifeFormHud(undefined);
      return;
    }
    const form = this.getFormState();
    this.options.controller.setCodeLifeFormHud({
      id: versionForm,
      label: form.label,
      segments: form.segments,
    });
  }

  private getVersionFormColor(form: CodeLifeVersionFormId): number {
    if (form === "thread") {
      return 0x7affea;
    }
    if (form === "packet") {
      return 0xb9ccff;
    }
    return 0xff5574;
  }

  private hasAnyAbility(abilityIds: readonly AbilityId[]): boolean {
    return abilityIds.some((abilityId) => this.options.controller.hasAbility(abilityId));
  }

  private formatAbilityLabel(abilityId: AbilityId): string {
    return abilityId.replaceAll("-", " ");
  }

  private getCombatState(enemy: Phaser.Physics.Arcade.Sprite): CodeLifeEnemyState | undefined {
    const state = enemy.getData("combat") as CodeLifeEnemyState | undefined;
    return state && Number.isFinite(state.hp) && Number.isFinite(state.maxHp) ? state : undefined;
  }

  private setCombatState(enemy: Phaser.Physics.Arcade.Sprite, state: CodeLifeEnemyState): void {
    enemy.setData("combat", state);
    enemy.setData("hp", state.hp);
    enemy.setData("maxHp", state.maxHp);
    this.syncEnemyTint(enemy, state);
    if (state.boss) {
      this.syncBossHud(enemy);
    }
  }

  private syncEnemyTint(enemy: Phaser.Physics.Arcade.Sprite, state: CodeLifeEnemyState): void {
    if (!enemy.active) {
      return;
    }

    const boss = this.options.controller.currentBoss();
    const baseColor = state.color ?? (enemy.getData("bossId") && boss ? boss.color : this.getEnemyTint("cleanup-process"));
    if (state.boss?.window === "devour") {
      enemy.setTint(0x60ffd8);
      return;
    }
    if (state.boss?.window === "damage" || state.status === "grabbed") {
      enemy.setTint(0xfff0a8);
      return;
    }
    if (state.status === "stunned") {
      enemy.setTint(0x95fff1);
      return;
    }
    enemy.setTint(baseColor);
  }

  private isCombatTerminal(state: CodeLifeEnemyState): boolean {
    return state.status === "dead" || state.status === "devoured";
  }

  private releaseCombatGrab(state: CodeLifeEnemyState): CodeLifeEnemyState {
    return {
      ...state,
      status: "alert",
      stateTime: 0,
      grab: undefined,
      intent: {
        desiredVelocity: { x: 0, y: 0 },
        canBeDragged: false,
        shouldDetachGrab: false,
      },
    };
  }

  private emitCombatFeedback(enemy: Phaser.Physics.Arcade.Sprite, state: CodeLifeEnemyState): void {
    if (!state.lastEvent) {
      return;
    }

    const boss = this.options.controller.currentBoss();
    if (state.lastEvent === "armor-broken") {
      this.scene.cameras.main.shake(120, 0.003);
      this.spawnBurst(enemy.x, enemy.y, 0xfff0a8, state.boss ? 24 : 12);
      if (state.boss && boss) {
        this.options.controller.note(`${boss.name} 的护甲被撕开，短暂暴露出可咬穿的代码层。`);
      }
      return;
    }

    if (state.lastEvent === "phase-advanced") {
      this.scene.cameras.main.shake(170, 0.004);
      this.spawnBurst(enemy.x, enemy.y, state.color ?? 0xff5574, 30);
      if (state.boss && boss) {
        this.options.controller.note(`${boss.name} 切换到 ${state.boss.phaseName}，护甲重新编译。`);
      }
      return;
    }

    if (state.lastEvent === "devour-window-opened") {
      this.scene.cameras.main.shake(220, 0.005);
      this.spawnBurst(enemy.x, enemy.y, 0x60ffd8, 38);
      if (state.boss && boss) {
        this.options.controller.note(`${boss.name} 的核心暴露了，贴近后按 K 吞噬。`);
      }
      return;
    }

    if (state.lastEvent === "grab-blocked" && state.boss && boss) {
      this.options.controller.note(`${boss.name} 的权限护甲弹开触手，先撕开护甲再拖拽。`);
    }
  }

  private syncBossHud(enemy?: Phaser.Physics.Arcade.Sprite): void {
    const bossEnemy =
      enemy ??
      (this.enemies
        .getChildren()
        .find((object) => object.active && Boolean((object as Phaser.Physics.Arcade.Sprite).getData("bossId"))) as
        | Phaser.Physics.Arcade.Sprite
        | undefined);
    const boss = this.options.controller.currentBoss();
    if (!bossEnemy || !boss) {
      this.options.controller.setCodeLifeBossHud(undefined);
      return;
    }

    const combat = this.getCombatState(bossEnemy);
    const hp = Math.max(0, Math.ceil(combat?.hp ?? (bossEnemy.getData("hp") as number)));
    const maxHp = Math.max(1, Math.ceil(combat?.maxHp ?? (bossEnemy.getData("maxHp") as number)));
    const runtimeBoss = combat?.boss;
    const phaseCount = runtimeBoss?.phaseCount ?? Math.max(1, boss.phases.length);
    const hpRatio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    const fallbackPhaseIndex = Phaser.Math.Clamp(Math.floor((1 - hpRatio) * phaseCount), 0, phaseCount - 1);
    const phaseIndex = Phaser.Math.Clamp(runtimeBoss?.phaseIndex ?? fallbackPhaseIndex, 0, phaseCount - 1);
    const shieldRatio = runtimeBoss ? Phaser.Math.Clamp(runtimeBoss.armor / Math.max(1, runtimeBoss.maxArmor), 0, 1) : 0;
    const weaknesses = getCodeLifeDeviceWeaknesses(boss.id);
    const windowLabel = runtimeBoss?.window === "devour" ? " / DEVOUR WINDOW" : runtimeBoss?.window === "damage" ? " / ARMOR OPEN" : ""; /*
      runtimeBoss?.window === "devour" ? " / 可吞噬" : runtimeBoss?.window === "damage" ? " / 破甲" : "";
*/
    const snapshot: CodeLifeBossRuntimeHud = {
      id: boss.id,
      name: boss.name,
      hp,
      maxHp,
      phaseIndex,
      phaseCount,
      phaseLabel: `${runtimeBoss?.phaseName ?? boss.phases[phaseIndex] ?? boss.phases[0] ?? "PHASE"}${windowLabel}`,
      state:
        combat?.status === "dead" || combat?.status === "devoured"
          ? "defeated"
          : runtimeBoss?.window === "devour" || hpRatio < 0.18
            ? "enraged"
            : "phase",
      shieldRatio,
      window: runtimeBoss?.window,
      windowRemainingMs: runtimeBoss ? Math.round(runtimeBoss.windowRemaining * 1000) : undefined,
      weaknessLabel: weaknesses.length > 0 ? weaknesses.map((weakness) => weakness.replaceAll("-", " ")).join(" + ") : undefined,
    };
    this.options.controller.setCodeLifeBossHud(snapshot);
  }

  private playSfx(id: CodeLifeSfxId, intensity = 1, position?: Readonly<{ x: number; y: number }>): void {
    const now = this.scene.time.now;
    const patch = getCodeLifeAudioPatch(id);
    if (now < (this.audioCooldownUntil.get(id) ?? 0)) {
      return;
    }
    this.audioCooldownUntil.set(id, now + patch.cooldownMs);

    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }
    if (context.state === "suspended") {
      context.resume().catch(() => undefined);
    }
    this.startAmbience(context);
    const spatial = this.createSfxSpatialMix(position ?? { x: this.core.x, y: this.core.y });
    triggerCodeLifeAudio(context, id, {
      intensity,
      volume: 0.42,
      pitchShiftCents: Phaser.Math.Between(-18, 18),
      position: position ?? { x: this.core.x, y: this.core.y },
      pan: spatial.pan,
      distanceGain: spatial.distanceGain,
    });
  }

  private tryStartAmbienceFromInput(): void {
    if (this.ambience) {
      return;
    }
    const pointer = this.scene.input.activePointer;
    const movementKeyDown =
      this.options.cursors.left.isDown ||
      this.options.cursors.right.isDown ||
      this.options.cursors.up.isDown ||
      this.options.cursors.down.isDown ||
      this.options.cursors.space?.isDown === true;
    const actionKeyDown = Object.values(this.options.keys).some((key) => key.isDown);
    if (!pointer.isDown && !movementKeyDown && !actionKeyDown) {
      return;
    }
    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }
    if (context.state === "suspended") {
      context.resume().catch(() => undefined);
    }
    this.startAmbience(context);
  }

  private createSfxSpatialMix(position: Readonly<{ x: number; y: number }>): { pan: number; distanceGain: number } {
    const camera = this.scene.cameras.main;
    const cameraCenterX = camera.scrollX + camera.width / 2;
    const pan = Phaser.Math.Clamp((position.x - cameraCenterX) / Math.max(1, camera.width * 0.48), -0.82, 0.82);
    const distance = Phaser.Math.Distance.Between(this.core.x, this.core.y, position.x, position.y);
    const distanceGain = Phaser.Math.Clamp(1 - distance / 1280, 0.34, 1);
    return { pan, distanceGain };
  }

  private ensureAudioContext(): AudioContext | undefined {
    if (this.audioContext && this.audioContext.state !== "closed") {
      return this.audioContext;
    }
    if (typeof window === "undefined") {
      return undefined;
    }
    const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) {
      return undefined;
    }
    this.audioContext = new AudioContextConstructor();
    return this.audioContext;
  }

  private startAmbience(context: AudioContext): void {
    if (this.ambience) {
      return;
    }
    const mix = this.createCurrentAmbienceMix();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const bossGain = context.createGain();
    const bossSource = context.createOscillator();
    const sources = mix.harmonicRatios.map((ratio, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(mix.baseFrequencyHz * ratio, context.currentTime);
      oscillator.detune.setValueAtTime(index * 6 - 5, context.currentTime);
      oscillator.connect(filter);
      oscillator.start();
      return oscillator;
    });
    bossSource.type = "sawtooth";
    bossSource.frequency.setValueAtTime(mix.bossFrequencyHz, context.currentTime);
    bossSource.connect(bossGain);
    bossGain.connect(filter);
    bossGain.gain.setValueAtTime(mix.bossGain, context.currentTime);
    bossSource.start();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(mix.filterFrequencyHz, context.currentTime);
    filter.Q.setValueAtTime(0.72, context.currentTime);
    gain.gain.setValueAtTime(mix.masterGain, context.currentTime);
    filter.connect(gain);
    gain.connect(context.destination);
    this.ambience = { gain, filter, sources, bossGain, bossSource, lastMode: mix.mode };
  }

  private updateAmbienceMix(): void {
    if (!this.audioContext || !this.ambience || this.audioContext.state === "closed") {
      return;
    }
    const mix = this.createCurrentAmbienceMix();
    const now = this.audioContext.currentTime;
    this.ambience.gain.gain.cancelScheduledValues(now);
    this.ambience.gain.gain.linearRampToValueAtTime(mix.masterGain, now + 0.32);
    this.ambience.filter.frequency.cancelScheduledValues(now);
    this.ambience.filter.frequency.linearRampToValueAtTime(mix.filterFrequencyHz, now + 0.42);
    this.ambience.bossGain.gain.cancelScheduledValues(now);
    this.ambience.bossGain.gain.linearRampToValueAtTime(mix.bossGain, now + 0.28);
    this.ambience.bossSource.frequency.cancelScheduledValues(now);
    this.ambience.bossSource.frequency.linearRampToValueAtTime(mix.bossFrequencyHz, now + 0.4);
    for (const [index, source] of this.ambience.sources.entries()) {
      source.frequency.cancelScheduledValues(now);
      source.frequency.linearRampToValueAtTime(mix.baseFrequencyHz * (mix.harmonicRatios[index] ?? 1), now + 0.5);
    }
    if (this.ambience.lastMode !== mix.mode && mix.mode !== "explore") {
      this.playSfx(mix.mode === "devour-window" ? "devour" : "device-overload", 0.28);
    }
    this.ambience.lastMode = mix.mode;
  }

  private createCurrentAmbienceMix(): CodeLifeAmbienceMix {
    return createCodeLifeAmbienceMix({
      chapterId: this.chapter.id,
      mass: this.mass,
      integrity: this.options.controller.state.integrity,
      maxIntegrity: this.options.controller.state.maxIntegrity,
      boss: this.options.controller.state.codeLifeBoss,
    });
  }

  private stopAmbience(): void {
    if (!this.ambience) {
      return;
    }
    for (const source of this.ambience.sources) {
      try {
        source.stop();
      } catch {
        // The context may already be closed during scene teardown.
      }
    }
    try {
      this.ambience.bossSource.stop();
    } catch {
      // The context may already be closed during scene teardown.
    }
    this.ambience.bossGain.disconnect();
    this.ambience.filter.disconnect();
    this.ambience.gain.disconnect();
    this.ambience = undefined;
  }

  private toPhaserBlendMode(blendMode: CodeLifeBlendMode): Phaser.BlendModes {
    if (blendMode === "ADD") {
      return Phaser.BlendModes.ADD;
    }
    if (blendMode === "MULTIPLY") {
      return Phaser.BlendModes.MULTIPLY;
    }
    if (blendMode === "SCREEN") {
      return Phaser.BlendModes.SCREEN;
    }
    return Phaser.BlendModes.NORMAL;
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
      const distance = Phaser.Math.Distance.Between(this.core.x, this.core.y, object.x, object.y);
      if (distance <= nearestDistance) {
        nearest = object;
        nearestDistance = distance;
      }
    }
    return nearest;
  }
}

function centerRect(rect: { x: number; y: number; width: number; height: number }): LayoutRect {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    width: rect.width,
    height: rect.height,
  };
}

function normalizePassageTargetLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenizePassageTarget(label: string): string[] {
  return normalizePassageTargetLabel(label)
    .split(" ")
    .filter((word) => word.length >= 2);
}

function degreesToRadians(degrees: number): number {
  return (degrees / 180) * Math.PI;
}

function seededVisualUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

import { describe, expect, it } from "vitest";
import type { BossDef, ChapterDef, ChapterId, CodeLifeBossRuntimeHud, GameUiPayload } from "../../types";
import {
  CODE_LIFE_ABILITY_INPUT_LABELS,
  createCodeLifeHudRenderModel,
  createCodeLifeHudStateFromGamePayload,
  formatCodeLifeHudForDebug,
  renderCodeLifeHudToDom,
  type CodeLifeHudDomRefs,
  type CodeLifeHudState,
} from "./CodeLifeHud";

const chapterIds = [
  "cursor-hunt",
  "wrong-gateway",
  "code-rebirth",
  "trash-mountain",
  "p-drive",
  "leder-d-drive",
  "c-wall",
  "leder-c-drive",
  "router-core",
  "nas-graveyard",
  "camera-eye",
  "printer-belly",
  "speaker-voiceprint",
  "dev-board",
] as const satisfies readonly ChapterId[];

const chapter: ChapterDef = {
  id: "trash-mountain",
  index: 5,
  title: "Trash Mountain",
  shortTitle: "Trash",
  theme: "trash",
  objective: "Find the gateway",
  flowNote: "",
  keyBeats: [],
  palette: {
    background: 0,
    platform: 0,
    accent: 0,
    danger: 0,
    particle: 0,
  },
  bossIds: ["gateway-warden"],
  rewardAbilityIds: [],
  requiredAbilityIds: [],
  collectibleLabel: "Shard",
  exitLabel: "Gateway",
};

const boss: BossDef = {
  id: "gateway-warden",
  order: 1,
  name: "Gateway Warden",
  location: "Trash Mountain",
  rewardLabel: "LAN Traverse",
  rewardAbilityId: "lan-traverse",
  attacks: [],
  phases: ["Route Table", "Port Reset", "LAN Door"],
  victoryText: "",
  color: 0,
  hp: 160,
};

interface FakeElement {
  hidden: boolean;
  textContent: string;
  dataset: Record<string, string>;
  style: {
    width?: string;
    vars: Record<string, string>;
    setProperty(name: string, value: string): void;
  };
  ownerDocument: {
    createElement(tagName: string): FakeElement;
  };
  children: FakeElement[];
  replaceChildren(...children: FakeElement[]): void;
}

function createCollectibles(overrides: Partial<Record<ChapterId, number>> = {}): Record<ChapterId, number> {
  return {
    ...Object.fromEntries(chapterIds.map((chapterId) => [chapterId, 0])),
    ...overrides,
  } as Record<ChapterId, number>;
}

function createPayload(): GameUiPayload {
  return {
    status: "running",
    state: {
      version: 1,
      prompt: "",
      customization: {
        body: "round",
        personality: "curious",
        startingSkill: "wall-stick",
        petSpecies: "cat",
      },
      currentChapterIndex: chapter.index,
      integrity: 40,
      maxIntegrity: 100,
      codeLifeMass: 0,
      memoryFragments: 5,
      abilities: ["cling", "devour-code"],
      defeatedBosses: [],
      chapterCollectibles: createCollectibles({ "trash-mountain": 2 }),
      flags: {},
      endingBias: {
        freedom: 0,
        hunger: 0,
        transcendence: 0,
        rescue: 0,
      },
      log: [],
    },
    chapter,
    currentBoss: boss,
    abilityNames: ["Cling", "Devour"],
    message: "Routing unstable",
  };
}

function createFakeElement(): FakeElement {
  const element = {
    hidden: false,
    textContent: "",
    dataset: {},
    style: {
      vars: {},
      setProperty(name: string, value: string): void {
        this.vars[name] = value;
      },
    },
    ownerDocument: {
      createElement: () => createFakeElement(),
    },
    children: [],
    replaceChildren(...children: FakeElement[]): void {
      this.children = children;
    },
  } satisfies FakeElement;

  return element;
}

describe("CodeLifeHud payload conversion", () => {
  it("maps late device abilities to their runtime interaction keys", () => {
    expect(CODE_LIFE_ABILITY_INPUT_LABELS["vision-takeover"]).toBe("Q");
    expect(CODE_LIFE_ABILITY_INPUT_LABELS["material-mark"]).toBe("K");
    expect(CODE_LIFE_ABILITY_INPUT_LABELS["voiceprint-disguise"]).toBe("L");
    expect(CODE_LIFE_ABILITY_INPUT_LABELS["hardware-parasite"]).toBe("E");
  });

  it("derives a stable render model from the game UI payload", () => {
    const state = createCodeLifeHudStateFromGamePayload(createPayload());
    const model = createCodeLifeHudRenderModel(state);

    expect(model.integrity).toEqual({
      label: "INTEGRITY",
      valueLabel: "40/100",
      ratio: 0.4,
      tone: "warning",
    });
    expect(model.mass.valueLabel).toBe("68/285");
    expect(model.mass.ratio).toBeCloseTo(68 / 285);
    expect(model.mass.segments).toBe(3);
    expect(model.mass.formLabel).toBe("细线体");
    expect(model.mass.instabilityLabel).toBe("DRIFT 16%");
    expect(model.currentAbility).toMatchObject({
      id: "devour-code",
      label: "Devour",
      inputLabel: "K",
      isCurrent: true,
    });
    expect(model.abilities.map((ability) => [ability.id, ability.inputLabel, ability.isCurrent])).toEqual([
      ["cling", "SPACE", false],
      ["devour-code", "K", true],
    ]);
    expect(model.boss).toMatchObject({
      name: "Gateway Warden",
      phaseLabel: "Route Table",
      phaseCounterLabel: "PHASE 1/3",
      shieldRatio: 0,
    });
    expect(model.boss?.hp.valueLabel).toBe("160/160");
    expect(model.statusLine).toBe("Routing unstable | ABILITY Devour");
    expect(model.cssVars).toEqual({
      "--code-life-integrity": "40%",
      "--code-life-mass": "24%",
      "--code-life-boss-hp": "100%",
      "--code-life-boss-shield": "0%",
    });
  });

  it("marks the latest unlocked ability as new from payload metadata", () => {
    const payload = createPayload();
    payload.lastUnlockedAbility = { id: "devour-code", name: "Devour" };
    const model = createCodeLifeHudRenderModel(createCodeLifeHudStateFromGamePayload(payload));

    expect(model.abilities.find((ability) => ability.id === "devour-code")?.isNew).toBe(true);
    expect(model.abilities.find((ability) => ability.id === "cling")?.isNew).toBe(false);
  });

  it("honors overrides without mutating authored ability readiness", () => {
    const ability = {
      id: "permission-rend",
      label: "Permission Rend",
      inputLabel: "J",
      readiness: "cooldown" as const,
      cooldownRatio: 0.45,
      chargeRatio: 0.25,
      isNew: true,
    };
    const state = createCodeLifeHudStateFromGamePayload(createPayload(), {
      abilities: [ability],
      currentAbilityId: "permission-rend",
      message: "Permission wall",
      warnings: [{ id: "gate", label: "ACCESS DENIED", tone: "locked" }],
      objective: { progressLabel: "2/3 keys" },
      boss: {
        hp: 40,
        maxHp: 160,
        phaseIndex: 1,
        phaseCount: 3,
        phaseLabel: "Port Reset",
        state: "enraged",
        shieldRatio: 0.66,
        window: "damage",
        windowRemainingMs: 2300,
        weaknessLabel: "permission laser",
      },
    });
    const model = createCodeLifeHudRenderModel(state);

    expect(model.currentAbility).toMatchObject({
      id: "permission-rend",
      cooldownRatio: 0.45,
      chargeRatio: 0.25,
      isNew: true,
    });
    expect(model.warningText).toBe("ACCESS DENIED");
    expect(model.objective.progressLabel).toBe("2/3 keys");
    expect(model.boss?.hp.ratio).toBe(0.25);
    expect(model.boss?.hp.tone).toBe("danger");
    expect(model.boss?.phaseCounterLabel).toBe("PHASE 2/3");
    expect(model.boss?.shieldRatio).toBe(0.66);
    expect(model.boss?.shieldLabel).toBe("ARMOR 66%");
    expect(model.boss?.windowLabel).toBe("WINDOW DAMAGE 2.3s");
    expect(model.boss?.weaknessLabel).toBe("WEAK permission laser");
    expect(model.statusLine).toBe("Permission wall | ABILITY Permission Rend");
  });

  it("accepts a realtime boss runtime snapshot as the boss HUD override", () => {
    const payload = createPayload();
    const runtimeBoss = {
      id: "gateway-warden",
      name: "Gateway Warden",
      hp: 47,
      maxHp: 160,
      phaseIndex: 2,
      phaseCount: 3,
      phaseLabel: "LAN Door",
      state: "enraged",
      shieldRatio: 0.2,
      window: "devour",
      windowRemainingMs: 1800,
      weaknessLabel: "permission laser",
    } satisfies CodeLifeBossRuntimeHud;

    payload.state.codeLifeBoss = runtimeBoss;

    const state = createCodeLifeHudStateFromGamePayload(payload, {
      boss: payload.state.codeLifeBoss,
    });
    const model = createCodeLifeHudRenderModel(state);

    expect(state.boss).toEqual(runtimeBoss);
    expect(model.boss?.name).toBe("Gateway Warden");
    expect(model.boss?.hp.valueLabel).toBe("47/160");
    expect(model.boss?.hp.ratio).toBeCloseTo(47 / 160);
    expect(model.boss?.hp.tone).toBe("danger");
    expect(model.boss?.phaseCounterLabel).toBe("PHASE 3/3");
    expect(model.boss?.phaseLabel).toBe("LAN Door");
    expect(model.cssVars["--code-life-boss-hp"]).toBe("29%");
    expect(model.cssVars["--code-life-boss-shield"]).toBe("20%");
    expect(model.boss?.windowLabel).toBe("WINDOW DEVOUR 1.8s");
    expect(model.boss?.weaknessLabel).toBe("WEAK permission laser");
  });
});

describe("CodeLifeHud render boundaries", () => {
  it("clamps meter, ability, boss, and CSS ratios for edge-case state", () => {
    const state: CodeLifeHudState = {
      integrity: { current: -4, max: 0, label: "INTEGRITY", tone: "danger" },
      mass: { current: 250, max: 120, label: "MASS", segments: -2, instability: 3 },
      currentAbility: {
        id: "breach",
        label: "Breach",
        readiness: "charging",
        cooldownRatio: 3,
        chargeRatio: -2,
      },
      abilities: [
        {
          id: "breach",
          label: "Breach",
          readiness: "charging",
          cooldownRatio: 3,
          chargeRatio: -2,
          isCurrent: true,
          isNew: true,
        },
      ],
      boss: {
        id: "boss",
        name: "Boundary Boss",
        hp: 999,
        maxHp: 200,
        phaseIndex: 9,
        phaseCount: 3,
        phaseLabel: "Final",
        state: "enraged",
        shieldRatio: 5,
      },
      devourPrompt: {
        visible: true,
        targetLabel: "Cache",
        actionLabel: "DEVOUR",
        holdRatio: 0.5,
        canDevour: false,
      },
      objective: {
        chapterId: "test",
        chapterTitle: "Boundary",
        primary: "Stay finite",
      },
      warnings: [
        { id: "low", label: "LOW HP", tone: "danger" },
        { id: "lock", label: "LOCKED", tone: "locked" },
      ],
      message: "Pinned",
    };
    const model = createCodeLifeHudRenderModel(state);

    expect(model.integrity.valueLabel).toBe("0/1");
    expect(model.integrity.ratio).toBe(0);
    expect(model.mass.valueLabel).toBe("250/120");
    expect(model.mass.ratio).toBe(1);
    expect(model.mass.segments).toBe(0);
    expect(model.mass.instabilityLabel).toBe("DRIFT 100%");
    expect(model.currentAbility?.cooldownRatio).toBe(1);
    expect(model.currentAbility?.chargeRatio).toBe(0);
    expect(model.abilities[0].isNew).toBe(true);
    expect(model.boss?.hp.ratio).toBe(1);
    expect(model.boss?.hp.tone).toBe("danger");
    expect(model.boss?.phaseCounterLabel).toBe("PHASE 3/3");
    expect(model.boss?.shieldRatio).toBe(1);
    expect(model.warningText).toBe("LOW HP / LOCKED");
    expect(model.statusLine).toBe("Pinned | ABILITY Breach | DEVOUR");
    expect(model.cssVars).toEqual({
      "--code-life-integrity": "0%",
      "--code-life-mass": "100%",
      "--code-life-boss-hp": "100%",
      "--code-life-boss-shield": "100%",
    });
  });

  it("formats debug lines for absent optional HUD sections", () => {
    const state: CodeLifeHudState = {
      integrity: { current: 88, max: 100, label: "INTEGRITY" },
      mass: { current: 32, max: 100, label: "MASS", segments: 2, instability: 0.12 },
      abilities: [],
      objective: {
        chapterId: "quiet",
        chapterTitle: "Quiet Chapter",
        primary: "Keep moving",
      },
      warnings: [],
    };

    expect(formatCodeLifeHudForDebug(state)).toEqual([
      "Quiet Chapter: Keep moving",
      "INTEGRITY 88/100",
      "MASS 32/100 DRIFT 12%",
      "ABILITY NONE",
      "BOSS NONE",
      "DEVOUR NONE",
      "WARN NONE",
    ]);
  });

  it("renders to simple element fakes without a browser DOM", () => {
    const state = createCodeLifeHudStateFromGamePayload(createPayload(), {
      devourPrompt: {
        visible: true,
        targetLabel: "Gateway Cache",
        actionLabel: "DEVOUR",
        holdRatio: 0.75,
        canDevour: true,
        rewardPreview: "LAN",
      },
    });
    const root = createFakeElement();
    const integrityBar = createFakeElement();
    const massBar = createFakeElement();
    const abilityStrip = createFakeElement();
    const bossRef = createFakeElement();
    const devourPrompt = createFakeElement();
    const warnings = createFakeElement();
    const refs = {
      root,
      integrityBar,
      massBar,
      currentAbility: createFakeElement(),
      abilityStrip,
      boss: bossRef,
      bossBar: createFakeElement(),
      devourPrompt,
      objectiveTitle: createFakeElement(),
      objectiveBody: createFakeElement(),
      warnings,
      statusLine: createFakeElement(),
    } as unknown as CodeLifeHudDomRefs;

    const model = renderCodeLifeHudToDom(state, refs);

    expect(model.statusLine).toBe("Routing unstable | ABILITY Devour | DEVOUR");
    expect(root.dataset).toEqual({ tone: "warning", boss: "true" });
    expect(root.style.vars["--code-life-integrity"]).toBe("40%");
    expect(integrityBar.style.width).toBe("40%");
    expect(integrityBar.dataset.tone).toBe("warning");
    expect(massBar.style.width).toBe("24%");
    expect(abilityStrip.children.map((child) => child.dataset)).toEqual([
      { id: "cling", readiness: "ready", current: "false", new: "false" },
      { id: "devour-code", readiness: "ready", current: "true", new: "false" },
    ]);
    expect(abilityStrip.children.map((child) => child.textContent)).toEqual(["SPACE Cling", "K Devour"]);
    expect(bossRef.hidden).toBe(false);
    expect(bossRef.textContent).toContain("ARMOR");
    expect(devourPrompt.hidden).toBe(false);
    expect(devourPrompt.dataset.enabled).toBe("true");
    expect(devourPrompt.textContent).toBe("DEVOUR Gateway Cache / HOLD 75% / READY -> LAN");
    expect(warnings.hidden).toBe(true);
  });

  it("preserves locked ability readiness in DOM chips", () => {
    const state = createCodeLifeHudStateFromGamePayload(createPayload(), {
      abilities: [
        {
          id: "devour-code",
          label: "Devour",
          inputLabel: "K",
          readiness: "ready",
          cooldownRatio: 0,
        },
        {
          id: "permission-rend",
          label: "Permission Rend",
          inputLabel: "J",
          readiness: "locked",
          cooldownRatio: 0,
        },
      ],
      currentAbilityId: "devour-code",
    });
    const abilityStrip = createFakeElement();

    renderCodeLifeHudToDom(state, { abilityStrip } as unknown as CodeLifeHudDomRefs);

    expect(abilityStrip.children).toHaveLength(2);
    expect(abilityStrip.children[0].dataset).toEqual({
      id: "devour-code",
      readiness: "ready",
      current: "true",
      new: "false",
    });
    expect(abilityStrip.children[1].dataset).toEqual({
      id: "permission-rend",
      readiness: "locked",
      current: "false",
      new: "false",
    });
    expect(abilityStrip.children[1].textContent).toBe("J Permission Rend");
  });

  it("compacts long late-game ability strips without hiding the current ability", () => {
    const abilities = Array.from({ length: 20 }, (_, index) => ({
      id: `ability-${index}`,
      label: `Ability ${index}`,
      inputLabel: index % 2 === 0 ? "E" : "J",
      readiness: "ready" as const,
      cooldownRatio: 0,
    }));
    const state = createCodeLifeHudStateFromGamePayload(createPayload(), {
      abilities,
      currentAbilityId: "ability-10",
    });
    const model = createCodeLifeHudRenderModel(state);

    expect(model.abilities).toHaveLength(12);
    expect(model.abilities.slice(0, 4).map((ability) => ability.id)).toEqual(["ability-0", "ability-1", "ability-2", "ability-3"]);
    expect(model.abilities.some((ability) => ability.id === "ability-10" && ability.isCurrent)).toBe(true);
    expect(model.abilities.at(-1)).toMatchObject({
      id: "__overflow",
      inputLabel: "MEM",
      label: "+9",
      readiness: "charging",
    });
  });
});

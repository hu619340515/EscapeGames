import { describe, expect, it } from "vitest";
import type { BossDef, ChapterDef, ChapterId, GameUiPayload, PlayerCustomization } from "../game/types";
import type { DomUiRefs } from "./refs";
import { renderHudAndEnding } from "./gameStateRenderer";

interface FakeElement {
  hidden: boolean;
  textContent: string;
  dataset: Record<string, string>;
  style: {
    width?: string;
    setProperty(name: string, value: string): void;
  };
  ownerDocument: {
    createElement(tagName: string): FakeElement;
  };
  children: FakeElement[];
  replaceChildren(...children: FakeElement[]): void;
}

const customization: PlayerCustomization = {
  body: "round",
  personality: "curious",
  startingSkill: "wall-stick",
  petSpecies: "cat",
};

const chapter: ChapterDef = {
  id: "trash-mountain",
  index: 5,
  title: "第 5 章：垃圾山攀爬",
  shortTitle: "垃圾山",
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
  collectibleLabel: "数据肉",
  exitLabel: "网关入口",
};

const boss: BossDef = {
  id: "gateway-warden",
  order: 1,
  name: "网关守门进程",
  location: "垃圾山",
  rewardLabel: "LAN Traverse",
  rewardAbilityId: "lan-traverse",
  attacks: [],
  phases: ["路由表展开", "端口重置", "LAN 门撕开"],
  victoryText: "",
  color: 0,
  hp: 160,
};

function createFakeElement(): FakeElement {
  return {
    hidden: false,
    textContent: "",
    dataset: {},
    style: {
      setProperty(): void {
        return;
      },
    },
    ownerDocument: {
      createElement: () => createFakeElement(),
    },
    children: [],
    replaceChildren(...children: FakeElement[]): void {
      this.children = children;
    },
  };
}

function createRefs(): DomUiRefs {
  const refs = {
    hud: createFakeElement(),
    start: createFakeElement(),
    createPet: createFakeElement(),
    petDraw: createFakeElement(),
    pause: createFakeElement(),
    ending: createFakeElement(),
    gmPanel: createFakeElement(),
    coverStage: createFakeElement(),
    prompt: createFakeElement(),
    body: createFakeElement(),
    personality: createFakeElement(),
    startingSkill: createFakeElement(),
    chapter: createFakeElement(),
    objective: createFakeElement(),
    integrityBar: createFakeElement(),
    integrityText: createFakeElement(),
    massBar: createFakeElement(),
    massText: createFakeElement(),
    boss: createFakeElement(),
    bossBar: createFakeElement(),
    currentAbility: createFakeElement(),
    stats: createFakeElement(),
    abilities: createFakeElement(),
    warnings: createFakeElement(),
    devourPrompt: createFakeElement(),
    statusLine: createFakeElement(),
    log: createFakeElement(),
    endingTitle: createFakeElement(),
    endingBody: createFakeElement(),
    achievementsBody: createFakeElement(),
    coverToast: createFakeElement(),
    continueButton: createFakeElement(),
    gmChapterSelect: createFakeElement(),
    createPetPromptLead: createFakeElement(),
    createPetPromptTrail: createFakeElement(),
    createPetSendButton: createFakeElement(),
    createPetCloseButton: createFakeElement(),
    slotReels: [createFakeElement(), createFakeElement(), createFakeElement()],
    slotSpinButton: createFakeElement(),
    slotConfirmButton: createFakeElement(),
  };

  return refs as unknown as DomUiRefs;
}

function createPayload(): GameUiPayload {
  return {
    status: "running",
    state: {
      version: 1,
      prompt: "test",
      customization,
      currentChapterIndex: 4,
      integrity: 88,
      maxIntegrity: 100,
      codeLifeMass: 0.82,
      memoryFragments: 0,
      abilities: ["cling", "devour-code"],
      defeatedBosses: [],
      chapterCollectibles: { "trash-mountain": 2 } as Record<ChapterId, number>,
      flags: {},
      endingBias: {
        freedom: 0,
        hunger: 0,
        transcendence: 0,
        rescue: 0,
      },
      log: ["loaded"],
    },
    chapter,
    currentBoss: boss,
    abilityNames: ["攀附", "代码吞噬"],
    message: "运行中",
  };
}

function asFakeElement(element: HTMLElement): FakeElement {
  return element as unknown as FakeElement;
}

describe("renderHudAndEnding CodeLife mode", () => {
  it("renders form labels and ignores stale boss runtime snapshots", () => {
    const refs = createRefs();
    const payload = createPayload();
    payload.state.codeLifeBoss = {
      id: "other-boss",
      name: "过期 Boss",
      hp: 1,
      maxHp: 999,
      phaseIndex: 2,
      phaseCount: 3,
      phaseLabel: "stale",
      state: "enraged",
    };
    globalThis.document = {
      createElement: () => createFakeElement() as unknown as HTMLElement,
    } as unknown as Document;

    renderHudAndEnding(payload, refs);

    expect(refs.hud.dataset.mode).toBe("code-life");
    expect(refs.hud.dataset.hudMode).toBe("code-life");
    expect(refs.chapter.textContent).toBe("垃圾山");
    expect(refs.objective.textContent).toContain("运行中");
    expect(refs.boss.textContent).toContain("网关守门进程 / 160/160");
    expect(refs.boss.textContent).not.toContain("1/999");
    expect(refs.stats.textContent).toContain("细线体");
    expect(asFakeElement(refs.abilities).children.map((child) => child.textContent)).toEqual(["SPACE 攀附", "K 代码吞噬"]);
    expect(refs.log.hidden).toBe(false);
    expect(asFakeElement(refs.log).children.map((child) => child.textContent)).toEqual(["loaded"]);
  });

  it("uses matching realtime boss runtime snapshots in CodeLife HUD", () => {
    const refs = createRefs();
    const payload = createPayload();
    payload.state.codeLifeBoss = {
      id: "gateway-warden",
      name: "Runtime Gateway",
      hp: 47,
      maxHp: 160,
      phaseIndex: 2,
      phaseCount: 3,
      phaseLabel: "LAN Door",
      state: "enraged",
    };
    globalThis.document = {
      createElement: () => createFakeElement() as unknown as HTMLElement,
    } as unknown as Document;

    renderHudAndEnding(payload, refs);

    expect(refs.hud.dataset.boss).toBe("true");
    expect(refs.boss.textContent).toContain("47/160");
    expect(refs.boss.textContent).toContain("PHASE 3/3");
    expect(refs.boss.textContent).toContain("LAN Door");
    expect(refs.bossBar.style.width).toBe("29%");
  });

  it("surfaces realtime boss bite and devour windows as CodeLife prompts", () => {
    const refs = createRefs();
    const payload = createPayload();
    payload.state.codeLifeBoss = {
      id: "gateway-warden",
      name: "Runtime Gateway",
      hp: 20,
      maxHp: 160,
      phaseIndex: 2,
      phaseCount: 3,
      phaseLabel: "LAN Door",
      state: "enraged",
      window: "devour",
      windowRemainingMs: 1800,
    };
    globalThis.document = {
      createElement: () => createFakeElement() as unknown as HTMLElement,
    } as unknown as Document;

    renderHudAndEnding(payload, refs);

    expect(refs.devourPrompt.hidden).toBe(false);
    expect(refs.devourPrompt.dataset.enabled).toBe("true");
    expect(refs.devourPrompt.textContent).toContain("K / DEVOUR / 1.8s");

    payload.state.codeLifeBoss = {
      ...payload.state.codeLifeBoss,
      window: "closed",
      windowRemainingMs: 0,
    };
    renderHudAndEnding(payload, refs);

    expect(refs.devourPrompt.hidden).toBe(true);
  });

  it("surfaces gate denial messages in the CodeLife objective line", () => {
    const refs = createRefs();
    const payload = createPayload();
    payload.message = "需要 permission-rend 才能穿过这层权限膜。";
    globalThis.document = {
      createElement: () => createFakeElement() as unknown as HTMLElement,
    } as unknown as Document;

    renderHudAndEnding(payload, refs);

    expect(refs.objective.textContent).toContain("需要 permission-rend");
  });
});

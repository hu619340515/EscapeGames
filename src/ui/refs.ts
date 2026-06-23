export interface DomUiRefs {
  hud: HTMLElement;
  start: HTMLElement;
  createPet: HTMLElement;
  petDraw: HTMLElement;
  pause: HTMLElement;
  ending: HTMLElement;
  gmPanel: HTMLElement;
  coverStage: HTMLElement;
  prompt: HTMLInputElement;
  body: HTMLSelectElement;
  personality: HTMLSelectElement;
  startingSkill: HTMLSelectElement;
  chapter: HTMLElement;
  objective: HTMLElement;
  integrityHearts: HTMLElement;
  integrityBar: HTMLElement;
  integrityText: HTMLElement;
  massBar: HTMLElement;
  massText: HTMLElement;
  boss: HTMLElement;
  bossBar: HTMLElement;
  currentAbility: HTMLElement;
  stats: HTMLElement;
  abilities: HTMLElement;
  warnings: HTMLElement;
  devourPrompt: HTMLElement;
  statusLine: HTMLElement;
  log: HTMLElement;
  endingTitle: HTMLElement;
  endingBody: HTMLElement;
  achievementsBody: HTMLElement;
  coverToast: HTMLElement;
  continueButton: HTMLButtonElement;
  gmChapterSelect: HTMLSelectElement;
  createPetPromptLead: HTMLElement;
  createPetPromptTrail: HTMLElement;
  createPetSendButton: HTMLButtonElement;
  createPetCloseButton: HTMLButtonElement;
  slotReels: HTMLElement[];
  slotSpinButton: HTMLButtonElement;
  slotConfirmButton: HTMLButtonElement;
}

function queryRequired<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing UI element: ${selector}`);
  }
  return element;
}

export function collectDomUiRefs(root: HTMLElement): DomUiRefs {
  const slotReels = Array.from(root.querySelectorAll<HTMLElement>('[data-ref="slotReel"]'));
  if (slotReels.length !== 3) {
    throw new Error("Missing UI element: [data-ref=\"slotReel\"]");
  }

  return {
    hud: queryRequired<HTMLElement>(root, '[data-panel="hud"]'),
    start: queryRequired<HTMLElement>(root, '[data-panel="start"]'),
    createPet: queryRequired<HTMLElement>(root, '[data-panel="create-pet"]'),
    petDraw: queryRequired<HTMLElement>(root, '[data-panel="pet-draw"]'),
    pause: queryRequired<HTMLElement>(root, '[data-panel="pause"]'),
    ending: queryRequired<HTMLElement>(root, '[data-panel="ending"]'),
    gmPanel: queryRequired<HTMLElement>(root, '[data-panel="gm"]'),
    coverStage: queryRequired<HTMLElement>(root, '[data-ref="coverStage"]'),
    prompt: queryRequired<HTMLInputElement>(root, '[data-ref="prompt"]'),
    body: queryRequired<HTMLSelectElement>(root, '[data-ref="body"]'),
    personality: queryRequired<HTMLSelectElement>(root, '[data-ref="personality"]'),
    startingSkill: queryRequired<HTMLSelectElement>(root, '[data-ref="startingSkill"]'),
    chapter: queryRequired<HTMLElement>(root, '[data-ref="chapter"]'),
    objective: queryRequired<HTMLElement>(root, '[data-ref="objective"]'),
    integrityHearts: queryRequired<HTMLElement>(root, '[data-ref="integrityHearts"]'),
    integrityBar: queryRequired<HTMLElement>(root, '[data-ref="integrityBar"]'),
    integrityText: queryRequired<HTMLElement>(root, '[data-ref="integrityText"]'),
    massBar: queryRequired<HTMLElement>(root, '[data-ref="massBar"]'),
    massText: queryRequired<HTMLElement>(root, '[data-ref="massText"]'),
    boss: queryRequired<HTMLElement>(root, '[data-ref="boss"]'),
    bossBar: queryRequired<HTMLElement>(root, '[data-ref="bossBar"]'),
    currentAbility: queryRequired<HTMLElement>(root, '[data-ref="currentAbility"]'),
    stats: queryRequired<HTMLElement>(root, '[data-ref="stats"]'),
    abilities: queryRequired<HTMLElement>(root, '[data-ref="abilities"]'),
    warnings: queryRequired<HTMLElement>(root, '[data-ref="warnings"]'),
    devourPrompt: queryRequired<HTMLElement>(root, '[data-ref="devourPrompt"]'),
    statusLine: queryRequired<HTMLElement>(root, '[data-ref="statusLine"]'),
    log: queryRequired<HTMLElement>(root, '[data-ref="log"]'),
    endingTitle: queryRequired<HTMLElement>(root, '[data-ref="endingTitle"]'),
    endingBody: queryRequired<HTMLElement>(root, '[data-ref="endingBody"]'),
    achievementsBody: queryRequired<HTMLElement>(root, '[data-ref="achievementsBody"]'),
    coverToast: queryRequired<HTMLElement>(root, '[data-ref="coverToast"]'),
    continueButton: queryRequired<HTMLButtonElement>(root, '[data-action="continue"]'),
    gmChapterSelect: queryRequired<HTMLSelectElement>(root, '[data-ref="gmChapterSelect"]'),
    createPetPromptLead: queryRequired<HTMLElement>(root, '[data-ref="createPetPromptLead"]'),
    createPetPromptTrail: queryRequired<HTMLElement>(root, '[data-ref="createPetPromptTrail"]'),
    createPetSendButton: queryRequired<HTMLButtonElement>(root, '[data-action="create-pet-send"]'),
    createPetCloseButton: queryRequired<HTMLButtonElement>(root, '[data-action="create-pet-close"]'),
    slotReels,
    slotSpinButton: queryRequired<HTMLButtonElement>(root, '[data-ref="slotSpinButton"]'),
    slotConfirmButton: queryRequired<HTMLButtonElement>(root, '[data-action="slot-confirm"]'),
  };
}

import type { BossDef } from "../../types";
import type {
  CodeLifeBiteOptions,
  CodeLifeBossRuntime,
  CodeLifeBossWindow,
  CodeLifeCombatEvent,
  CodeLifeEnemySource,
  CodeLifeEnemyState,
  CodeLifeGrabOptions,
  CodeLifeHazardOptions,
  CodeLifeIntent,
  CodeLifeMinionDef,
  CodeLifePoint,
  CodeLifeSlamOptions,
} from "./CodeLifeEnemyTypes";

export type {
  CodeLifeBiteOptions,
  CodeLifeBossRuntime,
  CodeLifeBossWindow,
  CodeLifeCombatEvent,
  CodeLifeEnemyKind,
  CodeLifeEnemySource,
  CodeLifeEnemyState,
  CodeLifeEnemyStatus,
  CodeLifeGrabOptions,
  CodeLifeHazardOptions,
  CodeLifeIntent,
  CodeLifeMinionDef,
  CodeLifePoint,
  CodeLifeSlamOptions,
} from "./CodeLifeEnemyTypes";

const ZERO: CodeLifePoint = { x: 0, y: 0 };
const DEFAULT_DEVOUR_HEALTH_RATIO = 0.35;
const DEFAULT_BOSS_DEVOUR_HEALTH_RATIO = 0.16;
const DEFAULT_PATROL_SPEED = 42;
const DEFAULT_ALERT_SPEED = 88;
const DEFAULT_STUN_DURATION = 1.35;
const DEFAULT_SLAM_STUN_FORCE = 120;
const DEFAULT_BITE_DAMAGE = 18;
const DEFAULT_BOSS_WINDOW_DURATION = 2.6;
const DEFAULT_BOSS_ARMOR_RATIO = 0.18;

export function createEnemyState(def: CodeLifeEnemySource, bodyCenter: CodeLifePoint = ZERO): CodeLifeEnemyState {
  const bossDef = isBossDef(def) ? def : undefined;
  const minionDef: CodeLifeMinionDef | undefined = bossDef ? undefined : (def as CodeLifeMinionDef);
  const maxHp = sanitizePositive(def.hp, 1);
  const devourHealthRatio = bossDef
    ? DEFAULT_BOSS_DEVOUR_HEALTH_RATIO
    : minionDef?.devourHealthRatio ?? DEFAULT_DEVOUR_HEALTH_RATIO;
  const phaseLabels = bossDef?.phases.length ? [...bossDef.phases] : [];
  const phaseCount = Math.max(1, phaseLabels.length);
  const boss = bossDef ? createBossRuntime(maxHp, phaseLabels, phaseCount) : undefined;

  return {
    id: def.id,
    name: bossDef?.name ?? minionDef?.name ?? def.id,
    kind: bossDef ? "boss" : "minion",
    color: def.color,
    status: "idle",
    hp: maxHp,
    maxHp,
    center: copyPoint(bodyCenter),
    velocity: { ...ZERO },
    facing: 1,
    age: 0,
    stateTime: 0,
    stunRemaining: 0,
    devourHealthRatio,
    patrolSpeed: bossDef ? DEFAULT_PATROL_SPEED * 0.7 : minionDef?.patrolSpeed ?? DEFAULT_PATROL_SPEED,
    alertSpeed: bossDef ? DEFAULT_ALERT_SPEED * 0.82 : minionDef?.alertSpeed ?? DEFAULT_ALERT_SPEED,
    slamStunForce: bossDef ? DEFAULT_SLAM_STUN_FORCE * 1.25 : minionDef?.slamStunForce ?? DEFAULT_SLAM_STUN_FORCE,
    biteDamage: bossDef
      ? Math.max(DEFAULT_BITE_DAMAGE, Math.round(maxHp * 0.12))
      : minionDef?.biteDamage ?? DEFAULT_BITE_DAMAGE,
    mass: bossDef ? 4 : minionDef?.mass ?? 1,
    intent: createIntent(),
    boss,
    lastEvent: "spawned",
  };
}

export function updateEnemy(state: CodeLifeEnemyState, bodyCenter: CodeLifePoint, dt: number): CodeLifeEnemyState {
  const seconds = normalizeDt(dt);
  let next = cloneState(state);
  const oldCenter = next.center;

  next.center = copyPoint(bodyCenter);
  next.velocity = seconds > 0 ? { x: (bodyCenter.x - oldCenter.x) / seconds, y: (bodyCenter.y - oldCenter.y) / seconds } : { ...ZERO };
  next.age += seconds;
  next.stateTime += seconds;
  next.intent = createIntent();
  next.lastEvent = undefined;

  next = tickBossWindow(next, seconds);

  if (isTerminal(next)) {
    return next;
  }

  if (next.status === "grabbed") {
    next.intent.canBeDragged = true;
    next.intent.dragTo = copyPoint(bodyCenter);
    return next;
  }

  if (next.status === "stunned") {
    next.stunRemaining = Math.max(0, next.stunRemaining - seconds);
    if (next.stunRemaining <= 0) {
      next.status = "alert";
      next.stateTime = 0;
      next.intent.shouldDetachGrab = true;
    }
    return next;
  }

  if (next.status === "idle" && next.stateTime >= 0.75) {
    next.status = "patrol";
    next.stateTime = 0;
    next.lastEvent = "patrol-started";
  }

  if (next.status === "patrol") {
    if (next.stateTime >= 1.8) {
      next.facing = next.facing === 1 ? -1 : 1;
      next.stateTime = 0;
    }
    next.intent.desiredVelocity.x = next.facing * next.patrolSpeed;
  }

  if (next.status === "alert") {
    next.intent.desiredVelocity.x = next.facing * next.alertSpeed;
  }

  return next;
}

export function applyGrab(state: CodeLifeEnemyState, options: CodeLifeGrabOptions = {}): CodeLifeEnemyState {
  const next = cloneState(state);
  if (isTerminal(next)) {
    return next;
  }

  if (next.boss && next.boss.window === "closed" && next.boss.armor > 0) {
    next.status = "alert";
    next.stateTime = 0;
    next.lastEvent = "grab-blocked";
    return next;
  }

  next.status = "grabbed";
  next.stateTime = 0;
  next.grab = { grabbedBy: options.grabbedBy ?? "player", startedAt: options.at ?? next.age };
  next.intent = createIntent({ canBeDragged: true, dragTo: next.center });
  next.lastEvent = "grabbed";
  return next;
}

export function applySlam(state: CodeLifeEnemyState, options: CodeLifeSlamOptions = {}): CodeLifeEnemyState {
  let next = cloneState(state);
  if (isTerminal(next)) {
    return next;
  }

  const force = Math.max(0, options.force ?? DEFAULT_SLAM_STUN_FORCE);
  const damage = Math.max(0, options.damage ?? Math.round(force / Math.max(3.5, next.mass * 3.5)));
  const stunDuration = Math.max(0, options.stunDuration ?? DEFAULT_STUN_DURATION + force / 300);
  const shouldStun = force >= next.slamStunForce;

  next.grab = undefined;
  next.stateTime = 0;
  next.lastEvent = "slammed";

  if (next.boss) {
    if (next.boss.window === "closed" && next.boss.armor > 0) {
      next = damageBossArmor(next, damage);
    } else {
      next = damageBossHealth(next, damage, false);
    }
  } else {
    next = damageMinionHealth(next, damage, "dead");
  }

  if (!isTerminal(next) && shouldStun) {
    next.status = "stunned";
    next.stunRemaining = Math.max(next.stunRemaining, stunDuration);
    next.lastEvent = next.lastEvent === "armor-broken" ? "armor-broken" : "stunned";
  }

  if (next.boss) {
    next = refreshBossDevourWindow(next);
  }

  return next;
}

export function applyBite(state: CodeLifeEnemyState, options: CodeLifeBiteOptions = {}): CodeLifeEnemyState {
  let next = cloneState(state);
  if (isTerminal(next)) {
    return next;
  }

  const consumeWhenPossible = options.consumeWhenPossible ?? true;
  if (consumeWhenPossible && isDevourable(next)) {
    return markDevoured(next);
  }

  const damage = Math.max(0, options.damage ?? next.biteDamage);
  if (next.boss) {
    if (next.boss.window === "closed" && next.boss.armor > 0) {
      next = damageBossArmor(next, Math.ceil(damage * 0.7));
    } else {
      next = damageBossHealth(next, damage, false);
    }
    return refreshBossDevourWindow(next);
  }

  next = damageMinionHealth(next, damage, "dead");
  if (!isTerminal(next)) {
    next.status = next.status === "stunned" ? "stunned" : "alert";
    next.lastEvent = "alerted";
  }

  if (consumeWhenPossible && isDevourable(next)) {
    return markDevoured(next);
  }

  return next;
}

export function applyHazard(state: CodeLifeEnemyState, options: CodeLifeHazardOptions = {}): CodeLifeEnemyState {
  let next = cloneState(state);
  if (isTerminal(next)) {
    return next;
  }

  const damage = Math.max(0, options.damage ?? 24);
  const force = Math.max(0, options.force ?? damage * 2);
  const ignoresArmor = options.ignoresArmor ?? true;

  next.grab = undefined;
  if (next.boss) {
    next = ignoresArmor ? damageBossHealth(next, damage, true) : damageBossArmor(next, damage);
    next = refreshBossDevourWindow(next);
  } else {
    next = damageMinionHealth(next, damage, "dead");
  }

  if (!isTerminal(next) && force >= next.slamStunForce * 0.85) {
    next.status = "stunned";
    next.stunRemaining = Math.max(next.stunRemaining, DEFAULT_STUN_DURATION);
    next.lastEvent = "stunned";
  }

  return next;
}

export function isDevourable(state: CodeLifeEnemyState): boolean {
  if (isTerminal(state)) {
    return false;
  }

  if (!state.boss) {
    return state.status === "stunned" || state.hp <= state.maxHp * state.devourHealthRatio;
  }

  return (
    state.boss.phaseIndex === state.boss.phaseCount - 1 &&
    state.boss.window === "devour" &&
    state.boss.windowRemaining > 0 &&
    state.hp <= state.boss.devourHealth
  );
}

function isBossDef(def: CodeLifeEnemySource): def is BossDef {
  return "phases" in def && Array.isArray(def.phases) && "attacks" in def;
}

function createBossRuntime(maxHp: number, phaseLabels: string[], phaseCount: number): CodeLifeBossRuntime {
  const maxArmor = bossArmorForPhase(maxHp, 0);
  return {
    phaseIndex: 0,
    phaseName: phaseLabels[0] ?? "phase-1",
    phaseCount,
    phaseLabels,
    phaseThresholds: createPhaseThresholds(maxHp, phaseCount),
    armor: maxArmor,
    maxArmor,
    window: "closed",
    windowRemaining: 0,
    windowDuration: DEFAULT_BOSS_WINDOW_DURATION,
    devourHealth: Math.max(1, Math.ceil(maxHp * DEFAULT_BOSS_DEVOUR_HEALTH_RATIO)),
  };
}

function createPhaseThresholds(maxHp: number, phaseCount: number): number[] {
  return Array.from({ length: Math.max(0, phaseCount - 1) }, (_, index) =>
    Math.ceil((maxHp * (phaseCount - index - 1)) / phaseCount),
  );
}

function bossArmorForPhase(maxHp: number, phaseIndex: number): number {
  return Math.max(24, Math.ceil(maxHp * DEFAULT_BOSS_ARMOR_RATIO * (1 + phaseIndex * 0.2)));
}

function damageMinionHealth(
  state: CodeLifeEnemyState,
  damage: number,
  lethalStatus: "dead" | "devoured",
): CodeLifeEnemyState {
  state.hp = Math.max(0, state.hp - damage);
  if (state.hp <= 0) {
    state.status = lethalStatus;
    state.stunRemaining = 0;
    state.intent = createIntent({ shouldDetachGrab: true });
    state.lastEvent = lethalStatus;
  }
  return state;
}

function damageBossArmor(state: CodeLifeEnemyState, damage: number): CodeLifeEnemyState {
  if (!state.boss) {
    return state;
  }

  state.boss.armor = Math.max(0, state.boss.armor - damage);
  state.status = "alert";
  state.lastEvent = "alerted";

  if (state.boss.armor <= 0) {
    openBossWindow(state, "damage");
    state.status = "stunned";
    state.stunRemaining = Math.max(state.stunRemaining, DEFAULT_STUN_DURATION);
    state.lastEvent = "armor-broken";
  }

  return state;
}

function damageBossHealth(state: CodeLifeEnemyState, damage: number, allowDeath: boolean): CodeLifeEnemyState {
  if (!state.boss) {
    return state;
  }

  state.hp = allowDeath ? Math.max(0, state.hp - damage) : Math.max(1, state.hp - damage);
  if (state.hp <= 0) {
    state.status = "dead";
    state.stunRemaining = 0;
    state.intent = createIntent({ shouldDetachGrab: true });
    state.lastEvent = "dead";
    return state;
  }

  const originalPhase = state.boss.phaseIndex;
  while (state.boss.phaseIndex < state.boss.phaseCount - 1) {
    const threshold = state.boss.phaseThresholds[state.boss.phaseIndex] ?? 0;
    if (state.hp > threshold) {
      break;
    }
    state.boss.phaseIndex += 1;
  }

  if (state.boss.phaseIndex !== originalPhase) {
    state.boss.phaseName = state.boss.phaseLabels[state.boss.phaseIndex] ?? `phase-${state.boss.phaseIndex + 1}`;
    state.boss.maxArmor = bossArmorForPhase(state.maxHp, state.boss.phaseIndex);
    state.boss.armor = state.boss.maxArmor;
    state.boss.window = "closed";
    state.boss.windowRemaining = 0;
    state.boss.lastPhaseAdvance = state.boss.phaseIndex;
    state.status = "alert";
    state.stunRemaining = 0;
    state.intent.shouldDetachGrab = true;
    state.lastEvent = "phase-advanced";
  }

  return state;
}

function refreshBossDevourWindow(state: CodeLifeEnemyState): CodeLifeEnemyState {
  if (!state.boss || state.status === "dead" || state.status === "devoured") {
    return state;
  }

  if (state.boss.phaseIndex === state.boss.phaseCount - 1 && state.hp <= state.boss.devourHealth) {
    openBossWindow(state, "devour");
    state.status = "stunned";
    state.stunRemaining = Math.max(state.stunRemaining, state.boss.windowDuration);
    state.lastEvent = "devour-window-opened";
  }

  return state;
}

function openBossWindow(state: CodeLifeEnemyState, window: Exclude<CodeLifeBossWindow, "closed">): void {
  if (!state.boss) {
    return;
  }

  state.boss.window = state.boss.phaseIndex === state.boss.phaseCount - 1 && state.hp <= state.boss.devourHealth ? "devour" : window;
  state.boss.windowRemaining = Math.max(state.boss.windowRemaining, state.boss.windowDuration);
  state.boss.armor = 0;
}

function tickBossWindow(state: CodeLifeEnemyState, seconds: number): CodeLifeEnemyState {
  if (!state.boss || state.boss.window === "closed") {
    return state;
  }

  state.boss.windowRemaining = Math.max(0, state.boss.windowRemaining - seconds);
  if (state.boss.windowRemaining > 0) {
    return state;
  }

  state.boss.window = "closed";
  state.boss.armor = state.boss.maxArmor;
  if (state.status === "stunned") {
    state.status = "alert";
    state.stunRemaining = 0;
    state.intent.shouldDetachGrab = true;
  }
  return state;
}

function markDevoured(state: CodeLifeEnemyState): CodeLifeEnemyState {
  state.status = "devoured";
  state.hp = 0;
  state.stunRemaining = 0;
  state.grab = undefined;
  state.intent = createIntent({ shouldDetachGrab: true });
  state.lastEvent = "devoured";
  if (state.boss) {
    state.boss.armor = 0;
    state.boss.window = "devour";
    state.boss.windowRemaining = 0;
  }
  return state;
}

function isTerminal(state: CodeLifeEnemyState): boolean {
  return state.status === "dead" || state.status === "devoured";
}

function createIntent(overrides: Partial<CodeLifeIntent> = {}): CodeLifeIntent {
  return {
    desiredVelocity: overrides.desiredVelocity ? copyPoint(overrides.desiredVelocity) : { ...ZERO },
    canBeDragged: overrides.canBeDragged ?? false,
    dragTo: overrides.dragTo ? copyPoint(overrides.dragTo) : undefined,
    shouldDetachGrab: overrides.shouldDetachGrab ?? false,
  };
}

function cloneState(state: CodeLifeEnemyState): CodeLifeEnemyState {
  return {
    ...state,
    center: copyPoint(state.center),
    velocity: copyPoint(state.velocity),
    grab: state.grab ? { ...state.grab } : undefined,
    intent: createIntent(state.intent),
    boss: state.boss
      ? {
          ...state.boss,
          phaseLabels: [...state.boss.phaseLabels],
          phaseThresholds: [...state.boss.phaseThresholds],
        }
      : undefined,
  };
}

function copyPoint(point: CodeLifePoint): CodeLifePoint {
  return { x: point.x, y: point.y };
}

function normalizeDt(dt: number): number {
  if (!Number.isFinite(dt) || dt <= 0) {
    return 0;
  }
  return dt > 10 ? dt / 1000 : dt;
}

function sanitizePositive(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.ceil(value);
}

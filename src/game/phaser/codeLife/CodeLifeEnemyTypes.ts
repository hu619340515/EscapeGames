import type { BossDef } from "../../types";

export type CodeLifeEnemyStatus = "idle" | "patrol" | "alert" | "grabbed" | "stunned" | "devoured" | "dead";

export type CodeLifeEnemyKind = "minion" | "boss";

export type CodeLifeBossWindow = "closed" | "damage" | "devour";

export type CodeLifeCombatEvent =
  | "spawned"
  | "patrol-started"
  | "alerted"
  | "grabbed"
  | "grab-blocked"
  | "slammed"
  | "stunned"
  | "armor-broken"
  | "phase-advanced"
  | "devour-window-opened"
  | "devoured"
  | "dead";

export interface CodeLifePoint {
  x: number;
  y: number;
}

export interface CodeLifeIntent {
  desiredVelocity: CodeLifePoint;
  canBeDragged: boolean;
  dragTo?: CodeLifePoint;
  shouldDetachGrab: boolean;
}

export interface CodeLifeMinionDef {
  id: string;
  name?: string;
  hp: number;
  color?: number;
  patrolSpeed?: number;
  alertSpeed?: number;
  devourHealthRatio?: number;
  stunDuration?: number;
  slamStunForce?: number;
  biteDamage?: number;
  mass?: number;
}

export type CodeLifeEnemySource = BossDef | CodeLifeMinionDef;

export interface CodeLifeGrabState {
  grabbedBy: string;
  startedAt: number;
}

export interface CodeLifeBossRuntime {
  phaseIndex: number;
  phaseName: string;
  phaseCount: number;
  phaseLabels: string[];
  phaseThresholds: number[];
  armor: number;
  maxArmor: number;
  window: CodeLifeBossWindow;
  windowRemaining: number;
  windowDuration: number;
  devourHealth: number;
  lastPhaseAdvance?: number;
}

export interface CodeLifeEnemyState {
  id: string;
  name: string;
  kind: CodeLifeEnemyKind;
  color?: number;
  status: CodeLifeEnemyStatus;
  hp: number;
  maxHp: number;
  center: CodeLifePoint;
  velocity: CodeLifePoint;
  facing: -1 | 1;
  age: number;
  stateTime: number;
  stunRemaining: number;
  devourHealthRatio: number;
  patrolSpeed: number;
  alertSpeed: number;
  slamStunForce: number;
  biteDamage: number;
  mass: number;
  grab?: CodeLifeGrabState;
  intent: CodeLifeIntent;
  boss?: CodeLifeBossRuntime;
  lastEvent?: CodeLifeCombatEvent;
}

export interface CodeLifeGrabOptions {
  grabbedBy?: string;
  at?: number;
}

export interface CodeLifeSlamOptions {
  force?: number;
  damage?: number;
  stunDuration?: number;
}

export interface CodeLifeBiteOptions {
  damage?: number;
  consumeWhenPossible?: boolean;
}

export interface CodeLifeHazardOptions {
  damage?: number;
  ignoresArmor?: boolean;
  force?: number;
}

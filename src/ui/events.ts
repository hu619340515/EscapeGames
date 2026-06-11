import type { EndingId, GameUiPayload, PlayerCustomization } from "../game/types";

export interface StartRunDetail {
  prompt: string;
  customization: PlayerCustomization;
}

export interface ChooseEndingDetail {
  endingId: EndingId;
}

export type GmFeature = "invincible" | "infiniteJump";

export interface ToggleGmFeatureDetail {
  feature: GmFeature;
  enabled: boolean;
}

export const UI_EVENTS = {
  START_RUN: "ui:start-run",
  CONTINUE_RUN: "ui:continue-run",
  RESET_RUN: "ui:reset-run",
  TOGGLE_PAUSE: "ui:toggle-pause",
  CHOOSE_ENDING: "ui:choose-ending",
  SAVE_RUN: "ui:save-run",
  TOGGLE_GM_FEATURE: "ui:toggle-gm-feature",
} as const;

export const GAME_STATE_EVENT = "game:state";

export type UiEventName = (typeof UI_EVENTS)[keyof typeof UI_EVENTS];
export type UiEventDetail = StartRunDetail | ChooseEndingDetail | ToggleGmFeatureDetail;

export function dispatchUiEvent(name: UiEventName, detail?: UiEventDetail): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function dispatchGameState(payload: GameUiPayload): void {
  window.dispatchEvent(new CustomEvent<GameUiPayload>(GAME_STATE_EVENT, { detail: payload }));
}

export function addGameStateListener(listener: (payload: GameUiPayload) => void): void {
  window.addEventListener(GAME_STATE_EVENT, (event) => {
    listener((event as CustomEvent<GameUiPayload>).detail);
  });
}

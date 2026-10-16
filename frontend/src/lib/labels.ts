import type { UI } from "./i18n";
import type { Action, Change } from "./types";

// Most urgent first.
export const ACTION_ORDER: Action[] = ["call_911", "go_to_er", "call_care_team", "not_stated"];

export const ACTION_TONE: Record<Action, string> = {
  call_911: "urgent",
  go_to_er: "er",
  call_care_team: "call",
  not_stated: "ask",
};

export function actionTitle(action: Action, ui: UI): string {
  return { call_911: ui.ifCall911, go_to_er: ui.ifEr, call_care_team: ui.ifCall, not_stated: ui.ifAsk }[action];
}

export function doNow(action: Action, ui: UI): string {
  return { call_911: ui.now911, go_to_er: ui.nowEr, call_care_team: ui.nowCall, not_stated: ui.nowAsk }[action];
}

export function instructedLabel(action: Action, ui: UI): string {
  return {
    call_911: ui.saidCall911,
    go_to_er: ui.saidEr,
    call_care_team: ui.saidCall,
    not_stated: ui.saidNothing,
  }[action];
}

export function changeLabel(change: Change, ui: UI): string | null {
  return {
    new: ui.changeNew,
    changed: ui.changeChanged,
    continue: ui.changeContinue,
    stop: ui.changeStop,
    not_stated: null,
  }[change];
}

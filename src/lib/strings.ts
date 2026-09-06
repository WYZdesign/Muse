// Centralized common UI action labels — the safe, low-churn subset flagged
// for i18n prep in the wyzmind → Claude handoff (see HANDOVER.md). This is
// intentionally narrow: only short action-button words that appear verbatim,
// with the same meaning, across many unrelated screens/modals (Cancel,
// Close, Save, Block, Unmatch, ...).
//
// Deliberately NOT included here: screen copy, empty-state titles/subtitles,
// headlines, or anything else that reads differently per screen or changes
// often — centralizing those would be high-churn and low-value (see the
// next/image + i18n handoff notes). Add to this file only when a new label
// is genuinely repeated verbatim across 2+ unrelated screens.
export const STRINGS = {
  cancel: "Cancel",
  close: "Close",
  save: "Save",
  block: "Block",
  unmatch: "Unmatch",
} as const;

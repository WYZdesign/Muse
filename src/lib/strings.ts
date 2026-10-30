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
  delete: "Delete",
  confirm: "Confirm",
  edit: "Edit",
  submit: "Submit",
  loading: "Loading...",
  retry: "Retry",
  back: "Back",
  next: "Next",
  done: "Done",
  ok: "OK",
  yes: "Yes",
  no: "No",
  remove: "Remove",
  report: "Report",
  send: "Send",
  copy: "Copy",
  copied: "Copied",
  share: "Share",
  download: "Download",
  upload: "Upload",
  search: "Search",
  filter: "Filter",
  sort: "Sort",
  showMore: "Show more",
  showLess: "Show less",
  settings: "Settings",
  profile: "Profile",
  messages: "Messages",
  notifications: "Notifications",
  signOut: "Sign out",
  signIn: "Sign in",
  signUp: "Sign up",
  forgotPassword: "Forgot password?",
  privacy: "Privacy",
  terms: "Terms",
} as const;

export type StringKey = keyof typeof STRINGS;

// Locales currently supported. English is the source language; other
// locales fall back to the English string until a translation is provided.
const LOCALES: Record<string, Partial<Record<StringKey, string>>> = {
  en: {},
  // es: { cancel: "Cancelar", close: "Cerrar", save: "Guardar", ... },
  // fr: { cancel: "Annuler", close: "Fermer", save: "Enregistrer", ... },
};

/**
 * Resolve a UI string for the given locale. Falls back to English when
 * the key has no translation in the target locale.
 */
export function t(key: StringKey, locale = "en"): string {
  return LOCALES[locale]?.[key] ?? STRINGS[key];
}

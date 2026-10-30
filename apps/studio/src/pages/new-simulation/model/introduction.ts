const preferenceKey = "offscript:simulation-setup:introduction-seen";
type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

export function hasSeenIntroduction(storage: () => PreferenceStorage = () => window.localStorage): boolean {
  try {
    return storage().getItem(preferenceKey) === "true";
  } catch {
    return false;
  }
}

export function rememberIntroduction(storage: () => PreferenceStorage = () => window.localStorage): void {
  try {
    storage().setItem(preferenceKey, "true");
  } catch {
    // Configuration remains available when browser storage is blocked.
  }
}

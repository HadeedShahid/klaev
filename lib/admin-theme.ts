// Light or dark for the admin: the owner's choice, kept in this browser, or the system's setting.
// The storefront never reads it and stays light.
export type ThemeChoice = "light" | "dark" | "system";

const KEY = "klaev-admin-theme";
const DARK = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

// Inlined at the top of every admin page, so the first paint is already in the right theme. The
// same rule as applyTheme below, in plain script.
export const THEME_SCRIPT = `(function(){try{var c=localStorage.getItem("${KEY}");var d=c==="dark"||(c!=="light"&&matchMedia("${DARK}").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export function getTheme(): ThemeChoice {
  try {
    const choice = localStorage.getItem(KEY);
    return choice === "light" || choice === "dark" ? choice : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(choice = getTheme()) {
  const dark = choice === "dark" || (choice === "system" && matchMedia(DARK).matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Private browsing without storage: the choice holds until the page reloads.
  }
  applyTheme(choice);
  for (const listener of listeners) listener();
}

// For useSyncExternalStore: a choice made here, in another admin tab, or by the system.
export function subscribeTheme(listener: () => void) {
  const system = matchMedia(DARK);
  const onSystem = () => {
    if (getTheme() === "system") applyTheme("system");
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onSystem);
  system.addEventListener("change", onSystem);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onSystem);
    system.removeEventListener("change", onSystem);
  };
}

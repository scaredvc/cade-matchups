import { useState } from "react";

export type Theme = "dark" | "light";

const KEY = "cade-theme";

function stored(): Theme {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

/** Run before the first render so a saved light preference doesn't flash dark. */
export function applyStoredTheme() {
  apply(stored());
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(stored);
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    apply(next);
    setTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private browsing can block storage; the switch still works for this visit.
    }
  };
  return [theme, toggle] as const;
}

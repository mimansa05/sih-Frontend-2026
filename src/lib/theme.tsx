import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Light/dark theme.
 *
 * styles.css already carries complete `:root` and `.dark` token blocks that
 * nothing has ever switched between, so this only has to toggle the class —
 * there is no CSS to write.
 *
 * The map basemap is raster imagery and cannot be themed either way. MapLibre
 * popups and controls are built from the same tokens and follow the theme;
 * they read as dashboard chrome rather than map.
 */

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "discatra-theme";

/**
 * Runs before first paint, from a blocking inline <script> in the document
 * head. Without it, reloading in dark mode flashes the light palette for a
 * frame while React hydrates. Kept as a string because it must execute before
 * any bundle does.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`;

const apply = (theme: Theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  /*
   * Always "light" on the server and on the first client render, so the markup
   * React hydrates matches the markup the server sent. THEME_INIT_SCRIPT has
   * already put the right class on <html> by this point; the effect below just
   * brings this state in line with it.
   */
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Private mode or blocked storage — fall through to the light default.
    }
    if (stored === "dark" || stored === "light") setThemeState(stored);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    apply(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Not persisting is survivable; the toggle still works for this session.
    }
  }, []);

  const toggle = useCallback(
    () => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark"),
    [setTheme],
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

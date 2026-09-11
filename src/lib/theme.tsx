import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    if (typeof window === "undefined") return;
    // localStorage access throws a SecurityError (not just returns null) in
    // Safari's "Block All Cookies" mode and several locked-down mobile/
    // in-app browsers — since ThemeProvider wraps every single route, an
    // unguarded throw here used to take down the whole app on mount, on
    // every page, before routing even resolved. Root cause of the
    // "Something went wrong" report from those users.
    let stored: Theme | null = null;
    try { stored = localStorage.getItem("theme") as Theme | null; } catch { /* storage blocked */ }
    let prefersDark = false;
    try { prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches; } catch { /* unsupported */ }
    setTheme(stored ?? (prefersDark ? "dark" : "light"));
  }, []);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("theme", theme); } catch { /* storage blocked — theme still applies for this session */ }
  }, [theme]);
  // Stable reference: without this, every render (including ones caused by
  // completely unrelated state elsewhere) creates a new context value object,
  // which every consumer sees as "changed" and re-renders for — a textbook
  // contributor to cascading re-render loops in an app-wide provider.
  const value = useMemo(() => ({ theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);

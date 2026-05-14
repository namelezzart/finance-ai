"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import {
  applyTheme,
  getServerTheme,
  getStoredTheme,
  subscribeToTheme,
  toggleStoredTheme,
} from "@/lib/theme";

export default function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getStoredTheme,
    getServerTheme,
  );
  const isDark = theme === "dark";
  const label = isDark ? "Включить светлую тему" : "Включить тёмную тему";

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => toggleStoredTheme(theme)}
      className="auth-theme-toggle"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{isDark ? "Светлая" : "Тёмная"}</span>
    </button>
  );
}

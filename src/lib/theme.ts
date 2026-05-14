export type AppTheme = "dark" | "light";

export const THEME_CHANGE_EVENT = "themechange";

export function applyTheme(theme: AppTheme) {
  document.documentElement.classList.toggle("light", theme === "light");
}

export function getStoredTheme(): AppTheme {
  if (typeof localStorage === "undefined") return "dark";
  return localStorage.getItem("theme") === "light" ? "light" : "dark";
}

export function getServerTheme(): AppTheme {
  return "dark";
}

export function subscribeToTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

export function setStoredTheme(theme: AppTheme) {
  localStorage.setItem("theme", theme);
  applyTheme(theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function toggleStoredTheme(currentTheme: AppTheme) {
  setStoredTheme(currentTheme === "dark" ? "light" : "dark");
}

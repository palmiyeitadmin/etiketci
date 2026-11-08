export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const themeCookieName = "plms_theme";
export const themeStorageKey = "plms_theme";
export const themePreferences: ThemePreference[] = ["light", "dark", "system"];

export function normalizeThemePreference(value: string | null | undefined): ThemePreference {
    return value === "light" || value === "dark" || value === "system" ? value : "light";
}

/**
 * Runs in <head> before the page paints, so a dark or system preference never flashes light.
 * Kept as a string because it must not wait for React.
 */
export const themeBootScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${themeCookieName}=([^;]+)/);var p=(m&&m[1])||localStorage.getItem("${themeStorageKey}")||"light";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;

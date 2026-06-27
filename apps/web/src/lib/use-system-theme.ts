import { useEffect, useState } from "react";

export type SystemColorScheme = "light" | "dark";

const colorSchemeQuery = "(prefers-color-scheme: dark)";

function getSystemColorScheme(): SystemColorScheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(colorSchemeQuery).matches ? "dark" : "light";
}

export function useSystemColorScheme() {
  const [colorScheme, setColorScheme] = useState<SystemColorScheme>(getSystemColorScheme);

  useEffect(() => {
    const media = window.matchMedia(colorSchemeQuery);
    const updateColorScheme = () => setColorScheme(media.matches ? "dark" : "light");

    updateColorScheme();
    media.addEventListener("change", updateColorScheme);
    return () => media.removeEventListener("change", updateColorScheme);
  }, []);

  return colorScheme;
}

export function useSystemTheme() {
  const colorScheme = useSystemColorScheme();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", colorScheme === "dark");
    root.style.colorScheme = colorScheme;
  }, [colorScheme]);

  return colorScheme;
}

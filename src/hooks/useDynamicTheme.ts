import { useMemo, useEffect } from "react";

/**
 * Converts a hex color to HSL and sets it as CSS custom property --primary
 */
export function useDynamicTheme(hexColor: string | undefined) {
  const hsl = useMemo(() => {
    if (!hexColor) return null;
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }, [hexColor]);

  useEffect(() => {
    if (!hsl) return;

    const root = document.documentElement;
    // Set primary color based on winery color
    root.style.setProperty("--primary", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    root.style.setProperty("--primary-foreground", `${hsl.h} ${Math.max(hsl.s - 30, 0)}% 97%`);
    root.style.setProperty("--wine", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    root.style.setProperty("--wine-light", `${hsl.h} ${Math.max(hsl.s - 20, 0)}% ${Math.min(hsl.l + 13, 50)}%`);
    root.style.setProperty("--ring", `${hsl.h} ${hsl.s}% ${hsl.l}%`);

    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--wine");
      root.style.removeProperty("--wine-light");
      root.style.removeProperty("--ring");
    };
  }, [hsl]);
}

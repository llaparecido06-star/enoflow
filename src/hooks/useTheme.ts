import { useCallback } from "react";

export function useTheme() {
  const isDark = false;
  const toggle = useCallback(() => {}, []);
  return { isDark, toggle };
}

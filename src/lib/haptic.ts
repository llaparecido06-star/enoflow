/** Trigger a short haptic vibration on supported devices */
export function haptic(pattern: number | number[] = 15) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // silently ignore on unsupported devices
  }
}

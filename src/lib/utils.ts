import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// =========================
// Game utils
// =========================

export type CountdownTick = (value: number) => void;
export type CancelFn = () => void;

/**
 * Starts a countdown from `from` down to 0, calling `onTick` each second (or custom `intervalMs`).
 * Returns a cancel function to stop the countdown early.
 *
 * Example:
 * const cancel = startCountdown(3, (v) => setCount(v), () => console.log('done'));
 */
export function startCountdown(
  from: number,
  onTick: CountdownTick,
  onComplete?: () => void,
  intervalMs = 1000
): CancelFn {
  const start = Math.max(0, Math.floor(from));

  if (start === 0) {
    onTick(0);
    onComplete?.();
    return () => {};
  }

  let current = start;
  onTick(current);

  const id = globalThis.setInterval(() => {
    current -= 1;
    if (current <= 0) {
      onTick(0);
      clearInterval(id);
      onComplete?.();
    } else {
      onTick(current);
    }
  }, intervalMs);

  return () => clearInterval(id);
}

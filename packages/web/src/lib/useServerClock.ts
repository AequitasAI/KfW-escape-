import { useEffect, useRef, useState } from 'react';
import type { TimerView } from '@kfw-escape/shared';

/**
 * Renders the countdown from the server's `endsAt` corrected by the measured
 * clock offset, never from an independent local countdown. Backgrounding a tab
 * throttles this interval, but the value is recomputed from wall clock time on
 * every frame it does run, so it can never drift away from the server.
 */
export function useServerClock(timer: TimerView | null | undefined): number {
  const offsetRef = useRef(0);
  const [remaining, setRemaining] = useState(timer?.remainingMs ?? 0);

  useEffect(() => {
    if (!timer) return;
    // positive when the local clock runs ahead of the server
    offsetRef.current = Date.now() - timer.serverNow;
  }, [timer?.serverNow, timer]);

  useEffect(() => {
    if (!timer) return undefined;

    const compute = (): number => {
      if (timer.endsAt === null) return timer.remainingMs;
      if (!timer.running) return timer.remainingMs;
      const serverNow = Date.now() - offsetRef.current;
      return Math.max(0, timer.endsAt - serverNow);
    };

    setRemaining(compute());
    if (!timer.running) return undefined;

    const id = window.setInterval(() => setRemaining(compute()), 200);
    const onVisible = (): void => setRemaining(compute());
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [timer]);

  return remaining;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Spoken form for screen readers, so the countdown is not colour/format only. */
export function describeClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds} Sekunden verbleiben`;
  return `${minutes} Minuten und ${seconds} Sekunden verbleiben`;
}

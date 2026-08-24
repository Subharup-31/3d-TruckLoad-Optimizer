import { useEffect, useRef, useState } from 'react';

/** Step-through loading animation — shows items in real-world placement order */
export function useLoadPlaySequence(totalItems: number, intervalMs = 1200) {
  const [playMode, setPlayMode] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    setPlayMode(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = () => {
    setPlayIndex(0);
    setPlayMode(true);
  };

  const toggle = () => {
    if (playMode) stop();
    else start();
  };

  useEffect(() => {
    if (!playMode || totalItems === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setPlayIndex((prev) => {
        if (prev + 1 >= totalItems) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setPlayMode(false);
          return totalItems - 1;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playMode, totalItems, intervalMs]);

  const visibleCount = playMode ? playIndex + 1 : totalItems;

  return { playMode, playIndex, visibleCount, toggle, stop, start };
}

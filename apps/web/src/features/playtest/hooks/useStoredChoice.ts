import { useEffect, useState } from 'react';

// A choice the viewer makes once and finds again (cards or list), kept in this
// browser only. A blocked storage keeps the default.
export function useStoredChoice<T extends string>(key: string, options: readonly T[], fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key) as T | null;
      if (stored && options.includes(stored)) setValue(stored);
    } catch {
      // Storage unavailable.
    }
  }, [key, options]);
  const choose = (next: T) => {
    setValue(next);
    try {
      window.localStorage.setItem(key, next);
    } catch {
      // Storage unavailable.
    }
  };
  return [value, choose] as const;
}

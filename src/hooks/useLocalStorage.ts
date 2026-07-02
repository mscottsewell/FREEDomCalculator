import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

/**
 * A hook that persists state to localStorage, replacing GitHub Spark's useKV.
 *
 * An optional `validate` type-guard is checked against the parsed value. If a
 * previously-stored shape no longer matches (schema drift between releases, or a
 * hand-edited/corrupt entry), the guard fails and the default value is used
 * instead of feeding untrusted data into the calculators.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  validate?: (parsed: unknown) => parsed is T
): [T, Dispatch<SetStateAction<T>>] {
  const getStoredValue = (): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return defaultValue;
      const parsed: unknown = JSON.parse(item);
      if (validate && !validate(parsed)) return defaultValue;
      return parsed as T;
    } catch (error) {
      console.warn(`Error loading localStorage key "${key}":`, error);
      return defaultValue;
    }
  };

  const [value, setValue] = useState<T>(getStoredValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error saving localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

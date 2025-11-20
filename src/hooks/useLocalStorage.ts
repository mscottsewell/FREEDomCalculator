import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

/**
 * A hook that persists state to localStorage, replacing GitHub Spark's useKV
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const getStoredValue = () => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
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

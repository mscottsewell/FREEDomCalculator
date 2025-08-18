import { useState, useEffect } from 'react';

export function useKV<T>(key: string, defaultValue: T): [T, (value: T | ((current: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }, [key, value]);

  const updateValue = (newValue: T | ((current: T) => T)) => {
    setValue(current => {
      const result = typeof newValue === 'function' 
        ? (newValue as (current: T) => T)(current)
        : newValue;
      return result;
    });
  };

  const deleteValue = () => {
    try {
      localStorage.removeItem(key);
      setValue(defaultValue);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  };

  return [value, updateValue, deleteValue];
}
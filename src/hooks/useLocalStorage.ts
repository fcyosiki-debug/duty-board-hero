import { useState, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Initialize state synchronously from localStorage to prevent race conditions.
  // Previously, this used a useEffect for initialization, which caused a window where
  // the default value was active and other useEffects (migration, daily reset) could
  // fire against stale/default data, overwriting real completions.
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item) as T;
      }
      window.localStorage.setItem(key, JSON.stringify(initialValue));
      return initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      if (value instanceof Function) {
        setStoredValue((prev) => {
          const valueToStore = value(prev);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          }
          return valueToStore;
        });
      } else {
        setStoredValue(value);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      }
    } catch (error) {
      console.log(error);
    }
  }, [key]);

  return [storedValue, setValue];
}

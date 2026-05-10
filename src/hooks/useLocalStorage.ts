import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        window.localStorage.setItem(key, JSON.stringify(next));
        return next;
      });
    },
    [key],
  );

  const removeValue = useCallback(() => {
    window.localStorage.removeItem(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key) {
        setStoredValue(e.newValue ? (JSON.parse(e.newValue) as T) : initialValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}

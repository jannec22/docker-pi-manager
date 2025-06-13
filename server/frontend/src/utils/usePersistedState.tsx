import { useCallback, useState } from "react";

const usePersistedState = <T,>(key: string, initial: T) => {
  const [v, setV] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initial;
    }
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : initial;
  });

  const setPersistedValue = useCallback(
    (value: T) => {
      setV(value);
      if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(value));
      }
    },
    [key],
  );
  
  return [v, setPersistedValue] as const;
};

export default usePersistedState;

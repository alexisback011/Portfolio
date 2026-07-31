import { useState, useEffect, useCallback } from "react";

export function useAdminList(fetcher, { pollMs = 10000 } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      try {
        const data = await fetcher();
        setItems(data);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetcher]
  );

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), pollMs);
    return () => clearInterval(interval);
  }, [load, pollMs]);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, loading, refreshing, reload: () => load(true), remove };
}

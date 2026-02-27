import { useCallback, useEffect, useMemo, useState } from "react";
import type { TrafficEntry } from "../api/client";
import {
  createTraffic,
  deleteTraffic,
  getTraffic,
  updateTraffic,
} from "../api/client";

type UseTrafficState = {
  items: TrafficEntry[];
  loading: boolean;
  error: string | null;

  // CRUD + refresh
  refresh: () => Promise<void>;
  add: (input: { date: string; visits: number }) => Promise<void>;
  update: (id: string, updates: Partial<{ date: string; visits: number }>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export function useTraffic(): UseTrafficState {
  const [items, setItems] = useState<TrafficEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTraffic();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load traffic");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // initial load
    refresh();
  }, [refresh]);

  const add = useCallback(async (input: { date: string; visits: number }) => {
    setError(null);
    setLoading(true);
    try {
      await createTraffic(input);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add entry");
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const update = useCallback(async (id: string, updates: Partial<{ date: string; visits: number }>) => {
    setError(null);
    setLoading(true);
    try {
      await updateTraffic(id, updates);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update entry");
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    setError(null);
    setLoading(true);
    try {
      await deleteTraffic(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete entry");
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  return useMemo(
    () => ({ items, loading, error, refresh, add, update, remove }),
    [items, loading, error, refresh, add, update, remove]
  );
}
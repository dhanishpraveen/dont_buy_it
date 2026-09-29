import { useEffect, useEffectEvent, useState } from "react";
import { getCacheEntry, setCacheEntry } from "../lib/localStorageCache";

type ResourceState<T> = {
  key: string;
  data: T | undefined;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

export function useCachedResource<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
) {
  const loadResource = useEffectEvent(loader);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<ResourceState<T>>(() => {
    const data = getCacheEntry<T>(key);
    return {
      key,
      data,
      loading: data === undefined,
      refreshing: false,
      error: null,
    };
  });

  useEffect(() => {
    let active = true;
    const cached = getCacheEntry<T>(key);
    setState({
      key,
      data: cached,
      loading: cached === undefined,
      refreshing: cached !== undefined,
      error: null,
    });
    void loadResource()
      .then((data) => {
        setCacheEntry(key, data, ttlMs);
        if (active)
          setState({
            key,
            data,
            loading: false,
            refreshing: false,
            error: null,
          });
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setState({
          key,
          data: cached,
          loading: false,
          refreshing: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "We could not refresh this data.",
        });
      });
    return () => {
      active = false;
    };
  }, [key, ttlMs, revision]);

  const current =
    state.key === key
      ? state
      : { key, data: undefined, loading: true, refreshing: false, error: null };
  const updateData = (update: (value: T) => T) => {
    setState((previous) => {
      if (previous.key !== key || previous.data === undefined) return previous;
      const data = update(previous.data);
      setCacheEntry(key, data, ttlMs);
      return { ...previous, data };
    });
  };

  return {
    ...current,
    refresh: () => setRevision((value) => value + 1),
    updateData,
  };
}

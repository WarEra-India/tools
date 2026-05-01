import { useState, useEffect } from "react";

const configCache: Record<string, any> = {};
const loadingPromises: Record<string, Promise<any>> = {};

export function useLocalConfig<T>(configName: string) {
  const [data, setData] = useState<T | null>(configCache[configName] || null);
  const [loading, setLoading] = useState(!configCache[configName]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (configCache[configName]) {
      setData(configCache[configName]);
      setLoading(false);
      return;
    }

    if (!loadingPromises[configName]) {
      loadingPromises[configName] = fetch(`${import.meta.env.BASE_URL}config/${configName}.json`)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to fetch config: ${configName}`);
          return res.json();
        })
        .then((json) => {
          configCache[configName] = json;
          return json;
        })
        .catch((err) => {
          delete loadingPromises[configName];
          throw err;
        });
    }

    loadingPromises[configName]
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [configName]);

  return { data, loading, error };
}

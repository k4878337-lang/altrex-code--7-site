import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../stores/appStore.js';
import { ModelInfo } from '../lib/types.js';

export function useModels() {
  const { models, setModels, onlineCount } = useAppStore();
  const [loading, setLoading] = useState(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.models) {
        setModels(data.models);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [setModels]);

  const probeModels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orchestrator/probe', { method: 'POST' });
      const data = await res.json();
      if (data.statuses) {
        setModels(data.statuses);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [setModels]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models,
    onlineCount,
    loading,
    refresh: fetchModels,
    probe: probeModels,
  };
}

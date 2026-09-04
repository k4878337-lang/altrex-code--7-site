import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../stores/appStore.js';
import { FileNode } from '../lib/types.js';

export function useFileTree() {
  const { fileTree, setFileTree, activeFile, setActiveFile, fileContent, setFileContent } = useAppStore();
  const [loading, setLoading] = useState(false);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.files) {
        setFileTree(data.files);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [setFileTree]);

  const selectFile = useCallback(
    async (path: string) => {
      setActiveFile(path);
      try {
        const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(path)}`);
        const data = await res.json();
        if (data.content !== undefined) {
          setFileContent(data.content);
        }
      } catch {
        // ignore
      }
    },
    [setActiveFile, setFileContent]
  );

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  return {
    fileTree,
    activeFile,
    fileContent,
    loading,
    refresh: fetchTree,
    selectFile,
  };
}

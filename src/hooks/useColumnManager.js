import { useState, useEffect, useCallback, useMemo } from 'react';
import { getLocalItem, setLocalItem } from '../utils/storage';

export function useColumnManager(moduleKey, defaultColumns = []) {
  const storageKey = `erp_col_cfg_${moduleKey}`;

  // Initialize columns from storage or default
  const [columns, setColumns] = useState(() => {
    const saved = getLocalItem(storageKey, null);
    if (!saved || !Array.isArray(saved) || saved.length === 0) {
      return defaultColumns;
    }

    // Merge saved with default in case new columns were added to codebase
    const savedMap = new Map(saved.map((c, idx) => [c.key, { ...c, _order: idx }]));
    const merged = [];

    // First add saved columns in their saved order if they still exist in default
    saved.forEach(sc => {
      const def = defaultColumns.find(d => d.key === sc.key);
      if (def) {
        merged.push({
          ...def,
          ...sc,
          label: def.label || sc.label // preserve label if updated in code
        });
      }
    });

    // Then add any newly introduced default columns that were not in saved
    defaultColumns.forEach(dc => {
      if (!savedMap.has(dc.key)) {
        merged.push(dc);
      }
    });

    return merged;
  });

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Save to localStorage when columns change
  const saveColumns = useCallback((newCols) => {
    setColumns(newCols);
    setLocalItem(storageKey, newCols);
  }, [storageKey]);

  // Toggle visibility of a column
  const toggleVisibility = useCallback((key) => {
    const updated = columns.map(c => {
      if (c.key === key) {
        return { ...c, visible: c.visible === false ? true : false };
      }
      return c;
    });
    saveColumns(updated);
  }, [columns, saveColumns]);

  // Update specific property of a column (width, align, format, etc.)
  const updateColumnProp = useCallback((key, propName, value) => {
    const updated = columns.map(c => {
      if (c.key === key) {
        return { ...c, [propName]: value };
      }
      return c;
    });
    saveColumns(updated);
  }, [columns, saveColumns]);

  // Move column up / down
  const moveColumn = useCallback((key, direction) => {
    const index = columns.findIndex(c => c.key === key);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const next = [...columns];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    saveColumns(next);
  }, [columns, saveColumns]);

  // Reorder columns (by key or by index) for Drag and Drop
  const reorderColumns = useCallback((sourceKeyOrIndex, targetKeyOrIndex) => {
    let sourceIdx = typeof sourceKeyOrIndex === 'number' 
      ? sourceKeyOrIndex 
      : columns.findIndex(c => c.key === sourceKeyOrIndex);
    let targetIdx = typeof targetKeyOrIndex === 'number' 
      ? targetKeyOrIndex 
      : columns.findIndex(c => c.key === targetKeyOrIndex);

    if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) return;
    if (sourceIdx < 0 || sourceIdx >= columns.length || targetIdx < 0 || targetIdx >= columns.length) return;

    const next = [...columns];
    const [moved] = next.splice(sourceIdx, 1);
    next.splice(targetIdx, 0, moved);
    saveColumns(next);
  }, [columns, saveColumns]);

  // Set visibility for all columns
  const setAllVisibility = useCallback((visible) => {
    const updated = columns.map(c => ({ ...c, visible }));
    saveColumns(updated);
  }, [columns, saveColumns]);

  // Reset to default
  const resetToDefault = useCallback(() => {
    saveColumns(defaultColumns);
  }, [defaultColumns, saveColumns]);

  // Visible columns in order
  const visibleColumns = useMemo(() => {
    return columns.filter(c => c.visible !== false);
  }, [columns]);

  return {
    columns,
    visibleColumns,
    isConfigModalOpen,
    openConfigModal: () => setIsConfigModalOpen(true),
    closeConfigModal: () => setIsConfigModalOpen(false),
    toggleVisibility,
    updateColumnProp,
    moveColumn,
    reorderColumns,
    setAllVisibility,
    resetToDefault,
    saveColumns
  };
}

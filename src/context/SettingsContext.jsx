import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_APP_SETTINGS } from '../config/constants';
import { getLocalItem, setLocalItem, STORAGE_KEYS } from '../utils/storage';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { getUserWarehouses } = useAuth();
  const [appSettings, setAppSettings] = useState(() => getLocalItem(STORAGE_KEYS.SETTINGS, DEFAULT_APP_SETTINGS));

  useEffect(() => {
    setLocalItem(STORAGE_KEYS.SETTINGS, appSettings);
  }, [appSettings]);

  const updateSettings = useCallback((newSettings) => {
    setAppSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);

  // All warehouses configured in the whole system (for Admin settings)
  const getAllSystemWarehouses = useCallback(() => {
    return Array.isArray(appSettings.warehouses) && appSettings.warehouses.length > 0
      ? appSettings.warehouses
      : ['KHO 1', 'KHO 2', 'KHO 3', 'KHO 4', 'KHO 5'];
  }, [appSettings.warehouses]);

  // Warehouses accessible to the current logged in / viewed user
  const getWarehouseOptions = useCallback((includeAll = false) => {
    const all = getAllSystemWarehouses();
    if (includeAll) return all;

    const userWh = getUserWarehouses ? getUserWarehouses() : null;
    if (userWh && Array.isArray(userWh) && userWh.length > 0) {
      const allowedNormalized = userWh.map(w => w.toString().trim().toUpperCase());
      const filtered = all.filter(w => allowedNormalized.includes(w.toString().trim().toUpperCase()));
      return filtered.length > 0 ? filtered : userWh;
    }
    return all;
  }, [getAllSystemWarehouses, getUserWarehouses]);

  const getDefaultWarehouse = useCallback(() => {
    const list = getWarehouseOptions();
    const def = appSettings.defaultWarehouse || '';
    return list.some(k => k.toLowerCase() === def.toLowerCase()) ? def : (list[0] || 'KHO 1');
  }, [appSettings.defaultWarehouse, getWarehouseOptions]);

  const isAllowedWarehouse = useCallback((val) => {
    if (!val) return false;
    const target = val.toString().trim().toUpperCase();
    return getWarehouseOptions().some(w => w.toString().trim().toUpperCase() === target);
  }, [getWarehouseOptions]);

  const applyParsedSettings = useCallback((parsedSettings) => {
    if (!parsedSettings || typeof parsedSettings !== 'object') return;
    setAppSettings(prev => {
      const hasChanged = Object.keys(parsedSettings).some(
        k => JSON.stringify(prev[k]) !== JSON.stringify(parsedSettings[k])
      );
      if (!hasChanged) return prev;
      return {
        ...prev,
        ...parsedSettings,
        lastSyncedTime: new Date().toISOString(),
        syncSource: 'GOOGLE_SHEETS'
      };
    });
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        appSettings,
        updateSettings,
        applyParsedSettings,
        getAllSystemWarehouses,
        getWarehouseOptions,
        getDefaultWarehouse,
        isAllowedWarehouse
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within a SettingsProvider");
  return context;
}

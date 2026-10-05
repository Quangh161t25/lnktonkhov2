export const STORAGE_KEYS = {
  SESSION: 'erp_user_session',
  SETTINGS: 'erp_app_settings',
  PERMISSIONS: 'erp_permissions',
  NHAP_CACHE: 'erp_nhap_cache',
  DUKIEN_CACHE: 'erp_expected_cache',
  XUAT_CACHE: 'erp_xuat_cache',
  TRANSFER_CACHE: 'erp_transfer_cache',
  PRODUCT_CACHE: 'erp_product_cache',
  WAREHOUSE_PRODUCT_CACHE: 'erp_warehouse_product_cache',
  TON_NPP_CACHE: 'erp_ton_npp_cache',
  RECONCILIATION_CACHE: 'erp_reconciliation_cache',
  CNGIASP_CACHE: 'erp_cngiasp_cache',
  LENDON_CACHE: 'erp_lendon_cache',
  USERS_CACHE: 'erp_users_cache',
  FORECAST_PARAMS: 'erp_forecast_params',
  CAIDAT_CACHE: 'erp_caidat_cache'
};

export function getLocalItem(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Error reading localStorage key ${key}:`, e);
    return defaultValue;
  }
}

export function setLocalItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error setting localStorage key ${key}:`, e);
  }
}

export function removeLocalItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`Error removing localStorage key ${key}:`, e);
  }
}

export function clearAllCaches() {
  Object.values(STORAGE_KEYS).forEach(key => {
    if (key !== STORAGE_KEYS.SESSION) {
      localStorage.removeItem(key);
    }
  });
}

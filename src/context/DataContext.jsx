import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CONFIG } from '../config/constants';
import { SIMPLE_SHEET_MODULES } from '../config/dataSources';
import { fetchSheetValues, fetchAggregates, updateSheetRange, appendSheetValues } from '../services/googleSheetsService';
import { parseCaiDatRows, saveCaiDatToGoogleSheet, buildCaiDatRows } from '../services/caiDatService';
import { buildAuditLogRow } from '../services/auditLogService';
import { getLocalItem, setLocalItem, STORAGE_KEYS } from '../utils/storage';
import { cleanNumber, normalizeLoginValue, parseSimpleSheetDate, resolveEffectivePrice } from '../utils/formatters';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { currentUser, updateUsers, applyParsedPermissions } = useAuth();
  const { applyParsedSettings } = useSettings();

  const [nhapData, setNhapData] = useState(() => getLocalItem(STORAGE_KEYS.NHAP_CACHE, []));
  const [dukienData, setDukienData] = useState(() => getLocalItem(STORAGE_KEYS.DUKIEN_CACHE, []));
  const [xuatData, setXuatData] = useState(() => getLocalItem(STORAGE_KEYS.XUAT_CACHE, []));
  const [transferData, setTransferData] = useState(() => getLocalItem(STORAGE_KEYS.TRANSFER_CACHE, []));
  const [productData, setProductData] = useState(() => getLocalItem(STORAGE_KEYS.PRODUCT_CACHE, []));
  const [warehouseProductData, setWarehouseProductData] = useState(() => getLocalItem(STORAGE_KEYS.WAREHOUSE_PRODUCT_CACHE, []));
  const [tonNppData, setTonNppData] = useState(() => getLocalItem(STORAGE_KEYS.TON_NPP_CACHE, []));
  const [doisoatData, setDoisoatData] = useState(() => getLocalItem(STORAGE_KEYS.RECONCILIATION_CACHE, []));
  const [cngiaspData, setCngiaspData] = useState(() => getLocalItem(STORAGE_KEYS.CNGIASP_CACHE, []));
  const [lenDonData, setLenDonData] = useState(() => getLocalItem(STORAGE_KEYS.LENDON_CACHE, []));
  const [caidatData, setCaidatData] = useState(() => getLocalItem(STORAGE_KEYS.CAIDAT_CACHE, []));
  const [lichSuData, setLichSuData] = useState(() => getLocalItem(STORAGE_KEYS.LICHSU_CACHE, []));
  const [aggregatesData, setAggregatesData] = useState(() => getLocalItem('lnk_aggregates_cache', {}));
  const [nppProductIdsData, setNppProductIdsData] = useState(() => getLocalItem('lnk_npp_products_cache', []));

  const [loadingModules, setLoadingModules] = useState({});
  const [syncStatus, setSyncStatus] = useState('IDLE'); // 'IDLE' | 'SYNCING' | 'ERROR' | 'SUCCESS'
  const [lastSyncedTime, setLastSyncedTime] = useState(() => new Date());

  // Set module data helper
  const setModuleData = (moduleName, data) => {
    switch (moduleName) {
      case 'nhap':
        setNhapData(data);
        setLocalItem(STORAGE_KEYS.NHAP_CACHE, data);
        break;
      case 'dukien':
        setDukienData(data);
        setLocalItem(STORAGE_KEYS.DUKIEN_CACHE, data);
        break;
      case 'xuat':
        setXuatData(data);
        setLocalItem(STORAGE_KEYS.XUAT_CACHE, data);
        break;
      case 'chuyenkho':
        setTransferData(data);
        setLocalItem(STORAGE_KEYS.TRANSFER_CACHE, data);
        break;
      case 'sanpham':
        setProductData(data);
        setLocalItem(STORAGE_KEYS.PRODUCT_CACHE, data);
        break;
      case 'sanphamkho':
        setWarehouseProductData(data);
        setLocalItem(STORAGE_KEYS.WAREHOUSE_PRODUCT_CACHE, data);
        break;
      case 'ton_npp':
        setTonNppData(data);
        setLocalItem(STORAGE_KEYS.TON_NPP_CACHE, data);
        break;
      case 'doisoat':
        setDoisoatData(data);
        setLocalItem(STORAGE_KEYS.RECONCILIATION_CACHE, data);
        break;
      case 'cngiasp':
        setCngiaspData(data);
        setLocalItem(STORAGE_KEYS.CNGIASP_CACHE, data);
        break;
      case 'lendon':
        setLenDonData(data);
        setLocalItem(STORAGE_KEYS.LENDON_CACHE, data);
        break;
      case 'caidat':
        setCaidatData(data);
        setLocalItem(STORAGE_KEYS.CAIDAT_CACHE, data);
        break;
      case 'lichsu':
        setLichSuData(data);
        setLocalItem(STORAGE_KEYS.LICHSU_CACHE, data);
        break;
      default:
        break;
    }
  };

  const getModuleData = (moduleName) => {
    switch (moduleName) {
      case 'nhap': return nhapData;
      case 'dukien': return dukienData;
      case 'xuat': return xuatData;
      case 'chuyenkho': return transferData;
      case 'sanpham': return productData;
      case 'sanphamkho': return warehouseProductData;
      case 'ton_npp': return tonNppData;
      case 'doisoat': return doisoatData;
      case 'cngiasp': return cngiaspData;
      case 'lendon': return lenDonData;
      case 'caidat': return caidatData;
      case 'lichsu': return lichSuData;
      default: return [];
    }
  };

  // Fetch DSNV Users Data
  const fetchUsersData = useCallback(async () => {
    try {
      const rows = await fetchSheetValues(CONFIG.authSheetName, 'A1:H10000');
      if (rows && rows.length > 1) {
        const headers = rows[0].map(h => (h || '').toString().trim().toLowerCase());
        const iId = headers.findIndex(h => h === 'id');
        const iName = headers.findIndex(h => h === 'ho_ten' || h === 'họ tên' || h === 'name' || h === 'ten');
        const iImage = headers.findIndex(h => h === 'hinh_anh');
        const iGender = headers.findIndex(h => h === 'gioi_tinh');
        const iBirthDate = headers.findIndex(h => h === 'ngay_sinh');
        const iPass = headers.findIndex(h => h === 'password' || h === 'mat_khau' || h === 'mk');
        const iRole = headers.findIndex(h => h === 'role' || h === 'quyen');
        const iType = headers.findIndex(h => h === 'truong');

        const parsedUsers = rows.slice(1).map((r, index) => ({
          sheetRow: index + 2,
          id: normalizeLoginValue(iId !== -1 ? r[iId] : r[0]),
          name: normalizeLoginValue(iName !== -1 ? r[iName] : r[1]),
          image: normalizeLoginValue(iImage !== -1 ? r[iImage] : r[2]),
          gender: normalizeLoginValue(iGender !== -1 ? r[iGender] : r[3]),
          birthDate: normalizeLoginValue(iBirthDate !== -1 ? r[iBirthDate] : r[4]),
          role: normalizeLoginValue(iRole !== -1 ? r[iRole] : r[5]),
          password: '', // Masked for security
          type: normalizeLoginValue(iType !== -1 ? r[iType] : r[7])
        })).filter(u => u.id);

        updateUsers(parsedUsers);
        return parsedUsers;
      }
      return [];
    } catch (err) {
      console.error("fetchUsersData error:", err);
      return [];
    }
  }, [updateUsers]);

  const inFlightFetches = useRef({});

  // Fetch Module Data
  const fetchModule = useCallback(async (moduleName, force = false) => {
    const config = SIMPLE_SHEET_MODULES[moduleName];
    if (!config) return [];

    if (!force && inFlightFetches.current[moduleName]) {
      return inFlightFetches.current[moduleName];
    }

    setLoadingModules(prev => ({ ...prev, [moduleName]: true }));
    const fetchPromise = (async () => {
      try {
        const sheetName = config.sheetName();
        const rows = await fetchSheetValues(sheetName, config.range);
        setModuleData(moduleName, rows);
        setLastSyncedTime(new Date());

        // If CAI_DAT is fetched, apply parsed values to settings and permissions
        if (moduleName === 'caidat' && rows && rows.length > 1) {
          const parsed = parseCaiDatRows(rows);
          if (parsed) {
            if (parsed.settings && applyParsedSettings) applyParsedSettings(parsed.settings);
            if (parsed.permissions && applyParsedPermissions) applyParsedPermissions(parsed.permissions);
          }
        }

        return rows;
      } catch (err) {
        console.error(`Fetch ${moduleName} failed:`, err);
        return getModuleData(moduleName);
      } finally {
        delete inFlightFetches.current[moduleName];
        setLoadingModules(prev => ({ ...prev, [moduleName]: false }));
      }
    })();

    inFlightFetches.current[moduleName] = fetchPromise;
    return fetchPromise;
  }, [applyParsedSettings, applyParsedPermissions]);

  const inFlightAggregates = useRef({});
  const aggregatesDataRef = useRef(aggregatesData);
  const nppProductIdsDataRef = useRef(nppProductIdsData);
  aggregatesDataRef.current = aggregatesData;
  nppProductIdsDataRef.current = nppProductIdsData;

  // Fetch stock aggregates computed server-side (avoids sending raw order sheets across network)
  const fetchAggregatesData = useCallback(async (options = {}) => {
    const { force = false, nppId = '', nppName = '' } = options;
    const fetchKey = `${nppId || ''}|${nppName || ''}`;

    if (!force && inFlightAggregates.current[fetchKey]) {
      return inFlightAggregates.current[fetchKey];
    }

    setLoadingModules(prev => ({ ...prev, aggregates: true }));

    const promise = (async () => {
      try {
        const res = await fetchAggregates({ force, nppId, nppName });
        if (res && res.aggregates) {
          const prevAggs = aggregatesDataRef.current || {};
          const mergedAggregates = { ...res.aggregates };

          // Sanity check: Calculate total tonDau in previous vs new aggregates
          let prevTotalTonDau = 0;
          let newTotalTonDau = 0;
          Object.values(prevAggs).forEach(v => { prevTotalTonDau += (Number(v?.tonDau) || 0); });
          Object.values(mergedAggregates).forEach(v => { newTotalTonDau += (Number(v?.tonDau) || 0); });

          // If previously we had valid tonDau (> 0) but incoming payload has significantly lost tonDau,
          // preserve the known valid tonDau for each product!
          if (prevTotalTonDau > 0 && newTotalTonDau < prevTotalTonDau * 0.5) {
            console.warn('[DataContext] Incoming aggregates lost tonDau, preserving cached tonDau');
            Object.keys(prevAggs).forEach(id => {
              const prevItem = prevAggs[id];
              if (mergedAggregates[id] && prevItem && prevItem.tonDau > 0 && (mergedAggregates[id].tonDau || 0) === 0) {
                mergedAggregates[id].tonDau = prevItem.tonDau;
                mergedAggregates[id].tonCuoi = mergedAggregates[id].tonDau + (mergedAggregates[id].tongNhap || 0) - (mergedAggregates[id].tongXuat || 0);
              }
            });
          }

          setAggregatesData(mergedAggregates);
          setLocalItem('lnk_aggregates_cache', mergedAggregates);
          if (res.nppProductIds) {
            setNppProductIdsData(res.nppProductIds);
            setLocalItem('lnk_npp_products_cache', res.nppProductIds);
          }
          return { aggregates: mergedAggregates, nppProductIds: res.nppProductIds };
        }
        return { aggregates: aggregatesDataRef.current, nppProductIds: nppProductIdsDataRef.current };
      } catch (err) {
        console.error("fetchAggregatesData error:", err);
        return { aggregates: aggregatesDataRef.current, nppProductIds: nppProductIdsDataRef.current };
      } finally {
        delete inFlightAggregates.current[fetchKey];
        setLoadingModules(prev => ({ ...prev, aggregates: false }));
      }
    })();

    inFlightAggregates.current[fetchKey] = promise;
    return promise;
  }, []);

  // Fetch Essential System Configuration (Home only needs system settings/permissions; business sheets lazy-load on navigation)
  const fetchAllData = useCallback(async () => {
    setSyncStatus('SYNCING');
    try {
      await fetchModule('caidat');
      setSyncStatus('SUCCESS');
      setLastSyncedTime(new Date());
    } catch (err) {
      setSyncStatus('ERROR');
      console.error("fetchAllData error:", err);
    }
  }, [fetchModule]);

  // Append multiple rows to a module
  const appendRows = async (moduleName, rowsArray) => {
    const config = SIMPLE_SHEET_MODULES[moduleName];
    if (!config || !rowsArray || rowsArray.length === 0) return;

    const sheetName = config.sheetName();
    await appendSheetValues(sheetName, rowsArray);
    
    // Update local state
    const current = getModuleData(moduleName);
    const updated = [...current, ...rowsArray];
    setModuleData(moduleName, updated);
  };

  // Append new row to a module
  const appendRow = async (moduleName, rowValues) => {
    await appendRows(moduleName, [rowValues]);
  };

  // Update existing row in a module
  const updateRow = async (moduleName, sheetRowIndex, rowValues) => {
    const config = SIMPLE_SHEET_MODULES[moduleName];
    if (!config || !sheetRowIndex || sheetRowIndex < 1) return;

    const sheetName = config.sheetName();
    const range = `A${sheetRowIndex}:Z${sheetRowIndex}`;
    await updateSheetRange(sheetName, range, [rowValues]);

    // Update local state
    const current = getModuleData(moduleName);
    const updated = [...current];
    if (updated[sheetRowIndex - 1]) {
      updated[sheetRowIndex - 1] = rowValues;
      setModuleData(moduleName, updated);
    }
  };

  // Delete / Clear a row in a module
  const deleteRow = async (moduleName, sheetRowIndex) => {
    const config = SIMPLE_SHEET_MODULES[moduleName];
    if (!config || !sheetRowIndex || sheetRowIndex < 1) return;

    const sheetName = config.sheetName();
    const range = `A${sheetRowIndex}:Z${sheetRowIndex}`;
    const emptyRow = new Array(26).fill('');
    await updateSheetRange(sheetName, range, [emptyRow]);

    const current = getModuleData(moduleName);
    const updated = [...current];
    if (updated[sheetRowIndex - 1]) {
      updated[sheetRowIndex - 1] = emptyRow;
      setModuleData(moduleName, updated);
    }
  };

  // Delete an entire order by MDH
  const deleteOrder = async (moduleName, mdh) => {
    const current = getModuleData(moduleName);
    if (!current || !mdh) return;
    const targetMdh = mdh.toString().trim().toLowerCase();
    
    const rowsToDelete = [];
    current.slice(1).forEach((row, idx) => {
      const rowMdh = (row[3] || '').toString().trim().toLowerCase();
      if (rowMdh === targetMdh) {
        rowsToDelete.push(idx + 2);
      }
    });

    for (const sheetRow of rowsToDelete) {
      await deleteRow(moduleName, sheetRow);
    }
    await fetchModule(moduleName);
  };

  // Delete user from DSNV
  const deleteUser = async (sheetRow) => {
    const sheetName = CONFIG.authSheetName;
    if (!sheetRow || sheetRow < 2) return;
    const range = `A${sheetRow}:H${sheetRow}`;
    const emptyRow = new Array(8).fill('');
    await updateSheetRange(sheetName, range, [emptyRow]);
    await fetchUsersData();
  };

  // Upsert user in DSNV
  const upsertUser = async (userData) => {
    const sheetName = CONFIG.authSheetName;
    const rowValues = [
      userData.id || '',
      userData.name || userData.ho_ten || '',
      userData.image || userData.hinh_anh || '',
      userData.gender || userData.gioi_tinh || '',
      userData.birthDate || userData.ngay_sinh || '',
      userData.role || userData.quyen || '',
      userData.password || userData.mk || '',
      userData.type || userData.truong || 'NHÂN VIÊN'
    ];

    if (userData.sheetRow && userData.sheetRow > 1) {
      const range = `A${userData.sheetRow}:H${userData.sheetRow}`;
      await updateSheetRange(sheetName, range, [rowValues]);
    } else {
      await appendSheetValues(sheetName, [rowValues]);
    }

    await fetchUsersData();
  };

  // Product helper maps
  const getProductMap = useCallback(() => {
    const map = new Map();
    (productData || []).slice(1).forEach(row => {
      const id = (row[0] || '').toString().trim();
      if (!id) return;
      map.set(id.toLowerCase(), {
        id,
        name: (row[1] || '').toString().trim(),
        model: (row[2] || '').toString().trim(),
        image: (row[3] || '').toString().trim(),
        price: cleanNumber(row[4]),
        note: (row[5] || '').toString().trim()
      });
    });
    return map;
  }, [productData]);

  const getProductNameById = useCallback((id) => {
    if (!id) return '';
    const found = getProductMap().get(id.toString().trim().toLowerCase());
    return found ? found.name : id;
  }, [getProductMap]);

  // Map of latest price from CN GIÁ SP for each product
  const getLatestPriceMap = useCallback(() => {
    const map = new Map();
    const rows = (cngiaspData || []).slice(1);
    const sorted = [...rows].sort((a, b) => {
      const dateA = parseSimpleSheetDate(a[1]);
      const dateB = parseSimpleSheetDate(b[1]);
      const timeA = Number.isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = Number.isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b._sheetRow || 0) - (a._sheetRow || 0);
    });

    for (const r of sorted) {
      const maSp = (r[2] || '').toString().trim().toUpperCase();
      if (maSp && !map.has(maSp)) {
        map.set(maSp, {
          maSp,
          tenSp: (r[3] || '').toString().trim(),
          giaNhap: cleanNumber(r[4]) || 0,
          giaBan: cleanNumber(r[5]) || 0,
          giaCu: cleanNumber(r[6]) || 0,
          chenhLech: cleanNumber(r[7]) || 0,
          nguoiCapNhat: (r[8] || '').toString().trim(),
          ngayCapNhat: (r[1] || '').toString().trim(),
          trangThai: (r[10] || '').toString().trim()
        });
      }
    }
    return map;
  }, [cngiaspData]);

  // Pre-index CN GIÁ SP rows by maSp for instant O(1) effective price lookup
  const cngiaspRowsByProduct = useMemo(() => {
    const map = new Map();
    (cngiaspData || []).slice(1).forEach((r, idx) => {
      if (!r || !Array.isArray(r)) return;
      const maSp = (r[2] || '').toString().trim().toUpperCase();
      if (!maSp) return;
      if (!map.has(maSp)) {
        map.set(maSp, []);
      }
      const item = [...r];
      item._sheetRow = idx + 2;
      map.get(maSp).push(item);
    });
    return map;
  }, [cngiaspData]);

  // Fast O(1) effective price lookup on targetDate
  const getPriceAtDate = useCallback((productId, targetDate) => {
    if (!productId) return { price: 0, effectiveDate: null, isFromCngiasp: false };
    const cleanId = productId.toString().trim().toUpperCase();

    const rows = cngiaspRowsByProduct.get(cleanId) || [];
    const prodMap = getProductMap();
    const catProd = prodMap ? prodMap.get(cleanId.toLowerCase()) : null;
    const fallbackPrice = catProd ? (cleanNumber(catProd.price) || 0) : 0;

    return resolveEffectivePrice(rows, targetDate, fallbackPrice);
  }, [cngiaspRowsByProduct, getProductMap]);

  // Sync product price to active orders in LEN_DON based on effective date of each order
  const syncProductPriceToLenDon = useCallback(async (targetMaSp) => {
    if (!targetMaSp) return { updatedCount: 0 };
    const cleanId = targetMaSp.toString().trim().toUpperCase();

    // 1. Fetch fresh cngiaspData to ensure we have the latest state
    const freshCnData = await fetchModule('cngiasp', true);

    // 2. Filter rows for this product from fresh cngiasp
    const prodCnRows = [];
    (freshCnData || []).slice(1).forEach((r, idx) => {
      if (!r || !Array.isArray(r)) return;
      const rowMa = (r[2] || '').toString().trim().toUpperCase();
      if (rowMa === cleanId) {
        const item = [...r];
        item._sheetRow = idx + 2;
        prodCnRows.push(item);
      }
    });

    const prodMap = getProductMap();
    const catProd = prodMap ? prodMap.get(cleanId.toLowerCase()) : null;
    const fallbackPrice = catProd ? (cleanNumber(catProd.price) || 0) : 0;

    // 3. Fetch fresh LEN_DON rows
    const freshLenData = await fetchModule('lendon', true);

    // 4. Find matching rows in LEN_DON and calculate price according to each order's date
    const rowsToUpdate = [];
    (freshLenData || []).slice(1).forEach((r, idx) => {
      if (!r || !Array.isArray(r)) return;
      const rowIdSp = (r[6] || '').toString().trim().toUpperCase();
      if (rowIdSp === cleanId) {
        const sheetRow = idx + 2;
        const trangThai = (r[16] || '').toString().trim();
        // Do not update cancelled orders
        if (trangThai !== 'Đã hủy') {
          const orderDate = r[1]; // Ngày lên đơn
          const priceInfo = resolveEffectivePrice(prodCnRows, orderDate, fallbackPrice);
          const targetPrice = priceInfo.price;
          const slg = cleanNumber(r[8]) || 1;
          const currentPrice = cleanNumber(r[9]);

          if (currentPrice !== targetPrice) {
            const updatedRow = [...r];
            updatedRow[9] = targetPrice;
            updatedRow[10] = slg * targetPrice;
            rowsToUpdate.push({ sheetRow, updatedRow });
          }
        }
      }
    });

    // 5. Update rows in Google Sheets
    if (rowsToUpdate.length > 0) {
      for (const item of rowsToUpdate) {
        await updateRow('lendon', item.sheetRow, item.updatedRow);
      }
      await fetchModule('lendon', true);
    }

    return { updatedCount: rowsToUpdate.length };
  }, [fetchModule, updateRow, getProductMap]);

  // Sync all product prices from CN GIÁ SP to LEN_DON based on effective date of each order
  const syncAllPricesToLenDon = useCallback(async () => {
    const [freshCnData, freshLenData] = await Promise.all([
      fetchModule('cngiasp', true),
      fetchModule('lendon', true)
    ]);

    // Group CN GIÁ SP rows by productId
    const cnRowsByProduct = new Map();
    (freshCnData || []).slice(1).forEach((r, idx) => {
      if (!r || !Array.isArray(r)) return;
      const maSp = (r[2] || '').toString().trim().toUpperCase();
      if (maSp) {
        if (!cnRowsByProduct.has(maSp)) {
          cnRowsByProduct.set(maSp, []);
        }
        const rowWithSheet = [...r];
        rowWithSheet._sheetRow = idx + 2;
        cnRowsByProduct.get(maSp).push(rowWithSheet);
      }
    });

    const prodMap = getProductMap();
    const rowsToUpdate = [];

    (freshLenData || []).slice(1).forEach((r, idx) => {
      if (!r || !Array.isArray(r)) return;
      const idSp = (r[6] || '').toString().trim().toUpperCase();
      if (!idSp) return;
      const trangThai = (r[16] || '').toString().trim();
      if (trangThai === 'Đã hủy') return;

      const prodCnRows = cnRowsByProduct.get(idSp) || [];
      const fb = prodMap ? prodMap.get(idSp.toLowerCase()) : null;
      const fallbackPrice = fb ? (cleanNumber(fb.price) || 0) : 0;

      const orderDate = r[1]; // Ngày lên đơn
      const priceInfo = resolveEffectivePrice(prodCnRows, orderDate, fallbackPrice);
      const targetPrice = priceInfo.price;

      const slg = cleanNumber(r[8]) || 1;
      const currentPrice = cleanNumber(r[9]);

      if (targetPrice > 0 && currentPrice !== targetPrice) {
        const updatedRow = [...r];
        updatedRow[9] = targetPrice;
        updatedRow[10] = slg * targetPrice;
        rowsToUpdate.push({ sheetRow: idx + 2, updatedRow });
      }
    });

    if (rowsToUpdate.length > 0) {
      for (const item of rowsToUpdate) {
        await updateRow('lendon', item.sheetRow, item.updatedRow);
      }
      await fetchModule('lendon', true);
    }

    return rowsToUpdate.length;
  }, [fetchModule, updateRow, getProductMap]);

  // Fetch audit log data from LICH_SU
  const fetchLichSuData = useCallback((force = false) => {
    return fetchModule('lichsu', force);
  }, [fetchModule]);

  // Non-blocking log action to LICH_SU
  const logAuditAction = useCallback(async ({
    moduleName,
    actionType,
    orderId = '',
    targetObject = '',
    summary = '',
    oldData = null,
    newData = null
  }) => {
    try {
      const row = buildAuditLogRow({
        user: currentUser,
        moduleName,
        actionType,
        orderId,
        targetObject,
        summary,
        oldData,
        newData,
        restoreStatus: 'GỐC'
      });

      // Update local state immediately
      setLichSuData(prev => {
        const current = Array.isArray(prev) ? prev : [];
        if (current.length === 0) return [row];
        const hasHeader = current[0] && current[0][0] === 'ID';
        const next = hasHeader ? [current[0], row, ...current.slice(1)] : [row, ...current];
        setLocalItem(STORAGE_KEYS.LICHSU_CACHE, next);
        return next;
      });

      // Background write to Google Sheets LICH_SU
      appendSheetValues(CONFIG.lichSuSheetName, [row]).catch(err => {
        console.warn('Background append to LICH_SU failed:', err);
      });

      return row;
    } catch (err) {
      console.warn('logAuditAction error:', err);
    }
  }, [currentUser]);

  // Rollback audit action (Undo changes)
  const rollbackAuditAction = useCallback(async (logEntry) => {
    if (!logEntry) throw new Error('Không có thông tin bản ghi lịch sử.');
    const [
      logId, timeStr, userDisplay, userRole, phanHe, thaoTac, maDon, targetObject, summary,
      duLieuCuRaw, duLieuMoiRaw, trangThaiKhoiPhuc
    ] = Array.isArray(logEntry) ? logEntry : [];

    if (trangThaiKhoiPhuc && trangThaiKhoiPhuc.toString().startsWith('ĐÃ_KHÔI_PHỤC')) {
      throw new Error('Bản ghi này đã được khôi phục trước đó.');
    }

    let oldData = null;
    try {
      oldData = typeof duLieuCuRaw === 'string' ? JSON.parse(duLieuCuRaw) : duLieuCuRaw;
    } catch (e) {
      console.error('Failed to parse duLieuCu:', e);
    }

    if (!oldData) {
      throw new Error('Không tìm thấy dữ liệu cũ để khôi phục.');
    }

    const normPhanHe = (phanHe || '').toString().trim().toUpperCase();
    const moduleKey = normPhanHe === 'NHẬP' ? 'nhap' : (normPhanHe === 'XUẤT' ? 'xuat' : null);

    if (!moduleKey) {
      throw new Error(`Chưa hỗ trợ khôi phục tự động cho phân hệ: ${phanHe}`);
    }

    // 1. Perform restore operations
    if (thaoTac === 'XÓA_DÒNG') {
      const rowToRestore = Array.isArray(oldData) ? oldData : (oldData.rowValues || oldData);
      await appendRows(moduleKey, [rowToRestore]);
    } else if (thaoTac === 'XÓA_ĐƠN') {
      const rowsToRestore = Array.isArray(oldData) ? oldData : [oldData];
      await appendRows(moduleKey, rowsToRestore);
    } else if (thaoTac === 'CHỈNH_SỬA') {
      if (Array.isArray(oldData)) {
        if (maDon) {
          await deleteOrder(moduleKey, maDon);
        }
        await appendRows(moduleKey, oldData);
      } else if (oldData._sheetRow && oldData.rowValues) {
        await updateRow(moduleKey, oldData._sheetRow, oldData.rowValues);
      }
    } else if (thaoTac === 'THÊM_MỚI') {
      if (maDon) {
        await deleteOrder(moduleKey, maDon);
      }
    }

    // 2. Refresh module data
    await fetchModule(moduleKey, true);

    // 3. Update local LICH_SU status
    const restoreNote = `ĐÃ_KHÔI_PHỤC (${new Date().toLocaleString('vi-VN')} bởi ${currentUser?.name || currentUser?.ho_ten || currentUser?.id || 'Admin'})`;

    setLichSuData(prev => {
      const current = Array.isArray(prev) ? prev : [];
      const updated = current.map(item => {
        if (item[0] === logId) {
          const cloned = [...item];
          cloned[11] = restoreNote;
          return cloned;
        }
        return item;
      });
      setLocalItem(STORAGE_KEYS.LICHSU_CACHE, updated);
      return updated;
    });

    // 4. Log rollback audit record
    await logAuditAction({
      moduleName: phanHe,
      actionType: 'KHÔI_PHỤC',
      orderId: maDon,
      targetObject: targetObject || '',
      summary: `Đã khôi phục tác vụ [${thaoTac}] của đơn ${maDon} (${summary})`
    });

    return true;
  }, [currentUser, appendRows, deleteOrder, updateRow, fetchModule, logAuditAction]);

  return (
    <DataContext.Provider
      value={{
        nhapData,
        dukienData,
        xuatData,
        transferData,
        productData,
        warehouseProductData,
        tonNppData,
        doisoatData,
        cngiaspData,
        lenDonData,
        caidatData,
        lichSuData,
        aggregatesData,
        nppProductIdsData,
        fetchAggregatesData,
        loadingModules,
        syncStatus,
        lastSyncedTime,
        setModuleData,
        getModuleData,
        fetchUsersData,
        fetchModule,
        fetchLichSuData,
        fetchAllData,
        appendRow,
        appendRows,
        updateRow,
        deleteRow,
        deleteOrder,
        upsertUser,
        deleteUser,
        getProductMap,
        getProductNameById,
        getLatestPriceMap,
        getPriceAtDate,
        syncProductPriceToLenDon,
        syncAllPricesToLenDon,
        logAuditAction,
        rollbackAuditAction
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
}

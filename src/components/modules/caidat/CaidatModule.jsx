import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { MODULE_DEFINITIONS, AVAILABLE_ACTIONS } from '../../../config/constants';
import { buildCaiDatRows, saveCaiDatToGoogleSheet, parseCaiDatRows } from '../../../services/caiDatService';
import { clearAllCaches, setLocalItem, STORAGE_KEYS } from '../../../utils/storage';
import { 
  Settings, 
  Warehouse, 
  ShieldCheck, 
  UserX, 
  Table, 
  Database, 
  Save, 
  RotateCw, 
  Plus, 
  Trash2, 
  AlertTriangle,
  CheckCircle2,
  Download,
  Upload,
  CloudUpload,
  CloudDownload,
  Search,
  Edit3,
  Sliders,
  Sparkles,
  ExternalLink,
  X,
  Check
} from 'lucide-react';
import { PermissionMatrix } from './PermissionMatrix';

const STANDARD_ROLES = ['ADMIN', 'KT', 'KHO', 'NPP', 'KD', 'NVKD'];

export function CaidatModule() {
  const { appSettings, updateSettings, applyParsedSettings, getAllSystemWarehouses, getWarehouseOptions } = useSettings();
  const { permissions, setPermissions, applyParsedPermissions, usersData, currentUser } = useAuth();
  const { caidatData, fetchModule, fetchUsersData } = useData();

  const [activeTab, setActiveTab] = useState('system'); // 'system' | 'warehouses' | 'permissions' | 'userRestrictions' | 'sheetTable' | 'backup'
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'info' });

  // Ensure fresh CAI_DAT config on mount
  useEffect(() => {
    fetchModule('caidat');
  }, [fetchModule]);

  // Lazy load users data for Caidat user restrictions
  useEffect(() => {
    if ((!usersData || usersData.length === 0) && currentUser?.role === 'ADMIN') {
      fetchUsersData();
    }
  }, [usersData, currentUser, fetchUsersData]);

  // System form state
  const [sysAppName, setSysAppName] = useState(appSettings?.appName || 'LNK TỒN KHO - ERP SYSTEM');
  const [sysAppVersion, setSysAppVersion] = useState(appSettings?.appVersion || '2.0.0');
  const [sysPageSize, setSysPageSize] = useState(appSettings?.pageSize || 200);
  const [sysLowStock, setSysLowStock] = useState(appSettings?.lowStockThreshold || 10);
  const [sysDefaultWarehouse, setSysDefaultWarehouse] = useState(appSettings?.defaultWarehouse || 'KHO 1');
  const [sysAllowNegativeStock, setSysAllowNegativeStock] = useState(appSettings?.allowNegativeStock || 'CANH_BAO');
  const [sysAutoRefresh, setSysAutoRefresh] = useState(appSettings?.autoRefreshIntervalSec || 300);

  // Warehouses state
  const [warehousesList, setWarehousesList] = useState(() => getAllSystemWarehouses ? getAllSystemWarehouses() : getWarehouseOptions(true));

  // Permissions state (normalized uppercase role keys)
  const [workingRoles, setWorkingRoles] = useState(() => {
    const raw = permissions?.roles || {};
    const norm = {};
    STANDARD_ROLES.forEach(r => {
      norm[r] = {
        modules: raw[r]?.modules || raw[r.toLowerCase()]?.modules || [],
        actions: raw[r]?.actions || raw[r.toLowerCase()]?.actions || []
      };
    });
    return norm;
  });

  const [workingRestrictions, setWorkingRestrictions] = useState(() => JSON.parse(JSON.stringify(permissions?.userRestrictions || {})));
  const [workingUserWarehouses, setWorkingUserWarehouses] = useState(() => JSON.parse(JSON.stringify(permissions?.userWarehouses || {})));
  const [workingDataScopes, setWorkingDataScopes] = useState(() => JSON.parse(JSON.stringify(permissions?.dataScopes || {})));
  const [workingUserPermissions, setWorkingUserPermissions] = useState(() => JSON.parse(JSON.stringify(permissions?.userPermissions || {})));

  // User warehouse assignment state
  const [selectedUserForWarehouse, setSelectedUserForWarehouse] = useState('');
  // User restriction assignment state
  const [selectedUserForRestrict, setSelectedUserForRestrict] = useState('');
  const [restrictProductInput, setRestrictProductInput] = useState('');

  // Sheet table viewer & editor modal state
  const [sheetSearch, setSheetSearch] = useState('');
  const [sheetGroupFilter, setSheetGroupFilter] = useState('ALL');
  const [editingRowModal, setEditingRowModal] = useState(null); // { id, ten_thiet_lap, gia_tri, nhom, kieu_du_lieu, mo_ta, isNew }

  // Sync internal form when appSettings updates
  useEffect(() => {
    if (appSettings) {
      if (appSettings.appName) setSysAppName(appSettings.appName);
      if (appSettings.appVersion) setSysAppVersion(appSettings.appVersion);
      if (appSettings.pageSize) setSysPageSize(appSettings.pageSize);
      if (appSettings.lowStockThreshold) setSysLowStock(appSettings.lowStockThreshold);
      if (appSettings.defaultWarehouse) setSysDefaultWarehouse(appSettings.defaultWarehouse);
      if (appSettings.allowNegativeStock) setSysAllowNegativeStock(appSettings.allowNegativeStock);
      if (appSettings.autoRefreshIntervalSec) setSysAutoRefresh(appSettings.autoRefreshIntervalSec);
      if (Array.isArray(appSettings.warehouses) && appSettings.warehouses.length > 0) {
        setWarehousesList(appSettings.warehouses);
      }
    }
  }, [appSettings]);

  // Sync internal permissions when permissions updates from sheet
  useEffect(() => {
    if (permissions) {
      const raw = permissions.roles || {};
      const norm = {};
      STANDARD_ROLES.forEach(r => {
        norm[r] = {
          modules: raw[r]?.modules || raw[r.toLowerCase()]?.modules || [],
          actions: raw[r]?.actions || raw[r.toLowerCase()]?.actions || []
        };
      });
      setWorkingRoles(norm);
      if (permissions.userRestrictions) setWorkingRestrictions(JSON.parse(JSON.stringify(permissions.userRestrictions)));
      if (permissions.userWarehouses) setWorkingUserWarehouses(JSON.parse(JSON.stringify(permissions.userWarehouses)));
      if (permissions.dataScopes) setWorkingDataScopes(JSON.parse(JSON.stringify(permissions.dataScopes)));
      if (permissions.userPermissions) setWorkingUserPermissions(JSON.parse(JSON.stringify(permissions.userPermissions)));
    }
  }, [permissions]);

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: 'info' }), 6000);
  };

  // --- SAVE & SYNC TO GOOGLE SHEETS (CAI_DAT) ---
  const handleSaveAndSyncToSheet = async () => {
    setIsSaving(true);
    try {
      // 1. Sanitize roles ensuring ADMIN retains caidat, home, and caidat.manage
      const sanitizedRoles = { ...workingRoles };
      if (!sanitizedRoles.ADMIN) {
        sanitizedRoles.ADMIN = { modules: [], actions: [] };
      }
      const adminMods = Array.isArray(sanitizedRoles.ADMIN.modules) ? [...sanitizedRoles.ADMIN.modules] : [];
      if (!adminMods.includes('caidat')) adminMods.push('caidat');
      if (!adminMods.includes('home')) adminMods.push('home');
      sanitizedRoles.ADMIN.modules = adminMods;

      const adminActs = Array.isArray(sanitizedRoles.ADMIN.actions) ? [...sanitizedRoles.ADMIN.actions] : [];
      if (!adminActs.includes('caidat.manage')) adminActs.push('caidat.manage');
      sanitizedRoles.ADMIN.actions = adminActs;

      // Update local context states
      const updatedSettings = {
        ...appSettings,
        appName: sysAppName,
        appVersion: sysAppVersion,
        pageSize: Number(sysPageSize) || 200,
        lowStockThreshold: Number(sysLowStock) || 10,
        defaultWarehouse: sysDefaultWarehouse,
        allowNegativeStock: sysAllowNegativeStock,
        autoRefreshIntervalSec: Number(sysAutoRefresh) || 300,
        warehouses: warehousesList
      };
      updateSettings(updatedSettings);

      const updatedPermissions = {
        ...permissions,
        roles: sanitizedRoles,
        userPermissions: workingUserPermissions,
        userRestrictions: workingRestrictions,
        userWarehouses: workingUserWarehouses,
        dataScopes: workingDataScopes
      };
      setPermissions(updatedPermissions);
      setLocalItem(STORAGE_KEYS.PERMISSIONS, updatedPermissions);
      setWorkingRoles(sanitizedRoles);
      setWorkingUserPermissions(workingUserPermissions);

      // 2. Build rows for CAI_DAT sheet
      const rowsToSave = buildCaiDatRows({
        settings: updatedSettings,
        permissions: updatedPermissions,
        currentUser,
        rawAdditionalRows: (caidatData || []).slice(1)
      });

      // 3. Write directly to Google Sheet CAI_DAT
      await saveCaiDatToGoogleSheet(rowsToSave);

      // 4. Reload caidat module to ensure synchronicity
      await fetchModule('caidat');

      showToast(`Đã lưu & đồng bộ thành công ${rowsToSave.length - 1} mục cấu hình lên Google Sheet CAI_DAT!`);
    } catch (err) {
      console.error("Lỗi khi lưu CAI_DAT:", err);
      showToast("Lỗi khi lưu lên Google Sheet: " + (err.message || err), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- PULL FRESH CONFIG FROM GOOGLE SHEETS (CAI_DAT) ---
  const handleRefreshFromSheet = async () => {
    setIsRefreshing(true);
    try {
      const rows = await fetchModule('caidat');
      if (rows && rows.length > 1) {
        const parsed = parseCaiDatRows(rows);
        if (parsed) {
          if (parsed.settings) {
            applyParsedSettings(parsed.settings);
            if (parsed.settings.appName) setSysAppName(parsed.settings.appName);
            if (parsed.settings.appVersion) setSysAppVersion(parsed.settings.appVersion);
            if (parsed.settings.pageSize) setSysPageSize(parsed.settings.pageSize);
            if (parsed.settings.lowStockThreshold) setSysLowStock(parsed.settings.lowStockThreshold);
            if (parsed.settings.defaultWarehouse) setSysDefaultWarehouse(parsed.settings.defaultWarehouse);
            if (parsed.settings.allowNegativeStock) setSysAllowNegativeStock(parsed.settings.allowNegativeStock);
            if (parsed.settings.autoRefreshIntervalSec) setSysAutoRefresh(parsed.settings.autoRefreshIntervalSec);
            if (Array.isArray(parsed.settings.warehouses) && parsed.settings.warehouses.length > 0) {
              setWarehousesList(parsed.settings.warehouses);
            }
          }
          if (parsed.permissions) {
            applyParsedPermissions(parsed.permissions);
            if (parsed.permissions.roles) {
              const norm = {};
              STANDARD_ROLES.forEach(r => {
                norm[r] = {
                  modules: parsed.permissions.roles[r]?.modules || [],
                  actions: parsed.permissions.roles[r]?.actions || []
                };
              });
              setWorkingRoles(norm);
            }
            if (parsed.permissions.userRestrictions) setWorkingRestrictions(parsed.permissions.userRestrictions);
            if (parsed.permissions.userWarehouses) setWorkingUserWarehouses(parsed.permissions.userWarehouses);
            if (parsed.permissions.dataScopes) setWorkingDataScopes(parsed.permissions.dataScopes);
            if (parsed.permissions.userPermissions) setWorkingUserPermissions(parsed.permissions.userPermissions);
          }
        }
        showToast(`Đã tải lại ${rows.length - 1} mục cài đặt mới nhất từ Google Sheet CAI_DAT.`);
      } else {
        showToast('Sheet CAI_DAT hiện chưa có dữ liệu nào.');
      }
    } catch (err) {
      showToast("Lỗi khi tải từ Google Sheet: " + (err.message || err), 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddWarehouse = () => {
    const name = newWarehouseName.trim().toUpperCase();
    if (!name) return;
    if (warehousesList.includes(name)) return alert('Kho này đã tồn tại!');
    const updated = [...warehousesList, name];
    setWarehousesList(updated);
    setNewWarehouseName('');
    showToast(`Đã thêm kho ${name}. Hãy bấm "Lưu & Đồng bộ" để ghi lên Google Sheet.`);
  };

  const handleRemoveWarehouse = (name) => {
    if (warehousesList.length <= 1) return alert('Hệ thống phải có ít nhất 1 kho!');
    if (!window.confirm(`Bạn có chắc muốn xóa ${name} khỏi danh sách kho?`)) return;
    const updated = warehousesList.filter(w => w !== name);
    setWarehousesList(updated);
    showToast(`Đã xóa kho ${name}. Hãy bấm "Lưu & Đồng bộ" để cập nhật.`);
  };

  const handleToggleModuleForRole = (roleKey, moduleKey) => {
    const upperRole = roleKey.toUpperCase();
    setWorkingRoles(prev => {
      const nextRoles = { ...prev };
      const currentRoleObj = nextRoles[upperRole] ? { ...nextRoles[upperRole] } : { modules: [], actions: [] };
      const currentModules = Array.isArray(currentRoleObj.modules) ? [...currentRoleObj.modules] : [];
      if (currentModules.includes(moduleKey)) {
        currentRoleObj.modules = currentModules.filter(m => m !== moduleKey);
      } else {
        currentRoleObj.modules = [...currentModules, moduleKey];
      }
      nextRoles[upperRole] = currentRoleObj;
      return nextRoles;
    });
  };

  const handleToggleActionForRole = (roleKey, actionKey) => {
    const upperRole = roleKey.toUpperCase();
    setWorkingRoles(prev => {
      const nextRoles = { ...prev };
      const currentRoleObj = nextRoles[upperRole] ? { ...nextRoles[upperRole] } : { modules: [], actions: [] };
      const currentActions = Array.isArray(currentRoleObj.actions) ? [...currentRoleObj.actions] : [];
      if (currentActions.includes(actionKey)) {
        currentRoleObj.actions = currentActions.filter(a => a !== actionKey);
      } else {
        currentRoleObj.actions = [...currentActions, actionKey];
      }
      nextRoles[upperRole] = currentRoleObj;
      return nextRoles;
    });
  };

  // User warehouse assignment toggle
  const getUserAssignedWarehouses = (user) => {
    if (!user) return [];
    if (workingUserWarehouses[user.id]) return workingUserWarehouses[user.id];
    const normId = (user.id || '').trim().toLowerCase();
    const normName = (user.name || '').trim().toLowerCase();
    const nameTokens = normName.split(/[\s\-_,.]+/).filter(Boolean);
    const foundKey = Object.keys(workingUserWarehouses).find(k => {
      const normK = k.trim().toLowerCase();
      return normK === normId || normK === normName || nameTokens.includes(normK);
    });
    return foundKey ? workingUserWarehouses[foundKey] : [];
  };

  const handleToggleUserWarehouse = (userId, warehouseName) => {
    if (!userId) return;
    const nextUserWh = { ...workingUserWarehouses };
    let targetKey = userId;
    if (!nextUserWh[userId]) {
      const user = (usersData || []).find(u => u.id === userId);
      if (user) {
        const normName = (user.name || '').trim().toLowerCase();
        const tokens = normName.split(/[\s\-_,.]+/).filter(Boolean);
        const aliasKey = Object.keys(nextUserWh).find(k => {
          const normK = k.trim().toLowerCase();
          return normK === normName || tokens.includes(normK);
        });
        if (aliasKey) {
          targetKey = aliasKey;
        }
      }
    }

    const currentList = nextUserWh[targetKey] || [];
    let updatedList;
    if (currentList.includes(warehouseName)) {
      updatedList = currentList.filter(w => w !== warehouseName);
    } else {
      updatedList = [...currentList, warehouseName];
    }

    if (targetKey !== userId) {
      delete nextUserWh[targetKey];
    }

    if (updatedList.length === 0) {
      delete nextUserWh[userId];
    } else {
      nextUserWh[userId] = updatedList;
    }

    setWorkingUserWarehouses(nextUserWh);
  };

  // User product restriction add/remove
  const handleAddUserProductRestriction = () => {
    if (!selectedUserForRestrict || !restrictProductInput.trim()) return;
    const idToAdd = restrictProductInput.trim().toUpperCase();
    const nextRestrict = { ...workingRestrictions };
    if (!nextRestrict[selectedUserForRestrict]) {
      nextRestrict[selectedUserForRestrict] = { hiddenProductIds: [] };
    }
    const currentHidden = nextRestrict[selectedUserForRestrict].hiddenProductIds || [];
    if (!currentHidden.includes(idToAdd)) {
      nextRestrict[selectedUserForRestrict].hiddenProductIds = [...currentHidden, idToAdd];
    }
    setWorkingRestrictions(nextRestrict);
    setRestrictProductInput('');
    showToast(`Đã ẩn sản phẩm ${idToAdd} cho tài khoản ${selectedUserForRestrict}`);
  };

  const handleRemoveUserProductRestriction = (userId, prodId) => {
    const nextRestrict = { ...workingRestrictions };
    if (nextRestrict[userId]) {
      nextRestrict[userId].hiddenProductIds = (nextRestrict[userId].hiddenProductIds || []).filter(p => p !== prodId);
      if (nextRestrict[userId].hiddenProductIds.length === 0) delete nextRestrict[userId];
    }
    setWorkingRestrictions(nextRestrict);
    showToast(`Đã bỏ ẩn sản phẩm ${prodId} cho ${userId}`);
  };

  // Filtered raw sheet rows
  const sheetRows = useMemo(() => {
    const raw = (caidatData || []).slice(1);
    return raw.filter(r => {
      const id = (r[0] || '').toLowerCase();
      const name = (r[1] || '').toLowerCase();
      const val = (r[2] || '').toLowerCase();
      const group = (r[3] || '').toUpperCase();

      if (sheetGroupFilter !== 'ALL' && group !== sheetGroupFilter) return false;

      if (sheetSearch) {
        const query = sheetSearch.toLowerCase().trim();
        return id.includes(query) || name.includes(query) || val.includes(query);
      }
      return true;
    });
  }, [caidatData, sheetGroupFilter, sheetSearch]);

  const sheetGroups = useMemo(() => {
    const set = new Set();
    (caidatData || []).slice(1).forEach(r => {
      if (r[3]) set.add(r[3].toString().trim().toUpperCase());
    });
    return Array.from(set);
  }, [caidatData]);

  // Handle Save Row in Sheet Table Modal
  const handleSaveModalRow = async (modalData) => {
    if (!modalData || !modalData.id) return;
    setIsSaving(true);
    try {
      const dateStr = new Date().toLocaleDateString('vi-VN');
      const userStr = currentUser?.name || currentUser?.id || 'ADMIN';
      
      const currentData = (caidatData || []).slice(1);
      const existingIdx = currentData.findIndex(r => (r[0] || '').toString().trim() === modalData.id.trim());

      let updatedRows = [];
      if (existingIdx !== -1) {
        // Update existing row
        updatedRows = [
          caidatData[0] || ["id", "ten_thiet_lap", "gia_tri", "nhom", "kieu_du_lieu", "mo_ta", "ngay_cap_nhat", "nguoi_cap_nhat"],
          ...currentData.map((row, idx) => {
            if (idx === existingIdx) {
              return [
                modalData.id,
                modalData.ten_thiet_lap || row[1] || '',
                modalData.gia_tri || '',
                modalData.nhom || row[3] || 'HE_THONG',
                modalData.kieu_du_lieu || row[4] || 'text',
                modalData.mo_ta || row[5] || '',
                dateStr,
                userStr
              ];
            }
            return row;
          })
        ];
      } else {
        // Add new row
        updatedRows = [
          caidatData[0] || ["id", "ten_thiet_lap", "gia_tri", "nhom", "kieu_du_lieu", "mo_ta", "ngay_cap_nhat", "nguoi_cap_nhat"],
          ...currentData,
          [
            modalData.id,
            modalData.ten_thiet_lap || modalData.id,
            modalData.gia_tri || '',
            modalData.nhom || 'HE_THONG',
            modalData.kieu_du_lieu || 'text',
            modalData.mo_ta || '',
            dateStr,
            userStr
          ]
        ];
      }

      await saveCaiDatToGoogleSheet(updatedRows);
      await fetchModule('caidat');
      setEditingRowModal(null);
      showToast(`Đã lưu thành công thiết lập [${modalData.id}] lên Google Sheet CAI_DAT!`);
    } catch (err) {
      console.error("Lỗi khi lưu thiết lập:", err);
      showToast("Lỗi khi lưu thiết lập: " + (err.message || err), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBackupJson = () => {
    const backupData = {
      appSettings: {
        appName: sysAppName,
        appVersion: sysAppVersion,
        pageSize: sysPageSize,
        lowStockThreshold: sysLowStock,
        defaultWarehouse: sysDefaultWarehouse,
        allowNegativeStock: sysAllowNegativeStock,
        autoRefreshIntervalSec: sysAutoRefresh,
        warehouses: warehousesList
      },
      permissions: {
        roles: workingRoles,
        userPermissions: workingUserPermissions,
        userRestrictions: workingRestrictions,
        userWarehouses: workingUserWarehouses,
        dataScopes: workingDataScopes
      },
      caidatSheetRows: caidatData,
      backupAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_cai_dat_lnk_${Date.now()}.json`;
    a.click();
  };

  const handleClearCache = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ bộ nhớ cache ngoại tuyến của trình duyệt?")) {
      clearAllCaches();
      showToast('Đã dọn dẹp toàn bộ bộ nhớ cache.');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Toast message */}
      {message.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md transition-all ${
          message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="leading-snug">{message.text}</span>
          </div>
          <button onClick={() => setMessage({ text: '', type: 'info' })} className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1">✕</button>
        </div>
      )}

      {/* Top Header Card with Cloud Sync Action */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                Quản trị Cài đặt & Phân quyền Hệ thống
              </h2>
              <p className="text-xs text-slate-500">
                Lưu trữ tập trung tham số hệ thống, danh mục kho, ma trận quyền và phân quyền tài khoản trên sheet <span className="font-mono font-bold text-indigo-600">CAI_DAT</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRefreshFromSheet}
            disabled={isRefreshing}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Tải lại cài đặt mới nhất từ Google Sheets"
          >
            <CloudDownload className={`w-4 h-4 ${isRefreshing ? 'animate-bounce text-blue-600' : 'text-slate-600'}`} />
            {isRefreshing ? 'Đang tải...' : 'Tải lại từ Sheet'}
          </button>

          <button
            type="button"
            onClick={handleSaveAndSyncToSheet}
            disabled={isSaving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CloudUpload className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Đang lưu lên Google Sheet...' : 'Lưu & Đồng bộ lên Sheet CAI_DAT'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'system' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          1. Hệ thống & Vận hành
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('warehouses')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'warehouses' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          2. Kho hàng & Phân quyền Kho ({warehousesList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'permissions' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          3. Phân quyền Vai trò & Nhân viên
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('userRestrictions')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'userRestrictions' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserX className="w-4 h-4" />
          4. Giới hạn User & Phạm vi
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sheetTable')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'sheetTable' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Table className="w-4 h-4" />
          5. Bảng Sheet CAI_DAT ({(caidatData || []).length > 1 ? (caidatData.length - 1) : 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'backup' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          6. Sao lưu & Dọn cache
        </button>
      </div>

      {/* Tab 1: System Settings */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 max-w-4xl">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Cấu hình chung hệ thống (SYS_APP)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Các thông số vận hành cốt lõi, kho mặc định và chu kỳ đồng bộ</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 uppercase mb-1">Tên ứng dụng hiển thị</label>
              <input
                type="text"
                value={sysAppName}
                onChange={(e) => setSysAppName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 uppercase mb-1">Phiên bản hệ thống</label>
              <input
                type="text"
                value={sysAppVersion}
                onChange={(e) => setSysAppVersion(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 uppercase mb-1">Kho mặc định khi tạo phiếu mới</label>
              <select
                value={sysDefaultWarehouse}
                onChange={(e) => setSysDefaultWarehouse(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {warehousesList.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 uppercase mb-1">Ngưỡng cảnh báo tồn kho tối thiểu</label>
              <input
                type="number"
                value={sysLowStock}
                onChange={(e) => setSysLowStock(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 uppercase mb-1">Quy định xuất âm kho</label>
              <select
                value={sysAllowNegativeStock}
                onChange={(e) => setSysAllowNegativeStock(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="CANH_BAO">Cảnh báo màu đỏ nhưng vẫn cho xuất</option>
                <option value="CAM_XUAT">Nghiêm cấm xuất khi tồn kho ≤ 0</option>
                <option value="CHO_PHEP">Cho phép xuất âm tự do</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 uppercase mb-1">Chu kỳ tự động làm mới từ Sheet (Giây)</label>
              <input
                type="number"
                value={sysAutoRefresh}
                onChange={(e) => setSysAutoRefresh(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="300 (5 phút)"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleSaveAndSyncToSheet}
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Đang lưu...' : 'Lưu & Ghi vào Sheet CAI_DAT'}
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Warehouses & User Warehouse Assignment */}
      {activeTab === 'warehouses' && (
        <div className="space-y-6 max-w-4xl">
          {/* Warehouse list manager */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">1. Danh mục Kho hàng trong hệ thống (WAREHOUSE_LIST)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Thêm hoặc xóa các kho hàng hoạt động trong hệ thống</p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newWarehouseName}
                onChange={(e) => setNewWarehouseName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWarehouse()}
                placeholder="Nhập tên kho mới (VD: KHO 6, KHO HÀ NỘI...)"
                className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddWarehouse}
                disabled={!newWarehouseName.trim()}
                className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Thêm kho
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {warehousesList.map((wh, idx) => (
                <div key={wh} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 font-black text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-extrabold text-slate-800">{wh}</span>
                    {wh === sysDefaultWarehouse && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">
                        Kho mặc định
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveWarehouse(wh)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    title="Xóa kho"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* User Warehouse Assignments (Phân quyền kho cho từng User) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">2. Phân quyền Kho cho từng Tài khoản (USER_KHO_*)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Chỉ định kho cụ thể mà nhân viên được phép xem/xuất/nhập</p>
            </div>

            <div className="space-y-3">
              {(usersData || []).filter(u => u.type === 'NHÂN VIÊN' || u.role === 'KHO' || u.role === 'ADMIN').map(u => {
                const assignedWhs = getUserAssignedWarehouses(u);
                const isRestricted = assignedWhs.length > 0;

                return (
                  <div key={u.id} className="p-4 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-xs">{u.id} - {u.name}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-semibold">{u.role}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isRestricted ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isRestricted ? `Quản lý ${assignedWhs.length} kho: ${assignedWhs.join(', ')}` : 'Tất cả các kho (Mặc định)'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                      {warehousesList.map(wh => {
                        const isChecked = assignedWhs.includes(wh);
                        return (
                          <label
                            key={wh}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border transition flex items-center gap-1.5 ${
                              isChecked ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleUserWarehouse(u.id, wh)}
                              className="hidden"
                            />
                            {wh}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleSaveAndSyncToSheet}
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Đang lưu...' : 'Lưu & Ghi vào Sheet CAI_DAT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Permissions Matrix */}
      {activeTab === 'permissions' && (
        <PermissionMatrix
          workingRoles={workingRoles}
          setWorkingRoles={setWorkingRoles}
          workingUserPermissions={workingUserPermissions}
          setWorkingUserPermissions={setWorkingUserPermissions}
          usersData={usersData}
          onSave={handleSaveAndSyncToSheet}
          isSaving={isSaving}
        />
      )}

      {/* Tab 4: User Restrictions & Data Scopes */}
      {activeTab === 'userRestrictions' && (
        <div className="space-y-6 max-w-4xl">
          {/* User Product Hiding Restrictions */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">1. Giới hạn Ẩn sản phẩm theo Tài khoản (USER_RESTRICT_*)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Ẩn danh sách mã sản phẩm nhất định đối với từng khách hàng NPP hoặc nhân viên</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedUserForRestrict}
                onChange={(e) => setSelectedUserForRestrict(e.target.value)}
                className="px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-800 outline-none"
              >
                <option value="">-- Chọn tài khoản cần giới hạn --</option>
                {(usersData || []).map(u => (
                  <option key={u.id} value={u.id}>{u.id} - {u.name} ({u.type})</option>
                ))}
              </select>

              <input
                type="text"
                value={restrictProductInput}
                onChange={(e) => setRestrictProductInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUserProductRestriction()}
                placeholder="Nhập Mã SP cần ẩn (VD: TK-0348)"
                className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none"
              />

              <button
                type="button"
                onClick={handleAddUserProductRestriction}
                disabled={!selectedUserForRestrict || !restrictProductInput.trim()}
                className="px-5 py-2.5 bg-amber-600 text-white font-bold rounded-xl text-xs hover:bg-amber-700 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Thêm mã ẩn
              </button>
            </div>

            {/* List of active restrictions */}
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {Object.keys(workingRestrictions).length > 0 ? (
                Object.keys(workingRestrictions).map(userId => {
                  const hiddenIds = workingRestrictions[userId]?.hiddenProductIds || [];
                  return (
                    <div key={userId} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50">
                      <div>
                        <span className="font-extrabold text-slate-800">{userId}</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {hiddenIds.map(pid => (
                            <span key={pid} className="px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-[11px] font-bold flex items-center gap-1">
                              {pid}
                              <button
                                type="button"
                                onClick={() => handleRemoveUserProductRestriction(userId, pid)}
                                className="hover:text-red-900 font-black ml-1 cursor-pointer"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  Chưa có tài khoản nào bị giới hạn ẩn sản phẩm.
                </div>
              )}
            </div>
          </div>

          {/* Data Scopes */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">2. Quy định Phạm vi dữ liệu theo Vai trò (SCOPE_*)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Định nghĩa phạm vi dòng dữ liệu mà từng vai trò nhìn thấy</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="font-bold text-slate-700 block">NPP - Danh sách Sản phẩm (SCOPE_NPP_SANPHAM)</span>
                <p className="text-slate-500 mt-0.5">Chỉ xem Ảnh, ID, Tên SP, Tồn cuối của các ID SP mà Nhà Phân Phối đã từng nhập trong XUAT_CT.</p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="font-bold text-slate-700 block">NPP - Danh sách Xuất kho (SCOPE_NPP_XUAT)</span>
                <p className="text-slate-500 mt-0.5">Chỉ xem các đơn hàng xuất mà mã khách hàng trùng khớp với ID tài khoản NPP.</p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="font-bold text-slate-700 block">NVKD - Nhập Xuất (SCOPE_NVKD_NX)</span>
                <p className="text-slate-500 mt-0.5">Chỉ xem các đơn hàng được tạo bởi chính tài khoản nhân viên kinh doanh đó.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleSaveAndSyncToSheet}
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl text-xs hover:bg-amber-700 shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Đang lưu...' : 'Lưu & Ghi vào Sheet CAI_DAT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Raw CAI_DAT Sheet Table Viewer & Editor */}
      {activeTab === 'sheetTable' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={sheetSearch}
                onChange={(e) => setSheetSearch(e.target.value)}
                placeholder="Tìm mã ID, tên thiết lập, giá trị..."
                className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Category Filter & Add Button */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setSheetGroupFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  sheetGroupFilter === 'ALL' ? 'bg-slate-800 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({sheetRows.length})
              </button>

              {sheetGroups.map(grp => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setSheetGroupFilter(grp)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    sheetGroupFilter === grp ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {grp}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setEditingRowModal({
                  id: '',
                  ten_thiet_lap: '',
                  gia_tri: '',
                  nhom: 'HE_THONG',
                  kieu_du_lieu: 'text',
                  mo_ta: '',
                  isNew: true
                })}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm thiết lập mới
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto border border-slate-200 rounded-2xl custom-scrollbar">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Hành động</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Mã ID</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Tên thiết lập</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Giá trị (gia_tri)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Nhóm (nhom)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Kiểu</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Mô tả</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Cập nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sheetRows.length > 0 ? (
                  sheetRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/30 transition">
                      <td className="py-2 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditingRowModal({
                            id: r[0] || '',
                            ten_thiet_lap: r[1] || '',
                            gia_tri: r[2] || '',
                            nhom: r[3] || 'HE_THONG',
                            kieu_du_lieu: r[4] || 'text',
                            mo_ta: r[5] || '',
                            isNew: false
                          })}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold rounded-lg transition flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          Sửa
                        </button>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono font-bold text-slate-800 text-[11px]">
                        {r[0]}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-semibold text-slate-700">
                        {r[1]}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-800 max-w-xs truncate" title={r[2]}>
                        {r[2]}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {r[3]}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-500 font-mono text-[10px]">
                        {r[4]}
                      </td>
                      <td className="py-2 px-3 text-slate-500 max-w-sm truncate" title={r[5]}>
                        {r[5]}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-400 text-[11px]">
                        {r[6]} • {r[7]}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      Không tìm thấy bản ghi cài đặt nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Backup & Cache */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 max-w-4xl">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Sao lưu & Quản lý Bộ nhớ tạm</h3>
            <p className="text-xs text-slate-400 mt-0.5">Bảo toàn dữ liệu phân quyền và làm sạch dữ liệu trình duyệt</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 border border-slate-200 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-slate-800">Xuất file cấu hình JSON</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Sao lưu toàn bộ ma trận phân quyền, tham số dự báo và cài đặt kho ra file .json ngoại tuyến.
              </p>
              <button
                type="button"
                onClick={handleExportBackupJson}
                className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition cursor-pointer shadow-2xs"
              >
                Tải file Backup JSON
              </button>
            </div>

            <div className="p-5 border border-red-200 bg-red-50/20 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-red-800">Xóa sạch LocalStorage Cache</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Xóa dữ liệu bộ nhớ tạm lưu cục bộ để tải lại 100% dữ liệu gốc từ Google Sheets.
              </p>
              <button
                type="button"
                onClick={handleClearCache}
                className="w-full py-2.5 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 transition cursor-pointer shadow-2xs"
              >
                Làm sạch Cache
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row Edit Modal for Sheet CAI_DAT */}
      {editingRowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                {editingRowModal.isNew ? 'Thêm mới Thiết lập CAI_DAT' : `Chỉnh sửa: [${editingRowModal.id}]`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRowModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Mã ID Thiết lập</label>
                <input
                  type="text"
                  value={editingRowModal.id}
                  disabled={!editingRowModal.isNew}
                  onChange={(e) => setEditingRowModal({ ...editingRowModal, id: e.target.value })}
                  placeholder="VD: SYS_CUSTOM_KEY"
                  className={`w-full px-3.5 py-2.5 border rounded-xl font-mono font-bold text-xs uppercase outline-none ${
                    editingRowModal.isNew ? 'border-slate-200 focus:ring-2 focus:ring-emerald-500' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Tên Thiết lập</label>
                <input
                  type="text"
                  value={editingRowModal.ten_thiet_lap}
                  onChange={(e) => setEditingRowModal({ ...editingRowModal, ten_thiet_lap: e.target.value })}
                  placeholder="VD: Cấu hình tỷ lệ phụ phí"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Giá trị (gia_tri)</label>
                <textarea
                  rows={3}
                  value={editingRowModal.gia_tri}
                  onChange={(e) => setEditingRowModal({ ...editingRowModal, gia_tri: e.target.value })}
                  placeholder="Nhập giá trị thiết lập..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Nhóm (nhom)</label>
                  <input
                    type="text"
                    value={editingRowModal.nhom}
                    onChange={(e) => setEditingRowModal({ ...editingRowModal, nhom: e.target.value.toUpperCase() })}
                    placeholder="HE_THONG, VAI_TRO..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold uppercase text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Kiểu dữ liệu</label>
                  <select
                    value={editingRowModal.kieu_du_lieu}
                    onChange={(e) => setEditingRowModal({ ...editingRowModal, kieu_du_lieu: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="text">text (Văn bản)</option>
                    <option value="number">number (Số)</option>
                    <option value="list">list (Danh sách phẩy)</option>
                    <option value="json">json (Cấu trúc JSON)</option>
                    <option value="boolean">boolean (true/false)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Mô tả thiết lập</label>
                <input
                  type="text"
                  value={editingRowModal.mo_ta}
                  onChange={(e) => setEditingRowModal({ ...editingRowModal, mo_ta: e.target.value })}
                  placeholder="Mô tả công dụng của thiết lập này..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRowModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={() => handleSaveModalRow(editingRowModal)}
                disabled={isSaving || !editingRowModal.id.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Đang lưu...' : 'Lưu vào Sheet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

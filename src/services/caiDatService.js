import { CONFIG, MODULE_DEFINITIONS } from '../config/constants';
import { fetchSheetValues, batchClearAndWriteSheet, updateSheetRange } from './googleSheetsService';

/**
 * Parses rows from the CAI_DAT Google Sheet into structured objects
 * @param {Array<Array<string>>} rows 
 * @returns {Object|null}
 */
export function parseCaiDatRows(rows) {
  if (!rows || rows.length <= 1) return null;
  const dataRows = rows.slice(1);

  const settings = {};
  const roles = {};
  const userRestrictions = {};
  const userWarehouses = {};
  const dataScopes = {};
  let forecastParams = null;
  const columnConfigs = {};

  dataRows.forEach(row => {
    const id = (row[0] || '').toString().trim();
    const value = (row[2] || '').toString().trim();
    const type = (row[4] || 'text').toString().trim().toLowerCase();
    if (!id) return;

    let parsedVal = value;
    if (type === 'number') {
      parsedVal = Number(value) || 0;
    } else if (type === 'list') {
      parsedVal = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
    } else if (type === 'json') {
      try {
        parsedVal = JSON.parse(value);
      } catch (e) {
        parsedVal = value;
      }
    } else if (type === 'boolean') {
      parsedVal = value === 'true' || value === '1';
    }

    // System Settings
    if (id === 'SYS_APP_NAME') settings.appName = value;
    else if (id === 'SYS_APP_VERSION') settings.appVersion = value;
    else if (id === 'SYS_PAGE_SIZE') settings.pageSize = Number(value) || 200;
    else if (id === 'WAREHOUSE_LIST') settings.warehouses = Array.isArray(parsedVal) ? parsedVal : (value ? value.split(',').map(s => s.trim()) : []);
    else if (id === 'DEFAULT_WAREHOUSE') settings.defaultWarehouse = value;
    else if (id === 'WARN_LOW_STOCK_THRESHOLD') settings.lowStockThreshold = Number(value) || 10;
    else if (id === 'ALLOW_NEGATIVE_STOCK') settings.allowNegativeStock = value;
    else if (id === 'AUTO_REFRESH_INTERVAL_SEC') settings.autoRefreshIntervalSec = Number(value) || 300;
    else if (id === 'STATUS_XUAT_CONFIRM_OPTIONS') settings.xuatConfirmStatuses = Array.isArray(parsedVal) ? parsedVal : [];
    else if (id === 'FORECAST_PARAMS') forecastParams = parsedVal;

    // Roles & Permissions (normalized to uppercase)
    else if (id.startsWith('ROLE_') && id.endsWith('_MODULES')) {
      const rawRoleKey = id.substring(5, id.length - 8);
      const roleKey = rawRoleKey.toUpperCase();
      if (!roles[roleKey]) roles[roleKey] = { modules: [], actions: [] };
      const mods = Array.isArray(parsedVal) ? parsedVal : (value ? value.split(',').map(s => s.trim()) : []);
      roles[roleKey].modules = Array.from(new Set([...roles[roleKey].modules, ...mods]));
      if (roleKey === 'ADMIN') {
        MODULE_DEFINITIONS.forEach(m => {
          if (!roles[roleKey].modules.includes(m.key)) {
            roles[roleKey].modules.push(m.key);
          }
        });
      }
    }
    else if (id.startsWith('ROLE_') && id.endsWith('_ACTIONS')) {
      const rawRoleKey = id.substring(5, id.length - 8);
      const roleKey = rawRoleKey.toUpperCase();
      if (!roles[roleKey]) roles[roleKey] = { modules: [], actions: [] };
      const acts = Array.isArray(parsedVal) ? parsedVal : (value ? value.split(',').map(s => s.trim()) : []);
      roles[roleKey].actions = Array.from(new Set([...roles[roleKey].actions, ...acts]));
    }

    // User Warehouse assignments (e.g., USER_KHO_dự)
    else if (id.startsWith('USER_KHO_')) {
      const userId = id.substring(9);
      userWarehouses[userId] = Array.isArray(parsedVal) ? parsedVal : (value ? value.split(',').map(s => s.trim()) : []);
    }

    // User Product Restrictions (e.g., USER_RESTRICT_KH00206)
    else if (id.startsWith('USER_RESTRICT_')) {
      const userId = id.substring(14);
      userRestrictions[userId] = {
        hiddenProductIds: Array.isArray(parsedVal) ? parsedVal : (value ? value.split(',').map(s => s.trim()) : [])
      };
    }

    // Data scopes (e.g., SCOPE_NPP_SANPHAM)
    else if (id.startsWith('SCOPE_')) {
      const parts = id.split('_');
      if (parts.length >= 3) {
        const r = parts[1].toUpperCase();
        const m = parts.slice(2).join('_').toLowerCase();
        if (!dataScopes[r]) dataScopes[r] = {};
        dataScopes[r][m] = value;
      }
    }

    // Column Configs
    else if (id.startsWith('COLUMN_CONFIG_')) {
      const modKey = id.substring(14).toLowerCase();
      columnConfigs[modKey] = parsedVal;
    }
  });

  return {
    settings,
    permissions: {
      roles,
      userRestrictions,
      userWarehouses,
      dataScopes
    },
    forecastParams,
    columnConfigs
  };
}

/**
 * Builds the 8-column matrix of CAI_DAT to write to Google Sheet
 * @param {Object} params 
 * @returns {Array<Array<string>>}
 */
export function buildCaiDatRows({ settings, permissions, currentUser, rawAdditionalRows = [] }) {
  const dateStr = new Date().toLocaleDateString('vi-VN');
  const userStr = currentUser?.name || currentUser?.id || 'ADMIN';

  const rows = [
    ["id", "ten_thiet_lap", "gia_tri", "nhom", "kieu_du_lieu", "mo_ta", "ngay_cap_nhat", "nguoi_cap_nhat"],
    ["SYS_APP_NAME", "Tên hệ thống", settings?.appName || "LNK TỒN KHO - ERP SYSTEM", "HE_THONG", "text", "Tên tiêu đề hiển thị trên thanh điều hướng và giao diện chính", dateStr, userStr],
    ["SYS_APP_VERSION", "Phiên bản phần mềm", settings?.appVersion || "2.0.0", "HE_THONG", "text", "Phiên bản phát hành của hệ thống", dateStr, userStr],
    ["SYS_PAGE_SIZE", "Số bản ghi mỗi trang", (settings?.pageSize || 200).toString(), "HE_THONG", "number", "Số lượng dòng tối đa tải và hiển thị trên mỗi trang bảng dữ liệu", dateStr, userStr],
    ["WAREHOUSE_LIST", "Danh sách kho hàng", (settings?.warehouses || ['KHO 1', 'KHO 2', 'KHO 3', 'KHO 4', 'KHO 5']).join(', '), "KHO_HANG", "list", "Danh sách các kho hàng hoạt động trong hệ thống", dateStr, userStr],
    ["DEFAULT_WAREHOUSE", "Kho mặc định", settings?.defaultWarehouse || "KHO 1", "KHO_HANG", "text", "Kho mặc định được chọn tự động khi tạo phiếu", dateStr, userStr],
    ["WARN_LOW_STOCK_THRESHOLD", "Ngưỡng cảnh báo tồn tối thiểu", (settings?.lowStockThreshold || 10).toString(), "CANH_BAO", "number", "Sản phẩm có tồn cuối nhỏ hơn hoặc bằng giá trị này sẽ hiển thị cảnh báo đỏ", dateStr, userStr],
    ["ALLOW_NEGATIVE_STOCK", "Quy tắc xuất âm tồn", settings?.allowNegativeStock || "CANH_BAO", "CANH_BAO", "text", "Cấu hình xuất âm: CANH_BAO / CAM_XUAT / CHO_PHEP", dateStr, userStr],
    ["AUTO_REFRESH_INTERVAL_SEC", "Thời gian tự động làm mới (giây)", (settings?.autoRefreshIntervalSec || 300).toString(), "HE_THONG", "number", "Chu kỳ tự động tải lại dữ liệu từ Google Sheets (0 = tắt)", dateStr, userStr],
    ["STATUS_XUAT_CONFIRM_OPTIONS", "Danh sách trạng thái xác nhận kho", (settings?.xuatConfirmStatuses || ["Đã nhặt hàng", "Đã lên xe", "Hoàn thành"]).join(', '), "HE_THONG", "list", "Quy trình xác nhận 3 bước xuất kho", dateStr, userStr]
  ];

  // Normalized Role Permissions
  const standardRoles = ['ADMIN', 'KT', 'KHO', 'NPP', 'KD', 'NVKD'];
  const rawRoles = permissions?.roles || {};
  
  const normalizedRoles = {};
  standardRoles.forEach(r => {
    // Look up directly with uppercase first, fallback to case-insensitive
    const matchKey = Object.keys(rawRoles).find(k => k.toUpperCase() === r);
    const source = matchKey ? rawRoles[matchKey] : null;
    let mods = Array.isArray(source?.modules) ? [...source.modules] : [];
    let acts = Array.isArray(source?.actions) ? [...source.actions] : [];
    if (r === 'ADMIN') {
      MODULE_DEFINITIONS.forEach(m => {
        if (!mods.includes(m.key)) mods.push(m.key);
      });
      ['nx.manualAdd', 'nx.upload', 'nx.confirmWarehouse', 'nx.delete', 'sanpham.manage', 'cngiasp.manage', 'lendon.manage', 'doisoat.manage', 'caidat.manage'].forEach(a => {
        if (!acts.includes(a)) acts.push(a);
      });
    }
    normalizedRoles[r] = {
      modules: mods,
      actions: acts
    };
  });

  // Preserve any custom non-standard roles
  Object.keys(rawRoles).forEach(k => {
    const upperKey = k.toUpperCase();
    if (!normalizedRoles[upperKey]) {
      normalizedRoles[upperKey] = {
        modules: Array.isArray(rawRoles[k]?.modules) ? [...rawRoles[k].modules] : [],
        actions: Array.isArray(rawRoles[k]?.actions) ? [...rawRoles[k].actions] : []
      };
    }
  });

  // Write roles in clean order
  const allRoleKeys = Array.from(new Set([...standardRoles, ...Object.keys(normalizedRoles)]));
  allRoleKeys.forEach(r => {
    const rConfig = normalizedRoles[r] || {};
    const modulesStr = (rConfig.modules || []).join(', ');
    const actionsStr = (rConfig.actions || []).join(', ');
    rows.push([
      `ROLE_${r}_MODULES`,
      `Modules vai trò ${r}`,
      modulesStr,
      "VAI_TRO",
      "list",
      `Các module được phép truy cập của vai trò ${r}`,
      dateStr,
      userStr
    ]);
    rows.push([
      `ROLE_${r}_ACTIONS`,
      `Quyền thao tác ${r}`,
      actionsStr,
      "QUYEN_THAO_TAC",
      "list",
      `Quyền thực thi hành động của vai trò ${r}`,
      dateStr,
      userStr
    ]);
  });

  // User Warehouse Assignments
  const userWarehouses = permissions?.userWarehouses || {};
  Object.keys(userWarehouses).forEach(u => {
    const list = userWarehouses[u];
    if (Array.isArray(list) && list.length > 0) {
      rows.push([
        `USER_KHO_${u}`,
        `Phân quyền kho tài khoản ${u}`,
        list.join(', '),
        "PHAN_QUYEN_KHO",
        "list",
        `Danh sách các kho phụ trách của tài khoản ${u}`,
        dateStr,
        userStr
      ]);
    }
  });

  // User Product Restrictions
  const userRestrictions = permissions?.userRestrictions || {};
  Object.keys(userRestrictions).forEach(u => {
    const hiddenList = userRestrictions[u]?.hiddenProductIds || [];
    if (hiddenList.length > 0) {
      rows.push([
        `USER_RESTRICT_${u}`,
        `Giới hạn ẩn SP tài khoản ${u}`,
        hiddenList.join(', '),
        "GIOI_HAN_USER",
        "list",
        `Mã sản phẩm bị ẩn riêng cho tài khoản ${u}`,
        dateStr,
        userStr
      ]);
    }
  });

  // Data Scopes
  const dataScopes = permissions?.dataScopes || {};
  Object.keys(dataScopes).forEach(r => {
    const upperRole = r.toUpperCase();
    const scopes = dataScopes[r] || {};
    Object.keys(scopes).forEach(m => {
      rows.push([
        `SCOPE_${upperRole}_${m.toUpperCase()}`,
        `Phạm vi ${m} cho ${upperRole}`,
        scopes[m],
        "PHAM_VI_DU_LIEU",
        "text",
        `Quy tắc xem dữ liệu ${m} cho ${upperRole}`,
        dateStr,
        userStr
      ]);
    });
  });

  // Preserve any custom rows not in standard list (ignoring legacy duplicate roles)
  const knownIds = new Set(rows.map(r => r[0]));
  (rawAdditionalRows || []).forEach(extraRow => {
    if (extraRow && extraRow[0]) {
      const extraId = extraRow[0].toString().trim();
      // Skip legacy case-variant role keys
      if (extraId.startsWith('ROLE_') && (extraId.endsWith('_MODULES') || extraId.endsWith('_ACTIONS'))) {
        return;
      }
      if (!knownIds.has(extraId)) {
        rows.push(extraRow);
        knownIds.add(extraId);
      }
    }
  });

  return rows;
}

/**
 * Saves all configurations to Google Sheet CAI_DAT
 * @param {Array<Array<string>>} rows 
 */
export async function saveCaiDatToGoogleSheet(rows) {
  const sheetName = CONFIG.caiDatSheetName || 'CAI_DAT';
  return await batchClearAndWriteSheet(sheetName, 'A1:H1000', rows);
}

/**
 * Fetches rows from Google Sheet CAI_DAT
 * @returns {Promise<Array<Array<string>>>}
 */
export async function fetchCaiDatFromGoogleSheet() {
  const sheetName = CONFIG.caiDatSheetName || 'CAI_DAT';
  return await fetchSheetValues(sheetName, 'A1:H1000');
}

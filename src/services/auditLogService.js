import { formatCurrency, formatNumber, cleanNumber } from '../utils/formatters';

export function formatDateTime(d = new Date()) {
  const pad = (n) => (n < 10 ? '0' + n : n);
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
}

export function generateLogId() {
  const now = new Date();
  const pad = (n) => (n < 10 ? '0' + n : n);
  const timeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LOG_${timeStr}_${randomStr}`;
}

/**
 * Compares two order snapshots (old vs new) and returns human-readable diff details
 */
export function diffOrderChanges({ oldRows = [], newRows = [], moduleType = 'NHẬP' }) {
  const diffs = [];
  const headerChanges = [];

  const oldFirst = oldRows[0] || [];
  const newFirst = newRows[0] || [];

  // Check header-level changes: Ngày (idx 1), Mã KH/NCC (idx 4), Tên KH/NCC (idx 5), Kho (idx 11), Ghi chú (idx 13), Loại hình (idx 14)
  const oldDate = (oldFirst[1] || '').toString().trim();
  const newDate = (newFirst[1] || '').toString().trim();
  if (oldDate && newDate && oldDate !== newDate) {
    headerChanges.push(`Ngày (${oldDate} ➔ ${newDate})`);
  }

  const oldPartner = (oldFirst[5] || oldFirst[4] || '').toString().trim();
  const newPartner = (newFirst[5] || newFirst[4] || '').toString().trim();
  if (oldPartner && newPartner && oldPartner !== newPartner) {
    headerChanges.push(`Đối tác (${oldPartner} ➔ ${newPartner})`);
  }

  const oldKho = (oldFirst[11] || '').toString().trim();
  const newKho = (newFirst[11] || '').toString().trim();
  if (oldKho && newKho && oldKho !== newKho) {
    headerChanges.push(`Kho (${oldKho} ➔ ${newKho})`);
  }

  const oldNote = (oldFirst[13] || '').toString().trim();
  const newNote = (newFirst[13] || '').toString().trim();
  if (oldNote !== newNote) {
    headerChanges.push(`Ghi chú ("${oldNote}" ➔ "${newNote}")`);
  }

  const oldType = (oldFirst[14] || '').toString().trim();
  const newType = (newFirst[14] || '').toString().trim();
  if (oldType && newType && oldType !== newType) {
    headerChanges.push(`Loại hình (${oldType} ➔ ${newType})`);
  }

  if (headerChanges.length > 0) {
    diffs.push(`Thông tin chung: ${headerChanges.join(', ')}`);
  }

  // Compare item rows by id_sp (idx 6) or detailId (idx 0)
  const oldItemMap = new Map();
  oldRows.forEach(r => {
    const key = (r[6] || r[0] || '').toString().trim().toUpperCase();
    if (key) oldItemMap.set(key, r);
  });

  const newItemMap = new Map();
  newRows.forEach(r => {
    const key = (r[6] || r[0] || '').toString().trim().toUpperCase();
    if (key) newItemMap.set(key, r);
  });

  // Check changed and removed
  oldItemMap.forEach((oldR, key) => {
    const newR = newItemMap.get(key);
    const tenSp = (oldR[7] || key).toString().trim();
    if (!newR) {
      diffs.push(`Xóa SP [${tenSp}] (SL: ${formatNumber(oldR[8])})`);
    } else {
      const itemChanges = [];
      const oldSlg = cleanNumber(oldR[8]);
      const newSlg = cleanNumber(newR[8]);
      if (oldSlg !== newSlg) {
        itemChanges.push(`SL: ${formatNumber(oldSlg)} ➔ ${formatNumber(newSlg)}`);
      }

      const oldPrice = cleanNumber(oldR[9]);
      const newPrice = cleanNumber(newR[9]);
      if (oldPrice !== newPrice) {
        itemChanges.push(`Giá: ${formatCurrency(oldPrice)} ➔ ${formatCurrency(newPrice)}`);
      }

      const oldThanhTien = cleanNumber(oldR[10]);
      const newThanhTien = cleanNumber(newR[10]);
      if (oldThanhTien !== newThanhTien && itemChanges.length === 0) {
        itemChanges.push(`Thành tiền: ${formatCurrency(oldThanhTien)} ➔ ${formatCurrency(newThanhTien)}`);
      }

      const itemKhoOld = (oldR[11] || '').toString().trim();
      const itemKhoNew = (newR[11] || '').toString().trim();
      if (itemKhoOld && itemKhoNew && itemKhoOld !== itemKhoNew) {
        itemChanges.push(`Kho: ${itemKhoOld} ➔ ${itemKhoNew}`);
      }

      if (itemChanges.length > 0) {
        diffs.push(`[${tenSp}]: ${itemChanges.join(', ')}`);
      }
    }
  });

  // Check newly added items
  newItemMap.forEach((newR, key) => {
    if (!oldItemMap.has(key)) {
      const tenSp = (newR[7] || key).toString().trim();
      const slg = formatNumber(cleanNumber(newR[8]));
      diffs.push(`Thêm SP [${tenSp}] (SL: ${slg})`);
    }
  });

  return {
    diffs,
    summary: diffs.length > 0 ? diffs.join(' | ') : 'Cập nhật lại thông tin đơn hàng'
  };
}

/**
 * Builds standard 12-column row array for sheet LICH_SU
 */
export function buildAuditLogRow({
  user,
  moduleName,
  actionType,
  orderId = '',
  targetObject = '',
  summary = '',
  oldData = null,
  newData = null,
  restoreStatus = 'GỐC'
}) {
  const logId = generateLogId();
  const timeStr = formatDateTime(new Date());
  const userName = user?.name || user?.ho_ten || user?.id || 'Hệ thống';
  const userDisplay = user?.id ? `${user.id} - ${userName}` : userName;
  const userRole = user?.role || user?.quyen || '';

  const cleanOldData = oldData ? (typeof oldData === 'string' ? oldData : JSON.stringify(oldData)) : '';
  const cleanNewData = newData ? (typeof newData === 'string' ? newData : JSON.stringify(newData)) : '';

  return [
    logId,
    timeStr,
    userDisplay,
    userRole,
    moduleName,
    actionType,
    orderId,
    targetObject,
    summary,
    cleanOldData,
    cleanNewData,
    restoreStatus
  ];
}

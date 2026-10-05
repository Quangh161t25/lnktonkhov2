export function formatNumber(num) {
  if (num === null || num === undefined || num === '') return '0';
  const val = Number(num);
  if (Number.isNaN(val)) return '0';
  return val.toLocaleString('vi-VN');
}

export function formatCurrency(num) {
  if (num === null || num === undefined || num === '') return '0 ₫';
  const val = Number(num);
  if (Number.isNaN(val)) return '0 ₫';
  return val.toLocaleString('vi-VN') + ' ₫';
}

export function cleanNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = val.toString().replace(/,/g, '').replace(/\./g, '').trim();
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

export function parseSimpleSheetDate(dateStr) {
  if (!dateStr) return new Date(NaN);
  if (dateStr instanceof Date) return dateStr;
  
  const s = dateStr.toString().trim();
  
  // Format YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
    const parts = s.split('T')[0].split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  
  // Format DD/MM/YYYY or DD-MM-YYYY
  const parts = s.split(/[\/\-]/);
  if (parts.length >= 3) {
    let d = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10) - 1;
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    return new Date(y, m, d);
  }
  
  const ts = Date.parse(s);
  return Number.isNaN(ts) ? new Date(NaN) : new Date(ts);
}

/**
 * Resolves the unit price for a product on a target date based on CN GIÁ SP history.
 * Rule:
 * - Sort records ascending by date.
 * - If targetDate < oldest record's date -> take the oldest record's price (user rule: "ngày lên đơn dưới ngày 1 sẽ là 150 vì dưới đó k có giá nữa").
 * - Otherwise -> take the latest record where recordDate <= targetDate ("ngày 3 là 200, ngày 4 là 200, ngày 5 là 500").
 * - Fallback to product's default catalog price if no CN GIÁ SP records exist.
 */
export function resolveEffectivePrice(productRows, targetDate, fallbackPrice = 0) {
  if (!productRows || !Array.isArray(productRows) || productRows.length === 0) {
    return { price: cleanNumber(fallbackPrice) || 0, effectiveDate: null, isFromCngiasp: false, row: null };
  }

  // Parse target date to 00:00:00 local time
  let targetTime = null;
  if (targetDate) {
    const targetD = parseSimpleSheetDate(targetDate);
    if (targetD instanceof Date && !Number.isNaN(targetD.getTime())) {
      targetTime = new Date(targetD.getFullYear(), targetD.getMonth(), targetD.getDate()).getTime();
    }
  }

  // Map & sort rows ascending by effective date (r[1]), and then by sheetRow
  const sorted = [...productRows]
    .filter(r => r && Array.isArray(r))
    .map(r => {
      const d = parseSimpleSheetDate(r[1]);
      const time = (d instanceof Date && !Number.isNaN(d.getTime()))
        ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
        : 0;
      return {
        row: r,
        time,
        dateStr: (r[1] || '').toString().trim(),
        giaBan: cleanNumber(r[5]) || 0,
        sheetRow: r._sheetRow || 0
      };
    })
    .filter(item => item.time > 0 || item.giaBan > 0)
    .sort((a, b) => {
      if (a.time !== b.time) return a.time - b.time;
      return a.sheetRow - b.sheetRow;
    });

  if (sorted.length === 0) {
    return { price: cleanNumber(fallbackPrice) || 0, effectiveDate: null, isFromCngiasp: false, row: null };
  }

  // If target date is invalid/missing, take latest record
  if (targetTime === null) {
    const latest = sorted[sorted.length - 1];
    return { price: latest.giaBan, effectiveDate: latest.dateStr, isFromCngiasp: true, row: latest.row };
  }

  // Rule 1: targetDate is earlier than earliest record -> take earliest record
  if (targetTime < sorted[0].time) {
    const earliest = sorted[0];
    return { price: earliest.giaBan, effectiveDate: earliest.dateStr, isFromCngiasp: true, row: earliest.row };
  }

  // Rule 2: find latest record where record.time <= targetTime
  let matched = sorted[0];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].time <= targetTime) {
      matched = sorted[i];
    } else {
      break;
    }
  }

  return { price: matched.giaBan, effectiveDate: matched.dateStr, isFromCngiasp: true, row: matched.row };
}

export function formatDateVN(dateVal) {
  if (!dateVal) return '';
  const d = parseSimpleSheetDate(dateVal);
  if (Number.isNaN(d.getTime())) return dateVal.toString();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateInput(dateVal) {
  if (!dateVal) return '';
  const d = parseSimpleSheetDate(dateVal);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

export function normalizeLoginValue(val) {
  return (val || '').toString().trim();
}

export function normalizeWarehouseProductKey(kho, idSp) {
  return `${(kho || '').toString().trim().toUpperCase()}|${(idSp || '').toString().trim().toUpperCase()}`;
}

export function generateRandomOrderId(prefix = 'DH') {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = prefix;
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function removeVietnameseTones(str) {
  if (!str) return '';
  let s = str.toString().toLowerCase();
  s = s.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  s = s.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  s = s.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  s = s.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  s = s.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  s = s.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  s = s.replace(/đ/g, 'd');
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function matchesSearch(text, query) {
  if (!query) return true;
  if (!text) return false;
  const rawText = text.toString().toLowerCase();
  const rawQuery = query.toString().toLowerCase().trim();
  if (rawText.includes(rawQuery)) return true;

  // Compare without spaces, hyphens, and punctuation
  const strippedText = rawText.replace(/[-_.,/\s()]/g, '');
  const strippedQuery = rawQuery.replace(/[-_.,/\s()]/g, '');
  if (strippedQuery && strippedText.includes(strippedQuery)) return true;

  // Compare Vietnamese unaccented
  const noToneText = removeVietnameseTones(rawText);
  const noToneQuery = removeVietnameseTones(rawQuery);
  if (noToneText.includes(noToneQuery)) return true;
  if (noToneQuery && noToneText.replace(/[-_.,/\s()]/g, '').includes(noToneQuery.replace(/[-_.,/\s()]/g, ''))) return true;

  return false;
}

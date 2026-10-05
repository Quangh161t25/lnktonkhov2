import { cleanNumber, parseSimpleSheetDate } from './formatters';

export function calculateProductAggregates(nhapData = [], xuatData = [], transferData = [], warehouseProductData = [], asOfDate = null) {
  // Map of productId (lowercase) -> { tonDau, tongNhap, tongXuat, chuyenDen, chuyenDi, tonCuoi }
  const map = new Map();

  const isBeforeOrEqualAsOf = (dateStr) => {
    if (!asOfDate) return true;
    const d = parseSimpleSheetDate(dateStr);
    if (Number.isNaN(d.getTime())) return true;
    return d <= asOfDate;
  };

  // 1. Initialize tonDau from warehouseProductData (DS_SP_KHO)
  (warehouseProductData || []).slice(1).forEach(row => {
    const idSp = (row[2] || '').toString().trim().toLowerCase();
    if (!idSp) return;
    const tonDau = cleanNumber(row[4]);
    if (!map.has(idSp)) {
      map.set(idSp, { tonDau: 0, tongNhap: 0, tongXuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 });
    }
    const item = map.get(idSp);
    item.tonDau += tonDau;
  });

  // 2. Nhap (goods in from NHAP_CT)
  (nhapData || []).slice(1).forEach(row => {
    const idSp = (row[6] || '').toString().trim().toLowerCase();
    if (!idSp) return;
    if (!isBeforeOrEqualAsOf(row[1])) return;
    const slg = cleanNumber(row[8]);
    
    if (!map.has(idSp)) {
      map.set(idSp, { tonDau: 0, tongNhap: 0, tongXuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 });
    }
    const item = map.get(idSp);
    item.tongNhap += slg;
  });

  // 3. Xuat (goods out from XUAT_CT)
  (xuatData || []).slice(1).forEach(row => {
    const idSp = (row[6] || '').toString().trim().toLowerCase();
    if (!idSp) return;
    if (!isBeforeOrEqualAsOf(row[1])) return;
    const slg = cleanNumber(row[8]);

    if (!map.has(idSp)) {
      map.set(idSp, { tonDau: 0, tongNhap: 0, tongXuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 });
    }
    const item = map.get(idSp);
    item.tongXuat += slg;
  });

  // 4. Chuyen kho (warehouse transfer from CHUYEN_KHO_CT)
  (transferData || []).slice(1).forEach(row => {
    const idSp = (row[3] || '').toString().trim().toLowerCase();
    if (!idSp) return;
    if (!isBeforeOrEqualAsOf(row[1])) return;
    const slg = cleanNumber(row[5]);

    if (!map.has(idSp)) {
      map.set(idSp, { tonDau: 0, tongNhap: 0, tongXuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 });
    }
    const item = map.get(idSp);
    item.chuyenDen += slg;
    item.chuyenDi += slg;
  });

  // 5. Calculate tonCuoi = tonDau + tongNhap - tongXuat
  map.forEach((item) => {
    item.tonCuoi = item.tonDau + item.tongNhap - item.tongXuat;
  });

  return map;
}

export function calculateWarehouseStockMap(nhapData = [], xuatData = [], transferData = [], warehouseProductData = []) {
  // Map of "KHO|ID_SP" (upper) -> stock
  const map = new Map();

  // Baseline from warehouseProductData
  (warehouseProductData || []).slice(1).forEach(row => {
    const kho = (row[1] || '').toString().trim().toUpperCase();
    const idSp = (row[2] || '').toString().trim().toUpperCase();
    if (!kho || !idSp) return;
    const key = `${kho}|${idSp}`;
    const tonDau = cleanNumber(row[4]);
    map.set(key, (map.get(key) || 0) + tonDau);
  });

  // Add Nhap to Kho
  (nhapData || []).slice(1).forEach(row => {
    const kho = (row[11] || '').toString().trim().toUpperCase();
    const idSp = (row[6] || '').toString().trim().toUpperCase();
    if (!kho || !idSp) return;
    const key = `${kho}|${idSp}`;
    const slg = cleanNumber(row[8]);
    map.set(key, (map.get(key) || 0) + slg);
  });

  // Subtract Xuat from Kho
  (xuatData || []).slice(1).forEach(row => {
    const kho = (row[11] || '').toString().trim().toUpperCase();
    const idSp = (row[6] || '').toString().trim().toUpperCase();
    if (!kho || !idSp) return;
    const key = `${kho}|${idSp}`;
    const slg = cleanNumber(row[8]);
    map.set(key, (map.get(key) || 0) - slg);
  });

  // Chuyen kho: subtract from kho_di, add to kho_nhan
  (transferData || []).slice(1).forEach(row => {
    const khoDi = (row[6] || '').toString().trim().toUpperCase();
    const khoNhan = (row[7] || '').toString().trim().toUpperCase();
    const idSp = (row[3] || '').toString().trim().toUpperCase();
    if (!idSp) return;
    const slg = cleanNumber(row[5]);

    if (khoDi) {
      const keyDi = `${khoDi}|${idSp}`;
      map.set(keyDi, (map.get(keyDi) || 0) - slg);
    }
    if (khoNhan) {
      const keyNhan = `${khoNhan}|${idSp}`;
      map.set(keyNhan, (map.get(keyNhan) || 0) + slg);
    }
  });

  return map;
}

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

export function calculateWarehouseDetailStockMap(nhapData = [], xuatData = [], transferData = [], warehouseProductData = []) {
  // Map of "KHO|ID_SP" (upper) -> { tonDau, nhap, xuat, chuyenDen, chuyenDi, tonCuoi }
  const map = new Map();

  const getOrCreate = (kho, idSp) => {
    const k = (kho || '').toString().trim().toUpperCase();
    const id = (idSp || '').toString().trim().toUpperCase();
    if (!k || !id) return null;
    const key = `${k}|${id}`;
    if (!map.has(key)) {
      map.set(key, { tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 });
    }
    return map.get(key);
  };

  // Baseline from warehouseProductData
  (warehouseProductData || []).slice(1).forEach(row => {
    const item = getOrCreate(row[1], row[2]);
    if (item) {
      item.tonDau += cleanNumber(row[4]);
    }
  });

  // Add Nhap to Kho
  (nhapData || []).slice(1).forEach(row => {
    const item = getOrCreate(row[11], row[6]);
    if (item) {
      item.nhap += cleanNumber(row[8]);
    }
  });

  // Subtract Xuat from Kho
  (xuatData || []).slice(1).forEach(row => {
    const item = getOrCreate(row[11], row[6]);
    if (item) {
      item.xuat += cleanNumber(row[8]);
    }
  });

  // Chuyen kho: subtract from kho_di, add to kho_nhan
  (transferData || []).slice(1).forEach(row => {
    const khoDi = (row[6] || '').toString().trim();
    const khoNhan = (row[7] || '').toString().trim();
    const idSp = (row[3] || '').toString().trim();
    const slg = cleanNumber(row[5]);

    if (khoDi) {
      const itemDi = getOrCreate(khoDi, idSp);
      if (itemDi) itemDi.chuyenDi += slg;
    }
    if (khoNhan) {
      const itemNhan = getOrCreate(khoNhan, idSp);
      if (itemNhan) itemNhan.chuyenDen += slg;
    }
  });

  // Compute tonCuoi
  map.forEach(item => {
    item.tonCuoi = item.tonDau + item.nhap - item.xuat + item.chuyenDen - item.chuyenDi;
  });

  return map;
}

export function calculateWarehouseStockMap(nhapData = [], xuatData = [], transferData = [], warehouseProductData = []) {
  const detailMap = calculateWarehouseDetailStockMap(nhapData, xuatData, transferData, warehouseProductData);
  const stockMap = new Map();
  detailMap.forEach((v, k) => {
    stockMap.set(k, v.tonCuoi);
  });
  return stockMap;
}

import { cleanNumber, parseSimpleSheetDate } from '../utils/formatters';

export function getForecastLast12Months(xuatData = []) {
  let referenceDate = new Date();
  (xuatData || []).slice(1).forEach(row => {
    const d = parseSimpleSheetDate(row[1]);
    if (!Number.isNaN(d.getTime()) && d > referenceDate) {
      referenceDate = d;
    }
  });

  const months = [];
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();

  for (let i = 11; i >= 0; i--) {
    const targetDate = new Date(refYear, refMonth - i, 1);
    const ym = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    months.push(ym);
  }
  return months;
}

export function buildProductExportMap(xuatData = []) {
  const exportMap = new Map(); // idSpLower -> Map("YYYY-MM" -> totalQty)

  (xuatData || []).slice(1).forEach(row => {
    const idSp = (row[6] || '').toString().trim().toLowerCase();
    if (!idSp) return;

    const slg = cleanNumber(row[8]);
    if (slg <= 0) return;

    const date = parseSimpleSheetDate(row[1]);
    if (Number.isNaN(date.getTime()) || date.getTime() === 0) return;

    const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!exportMap.has(idSp)) exportMap.set(idSp, new Map());

    const monthlyMap = exportMap.get(idSp);
    monthlyMap.set(ym, (monthlyMap.get(ym) || 0) + slg);
  });

  return exportMap;
}

export function calculateProductForecastList(
  products = [],
  stockMap = new Map(),
  expectedMap = new Map(),
  exportMap = new Map(),
  params = { globalLeadTime: 7, globalBufferDays: 30, items: {} },
  last12Months = []
) {
  const result = [];

  products.forEach(p => {
    const id = (p.id || '').toString().trim();
    if (!id) return;
    const idLower = id.toLowerCase();
    const name = p.name || p.ten_sp || id;

    const monthlyHistory = exportMap.get(idLower) || new Map();
    const allMonths = Array.from(monthlyHistory.entries())
      .map(([month, qty]) => ({ month, qty }))
      .sort((a, b) => b.qty - a.qty);

    const top3 = allMonths.slice(0, 3);
    const top3Sum = top3.reduce((s, m) => s + m.qty, 0);
    const top3Avg = top3.length > 0 ? Math.round((top3Sum / 3) * 10) / 10 : 0;

    let last12Sum = 0;
    last12Months.forEach(ym => {
      last12Sum += (monthlyHistory.get(ym) || 0);
    });
    const last12Avg = Math.round((last12Sum / 12) * 10) / 10;

    const itemConfig = (params.items && params.items[id]) || {};
    const leadTime = typeof itemConfig.leadTime === 'number' && itemConfig.leadTime >= 0
      ? itemConfig.leadTime
      : params.globalLeadTime || 7;
    const bufferDays = typeof itemConfig.bufferDays === 'number' && itemConfig.bufferDays >= 0
      ? itemConfig.bufferDays
      : params.globalBufferDays || 30;
    const method = itemConfig.method || 'top3'; // 'top3' or '12m'

    const chosenMonthlyAvg = method === 'top3' ? top3Avg : last12Avg;
    const das = Math.round((chosenMonthlyAvg / 30) * 100) / 100; // Daily Average Sales

    const safetyStock = Math.round(das * bufferDays);
    const leadTimeDemand = Math.round(das * leadTime);
    const rop = leadTimeDemand + safetyStock; // Reorder Point

    const tonCuoi = stockMap.get(idLower)?.tonCuoi || 0;
    const expectedQty = expectedMap.get(idLower) || 0;

    const daysOfSupply = das > 0 ? Math.round((tonCuoi / das) * 10) / 10 : (tonCuoi > 0 ? 999 : 0);

    // Recommended order quantity to cover LeadTime + BufferDays
    const targetInventory = Math.round(das * (leadTime + bufferDays));
    const recommendedQty = Math.max(0, targetInventory - (tonCuoi + expectedQty));

    let status = 'AN_TOAN';
    let statusLabel = 'An toàn';
    let statusColor = 'emerald';

    if (tonCuoi <= 0 || daysOfSupply <= 3) {
      status = 'KHAN_CAP';
      statusLabel = 'Khẩn cấp';
      statusColor = 'red';
    } else if (tonCuoi <= rop) {
      status = 'CAN_NHAP';
      statusLabel = 'Cần nhập';
      statusColor = 'amber';
    } else if (rop > 0 && tonCuoi > rop * 2.5) {
      status = 'THUA_HANG';
      statusLabel = 'Dư thừa';
      statusColor = 'blue';
    }

    result.push({
      id,
      name,
      model: p.model || '',
      image: p.anh || p.hinh_anh || '',
      tonCuoi,
      expectedQty,
      top3Avg,
      last12Avg,
      chosenMonthlyAvg,
      das,
      leadTime,
      bufferDays,
      method,
      safetyStock,
      leadTimeDemand,
      rop,
      daysOfSupply,
      recommendedQty,
      status,
      statusLabel,
      statusColor,
      monthlyHistory
    });
  });

  return result;
}

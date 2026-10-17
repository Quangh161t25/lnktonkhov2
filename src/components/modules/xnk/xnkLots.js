import { useState } from 'react';
import { cleanNumber } from '../../../utils/formatters';
import { STAGE_INDEX, getPoKanbanStage, kanbanColForStageIndex, safeDateInput, addDays, calcDurationDays } from './xnkStages';
import { getPoLines } from './xnkPoLines';

// =====================================================================
// LÔ VẬN CHUYỂN CỦA PO
// Chặng 1-4 (Cọc -> Duyệt TK -> SX -> Chờ ship) tính chung cho PO.
// Đã tách lô thì các chặng sau (Vận chuyển QT -> Thông quan -> Kho nhận -> Mở bán) tính riêng từng lô.
// Sheet XNK_LO_HANG, mỗi dòng 1 lô:
// ['ma_po', 'ma_lo', 'tracking', 'cuoc_phi', 'ngay_gui', 'ngay_den_cang', 'ngay_thong_quan', 'ngay_kho_nhan',
//  'vc_xong', 'tq_xong', 'kho_xong', 'chi_tiet_sl', 'ghi_chu', 'ban_xong', 'ngay_mo_ban', 'cua_khau', 'hinh_thuc_ban']
// chi_tiet_sl = JSON [{ k: mã dòng SP, t: tên SP, g: SL gửi, n: SL thực nhận }]
// =====================================================================

// Các chặng tính theo lô (khoá trùng với PO_STAGES) + ô ngày "Đến ngày" tương ứng của lô
export const LOT_STAGES = [
  { key: 'vc', label: 'Vận chuyển QT', title: 'Vận chuyển quốc tế', endField: 'ngay_den_cang', defaultDays: 7 },
  { key: 'tq', label: 'Thông quan', title: 'Hải quan & Thông quan', endField: 'ngay_thong_quan', defaultDays: 3 },
  { key: 'kho', label: 'Về kho', title: 'Kho VN nhận hàng', endField: 'ngay_kho_nhan', defaultDays: 2 },
  { key: 'ban', label: 'Mở bán', title: 'Phân phối & Mở bán', endField: 'ngay_mo_ban', defaultDays: 0 }
];
export const LOT_STAGE_KEYS = LOT_STAGES.map(s => s.key);
const KHO_IDX = LOT_STAGE_KEYS.indexOf('kho');

const norm = (v) => (v === undefined || v === null ? '' : String(v)).trim();
const poKey = (maPo) => norm(maPo).toUpperCase();

// Mã nhận diện 1 dòng SP trong PO (SKU, nếu trống thì Tên SP)
export function lineKey(line) {
  return (norm(line.sku) || norm(line.ten_sp)).toUpperCase();
}

// Ngày bắt đầu & kết thúc của từng chặng trong lô
export function lotStageDates(lot) {
  return LOT_STAGES.map((st, j) => ({
    from: j === 0 ? lot.ngay_gui : lot[LOT_STAGES[j - 1].endField],
    to: lot[st.endField]
  }));
}

function parseItems(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.map(it => ({
        k: norm(it.k).toUpperCase(),
        t: norm(it.t),
        g: cleanNumber(it.g) || 0,
        n: it.n === '' || it.n === undefined || it.n === null ? '' : cleanNumber(it.n)
      })).filter(it => it.k)
      : [];
  } catch {
    return [];
  }
}

export function buildLotsMap(data) {
  const map = {};
  if (!data || data.length <= 1) return map;
  data.slice(1).forEach((r, idx) => {
    const key = poKey(r[0]);
    if (!key || !norm(r[1])) return;
    (map[key] = map[key] || []).push({
      _sheetRow: idx + 2,
      ma_po: norm(r[0]),
      ma_lo: norm(r[1]),
      tracking: norm(r[2]),
      cuoc_phi: cleanNumber(r[3]) || 0,
      ngay_gui: safeDateInput(r[4]),
      ngay_den_cang: safeDateInput(r[5]),
      ngay_thong_quan: safeDateInput(r[6]),
      ngay_kho_nhan: safeDateInput(r[7]),
      ngay_mo_ban: safeDateInput(r[14]),
      done: [r[8], r[9], r[10], r[13]].map(v => norm(v) === '1'),
      items: parseItems(r[11]),
      ghi_chu: norm(r[12]),
      cua_khau: norm(r[15]),
      hinh_thuc_ban: norm(r[16]) || 'Bán ngay'
    });
  });
  Object.values(map).forEach(lots => lots.sort((a, b) => a.ma_lo.localeCompare(b.ma_lo, undefined, { numeric: true })));
  return map;
}

export function getPoLots(order, lotsMap) {
  return (order && lotsMap && lotsMap[poKey(order.ma_po)]) || [];
}

export function lotToRow(lot, maPo) {
  return [
    norm(maPo),
    lot.ma_lo,
    norm(lot.tracking),
    cleanNumber(lot.cuoc_phi) || 0,
    lot.ngay_gui || '',
    lot.ngay_den_cang || '',
    lot.ngay_thong_quan || '',
    lot.ngay_kho_nhan || '',
    lot.done[0] ? 1 : 0,
    lot.done[1] ? 1 : 0,
    lot.done[2] ? 1 : 0,
    JSON.stringify(lot.items.map(it => ({
      k: it.k,
      t: it.t,
      g: cleanNumber(it.g) || 0,
      n: it.n === '' || it.n === undefined ? '' : (cleanNumber(it.n) || 0)
    }))),
    norm(lot.ghi_chu),
    lot.done[3] ? 1 : 0,
    lot.ngay_mo_ban || '',
    norm(lot.cua_khau),
    norm(lot.hinh_thuc_ban) || 'Bán ngay'
  ];
}

// Số lượng theo từng SP: đặt / đã xếp lô / còn lại / thực nhận
export function lotAllocation(lines, lots) {
  return (lines || [])
    .filter(l => norm(l.sku) || norm(l.ten_sp))
    .map(l => {
      const k = lineKey(l);
      const dat = cleanNumber(l.so_luong) || 0;
      let gui = 0;
      let nhan = 0;
      let hasNhan = false;
      (lots || []).forEach(lot => lot.items.forEach(it => {
        if (it.k !== k) return;
        gui += cleanNumber(it.g) || 0;
        if (it.n !== '' && it.n !== undefined) {
          hasNhan = true;
          nhan += cleanNumber(it.n) || 0;
        }
      }));
      return { k, ten_sp: norm(l.ten_sp), sku: norm(l.sku), dat, gui, con: dat - gui, nhan: hasNhan ? nhan : '' };
    });
}

// Cờ "Đã xong" các chặng của PO khi có lô:
// - Có lô đã đi -> chặng 1-4 coi như xong
// - Các chặng tính theo lô chỉ xong khi đã xếp hết SL vào lô và mọi lô đều xong chặng đó
export function applyLotsToDone(done, lots, lines) {
  if (!lots || lots.length === 0) return done;
  const next = [...done];
  const fullyAllocated = lotAllocation(lines, lots).every(a => a.con <= 0);
  if (lots.some(l => l.done[0])) {
    for (let i = 0; i < STAGE_INDEX.vc; i++) next[i] = true;
  }
  LOT_STAGE_KEYS.forEach((key, j) => {
    next[STAGE_INDEX[key]] = fullyAllocated && lots.every(l => l.done[j]);
  });
  return next;
}

// Ngày kết thúc muộn nhất trong các lô (dùng tính Lead-time của PO)
export function latestLotDate(lots) {
  let latest = '';
  (lots || []).forEach(l => LOT_STAGES.forEach(st => {
    if (l[st.endField] && l[st.endField] > latest) latest = l[st.endField];
  }));
  return latest;
}

// Tổng SL thực nhận theo từng SP (null nếu chưa lô nào nhập SL nhận)
export function receivedByLine(lots) {
  const map = {};
  let any = false;
  (lots || []).forEach(lot => lot.items.forEach(it => {
    if (it.n === '' || it.n === undefined) return;
    any = true;
    map[it.k] = (map[it.k] || 0) + (cleanNumber(it.n) || 0);
  }));
  return any ? map : null;
}

// Cột Kanban của 1 lô theo chặng đang làm của lô (lô mới tách -> Vận chuyển QT)
export function getLotKanbanCol(lot) {
  const current = lot.done.findIndex(d => !d);
  const key = current === -1 ? 'ban' : LOT_STAGES[current].key;
  return kanbanColForStageIndex(STAGE_INDEX[key]);
}

// Thẻ Kanban: PO đã tách lô thì chỉ hiện các thẻ lô (không hiện thẻ PO).
// Thẻ lô giữ nguyên dữ liệu PO gốc trong `_po` (dùng khi mở Tracking/Lưu).
export function buildKanbanCards(orders, lotsMap, linesMap) {
  const cards = [];
  (orders || []).forEach(order => {
    const col = getPoKanbanStage(order);
    if (col === 0) return;
    const lots = getPoLots(order, lotsMap);
    if (lots.length === 0) {
      cards.push({ ...order, _po: order, _cardKey: order.ma_po, _col: col });
      return;
    }
    const lines = getPoLines(order, linesMap);
    const remaining = lotAllocation(lines, lots).reduce((s, a) => s + Math.max(0, a.con), 0);
    lots.forEach((lot, lotIdx) => {
      const names = Array.from(new Set(lot.items.filter(it => cleanNumber(it.g) > 0).map(it => it.t || it.k)));
      cards.push({
        ...order,
        _po: order,
        _cardKey: `${order.ma_po}#${lot.ma_lo}`,
        _col: getLotKanbanCol(lot),
        _lotLabel: lot.ma_lo,
        _note: `Lô ${lot.ma_lo}/${lots.length}${lot.done[3] ? ' • Đã mở bán' : ''}${lotIdx === 0 && remaining > 0 ? ` • PO còn ${remaining.toLocaleString('vi-VN')} cái chưa xếp lô` : ''}`,
        ten_sp: names.length > 1 ? `${names[0]} (+${names.length - 1} SP khác)` : (names[0] || order.ten_sp),
        sku: Array.from(new Set(lot.items.filter(it => cleanNumber(it.g) > 0).map(it => it.k))).join(', '),
        so_luong: lot.items.reduce((s, it) => s + (cleanNumber(it.g) || 0), 0),
        tracking_van_chuyen: lot.tracking
      });
    });
  });
  return cards;
}

// Ghi các lô của 1 PO: cập nhật tại chỗ, xoá lô thừa, thêm lô mới
export async function savePoLots(maPo, lots, oldLots, { updateRow, deleteRow, appendRows }) {
  const rows = lots.map(l => lotToRow(l, maPo));
  const oldRows = (oldLots || []).map(l => l._sheetRow).filter(Boolean);
  for (let i = 0; i < rows.length && i < oldRows.length; i++) {
    await updateRow('xnk_lohang', oldRows[i], rows[i]);
  }
  for (let i = rows.length; i < oldRows.length; i++) {
    await deleteRow('xnk_lohang', oldRows[i]);
  }
  if (rows.length > oldRows.length) {
    await appendRows('xnk_lohang', rows.slice(oldRows.length));
  }
}

export async function deletePoLots(maPo, lotsMap, deleteRow) {
  for (const lot of (lotsMap && lotsMap[poKey(maPo)]) || []) {
    if (lot._sheetRow) await deleteRow('xnk_lohang', lot._sheetRow);
  }
}

// Dời ngày từ chặng j trở đi khi ngày kết thúc chặng j thay đổi (giữ nguyên số ngày các chặng sau)
function shiftFrom(lot, j, newEnd) {
  const next = { ...lot };
  const oldDates = lotStageDates(lot);
  next[LOT_STAGES[j].endField] = newEnd;
  let prev = newEnd;
  for (let m = j + 1; m < LOT_STAGES.length; m++) {
    const days = calcDurationDays(oldDates[m].from, oldDates[m].to);
    prev = addDays(prev, days);
    next[LOT_STAGES[m].endField] = prev;
  }
  return next;
}

// ---------------------------------------------------------------------
// Hook quản lý danh sách lô trên form
// ---------------------------------------------------------------------
export function usePoLots() {
  const [lots, setLots] = useState([]);

  const nextCode = (list) => {
    const nums = list.map(l => parseInt(String(l.ma_lo).replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
    return `L${(nums.length ? Math.max(...nums) : 0) + 1}`;
  };
  const updateAt = (idx, fn) => setLots(prev => prev.map((l, i) => (i === idx ? fn(l) : l)));

  return {
    lots,
    load: (list) => setLots((list || []).map(l => ({ ...l, done: [...l.done], items: l.items.map(it => ({ ...it })) }))),
    // Lô mới: mặc định gửi toàn bộ SL còn lại của từng SP, ngày nối tiếp từ ngày gửi
    add: (lines, startDate) => setLots(prev => {
      const alloc = lotAllocation(lines, prev);
      const lot = {
        _sheetRow: null,
        ma_lo: nextCode(prev),
        tracking: '',
        cuoc_phi: 0,
        ngay_gui: startDate || '',
        done: LOT_STAGES.map(() => false),
        items: alloc.map(a => ({ k: a.k, t: a.ten_sp || a.sku, g: Math.max(0, a.con), n: '' })),
        ghi_chu: '',
        cua_khau: 'Cảng Cát Lái',
        hinh_thuc_ban: 'Bán ngay'
      };
      let prevDate = lot.ngay_gui;
      LOT_STAGES.forEach(st => {
        prevDate = prevDate ? addDays(prevDate, st.defaultDays) : '';
        lot[st.endField] = prevDate;
      });
      return [...prev, lot];
    }),
    remove: (idx) => setLots(prev => prev.filter((_, i) => i !== idx)),
    update: (idx, patch) => updateAt(idx, l => ({ ...l, ...patch })),
    // Đổi ngày gửi -> dời cả chuỗi ngày của lô
    setStart: (idx, val) => updateAt(idx, l => {
      const dates = lotStageDates(l);
      const next = { ...l, ngay_gui: val };
      let prev = val;
      LOT_STAGES.forEach((st, j) => {
        prev = addDays(prev, calcDurationDays(dates[j].from, dates[j].to));
        next[st.endField] = prev;
      });
      return next;
    }),
    setEnd: (idx, j, val) => updateAt(idx, l => shiftFrom(l, j, val)),
    setDays: (idx, j, val) => updateAt(idx, l => {
      const from = lotStageDates(l)[j].from;
      return from ? shiftFrom(l, j, addDays(from, Math.max(0, parseInt(val, 10) || 0))) : l;
    }),
    updateItem: (idx, k, patch) => updateAt(idx, l => {
      const exists = l.items.some(it => it.k === k);
      const items = exists
        ? l.items.map(it => (it.k === k ? { ...it, ...patch } : it))
        : [...l.items, { k, t: patch.t || k, g: 0, n: '', ...patch }];
      return { ...l, items };
    }),
    // Bật 1 chặng của lô => các chặng trước cũng xong; tắt => các chặng sau cũng chưa xong
    toggle: (idx, j) => updateAt(idx, l => {
      const next = !l.done[j];
      const done = l.done.map((v, m) => (next ? (m <= j ? true : v) : (m >= j ? false : v)));
      // Về kho thì tự điền SL nhận = SL gửi
      const items = next && j >= KHO_IDX
        ? l.items.map(it => (it.n === '' || it.n === undefined ? { ...it, n: it.g } : it))
        : l.items;
      return { ...l, done, items };
    })
  };
}

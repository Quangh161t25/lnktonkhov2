import { useState } from 'react';
import { formatDateInput, formatDateVN } from '../../../utils/formatters';

// =====================================================================
// CẤU HÌNH CÁC CHẶNG TIẾN ĐỘ ĐƠN PO (dùng chung cho Form PO, Tracking, Kanban)
// - doneKey: khoá cờ "Đã xong" lưu trong ghi chú [tiendo:...] (giữ s1..s6 cũ để tương thích dữ liệu)
// - status: trạng thái đơn khi chặng này là chặng xong gần nhất
// - legacyDays: số ngày khi đọc PO cũ chưa có chặng này (0 = không làm lệch ngày cũ)
// =====================================================================
export const PO_STAGES = [
  { key: 'coc', doneKey: 's1', title: 'Đặt hàng & Cọc', desc: 'Ký hợp đồng & thanh toán cọc', status: 'Đã đặt cọc', defaultDays: 1, color: 'blue' },
  { key: 'tk', doneKey: 'tk', title: 'Duyệt thiết kế', desc: 'Duyệt file thiết kế, bao bì, tem nhãn với xưởng', status: 'Đã duyệt thiết kế', defaultDays: 3, legacyDays: 0, color: 'pink' },
  { key: 'sx', doneKey: 's2', title: 'Sản xuất xưởng', desc: 'Xưởng gia công theo tiêu chuẩn', status: 'Đang sản xuất', defaultDays: 15, color: 'purple' },
  { key: 'ship', doneKey: 'cs', title: 'SX xong chờ ship', desc: 'Hàng hoàn thiện, đóng gói, chờ xếp lịch ship', status: 'Chờ ship', defaultDays: 3, legacyDays: 0, color: 'orange' },
  { key: 'vc', doneKey: 's3', title: 'Vận chuyển quốc tế', desc: 'Vận tải quốc tế về Việt Nam', status: 'Đang vận chuyển', defaultDays: 7, color: 'indigo' },
  { key: 'tq', doneKey: 's4', title: 'Hải quan & Thông quan', desc: 'Mở tờ khai & thông quan', status: 'Đang thông quan', defaultDays: 3, color: 'cyan' },
  { key: 'kho', doneKey: 's5', title: 'Kho VN nhận hàng', desc: 'Kéo hàng về kho & kiểm đếm', status: 'Đã về kho', defaultDays: 2, color: 'emerald' },
  { key: 'ban', doneKey: 's6', title: 'Phân phối & Mở bán', desc: 'Triển khai bán lẻ / lưu kho', status: 'Đã hoàn thành', defaultDays: 0, color: 'amber' }
];

export const STAGE_INDEX = PO_STAGES.reduce((m, s, i) => ({ ...m, [s.key]: i }), {});

// Các cột Kanban = chặng ĐANG LÀM (chặng kế tiếp sau chặng đã xong).
// Cột cuối gộp Kho nhận + Mở bán + Đã hoàn thành.
export const PO_KANBAN_COLUMNS = [
  { col: 1, title: '1. Đặt hàng & Cọc', stageKey: 'coc' },
  { col: 2, title: '2. Duyệt thiết kế', stageKey: 'tk' },
  { col: 3, title: '3. Đang sản xuất', stageKey: 'sx' },
  { col: 4, title: '4. SX xong chờ ship', stageKey: 'ship' },
  { col: 5, title: '5. Vận chuyển QT', stageKey: 'vc' },
  { col: 6, title: '6. Đang thông quan', stageKey: 'tq' },
  { col: 7, title: '7. Kho nhận / Mở bán', stageKey: 'kho' }
];

// Danh sách trạng thái PO (cho bộ lọc)
export const PO_STATUS_OPTIONS = [
  'Chờ sản xuất',
  ...PO_STAGES.map(s => s.status),
  'Đã hủy'
];

// Màu badge theo trạng thái
export function getPoStatusBadgeClass(status) {
  switch (String(status || '').trim()) {
    case 'Đã về kho':
    case 'Đã hoàn thành': return 'bg-emerald-100 text-emerald-800';
    case 'Đang thông quan': return 'bg-indigo-100 text-indigo-800';
    case 'Đang vận chuyển': return 'bg-cyan-100 text-cyan-800';
    case 'Chờ ship': return 'bg-orange-100 text-orange-800';
    case 'Đang sản xuất': return 'bg-amber-100 text-amber-800';
    case 'Đã duyệt thiết kế': return 'bg-pink-100 text-pink-800';
    case 'Đã hủy': return 'bg-rose-100 text-rose-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

// ---------------------------------------------------------------------
// Ghi chú kèm metadata tiến độ: "<ghi chú> [tiendo:k=v;k=v]"
// ---------------------------------------------------------------------
export function extractTiendoMeta(ghiChu) {
  if (!ghiChu) return {};
  const match = String(ghiChu).match(/\[tiendo:([^\]]+)\]/);
  if (!match) return {};
  const meta = {};
  match[1].split(';').forEach(p => {
    const [k, v] = p.split('=');
    if (k && v !== undefined) meta[k.trim()] = v.trim();
  });
  return meta;
}

export function stripTiendoMeta(ghiChu) {
  if (!ghiChu) return '';
  return String(ghiChu).replace(/\s*\[tiendo:[^\]]+\]\s*/g, '').trim();
}

export function buildGhiChuWithMeta(userGhiChu, meta) {
  const cleanNote = stripTiendoMeta(userGhiChu);
  const metaStr = Object.entries(meta)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join(';');
  return metaStr ? (cleanNote ? `${cleanNote} [tiendo:${metaStr}]` : `[tiendo:${metaStr}]`) : cleanNote;
}

// ---------------------------------------------------------------------
// Trạng thái hoàn thành của từng chặng -> mảng boolean theo PO_STAGES
// ---------------------------------------------------------------------
export function resolveStageDone(order) {
  const done = PO_STAGES.map(() => false);
  if (!order) return done;

  const meta = extractTiendoMeta(order.ghi_chu);
  const hasExplicit = PO_STAGES.some(s => meta[s.doneKey] !== undefined);

  if (hasExplicit) {
    PO_STAGES.forEach((s, i) => { done[i] = meta[s.doneKey] === '1'; });
  } else {
    // Không có metadata: suy ra từ trạng thái cuối của đơn
    const st = String(order.tinh_trang_cuoi || '').trim();
    const idx = PO_STAGES.findIndex(s => s.status === st);
    for (let i = 0; i <= idx; i++) done[i] = true;
  }

  // Chặng sau đã xong thì các chặng trước cũng xong (PO cũ chưa có chặng mới)
  for (let i = done.length - 2; i >= 0; i--) {
    if (done[i + 1]) done[i] = true;
  }
  return done;
}

export function computeStatusFromDone(done, isCancelled = false) {
  if (isCancelled) return 'Đã hủy';
  for (let i = done.length - 1; i >= 0; i--) {
    if (done[i]) return PO_STAGES[i].status;
  }
  return 'Chờ sản xuất';
}

// Cột Kanban theo chặng đang làm: chặng đầu tiên chưa xong (0 = đã huỷ, không hiển thị)
export function kanbanColForStageIndex(idx) {
  const key = idx >= PO_STAGES.length ? 'ban' : PO_STAGES[idx].key;
  const col = PO_KANBAN_COLUMNS.find(c => c.stageKey === key)?.col;
  return col || PO_KANBAN_COLUMNS[PO_KANBAN_COLUMNS.length - 1].col;
}

export function getPoKanbanStage(order) {
  if (!order) return 1;
  const st = String(order.tinh_trang_cuoi || '').trim();
  if (st === 'Đã hủy') return 0;
  const done = resolveStageDone(order);
  const current = done.findIndex(d => !d);
  return kanbanColForStageIndex(current === -1 ? PO_STAGES.length : current);
}

// ---------------------------------------------------------------------
// Lịch trình nối tiếp: Từ ngày chặng sau = Đến ngày chặng trước
// ---------------------------------------------------------------------
export function addDays(dateStr, days) {
  if (!dateStr) return '';
  const numDays = Number(days);
  if (isNaN(numDays)) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    dateObj.setDate(dateObj.getDate() + numDays);
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  }
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return dateStr;
  dateObj.setDate(dateObj.getDate() + numDays);
  return dateObj.toISOString().slice(0, 10);
}

export function calcDurationDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const toDate = (str) => {
    const p = str.split('-');
    return p.length === 3 ? new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)) : new Date(str);
  };
  const s = toDate(startDate);
  const e = toDate(endDate);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  const diffDays = Math.round((e.getTime() - s.getTime()) / 86400000);
  return diffDays >= 0 ? diffDays : 0;
}

export function cascadeEnds(start, days) {
  const ends = [];
  let prev = start;
  days.forEach((d, i) => {
    ends[i] = addDays(prev, d);
    prev = ends[i];
  });
  return ends;
}

// Ngày đọc từ sheet -> 'YYYY-MM-DD'; bỏ qua ngày hỏng (năm ngoài 2000-2100)
export function safeDateInput(v) {
  if (!v) return '';
  const out = formatDateInput(v);
  const y = parseInt(out.slice(0, 4), 10);
  return out && y >= 2000 && y <= 2100 ? out : '';
}

const PLAN_NOW = 'Bán ngay';
const PLAN_LATER = 'Bán sau (Trữ kho)';

// Lịch mặc định cho PO mới
export function defaultSchedule(startDate = formatDateInput(new Date())) {
  return {
    start: startDate,
    days: PO_STAGES.map(s => s.defaultDays),
    done: PO_STAGES.map((s, i) => i === 0),
    planType: PLAN_NOW
  };
}

// Đọc lịch trình đã lưu của 1 PO (cột ngày + metadata trong ghi chú)
export function readSchedule(order) {
  if (!order) return defaultSchedule();
  const meta = extractTiendoMeta(order.ghi_chu);
  const d = safeDateInput;
  const num = (v, fb) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? fb : Math.max(0, n);
  };

  const start = d(order.ngay_dat_hang) || formatDateInput(new Date());
  const ends = [];
  ends[0] = d(meta.coc) || addDays(start, num(meta.d1, 1));
  ends[1] = d(meta.tkx) || addDays(ends[0], num(meta.dtk, PO_STAGES[1].legacyDays));
  const sxCol = d(order.ngay_sx_xong);
  ends[2] = sxCol || addDays(ends[1], PO_STAGES[2].defaultDays);
  ends[3] = d(meta.shipx) || addDays(ends[2], num(meta.dcs, PO_STAGES[3].legacyDays));
  const guiHang = d(order.ngay_gui_hang);
  ends[4] = d(meta.cang) || (guiHang && guiHang !== sxCol ? guiHang : addDays(ends[3], num(meta.d3, PO_STAGES[4].defaultDays)));
  ends[5] = d(order.ngay_thong_quan) || addDays(ends[4], PO_STAGES[5].defaultDays);
  ends[6] = d(order.ngay_kho_nhan) || addDays(ends[5], PO_STAGES[6].defaultDays);

  const rawPlan = String(order.ke_hoach_ban || PLAN_NOW);
  const planType = rawPlan.includes('Bán sau') ? PLAN_LATER : PLAN_NOW;
  const planDate = rawPlan.match(/\[(.*?)\]/);
  ends[7] = (planDate && planDate[1] ? d(planDate[1]) : '') || (planType === PLAN_LATER ? addDays(ends[6], 7) : ends[6]);

  const days = ends.map((end, i) => calcDurationDays(i === 0 ? start : ends[i - 1], end));
  return { start, days, done: resolveStageDone(order), planType };
}

// Chuyển lịch trình thành các cột lưu sheet + metadata ghi chú
export function scheduleToRow(schedule) {
  const { start, days, done, planType } = schedule;
  const ends = cascadeEnds(start, days);
  const meta = {};
  PO_STAGES.forEach((s, i) => { meta[s.doneKey] = done[i] ? 1 : 0; });
  Object.assign(meta, {
    d1: days[0], coc: ends[0],
    dtk: days[1], tkx: ends[1],
    dcs: days[3], shipx: ends[3],
    d3: days[4], cang: ends[4]
  });
  return {
    ngay_dat_hang: start,
    ngay_sx_xong: ends[2],
    ngay_gui_hang: ends[4],
    ngay_thong_quan: ends[5],
    ngay_kho_nhan: ends[6],
    ke_hoach_ban: ends[7] ? `${planType} [${formatDateVN(ends[7])}]` : planType,
    meta
  };
}

// ---------------------------------------------------------------------
// Hook quản lý lịch trình nhiều chặng trên form
// ---------------------------------------------------------------------
export function usePoSchedule() {
  const [schedule, setSchedule] = useState(() => defaultSchedule());
  const ends = cascadeEnds(schedule.start, schedule.days);

  const setDaysAt = (i, val) => {
    const v = Math.max(0, parseInt(val, 10) || 0);
    setSchedule(prev => {
      const days = [...prev.days];
      days[i] = v;
      const next = { ...prev, days };
      if (PO_STAGES[i].key === 'ban') next.planType = v === 0 ? PLAN_NOW : PLAN_LATER;
      return next;
    });
  };

  return {
    schedule,
    ends,
    start: schedule.start,
    days: schedule.days,
    done: schedule.done,
    planType: schedule.planType,
    load: (order) => setSchedule(readSchedule(order)),
    reset: (startDate) => setSchedule(defaultSchedule(startDate)),
    setStart: (val) => setSchedule(prev => ({ ...prev, start: val })),
    setDays: setDaysAt,
    setEnd: (i, val) => setDaysAt(i, calcDurationDays(i === 0 ? schedule.start : ends[i - 1], val)),
    // Bật 1 chặng => các chặng trước cũng xong; tắt => các chặng sau cũng chưa xong
    toggle: (i) => {
      const next = !schedule.done[i];
      setSchedule(prev => ({
        ...prev,
        done: prev.done.map((v, j) => (next ? (j <= i ? true : v) : (j >= i ? false : v)))
      }));
      return next;
    },
    setPlanType: (t) => setSchedule(prev => {
      const days = [...prev.days];
      const banIdx = STAGE_INDEX.ban;
      days[banIdx] = t === PLAN_NOW ? 0 : (days[banIdx] > 0 ? days[banIdx] : 7);
      return { ...prev, planType: t, days };
    }),
    status: (isCancelled) => computeStatusFromDone(schedule.done, isCancelled),
    // done: cờ hoàn thành đã gộp từ các lô vận chuyển (nếu có)
    toRow: (done) => scheduleToRow(done ? { ...schedule, done } : schedule),
    leadDays: schedule.days.reduce((s, d) => s + (d || 0), 0)
  };
}

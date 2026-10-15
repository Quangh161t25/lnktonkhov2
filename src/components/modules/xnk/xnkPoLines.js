import { cleanNumber } from '../../../utils/formatters';

// Cột chuẩn của sheet XNK_DON_HANG_CT (mỗi dòng = 1 sản phẩm trong PO)
// ['ma_po', 'stt', 'id_y_tuong', 'id_mau', 'sku', 'ten_sp', 'so_luong', 'don_gia', 'thanh_tien', 'slg_thuc_nhan', 'ghi_chu']

const norm = (v) => (v === undefined || v === null ? '' : String(v)).trim();
const poKey = (maPo) => norm(maPo).toUpperCase();

// Gom các dòng chi tiết theo mã PO -> { [MA_PO]: [{ _sheetRow, ...line }] }
export function buildPoLinesMap(ctData) {
  const map = {};
  if (!ctData || ctData.length <= 1) return map;
  ctData.slice(1).forEach((r, idx) => {
    const key = poKey(r[0]);
    if (!key) return;
    const line = {
      _sheetRow: idx + 2,
      ma_po: norm(r[0]),
      stt: cleanNumber(r[1]) || 0,
      id_y_tuong: norm(r[2]),
      id_mau: norm(r[3]),
      sku: norm(r[4]),
      ten_sp: norm(r[5]),
      so_luong: cleanNumber(r[6]) || 0,
      don_gia: cleanNumber(r[7]) || 0,
      thanh_tien: cleanNumber(r[8]) || 0,
      slg_thuc_nhan: r[9] !== undefined && r[9] !== '' ? cleanNumber(r[9]) : '',
      ghi_chu: norm(r[10])
    };
    if (!line.sku && !line.ten_sp && !line.id_mau && !line.id_y_tuong) return;
    (map[key] = map[key] || []).push(line);
  });
  Object.values(map).forEach(lines => lines.sort((a, b) => a.stt - b.stt));
  return map;
}

// Danh sách SP của 1 PO. PO cũ (chưa có dòng chi tiết) được coi là 1 dòng lấy từ chính dòng PO.
export function getPoLines(order, linesMap) {
  if (!order) return [];
  const lines = linesMap && linesMap[poKey(order.ma_po)];
  if (lines && lines.length > 0) return lines;
  return [{
    _sheetRow: null,
    ma_po: norm(order.ma_po),
    stt: 1,
    id_y_tuong: '',
    id_mau: norm(order.id_mau),
    sku: norm(order.sku),
    ten_sp: norm(order.ten_sp),
    so_luong: cleanNumber(order.so_luong) || 0,
    don_gia: cleanNumber(order.don_gia) || 0,
    thanh_tien: cleanNumber(order.tong_tien) || 0,
    slg_thuc_nhan: order.slg_thuc_nhan !== undefined ? order.slg_thuc_nhan : '',
    ghi_chu: ''
  }];
}

// Tóm tắt nhiều dòng SP thành các cột của dòng PO (giữ tương thích với các màn hình đọc XNK_DON_HANG)
export function summarizePoLines(lines) {
  const valid = (lines || []).filter(l => norm(l.sku) || norm(l.ten_sp));
  const uniq = (arr) => Array.from(new Set(arr.map(norm).filter(Boolean)));
  const soLuong = valid.reduce((s, l) => s + (cleanNumber(l.so_luong) || 0), 0);
  const tongTien = valid.reduce((s, l) => s + (cleanNumber(l.so_luong) || 0) * (cleanNumber(l.don_gia) || 0), 0);
  const hasNhan = valid.some(l => l.slg_thuc_nhan !== '' && l.slg_thuc_nhan !== undefined && l.slg_thuc_nhan !== null);
  const slgThucNhan = hasNhan ? valid.reduce((s, l) => s + (cleanNumber(l.slg_thuc_nhan) || 0), 0) : '';
  const firstName = norm(valid[0]?.ten_sp);

  return {
    id_mau: uniq(valid.map(l => l.id_mau)).join(', '),
    sku: uniq(valid.map(l => l.sku)).join(', '),
    ten_sp: valid.length > 1 ? `${firstName} (+${valid.length - 1} SP khác)` : firstName,
    so_luong: soLuong,
    don_gia: valid.length === 1 ? (cleanNumber(valid[0].don_gia) || 0) : '',
    tong_tien: tongTien,
    slg_thuc_nhan: slgThucNhan
  };
}

// Kiểm tra PO có chứa ít nhất 1 dòng SP thoả điều kiện `match(line)` hay không
export function poHasLine(order, linesMap, match) {
  return getPoLines(order, linesMap).some(match);
}

// Xoá các dòng chi tiết SP của 1 PO (gọi khi xoá PO)
export async function deletePoLines(maPo, linesMap, deleteRow) {
  const lines = (linesMap && linesMap[poKey(maPo)]) || [];
  for (const line of lines) {
    if (line._sheetRow) await deleteRow('xnk_donhang_ct', line._sheetRow);
  }
}

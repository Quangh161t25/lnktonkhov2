import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { formatDateInput, cleanNumber, formatCurrency } from '../../../utils/formatters';
import { 
  Package, 
  CheckCircle2, 
  XCircle, 
  Save, 
  Calendar, 
  Building2, 
  Phone, 
  DollarSign, 
  Image as ImageIcon, 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle,
  ShoppingCart,
  ExternalLink
} from 'lucide-react';

const XEP_HANG_OPTIONS = [
  '',
  'Đạt',
  'Cần cải tiến thêm',
  'Không đạt'
];

const TRANG_THAI_DUYET_MAU = [
  'Chờ duyệt',
  'Đã duyệt (Cho phép đặt thật)',
  'Từ chối'
];

export function XnkMauDrawer({ 
  isOpen, 
  onClose, 
  editItem = null, 
  initialIdea = null,
  ytuongList = [],
  onSaved,
  onCreateOrderFromSample 
}) {
  const { currentUser, hasActionPermission, usersData } = useAuth();
  const { appendRow, updateRow, logAuditAction, xnkMauData, xnkDonHangData } = useData();

  const [idMau, setIdMau] = useState('');
  const [idYtuong, setIdYtuong] = useState('');
  const [tenNcc, setTenNcc] = useState('');
  const [lienHeNcc, setLienHeNcc] = useState('');
  const [giaMau, setGiaMau] = useState('');
  const [ngayDatMau, setNgayDatMau] = useState(formatDateInput(new Date()));
  const [ngayNhanMau, setNgayNhanMau] = useState('');
  const [linkAnhMau, setLinkAnhMau] = useState('');
  const [danhGiaCaiTien, setDanhGiaCaiTien] = useState('');
  const [danhGiaXepHang, setDanhGiaXepHang] = useState('');
  const [trangThaiDuyet, setTrangThaiDuyet] = useState('Chờ duyệt');
  const [ghiChu, setGhiChu] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canApprove = hasActionPermission('xnk.approve') || currentUser?.role === 'ADMIN';

  // Load selected idea info
  const selectedIdea = ytuongList.find(y => (y.id_y_tuong || '') === idYtuong);

  // Compute NCC list from DSNV & XNK sheets
  const nccOptions = useMemo(() => {
    const map = new Map();

    // 1. From DSNV (usersData)
    (usersData || []).forEach(u => {
      const typeStr = (u.type || '').toString().trim().toUpperCase();
      const roleStr = (u.role || '').toString().trim().toUpperCase();
      if (typeStr.includes('NCC') || typeStr.includes('NHÀ CUNG CẤP') || typeStr.includes('XƯỞNG') || roleStr === 'NCC') {
        const name = (u.name || '').trim();
        if (name && !map.has(name.toLowerCase())) {
          map.set(name.toLowerCase(), {
            id: u.id,
            name: name,
            contact: u.image || ''
          });
        }
      }
    });

    // 2. From Samples
    if (xnkMauData && xnkMauData.length > 1) {
      xnkMauData.slice(1).forEach(r => {
        const name = (r[2] || '').trim();
        if (name && !map.has(name.toLowerCase())) {
          map.set(name.toLowerCase(), {
            id: '',
            name: name,
            contact: (r[3] || '').trim()
          });
        }
      });
    }

    // 3. From PO Orders
    if (xnkDonHangData && xnkDonHangData.length > 1) {
      xnkDonHangData.slice(1).forEach(r => {
        const name = (r[4] || '').trim();
        if (name && !map.has(name.toLowerCase())) {
          map.set(name.toLowerCase(), {
            id: '',
            name: name,
            contact: ''
          });
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [usersData, xnkMauData, xnkDonHangData]);

  useEffect(() => {
    if (editItem) {
      setIdMau(editItem.id_mau || '');
      setIdYtuong(editItem.id_y_tuong || '');
      setTenNcc(editItem.ten_ncc || '');
      setLienHeNcc(editItem.lien_he_ncc || '');
      setGiaMau(editItem.gia_mau !== undefined && editItem.gia_mau !== '' ? editItem.gia_mau : '');
      setNgayDatMau(editItem.ngay_dat_mau ? formatDateInput(editItem.ngay_dat_mau) : formatDateInput(new Date()));
      setNgayNhanMau(editItem.ngay_nhan_mau ? formatDateInput(editItem.ngay_nhan_mau) : '');
      setLinkAnhMau(editItem.link_anh_mau || '');
      setDanhGiaCaiTien(editItem.danh_gia_cai_tien || '');
      setDanhGiaXepHang(editItem.danh_gia_xep_hang || '');
      setTrangThaiDuyet(editItem.trang_thai_duyet || 'Chờ duyệt');
      setGhiChu(editItem.ghi_chu || '');
    } else {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setIdMau(`MAU-${todayStr}-${randomSuffix}`);
      setIdYtuong(initialIdea?.id_y_tuong || '');
      setTenNcc('');
      setLienHeNcc('');
      setGiaMau('');
      setNgayDatMau(formatDateInput(new Date()));
      setNgayNhanMau('');
      setLinkAnhMau('');
      setDanhGiaCaiTien('');
      setDanhGiaXepHang(''); // Để trống khi tạo mới
      setTrangThaiDuyet('Chờ duyệt');
      setGhiChu('');
    }
    setErrorMsg('');
  }, [editItem, initialIdea, isOpen]);

  const handleApprove = () => {
    setTrangThaiDuyet('Đã duyệt (Cho phép đặt thật)');
    setDanhGiaXepHang('Đạt');
  };

  const handleReject = () => {
    setTrangThaiDuyet('Từ chối');
    setDanhGiaXepHang('Không đạt');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenNcc.trim()) {
      setErrorMsg('Vui lòng nhập tên nhà cung cấp / xưởng!');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      // Columns: ['id_mau', 'id_y_tuong', 'ten_ncc', 'lien_he_ncc', 'gia_mau', 'ngay_dat_mau', 'ngay_nhan_mau', 'link_anh_mau', 'danh_gia_cai_tien', 'danh_gia_xep_hang', 'trang_thai_duyet', 'ghi_chu']
      const rowValues = [
        idMau.trim(),
        idYtuong.trim(),
        tenNcc.trim(),
        lienHeNcc.trim(),
        giaMau !== '' ? cleanNumber(giaMau) : '',
        ngayDatMau,
        ngayNhanMau,
        linkAnhMau.trim(),
        danhGiaCaiTien.trim(),
        danhGiaXepHang,
        trangThaiDuyet,
        ghiChu.trim()
      ];

      if (editItem?._sheetRow) {
        await updateRow('xnk_mau', editItem._sheetRow, rowValues);
        if (logAuditAction) {
          await logAuditAction({
            moduleName: 'xnk',
            actionType: 'SỬA',
            orderId: idMau,
            targetObject: tenNcc,
            summary: `Cập nhật mẫu thử: ${tenNcc} (${danhGiaXepHang})`
          });
        }
      } else {
        await appendRow('xnk_mau', rowValues);
        if (logAuditAction) {
          await logAuditAction({
            moduleName: 'xnk',
            actionType: 'THÊM',
            orderId: idMau,
            targetObject: tenNcc,
            summary: `Đặt mẫu thử mới NCC: ${tenNcc} cho ý tưởng ${idYtuong}`
          });
        }
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Lỗi lưu mẫu:', err);
      setErrorMsg('Không thể lưu dữ liệu lên hệ thống. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? `Sửa Mẫu Thử: ${idMau}` : 'Đặt Hàng Mẫu & Đánh Giá NCC'}
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Mã mẫu & Liên kết ý tưởng */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã đặt mẫu
            </label>
            <input
              type="text"
              value={idMau}
              readOnly
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Liên kết Ý tưởng sản phẩm
            </label>
            <select
              value={idYtuong}
              onChange={(e) => setIdYtuong(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
              <option value="">-- Chọn ý tưởng sản phẩm --</option>
              {ytuongList.map(yt => (
                <option key={yt.id_y_tuong} value={yt.id_y_tuong}>
                  [{yt.sku_du_kien || yt.id_y_tuong}] {yt.ten_sp} ({yt.trang_thai})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Thông tin ý tưởng đã chọn (nếu có) */}
        {selectedIdea && (
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
            <div className="font-bold text-blue-900">
              Sản phẩm: {selectedIdea.ten_sp} (SKU: {selectedIdea.sku_du_kien || 'N/A'})
            </div>
            {selectedIdea.moTa && (
              <div className="text-slate-600 line-clamp-2">
                Mô tả: {selectedIdea.moTa}
              </div>
            )}
            {selectedIdea.link_tham_khao && (
              <a
                href={selectedIdea.link_tham_khao.startsWith('http') ? selectedIdea.link_tham_khao : `https://${selectedIdea.link_tham_khao}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 font-semibold text-[11px]"
              >
                Xem link mẫu gốc <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Tên NCC & Liên hệ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Tên Nhà cung cấp / Xưởng <span className="text-rose-500">*</span>
              </label>
              {nccOptions.length > 0 && (
                <span className="text-[10px] text-blue-600 font-semibold">
                  {nccOptions.length} NCC trong DS
                </span>
              )}
            </div>

            {/* Dropdown chọn NCC từ danh sách */}
            <select
              value={nccOptions.some(n => n.name === tenNcc) ? tenNcc : (tenNcc ? '__CUSTOM__' : '')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__CUSTOM__') {
                  setTenNcc('');
                } else if (val) {
                  setTenNcc(val);
                  const selectedNcc = nccOptions.find(n => n.name === val);
                  if (selectedNcc?.contact && !lienHeNcc) {
                    setLienHeNcc(selectedNcc.contact);
                  }
                } else {
                  setTenNcc('');
                }
              }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none mb-1.5"
            >
              <option value="">-- Chọn NCC từ danh sách ({nccOptions.length} NCC) --</option>
              {nccOptions.map(n => (
                <option key={n.name} value={n.name}>
                  🏢 {n.name} {n.contact ? `(Liên hệ: ${n.contact})` : ''}
                </option>
              ))}
              <option value="__CUSTOM__">✍️ Tự nhập nhà cung cấp / xưởng khác...</option>
            </select>

            {/* Ô input tên NCC */}
            <input
              type="text"
              value={tenNcc}
              onChange={(e) => setTenNcc(e.target.value)}
              placeholder="Nhập hoặc kiểm tra tên nhà cung cấp..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Liên hệ NCC (SĐT / Wechat / Link)
            </label>
            <input
              type="text"
              value={lienHeNcc}
              onChange={(e) => setLienHeNcc(e.target.value)}
              placeholder="Wechat ID, Hotline, Email..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Giá mẫu, Ngày đặt, Ngày nhận */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Giá đặt mẫu (VNĐ)
            </label>
            <input
              type="number"
              value={giaMau}
              onChange={(e) => setGiaMau(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ngày đặt mẫu
            </label>
            <input
              type="date"
              value={ngayDatMau}
              onChange={(e) => setNgayDatMau(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ngày nhận mẫu
            </label>
            <input
              type="date"
              value={ngayNhanMau}
              onChange={(e) => setNgayNhanMau(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Link ảnh mẫu thực tế & Preview */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Link ảnh mẫu thực tế (URL ảnh chụp mẫu)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={linkAnhMau}
              onChange={(e) => setLinkAnhMau(e.target.value)}
              placeholder="https://... ảnh mẫu thực tế chụp lại"
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
            {linkAnhMau && (
              <a
                href={linkAnhMau}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Xem
              </a>
            )}
          </div>

          {/* Preview Image Thumbnail */}
          {linkAnhMau && (
            <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block max-w-full">
              <img
                src={linkAnhMau}
                alt="Ảnh mẫu thực tế"
                className="h-28 object-contain rounded-lg border border-slate-200 bg-white"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Đánh giá & Góp ý cải tiến */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Đánh giá chất lượng mẫu & Điểm cần cải tiến
          </label>
          <textarea
            rows={3}
            value={danhGiaCaiTien}
            onChange={(e) => setDanhGiaCaiTien(e.target.value)}
            placeholder="Ghi rõ nhận xét chất liệu, đường may ráp, độ bền, những điểm xưởng cần sửa đổi trước khi làm hàng loạt..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
          />
        </div>

        {/* Xếp hạng & Phê duyệt của Sếp */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Xếp hạng đánh giá:
              </label>
              <select
                value={danhGiaXepHang}
                onChange={(e) => setDanhGiaXepHang(e.target.value)}
                className={`w-full px-3 py-1.5 border rounded-xl text-xs font-bold focus:outline-none ${
                  danhGiaXepHang === 'Đạt' 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                    : danhGiaXepHang === 'Không đạt'
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : danhGiaXepHang === 'Cần cải tiến thêm'
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <option value="">-- Để trống (Chưa đánh giá) --</option>
                <option value="Đạt">Đạt</option>
                <option value="Cần cải tiến thêm">Cần cải tiến thêm</option>
                <option value="Không đạt">Không đạt</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sếp duyệt mẫu:
              </label>
              <select
                value={trangThaiDuyet}
                onChange={(e) => setTrangThaiDuyet(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                {TRANG_THAI_DUYET_MAU.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {canApprove && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
              <span className="text-[11px] text-slate-500 font-medium mr-auto">Sếp thao tác duyệt:</span>
              <button
                type="button"
                onClick={handleApprove}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center gap-1 transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt mẫu Đạt (Đặt hàng)
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center gap-1 transition cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" /> Không đạt
              </button>
            </div>
          )}
        </div>

        {/* Ghi chú */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Ghi chú thêm
          </label>
          <input
            type="text"
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            placeholder="Thời gian hẹn xưởng, điều kiện bảo hành mẫu..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Nút tạo đơn PO nhanh nếu mẫu đã duyệt đạt */}
        {editItem && trangThaiDuyet === 'Đã duyệt (Cho phép đặt thật)' && onCreateOrderFromSample && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="text-xs text-emerald-900 font-semibold">
              Mẫu thử đã được duyệt Đạt! Bạn có thể tạo đơn hàng PO sản xuất hàng loạt ngay.
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onCreateOrderFromSample(editItem, selectedIdea);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Tạo Đơn PO
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Đang lưu...' : (editItem ? 'Cập nhật' : 'Lưu mẫu thử')}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

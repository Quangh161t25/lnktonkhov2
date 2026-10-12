import React, { useState, useEffect } from 'react';
import { Drawer } from '../../common/Drawer';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { formatDateInput, cleanNumber, formatCurrency, formatNumber } from '../../../utils/formatters';
import { 
  FileCheck, 
  Factory, 
  Truck, 
  Warehouse, 
  Calendar, 
  Save, 
  DollarSign, 
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

const KE_HOACH_BAN_OPTIONS = [
  'Bán ngay',
  'Bán sau (Trữ kho)'
];

const TINH_TRANG_CUOI_OPTIONS = [
  'Đang sản xuất',
  'Đang vận chuyển',
  'Đang thông quan',
  'Đã về kho',
  'Đã hoàn thành',
  'Đã hủy'
];

export function XnkDonHangDrawer({ 
  isOpen, 
  onClose, 
  editItem = null, 
  initialSample = null,
  sampleList = [],
  onSaved 
}) {
  const { currentUser, hasActionPermission } = useAuth();
  const { appendRow, updateRow, logAuditAction } = useData();

  const [maPo, setMaPo] = useState('');
  const [idMau, setIdMau] = useState('');
  const [sku, setSku] = useState('');
  const [tenSp, setTenSp] = useState('');
  const [tenNcc, setTenNcc] = useState('');
  const [soLuong, setSoLuong] = useState(100);
  const [donGia, setDonGia] = useState(0);
  const [tienCoc, setTienCoc] = useState(0);
  
  // 5 Stages
  const [ngayDatHang, setNgayDatHang] = useState(formatDateInput(new Date()));
  const [ngaySxXong, setNgaySxXong] = useState('');
  const [trackingVanChuyen, setTrackingVanChuyen] = useState('');
  const [ngayGuiHang, setNgayGuiHang] = useState('');
  const [ngayThongQuan, setNgayThongQuan] = useState('');
  const [ngayKhoNhan, setNgayKhoNhan] = useState('');
  const [slgThucNhan, setSlgThucNhan] = useState('');

  const [keHoachBan, setKeHoachBan] = useState('Bán ngay');
  const [tinhTrangCuoi, setTinhTrangCuoi] = useState('Đang sản xuất');
  const [ghiChu, setGhiChu] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto calculate total amount
  const tongTien = (cleanNumber(soLuong) || 0) * (cleanNumber(donGia) || 0);

  useEffect(() => {
    if (editItem) {
      setMaPo(editItem.ma_po || '');
      setIdMau(editItem.id_mau || '');
      setSku(editItem.sku || '');
      setTenSp(editItem.ten_sp || '');
      setTenNcc(editItem.ten_ncc || '');
      setSoLuong(editItem.so_luong !== undefined && editItem.so_luong !== '' ? editItem.so_luong : 100);
      setDonGia(editItem.don_gia !== undefined && editItem.don_gia !== '' ? editItem.don_gia : 0);
      setTienCoc(editItem.tien_coc !== undefined && editItem.tien_coc !== '' ? editItem.tien_coc : 0);
      
      setNgayDatHang(editItem.ngay_dat_hang ? formatDateInput(editItem.ngay_dat_hang) : formatDateInput(new Date()));
      setNgaySxXong(editItem.ngay_sx_xong ? formatDateInput(editItem.ngay_sx_xong) : '');
      setTrackingVanChuyen(editItem.tracking_van_chuyen || '');
      setNgayGuiHang(editItem.ngay_gui_hang ? formatDateInput(editItem.ngay_gui_hang) : '');
      setNgayThongQuan(editItem.ngay_thong_quan ? formatDateInput(editItem.ngay_thong_quan) : '');
      setNgayKhoNhan(editItem.ngay_kho_nhan ? formatDateInput(editItem.ngay_kho_nhan) : '');
      setSlgThucNhan(editItem.slg_thuc_nhan !== undefined && editItem.slg_thuc_nhan !== '' ? editItem.slg_thuc_nhan : '');

      setKeHoachBan(editItem.ke_hoach_ban || 'Bán ngay');
      setTinhTrangCuoi(editItem.tinh_trang_cuoi || 'Đang sản xuất');
      setGhiChu(editItem.ghi_chu || '');
    } else {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setMaPo(`PO-${todayStr}-${randomSuffix}`);
      
      if (initialSample) {
        setIdMau(initialSample.id_mau || '');
        setSku(initialSample.sku || initialSample.sku_du_kien || '');
        setTenSp(initialSample.ten_sp || '');
        setTenNcc(initialSample.ten_ncc || '');
      } else {
        setIdMau('');
        setSku('');
        setTenSp('');
        setTenNcc('');
      }

      setSoLuong(100);
      setDonGia(0);
      setTienCoc(0);
      setNgayDatHang(formatDateInput(new Date()));
      setNgaySxXong('');
      setTrackingVanChuyen('');
      setNgayGuiHang('');
      setNgayThongQuan('');
      setNgayKhoNhan('');
      setSlgThucNhan('');
      setKeHoachBan('Bán ngay');
      setTinhTrangCuoi('Đang sản xuất');
      setGhiChu('');
    }
    setErrorMsg('');
  }, [editItem, initialSample, isOpen]);

  // Handle selecting a sample to fill details
  const handleSelectSample = (sampleId) => {
    setIdMau(sampleId);
    const found = sampleList.find(s => (s.id_mau || '') === sampleId);
    if (found) {
      if (found.ten_ncc) setTenNcc(found.ten_ncc);
      if (found.ten_sp) setTenSp(found.ten_sp);
      if (found.sku || found.sku_du_kien) setSku(found.sku || found.sku_du_kien);
    }
  };

  // Auto suggest status based on stages
  const suggestStatus = () => {
    if (ngayKhoNhan) return 'Đã về kho';
    if (ngayThongQuan) return 'Đang thông quan';
    if (ngayGuiHang) return 'Đang vận chuyển';
    if (ngaySxXong) return 'Đang sản xuất';
    return 'Đang sản xuất';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenSp.trim()) {
      setErrorMsg('Vui lòng nhập tên sản phẩm!');
      return;
    }
    if (cleanNumber(soLuong) <= 0) {
      setErrorMsg('Số lượng đặt hàng phải lớn hơn 0!');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      // Columns: ['ma_po', 'id_mau', 'sku', 'ten_sp', 'ten_ncc', 'so_luong', 'don_gia', 'tong_tien', 'tien_coc', 'ngay_dat_hang', 'ngay_sx_xong', 'tracking_van_chuyen', 'ngay_gui_hang', 'ngay_thong_quan', 'ngay_kho_nhan', 'slg_thuc_nhan', 'ke_hoach_ban', 'tinh_trang_cuoi', 'ghi_chu']
      const rowValues = [
        maPo.trim(),
        idMau.trim(),
        sku.trim(),
        tenSp.trim(),
        tenNcc.trim(),
        cleanNumber(soLuong),
        cleanNumber(donGia),
        cleanNumber(tongTien),
        cleanNumber(tienCoc),
        ngayDatHang,
        ngaySxXong,
        trackingVanChuyen.trim(),
        ngayGuiHang,
        ngayThongQuan,
        ngayKhoNhan,
        slgThucNhan !== '' ? cleanNumber(slgThucNhan) : '',
        keHoachBan,
        tinhTrangCuoi,
        ghiChu.trim()
      ];

      if (editItem?._sheetRow) {
        await updateRow('xnk_donhang', editItem._sheetRow, rowValues);
        if (logAuditAction) {
          await logAuditAction({
            moduleName: 'xnk',
            actionType: 'SỬA',
            orderId: maPo,
            targetObject: tenSp,
            summary: `Cập nhật PO ${maPo}: ${tenSp} (${tinhTrangCuoi})`
          });
        }
      } else {
        await appendRow('xnk_donhang', rowValues);
        if (logAuditAction) {
          await logAuditAction({
            moduleName: 'xnk',
            actionType: 'THÊM',
            orderId: maPo,
            targetObject: tenSp,
            summary: `Lên đơn PO mới ${maPo}: ${tenSp} - SLG: ${soLuong}`
          });
        }
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Lỗi lưu đơn PO:', err);
      setErrorMsg('Không thể lưu dữ liệu lên hệ thống. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? `Cập Nhật Đơn PO: ${maPo}` : 'Tạo Đơn Hàng Sản Xuất Mới (PO)'}
      width="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Mã PO & Liên kết Mẫu thử */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã đơn hàng (PO)
            </label>
            <input
              type="text"
              value={maPo}
              readOnly
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chọn từ Mẫu thử đã duyệt
            </label>
            <select
              value={idMau}
              onChange={(e) => handleSelectSample(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
              <option value="">-- Chọn mẫu thử liên kết --</option>
              {sampleList.map(s => (
                <option key={s.id_mau} value={s.id_mau}>
                  [{s.id_mau}] {s.ten_sp || s.sku || 'Mẫu'} - NCC: {s.ten_ncc} ({s.trang_thai_duyet})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SKU, Tên SP, NCC */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              SKU sản phẩm <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="VD: LNK-KB-01..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên sản phẩm <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={tenSp}
              onChange={(e) => setTenSp(e.target.value)}
              placeholder="Tên sản phẩm..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nhà cung cấp / Xưởng
            </label>
            <input
              type="text"
              value={tenNcc}
              onChange={(e) => setTenNcc(e.target.value)}
              placeholder="Tên xưởng SX..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Số lượng, Đơn giá, Tổng tiền, Tiền cọc */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số lượng đặt <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={soLuong}
                onChange={(e) => setSoLuong(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-blue-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Đơn giá (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                value={donGia}
                onChange={(e) => setDonGia(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tổng tiền (VNĐ)
              </label>
              <input
                type="text"
                readOnly
                value={formatCurrency(tongTien)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tiền đặt cọc (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                value={tienCoc}
                onChange={(e) => setTienCoc(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-amber-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* 5 CHẶNG TIẾN ĐỘ THỜI GIAN */}
        <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-white">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              Thời gian chi tiết 5 chặng quy trình
            </span>
            <button
              type="button"
              onClick={() => setTinhTrangCuoi(suggestStatus())}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Gợi ý trạng thái tự động
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Chặng 1 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                1. Ngày đặt / Cọc
              </label>
              <input
                type="date"
                value={ngayDatHang}
                onChange={(e) => setNgayDatHang(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
              />
            </div>

            {/* Chặng 2 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                2. Ngày SX xong
              </label>
              <input
                type="date"
                value={ngaySxXong}
                onChange={(e) => setNgaySxXong(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
              />
            </div>

            {/* Chặng 3 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                3. Ngày gửi hàng (Vận chuyển)
              </label>
              <input
                type="date"
                value={ngayGuiHang}
                onChange={(e) => setNgayGuiHang(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
              />
            </div>

            {/* Chặng 4 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                4. Ngày thông quan
              </label>
              <input
                type="date"
                value={ngayThongQuan}
                onChange={(e) => setNgayThongQuan(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
              />
            </div>

            {/* Chặng 5 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                5. Ngày kho nhận hàng
              </label>
              <input
                type="date"
                value={ngayKhoNhan}
                onChange={(e) => setNgayKhoNhan(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
              />
            </div>

            {/* SLG thực nhận */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Số lượng thực nhận (cái)
              </label>
              <input
                type="number"
                value={slgThucNhan}
                onChange={(e) => setSlgThucNhan(e.target.value)}
                placeholder="Khi kho đếm xong..."
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Tracking vận chuyển */}
          <div className="pt-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Mã Tracking vận chuyển quốc tế (Vận đơn đường biển / bay / bộ)
            </label>
            <input
              type="text"
              value={trackingVanChuyen}
              onChange={(e) => setTrackingVanChuyen(e.target.value)}
              placeholder="VD: SF12345678, COSCO8899..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
            />
          </div>
        </div>

        {/* KẾ HOẠCH BÁN & TÌNH TRẠNG CUỐI */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kế hoạch bán hàng <span className="text-rose-500">*</span>
            </label>
            <select
              value={keHoachBan}
              onChange={(e) => setKeHoachBan(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              {KE_HOACH_BAN_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tình trạng sau cùng của đơn <span className="text-rose-500">*</span>
            </label>
            <select
              value={tinhTrangCuoi}
              onChange={(e) => setTinhTrangCuoi(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-blue-700 focus:outline-none"
            >
              {TINH_TRANG_CUOI_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ghi chú */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Ghi chú đơn hàng
          </label>
          <input
            type="text"
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            placeholder="Ghi chú điều khoản thanh toán, đóng thùng, dán tem nhãn phụ..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
        </div>

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
            {isSaving ? 'Đang lưu...' : (editItem ? 'Cập nhật' : 'Tạo đơn PO')}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

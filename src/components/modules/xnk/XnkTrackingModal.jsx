import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Factory, 
  FileCheck, 
  Warehouse, 
  Calendar, 
  AlertCircle,
  ExternalLink,
  Table,
  Check,
  Save,
  RotateCw,
  Sparkles,
  CalendarRange
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { 
  formatDateVN, 
  formatDateInput, 
  formatNumber, 
  formatCurrency, 
  cleanNumber 
} from '../../../utils/formatters';

function calcDurationDays(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
}

export function XnkTrackingModal({ isOpen, onClose, order, onSaved }) {
  const { updateRow, logAuditAction, fetchModule } = useData();

  const [activeView, setActiveView] = useState('TABLE'); // 'TABLE' | 'STEPPER'

  // Editable stage states
  const [ngayDatHang, setNgayDatHang] = useState('');
  const [ngaySxXong, setNgaySxXong] = useState('');
  const [ngayGuiHang, setNgayGuiHang] = useState('');
  const [trackingVanChuyen, setTrackingVanChuyen] = useState('');
  const [ngayThongQuan, setNgayThongQuan] = useState('');
  const [ngayKhoNhan, setNgayKhoNhan] = useState('');
  const [slgThucNhan, setSlgThucNhan] = useState('');

  // Stage Done toggles
  const [s1Done, setS1Done] = useState(false);
  const [s2Done, setS2Done] = useState(false);
  const [s3Done, setS3Done] = useState(false);
  const [s4Done, setS4Done] = useState(false);
  const [s5Done, setS5Done] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (order) {
      setNgayDatHang(order.ngay_dat_hang ? formatDateInput(order.ngay_dat_hang) : '');
      setNgaySxXong(order.ngay_sx_xong ? formatDateInput(order.ngay_sx_xong) : '');
      setNgayGuiHang(order.ngay_gui_hang ? formatDateInput(order.ngay_gui_hang) : '');
      setTrackingVanChuyen(order.tracking_van_chuyen || '');
      setNgayThongQuan(order.ngay_thong_quan ? formatDateInput(order.ngay_thong_quan) : '');
      setNgayKhoNhan(order.ngay_kho_nhan ? formatDateInput(order.ngay_kho_nhan) : '');
      setSlgThucNhan(order.slg_thuc_nhan !== undefined && order.slg_thuc_nhan !== '' ? order.slg_thuc_nhan : '');

      setS1Done(Boolean(order.ngay_dat_hang));
      setS2Done(Boolean(order.ngay_sx_xong));
      setS3Done(Boolean(order.ngay_gui_hang));
      setS4Done(Boolean(order.ngay_thong_quan));
      setS5Done(Boolean(order.ngay_kho_nhan));
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  // Auto Computed Final Status (Yêu cầu 6)
  const autoStatus = (() => {
    if (order.tinh_trang_cuoi === 'Đã hủy') return 'Đã hủy';
    if (s5Done || Boolean(ngayKhoNhan) || (slgThucNhan !== '' && Number(slgThucNhan) > 0)) {
      return 'Đã về kho';
    }
    if (s4Done || Boolean(ngayThongQuan)) {
      return 'Đang thông quan';
    }
    if (s3Done || Boolean(ngayGuiHang) || Boolean(trackingVanChuyen)) {
      return 'Đang vận chuyển';
    }
    if (s2Done || Boolean(ngaySxXong)) {
      return 'Đang sản xuất';
    }
    if (s1Done || Boolean(ngayDatHang)) {
      return 'Đã đặt cọc';
    }
    return 'Chờ sản xuất';
  })();

  // Tính số ngày của các chặng
  const durS1 = 1;
  const durS2 = calcDurationDays(ngayDatHang, ngaySxXong);
  const durS3 = calcDurationDays(ngaySxXong || ngayDatHang, ngayGuiHang);
  const durS4 = calcDurationDays(ngayGuiHang, ngayThongQuan);
  const durS5 = calcDurationDays(ngayThongQuan, ngayKhoNhan);
  const totalDays = (durS1 || 0) + (durS2 || 0) + (durS3 || 0) + (durS4 || 0) + (durS5 || 0);

  // 5 Stages Definition for Stepper
  const stages = [
    {
      step: 1,
      title: 'Đặt hàng & Cọc',
      desc: 'Ký hợp đồng & thanh toán cọc',
      icon: FileCheck,
      date: ngayDatHang,
      isDone: s1Done,
      duration: durS1,
      extra: order.tien_coc ? `Cọc: ${formatCurrency(order.tien_coc)}` : null
    },
    {
      step: 2,
      title: 'Sản xuất hàng loạt',
      desc: 'Xưởng gia công theo tiêu chuẩn mẫu',
      icon: Factory,
      date: ngaySxXong,
      isDone: s2Done,
      duration: durS2,
      extra: order.ten_ncc ? `Xưởng: ${order.ten_ncc}` : null
    },
    {
      step: 3,
      title: 'Vận chuyển quốc tế',
      desc: 'Xuất xưởng gửi hàng & vận chuyển QT',
      icon: Truck,
      date: ngayGuiHang,
      isDone: s3Done,
      duration: durS3,
      extra: trackingVanChuyen ? `Vận đơn: ${trackingVanChuyen}` : null
    },
    {
      step: 4,
      title: 'Hải quan & Thông quan',
      desc: 'Thủ tục hải quan và kiểm hóa cửa khẩu',
      icon: CheckCircle2,
      date: ngayThongQuan,
      isDone: s4Done,
      duration: durS4,
      extra: null
    },
    {
      step: 5,
      title: 'Kho Việt Nam nhận hàng',
      desc: 'Kiểm đếm và nhập kho thành phẩm',
      icon: Warehouse,
      date: ngayKhoNhan,
      isDone: s5Done,
      duration: durS5,
      extra: slgThucNhan ? `Thực nhận: ${formatNumber(slgThucNhan)} cái` : null
    }
  ];

  const completedCount = stages.filter(s => s.isDone).length;
  const progressPercent = Math.round((completedCount / stages.length) * 100);

  // Lưu cập nhật tiến độ trực tiếp lên Google Sheets
  const handleSaveProgress = async () => {
    if (!order._sheetRow) return;
    setIsSaving(true);
    try {
      const finalStatus = autoStatus;
      const rowValues = [
        order.ma_po,
        order.id_mau || '',
        order.sku || '',
        order.ten_sp || '',
        order.ten_ncc || '',
        cleanNumber(order.so_luong) || 0,
        cleanNumber(order.don_gia) || 0,
        cleanNumber(order.tong_tien) || 0,
        cleanNumber(order.tien_coc) || 0,
        ngayDatHang,
        ngaySxXong,
        trackingVanChuyen.trim(),
        ngayGuiHang,
        ngayThongQuan,
        ngayKhoNhan,
        slgThucNhan !== '' ? cleanNumber(slgThucNhan) : '',
        order.ke_hoach_ban || 'Bán ngay',
        finalStatus,
        order.ghi_chu || ''
      ];

      await updateRow('xnk_donhang', order._sheetRow, rowValues);
      if (logAuditAction) {
        await logAuditAction({
          moduleName: 'xnk',
          actionType: 'SỬA',
          orderId: order.ma_po,
          targetObject: order.ten_sp,
          summary: `Cập nhật tiến độ 5 chặng đơn PO ${order.ma_po}: ${finalStatus}`
        });
      }
      await fetchModule('xnk_donhang', true);
      if (onSaved) onSaved();
      alert('Đã cập nhật tiến độ đơn hàng thành công!');
      onClose();
    } catch (err) {
      console.error('Lỗi lưu tiến độ:', err);
      alert('Không thể cập nhật tiến độ. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 overflow-hidden z-10 border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-700">
                PO: {order.ma_po}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                {order.ke_hoach_ban || 'Bán ngay'}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-500" />
                {autoStatus}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2">
              {order.ten_sp}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              SKU: <strong className="text-slate-700">{order.sku}</strong> • NCC: <strong className="text-slate-700">{order.ten_ncc || 'Chưa rõ'}</strong> • Đặt: <strong className="text-blue-700">{formatNumber(order.so_luong)} cái</strong> • Tổng: <strong className="text-emerald-700">{formatCurrency(order.tong_tien)}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher: Bảng vs Stepper */}
        <div className="my-3 flex items-center justify-between p-2 bg-slate-50 rounded-2xl border border-slate-200 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveView('TABLE')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeView === 'TABLE'
                  ? 'bg-white text-blue-700 border border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Bảng ma trận 5 chặng (Nhập & Lưu)</span>
            </button>

            <button
              onClick={() => setActiveView('STEPPER')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeView === 'STEPPER'
                  ? 'bg-white text-indigo-700 border border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Stepper Lịch trình trực quan</span>
            </button>
          </div>

          <div className="text-xs font-bold text-slate-700">
            Tiến độ: <span className="text-blue-600">{completedCount}/5 chặng ({progressPercent}%)</span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* VIEW 1: DẠNG BẢNG MA TRẬN 5 CHẶNG */}
          {activeView === 'TABLE' && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Chặng</th>
                    <th className="py-2.5 px-3">Ngày mốc</th>
                    <th className="py-2.5 px-3 text-center">Số ngày</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3">Chi tiết & Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Chặng 1 */}
                  <tr className={s1Done ? 'bg-emerald-50/30' : ''}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      1. Đặt hàng & Cọc
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayDatHang}
                        onChange={(e) => setNgayDatHang(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-blue-700">
                      {durS1} ngày
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setS1Done(!s1Done)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                          s1Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s1Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {s1Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      Cọc: <strong className="text-amber-700">{formatCurrency(order.tien_coc)}</strong>
                    </td>
                  </tr>

                  {/* Chặng 2 */}
                  <tr className={s2Done ? 'bg-emerald-50/30' : ''}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      2. Sản xuất hàng loạt
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngaySxXong}
                        onChange={(e) => setNgaySxXong(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-purple-700">
                      {durS2 !== null ? `${durS2} ngày` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setS2Done(!s2Done)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                          s2Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s2Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {s2Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      Xưởng: {order.ten_ncc || '-'}
                    </td>
                  </tr>

                  {/* Chặng 3 */}
                  <tr className={s3Done ? 'bg-emerald-50/30' : ''}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      3. Vận chuyển quốc tế
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayGuiHang}
                        onChange={(e) => setNgayGuiHang(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-indigo-700">
                      {durS3 !== null ? `${durS3} ngày` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setS3Done(!s3Done)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                          s3Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s3Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {s3Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={trackingVanChuyen}
                        onChange={(e) => setTrackingVanChuyen(e.target.value)}
                        placeholder="Mã tracking / vận đơn..."
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                  </tr>

                  {/* Chặng 4 */}
                  <tr className={s4Done ? 'bg-emerald-50/30' : ''}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      4. Hải quan & Cảng
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayThongQuan}
                        onChange={(e) => setNgayThongQuan(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-cyan-700">
                      {durS4 !== null ? `${durS4} ngày` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setS4Done(!s4Done)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                          s4Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s4Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {s4Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      Cảng Cát Lái / Hữu Nghị
                    </td>
                  </tr>

                  {/* Chặng 5 */}
                  <tr className={s5Done ? 'bg-emerald-50/30' : ''}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      5. Kho VN nhận hàng & Bán
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayKhoNhan}
                        onChange={(e) => setNgayKhoNhan(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                      {durS5 !== null ? `${durS5} ngày` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setS5Done(!s5Done)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                          s5Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s5Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {s5Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={slgThucNhan}
                        onChange={(e) => setSlgThucNhan(e.target.value)}
                        placeholder="SLG thực tế nhập kho..."
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 2: DẠNG STEPPER & TIMELINE */}
          {activeView === 'STEPPER' && (
            <div className="space-y-4">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {stages.map((st) => {
                  const Icon = st.icon;
                  return (
                    <div key={st.step} className="relative flex items-start gap-4">
                      {/* Step Circle */}
                      <div className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition ${
                        st.isDone
                          ? 'bg-emerald-500 border-white text-white shadow-sm ring-2 ring-emerald-200'
                          : 'bg-white border-slate-300 text-slate-400'
                      }`}>
                        {st.isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.step}
                      </div>

                      {/* Content Card */}
                      <div className={`flex-1 p-3.5 rounded-2xl border transition ${
                        st.isDone 
                          ? 'bg-emerald-50/40 border-emerald-100 text-slate-800' 
                          : 'bg-slate-50/50 border-slate-100 text-slate-500'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${st.isDone ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span className={`text-sm font-bold ${st.isDone ? 'text-slate-800' : 'text-slate-600'}`}>
                              Chặng {st.step}: {st.title}
                            </span>
                          </div>
                          {st.date ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {formatDateVN(st.date)}
                            </span>
                          ) : (
                            <span className="text-xs italic text-slate-400">Chưa có ngày</span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-1">{st.desc}</p>

                        {st.extra && (
                          <div className="mt-2 text-xs font-medium text-blue-700 bg-blue-50/60 px-2.5 py-1 rounded-lg inline-block">
                            {st.extra}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveProgress}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu cập nhật tiến độ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

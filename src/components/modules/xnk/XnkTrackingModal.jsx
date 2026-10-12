import React from 'react';
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
  ExternalLink
} from 'lucide-react';
import { formatDateVN, formatNumber, formatCurrency } from '../../../utils/formatters';

export function XnkTrackingModal({ isOpen, onClose, order }) {
  if (!isOpen || !order) return null;

  // 5 Stages Definition
  const stages = [
    {
      step: 1,
      title: 'Đặt hàng & Cọc',
      desc: 'Ký kết hợp đồng & chuyển cọc cho nhà cung cấp',
      icon: FileCheck,
      date: order.ngay_dat_hang,
      dateLabel: 'Ngày đặt / cọc',
      isDone: Boolean(order.ngay_dat_hang),
      extra: order.tien_coc ? `Đã cọc: ${formatCurrency(order.tien_coc)}` : null
    },
    {
      step: 2,
      title: 'Sản xuất hàng loạt',
      desc: 'Xưởng gia công và đóng gói theo tiêu chuẩn mẫu',
      icon: Factory,
      date: order.ngay_sx_xong,
      dateLabel: 'Ngày SX xong',
      isDone: Boolean(order.ngay_sx_xong),
      extra: null
    },
    {
      step: 3,
      title: 'Vận chuyển quốc tế',
      desc: 'Xuất xưởng & vận chuyển đường biển / bộ / hàng không',
      icon: Truck,
      date: order.ngay_gui_hang,
      dateLabel: 'Ngày gửi hàng',
      isDone: Boolean(order.ngay_gui_hang),
      extra: order.tracking_van_chuyen ? `Mã vận đơn: ${order.tracking_van_chuyen}` : null
    },
    {
      step: 4,
      title: 'Hải quan & Thông quan',
      desc: 'Làm thủ tục nhập khẩu và kiểm hóa tại cửa khẩu',
      icon: CheckCircle2,
      date: order.ngay_thong_quan,
      dateLabel: 'Ngày thông quan',
      isDone: Boolean(order.ngay_thong_quan),
      extra: null
    },
    {
      step: 5,
      title: 'Kho Việt Nam nhận hàng',
      desc: 'Kiểm đếm và nhập kho thành phẩm thực tế',
      icon: Warehouse,
      date: order.ngay_kho_nhan,
      dateLabel: 'Ngày nhập kho',
      isDone: Boolean(order.ngay_kho_nhan),
      extra: order.slg_thuc_nhan ? `Thực nhận: ${formatNumber(order.slg_thuc_nhan)} cái` : null
    }
  ];

  const completedCount = stages.filter(s => s.isDone).length;
  const progressPercent = Math.round((completedCount / stages.length) * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 overflow-hidden z-10 border border-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-700">
                PO: {order.ma_po || 'Chưa có mã'}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                order.ke_hoach_ban === 'Bán ngay' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {order.ke_hoach_ban || 'Chưa phân loại'}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                {order.tinh_trang_cuoi || 'Đang xử lý'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-2">
              {order.ten_sp || 'Sản phẩm'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              SKU: <strong className="text-slate-700">{order.sku}</strong> • NCC: <strong className="text-slate-700">{order.ten_ncc || 'Chưa rõ'}</strong> • Số lượng: <strong className="text-blue-700">{formatNumber(order.so_luong)} cái</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Summary Bar */}
        <div className="my-5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold text-slate-700">Tiến độ quy trình</span>
            <span className="text-xs font-bold text-blue-600">{completedCount}/5 Chặng ({progressPercent}%)</span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stepper Timeline */}
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {stages.map((st) => {
            const Icon = st.icon;
            return (
              <div key={st.step} className="relative flex items-start gap-4">
                {/* Step Circle Indicator */}
                <div className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition ${
                  st.isDone
                    ? 'bg-emerald-500 border-white text-white shadow-sm ring-2 ring-emerald-200'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}>
                  {st.isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.step}
                </div>

                {/* Content Card */}
                <div className={`flex-1 p-3.5 rounded-xl border transition ${
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
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shadow-2xs">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDateVN(st.date)}
                      </span>
                    ) : (
                      <span className="text-xs italic text-slate-400">Chưa có ngày</span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-1">{st.desc}</p>

                  {st.extra && (
                    <div className="mt-2 text-xs font-medium text-blue-700 bg-blue-50/60 px-2.5 py-1 rounded inline-block">
                      {st.extra}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {order.ghi_chu && <span>Ghi chú: {order.ghi_chu}</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

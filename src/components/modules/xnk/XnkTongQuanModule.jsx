import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { XnkHeaderNav } from './XnkHeaderNav';
import { XnkTrackingModal } from './XnkTrackingModal';
import { exportToExcel } from '../../../services/excelService';
import { 
  formatDateVN, 
  formatNumber, 
  formatCurrency, 
  cleanNumber 
} from '../../../utils/formatters';
import { 
  Ship, 
  Lightbulb, 
  PackageSearch, 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Factory, 
  Truck, 
  Warehouse, 
  ChevronRight, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Eye, 
  ArrowRight,
  Sparkles,
  PackageCheck
} from 'lucide-react';

export function XnkTongQuanModule({ onNavigate }) {
  const { 
    xnkYtuongData, 
    xnkMauData, 
    xnkDonHangData, 
    fetchModule, 
    loadingModules 
  } = useData();

  const [trackingOrder, setTrackingOrder] = useState(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  useEffect(() => {
    fetchModule('xnk');
  }, [fetchModule]);

  // Parsed Ý tưởng
  const ytuongList = useMemo(() => {
    if (!xnkYtuongData || xnkYtuongData.length <= 1) return [];
    return xnkYtuongData.slice(1).map((r, idx) => ({
      _sheetRow: idx + 2,
      id_y_tuong: r[0] || '',
      ngay_tao: r[1] || '',
      nguoi_tao: r[2] || '',
      sku_du_kien: r[3] || '',
      ten_sp: r[4] || '',
      mo_ta: r[5] || '',
      link_tham_khao: r[6] || '',
      trang_thai: r[7] || 'Mới tạo',
      nguoi_duyet: r[8] || '',
      ghi_chu: r[9] || ''
    })).filter(i => i.id_y_tuong || i.ten_sp);
  }, [xnkYtuongData]);

  // Parsed Mẫu
  const mauList = useMemo(() => {
    if (!xnkMauData || xnkMauData.length <= 1) return [];
    return xnkMauData.slice(1).map((r, idx) => ({
      _sheetRow: idx + 2,
      id_mau: r[0] || '',
      id_y_tuong: r[1] || '',
      ten_ncc: r[2] || '',
      lien_he_ncc: r[3] || '',
      gia_mau: r[4] !== undefined && r[4] !== '' ? cleanNumber(r[4]) : '',
      ngay_dat_mau: r[5] || '',
      ngay_nhan_mau: r[6] || '',
      link_anh_mau: r[7] || '',
      danh_gia_cai_tien: r[8] || '',
      danh_gia_xep_hang: r[9] || 'Đạt',
      trang_thai_duyet: r[10] || 'Chờ duyệt',
      ghi_chu: r[11] || ''
    })).filter(i => i.id_mau || i.ten_ncc);
  }, [xnkMauData]);

  // Parsed Đơn hàng PO
  const donHangList = useMemo(() => {
    if (!xnkDonHangData || xnkDonHangData.length <= 1) return [];
    return xnkDonHangData.slice(1).map((r, idx) => ({
      _sheetRow: idx + 2,
      ma_po: r[0] || '',
      id_mau: r[1] || '',
      sku: r[2] || '',
      ten_sp: r[3] || '',
      ten_ncc: r[4] || '',
      so_luong: cleanNumber(r[5]) || 0,
      don_gia: cleanNumber(r[6]) || 0,
      tong_tien: cleanNumber(r[7]) || 0,
      tien_coc: cleanNumber(r[8]) || 0,
      ngay_dat_hang: r[9] || '',
      ngay_sx_xong: r[10] || '',
      tracking_van_chuyen: r[11] || '',
      ngay_gui_hang: r[12] || '',
      ngay_thong_quan: r[13] || '',
      ngay_kho_nhan: r[14] || '',
      slg_thuc_nhan: r[15] !== undefined && r[15] !== '' ? cleanNumber(r[15]) : '',
      ke_hoach_ban: r[16] || 'Bán ngay',
      tinh_trang_cuoi: r[17] || 'Đang sản xuất',
      ghi_chu: r[18] || ''
    })).filter(i => i.ma_po || i.ten_sp);
  }, [xnkDonHangData]);

  // KPI Calculations
  const totalYtuong = ytuongList.length;
  const approvedYtuong = ytuongList.filter(y => y.trang_thai === 'Đã duyệt').length;
  const pendingYtuong = ytuongList.filter(y => y.trang_thai === 'Đang thảo luận' || y.trang_thai === 'Mới tạo').length;

  const totalMau = mauList.length;
  const approvedMau = mauList.filter(m => m.trang_thai_duyet === 'Đã duyệt (Cho phép đặt thật)' || m.danh_gia_xep_hang === 'Đạt').length;
  const pendingMau = mauList.filter(m => m.trang_thai_duyet === 'Chờ duyệt').length;

  const totalPo = donHangList.length;
  const totalQtyOrdered = donHangList.reduce((acc, d) => acc + (d.so_luong || 0), 0);
  const totalPoValue = donHangList.reduce((acc, d) => acc + (d.tong_tien || 0), 0);
  const totalDepositPaid = donHangList.reduce((acc, d) => acc + (d.tien_coc || 0), 0);
  const warehouseReceivedCount = donHangList.filter(d => d.tinh_trang_cuoi === 'Đã về kho' || d.tinh_trang_cuoi === 'Đã hoàn thành').length;

  // Kanban 5 stages
  const kanbanColumns = [
    {
      id: 'st1',
      title: '1. Đặt hàng & Cọc',
      icon: Clock,
      color: 'blue',
      items: donHangList.filter(d => Boolean(d.ngay_dat_hang) && !d.ngay_sx_xong)
    },
    {
      id: 'st2',
      title: '2. Đang sản xuất',
      icon: Factory,
      color: 'amber',
      items: donHangList.filter(d => Boolean(d.ngay_sx_xong) && !d.ngay_gui_hang)
    },
    {
      id: 'st3',
      title: '3. Vận chuyển QT',
      icon: Truck,
      color: 'cyan',
      items: donHangList.filter(d => Boolean(d.ngay_gui_hang) && !d.ngay_thong_quan)
    },
    {
      id: 'st4',
      title: '4. Đang thông quan',
      icon: CheckCircle2,
      color: 'indigo',
      items: donHangList.filter(d => Boolean(d.ngay_thong_quan) && !d.ngay_kho_nhan)
    },
    {
      id: 'st5',
      title: '5. Đã về kho',
      icon: Warehouse,
      color: 'emerald',
      items: donHangList.filter(d => Boolean(d.ngay_kho_nhan))
    }
  ];

  const handleExportSummary = () => {
    const headers = ['Mã PO', 'SKU', 'Tên sản phẩm', 'Nhà cung cấp', 'Số lượng', 'Đơn giá', 'Tổng tiền', 'Tiền cọc', 'Tình trạng cuối', 'Kế hoạch bán'];
    const rows = donHangList.map(d => [
      d.ma_po, d.sku, d.ten_sp, d.ten_ncc, d.so_luong, d.don_gia, d.tong_tien, d.tien_coc, d.tinh_trang_cuoi, d.ke_hoach_ban
    ]);
    exportToExcel([headers, ...rows], 'XNK_TONG_QUAN.xlsx', 'TONG_QUAN');
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Navigation */}
      <XnkHeaderNav
        activeKey="xnk"
        onNavigate={onNavigate}
        onRefresh={() => fetchModule('xnk', true)}
        onExportExcel={handleExportSummary}
        isLoading={loadingModules.xnk || loadingModules.xnk_ytuong || loadingModules.xnk_mau || loadingModules.xnk_donhang}
        counts={{
          ytuong: ytuongList.length,
          mau: mauList.length,
          donhang: donHangList.length
        }}
      />

      {/* 2. Top Executive KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Ý tưởng */}
        <div 
          onClick={() => onNavigate('xnk_ytuong')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Ý tưởng SP</span>
            <Lightbulb className="w-5 h-5 text-amber-500 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{totalYtuong}</div>
          <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
            <span>Đã duyệt: <strong className="text-emerald-600">{approvedYtuong}</strong></span>
            <span>Chờ: <strong className="text-amber-600">{pendingYtuong}</strong></span>
          </div>
        </div>

        {/* Card 2: Mẫu thử & NCC */}
        <div 
          onClick={() => onNavigate('xnk_mau')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Đặt Mẫu & NCC</span>
            <PackageSearch className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{totalMau}</div>
          <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
            <span>Mẫu đạt: <strong className="text-emerald-600">{approvedMau}</strong></span>
            <span>Chờ duyệt: <strong className="text-amber-600">{pendingMau}</strong></span>
          </div>
        </div>

        {/* Card 3: Đơn hàng PO */}
        <div 
          onClick={() => onNavigate('xnk_donhang')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Đơn hàng PO</span>
            <ClipboardList className="w-5 h-5 text-blue-500 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-700">{totalPo}</div>
          <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
            <span>Tổng SL: <strong className="text-slate-800">{formatNumber(totalQtyOrdered)}</strong></span>
            <span>Về kho: <strong className="text-emerald-600">{warehouseReceivedCount}</strong></span>
          </div>
        </div>

        {/* Card 4: Giá trị tài chính */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng ngân sách PO</span>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-700">{formatCurrency(totalPoValue)}</div>
          <div className="mt-1 text-xs text-slate-500">
            Đã đặt cọc: <strong className="text-amber-700">{formatCurrency(totalDepositPaid)}</strong>
          </div>
        </div>
      </div>

      {/* 3. Quy trình 4 bước XNK trực quan */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Sơ Đồ Quy Trình Xuất Nhập Khẩu Khép Kín
            </h2>
            <p className="text-xs text-blue-200 mt-0.5">
              Nhấp vào từng chặng để chuyển thẳng đến module quản lý chi tiết tương ứng
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div 
            onClick={() => onNavigate('xnk_ytuong')}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3.5 rounded-xl border border-white/15 transition cursor-pointer group"
          >
            <div className="text-[11px] font-bold text-amber-300">Khâu 1: Đề xuất & Thảo luận</div>
            <div className="text-sm font-bold mt-1 flex items-center justify-between">
              Ý Tưởng Sản Phẩm
              <ChevronRight className="w-4 h-4 text-white/50 group-hover:translate-x-1 transition" />
            </div>
            <p className="text-[11px] text-blue-100 mt-1">Đề xuất tên SP, SKU, link 1688, họp duyệt</p>
          </div>

          <div 
            onClick={() => onNavigate('xnk_mau')}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3.5 rounded-xl border border-white/15 transition cursor-pointer group"
          >
            <div className="text-[11px] font-bold text-cyan-300">Khâu 2: Đặt mẫu thử</div>
            <div className="text-sm font-bold mt-1 flex items-center justify-between">
              Tìm NCC & Test Mẫu
              <ChevronRight className="w-4 h-4 text-white/50 group-hover:translate-x-1 transition" />
            </div>
            <p className="text-[11px] text-blue-100 mt-1">Nhiều NCC, ảnh mẫu thực tế, cải tiến, Sếp duyệt</p>
          </div>

          <div 
            onClick={() => onNavigate('xnk_donhang')}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3.5 rounded-xl border border-white/15 transition cursor-pointer group"
          >
            <div className="text-[11px] font-bold text-emerald-300">Khâu 3: Sản xuất hàng loạt</div>
            <div className="text-sm font-bold mt-1 flex items-center justify-between">
              Lên Đơn Hàng PO
              <ChevronRight className="w-4 h-4 text-white/50 group-hover:translate-x-1 transition" />
            </div>
            <p className="text-[11px] text-blue-100 mt-1">Hợp đồng, số lượng, thanh toán cọc xưởng</p>
          </div>

          <div 
            className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/15"
          >
            <div className="text-[11px] font-bold text-indigo-300">Khâu 4: Logistics & Nhập kho</div>
            <div className="text-sm font-bold mt-1">
              5 Chặng Vận Chuyển
            </div>
            <p className="text-[11px] text-blue-100 mt-1">Vận chuyển QT, thông quan, nhận hàng kho VN</p>
          </div>
        </div>
      </div>

      {/* 4. Kanban 5 Chặng Tiến Độ PO Đang Chạy */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Bảng Theo Dõi Tiến Độ Đơn Hàng PO (Kanban 5 Chặng)
            </h3>
          </div>
          <button
            onClick={() => onNavigate('xnk_donhang')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            Xem tất cả đơn PO <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-1">
          {kanbanColumns.map((col) => {
            const Icon = col.icon;
            return (
              <div key={col.id} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 flex flex-col min-h-[380px]">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                    <Icon className="w-4 h-4 text-blue-600" />
                    {col.title}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                    {col.items.length}
                  </span>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto">
                  {col.items.length === 0 ? (
                    <div className="h-28 flex items-center justify-center text-[11px] text-slate-400 italic">
                      Trống
                    </div>
                  ) : (
                    col.items.map((order) => (
                      <div
                        key={order.ma_po}
                        onClick={() => {
                          setTrackingOrder(order);
                          setIsTrackingModalOpen(true);
                        }}
                        className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-400 transition cursor-pointer space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-700 group-hover:underline">
                            {order.ma_po}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            order.ke_hoach_ban === 'Bán ngay'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {order.ke_hoach_ban}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 line-clamp-1">
                          {order.ten_sp}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          SKU: <strong className="text-slate-700">{order.sku}</strong> • SLG: <strong className="text-blue-700">{formatNumber(order.so_luong)}</strong>
                        </div>
                        <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
                          <span className="truncate max-w-[100px]">NCC: {order.ten_ncc || '-'}</span>
                          <span className="font-semibold text-slate-700">{formatCurrency(order.tong_tien)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Hai bảng tóm tắt: Đơn PO mới nhất & Ý tưởng mới nhất */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Đơn PO gần nhất */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              Đơn Đặt Hàng PO Gần Đây
            </h3>
            <button
              onClick={() => onNavigate('xnk_donhang')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Xem tất cả
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100 font-semibold">
                  <th className="pb-2">Mã PO</th>
                  <th className="pb-2">Sản phẩm</th>
                  <th className="pb-2 text-right">SLG</th>
                  <th className="pb-2 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {donHangList.slice(0, 5).map(po => (
                  <tr key={po.ma_po} className="hover:bg-slate-50 transition">
                    <td className="py-2 font-semibold text-blue-700">{po.ma_po}</td>
                    <td className="py-2 font-medium text-slate-800">{po.ten_sp}</td>
                    <td className="py-2 text-right font-bold text-slate-700">{formatNumber(po.so_luong)}</td>
                    <td className="py-2 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {po.tinh_trang_cuoi}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ý tưởng mới đề xuất */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Ý Tưởng Mới Đề Xuất
            </h3>
            <button
              onClick={() => onNavigate('xnk_ytuong')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Xem tất cả
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100 font-semibold">
                  <th className="pb-2">Mã</th>
                  <th className="pb-2">Tên sản phẩm</th>
                  <th className="pb-2">Người đề xuất</th>
                  <th className="pb-2 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ytuongList.slice(0, 5).map(yt => (
                  <tr key={yt.id_y_tuong} className="hover:bg-slate-50 transition">
                    <td className="py-2 font-semibold text-blue-700">{yt.id_y_tuong}</td>
                    <td className="py-2 font-medium text-slate-800">{yt.ten_sp}</td>
                    <td className="py-2 text-slate-600">{yt.nguoi_tao}</td>
                    <td className="py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        yt.trang_thai === 'Đã duyệt'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {yt.trang_thai}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stepper Tracking Modal */}
      <XnkTrackingModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        order={trackingOrder}
      />
    </div>
  );
}

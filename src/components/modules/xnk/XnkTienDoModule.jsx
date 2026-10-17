import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { XnkTrackingModal, getPoKanbanStage } from './XnkTrackingModal';
import { PO_KANBAN_COLUMNS } from './xnkStages';
import { STAGE_ICONS } from './PoStageViews';
import { buildLotsMap, buildKanbanCards } from './xnkLots';
import { buildPoLinesMap } from './xnkPoLines';
import { exportToExcel } from '../../../services/excelService';
import { 
  formatDateVN, 
  formatNumber, 
  formatCurrency, 
  cleanNumber, 
  matchesSearch 
} from '../../../utils/formatters';
import { 
  ArrowLeft, 
  Search, 
  RotateCw, 
  Download, 
  Clock, 
  Factory, 
  Truck, 
  CheckCircle2, 
  Warehouse, 
  List, 
  BarChart3,
  Calendar,
  Eye,
  Filter
} from 'lucide-react';

export function XnkTienDoModule({ onNavigate }) {
  const { 
    xnkDonHangData, 
    xnkDonHangCtData,
    xnkLoHangData,
    fetchModule, 
    loadingModules 
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState('KANBAN'); // 'KANBAN' | 'TIMELINE'
  const [searchTerm, setSearchTerm] = useState('');
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  useEffect(() => {
    fetchModule('xnk_donhang');
  }, [fetchModule]);

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

  // Filtered
  const filteredList = useMemo(() => {
    if (!searchTerm) return donHangList;
    return donHangList.filter(item => 
      matchesSearch(item.ma_po, searchTerm) ||
      matchesSearch(item.sku, searchTerm) ||
      matchesSearch(item.ten_sp, searchTerm) ||
      matchesSearch(item.ten_ncc, searchTerm) ||
      matchesSearch(item.tracking_van_chuyen, searchTerm)
    );
  }, [donHangList, searchTerm]);

  // Các cột Kanban (Phân loại theo trạng thái tiến độ thực tế thay vì ngày dự kiến)
  // PO chia lô: mỗi lô vận chuyển là 1 thẻ riêng
  const poLinesMap = useMemo(() => buildPoLinesMap(xnkDonHangCtData), [xnkDonHangCtData]);
  const lotsMap = useMemo(() => buildLotsMap(xnkLoHangData), [xnkLoHangData]);
  const kanbanCards = useMemo(() => buildKanbanCards(filteredList, lotsMap, poLinesMap), [filteredList, lotsMap, poLinesMap]);

  const kanbanStages = PO_KANBAN_COLUMNS.map(c => ({
    id: `st${c.col}`,
    title: c.title,
    icon: STAGE_ICONS[c.stageKey],
    items: kanbanCards.filter(d => d._col === c.col)
  }));

  const handleExportExcel = () => {
    const headers = ['Mã PO', 'SKU', 'Tên sản phẩm', 'Nhà cung cấp', 'Số lượng', 'Ngày đặt/cọc', 'Ngày SX xong', 'Tracking', 'Ngày gửi hàng', 'Ngày thông quan', 'Ngày kho nhận', 'Tình trạng cuối'];
    const rows = filteredList.map(d => [
      d.ma_po, d.sku, d.ten_sp, d.ten_ncc, d.so_luong, d.ngay_dat_hang, d.ngay_sx_xong, d.tracking_van_chuyen, d.ngay_gui_hang, d.ngay_thong_quan, d.ngay_kho_nhan, d.tinh_trang_cuoi
    ]);
    exportToExcel([headers, ...rows], 'TIEN_DO_5_CHANG_XNK.xlsx', 'TIEN_DO');
  };

  return (
    <div className="space-y-3">
      {/* 1. Sub-Tabs Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSubTab('KANBAN')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'KANBAN'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Bảng Kanban {PO_KANBAN_COLUMNS.length} Chặng</span>
          </button>
        </div>

        <div className="text-xs font-medium text-slate-500">
          Tổng cộng: <strong className="text-slate-800">{filteredList.length}</strong> đơn PO đang theo dõi
        </div>
      </div>

      {/* 2. Control Toolbar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('xnk')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Quay lại Hub Xuất Nhập Khẩu"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Quay lại</span>
          </button>

          <div className="relative w-48 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm mã PO, SKU, tên SP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchModule('xnk_donhang', true)}
            disabled={loadingModules.xnk_donhang}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RotateCw className={`w-4 h-4 ${loadingModules.xnk_donhang ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 3. KANBAN COLUMNS VIEW */}
      <div className="flex gap-3 overflow-x-auto pb-2 pt-1">
        {kanbanStages.map((st) => {
          const Icon = st.icon;

          return (
            <div key={st.id} className="min-w-[230px] flex-1 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 flex flex-col min-h-[460px]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                  <Icon className="w-4 h-4 text-blue-600" />
                  {st.title}
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  {st.items.length}
                </span>
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto">
                {st.items.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-[11px] text-slate-400 italic">
                    Không có đơn
                  </div>
                ) : (
                  st.items.map((order) => (
                    <div
                      key={order._cardKey}
                      onClick={() => {
                        setTrackingOrder(order._po);
                        setIsTrackingModalOpen(true);
                      }}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-400 transition cursor-pointer space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px]">
                          {order.ma_po}{order._lotLabel ? ` / ${order._lotLabel}` : ''}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          order.ke_hoach_ban === 'Bán ngay'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.ke_hoach_ban}
                        </span>
                      </div>
                      {order._note && (
                          <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded inline-block">
                            {order._note}
                          </div>
                        )}
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
                      {order.tracking_van_chuyen && (
                        <div className="text-[10px] bg-slate-50 px-2 py-1 rounded text-slate-600 truncate">
                          Vận đơn: {order.tracking_van_chuyen}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stepper Tracking Modal */}
      <XnkTrackingModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        order={trackingOrder}
        onSaved={async () => {
          await fetchModule('xnk_donhang', true);
        }}
      />
    </div>
  );
}

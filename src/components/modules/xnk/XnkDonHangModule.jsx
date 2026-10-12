import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { XnkHeaderNav } from './XnkHeaderNav';
import { XnkDonHangDrawer } from './XnkDonHangDrawer';
import { XnkTrackingModal } from './XnkTrackingModal';
import { Pagination } from '../../common/Pagination';
import { exportToExcel } from '../../../services/excelService';
import { 
  formatDateVN, 
  formatNumber, 
  formatCurrency, 
  cleanNumber, 
  matchesSearch 
} from '../../../utils/formatters';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  Calendar, 
  DollarSign, 
  Truck, 
  Warehouse,
  CheckCircle2
} from 'lucide-react';

export function XnkDonHangModule({ onNavigate }) {
  const { 
    xnkYtuongData, 
    xnkMauData, 
    xnkDonHangData, 
    fetchModule, 
    deleteRow,
    loadingModules 
  } = useData();

  const { currentUser, hasActionPermission } = useAuth();
  const canManage = hasActionPermission('xnk.manage') || currentUser?.role === 'ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Drawer & Tracking Modal
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [trackingOrder, setTrackingOrder] = useState(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  useEffect(() => {
    fetchModule('xnk_donhang');
    fetchModule('xnk_mau');
  }, [fetchModule]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Parsed Mẫu (để liên kết khi tạo PO)
  const sampleList = useMemo(() => {
    if (!xnkMauData || xnkMauData.length <= 1) return [];
    return xnkMauData.slice(1).map((r, idx) => ({
      _sheetRow: idx + 2,
      id_mau: r[0] || '',
      id_y_tuong: r[1] || '',
      ten_ncc: r[2] || '',
      sku: '',
      ten_sp: '',
      trang_thai_duyet: r[10] || 'Chờ duyệt'
    })).filter(i => i.id_mau);
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

  // Filtered
  const filteredList = useMemo(() => {
    return donHangList.filter(item => {
      if (statusFilter !== 'ALL' && item.tinh_trang_cuoi !== statusFilter && item.ke_hoach_ban !== statusFilter) return false;
      if (searchTerm) {
        const match = 
          matchesSearch(item.ma_po, searchTerm) ||
          matchesSearch(item.sku, searchTerm) ||
          matchesSearch(item.ten_sp, searchTerm) ||
          matchesSearch(item.ten_ncc, searchTerm) ||
          matchesSearch(item.tracking_van_chuyen, searchTerm);
        if (!match) return false;
      }
      return true;
    });
  }, [donHangList, statusFilter, searchTerm]);

  // Paginated
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  const handleExportExcel = () => {
    const headers = ['Mã PO', 'Mã mẫu', 'SKU', 'Tên sản phẩm', 'Nhà cung cấp', 'Số lượng', 'Đơn giá', 'Tổng tiền', 'Tiền cọc', 'Ngày đặt/cọc', 'Ngày SX xong', 'Tracking', 'Ngày gửi hàng', 'Ngày thông quan', 'Ngày kho nhận', 'SL thực nhận', 'Kế hoạch bán', 'Tình trạng cuối', 'Ghi chú'];
    const rows = filteredList.map(d => [
      d.ma_po, d.id_mau, d.sku, d.ten_sp, d.ten_ncc, d.so_luong, d.don_gia, d.tong_tien, d.tien_coc, d.ngay_dat_hang, d.ngay_sx_xong, d.tracking_van_chuyen, d.ngay_gui_hang, d.ngay_thong_quan, d.ngay_kho_nhan, d.slg_thuc_nhan, d.ke_hoach_ban, d.tinh_trang_cuoi, d.ghi_chu
    ]);
    exportToExcel([headers, ...rows], 'XNK_DON_HANG_PO.xlsx', 'DON_HANG_PO');
  };

  const handleDelete = async (sheetRow, maPo) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa đơn hàng PO [${maPo}]?`)) return;
    try {
      await deleteRow('xnk_donhang', sheetRow);
    } catch (err) {
      console.error('Lỗi xóa:', err);
      alert('Không thể xóa dòng dữ liệu. Vui lòng thử lại!');
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Header Nav */}
      <XnkHeaderNav
        activeKey="xnk_donhang"
        onNavigate={onNavigate}
        onRefresh={() => fetchModule('xnk_donhang', true)}
        onExportExcel={handleExportExcel}
        onAddNew={canManage ? () => { setSelectedItem(null); setIsDrawerOpen(true); } : null}
        addButtonLabel="Tạo Đơn Hàng PO Mới"
        isLoading={loadingModules.xnk_donhang}
        counts={{
          ytuong: (xnkYtuongData?.length > 1 ? xnkYtuongData.length - 1 : 0),
          mau: (xnkMauData?.length > 1 ? xnkMauData.length - 1 : 0),
          donhang: donHangList.length
        }}
      />

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500">Tổng đơn PO</span>
          <div className="text-lg font-bold text-slate-800 mt-0.5">{donHangList.length}</div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-600">Tổng SLG đặt</span>
          <div className="text-lg font-bold text-blue-600 mt-0.5">
            {formatNumber(donHangList.reduce((acc, d) => acc + (d.so_luong || 0), 0))} cái
          </div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600">Tổng giá trị PO</span>
          <div className="text-lg font-bold text-emerald-600 mt-0.5">
            {formatCurrency(donHangList.reduce((acc, d) => acc + (d.tong_tien || 0), 0))}
          </div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-600">Đã về kho</span>
          <div className="text-lg font-bold text-amber-600 mt-0.5">
            {donHangList.filter(d => d.tinh_trang_cuoi === 'Đã về kho' || d.tinh_trang_cuoi === 'Đã hoàn thành').length} PO
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm mã PO, SKU, tên SP, tracking..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 whitespace-nowrap">
            <Filter className="w-3.5 h-3.5" /> Lọc trạng thái / kế hoạch:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả</option>
            <option value="Đang sản xuất">Đang sản xuất</option>
            <option value="Đang vận chuyển">Đang vận chuyển</option>
            <option value="Đang thông quan">Đang thông quan</option>
            <option value="Đã về kho">Đã về kho</option>
            <option value="Đã hoàn thành">Đã hoàn thành</option>
            <option value="Bán ngay">Kế hoạch: Bán ngay</option>
            <option value="Bán sau (Trữ kho)">Kế hoạch: Bán sau</option>
          </select>
        </div>
      </div>

      {/* 4. Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                <th className="py-2.5 px-3 whitespace-nowrap">Mã PO</th>
                <th className="py-2.5 px-3 whitespace-nowrap">SKU</th>
                <th className="py-2.5 px-3 min-w-[180px]">Tên sản phẩm</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Nhà cung cấp</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">SLG Đặt</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Đơn giá</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Tổng tiền</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Tiền cọc</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Kế hoạch bán</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Tình trạng cuối</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Tiến độ 5 chặng</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    Không tìm thấy đơn đặt hàng PO nào
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => (
                  <tr key={item.ma_po} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-semibold text-blue-700 whitespace-nowrap">
                      {item.ma_po}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      {item.sku}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {item.ten_sp}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {item.ten_ncc || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-blue-700 whitespace-nowrap">
                      {formatNumber(item.so_luong)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                      {formatCurrency(item.don_gia)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                      {formatCurrency(item.tong_tien)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-amber-700 whitespace-nowrap">
                      {formatCurrency(item.tien_coc)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        item.ke_hoach_ban === 'Bán ngay'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.ke_hoach_ban}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        item.tinh_trang_cuoi === 'Đã về kho' || item.tinh_trang_cuoi === 'Đã hoàn thành'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.tinh_trang_cuoi === 'Đang thông quan'
                          ? 'bg-indigo-100 text-indigo-800'
                          : item.tinh_trang_cuoi === 'Đang vận chuyển'
                          ? 'bg-cyan-100 text-cyan-800'
                          : item.tinh_trang_cuoi === 'Đang sản xuất'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.tinh_trang_cuoi}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => {
                          setTrackingOrder(item);
                          setIsTrackingModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Xem Stepper
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsDrawerOpen(true);
                          }}
                          title="Sửa PO"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <button
                            onClick={() => handleDelete(item._sheetRow, item.ma_po)}
                            title="Xóa PO"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination - Fixed pageSize & onPageSizeChange props */}
        <div className="p-3 border-t border-slate-100">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredList.length}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setItemsPerPage}
          />
        </div>
      </div>

      {/* Drawer */}
      <XnkDonHangDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        editItem={selectedItem}
        sampleList={sampleList}
        onSaved={() => fetchModule('xnk_donhang', true)}
      />

      {/* Stepper Tracking Modal */}
      <XnkTrackingModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        order={trackingOrder}
      />
    </div>
  );
}

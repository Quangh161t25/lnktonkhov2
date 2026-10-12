import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { XnkHeaderNav } from './XnkHeaderNav';
import { XnkYtuongDrawer } from './XnkYtuongDrawer';
import { Pagination } from '../../common/Pagination';
import { exportToExcel } from '../../../services/excelService';
import { 
  formatDateVN, 
  matchesSearch 
} from '../../../utils/formatters';
import { 
  Lightbulb, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Package, 
  CheckCircle2, 
  XCircle,
  PackagePlus
} from 'lucide-react';

export function XnkYtuongModule({ onNavigate }) {
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

  // Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchModule('xnk_ytuong');
  }, [fetchModule]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

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

  // Filtered
  const filteredList = useMemo(() => {
    return ytuongList.filter(item => {
      if (statusFilter !== 'ALL' && item.trang_thai !== statusFilter) return false;
      if (searchTerm) {
        const match = 
          matchesSearch(item.id_y_tuong, searchTerm) ||
          matchesSearch(item.ten_sp, searchTerm) ||
          matchesSearch(item.sku_du_kien, searchTerm) ||
          matchesSearch(item.nguoi_tao, searchTerm);
        if (!match) return false;
      }
      return true;
    });
  }, [ytuongList, statusFilter, searchTerm]);

  // Paginated
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  const handleExportExcel = () => {
    const headers = ['Mã ý tưởng', 'Ngày tạo', 'Người tạo', 'SKU dự kiến', 'Tên SP', 'Mô tả', 'Link tham khảo', 'Trạng thái', 'Người duyệt', 'Ghi chú'];
    const rows = filteredList.map(y => [
      y.id_y_tuong, y.ngay_tao, y.nguoi_tao, y.sku_du_kien, y.ten_sp, y.mo_ta, y.link_tham_khao, y.trang_thai, y.nguoi_duyet, y.ghi_chu
    ]);
    exportToExcel([headers, ...rows], 'XNK_Y_TUONG.xlsx', 'Y_TUONG');
  };

  const handleDelete = async (sheetRow, tenSp) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ý tưởng [${tenSp}]?`)) return;
    try {
      await deleteRow('xnk_ytuong', sheetRow);
    } catch (err) {
      console.error('Lỗi xóa:', err);
      alert('Không thể xóa dòng dữ liệu. Vui lòng thử lại!');
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Header Nav */}
      <XnkHeaderNav
        activeKey="xnk_ytuong"
        onNavigate={onNavigate}
        onRefresh={() => fetchModule('xnk_ytuong', true)}
        onExportExcel={handleExportExcel}
        onAddNew={canManage ? () => { setSelectedItem(null); setIsDrawerOpen(true); } : null}
        addButtonLabel="Thêm Ý Tưởng Mới"
        isLoading={loadingModules.xnk_ytuong}
        counts={{
          ytuong: ytuongList.length,
          mau: (xnkMauData?.length > 1 ? xnkMauData.length - 1 : 0),
          donhang: (xnkDonHangData?.length > 1 ? xnkDonHangData.length - 1 : 0)
        }}
      />

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500">Tổng số ý tưởng</span>
          <div className="text-lg font-bold text-slate-800 mt-0.5">{ytuongList.length}</div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-600">Đang thảo luận</span>
          <div className="text-lg font-bold text-amber-600 mt-0.5">
            {ytuongList.filter(i => i.trang_thai === 'Đang thảo luận' || i.trang_thai === 'Mới tạo').length}
          </div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600">Ý tưởng đã duyệt</span>
          <div className="text-lg font-bold text-emerald-600 mt-0.5">
            {ytuongList.filter(i => i.trang_thai === 'Đã duyệt').length}
          </div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-600">Từ chối</span>
          <div className="text-lg font-bold text-rose-600 mt-0.5">
            {ytuongList.filter(i => i.trang_thai === 'Từ chối').length}
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm SKU, tên SP, người tạo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 whitespace-nowrap">
            <Filter className="w-3.5 h-3.5" /> Lọc trạng thái:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Mới tạo">Mới tạo</option>
            <option value="Đang thảo luận">Đang thảo luận</option>
            <option value="Đã duyệt">Đã duyệt</option>
            <option value="Từ chối">Từ chối</option>
          </select>
        </div>
      </div>

      {/* 4. Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                <th className="py-2.5 px-3 whitespace-nowrap">Mã ý tưởng</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Ngày tạo</th>
                <th className="py-2.5 px-3 whitespace-nowrap">SKU dự kiến</th>
                <th className="py-2.5 px-3 min-w-[200px]">Tên sản phẩm ý tưởng</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Người đề xuất</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Trạng thái</th>
                <th className="py-2.5 px-3 min-w-[150px]">Link tham khảo</th>
                <th className="py-2.5 px-3 min-w-[180px]">Mô tả & Ghi chú</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Không tìm thấy ý tưởng sản phẩm nào
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => (
                  <tr key={item.id_y_tuong} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-semibold text-blue-700 whitespace-nowrap">
                      {item.id_y_tuong}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {formatDateVN(item.ngay_tao)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      {item.sku_du_kien || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {item.ten_sp}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {item.nguoi_tao}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        item.trang_thai === 'Đã duyệt'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.trang_thai === 'Từ chối'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.trang_thai}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {item.link_tham_khao ? (
                        <a
                          href={item.link_tham_khao.startsWith('http') ? item.link_tham_khao : `https://${item.link_tham_khao}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-semibold truncate max-w-[160px]"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          Xem link gốc
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Không có</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div className="line-clamp-2" title={`${item.mo_ta} ${item.ghi_chu}`}>
                        {item.mo_ta || item.ghi_chu || '-'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {item.trang_thai === 'Đã duyệt' && (
                          <button
                            onClick={() => onNavigate('xnk_mau')}
                            title="Chuyển sang module Đặt mẫu thử"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          >
                            <PackagePlus className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsDrawerOpen(true);
                          }}
                          title="Sửa ý tưởng"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <button
                            onClick={() => handleDelete(item._sheetRow, item.ten_sp)}
                            title="Xóa ý tưởng"
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
      <XnkYtuongDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        editItem={selectedItem}
        onSaved={() => fetchModule('xnk_ytuong', true)}
        onCreateSampleFromIdea={() => onNavigate('xnk_mau')}
      />
    </div>
  );
}

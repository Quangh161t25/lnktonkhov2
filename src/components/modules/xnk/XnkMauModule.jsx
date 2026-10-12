import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { XnkHeaderNav } from './XnkHeaderNav';
import { XnkMauDrawer } from './XnkMauDrawer';
import { Pagination } from '../../common/Pagination';
import { exportToExcel } from '../../../services/excelService';
import { 
  formatDateVN, 
  formatCurrency, 
  cleanNumber, 
  matchesSearch 
} from '../../../utils/formatters';
import { 
  PackageSearch, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  ShoppingCart, 
  Building2,
  Phone
} from 'lucide-react';

export function XnkMauModule({ onNavigate }) {
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
    fetchModule('xnk_mau');
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
      sku_du_kien: r[3] || '',
      ten_sp: r[4] || '',
      trang_thai: r[7] || 'Mới tạo'
    })).filter(i => i.id_y_tuong);
  }, [xnkYtuongData]);

  const ytuongMap = useMemo(() => {
    const map = {};
    ytuongList.forEach(y => { map[y.id_y_tuong] = y; });
    return map;
  }, [ytuongList]);

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

  // Filtered
  const filteredList = useMemo(() => {
    return mauList.filter(item => {
      if (statusFilter !== 'ALL' && item.trang_thai_duyet !== statusFilter && item.danh_gia_xep_hang !== statusFilter) return false;
      if (searchTerm) {
        const relatedIdea = ytuongMap[item.id_y_tuong];
        const match = 
          matchesSearch(item.id_mau, searchTerm) ||
          matchesSearch(item.ten_ncc, searchTerm) ||
          matchesSearch(item.id_y_tuong, searchTerm) ||
          (relatedIdea && matchesSearch(relatedIdea.ten_sp, searchTerm)) ||
          (relatedIdea && matchesSearch(relatedIdea.sku_du_kien, searchTerm));
        if (!match) return false;
      }
      return true;
    });
  }, [mauList, ytuongMap, statusFilter, searchTerm]);

  // Paginated
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  const handleExportExcel = () => {
    const headers = ['Mã mẫu', 'Mã ý tưởng', 'Tên NCC', 'Liên hệ NCC', 'Giá mẫu', 'Ngày đặt', 'Ngày nhận', 'Link ảnh', 'Đánh giá cải tiến', 'Xếp hạng', 'Trạng thái duyệt', 'Ghi chú'];
    const rows = filteredList.map(m => [
      m.id_mau, m.id_y_tuong, m.ten_ncc, m.lien_he_ncc, m.gia_mau, m.ngay_dat_mau, m.ngay_nhan_mau, m.link_anh_mau, m.danh_gia_cai_tien, m.danh_gia_xep_hang, m.trang_thai_duyet, m.ghi_chu
    ]);
    exportToExcel([headers, ...rows], 'XNK_MAU_THU.xlsx', 'MAU_THU');
  };

  const handleDelete = async (sheetRow, idMau) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mẫu thử [${idMau}]?`)) return;
    try {
      await deleteRow('xnk_mau', sheetRow);
    } catch (err) {
      console.error('Lỗi xóa:', err);
      alert('Không thể xóa dòng dữ liệu. Vui lòng thử lại!');
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Header Nav */}
      <XnkHeaderNav
        activeKey="xnk_mau"
        onNavigate={onNavigate}
        onRefresh={() => fetchModule('xnk_mau', true)}
        onExportExcel={handleExportExcel}
        onAddNew={canManage ? () => { setSelectedItem(null); setIsDrawerOpen(true); } : null}
        addButtonLabel="Đặt Hàng Mẫu Mới"
        isLoading={loadingModules.xnk_mau}
        counts={{
          ytuong: (xnkYtuongData?.length > 1 ? xnkYtuongData.length - 1 : 0),
          mau: mauList.length,
          donhang: (xnkDonHangData?.length > 1 ? xnkDonHangData.length - 1 : 0)
        }}
      />

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500">Tổng mẫu đã đặt</span>
          <div className="text-lg font-bold text-slate-800 mt-0.5">{mauList.length}</div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-600">Chờ Sếp duyệt</span>
          <div className="text-lg font-bold text-amber-600 mt-0.5">
            {mauList.filter(m => m.trang_thai_duyet === 'Chờ duyệt').length}
          </div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600">Mẫu ĐẠT (Cho phép đặt)</span>
          <div className="text-lg font-bold text-emerald-600 mt-0.5">
            {mauList.filter(m => m.trang_thai_duyet === 'Đã duyệt (Cho phép đặt thật)' || m.danh_gia_xep_hang === 'Đạt').length}
          </div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-600">Không đạt / Cần sửa</span>
          <div className="text-lg font-bold text-rose-600 mt-0.5">
            {mauList.filter(m => m.danh_gia_xep_hang === 'Không đạt' || m.danh_gia_xep_hang === 'Cần cải tiến thêm').length}
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm mã mẫu, tên NCC, SP..."
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
            <option value="Chờ duyệt">Chờ duyệt</option>
            <option value="Đã duyệt (Cho phép đặt thật)">Đã duyệt</option>
            <option value="Đạt">Xếp hạng: Đạt</option>
            <option value="Cần cải tiến thêm">Xếp hạng: Cần cải tiến</option>
            <option value="Không đạt">Xếp hạng: Không đạt</option>
          </select>
        </div>
      </div>

      {/* 4. Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                <th className="py-2.5 px-3 whitespace-nowrap">Mã mẫu</th>
                <th className="py-2.5 px-3 min-w-[160px]">Sản phẩm & Ý tưởng</th>
                <th className="py-2.5 px-3 min-w-[150px]">Nhà cung cấp / Xưởng</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Giá mẫu</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Ngày đặt / Nhận</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Ảnh mẫu thực tế</th>
                <th className="py-2.5 px-3 min-w-[180px]">Đánh giá cải tiến</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Xếp hạng</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Sếp duyệt</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Không tìm thấy dữ liệu đặt hàng mẫu nào
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => {
                  const relatedIdea = ytuongMap[item.id_y_tuong];
                  const isApproved = item.trang_thai_duyet === 'Đã duyệt (Cho phép đặt thật)' || item.danh_gia_xep_hang === 'Đạt';

                  return (
                    <tr key={item.id_mau} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 font-semibold text-blue-700 whitespace-nowrap">
                        {item.id_mau}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">
                          {relatedIdea?.ten_sp || 'Chưa liên kết'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          SKU: {relatedIdea?.sku_du_kien || item.id_y_tuong || '-'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{item.ten_ncc}</div>
                        {item.lien_he_ncc && (
                          <div className="text-[11px] text-slate-500">{item.lien_he_ncc}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-700 whitespace-nowrap">
                        {item.gia_mau ? formatCurrency(item.gia_mau) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        <div>Đặt: {item.ngay_dat_mau ? formatDateVN(item.ngay_dat_mau) : '-'}</div>
                        <div className="text-[11px] text-slate-500">
                          Nhận: {item.ngay_nhan_mau ? formatDateVN(item.ngay_nhan_mau) : 'Chưa nhận'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.link_anh_mau ? (
                          <a 
                            href={item.link_anh_mau} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-block p-1 bg-slate-100 rounded-lg hover:ring-2 hover:ring-blue-400 transition"
                          >
                            <img
                              src={item.link_anh_mau}
                              alt="Mẫu"
                              className="w-10 h-10 object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        <div className="line-clamp-2" title={item.danh_gia_cai_tien}>
                          {item.danh_gia_cai_tien || '-'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          item.danh_gia_xep_hang === 'Đạt'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.danh_gia_xep_hang === 'Không đạt'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.danh_gia_xep_hang}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          item.trang_thai_duyet === 'Đã duyệt (Cho phép đặt thật)'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.trang_thai_duyet === 'Từ chối'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.trang_thai_duyet}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {isApproved && (
                            <button
                              onClick={() => onNavigate('xnk_donhang')}
                              title="Tạo đơn PO từ mẫu đạt này"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            >
                              <ShoppingCart className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setIsDrawerOpen(true);
                            }}
                            title="Sửa mẫu"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {canManage && (
                            <button
                              onClick={() => handleDelete(item._sheetRow, item.id_mau)}
                              title="Xóa mẫu"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
      <XnkMauDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        editItem={selectedItem}
        ytuongList={ytuongList}
        onSaved={() => fetchModule('xnk_mau', true)}
        onCreateOrderFromSample={() => onNavigate('xnk_donhang')}
      />
    </div>
  );
}

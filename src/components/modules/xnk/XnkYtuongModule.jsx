import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { XnkYtuongDrawer } from './XnkYtuongDrawer';
import { XnkChiTietModal } from './XnkChiTietModal';
import { ColumnManagerModal } from '../../common/ColumnManagerModal';
import { useColumnManager } from '../../../hooks/useColumnManager';
import { Pagination } from '../../common/Pagination';
import { exportToExcel } from '../../../services/excelService';
import { 
  formatDateVN, 
  matchesSearch 
} from '../../../utils/formatters';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Plus, 
  RotateCw, 
  Download, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  PackagePlus,
  List,
  BarChart3,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  SlidersHorizontal
} from 'lucide-react';

const DEFAULT_XNK_YTUONG_COLUMNS = [
  { key: 'select', label: 'Chọn', width: 45, align: 'center', format: 'default' },
  { key: 'id_y_tuong', label: 'Mã ý tưởng', width: 110, align: 'left', format: 'badge' },
  { key: 'ngay_tao', label: 'Ngày đề xuất', width: 110, align: 'left', format: 'date' },
  { key: 'sku_du_kien', label: 'SKU dự kiến', width: 120, align: 'left', format: 'bold' },
  { key: 'ten_sp', label: 'Tên sản phẩm', width: 220, align: 'left', format: 'default' },
  { key: 'nguoi_tao', label: 'Người đề xuất', width: 130, align: 'left', format: 'default' },
  { key: 'trang_thai', label: 'Trạng thái', width: 130, align: 'center', format: 'badge' },
  { key: 'link_tham_khao', label: 'Link gốc', width: 150, align: 'left', format: 'default' },
  { key: 'mo_ta', label: 'Mô tả & Ghi chú', width: 220, align: 'left', format: 'default' },
  { key: 'actions', label: 'Thao tác', width: 90, align: 'center', format: 'default' }
];

export function XnkYtuongModule({ onNavigate }) {
  const { 
    xnkYtuongData, 
    fetchModule, 
    deleteRow,
    loadingModules 
  } = useData();

  const { currentUser, hasActionPermission } = useAuth();
  const canManage = hasActionPermission('xnk.manage') || currentUser?.role === 'ADMIN';

  // Sub-tabs matching Screenshot 2: [Danh sách] vs [Thống kê]
  const [activeSubTab, setActiveSubTab] = useState('LIST'); // 'LIST' | 'STATS'

  // Column Manager Hook
  const {
    columns,
    visibleColumns,
    isConfigModalOpen,
    openConfigModal,
    closeConfigModal,
    toggleVisibility,
    updateColumnProp,
    moveColumn,
    resetToDefault
  } = useColumnManager('xnk_ytuong', DEFAULT_XNK_YTUONG_COLUMNS);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [authorFilter, setAuthorFilter] = useState('ALL');

  // Selected checkbox rows
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Drawer & Detail Modal
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchModule('xnk_ytuong');
    fetchModule('sanpham');
  }, [fetchModule]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, authorFilter]);

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

  // Distinct authors list for filter dropdown
  const authorOptions = useMemo(() => {
    const set = new Set();
    ytuongList.forEach(item => {
      if (item.nguoi_tao) set.add(item.nguoi_tao);
    });
    return Array.from(set);
  }, [ytuongList]);

  // Filtered
  const filteredList = useMemo(() => {
    return ytuongList.filter(item => {
      if (statusFilter !== 'ALL' && item.trang_thai !== statusFilter) return false;
      if (authorFilter !== 'ALL' && item.nguoi_tao !== authorFilter) return false;
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
  }, [ytuongList, statusFilter, authorFilter, searchTerm]);

  // Paginated
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedList.map(i => i.id_y_tuong));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

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
      {/* 1. Sub-Tabs Header (matching Screenshot 2: [Danh sách] vs [Thống kê]) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSubTab('LIST')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'LIST'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Danh sách</span>
          </button>

          <button
            onClick={() => setActiveSubTab('STATS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'STATS'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Thống kê</span>
          </button>
        </div>

        <div className="text-xs font-medium text-slate-500">
          Tổng cộng: <strong className="text-slate-800">{filteredList.length}</strong> ý tưởng
        </div>
      </div>

      {/* 2. Control Toolbar (matching Screenshot 2: [Quay lại], Search, Filters, Actions) */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút Quay lại về Hub XNK */}
          <button
            onClick={() => onNavigate('xnk')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            title="Quay lại Hub Xuất Nhập Khẩu"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Quay lại</span>
          </button>

          {/* Ô tìm kiếm */}
          <div className="relative w-48 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm . . ."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Filter 1: Trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">🏷️ Trạng thái (Tất cả)</option>
            <option value="Mới tạo">Mới tạo</option>
            <option value="Đang thảo luận">Đang thảo luận</option>
            <option value="Đã duyệt">Đã duyệt</option>
            <option value="Từ chối">Từ chối</option>
          </select>

          {/* Filter 2: Người đề xuất */}
          <select
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">👤 Người đề xuất (Tất cả)</option>
            {authorOptions.map(author => (
              <option key={author} value={author}>{author}</option>
            ))}
          </select>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchModule('xnk_ytuong', true)}
            disabled={loadingModules.xnk_ytuong}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RotateCw className={`w-4 h-4 ${loadingModules.xnk_ytuong ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          {/* Nút Tùy chỉnh Cột */}
          <button
            type="button"
            onClick={openConfigModal}
            className="px-2.5 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Tùy chỉnh cột hiển thị"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            <span>Cột</span>
          </button>

          {canManage && (
            <button
              onClick={() => { setSelectedItem(null); setIsDrawerOpen(true); }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm mới</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Content View: Thống kê vs Danh sách */}
      {activeSubTab === 'STATS' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-xs text-slate-500 font-semibold">Tổng số ý tưởng</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{ytuongList.length}</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <span className="text-xs text-amber-600 font-semibold">Đang thảo luận</span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {ytuongList.filter(i => i.trang_thai === 'Đang thảo luận' || i.trang_thai === 'Mới tạo').length}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <span className="text-xs text-emerald-600 font-semibold">Đã duyệt</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {ytuongList.filter(i => i.trang_thai === 'Đã duyệt').length}
            </div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl">
            <span className="text-xs text-rose-600 font-semibold">Từ chối</span>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {ytuongList.filter(i => i.trang_thai === 'Từ chối').length}
            </div>
          </div>
        </div>
      ) : (
        /* 4. Data Table (matching Screenshot 2: Checkbox, Badge ID, Clean columns) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 select-none">
                  {visibleColumns.map((col) => {
                    const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};
                    const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';

                    if (col.key === 'select') {
                      return (
                        <th key={col.key} style={widthStyle} className={`py-2.5 px-3 ${alignClass}`}>
                          <input
                            type="checkbox"
                            checked={paginatedList.length > 0 && selectedIds.length === paginatedList.length}
                            onChange={handleSelectAll}
                            className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                        </th>
                      );
                    }

                    return (
                      <th
                        key={col.key}
                        style={widthStyle}
                        className={`py-2.5 px-3 whitespace-nowrap ${alignClass}`}
                      >
                        {col.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length} className="py-8 text-center text-slate-400">
                      Không tìm thấy ý tưởng sản phẩm nào
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item) => {
                    const isSelected = selectedIds.includes(item.id_y_tuong);

                    return (
                      <tr 
                        key={item.id_y_tuong} 
                        onClick={() => {
                          setDetailItem(item);
                          setIsDetailOpen(true);
                        }}
                        className={`hover:bg-blue-50/60 transition cursor-pointer select-none ${isSelected ? 'bg-blue-50/40' : ''}`}
                        title="Bấm để xem chi tiết liên kết (Đơn hàng PO, Mẫu thử, Tiến độ)"
                      >
                        {visibleColumns.map((col) => {
                          const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};
                          const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                          let formatClass = '';
                          if (col.format === 'bold') formatClass = 'font-bold text-slate-800';
                          if (col.format === 'uppercase') formatClass = 'uppercase';

                          switch (col.key) {
                            case 'select':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 ${alignClass}`} onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelect(item.id_y_tuong)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                  />
                                </td>
                              );
                            case 'id_y_tuong':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 whitespace-nowrap ${alignClass}`}>
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px]">
                                    {item.id_y_tuong}
                                  </span>
                                </td>
                              );
                            case 'ngay_tao':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 text-slate-600 whitespace-nowrap ${alignClass} ${formatClass}`}>
                                  {formatDateVN(item.ngay_tao)}
                                </td>
                              );
                            case 'sku_du_kien':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap ${alignClass} ${formatClass}`}>
                                  {item.sku_du_kien || '-'}
                                </td>
                              );
                            case 'ten_sp':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 font-semibold text-slate-900 ${alignClass} ${formatClass}`}>
                                  {item.ten_sp}
                                </td>
                              );
                            case 'nguoi_tao':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 text-slate-600 whitespace-nowrap ${alignClass} ${formatClass}`}>
                                  {item.nguoi_tao}
                                </td>
                              );
                            case 'trang_thai':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 text-center whitespace-nowrap ${alignClass}`}>
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
                              );
                            case 'link_tham_khao':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 ${alignClass}`} onClick={(e) => e.stopPropagation()}>
                                  {item.link_tham_khao ? (
                                    <a
                                      href={item.link_tham_khao.startsWith('http') ? item.link_tham_khao : `https://${item.link_tham_khao}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-600 hover:underline flex items-center gap-1 font-semibold truncate max-w-[150px]"
                                    >
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                      Xem link gốc
                                    </a>
                                  ) : (
                                    <span className="text-slate-400 italic">Không có</span>
                                  )}
                                </td>
                              );
                            case 'mo_ta':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 text-slate-600 ${alignClass}`}>
                                  <div className="line-clamp-2" title={`${item.mo_ta} ${item.ghi_chu}`}>
                                    {item.mo_ta || item.ghi_chu || '-'}
                                  </div>
                                </td>
                              );
                            case 'actions':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 text-center whitespace-nowrap ${alignClass}`} onClick={(e) => e.stopPropagation()}>
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
                              );
                            default:
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 whitespace-nowrap ${alignClass}`}>
                                  {item[col.key] || '-'}
                                </td>
                              );
                          }
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 5. Pagination */}
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
      )}

      {/* Column Manager Modal */}
      <ColumnManagerModal
        isOpen={isConfigModalOpen}
        onClose={closeConfigModal}
        columns={columns}
        toggleVisibility={toggleVisibility}
        updateColumnProp={updateColumnProp}
        moveColumn={moveColumn}
        resetToDefault={resetToDefault}
        moduleTitle="Ý tưởng sản phẩm (Xuất Nhập Khẩu)"
      />

      {/* Drawer */}
      <XnkYtuongDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        editItem={selectedItem}
        onSaved={() => fetchModule('xnk_ytuong', true)}
        onCreateSampleFromIdea={() => onNavigate('xnk_mau')}
      />

      {/* Modal Xem chi tiết liên kết đa chiều (có các tab phía trên) */}
      <XnkChiTietModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        type="ytuong"
        item={detailItem}
        onOpenEditYtuong={(it) => {
          setSelectedItem(it);
          setIsDrawerOpen(true);
        }}
        onOpenCreateMau={() => onNavigate('xnk_mau')}
        onOpenCreatePo={() => onNavigate('xnk_donhang')}
      />
    </div>
  );
}

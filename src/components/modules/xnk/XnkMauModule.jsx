import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { XnkMauDrawer } from './XnkMauDrawer';
import { XnkChiTietModal } from './XnkChiTietModal';
import { ColumnManagerModal } from '../../common/ColumnManagerModal';
import { useColumnManager } from '../../../hooks/useColumnManager';
import { Pagination } from '../../common/Pagination';
import { exportToExcel } from '../../../services/excelService';
import { 
  formatDateVN, 
  formatCurrency, 
  cleanNumber, 
  matchesSearch,
  parseSimpleSheetDate 
} from '../../../utils/formatters';
import { 
  ArrowLeft, 
  ArrowUpDown,
  Search, 
  Filter, 
  Plus, 
  RotateCw, 
  Download, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  ShoppingCart, 
  List,
  BarChart3,
  PackageSearch,
  SlidersHorizontal
} from 'lucide-react';
import { buildPoLinesMap, poHasLine } from './xnkPoLines';

const DEFAULT_XNK_MAU_COLUMNS = [
  { key: 'select', label: 'Chọn', width: 45, align: 'center', format: 'default' },
  { key: 'id_mau', label: 'Mã mẫu', width: 110, align: 'left', format: 'badge' },
  { key: 'san_pham', label: 'Sản phẩm & Ý tưởng', width: 220, align: 'left', format: 'default' },
  { key: 'ten_ncc', label: 'Nhà cung cấp / Xưởng', width: 170, align: 'left', format: 'default' },
  { key: 'gia_mau', label: 'Giá mẫu', width: 110, align: 'right', format: 'currency' },
  { key: 'ngay_dat_nhan', label: 'Ngày đặt / Nhận', width: 130, align: 'left', format: 'date' },
  { key: 'link_anh_mau', label: 'Ảnh thực tế', width: 90, align: 'center', format: 'default' },
  { key: 'danh_gia_cai_tien', label: 'Đánh giá cải tiến', width: 200, align: 'left', format: 'default' },
  { key: 'danh_gia_xep_hang', label: 'Xếp hạng', width: 120, align: 'center', format: 'badge' },
  { key: 'trang_thai_duyet', label: 'Sếp duyệt', width: 130, align: 'center', format: 'badge' },
  { key: 'actions', label: 'Thao tác', width: 100, align: 'center', format: 'default' }
];

export function XnkMauModule({ onNavigate }) {
  const { 
    xnkYtuongData, 
    xnkMauData, 
    xnkDonHangData,
    xnkDonHangCtData,
    fetchModule, 
    deleteRow,
    loadingModules 
  } = useData();

  const { currentUser, hasActionPermission } = useAuth();
  const canManage = hasActionPermission('xnk.manage') || currentUser?.role === 'ADMIN';

  // Sub-tabs: [Danh sách] vs [Thống kê]
  const [activeSubTab, setActiveSubTab] = useState('LIST');

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
  } = useColumnManager('xnk_mau', DEFAULT_XNK_MAU_COLUMNS);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [nccFilter, setNccFilter] = useState('ALL');
  const [sortDateOrder, setSortDateOrder] = useState('desc'); // 'desc' | 'asc'

  // Checkbox row selection
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
    fetchModule('xnk_mau');
    fetchModule('xnk_ytuong');
    fetchModule('xnk_donhang');
    fetchModule('sanpham');
  }, [fetchModule]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, nccFilter]);

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
      danh_gia_xep_hang: r[9] || '',
      trang_thai_duyet: r[10] || 'Chờ duyệt',
      ghi_chu: r[11] || ''
    })).filter(i => i.id_mau || i.ten_ncc);
  }, [xnkMauData]);

  // Parsed Đơn hàng PO để kiểm tra liên kết
  const donHangList = useMemo(() => {
    if (!xnkDonHangData || xnkDonHangData.length <= 1) return [];
    return xnkDonHangData.slice(1).map((r, idx) => ({
      _sheetRow: idx + 2,
      ma_po: (r[0] || '').toString().trim(),
      id_mau: (r[1] || '').toString().trim(),
      sku: (r[2] || '').toString().trim(),
      ten_sp: (r[3] || '').toString().trim(),
      ten_ncc: (r[4] || '').toString().trim()
    })).filter(o => o.ma_po || o.ten_sp);
  }, [xnkDonHangData]);

  // Chi tiết SP của từng PO (1 PO có thể nhiều SP / nhiều ý tưởng / nhiều mẫu)
  const poLinesMap = useMemo(() => buildPoLinesMap(xnkDonHangCtData), [xnkDonHangCtData]);

  // Bản đồ các đơn hàng PO đã liên kết với từng mẫu thử (để khóa không cho xóa khi đã lên đơn hàng PO)
  const sampleLinkedOrdersMap = useMemo(() => {
    const map = {};
    if (!mauList.length || !donHangList.length) return map;

    mauList.forEach(sample => {
      const sampleId = (sample.id_mau || '').trim().toLowerCase();
      const relatedIdea = ytuongMap[sample.id_y_tuong];
      const ideaSku = (relatedIdea?.sku_du_kien || '').trim().toLowerCase();
      const ideaName = (relatedIdea?.ten_sp || '').trim().toLowerCase();

      const linked = donHangList.filter(order => poHasLine(order, poLinesMap, o => {
        const oMau = (o.id_mau || '').trim().toLowerCase();
        const oSku = (o.sku || '').trim().toLowerCase();
        const oName = (o.ten_sp || '').trim().toLowerCase();

        // 1. Khớp trực tiếp mã mẫu
        if (sampleId && oMau && oMau === sampleId) return true;
        // 2. Đơn PO không điền id_mau nhưng khớp SKU / Tên SP của ý tưởng liên kết
        if (!oMau && ideaSku && oSku === ideaSku) return true;
        if (!oMau && ideaName && oName === ideaName) return true;
        return false;
      }));

      map[sample.id_mau || sample._sheetRow] = linked;
    });

    return map;
  }, [mauList, donHangList, ytuongMap, poLinesMap]);

  // Distinct NCC options
  const nccOptions = useMemo(() => {
    const set = new Set();
    mauList.forEach(item => {
      if (item.ten_ncc) set.add(item.ten_ncc);
    });
    return Array.from(set);
  }, [mauList]);

  // Filtered
  const filteredList = useMemo(() => {
    return mauList.filter(item => {
      if (statusFilter !== 'ALL' && item.trang_thai_duyet !== statusFilter && item.danh_gia_xep_hang !== statusFilter) return false;
      if (nccFilter !== 'ALL' && item.ten_ncc !== nccFilter) return false;
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
    }).sort((a, b) => {
      const timeA = parseSimpleSheetDate(a.ngay_dat_mau || a.ngay_nhan_mau).getTime() || 0;
      const timeB = parseSimpleSheetDate(b.ngay_dat_mau || b.ngay_nhan_mau).getTime() || 0;
      return sortDateOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [mauList, ytuongMap, statusFilter, nccFilter, searchTerm, sortDateOrder]);

  // Paginated
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedList.map(i => i.id_mau));
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
    const headers = ['Mã mẫu', 'Mã ý tưởng', 'Tên NCC', 'Liên hệ NCC', 'Giá mẫu', 'Ngày đặt', 'Ngày nhận', 'Link ảnh', 'Đánh giá cải tiến', 'Xếp hạng', 'Trạng thái duyệt', 'Ghi chú'];
    const rows = filteredList.map(m => [
      m.id_mau, m.id_y_tuong, m.ten_ncc, m.lien_he_ncc, m.gia_mau, m.ngay_dat_mau, m.ngay_nhan_mau, m.link_anh_mau, m.danh_gia_cai_tien, m.danh_gia_xep_hang, m.trang_thai_duyet, m.ghi_chu
    ]);
    exportToExcel([headers, ...rows], 'XNK_MAU_THU.xlsx', 'MAU_THU');
  };

  const handleDelete = async (item) => {
    const linked = sampleLinkedOrdersMap[item.id_mau || item._sheetRow] || [];
    if (linked.length > 0) {
      const poCodes = linked.map(o => o.ma_po).filter(Boolean).join(', ') || 'đơn hàng PO';
      alert(`Không thể xóa mẫu thử [${item.id_mau}] vì đã được lên đơn hàng PO (${poCodes}). Vui lòng xóa đơn hàng PO trước nếu muốn xóa mẫu này!`);
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mẫu thử [${item.id_mau}]?`)) return;
    try {
      await deleteRow('xnk_mau', item._sheetRow);
    } catch (err) {
      console.error('Lỗi xóa:', err);
      alert('Không thể xóa dòng dữ liệu. Vui lòng thử lại!');
    }
  };

  return (
    <div className="space-y-3 flex-1 flex flex-col min-h-full">
      {/* 1. Sub-Tabs Header (matching Screenshot 2: [Danh sách] vs [Thống kê]) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
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
          Tổng cộng: <strong className="text-slate-800">{filteredList.length}</strong> mẫu thử
        </div>
      </div>

      {/* 2. Control Toolbar (matching Screenshot 2) */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 shrink-0">
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

          {/* Filter 1: Trạng thái / Xếp hạng */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">🏷️ Trạng thái duyệt / Xếp hạng</option>
            <option value="Chờ duyệt">Chờ duyệt</option>
            <option value="Đã duyệt (Cho phép đặt thật)">Đã duyệt</option>
            <option value="Đạt">Xếp hạng: Đạt</option>
            <option value="Cần cải tiến thêm">Xếp hạng: Cần cải tiến</option>
            <option value="Không đạt">Xếp hạng: Không đạt</option>
          </select>

          {/* Filter 2: Nhà cung cấp */}
          <select
            value={nccFilter}
            onChange={(e) => setNccFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">🏢 Nhà cung cấp (Tất cả)</option>
            {nccOptions.map(ncc => (
              <option key={ncc} value={ncc}>{ncc}</option>
            ))}
          </select>

          {/* Nút đổi sắp xếp theo Ngày */}
          <button
            type="button"
            onClick={() => setSortDateOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              sortDateOrder === 'desc'
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                : 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs'
            }`}
            title="Nhấp để đổi thứ tự sắp xếp theo ngày (Lớn ➔ Nhỏ hoặc Nhỏ ➔ Lớn)"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Ngày: {sortDateOrder === 'desc' ? 'Mới ➔ Cũ' : 'Cũ ➔ Mới'}</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchModule('xnk_mau', true)}
            disabled={loadingModules.xnk_mau}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RotateCw className={`w-4 h-4 ${loadingModules.xnk_mau ? 'animate-spin' : ''}`} />
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
              <span>Đặt mẫu mới</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Content View */}
      {activeSubTab === 'STATS' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-xs text-slate-500 font-semibold">Tổng mẫu đã đặt</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{mauList.length}</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <span className="text-xs text-amber-600 font-semibold">Chờ Sếp duyệt</span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {mauList.filter(m => m.trang_thai_duyet === 'Chờ duyệt').length}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <span className="text-xs text-emerald-600 font-semibold">Mẫu ĐẠT</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {mauList.filter(m => m.trang_thai_duyet === 'Đã duyệt (Cho phép đặt thật)' || m.danh_gia_xep_hang === 'Đạt').length}
            </div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl">
            <span className="text-xs text-rose-600 font-semibold">Không đạt / Cần sửa</span>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {mauList.filter(m => m.danh_gia_xep_hang === 'Không đạt' || m.danh_gia_xep_hang === 'Cần cải tiến thêm').length}
            </div>
          </div>
        </div>
      ) : (
        /* 4. Data Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col justify-between min-h-[calc(100vh-280px)]">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/90 shadow-2xs">
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

                    if (col.key === 'ngay_dat_mau') {
                      return (
                        <th
                          key={col.key}
                          style={widthStyle}
                          onClick={() => setSortDateOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                          className={`py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition select-none ${alignClass}`}
                          title="Nhấp để đổi thứ tự sắp xếp theo ngày"
                        >
                          <div className="flex items-center gap-1 text-slate-800">
                            <span>{col.label}</span>
                            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                          </div>
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
                      Không tìm thấy dữ liệu đặt hàng mẫu nào
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item) => {
                    const relatedIdea = ytuongMap[item.id_y_tuong];
                    const isApproved = item.trang_thai_duyet === 'Đã duyệt (Cho phép đặt thật)' || item.danh_gia_xep_hang === 'Đạt';
                    const isSelected = selectedIds.includes(item.id_mau);

                    return (
                      <tr 
                        key={item.id_mau} 
                        onClick={() => {
                          setDetailItem(item);
                          setIsDetailOpen(true);
                        }}
                        className={`hover:bg-slate-50/70 transition cursor-pointer ${isSelected ? 'bg-blue-50/40' : ''}`}
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
                                    onChange={() => handleToggleSelect(item.id_mau)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                  />
                                </td>
                              );
                            case 'id_mau':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 whitespace-nowrap ${alignClass}`}>
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px]">
                                    {item.id_mau}
                                  </span>
                                </td>
                              );
                            case 'san_pham':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 ${alignClass}`}>
                                  <div className="font-bold text-slate-900">
                                    {relatedIdea?.ten_sp || 'Chưa liên kết'}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    SKU: {relatedIdea?.sku_du_kien || item.id_y_tuong || '-'}
                                  </div>
                                </td>
                              );
                            case 'ten_ncc':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 ${alignClass}`}>
                                  <div className="font-semibold text-slate-800">{item.ten_ncc}</div>
                                  {item.lien_he_ncc && (
                                    <div className="text-[11px] text-slate-500">{item.lien_he_ncc}</div>
                                  )}
                                </td>
                              );
                            case 'gia_mau':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 text-right font-bold text-slate-700 whitespace-nowrap ${alignClass} ${formatClass}`}>
                                  {item.gia_mau ? formatCurrency(item.gia_mau) : '-'}
                                </td>
                              );
                            case 'ngay_dat_nhan':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 text-slate-600 whitespace-nowrap ${alignClass} ${formatClass}`}>
                                  <div>Đặt: {item.ngay_dat_mau ? formatDateVN(item.ngay_dat_mau) : '-'}</div>
                                  <div className="text-[11px] text-slate-500">
                                    Nhận: {item.ngay_nhan_mau ? formatDateVN(item.ngay_nhan_mau) : 'Chưa nhận'}
                                  </div>
                                </td>
                              );
                            case 'link_anh_mau':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 ${alignClass}`} onClick={(e) => e.stopPropagation()}>
                                  {item.link_anh_mau ? (
                                    <a 
                                      href={item.link_anh_mau} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="inline-block p-0.5 bg-slate-100 rounded-lg hover:ring-2 hover:ring-blue-400 transition"
                                    >
                                      <img
                                        src={item.link_anh_mau}
                                        alt="Mẫu"
                                        className="w-9 h-9 object-cover rounded"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    </a>
                                  ) : (
                                    <span className="text-slate-400 italic">Chưa có</span>
                                  )}
                                </td>
                              );
                            case 'danh_gia_cai_tien':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 text-slate-700 ${alignClass}`}>
                                  <div className="line-clamp-2" title={item.danh_gia_cai_tien}>
                                    {item.danh_gia_cai_tien || '-'}
                                  </div>
                                </td>
                              );
                            case 'danh_gia_xep_hang':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 whitespace-nowrap ${alignClass}`}>
                                  {item.danh_gia_xep_hang === 'Đạt' ? (
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                      Đạt
                                    </span>
                                  ) : item.danh_gia_xep_hang === 'Không đạt' ? (
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                      Không đạt
                                    </span>
                                  ) : item.danh_gia_xep_hang === 'Cần cải tiến thêm' ? (
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                      Cần cải tiến
                                    </span>
                                  ) : (
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                                      Chưa đánh giá
                                    </span>
                                  )}
                                </td>
                              );
                            case 'trang_thai_duyet':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 whitespace-nowrap ${alignClass}`}>
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
                              );
                            case 'actions':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-2.5 px-3 whitespace-nowrap ${alignClass}`} onClick={(e) => e.stopPropagation()}>
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
                                    {canManage && (() => {
                                      const linkedOrders = sampleLinkedOrdersMap[item.id_mau || item._sheetRow] || [];
                                      const hasLinkedPo = linkedOrders.length > 0;
                                      const poCodes = linkedOrders.map(o => o.ma_po).filter(Boolean).join(', ');

                                      return hasLinkedPo ? (
                                        <button
                                          type="button"
                                          disabled
                                          title={`Không thể xóa: Mẫu thử này đã được lên đơn hàng PO (${poCodes || 'đơn hàng PO'})`}
                                          className="p-1.5 text-slate-300 rounded-lg cursor-not-allowed opacity-45"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleDelete(item)}
                                          title="Xóa mẫu"
                                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      );
                                    })()}
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
          <div className="p-3 border-t border-slate-100 bg-white mt-auto shrink-0">
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
        moduleTitle="Đặt mẫu & Đánh giá mẫu (Xuất Nhập Khẩu)"
      />

      {/* Drawer */}
      <XnkMauDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        editItem={selectedItem}
        ytuongList={ytuongList}
        onSaved={() => fetchModule('xnk_mau', true)}
        onCreateOrderFromSample={() => onNavigate('xnk_donhang')}
      />

      {/* Cross-lifecycle Detail Modal */}
      <XnkChiTietModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        type="mau"
        item={detailItem}
        onOpenEditMau={(mau) => {
          setSelectedItem(mau);
          setIsDrawerOpen(true);
        }}
        onOpenEditYtuong={() => onNavigate && onNavigate('xnk_ytuong')}
        onOpenEditPo={() => onNavigate && onNavigate('xnk_donhang')}
        onOpenEditTracking={() => onNavigate && onNavigate('xnk_donhang')}
        onOpenCreatePo={() => onNavigate('xnk_donhang')}
        onNavigate={onNavigate}
      />
    </div>
  );
}

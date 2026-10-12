import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { Pagination } from '../../common/Pagination';
import { XnkNccDrawer } from './XnkNccDrawer';
import { XnkChiTietModal } from './XnkChiTietModal';
import { ExcelUploadModal } from '../../common/ExcelUploadModal';
import { ColumnManagerModal } from '../../common/ColumnManagerModal';
import { useColumnManager } from '../../../hooks/useColumnManager';
import { exportToExcel, downloadModuleTemplate } from '../../../services/excelService';
import { 
  formatCurrency, 
  formatNumber, 
  cleanNumber, 
  matchesSearch 
} from '../../../utils/formatters';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  RotateCw, 
  Download, 
  Building2, 
  List, 
  BarChart3, 
  Phone, 
  ShoppingCart, 
  PackageSearch,
  Plus,
  Upload,
  FileSpreadsheet,
  Edit3,
  Trash2,
  CheckCircle2,
  Award,
  TrendingUp,
  Tag,
  SlidersHorizontal
} from 'lucide-react';

const DEFAULT_XNK_NCC_COLUMNS = [
  { key: 'id', label: 'Mã NCC', width: 110, align: 'left', format: 'bold' },
  { key: 'name', label: 'Tên Nhà Cung Cấp / Xưởng', width: 240, align: 'left', format: 'default' },
  { key: 'type', label: 'Phân loại', width: 140, align: 'left', format: 'badge' },
  { key: 'contact', label: 'Liên hệ / Wechat / SĐT', width: 180, align: 'left', format: 'default' },
  { key: 'so_mau', label: 'Mẫu thử', width: 120, align: 'center', format: 'default' },
  { key: 'so_po', label: 'Đơn hàng PO', width: 120, align: 'center', format: 'default' },
  { key: 'tong_tien_po', label: 'Tổng giá trị PO', width: 140, align: 'right', format: 'currency' },
  { key: 'web_acc', label: 'Tài khoản Web', width: 120, align: 'center', format: 'default' },
  { key: 'actions', label: 'Thao tác', width: 90, align: 'center', format: 'default' }
];

export function XnkNccModule({ onNavigate }) {
  const { 
    xnkMauData, 
    xnkDonHangData, 
    fetchModule, 
    loadingModules,
    upsertUser,
    deleteUser,
    fetchUsersData
  } = useData();

  const { usersData, isAdminSession } = useAuth();

  // Sub-tabs: [Danh sách] vs [Thống kê] (Screenshot 2)
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
  } = useColumnManager('xnk_ncc', DEFAULT_XNK_NCC_COLUMNS);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Drawer & Excel Modal States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Cross-lifecycle Detail Modal
  const [detailItem, setDetailItem] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch users & XNK module on mount (just like KhachhangModule)
  useEffect(() => {
    fetchUsersData();
    fetchModule('xnk');
    fetchModule('xnk_ytuong');
    fetchModule('sanpham');
  }, [fetchUsersData, fetchModule]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Aggregate stats from Sample and PO Orders
  const xnkStatsByNcc = useMemo(() => {
    const stats = new Map();

    // 1. Samples
    if (xnkMauData && xnkMauData.length > 1) {
      xnkMauData.slice(1).forEach((r) => {
        const tenNcc = (r[2] || '').trim().toLowerCase();
        if (!tenNcc) return;

        const xepHang = (r[9] || '').trim();
        const sepDuyet = (r[10] || '').trim();
        const isPassed = xepHang === 'Đạt' || sepDuyet === 'Đã duyệt (Cho phép đặt thật)' || sepDuyet === 'Đồng ý';

        if (!stats.has(tenNcc)) {
          stats.set(tenNcc, { so_mau: 0, so_mau_dat: 0, so_po: 0, tong_tien_po: 0 });
        }
        const item = stats.get(tenNcc);
        item.so_mau += 1;
        if (isPassed) item.so_mau_dat += 1;
      });
    }

    // 2. PO Orders
    if (xnkDonHangData && xnkDonHangData.length > 1) {
      xnkDonHangData.slice(1).forEach((r) => {
        const tenNcc = (r[4] || '').trim().toLowerCase();
        if (!tenNcc) return;

        const tongTien = cleanNumber(r[7]) || 0;

        if (!stats.has(tenNcc)) {
          stats.set(tenNcc, { so_mau: 0, so_mau_dat: 0, so_po: 0, tong_tien_po: 0 });
        }
        const item = stats.get(tenNcc);
        item.so_po += 1;
        item.tong_tien_po += tongTien;
      });
    }

    return stats;
  }, [xnkMauData, xnkDonHangData]);

  // Combined NCC List from DSNV (usersData) & XNK Sheets
  const nccList = useMemo(() => {
    const map = new Map();

    // 1. Add all suppliers from usersData (DSNV)
    (usersData || []).forEach(u => {
      const typeStr = (u.type || '').toString().trim().toUpperCase();
      const roleStr = (u.role || '').toString().trim().toUpperCase();

      // Check if user is supplier
      const isSupplier = typeStr.includes('NCC') || 
                         typeStr.includes('NHÀ CUNG CẤP') || 
                         typeStr.includes('XƯỞNG') ||
                         roleStr === 'NCC';

      if (isSupplier) {
        const key = (u.name || u.id || '').trim().toLowerCase();
        if (!key) return;

        const stat = xnkStatsByNcc.get(key) || { so_mau: 0, so_mau_dat: 0, so_po: 0, tong_tien_po: 0 };

        map.set(key, {
          sheetRow: u.sheetRow,
          id: u.id,
          name: u.name,
          contact: u.image || '',
          note: u.gender || '',
          type: u.type || 'KHÁCH HÀNG NCC',
          password: u.password || '',
          isSavedInDsnv: true,
          so_mau: stat.so_mau,
          so_mau_dat: stat.so_mau_dat,
          so_po: stat.so_po,
          tong_tien_po: stat.tong_tien_po
        });
      }
    });

    // 2. Also include any NCC found in xnkMauData / xnkDonHangData that wasn't in DSNV
    if (xnkMauData && xnkMauData.length > 1) {
      xnkMauData.slice(1).forEach((r) => {
        const tenNcc = (r[2] || '').trim();
        if (!tenNcc) return;
        const key = tenNcc.toLowerCase();

        if (!map.has(key)) {
          const stat = xnkStatsByNcc.get(key) || { so_mau: 0, so_mau_dat: 0, so_po: 0, tong_tien_po: 0 };
          map.set(key, {
            sheetRow: null,
            id: 'NCC-XNK',
            name: tenNcc,
            contact: (r[3] || '').trim(),
            note: (r[11] || '').trim(),
            type: 'KHÁCH HÀNG NCC',
            password: '',
            isSavedInDsnv: false,
            so_mau: stat.so_mau,
            so_mau_dat: stat.so_mau_dat,
            so_po: stat.so_po,
            tong_tien_po: stat.tong_tien_po
          });
        }
      });
    }

    if (xnkDonHangData && xnkDonHangData.length > 1) {
      xnkDonHangData.slice(1).forEach((r) => {
        const tenNcc = (r[4] || '').trim();
        if (!tenNcc) return;
        const key = tenNcc.toLowerCase();

        if (!map.has(key)) {
          const stat = xnkStatsByNcc.get(key) || { so_mau: 0, so_mau_dat: 0, so_po: 0, tong_tien_po: 0 };
          map.set(key, {
            sheetRow: null,
            id: 'NCC-XNK',
            name: tenNcc,
            contact: '',
            note: '',
            type: 'KHÁCH HÀNG NCC',
            password: '',
            isSavedInDsnv: false,
            so_mau: stat.so_mau,
            so_mau_dat: stat.so_mau_dat,
            so_po: stat.so_po,
            tong_tien_po: stat.tong_tien_po
          });
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => b.tong_tien_po - a.tong_tien_po || b.so_po - a.so_po || a.name.localeCompare(b.name));
  }, [usersData, xnkStatsByNcc, xnkMauData, xnkDonHangData]);

  // Filtered List
  const filteredList = useMemo(() => {
    return nccList.filter(item => {
      if (statusFilter === 'HAS_PO' && item.so_po === 0) return false;
      if (statusFilter === 'SAMPLE_PASS' && item.so_mau_dat === 0) return false;
      if (statusFilter === 'SAMPLE_ONLY' && (item.so_mau === 0 || item.so_po > 0)) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const text = `${item.id || ''} ${item.name || ''} ${item.contact || ''} ${item.type || ''}`;
        if (!matchesSearch(text, q)) return false;
      }

      return true;
    });
  }, [nccList, searchTerm, statusFilter]);

  // Paginated List
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalNcc = nccList.length;
    const nccWithPo = nccList.filter(n => n.so_po > 0).length;
    const totalSamples = nccList.reduce((acc, cur) => acc + cur.so_mau, 0);
    const totalPassedSamples = nccList.reduce((acc, cur) => acc + cur.so_mau_dat, 0);
    const passRate = totalSamples > 0 ? Math.round((totalPassedSamples / totalSamples) * 100) : 0;
    const totalOrderValue = nccList.reduce((acc, cur) => acc + cur.tong_tien_po, 0);

    return { totalNcc, nccWithPo, totalSamples, passRate, totalOrderValue };
  }, [nccList]);

  // Save NCC handler (uses upsertUser into DSNV)
  const handleSaveNcc = async (userData) => {
    try {
      await upsertUser(userData);
      await fetchUsersData();
      alert('Đã lưu thông tin Nhà Cung Cấp thành công!');
    } catch (err) {
      alert('Lỗi khi lưu Nhà Cung Cấp: ' + err.message);
    }
  };

  // Delete NCC handler (uses deleteUser from DSNV)
  const handleDeleteNcc = async (ncc) => {
    if (!ncc.sheetRow) {
      alert('Nhà cung cấp này được phát hiện từ lịch sử đơn hàng/mẫu thử, chưa được lưu trong danh bạ đối tác.');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa Nhà Cung Cấp: ${ncc.id} - ${ncc.name}?`)) {
      try {
        await deleteUser(ncc.sheetRow);
        await fetchUsersData();
        alert('Đã xóa Nhà Cung Cấp thành công.');
      } catch (err) {
        alert('Lỗi khi xóa Nhà Cung Cấp: ' + err.message);
      }
    }
  };

  // Import Excel handler (matching KhachhangModule)
  const handleImportExcelRows = async (excelRows) => {
    try {
      const dataRows = excelRows.slice(1);
      let count = 0;
      for (const row of dataRows) {
        if (row[0] || row[1]) {
          await upsertUser({
            id: (row[0] || '').toString().trim() || `NCC${Date.now()}`,
            name: (row[1] || '').toString().trim(),
            image: (row[2] || '').toString().trim(), // Contact / Wechat
            gender: (row[3] || '').toString().trim(), // Notes
            birthDate: '',
            role: 'NCC',
            password: '',
            type: (row[7] || row[2] || 'KHÁCH HÀNG NCC').toString().trim()
          });
          count++;
        }
      }
      await fetchUsersData();
      alert(`Đã nhập thành công ${count} Nhà Cung Cấp vào hệ thống.`);
    } catch (err) {
      alert('Lỗi khi import Excel: ' + err.message);
    }
  };

  // Export Excel handler
  const handleExportExcel = () => {
    const headers = ['Mã NCC', 'Tên nhà cung cấp / Xưởng', 'Phân loại', 'Liên hệ / Wechat / SĐT', 'Số mẫu thử', 'Số đơn PO', 'Tổng giá trị PO (VNĐ)'];
    const rows = filteredList.map(n => [
      n.id,
      n.name,
      n.type,
      n.contact,
      n.so_mau,
      n.so_po,
      n.tong_tien_po
    ]);
    exportToExcel([headers, ...rows], `XNK_DANH_SACH_NCC_${Date.now()}.xlsx`, 'DANH_SACH_NCC');
  };

  const isLoading = loadingModules.xnk || loadingModules.xnk_mau || loadingModules.xnk_donhang;

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
          Tổng cộng: <strong className="text-slate-800">{filteredList.length}</strong> nhà cung cấp
        </div>
      </div>

      {/* 2. Control Toolbar (matching Screenshot 2 & KhachhangModule) */}
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
              placeholder="Tìm NCC, mã ID, người liên hệ, Wechat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Bộ lọc tình trạng hợp tác */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">🏢 Tất cả nhà cung cấp</option>
            <option value="HAS_PO">🛒 Đã có đơn hàng PO</option>
            <option value="SAMPLE_PASS">✨ Đã có mẫu đạt chuẩn</option>
            <option value="SAMPLE_ONLY">📦 Mới thử mẫu (chưa lên PO)</option>
          </select>
        </div>

        {/* Action Buttons: Thêm NCC, Nhập Excel, Xuất Excel, Mẫu Excel, Làm mới */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút Thêm mới Nhà Cung Cấp */}
          <button
            onClick={() => {
              setEditUser(null);
              setIsDrawerOpen(true);
            }}
            className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            title="Thêm nhà cung cấp mới"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm NCC</span>
          </button>

          {/* Nút Nhập Excel */}
          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="px-2.5 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition flex items-center gap-1.5 cursor-pointer"
            title="Nhập danh sách NCC từ file Excel"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Nhập Excel</span>
          </button>

          {/* Nút Xuất Excel */}
          <button
            onClick={handleExportExcel}
            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Xuất Excel danh sách NCC"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          {/* Nút Mẫu Excel */}
          <button
            onClick={() => downloadModuleTemplate('xnk_ncc')}
            className="px-2.5 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
            title="Tải file mẫu Excel NCC"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Mẫu Excel</span>
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

          {/* Nút Làm mới */}
          <button
            onClick={() => {
              fetchUsersData();
              fetchModule('xnk', true);
            }}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Làm mới dữ liệu từ Google Sheets"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. Sub-Tab: THỐNG KÊ (KPI Cards) */}
      {activeSubTab === 'STATS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng số NCC</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{summaryMetrics.totalNcc}</div>
              <div className="text-[11px] text-slate-400 mt-1">Đối tác xưởng và nhà sản xuất</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Đã lên đơn PO</span>
              </div>
              <div className="text-2xl font-black text-indigo-600">{summaryMetrics.nccWithPo}</div>
              <div className="text-[11px] text-slate-400 mt-1">Nhà cung cấp đã chính thức đặt hàng</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <Award className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tỉ lệ mẫu Đạt</span>
              </div>
              <div className="text-2xl font-black text-emerald-600">{summaryMetrics.passRate}%</div>
              <div className="text-[11px] text-slate-400 mt-1">{summaryMetrics.totalSamples} mẫu đã kiểm thử thực tế</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng giá trị PO</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-600 truncate">
                {formatCurrency(summaryMetrics.totalOrderValue)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Tổng chi tiêu đặt hàng sản xuất</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Sub-Tab: DANH SÁCH BẢNG NCC (Matching KhachhangModule) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                {visibleColumns.map((col) => {
                  const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};
                  const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';

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
                  <td colSpan={visibleColumns.length} className="py-12 text-center text-slate-400">
                    <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Chưa có Nhà Cung Cấp nào trong danh mục</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Bấm nút "Thêm NCC" để tạo mới hoặc "Nhập Excel" để nhập hàng loạt đối tác xưởng.
                    </p>
                    <button
                      onClick={() => {
                        setEditUser(null);
                        setIsDrawerOpen(true);
                      }}
                      className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer shadow-xs"
                    >
                      + Thêm Nhà Cung Cấp ngay
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => {
                  return (
                    <tr 
                      key={item.id + item.name} 
                      onClick={() => {
                        setDetailItem(item);
                        setIsDetailOpen(true);
                      }}
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                    >
                      {visibleColumns.map((col) => {
                        const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};
                        const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                        let formatClass = '';
                        if (col.format === 'bold') formatClass = 'font-bold text-slate-800';
                        if (col.format === 'uppercase') formatClass = 'uppercase';

                        switch (col.key) {
                          case 'id':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-2.5 px-3 font-extrabold text-blue-700 whitespace-nowrap ${alignClass}`}>
                                {item.id}
                              </td>
                            );
                          case 'name':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-2.5 px-3 font-bold text-slate-900 ${alignClass}`}>
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                    <Building2 className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="text-slate-900 font-bold block">{item.name}</span>
                                    {item.note && (
                                      <span className="text-[11px] text-slate-400 font-normal block truncate max-w-[200px]" title={item.note}>
                                        {item.note}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          case 'type':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-2.5 px-3 whitespace-nowrap ${alignClass}`}>
                                <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {item.type || 'KHÁCH HÀNG NCC'}
                                </span>
                              </td>
                            );
                          case 'contact':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-2.5 px-3 text-slate-600 ${alignClass}`}>
                                {item.contact ? (
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-medium text-slate-700">{item.contact}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Chưa có liên hệ</span>
                                )}
                              </td>
                            );
                          case 'so_mau':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-2.5 px-3 whitespace-nowrap ${alignClass}`} onClick={(e) => e.stopPropagation()}>
                                {item.so_mau > 0 ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onNavigate('xnk_mau');
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-semibold text-[11px] transition cursor-pointer"
                                    title="Bấm để xem các mẫu của NCC này"
                                  >
                                    <span>{item.so_mau} mẫu</span>
                                    {item.so_mau_dat > 0 && (
                                      <span className="text-emerald-600 font-bold">({item.so_mau_dat} Đạt)</span>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-slate-400 italic">-</span>
                                )}
                              </td>
                            );
                          case 'so_po':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-2.5 px-3 whitespace-nowrap ${alignClass}`} onClick={(e) => e.stopPropagation()}>
                                {item.so_po > 0 ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onNavigate('xnk_donhang');
                                    }}
                                    className="px-2.5 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition cursor-pointer"
                                    title="Bấm để xem các đơn PO của NCC này"
                                  >
                                    {item.so_po} đơn PO
                                  </button>
                                ) : (
                                  <span className="text-slate-400 italic">-</span>
                                )}
                              </td>
                            );
                          case 'tong_tien_po':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-2.5 px-3 font-bold text-emerald-700 whitespace-nowrap ${alignClass} ${formatClass}`}>
                                {item.tong_tien_po > 0 ? formatCurrency(item.tong_tien_po) : '-'}
                              </td>
                            );
                          case 'web_acc':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-2.5 px-3 whitespace-nowrap ${alignClass}`}>
                                {item.password ? (
                                  <span className="text-emerald-600 font-semibold text-[11px]">Đã cấp quyền</span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Chưa cấp</span>
                                )}
                              </td>
                            );
                          case 'actions':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-2.5 px-3 whitespace-nowrap ${alignClass}`} onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditUser({
                                        sheetRow: item.sheetRow,
                                        id: item.id,
                                        name: item.name,
                                        contact: item.contact,
                                        note: item.note,
                                        type: item.type,
                                        password: item.password
                                      });
                                      setIsDrawerOpen(true);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                    title="Sửa thông tin NCC"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteNcc(item)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                    title="Xóa NCC"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
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

        {/* Pagination bar */}
        <div className="p-3 border-t border-slate-100">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredList.length}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setItemsPerPage}
            pageSizeOptions={[25, 50, 100, 200]}
          />
        </div>
      </div>

      {/* Column Manager Modal */}
      <ColumnManagerModal
        isOpen={isConfigModalOpen}
        onClose={closeConfigModal}
        columns={columns}
        toggleVisibility={toggleVisibility}
        updateColumnProp={updateColumnProp}
        moveColumn={moveColumn}
        resetToDefault={resetToDefault}
        moduleTitle="Danh sách Nhà Cung Cấp / Xưởng (Xuất Nhập Khẩu)"
      />

      {/* Drawer Thêm / Sửa NCC */}
      <XnkNccDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditUser(null);
        }}
        editUser={editUser}
        onSaved={handleSaveNcc}
      />

      {/* Modal Upload Excel */}
      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        moduleName="xnk_ncc"
        expectedColumns={['id', 'ho_ten', 'hinh_anh', 'gioi_tinh', 'ngay_sinh', 'quyen', 'mk', 'truong']}
        onImportRows={handleImportExcelRows}
      />

      {/* Cross-lifecycle Detail Modal */}
      <XnkChiTietModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        type="ncc"
        item={detailItem}
        onNavigate={onNavigate}
      />
    </div>
  );
}

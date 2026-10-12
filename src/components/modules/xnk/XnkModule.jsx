import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { Pagination } from '../../common/Pagination';
import { XnkYtuongDrawer } from './XnkYtuongDrawer';
import { XnkMauDrawer } from './XnkMauDrawer';
import { XnkDonHangDrawer } from './XnkDonHangDrawer';
import { XnkTrackingModal } from './XnkTrackingModal';
import { XnkChiTietModal } from './XnkChiTietModal';
import { exportToExcel } from '../../../services/excelService';
import { 
  formatDateVN, 
  formatNumber, 
  formatCurrency, 
  cleanNumber, 
  matchesSearch,
  parseSimpleSheetDate
} from '../../../utils/formatters';
import { 
  Ship, 
  Lightbulb, 
  Package, 
  ShoppingCart, 
  Clock, 
  Search, 
  Plus, 
  RotateCw, 
  RotateCcw,
  Download, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Factory, 
  Truck, 
  Warehouse, 
  ExternalLink, 
  Eye, 
  Sparkles,
  ChevronRight,
  Filter,
  Check,
  Building2,
  Calendar,
  ArrowLeft,
  ArrowUpDown
} from 'lucide-react';

const TABS = [
  { key: 'ytuong', label: '1. Ý tưởng sản phẩm', icon: Lightbulb },
  { key: 'mau', label: '2. Đặt mẫu & NCC', icon: Package },
  { key: 'donhang', label: '3. Đơn hàng sản xuất (PO)', icon: ShoppingCart },
  { key: 'tiendo', label: '4. Bảng tiến độ 5 chặng', icon: Clock }
];

export function XnkModule({ onNavigate }) {
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
  const canApprove = hasActionPermission('xnk.approve') || currentUser?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState('ytuong');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [authorFilter, setAuthorFilter] = useState('ALL');
  const [nccFilter, setNccFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [rankFilter, setRankFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortDateOrder, setSortDateOrder] = useState('desc'); // 'desc' (lớn tới nhỏ - mới nhất lên đầu) | 'asc' (cũ lên đầu)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Modal / Drawer States
  const [isYtuongDrawerOpen, setIsYtuongDrawerOpen] = useState(false);
  const [selectedYtuong, setSelectedYtuong] = useState(null);

  const [isMauDrawerOpen, setIsMauDrawerOpen] = useState(false);
  const [selectedMau, setSelectedMau] = useState(null);
  const [sampleInitialIdea, setSampleInitialIdea] = useState(null);

  const [isDonHangDrawerOpen, setIsDonHangDrawerOpen] = useState(false);
  const [selectedDonHang, setSelectedDonHang] = useState(null);
  const [orderInitialSample, setOrderInitialSample] = useState(null);

  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(null);

  // Cross-lifecycle Detail Modal
  const [detailItem, setDetailItem] = useState(null);
  const [detailType, setDetailType] = useState('ytuong');
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Auto fetch data on mount
  useEffect(() => {
    fetchModule('xnk');
  }, [fetchModule]);

  // Reset page when tab or search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, statusFilter, authorFilter, nccFilter, planFilter, rankFilter, dateFrom, dateTo]);

  // 1. Parsed Ý tưởng rows (mặc định sắp xếp ngày từ lớn tới nhỏ)
  const parsedYtuongList = useMemo(() => {
    if (!xnkYtuongData || xnkYtuongData.length <= 1) return [];
    return xnkYtuongData.slice(1).map((row, idx) => ({
      _sheetRow: idx + 2,
      id_y_tuong: row[0] || '',
      ngay_tao: row[1] || '',
      nguoi_tao: row[2] || '',
      sku_du_kien: row[3] || '',
      ten_sp: row[4] || '',
      mo_ta: row[5] || '',
      link_tham_khao: row[6] || '',
      trang_thai: row[7] || 'Mới tạo',
      nguoi_duyet: row[8] || '',
      ghi_chu: row[9] || ''
    })).filter(item => item.id_y_tuong || item.ten_sp)
      .sort((a, b) => {
        const timeA = parseSimpleSheetDate(a.ngay_tao).getTime() || 0;
        const timeB = parseSimpleSheetDate(b.ngay_tao).getTime() || 0;
        return timeB - timeA;
      });
  }, [xnkYtuongData]);

  // 2. Parsed Mẫu rows (mặc định sắp xếp ngày từ lớn tới nhỏ)
  const parsedMauList = useMemo(() => {
    if (!xnkMauData || xnkMauData.length <= 1) return [];
    return xnkMauData.slice(1).map((row, idx) => ({
      _sheetRow: idx + 2,
      id_mau: row[0] || '',
      id_y_tuong: row[1] || '',
      ten_ncc: row[2] || '',
      lien_he_ncc: row[3] || '',
      gia_mau: row[4] !== undefined && row[4] !== '' ? cleanNumber(row[4]) : '',
      ngay_dat_mau: row[5] || '',
      ngay_nhan_mau: row[6] || '',
      link_anh_mau: row[7] || '',
      danh_gia_cai_tien: row[8] || '',
      danh_gia_xep_hang: row[9] || '',
      trang_thai_duyet: row[10] || 'Chờ duyệt',
      ghi_chu: row[11] || ''
    })).filter(item => item.id_mau || item.ten_ncc)
      .sort((a, b) => {
        const timeA = parseSimpleSheetDate(a.ngay_dat_mau || a.ngay_nhan_mau).getTime() || 0;
        const timeB = parseSimpleSheetDate(b.ngay_dat_mau || b.ngay_nhan_mau).getTime() || 0;
        return timeB - timeA;
      });
  }, [xnkMauData]);

  // 3. Parsed Đơn hàng PO rows (mặc định sắp xếp ngày từ lớn tới nhỏ)
  const parsedDonHangList = useMemo(() => {
    if (!xnkDonHangData || xnkDonHangData.length <= 1) return [];
    return xnkDonHangData.slice(1).map((row, idx) => ({
      _sheetRow: idx + 2,
      ma_po: row[0] || '',
      id_mau: row[1] || '',
      sku: row[2] || '',
      ten_sp: row[3] || '',
      ten_ncc: row[4] || '',
      so_luong: cleanNumber(row[5]) || 0,
      don_gia: cleanNumber(row[6]) || 0,
      tong_tien: cleanNumber(row[7]) || 0,
      tien_coc: cleanNumber(row[8]) || 0,
      ngay_dat_hang: row[9] || '',
      ngay_sx_xong: row[10] || '',
      tracking_van_chuyen: row[11] || '',
      ngay_gui_hang: row[12] || '',
      ngay_thong_quan: row[13] || '',
      ngay_kho_nhan: row[14] || '',
      slg_thuc_nhan: row[15] !== undefined && row[15] !== '' ? cleanNumber(row[15]) : '',
      ke_hoach_ban: row[16] || 'Bán ngay',
      tinh_trang_cuoi: row[17] || 'Đang sản xuất',
      ghi_chu: row[18] || ''
    })).filter(item => item.ma_po || item.ten_sp)
      .sort((a, b) => {
        const timeA = parseSimpleSheetDate(a.ngay_dat_hang || a.ngay_kho_nhan).getTime() || 0;
        const timeB = parseSimpleSheetDate(b.ngay_dat_hang || b.ngay_kho_nhan).getTime() || 0;
        return timeB - timeA;
      });
  }, [xnkDonHangData]);

  // Helper map idea to sample
  const ytuongMap = useMemo(() => {
    const map = {};
    parsedYtuongList.forEach(y => {
      map[y.id_y_tuong] = y;
    });
    return map;
  }, [parsedYtuongList]);

  // Unique authors & NCC options
  const authorOptions = useMemo(() => {
    const set = new Set();
    parsedYtuongList.forEach(item => {
      const author = (item.nguoi_tao || '').trim();
      if (author) set.add(author);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [parsedYtuongList]);

  const nccOptions = useMemo(() => {
    const set = new Set();
    parsedMauList.forEach(item => {
      const ncc = (item.ten_ncc || '').trim();
      if (ncc) set.add(ncc);
    });
    parsedDonHangList.forEach(item => {
      const ncc = (item.ten_ncc || '').trim();
      if (ncc) set.add(ncc);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [parsedMauList, parsedDonHangList]);

  // Date range checking helper
  const isDateInRange = (dateStr, from, to) => {
    if (!from && !to) return true;
    if (!dateStr) return false;
    const d = parseSimpleSheetDate(dateStr);
    if (!d || Number.isNaN(d.getTime())) return false;
    if (from) {
      const dFrom = new Date(`${from}T00:00:00`);
      if (d < dFrom) return false;
    }
    if (to) {
      const dTo = new Date(`${to}T23:59:59.999`);
      if (d > dTo) return false;
    }
    return true;
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setAuthorFilter('ALL');
    setNccFilter('ALL');
    setPlanFilter('ALL');
    setRankFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setSortDateOrder('desc');
  };

  // Filtered Ý tưởng (sắp xếp theo ngày lớn tới nhỏ)
  const filteredYtuong = useMemo(() => {
    return parsedYtuongList.filter(item => {
      if (statusFilter !== 'ALL' && item.trang_thai !== statusFilter) return false;
      if (authorFilter !== 'ALL' && item.nguoi_tao !== authorFilter) return false;
      if (!isDateInRange(item.ngay_tao, dateFrom, dateTo)) return false;
      if (searchTerm) {
        const match = 
          matchesSearch(item.id_y_tuong, searchTerm) ||
          matchesSearch(item.ten_sp, searchTerm) ||
          matchesSearch(item.sku_du_kien, searchTerm) ||
          matchesSearch(item.nguoi_tao, searchTerm);
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => {
      const timeA = parseSimpleSheetDate(a.ngay_tao).getTime() || 0;
      const timeB = parseSimpleSheetDate(b.ngay_tao).getTime() || 0;
      return sortDateOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [parsedYtuongList, statusFilter, authorFilter, dateFrom, dateTo, searchTerm, sortDateOrder]);

  // Filtered Mẫu (sắp xếp theo ngày lớn tới nhỏ)
  const filteredMau = useMemo(() => {
    return parsedMauList.filter(item => {
      if (statusFilter !== 'ALL' && item.trang_thai_duyet !== statusFilter) return false;
      if (rankFilter !== 'ALL' && (item.danh_gia_xep_hang || 'Chưa đánh giá') !== rankFilter) return false;
      if (nccFilter !== 'ALL' && item.ten_ncc !== nccFilter) return false;
      if (!isDateInRange(item.ngay_dat_mau || item.ngay_nhan_mau, dateFrom, dateTo)) return false;
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
  }, [parsedMauList, ytuongMap, statusFilter, rankFilter, nccFilter, dateFrom, dateTo, searchTerm, sortDateOrder]);

  // Filtered Đơn PO (sắp xếp theo ngày lớn tới nhỏ)
  const filteredDonHang = useMemo(() => {
    return parsedDonHangList.filter(item => {
      if (statusFilter !== 'ALL' && item.tinh_trang_cuoi !== statusFilter) return false;
      if (nccFilter !== 'ALL' && item.ten_ncc !== nccFilter) return false;
      if (planFilter !== 'ALL' && item.ke_hoach_ban !== planFilter) return false;
      if (!isDateInRange(item.ngay_dat_hang || item.ngay_kho_nhan, dateFrom, dateTo)) return false;
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
    }).sort((a, b) => {
      const timeA = parseSimpleSheetDate(a.ngay_dat_hang || a.ngay_kho_nhan).getTime() || 0;
      const timeB = parseSimpleSheetDate(b.ngay_dat_hang || b.ngay_kho_nhan).getTime() || 0;
      return sortDateOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [parsedDonHangList, statusFilter, nccFilter, planFilter, dateFrom, dateTo, searchTerm, sortDateOrder]);

  // Filtered Tiến độ 5 chặng (dành cho Tab 4 Kanban, sắp xếp theo ngày lớn tới nhỏ)
  const filteredTiendo = useMemo(() => {
    return parsedDonHangList.filter(item => {
      if (nccFilter !== 'ALL' && item.ten_ncc !== nccFilter) return false;
      if (planFilter !== 'ALL' && item.ke_hoach_ban !== planFilter) return false;
      if (!isDateInRange(item.ngay_dat_hang || item.ngay_kho_nhan, dateFrom, dateTo)) return false;
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
    }).sort((a, b) => {
      const timeA = parseSimpleSheetDate(a.ngay_dat_hang || a.ngay_kho_nhan).getTime() || 0;
      const timeB = parseSimpleSheetDate(b.ngay_dat_hang || b.ngay_kho_nhan).getTime() || 0;
      return sortDateOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [parsedDonHangList, nccFilter, planFilter, dateFrom, dateTo, searchTerm, sortDateOrder]);

  // Handle Tab-specific current items
  const currentTotal = activeTab === 'ytuong' 
    ? filteredYtuong.length 
    : activeTab === 'mau' 
    ? filteredMau.length 
    : filteredDonHang.length;

  const paginatedYtuong = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredYtuong.slice(start, start + itemsPerPage);
  }, [filteredYtuong, currentPage, itemsPerPage]);

  const paginatedMau = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMau.slice(start, start + itemsPerPage);
  }, [filteredMau, currentPage, itemsPerPage]);

  const paginatedDonHang = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDonHang.slice(start, start + itemsPerPage);
  }, [filteredDonHang, currentPage, itemsPerPage]);

  // Export current tab to Excel
  const handleExportExcel = () => {
    if (activeTab === 'ytuong') {
      const headers = ['Mã ý tưởng', 'Ngày tạo', 'Người tạo', 'SKU dự kiến', 'Tên SP', 'Mô tả', 'Link tham khảo', 'Trạng thái', 'Người duyệt', 'Ghi chú'];
      const rows = filteredYtuong.map(y => [
        y.id_y_tuong, y.ngay_tao, y.nguoi_tao, y.sku_du_kien, y.ten_sp, y.mo_ta, y.link_tham_khao, y.trang_thai, y.nguoi_duyet, y.ghi_chu
      ]);
      exportToExcel([headers, ...rows], 'XNK_Y_TUONG.xlsx', 'Y_TUONG');
    } else if (activeTab === 'mau') {
      const headers = ['Mã mẫu', 'Mã ý tưởng', 'Tên NCC', 'Liên hệ NCC', 'Giá mẫu', 'Ngày đặt', 'Ngày nhận', 'Link ảnh', 'Đánh giá cải tiến', 'Xếp hạng', 'Trạng thái duyệt', 'Ghi chú'];
      const rows = filteredMau.map(m => [
        m.id_mau, m.id_y_tuong, m.ten_ncc, m.lien_he_ncc, m.gia_mau, m.ngay_dat_mau, m.ngay_nhan_mau, m.link_anh_mau, m.danh_gia_cai_tien, m.danh_gia_xep_hang, m.trang_thai_duyet, m.ghi_chu
      ]);
      exportToExcel([headers, ...rows], 'XNK_MAU.xlsx', 'MAU_THU');
    } else if (activeTab === 'tiendo') {
      const headers = ['Mã PO', 'Mã mẫu', 'SKU', 'Tên sản phẩm', 'Nhà cung cấp', 'Số lượng', 'Đơn giá', 'Tổng tiền', 'Ngày đặt/cọc', 'Ngày SX xong', 'Tracking', 'Ngày gửi hàng', 'Ngày thông quan', 'Ngày kho nhận', 'Kế hoạch bán', 'Tình trạng cuối'];
      const rows = filteredTiendo.map(d => [
        d.ma_po, d.id_mau, d.sku, d.ten_sp, d.ten_ncc, d.so_luong, d.don_gia, d.tong_tien, d.ngay_dat_hang, d.ngay_sx_xong, d.tracking_van_chuyen, d.ngay_gui_hang, d.ngay_thong_quan, d.ngay_kho_nhan, d.ke_hoach_ban, d.tinh_trang_cuoi
      ]);
      exportToExcel([headers, ...rows], 'XNK_TIEN_DO_5_CHANG.xlsx', 'TIEN_DO');
    } else {
      const headers = ['Mã PO', 'Mã mẫu', 'SKU', 'Tên sản phẩm', 'Nhà cung cấp', 'Số lượng', 'Đơn giá', 'Tổng tiền', 'Tiền cọc', 'Ngày đặt/cọc', 'Ngày SX xong', 'Tracking', 'Ngày gửi hàng', 'Ngày thông quan', 'Ngày kho nhận', 'SL thực nhận', 'Kế hoạch bán', 'Tình trạng cuối', 'Ghi chú'];
      const rows = filteredDonHang.map(d => [
        d.ma_po, d.id_mau, d.sku, d.ten_sp, d.ten_ncc, d.so_luong, d.don_gia, d.tong_tien, d.tien_coc, d.ngay_dat_hang, d.ngay_sx_xong, d.tracking_van_chuyen, d.ngay_gui_hang, d.ngay_thong_quan, d.ngay_kho_nhan, d.slg_thuc_nhan, d.ke_hoach_ban, d.tinh_trang_cuoi, d.ghi_chu
      ]);
      exportToExcel([headers, ...rows], 'XNK_DON_HANG_PO.xlsx', 'DON_HANG_PO');
    }
  };

  // Delete Action
  const handleDeleteRow = async (moduleSheetKey, sheetRow, identifier) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản ghi [${identifier}]?`)) return;
    try {
      await deleteRow(moduleSheetKey, sheetRow);
    } catch (err) {
      console.error('Lỗi xóa:', err);
      alert('Không thể xóa dòng dữ liệu. Vui lòng thử lại!');
    }
  };

  // Switch to Sample Drawer from Idea
  const handleCreateSampleFromIdea = (ideaItem) => {
    setSampleInitialIdea(ideaItem);
    setSelectedMau(null);
    setActiveTab('mau');
    setIsMauDrawerOpen(true);
  };

  // Switch to PO Order Drawer from Sample
  const handleCreateOrderFromSample = (sampleItem, relatedIdea) => {
    setOrderInitialSample({
      ...sampleItem,
      sku: relatedIdea?.sku_du_kien || '',
      ten_sp: relatedIdea?.ten_sp || ''
    });
    setSelectedDonHang(null);
    setActiveTab('donhang');
    setIsDonHangDrawerOpen(true);
  };

  const isLoading = loadingModules.xnk || loadingModules.xnk_ytuong || loadingModules.xnk_mau || loadingModules.xnk_donhang;

  return (
    <div className="space-y-3 flex-1 flex flex-col min-h-full">
      {/* 1. Header Toolbar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('xnk')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 mr-1"
                  title="Quay lại Hub Xuất Nhập Khẩu"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500" />
                  <span>Quay lại</span>
                </button>
              )}
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Ship className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Tổng Quan Quản Lý Xuất Nhập Khẩu (XNK)
                </h1>
                <p className="text-xs text-slate-500">
                  Quy trình 4 bước: Ý tưởng sản phẩm ➔ Tìm NCC đặt mẫu ➔ Đặt hàng PO ➔ Theo dõi 5 chặng tiến độ
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fetchModule('xnk', true)}
              disabled={isLoading}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Tải lại dữ liệu từ Google Sheets"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất Excel
            </button>

            {canManage && activeTab !== 'tiendo' && (
              <button
                onClick={() => {
                  if (activeTab === 'ytuong') {
                    setSelectedYtuong(null);
                    setIsYtuongDrawerOpen(true);
                  } else if (activeTab === 'mau') {
                    setSelectedMau(null);
                    setSampleInitialIdea(null);
                    setIsMauDrawerOpen(true);
                  } else if (activeTab === 'donhang') {
                    setSelectedDonHang(null);
                    setOrderInitialSample(null);
                    setIsDonHangDrawerOpen(true);
                  }
                }}
                className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                {activeTab === 'ytuong' && 'Thêm Ý Tưởng Mới'}
                {activeTab === 'mau' && 'Đặt Hàng Mẫu Mới'}
                {activeTab === 'donhang' && 'Tạo Đơn Hàng PO'}
              </button>
            )}
          </div>
        </div>

        {/* 2. TAB SWITCHER */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            let count = 0;
            if (tab.key === 'ytuong') count = parsedYtuongList.length;
            if (tab.key === 'mau') count = parsedMauList.length;
            if (tab.key === 'donhang') count = parsedDonHangList.length;

            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setStatusFilter('ALL');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.key !== 'tiendo' && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. QUICK STATS SUMMARY CARDS */}
      {activeTab === 'ytuong' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">Tổng số ý tưởng</span>
            <div className="text-lg font-bold text-slate-800 mt-0.5">{parsedYtuongList.length}</div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-600">Đang thảo luận</span>
            <div className="text-lg font-bold text-amber-600 mt-0.5">
              {parsedYtuongList.filter(i => i.trang_thai === 'Đang thảo luận' || i.trang_thai === 'Mới tạo').length}
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-600">Ý tưởng đã duyệt</span>
            <div className="text-lg font-bold text-emerald-600 mt-0.5">
              {parsedYtuongList.filter(i => i.trang_thai === 'Đã duyệt').length}
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-rose-600">Từ chối</span>
            <div className="text-lg font-bold text-rose-600 mt-0.5">
              {parsedYtuongList.filter(i => i.trang_thai === 'Từ chối').length}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mau' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">Tổng mẫu đã đặt</span>
            <div className="text-lg font-bold text-slate-800 mt-0.5">{parsedMauList.length}</div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-600">Chờ Sếp duyệt</span>
            <div className="text-lg font-bold text-amber-600 mt-0.5">
              {parsedMauList.filter(m => m.trang_thai_duyet === 'Chờ duyệt').length}
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-600">Mẫu ĐẠT (Cho phép đặt)</span>
            <div className="text-lg font-bold text-emerald-600 mt-0.5">
              {parsedMauList.filter(m => m.trang_thai_duyet === 'Đã duyệt (Cho phép đặt thật)' || m.danh_gia_xep_hang === 'Đạt').length}
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-rose-600">Không đạt / Cần sửa</span>
            <div className="text-lg font-bold text-rose-600 mt-0.5">
              {parsedMauList.filter(m => m.danh_gia_xep_hang === 'Không đạt' || m.danh_gia_xep_hang === 'Cần cải tiến thêm').length}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'donhang' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">Tổng đơn PO</span>
            <div className="text-lg font-bold text-slate-800 mt-0.5">{parsedDonHangList.length}</div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-blue-600">Tổng SLG đặt</span>
            <div className="text-lg font-bold text-blue-600 mt-0.5">
              {formatNumber(parsedDonHangList.reduce((acc, d) => acc + (d.so_luong || 0), 0))} cái
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-600">Tổng giá trị PO</span>
            <div className="text-lg font-bold text-emerald-600 mt-0.5">
              {formatCurrency(parsedDonHangList.reduce((acc, d) => acc + (d.tong_tien || 0), 0))}
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-600">Đã về kho</span>
            <div className="text-lg font-bold text-amber-600 mt-0.5">
              {parsedDonHangList.filter(d => d.tinh_trang_cuoi === 'Đã về kho' || d.tinh_trang_cuoi === 'Đã hoàn thành').length} PO
            </div>
          </div>
        </div>
      )}

      {/* 4. SEARCH & STATUS FILTER TOOLBAR */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Keyword Search */}
          <div className="relative min-w-[190px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={
                activeTab === 'ytuong' 
                  ? 'Tìm SKU, tên SP, người tạo...' 
                  : activeTab === 'mau' 
                  ? 'Tìm mã mẫu, tên NCC, SP...' 
                  : activeTab === 'donhang'
                  ? 'Tìm mã PO, SKU, tên SP, tracking...'
                  : 'Tìm mã PO, SKU, tên SP, NCC...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Status Filter (not used on tiendo) */}
          {activeTab !== 'tiendo' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              {activeTab === 'ytuong' && (
                <>
                  <option value="Mới tạo">Mới tạo</option>
                  <option value="Đang thảo luận">Đang thảo luận</option>
                  <option value="Đã duyệt">Đã duyệt</option>
                  <option value="Từ chối">Từ chối</option>
                </>
              )}
              {activeTab === 'mau' && (
                <>
                  <option value="Chờ duyệt">Chờ duyệt</option>
                  <option value="Đã duyệt (Cho phép đặt thật)">Đã duyệt</option>
                  <option value="Từ chối">Từ chối</option>
                </>
              )}
              {activeTab === 'donhang' && (
                <>
                  <option value="Đang sản xuất">Đang sản xuất</option>
                  <option value="Đang vận chuyển">Đang vận chuyển</option>
                  <option value="Đang thông quan">Đang thông quan</option>
                  <option value="Đã về kho">Đã về kho</option>
                  <option value="Đã hoàn thành">Đã hoàn thành</option>
                </>
              )}
            </select>
          )}

          {/* Tab 1: Author Filter */}
          {activeTab === 'ytuong' && (
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả người tạo</option>
              {authorOptions.map(author => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          )}

          {/* Tab 2: Rank Filter */}
          {activeTab === 'mau' && (
            <select
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả xếp hạng</option>
              <option value="Đạt">Đạt</option>
              <option value="Cần cải tiến thêm">Cần cải tiến thêm</option>
              <option value="Không đạt">Không đạt</option>
              <option value="Chưa đánh giá">Chưa đánh giá</option>
            </select>
          )}

          {/* Tab 2, 3, 4: NCC Filter */}
          {(activeTab === 'mau' || activeTab === 'donhang' || activeTab === 'tiendo') && (
            <select
              value={nccFilter}
              onChange={(e) => setNccFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[170px] truncate"
            >
              <option value="ALL">Tất cả NCC</option>
              {nccOptions.map(ncc => (
                <option key={ncc} value={ncc}>{ncc}</option>
              ))}
            </select>
          )}

          {/* Tab 3 & 4: Plan Filter */}
          {(activeTab === 'donhang' || activeTab === 'tiendo') && (
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả KH bán</option>
              <option value="Bán ngay">Bán ngay</option>
              <option value="Bán sau (Trữ kho)">Bán sau (Trữ kho)</option>
            </select>
          )}

          {/* Date range filter */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="Từ ngày"
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none w-31"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="Đến ngày"
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none w-31"
            />
          </div>

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
            <span>Ngày: {sortDateOrder === 'desc' ? 'Mới ➔ Cũ (Lớn ➔ Nhỏ)' : 'Cũ ➔ Mới (Nhỏ ➔ Lớn)'}</span>
          </button>
        </div>

        {/* Reset Filter Button */}
        <button
          type="button"
          onClick={handleResetFilters}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
          title="Đặt lại tất cả bộ lọc"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Đặt lại</span>
        </button>
      </div>

      {/* 5. TAB 1: BẢNG Ý TƯỞNG SẢN PHẨM */}
      {activeTab === 'ytuong' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col justify-between min-h-[calc(100vh-340px)]">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-2xs">
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                  <th className="py-2.5 px-3 whitespace-nowrap">Mã ý tưởng</th>
                  <th 
                    className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition select-none"
                    onClick={() => setSortDateOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    title="Nhấp để đổi thứ tự sắp xếp theo ngày"
                  >
                    <div className="flex items-center gap-1 text-slate-800">
                      <span>Ngày tạo</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                  </th>
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
                {paginatedYtuong.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Không tìm thấy ý tưởng sản phẩm nào
                    </td>
                  </tr>
                ) : (
                  paginatedYtuong.map((item) => (
                    <tr 
                      key={item.id_y_tuong} 
                      onClick={() => {
                        setDetailItem(item);
                        setDetailType('ytuong');
                        setIsDetailOpen(true);
                      }}
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                    >
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
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
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
                      <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {item.trang_thai === 'Đã duyệt' && (
                            <button
                              onClick={() => handleCreateSampleFromIdea(item)}
                              title="Tạo đặt mẫu từ ý tưởng này"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            >
                              <Package className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedYtuong(item);
                              setIsYtuongDrawerOpen(true);
                            }}
                            title="Sửa ý tưởng"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {canManage && (
                            <button
                              onClick={() => handleDeleteRow('xnk_ytuong', item._sheetRow, item.ten_sp)}
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

          <div className="p-3 border-t border-slate-100 bg-white mt-auto shrink-0">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredYtuong.length}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={setItemsPerPage}
              pageSizeOptions={[25, 50, 100, 200]}
            />
          </div>
        </div>
      )}

      {/* 6. TAB 2: BẢNG ĐẶT MẪU & NCC */}
      {activeTab === 'mau' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col justify-between min-h-[calc(100vh-340px)]">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-2xs">
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                  <th className="py-2.5 px-3 whitespace-nowrap">Mã mẫu</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Sản phẩm & Ý tưởng</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Nhà cung cấp / Xưởng</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">Giá mẫu</th>
                  <th 
                    className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition select-none"
                    onClick={() => setSortDateOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    title="Nhấp để đổi thứ tự sắp xếp theo ngày"
                  >
                    <div className="flex items-center gap-1 text-slate-800">
                      <span>Ngày đặt / Nhận</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Ảnh mẫu thực tế</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Đánh giá cải tiến</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Xếp hạng</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Sếp duyệt</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMau.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      Không tìm thấy dữ liệu đặt hàng mẫu nào
                    </td>
                  </tr>
                ) : (
                  paginatedMau.map((item) => {
                    const relatedIdea = ytuongMap[item.id_y_tuong];
                    const isApproved = item.trang_thai_duyet === 'Đã duyệt (Cho phép đặt thật)' || item.danh_gia_xep_hang === 'Đạt';

                    return (
                      <tr 
                        key={item.id_mau} 
                        onClick={() => {
                          setDetailItem(item);
                          setDetailType('mau');
                          setIsDetailOpen(true);
                        }}
                        className="hover:bg-slate-50/70 transition cursor-pointer"
                      >
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
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
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
                        <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {isApproved && (
                              <button
                                onClick={() => handleCreateOrderFromSample(item, relatedIdea)}
                                title="Tạo đơn PO từ mẫu đạt này"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedMau(item);
                                setIsMauDrawerOpen(true);
                              }}
                              title="Sửa mẫu"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {canManage && (
                              <button
                                onClick={() => handleDeleteRow('xnk_mau', item._sheetRow, item.id_mau)}
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

          <div className="p-3 border-t border-slate-100 bg-white mt-auto shrink-0">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredMau.length}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={setItemsPerPage}
              pageSizeOptions={[25, 50, 100, 200]}
            />
          </div>
        </div>
      )}

      {/* 7. TAB 3: BẢNG ĐƠN HÀNG SẢN XUẤT (PO) */}
      {activeTab === 'donhang' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col justify-between min-h-[calc(100vh-340px)]">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-2xs">
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                  <th className="py-2.5 px-3 whitespace-nowrap">Mã PO</th>
                  <th 
                    className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition select-none"
                    onClick={() => setSortDateOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    title="Nhấp để đổi thứ tự sắp xếp theo ngày"
                  >
                    <div className="flex items-center gap-1 text-slate-800">
                      <span>Ngày đặt</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                  </th>
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
                {paginatedDonHang.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-8 text-center text-slate-400">
                      Không tìm thấy đơn đặt hàng PO nào
                    </td>
                  </tr>
                ) : (
                  paginatedDonHang.map((item) => (
                    <tr 
                      key={item.ma_po} 
                      onClick={() => {
                        setDetailItem(item);
                        setDetailType('donhang');
                        setIsDetailOpen(true);
                      }}
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-semibold text-blue-700 whitespace-nowrap">
                        {item.ma_po}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-medium">
                        {formatDateVN(item.ngay_dat_hang) || '-'}
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
                          item.ke_hoach_ban?.startsWith('Bán ngay')
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.ke_hoach_ban}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
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
                      <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTrackingOrder(item);
                            setIsTrackingModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Xem Stepper
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedDonHang(item);
                              setIsDonHangDrawerOpen(true);
                            }}
                            title="Sửa PO"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {canManage && (
                            <button
                              onClick={() => handleDeleteRow('xnk_donhang', item._sheetRow, item.ma_po)}
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

          <div className="p-3 border-t border-slate-100 bg-white mt-auto shrink-0">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredDonHang.length}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={setItemsPerPage}
              pageSizeOptions={[25, 50, 100, 200]}
            />
          </div>
        </div>
      )}

      {/* 8. TAB 4: THEO DÕI TIẾN ĐỘ 5 CHẶNG (KANBAN VIEW) */}
      {activeTab === 'tiendo' && (
        <div className="space-y-4 flex-1 flex flex-col min-h-[calc(100vh-340px)]">
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs text-xs text-slate-600 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Quy trình 5 chặng xuất nhập khẩu:</span>
              <span>1. Đặt hàng & Cọc ➔ 2. Sản xuất ➔ 3. Vận chuyển quốc tế ➔ 4. Thông quan hải quan ➔ 5. Kho nhận hàng</span>
            </div>
            <span className="font-semibold text-blue-600">
              Tổng {parsedDonHangList.length} đơn PO đang chạy
            </span>
          </div>

          {/* 5 KANBAN COLUMNS */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 flex-1">
            {[
              {
                id: 'stage_1',
                title: '1. Đặt hàng / Cọc',
                icon: Check,
                color: 'blue',
                filterFn: (d) => Boolean(d.ngay_dat_hang) && !d.ngay_sx_xong
              },
              {
                id: 'stage_2',
                title: '2. Đang sản xuất',
                icon: Factory,
                color: 'amber',
                filterFn: (d) => Boolean(d.ngay_sx_xong) && !d.ngay_gui_hang
              },
              {
                id: 'stage_3',
                title: '3. Vận chuyển QT',
                icon: Truck,
                color: 'cyan',
                filterFn: (d) => Boolean(d.ngay_gui_hang) && !d.ngay_thong_quan
              },
              {
                id: 'stage_4',
                title: '4. Đang thông quan',
                icon: Clock,
                color: 'indigo',
                filterFn: (d) => Boolean(d.ngay_thong_quan) && !d.ngay_kho_nhan
              },
              {
                id: 'stage_5',
                title: '5. Đã về kho',
                icon: Warehouse,
                color: 'emerald',
                filterFn: (d) => Boolean(d.ngay_kho_nhan)
              }
            ].map((col) => {
              const ColIcon = col.icon;
              const columnOrders = filteredTiendo.filter(col.filterFn);

              return (
                <div key={col.id} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3 flex flex-col min-h-[450px]">
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                      <ColIcon className="w-4 h-4 text-blue-600" />
                      {col.title}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      {columnOrders.length}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto">
                    {columnOrders.length === 0 ? (
                      <div className="h-32 flex items-center justify-center text-[11px] text-slate-400 italic">
                        Không có đơn hàng
                      </div>
                    ) : (
                      columnOrders.map((order) => (
                        <div
                          key={order.ma_po}
                          onClick={() => {
                            setDetailItem(order);
                            setDetailType('tiendo');
                            setIsDetailOpen(true);
                          }}
                          className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition cursor-pointer space-y-2 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-700 group-hover:underline">
                              {order.ma_po}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTrackingOrder(order);
                                  setIsTrackingModalOpen(true);
                                }}
                                title="Xem Stepper nhanh"
                                className="p-0.5 rounded text-slate-400 hover:text-blue-600 transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                order.ke_hoach_ban === 'Bán ngay'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {order.ke_hoach_ban}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-bold text-slate-900 line-clamp-1">
                              {order.ten_sp}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              SKU: <strong className="text-slate-700">{order.sku}</strong> • SLG: <strong className="text-blue-700">{formatNumber(order.so_luong)}</strong>
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                            <span className="truncate max-w-[110px]" title={order.ten_ncc}>
                              NCC: {order.ten_ncc || 'Chưa rõ'}
                            </span>
                            <span className="font-semibold text-slate-700">
                              {formatCurrency(order.tong_tien)}
                            </span>
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
        </div>
      )}

      {/* DRAWERS & MODALS */}
      <XnkYtuongDrawer
        isOpen={isYtuongDrawerOpen}
        onClose={() => setIsYtuongDrawerOpen(false)}
        editItem={selectedYtuong}
        onSaved={() => fetchModule('xnk_ytuong', true)}
        onCreateSampleFromIdea={handleCreateSampleFromIdea}
      />

      <XnkMauDrawer
        isOpen={isMauDrawerOpen}
        onClose={() => setIsMauDrawerOpen(false)}
        editItem={selectedMau}
        initialIdea={sampleInitialIdea}
        ytuongList={parsedYtuongList}
        onSaved={() => fetchModule('xnk_mau', true)}
        onCreateOrderFromSample={handleCreateOrderFromSample}
      />

      <XnkDonHangDrawer
        isOpen={isDonHangDrawerOpen}
        onClose={() => setIsDonHangDrawerOpen(false)}
        editItem={selectedDonHang}
        initialSample={orderInitialSample}
        sampleList={parsedMauList}
        onSaved={() => fetchModule('xnk_donhang', true)}
      />

      <XnkTrackingModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        order={trackingOrder}
        onSaved={async () => {
          await fetchModule('xnk_donhang', true);
        }}
      />

      {/* Cross-lifecycle Detail Modal */}
      <XnkChiTietModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        type={detailType}
        item={detailItem}
        onOpenEditYtuong={(idea) => {
          setSelectedYtuong(idea);
          setIsYtuongDrawerOpen(true);
        }}
        onOpenEditMau={(mau) => {
          setSelectedMau(mau);
          setIsMauDrawerOpen(true);
        }}
        onOpenEditPo={(po) => {
          setSelectedDonHang(po);
          setIsDonHangDrawerOpen(true);
        }}
        onOpenEditTracking={(po) => {
          setTrackingOrder(po);
          setIsTrackingModalOpen(true);
        }}
        onOpenCreateMau={handleCreateSampleFromIdea}
        onOpenCreatePo={() => {
          setSelectedDonHang(null);
          setIsDonHangDrawerOpen(true);
        }}
      />
    </div>
  );
}

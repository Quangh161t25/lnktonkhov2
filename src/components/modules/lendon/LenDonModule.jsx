import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { LenDonDrawer } from './LenDonDrawer';
import { LenDonPrintModal } from './LenDonPrintModal';
import { Pagination } from '../../common/Pagination';
import { ExcelUploadModal } from '../../common/ExcelUploadModal';
import { ColumnManagerModal } from '../../common/ColumnManagerModal';
import { useColumnManager } from '../../../hooks/useColumnManager';
import { exportToExcel, downloadModuleTemplate } from '../../../services/excelService';
import { formatNumber, formatCurrency, formatDateVN, parseSimpleSheetDate, cleanNumber, matchesSearch } from '../../../utils/formatters';
import { 
  Plus, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Search, 
  FileText, 
  Edit3, 
  Trash2,
  Printer, 
  CheckCircle2, 
  PackageCheck,
  Building2, 
  SlidersHorizontal,
  RotateCw,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  Layers,
  Clock,
  Sparkles
} from 'lucide-react';

const DEFAULT_LENDON_COLUMNS = [
  { key: 'ngay', label: 'Ngày lên đơn', width: 100, align: 'center', format: 'date' },
  { key: 'mdh', label: 'Mã đơn (MDH)', width: 120, align: 'left', format: 'bold' },
  { key: 'ma_kh', label: 'Mã KH', width: 95, align: 'left', format: 'default' },
  { key: 'ten_khach', label: 'Tên khách / NPP', width: 160, align: 'left', format: 'default' },
  { key: 'id_sp', label: 'Mã SP', width: 110, align: 'left', format: 'bold' },
  { key: 'ten_sp', label: 'Tên sản phẩm', width: 190, align: 'left', format: 'default' },
  { key: 'slg', label: 'SLG', width: 75, align: 'right', format: 'number' },
  { key: 'don_gia', label: 'Đơn giá (CN Giá)', width: 115, align: 'right', format: 'currency' },
  { key: 'thanh_tien', label: 'Thành tiền', width: 120, align: 'right', format: 'currency' },
  { key: 'kho', label: 'Kho', width: 85, align: 'center', format: 'badge' },
  { key: 'loai_hinh', label: 'Loại hình', width: 90, align: 'center', format: 'badge' },
  { key: 'trang_thai', label: 'Trạng thái', width: 105, align: 'center', format: 'badge' },
  { key: 'ghi_chu', label: 'Ghi chú', width: 140, align: 'left', format: 'default' },
  { key: 'actions', label: 'Thao tác', width: 100, align: 'center', format: 'default' },
];

const LOAI_HINH_OPTIONS = [
  'Thường',
  'Bảo hành'
];

const TRANG_THAI_OPTIONS = [
  'Chờ xuất',
  'Đã duyệt',
  'Đang xử lý',
  'Đã xuất',
  'Hoàn thành',
  'Đã hủy'
];

export function LenDonModule() {
  const { 
    lenDonData, 
    cngiaspData,
    appendRows, 
    updateRow, 
    deleteRow, 
    deleteOrder, 
    fetchModule, 
    loadingModules,
    getLatestPriceMap,
    getPriceAtDate,
    syncAllPricesToLenDon
  } = useData();

  const { currentUser, hasActionPermission, canAccessWarehouse, resolveRoleKey } = useAuth();
  const { getWarehouseOptions, getAllSystemWarehouses } = useSettings();

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
  } = useColumnManager('lendon', DEFAULT_LENDON_COLUMNS);

  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [loaiHinhFilter, setLoaiHinhFilter] = useState('');
  const [trangThaiFilter, setTrangThaiFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [maSpFilter, setMaSpFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editOrderRows, setEditOrderRows] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [printOrderRows, setPrintOrderRows] = useState(null);

  // Always fetch latest data on mount: both lendon and cngiasp (to guarantee latest prices)
  useEffect(() => {
    fetchModule('lendon');
    fetchModule('cngiasp');
  }, [fetchModule]);

  const handleRefresh = async () => {
    await Promise.all([
      fetchModule('lendon', true),
      fetchModule('cngiasp', true)
    ]);
  };

  const isLoading = Boolean(loadingModules?.lendon);
  const roleKey = currentUser ? resolveRoleKey(currentUser.role) : '';

  // Customer filter list
  const uniqueCustomerList = useMemo(() => {
    const map = new Map();
    (lenDonData || []).slice(1).forEach(r => {
      const maKh = (r[4] || '').toString().trim();
      const tenKh = (r[5] || '').toString().trim();
      if (maKh || tenKh) {
        const display = maKh && tenKh ? `${maKh} - ${tenKh}` : (maKh || tenKh);
        const key = display.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { display, maKh, tenKh });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.display.localeCompare(b.display));
  }, [lenDonData]);

  // Product filter list
  const uniqueProductList = useMemo(() => {
    const map = new Map();
    (lenDonData || []).slice(1).forEach(r => {
      const maSp = (r[6] || '').toString().trim();
      const tenSp = (r[7] || '').toString().trim();
      if (maSp) {
        const display = tenSp ? `${maSp} - ${tenSp}` : maSp;
        const key = maSp.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { display, maSp, tenSp });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.display.localeCompare(b.display));
  }, [lenDonData]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const rawRows = (lenDonData || []).slice(1).map((r, idx) => {
      const cloned = [...r];
      cloned._sheetRow = idx + 2;
      return cloned;
    });

    return rawRows.filter(row => {
      if (!row[1] && !row[3] && !row[6]) return false;

      // NPP Scope check
      if (roleKey === 'NPP') {
        const userCustId = (currentUser.id || '').toString().trim().toLowerCase();
        const rowCustId = (row[4] || '').toString().trim().toLowerCase();
        if (rowCustId !== userCustId) return false;
      }

      // NVKD Scope check
      if (roleKey === 'NVKD') {
        const userId = (currentUser.id || '').toString().trim().toLowerCase();
        const rowNv = (row[12] || '').toString().trim().toLowerCase();
        if (rowNv && rowNv !== userId) return false;
      }

      const kho = (row[11] || '').toString().trim();
      if (!canAccessWarehouse(kho)) return false;
      if (warehouseFilter && kho.toLowerCase() !== warehouseFilter.toLowerCase()) return false;

      // Loại hình
      const rawLoaiHinh = (row[14] || '').toString().trim();
      const normLoaiHinh = rawLoaiHinh.toLowerCase().includes('bảo hành') || rawLoaiHinh.toUpperCase() === 'BH' ? 'Bảo hành' : 'Thường';
      if (loaiHinhFilter && normLoaiHinh.toLowerCase() !== loaiHinhFilter.toLowerCase()) return false;

      // Trạng thái
      const rawTrangThai = (row[16] || 'Chờ xuất').toString().trim();
      if (trangThaiFilter && rawTrangThai.toLowerCase() !== trangThaiFilter.toLowerCase()) return false;

      // Khách hàng filter
      if (customerFilter) {
        const query = customerFilter.toLowerCase().trim();
        let targetMa = query;
        let targetTen = query;
        if (query.includes(' - ')) {
          const parts = query.split(' - ');
          targetMa = parts[0].trim();
          targetTen = parts[1].trim();
        }
        const rowMaKh = (row[4] || '').toString().toLowerCase();
        const rowTenKh = (row[5] || '').toString().toLowerCase();
        const rowCombo = `${rowMaKh} ${rowTenKh}`.toLowerCase();

        const isMatch = rowMaKh.includes(targetMa) || 
                        rowTenKh.includes(targetTen) || 
                        rowCombo.includes(query) ||
                        rowMaKh.includes(query) || 
                        rowTenKh.includes(query);
        if (!isMatch) return false;
      }

      // Mã SP filter
      if (maSpFilter) {
        const query = maSpFilter.toLowerCase().trim();
        let targetMa = query;
        let targetTen = query;
        if (query.includes(' - ')) {
          const parts = query.split(' - ');
          targetMa = parts[0].trim();
          targetTen = parts[1].trim();
        }
        const rowMaSp = (row[6] || '').toString().toLowerCase();
        const rowTenSp = (row[7] || '').toString().toLowerCase();
        const rowCombo = `${rowMaSp} ${rowTenSp}`.toLowerCase();

        const isMatch = rowMaSp.includes(targetMa) || 
                        rowTenSp.includes(targetTen) || 
                        rowCombo.includes(query) ||
                        rowMaSp.includes(query) || 
                        rowTenSp.includes(query);
        if (!isMatch) return false;
      }

      // Date range filter
      const rowDate = parseSimpleSheetDate(row[1]);
      if (dateFrom && rowDate < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && rowDate > new Date(`${dateTo}T23:59:59.999`)) return false;

      // Search term
      if (searchTerm) {
        const text = row.map(c => (c || '').toString()).join(' ');
        if (!matchesSearch(text, searchTerm)) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sắp xếp ngày mới nhất lên đầu
      const timeA = parseSimpleSheetDate(a[1]).getTime() || 0;
      const timeB = parseSimpleSheetDate(b[1]).getTime() || 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b._sheetRow || 0) - (a._sheetRow || 0);
    });
  }, [lenDonData, warehouseFilter, loaiHinhFilter, trangThaiFilter, customerFilter, maSpFilter, dateFrom, dateTo, searchTerm, roleKey, currentUser, canAccessWarehouse]);

  // Statistics
  const stats = useMemo(() => {
    const uniqueOrders = new Set();
    const uniqueProds = new Set();
    let totalQty = 0;
    let totalAmount = 0;
    let pendingOrders = 0;

    filteredRows.forEach(r => {
      const mdh = (r[3] || '').toString().trim();
      if (mdh) uniqueOrders.add(mdh);
      const idSp = (r[6] || '').toString().trim();
      if (idSp) uniqueProds.add(idSp);
      totalQty += cleanNumber(r[8]);
      totalAmount += cleanNumber(r[10]);
      const st = (r[16] || '').toString().trim();
      if (st === 'Chờ xuất' || st === 'Đang xử lý') {
        pendingOrders++;
      }
    });

    return {
      orderCount: uniqueOrders.size,
      totalQty,
      totalAmount,
      productCount: uniqueProds.size,
      pendingCount: pendingOrders
    };
  }, [filteredRows]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Handle Edit row / order
  const handleEditRow = (row) => {
    const mdh = (row[3] || '').toString().trim();
    const allOrderRows = (lenDonData || []).slice(1)
      .map((r, idx) => {
        const item = [...r];
        item._sheetRow = idx + 2;
        return item;
      })
      .filter(r => {
        if (mdh) {
          return (r[3] || '').toString().trim().toLowerCase() === mdh.toLowerCase();
        }
        return r._sheetRow === row._sheetRow;
      });

    setEditOrderRows(allOrderRows.length > 0 ? allOrderRows : [row]);
    setIsDrawerOpen(true);
  };

  // Handle Delete single row
  const handleDeleteRow = async (row) => {
    if (!hasActionPermission('lendon.manage') && !hasActionPermission('nx.delete')) {
      return alert("Bạn không có quyền xóa bản ghi lên đơn.");
    }
    const desc = `${row[3]} - ${row[6]} (${row[7]})`;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa dòng: ${desc}?`)) return;

    try {
      await deleteRow('lendon', row._sheetRow);
      await fetchModule('lendon');
    } catch (err) {
      alert("Lỗi khi xóa dòng: " + err.message);
    }
  };

  // Handle Delete entire order
  const handleDeleteOrder = async (mdh) => {
    if (!hasActionPermission('lendon.manage') && !hasActionPermission('nx.delete')) {
      return alert("Bạn không có quyền xóa đơn hàng.");
    }
    try {
      await deleteOrder('lendon', 3, mdh);
      await fetchModule('lendon');
      alert(`Đã xóa thành công đơn hàng ${mdh}.`);
    } catch (err) {
      alert("Lỗi khi xóa đơn hàng: " + err.message);
    }
  };

  // Handle Save Order from Drawer
  const handleSaveOrder = async ({ rowsToSave, deletedSheetRows }) => {
    try {
      const existingUpdates = rowsToSave.filter(item => item._sheetRow && item._sheetRow > 1);
      for (const item of existingUpdates) {
        await updateRow('lendon', item._sheetRow, item.rowValues);
      }

      const newRowsToAppend = rowsToSave
        .filter(item => !item._sheetRow || item._sheetRow <= 1)
        .map(item => item.rowValues);

      if (newRowsToAppend.length > 0) {
        await appendRows('lendon', newRowsToAppend);
      }

      if (deletedSheetRows && deletedSheetRows.length > 0) {
        for (const sheetRow of deletedSheetRows) {
          await deleteRow('lendon', sheetRow);
        }
      }

      await fetchModule('lendon');
    } catch (err) {
      console.error("handleSaveOrder lendon error:", err);
      throw err;
    }
  };

  // Handle quick status update
  const handleStatusChange = async (row, newStatus) => {
    if (!hasActionPermission('lendon.manage') && !hasActionPermission('nx.confirmWarehouse')) {
      return alert("Bạn không có quyền cập nhật trạng thái đơn.");
    }
    const updated = [...row];
    updated[16] = newStatus;
    try {
      await updateRow('lendon', row._sheetRow, updated);
      await fetchModule('lendon');
    } catch (err) {
      alert("Lỗi cập nhật trạng thái: " + err.message);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const headers = [
      'ID', 'Ngày lên đơn', 'Trường', 'MDH', 'Mã KH', 'Tên khách hàng',
      'Mã SP', 'Tên sản phẩm', 'Số lượng', 'Đơn giá', 'Thành tiền',
      'Kho', 'NV lên đơn', 'Ghi chú', 'Loại hình', 'SLG thực tế', 'Trạng thái'
    ];
    const data = [headers, ...filteredRows.map(r => r.slice(0, 17))];
    exportToExcel(data, `Danh_sach_len_don_${Date.now()}.xlsx`, 'LEN_DON');
  };

  // Import from Excel (with auto latest price lookup if don_gia is 0 or missing!)
  const handleImportExcelRows = async (excelRows) => {
    try {
      const dataRows = excelRows.slice(1).filter(r => r.some(c => c !== ''));
      if (dataRows.length === 0) {
        alert("Không tìm thấy dòng dữ liệu nào trong file Excel.");
        return;
      }

      const latestPrices = getLatestPriceMap ? getLatestPriceMap() : new Map();
      const userName = currentUser?.name || currentUser?.id || '';

      const normalizedRows = dataRows.map((r, idx) => {
        const idSp = (r[6] || '').toString().trim().toUpperCase();
        const orderDate = r[1] || formatDateVN(new Date());
        let donGia = cleanNumber(r[9]);
        const slg = cleanNumber(r[8]) || 1;

        // If don_gia is missing, automatically pick from CN GIÁ SP based on order date
        if (!donGia && idSp && getPriceAtDate) {
          const priceInfo = getPriceAtDate(idSp, orderDate);
          donGia = priceInfo.price || 0;
        }

        const thanhTien = cleanNumber(r[10]) || (slg * donGia);

        return [
          r[0] || `LD-${Date.now()}-${idx + 1}`,
          orderDate,
          r[2] || 'LÊN ĐƠN',
          r[3] || `LD${Date.now()}`,
          r[4] || '',
          r[5] || '',
          idSp,
          r[7] || '',
          slg,
          donGia,
          thanhTien,
          r[11] || 'KHO 1',
          r[12] || userName,
          r[13] || '',
          r[14] || 'Thường',
          r[15] !== undefined ? cleanNumber(r[15]) : slg,
          r[16] || 'Chờ xuất'
        ];
      });

      await appendRows('lendon', normalizedRows);
      await fetchModule('lendon');
      alert(`Đã nhập thành công ${normalizedRows.length} dòng lên đơn.`);
    } catch (err) {
      alert("Lỗi khi import Excel: " + err.message);
    }
  };

  // Print modal trigger
  const handleOpenPrintPreview = (mdh) => {
    const matching = (lenDonData || []).slice(1).filter(r => r[3] === mdh);
    if (matching.length > 0) {
      setPrintOrderRows(matching);
    }
  };

  // Sync all prices from CN GIÁ SP
  const handleSyncPrices = async () => {
    if (!window.confirm("Hệ thống sẽ rà soát tất cả đơn hàng và áp dụng giá bán theo ngày lên đơn từ module CN GIÁ SP. Tiếp tục?")) return;
    try {
      const count = await syncAllPricesToLenDon();
      alert(`Đã kiểm tra và cập nhật lại đơn giá theo ngày hiệu lực cho ${count} dòng đơn hàng.`);
    } catch (err) {
      alert("Lỗi khi cập nhật giá đơn hàng: " + err.message);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Top Banner / Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng số đơn</p>
            <h3 className="text-xl font-extrabold text-blue-700 mt-0.5">{formatNumber(stats.orderCount)}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{stats.productCount} mã sản phẩm</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng SL đặt</p>
            <h3 className="text-xl font-extrabold text-indigo-700 mt-0.5">{formatNumber(stats.totalQty)}</h3>
            <p className="text-[10px] text-indigo-500 mt-0.5">Sản phẩm lên đơn</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng giá trị đơn</p>
            <h3 className="text-xl font-extrabold text-rose-600 mt-0.5">{formatCurrency(stats.totalAmount)}</h3>
            <p className="text-[10px] text-emerald-600 mt-0.5 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Giá theo CN Giá SP
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đơn chờ xuất</p>
            <h3 className="text-xl font-extrabold text-amber-600 mt-0.5">{formatNumber(stats.pendingCount)}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Cần đóng gói / xuất kho</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Main action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setEditOrderRows(null);
                setIsDrawerOpen(true);
              }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-4 h-4" />
              Lên đơn mới
            </button>

            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-medium text-slate-700 transition flex items-center gap-1.5 text-xs"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              Nhập Excel
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-medium text-slate-700 transition flex items-center gap-1.5 text-xs"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Xuất Excel
            </button>

            <button
              onClick={() => downloadModuleTemplate('lendon')}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-medium text-slate-700 transition flex items-center gap-1.5 text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              File mẫu
            </button>

            <button
              onClick={handleSyncPrices}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg font-bold text-amber-800 transition flex items-center gap-1.5 text-xs shadow-2xs"
              title="Rà soát và cập nhật lại đơn giá các đơn hàng theo bảng giá mới nhất từ CN Giá SP"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Cập nhật giá theo CN Giá SP
            </button>
          </div>

          {/* Right Toolbar: Column config & Refresh */}
          <div className="flex items-center gap-2">
            <button
              onClick={openConfigModal}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 text-xs shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              Tùy chỉnh cột
            </button>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className={`p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 shadow-2xs transition ${isLoading ? 'animate-spin' : ''}`}
              title="Làm mới dữ liệu"
            >
              <RotateCw className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo MDH, Khách, Mã SP, Ghi chú..."
              className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-medium bg-slate-50/50"
            />
          </div>

          {/* Kho Filter */}
          <div>
            <select
              value={warehouseFilter}
              onChange={(e) => {
                setWarehouseFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-medium bg-slate-50/50"
            >
              {getWarehouseOptions().length > 1 && (
                <option value="">{getWarehouseOptions().length === (getAllSystemWarehouses ? getAllSystemWarehouses().length : 0) ? 'Tất cả kho' : 'Tất cả kho phụ trách'}</option>
              )}
              {getWarehouseOptions().map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* Khách hàng Filter */}
          <div>
            <input
              list="lendon-customer-filter"
              type="text"
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tất cả khách hàng..."
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-medium bg-slate-50/50"
            />
            <datalist id="lendon-customer-filter">
              {uniqueCustomerList.map(c => (
                <option key={c.display} value={c.display} />
              ))}
            </datalist>
          </div>

          {/* Mã SP Filter */}
          <div>
            <input
              list="lendon-prod-filter"
              type="text"
              value={maSpFilter}
              onChange={(e) => {
                setMaSpFilter(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tất cả sản phẩm..."
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-medium bg-slate-50/50"
            />
            <datalist id="lendon-prod-filter">
              {uniqueProductList.map(p => (
                <option key={p.display} value={p.display} />
              ))}
            </datalist>
          </div>

          {/* Trạng thái Filter */}
          <div>
            <select
              value={trangThaiFilter}
              onChange={(e) => {
                setTrangThaiFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-medium bg-slate-50/50"
            >
              <option value="">Tất cả trạng thái</option>
              {TRANG_THAI_OPTIONS.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Date from -> Date to */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-1/2 px-1 py-1.5 border border-slate-200 rounded-lg text-[11px] font-medium bg-slate-50/50"
              title="Từ ngày"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-1/2 px-1 py-1.5 border border-slate-200 rounded-lg text-[11px] font-medium bg-slate-50/50"
              title="Đến ngày"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 select-none text-[11px]">
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width ? `${col.width}px` : 'auto' }}
                    className={`py-2.5 px-3 whitespace-nowrap text-${col.align || 'left'}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="py-12 text-center text-slate-400 italic">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
                      <span>Đang tải danh sách đơn hàng...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="py-12 text-center text-slate-400 italic">
                    Không tìm thấy dữ liệu đơn hàng nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const trangThai = (row[16] || 'Chờ xuất').toString().trim();
                  const isDone = trangThai === 'Hoàn thành' || trangThai === 'Đã xuất';
                  const isPending = trangThai === 'Chờ xuất';

                  return (
                    <tr 
                      key={row._sheetRow || idx} 
                      className="hover:bg-blue-50/30 transition group"
                    >
                      {visibleColumns.map((col) => {
                        if (col.key === 'ngay') {
                          return (
                            <td key={col.key} className="py-2.5 px-3 text-center whitespace-nowrap text-slate-600 font-medium">
                              {formatDateVN(row[1])}
                            </td>
                          );
                        }
                        if (col.key === 'mdh') {
                          return (
                            <td key={col.key} className="py-2.5 px-3 whitespace-nowrap">
                              <span 
                                onClick={() => handleEditRow(row)}
                                className="font-bold text-blue-600 hover:underline cursor-pointer"
                                title="Nhấp để xem & sửa toàn bộ đơn"
                              >
                                {row[3] || '---'}
                              </span>
                            </td>
                          );
                        }
                        if (col.key === 'ma_kh') {
                          return (
                            <td key={col.key} className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-medium">
                              {row[4] || '---'}
                            </td>
                          );
                        }
                        if (col.key === 'ten_khach') {
                          return (
                            <td key={col.key} className="py-2.5 px-3 max-w-[180px] truncate text-slate-800 font-medium" title={row[5]}>
                              {row[5] || '---'}
                            </td>
                          );
                        }
                        if (col.key === 'id_sp') {
                          return (
                            <td key={col.key} className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-800">
                              {row[6] || '---'}
                            </td>
                          );
                        }
                        if (col.key === 'ten_sp') {
                          return (
                            <td key={col.key} className="py-2.5 px-3 max-w-[220px] truncate text-slate-700" title={row[7]}>
                              {row[7] || '---'}
                            </td>
                          );
                        }
                        if (col.key === 'slg') {
                          return (
                            <td key={col.key} className="py-2.5 px-3 text-right whitespace-nowrap font-extrabold text-blue-700">
                              {formatNumber(row[8])}
                            </td>
                          );
                        }
                        if (col.key === 'don_gia') {
                          return (
                            <td key={col.key} className="py-2.5 px-3 text-right whitespace-nowrap font-semibold text-emerald-700">
                              {formatCurrency(row[9])}
                            </td>
                          );
                        }
                        if (col.key === 'thanh_tien') {
                          return (
                            <td key={col.key} className="py-2.5 px-3 text-right whitespace-nowrap font-extrabold text-rose-600">
                              {formatCurrency(row[10])}
                            </td>
                          );
                        }
                        if (col.key === 'kho') {
                          return (
                            <td key={col.key} className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                                {row[11] || '---'}
                              </span>
                            </td>
                          );
                        }
                        if (col.key === 'loai_hinh') {
                          const lh = (row[14] || 'Thường').toString().trim();
                          const isBh = lh.toLowerCase().includes('bảo hành') || lh.toUpperCase() === 'BH';
                          return (
                            <td key={col.key} className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                isBh ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {isBh ? 'Bảo hành' : 'Thường'}
                              </span>
                            </td>
                          );
                        }
                        if (col.key === 'trang_thai') {
                          return (
                            <td key={col.key} className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isDone 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : isPending 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : 'bg-blue-100 text-blue-800'
                              }`}>
                                {trangThai}
                              </span>
                            </td>
                          );
                        }
                        if (col.key === 'ghi_chu') {
                          return (
                            <td key={col.key} className="py-2.5 px-3 max-w-[150px] truncate text-slate-500 text-[11px]" title={row[13]}>
                              {row[13] || '---'}
                            </td>
                          );
                        }
                        if (col.key === 'actions') {
                          return (
                            <td key={col.key} className="py-2.5 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPrintPreview(row[3])}
                                  className="p-1 text-slate-400 hover:text-blue-600 transition rounded hover:bg-blue-50"
                                  title="In phiếu lên đơn"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditRow(row)}
                                  className="p-1 text-slate-400 hover:text-amber-600 transition rounded hover:bg-amber-50"
                                  title="Chỉnh sửa đơn"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition rounded hover:bg-rose-50"
                                  title="Xóa dòng"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td key={col.key} className="py-2.5 px-3">
                            {row[col.key] || ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 border-t border-slate-200">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredRows.length / pageSize) || 1}
            totalItems={filteredRows.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Drawer Form Lên đơn */}
      {isDrawerOpen && (
        <LenDonDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setEditOrderRows(null);
          }}
          editOrderRows={editOrderRows}
          onSaved={handleSaveOrder}
          onDeleteOrder={handleDeleteOrder}
        />
      )}

      {/* Modal In phiếu */}
      {printOrderRows && (
        <LenDonPrintModal
          isOpen={Boolean(printOrderRows)}
          onClose={() => setPrintOrderRows(null)}
          orderRows={printOrderRows}
        />
      )}

      {/* Modal Tải lên Excel */}
      {isExcelModalOpen && (
        <ExcelUploadModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          onUploadSuccess={handleImportExcelRows}
          moduleName="lendon"
          title="Nhập danh sách Lên đơn từ Excel"
        />
      )}

      {/* Modal Cấu hình Cột */}
      {isConfigModalOpen && (
        <ColumnManagerModal
          isOpen={isConfigModalOpen}
          onClose={closeConfigModal}
          columns={columns}
          onToggleVisibility={toggleVisibility}
          onUpdateProp={updateColumnProp}
          onMoveColumn={moveColumn}
          onResetDefault={resetToDefault}
        />
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { NhapDrawer } from './NhapDrawer';
import { Pagination } from '../../common/Pagination';
import { ExcelUploadModal } from '../../common/ExcelUploadModal';
import { BarcodeScannerModal } from '../../common/BarcodeScannerModal';
import { OcrOrderModal } from '../../common/OcrOrderModal';
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
  Package,
  Layers,
  Building2,
  SlidersHorizontal,
  RotateCw
} from 'lucide-react';

const DEFAULT_NHAP_COLUMNS = [
  { key: 'ngay', label: 'Ngày', width: 95, align: 'left', format: 'date' },
  { key: 'mdh', label: 'Mã đơn (MDH)', width: 120, align: 'left', format: 'bold' },
  { key: 'ma_kh', label: 'Mã KH', width: 100, align: 'left', format: 'default' },
  { key: 'ten_khach', label: 'Tên khách / NCC', width: 160, align: 'left', format: 'default' },
  { key: 'id_sp', label: 'Mã SP', width: 110, align: 'left', format: 'bold' },
  { key: 'ten_sp', label: 'Tên sản phẩm', width: 180, align: 'left', format: 'default' },
  { key: 'slg', label: 'SLG', width: 75, align: 'right', format: 'number' },
  { key: 'don_gia', label: 'Đơn giá', width: 105, align: 'right', format: 'currency' },
  { key: 'thanh_tien', label: 'Thành tiền', width: 115, align: 'right', format: 'currency' },
  { key: 'kho', label: 'Kho', width: 85, align: 'left', format: 'badge' },
  { key: 'loai_hinh', label: 'Loại hình', width: 95, align: 'left', format: 'badge' },
  { key: 'ghi_chu', label: 'Ghi chú', width: 140, align: 'left', format: 'default' },
  { key: 'actions', label: 'Thao tác', width: 80, align: 'center', format: 'default' },
];

const LOAI_HINH_OPTIONS = [
  'Thường',
  'Bảo hành'
];

export function NhapModule() {
  const { nhapData, appendRows, updateRow, deleteRow, deleteOrder, fetchModule, loadingModules } = useData();
  const { currentUser, hasActionPermission, canAccessWarehouse } = useAuth();
  const { getWarehouseOptions } = useSettings();

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
    reorderColumns,
    setAllVisibility,
    resetToDefault
  } = useColumnManager('nhap', DEFAULT_NHAP_COLUMNS);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [loaiHinhFilter, setLoaiHinhFilter] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');
  const [maSpFilter, setMaSpFilter] = useState('');

  // Always fetch latest nhap data on mount
  React.useEffect(() => {
    fetchModule('nhap');
  }, [fetchModule]);

  const handleRefresh = async () => {
    await fetchModule('nhap', true);
  };

  const isLoading = Boolean(loadingModules?.nhap);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Modals state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editOrderRows, setEditOrderRows] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  // Autocomplete lists for filters: Partner list with Mã + Tên NCC/KH
  const uniquePartnerList = useMemo(() => {
    const map = new Map();
    (nhapData || []).slice(1).forEach(r => {
      const ma = (r[4] || '').toString().trim();
      const ten = (r[5] || '').toString().trim();
      if (ma || ten) {
        const display = ma && ten ? `${ma} - ${ten}` : (ma || ten);
        const key = display.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { display, ma, ten });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.display.localeCompare(b.display));
  }, [nhapData]);

  // Autocomplete list for products with Mã SP + Tên SP
  const uniqueProductList = useMemo(() => {
    const map = new Map();
    (nhapData || []).slice(1).forEach(r => {
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
  }, [nhapData]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const rawRows = (nhapData || []).slice(1).map((r, idx) => {
      const cloned = [...r];
      cloned._sheetRow = idx + 2;
      return cloned;
    });

    return rawRows.filter(row => {
      // Must have at least a date, MDH or product
      if (!row[1] && !row[3] && !row[6]) return false;

      // Warehouse filter
      const kho = (row[11] || '').toString().trim();
      if (!canAccessWarehouse(kho)) return false;
      if (warehouseFilter && kho.toLowerCase() !== warehouseFilter.toLowerCase()) return false;

      // Loại hình filter
      const rawLoaiHinh = (row[14] || '').toString().trim();
      const normLoaiHinh = rawLoaiHinh.toLowerCase().includes('bảo hành') || rawLoaiHinh.toUpperCase() === 'BH' ? 'Bảo hành' : 'Thường';
      if (loaiHinhFilter && normLoaiHinh.toLowerCase() !== loaiHinhFilter.toLowerCase()) return false;

      // Partner filter (Mã hoặc Tên NCC/KH)
      if (partnerFilter) {
        const query = partnerFilter.toLowerCase().trim();
        let targetMa = query;
        let targetTen = query;
        if (query.includes(' - ')) {
          const parts = query.split(' - ');
          targetMa = parts[0].trim();
          targetTen = parts[1].trim();
        }
        const rowMa = (row[4] || '').toString().toLowerCase();
        const rowTen = (row[5] || '').toString().toLowerCase();
        const rowCombo = `${rowMa} ${rowTen}`.toLowerCase();

        const isMatch = rowMa.includes(targetMa) || 
                        rowTen.includes(targetTen) || 
                        rowCombo.includes(query) ||
                        rowMa.includes(query) || 
                        rowTen.includes(query);
        if (!isMatch) return false;
      }

      // Mã SP & Tên SP filter
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
      return parseSimpleSheetDate(b[1]).getTime() - parseSimpleSheetDate(a[1]).getTime();
    });
  }, [nhapData, warehouseFilter, loaiHinhFilter, partnerFilter, maSpFilter, dateFrom, dateTo, searchTerm, canAccessWarehouse]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Handle opening Drawer for edit (loads ALL products for that MDH)
  const handleEditRow = (row) => {
    const mdh = (row[3] || '').toString().trim();
    
    // Find all rows in nhapData matching this order MDH
    const allOrderRows = (nhapData || []).slice(1)
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

  // Handle single row deletion
  const handleDeleteRow = async (row) => {
    const sheetRow = row._sheetRow;
    if (!sheetRow) return;
    const desc = `${row[3]} - ${row[6]} (${row[7] || ''})`;
    if (window.confirm(`Bạn có chắc chắn muốn xóa dòng: ${desc}?`)) {
      try {
        await deleteRow('nhap', sheetRow);
        await fetchModule('nhap');
      } catch (err) {
        alert("Lỗi khi xóa dòng: " + err.message);
      }
    }
  };

  // Handle entire order deletion
  const handleDeleteOrder = async (mdh) => {
    if (!mdh) return;
    try {
      await deleteOrder('nhap', mdh);
      await fetchModule('nhap');
    } catch (err) {
      alert("Lỗi khi xóa đơn: " + err.message);
    }
  };

  // Handle saving order from Drawer
  const handleSaveOrder = async ({ rowsToSave, deletedSheetRows }) => {
    try {
      // 1. Update existing sheet rows
      const existingUpdates = rowsToSave.filter(item => item._sheetRow && item._sheetRow > 1);
      for (const item of existingUpdates) {
        await updateRow('nhap', item._sheetRow, item.rowValues);
      }

      // 2. Batch append any newly added rows
      const newRowsToAppend = rowsToSave
        .filter(item => !item._sheetRow || item._sheetRow <= 1)
        .map(item => item.rowValues);

      if (newRowsToAppend.length > 0) {
        await appendRows('nhap', newRowsToAppend);
      }

      // 3. Clear any deleted sheet rows
      if (deletedSheetRows && deletedSheetRows.length > 0) {
        for (const sheetRow of deletedSheetRows) {
          await deleteRow('nhap', sheetRow);
        }
      }

      // 4. Refresh module data
      await fetchModule('nhap');
    } catch (err) {
      console.error("handleSaveOrder error:", err);
      throw err;
    }
  };

  // Excel export
  const handleExportExcel = () => {
    const headers = [
      'ID', 'Ngày nhập', 'Trường', 'MDH', 'Mã NCC/KH', 'Tên Nhà Cung Cấp',
      'Mã SP', 'Tên sản phẩm', 'Số lượng', 'Đơn giá', 'Thành tiền',
      'Kho', 'NV nhận', 'Ghi chú', 'Loại hình', 'Ngày đặt hàng', 'Tình trạng'
    ];
    const data = [headers, ...filteredRows.map(r => r.slice(0, 17))];
    exportToExcel(data, `Danh_sach_nhap_${Date.now()}.xlsx`, 'NHAP_CT');
  };

  // Excel import
  const handleImportExcelRows = async (excelRows) => {
    try {
      const dataRows = excelRows.slice(1).filter(r => r.some(c => c !== ''));
      if (dataRows.length > 0) {
        await appendRows('nhap', dataRows);
        await fetchModule('nhap');
        alert(`Đã nhập thành công ${dataRows.length} dòng.`);
      }
    } catch (err) {
      alert("Lỗi khi import Excel: " + err.message);
    }
  };

  // Quick Date presets
  const setQuickDate = (type) => {
    const now = new Date();
    if (type === 'today') {
      const str = now.toISOString().slice(0, 10);
      setDateFrom(str);
      setDateTo(str);
    } else if (type === 'week') {
      const day = now.getDay() || 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - day + 1);
      setDateFrom(monday.toISOString().slice(0, 10));
      setDateTo(now.toISOString().slice(0, 10));
    } else if (type === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(firstDay.toISOString().slice(0, 10));
      setDateTo(now.toISOString().slice(0, 10));
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-2">
      {/* Top Controls: Search, Filters & Action Buttons */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm kiếm theo mã đơn (MDH), NCC, mã sản phẩm, ghi chú..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {hasActionPermission('nx.manualAdd') && (
              <button
                onClick={() => {
                  setEditOrderRows(null);
                  setIsDrawerOpen(true);
                }}
                className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700 shadow-sm transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm phiếu nhập
              </button>
            )}

            {hasActionPermission('nx.upload') && (
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="px-2.5 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-200 transition flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Nhập Excel
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs hover:bg-emerald-100 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Xuất Excel
            </button>

            <button
              onClick={() => downloadModuleTemplate('nhap')}
              className="px-2.5 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 transition flex items-center gap-1.5"
              title="Tải mẫu Excel nhập liệu chuẩn"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              Mẫu Excel
            </button>

            <button
              onClick={() => setIsOcrModalOpen(true)}
              className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs hover:bg-indigo-100 transition flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Quét OCR
            </button>

            <button
              onClick={openConfigModal}
              className="px-2.5 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 transition flex items-center gap-1.5"
              title="Tùy chỉnh cột hiển thị (ẩn/hiện, thứ tự, kích thước, định dạng)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              Cột
            </button>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-2.5 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 transition flex items-center gap-1.5 disabled:opacity-50"
              title="Làm mới & đồng bộ số liệu mới nhất từ Google Sheets"
            >
              <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-100 text-xs">
          {/* Kho filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Kho:</span>
            <select
              value={warehouseFilter}
              onChange={(e) => {
                setWarehouseFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">Tất cả kho</option>
              {getWarehouseOptions().map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          {/* Loại hình filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Loại hình:</span>
            <select
              value={loaiHinhFilter}
              onChange={(e) => {
                setLoaiHinhFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">Tất cả loại hình</option>
              {LOAI_HINH_OPTIONS.map(lh => (
                <option key={lh} value={lh}>{lh}</option>
              ))}
            </select>
          </div>

          {/* Đối tác (Mã + Tên NCC/KH) */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Đối tác:</span>
            <input
              type="text"
              value={partnerFilter}
              onChange={(e) => {
                setPartnerFilter(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Mã hoặc tên NCC/KH..."
              list="nhap-partner-list"
              className="w-36 sm:w-48 px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <datalist id="nhap-partner-list">
              {uniquePartnerList.map(item => (
                <option key={item.display} value={item.display} />
              ))}
            </datalist>
          </div>

          {/* Sản phẩm (Mã SP + Tên SP) */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Sản phẩm:</span>
            <input
              type="text"
              value={maSpFilter}
              onChange={(e) => {
                setMaSpFilter(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Mã hoặc tên SP..."
              list="nhap-masp-list"
              className="w-36 sm:w-48 px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <datalist id="nhap-masp-list">
              {uniqueProductList.map(item => (
                <option key={item.display} value={item.display} />
              ))}
            </datalist>
          </div>

          {/* Date Range filters */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Từ:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded-md text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Đến:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded-md text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Quick Date Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
            <button
              onClick={() => setQuickDate('today')}
              className="px-2 py-0.5 rounded hover:bg-white text-slate-600 hover:text-slate-900 transition"
            >
              Hôm nay
            </button>
            <button
              onClick={() => setQuickDate('week')}
              className="px-2 py-0.5 rounded hover:bg-white text-slate-600 hover:text-slate-900 transition"
            >
              Tuần này
            </button>
            <button
              onClick={() => setQuickDate('month')}
              className="px-2 py-0.5 rounded hover:bg-white text-slate-600 hover:text-slate-900 transition"
            >
              Tháng này
            </button>
          </div>

          {/* Clear filters button */}
          {(warehouseFilter || loaiHinhFilter || partnerFilter || maSpFilter || dateFrom || dateTo || searchTerm) && (
            <button
              onClick={() => {
                setWarehouseFilter('');
                setLoaiHinhFilter('');
                setPartnerFilter('');
                setMaSpFilter('');
                setDateFrom('');
                setDateTo('');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="text-xs text-blue-600 font-bold hover:underline ml-auto"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Main Table: Nhà cung cấp placed BEFORE Mã SP, Dynamic columns based on visibleColumns */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-210px)] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                {visibleColumns.map(col => {
                  const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                  const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};
                  return (
                    <th 
                      key={col.key}
                      style={widthStyle}
                      className={`py-2 px-2.5 whitespace-nowrap ${alignClass}`}
                    >
                      {col.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, idx) => {
                  const rawLoaiHinh = (row[14] || '').toString().trim();
                  const isBH = rawLoaiHinh.toLowerCase().includes('bảo hành') || rawLoaiHinh.toUpperCase() === 'BH';

                  return (
                    <tr key={idx} className="hover:bg-blue-50/40 transition">
                      {visibleColumns.map(col => {
                        const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                        const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};
                        const isCustomBold = col.format === 'bold';
                        const isCustomUpper = col.format === 'uppercase';

                        switch (col.key) {
                          case 'ngay':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-slate-600 font-medium ${alignClass} ${isCustomBold ? 'font-bold' : ''} ${isCustomUpper ? 'uppercase' : ''}`}>
                                {formatDateVN(row[1])}
                              </td>
                            );

                          case 'mdh':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-bold text-blue-600 ${alignClass} ${isCustomUpper ? 'uppercase' : ''}`}>
                                {row[3]}
                              </td>
                            );

                          case 'ma_kh':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-semibold text-slate-700 ${alignClass} ${isCustomBold ? 'font-bold' : ''} ${isCustomUpper ? 'uppercase' : ''}`}>
                                {row[4] || '-'}
                              </td>
                            );

                          case 'ten_khach':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 text-slate-700 font-medium ${alignClass} ${isCustomBold ? 'font-bold' : ''} ${isCustomUpper ? 'uppercase' : ''}`}>
                                <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                                  <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{row[5] || '-'}</span>
                                </div>
                              </td>
                            );

                          case 'id_sp':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-bold text-slate-800 ${alignClass} ${isCustomUpper ? 'uppercase' : ''}`}>
                                {row[6]}
                              </td>
                            );

                          case 'ten_sp':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 text-slate-600 font-medium ${alignClass} ${isCustomBold ? 'font-bold' : ''} ${isCustomUpper ? 'uppercase' : ''}`}>
                                {row[7]}
                              </td>
                            );

                          case 'slg':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-extrabold text-blue-600 ${alignClass} ${isCustomUpper ? 'uppercase' : ''}`}>
                                {formatNumber(row[8])}
                              </td>
                            );

                          case 'don_gia':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-slate-500 ${alignClass} ${isCustomBold ? 'font-bold' : ''}`}>
                                {col.format === 'number' ? formatNumber(row[9]) : formatCurrency(row[9])}
                              </td>
                            );

                          case 'thanh_tien':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-bold text-slate-800 ${alignClass}`}>
                                {col.format === 'number' ? formatNumber(row[10]) : formatCurrency(row[10])}
                              </td>
                            );

                          case 'kho':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                                <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                                  {row[11]}
                                </span>
                              </td>
                            );

                          case 'loai_hinh':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                                <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                  isBH 
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200/60' 
                                    : 'bg-blue-50 text-blue-700 border border-blue-100'
                                }`}>
                                  {isBH ? 'Bảo hành' : 'Thường'}
                                </span>
                              </td>
                            );

                          case 'ghi_chu':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 text-slate-500 max-w-[160px] truncate ${alignClass} ${isCustomBold ? 'font-bold' : ''}`} title={row[13]}>
                                {row[13]}
                              </td>
                            );

                          case 'actions':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleEditRow(row)}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                    title={`Chỉnh sửa đơn nhập ${row[3]}`}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  {(hasActionPermission('nx.delete') || currentUser?.role === 'ADMIN') && (
                                    <button
                                      onClick={() => handleDeleteRow(row)}
                                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                      title="Xóa dòng này"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            );

                          default:
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 ${alignClass}`}>
                                -
                              </td>
                            );
                        }
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length || 13} className="p-12 text-center text-slate-400 italic">
                    Không tìm thấy dữ liệu phiếu nhập kho nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredRows.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Column Manager Modal */}
      <ColumnManagerModal
        isOpen={isConfigModalOpen}
        onClose={closeConfigModal}
        columns={columns}
        toggleVisibility={toggleVisibility}
        updateColumnProp={updateColumnProp}
        moveColumn={moveColumn}
        reorderColumns={reorderColumns}
        setAllVisibility={setAllVisibility}
        resetToDefault={resetToDefault}
      />

      {/* Drawer for Add / Edit (Opens ALL items of the MDH) */}
      <NhapDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditOrderRows(null);
        }}
        editOrderRows={editOrderRows}
        onSaved={handleSaveOrder}
        onDeleteOrder={handleDeleteOrder}
        onOpenBarcodeScan={() => setIsBarcodeModalOpen(true)}
      />

      {/* Excel Upload Modal */}
      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        moduleName="nhap"
        onImportRows={handleImportExcelRows}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onDetected={(code) => {
          setSearchTerm(code);
        }}
      />

      {/* OCR Modal */}
      <OcrOrderModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onApplyItems={() => {
          setIsDrawerOpen(true);
        }}
      />
    </div>
  );
}

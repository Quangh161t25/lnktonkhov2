import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { CngiaspDrawer } from './CngiaspDrawer';
import { Pagination } from '../../common/Pagination';
import { ExcelUploadModal } from '../../common/ExcelUploadModal';
import { ColumnManagerModal } from '../../common/ColumnManagerModal';
import { useColumnManager } from '../../../hooks/useColumnManager';
import { exportToExcel, downloadModuleTemplate } from '../../../services/excelService';
import { 
  formatNumber, 
  formatCurrency, 
  cleanNumber, 
  matchesSearch, 
  parseSimpleSheetDate, 
  formatDateVN 
} from '../../../utils/formatters';
import { 
  Plus, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Search, 
  Edit3, 
  Trash2, 
  RotateCw, 
  SlidersHorizontal,
  BadgePercent,
  Calendar,
  TrendingUp,
  TrendingDown,
  Tag,
  DollarSign,
  ShoppingCart
} from 'lucide-react';

const DEFAULT_CNGIASP_COLUMNS = [
  { key: 'ngay_cap_nhat', label: 'Ngày cập nhật', width: 110, align: 'center', format: 'default' },
  { key: 'ma_sp', label: 'Mã sản phẩm', width: 130, align: 'left', format: 'bold' },
  { key: 'ten_sp', label: 'Tên sản phẩm', width: 220, align: 'left', format: 'default' },
  { key: 'gia_ban', label: 'Giá bán mới', width: 115, align: 'right', format: 'currency' },
  { key: 'gia_cu', label: 'Giá cũ', width: 110, align: 'right', format: 'currency' },
  { key: 'chenh_lech', label: 'Chênh lệch', width: 110, align: 'right', format: 'currency' },
  { key: 'gia_nhap', label: 'Giá nhập', width: 110, align: 'right', format: 'currency' },
  { key: 'nguoi_cap_nhat', label: 'Người cập nhật', width: 130, align: 'left', format: 'default' },
  { key: 'ghi_chu', label: 'Ghi chú', width: 180, align: 'left', format: 'default' },
  { key: 'trang_thai', label: 'Trạng thái', width: 100, align: 'center', format: 'badge' },
  { key: 'actions', label: 'Thao tác', width: 80, align: 'center', format: 'default' },
];

export function CngiaspModule() {
  const { 
    cngiaspData, 
    appendRow, 
    appendRows, 
    updateRow, 
    deleteRow, 
    fetchModule, 
    loadingModules,
    syncProductPriceToLenDon,
    syncAllPricesToLenDon
  } = useData();
  const { currentUser, hasActionPermission } = useAuth();

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
  } = useColumnManager('cngiasp', DEFAULT_CNGIASP_COLUMNS);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Always fetch latest cngiasp data on mount
  useEffect(() => {
    fetchModule('cngiasp');
  }, [fetchModule]);

  const handleRefresh = async () => {
    await fetchModule('cngiasp', true);
  };

  const isLoading = Boolean(loadingModules?.cngiasp);

  // Parse and sort rows: SẮP XẾP NGÀY LỚN TỚI BÉ (mới nhất lên đầu)
  const sortedRows = useMemo(() => {
    const rawRows = (cngiaspData || []).slice(1).map((r, idx) => {
      const cloned = [...r];
      cloned._sheetRow = idx + 2;
      return cloned;
    });

    return rawRows.sort((a, b) => {
      const dateA = parseSimpleSheetDate(a[1]);
      const dateB = parseSimpleSheetDate(b[1]);
      const timeA = Number.isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = Number.isNaN(dateB.getTime()) ? 0 : dateB.getTime();

      // Sắp xếp ngày lớn tới bé
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      // Nếu cùng ngày, dòng ở dưới sheet (sheetRow lớn hơn) xếp trước
      return (b._sheetRow || 0) - (a._sheetRow || 0);
    });
  }, [cngiaspData]);

  // Search filter
  const filteredRows = useMemo(() => {
    return sortedRows.filter(row => {
      if (!searchTerm) return true;
      const text = `${row[1] || ''} ${row[2] || ''} ${row[3] || ''} ${row[8] || ''} ${row[9] || ''} ${row[10] || ''}`;
      return matchesSearch(text, searchTerm);
    });
  }, [sortedRows, searchTerm]);

  // Pagination
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Quick stats
  const stats = useMemo(() => {
    let totalRecords = sortedRows.length;
    let productsSet = new Set();
    let priceIncreases = 0;
    let priceDecreases = 0;

    sortedRows.forEach(r => {
      const idSp = (r[2] || '').toString().trim().toLowerCase();
      if (idSp) productsSet.add(idSp);
      const diff = cleanNumber(r[7]);
      if (diff > 0) priceIncreases++;
      else if (diff < 0) priceDecreases++;
    });

    return {
      totalRecords,
      totalProducts: productsSet.size,
      priceIncreases,
      priceDecreases
    };
  }, [sortedRows]);

  // Handlers for Save / Edit / Delete
  const handleSaveRow = async (rowValues, sheetRow) => {
    try {
      if (sheetRow && sheetRow > 1) {
        await updateRow('cngiasp', sheetRow, rowValues);
      } else {
        await appendRow('cngiasp', rowValues);
      }
      await fetchModule('cngiasp', true);

      // Tự động cập nhật lại giá cho các đơn hàng trong module Lên đơn theo ngày hiệu lực
      const targetMaSp = rowValues[2];
      const syncRes = await syncProductPriceToLenDon(targetMaSp);
      if (syncRes && syncRes.updatedCount > 0) {
        alert(`Đã lưu bảng giá và tự động cập nhật lại đơn giá theo ngày hiệu lực cho ${syncRes.updatedCount} dòng đơn hàng trong module Lên đơn.`);
      }
    } catch (err) {
      alert("Lỗi khi lưu bảng giá sản phẩm: " + err.message);
    }
  };

  const handleDeleteRow = async (row) => {
    const sheetRow = row._sheetRow;
    if (!sheetRow) return;
    const targetMaSp = row[2];
    const desc = `${row[2]} - ${row[3]} (${row[1]})`;
    if (window.confirm(`Bạn có chắc chắn muốn xóa bản ghi giá: ${desc}?`)) {
      try {
        await deleteRow('cngiasp', sheetRow);
        await fetchModule('cngiasp', true);

        // Tự động cập nhật lại giá cho các đơn hàng trong module Lên đơn sau khi xóa theo ngày hiệu lực
        const syncRes = await syncProductPriceToLenDon(targetMaSp);
        if (syncRes && syncRes.updatedCount > 0) {
          alert(`Đã xóa bản ghi giá và tự động cập nhật lại giá theo ngày hiệu lực cho ${syncRes.updatedCount} dòng đơn hàng trong module Lên đơn.`);
        }
      } catch (err) {
        alert("Lỗi khi xóa bản ghi giá: " + err.message);
      }
    }
  };

  // Excel Import
  const handleImportExcelRows = async (excelRows) => {
    try {
      const dataRows = excelRows.slice(1);
      const validRows = [];
      const now = new Date();
      const defaultDateVN = formatDateVN(now);
      const userName = currentUser?.name || currentUser?.id || 'Kế toán';

      dataRows.forEach((r, idx) => {
        if (r.some(c => c !== '')) {
          const maSp = (r[2] || r[1] || r[0] || '').toString().trim();
          if (!maSp) return;

          const rowId = r[0] ? String(r[0]).trim() : `GIA-${Date.now()}-${idx + 1}`;
          const ngayCapNhat = r[1] ? String(r[1]).trim() : defaultDateVN;
          const tenSp = (r[3] || r[2] || '').toString().trim();
          const giaNhap = cleanNumber(r[4]);
          const giaBan = cleanNumber(r[5]);
          const giaCu = cleanNumber(r[6]);
          const chenhLech = r[7] !== undefined && r[7] !== '' ? cleanNumber(r[7]) : (giaBan - giaCu);
          const nguoiCn = (r[8] || userName).toString().trim();
          const ghiChu = (r[9] || '').toString().trim();
          const trangThai = (r[10] || 'Áp dụng').toString().trim();

          validRows.push([
            rowId,
            ngayCapNhat,
            maSp,
            tenSp,
            giaNhap,
            giaBan,
            giaCu,
            chenhLech,
            nguoiCn,
            ghiChu,
            trangThai
          ]);
        }
      });

      if (validRows.length === 0) {
        alert("Không tìm thấy dòng dữ liệu giá hợp lệ trong file Excel.");
        return;
      }

      await appendRows('cngiasp', validRows);
      await fetchModule('cngiasp', true);

      // Tự động đồng bộ các đơn hàng trong module Lên đơn
      const syncCount = await syncAllPricesToLenDon();
      let msg = `Đã nhập thành công ${validRows.length} dòng giá sản phẩm.`;
      if (syncCount > 0) {
        msg += ` Đồng thời cập nhật giá mới cho ${syncCount} dòng đơn hàng trong module Lên đơn.`;
      }
      alert(msg);
    } catch (err) {
      alert("Lỗi khi import Excel: " + err.message);
    }
  };

  // Manual full sync to LenDon
  const handleSyncToLenDon = async () => {
    if (!window.confirm("Hệ thống sẽ rà soát tất cả đơn hàng trong module Lên đơn và cập nhật đơn giá theo giá mới nhất của bảng giá này. Tiếp tục?")) return;
    try {
      const syncCount = await syncAllPricesToLenDon();
      alert(`Đã hoàn tất đồng bộ! Có ${syncCount} dòng đơn hàng trong Lên đơn được cập nhật giá mới nhất.`);
    } catch (err) {
      alert("Lỗi khi đồng bộ giá sang Lên đơn: " + err.message);
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    const headers = [
      'ID', 'Ngày cập nhật', 'Mã sản phẩm', 'Tên sản phẩm',
      'Giá nhập', 'Giá bán mới', 'Giá cũ', 'Chênh lệch',
      'Người cập nhật', 'Ghi chú', 'Trạng thái'
    ];
    const data = [
      headers,
      ...filteredRows.map(r => [
        r[0], r[1], r[2], r[3],
        cleanNumber(r[4]), cleanNumber(r[5]), cleanNumber(r[6]), cleanNumber(r[7]),
        r[8], r[9], r[10]
      ])
    ];
    exportToExcel(data, `Bang_gia_SP_${Date.now()}.xlsx`, 'CN_GIA_SP');
  };

  return (
    <div className="space-y-2.5">
      {/* Top Banner / Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-semibold block text-[11px]">Tổng lượt cập nhật</span>
            <span className="text-base font-extrabold text-slate-800">{formatNumber(stats.totalRecords)}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-semibold block text-[11px]">Mã SP đã có giá</span>
            <span className="text-base font-extrabold text-indigo-700">{formatNumber(stats.totalProducts)}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Tag className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-semibold block text-[11px]">Đợt tăng giá</span>
            <span className="text-base font-extrabold text-emerald-600">{formatNumber(stats.priceIncreases)}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-semibold block text-[11px]">Đợt giảm giá</span>
            <span className="text-base font-extrabold text-rose-600">{formatNumber(stats.priceDecreases)}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo mã SP, tên sản phẩm, ngày cập nhật, người phụ trách..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setEditRow(null);
                setIsDrawerOpen(true);
              }}
              className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm giá SP
            </button>

            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="px-2.5 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-200 transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              Nhập Excel
            </button>

            <button
              onClick={handleExportExcel}
              className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs hover:bg-emerald-100 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Xuất Excel
            </button>

            <button
              onClick={handleSyncToLenDon}
              className="px-2.5 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs hover:bg-blue-100 transition flex items-center gap-1.5 border border-blue-200/60"
              title="Đồng bộ giá mới nhất sang tất cả đơn hàng trong Lên đơn"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
              Đồng bộ Lên đơn
            </button>

            <button
              onClick={() => downloadModuleTemplate('cngiasp')}
              className="px-2.5 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              Mẫu Excel
            </button>

            <button
              onClick={openConfigModal}
              className="px-2.5 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 transition flex items-center gap-1.5"
              title="Tùy chỉnh cột hiển thị"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              Cột
            </button>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-2.5 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 transition flex items-center gap-1.5 disabled:opacity-50"
              title="Làm mới dữ liệu từ Google Sheets"
            >
              <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto">
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
                  const giaBan = cleanNumber(row[5]);
                  const giaCu = cleanNumber(row[6]);
                  const giaNhap = cleanNumber(row[4]);
                  const chenhLech = cleanNumber(row[7]);
                  const trangThai = row[10] || 'Áp dụng';

                  return (
                    <tr key={idx} className="hover:bg-emerald-50/20 transition">
                      {visibleColumns.map(col => {
                        const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                        const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};

                        switch (col.key) {
                          case 'ngay_cap_nhat':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-bold text-slate-700 ${alignClass}`}>
                                <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {row[1] || '---'}
                                </span>
                              </td>
                            );

                          case 'ma_sp':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-extrabold text-blue-700 ${alignClass}`}>
                                {row[2]}
                              </td>
                            );

                          case 'ten_sp':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 font-medium text-slate-800 ${alignClass}`}>
                                {row[3]}
                              </td>
                            );

                          case 'gia_ban':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-black text-emerald-700 ${alignClass}`}>
                                {formatCurrency(giaBan)}
                              </td>
                            );

                          case 'gia_cu':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-medium text-slate-500 ${alignClass}`}>
                                {giaCu > 0 ? formatCurrency(giaCu) : '---'}
                              </td>
                            );

                          case 'chenh_lech':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-bold ${alignClass}`}>
                                {chenhLech > 0 ? (
                                  <span className="text-emerald-600 inline-flex items-center gap-0.5">
                                    <TrendingUp className="w-3 h-3" />
                                    +{formatNumber(chenhLech)}
                                  </span>
                                ) : chenhLech < 0 ? (
                                  <span className="text-rose-600 inline-flex items-center gap-0.5">
                                    <TrendingDown className="w-3 h-3" />
                                    {formatNumber(chenhLech)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">0</span>
                                )}
                              </td>
                            );

                          case 'gia_nhap':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-semibold text-slate-600 ${alignClass}`}>
                                {giaNhap > 0 ? formatCurrency(giaNhap) : '---'}
                              </td>
                            );

                          case 'nguoi_cap_nhat':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-slate-600 ${alignClass}`}>
                                {row[8] || '---'}
                              </td>
                            );

                          case 'ghi_chu':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 text-slate-500 truncate max-w-[200px] ${alignClass}`}>
                                {row[9] || '---'}
                              </td>
                            );

                          case 'trang_thai':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  trangThai === 'Áp dụng' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  trangThai === 'Chờ duyệt' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                  {trangThai}
                                </span>
                              </td>
                            );

                          case 'actions':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditRow(row);
                                      setIsDrawerOpen(true);
                                    }}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                                    title="Sửa bản ghi giá"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRow(row)}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded transition"
                                    title="Xóa bản ghi giá"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            );

                          default:
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                                {row[col.key] || ''}
                              </td>
                            );
                        }
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length} className="py-12 text-center text-slate-400">
                    <BadgePercent className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold">Chưa có bản ghi cập nhật giá nào.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Nhấn "Thêm giá SP" hoặc "Nhập Excel" để bắt đầu cập nhật bảng giá.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredRows.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Drawer Thêm / Sửa tay */}
      <CngiaspDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditRow(null);
        }}
        editRow={editRow}
        onSaved={handleSaveRow}
      />

      {/* Modal Nhập Excel */}
      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        moduleName="Cập nhật giá SP"
        onImportRows={handleImportExcelRows}
      />

      {/* Modal Quản lý Cột */}
      <ColumnManagerModal
        isOpen={isConfigModalOpen}
        onClose={closeConfigModal}
        columns={columns}
        onToggleVisibility={toggleVisibility}
        onUpdateProp={updateColumnProp}
        onMove={moveColumn}
        onReset={resetToDefault}
      />
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { DukienDrawer } from './DukienDrawer';
import { Pagination } from '../../common/Pagination';
import { ExcelUploadModal } from '../../common/ExcelUploadModal';
import { ColumnManagerModal } from '../../common/ColumnManagerModal';
import { useColumnManager } from '../../../hooks/useColumnManager';
import { exportToExcel, downloadModuleTemplate } from '../../../services/excelService';
import { formatNumber, formatDateVN, parseSimpleSheetDate, cleanNumber, matchesSearch } from '../../../utils/formatters';
import { DUKIEN_STATUS_OPTIONS } from '../../../config/constants';
import { 
  Plus, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Search, 
  Edit3, 
  CalendarClock,
  ArrowRightCircle,
  SlidersHorizontal,
  RotateCw
} from 'lucide-react';

export function getDukienStatusBadgeClass(status) {
  switch (status) {
    case 'Đã nhập kho xong (Completed)':
    case 'Đã nhập đủ':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Đang trên đường (In Transit)':
    case 'Đang vận chuyển':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Chưa giao (Pending)':
    case 'Chờ hàng về':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Đã về kho - Đang kiểm (Arrived - Checking)':
    case 'Đã về một phần':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Chờ kiểm định':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Đã đặt hàng':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Đang làm việc':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'Bị hoãn (Delayed)':
    case 'Đã hủy':
      return 'bg-red-50 text-red-600 border-red-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

const DEFAULT_DUKIEN_COLUMNS = [
  { key: 'ma_po', label: 'Mã PO', width: 120, align: 'left', format: 'bold' },
  { key: 'ma_sp', label: 'Mã SP', width: 110, align: 'left', format: 'bold' },
  { key: 'ten_sp', label: 'Tên sản phẩm', width: 180, align: 'left', format: 'default' },
  { key: 'dvt', label: 'ĐVT', width: 70, align: 'left', format: 'default' },
  { key: 'slg_dukien', label: 'SLG Dự kiến', width: 95, align: 'right', format: 'number' },
  { key: 'ngay_ve', label: 'Ngày về dự kiến', width: 105, align: 'left', format: 'date' },
  { key: 'trang_thai', label: 'Trạng thái', width: 115, align: 'left', format: 'badge' },
  { key: 'slg_thucnhan', label: 'SLG Thực nhận', width: 95, align: 'right', format: 'number' },
  { key: 'chenh_lech', label: 'Chênh lệch', width: 90, align: 'right', format: 'number' },
  { key: 'ghi_chu', label: 'Ghi chú', width: 150, align: 'left', format: 'default' },
  { key: 'actions', label: 'Thao tác', width: 80, align: 'center', format: 'default' },
];

export function DukienModule({ onNavigate }) {
  const { dukienData, appendRow, appendRows, updateRow, deleteRow, deleteOrder, fetchModule, loadingModules } = useData();

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
  } = useColumnManager('dukien', DEFAULT_DUKIEN_COLUMNS);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editOrderRows, setEditOrderRows] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Always fetch latest dukien data on mount
  React.useEffect(() => {
    fetchModule('dukien');
  }, [fetchModule]);

  const handleRefresh = async () => {
    await fetchModule('dukien', true);
  };

  const isLoading = Boolean(loadingModules?.dukien);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const rawRows = (dukienData || []).slice(1).map((r, idx) => {
      const cloned = [...r];
      cloned._sheetRow = idx + 2;
      return cloned;
    });

    return rawRows.filter(row => {
      const status = (row[9] || '').toString().trim();
      if (statusFilter && status.toLowerCase() !== statusFilter.toLowerCase()) return false;

      const rowDate = parseSimpleSheetDate(row[8] || row[2]);
      if (dateFrom && rowDate < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && rowDate > new Date(`${dateTo}T23:59:59.999`)) return false;

      if (searchTerm) {
        const text = row.map(c => (c || '').toString()).join(' ');
        if (!matchesSearch(text, searchTerm)) return false;
      }

      return true;
    }).sort((a, b) => {
      return parseSimpleSheetDate(b[8] || b[2]).getTime() - parseSimpleSheetDate(a[8] || a[2]).getTime();
    });
  }, [dukienData, statusFilter, dateFrom, dateTo, searchTerm]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Handle opening Drawer for edit (loads ALL products for that PO)
  const handleEditRow = (row) => {
    const maPo = (row[3] || '').toString().trim();
    
    // Find all rows in dukienData matching this PO
    const allOrderRows = (dukienData || []).slice(1)
      .map((r, idx) => {
        const item = [...r];
        item._sheetRow = idx + 2;
        return item;
      })
      .filter(r => {
        if (maPo) {
          return (r[3] || '').toString().trim().toLowerCase() === maPo.toLowerCase();
        }
        return r._sheetRow === row._sheetRow;
      });

    setEditOrderRows(allOrderRows.length > 0 ? allOrderRows : [row]);
    setIsDrawerOpen(true);
  };

  // Handle entire order deletion
  const handleDeleteOrder = async (maPo) => {
    if (!maPo) return;
    try {
      await deleteOrder('dukien', maPo);
      await fetchModule('dukien');
    } catch (err) {
      alert("Lỗi khi xóa đơn dự kiến: " + err.message);
    }
  };

  // Handle saving multi-item order from Drawer
  const handleSaveOrder = async ({ rowsToSave, deletedSheetRows }) => {
    try {
      // 1. Update existing sheet rows
      const existingUpdates = rowsToSave.filter(item => item._sheetRow && item._sheetRow > 1);
      for (const item of existingUpdates) {
        await updateRow('dukien', item._sheetRow, item.rowValues);
      }

      // 2. Batch append any newly added rows
      const newRowsToAppend = rowsToSave
        .filter(item => !item._sheetRow || item._sheetRow <= 1)
        .map(item => item.rowValues);

      if (newRowsToAppend.length > 0) {
        await appendRows('dukien', newRowsToAppend);
      }

      // 3. Clear any deleted sheet rows
      if (deletedSheetRows && deletedSheetRows.length > 0) {
        for (const sheetRow of deletedSheetRows) {
          await deleteRow('dukien', sheetRow);
        }
      }

      await fetchModule('dukien');
    } catch (err) {
      alert("Lỗi khi lưu dự kiến hàng về: " + err.message);
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'ID', 'STT', 'Ngày nhập', 'Mã PO', 'Mã SP', 'Tên sản phẩm',
      'ĐVT', 'SLG Dự kiến', 'Ngày về dự kiến', 'Trạng thái',
      'SLG Thực nhận', 'Chênh lệch', 'Ghi chú'
    ];
    const data = [headers, ...filteredRows.map(r => r.slice(0, 13))];
    exportToExcel(data, `Du_kien_hang_ve_${Date.now()}.xlsx`, 'DU_KIEN_HANG_VE');
  };

  const handleImportExcelRows = async (excelRows) => {
    try {
      const dataRows = excelRows.slice(1);
      for (const row of dataRows) {
        if (row.some(c => c !== '')) {
          await appendRow('dukien', row);
        }
      }
      await fetchModule('dukien');
      alert(`Đã nhập thành công ${dataRows.length} dòng.`);
    } catch (err) {
      alert("Lỗi khi import Excel: " + err.message);
    }
  };

  return (
    <div className="space-y-2">
      {/* Top Controls */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm kiếm mã PO, mã sản phẩm, tên SP, trạng thái..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setEditOrderRows(null);
                setIsDrawerOpen(true);
              }}
              className="px-3 py-1.5 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-600 shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm đơn dự kiến
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
              onClick={() => downloadModuleTemplate('dukien')}
              className="px-2.5 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              Mẫu Excel
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:ring-1 focus:ring-amber-500 outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              {DUKIEN_STATUS_OPTIONS.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Ngày về từ:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded-md text-slate-700 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Đến ngày:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded-md text-slate-700 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>

          {(statusFilter || dateFrom || dateTo || searchTerm) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setDateFrom('');
                setDateTo('');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="text-xs text-amber-600 font-bold hover:underline ml-auto"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Main Table: Dynamic columns based on visibleColumns */}
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
                  const slgDuKien = cleanNumber(row[7]);
                  const slgThucNhan = cleanNumber(row[10]);
                  const chenhLech = slgDuKien - slgThucNhan;
                  const status = row[9] || 'Chờ hàng về';

                  return (
                    <tr key={idx} className="hover:bg-amber-50/40 transition">
                      {visibleColumns.map(col => {
                        const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                        const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};
                        const isCustomBold = col.format === 'bold';
                        const isCustomUpper = col.format === 'uppercase';

                        switch (col.key) {
                          case 'ma_po':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-bold text-amber-700 ${alignClass} ${isCustomUpper ? 'uppercase' : ''}`}>
                                {row[3]}
                              </td>
                            );

                          case 'ma_sp':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-bold text-slate-800 ${alignClass} ${isCustomUpper ? 'uppercase' : ''}`}>
                                {row[4]}
                              </td>
                            );

                          case 'ten_sp':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 text-slate-600 ${alignClass} ${isCustomBold ? 'font-bold' : ''} ${isCustomUpper ? 'uppercase' : ''}`}>
                                {row[5]}
                              </td>
                            );

                          case 'dvt':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-slate-500 ${alignClass} ${isCustomBold ? 'font-bold' : ''}`}>
                                {row[6] || 'Cái'}
                              </td>
                            );

                          case 'slg_dukien':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-right font-extrabold text-amber-600 ${alignClass} ${isCustomUpper ? 'uppercase' : ''}`}>
                                {formatNumber(slgDuKien)}
                              </td>
                            );

                          case 'ngay_ve':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-slate-600 font-medium ${alignClass} ${isCustomBold ? 'font-bold' : ''}`}>
                                {formatDateVN(row[8])}
                              </td>
                            );

                          case 'trang_thai':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getDukienStatusBadgeClass(status)}`}>
                                  {status || 'Chưa xác định'}
                                </span>
                              </td>
                            );

                          case 'slg_thucnhan':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-right font-bold text-slate-700 ${alignClass}`}>
                                {formatNumber(slgThucNhan)}
                              </td>
                            );

                          case 'chenh_lech':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-right font-bold text-slate-500 ${alignClass}`}>
                                {formatNumber(chenhLech)}
                              </td>
                            );

                          case 'ghi_chu':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 text-slate-500 max-w-[200px] truncate ${alignClass} ${isCustomBold ? 'font-bold' : ''}`}>
                                {row[12]}
                              </td>
                            );

                          case 'actions':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-center ${alignClass}`}>
                                <button
                                  onClick={() => handleEditRow(row)}
                                  className="p-1 text-slate-400 hover:text-amber-600 transition cursor-pointer"
                                  title="Chỉnh sửa đơn dự kiến"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
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
                  <td colSpan={visibleColumns.length || 11} className="p-8 text-center text-slate-400 italic">
                    Không tìm thấy đơn dự kiến hàng về nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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

      <DukienDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditOrderRows(null);
        }}
        editOrderRows={editOrderRows}
        onSaved={handleSaveOrder}
        onDeleteOrder={handleDeleteOrder}
      />

      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        moduleName="dukien"
        onImportRows={handleImportExcelRows}
      />
    </div>
  );
}

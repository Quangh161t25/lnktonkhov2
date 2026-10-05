import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useSettings } from '../../../context/SettingsContext';
import { ChuyenkhoDrawer } from './ChuyenkhoDrawer';
import { Pagination } from '../../common/Pagination';
import { ExcelUploadModal } from '../../common/ExcelUploadModal';
import { exportToExcel, downloadModuleTemplate } from '../../../services/excelService';
import { ColumnManagerModal } from '../../common/ColumnManagerModal';
import { useColumnManager } from '../../../hooks/useColumnManager';
import { formatNumber, formatDateVN, parseSimpleSheetDate, cleanNumber, matchesSearch } from '../../../utils/formatters';
import { 
  Plus, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Search, 
  ArrowLeftRight, 
  Edit3,
  SlidersHorizontal,
  RotateCw
} from 'lucide-react';

const DEFAULT_CHUYENKHO_COLUMNS = [
  { key: 'ngay', label: 'Ngày', width: 95, align: 'left', format: 'date' },
  { key: 'mdh', label: 'Mã chuyển (MDH)', width: 125, align: 'left', format: 'bold' },
  { key: 'kho_di', label: 'Kho đi', width: 85, align: 'left', format: 'badge' },
  { key: 'kho_nhan', label: 'Kho nhận', width: 85, align: 'left', format: 'badge' },
  { key: 'id_sp', label: 'Mã SP', width: 110, align: 'left', format: 'bold' },
  { key: 'ten_sp', label: 'Tên sản phẩm', width: 180, align: 'left', format: 'default' },
  { key: 'slg', label: 'SLG', width: 75, align: 'right', format: 'number' },
  { key: 'tinh_trang', label: 'Tình trạng', width: 95, align: 'left', format: 'default' },
  { key: 'trang_thai', label: 'Trạng thái', width: 105, align: 'left', format: 'badge' },
  { key: 'ghi_chu', label: 'Ghi chú', width: 150, align: 'left', format: 'default' },
  { key: 'actions', label: 'Thao tác', width: 80, align: 'center', format: 'default' },
];

export function ChuyenkhoModule() {
  const { transferData, appendRow, updateRow, fetchModule, loadingModules } = useData();
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
  } = useColumnManager('chuyenkho', DEFAULT_CHUYENKHO_COLUMNS);

  const [searchTerm, setSearchTerm] = useState('');
  const [khoDiFilter, setKhoDiFilter] = useState('');
  const [khoNhanFilter, setKhoNhanFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Always fetch latest chuyenkho data on mount
  React.useEffect(() => {
    fetchModule('chuyenkho');
  }, [fetchModule]);

  const handleRefresh = async () => {
    await fetchModule('chuyenkho', true);
  };

  const isLoading = Boolean(loadingModules?.chuyenkho);

  const warehouses = getWarehouseOptions();

  // Filtered rows
  const filteredRows = useMemo(() => {
    const rawRows = (transferData || []).slice(1).map((r, idx) => {
      const cloned = [...r];
      cloned._sheetRow = idx + 2;
      return cloned;
    });

    return rawRows.filter(row => {
      const khoDi = (row[6] || '').toString().trim();
      const khoNhan = (row[7] || '').toString().trim();

      if (khoDiFilter && khoDi.toLowerCase() !== khoDiFilter.toLowerCase()) return false;
      if (khoNhanFilter && khoNhan.toLowerCase() !== khoNhanFilter.toLowerCase()) return false;

      const rowDate = parseSimpleSheetDate(row[1]);
      if (dateFrom && rowDate < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && rowDate > new Date(`${dateTo}T23:59:59.999`)) return false;

      if (searchTerm) {
        const text = row.map(c => (c || '').toString()).join(' ');
        if (!matchesSearch(text, searchTerm)) return false;
      }

      return true;
    }).sort((a, b) => {
      return parseSimpleSheetDate(b[1]).getTime() - parseSimpleSheetDate(a[1]).getTime();
    });
  }, [transferData, khoDiFilter, khoNhanFilter, dateFrom, dateTo, searchTerm]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleSaveRows = async (rowsToSave, sheetRow) => {
    try {
      if (sheetRow && sheetRow > 1) {
        await updateRow('chuyenkho', sheetRow, rowsToSave[0]);
      } else {
        for (const r of rowsToSave) {
          await appendRow('chuyenkho', r);
        }
      }
      await fetchModule('chuyenkho');
    } catch (err) {
      alert("Lỗi khi lưu điều chuyển kho: " + err.message);
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'ID', 'Ngày chuyển', 'MDH', 'Mã SP', 'Tên sản phẩm',
      'Số lượng', 'Kho đi', 'Kho nhận', 'Ghi chú', 'Tình trạng', 'Trạng thái'
    ];
    const data = [headers, ...filteredRows.map(r => r.slice(0, 11))];
    exportToExcel(data, `Dieu_chuyen_kho_${Date.now()}.xlsx`, 'CHUYEN_KHO_CT');
  };

  const handleImportExcelRows = async (excelRows) => {
    try {
      const dataRows = excelRows.slice(1);
      for (const row of dataRows) {
        if (row.some(c => c !== '')) {
          await appendRow('chuyenkho', row);
        }
      }
      await fetchModule('chuyenkho');
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
              placeholder="Tìm kiếm mã điều chuyển, mã sản phẩm, ghi chú..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setEditRow(null);
                setIsDrawerOpen(true);
              }}
              className="px-3 py-1.5 bg-cyan-600 text-white font-bold rounded-lg text-xs hover:bg-cyan-700 shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo điều chuyển
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
              onClick={() => downloadModuleTemplate('chuyenkho')}
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
            <span className="text-slate-500 font-semibold">Kho đi:</span>
            <select
              value={khoDiFilter}
              onChange={(e) => {
                setKhoDiFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:ring-1 focus:ring-cyan-500 outline-none"
            >
              <option value="">Tất cả kho đi</option>
              {warehouses.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Kho nhận:</span>
            <select
              value={khoNhanFilter}
              onChange={(e) => {
                setKhoNhanFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:ring-1 focus:ring-cyan-500 outline-none"
            >
              <option value="">Tất cả kho nhận</option>
              {warehouses.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Từ ngày:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded-md text-slate-700 focus:ring-1 focus:ring-cyan-500 outline-none"
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
              className="px-2 py-1 border border-slate-200 rounded-md text-slate-700 focus:ring-1 focus:ring-cyan-500 outline-none"
            />
          </div>

          {(khoDiFilter || khoNhanFilter || dateFrom || dateTo || searchTerm) && (
            <button
              onClick={() => {
                setKhoDiFilter('');
                setKhoNhanFilter('');
                setDateFrom('');
                setDateTo('');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="text-xs text-cyan-600 font-bold hover:underline ml-auto"
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
                paginatedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-cyan-50/30 transition">
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
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-bold text-cyan-700 ${alignClass} ${isCustomUpper ? 'uppercase' : ''}`}>
                              {row[2]}
                            </td>
                          );

                        case 'kho_di':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                              <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-red-50 text-red-700 border border-red-200">
                                {row[6]}
                              </span>
                            </td>
                          );

                        case 'kho_nhan':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                              <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {row[7]}
                              </span>
                            </td>
                          );

                        case 'id_sp':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-bold text-slate-800 ${alignClass} ${isCustomUpper ? 'uppercase' : ''}`}>
                              {row[3]}
                            </td>
                          );

                        case 'ten_sp':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 text-slate-600 ${alignClass} ${isCustomBold ? 'font-bold' : ''} ${isCustomUpper ? 'uppercase' : ''}`}>
                              {row[4]}
                            </td>
                          );

                        case 'slg':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-extrabold text-cyan-700 ${alignClass} ${isCustomUpper ? 'uppercase' : ''}`}>
                              {formatNumber(row[5])}
                            </td>
                          );

                        case 'tinh_trang':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-slate-600 ${alignClass} ${isCustomBold ? 'font-bold' : ''}`}>
                              {row[9] || 'Tốt'}
                            </td>
                          );

                        case 'trang_thai':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {row[10] || 'Đang chuyển'}
                              </span>
                            </td>
                          );

                        case 'ghi_chu':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 text-slate-500 max-w-[200px] truncate ${alignClass} ${isCustomBold ? 'font-bold' : ''}`}>
                              {row[8]}
                            </td>
                          );

                        case 'actions':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-center ${alignClass}`}>
                              <button
                                onClick={() => {
                                  setEditRow(row);
                                  setIsDrawerOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-cyan-600 transition"
                                title="Chỉnh sửa dòng chuyển"
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
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length || 11} className="p-8 text-center text-slate-400 italic">
                    Không tìm thấy dữ liệu điều chuyển kho nào.
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

      <ChuyenkhoDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditRow(null);
        }}
        editRow={editRow}
        onSaved={handleSaveRows}
      />

      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        moduleName="chuyenkho"
        onImportRows={handleImportExcelRows}
      />
    </div>
  );
}

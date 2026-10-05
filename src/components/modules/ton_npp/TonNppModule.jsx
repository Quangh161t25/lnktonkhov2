import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { TonNppDrawer } from './TonNppDrawer';
import { Pagination } from '../../common/Pagination';
import { ExcelUploadModal } from '../../common/ExcelUploadModal';
import { ColumnManagerModal } from '../../common/ColumnManagerModal';
import { useColumnManager } from '../../../hooks/useColumnManager';
import { exportToExcel, downloadModuleTemplate } from '../../../services/excelService';
import { formatNumber, formatDateVN, parseSimpleSheetDate, cleanNumber, matchesSearch } from '../../../utils/formatters';
import { 
  Plus, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Search, 
  Building2, 
  Edit3,
  SlidersHorizontal,
  RotateCw
} from 'lucide-react';

const DEFAULT_TON_NPP_COLUMNS = [
  { key: 'ngay_chot', label: 'Ngày chốt', width: 95, align: 'left', format: 'date' },
  { key: 'ma_npp', label: 'Mã NPP', width: 110, align: 'left', format: 'bold' },
  { key: 'ten_npp', label: 'Tên Nhà Phân Phối', width: 180, align: 'left', format: 'default' },
  { key: 'ma_sp', label: 'Mã SP', width: 110, align: 'left', format: 'bold' },
  { key: 'ten_sp', label: 'Tên sản phẩm', width: 180, align: 'left', format: 'default' },
  { key: 'ton_cuoi', label: 'Tồn cuối', width: 95, align: 'right', format: 'number' },
  { key: 'actions', label: 'Thao tác', width: 80, align: 'center', format: 'default' },
];

export function TonNppModule() {
  const { tonNppData, appendRow, updateRow, fetchModule, getProductNameById, loadingModules } = useData();
  const { currentUser, resolveRoleKey, usersData } = useAuth();

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
  } = useColumnManager('ton_npp', DEFAULT_TON_NPP_COLUMNS);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Always fetch latest ton_npp data on mount
  React.useEffect(() => {
    fetchModule('ton_npp');
  }, [fetchModule]);

  const handleRefresh = async () => {
    await fetchModule('ton_npp', true);
  };

  const isLoading = Boolean(loadingModules?.ton_npp);

  const roleKey = currentUser ? resolveRoleKey(currentUser.role) : '';

  const getCustomerName = (maKh) => {
    const found = (usersData || []).find(u => u.id?.toLowerCase() === maKh?.toLowerCase());
    return found ? found.name : maKh;
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    const rawRows = (tonNppData || []).slice(1).map((r, idx) => {
      const cloned = [...r];
      cloned._sheetRow = idx + 2;
      return cloned;
    });

    return rawRows.filter(row => {
      const maKh = (row[2] || '').toString().trim();
      if (roleKey === 'NPP') {
        const userCustId = (currentUser.id || '').toString().trim().toLowerCase();
        if (maKh.toLowerCase() !== userCustId) return false;
      }

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
  }, [tonNppData, roleKey, currentUser, dateFrom, dateTo, searchTerm]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleSaveRows = async (rowsToSave, sheetRow) => {
    try {
      if (sheetRow && sheetRow > 1) {
        await updateRow('ton_npp', sheetRow, rowsToSave[0]);
      } else {
        for (const r of rowsToSave) {
          await appendRow('ton_npp', r);
        }
      }
      await fetchModule('ton_npp');
    } catch (err) {
      alert("Lỗi khi lưu tồn NPP: " + err.message);
    }
  };

  const handleExportExcel = () => {
    const headers = ['ID', 'Ngày chốt', 'Mã NPP', 'Tên NPP', 'Mã SP', 'Tên SP', 'Tồn cuối'];
    const data = [
      headers,
      ...filteredRows.map(r => [
        r[0], r[1], r[2], getCustomerName(r[2]), r[3], getProductNameById(r[3]), cleanNumber(r[4])
      ])
    ];
    exportToExcel(data, `Ton_NPP_${Date.now()}.xlsx`, 'TON_NPP');
  };

  const handleImportExcelRows = async (excelRows) => {
    try {
      const dataRows = excelRows.slice(1);
      for (const row of dataRows) {
        if (row.some(c => c !== '')) {
          await appendRow('ton_npp', row);
        }
      }
      await fetchModule('ton_npp');
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
              placeholder="Tìm kiếm theo mã NPP, tên NPP, mã sản phẩm..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setEditRow(null);
                setIsDrawerOpen(true);
              }}
              className="px-3 py-1.5 bg-teal-600 text-white font-bold rounded-lg text-xs hover:bg-teal-700 shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Khai báo tồn NPP
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
              onClick={() => downloadModuleTemplate('ton_npp')}
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

        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Từ ngày:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded-md text-slate-700 focus:ring-1 focus:ring-teal-500 outline-none"
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
              className="px-2 py-1 border border-slate-200 rounded-md text-slate-700 focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>

          {(dateFrom || dateTo || searchTerm) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="text-xs text-teal-600 font-bold hover:underline ml-auto"
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
                  <tr key={idx} className="hover:bg-teal-50/30 transition">
                    {visibleColumns.map(col => {
                      const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                      const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};
                      const isCustomBold = col.format === 'bold';
                      const isCustomUpper = col.format === 'uppercase';

                      switch (col.key) {
                        case 'ngay_chot':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-slate-600 font-medium ${alignClass} ${isCustomBold ? 'font-bold' : ''}`}>
                              {formatDateVN(row[1])}
                            </td>
                          );

                        case 'ma_npp':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-bold text-teal-700 ${alignClass} ${isCustomUpper ? 'uppercase' : ''}`}>
                              {row[2]}
                            </td>
                          );

                        case 'ten_npp':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 font-semibold text-slate-700 ${alignClass} ${isCustomBold ? 'font-bold' : ''} ${isCustomUpper ? 'uppercase' : ''}`}>
                              {getCustomerName(row[2])}
                            </td>
                          );

                        case 'ma_sp':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-bold text-slate-800 ${alignClass} ${isCustomUpper ? 'uppercase' : ''}`}>
                              {row[3]}
                            </td>
                          );

                        case 'ten_sp':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 text-slate-600 ${alignClass} ${isCustomBold ? 'font-bold' : ''} ${isCustomUpper ? 'uppercase' : ''}`}>
                              {getProductNameById(row[3])}
                            </td>
                          );

                        case 'ton_cuoi':
                          return (
                            <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-right ${alignClass}`}>
                              <span className="px-2 py-0.5 rounded font-black text-xs bg-teal-50 text-teal-800 border border-teal-200">
                                {formatNumber(row[4])}
                              </span>
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
                                className="p-1 text-slate-400 hover:text-teal-600 transition"
                                title="Chỉnh sửa số liệu"
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
                  <td colSpan={visibleColumns.length || 7} className="p-8 text-center text-slate-400 italic">
                    Không tìm thấy số liệu tồn NPP nào.
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

      <TonNppDrawer
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
        moduleName="ton_npp"
        onImportRows={handleImportExcelRows}
      />
    </div>
  );
}

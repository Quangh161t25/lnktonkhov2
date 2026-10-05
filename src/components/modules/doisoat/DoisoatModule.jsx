import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { DoisoatDrawer } from './DoisoatDrawer';
import { Pagination } from '../../common/Pagination';
import { ExcelUploadModal } from '../../common/ExcelUploadModal';
import { ColumnManagerModal } from '../../common/ColumnManagerModal';
import { useColumnManager } from '../../../hooks/useColumnManager';
import { exportToExcel, downloadModuleTemplate } from '../../../services/excelService';
import { calculateProductAggregates } from '../../../utils/calculations';
import { formatNumber, cleanNumber, matchesSearch } from '../../../utils/formatters';
import { 
  Plus, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Search, 
  Scale, 
  Edit3,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  RotateCw
} from 'lucide-react';

const DEFAULT_DOISOAT_COLUMNS = [
  { key: 'id_sp', label: 'Mã sản phẩm', width: 120, align: 'left', format: 'bold' },
  { key: 'ten_sp', label: 'Tên sản phẩm', width: 200, align: 'left', format: 'default' },
  { key: 'ton_he_thong', label: 'Tồn hệ thống (ERP)', width: 120, align: 'right', format: 'number' },
  { key: 'ton_misa', label: 'Tồn theo MISA', width: 110, align: 'right', format: 'number' },
  { key: 'chenh_lech', label: 'Chênh lệch', width: 100, align: 'right', format: 'number' },
  { key: 'danh_gia', label: 'Đánh giá', width: 140, align: 'left', format: 'badge' },
  { key: 'actions', label: 'Thao tác', width: 80, align: 'center', format: 'default' },
];

export function DoisoatModule() {
  const { 
    doisoatData, 
    nhapData, 
    xuatData, 
    transferData, 
    warehouseProductData, 
    aggregatesData, 
    fetchAggregatesData, 
    appendRow, 
    updateRow, 
    fetchModule, 
    loadingModules 
  } = useData();
  const { hasActionPermission } = useAuth();

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
  } = useColumnManager('doisoat', DEFAULT_DOISOAT_COLUMNS);

  const [searchTerm, setSearchTerm] = useState('');
  const [diffFilter, setDiffFilter] = useState('ALL'); // 'ALL' | 'MATCH' | 'SURPLUS' | 'DEFICIT'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Always fetch latest reconciliation & aggregated stock data on mount
  React.useEffect(() => {
    fetchModule('doisoat');
    fetchAggregatesData();
  }, [fetchModule, fetchAggregatesData]);

  const handleRefreshAll = async () => {
    await Promise.all([
      fetchModule('doisoat', true),
      fetchAggregatesData({ force: true })
    ]);
  };

  const isLoading = Boolean(loadingModules?.doisoat || loadingModules?.aggregates);

  const aggregates = useMemo(() => {
    if (aggregatesData && Object.keys(aggregatesData).length > 0) {
      const map = new Map();
      Object.entries(aggregatesData).forEach(([k, v]) => {
        map.set(k.toLowerCase(), v);
      });
      return map;
    }
    return calculateProductAggregates(nhapData, xuatData, transferData, warehouseProductData);
  }, [aggregatesData, nhapData, xuatData, transferData, warehouseProductData]);

  // Real counts for difference filters
  const statusCounts = useMemo(() => {
    let all = 0, match = 0, surplus = 0, deficit = 0;
    (doisoatData || []).slice(1).forEach(row => {
      const id = (row[0] || '').toString().trim().toLowerCase();
      if (!id) return;
      all++;
      const tonHeThong = aggregates.get(id)?.tonCuoi || 0;
      const tonMisa = cleanNumber(row[2]);
      const diff = tonHeThong - tonMisa;
      if (diff === 0) match++;
      else if (diff > 0) surplus++;
      else deficit++;
    });
    return { all, match, surplus, deficit };
  }, [doisoatData, aggregates]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const rawRows = (doisoatData || []).slice(1).map((r, idx) => {
      const cloned = [...r];
      cloned._sheetRow = idx + 2;
      return cloned;
    });

    return rawRows.filter(row => {
      const id = (row[0] || '').toString().trim().toLowerCase();
      if (!id) return false;

      const tonHeThong = aggregates.get(id)?.tonCuoi || 0;
      const tonMisa = cleanNumber(row[2]);
      const diff = tonHeThong - tonMisa;

      if (diffFilter === 'MATCH' && diff !== 0) return false;
      if (diffFilter === 'SURPLUS' && diff <= 0) return false;
      if (diffFilter === 'DEFICIT' && diff >= 0) return false;

      if (searchTerm) {
        const text = `${row[0] || ''} ${row[1] || ''}`;
        if (!matchesSearch(text, searchTerm)) return false;
      }

      return true;
    });
  }, [doisoatData, aggregates, diffFilter, searchTerm]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleSaveRows = async (rowsToSave, sheetRow) => {
    try {
      if (sheetRow && sheetRow > 1) {
        await updateRow('doisoat', sheetRow, rowsToSave[0]);
      } else {
        for (const r of rowsToSave) {
          await appendRow('doisoat', r);
        }
      }
      await fetchModule('doisoat');
    } catch (err) {
      alert("Lỗi khi lưu đối soát MISA: " + err.message);
    }
  };

  const handleExportExcel = () => {
    const headers = ['Mã SP', 'Tên sản phẩm', 'Tồn kho Hệ thống', 'Tồn kho MISA', 'Chênh lệch (ERP - MISA)', 'Trạng thái'];
    const data = [
      headers,
      ...filteredRows.map(r => {
        const id = (r[0] || '').toString().trim().toLowerCase();
        const tonHeThong = aggregates.get(id)?.tonCuoi || 0;
        const tonMisa = cleanNumber(r[2]);
        const diff = tonHeThong - tonMisa;
        const status = diff === 0 ? 'Khớp số liệu' : diff > 0 ? 'Thừa kho (ERP > MISA)' : 'Thiếu kho (ERP < MISA)';
        return [r[0], r[1], tonHeThong, tonMisa, diff, status];
      })
    ];
    exportToExcel(data, `Doi_soat_ton_MISA_${Date.now()}.xlsx`, 'DOI_SOAT');
  };

  const handleImportExcelRows = async (excelRows) => {
    try {
      const dataRows = excelRows.slice(1);
      for (const row of dataRows) {
        if (row.some(c => c !== '')) {
          await appendRow('doisoat', row);
        }
      }
      await fetchModule('doisoat');
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
              placeholder="Tìm kiếm mã sản phẩm, tên sản phẩm..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {hasActionPermission('doisoat.manage') && (
              <button
                onClick={() => {
                  setEditRow(null);
                  setIsDrawerOpen(true);
                }}
                className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-700 shadow-sm transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm số liệu MISA
              </button>
            )}

            {hasActionPermission('doisoat.manage') && (
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="px-2.5 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-200 transition flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Tải lên MISA Excel
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
              onClick={() => downloadModuleTemplate('doisoat')}
              className="px-2.5 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              Mẫu Excel
            </button>

            <button
              onClick={openConfigModal}
              className="px-2.5 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-200 transition flex items-center gap-1.5"
              title="Tùy chỉnh cột (Ẩn/Hiện, Thứ tự, Kích thước, Định dạng)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
              Cột
            </button>

            <button
              onClick={handleRefreshAll}
              disabled={isLoading}
              className="px-2.5 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-200 transition flex items-center gap-1.5 disabled:opacity-50"
              title="Làm mới & đồng bộ số liệu mới nhất từ Google Sheets"
            >
              <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>

        {/* Difference status filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 text-xs">
          <button
            onClick={() => {
              setDiffFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              diffFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({statusCounts.all})
          </button>

          <button
            onClick={() => {
              setDiffFilter('MATCH');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              diffFilter === 'MATCH' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Khớp số liệu ({statusCounts.match})
          </button>

          <button
            onClick={() => {
              setDiffFilter('SURPLUS');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              diffFilter === 'SURPLUS' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Thừa kho (ERP &gt; MISA) ({statusCounts.surplus})
          </button>

          <button
            onClick={() => {
              setDiffFilter('DEFICIT');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              diffFilter === 'DEFICIT' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Thiếu kho (ERP &lt; MISA) ({statusCounts.deficit})
          </button>

          {isLoading && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full animate-pulse">
              <Scale className="w-3.5 h-3.5 animate-spin" />
              Đang tính toán tồn kho ERP...
            </span>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-210px)] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                {visibleColumns.map((col) => {
                  const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};
                  let alignClass = 'text-left';
                  if (col.align === 'center') alignClass = 'text-center';
                  if (col.align === 'right') alignClass = 'text-right';

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
                  const idLower = (row[0] || '').toString().trim().toLowerCase();
                  const tonHeThong = aggregates.get(idLower)?.tonCuoi || 0;
                  const tonMisa = cleanNumber(row[2]);
                  const diff = tonHeThong - tonMisa;

                  return (
                    <tr key={idx} className="hover:bg-rose-50/20 transition">
                      {visibleColumns.map((col) => {
                        let alignClass = 'text-left';
                        if (col.align === 'center') alignClass = 'text-center';
                        if (col.align === 'right') alignClass = 'text-right';

                        let formatClass = '';
                        if (col.format === 'bold') formatClass = 'font-bold text-slate-800';
                        if (col.format === 'uppercase') formatClass = 'uppercase';

                        switch (col.key) {
                          case 'id_sp':
                            return (
                              <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap font-extrabold text-slate-800 ${alignClass} ${formatClass}`}>
                                {row[0]}
                              </td>
                            );
                          case 'ten_sp':
                            return (
                              <td key={col.key} className={`py-1.5 px-2.5 font-semibold text-slate-700 ${alignClass} ${formatClass}`}>
                                {row[1]}
                              </td>
                            );
                          case 'ton_he_thong':
                            return (
                              <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-right font-bold text-blue-600 ${alignClass} ${formatClass}`}>
                                {formatNumber(tonHeThong)}
                              </td>
                            );
                          case 'ton_misa':
                            return (
                              <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-right font-bold text-slate-700 ${alignClass} ${formatClass}`}>
                                {formatNumber(tonMisa)}
                              </td>
                            );
                          case 'chenh_lech':
                            return (
                              <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-right font-black text-xs ${alignClass}`}>
                                <span className={diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-rose-600'}>
                                  {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}
                                </span>
                              </td>
                            );
                          case 'danh_gia':
                            return (
                              <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                                {diff === 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    Khớp chuẩn
                                  </span>
                                ) : diff > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                                    <ArrowUpRight className="w-3 h-3 text-blue-500" />
                                    Thừa ERP +{formatNumber(diff)}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                                    <ArrowDownRight className="w-3 h-3 text-rose-500" />
                                    Lệch thiếu {formatNumber(diff)}
                                  </span>
                                )}
                              </td>
                            );
                          case 'actions':
                            return (
                              <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-center ${alignClass}`}>
                                {hasActionPermission('doisoat.manage') && (
                                  <button
                                    onClick={() => {
                                      setEditRow(row);
                                      setIsDrawerOpen(true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                                    title="Sửa số liệu MISA"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            );
                          default:
                            return (
                              <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass} ${formatClass}`}>
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
                  <td colSpan={visibleColumns.length || 7} className="p-8 text-center text-slate-400 italic">
                    Không tìm thấy dữ liệu đối soát nào.
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

      <DoisoatDrawer
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
        moduleName="doisoat"
        onImportRows={handleImportExcelRows}
      />

      <ColumnManagerModal
        isOpen={isConfigModalOpen}
        onClose={closeConfigModal}
        columns={columns}
        onToggleVisibility={toggleVisibility}
        onUpdateProp={updateColumnProp}
        onMoveColumn={moveColumn}
        onReset={resetToDefault}
        moduleTitle="Đối soát MISA"
      />
    </div>
  );
}

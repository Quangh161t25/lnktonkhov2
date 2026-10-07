import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { SanphamkhoDrawer } from './SanphamkhoDrawer';
import { ProductDetailModal } from '../sanpham/ProductDetailModal';
import { Pagination } from '../../common/Pagination';
import { ExcelUploadModal } from '../../common/ExcelUploadModal';
import { ColumnManagerModal } from '../../common/ColumnManagerModal';
import { useColumnManager } from '../../../hooks/useColumnManager';
import { exportToExcel, downloadModuleTemplate } from '../../../services/excelService';
import { calculateWarehouseDetailStockMap } from '../../../utils/calculations';
import { formatNumber, cleanNumber, matchesSearch } from '../../../utils/formatters';
import { 
  Plus, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Search, 
  Warehouse, 
  Edit3,
  ExternalLink,
  SlidersHorizontal,
  RotateCw
} from 'lucide-react';

const DEFAULT_SANPHAMKHO_COLUMNS = [
  { key: 'kho', label: 'Kho', width: 90, align: 'left', format: 'badge' },
  { key: 'id_sp', label: 'Mã sản phẩm', width: 130, align: 'left', format: 'bold' },
  { key: 'ten_sp', label: 'Tên sản phẩm', width: 220, align: 'left', format: 'default' },
  { key: 'ton_dau', label: 'Tồn đầu kỳ', width: 100, align: 'right', format: 'number' },
  { key: 'nhap', label: 'Tổng Nhập', width: 95, align: 'right', format: 'number' },
  { key: 'xuat', label: 'Tổng Xuất', width: 95, align: 'right', format: 'number' },
  { key: 'ton_cuoi', label: 'Tồn kho', width: 105, align: 'right', format: 'number' },
  { key: 'actions', label: 'Thao tác', width: 90, align: 'center', format: 'default' },
];

export function SanphamkhoModule({ initialFilterProductId = '' }) {
  const { 
    warehouseProductData, 
    productData, 
    nhapData, 
    xuatData, 
    transferData, 
    appendRow, 
    updateRow, 
    fetchModule, 
    loadingModules 
  } = useData();
  const { canAccessWarehouse } = useAuth();
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
  } = useColumnManager('sanphamkho', DEFAULT_SANPHAMKHO_COLUMNS);

  const [searchTerm, setSearchTerm] = useState(initialFilterProductId);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [detailProductRow, setDetailProductRow] = useState(null);
  const [detailWarehouse, setDetailWarehouse] = useState('ALL');
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Always fetch latest sanphamkho, sanpham, nhap, xuat, chuyenkho data on mount
  React.useEffect(() => {
    fetchModule('sanphamkho');
    fetchModule('sanpham');
    fetchModule('nhap');
    fetchModule('xuat');
    fetchModule('chuyenkho');
  }, [fetchModule]);

  const handleRefreshAll = async () => {
    await Promise.all([
      fetchModule('sanphamkho', true),
      fetchModule('sanpham', true),
      fetchModule('nhap', true),
      fetchModule('xuat', true),
      fetchModule('chuyenkho', true)
    ]);
  };

  const isLoading = Boolean(
    loadingModules?.sanphamkho || 
    loadingModules?.sanpham || 
    loadingModules?.nhap || 
    loadingModules?.xuat || 
    loadingModules?.chuyenkho
  );

  const warehouses = getWarehouseOptions();

  // Tính toán tồn đầu, nhập, xuất, tồn kho chi tiết cho từng kho và từng sản phẩm
  const whDetailStockMap = useMemo(() => {
    return calculateWarehouseDetailStockMap(nhapData, xuatData, transferData, warehouseProductData);
  }, [nhapData, xuatData, transferData, warehouseProductData]);

  // Merged warehouse rows with full stock details
  const mergedRows = useMemo(() => {
    const map = new Map();
    (warehouseProductData || []).slice(1).forEach((row, idx) => {
      const kho = (row[1] || '').toString().trim();
      const idSp = (row[2] || '').toString().trim();
      if (!kho || !idSp) return;

      const key = `${kho.toUpperCase()}|${idSp.toUpperCase()}`;
      if (!map.has(key)) {
        const stat = whDetailStockMap.get(key) || { tonDau: cleanNumber(row[4]), nhap: 0, xuat: 0, tonCuoi: cleanNumber(row[4]) };
        const item = [
          `${kho}|${idSp}`,     // 0: key id
          kho,                  // 1: kho
          idSp,                 // 2: idSp
          row[3] || idSp,       // 3: tenSp
          cleanNumber(row[4]),  // 4: tonDau
          stat.nhap,            // 5: nhap
          stat.xuat,            // 6: xuat
          stat.tonCuoi          // 7: tonCuoi
        ];
        item._sheetRow = idx + 2;
        item._stat = stat;
        map.set(key, item);
      }
    });

    // Bổ sung các sản phẩm có phát sinh giao dịch nhập/xuất tại kho nhưng chưa đăng ký tồn đầu trong DS_SP_KHO
    whDetailStockMap.forEach((stat, key) => {
      if (!map.has(key) && (stat.nhap > 0 || stat.xuat > 0 || stat.tonCuoi !== 0)) {
        const [kho, idSp] = key.split('|');
        if (kho && idSp) {
          const product = (productData || []).slice(1).find(p => (p[0] || '').toString().trim().toUpperCase() === idSp);
          const tenSp = product ? (product[1] || idSp) : idSp;
          const item = [
            `${kho}|${idSp}`,
            kho,
            idSp,
            tenSp,
            stat.tonDau,
            stat.nhap,
            stat.xuat,
            stat.tonCuoi
          ];
          item._sheetRow = null;
          item._stat = stat;
          map.set(key, item);
        }
      }
    });

    return Array.from(map.values()).filter(row => {
      const kho = row[1];
      if (!canAccessWarehouse(kho)) return false;
      if (warehouseFilter && kho.toLowerCase() !== warehouseFilter.toLowerCase()) return false;

      if (searchTerm) {
        const text = `${row[1] || ''} ${row[2] || ''} ${row[3] || ''}`;
        if (!matchesSearch(text, searchTerm)) return false;
      }

      return true;
    }).sort((a, b) => a[1].localeCompare(b[1]) || a[2].localeCompare(b[2]));
  }, [warehouseProductData, whDetailStockMap, productData, warehouseFilter, searchTerm, canAccessWarehouse]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return mergedRows.slice(start, start + pageSize);
  }, [mergedRows, currentPage, pageSize]);

  const handleOpenDetail = (row) => {
    const idSp = (row[2] || '').toString().trim();
    const tenSp = (row[3] || '').toString().trim();
    const kho = (row[1] || '').toString().trim();
    const foundProduct = (productData || []).slice(1).find(p => (p[0] || '').toString().trim().toLowerCase() === idSp.toLowerCase());
    setDetailProductRow(foundProduct || [idSp, tenSp, '', '', 0, '']);
    setDetailWarehouse(kho || 'ALL');
  };

  const handleSaveRows = async (rowsToSave, sheetRow) => {
    try {
      if (sheetRow && sheetRow > 1) {
        await updateRow('sanphamkho', sheetRow, rowsToSave[0]);
      } else {
        for (const r of rowsToSave) {
          await appendRow('sanphamkho', r);
        }
      }
      await fetchModule('sanphamkho');
    } catch (err) {
      alert("Lỗi khi lưu sản phẩm kho: " + err.message);
    }
  };

  const handleExportExcel = () => {
    const headers = ['ID', 'Kho', 'Mã SP', 'Tên sản phẩm', 'Tồn đầu kỳ', 'Tổng Nhập', 'Tổng Xuất', 'Tồn kho'];
    const data = [
      headers,
      ...mergedRows.map(r => [r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]])
    ];
    exportToExcel(data, `San_pham_kho_${Date.now()}.xlsx`, 'DS_SP_KHO');
  };

  const handleImportExcelRows = async (excelRows) => {
    try {
      const dataRows = excelRows.slice(1);
      for (const row of dataRows) {
        if (row.some(c => c !== '')) {
          await appendRow('sanphamkho', row);
        }
      }
      await fetchModule('sanphamkho');
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
              placeholder="Tìm kiếm theo kho, mã sản phẩm, tên SP..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setEditRow(null);
                setIsDrawerOpen(true);
              }}
              className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm vào kho
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
              onClick={() => downloadModuleTemplate('sanphamkho')}
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
              onClick={handleRefreshAll}
              disabled={isLoading}
              className="px-2.5 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 transition flex items-center gap-1.5 disabled:opacity-50"
              title="Làm mới & đồng bộ số liệu mới nhất từ Google Sheets"
            >
              <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>

        {/* Warehouse Filter */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 text-xs">
          {warehouses.length > 1 && (
            <button
              onClick={() => {
                setWarehouseFilter('');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md font-bold transition ${
                warehouseFilter === '' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả kho
            </button>
          )}

          {warehouses.map(w => (
            <button
              key={w}
              onClick={() => {
                setWarehouseFilter(w);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md font-bold transition ${
                warehouseFilter === w ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              {w}
            </button>
          ))}
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
                  return (
                    <tr 
                      key={idx} 
                      onClick={() => handleOpenDetail(row)}
                      className="hover:bg-indigo-50/30 transition cursor-pointer group"
                    >
                      {visibleColumns.map(col => {
                        const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                        const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};
                        const isCustomBold = col.format === 'bold';
                        const isCustomUpper = col.format === 'uppercase';

                        switch (col.key) {
                          case 'kho':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                                <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {row[1]}
                                </span>
                              </td>
                            );

                          case 'id_sp':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-extrabold text-slate-800 ${alignClass} ${isCustomUpper ? 'uppercase' : ''}`}>
                                {row[2]}
                              </td>
                            );

                          case 'ten_sp':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 font-medium text-slate-700 ${alignClass} ${isCustomBold ? 'font-bold' : ''} ${isCustomUpper ? 'uppercase' : ''}`}>
                                <div className="flex items-center justify-between gap-1">
                                  <span>{row[3]}</span>
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                                </div>
                              </td>
                            );

                          case 'ton_dau':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-slate-500 font-semibold ${alignClass}`}>
                                {formatNumber(row[4])}
                              </td>
                            );

                          case 'nhap':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-blue-600 font-semibold ${alignClass}`}>
                                {formatNumber(row[5])}
                              </td>
                            );

                          case 'xuat':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-orange-600 font-semibold ${alignClass}`}>
                                {formatNumber(row[6])}
                              </td>
                            );

                          case 'ton_cuoi': {
                            const tonKho = row[7] ?? 0;
                            const isLow = tonKho <= 0;
                            const isWarning = tonKho > 0 && tonKho < 5;
                            const badgeColor = isLow 
                              ? 'bg-rose-50 text-rose-700 border-rose-200 font-black' 
                              : isWarning 
                                ? 'bg-amber-50 text-amber-700 border-amber-200 font-black' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black';

                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                                <span className={`inline-block px-2 py-0.5 rounded text-xs border ${badgeColor}`}>
                                  {formatNumber(tonKho)}
                                </span>
                              </td>
                            );
                          }

                          case 'actions':
                            return (
                              <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-center ${alignClass}`}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDetail(row);
                                    }}
                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                                    title="Xem chi tiết xuất nhập tồn của sản phẩm tại kho này"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                  {row._sheetRow && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditRow(row);
                                        setIsDrawerOpen(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                                      title="Chỉnh sửa sản phẩm kho"
                                    >
                                      <Edit3 className="w-4 h-4" />
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
                  <td colSpan={visibleColumns.length || 6} className="p-8 text-center text-slate-400 italic">
                    Không tìm thấy dữ liệu tồn kho nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={mergedRows.length}
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

      <SanphamkhoDrawer
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
        moduleName="sanphamkho"
        onImportRows={handleImportExcelRows}
      />

      {/* Product Detail Modal */}
      {detailProductRow && (
        <ProductDetailModal
          isOpen={Boolean(detailProductRow)}
          onClose={() => setDetailProductRow(null)}
          productRow={detailProductRow}
          initialWarehouse={detailWarehouse}
        />
      )}
    </div>
  );
}

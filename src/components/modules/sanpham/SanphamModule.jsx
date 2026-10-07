import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { SanphamDrawer } from './SanphamDrawer';
import { ProductDetailModal } from './ProductDetailModal';
import { Pagination } from '../../common/Pagination';
import { ExcelUploadModal } from '../../common/ExcelUploadModal';
import { ColumnManagerModal } from '../../common/ColumnManagerModal';
import { useColumnManager } from '../../../hooks/useColumnManager';
import { exportToExcel, downloadModuleTemplate } from '../../../services/excelService';
import { calculateProductAggregates } from '../../../utils/calculations';
import { formatNumber, formatCurrency, cleanNumber, matchesSearch } from '../../../utils/formatters';
import { 
  Plus, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Search, 
  Package, 
  Edit3, 
  Trash2,
  ExternalLink,
  ImageIcon,
  SlidersHorizontal,
  RotateCw
} from 'lucide-react';

const DEFAULT_SANPHAM_COLUMNS = [
  { key: 'image', label: 'Ảnh', width: 60, align: 'center', format: 'default' },
  { key: 'id_sp', label: 'Mã sản phẩm', width: 120, align: 'left', format: 'bold' },
  { key: 'ten_sp', label: 'Tên sản phẩm', width: 220, align: 'left', format: 'default' },
  { key: 'ton_dau', label: 'Tồn đầu', width: 90, align: 'right', format: 'number' },
  { key: 'tong_nhap', label: 'Tổng Nhập', width: 95, align: 'right', format: 'number' },
  { key: 'tong_xuat', label: 'Tổng Xuất', width: 95, align: 'right', format: 'number' },
  { key: 'ton_cuoi', label: 'Tồn cuối tổng', width: 105, align: 'right', format: 'number' },
  { key: 'ghi_chu', label: 'Ghi chú', width: 150, align: 'left', format: 'default' },
  { key: 'actions', label: 'Thao tác', width: 100, align: 'center', format: 'default' },
];

export function SanphamModule({ onNavigateWithFilter }) {
  const { 
    productData, 
    nhapData, 
    xuatData, 
    transferData, 
    warehouseProductData, 
    aggregatesData, 
    nppProductIdsData, 
    fetchAggregatesData, 
    appendRow, 
    updateRow, 
    deleteRow, 
    fetchModule, 
    loadingModules 
  } = useData();
  const { currentUser, hasActionPermission, getHiddenProductIds, resolveRoleKey } = useAuth();
  const { appSettings } = useSettings();

  const roleKey = currentUser ? resolveRoleKey(currentUser.role) : '';
  const lowStockThreshold = appSettings?.lowStockThreshold || 10;

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
  } = useColumnManager('sanpham', DEFAULT_SANPHAM_COLUMNS);

  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'LOW' | 'IN_STOCK' | 'OUT_OF_STOCK'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [detailProductRow, setDetailProductRow] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Always fetch latest product & aggregated stock data on mount (avoiding raw sales/purchase downloads)
  React.useEffect(() => {
    fetchModule('sanpham');
    const nppId = roleKey === 'NPP' ? currentUser?.id : '';
    const nppName = roleKey === 'NPP' ? currentUser?.name : '';
    fetchAggregatesData({ nppId, nppName });
  }, [fetchModule, fetchAggregatesData, roleKey, currentUser?.id, currentUser?.name]);

  const handleRefreshAll = async () => {
    const nppId = roleKey === 'NPP' ? currentUser?.id : '';
    const nppName = roleKey === 'NPP' ? currentUser?.name : '';
    await Promise.all([
      fetchModule('sanpham', true),
      fetchAggregatesData({ force: true, nppId, nppName })
    ]);
  };

  const isLoading = Boolean(loadingModules?.sanpham || loadingModules?.aggregates);

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

  const hiddenIdsSet = useMemo(() => {
    return new Set(getHiddenProductIds().map(id => id.toLowerCase()));
  }, [getHiddenProductIds]);

  // For NPP user: get the list of product IDs ever exported to this NPP
  const nppExportedProductIds = useMemo(() => {
    if (roleKey !== 'NPP' || !currentUser) return null;
    if (nppProductIdsData && nppProductIdsData.length > 0) {
      return new Set(nppProductIdsData.map(id => id.toLowerCase()));
    }
    const userCustId = (currentUser.id || '').toString().trim().toLowerCase();
    const userCustName = (currentUser.name || '').toString().trim().toLowerCase();

    const productIdsSet = new Set();
    (xuatData || []).slice(1).forEach(row => {
      const rowCustId = (row[4] || '').toString().trim().toLowerCase();
      const rowCustName = (row[5] || '').toString().trim().toLowerCase();
      const rowProductId = (row[6] || '').toString().trim().toLowerCase();

      // Check if this export row belongs to this NPP
      const isMatchingNpp = 
        (userCustId && (rowCustId === userCustId || rowCustName === userCustId)) ||
        (userCustName && (rowCustName === userCustName || rowCustId === userCustName));

      if (isMatchingNpp && rowProductId) {
        productIdsSet.add(rowProductId);
      }
    });

    return productIdsSet;
  }, [roleKey, currentUser, nppProductIdsData, xuatData]);

  // Base accessible product rows (applying hidden products and NPP restrictions)
  const accessibleRows = useMemo(() => {
    const rawRows = (productData || []).slice(1).map((r, idx) => {
      const cloned = [...r];
      cloned._sheetRow = idx + 2;
      return cloned;
    });

    return rawRows.filter(row => {
      const id = (row[0] || '').toString().trim().toLowerCase();
      if (!id) return false;
      if (hiddenIdsSet.has(id)) return false;

      // NPP permission restriction: only products ever exported to this NPP
      if (nppExportedProductIds && !nppExportedProductIds.has(id)) {
        return false;
      }

      return true;
    });
  }, [productData, hiddenIdsSet, nppExportedProductIds]);

  // Stock counts for filter tabs
  const stockCounts = useMemo(() => {
    let inStock = 0;
    let low = 0;
    let outOfStock = 0;

    accessibleRows.forEach(row => {
      const id = (row[0] || '').toString().trim().toLowerCase();
      const agg = aggregates.get(id) || { tonCuoi: 0 };
      const tonCuoi = agg.tonCuoi;

      if (tonCuoi > lowStockThreshold) {
        inStock++;
      } else if (tonCuoi > 0) {
        low++;
      } else {
        outOfStock++;
      }
    });

    return {
      all: accessibleRows.length,
      inStock,
      low,
      outOfStock
    };
  }, [accessibleRows, aggregates, lowStockThreshold]);

  // Filtered rows - sorted by Tồn cuối tổng from highest to lowest
  const filteredRows = useMemo(() => {
    return accessibleRows.filter(row => {
      const id = (row[0] || '').toString().trim().toLowerCase();
      const agg = aggregates.get(id) || { tonCuoi: 0, tongNhap: 0, tongXuat: 0 };
      const tonCuoi = agg.tonCuoi;

      if (stockFilter === 'LOW' && (tonCuoi > lowStockThreshold || tonCuoi <= 0)) return false;
      if (stockFilter === 'OUT_OF_STOCK' && tonCuoi > 0) return false;
      if (stockFilter === 'IN_STOCK' && tonCuoi <= 0) return false;

      if (searchTerm) {
        const text = `${row[0] || ''} ${row[1] || ''} ${row[2] || ''} ${row[5] || ''}`;
        if (!matchesSearch(text, searchTerm)) return false;
      }

      return true;
    }).sort((a, b) => {
      const idA = (a[0] || '').toString().trim().toLowerCase();
      const idB = (b[0] || '').toString().trim().toLowerCase();
      const tonCuoiA = (aggregates.get(idA)?.tonCuoi) || 0;
      const tonCuoiB = (aggregates.get(idB)?.tonCuoi) || 0;
      return tonCuoiB - tonCuoiA;
    });
  }, [accessibleRows, aggregates, stockFilter, lowStockThreshold, searchTerm]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleDeleteProduct = async (row) => {
    const sheetRow = row._sheetRow;
    if (!sheetRow) return;
    const desc = `${row[0]} - ${row[1]}`;
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm: ${desc}?`)) {
      try {
        await deleteRow('sanpham', sheetRow);
        await fetchModule('sanpham');
      } catch (err) {
        alert("Lỗi khi xóa sản phẩm: " + err.message);
      }
    }
  };

  const handleSaveRows = async (rowsToSave, sheetRow) => {
    try {
      if (sheetRow && sheetRow > 1) {
        await updateRow('sanpham', sheetRow, rowsToSave[0]);
      } else {
        for (const r of rowsToSave) {
          await appendRow('sanpham', r);
        }
      }
      await fetchModule('sanpham');
    } catch (err) {
      alert("Lỗi khi lưu sản phẩm: " + err.message);
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'Mã SP', 'Tên sản phẩm', 'Model', 'Link ảnh', 'Giá bán',
      'Tồn đầu', 'Tổng Nhập', 'Tổng Xuất', 'Tồn cuối', 'Ghi chú'
    ];
    const data = [
      headers,
      ...filteredRows.map(r => {
        const id = (r[0] || '').toString().trim().toLowerCase();
        const agg = aggregates.get(id) || { tonDau: 0, tongNhap: 0, tongXuat: 0, tonCuoi: 0 };
        return [
          r[0], r[1], r[2], r[3], cleanNumber(r[4]),
          agg.tonDau, agg.tongNhap, agg.tongXuat, agg.tonCuoi, r[5]
        ];
      })
    ];
    exportToExcel(data, `Danh_sach_san_pham_${Date.now()}.xlsx`, 'DS_SP');
  };

  const handleImportExcelRows = async (excelRows) => {
    try {
      const dataRows = excelRows.slice(1);
      for (const row of dataRows) {
        if (row.some(c => c !== '')) {
          await appendRow('sanpham', row);
        }
      }
      await fetchModule('sanpham');
      alert(`Đã nhập thành công ${dataRows.length} dòng.`);
    } catch (err) {
      alert("Lỗi khi import Excel: " + err.message);
    }
  };

  const handleViewWarehouseStock = (productId) => {
    if (onNavigateWithFilter) {
      onNavigateWithFilter('sanphamkho', { productId });
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
              placeholder="Tìm kiếm mã sản phẩm, tên, model, ghi chú..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {hasActionPermission('sanpham.manage') && (
              <button
                onClick={() => {
                  setEditRow(null);
                  setIsDrawerOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm sản phẩm
              </button>
            )}

            {hasActionPermission('sanpham.manage') && (
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
              onClick={() => downloadModuleTemplate('sanpham')}
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

        {/* Stock status filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 text-xs">
          <button
            onClick={() => {
              setStockFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              stockFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({stockCounts.all})
          </button>

          <button
            onClick={() => {
              setStockFilter('IN_STOCK');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              stockFilter === 'IN_STOCK' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Còn hàng ({stockCounts.inStock})
          </button>

          <button
            onClick={() => {
              setStockFilter('LOW');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              stockFilter === 'LOW' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Sắp hết (≤ {lowStockThreshold}) ({stockCounts.low})
          </button>

          <button
            onClick={() => {
              setStockFilter('OUT_OF_STOCK');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              stockFilter === 'OUT_OF_STOCK' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Hết hàng (≤ 0) ({stockCounts.outOfStock})
          </button>
        </div>
      </div>

      {/* Main Table: Dynamic columns based on visibleColumns */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-210px)] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                {visibleColumns
                  .filter(col => roleKey !== 'NPP' || !['ton_dau', 'tong_nhap', 'tong_xuat'].includes(col.key))
                  .map(col => {
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
                  const idLower = (row[0] || '').toString().trim().toLowerCase();
                  const agg = aggregates.get(idLower) || { tonDau: 0, tongNhap: 0, tongXuat: 0, tonCuoi: 0 };
                  const tonCuoi = agg.tonCuoi;
                  const imgUrl = row[3] || '';

                  return (
                    <tr 
                      key={idx} 
                      onClick={() => setDetailProductRow(row)}
                      className="hover:bg-blue-50/40 transition cursor-pointer group"
                      title="Bấm để xem bảng chi tiết từng kho & lịch sử nhập xuất từng ngày"
                    >
                      {visibleColumns
                        .filter(col => roleKey !== 'NPP' || !['ton_dau', 'tong_nhap', 'tong_xuat'].includes(col.key))
                        .map(col => {
                          const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                          const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};
                          const isCustomBold = col.format === 'bold';
                          const isCustomUpper = col.format === 'uppercase';

                          switch (col.key) {
                            case 'image':
                              return (
                                <td key={col.key} style={widthStyle} className="py-1 px-1.5 text-center">
                                  {imgUrl ? (
                                    <img
                                      src={imgUrl}
                                      alt={row[1]}
                                      className="w-8 h-8 object-cover rounded-md mx-auto border border-slate-200 shadow-sm"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                      <ImageIcon className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                </td>
                              );

                            case 'id_sp':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap font-extrabold text-blue-600 group-hover:underline ${alignClass} ${isCustomUpper ? 'uppercase' : ''}`}>
                                  {row[0]}
                                </td>
                              );

                            case 'ten_sp':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 font-semibold text-slate-700 group-hover:text-blue-700 ${alignClass} ${isCustomBold ? 'font-bold' : ''} ${isCustomUpper ? 'uppercase' : ''}`}>
                                  {row[1]}
                                </td>
                              );

                            case 'ton_dau':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-right font-bold text-slate-600 ${alignClass}`}>
                                  {formatNumber(agg.tonDau)}
                                </td>
                              );

                            case 'tong_nhap':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-right text-blue-600 font-semibold ${alignClass}`}>
                                  {formatNumber(agg.tongNhap)}
                                </td>
                              );

                            case 'tong_xuat':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-right text-orange-600 font-semibold ${alignClass}`}>
                                  {formatNumber(agg.tongXuat)}
                                </td>
                              );

                            case 'ton_cuoi':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 whitespace-nowrap text-right ${alignClass}`}>
                                  <span className={`px-2 py-0.5 rounded font-black text-xs ${
                                    tonCuoi <= 0 ? 'bg-red-50 text-red-600 border border-red-200' :
                                    tonCuoi <= lowStockThreshold ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                    'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}>
                                    {formatNumber(tonCuoi)}
                                  </span>
                                </td>
                              );

                            case 'ghi_chu':
                              return (
                                <td key={col.key} style={widthStyle} className={`py-1.5 px-2.5 text-slate-500 max-w-[180px] truncate ${alignClass} ${isCustomBold ? 'font-bold' : ''}`}>
                                  {row[5]}
                                </td>
                              );

                            case 'actions':
                              return (
                                <td 
                                  key={col.key} 
                                  style={widthStyle} 
                                  className={`py-1.5 px-2.5 whitespace-nowrap text-center ${alignClass}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailProductRow(row);
                                      }}
                                      className="p-1 text-slate-400 hover:text-blue-600 transition"
                                      title="Xem chi tiết tồn theo từng kho & nhập xuất từng ngày"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </button>
                                    {hasActionPermission('sanpham.manage') && (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditRow(row);
                                            setIsDrawerOpen(true);
                                          }}
                                          className="p-1 text-slate-400 hover:text-emerald-600 transition"
                                          title="Chỉnh sửa sản phẩm"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteProduct(row);
                                          }}
                                          className="p-1 text-slate-400 hover:text-red-600 transition"
                                          title="Xóa sản phẩm"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
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
                  <td colSpan={visibleColumns.length || 11} className="p-8 text-center text-slate-400 italic">
                    Không tìm thấy sản phẩm nào phù hợp.
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

      <SanphamDrawer
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
        moduleName="sanpham"
        onImportRows={handleImportExcelRows}
      />

      {/* Product Detail Modal (Stock breakdown per warehouse & daily transactions) */}
      <ProductDetailModal
        isOpen={Boolean(detailProductRow)}
        onClose={() => setDetailProductRow(null)}
        productRow={detailProductRow}
      />
    </div>
  );
}

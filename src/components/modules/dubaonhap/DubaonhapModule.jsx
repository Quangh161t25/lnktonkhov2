import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { DubaoConfigModal } from './DubaoConfigModal';
import { ColumnManagerModal } from '../../common/ColumnManagerModal';
import { useColumnManager } from '../../../hooks/useColumnManager';
import { Pagination } from '../../common/Pagination';
import { 
  getForecastLast12Months, 
  buildProductExportMap, 
  calculateProductForecastList 
} from '../../../services/forecastService';
import { calculateProductAggregates } from '../../../utils/calculations';
import { exportToExcel } from '../../../services/excelService';
import { getLocalItem, setLocalItem, STORAGE_KEYS } from '../../../utils/storage';
import { formatNumber, cleanNumber, matchesSearch } from '../../../utils/formatters';
import { 
  TrendingUp, 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  Settings2, 
  Download, 
  Search, 
  CalendarClock,
  ArrowRightCircle,
  Sliders,
  SlidersHorizontal,
  RotateCw
} from 'lucide-react';

const DEFAULT_DUBAONHAP_COLUMNS = [
  { key: 'id_sp', label: 'Mã SP', width: 110, align: 'left', format: 'bold' },
  { key: 'ten_sp', label: 'Tên sản phẩm', width: 220, align: 'left', format: 'default' },
  { key: 'ton_hien_tai', label: 'Tồn hiện tại', width: 100, align: 'right', format: 'number' },
  { key: 'du_kien_ve', label: 'Dự kiến về', width: 95, align: 'right', format: 'number' },
  { key: 'xuat_tb_thang', label: 'Xuất TB/tháng', width: 105, align: 'right', format: 'number' },
  { key: 'xuat_tb_ngay', label: 'Xuất TB/ngày (DAS)', width: 115, align: 'right', format: 'number' },
  { key: 'rop', label: 'Điểm đặt hàng (ROP)', width: 125, align: 'right', format: 'number' },
  { key: 'days_of_supply', label: 'Ngày bán còn lại', width: 115, align: 'right', format: 'default' },
  { key: 'roq', label: 'Cần nhập (ROQ)', width: 110, align: 'right', format: 'bold' },
  { key: 'status', label: 'Trạng thái', width: 120, align: 'center', format: 'badge' },
  { key: 'actions', label: 'Cấu hình', width: 80, align: 'center', format: 'default' },
];

export function DubaonhapModule({ onNavigate }) {
  const { productData, xuatData, dukienData, nhapData, transferData, warehouseProductData, fetchModule, loadingModules } = useData();

  // Column Manager Hook
  const {
    columns,
    visibleColumns,
    isConfigModalOpen: isColModalOpen,
    openConfigModal: openColModal,
    closeConfigModal: closeColModal,
    toggleVisibility,
    updateColumnProp,
    moveColumn,
    resetToDefault
  } = useColumnManager('dubaonhap', DEFAULT_DUBAONHAP_COLUMNS);

  // Always fetch required forecasting data on mount
  React.useEffect(() => {
    fetchModule('sanpham');
    fetchModule('xuat');
    fetchModule('dukien');
    fetchModule('nhap');
    fetchModule('sanphamkho');
    fetchModule('chuyenkho');
  }, [fetchModule]);

  const handleRefreshAll = async () => {
    await Promise.all([
      fetchModule('sanpham', true),
      fetchModule('xuat', true),
      fetchModule('dukien', true),
      fetchModule('nhap', true),
      fetchModule('sanphamkho', true),
      fetchModule('chuyenkho', true)
    ]);
  };

  const isLoading = Boolean(
    loadingModules?.sanpham ||
    loadingModules?.xuat ||
    loadingModules?.dukien ||
    loadingModules?.nhap ||
    loadingModules?.sanphamkho ||
    loadingModules?.chuyenkho
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'KHAN_CAP' | 'CAN_NHAP' | 'AN_TOAN' | 'THUA_HANG'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [forecastParams, setForecastParams] = useState(() => 
    getLocalItem(STORAGE_KEYS.FORECAST_PARAMS, { globalLeadTime: 7, globalBufferDays: 30, items: {} })
  );
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedProductForConfig, setSelectedProductForConfig] = useState(null);

  // Aggregates & Maps
  const stockMap = useMemo(() => {
    return calculateProductAggregates(nhapData, xuatData, transferData, warehouseProductData);
  }, [nhapData, xuatData, transferData, warehouseProductData]);

  const expectedMap = useMemo(() => {
    const map = new Map();
    (dukienData || []).slice(1).forEach(row => {
      const id = (row[4] || '').toString().trim().toLowerCase();
      const status = (row[9] || '').toString().trim();
      const isFinished = 
        status === 'Đã nhập kho xong (Completed)' ||
        status === 'Đã nhập đủ' ||
        status === 'Đã hủy' ||
        status === 'Bị hoãn (Delayed)';
      if (id && !isFinished) {
        const slgDuKien = cleanNumber(row[7]);
        const slgNhan = cleanNumber(row[10]);
        const remaining = Math.max(0, slgDuKien - slgNhan);
        map.set(id, (map.get(id) || 0) + remaining);
      }
    });
    return map;
  }, [dukienData]);

  const exportMap = useMemo(() => {
    return buildProductExportMap(xuatData);
  }, [xuatData]);

  const last12Months = useMemo(() => {
    return getForecastLast12Months(xuatData);
  }, [xuatData]);

  const products = useMemo(() => {
    return (productData || []).slice(1).map(row => ({
      id: row[0],
      name: row[1],
      model: row[2],
      anh: row[3],
      price: cleanNumber(row[4])
    }));
  }, [productData]);

  // Full forecast list calculation
  const forecastList = useMemo(() => {
    return calculateProductForecastList(
      products,
      stockMap,
      expectedMap,
      exportMap,
      forecastParams,
      last12Months
    );
  }, [products, stockMap, expectedMap, exportMap, forecastParams, last12Months]);

  // Filtered rows
  const filteredList = useMemo(() => {
    return forecastList.filter(item => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (searchTerm) {
        const text = `${item.id || ''} ${item.name || ''} ${item.model || ''}`;
        if (!matchesSearch(text, searchTerm)) return false;
      }
      return true;
    }).sort((a, b) => {
      // Prioritize urgent restock
      const priority = { KHAN_CAP: 0, CAN_NHAP: 1, THUA_HANG: 2, AN_TOAN: 3 };
      if (priority[a.status] !== priority[b.status]) {
        return priority[a.status] - priority[b.status];
      }
      return b.recommendedQty - a.recommendedQty;
    });
  }, [forecastList, statusFilter, searchTerm]);

  // Paginated rows
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Summary counts
  const countKhanCap = forecastList.filter(i => i.status === 'KHAN_CAP').length;
  const countCanNhap = forecastList.filter(i => i.status === 'CAN_NHAP').length;
  const totalRecommendedQty = forecastList.reduce((sum, i) => sum + i.recommendedQty, 0);

  const handleSaveParams = (newParams) => {
    setForecastParams(newParams);
    setLocalItem(STORAGE_KEYS.FORECAST_PARAMS, newParams);
  };

  const handleExportExcel = () => {
    const headers = [
      'Mã SP', 'Tên sản phẩm', 'Tồn kho hiện tại', 'Dự kiến về',
      'Xuất TB/tháng (Top 3)', 'Xuất TB/ngày (DAS)', 'Lead Time (Ngày)',
      'Buffer Days (Ngày)', 'Điểm đặt hàng (ROP)', 'Số ngày bán còn lại (Days of Supply)',
      'Lượng đề xuất nhập (ROQ)', 'Trạng thái dự báo'
    ];
    const data = [
      headers,
      ...filteredList.map(i => [
        i.id, i.name, i.tonCuoi, i.expectedQty,
        i.top3Avg, i.das, i.leadTime, i.bufferDays,
        i.rop, i.daysOfSupply === 999 ? 'Không tiêu thụ' : i.daysOfSupply,
        i.recommendedQty, i.statusLabel
      ])
    ];
    exportToExcel(data, `Du_bao_nhap_hang_${Date.now()}.xlsx`, 'DU_BAO_NHAP');
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Khẩn cấp */}
        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Khẩn cấp đứt hàng</p>
            <h3 className="text-2xl font-black text-red-600 mt-1">{countKhanCap}</h3>
            <span className="text-[11px] text-slate-500 mt-1 inline-block">Tồn kho ≤ 3 ngày bán</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertOctagon className="w-6 h-6" />
          </div>
        </div>

        {/* Cần nhập */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Chạm điểm đặt hàng</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{countCanNhap}</h3>
            <span className="text-[11px] text-slate-500 mt-1 inline-block">Tồn kho ≤ ROP</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Tổng lượng cần nhập */}
        <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Tổng lượng cần nhập (ROQ)</p>
            <h3 className="text-2xl font-black text-purple-700 mt-1">{formatNumber(totalRecommendedQty)}</h3>
            <span className="text-[11px] text-slate-500 mt-1 inline-block">Đề xuất bổ sung kho</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Cấu hình mặc định */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lead Time / Buffer</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">{forecastParams.globalLeadTime}d / {forecastParams.globalBufferDays}d</h3>
            <button
              onClick={() => {
                setSelectedProductForConfig(null);
                setIsConfigModalOpen(true);
              }}
              className="text-[11px] text-purple-600 font-bold hover:underline mt-1 inline-block"
            >
              Chỉnh sửa tham số
            </button>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center">
            <Sliders className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Controls & Filters */}
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
              placeholder="Tìm kiếm theo mã sản phẩm, tên, model..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setSelectedProductForConfig(null);
                setIsConfigModalOpen(true);
              }}
              className="px-3 py-1.5 bg-purple-600 text-white font-bold rounded-lg text-xs hover:bg-purple-700 shadow-sm transition flex items-center gap-1.5"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Cài đặt tham số
            </button>

            <button
              onClick={handleExportExcel}
              className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs hover:bg-emerald-100 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Xuất báo cáo
            </button>

            <button
              onClick={openColModal}
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

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 text-xs">
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({forecastList.length})
          </button>

          <button
            onClick={() => {
              setStatusFilter('KHAN_CAP');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              statusFilter === 'KHAN_CAP' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Khẩn cấp ({countKhanCap})
          </button>

          <button
            onClick={() => {
              setStatusFilter('CAN_NHAP');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              statusFilter === 'CAN_NHAP' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Cần nhập ({countCanNhap})
          </button>

          <button
            onClick={() => {
              setStatusFilter('AN_TOAN');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              statusFilter === 'AN_TOAN' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            An toàn ({forecastList.filter(i => i.status === 'AN_TOAN').length})
          </button>

          <button
            onClick={() => {
              setStatusFilter('THUA_HANG');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              statusFilter === 'THUA_HANG' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Dư thừa ({forecastList.filter(i => i.status === 'THUA_HANG').length})
          </button>
        </div>
      </div>

      {/* Main Forecast Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
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
              {paginatedList.length > 0 ? (
                paginatedList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-purple-50/20 transition">
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
                              {item.id}
                            </td>
                          );
                        case 'ten_sp':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 font-semibold text-slate-700 ${alignClass} ${formatClass}`}>
                              {item.name}
                            </td>
                          );
                        case 'ton_hien_tai':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-right font-bold text-slate-800 ${alignClass} ${formatClass}`}>
                              {formatNumber(item.tonCuoi)}
                            </td>
                          );
                        case 'du_kien_ve':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-right text-slate-500 ${alignClass} ${formatClass}`}>
                              {formatNumber(item.expectedQty)}
                            </td>
                          );
                        case 'xuat_tb_thang':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-right text-slate-600 font-medium ${alignClass} ${formatClass}`}>
                              {formatNumber(item.chosenMonthlyAvg)}
                            </td>
                          );
                        case 'xuat_tb_ngay':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-right font-bold text-blue-600 ${alignClass} ${formatClass}`}>
                              {item.das}
                            </td>
                          );
                        case 'rop':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-right font-bold text-amber-700 ${alignClass} ${formatClass}`}>
                              {formatNumber(item.rop)}
                            </td>
                          );
                        case 'days_of_supply':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-right ${alignClass}`}>
                              <span className={`font-bold ${
                                item.daysOfSupply <= 3 ? 'text-red-600 font-black' :
                                item.daysOfSupply <= 15 ? 'text-amber-600' :
                                'text-slate-700'
                              }`}>
                                {item.daysOfSupply === 999 ? '∞' : `${item.daysOfSupply} ngày`}
                              </span>
                            </td>
                          );
                        case 'roq':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-right font-black text-xs ${alignClass}`}>
                              {item.recommendedQty > 0 ? (
                                <span className="text-purple-700 font-extrabold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                  +{formatNumber(item.recommendedQty)}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">0</span>
                              )}
                            </td>
                          );
                        case 'status':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-center ${alignClass}`}>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === 'KHAN_CAP' ? 'bg-red-50 text-red-600 border border-red-200' :
                                item.status === 'CAN_NHAP' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                item.status === 'THUA_HANG' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {item.statusLabel}
                              </span>
                            </td>
                          );
                        case 'actions':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-center ${alignClass}`}>
                              <button
                                onClick={() => {
                                  setSelectedProductForConfig(item);
                                  setIsConfigModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-purple-600 transition"
                                title="Tùy chỉnh Lead time & Buffer cho sản phẩm này"
                              >
                                <Sliders className="w-4 h-4" />
                              </button>
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
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length || 11} className="p-8 text-center text-slate-400 italic">
                    Không có dữ liệu dự báo nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredList.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <DubaoConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => {
          setIsConfigModalOpen(false);
          setSelectedProductForConfig(null);
        }}
        currentParams={forecastParams}
        onSaveParams={handleSaveParams}
        targetProduct={selectedProductForConfig}
      />

      <ColumnManagerModal
        isOpen={isColModalOpen}
        onClose={closeColModal}
        columns={columns}
        onToggleVisibility={toggleVisibility}
        onUpdateProp={updateColumnProp}
        onMoveColumn={moveColumn}
        onReset={resetToDefault}
        moduleTitle="Dự báo nhập hàng"
      />
    </div>
  );
}

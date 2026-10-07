import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { useData } from '../../../context/DataContext';
import { useSettings } from '../../../context/SettingsContext';
import { 
  formatNumber, 
  formatCurrency, 
  formatDateVN, 
  cleanNumber, 
  parseSimpleSheetDate, 
  matchesSearch 
} from '../../../utils/formatters';
import { 
  Package, 
  Warehouse, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ArrowLeftRight, 
  Search, 
  Filter, 
  Calendar, 
  RefreshCw,
  Building2,
  Tag,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

export function ProductDetailModal({
  isOpen,
  onClose,
  productRow
}) {
  const { 
    nhapData, 
    xuatData, 
    transferData, 
    warehouseProductData, 
    fetchModule 
  } = useData();
  const { getAllSystemWarehouses } = useSettings();

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'WAREHOUSE' | 'TRANSACTIONS'
  const [selectedKho, setSelectedKho] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Extract Product Info
  const productId = (productRow?.[0] || '').toString().trim();
  const productName = (productRow?.[1] || '').toString().trim();
  const productModel = (productRow?.[2] || '').toString().trim();
  const productImage = (productRow?.[3] || '').toString().trim();
  const productPrice = cleanNumber(productRow?.[4]);
  const productNote = (productRow?.[5] || '').toString().trim();

  // Lazy-load detailed order sheets if not already populated
  useEffect(() => {
    if (isOpen && productId) {
      const loadSheets = async () => {
        setIsLoadingDetails(true);
        try {
          const promises = [];
          if (!nhapData || nhapData.length <= 1) promises.push(fetchModule('nhap'));
          if (!xuatData || xuatData.length <= 1) promises.push(fetchModule('xuat'));
          if (!transferData || transferData.length <= 1) promises.push(fetchModule('chuyenkho'));
          if (!warehouseProductData || warehouseProductData.length <= 1) promises.push(fetchModule('sanphamkho'));
          if (promises.length > 0) {
            await Promise.all(promises);
          }
        } catch (err) {
          console.warn('Error loading detail sheets:', err);
        } finally {
          setIsLoadingDetails(false);
        }
      };
      loadSheets();
    }
  }, [isOpen, productId, nhapData, xuatData, transferData, warehouseProductData, fetchModule]);

  // Normalize product ID for matching
  const cleanId = productId.toLowerCase();

  // 1. Calculate Warehouse Breakdown
  const warehouseBreakdown = useMemo(() => {
    if (!cleanId) return [];

    const baseWarehouses = getAllSystemWarehouses() || [];
    const whMap = new Map();

    baseWarehouses.forEach(w => {
      const k = w.toString().trim().toUpperCase();
      if (k) whMap.set(k, { kho: k, tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 });
    });

    // Baseline Ton Dau from DS_SP_KHO
    (warehouseProductData || []).slice(1).forEach(r => {
      const rId = (r[2] || '').toString().trim().toLowerCase();
      if (rId === cleanId) {
        const kho = (r[1] || '').toString().trim().toUpperCase();
        if (kho) {
          if (!whMap.has(kho)) {
            whMap.set(kho, { kho, tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 });
          }
          whMap.get(kho).tonDau += cleanNumber(r[4]);
        }
      }
    });

    // Nhap from NHAP_CT
    (nhapData || []).slice(1).forEach(r => {
      const rId = (r[6] || '').toString().trim().toLowerCase();
      if (rId === cleanId) {
        const kho = (r[11] || '').toString().trim().toUpperCase();
        if (kho) {
          if (!whMap.has(kho)) {
            whMap.set(kho, { kho, tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 });
          }
          whMap.get(kho).nhap += cleanNumber(r[8]);
        }
      }
    });

    // Xuat from XUAT_CT
    (xuatData || []).slice(1).forEach(r => {
      const rId = (r[6] || '').toString().trim().toLowerCase();
      if (rId === cleanId) {
        const kho = (r[11] || '').toString().trim().toUpperCase();
        if (kho) {
          if (!whMap.has(kho)) {
            whMap.set(kho, { kho, tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 });
          }
          whMap.get(kho).xuat += cleanNumber(r[8]);
        }
      }
    });

    // Chuyen kho from CHUYEN_KHO_CT
    (transferData || []).slice(1).forEach(r => {
      const rId = (r[3] || '').toString().trim().toLowerCase();
      if (rId === cleanId) {
        const khoDi = (r[6] || '').toString().trim().toUpperCase();
        const khoNhan = (r[7] || '').toString().trim().toUpperCase();
        const slg = cleanNumber(r[5]);

        if (khoDi) {
          if (!whMap.has(khoDi)) {
            whMap.set(khoDi, { kho: khoDi, tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 });
          }
          whMap.get(khoDi).chuyenDi += slg;
        }

        if (khoNhan) {
          if (!whMap.has(khoNhan)) {
            whMap.set(khoNhan, { kho: khoNhan, tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 });
          }
          whMap.get(khoNhan).chuyenDen += slg;
        }
      }
    });

    // Compute tonCuoi
    const list = Array.from(whMap.values()).map(item => {
      const tonCuoi = item.tonDau + item.nhap - item.xuat + item.chuyenDen - item.chuyenDi;
      return { ...item, tonCuoi };
    });

    return list.sort((a, b) => a.kho.localeCompare(b.kho));
  }, [cleanId, getAllSystemWarehouses, warehouseProductData, nhapData, xuatData, transferData]);

  // Overall totals across all warehouses
  const overallTotals = useMemo(() => {
    return warehouseBreakdown.reduce((acc, curr) => ({
      tonDau: acc.tonDau + curr.tonDau,
      nhap: acc.nhap + curr.nhap,
      xuat: acc.xuat + curr.xuat,
      chuyenDen: acc.chuyenDen + curr.chuyenDen,
      chuyenDi: acc.chuyenDi + curr.chuyenDi,
      tonCuoi: acc.tonCuoi + curr.tonCuoi
    }), { tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 });
  }, [warehouseBreakdown]);

  // 2. Chronological Daily Transactions (Nhập & Xuất theo ngày từng kho)
  const allTransactions = useMemo(() => {
    if (!cleanId) return [];

    const list = [];

    // Nhap transactions
    (nhapData || []).slice(1).forEach((r, idx) => {
      const rId = (r[6] || '').toString().trim().toLowerCase();
      if (rId === cleanId) {
        list.push({
          id: `NHAP_${r[0] || idx}`,
          date: r[1] || '',
          type: 'NHẬP',
          mdh: (r[3] || '').toString().trim(),
          partnerCode: (r[4] || '').toString().trim(),
          partnerName: (r[5] || '').toString().trim(),
          kho: (r[11] || '').toString().trim().toUpperCase(),
          slg: cleanNumber(r[8]),
          donGia: cleanNumber(r[9]),
          thanhTien: cleanNumber(r[10]),
          user: r[12] || '',
          note: r[13] || '',
          loaiHinh: r[14] || 'Thường'
        });
      }
    });

    // Xuat transactions
    (xuatData || []).slice(1).forEach((r, idx) => {
      const rId = (r[6] || '').toString().trim().toLowerCase();
      if (rId === cleanId) {
        list.push({
          id: `XUAT_${r[0] || idx}`,
          date: r[1] || '',
          type: 'XUẤT',
          mdh: (r[3] || '').toString().trim(),
          partnerCode: (r[4] || '').toString().trim(),
          partnerName: (r[5] || '').toString().trim(),
          kho: (r[11] || '').toString().trim().toUpperCase(),
          slg: cleanNumber(r[8]),
          donGia: cleanNumber(r[9]),
          thanhTien: cleanNumber(r[10]),
          user: r[12] || '',
          note: r[13] || '',
          loaiHinh: r[14] || 'Thường'
        });
      }
    });

    // Chuyen kho transactions
    (transferData || []).slice(1).forEach((r, idx) => {
      const rId = (r[3] || '').toString().trim().toLowerCase();
      if (rId === cleanId) {
        const khoDi = (r[6] || '').toString().trim().toUpperCase();
        const khoNhan = (r[7] || '').toString().trim().toUpperCase();
        list.push({
          id: `TRANSFER_${r[0] || idx}`,
          date: r[1] || '',
          type: 'CHUYỂN KHO',
          mdh: (r[2] || '').toString().trim(),
          partnerCode: '',
          partnerName: `Chuyển kho: ${khoDi} ➔ ${khoNhan}`,
          kho: `${khoDi} ➔ ${khoNhan}`,
          transferFrom: khoDi,
          transferTo: khoNhan,
          slg: cleanNumber(r[5]),
          donGia: 0,
          thanhTien: 0,
          user: '',
          note: r[8] || '',
          loaiHinh: r[9] || 'Điều chuyển'
        });
      }
    });

    // Sort descending by date
    return list.sort((a, b) => {
      const dateA = parseSimpleSheetDate(a.date);
      const dateB = parseSimpleSheetDate(b.date);
      const timeA = Number.isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = Number.isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      return timeB - timeA;
    });
  }, [cleanId, nhapData, xuatData, transferData]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(item => {
      // Kho filter
      if (selectedKho !== 'ALL') {
        const targetK = selectedKho.toUpperCase();
        if (item.type === 'CHUYỂN KHO') {
          if (item.transferFrom !== targetK && item.transferTo !== targetK) return false;
        } else if (item.kho !== targetK) {
          return false;
        }
      }

      // Type filter
      if (selectedType !== 'ALL' && item.type !== selectedType) {
        return false;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        const itemDate = parseSimpleSheetDate(item.date);
        if (!Number.isNaN(itemDate.getTime())) {
          if (dateFrom) {
            const dFrom = parseSimpleSheetDate(dateFrom);
            if (!Number.isNaN(dFrom.getTime()) && itemDate < dFrom) return false;
          }
          if (dateTo) {
            const dTo = parseSimpleSheetDate(dateTo);
            if (!Number.isNaN(dTo.getTime()) && itemDate > dTo) return false;
          }
        }
      }

      // Search term
      if (searchTerm) {
        const text = `${item.mdh} ${item.partnerCode} ${item.partnerName} ${item.note} ${item.kho} ${item.date}`;
        if (!matchesSearch(text, searchTerm)) return false;
      }

      return true;
    });
  }, [allTransactions, selectedKho, selectedType, dateFrom, dateTo, searchTerm]);

  // Total summary of filtered transactions
  const filteredTransSummary = useMemo(() => {
    let totalNhap = 0;
    let totalXuat = 0;
    let totalAmountNhap = 0;
    let totalAmountXuat = 0;

    filteredTransactions.forEach(t => {
      if (t.type === 'NHẬP') {
        totalNhap += t.slg;
        totalAmountNhap += t.thanhTien;
      } else if (t.type === 'XUẤT') {
        totalXuat += t.slg;
        totalAmountXuat += t.thanhTien;
      }
    });

    return { totalNhap, totalXuat, totalAmountNhap, totalAmountXuat };
  }, [filteredTransactions]);

  if (!isOpen || !productRow) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-slate-800">Chi tiết tồn kho & Lịch sử Nhập / Xuất</span>
          <span className="px-2 py-0.5 text-xs font-black rounded bg-blue-100 text-blue-800">
            {productId}
          </span>
        </div>
      }
      maxWidth="max-w-6xl"
    >
      <div className="space-y-4">
        {/* Product Card Header */}
        <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {productImage ? (
              <img 
                src={productImage} 
                alt={productName} 
                className="w-14 h-14 object-cover rounded-xl border border-slate-200 shadow-sm shrink-0 bg-white"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                <Package className="w-7 h-7" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-base text-slate-800">{productId}</span>
                {productModel && (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-700">
                    Model: {productModel}
                  </span>
                )}
                {productPrice > 0 && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                    Giá: {formatCurrency(productPrice)}
                  </span>
                )}
              </div>
              <h4 className="font-bold text-slate-800 text-sm mt-0.5">{productName}</h4>
              {productNote && (
                <p className="text-xs text-slate-500 mt-0.5 italic">Ghi chú: {productNote}</p>
              )}
            </div>
          </div>

          {/* Quick Aggregate KPI Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto shrink-0">
            <div className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-center shadow-sm">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tồn đầu</div>
              <div className="text-sm font-extrabold text-slate-700">{formatNumber(overallTotals.tonDau)}</div>
            </div>
            <div className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-center shadow-sm">
              <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Tổng Nhập</div>
              <div className="text-sm font-extrabold text-blue-600">{formatNumber(overallTotals.nhap)}</div>
            </div>
            <div className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-center shadow-sm">
              <div className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">Tổng Xuất</div>
              <div className="text-sm font-extrabold text-orange-600">{formatNumber(overallTotals.xuat)}</div>
            </div>
            <div className={`px-3 py-2 rounded-xl border text-center shadow-sm ${
              overallTotals.tonCuoi <= 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${
                overallTotals.tonCuoi <= 0 ? 'text-red-700' : 'text-emerald-700'
              }`}>Tồn cuối tổng</div>
              <div className={`text-sm font-black ${
                overallTotals.tonCuoi <= 0 ? 'text-red-700' : 'text-emerald-700'
              }`}>
                {formatNumber(overallTotals.tonCuoi)}
              </div>
            </div>
          </div>
        </div>

        {/* View Selection Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 gap-2 pb-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Xem cả 2 bảng (Tồn kho & Lịch sử)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('WAREHOUSE')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'WAREHOUSE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Chỉ xem Bảng Tồn từng kho
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TRANSACTIONS')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'TRANSACTIONS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Chỉ xem Lịch sử Nhập / Xuất
            </button>
          </div>

          {isLoadingDetails && (
            <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Đang tải số liệu chi tiết...</span>
            </div>
          )}
        </div>

        {/* 1. BẢNG TỒN KHO THEO TỪNG KHO */}
        {(activeTab === 'ALL' || activeTab === 'WAREHOUSE') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Warehouse className="w-4 h-4 text-indigo-600" />
                <span>Bảng số liệu tồn chi tiết theo từng kho</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                {warehouseBreakdown.length} kho cấu hình
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Tên Kho</th>
                    <th className="py-2.5 px-3 text-right">Tồn đầu</th>
                    <th className="py-2.5 px-3 text-right text-blue-600">Tổng Nhập</th>
                    <th className="py-2.5 px-3 text-right text-orange-600">Tổng Xuất</th>
                    <th className="py-2.5 px-3 text-right text-purple-600">Chuyển đến (+)</th>
                    <th className="py-2.5 px-3 text-right text-purple-600">Chuyển đi (-)</th>
                    <th className="py-2.5 px-3 text-right font-black">Tồn cuối kho</th>
                    <th className="py-2.5 px-3 text-center">Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {warehouseBreakdown.map((row, idx) => {
                    const ratio = overallTotals.tonCuoi > 0 
                      ? Math.round((Math.max(0, row.tonCuoi) / overallTotals.tonCuoi) * 100) 
                      : 0;

                    return (
                      <tr 
                        key={idx} 
                        className={`hover:bg-slate-50 transition cursor-pointer ${
                          selectedKho === row.kho ? 'bg-blue-50/40 font-bold' : ''
                        }`}
                        onClick={() => setSelectedKho(selectedKho === row.kho ? 'ALL' : row.kho)}
                        title="Bấm để lọc lịch sử giao dịch theo kho này"
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-1.5">
                          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                          <span>{row.kho}</span>
                          {selectedKho === row.kho && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded">Đang lọc</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                          {formatNumber(row.tonDau)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-blue-600 font-semibold font-mono">
                          {formatNumber(row.nhap)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-orange-600 font-semibold font-mono">
                          {formatNumber(row.xuat)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-purple-600 font-mono">
                          {row.chuyenDen > 0 ? `+${formatNumber(row.chuyenDen)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-purple-600 font-mono">
                          {row.chuyenDi > 0 ? `-${formatNumber(row.chuyenDi)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            row.tonCuoi <= 0 ? 'bg-red-50 text-red-600 border border-red-200' :
                            row.tonCuoi < 5 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {formatNumber(row.tonCuoi)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-[11px] text-slate-500 font-medium">{ratio}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Total Row */}
                <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-800">
                  <tr>
                    <td className="py-2.5 px-3 uppercase text-[11px]">TỔNG CỘNG TẤT CẢ KHO</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatNumber(overallTotals.tonDau)}</td>
                    <td className="py-2.5 px-3 text-right text-blue-600 font-mono">{formatNumber(overallTotals.nhap)}</td>
                    <td className="py-2.5 px-3 text-right text-orange-600 font-mono">{formatNumber(overallTotals.xuat)}</td>
                    <td className="py-2.5 px-3 text-right text-purple-600 font-mono">{formatNumber(overallTotals.chuyenDen)}</td>
                    <td className="py-2.5 px-3 text-right text-purple-600 font-mono">{formatNumber(overallTotals.chuyenDi)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 text-sm font-black font-mono">
                      {formatNumber(overallTotals.tonCuoi)}
                    </td>
                    <td className="py-2.5 px-3 text-center">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* 2. BẢNG CHI TIẾT NHẬP XUẤT TỪNG NGÀY TỪNG KHO */}
        {(activeTab === 'ALL' || activeTab === 'TRANSACTIONS') && (
          <div className="space-y-2 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>Nhật ký Nhập & Xuất từng ngày, từng kho</span>
                <span className="text-slate-400 font-normal">({filteredTransactions.length} giao dịch)</span>
              </h4>

              {/* Filter summary badges */}
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Nhập: <b>{formatNumber(filteredTransSummary.totalNhap)}</b>
                </span>
                <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  Xuất: <b>{formatNumber(filteredTransSummary.totalXuat)}</b>
                </span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-2 text-xs">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo MDH, khách hàng, ghi chú..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Kho Filter */}
              <select
                value={selectedKho}
                onChange={(e) => setSelectedKho(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="ALL">Tất cả kho</option>
                {warehouseBreakdown.map((w, i) => (
                  <option key={i} value={w.kho}>{w.kho}</option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả loại giao dịch</option>
                <option value="NHẬP">Chỉ Nhập hàng</option>
                <option value="XUẤT">Chỉ Xuất hàng</option>
                <option value="CHUYỂN KHO">Điều chuyển kho</option>
              </select>

              {/* Date From */}
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1">
                <span className="text-[10px] text-slate-400">Từ:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-xs outline-none bg-transparent"
                />
              </div>

              {/* Date To */}
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1">
                <span className="text-[10px] text-slate-400">Đến:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-xs outline-none bg-transparent"
                />
              </div>

              {(selectedKho !== 'ALL' || selectedType !== 'ALL' || dateFrom || dateTo || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedKho('ALL');
                    setSelectedType('ALL');
                    setDateFrom('');
                    setDateTo('');
                    setSearchTerm('');
                  }}
                  className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* Transactions Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3 w-28">Ngày</th>
                    <th className="py-2.5 px-3 w-24">Loại</th>
                    <th className="py-2.5 px-3 w-28">Mã đơn</th>
                    <th className="py-2.5 px-3 w-28">Kho</th>
                    <th className="py-2.5 px-3">Đối tác / Giao dịch</th>
                    <th className="py-2.5 px-3 text-right w-24">Số lượng</th>
                    <th className="py-2.5 px-3 text-right w-28">Đơn giá</th>
                    <th className="py-2.5 px-3 text-right w-28">Thành tiền</th>
                    <th className="py-2.5 px-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400 italic">
                        Không có giao dịch Nhập/Xuất nào cho sản phẩm này theo bộ lọc đã chọn.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isNhap = tx.type === 'NHẬP';
                      const isXuat = tx.type === 'XUẤT';
                      const isTransfer = tx.type === 'CHUYỂN KHO';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                          {/* Ngày */}
                          <td className="py-2 px-3 text-slate-600 font-mono whitespace-nowrap">
                            {formatDateVN(tx.date)}
                          </td>

                          {/* Loại */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isNhap ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              isXuat ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                              {isNhap && <ArrowDownToLine className="w-2.5 h-2.5" />}
                              {isXuat && <ArrowUpFromLine className="w-2.5 h-2.5" />}
                              {isTransfer && <ArrowLeftRight className="w-2.5 h-2.5" />}
                              {tx.type}
                            </span>
                          </td>

                          {/* MDH */}
                          <td className="py-2 px-3 font-bold text-slate-800 whitespace-nowrap">
                            {tx.mdh || '-'}
                          </td>

                          {/* Kho */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                              {tx.kho || '-'}
                            </span>
                          </td>

                          {/* Đối tác */}
                          <td className="py-2 px-3 text-slate-700">
                            <div className="truncate max-w-[200px]" title={tx.partnerName || tx.partnerCode}>
                              {tx.partnerName || tx.partnerCode || '-'}
                            </div>
                          </td>

                          {/* Số lượng */}
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <span className={`font-extrabold ${
                              isNhap ? 'text-blue-600' :
                              isXuat ? 'text-orange-600' :
                              'text-purple-600'
                            }`}>
                              {isNhap ? `+${formatNumber(tx.slg)}` : isXuat ? `-${formatNumber(tx.slg)}` : formatNumber(tx.slg)}
                            </span>
                          </td>

                          {/* Đơn giá */}
                          <td className="py-2 px-3 text-right text-slate-500 whitespace-nowrap">
                            {tx.donGia > 0 ? formatCurrency(tx.donGia) : '-'}
                          </td>

                          {/* Thành tiền */}
                          <td className="py-2 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {tx.thanhTien > 0 ? formatCurrency(tx.thanhTien) : '-'}
                          </td>

                          {/* Ghi chú */}
                          <td className="py-2 px-3 text-slate-500 max-w-[150px] truncate" title={tx.note}>
                            {tx.note || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

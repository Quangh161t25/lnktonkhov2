import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { 
  formatNumber, 
  formatCurrency, 
  formatDateVN, 
  formatDateInput, 
  parseSimpleSheetDate, 
  cleanNumber 
} from '../../../utils/formatters';
import { 
  BarChart3, 
  LineChart, 
  Calendar, 
  Filter, 
  Package, 
  Users, 
  RotateCcw, 
  TrendingUp, 
  ArrowUpFromLine, 
  ArrowDownToLine, 
  Layers,
  ChevronRight 
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function HomeAnalyticsChart({ xuatData = [], nhapData = [], productData = [], usersData = [], onNavigate }) {
  // Preset date helpers
  const getInitialDates = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29); // 30 days default
    return {
      start: formatDateInput(start),
      end: formatDateInput(end)
    };
  };

  const initialDates = useMemo(getInitialDates, []);

  // Filter states
  const [dateFrom, setDateFrom] = useState(initialDates.start);
  const [dateTo, setDateTo] = useState(initialDates.end);
  const [datePreset, setDatePreset] = useState('30days');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [ioFilter, setIoFilter] = useState('all'); // 'all' | 'xuat' | 'nhap'
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line'
  const [groupBy, setGroupBy] = useState('day'); // 'day' | 'month' | 'year'
  const [metricType, setMetricType] = useState('qty'); // 'qty' | 'amount'

  // Presets handler
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (preset === '7days') {
      from.setDate(now.getDate() - 6);
      setGroupBy('day');
    } else if (preset === '30days') {
      from.setDate(now.getDate() - 29);
      setGroupBy('day');
    } else if (preset === 'thisMonth') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setGroupBy('day');
    } else if (preset === 'lastMonth') {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
      setGroupBy('day');
    } else if (preset === 'thisYear') {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
      setGroupBy('month');
    } else if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
      setGroupBy('year');
      return;
    }

    setDateFrom(formatDateInput(from));
    setDateTo(formatDateInput(to));
  };

  // View mode handler (Ngày, Tháng, Năm)
  const handleViewModeChange = (mode) => {
    setGroupBy(mode);
    const now = new Date();
    if (mode === 'year') {
      if (datePreset !== 'all') {
        setDatePreset('all');
        setDateFrom('');
        setDateTo('');
      }
    } else if (mode === 'month') {
      if (datePreset === '7days' || datePreset === '30days') {
        setDatePreset('thisYear');
        setDateFrom(formatDateInput(new Date(now.getFullYear(), 0, 1)));
        setDateTo(formatDateInput(new Date(now.getFullYear(), 11, 31)));
      }
    } else if (mode === 'day') {
      if (datePreset === 'all' || datePreset === 'thisYear') {
        setDatePreset('30days');
        const start = new Date();
        start.setDate(now.getDate() - 29);
        setDateFrom(formatDateInput(start));
        setDateTo(formatDateInput(now));
      }
    }
  };

  // Autocomplete products list
  const productOptions = useMemo(() => {
    const map = new Map();
    (productData || []).slice(1).forEach(r => {
      const id = (r[0] || '').toString().trim();
      const name = (r[1] || '').toString().trim();
      if (id) map.set(id.toLowerCase(), { id, name });
    });
    // Also include products seen in xuat
    (xuatData || []).slice(1).forEach(r => {
      const id = (r[6] || '').toString().trim();
      const name = (r[7] || '').toString().trim();
      if (id && !map.has(id.toLowerCase())) {
        map.set(id.toLowerCase(), { id, name });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [productData, xuatData]);

  // Autocomplete customer/NPP list
  const customerOptions = useMemo(() => {
    const map = new Map();
    (usersData || []).filter(u => u.type?.includes('KHÁCH') || u.type?.includes('NPP') || u.role === 'NPP' || u.role === 'KH').forEach(u => {
      if (u.id) map.set(u.id.toLowerCase(), { id: u.id, name: u.name });
    });
    // Also include customers in xuatData
    (xuatData || []).slice(1).forEach(r => {
      const maKh = (r[4] || '').toString().trim();
      const tenKh = (r[5] || '').toString().trim();
      if (maKh && !map.has(maKh.toLowerCase())) {
        map.set(maKh.toLowerCase(), { id: maKh, name: tenKh || maKh });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [usersData, xuatData]);

  // Reset filters
  const handleResetFilters = () => {
    const init = getInitialDates();
    setDateFrom(init.start);
    setDateTo(init.end);
    setDatePreset('30days');
    setSelectedProduct('');
    setSelectedCustomer('');
    setIoFilter('all');
    setGroupBy('day');
    setMetricType('qty');
  };

  // Filter and Aggregate Data
  const { chartData, summaryStats, topExportedProducts, topImportedProducts, topCustomers } = useMemo(() => {
    const dFrom = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const dTo = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    const prodTarget = selectedProduct.trim().toLowerCase();
    const custTarget = selectedCustomer.trim().toLowerCase();

    const dateBuckets = new Map(); // key -> { xuatQty: 0, xuatAmount: 0, nhapQty: 0, nhapAmount: 0, sortDate }
    const prodMap = new Map();
    const nhapProdMap = new Map();
    const custMap = new Map();

    let totalXuatQty = 0;
    let totalXuatAmount = 0;
    let totalNhapQty = 0;
    let totalNhapAmount = 0;

    // 1. Process XUẤT Data (if ioFilter is 'all' or 'xuat')
    if (ioFilter === 'all' || ioFilter === 'xuat') {
      (xuatData || []).slice(1).forEach(row => {
        const dateStr = row[1];
        if (!dateStr) return;
        const d = parseSimpleSheetDate(dateStr);
        if (Number.isNaN(d.getTime())) return;
        if (dFrom && d < dFrom) return;
        if (dTo && d > dTo) return;

        const maKh = (row[4] || '').toString().trim();
        const tenKh = (row[5] || '').toString().trim();
        const maKhLower = maKh.toLowerCase();
        const tenKhLower = tenKh.toLowerCase();

        if (custTarget) {
          if (!maKhLower.includes(custTarget) && !tenKhLower.includes(custTarget)) return;
        }

        const idSp = (row[6] || '').toString().trim();
        const tenSp = (row[7] || '').toString().trim();
        const idSpLower = idSp.toLowerCase();
        const tenSpLower = tenSp.toLowerCase();

        if (prodTarget) {
          if (!idSpLower.includes(prodTarget) && !tenSpLower.includes(prodTarget)) return;
        }

        const slg = cleanNumber(row[8]) || 0;
        const donGia = cleanNumber(row[9]) || 0;
        const thanhTien = cleanNumber(row[10]) || (slg * donGia);
        const mdh = (row[3] || '').toString().trim();

        totalXuatQty += slg;
        totalXuatAmount += thanhTien;

        // Group key for timeline
        let key = '';
        let sortDate = new Date(d);
        if (groupBy === 'year') {
          const yyyy = d.getFullYear();
          key = `Năm ${yyyy}`;
          sortDate = new Date(yyyy, 0, 1);
        } else if (groupBy === 'month') {
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          key = `T${mm}/${yyyy}`;
          sortDate = new Date(yyyy, d.getMonth(), 1);
        } else {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          key = `${dd}/${mm}`;
          sortDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }

        if (!dateBuckets.has(key)) {
          dateBuckets.set(key, { label: key, xuatQty: 0, xuatAmount: 0, nhapQty: 0, nhapAmount: 0, sortDate });
        }
        const b = dateBuckets.get(key);
        b.xuatQty += slg;
        b.xuatAmount += thanhTien;

        // Aggregate filtered Top Products
        if (idSp) {
          const pKey = idSpLower;
          if (!prodMap.has(pKey)) {
            prodMap.set(pKey, { idSp, tenSp, totalQty: 0, totalAmount: 0, orderCount: 0 });
          }
          const p = prodMap.get(pKey);
          p.totalQty += slg;
          p.totalAmount += thanhTien;
          p.orderCount += 1;
          if (!p.tenSp && tenSp) p.tenSp = tenSp;
        }

        // Aggregate filtered Top Customers
        if (maKh || tenKh) {
          const cKey = (maKh || tenKh).toLowerCase();
          if (!custMap.has(cKey)) {
            custMap.set(cKey, { maKh, tenKh, totalQty: 0, totalAmount: 0, orders: new Set() });
          }
          const c = custMap.get(cKey);
          c.totalQty += slg;
          c.totalAmount += thanhTien;
          if (mdh) c.orders.add(mdh);
        }
      });
    }

    // 2. Process NHẬP Data (if ioFilter is 'all' or 'nhap', unless filtering by specific customer NPP that only applies to xuat)
    if ((ioFilter === 'all' || ioFilter === 'nhap') && !custTarget) {
      (nhapData || []).slice(1).forEach(row => {
        const dateStr = row[1];
        if (!dateStr) return;
        const d = parseSimpleSheetDate(dateStr);
        if (Number.isNaN(d.getTime())) return;
        if (dFrom && d < dFrom) return;
        if (dTo && d > dTo) return;

        const idSp = (row[6] || '').toString().trim();
        const tenSp = (row[7] || '').toString().trim();
        const idSpLower = idSp.toLowerCase();
        const tenSpLower = tenSp.toLowerCase();

        if (prodTarget) {
          if (!idSpLower.includes(prodTarget) && !tenSpLower.includes(prodTarget)) return;
        }

        const slg = cleanNumber(row[8]) || 0;
        const donGia = cleanNumber(row[9]) || 0;
        const thanhTien = cleanNumber(row[10]) || (slg * donGia);

        totalNhapQty += slg;
        totalNhapAmount += thanhTien;

        let key = '';
        let sortDate = new Date(d);
        if (groupBy === 'year') {
          const yyyy = d.getFullYear();
          key = `Năm ${yyyy}`;
          sortDate = new Date(yyyy, 0, 1);
        } else if (groupBy === 'month') {
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          key = `T${mm}/${yyyy}`;
          sortDate = new Date(yyyy, d.getMonth(), 1);
        } else {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          key = `${dd}/${mm}`;
          sortDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }

        if (!dateBuckets.has(key)) {
          dateBuckets.set(key, { label: key, xuatQty: 0, xuatAmount: 0, nhapQty: 0, nhapAmount: 0, sortDate });
        }
        const b = dateBuckets.get(key);
        b.nhapQty += slg;
        b.nhapAmount += thanhTien;

        // Aggregate filtered Top Imported Products
        if (idSp) {
          const pKey = idSpLower;
          if (!nhapProdMap.has(pKey)) {
            nhapProdMap.set(pKey, { idSp, tenSp, totalQty: 0, totalAmount: 0, orderCount: 0 });
          }
          const p = nhapProdMap.get(pKey);
          p.totalQty += slg;
          p.totalAmount += thanhTien;
          p.orderCount += 1;
          if (!p.tenSp && tenSp) p.tenSp = tenSp;
        }
      });
    }

    // Sort buckets chronologically
    const sortedBuckets = Array.from(dateBuckets.values()).sort((a, b) => a.sortDate - b.sortDate);

    const labels = sortedBuckets.map(b => b.label);
    const xuatValues = sortedBuckets.map(b => metricType === 'amount' ? b.xuatAmount : b.xuatQty);
    const nhapValues = sortedBuckets.map(b => metricType === 'amount' ? b.nhapAmount : b.nhapQty);

    const topExportedProducts = Array.from(prodMap.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 6);

    const topImportedProducts = Array.from(nhapProdMap.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 6);

    const topCustomers = Array.from(custMap.values())
      .map(c => ({ ...c, orderCount: c.orders.size }))
      .sort((a, b) => b.totalAmount - a.totalAmount || b.totalQty - a.totalQty)
      .slice(0, 6);

    return {
      summaryStats: {
        totalXuatQty,
        totalXuatAmount,
        totalNhapQty,
        totalNhapAmount
      },
      topExportedProducts,
      topImportedProducts,
      topCustomers,
      chartData: {
        labels,
        datasets: [
          ...((ioFilter === 'all' || ioFilter === 'xuat') ? [{
            label: metricType === 'amount' ? 'Doanh số Xuất (VNĐ)' : 'Số lượng Xuất (SP)',
            data: xuatValues,
            backgroundColor: chartType === 'line' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.85)',
            borderColor: '#ea580c',
            borderWidth: 2,
            borderRadius: chartType === 'bar' ? 6 : 0,
            fill: chartType === 'line',
            tension: 0.3,
            pointRadius: chartType === 'line' ? 3 : 0,
            pointHoverRadius: 6
          }] : []),
          ...(((ioFilter === 'all' || ioFilter === 'nhap') && !custTarget) ? [{
            label: metricType === 'amount' ? 'Giá trị Nhập (VNĐ)' : 'Số lượng Nhập (SP)',
            data: nhapValues,
            backgroundColor: chartType === 'line' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(37, 99, 235, 0.75)',
            borderColor: '#2563eb',
            borderWidth: 2,
            borderRadius: chartType === 'bar' ? 6 : 0,
            fill: chartType === 'line',
            tension: 0.3,
            pointRadius: chartType === 'line' ? 3 : 0,
            pointHoverRadius: 6
          }] : [])
        ]
      }
    };
  }, [xuatData, nhapData, dateFrom, dateTo, selectedProduct, selectedCustomer, groupBy, metricType, chartType, ioFilter]);

  // Chart Options
  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { size: 12, weight: 'bold', family: 'system-ui, -apple-system, sans-serif' },
            boxWidth: 14,
            usePointStyle: true,
            padding: 16
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            label: function(context) {
              const val = context.raw || 0;
              return metricType === 'amount'
                ? ` ${context.dataset.label}: ${formatCurrency(val)}`
                : ` ${context.dataset.label}: ${formatNumber(val)} SP`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11, weight: '500' },
            color: '#64748b',
            maxRotation: 45
          }
        },
        y: {
          grid: { color: 'rgba(226, 232, 240, 0.7)' },
          ticks: {
            font: { size: 11 },
            color: '#64748b',
            callback: function(val) {
              if (metricType === 'amount') {
                if (val >= 1000000000) return (val / 1000000000).toFixed(1) + ' tỷ';
                if (val >= 1000000) return (val / 1000000).toFixed(0) + ' tr';
                return formatNumber(val);
              }
              return formatNumber(val);
            }
          }
        }
      }
    };
  }, [metricType]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-sm space-y-5">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">
              Biểu Đồ Phân Tích Xuất - Nhập Kho Theo Thời Gian
            </h3>
            <p className="text-xs text-slate-400">
              Thống kê xu hướng biến động theo ngày/tháng, sản phẩm và nhà phân phối
            </p>
          </div>
        </div>

        {/* View Switchers: Bar vs Line & Qty vs Amount */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMetricType('qty')}
              className={`px-3 py-1.5 rounded-lg transition ${
                metricType === 'qty' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Số lượng (SP)
            </button>
            <button
              type="button"
              onClick={() => setMetricType('amount')}
              className={`px-3 py-1.5 rounded-lg transition ${
                metricType === 'amount' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Doanh số (VNĐ)
            </button>
          </div>

          {/* Chart Type Selector */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg transition ${
                chartType === 'bar' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Biểu đồ cột"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded-lg transition ${
                chartType === 'line' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Biểu đồ đường"
            >
              <LineChart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Control Toolbar - Single Row */}
      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Presets */}
          <div className="flex items-center gap-1 shrink-0">
            {[
              { id: '7days', label: '7 ngày qua' },
              { id: '30days', label: '30 ngày qua' },
              { id: 'thisMonth', label: 'Tháng này' },
              { id: 'lastMonth', label: 'Tháng trước' },
              { id: 'thisYear', label: 'Năm nay' },
              { id: 'all', label: 'Tất cả' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id)}
                className={`px-2.5 py-1.5 rounded-xl font-bold transition border text-[11px] whitespace-nowrap cursor-pointer ${
                  datePreset === p.id 
                    ? 'bg-orange-600 text-white border-orange-600 shadow-2xs' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200 hidden xl:block shrink-0"></div>

          {/* Nhập / Xuất Pill Selector */}
          <div className="inline-flex rounded-xl bg-white border border-slate-200 p-0.5 font-bold text-[11px] shrink-0">
            <button
              type="button"
              onClick={() => setIoFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                ioFilter === 'all' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cả hai
            </button>
            <button
              type="button"
              onClick={() => setIoFilter('xuat')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                ioFilter === 'xuat' ? 'bg-orange-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Xuất kho
            </button>
            <button
              type="button"
              onClick={() => setIoFilter('nhap')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                ioFilter === 'nhap' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nhập kho
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden xl:block shrink-0"></div>

          {/* Date range inputs */}
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setDatePreset('custom');
              }}
              placeholder="Từ ngày"
              title="Từ ngày"
              className="w-32 sm:w-34 px-2 py-1.5 border border-slate-200 rounded-xl bg-white font-semibold text-slate-700 focus:ring-1 focus:ring-orange-500 outline-none text-xs"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setDatePreset('custom');
              }}
              placeholder="Đến ngày"
              title="Đến ngày"
              className="w-32 sm:w-34 px-2 py-1.5 border border-slate-200 rounded-xl bg-white font-semibold text-slate-700 focus:ring-1 focus:ring-orange-500 outline-none text-xs"
            />
          </div>

          {/* Product Filter */}
          <div className="relative min-w-[140px] flex-1">
            <input
              type="text"
              list="homeChartProductDatalist"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              placeholder="Lọc sản phẩm..."
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white font-semibold text-slate-700 focus:ring-1 focus:ring-orange-500 outline-none text-xs"
            />
            <datalist id="homeChartProductDatalist">
              {productOptions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </datalist>
          </div>

          {/* Customer / NPP Filter */}
          <div className="relative min-w-[150px] flex-1">
            <input
              type="text"
              list="homeChartCustomerDatalist"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              placeholder="Lọc NPP / Khách hàng..."
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white font-semibold text-slate-700 focus:ring-1 focus:ring-orange-500 outline-none text-xs"
            />
            <datalist id="homeChartCustomerDatalist">
              {customerOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </datalist>
          </div>

          {/* Reset Filters Action */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 font-bold text-slate-600 transition flex items-center justify-center gap-1.5 cursor-pointer text-xs shrink-0"
            title="Đặt lại bộ lọc"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Đặt lại</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Pills in Filtered Period */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-orange-50/70 border border-orange-100 p-3 rounded-2xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <ArrowUpFromLine className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-orange-700 uppercase">Tổng Xuất trong kỳ</p>
            <p className="font-extrabold text-sm text-slate-800 truncate">
              {metricType === 'amount' ? formatCurrency(summaryStats.totalXuatAmount) : `${formatNumber(summaryStats.totalXuatQty)} SP`}
            </p>
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-2xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <ArrowDownToLine className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-blue-700 uppercase">Tổng Nhập trong kỳ</p>
            <p className="font-extrabold text-sm text-slate-800 truncate">
              {metricType === 'amount' ? formatCurrency(summaryStats.totalNhapAmount) : `${formatNumber(summaryStats.totalNhapQty)} SP`}
            </p>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-2xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-emerald-700 uppercase">Doanh thu xuất kỳ này</p>
            <p className="font-extrabold text-sm text-emerald-700 truncate">
              {formatCurrency(summaryStats.totalXuatAmount)}
            </p>
          </div>
        </div>

        <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-2xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-indigo-700 uppercase">Số mốc thời gian</p>
            <p className="font-extrabold text-sm text-indigo-900">
              {chartData.labels.length} điểm dữ liệu
            </p>
          </div>
        </div>
      </div>

      {/* View Mode Switcher (Ngày / Tháng / Năm) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-700 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            Biểu đồ {groupBy === 'day' ? 'theo Từng Ngày' : groupBy === 'month' ? 'theo Từng Tháng' : 'theo Từng Năm'} ({chartData.labels.length} mốc dữ liệu)
          </span>
        </div>

        {/* 3 View Mode Buttons: Ngày, Tháng, Năm */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dạng xem:</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 font-bold text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => handleViewModeChange('day')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                groupBy === 'day'
                  ? 'bg-white text-orange-600 shadow-xs font-extrabold border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Ngày</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('month')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                groupBy === 'month'
                  ? 'bg-white text-orange-600 shadow-xs font-extrabold border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Tháng</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('year')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                groupBy === 'year'
                  ? 'bg-white text-orange-600 shadow-xs font-extrabold border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Năm</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="h-72 md:h-80 w-full pt-2">
        {chartData.labels.length > 0 ? (
          chartType === 'bar' ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <Line data={chartData} options={chartOptions} />
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
            <p>Không có dữ liệu phù hợp với bộ lọc thời gian, sản phẩm hoặc NPP đã chọn.</p>
          </div>
        )}
      </div>

      {/* BÁO CÁO PHÂN TÍCH THEO BỘ LỌC ĐANG CHỌN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-3 border-t border-slate-100">
        {/* Card 1: Top Sản phẩm (Xuất hoặc Nhập) */}
        <div className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${ioFilter === 'nhap' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                {ioFilter === 'nhap' ? <ArrowDownToLine className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800 text-sm">
                    {ioFilter === 'nhap' ? 'Top Sản phẩm Nhập trong kỳ' : 'Top Sản phẩm Xuất trong kỳ'}
                  </h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    ioFilter === 'nhap' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    Theo bộ lọc
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {ioFilter === 'nhap' ? 'Xếp hạng theo tổng sản lượng nhập kho đã lọc' : 'Xếp hạng theo tổng sản lượng xuất kho đã lọc'}
                </p>
              </div>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate(ioFilter === 'nhap' ? 'nhap' : 'xuat')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                Xem chi tiết <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(ioFilter === 'nhap' ? topImportedProducts : topExportedProducts).length > 0 ? (
            <div className="divide-y divide-slate-200/50">
              {(ioFilter === 'nhap' ? topImportedProducts : topExportedProducts).map((p, idx) => (
                <div key={p.idSp} className="py-2.5 flex items-center justify-between text-xs hover:bg-white rounded-xl px-2 transition">
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                      idx === 0 ? (ioFilter === 'nhap' ? 'bg-blue-600 text-white shadow-xs' : 'bg-amber-400 text-white shadow-xs') :
                      idx === 1 ? 'bg-slate-300 text-slate-700' :
                      idx === 2 ? (ioFilter === 'nhap' ? 'bg-sky-400 text-white' : 'bg-amber-600 text-white') : 'bg-slate-200 text-slate-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{p.idSp}</p>
                      <p className="text-[11px] text-slate-400 truncate">{p.tenSp || 'Sản phẩm'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-extrabold block ${ioFilter === 'nhap' ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatNumber(p.totalQty)} SP
                    </span>
                    {p.totalAmount > 0 && (
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        {formatCurrency(p.totalAmount)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              Không có dữ liệu {ioFilter === 'nhap' ? 'nhập hàng' : 'xuất hàng'} trong khoảng thời gian hoặc điều kiện lọc này.
            </div>
          )}
        </div>

        {/* Card 2: Top Khách hàng / NPP theo Xuất hàng hoặc Tổng quan Nhập kho */}
        <div className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800 text-sm">
                    {ioFilter === 'nhap' ? 'Tổng quan Nhập kho trong kỳ' : 'Top Khách hàng / NPP trong kỳ'}
                  </h4>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                    Theo bộ lọc
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {ioFilter === 'nhap' ? 'Tổng hợp giá trị và số lượng nhập theo kỳ lọc' : 'Xếp hạng đối tác theo sản lượng/doanh số đã lọc'}
                </p>
              </div>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate(ioFilter === 'nhap' ? 'nhap' : 'xuat')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                Xem chi tiết <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {ioFilter === 'nhap' ? (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-4 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-[11px] font-bold uppercase">Tổng sản lượng nhập</p>
                  <p className="text-lg font-extrabold text-blue-600">{formatNumber(summaryStats.totalNhapQty)} SP</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ArrowDownToLine className="w-5 h-5" />
                </div>
              </div>
              {summaryStats.totalNhapAmount > 0 && (
                <div className="p-4 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[11px] font-bold uppercase">Tổng giá trị tiền nhập</p>
                    <p className="text-lg font-extrabold text-emerald-600">{formatCurrency(summaryStats.totalNhapAmount)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
              )}
            </div>
          ) : topCustomers.length > 0 ? (
            <div className="divide-y divide-slate-200/50">
              {topCustomers.map((c, idx) => (
                <div key={c.maKh || c.tenKh} className="py-2.5 flex items-center justify-between text-xs hover:bg-white rounded-xl px-2 transition">
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                      idx === 0 ? 'bg-blue-600 text-white shadow-xs' :
                      idx === 1 ? 'bg-indigo-400 text-white' :
                      idx === 2 ? 'bg-sky-400 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{c.tenKh || c.maKh}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {c.maKh && `Mã: ${c.maKh} • `}{c.orderCount} đơn xuất
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-blue-600 block">
                      {c.totalAmount > 0 ? formatCurrency(c.totalAmount) : `${formatNumber(c.totalQty)} SP`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Tổng xuất: {formatNumber(c.totalQty)} SP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              Không có dữ liệu xuất hàng trong khoảng thời gian hoặc điều kiện lọc này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

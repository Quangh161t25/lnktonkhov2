import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { Pagination } from '../../common/Pagination';
import { exportToExcel } from '../../../services/excelService';
import { 
  formatCurrency, 
  formatNumber, 
  cleanNumber, 
  matchesSearch 
} from '../../../utils/formatters';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  RotateCw, 
  Download, 
  Building2, 
  List, 
  BarChart3, 
  Phone, 
  MessageSquare, 
  ShoppingCart, 
  PackageCheck, 
  ExternalLink,
  Award,
  CheckCircle2,
  TrendingUp,
  PackageSearch
} from 'lucide-react';

export function XnkNccModule({ onNavigate }) {
  const { 
    xnkMauData, 
    xnkDonHangData, 
    fetchModule, 
    loadingModules 
  } = useData();

  const { currentUser } = useAuth();

  // Sub-tabs: [Danh sách] vs [Thống kê] (Matching Screenshot 2)
  const [activeSubTab, setActiveSubTab] = useState('LIST'); // 'LIST' | 'STATS'

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'HAS_PO' | 'SAMPLE_PASS' | 'SAMPLE_ONLY'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchModule('xnk');
  }, [fetchModule]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Aggregate NCC List from xnkMauData and xnkDonHangData
  const nccList = useMemo(() => {
    const map = new Map();

    // 1. Process Samples data
    if (xnkMauData && xnkMauData.length > 1) {
      xnkMauData.slice(1).forEach((r, idx) => {
        const tenNcc = (r[2] || '').trim();
        if (!tenNcc) return;

        const lienHe = (r[3] || '').trim();
        const giaMau = cleanNumber(r[4]) || 0;
        const ngayDat = r[5] || '';
        const linkAnh = r[7] || '';
        const danhGia = r[8] || '';
        const xepHang = r[9] || 'Đạt';
        const sếpDuyet = r[10] || '';

        if (!map.has(tenNcc)) {
          map.set(tenNcc, {
            ten_ncc: tenNcc,
            lien_he: lienHe,
            so_mau: 0,
            so_mau_dat: 0,
            cac_mau: [],
            so_po: 0,
            tong_tien_po: 0,
            cac_po: []
          });
        }

        const entry = map.get(tenNcc);
        if (!entry.lien_he && lienHe) entry.lien_he = lienHe;
        entry.so_mau += 1;
        if (xepHang === 'Đạt' || sếpDuyet === 'Đồng ý') entry.so_mau_dat += 1;
        entry.cac_mau.push({
          id_mau: r[0],
          gia_mau: giaMau,
          ngay_dat: ngayDat,
          link_anh: linkAnh,
          xepHang,
          danhGia
        });
      });
    }

    // 2. Process PO Orders data
    if (xnkDonHangData && xnkDonHangData.length > 1) {
      xnkDonHangData.slice(1).forEach((r) => {
        const tenNcc = (r[4] || '').trim();
        if (!tenNcc) return;

        const maPo = r[0] || '';
        const sku = r[2] || '';
        const tenSp = r[3] || '';
        const slg = cleanNumber(r[5]) || 0;
        const tongTien = cleanNumber(r[7]) || 0;
        const tinhTrang = r[13] || '';

        if (!map.has(tenNcc)) {
          map.set(tenNcc, {
            ten_ncc: tenNcc,
            lien_he: '',
            so_mau: 0,
            so_mau_dat: 0,
            cac_mau: [],
            so_po: 0,
            tong_tien_po: 0,
            cac_po: []
          });
        }

        const entry = map.get(tenNcc);
        entry.so_po += 1;
        entry.tong_tien_po += tongTien;
        entry.cac_po.push({ maPo, sku, tenSp, slg, tongTien, tinhTrang });
      });
    }

    return Array.from(map.values()).sort((a, b) => b.tong_tien_po - a.tong_tien_po || b.so_po - a.so_po);
  }, [xnkMauData, xnkDonHangData]);

  // Filtered List
  const filteredList = useMemo(() => {
    return nccList.filter(item => {
      if (statusFilter === 'HAS_PO' && item.so_po === 0) return false;
      if (statusFilter === 'SAMPLE_PASS' && item.so_mau_dat === 0) return false;
      if (statusFilter === 'SAMPLE_ONLY' && (item.so_mau === 0 || item.so_po > 0)) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = matchesSearch(item.ten_ncc, q);
        const matchContact = matchesSearch(item.lien_he, q);
        if (!matchName && !matchContact) return false;
      }

      return true;
    });
  }, [nccList, searchTerm, statusFilter]);

  // Paginated List
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalNcc = nccList.length;
    const nccWithPo = nccList.filter(n => n.so_po > 0).length;
    const totalSamples = nccList.reduce((acc, cur) => acc + cur.so_mau, 0);
    const totalPassedSamples = nccList.reduce((acc, cur) => acc + cur.so_mau_dat, 0);
    const passRate = totalSamples > 0 ? Math.round((totalPassedSamples / totalSamples) * 100) : 0;
    const totalOrderValue = nccList.reduce((acc, cur) => acc + cur.tong_tien_po, 0);

    return { totalNcc, nccWithPo, totalSamples, passRate, totalOrderValue };
  }, [nccList]);

  const handleExportExcel = () => {
    const headers = ['Tên nhà cung cấp / Xưởng', 'Thông tin liên hệ / Wechat', 'Số mẫu đã đặt', 'Số mẫu đạt', 'Số đơn hàng PO', 'Tổng giá trị PO (VNĐ)'];
    const rows = filteredList.map(n => [
      n.ten_ncc,
      n.lien_he,
      n.so_mau,
      n.so_mau_dat,
      n.so_po,
      n.tong_tien_po
    ]);
    exportToExcel([headers, ...rows], 'XNK_DANH_SACH_NCC.xlsx', 'DANH_SACH_NCC');
  };

  const isLoading = loadingModules.xnk || loadingModules.xnk_mau || loadingModules.xnk_donhang;

  return (
    <div className="space-y-3">
      {/* 1. Sub-Tabs Header (matching Screenshot 2: [Danh sách] vs [Thống kê]) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSubTab('LIST')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'LIST'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Danh sách</span>
          </button>

          <button
            onClick={() => setActiveSubTab('STATS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'STATS'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Thống kê</span>
          </button>
        </div>

        <div className="text-xs font-medium text-slate-500">
          Tổng cộng: <strong className="text-slate-800">{filteredList.length}</strong> nhà cung cấp
        </div>
      </div>

      {/* 2. Control Toolbar (matching Screenshot 2: [Quay lại], Search, Filters, Actions) */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút Quay lại về Hub XNK */}
          <button
            onClick={() => onNavigate('xnk')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            title="Quay lại Hub Xuất Nhập Khẩu"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Quay lại</span>
          </button>

          {/* Ô tìm kiếm */}
          <div className="relative w-48 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm NCC, người liên hệ, Wechat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Bộ lọc loại hợp tác */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">🏢 Tất cả nhà cung cấp</option>
            <option value="HAS_PO">🛒 Đã có đơn hàng PO</option>
            <option value="SAMPLE_PASS">✨ Đã có mẫu đạt chuẩn</option>
            <option value="SAMPLE_ONLY">📦 Mới thử mẫu (chưa lên PO)</option>
          </select>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchModule('xnk', true)}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Làm mới dữ liệu từ Google Sheets"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Xuất Excel danh sách NCC"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 3. Sub-Tab: THỐNG KÊ (KPI Cards & Overview) */}
      {activeSubTab === 'STATS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng số NCC</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{summaryMetrics.totalNcc}</div>
              <div className="text-[11px] text-slate-400 mt-1">Đối tác xưởng và nhà sản xuất</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Đã lên đơn PO</span>
              </div>
              <div className="text-2xl font-black text-indigo-600">{summaryMetrics.nccWithPo}</div>
              <div className="text-[11px] text-slate-400 mt-1">Nhà cung cấp đã chính thức đặt hàng</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <Award className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tỉ lệ mẫu Đạt</span>
              </div>
              <div className="text-2xl font-black text-emerald-600">{summaryMetrics.passRate}%</div>
              <div className="text-[11px] text-slate-400 mt-1">{summaryMetrics.totalSamples} mẫu đã kiểm thử thực tế</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng giá trị PO</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-600 truncate">
                {formatCurrency(summaryMetrics.totalOrderValue)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Tổng chi tiêu đặt hàng sản xuất</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Sub-Tab: DANH SÁCH BẢNG NCC */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                <th className="py-2.5 px-3 whitespace-nowrap">STT</th>
                <th className="py-2.5 px-3 min-w-[200px]">Tên nhà cung cấp / Xưởng</th>
                <th className="py-2.5 px-3 min-w-[180px]">Người liên hệ / Wechat / SĐT</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Mẫu thử nghiệm</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Đơn hàng PO</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Tổng giá trị đơn hàng</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Tình trạng hợp tác</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    Không tìm thấy nhà cung cấp nào phù hợp
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, index) => {
                  const stt = (currentPage - 1) * itemsPerPage + index + 1;
                  const hasPo = item.so_po > 0;
                  const hasPassSample = item.so_mau_dat > 0;

                  return (
                    <tr key={item.ten_ncc} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 text-slate-400 font-medium text-center whitespace-nowrap">
                        {stt}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <span className="text-slate-900 font-semibold">{item.ten_ncc}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.lien_he ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-700">{item.lien_he}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có liên hệ</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {item.so_mau > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            <span>{item.so_mau} mẫu</span>
                            {item.so_mau_dat > 0 && (
                              <span className="text-emerald-600 font-bold">({item.so_mau_dat} Đạt)</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {item.so_po > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[11px]">
                            {item.so_po} đơn PO
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có PO</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {item.tong_tien_po > 0 ? formatCurrency(item.tong_tien_po) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {hasPo ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Đang hợp tác PO
                          </span>
                        ) : hasPassSample ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                            <Award className="w-3 h-3" /> Mẫu đạt chuẩn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                            Thử mẫu ban đầu
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.so_mau > 0 && (
                            <button
                              onClick={() => onNavigate('xnk_mau')}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                              title="Xem các mẫu thử của NCC này"
                            >
                              <PackageSearch className="w-3 h-3" /> Xem mẫu
                            </button>
                          )}
                          {item.so_po > 0 && (
                            <button
                              onClick={() => onNavigate('xnk_donhang')}
                              className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                              title="Xem các đơn hàng PO của NCC này"
                            >
                              <ShoppingCart className="w-3 h-3" /> Xem PO
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="p-3 border-t border-slate-100">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredList.length}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setItemsPerPage}
            pageSizeOptions={[25, 50, 100, 200]}
          />
        </div>
      </div>
    </div>
  );
}

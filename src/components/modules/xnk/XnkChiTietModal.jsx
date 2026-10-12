import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { 
  formatDateVN, 
  formatCurrency, 
  formatNumber, 
  cleanNumber 
} from '../../../utils/formatters';
import { 
  X, 
  Lightbulb, 
  Package, 
  ShoppingCart, 
  Clock, 
  Building2, 
  ExternalLink, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  Truck, 
  Factory, 
  Warehouse, 
  TrendingUp, 
  Plus, 
  Eye,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  Minimize2,
  Square,
  Maximize2
} from 'lucide-react';

export function XnkChiTietModal({
  isOpen,
  onClose,
  type = 'ytuong', // 'ytuong' | 'mau' | 'donhang' | 'ncc' | 'tiendo'
  item = null,
  onOpenEditYtuong = null,
  onOpenEditMau = null,
  onOpenEditPo = null,
  onOpenCreateMau = null,
  onOpenCreatePo = null,
  onOpenEditTracking = null
}) {
  const { 
    xnkYtuongData, 
    xnkMauData, 
    xnkDonHangData, 
    usersData 
  } = useData();

  // Active Tab inside Detail Modal
  const [activeTab, setActiveTab] = useState('YTUONG'); // 'YTUONG' | 'MAU' | 'DONHANG' | 'TIENDO' | 'NCC'
  const [selectedPoIndex, setSelectedPoIndex] = useState(0);
  const [drawerSize, setDrawerSize] = useState('medium'); // 'small' | 'medium' | 'full'

  // 1. Parsed Ý tưởng
  const allIdeas = useMemo(() => {
    if (!xnkYtuongData || xnkYtuongData.length <= 1) return [];
    return xnkYtuongData.slice(1).map((r, idx) => ({
      _sheetRow: idx + 2,
      id_y_tuong: r[0] || '',
      ngay_tao: r[1] || '',
      nguoi_tao: r[2] || '',
      sku_du_kien: r[3] || '',
      ten_sp: r[4] || '',
      mo_ta: r[5] || '',
      link_tham_khao: r[6] || '',
      trang_thai: r[7] || 'Mới tạo',
      nguoi_duyet: r[8] || '',
      ghi_chu: r[9] || ''
    })).filter(i => i.id_y_tuong || i.ten_sp);
  }, [xnkYtuongData]);

  // 2. Parsed Mẫu thử
  const allSamples = useMemo(() => {
    if (!xnkMauData || xnkMauData.length <= 1) return [];
    return xnkMauData.slice(1).map((r, idx) => ({
      _sheetRow: idx + 2,
      id_mau: r[0] || '',
      id_y_tuong: r[1] || '',
      ten_ncc: r[2] || '',
      lien_he_ncc: r[3] || '',
      gia_mau: cleanNumber(r[4]) || 0,
      ngay_dat_mau: r[5] || '',
      ngay_nhan_mau: r[6] || '',
      link_anh_mau: r[7] || '',
      danh_gia_cai_tien: r[8] || '',
      danh_gia_xep_hang: (r[9] || '').trim(),
      trang_thai_duyet: (r[10] || 'Chờ duyệt').trim(),
      ghi_chu: r[11] || ''
    })).filter(m => m.id_mau);
  }, [xnkMauData]);

  // 3. Parsed Đơn hàng PO
  const allOrders = useMemo(() => {
    if (!xnkDonHangData || xnkDonHangData.length <= 1) return [];
    return xnkDonHangData.slice(1).map((r, idx) => ({
      _sheetRow: idx + 2,
      ma_po: r[0] || '',
      id_mau: r[1] || '',
      sku: r[2] || '',
      ten_sp: r[3] || '',
      ten_ncc: r[4] || '',
      so_luong: cleanNumber(r[5]) || 0,
      don_gia: cleanNumber(r[6]) || 0,
      tong_tien: cleanNumber(r[7]) || 0,
      tien_coc: cleanNumber(r[8]) || 0,
      ngay_dat_hang: r[9] || '',
      ngay_sx_xong: r[10] || '',
      tracking_van_chuyen: r[11] || '',
      ngay_gui_hang: r[12] || '',
      ngay_thong_quan: r[13] || '',
      ngay_kho_nhan: r[14] || '',
      slg_thuc_nhan: r[15] !== undefined && r[15] !== '' ? cleanNumber(r[15]) : '',
      ke_hoach_ban: r[16] || 'Bán ngay',
      tinh_trang_cuoi: r[17] || 'Đang sản xuất',
      ghi_chu: r[18] || ''
    })).filter(o => o.ma_po || o.ten_sp);
  }, [xnkDonHangData]);

  // 4. Tìm các thực thể liên kết tương ứng
  const currentIdea = useMemo(() => {
    if (!item) return null;
    if (type === 'ytuong') return item;
    if (type === 'mau') {
      return allIdeas.find(i => i.id_y_tuong === item.id_y_tuong) || null;
    }
    if (type === 'donhang' || type === 'tiendo') {
      if (item.id_mau) {
        const foundSample = allSamples.find(s => s.id_mau === item.id_mau);
        if (foundSample?.id_y_tuong) {
          const found = allIdeas.find(i => i.id_y_tuong === foundSample.id_y_tuong);
          if (found) return found;
        }
      }
      return allIdeas.find(i => i.sku_du_kien === item.sku || i.ten_sp === item.ten_sp) || null;
    }
    return null;
  }, [item, type, allIdeas, allSamples]);

  const relatedSamples = useMemo(() => {
    if (!item) return [];
    if (type === 'mau') return [item];
    if (type === 'ytuong') {
      return allSamples.filter(s => s.id_y_tuong === item.id_y_tuong);
    }
    if (type === 'donhang' || type === 'tiendo') {
      if (item.id_mau) {
        const found = allSamples.filter(s => s.id_mau === item.id_mau);
        if (found.length > 0) return found;
      }
      if (currentIdea) {
        return allSamples.filter(s => s.id_y_tuong === currentIdea.id_y_tuong);
      }
    }
    if (type === 'ncc') {
      const nccName = (item.name || item.ten_ncc || '').toLowerCase();
      return allSamples.filter(s => (s.ten_ncc || '').toLowerCase() === nccName);
    }
    return [];
  }, [item, type, allSamples, currentIdea]);

  const relatedOrders = useMemo(() => {
    if (!item) return [];
    if (type === 'donhang' || type === 'tiendo') {
      return [item];
    }
    if (type === 'ytuong') {
      const sampleIds = new Set(relatedSamples.map(s => s.id_mau));
      return allOrders.filter(o => 
        (o.id_mau && sampleIds.has(o.id_mau)) ||
        (item.sku_du_kien && o.sku === item.sku_du_kien) ||
        (item.ten_sp && o.ten_sp.toLowerCase() === item.ten_sp.toLowerCase())
      );
    }
    if (type === 'mau') {
      return allOrders.filter(o => 
        o.id_mau === item.id_mau ||
        (currentIdea?.sku_du_kien && o.sku === currentIdea.sku_du_kien) ||
        (currentIdea?.ten_sp && o.ten_sp.toLowerCase() === currentIdea.ten_sp.toLowerCase())
      );
    }
    if (type === 'ncc') {
      const nccName = (item.name || item.ten_ncc || '').toLowerCase();
      return allOrders.filter(o => (o.ten_ncc || '').toLowerCase() === nccName);
    }
    return [];
  }, [item, type, allOrders, relatedSamples, currentIdea]);

  // Selected PO for Timeline View
  const selectedPo = useMemo(() => {
    if (relatedOrders.length === 0) return null;
    return relatedOrders[selectedPoIndex] || relatedOrders[0];
  }, [relatedOrders, selectedPoIndex]);

  // Tìm thông tin Nhà cung cấp từ usersData
  const matchedUserNcc = useMemo(() => {
    if (!item) return null;
    const targetName = (item.ten_ncc || item.name || selectedPo?.ten_ncc || (relatedSamples[0] && relatedSamples[0].ten_ncc) || '').trim().toLowerCase();
    if (!targetName) return null;
    if (!usersData || usersData.length <= 1) return null;
    return usersData.slice(1).find(u => {
      const uName = (u[1] || u.ho_ten || u.name || '').trim().toLowerCase();
      const uId = (u[0] || u.id || '').trim().toLowerCase();
      return uName === targetName || uId === targetName;
    });
  }, [item, selectedPo, relatedSamples, usersData]);

  // Thiết lập Tab khởi tạo khi mở Modal
  useEffect(() => {
    if (!isOpen) return;
    setSelectedPoIndex(0);

    if (type === 'ytuong') {
      // Khi click vào ý tưởng: nếu đã có đơn hàng PO thì ưu tiên hiển thị đơn hàng (theo yêu cầu của bạn)
      // hoặc nếu chưa có PO thì mở tab Ý tưởng
      if (relatedOrders.length > 0) {
        setActiveTab('DONHANG');
      } else {
        setActiveTab('YTUONG');
      }
    } else if (type === 'mau') {
      setActiveTab('MAU');
    } else if (type === 'donhang') {
      setActiveTab('DONHANG');
    } else if (type === 'tiendo') {
      setActiveTab('TIENDO');
    } else if (type === 'ncc') {
      setActiveTab('NCC');
    } else {
      setActiveTab('YTUONG');
    }
  }, [isOpen, type, relatedOrders.length]);

  if (!isOpen || !item) return null;

  // Title name
  const displayTitle = item.ten_sp || item.ma_po || item.name || item.id_mau || item.id_y_tuong || 'Chi tiết nghiệp vụ';

  let resolvedWidthClass = 'w-full max-w-4xl';
  if (drawerSize === 'small') {
    resolvedWidthClass = 'w-full max-w-xl';
  } else if (drawerSize === 'full') {
    resolvedWidthClass = 'w-full max-w-[96vw]';
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose} 
      />

      {/* Drawer Panel */}
      <div 
        className={`relative ${resolvedWidthClass} bg-white shadow-2xl z-10 flex flex-col h-full transform transition-all duration-300 ease-in-out`}
      >
        {/* 1. Header Drawer */}
        <div className="h-16 px-5 sm:px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 ${
              type === 'ytuong'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : type === 'mau'
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : type === 'donhang' || type === 'tiendo'
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {type === 'ytuong' ? '💡 Ý tưởng' :
               type === 'mau' ? '📦 Mẫu thử' :
               type === 'donhang' ? '🛒 Đơn PO' :
               type === 'tiendo' ? '⏱️ Tiến độ' : '🏢 NCC'}
            </span>

            <div className="truncate">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate flex items-center gap-2">
                <span>{displayTitle}</span>
                {(item.sku || item.sku_du_kien) && (
                  <span className="text-[11px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold">
                    SKU: {item.sku || item.sku_du_kien}
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 3 Size Control Buttons: Nhỏ lại - Vừa - Mở rộng */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-200 shadow-2xs mr-1">
              <button
                type="button"
                onClick={() => setDrawerSize('small')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  drawerSize === 'small'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Nhỏ lại (Giao diện nhỏ gọn)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Nhỏ</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerSize('medium')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  drawerSize === 'medium'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vừa (Kích thước tiêu chuẩn)"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Vừa</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerSize('full')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  drawerSize === 'full'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Mở rộng (Toàn màn hình)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Mở rộng</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition cursor-pointer"
              title="Đóng / Hủy"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. CÁC TAB ĐIỀU HƯỚNG PHÍA TRÊN (TOP TABS) */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-5 sm:px-6 py-2.5 border-b border-slate-200 shrink-0 select-none bg-slate-50/50">
          {/* Tab 1: Đơn hàng PO */}
          <button
            type="button"
            onClick={() => setActiveTab('DONHANG')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'DONHANG'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Đơn hàng PO</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'DONHANG' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {relatedOrders.length}
            </span>
          </button>

          {/* Tab 2: Ý tưởng sản phẩm */}
          <button
            type="button"
            onClick={() => setActiveTab('YTUONG')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'YTUONG'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>Ý tưởng sản phẩm</span>
            {currentIdea && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          {/* Tab 3: Mẫu thử & Đánh giá */}
          <button
            type="button"
            onClick={() => setActiveTab('MAU')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'MAU'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Mẫu thử & Đánh giá</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'MAU' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {relatedSamples.length}
            </span>
          </button>

          {/* Tab 4: Tiến độ 6 chặng */}
          <button
            type="button"
            onClick={() => setActiveTab('TIENDO')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'TIENDO'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Tiến độ 6 chặng</span>
            {selectedPo && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'TIENDO' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {selectedPo.tinh_trang_cuoi || 'Đang chạy'}
              </span>
            )}
          </button>

          {/* Tab 5: Nhà cung cấp */}
          <button
            type="button"
            onClick={() => setActiveTab('NCC')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'NCC'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Nhà cung cấp / Xưởng</span>
          </button>
        </div>

        {/* 3. NỘI DUNG TỪNG TAB (SCROLLABLE BODY) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {/* ============================================================ */}
          {/* TAB 1: ĐƠN HÀNG SẢN XUẤT PO                                   */}
          {/* ============================================================ */}
          {activeTab === 'DONHANG' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  Danh sách đơn hàng PO liên quan ({relatedOrders.length} đơn)
                </span>
                {onOpenCreatePo && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCreatePo(item);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lên đơn PO mới</span>
                  </button>
                )}
              </div>

              {relatedOrders.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-slate-600 font-semibold">Chưa có đơn hàng PO nào được đặt cho sản phẩm này.</p>
                  <p className="text-slate-400 text-[11px]">
                    Sau khi mẫu thử được Sếp duyệt Đạt, bạn có thể tạo đơn hàng PO sản xuất hàng loạt.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedOrders.map((po, idx) => (
                    <div 
                      key={po.ma_po || idx}
                      className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 transition shadow-2xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-extrabold rounded-lg text-xs">
                            {po.ma_po}
                          </span>
                          <span className="font-bold text-slate-800 text-sm">
                            {po.ten_sp}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {po.tinh_trang_cuoi || 'Đang xử lý'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            po.ke_hoach_ban?.startsWith('Bán ngay')
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {po.ke_hoach_ban}
                          </span>
                        </div>
                      </div>

                      {/* Thông tin tài chính & số lượng */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[11px] text-slate-400 font-semibold block">Số lượng đặt:</span>
                          <span className="text-xs font-bold text-blue-700">{formatNumber(po.so_luong)} cái</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 font-semibold block">Đơn giá:</span>
                          <span className="text-xs font-semibold text-slate-800">{formatCurrency(po.don_gia)}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 font-semibold block">Tổng tiền PO:</span>
                          <span className="text-xs font-black text-emerald-700">{formatCurrency(po.tong_tien)}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 font-semibold block">Tiền cọc xưởng:</span>
                          <span className="text-xs font-bold text-amber-700">{formatCurrency(po.tien_coc)}</span>
                        </div>
                      </div>

                      {/* Nhà cung cấp & Tiến độ */}
                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                        <div>
                          Nhà cung cấp / Xưởng: <strong className="text-slate-800">{po.ten_ncc || 'Chưa rõ'}</strong>
                          {po.tracking_van_chuyen && (
                            <span className="ml-2 text-blue-600 font-semibold">• Mã VĐ: {po.tracking_van_chuyen}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPoIndex(idx);
                              setActiveTab('TIENDO');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Xem tiến độ 6 chặng</span>
                          </button>

                          {onOpenEditTracking && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenEditTracking(po);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Cập nhật tiến độ</span>
                            </button>
                          )}

                          {onOpenEditPo && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenEditPo(po);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Sửa PO</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: Ý TƯỞNG SẢN PHẨM                                       */}
          {/* ============================================================ */}
          {activeTab === 'YTUONG' && (
            <div className="space-y-3.5">
              {currentIdea ? (
                <div className="bg-amber-50/30 p-4 rounded-2xl border border-amber-200/80 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/50 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">
                        {currentIdea.id_y_tuong}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {currentIdea.ten_sp}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        currentIdea.trang_thai === 'Đã duyệt'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentIdea.trang_thai === 'Từ chối'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {currentIdea.trang_thai}
                      </span>
                      {onOpenEditYtuong && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenEditYtuong(currentIdea);
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa ý tưởng</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold block">SKU dự kiến:</span>
                      <span className="text-xs font-bold text-slate-800">{currentIdea.sku_du_kien || 'Chưa gắn'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold block">Người đề xuất:</span>
                      <span className="text-xs font-semibold text-slate-800">{currentIdea.nguoi_tao || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold block">Ngày tạo:</span>
                      <span className="text-xs text-slate-700">{formatDateVN(currentIdea.ngay_tao)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold block">Người duyệt:</span>
                      <span className="text-xs font-semibold text-slate-800">{currentIdea.nguoi_duyet || 'Chưa duyệt'}</span>
                    </div>
                  </div>

                  {currentIdea.link_tham_khao && (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                      <div className="truncate max-w-[80%] text-slate-600">
                        Link gốc: <strong className="text-blue-600">{currentIdea.link_tham_khao}</strong>
                      </div>
                      <a
                        href={currentIdea.link_tham_khao.startsWith('http') ? currentIdea.link_tham_khao : `https://${currentIdea.link_tham_khao}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Xem nguồn</span>
                      </a>
                    </div>
                  )}

                  {currentIdea.mo_ta && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Mô tả chi tiết ý tưởng:</span>
                      <p className="text-slate-800 whitespace-pre-line leading-relaxed">{currentIdea.mo_ta}</p>
                    </div>
                  )}

                  {currentIdea.ghi_chu && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60">
                      <span className="text-[11px] font-bold text-amber-800 uppercase block mb-1">Ghi chú thảo luận:</span>
                      <p className="text-amber-900 whitespace-pre-line leading-relaxed">{currentIdea.ghi_chu}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-slate-500">Mục này chưa được liên kết với ý tưởng cụ thể nào.</p>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: MẪU THỬ & ĐÁNH GIÁ                                    */}
          {/* ============================================================ */}
          {activeTab === 'MAU' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-purple-600" />
                  Mẫu thử đã đặt ({relatedSamples.length} mẫu)
                </span>
                {onOpenCreateMau && currentIdea && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCreateMau(currentIdea);
                    }}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Đặt mẫu thử mới</span>
                  </button>
                )}
              </div>

              {relatedSamples.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <Package className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-slate-600 font-semibold">Chưa có mẫu thử nào được đặt cho sản phẩm này.</p>
                  <p className="text-slate-400 text-[11px]">
                    Bạn có thể tìm nhà cung cấp và đặt mẫu về để đánh giá trước khi lên đơn đặt hàng thật.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {relatedSamples.map((sample) => (
                    <div 
                      key={sample.id_mau}
                      className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-purple-300 transition shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-bold rounded-lg text-xs">
                          {sample.id_mau}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            sample.danh_gia_xep_hang === 'Đạt'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sample.danh_gia_xep_hang === 'Không đạt'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {sample.danh_gia_xep_hang || 'Chưa đánh giá'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            sample.trang_thai_duyet === 'Đã duyệt (Cho phép đặt thật)' || sample.trang_thai_duyet === 'Đồng ý'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sample.trang_thai_duyet === 'Từ chối'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {sample.trang_thai_duyet}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="font-bold text-slate-800 text-xs">
                          Xưởng / NCC: <span className="text-blue-700">{sample.ten_ncc}</span>
                        </div>
                        {sample.lien_he_ncc && (
                          <div className="text-[11px] text-slate-500">
                            Liên hệ: {sample.lien_he_ncc}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                          <span>Giá mẫu: <strong className="text-emerald-700 font-bold">{sample.gia_mau ? formatCurrency(sample.gia_mau) : '0 đ'}</strong></span>
                          <span>Đặt: {formatDateVN(sample.ngay_dat_mau)} ➔ Nhận: {sample.ngay_nhan_mau ? formatDateVN(sample.ngay_nhan_mau) : 'Chưa nhận'}</span>
                        </div>
                      </div>

                      {/* Ảnh mẫu */}
                      {sample.link_anh_mau && (
                        <div className="p-1 bg-slate-50 rounded-xl border border-slate-200">
                          <img
                            src={sample.link_anh_mau}
                            alt="Ảnh mẫu"
                            className="w-full h-32 object-cover rounded-lg"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      )}

                      {/* Đánh giá cải tiến */}
                      {sample.danh_gia_cai_tien && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Đánh giá & Cải tiến:</span>
                          <p className="text-slate-700">{sample.danh_gia_cai_tien}</p>
                        </div>
                      )}

                      {/* Nút hành động */}
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        {onOpenEditMau && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenEditMau(sample);
                            }}
                            className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Sửa mẫu</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: TIẾN ĐỘ 6 CHẶNG LIÊN HOÀN                              */}
          {/* ============================================================ */}
          {activeTab === 'TIENDO' && (
            <div className="space-y-4">
              {selectedPo ? (
                <div className="space-y-3.5">
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-indigo-950 text-sm">
                        Quy trình 6 chặng đơn PO: {selectedPo.ma_po}
                      </span>
                      <p className="text-slate-500 text-[11px]">
                        Chuỗi cung ứng liên hoàn: Từ ngày quy trình này là Đến ngày quy trình trước.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-2xs">
                        Trạng thái: {selectedPo.tinh_trang_cuoi || 'Đang sản xuất'}
                      </span>
                      {onOpenEditTracking && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenEditTracking(selectedPo);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Cập nhật tiến độ</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sơ đồ 6 chặng */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Chặng 1 */}
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">1</span>
                          Đặt hàng & Cọc
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">{formatDateVN(selectedPo.ngay_dat_hang) || '-'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Ký hợp đồng và cọc xưởng.</p>
                      <div className="text-[11px] font-bold text-amber-700">
                        Cọc: {formatCurrency(selectedPo.tien_coc)}
                      </div>
                    </div>

                    {/* Chặng 2 */}
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px]">2</span>
                          Sản xuất xưởng
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">{formatDateVN(selectedPo.ngay_sx_xong) || 'Đang SX'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Gia công theo tiêu chuẩn mẫu.</p>
                      <div className="text-[11px] font-bold text-slate-700">
                        Xưởng: {selectedPo.ten_ncc || 'Xưởng đối tác'}
                      </div>
                    </div>

                    {/* Chặng 3 */}
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">3</span>
                          Vận chuyển QT
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">{selectedPo.tracking_van_chuyen || 'Chờ gửi'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Vận chuyển quốc tế về cửa khẩu.</p>
                      <div className="text-[11px] font-semibold text-blue-700">
                        Vận đơn: {selectedPo.tracking_van_chuyen || 'Chưa có'}
                      </div>
                    </div>

                    {/* Chặng 4 */}
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-[10px]">4</span>
                          Hải quan & Cảng
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">{formatDateVN(selectedPo.ngay_thong_quan) || 'Chờ HQ'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Mở tờ khai & kiểm hóa thông quan.</p>
                      <div className="text-[11px] text-slate-600">
                        Cảng Cát Lái / Hữu Nghị
                      </div>
                    </div>

                    {/* Chặng 5 */}
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">5</span>
                          Kho VN nhận hàng
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">{formatDateVN(selectedPo.ngay_kho_nhan) || 'Chờ về kho'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Kéo hàng về kho & kiểm đếm.</p>
                      <div className="text-[11px] font-bold text-emerald-700">
                        Thực nhận: {selectedPo.slg_thuc_nhan ? `${formatNumber(selectedPo.slg_thuc_nhan)} cái` : 'Đang đợi'}
                      </div>
                    </div>

                    {/* Chặng 6 */}
                    <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 text-xs flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px]">6</span>
                          Phân phối & Bán
                        </span>
                        <span className="text-[11px] text-amber-800 font-bold">{selectedPo.ke_hoach_ban}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Mở bán lẻ đa kênh hoặc trữ kho.</p>
                      <div className="text-[11px] font-bold text-amber-800">
                        Kế hoạch: {selectedPo.ke_hoach_ban}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-slate-500">Chưa có đơn hàng PO nào để theo dõi tiến độ lịch trình.</p>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: NHÀ CUNG CẤP / XƯỞNG                                   */}
          {/* ============================================================ */}
          {activeTab === 'NCC' && (
            <div className="space-y-3.5">
              <div className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-700" />
                  <span className="text-sm font-bold text-slate-900">
                    Đối tác xưởng: {matchedUserNcc ? (matchedUserNcc[1] || matchedUserNcc.name) : (item.ten_ncc || item.name || selectedPo?.ten_ncc || (relatedSamples[0] && relatedSamples[0].ten_ncc) || 'Chưa chỉ định')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block">Số điện thoại / Liên hệ:</span>
                    <span className="text-xs font-bold text-slate-800">
                      {item.lien_he_ncc || item.contact || (matchedUserNcc && (matchedUserNcc[4] || matchedUserNcc.contact)) || (relatedSamples[0] && relatedSamples[0].lien_he_ncc) || 'Chưa cập nhật'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block">Mẫu thử đã làm:</span>
                    <span className="text-xs font-bold text-purple-700">{relatedSamples.length} mẫu</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block">Đơn PO đã giao:</span>
                    <span className="text-xs font-bold text-blue-700">{relatedOrders.length} đơn</span>
                  </div>
                </div>

                {(item.note || (matchedUserNcc && (matchedUserNcc[7] || matchedUserNcc.note))) && (
                  <div className="pt-2 border-t border-emerald-100 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">Ghi chú đối tác: </span>
                    {item.note || (matchedUserNcc && (matchedUserNcc[7] || matchedUserNcc.note))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {type === 'ytuong' && onOpenEditYtuong && currentIdea && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditYtuong(currentIdea);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa ý tưởng</span>
              </button>
            )}

            {type === 'mau' && onOpenEditMau && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditMau(item);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa mẫu thử</span>
              </button>
            )}

            {type === 'donhang' && onOpenEditPo && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditPo(item);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa đơn PO</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

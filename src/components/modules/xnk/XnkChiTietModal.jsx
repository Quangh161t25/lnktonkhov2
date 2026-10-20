import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { 
  formatDateVN, 
  formatCurrency, 
  formatNumber, 
  cleanNumber 
} from '../../../utils/formatters';
import { stripTiendoMeta, XnkTrackingMatrixContent, XnkTrackingModal } from './XnkTrackingModal';
import { XnkDonHangDrawer } from './XnkDonHangDrawer';
import { PoSummaryTab } from './PoSummaryTab';
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
  Maximize2,
  BarChart3
} from 'lucide-react';
import { buildPoLinesMap, getPoLines, poHasLine } from './xnkPoLines';

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
    xnkDonHangCtData,
    usersData,
    fetchModule
  } = useData();

  // Active Tab inside Detail Modal
  const [activeTab, setActiveTab] = useState('YTUONG'); // 'YTUONG' | 'MAU' | 'DONHANG' | 'TIENDO' | 'NCC'
  const [selectedPoIndex, setSelectedPoIndex] = useState(0);
  const [drawerSize, setDrawerSize] = useState('medium'); // 'small' | 'medium' | 'full'
  const [trackingModalPo, setTrackingModalPo] = useState(null);

  // Đảm bảo dữ liệu đơn hàng và chi tiết SP của đơn hàng luôn sẵn sàng
  useEffect(() => {
    if (isOpen) {
      if (!xnkDonHangCtData || xnkDonHangCtData.length <= 1) {
        fetchModule('xnk_donhang_ct');
      }
      if (!xnkDonHangData || xnkDonHangData.length <= 1) {
        fetchModule('xnk_donhang');
      }
    }
  }, [isOpen, xnkDonHangCtData, xnkDonHangData, fetchModule]);

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

  // Chi tiết SP của từng PO (1 PO có thể nhiều SP / nhiều ý tưởng / nhiều mẫu)
  const poLinesMap = useMemo(() => buildPoLinesMap(xnkDonHangCtData), [xnkDonHangCtData]);

  // 4. Tìm các thực thể liên kết tương ứng
  const currentIdea = useMemo(() => {
    if (!item) return null;
    if (type === 'ytuong') return item;
    if (type === 'mau') {
      const targetId = String(item.id_y_tuong || '').trim();
      if (!targetId) return null;
      return allIdeas.find(i => {
        const iId = String(i.id_y_tuong || '').trim();
        const iSku = String(i.sku_du_kien || '').trim();
        return (targetId && iId === targetId) || (targetId && iSku === targetId);
      }) || null;
    }
    if (type === 'donhang' || type === 'tiendo') {
      // PO nhiều SP: lấy ý tưởng của dòng SP đầu tiên tìm được
      const poLines = getPoLines(item, poLinesMap);
      const lineIdeaId = String(poLines.find(l => l.id_y_tuong)?.id_y_tuong || '').trim();
      if (lineIdeaId) {
        const found = allIdeas.find(i => String(i.id_y_tuong || '').trim() === lineIdeaId);
        if (found) return found;
      }
      const firstLine = poLines[0] || item;
      const targetMau = String(firstLine.id_mau || '').trim();
      if (targetMau) {
        const foundSample = allSamples.find(s => String(s.id_mau || '').trim() === targetMau);
        const sampleIdeaId = String(foundSample?.id_y_tuong || '').trim();
        if (sampleIdeaId) {
          const found = allIdeas.find(i => {
            const iId = String(i.id_y_tuong || '').trim();
            const iSku = String(i.sku_du_kien || '').trim();
            return (sampleIdeaId && iId === sampleIdeaId) || (sampleIdeaId && iSku === sampleIdeaId);
          });
          if (found) return found;
        }
      }
      const targetSku = String(firstLine.sku || '').trim();
      if (targetSku) {
        const found = allIdeas.find(i => i.sku_du_kien && String(i.sku_du_kien).trim() === targetSku);
        if (found) return found;
      }
      const targetName = String(firstLine.ten_sp || '').trim().toLowerCase();
      if (targetName) {
        const found = allIdeas.find(i => i.ten_sp && String(i.ten_sp).trim().toLowerCase() === targetName);
        if (found) return found;
      }
      return null;
    }
    return null;
  }, [item, type, allIdeas, allSamples, poLinesMap]);

  const relatedSamples = useMemo(() => {
    if (!item) return [];
    if (type === 'mau') return [item];
    if (type === 'ytuong') {
      const targetIdeaId = String(item.id_y_tuong || '').trim();
      const targetSku = String(item.sku_du_kien || '').trim();
      if (!targetIdeaId && !targetSku) return [];
      return allSamples.filter(s => {
        const sIdea = String(s.id_y_tuong || '').trim();
        return (targetIdeaId && sIdea === targetIdeaId) || (targetSku && sIdea === targetSku);
      });
    }
    if (type === 'donhang' || type === 'tiendo') {
      const lineMauIds = new Set(getPoLines(item, poLinesMap).map(l => String(l.id_mau || '').trim()).filter(Boolean));
      if (lineMauIds.size > 0) {
        const found = allSamples.filter(s => lineMauIds.has(String(s.id_mau || '').trim()));
        if (found.length > 0) return found;
      }
      if (currentIdea) {
        const ideaId = String(currentIdea.id_y_tuong || '').trim();
        const ideaSku = String(currentIdea.sku_du_kien || '').trim();
        if (ideaId || ideaSku) {
          const found = allSamples.filter(s => {
            const sIdea = String(s.id_y_tuong || '').trim();
            return (ideaId && sIdea === ideaId) || (ideaSku && sIdea === ideaSku);
          });
          if (found.length > 0) return found;
        }
      }
      return [];
    }
    if (type === 'ncc') {
      const nccName = String(item.name || item.ten_ncc || item.ho_ten || '').trim().toLowerCase();
      const nccId = String(item.id || '').trim().toLowerCase();
      if (!nccName && !nccId) return [];
      return allSamples.filter(s => {
        const sNcc = String(s.ten_ncc || '').trim().toLowerCase();
        return (nccName && sNcc === nccName) || (nccId && sNcc === nccId);
      });
    }
    return [];
  }, [item, type, allSamples, currentIdea, poLinesMap]);

  const relatedOrders = useMemo(() => {
    if (!item) return [];
    if (type === 'donhang' || type === 'tiendo') {
      const targetPo = String(item.ma_po || '').trim();
      const latest = targetPo
        ? allOrders.find(o => String(o.ma_po || '').trim() === targetPo)
        : null;
      return [latest || item];
    }
    if (type === 'ytuong') {
      const sampleIds = new Set(relatedSamples.map(s => String(s.id_mau || '').trim()).filter(Boolean));
      const targetSku = String(item.sku_du_kien || '').trim();
      const targetName = String(item.ten_sp || '').trim().toLowerCase();
      const targetIdeaId = String(item.id_y_tuong || '').trim();
      return allOrders.filter(order => poHasLine(order, poLinesMap, o => {
        const oMau = String(o.id_mau || '').trim();
        const oSku = String(o.sku || '').trim();
        const oName = String(o.ten_sp || '').trim().toLowerCase();
        return (
          (targetIdeaId && String(o.id_y_tuong || '').trim() === targetIdeaId) ||
          (oMau && sampleIds.has(oMau)) ||
          (targetSku && oSku === targetSku) ||
          (targetName && oName === targetName)
        );
      }));
    }
    if (type === 'mau') {
      const sampleId = String(item.id_mau || '').trim();
      const ideaSku = String(currentIdea?.sku_du_kien || '').trim();
      const ideaName = String(currentIdea?.ten_sp || '').trim().toLowerCase();
      return allOrders.filter(order => poHasLine(order, poLinesMap, o => {
        const oMau = String(o.id_mau || '').trim();
        const oSku = String(o.sku || '').trim();
        const oName = String(o.ten_sp || '').trim().toLowerCase();
        return (
          (sampleId && oMau === sampleId) ||
          (ideaSku && oSku === ideaSku) ||
          (ideaName && oName === ideaName)
        );
      }));
    }
    if (type === 'ncc') {
      const nccName = String(item.name || item.ten_ncc || item.ho_ten || '').trim().toLowerCase();
      const nccId = String(item.id || '').trim().toLowerCase();
      if (!nccName && !nccId) return [];
      return allOrders.filter(o => {
        const oNcc = String(o.ten_ncc || '').trim().toLowerCase();
        return (nccName && oNcc === nccName) || (nccId && oNcc === nccId);
      });
    }
    return [];
  }, [item, type, allOrders, relatedSamples, currentIdea, poLinesMap]);

  // Danh mục tổng hợp tất cả các sản phẩm & mã SKU đã đặt từ NCC này
  const nccProductsSummary = useMemo(() => {
    if (type !== 'ncc') return [];
    const prodMap = new Map();
    relatedOrders.forEach(order => {
      const lines = getPoLines(order, poLinesMap);
      lines.forEach(l => {
        const key = (l.sku || l.ten_sp || '').trim();
        if (!key) return;
        if (!prodMap.has(key)) {
          prodMap.set(key, {
            sku: l.sku || '',
            ten_sp: l.ten_sp || key,
            tong_sl: 0,
            don_gia_cuoi: cleanNumber(l.don_gia) || 0,
            tong_thanh_tien: 0,
            cac_don_po: new Set(),
            thuc_nhan: 0
          });
        }
        const itemObj = prodMap.get(key);
        const sl = cleanNumber(l.so_luong) || 0;
        const dg = cleanNumber(l.don_gia) || 0;
        const tt = cleanNumber(l.thanh_tien) || (sl * dg);
        itemObj.tong_sl += sl;
        itemObj.tong_thanh_tien += tt;
        if (dg > 0) itemObj.don_gia_cuoi = dg;
        if (order.ma_po) itemObj.cac_don_po.add(order.ma_po);
        if (l.slg_thuc_nhan !== '' && l.slg_thuc_nhan !== undefined) {
          itemObj.thuc_nhan += cleanNumber(l.slg_thuc_nhan) || 0;
        }
      });
    });
    return Array.from(prodMap.values());
  }, [type, relatedOrders, poLinesMap]);

  // Mở chi tiết từ chính 1 PO -> tab Đơn hàng PO hiện form chỉ xem
  const isPoDetail = type === 'donhang' || type === 'tiendo';

  // Selected PO for Timeline View
  const selectedPo = useMemo(() => {
    if (relatedOrders.length === 0) return null;
    return relatedOrders[selectedPoIndex] || relatedOrders[0];
  }, [relatedOrders, selectedPoIndex]);

  // Tìm thông tin Nhà cung cấp từ usersData
  const matchedUserNcc = useMemo(() => {
    if (!item) return null;
    const targetName = String(item.ten_ncc || item.name || selectedPo?.ten_ncc || (relatedSamples[0] && relatedSamples[0].ten_ncc) || '').trim().toLowerCase();
    if (!targetName) return null;
    if (!usersData || usersData.length <= 1) return null;
    return usersData.slice(1).find(u => {
      const uName = String(u[1] || u.ho_ten || u.name || '').trim().toLowerCase();
      const uId = String(u[0] || u.id || '').trim().toLowerCase();
      return uName === targetName || uId === targetName;
    });
  }, [item, selectedPo, relatedSamples, usersData]);

  // Danh sách các Tab theo yêu cầu cụ thể của từng Module:
  // 1. Ý tưởng: Chi tiết ý tưởng -> tab đơn mẫu thử nếu có -> tab đơn hàng nếu có -> tiến độ nếu có (k có ncc)
  // 2. Đơn mẫu: Ý tưởng bên trái nếu có -> Chi tiết mẫu thử -> Đơn PO nếu có -> Tiến độ nếu có (k có ncc)
  // 3. Đơn PO: Ý tưởng bên trái nếu có -> Đơn mẫu bên trái nếu có -> Đơn PO -> Tiến độ bên phải (k có ncc)
  // 4. NCC: Nhà cung cấp riêng
  const availableTabs = useMemo(() => {
    const tabs = [];

    if (type === 'ytuong') {
      // 1. Ý tưởng chi tiết sẽ hiện ra chi tiết của ý tưởng
      tabs.push({
        id: 'YTUONG',
        label: 'Ý tưởng sản phẩm',
        icon: Lightbulb,
        color: 'amber'
      });

      // Bên cạnh là tab đơn mẫu thử nếu có
      if (relatedSamples.length > 0) {
        tabs.push({
          id: 'MAU',
          label: 'Đơn mẫu thử',
          icon: Package,
          color: 'purple',
          count: relatedSamples.length
        });
      }

      // tab đơn hàng nếu có
      if (relatedOrders.length > 0) {
        tabs.push({
          id: 'DONHANG',
          label: 'Đơn hàng PO',
          icon: ShoppingCart,
          color: 'blue',
          count: relatedOrders.length
        });
      }

      // và tiến độ nếu có
      if (relatedOrders.length > 0 && selectedPo) {
        tabs.push({
          id: 'TIENDO',
          label: 'Tiến độ 8 chặng',
          icon: Clock,
          color: 'indigo'
        });
      }

      // k có ncc nhé . ncc riêng
    } else if (type === 'mau') {
      // 2. Đơn mẫu: chi tiết sẽ có ý tưởng bên trái (nếu có)
      if (currentIdea) {
        tabs.push({
          id: 'YTUONG',
          label: 'Ý tưởng gốc',
          icon: Lightbulb,
          color: 'amber'
        });
      }

      // Chi tiết mẫu thử (tab chính của mẫu hiện tại)
      tabs.push({
        id: 'MAU',
        label: 'Chi tiết mẫu thử',
        icon: Package,
        color: 'purple',
        count: relatedSamples.length
      });

      // Đơn PO nếu có
      if (relatedOrders.length > 0) {
        tabs.push({
          id: 'DONHANG',
          label: 'Đơn hàng PO',
          icon: ShoppingCart,
          color: 'blue',
          count: relatedOrders.length
        });
      }

      // và tiến độ nếu có
      if (relatedOrders.length > 0 && selectedPo) {
        tabs.push({
          id: 'TIENDO',
          label: 'Tiến độ 8 chặng',
          icon: Clock,
          color: 'indigo'
        });
      }

      // k có ncc!
    } else if (type === 'donhang' || type === 'tiendo') {
      // 3. Đơn PO: xem bên trái có ý tưởng hay đơn mẫu không. k có thì k cần hiện.
      if (currentIdea) {
        tabs.push({
          id: 'YTUONG',
          label: 'Ý tưởng gốc',
          icon: Lightbulb,
          color: 'amber'
        });
      }

      if (relatedSamples.length > 0) {
        tabs.push({
          id: 'MAU',
          label: 'Đơn mẫu thử',
          icon: Package,
          color: 'purple',
          count: relatedSamples.length
        });
      }

      // Tab chính: Đơn PO
      tabs.push({
        id: 'DONHANG',
        label: 'Đơn hàng PO',
        icon: ShoppingCart,
        color: 'blue',
        count: relatedOrders.length
      });

      // Bên phải là tiến độ
      tabs.push({
        id: 'TIENDO',
        label: 'Tiến độ 8 chặng',
        icon: Clock,
        color: 'indigo'
      });

      // Tổng hợp đơn: đặt / đi / về / tiền / cước
      tabs.push({
        id: 'TONGHOP',
        label: 'Tổng hợp',
        icon: BarChart3,
        color: 'emerald'
      });

      // k có ncc!
    } else if (type === 'ncc') {
      // 4. NCC riêng:
      tabs.push({
        id: 'NCC',
        label: 'Nhà cung cấp / Xưởng',
        icon: Building2,
        color: 'emerald'
      });

      if (relatedSamples.length > 0) {
        tabs.push({
          id: 'MAU',
          label: 'Mẫu thử đã làm',
          icon: Package,
          color: 'purple',
          count: relatedSamples.length
        });
      }

      if (relatedOrders.length > 0) {
        tabs.push({
          id: 'DONHANG',
          label: 'Đơn PO đã giao',
          icon: ShoppingCart,
          color: 'blue',
          count: relatedOrders.length
        });

        if (selectedPo) {
          tabs.push({
            id: 'TIENDO',
            label: 'Tiến độ 8 chặng',
            icon: Clock,
            color: 'indigo'
          });
        }
      }
    }

    return tabs;
  }, [type, currentIdea, relatedSamples.length, relatedOrders.length, selectedPo]);

  // Thiết lập Tab khởi tạo khi mở Modal
  useEffect(() => {
    if (!isOpen) return;
    setSelectedPoIndex(0);

    if (type === 'ytuong') {
      setActiveTab('YTUONG');
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
  }, [isOpen, type, item]);

  // Luôn đảm bảo activeTab nằm trong danh sách các tab hiển thị
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  // Title name - Luôn gọi Hook ở đầu component trước conditional return
  const displayTitle = useMemo(() => {
    if (!item) return 'Chi tiết nghiệp vụ';
    if (type === 'ytuong') {
      return item.ten_sp || item.id_y_tuong || 'Ý tưởng sản phẩm';
    }
    if (type === 'mau') {
      const parts = [item.id_mau || 'Mẫu thử'];
      if (item.ten_ncc) parts.push(item.ten_ncc);
      if (currentIdea?.ten_sp) parts.push(`(${currentIdea.ten_sp})`);
      return parts.join(' - ');
    }
    if (type === 'donhang' || type === 'tiendo') {
      return `${item.ma_po || 'Đơn PO'}${item.ten_sp ? ' - ' + item.ten_sp : ''}`;
    }
    if (type === 'ncc') {
      return item.ho_ten || item.name || item.ten_ncc || 'Nhà cung cấp';
    }
    return item.ten_sp || item.ma_po || item.name || item.id_mau || item.id_y_tuong || 'Chi tiết nghiệp vụ';
  }, [item, type, currentIdea]);

  if (!isOpen || !item) return null;

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

        {/* 2. CÁC TAB ĐIỀU HƯỚNG PHÍA TRÊN (DYNAMIC TABS THEO QUY ĐỊNH MODUL) */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-5 sm:px-6 py-2.5 border-b border-slate-200 shrink-0 select-none bg-slate-50/50">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            let activeColorClass = 'bg-blue-600 text-white shadow-xs';
            let badgeBgClass = 'bg-white/20 text-white';
            if (tab.id === 'YTUONG') {
              activeColorClass = 'bg-amber-600 text-white shadow-xs';
            } else if (tab.id === 'MAU') {
              activeColorClass = 'bg-purple-600 text-white shadow-xs';
            } else if (tab.id === 'DONHANG') {
              activeColorClass = 'bg-blue-600 text-white shadow-xs';
            } else if (tab.id === 'TIENDO') {
              activeColorClass = 'bg-indigo-600 text-white shadow-xs';
            } else if (tab.id === 'NCC') {
              activeColorClass = 'bg-emerald-600 text-white shadow-xs';
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? activeColorClass
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isActive ? badgeBgClass : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {tab.id === 'TIENDO' && selectedPo && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedPo.tinh_trang_cuoi || 'Đang chạy'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3. NỘI DUNG TỪNG TAB (SCROLLABLE BODY) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {/* ============================================================ */}
          {/* TAB 1: ĐƠN HÀNG SẢN XUẤT PO                                   */}
          {/* ============================================================ */}
          {/* Xem chi tiết 1 PO: hiện y hệt form chỉnh sửa nhưng chỉ xem */}
          {activeTab === 'DONHANG' && isPoDetail && (
            <div className="space-y-3.5">
              {relatedOrders.length > 1 && (
                <div className="flex items-center gap-1.5 p-2 bg-blue-50/40 rounded-xl overflow-x-auto border border-blue-100">
                  <span className="text-blue-900 font-bold text-[11px] whitespace-nowrap pl-1">Chọn đơn PO:</span>
                  {relatedOrders.map((o, idx) => (
                    <button
                      key={o.ma_po || idx}
                      type="button"
                      onClick={() => setSelectedPoIndex(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                        selectedPoIndex === idx ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {o.ma_po}
                    </button>
                  ))}
                </div>
              )}
              <XnkDonHangDrawer
                isOpen={true}
                embedded={true}
                readOnly={true}
                editItem={selectedPo}
                onClose={onClose}
              />
            </div>
          )}

          {activeTab === 'DONHANG' && !isPoDetail && (
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
                  {relatedOrders.map((po, idx) => {
                    const poLines = getPoLines(po, poLinesMap);
                    return (
                    <div 
                      key={po.ma_po || idx}
                      className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 transition shadow-2xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-extrabold rounded-lg text-xs">
                            {po.ma_po}
                          </span>
                          <span className="font-bold text-slate-800 text-sm">
                            {po.ten_sp}
                          </span>
                          {/* Badges tất cả mã SKU trong đơn hàng */}
                          {poLines.filter(l => l.sku).map((line, lIdx) => (
                            <span 
                              key={lIdx} 
                              className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200"
                              title={`SKU: ${line.sku} - ${line.ten_sp}`}
                            >
                              {line.sku}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {po.tinh_trang_cuoi || 'Đang xử lý'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            String(po.ke_hoach_ban || '').startsWith('Bán ngay')
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

                      {/* Các mốc thời gian quy trình */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                        <div>
                          <span className="text-slate-400 block font-semibold">Ngày đặt:</span>
                          <span className="font-bold text-slate-700">{formatDateVN(po.ngay_dat_hang) || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">SX xong:</span>
                          <span className="font-bold text-slate-700">{formatDateVN(po.ngay_sx_xong) || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Gửi hàng:</span>
                          <span className="font-bold text-slate-700">{formatDateVN(po.ngay_gui_hang) || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Thông quan:</span>
                          <span className="font-bold text-slate-700">{formatDateVN(po.ngay_thong_quan) || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Kho nhận:</span>
                          <span className="font-bold text-slate-700">{formatDateVN(po.ngay_kho_nhan) || '-'}</span>
                        </div>
                      </div>

                      {/* Bảng chi tiết sản phẩm / SKU trong đơn hàng PO đã đặt */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                        <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-blue-600" />
                            Bảng sản phẩm / SKU đặt hàng ({poLines.length} mặt hàng)
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Tổng đặt: <strong className="text-slate-800">{formatNumber(poLines.reduce((s, l) => s + (cleanNumber(l.so_luong) || 0), 0))}</strong> cái
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3 text-center w-10">STT</th>
                                <th className="py-2.5 px-3 whitespace-nowrap">Mã SKU</th>
                                <th className="py-2.5 px-3">Tên sản phẩm</th>
                                {poLines.some(l => l.id_mau) && (
                                  <th className="py-2.5 px-2 text-center whitespace-nowrap">Mã mẫu</th>
                                )}
                                <th className="py-2.5 px-3 text-right whitespace-nowrap">Số lượng đặt</th>
                                <th className="py-2.5 px-3 text-right whitespace-nowrap">Đơn giá</th>
                                <th className="py-2.5 px-3 text-right whitespace-nowrap">Thành tiền</th>
                                {poLines.some(l => l.slg_thuc_nhan !== '' && l.slg_thuc_nhan !== undefined) && (
                                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Thực nhận</th>
                                )}
                                {poLines.some(l => l.ghi_chu) && (
                                  <th className="py-2.5 px-3 whitespace-nowrap">Ghi chú</th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {poLines.map((line, lIdx) => (
                                <tr key={line._sheetRow || lIdx} className="hover:bg-blue-50/20 transition">
                                  <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                                    {line.stt || lIdx + 1}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                                    {line.sku ? (
                                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                                        {line.sku}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic">Chưa có SKU</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                                    {line.ten_sp || 'Chưa đặt tên'}
                                  </td>
                                  {poLines.some(l => l.id_mau) && (
                                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                      {line.id_mau ? (
                                        <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[11px] font-bold">
                                          {line.id_mau}
                                        </span>
                                      ) : '-'}
                                    </td>
                                  )}
                                  <td className="py-2.5 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                                    {formatNumber(line.so_luong)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                                    {line.don_gia ? formatCurrency(line.don_gia) : '-'}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                                    {line.thanh_tien 
                                      ? formatCurrency(line.thanh_tien) 
                                      : formatCurrency((cleanNumber(line.so_luong) || 0) * (cleanNumber(line.don_gia) || 0))}
                                  </td>
                                  {poLines.some(l => l.slg_thuc_nhan !== '' && l.slg_thuc_nhan !== undefined) && (
                                    <td className="py-2.5 px-3 text-right font-semibold text-indigo-700 whitespace-nowrap">
                                      {line.slg_thuc_nhan !== '' && line.slg_thuc_nhan !== undefined ? formatNumber(line.slg_thuc_nhan) : '-'}
                                    </td>
                                  )}
                                  {poLines.some(l => l.ghi_chu) && (
                                    <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[180px] truncate" title={line.ghi_chu}>
                                      {line.ghi_chu || '-'}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                            {poLines.length > 1 && (
                              <tfoot className="bg-slate-50/90 font-bold border-t border-slate-200 text-slate-700">
                                <tr>
                                  <td colSpan={poLines.some(l => l.id_mau) ? 4 : 3} className="py-2.5 px-3 text-right text-slate-600">
                                    Tổng cộng ({poLines.length} mặt hàng):
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-blue-700">
                                    {formatNumber(poLines.reduce((s, l) => s + (cleanNumber(l.so_luong) || 0), 0))} cái
                                  </td>
                                  <td className="py-2.5 px-3"></td>
                                  <td className="py-2.5 px-3 text-right text-emerald-700">
                                    {formatCurrency(poLines.reduce((s, l) => s + (cleanNumber(l.thanh_tien) || (cleanNumber(l.so_luong) * cleanNumber(l.don_gia)) || 0), 0))}
                                  </td>
                                  {poLines.some(l => l.slg_thuc_nhan !== '' && l.slg_thuc_nhan !== undefined) && (
                                    <td className="py-2.5 px-3 text-right text-indigo-700">
                                      {formatNumber(poLines.reduce((s, l) => s + (cleanNumber(l.slg_thuc_nhan) || 0), 0))} cái
                                    </td>
                                  )}
                                  {poLines.some(l => l.ghi_chu) && <td></td>}
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>

                      {/* Ghi chú đơn nếu có */}
                      {stripTiendoMeta(po.ghi_chu) && (
                        <div className="p-2.5 bg-blue-50/40 rounded-xl border border-blue-100 text-[11px]">
                          <span className="font-bold text-blue-900 block mb-0.5">Ghi chú đơn hàng:</span>
                          <p className="text-slate-700 whitespace-pre-line">{stripTiendoMeta(po.ghi_chu)}</p>
                        </div>
                      )}

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
                            title="Xem tiến độ 8 chặng của đơn này"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Xem tiến độ 8 chặng</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenEditTracking) {
                                onClose();
                                onOpenEditTracking(po);
                              } else {
                                setTrackingModalPo(po);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition flex items-center gap-1 cursor-pointer"
                            title="Cập nhật tiến độ đơn này"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Cập nhật tiến độ</span>
                          </button>

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
                  );
                  })}
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
                        href={String(currentIdea.link_tham_khao).startsWith('http') ? currentIdea.link_tham_khao : `https://${currentIdea.link_tham_khao}`}
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
          {/* TAB 4: TIẾN ĐỘ 6 CHẶNG LIÊN HOÀN (BẢNG MA TRẬN & STEPPER)     */}
          {/* ============================================================ */}
          {activeTab === 'TIENDO' && (
            <div className="space-y-4">
              {selectedPo ? (
                <div className="space-y-3.5">
                  {/* Selector chuyển đổi PO nếu có nhiều hơn 1 đơn PO */}
                  {relatedOrders.length > 1 && (
                    <div className="flex items-center gap-1.5 p-2 bg-indigo-50/40 rounded-xl overflow-x-auto border border-indigo-100">
                      <span className="text-indigo-900 font-bold text-[11px] whitespace-nowrap pl-1">Chọn đơn PO:</span>
                      {relatedOrders.map((o, idx) => (
                        <button
                          key={o.ma_po || idx}
                          type="button"
                          onClick={() => setSelectedPoIndex(idx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                            selectedPoIndex === idx
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {o.ma_po} {o.ten_sp ? `(${o.ten_sp})` : ''}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Giao diện Bảng ma trận 8 chặng (Nhập & Lưu) + Stepper Lịch trình trực quan như Ảnh 1 */}
                  <XnkTrackingMatrixContent
                    order={selectedPo}
                    embedded={true}
                  />
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-slate-500">Chưa có đơn hàng PO nào để theo dõi tiến độ lịch trình.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: TỔNG HỢP ĐƠN PO */}
          {activeTab === 'TONGHOP' && selectedPo && (
            <PoSummaryTab order={selectedPo} />
          )}

          {/* ============================================================ */}
          {/* TAB 5: NHÀ CUNG CẤP / XƯỞNG                                   */}
          {/* ============================================================ */}
          {activeTab === 'NCC' && (
            <div className="space-y-4">
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

              {/* BẢNG 1: TỔNG HỢP CÁC MÃ HÀNG SKU SẢN PHẨM ĐÃ ĐẶT TỪ NCC NÀY */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-800 text-xs">
                      Danh mục mã hàng SKU & Sản phẩm đã đặt ({nccProductsSummary.length} mã hàng)
                    </span>
                  </div>
                  {nccProductsSummary.length > 0 && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      Tổng số lượng: <strong className="text-blue-700">{formatNumber(nccProductsSummary.reduce((s, p) => s + p.tong_sl, 0))}</strong> cái
                    </span>
                  )}
                </div>

                {nccProductsSummary.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 italic">
                    Chưa có mã hàng SKU nào được đặt với nhà cung cấp này.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-10">STT</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Mã SKU</th>
                          <th className="py-2.5 px-3">Tên sản phẩm</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Đơn PO liên quan</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Tổng SL đặt</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Đơn giá gần nhất</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Tổng thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {nccProductsSummary.map((prod, pIdx) => (
                          <tr key={prod.sku || pIdx} className="hover:bg-slate-50/60 transition">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{pIdx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                              {prod.sku ? (
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                                  {prod.sku}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Chưa có SKU</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {prod.ten_sp}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="flex flex-wrap items-center gap-1">
                                {Array.from(prod.cac_don_po).map((poCode, cIdx) => (
                                  <button
                                    key={cIdx}
                                    type="button"
                                    onClick={() => {
                                      const poIdx = relatedOrders.findIndex(o => o.ma_po === poCode);
                                      if (poIdx !== -1) setSelectedPoIndex(poIdx);
                                      setActiveTab('DONHANG');
                                    }}
                                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 text-[11px] font-bold border border-slate-200 transition cursor-pointer"
                                    title="Bấm để xem đơn hàng này"
                                  >
                                    {poCode}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                              {formatNumber(prod.tong_sl)} cái
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                              {prod.don_gia_cuoi ? formatCurrency(prod.don_gia_cuoi) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                              {formatCurrency(prod.tong_thanh_tien)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {nccProductsSummary.length > 1 && (
                        <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-700">
                          <tr>
                            <td colSpan={4} className="py-2.5 px-3 text-right text-slate-600">
                              Tổng cộng ({nccProductsSummary.length} mã hàng):
                            </td>
                            <td className="py-2.5 px-3 text-right text-blue-700">
                              {formatNumber(nccProductsSummary.reduce((s, p) => s + p.tong_sl, 0))} cái
                            </td>
                            <td className="py-2.5 px-3"></td>
                            <td className="py-2.5 px-3 text-right text-emerald-700">
                              {formatCurrency(nccProductsSummary.reduce((s, p) => s + p.tong_thanh_tien, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>

              {/* BẢNG 2: BẢNG THÔNG TIN CÁC ĐƠN HÀNG PO ĐÃ ĐẶT */}
              {relatedOrders.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-800 text-xs">
                        Bảng thông tin các đơn hàng PO đã đặt ({relatedOrders.length} đơn)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Tổng giá trị: <strong className="text-emerald-700">{formatCurrency(relatedOrders.reduce((s, o) => s + (cleanNumber(o.tong_tien) || 0), 0))}</strong>
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 whitespace-nowrap">Mã PO</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Ngày đặt</th>
                          <th className="py-2.5 px-3">Sản phẩm / SKU</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Số lượng</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Tổng tiền</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap">Tình trạng</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Về kho</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {relatedOrders.map((o, oIdx) => {
                          const lines = getPoLines(o, poLinesMap);
                          return (
                            <tr key={o.ma_po || oIdx} className="hover:bg-slate-50/60 transition">
                              <td className="py-2.5 px-3 font-bold text-blue-700 whitespace-nowrap">
                                {o.ma_po}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                {formatDateVN(o.ngay_dat_hang) || '-'}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-800">{o.ten_sp}</div>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {lines.map((l, lIdx) => l.sku && (
                                    <span key={lIdx} className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      {l.sku}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                                {formatNumber(o.so_luong)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                                {formatCurrency(o.tong_tien)}
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {o.tinh_trang_cuoi || 'Đang xử lý'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                {formatDateVN(o.ngay_kho_nhan) || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPoIndex(oIdx);
                                      setActiveTab('TIENDO');
                                    }}
                                    className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                                    title="Xem tiến độ 8 chặng của đơn này"
                                  >
                                    <Clock className="w-3 h-3" />
                                    <span>Tiến độ 8 chặng</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPoIndex(oIdx);
                                      setActiveTab('DONHANG');
                                    }}
                                    className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                                    title="Xem chi tiết đơn này"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Chi tiết đơn</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
            {(activeTab === 'YTUONG' || (!['MAU', 'DONHANG', 'TIENDO'].includes(activeTab) && type === 'ytuong')) && onOpenEditYtuong && currentIdea && (
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

            {(activeTab === 'MAU' || (!['YTUONG', 'DONHANG', 'TIENDO'].includes(activeTab) && type === 'mau')) && onOpenEditMau && (relatedSamples.length > 0 || item) && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditMau(relatedSamples[0] || item);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa mẫu thử</span>
              </button>
            )}

            {(activeTab === 'DONHANG' || (!['YTUONG', 'MAU', 'TIENDO'].includes(activeTab) && (type === 'donhang' || type === 'tiendo'))) && onOpenEditPo && (selectedPo || item) && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditPo(selectedPo || item);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa đơn PO</span>
              </button>
            )}

            {activeTab === 'TIENDO' && onOpenEditTracking && (selectedPo || item) && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditTracking(selectedPo || item);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Cập nhật tiến độ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Standalone Tracking Modal popup nếu người dùng bấm Cập nhật tiến độ */}
      {trackingModalPo && (
        <XnkTrackingModal
          isOpen={!!trackingModalPo}
          onClose={() => setTrackingModalPo(null)}
          order={trackingModalPo}
          onSaved={() => {
            fetchModule('xnk_donhang', true);
            fetchModule('xnk_donhang_ct', true);
          }}
        />
      )}
    </div>
  );
}

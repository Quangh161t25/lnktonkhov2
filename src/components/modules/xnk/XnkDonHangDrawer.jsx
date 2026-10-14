import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';
import { ProductSearchCell } from '../../common/ProductSearchCell';
import { SuggestInput } from '../../common/SuggestInput';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { 
  formatDateInput, 
  formatDateVN, 
  cleanNumber, 
  formatCurrency, 
  formatNumber 
} from '../../../utils/formatters';
import { 
  FileCheck, 
  Factory, 
  Truck, 
  Warehouse, 
  Calendar, 
  Save, 
  Sparkles, 
  Table, 
  CalendarRange, 
  Clock, 
  Package, 
  Check, 
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { 
  extractTiendoMeta, 
  stripTiendoMeta, 
  buildGhiChuWithMeta, 
  resolvePoStageCompletion, 
  computeStatusFromStages 
} from './XnkTrackingModal';

// Cộng trừ ngày theo múi giờ địa phương an toàn
function addDays(dateStr, days) {
  if (!dateStr) return '';
  const numDays = Number(days);
  if (isNaN(numDays)) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d);
    dateObj.setDate(dateObj.getDate() + numDays);
    const resY = dateObj.getFullYear();
    const resM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const resD = String(dateObj.getDate()).padStart(2, '0');
    return `${resY}-${resM}-${resD}`;
  }
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return dateStr;
  dateObj.setDate(dateObj.getDate() + numDays);
  return dateObj.toISOString().slice(0, 10);
}

// Tính khoảng cách số ngày giữa 2 mốc thời gian
function calcDurationDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const startParts = startDate.split('-');
  const endParts = endDate.split('-');
  if (startParts.length === 3 && endParts.length === 3) {
    const s = new Date(parseInt(startParts[0], 10), parseInt(startParts[1], 10) - 1, parseInt(startParts[2], 10));
    const e = new Date(parseInt(endParts[0], 10), parseInt(endParts[1], 10) - 1, parseInt(endParts[2], 10));
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  }
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  const diffTime = e.getTime() - s.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
}

export function XnkDonHangDrawer({ 
  isOpen, 
  onClose, 
  editItem = null, 
  initialSample = null,
  onSaved 
}) {
  const { currentUser, hasActionPermission, usersData } = useAuth();
  const { 
    appendRow, 
    updateRow, 
    logAuditAction, 
    xnkYtuongData, 
    xnkMauData,
    xnkDonHangData,
    productData,
    fetchModule 
  } = useData();

  // Đảm bảo dữ liệu danh sách sản phẩm DS_SP được tải
  useEffect(() => {
    if (isOpen) {
      if (!productData || productData.length <= 1) {
        fetchModule('sanpham');
      }
    }
  }, [isOpen, productData, fetchModule]);

  // Danh mục sản phẩm từ DS_SP (hỗ trợ chọn SKU từ DS sản phẩm)
  const productList = useMemo(() => {
    if (!productData || productData.length <= 1) return [];
    return productData.slice(1).map(r => ({
      id: (r[0] || '').toString().trim(),
      name: (r[1] || '').toString().trim(),
      price: cleanNumber(r[4]) || 0
    })).filter(p => p.id);
  }, [productData]);

  // Danh sách NCC gợi ý từ DSNV, Mẫu thử & PO đã có
  const nccOptions = useMemo(() => {
    const map = new Map();
    const add = (name, contact = '') => {
      const n = (name || '').toString().trim();
      if (n && !map.has(n.toLowerCase())) map.set(n.toLowerCase(), { name: n, contact });
    };

    (usersData || []).forEach(u => {
      const typeStr = (u.type || '').toString().trim().toUpperCase();
      const roleStr = (u.role || '').toString().trim().toUpperCase();
      if (typeStr.includes('NCC') || typeStr.includes('NHÀ CUNG CẤP') || typeStr.includes('XƯỞNG') || roleStr === 'NCC') {
        add(u.name, u.image || '');
      }
    });
    if (xnkMauData && xnkMauData.length > 1) {
      xnkMauData.slice(1).forEach(r => add(r[2], (r[3] || '').toString().trim()));
    }
    if (xnkDonHangData && xnkDonHangData.length > 1) {
      xnkDonHangData.slice(1).forEach(r => add(r[4]));
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [usersData, xnkMauData, xnkDonHangData]);

  // Chế độ xem lịch trình: 'TABLE' (Bảng ma trận) vs 'CALENDAR' (Dạng Lịch/Gantt)
  const [timelineViewMode, setTimelineViewMode] = useState('TABLE');

  // 1. Thông tin đơn hàng cơ bản
  const [maPo, setMaPo] = useState('');
  const [idYtuong, setIdYtuong] = useState('');
  const [idMau, setIdMau] = useState('');
  const [sku, setSku] = useState('');
  const [tenSp, setTenSp] = useState('');
  const [tenNcc, setTenNcc] = useState('');
  const [soLuong, setSoLuong] = useState(100);
  const [donGia, setDonGia] = useState(0);
  const [tienCoc, setTienCoc] = useState(0);

  // 2. Tiến độ & Lịch trình 6 chặng liên hoàn (Từ ngày chặng này = Đến ngày chặng trước)
  // Chặng 1: Đặt hàng & Cọc
  const [ngayDatHang, setNgayDatHang] = useState(formatDateInput(new Date()));
  const [daysStage1, setDaysStage1] = useState(1);
  const [ngayCocXong, setNgayCocXong] = useState(formatDateInput(new Date()));
  const [stage1Done, setStage1Done] = useState(true);

  // Chặng 2: Sản xuất xưởng (Từ ngày = ngayCocXong)
  const [daysStage2, setDaysStage2] = useState(15);
  const [ngaySxXong, setNgaySxXong] = useState('');
  const [stage2Done, setStage2Done] = useState(false);

  // Chặng 3: Vận chuyển quốc tế (Từ ngày = ngaySxXong)
  const [daysStage3, setDaysStage3] = useState(7);
  const [ngayDenCang, setNgayDenCang] = useState('');
  const [trackingVanChuyen, setTrackingVanChuyen] = useState('');
  const [stage3Done, setStage3Done] = useState(false);

  // Chặng 4: Hải quan & Cảng (Từ ngày = ngayDenCang)
  const [daysStage4, setDaysStage4] = useState(3);
  const [ngayThongQuan, setNgayThongQuan] = useState('');
  const [thongTinHaiQuan, setThongTinHaiQuan] = useState('Cảng Cát Lái');
  const [stage4Done, setStage4Done] = useState(false);

  // Chặng 5: Kho Việt Nam nhận hàng (Từ ngày = ngayThongQuan)
  const [daysStage5, setDaysStage5] = useState(2);
  const [ngayKhoNhan, setNgayKhoNhan] = useState('');
  const [slgThucNhan, setSlgThucNhan] = useState('');
  const [stage5Done, setStage5Done] = useState(false);

  // Chặng 6: Kế hoạch phân phối & Mở bán (Từ ngày = ngayKhoNhan)
  const [keHoachBanType, setKeHoachBanType] = useState('Bán ngay');
  const [daysStage6, setDaysStage6] = useState(0);
  const [ngayKeHoachBan, setNgayKeHoachBan] = useState('');
  const [stage6Done, setStage6Done] = useState(false);

  // Ghi chú & Trạng thái sau cùng
  const [manualStatusOverride, setManualStatusOverride] = useState('');
  const [ghiChu, setGhiChu] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto calculate total amount
  const tongTien = (cleanNumber(soLuong) || 0) * (cleanNumber(donGia) || 0);

  // 1. Parsed Ý tưởng từ xnkYtuongData
  const ytuongOptions = useMemo(() => {
    if (!xnkYtuongData || xnkYtuongData.length <= 1) return [];
    return xnkYtuongData.slice(1).map((r, idx) => ({
      _sheetRow: idx + 2,
      id_y_tuong: r[0] || '',
      sku_du_kien: r[3] || '',
      ten_sp: r[4] || '',
      trang_thai: r[7] || 'Mới tạo',
      link_tham_khao: r[6] || ''
    })).filter(y => y.id_y_tuong || y.ten_sp);
  }, [xnkYtuongData]);

  // 2. Parsed Mẫu thử ĐÃ DUYỆT ĐẠT từ xnkMauData (Chỉ hiển thị mẫu Đạt)
  const approvedSamples = useMemo(() => {
    if (!xnkMauData || xnkMauData.length <= 1) return [];
    return xnkMauData.slice(1).map((r, idx) => {
      const xepHang = (r[9] || '').trim();
      const sepDuyet = (r[10] || '').trim();
      return {
        _sheetRow: idx + 2,
        id_mau: r[0] || '',
        id_y_tuong: r[1] || '',
        ten_ncc: r[2] || '',
        lien_he_ncc: r[3] || '',
        gia_mau: cleanNumber(r[4]) || 0,
        link_anh_mau: r[7] || '',
        danh_gia_xep_hang: xepHang,
        trang_thai_duyet: sepDuyet
      };
    }).filter(m => {
      if (!m.id_mau) return false;
      const isApproved = m.danh_gia_xep_hang === 'Đạt' || 
                         m.trang_thai_duyet === 'Đã duyệt (Cho phép đặt thật)' || 
                         m.trang_thai_duyet === 'Đồng ý';
      return isApproved;
    });
  }, [xnkMauData]);

  // 3. Mẫu thử được gợi ý theo Ý tưởng đã chọn
  const suggestedSamples = useMemo(() => {
    if (!idYtuong) return approvedSamples;
    return approvedSamples.filter(s => s.id_y_tuong === idYtuong);
  }, [idYtuong, approvedSamples]);

  // Tự động tính toán Trạng thái sau cùng theo đúng các nút Đã xong / Chưa xong
  const autoComputedStatus = useMemo(() => {
    return computeStatusFromStages({
      s1: stage1Done,
      s2: stage2Done,
      s3: stage3Done,
      s4: stage4Done,
      s5: stage5Done,
      s6: stage6Done,
      isCancelled: manualStatusOverride === 'Đã hủy'
    });
  }, [stage6Done, stage5Done, stage4Done, stage3Done, stage2Done, stage1Done, manualStatusOverride]);

  // Khởi tạo form khi mở Drawer
  useEffect(() => {
    if (editItem) {
      setMaPo(editItem.ma_po || '');
      setIdMau(editItem.id_mau || '');
      setSku(editItem.sku || '');
      setTenSp(editItem.ten_sp || '');
      setTenNcc(editItem.ten_ncc || '');
      setSoLuong(editItem.so_luong !== undefined && editItem.so_luong !== '' ? editItem.so_luong : 100);
      setDonGia(editItem.don_gia !== undefined && editItem.don_gia !== '' ? editItem.don_gia : 0);
      setTienCoc(editItem.tien_coc !== undefined && editItem.tien_coc !== '' ? editItem.tien_coc : 0);
      
      // Ngày & Tiến độ
      const meta = extractTiendoMeta(editItem.ghi_chu);
      const resolvedStages = resolvePoStageCompletion(editItem);
      const dtStart1 = editItem.ngay_dat_hang ? formatDateInput(editItem.ngay_dat_hang) : formatDateInput(new Date());
      setNgayDatHang(dtStart1);
      
      // Chặng 1
      const d1 = meta.d1 ? (parseInt(meta.d1, 10) || 1) : 1;
      setDaysStage1(d1);
      const end1 = meta.coc ? formatDateInput(meta.coc) : addDays(dtStart1, d1);
      setNgayCocXong(end1);
      setStage1Done(resolvedStages.s1);

      // Chặng 2
      const dtSx = editItem.ngay_sx_xong ? formatDateInput(editItem.ngay_sx_xong) : '';
      const d2 = dtSx ? (calcDurationDays(end1, dtSx) || 1) : 15;
      setDaysStage2(d2);
      const end2 = dtSx || addDays(end1, d2);
      setNgaySxXong(end2);
      setStage2Done(resolvedStages.s2);

      // Chặng 3
      setTrackingVanChuyen(editItem.tracking_van_chuyen || '');
      const d3 = meta.d3 ? (parseInt(meta.d3, 10) || 7) : 7;
      setDaysStage3(d3);
      const dtDenCang = meta.cang
        ? formatDateInput(meta.cang)
        : (editItem.ngay_gui_hang && editItem.ngay_gui_hang !== dtSx ? formatDateInput(editItem.ngay_gui_hang) : addDays(end2, d3));
      setNgayDenCang(dtDenCang);
      setStage3Done(resolvedStages.s3);

      // Chặng 4
      const dtTq = editItem.ngay_thong_quan ? formatDateInput(editItem.ngay_thong_quan) : '';
      const d4 = dtTq ? (calcDurationDays(dtDenCang, dtTq) || 1) : 3;
      setDaysStage4(d4);
      const end4 = dtTq || addDays(dtDenCang, d4);
      setNgayThongQuan(end4);
      setStage4Done(resolvedStages.s4);

      // Chặng 5
      const dtKho = editItem.ngay_kho_nhan ? formatDateInput(editItem.ngay_kho_nhan) : '';
      const d5 = dtKho ? (calcDurationDays(end4, dtKho) || 1) : 2;
      setDaysStage5(d5);
      const end5 = dtKho || addDays(end4, d5);
      setNgayKhoNhan(end5);
      setSlgThucNhan(editItem.slg_thuc_nhan !== undefined && editItem.slg_thuc_nhan !== '' ? editItem.slg_thuc_nhan : '');
      setStage5Done(resolvedStages.s5);

      // Chặng 6: Kế hoạch bán
      const rawKeHoach = editItem.ke_hoach_ban || 'Bán ngay';
      const isBanSau = rawKeHoach.includes('Bán sau');
      setKeHoachBanType(isBanSau ? 'Bán sau (Trữ kho)' : 'Bán ngay');
      const matchDate = rawKeHoach.match(/\[(.*?)\]/);
      let dtBan = '';
      if (matchDate && matchDate[1]) {
        dtBan = formatDateInput(matchDate[1]);
      } else if (isBanSau) {
        dtBan = addDays(end5, 7);
      } else {
        dtBan = end5;
      }
      const d6 = calcDurationDays(end5, dtBan);
      setDaysStage6(d6);
      setNgayKeHoachBan(dtBan);
      setStage6Done(resolvedStages.s6);

      // Tra cứu ý tưởng từ mẫu
      const matchingSample = approvedSamples.find(s => s.id_mau === editItem.id_mau);
      if (matchingSample?.id_y_tuong) {
        setIdYtuong(matchingSample.id_y_tuong);
      } else {
        const foundIdea = ytuongOptions.find(y => y.sku_du_kien === editItem.sku || y.ten_sp === editItem.ten_sp);
        setIdYtuong(foundIdea?.id_y_tuong || '');
      }

      setManualStatusOverride(editItem.tinh_trang_cuoi === 'Đã hủy' ? 'Đã hủy' : '');
      setGhiChu(stripTiendoMeta(editItem.ghi_chu));
    } else {
      // Đơn mới
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setMaPo(`PO-${todayStr}-${randomSuffix}`);
      
      if (initialSample) {
        setIdMau(initialSample.id_mau || '');
        setIdYtuong(initialSample.id_y_tuong || '');
        setSku(initialSample.sku || initialSample.sku_du_kien || '');
        setTenSp(initialSample.ten_sp || '');
        setTenNcc(initialSample.ten_ncc || '');
      } else {
        setIdMau('');
        setIdYtuong('');
        setSku('');
        setTenSp('');
        setTenNcc('');
      }

      setSoLuong(100);
      setDonGia(0);
      setTienCoc(0);
      
      const nowInput = formatDateInput(new Date());
      setNgayDatHang(nowInput);
      setDaysStage1(1);
      const end1 = addDays(nowInput, 1);
      setNgayCocXong(end1);
      setStage1Done(true);

      setDaysStage2(15);
      const end2 = addDays(end1, 15);
      setNgaySxXong(end2);
      setStage2Done(false);

      setDaysStage3(7);
      const end3 = addDays(end2, 7);
      setNgayDenCang(end3);
      setTrackingVanChuyen('');
      setStage3Done(false);

      setDaysStage4(3);
      const end4 = addDays(end3, 3);
      setNgayThongQuan(end4);
      setThongTinHaiQuan('Cảng Cát Lái');
      setStage4Done(false);

      setDaysStage5(2);
      const end5 = addDays(end4, 2);
      setNgayKhoNhan(end5);
      setSlgThucNhan('');
      setStage5Done(false);

      setKeHoachBanType('Bán ngay');
      setDaysStage6(0);
      setNgayKeHoachBan(end5);
      setStage6Done(false);

      setManualStatusOverride('');
      setGhiChu('');
    }
    setErrorMsg('');
  }, [editItem, initialSample, isOpen]);

  // Luồng 1: Chọn Ý tưởng -> Tự điền SKU, Tên SP và gợi ý Mẫu thử
  const handleSelectIdea = (selectedIdeaId) => {
    setIdYtuong(selectedIdeaId);
    if (!selectedIdeaId) return;
    const idea = ytuongOptions.find(y => y.id_y_tuong === selectedIdeaId);
    if (idea) {
      if (idea.sku_du_kien) setSku(idea.sku_du_kien);
      if (idea.ten_sp) setTenSp(idea.ten_sp);
    }

    const matchingSamples = approvedSamples.filter(s => s.id_y_tuong === selectedIdeaId);
    if (matchingSamples.length === 1) {
      const singleSample = matchingSamples[0];
      setIdMau(singleSample.id_mau);
      if (singleSample.ten_ncc) setTenNcc(singleSample.ten_ncc);
      if (singleSample.gia_mau && donGia === 0) setDonGia(singleSample.gia_mau);
    } else if (matchingSamples.length === 0) {
      setIdMau('');
    }
  };

  // Luồng 2: Chọn Mẫu thử -> Tự động liên kết luôn Ý tưởng
  const handleSelectSample = (sampleId) => {
    setIdMau(sampleId);
    const foundSample = approvedSamples.find(s => s.id_mau === sampleId);
    if (foundSample) {
      if (foundSample.ten_ncc) setTenNcc(foundSample.ten_ncc);
      if (foundSample.gia_mau && donGia === 0) setDonGia(foundSample.gia_mau);

      if (foundSample.id_y_tuong) {
        setIdYtuong(foundSample.id_y_tuong);
        const relatedIdea = ytuongOptions.find(y => y.id_y_tuong === foundSample.id_y_tuong);
        if (relatedIdea) {
          if (relatedIdea.sku_du_kien) setSku(relatedIdea.sku_du_kien);
          if (relatedIdea.ten_sp) setTenSp(relatedIdea.ten_sp);
        }
      }
    }
  };

  // -------------------------------------------------------------
  // BỘ HÀM DỜI LỊCH DÂY CHUYỀN (Từ ngày chặng này = Đến ngày chặng trước)
  // -------------------------------------------------------------
  // Khi đổi ngày bắt đầu chặng 1
  const handleStart1Change = (val) => {
    setNgayDatHang(val);
    const end1 = addDays(val, daysStage1);
    const end2 = addDays(end1, daysStage2);
    const end3 = addDays(end2, daysStage3);
    const end4 = addDays(end3, daysStage4);
    const end5 = addDays(end4, daysStage5);
    const end6 = addDays(end5, daysStage6);
    setNgayCocXong(end1);
    setNgaySxXong(end2);
    setNgayDenCang(end3);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  // Chặng 1: Sửa số ngày hoặc sửa đến ngày
  const handleDays1Change = (val) => {
    const d = Math.max(0, parseInt(val, 10) || 0);
    setDaysStage1(d);
    const end1 = addDays(ngayDatHang, d);
    const end2 = addDays(end1, daysStage2);
    const end3 = addDays(end2, daysStage3);
    const end4 = addDays(end3, daysStage4);
    const end5 = addDays(end4, daysStage5);
    const end6 = addDays(end5, daysStage6);
    setNgayCocXong(end1);
    setNgaySxXong(end2);
    setNgayDenCang(end3);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  const handleEnd1Change = (val) => {
    setNgayCocXong(val);
    const d = calcDurationDays(ngayDatHang, val);
    setDaysStage1(d);
    const end2 = addDays(val, daysStage2);
    const end3 = addDays(end2, daysStage3);
    const end4 = addDays(end3, daysStage4);
    const end5 = addDays(end4, daysStage5);
    const end6 = addDays(end5, daysStage6);
    setNgaySxXong(end2);
    setNgayDenCang(end3);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  // Chặng 2: Sửa số ngày hoặc sửa đến ngày
  const handleDays2Change = (val) => {
    const d = Math.max(0, parseInt(val, 10) || 0);
    setDaysStage2(d);
    const end2 = addDays(ngayCocXong, d);
    const end3 = addDays(end2, daysStage3);
    const end4 = addDays(end3, daysStage4);
    const end5 = addDays(end4, daysStage5);
    const end6 = addDays(end5, daysStage6);
    setNgaySxXong(end2);
    setNgayDenCang(end3);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  const handleEnd2Change = (val) => {
    setNgaySxXong(val);
    const d = calcDurationDays(ngayCocXong, val);
    setDaysStage2(d);
    const end3 = addDays(val, daysStage3);
    const end4 = addDays(end3, daysStage4);
    const end5 = addDays(end4, daysStage5);
    const end6 = addDays(end5, daysStage6);
    setNgayDenCang(end3);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  // Chặng 3: Sửa số ngày hoặc sửa đến ngày
  const handleDays3Change = (val) => {
    const d = Math.max(0, parseInt(val, 10) || 0);
    setDaysStage3(d);
    const end3 = addDays(ngaySxXong, d);
    const end4 = addDays(end3, daysStage4);
    const end5 = addDays(end4, daysStage5);
    const end6 = addDays(end5, daysStage6);
    setNgayDenCang(end3);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  const handleEnd3Change = (val) => {
    setNgayDenCang(val);
    const d = calcDurationDays(ngaySxXong, val);
    setDaysStage3(d);
    const end4 = addDays(val, daysStage4);
    const end5 = addDays(end4, daysStage5);
    const end6 = addDays(end5, daysStage6);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  // Chặng 4: Sửa số ngày hoặc sửa đến ngày
  const handleDays4Change = (val) => {
    const d = Math.max(0, parseInt(val, 10) || 0);
    setDaysStage4(d);
    const end4 = addDays(ngayDenCang, d);
    const end5 = addDays(end4, daysStage5);
    const end6 = addDays(end5, daysStage6);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  const handleEnd4Change = (val) => {
    setNgayThongQuan(val);
    const d = calcDurationDays(ngayDenCang, val);
    setDaysStage4(d);
    const end5 = addDays(val, daysStage5);
    const end6 = addDays(end5, daysStage6);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  // Chặng 5: Sửa số ngày hoặc sửa đến ngày
  const handleDays5Change = (val) => {
    const d = Math.max(0, parseInt(val, 10) || 0);
    setDaysStage5(d);
    const end5 = addDays(ngayThongQuan, d);
    const end6 = addDays(end5, daysStage6);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  const handleEnd5Change = (val) => {
    setNgayKhoNhan(val);
    const d = calcDurationDays(ngayThongQuan, val);
    setDaysStage5(d);
    const end6 = addDays(val, daysStage6);
    setNgayKeHoachBan(end6);
  };

  // Chặng 6: Kế hoạch phân phối
  const handleDays6Change = (val) => {
    const d = Math.max(0, parseInt(val, 10) || 0);
    setDaysStage6(d);
    const end6 = addDays(ngayKhoNhan, d);
    setNgayKeHoachBan(end6);
    setKeHoachBanType(d === 0 ? 'Bán ngay' : 'Bán sau (Trữ kho)');
  };

  const handleEnd6Change = (val) => {
    setNgayKeHoachBan(val);
    const d = calcDurationDays(ngayKhoNhan, val);
    setDaysStage6(d);
    setKeHoachBanType(d === 0 ? 'Bán ngay' : 'Bán sau (Trữ kho)');
  };

  const handlePlanTypeChange = (type) => {
    setKeHoachBanType(type);
    if (type === 'Bán ngay') {
      setDaysStage6(0);
      setNgayKeHoachBan(ngayKhoNhan);
    } else {
      const d = daysStage6 > 0 ? daysStage6 : 7;
      setDaysStage6(d);
      setNgayKeHoachBan(addDays(ngayKhoNhan, d));
    }
  };

  const handleToggleStage = (stageNum) => {
    const currentMap = {
      1: stage1Done,
      2: stage2Done,
      3: stage3Done,
      4: stage4Done,
      5: stage5Done,
      6: stage6Done
    };
    const next = !currentMap[stageNum];
    if (next) {
      if (stageNum >= 1) setStage1Done(true);
      if (stageNum >= 2) setStage2Done(true);
      if (stageNum >= 3) setStage3Done(true);
      if (stageNum >= 4) setStage4Done(true);
      if (stageNum >= 5) {
        setStage5Done(true);
        if (!slgThucNhan) setSlgThucNhan(soLuong || '');
      }
      if (stageNum >= 6) setStage6Done(true);
    } else {
      if (stageNum <= 1) setStage1Done(false);
      if (stageNum <= 2) setStage2Done(false);
      if (stageNum <= 3) setStage3Done(false);
      if (stageNum <= 4) setStage4Done(false);
      if (stageNum <= 5) setStage5Done(false);
      if (stageNum <= 6) setStage6Done(false);
    }
  };

  // Tổng thời gian Lead-time toàn bộ 6 chặng
  const totalLeadDays = (daysStage1 || 0) + (daysStage2 || 0) + (daysStage3 || 0) + (daysStage4 || 0) + (daysStage5 || 0) + (daysStage6 || 0);

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenSp.trim()) {
      setErrorMsg('Vui lòng nhập hoặc chọn Tên sản phẩm!');
      return;
    }
    if (cleanNumber(soLuong) <= 0) {
      setErrorMsg('Số lượng đặt hàng phải lớn hơn 0!');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      // Chuỗi Kế hoạch bán hàng kèm Ngày mở bán
      let formattedKeHoach = keHoachBanType;
      if (ngayKeHoachBan) {
        formattedKeHoach = `${keHoachBanType} [${formatDateVN(ngayKeHoachBan)}]`;
      } else if (ngayKhoNhan && keHoachBanType === 'Bán ngay') {
        formattedKeHoach = `${keHoachBanType} [${formatDateVN(ngayKhoNhan)}]`;
      }

      const finalStatus = manualStatusOverride || autoComputedStatus;

      // 1. Resolve targetSheetRow with fallback lookup by maPo
      let targetSheetRow = (editItem && editItem._sheetRow);
      if (!targetSheetRow && maPo && xnkDonHangData && xnkDonHangData.length > 1) {
        const targetPo = maPo.toString().trim().toUpperCase();
        const foundIdx = xnkDonHangData.slice(1).findIndex(r => (r[0] || '').toString().trim().toUpperCase() === targetPo);
        if (foundIdx !== -1) {
          targetSheetRow = foundIdx + 2;
        }
      }

      const meta = {
        s1: stage1Done ? 1 : 0,
        s2: stage2Done ? 1 : 0,
        s3: stage3Done ? 1 : 0,
        s4: stage4Done ? 1 : 0,
        s5: stage5Done ? 1 : 0,
        s6: stage6Done ? 1 : 0,
        d1: daysStage1,
        coc: ngayCocXong,
        d3: daysStage3,
        cang: ngayDenCang
      };

      const finalGhiChu = buildGhiChuWithMeta(ghiChu.trim(), meta);

      // 19 Cột chuẩn của Google Sheet XNK_DON_HANG:
      // ['ma_po', 'id_mau', 'sku', 'ten_sp', 'ten_ncc', 'so_luong', 'don_gia', 'tong_tien', 'tien_coc', 'ngay_dat_hang', 'ngay_sx_xong', 'tracking_van_chuyen', 'ngay_gui_hang', 'ngay_thong_quan', 'ngay_kho_nhan', 'slg_thuc_nhan', 'ke_hoach_ban', 'tinh_trang_cuoi', 'ghi_chu']
      const rowValues = [
        maPo.trim(),
        idMau.trim(),
        sku.trim(),
        tenSp.trim(),
        tenNcc.trim(),
        cleanNumber(soLuong),
        cleanNumber(donGia),
        cleanNumber(tongTien),
        cleanNumber(tienCoc),
        ngayDatHang,
        ngaySxXong,
        trackingVanChuyen.trim(),
        ngayDenCang, // Cột 12: Ngày đến cảng / hoàn thành chặng 3
        ngayThongQuan,
        ngayKhoNhan,
        slgThucNhan !== '' ? cleanNumber(slgThucNhan) : '',
        formattedKeHoach,
        finalStatus,
        finalGhiChu
      ];

      if (targetSheetRow) {
        await updateRow('xnk_donhang', targetSheetRow, rowValues);
        if (logAuditAction) {
          await logAuditAction({
            moduleName: 'xnk',
            actionType: 'SỬA',
            orderId: maPo,
            targetObject: tenSp,
            summary: `Cập nhật PO ${maPo} (${tenSp}) - Trạng thái: ${finalStatus}`
          });
        }
      } else {
        await appendRow('xnk_donhang', rowValues);
        if (logAuditAction) {
          await logAuditAction({
            moduleName: 'xnk',
            actionType: 'THÊM',
            orderId: maPo,
            targetObject: tenSp,
            summary: `Lên đơn PO mới ${maPo}: ${tenSp} - SLG: ${soLuong} (${finalStatus})`
          });
        }
      }

      await new Promise(r => setTimeout(r, 400));
      await fetchModule('xnk_donhang', true);
      if (onSaved) await onSaved();
      onClose();
    } catch (err) {
      console.error('Lỗi lưu đơn PO:', err);
      setErrorMsg('Không thể lưu dữ liệu lên hệ thống. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? `Cập Nhật Đơn Hàng PO: ${maPo}` : 'Tạo Đơn Hàng Sản Xuất Mới (PO)'}
      maxWidth="max-w-5xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Header thông tin nhanh & Trạng thái sau cùng tự động */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Mã PO:</label>
            <input
              type="text"
              value={maPo}
              onChange={(e) => setMaPo(e.target.value)}
              placeholder="VD: PO-20261012-1234"
              className="px-2.5 py-1 bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-blue-700 font-extrabold text-xs rounded-lg shadow-2xs outline-none"
              title="Nhấp để chỉnh sửa mã PO"
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Tổng Lead-time: <strong className="text-blue-700 font-bold">{totalLeadDays} ngày</strong></span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Trạng thái tự động:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-600" />
                {manualStatusOverride || autoComputedStatus}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PHẦN 1: THÔNG TIN ĐƠN HÀNG & LIÊN KẾT Ý TƯỞNG / MẪU THỬ      */}
        {/* ============================================================ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-blue-600" />
              1. Thông tin sản phẩm & Đối tác xưởng
            </span>
            <span className="text-[11px] text-slate-400">Chọn ý tưởng hoặc mẫu thử đã duyệt</span>
          </div>

          {/* Chọn Ý tưởng sản phẩm (Gợi ý Mẫu) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  💡 1. Chọn từ Ý tưởng sản phẩm
                </label>
                {ytuongOptions.length > 0 && (
                  <span className="text-[11px] text-blue-600 font-semibold">
                    {ytuongOptions.length} ý tưởng
                  </span>
                )}
              </div>
              <SuggestInput
                value={idYtuong}
                onSelect={(item) => handleSelectIdea(item ? item.key : '')}
                items={ytuongOptions.map(y => ({
                  key: y.id_y_tuong,
                  title: `[${y.sku_du_kien || y.id_y_tuong}] ${y.ten_sp}`,
                  subtitle: y.id_y_tuong,
                  extra: y.trang_thai
                }))}
                headerLabel="Gợi ý ý tưởng"
                placeholder="Gõ tên SP, SKU hoặc mã ý tưởng..."
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Chọn Mẫu thử đã duyệt đạt chuẩn */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  📦 2. Mẫu thử đã duyệt đạt chuẩn <span className="text-emerald-600 font-semibold">(Chỉ mẫu Đạt)</span>
                </label>
                {suggestedSamples.length > 0 && (
                  <span className="text-[11px] text-emerald-600 font-bold">
                    {suggestedSamples.length} mẫu đạt
                  </span>
                )}
              </div>
              <SuggestInput
                value={idMau}
                onSelect={(item) => handleSelectSample(item ? item.key : '')}
                items={suggestedSamples.map(s => ({
                  key: s.id_mau,
                  title: `[${s.id_mau}] NCC: ${s.ten_ncc}`,
                  subtitle: `Ý tưởng: ${s.id_y_tuong || '—'} • Xếp hạng: ${s.danh_gia_xep_hang || 'Đạt'}`,
                  extra: s.gia_mau ? formatCurrency(s.gia_mau) : ''
                }))}
                headerLabel="Gợi ý mẫu thử đạt"
                placeholder="Gõ mã mẫu, tên NCC..."
                className="w-full px-3 py-2 bg-emerald-50/40 hover:bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
              />
            </div>
          </div>

          {/* SKU, Tên sản phẩm, Nhà cung cấp */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  SKU sản phẩm <span className="text-rose-500">*</span>
                </label>
                {productList.length > 0 && (
                  <span className="text-[10px] text-blue-600 font-bold">
                    ({productList.length} SP có sẵn)
                  </span>
                )}
              </div>
              <ProductSearchCell
                value={sku}
                onChange={(val) => setSku(val)}
                onSelectProduct={(prod) => {
                  setSku(prod.id);
                  if (prod.name) setTenSp(prod.name);
                  if (prod.price && donGia === 0) setDonGia(prod.price);
                }}
                productList={productList}
                placeholder="Gõ hoặc chọn SKU từ DS sản phẩm..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-blue-800 uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
              {productList.length > 0 && (
                <div className="mt-1">
                  <select
                    value=""
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;
                      const found = productList.find(p => p.id === selectedId);
                      if (found) {
                        setSku(found.id);
                        if (found.name) setTenSp(found.name);
                        if (found.price && donGia === 0) setDonGia(found.price);
                      }
                    }}
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 outline-none hover:bg-slate-100 cursor-pointer"
                  >
                    <option value="">-- Hoặc chọn nhanh từ danh mục ({productList.length} SP) --</option>
                    {productList.map(p => (
                      <option key={p.id} value={p.id}>
                        [{p.id}] {p.name} {p.price > 0 ? `(${formatCurrency(p.price)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên sản phẩm <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={tenSp}
                onChange={(e) => setTenSp(e.target.value)}
                placeholder="VD: Nồi chiên không dầu Lock&King..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Nhà cung cấp / Xưởng sản xuất
                </label>
                {nccOptions.length > 0 && (
                  <span className="text-[10px] text-blue-600 font-bold">
                    ({nccOptions.length} NCC trong DS)
                  </span>
                )}
              </div>
              <SuggestInput
                value={tenNcc}
                onChange={setTenNcc}
                onSelect={(item) => setTenNcc(item.title)}
                items={nccOptions.map(n => ({ key: n.name, title: n.name, subtitle: n.contact }))}
                headerLabel="Gợi ý NCC"
                placeholder="Gõ tên NCC / xưởng..."
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PHẦN 2: TÀI CHÍNH & NGÂN SÁCH ĐƠN HÀNG                        */}
        {/* ============================================================ */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              2. Số lượng đặt & Tài chính PO
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">Tự động tính tổng ngân sách</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số lượng đặt (cái) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={soLuong}
                onChange={(e) => setSoLuong(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Đơn giá (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                value={donGia}
                onChange={(e) => setDonGia(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tổng giá trị PO
              </label>
              <input
                type="text"
                readOnly
                value={formatCurrency(tongTien)}
                className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-black text-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tiền cọc xưởng (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                value={tienCoc}
                onChange={(e) => setTienCoc(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-amber-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PHẦN 3: TIẾN ĐỘ LỊCH TRÌNH & KẾ HOẠCH PHÂN PHỐI (6 CHẶNG)    */}
        {/* Yêu cầu 1: Cho luôn vào thông tin đơn hàng                   */}
        {/* Yêu cầu 2: Kế hoạch phân phối đưa vào tiến độ lịch trình     */}
        {/* Yêu cầu 3: Từ ngày chặng này = Đến ngày chặng trước          */}
        {/* Yêu cầu 4: Cho sửa số ngày và sửa chi tiết                   */}
        {/* ============================================================ */}
        <div className="bg-white p-4 rounded-2xl border-2 border-indigo-100 shadow-xs space-y-3.5">
          {/* Header tiến độ & Switcher Bảng vs Lịch */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                3. Tiến độ lịch trình & Kế hoạch phân phối (6 chặng liên hoàn)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ⚡ Tự động nối tiếp: <strong>Từ ngày của quy trình này là Đến ngày của quy trình trước</strong>. Bạn có thể sửa trực tiếp <strong>Số ngày</strong> hoặc <strong>Ngày đến</strong>!
              </p>
            </div>

            {/* View Switcher: Bảng ma trận vs Lịch Gantt */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setTimelineViewMode('TABLE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  timelineViewMode === 'TABLE'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Bảng chi tiết 6 chặng</span>
              </button>

              <button
                type="button"
                onClick={() => setTimelineViewMode('CALENDAR')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  timelineViewMode === 'CALENDAR'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Lịch Timeline Gantt</span>
              </button>
            </div>
          </div>

          {/* 3.1 DẠNG BẢNG MA TRẬN 6 CHẶNG CHI TIẾT */}
          {timelineViewMode === 'TABLE' && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200 select-none">
                    <th className="py-2.5 px-3 min-w-[170px]">Quy trình thực hiện</th>
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[130px]">Từ ngày</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap w-24">Số ngày (Sửa)</th>
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[130px]">Đến ngày (Sửa)</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap w-28">Trạng thái</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Thông tin chi tiết (Cho phép sửa)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Chặng 1: Đặt hàng & Cọc */}
                  <tr className={`hover:bg-slate-50/60 transition ${stage1Done ? 'bg-emerald-50/30' : ''}`}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-extrabold">1</span>
                        <span>1. Đặt hàng & Cọc</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayDatHang}
                        onChange={(e) => handleStart1Change(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                        title="Ngày bắt đầu ký hợp đồng và cọc"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={daysStage1}
                          onChange={(e) => handleDays1Change(e.target.value)}
                          className="w-14 px-1.5 py-1 text-center bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-700 focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-[11px] text-slate-500">ngày</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayCocXong}
                        onChange={(e) => handleEnd1Change(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStage(1)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1 ${
                          stage1Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {stage1Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {stage1Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[11px] whitespace-nowrap">Tiền cọc:</span>
                        <input
                          type="number"
                          min="0"
                          value={tienCoc}
                          onChange={(e) => setTienCoc(e.target.value)}
                          placeholder="Tiền cọc VNĐ..."
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-amber-700"
                        />
                      </div>
                    </td>
                  </tr>

                  {/* Chặng 2: Sản xuất hàng loạt */}
                  <tr className={`hover:bg-slate-50/60 transition ${stage2Done ? 'bg-emerald-50/30' : ''}`}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-extrabold">2</span>
                        <span>2. Sản xuất xưởng</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 inline-block">
                        {formatDateVN(ngayCocXong)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">(= Đến Chặng 1)</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={daysStage2}
                          onChange={(e) => handleDays2Change(e.target.value)}
                          className="w-14 px-1.5 py-1 text-center bg-white border border-purple-200 rounded-lg text-xs font-bold text-purple-700 focus:ring-1 focus:ring-purple-500"
                        />
                        <span className="text-[11px] text-slate-500">ngày</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngaySxXong}
                        onChange={(e) => handleEnd2Change(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-purple-500"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStage(2)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1 ${
                          stage2Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {stage2Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {stage2Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[11px] whitespace-nowrap">Xưởng SX:</span>
                        <input
                          type="text"
                          value={tenNcc}
                          onChange={(e) => setTenNcc(e.target.value)}
                          placeholder="Tên xưởng SX..."
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                        />
                      </div>
                    </td>
                  </tr>

                  {/* Chặng 3: Vận chuyển quốc tế */}
                  <tr className={`hover:bg-slate-50/60 transition ${stage3Done ? 'bg-emerald-50/30' : ''}`}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-extrabold">3</span>
                        <span>3. Vận chuyển QT</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 inline-block">
                        {formatDateVN(ngaySxXong)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">(= Đến Chặng 2)</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={daysStage3}
                          onChange={(e) => handleDays3Change(e.target.value)}
                          className="w-14 px-1.5 py-1 text-center bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[11px] text-slate-500">ngày</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayDenCang}
                        onChange={(e) => handleEnd3Change(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStage(3)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1 ${
                          stage3Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {stage3Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {stage3Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[11px] whitespace-nowrap">Mã vận đơn:</span>
                        <input
                          type="text"
                          value={trackingVanChuyen}
                          onChange={(e) => setTrackingVanChuyen(e.target.value)}
                          placeholder="Mã tracking / Hãng tàu..."
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-blue-700"
                        />
                      </div>
                    </td>
                  </tr>

                  {/* Chặng 4: Hải quan & Cảng */}
                  <tr className={`hover:bg-slate-50/60 transition ${stage4Done ? 'bg-emerald-50/30' : ''}`}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-[10px] font-extrabold">4</span>
                        <span>4. Hải quan & Cảng</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 inline-block">
                        {formatDateVN(ngayDenCang)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">(= Đến Chặng 3)</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={daysStage4}
                          onChange={(e) => handleDays4Change(e.target.value)}
                          className="w-14 px-1.5 py-1 text-center bg-white border border-cyan-200 rounded-lg text-xs font-bold text-cyan-700 focus:ring-1 focus:ring-cyan-500"
                        />
                        <span className="text-[11px] text-slate-500">ngày</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayThongQuan}
                        onChange={(e) => handleEnd4Change(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-cyan-500"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStage(4)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1 ${
                          stage4Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {stage4Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {stage4Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[11px] whitespace-nowrap">Cửa khẩu:</span>
                        <input
                          type="text"
                          value={thongTinHaiQuan}
                          onChange={(e) => setThongTinHaiQuan(e.target.value)}
                          placeholder="Cảng Cát Lái / Hữu Nghị..."
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                        />
                      </div>
                    </td>
                  </tr>

                  {/* Chặng 5: Kho Việt Nam nhận hàng */}
                  <tr className={`hover:bg-slate-50/60 transition ${stage5Done ? 'bg-emerald-50/30' : ''}`}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-extrabold">5</span>
                        <span>5. Kho VN nhận hàng</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 inline-block">
                        {formatDateVN(ngayThongQuan)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">(= Đến Chặng 4)</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={daysStage5}
                          onChange={(e) => handleDays5Change(e.target.value)}
                          className="w-14 px-1.5 py-1 text-center bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700 focus:ring-1 focus:ring-emerald-500"
                        />
                        <span className="text-[11px] text-slate-500">ngày</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayKhoNhan}
                        onChange={(e) => handleEnd5Change(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStage(5)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1 ${
                          stage5Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {stage5Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {stage5Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[11px] whitespace-nowrap">SLG thực nhận:</span>
                        <input
                          type="number"
                          value={slgThucNhan}
                          onChange={(e) => setSlgThucNhan(e.target.value)}
                          placeholder="SLG thực tế nhập kho..."
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-emerald-700"
                        />
                      </div>
                    </td>
                  </tr>

                  {/* Chặng 6: Kế hoạch phân phối & Mở bán hàng (Yêu cầu 2) */}
                  <tr className={`hover:bg-slate-50/60 transition ${stage6Done ? 'bg-amber-50/50' : 'bg-amber-50/20'}`}>
                    <td className="py-2.5 px-3 font-bold text-amber-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-extrabold">6</span>
                        <span>6. Phân phối & Mở bán</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 inline-block">
                        {formatDateVN(ngayKhoNhan)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">(= Đến Chặng 5)</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={daysStage6}
                          onChange={(e) => handleDays6Change(e.target.value)}
                          title="Số ngày trữ kho trước khi mở bán (0 = Bán ngay)"
                          className="w-14 px-1.5 py-1 text-center bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-800 focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-[11px] text-slate-500">ngày</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayKeHoachBan}
                        onChange={(e) => handleEnd6Change(e.target.value)}
                        className="px-2 py-1 bg-white border border-amber-200 rounded-lg text-xs font-bold text-amber-900 focus:ring-1 focus:ring-amber-500"
                        title="Ngày dự kiến mở bán hàng"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStage(6)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1 ${
                          stage6Done ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {stage6Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {stage6Done ? 'Đang bán' : 'Chưa bán'}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={keHoachBanType}
                        onChange={(e) => handlePlanTypeChange(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-800 outline-none"
                      >
                        <option value="Bán ngay">⚡ Bán ngay (Bán ngay khi về kho)</option>
                        <option value="Bán sau (Trữ kho)">📦 Bán sau (Trữ kho / Theo chiến dịch)</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 3.2 DẠNG LỊCH TIMELINE GANTT TRỰC QUAN */}
          {timelineViewMode === 'CALENDAR' && (
            <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800">
                  Sơ đồ thanh thời gian tiến độ chuỗi cung ứng (Gantt waterfall)
                </span>
                <span className="text-xs text-slate-500">
                  Khởi động: <strong>{formatDateVN(ngayDatHang) || 'Chưa có'}</strong> ➔ Mở bán: <strong>{formatDateVN(ngayKeHoachBan) || 'Dự kiến'}</strong>
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {/* Thanh 1 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">1. Đặt hàng & Cọc</span>
                    <span className="text-slate-500">{daysStage1} ngày ({formatDateVN(ngayDatHang)} ➔ {formatDateVN(ngayCocXong)})</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${stage1Done ? 'bg-emerald-500 w-full' : 'bg-blue-400 w-3/4'}`} />
                  </div>
                </div>

                {/* Thanh 2 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">2. Sản xuất hàng loạt</span>
                    <span className="text-slate-500">{daysStage2} ngày ({formatDateVN(ngayCocXong)} ➔ {formatDateVN(ngaySxXong)})</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${stage2Done ? 'bg-emerald-500 w-full' : ngaySxXong ? 'bg-purple-500 w-2/3' : 'bg-slate-200 w-1/4'}`} />
                  </div>
                </div>

                {/* Thanh 3 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">3. Vận chuyển quốc tế</span>
                    <span className="text-slate-500">{daysStage3} ngày ({formatDateVN(ngaySxXong)} ➔ {formatDateVN(ngayDenCang)}) {trackingVanChuyen ? `• VĐ: ${trackingVanChuyen}` : ''}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${stage3Done ? 'bg-emerald-500 w-full' : trackingVanChuyen ? 'bg-indigo-500 w-1/2' : 'bg-slate-200 w-0'}`} />
                  </div>
                </div>

                {/* Thanh 4 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">4. Hải quan & Cảng thông quan</span>
                    <span className="text-slate-500">{daysStage4} ngày ({formatDateVN(ngayDenCang)} ➔ {formatDateVN(ngayThongQuan)})</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${stage4Done ? 'bg-emerald-500 w-full' : ngayThongQuan ? 'bg-cyan-500 w-1/2' : 'bg-slate-200 w-0'}`} />
                  </div>
                </div>

                {/* Thanh 5 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">5. Kho Việt Nam nhận hàng</span>
                    <span className="text-slate-500">{daysStage5} ngày ({formatDateVN(ngayThongQuan)} ➔ {formatDateVN(ngayKhoNhan)}) {slgThucNhan ? `• ${formatNumber(slgThucNhan)} cái` : ''}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${stage5Done ? 'bg-emerald-500 w-full' : ngayKhoNhan ? 'bg-emerald-400 w-3/4' : 'bg-slate-200 w-0'}`} />
                  </div>
                </div>

                {/* Thanh 6 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-amber-900">6. Phân phối & Mở bán ({keHoachBanType})</span>
                    <span className="text-amber-700 font-semibold">{daysStage6} ngày lưu kho • Mở bán: {formatDateVN(ngayKeHoachBan)}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${stage6Done ? 'bg-amber-500 w-full' : 'bg-amber-300 w-1/2'}`} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* PHẦN 4: GHI CHÚ ĐƠN HÀNG                                     */}
        {/* ============================================================ */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Ghi chú chung về đơn hàng PO
          </label>
          <textarea
            rows={2}
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            placeholder="Yêu cầu đóng gói thùng carton, tem phụ tiếng Việt, hướng dẫn sử dụng, bảo hành..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            {manualStatusOverride !== 'Đã hủy' ? (
              <button
                type="button"
                onClick={() => setManualStatusOverride('Đã hủy')}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Đánh dấu Đã hủy PO
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setManualStatusOverride('')}
                className="px-3 py-2 text-blue-600 hover:bg-blue-50 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Khôi phục tự động tính
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu Đơn Hàng PO'}</span>
          </button>
        </div>
      </form>
    </Drawer>
  );
}

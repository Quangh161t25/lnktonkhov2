import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Factory, 
  FileCheck, 
  Warehouse, 
  Calendar, 
  AlertCircle,
  Table, 
  Check, 
  Save, 
  RotateCw, 
  Sparkles, 
  CalendarRange,
  TrendingUp,
  Minimize2,
  Square,
  Maximize2
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { 
  formatDateVN, 
  formatDateInput, 
  formatNumber, 
  formatCurrency, 
  cleanNumber 
} from '../../../utils/formatters';

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

export function extractTiendoMeta(ghiChu) {
  if (!ghiChu) return {};
  const match = (ghiChu || '').match(/\[tiendo:([^\]]+)\]/);
  if (!match) return {};
  const pairs = match[1].split(';');
  const meta = {};
  pairs.forEach(p => {
    const [k, v] = p.split('=');
    if (k && v !== undefined) meta[k.trim()] = v.trim();
  });
  return meta;
}

export function buildGhiChuWithMeta(userGhiChu, meta) {
  const cleanNote = (userGhiChu || '').replace(/\s*\[tiendo:[^\]]+\]\s*/g, '').trim();
  const metaStr = Object.entries(meta)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join(';');
  return metaStr ? (cleanNote ? `${cleanNote} [tiendo:${metaStr}]` : `[tiendo:${metaStr}]`) : cleanNote;
}

export function XnkTrackingModal({ isOpen, onClose, order, onSaved }) {
  const { updateRow, logAuditAction, fetchModule, xnkDonHangData } = useData();

  const [activeView, setActiveView] = useState('TABLE'); // 'TABLE' | 'STEPPER'
  const [trackingSize, setTrackingSize] = useState('medium'); // 'small' | 'medium' | 'full'

  // Editable 6-stage states
  // Chặng 1
  const [ngayDatHang, setNgayDatHang] = useState('');
  const [daysS1, setDaysS1] = useState(1);
  const [ngayCocXong, setNgayCocXong] = useState('');
  const [s1Done, setS1Done] = useState(false);

  // Chặng 2
  const [daysS2, setDaysS2] = useState(15);
  const [ngaySxXong, setNgaySxXong] = useState('');
  const [s2Done, setS2Done] = useState(false);

  // Chặng 3
  const [daysS3, setDaysS3] = useState(7);
  const [ngayDenCang, setNgayDenCang] = useState('');
  const [trackingVanChuyen, setTrackingVanChuyen] = useState('');
  const [s3Done, setS3Done] = useState(false);

  // Chặng 4
  const [daysS4, setDaysS4] = useState(3);
  const [ngayThongQuan, setNgayThongQuan] = useState('');
  const [s4Done, setS4Done] = useState(false);

  // Chặng 5
  const [daysS5, setDaysS5] = useState(2);
  const [ngayKhoNhan, setNgayKhoNhan] = useState('');
  const [slgThucNhan, setSlgThucNhan] = useState('');
  const [s5Done, setS5Done] = useState(false);

  // Chặng 6
  const [keHoachBanType, setKeHoachBanType] = useState('Bán ngay');
  const [daysS6, setDaysS6] = useState(0);
  const [ngayKeHoachBan, setNgayKeHoachBan] = useState('');
  const [s6Done, setS6Done] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (order) {
      const meta = extractTiendoMeta(order.ghi_chu);

      const dtStart1 = order.ngay_dat_hang ? formatDateInput(order.ngay_dat_hang) : formatDateInput(new Date());
      setNgayDatHang(dtStart1);

      const d1 = meta.d1 ? (parseInt(meta.d1, 10) || 1) : 1;
      setDaysS1(d1);
      const end1 = meta.coc ? formatDateInput(meta.coc) : addDays(dtStart1, d1);
      setNgayCocXong(end1);
      setS1Done(meta.s1 !== undefined ? meta.s1 === '1' : Boolean(order.ngay_dat_hang));

      const dtSx = order.ngay_sx_xong ? formatDateInput(order.ngay_sx_xong) : '';
      const d2 = dtSx ? (calcDurationDays(end1, dtSx) || 1) : 15;
      setDaysS2(d2);
      const end2 = dtSx || addDays(end1, d2);
      setNgaySxXong(end2);
      setS2Done(meta.s2 !== undefined ? meta.s2 === '1' : Boolean(dtSx));

      setTrackingVanChuyen(order.tracking_van_chuyen || '');
      const d3 = meta.d3 ? (parseInt(meta.d3, 10) || 7) : 7;
      setDaysS3(d3);
      const dtDenCang = meta.cang 
        ? formatDateInput(meta.cang) 
        : (order.ngay_gui_hang && order.ngay_gui_hang !== dtSx ? formatDateInput(order.ngay_gui_hang) : addDays(end2, d3));
      setNgayDenCang(dtDenCang);
      setS3Done(meta.s3 !== undefined ? meta.s3 === '1' : Boolean(order.tracking_van_chuyen || order.ngay_gui_hang));

      const dtTq = order.ngay_thong_quan ? formatDateInput(order.ngay_thong_quan) : '';
      const d4 = dtTq ? (calcDurationDays(dtDenCang, dtTq) || 1) : 3;
      setDaysS4(d4);
      const end4 = dtTq || addDays(dtDenCang, d4);
      setNgayThongQuan(end4);
      setS4Done(meta.s4 !== undefined ? meta.s4 === '1' : Boolean(dtTq));

      const dtKho = order.ngay_kho_nhan ? formatDateInput(order.ngay_kho_nhan) : '';
      const d5 = dtKho ? (calcDurationDays(end4, dtKho) || 1) : 2;
      setDaysS5(d5);
      const end5 = dtKho || addDays(end4, d5);
      setNgayKhoNhan(end5);
      setSlgThucNhan(order.slg_thuc_nhan !== undefined && order.slg_thuc_nhan !== '' ? order.slg_thuc_nhan : '');
      setS5Done(meta.s5 !== undefined ? meta.s5 === '1' : Boolean(dtKho));

      const rawPlan = order.ke_hoach_ban || 'Bán ngay';
      const isBanSau = rawPlan.includes('Bán sau');
      setKeHoachBanType(isBanSau ? 'Bán sau (Trữ kho)' : 'Bán ngay');
      const matchDate = rawPlan.match(/\[(.*?)\]/);
      let dtBan = '';
      if (matchDate && matchDate[1]) {
        dtBan = formatDateInput(matchDate[1]);
      } else if (isBanSau) {
        dtBan = addDays(end5, 7);
      } else {
        dtBan = end5;
      }
      const d6 = calcDurationDays(end5, dtBan);
      setDaysS6(d6);
      setNgayKeHoachBan(dtBan);
      setS6Done(meta.s6 !== undefined ? meta.s6 === '1' : Boolean(dtKho && new Date() >= new Date(dtBan)));
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  // Tự động tính trạng thái
  const autoStatus = (() => {
    if (order.tinh_trang_cuoi === 'Đã hủy') return 'Đã hủy';
    if (s6Done) return 'Đã hoàn thành';
    if (s5Done || Boolean(ngayKhoNhan && new Date(ngayKhoNhan) <= new Date()) || (slgThucNhan !== '' && Number(slgThucNhan) > 0)) {
      return 'Đã về kho';
    }
    if (s4Done || Boolean(ngayThongQuan && new Date(ngayThongQuan) <= new Date())) {
      return 'Đang thông quan';
    }
    if (s3Done || Boolean(trackingVanChuyen) || Boolean(ngayDenCang && new Date(ngayDenCang) <= new Date())) {
      return 'Đang vận chuyển';
    }
    if (s2Done || Boolean(ngaySxXong && new Date(ngaySxXong) <= new Date())) {
      return 'Đang sản xuất';
    }
    if (s1Done || Boolean(ngayDatHang)) {
      return 'Đã đặt cọc';
    }
    return 'Chờ sản xuất';
  })();

  // Cascading date changes
  const handleStart1Change = (val) => {
    setNgayDatHang(val);
    const end1 = addDays(val, daysS1);
    const end2 = addDays(end1, daysS2);
    const end3 = addDays(end2, daysS3);
    const end4 = addDays(end3, daysS4);
    const end5 = addDays(end4, daysS5);
    const end6 = addDays(end5, daysS6);
    setNgayCocXong(end1);
    setNgaySxXong(end2);
    setNgayDenCang(end3);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  const handleDays1Change = (val) => {
    const d = Math.max(0, parseInt(val, 10) || 0);
    setDaysS1(d);
    const end1 = addDays(ngayDatHang, d);
    const end2 = addDays(end1, daysS2);
    const end3 = addDays(end2, daysS3);
    const end4 = addDays(end3, daysS4);
    const end5 = addDays(end4, daysS5);
    const end6 = addDays(end5, daysS6);
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
    setDaysS1(d);
    const end2 = addDays(val, daysS2);
    const end3 = addDays(end2, daysS3);
    const end4 = addDays(end3, daysS4);
    const end5 = addDays(end4, daysS5);
    const end6 = addDays(end5, daysS6);
    setNgaySxXong(end2);
    setNgayDenCang(end3);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  const handleDays2Change = (val) => {
    const d = Math.max(0, parseInt(val, 10) || 0);
    setDaysS2(d);
    const end2 = addDays(ngayCocXong, d);
    const end3 = addDays(end2, daysS3);
    const end4 = addDays(end3, daysS4);
    const end5 = addDays(end4, daysS5);
    const end6 = addDays(end5, daysS6);
    setNgaySxXong(end2);
    setNgayDenCang(end3);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  const handleEnd2Change = (val) => {
    setNgaySxXong(val);
    const d = calcDurationDays(ngayCocXong, val);
    setDaysS2(d);
    const end3 = addDays(val, daysS3);
    const end4 = addDays(end3, daysS4);
    const end5 = addDays(end4, daysS5);
    const end6 = addDays(end5, daysS6);
    setNgayDenCang(end3);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  const handleDays3Change = (val) => {
    const d = Math.max(0, parseInt(val, 10) || 0);
    setDaysS3(d);
    const end3 = addDays(ngaySxXong, d);
    const end4 = addDays(end3, daysS4);
    const end5 = addDays(end4, daysS5);
    const end6 = addDays(end5, daysS6);
    setNgayDenCang(end3);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  const handleEnd3Change = (val) => {
    setNgayDenCang(val);
    const d = calcDurationDays(ngaySxXong, val);
    setDaysS3(d);
    const end4 = addDays(val, daysS4);
    const end5 = addDays(end4, daysS5);
    const end6 = addDays(end5, daysS6);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  const handleDays4Change = (val) => {
    const d = Math.max(0, parseInt(val, 10) || 0);
    setDaysS4(d);
    const end4 = addDays(ngayDenCang, d);
    const end5 = addDays(end4, daysS5);
    const end6 = addDays(end5, daysS6);
    setNgayThongQuan(end4);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  const handleEnd4Change = (val) => {
    setNgayThongQuan(val);
    const d = calcDurationDays(ngayDenCang, val);
    setDaysS4(d);
    const end5 = addDays(val, daysS5);
    const end6 = addDays(end5, daysS6);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  const handleDays5Change = (val) => {
    const d = Math.max(0, parseInt(val, 10) || 0);
    setDaysS5(d);
    const end5 = addDays(ngayThongQuan, d);
    const end6 = addDays(end5, daysS6);
    setNgayKhoNhan(end5);
    setNgayKeHoachBan(end6);
  };

  const handleEnd5Change = (val) => {
    setNgayKhoNhan(val);
    const d = calcDurationDays(ngayThongQuan, val);
    setDaysS5(d);
    const end6 = addDays(val, daysS6);
    setNgayKeHoachBan(end6);
  };

  const handleDays6Change = (val) => {
    const d = Math.max(0, parseInt(val, 10) || 0);
    setDaysS6(d);
    const end6 = addDays(ngayKhoNhan, d);
    setNgayKeHoachBan(end6);
    setKeHoachBanType(d === 0 ? 'Bán ngay' : 'Bán sau (Trữ kho)');
  };

  const handleEnd6Change = (val) => {
    setNgayKeHoachBan(val);
    const d = calcDurationDays(ngayKhoNhan, val);
    setDaysS6(d);
    setKeHoachBanType(d === 0 ? 'Bán ngay' : 'Bán sau (Trữ kho)');
  };

  const handleToggleS1 = () => {
    const next = !s1Done;
    setS1Done(next);
    if (next && !ngayDatHang) {
      handleStart1Change(formatDateInput(new Date()));
    }
  };

  const handleToggleS2 = () => {
    const next = !s2Done;
    setS2Done(next);
    if (next && !ngaySxXong) {
      handleEnd2Change(addDays(ngayCocXong, daysS2));
    }
  };

  const handleToggleS3 = () => {
    const next = !s3Done;
    setS3Done(next);
    if (next && !ngayDenCang) {
      handleEnd3Change(addDays(ngaySxXong, daysS3));
    }
  };

  const handleToggleS4 = () => {
    const next = !s4Done;
    setS4Done(next);
    if (next && !ngayThongQuan) {
      handleEnd4Change(addDays(ngayDenCang, daysS4));
    }
  };

  const handleToggleS5 = () => {
    const next = !s5Done;
    setS5Done(next);
    if (next) {
      if (!ngayKhoNhan) handleEnd5Change(addDays(ngayThongQuan, daysS5));
      if (!slgThucNhan) setSlgThucNhan(order.so_luong || '');
    }
  };

  const handleToggleS6 = () => {
    const next = !s6Done;
    setS6Done(next);
    if (next && !ngayKeHoachBan) {
      handleEnd6Change(addDays(ngayKhoNhan, daysS6));
    }
  };

  // 6 Stages Definition for Stepper
  const stages = [
    {
      step: 1,
      title: 'Đặt hàng & Cọc',
      desc: 'Ký hợp đồng & thanh toán cọc',
      icon: FileCheck,
      from: ngayDatHang,
      to: ngayCocXong,
      duration: daysS1,
      isDone: s1Done,
      extra: order.tien_coc ? `Cọc: ${formatCurrency(order.tien_coc)}` : null
    },
    {
      step: 2,
      title: 'Sản xuất hàng loạt',
      desc: 'Xưởng gia công theo tiêu chuẩn',
      icon: Factory,
      from: ngayCocXong,
      to: ngaySxXong,
      duration: daysS2,
      isDone: s2Done,
      extra: order.ten_ncc ? `Xưởng: ${order.ten_ncc}` : null
    },
    {
      step: 3,
      title: 'Vận chuyển quốc tế',
      desc: 'Vận tải quốc tế về Việt Nam',
      icon: Truck,
      from: ngaySxXong,
      to: ngayDenCang,
      duration: daysS3,
      isDone: s3Done,
      extra: trackingVanChuyen ? `Vận đơn: ${trackingVanChuyen}` : null
    },
    {
      step: 4,
      title: 'Hải quan & Cảng',
      desc: 'Mở tờ khai & thông quan',
      icon: CheckCircle2,
      from: ngayDenCang,
      to: ngayThongQuan,
      duration: daysS4,
      isDone: s4Done,
      extra: null
    },
    {
      step: 5,
      title: 'Kho Việt Nam nhận hàng',
      desc: 'Kéo hàng về kho & kiểm đếm',
      icon: Warehouse,
      from: ngayThongQuan,
      to: ngayKhoNhan,
      duration: daysS5,
      isDone: s5Done,
      extra: slgThucNhan ? `Thực nhận: ${formatNumber(slgThucNhan)} cái` : null
    },
    {
      step: 6,
      title: 'Phân phối & Mở bán',
      desc: 'Triển khai bán lẻ / lưu kho',
      icon: TrendingUp,
      from: ngayKhoNhan,
      to: ngayKeHoachBan,
      duration: daysS6,
      isDone: s6Done,
      extra: `Hình thức: ${keHoachBanType}`
    }
  ];

  const completedCount = stages.filter(s => s.isDone).length;
  const progressPercent = Math.round((completedCount / stages.length) * 100);

  // Lưu cập nhật tiến độ trực tiếp lên Google Sheets
  const handleSaveProgress = async () => {
    // 1. Resolve targetSheetRow with fallback lookup by order.ma_po
    let targetSheetRow = order._sheetRow;
    if (!targetSheetRow && xnkDonHangData && xnkDonHangData.length > 1) {
      const targetPo = (order.ma_po || '').toString().trim().toUpperCase();
      const foundIdx = xnkDonHangData.slice(1).findIndex(r => (r[0] || '').toString().trim().toUpperCase() === targetPo);
      if (foundIdx !== -1) {
        targetSheetRow = foundIdx + 2;
      }
    }

    if (!targetSheetRow) {
      alert('Không tìm thấy dòng tương ứng của đơn hàng trên Google Sheets để lưu tiến độ.');
      return;
    }

    setIsSaving(true);
    try {
      const finalStatus = autoStatus;
      let formattedKeHoach = keHoachBanType;
      if (ngayKeHoachBan) {
        formattedKeHoach = `${keHoachBanType} [${formatDateVN(ngayKeHoachBan)}]`;
      }

      const meta = {
        s1: s1Done ? 1 : 0,
        s2: s2Done ? 1 : 0,
        s3: s3Done ? 1 : 0,
        s4: s4Done ? 1 : 0,
        s5: s5Done ? 1 : 0,
        s6: s6Done ? 1 : 0,
        d1: daysS1,
        coc: ngayCocXong,
        d3: daysS3,
        cang: ngayDenCang
      };

      const rawRow = (xnkDonHangData && xnkDonHangData[targetSheetRow - 1]) || [];
      const userGhiChu = (order.ghi_chu !== undefined ? order.ghi_chu : rawRow[18]) || '';
      const finalGhiChu = buildGhiChuWithMeta(userGhiChu, meta);

      const rowValues = [
        (order.ma_po || rawRow[0] || '').toString().trim(),
        (order.id_mau || rawRow[1] || '').toString().trim(),
        (order.sku || rawRow[2] || '').toString().trim(),
        (order.ten_sp || rawRow[3] || '').toString().trim(),
        (order.ten_ncc || rawRow[4] || '').toString().trim(),
        cleanNumber(order.so_luong !== undefined ? order.so_luong : rawRow[5]) || 0,
        cleanNumber(order.don_gia !== undefined ? order.don_gia : rawRow[6]) || 0,
        cleanNumber(order.tong_tien !== undefined ? order.tong_tien : rawRow[7]) || 0,
        cleanNumber(order.tien_coc !== undefined ? order.tien_coc : rawRow[8]) || 0,
        ngayDatHang,
        ngaySxXong,
        trackingVanChuyen.trim(),
        ngayDenCang, // Lưu ngày đến cảng / hoàn thành chặng 3 vào cột 12
        ngayThongQuan,
        ngayKhoNhan,
        slgThucNhan !== '' ? cleanNumber(slgThucNhan) : '',
        formattedKeHoach,
        finalStatus,
        finalGhiChu
      ];

      await updateRow('xnk_donhang', targetSheetRow, rowValues);
      if (logAuditAction) {
        await logAuditAction({
          moduleName: 'xnk',
          actionType: 'SỬA',
          orderId: order.ma_po,
          targetObject: order.ten_sp,
          summary: `Cập nhật tiến độ 6 chặng đơn PO ${order.ma_po}: ${finalStatus}`
        });
      }
      await new Promise(r => setTimeout(r, 400));
      await fetchModule('xnk_donhang', true);
      if (onSaved) await onSaved();
      alert('Đã cập nhật tiến độ đơn hàng thành công!');
      onClose();
    } catch (err) {
      console.error('Lỗi lưu tiến độ:', err);
      alert('Không thể cập nhật tiến độ. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  let resolvedWidthClass = 'max-w-4xl';
  let resolvedHeightClass = 'max-h-[92vh]';
  if (trackingSize === 'small') {
    resolvedWidthClass = 'max-w-xl';
    resolvedHeightClass = 'max-h-[85vh]';
  } else if (trackingSize === 'full') {
    resolvedWidthClass = 'max-w-[96vw] w-[96vw]';
    resolvedHeightClass = 'h-[95vh] max-h-[95vh]';
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      <div className={`relative bg-white rounded-3xl shadow-2xl ${resolvedWidthClass} ${resolvedHeightClass} w-full p-5 sm:p-6 overflow-hidden z-10 border border-slate-100 flex flex-col transition-all duration-300`}>
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-700">
                PO: {order.ma_po}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                {order.ke_hoach_ban || 'Bán ngay'}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-500" />
                {autoStatus}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2">
              {order.ten_sp}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              SKU: <strong className="text-slate-700">{order.sku}</strong> • NCC: <strong className="text-slate-700">{order.ten_ncc || 'Chưa rõ'}</strong> • Đặt: <strong className="text-blue-700">{formatNumber(order.so_luong)} cái</strong> • Tổng: <strong className="text-emerald-700">{formatCurrency(order.tong_tien)}</strong>
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 3 Size Control Buttons: Nhỏ lại - Vừa - Mở rộng */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-200 shadow-2xs mr-1">
              <button
                type="button"
                onClick={() => setTrackingSize('small')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  trackingSize === 'small'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Nhỏ lại (Giao diện nhỏ gọn)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nhỏ</span>
              </button>

              <button
                type="button"
                onClick={() => setTrackingSize('medium')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  trackingSize === 'medium'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vừa (Kích thước tiêu chuẩn)"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vừa</span>
              </button>

              <button
                type="button"
                onClick={() => setTrackingSize('full')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  trackingSize === 'full'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Mở rộng (Toàn màn hình)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mở rộng</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition cursor-pointer"
              title="Đóng / Hủy"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher: Bảng vs Stepper */}
        <div className="my-3 flex items-center justify-between p-2 bg-slate-50 rounded-2xl border border-slate-200 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveView('TABLE')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeView === 'TABLE'
                  ? 'bg-white text-blue-700 border border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Bảng ma trận 6 chặng (Nhập & Lưu)</span>
            </button>

            <button
              onClick={() => setActiveView('STEPPER')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeView === 'STEPPER'
                  ? 'bg-white text-indigo-700 border border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Stepper Lịch trình trực quan</span>
            </button>
          </div>

          <div className="text-xs font-bold text-slate-700">
            Tiến độ: <span className="text-blue-600">{completedCount}/6 chặng ({progressPercent}%)</span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* VIEW 1: DẠNG BẢNG MA TRẬN 6 CHẶNG */}
          {activeView === 'TABLE' && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                    <th className="py-2.5 px-3">Quy trình</th>
                    <th className="py-2.5 px-3">Từ ngày</th>
                    <th className="py-2.5 px-3 text-center">Số ngày (Sửa)</th>
                    <th className="py-2.5 px-3">Đến ngày (Sửa)</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3">Chi tiết & Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Chặng 1 */}
                  <tr className={s1Done ? 'bg-emerald-50/30' : ''}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      1. Đặt hàng & Cọc
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayDatHang}
                        onChange={(e) => handleStart1Change(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={daysS1}
                          onChange={(e) => handleDays1Change(e.target.value)}
                          className="w-12 px-1 py-1 text-center bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-700"
                        />
                        <span className="text-slate-400">ngày</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayCocXong}
                        onChange={(e) => handleEnd1Change(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={handleToggleS1}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                          s1Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s1Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {s1Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      Cọc: <strong className="text-amber-700">{formatCurrency(order.tien_coc)}</strong>
                    </td>
                  </tr>

                  {/* Chặng 2 */}
                  <tr className={s2Done ? 'bg-emerald-50/30' : ''}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      2. Sản xuất hàng loạt
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                      {formatDateVN(ngayCocXong)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={daysS2}
                          onChange={(e) => handleDays2Change(e.target.value)}
                          className="w-12 px-1 py-1 text-center bg-white border border-purple-200 rounded-lg text-xs font-bold text-purple-700"
                        />
                        <span className="text-slate-400">ngày</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngaySxXong}
                        onChange={(e) => handleEnd2Change(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={handleToggleS2}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                          s2Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s2Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {s2Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      Xưởng: {order.ten_ncc || '-'}
                    </td>
                  </tr>

                  {/* Chặng 3 */}
                  <tr className={s3Done ? 'bg-emerald-50/30' : ''}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      3. Vận chuyển quốc tế
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                      {formatDateVN(ngaySxXong)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={daysS3}
                          onChange={(e) => handleDays3Change(e.target.value)}
                          className="w-12 px-1 py-1 text-center bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700"
                        />
                        <span className="text-slate-400">ngày</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayDenCang}
                        onChange={(e) => handleEnd3Change(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={handleToggleS3}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                          s3Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s3Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {s3Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={trackingVanChuyen}
                        onChange={(e) => setTrackingVanChuyen(e.target.value)}
                        placeholder="Mã tracking / vận đơn..."
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                  </tr>

                  {/* Chặng 4 */}
                  <tr className={s4Done ? 'bg-emerald-50/30' : ''}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      4. Hải quan & Cảng
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                      {formatDateVN(ngayDenCang)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={daysS4}
                          onChange={(e) => handleDays4Change(e.target.value)}
                          className="w-12 px-1 py-1 text-center bg-white border border-cyan-200 rounded-lg text-xs font-bold text-cyan-700"
                        />
                        <span className="text-slate-400">ngày</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayThongQuan}
                        onChange={(e) => handleEnd4Change(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={handleToggleS4}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                          s4Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s4Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {s4Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      Cảng Cát Lái / Hữu Nghị
                    </td>
                  </tr>

                  {/* Chặng 5 */}
                  <tr className={s5Done ? 'bg-emerald-50/30' : ''}>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      5. Kho VN nhận hàng
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                      {formatDateVN(ngayThongQuan)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={daysS5}
                          onChange={(e) => handleDays5Change(e.target.value)}
                          className="w-12 px-1 py-1 text-center bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700"
                        />
                        <span className="text-slate-400">ngày</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayKhoNhan}
                        onChange={(e) => handleEnd5Change(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={handleToggleS5}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                          s5Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s5Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {s5Done ? 'Đã xong' : 'Chưa xong'}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={slgThucNhan}
                        onChange={(e) => setSlgThucNhan(e.target.value)}
                        placeholder="SLG thực tế nhập kho..."
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700"
                      />
                    </td>
                  </tr>

                  {/* Chặng 6 */}
                  <tr className={s6Done ? 'bg-amber-50/40' : ''}>
                    <td className="py-2.5 px-3 font-bold text-amber-900 whitespace-nowrap">
                      6. Phân phối & Mở bán
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                      {formatDateVN(ngayKhoNhan)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={daysS6}
                          onChange={(e) => handleDays6Change(e.target.value)}
                          className="w-12 px-1 py-1 text-center bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-800"
                        />
                        <span className="text-slate-400">ngày</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={ngayKeHoachBan}
                        onChange={(e) => handleEnd6Change(e.target.value)}
                        className="px-2 py-1 bg-white border border-amber-200 rounded-lg text-xs font-bold text-amber-900"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={handleToggleS6}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                          s6Done ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s6Done ? <Check className="w-3.5 h-3.5" /> : null}
                        {s6Done ? 'Đang bán' : 'Chưa bán'}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={keHoachBanType}
                        onChange={(e) => {
                          const t = e.target.value;
                          setKeHoachBanType(t);
                          if (t === 'Bán ngay') {
                            setDaysS6(0);
                            setNgayKeHoachBan(ngayKhoNhan);
                          } else {
                            const d = daysS6 > 0 ? daysS6 : 7;
                            setDaysS6(d);
                            setNgayKeHoachBan(addDays(ngayKhoNhan, d));
                          }
                        }}
                        className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-800"
                      >
                        <option value="Bán ngay">⚡ Bán ngay</option>
                        <option value="Bán sau (Trữ kho)">📦 Bán sau (Trữ kho)</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 2: DẠNG STEPPER & TIMELINE */}
          {activeView === 'STEPPER' && (
            <div className="space-y-4">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {stages.map((st) => {
                  const Icon = st.icon;
                  return (
                    <div key={st.step} className="relative flex items-start gap-4">
                      {/* Step Circle */}
                      <div className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition ${
                        st.isDone
                          ? 'bg-emerald-500 border-white text-white shadow-sm ring-2 ring-emerald-200'
                          : 'bg-white border-slate-300 text-slate-400'
                      }`}>
                        {st.isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.step}
                      </div>

                      {/* Content Card */}
                      <div className={`flex-1 p-3.5 rounded-2xl border transition ${
                        st.isDone 
                          ? 'bg-emerald-50/40 border-emerald-100 text-slate-800' 
                          : 'bg-slate-50/50 border-slate-100 text-slate-500'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${st.isDone ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span className={`text-sm font-bold ${st.isDone ? 'text-slate-800' : 'text-slate-600'}`}>
                              Chặng {st.step}: {st.title} ({st.duration} ngày)
                            </span>
                          </div>
                          {st.to ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {formatDateVN(st.from)} ➔ {formatDateVN(st.to)}
                            </span>
                          ) : (
                            <span className="text-xs italic text-slate-400">Chưa có ngày</span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-1">{st.desc}</p>

                        {st.extra && (
                          <div className="mt-2 text-xs font-medium text-blue-700 bg-blue-50/60 px-2.5 py-1 rounded-lg inline-block">
                            {st.extra}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveProgress}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu cập nhật tiến độ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

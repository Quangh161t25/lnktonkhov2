import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { buildPoLinesMap, getPoLines, summarizePoLines } from './xnkPoLines';
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

// Tạo 1 dòng SP trống cho PO
let poLineSeq = 0;
function newPoLine(data = {}) {
  poLineSeq += 1;
  return {
    uid: `ln-${Date.now()}-${poLineSeq}`,
    id_y_tuong: '',
    id_mau: '',
    sku: '',
    ten_sp: '',
    so_luong: 100,
    don_gia: 0,
    slg_thuc_nhan: '',
    ghi_chu: '',
    ...data
  };
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
    appendRows,
    updateRow,  
    logAuditAction, 
    xnkYtuongData, 
    xnkMauData,
    xnkDonHangData,
    xnkDonHangCtData,
    productData,
    deleteRow,
    fetchModule
  } = useData();

  // Đảm bảo dữ liệu danh sách sản phẩm DS_SP và chi tiết SP của PO được tải
  useEffect(() => {
    if (isOpen) {
      fetchModule('xnk_donhang_ct');
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
  const [tenNcc, setTenNcc] = useState('');
  const [tienCoc, setTienCoc] = useState(0);

  // Danh sách sản phẩm trong PO (1 PO - nhiều SP, mỗi SP liên kết Ý tưởng / Mẫu thử riêng)
  const [lines, setLines] = useState(() => [newPoLine()]);

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

  // Tổng hợp từ các dòng SP
  const poSummary = useMemo(() => summarizePoLines(lines), [lines]);
  const tongTien = poSummary.tong_tien;
  const tongSoLuong = poSummary.so_luong;
  const slgThucNhan = poSummary.slg_thuc_nhan;

  const updateLine = (uid, patch) => {
    setLines(prev => prev.map(l => (l.uid === uid ? { ...l, ...patch } : l)));
  };
  const addLine = () => setLines(prev => [...prev, newPoLine()]);
  const removeLine = (uid) => {
    setLines(prev => (prev.length <= 1 ? [newPoLine()] : prev.filter(l => l.uid !== uid)));
  };

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

  // 3. Mẫu thử được gợi ý theo Ý tưởng của từng dòng SP
  const getSuggestedSamples = (ideaId) => (
    ideaId ? approvedSamples.filter(s => s.id_y_tuong === ideaId) : approvedSamples
  );

  // 4. Dòng chi tiết SP đã lưu của các PO
  const poLinesMap = useMemo(() => buildPoLinesMap(xnkDonHangCtData), [xnkDonHangCtData]);

  // Mở sửa PO trước khi chi tiết SP tải xong -> khi dữ liệu về thì nạp lại các dòng SP thật
  const linesLoadedFromSheetRef = useRef(false);
  useEffect(() => {
    if (!isOpen || !editItem || linesLoadedFromSheetRef.current) return;
    const saved = poLinesMap[String(editItem.ma_po || '').trim().toUpperCase()];
    if (!saved || saved.length === 0) return;
    linesLoadedFromSheetRef.current = true;
    setLines(saved.map(toFormLine));
  }, [isOpen, editItem, poLinesMap]);

  // Tìm ý tưởng của 1 dòng SP (qua mẫu thử, rồi SKU / Tên SP)
  const resolveIdeaId = (line) => {
    if (line.id_y_tuong) return line.id_y_tuong;
    const sample = approvedSamples.find(s => s.id_mau === line.id_mau);
    if (sample?.id_y_tuong) return sample.id_y_tuong;
    const idea = ytuongOptions.find(y => (line.sku && y.sku_du_kien === line.sku) || (line.ten_sp && y.ten_sp === line.ten_sp));
    return idea?.id_y_tuong || '';
  };

  // Chuyển dòng SP đã lưu thành dòng trên form
  const toFormLine = (l) => newPoLine({
    id_y_tuong: resolveIdeaId(l),
    id_mau: l.id_mau,
    sku: l.sku,
    ten_sp: l.ten_sp,
    so_luong: l.so_luong,
    don_gia: l.don_gia,
    slg_thuc_nhan: l.slg_thuc_nhan,
    ghi_chu: l.ghi_chu
  });

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
      setTenNcc(editItem.ten_ncc || '');
      linesLoadedFromSheetRef.current = !!poLinesMap[String(editItem.ma_po || '').trim().toUpperCase()];
      setLines(getPoLines(editItem, poLinesMap).map(toFormLine));
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

      setManualStatusOverride(editItem.tinh_trang_cuoi === 'Đã hủy' ? 'Đã hủy' : '');
      setGhiChu(stripTiendoMeta(editItem.ghi_chu));
    } else {
      // Đơn mới
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setMaPo(`PO-${todayStr}-${randomSuffix}`);
      
      if (initialSample) {
        setLines([newPoLine({
          id_y_tuong: initialSample.id_y_tuong || '',
          id_mau: initialSample.id_mau || '',
          sku: initialSample.sku || initialSample.sku_du_kien || '',
          ten_sp: initialSample.ten_sp || '',
          don_gia: cleanNumber(initialSample.gia_mau) || 0
        })]);
        setTenNcc(initialSample.ten_ncc || '');
      } else {
        setLines([newPoLine()]);
        setTenNcc('');
      }

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

  // Luồng 1: Chọn Ý tưởng cho 1 dòng -> Tự điền SKU, Tên SP và gợi ý Mẫu thử
  const handleSelectIdea = (uid, selectedIdeaId) => {
    const line = lines.find(l => l.uid === uid);
    if (!line) return;
    const patch = { id_y_tuong: selectedIdeaId };
    if (!selectedIdeaId) {
      updateLine(uid, patch);
      return;
    }
    const idea = ytuongOptions.find(y => y.id_y_tuong === selectedIdeaId);
    if (idea) {
      if (idea.sku_du_kien) patch.sku = idea.sku_du_kien;
      if (idea.ten_sp) patch.ten_sp = idea.ten_sp;
    }

    // Mẫu đang chọn không thuộc ý tưởng mới -> bỏ chọn
    const matchingSamples = approvedSamples.filter(s => s.id_y_tuong === selectedIdeaId);
    if (line.id_mau && !matchingSamples.some(s => s.id_mau === line.id_mau)) {
      patch.id_mau = '';
    }
    if (matchingSamples.length === 1) {
      const singleSample = matchingSamples[0];
      patch.id_mau = singleSample.id_mau;
      if (singleSample.ten_ncc && !tenNcc) setTenNcc(singleSample.ten_ncc);
      if (singleSample.gia_mau && !cleanNumber(line.don_gia)) patch.don_gia = singleSample.gia_mau;
    }
    updateLine(uid, patch);
  };

  // Luồng 2: Chọn Mẫu thử cho 1 dòng -> Tự động liên kết luôn Ý tưởng
  const handleSelectSample = (uid, sampleId) => {
    const line = lines.find(l => l.uid === uid);
    if (!line) return;
    const patch = { id_mau: sampleId };
    const foundSample = approvedSamples.find(s => s.id_mau === sampleId);
    if (foundSample) {
      if (foundSample.ten_ncc && !tenNcc) setTenNcc(foundSample.ten_ncc);
      if (foundSample.gia_mau && !cleanNumber(line.don_gia)) patch.don_gia = foundSample.gia_mau;

      if (foundSample.id_y_tuong) {
        patch.id_y_tuong = foundSample.id_y_tuong;
        const relatedIdea = ytuongOptions.find(y => y.id_y_tuong === foundSample.id_y_tuong);
        if (relatedIdea) {
          if (relatedIdea.sku_du_kien) patch.sku = relatedIdea.sku_du_kien;
          if (relatedIdea.ten_sp) patch.ten_sp = relatedIdea.ten_sp;
        }
      }
    }
    updateLine(uid, patch);
  };

  // Chọn SKU từ danh mục sản phẩm cho 1 dòng
  const handleSelectProduct = (uid, prod) => {
    const line = lines.find(l => l.uid === uid);
    if (!line || !prod) return;
    const patch = { sku: prod.id };
    if (prod.name) patch.ten_sp = prod.name;
    if (prod.price && !cleanNumber(line.don_gia)) patch.don_gia = prod.price;
    updateLine(uid, patch);
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
        setLines(prev => prev.map(l => (
          l.slg_thuc_nhan === '' || l.slg_thuc_nhan === undefined ? { ...l, slg_thuc_nhan: l.so_luong || '' } : l
        )));
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
    const filledLines = lines.filter(l => String(l.sku || '').trim() || String(l.ten_sp || '').trim() || l.id_mau || l.id_y_tuong);
    if (filledLines.length === 0) {
      setErrorMsg('Vui lòng thêm ít nhất 1 sản phẩm vào đơn PO!');
      return;
    }
    const badIdx = filledLines.findIndex(l => !String(l.ten_sp || '').trim() || !(cleanNumber(l.so_luong) > 0));
    if (badIdx !== -1) {
      setErrorMsg(`Sản phẩm dòng ${badIdx + 1}: cần có Tên sản phẩm và Số lượng lớn hơn 0!`);
      return;
    }
    const summary = summarizePoLines(filledLines);
    const tenSp = summary.ten_sp;

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
      // Các cột SP ở dòng PO là bản tóm tắt; chi tiết từng SP nằm ở sheet XNK_DON_HANG_CT
      const rowValues = [
        maPo.trim(),
        summary.id_mau,
        summary.sku,
        tenSp,
        tenNcc.trim(),
        summary.so_luong,
        summary.don_gia,
        summary.tong_tien,
        cleanNumber(tienCoc),
        ngayDatHang,
        ngaySxXong,
        trackingVanChuyen.trim(),
        ngayDenCang, // Cột 12: Ngày đến cảng / hoàn thành chặng 3
        ngayThongQuan,
        ngayKhoNhan,
        summary.slg_thuc_nhan,
        formattedKeHoach,
        finalStatus,
        finalGhiChu
      ];

      // 2. Ghi chi tiết SP trước (nếu lỗi thì chưa đụng tới dòng PO)
      // ['ma_po', 'stt', 'id_y_tuong', 'id_mau', 'sku', 'ten_sp', 'so_luong', 'don_gia', 'thanh_tien', 'slg_thuc_nhan', 'ghi_chu']
      const lineRows = filledLines.map((l, idx) => {
        const sl = cleanNumber(l.so_luong) || 0;
        const dg = cleanNumber(l.don_gia) || 0;
        return [
          maPo.trim(),
          idx + 1,
          String(l.id_y_tuong || '').trim(),
          String(l.id_mau || '').trim(),
          String(l.sku || '').trim(),
          String(l.ten_sp || '').trim(),
          sl,
          dg,
          sl * dg,
          l.slg_thuc_nhan !== '' && l.slg_thuc_nhan !== undefined ? cleanNumber(l.slg_thuc_nhan) : '',
          String(l.ghi_chu || '').trim()
        ];
      });
      const oldPoCode = String((editItem && editItem.ma_po) || maPo).trim().toUpperCase();
      const oldLineRows = (poLinesMap[oldPoCode] || []).map(l => l._sheetRow).filter(Boolean);
      try {
        for (let i = 0; i < lineRows.length && i < oldLineRows.length; i++) {
          await updateRow('xnk_donhang_ct', oldLineRows[i], lineRows[i]);
        }
        for (let i = lineRows.length; i < oldLineRows.length; i++) {
          await deleteRow('xnk_donhang_ct', oldLineRows[i]);
        }
        if (lineRows.length > oldLineRows.length) {
          await appendRows('xnk_donhang_ct', lineRows.slice(oldLineRows.length));
        }
      } catch (lineErr) {
        console.error('Lỗi lưu chi tiết SP của PO:', lineErr);
        setErrorMsg('Không lưu được danh sách sản phẩm. Kiểm tra trên Google Sheets đã có trang tính "XNK_DON_HANG_CT" (dòng 1 là tiêu đề) chưa!');
        return;
      }

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
            summary: `Lên đơn PO mới ${maPo}: ${tenSp} - ${filledLines.length} SP, SLG: ${summary.so_luong} (${finalStatus})`
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
            <span className="text-[11px] text-slate-400">Mỗi dòng SP chọn ý tưởng hoặc mẫu thử đã duyệt</span>
          </div>

          {/* Nhà cung cấp / Xưởng (chung cho cả PO) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  🏭 Nhà cung cấp / Xưởng sản xuất
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
            <div className="flex items-end">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                1 PO đặt tại 1 xưởng. Mỗi dòng bên dưới là 1 sản phẩm, có thể liên kết Ý tưởng và Mẫu thử đã duyệt riêng.
              </p>
            </div>
          </div>

          {/* Danh sách sản phẩm trong PO */}
          <div className="space-y-2.5">
            {lines.map((line, idx) => {
              const lineSamples = getSuggestedSamples(line.id_y_tuong);
              const lineSample = line.id_mau ? approvedSamples.find(s => s.id_mau === line.id_mau) : null;
              const nccMismatch = lineSample && lineSample.ten_ncc && tenNcc.trim() &&
                lineSample.ten_ncc.trim().toLowerCase() !== tenNcc.trim().toLowerCase();
              const thanhTien = (cleanNumber(line.so_luong) || 0) * (cleanNumber(line.don_gia) || 0);
              return (
                <div key={line.uid} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-blue-700 uppercase tracking-wider">
                      Sản phẩm #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(line.uid)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title={lines.length > 1 ? 'Xóa sản phẩm này' : 'Xóa trắng dòng'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Hàng 1: Ý tưởng | Mẫu thử | SKU | Tên SP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">💡 Ý tưởng</label>
                      <SuggestInput
                        value={line.id_y_tuong}
                        onSelect={(item) => handleSelectIdea(line.uid, item ? item.key : '')}
                        items={ytuongOptions.map(y => ({
                          key: y.id_y_tuong,
                          title: `[${y.sku_du_kien || y.id_y_tuong}] ${y.ten_sp}`,
                          subtitle: y.id_y_tuong,
                          extra: y.trang_thai
                        }))}
                        headerLabel="Gợi ý ý tưởng"
                        placeholder="Gõ tên SP, SKU, mã ý tưởng..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        📦 Mẫu thử đạt {line.id_y_tuong && <span className="text-emerald-600">({lineSamples.length})</span>}
                      </label>
                      <SuggestInput
                        value={line.id_mau}
                        onSelect={(item) => handleSelectSample(line.uid, item ? item.key : '')}
                        items={lineSamples.map(s => ({
                          key: s.id_mau,
                          title: `[${s.id_mau}] NCC: ${s.ten_ncc}`,
                          subtitle: `Ý tưởng: ${s.id_y_tuong || '—'} • Xếp hạng: ${s.danh_gia_xep_hang || 'Đạt'}`,
                          extra: s.gia_mau ? formatCurrency(s.gia_mau) : ''
                        }))}
                        headerLabel={line.id_y_tuong ? 'Mẫu đạt của ý tưởng này' : 'Gợi ý mẫu thử đạt'}
                        placeholder={line.id_y_tuong && lineSamples.length === 0 ? 'Ý tưởng chưa có mẫu đạt' : 'Gõ mã mẫu, tên NCC...'}
                        className="w-full px-3 py-2 bg-emerald-50/40 border border-emerald-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        SKU sản phẩm
                      </label>
                      <ProductSearchCell
                        value={line.sku}
                        onChange={(val) => updateLine(line.uid, { sku: val })}
                        onSelectProduct={(prod) => handleSelectProduct(line.uid, prod)}
                        productList={productList}
                        placeholder="Gõ SKU từ DS sản phẩm..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-blue-800 uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Tên sản phẩm <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={line.ten_sp}
                        onChange={(e) => updateLine(line.uid, { ten_sp: e.target.value })}
                        placeholder="VD: Nồi chiên không dầu..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Hàng 2: SLG | Đơn giá | Thành tiền | SL nhận thực */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Số lượng đặt <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={line.so_luong}
                        onChange={(e) => updateLine(line.uid, { so_luong: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Đơn giá (VNĐ)</label>
                      <input
                        type="number"
                        min="0"
                        value={line.don_gia}
                        onChange={(e) => updateLine(line.uid, { don_gia: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Thành tiền</label>
                      <div className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-black text-emerald-700">
                        {formatCurrency(thanhTien)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">SL nhận thực tế</label>
                      <input
                        type="number"
                        min="0"
                        value={line.slg_thuc_nhan}
                        onChange={(e) => updateLine(line.uid, { slg_thuc_nhan: e.target.value })}
                        placeholder="Khi kho nhận hàng"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {nccMismatch && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Mẫu {lineSample.id_mau} thuộc NCC "{lineSample.ten_ncc}", khác NCC của PO ("{tenNcc}").
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addLine}
              className="w-full py-2 rounded-xl border-2 border-dashed border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 hover:border-blue-400 transition inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Thêm sản phẩm vào PO
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PHẦN 2: TÀI CHÍNH & NGÂN SÁCH ĐƠN HÀNG                        */}
        {/* ============================================================ */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              2. Tổng hợp & Tài chính PO
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">Tự động cộng từ các sản phẩm</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Số sản phẩm</label>
              <div className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                {lines.filter(l => String(l.ten_sp || '').trim() || String(l.sku || '').trim()).length} SP
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tổng số lượng (cái)</label>
              <div className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                {formatNumber(tongSoLuong)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tổng giá trị PO</label>
              <div className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-black text-emerald-700">
                {formatCurrency(tongTien)}
              </div>
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
                        {lines.length === 1 ? (
                          <input
                            type="number"
                            value={lines[0].slg_thuc_nhan}
                            onChange={(e) => updateLine(lines[0].uid, { slg_thuc_nhan: e.target.value })}
                            placeholder="SLG thực tế nhập kho..."
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-emerald-700"
                          />
                        ) : (
                          <span className="text-xs font-black text-emerald-700 whitespace-nowrap" title="Nhập theo từng SP ở phần 1">
                            {slgThucNhan !== '' ? formatNumber(slgThucNhan) : '—'} / {formatNumber(tongSoLuong)}
                            <span className="ml-1 text-[10px] font-semibold text-slate-400">(nhập theo từng SP)</span>
                          </span>
                        )}
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

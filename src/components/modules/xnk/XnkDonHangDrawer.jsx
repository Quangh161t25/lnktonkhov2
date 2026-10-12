import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';
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
  DollarSign, 
  Layers,
  Sparkles,
  CheckCircle2,
  Table,
  CalendarRange,
  ArrowRight,
  Clock,
  Lightbulb,
  Package,
  Building2,
  Info,
  Check
} from 'lucide-react';

const KE_HOACH_BAN_OPTIONS = [
  'Bán ngay',
  'Bán sau (Trữ kho)'
];

const TINH_TRANG_CUOI_OPTIONS = [
  'Đã đặt cọc',
  'Đang sản xuất',
  'Đang vận chuyển',
  'Đang thông quan',
  'Đã về kho',
  'Đã hoàn thành',
  'Đã hủy'
];

function calcDurationDays(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const diffTime = end.getTime() - start.getTime();
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
    xnkMauData 
  } = useData();

  // Active Tab in Drawer: 'INFO' (Thông tin PO) vs 'TIMELINE' (Chi tiết 5 chặng)
  const [activeTab, setActiveTab] = useState('INFO');

  // View Mode in Tab 2: 'TABLE' (Bảng ma trận) vs 'CALENDAR' (Dạng Lịch/Gantt)
  const [timelineViewMode, setTimelineViewMode] = useState('TABLE');

  // Form Fields
  const [maPo, setMaPo] = useState('');
  const [idYtuong, setIdYtuong] = useState('');
  const [idMau, setIdMau] = useState('');
  const [sku, setSku] = useState('');
  const [tenSp, setTenSp] = useState('');
  const [tenNcc, setTenNcc] = useState('');
  const [soLuong, setSoLuong] = useState(100);
  const [donGia, setDonGia] = useState(0);
  const [tienCoc, setTienCoc] = useState(0);
  
  // 5 Stages Dates & Completion Status
  // Chặng 1: Đặt cọc
  const [ngayDatHang, setNgayDatHang] = useState(formatDateInput(new Date()));
  const [ngayCocXong, setNgayCocXong] = useState(formatDateInput(new Date()));
  const [stage1Done, setStage1Done] = useState(true);

  // Chặng 2: Sản xuất
  const [ngayBatDauSx, setNgayBatDauSx] = useState('');
  const [ngaySxXong, setNgaySxXong] = useState('');
  const [stage2Done, setStage2Done] = useState(false);

  // Chặng 3: Vận chuyển QT
  const [ngayGuiHang, setNgayGuiHang] = useState('');
  const [ngayDenCang, setNgayDenCang] = useState('');
  const [trackingVanChuyen, setTrackingVanChuyen] = useState('');
  const [stage3Done, setStage3Done] = useState(false);

  // Chặng 4: Hải quan
  const [ngayMoToKhai, setNgayMoToKhai] = useState('');
  const [ngayThongQuan, setNgayThongQuan] = useState('');
  const [stage4Done, setStage4Done] = useState(false);

  // Chặng 5: Kho nhận
  const [ngayKeoHangVeKho, setNgayKeoHangVeKho] = useState('');
  const [ngayKhoNhan, setNgayKhoNhan] = useState('');
  const [slgThucNhan, setSlgThucNhan] = useState('');
  const [stage5Done, setStage5Done] = useState(false);

  // Kế hoạch bán hàng & Ngày dự kiến mở bán (Yêu cầu 5)
  const [keHoachBanType, setKeHoachBanType] = useState('Bán ngay');
  const [ngayKeHoachBan, setNgayKeHoachBan] = useState('');

  // Tình trạng sau cùng & Ghi chú
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

  // 2. Parsed Mẫu thử ĐÃ DUYỆT ĐẠT từ xnkMauData (Yêu cầu 2: chỉ hiển thị mẫu đã duyệt)
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
      // Chỉ lấy mẫu đã được duyệt hoặc xếp hạng Đạt
      const isApproved = m.danh_gia_xep_hang === 'Đạt' || 
                         m.trang_thai_duyet === 'Đã duyệt (Cho phép đặt thật)' || 
                         m.trang_thai_duyet === 'Đồng ý';
      return isApproved;
    });
  }, [xnkMauData]);

  // 3. Mẫu thử được gợi ý theo Ý tưởng đã chọn (Yêu cầu 1)
  const suggestedSamples = useMemo(() => {
    if (!idYtuong) return approvedSamples;
    return approvedSamples.filter(s => s.id_y_tuong === idYtuong);
  }, [idYtuong, approvedSamples]);

  // Tự động tính toán Trạng thái sau cùng (Yêu cầu 6)
  const autoComputedStatus = useMemo(() => {
    if (manualStatusOverride === 'Đã hủy') return 'Đã hủy';
    if (stage5Done || Boolean(ngayKhoNhan) || (slgThucNhan !== '' && Number(slgThucNhan) > 0)) {
      return 'Đã về kho';
    }
    if (stage4Done || Boolean(ngayThongQuan)) {
      return 'Đang thông quan';
    }
    if (stage3Done || Boolean(ngayGuiHang) || Boolean(trackingVanChuyen)) {
      return 'Đang vận chuyển';
    }
    if (stage2Done || Boolean(ngaySxXong) || Boolean(ngayBatDauSx)) {
      return 'Đang sản xuất';
    }
    if (stage1Done || Boolean(ngayDatHang)) {
      return 'Đã đặt cọc';
    }
    return 'Chờ sản xuất';
  }, [stage5Done, stage4Done, stage3Done, stage2Done, stage1Done, ngayKhoNhan, slgThucNhan, ngayThongQuan, ngayGuiHang, trackingVanChuyen, ngaySxXong, ngayBatDauSx, ngayDatHang, manualStatusOverride]);

  // Khởi tạo và reset dữ liệu form
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
      
      // Ngày chặng
      const dtDatHang = editItem.ngay_dat_hang ? formatDateInput(editItem.ngay_dat_hang) : formatDateInput(new Date());
      setNgayDatHang(dtDatHang);
      setNgayCocXong(dtDatHang);
      setStage1Done(Boolean(dtDatHang));

      const dtSx = editItem.ngay_sx_xong ? formatDateInput(editItem.ngay_sx_xong) : '';
      setNgaySxXong(dtSx);
      setNgayBatDauSx(dtDatHang);
      setStage2Done(Boolean(dtSx));

      const dtGui = editItem.ngay_gui_hang ? formatDateInput(editItem.ngay_gui_hang) : '';
      setNgayGuiHang(dtGui);
      setTrackingVanChuyen(editItem.tracking_van_chuyen || '');
      setStage3Done(Boolean(dtGui));

      const dtTq = editItem.ngay_thong_quan ? formatDateInput(editItem.ngay_thong_quan) : '';
      setNgayThongQuan(dtTq);
      setStage4Done(Boolean(dtTq));

      const dtKho = editItem.ngay_kho_nhan ? formatDateInput(editItem.ngay_kho_nhan) : '';
      setNgayKhoNhan(dtKho);
      setNgayKeoHangVeKho(dtKho);
      setSlgThucNhan(editItem.slg_thuc_nhan !== undefined && editItem.slg_thuc_nhan !== '' ? editItem.slg_thuc_nhan : '');
      setStage5Done(Boolean(dtKho));

      // Phân tích kế hoạch bán hàng
      const rawKeHoach = editItem.ke_hoach_ban || 'Bán ngay';
      if (rawKeHoach.includes('Bán sau')) {
        setKeHoachBanType('Bán sau (Trữ kho)');
      } else {
        setKeHoachBanType('Bán ngay');
      }

      // Trích xuất ngày bán nếu có trong ngoặc vuông [dd/mm/yyyy]
      const matchDate = rawKeHoach.match(/\[(.*?)\]/);
      if (matchDate && matchDate[1]) {
        setNgayKeHoachBan(formatDateInput(matchDate[1]));
      } else if (dtKho) {
        setNgayKeHoachBan(dtKho);
      } else {
        setNgayKeHoachBan('');
      }

      // Tìm ý tưởng tương ứng qua mẫu thử
      const matchingSample = approvedSamples.find(s => s.id_mau === editItem.id_mau);
      if (matchingSample?.id_y_tuong) {
        setIdYtuong(matchingSample.id_y_tuong);
      } else {
        const foundIdea = ytuongOptions.find(y => y.sku_du_kien === editItem.sku || y.ten_sp === editItem.ten_sp);
        setIdYtuong(foundIdea?.id_y_tuong || '');
      }

      if (editItem.tinh_trang_cuoi === 'Đã hủy') {
        setManualStatusOverride('Đã hủy');
      } else {
        setManualStatusOverride('');
      }

      setGhiChu(editItem.ghi_chu || '');
    } else {
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
      setNgayCocXong(nowInput);
      setStage1Done(true);

      setNgayBatDauSx('');
      setNgaySxXong('');
      setStage2Done(false);

      setNgayGuiHang('');
      setNgayDenCang('');
      setTrackingVanChuyen('');
      setStage3Done(false);

      setNgayMoToKhai('');
      setNgayThongQuan('');
      setStage4Done(false);

      setNgayKeoHangVeKho('');
      setNgayKhoNhan('');
      setSlgThucNhan('');
      setStage5Done(false);

      setKeHoachBanType('Bán ngay');
      setNgayKeHoachBan('');
      setManualStatusOverride('');
      setGhiChu('');
    }
    setActiveTab('INFO');
    setErrorMsg('');
  }, [editItem, initialSample, isOpen, approvedSamples, ytuongOptions]);

  // Luồng 1 (Yêu cầu 1): Khi chọn Ý tưởng ➔ Tự điền SKU, Tên SP và gợi ý Mẫu thử
  const handleSelectIdea = (selectedIdeaId) => {
    setIdYtuong(selectedIdeaId);
    const idea = ytuongOptions.find(y => y.id_y_tuong === selectedIdeaId);
    if (idea) {
      if (idea.sku_du_kien) setSku(idea.sku_du_kien);
      if (idea.ten_sp) setTenSp(idea.ten_sp);
    }

    // Lọc mẫu đã duyệt cho ý tưởng này
    const matchingSamples = approvedSamples.filter(s => s.id_y_tuong === selectedIdeaId);
    if (matchingSamples.length === 1) {
      // Tự động chọn luôn mẫu duy nhất đã duyệt
      const singleSample = matchingSamples[0];
      setIdMau(singleSample.id_mau);
      if (singleSample.ten_ncc) setTenNcc(singleSample.ten_ncc);
      if (singleSample.gia_mau && donGia === 0) setDonGia(singleSample.gia_mau);
    } else if (matchingSamples.length === 0) {
      setIdMau('');
    }
  };

  // Luồng 2 (Yêu cầu 3): Khi chọn Mẫu thử (kể cả chưa chọn Ý tưởng) ➔ Tự động liên kết luôn Ý tưởng
  const handleSelectSample = (sampleId) => {
    setIdMau(sampleId);
    const foundSample = approvedSamples.find(s => s.id_mau === sampleId);
    if (foundSample) {
      if (foundSample.ten_ncc) setTenNcc(foundSample.ten_ncc);
      if (foundSample.gia_mau && donGia === 0) setDonGia(foundSample.gia_mau);

      // Tự động liên kết ngược lại ý tưởng
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

  // Tính số ngày của từng chặng
  const durStage1 = calcDurationDays(ngayDatHang, ngayCocXong) ?? 1;
  const durStage2 = calcDurationDays(ngayBatDauSx || ngayDatHang, ngaySxXong);
  const durStage3 = calcDurationDays(ngayGuiHang, ngayDenCang || ngayThongQuan);
  const durStage4 = calcDurationDays(ngayMoToKhai || ngayGuiHang, ngayThongQuan);
  const durStage5 = calcDurationDays(ngayKeoHangVeKho || ngayThongQuan, ngayKhoNhan);

  // Tổng lead time
  const totalLeadDays = (durStage1 || 0) + (durStage2 || 0) + (durStage3 || 0) + (durStage4 || 0) + (durStage5 || 0);

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenSp.trim()) {
      setActiveTab('INFO');
      setErrorMsg('Vui lòng nhập hoặc chọn Tên sản phẩm!');
      return;
    }
    if (cleanNumber(soLuong) <= 0) {
      setActiveTab('INFO');
      setErrorMsg('Số lượng đặt hàng phải lớn hơn 0!');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      // Định dạng chuỗi Kế hoạch bán hàng kèm Ngày (Yêu cầu 5)
      let formattedKeHoach = keHoachBanType;
      if (ngayKeHoachBan) {
        formattedKeHoach = `${keHoachBanType} [${formatDateVN(ngayKeHoachBan)}]`;
      } else if (ngayKhoNhan && keHoachBanType === 'Bán ngay') {
        formattedKeHoach = `${keHoachBanType} [${formatDateVN(ngayKhoNhan)}]`;
      }

      // Trạng thái sau cùng tự động (Yêu cầu 6)
      const finalStatus = manualStatusOverride || autoComputedStatus;

      // Columns: ['ma_po', 'id_mau', 'sku', 'ten_sp', 'ten_ncc', 'so_luong', 'don_gia', 'tong_tien', 'tien_coc', 'ngay_dat_hang', 'ngay_sx_xong', 'tracking_van_chuyen', 'ngay_gui_hang', 'ngay_thong_quan', 'ngay_kho_nhan', 'slg_thuc_nhan', 'ke_hoach_ban', 'tinh_trang_cuoi', 'ghi_chu']
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
        ngayGuiHang,
        ngayThongQuan,
        ngayKhoNhan,
        slgThucNhan !== '' ? cleanNumber(slgThucNhan) : '',
        formattedKeHoach,
        finalStatus,
        ghiChu.trim()
      ];

      if (editItem && editItem._sheetRow) {
        await updateRow('xnk_donhang', editItem._sheetRow, rowValues);
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

      if (onSaved) onSaved();
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
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* 1. Sub-Tabs Switcher (Yêu cầu 4: Tách thời gian chi tiết thành view riêng) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('INFO')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'INFO'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>1. Thông tin đơn hàng (PO)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TIMELINE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'TIMELINE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>2. Tiến độ & Lịch trình 5 chặng</span>
              {totalLeadDays > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'TIMELINE' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {totalLeadDays} ngày
                </span>
              )}
            </button>
          </div>

          {/* Badge Trạng thái sau cùng tự động (Yêu cầu 6) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Trạng thái:</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-500" />
              {manualStatusOverride || autoComputedStatus}
            </span>
          </div>
        </div>

        {/* TAB 1: THÔNG TIN ĐƠN HÀNG (PO) */}
        {activeTab === 'INFO' && (
          <div className="space-y-4">
            {/* Hàng 1: Mã PO & Chọn Ý tưởng sản phẩm (Yêu cầu 1) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã đơn hàng (PO)
                </label>
                <input
                  type="text"
                  value={maPo}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-blue-700 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    💡 1. Chọn từ Ý tưởng sản phẩm
                  </label>
                  {ytuongOptions.length > 0 && (
                    <span className="text-[11px] text-blue-600 font-semibold">
                      {ytuongOptions.length} Ý tưởng có sẵn
                    </span>
                  )}
                </div>
                <select
                  value={idYtuong}
                  onChange={(e) => handleSelectIdea(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  <option value="">-- Chọn ý tưởng sản phẩm (Gợi ý Mẫu) --</option>
                  {ytuongOptions.map(y => (
                    <option key={y.id_y_tuong} value={y.id_y_tuong}>
                      [{y.sku_du_kien || y.id_y_tuong}] {y.ten_sp} ({y.trang_thai})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hàng 2: Chọn từ Mẫu thử ĐÃ DUYỆT (Yêu cầu 2 & 3) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  📦 2. Chọn Mẫu thử đã duyệt đạt chuẩn <span className="text-emerald-600 font-semibold">(Chỉ mẫu Đạt)</span>
                </label>
                {suggestedSamples.length > 0 && (
                  <span className="text-[11px] text-emerald-600 font-bold">
                    {suggestedSamples.length} Mẫu đạt chuẩn
                  </span>
                )}
              </div>
              <select
                value={idMau}
                onChange={(e) => handleSelectSample(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              >
                <option value="">-- Chọn mẫu thử đã duyệt (Tự động điền SKU, Tên SP, NCC) --</option>
                {suggestedSamples.map(s => (
                  <option key={s.id_mau} value={s.id_mau}>
                    [{s.id_mau}] NCC: {s.ten_ncc} {s.gia_mau ? `• Giá mẫu: ${formatCurrency(s.gia_mau)}` : ''} - (Xếp hạng: {s.danh_gia_xep_hang || 'Đạt'})
                  </option>
                ))}
              </select>
              {suggestedSamples.length === 0 && idYtuong && (
                <p className="text-[11px] text-amber-600 mt-1 italic">
                  * Ý tưởng này chưa có mẫu thử nào được Sếp duyệt Đạt. Bạn vẫn có thể điền thông tin trực tiếp bên dưới.
                </p>
              )}
            </div>

            {/* Hàng 3: SKU, Tên sản phẩm, Nhà cung cấp */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SKU sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="VD: LNK-KB-01..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  required
                />
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nhà cung cấp / Xưởng SX
                </label>
                <input
                  type="text"
                  value={tenNcc}
                  onChange={(e) => setTenNcc(e.target.value)}
                  placeholder="VD: Xưởng Phật Sơn A..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Hàng 4: Số lượng, Đơn giá, Tổng tiền, Tiền cọc */}
            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-emerald-700 focus:outline-none"
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
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-amber-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Hàng 5: KẾ HOẠCH BÁN HÀNG CÓ NGÀY CỤ THỂ (Yêu cầu 5) */}
            <div className="bg-amber-50/40 p-3.5 rounded-2xl border border-amber-200/70 space-y-2">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                🎯 Kế hoạch phân phối & Mở bán hàng
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hình thức bán hàng
                  </label>
                  <select
                    value={keHoachBanType}
                    onChange={(e) => setKeHoachBanType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  >
                    <option value="Bán ngay">Bán ngay (Ngay khi hàng về tới kho)</option>
                    <option value="Bán sau (Trữ kho)">Bán sau (Trữ kho / Theo chiến dịch)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày dự kiến mở bán
                  </label>
                  <input
                    type="date"
                    value={ngayKeHoachBan}
                    onChange={(e) => setNgayKeHoachBan(e.target.value)}
                    placeholder="dd/mm/yyyy"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Ghi chú & Nút chuyển sang Tab 2 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ghi chú thêm về đơn hàng
              </label>
              <textarea
                rows={2}
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                placeholder="Yêu cầu đóng gói, tem phụ tiếng Việt, quy cách thùng..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
              />
            </div>

            {/* Nút gợi ý chuyển nhanh sang Tab Lịch trình */}
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
              <div className="text-xs text-indigo-900 font-medium">
                👉 Thiết lập thời gian chi tiết cho 5 chặng (Cọc ➔ SX ➔ Vận chuyển ➔ Hải quan ➔ Kho)?
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('TIMELINE')}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1 cursor-pointer"
              >
                <span>Sang Lịch trình 5 chặng</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: TIẾN ĐỘ & LỊCH TRÌNH 5 CHẶNG CHI TIẾT (Yêu cầu 4) */}
        {activeTab === 'TIMELINE' && (
          <div className="space-y-4">
            {/* View Mode Switcher: Bảng vs Lịch */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTimelineViewMode('TABLE')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    timelineViewMode === 'TABLE'
                      ? 'bg-white text-blue-700 border border-slate-200 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Dạng Bảng ma trận 5 chặng</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTimelineViewMode('CALENDAR')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    timelineViewMode === 'CALENDAR'
                      ? 'bg-white text-indigo-700 border border-slate-200 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>Dạng Lịch Timeline Gantt</span>
                </button>
              </div>

              <div className="text-xs font-bold text-slate-700">
                Tổng lead-time: <span className="text-blue-600">{totalLeadDays} ngày</span>
              </div>
            </div>

            {/* 2.1 VIEW DẠNG BẢNG MA TRẬN 5 CHẶNG */}
            {timelineViewMode === 'TABLE' && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 whitespace-nowrap">Chặng quy trình</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Từ ngày</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Đến ngày</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">Số ngày</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">Trạng thái chặng</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Thông tin chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Chặng 1 */}
                    <tr className={stage1Done ? 'bg-emerald-50/30' : ''}>
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">1</span>
                          <span>Đặt hàng & Cọc</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={ngayDatHang}
                          onChange={(e) => setNgayDatHang(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={ngayCocXong}
                          onChange={(e) => setNgayCocXong(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-700">
                        {durStage1 !== null ? `${durStage1} ngày` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setStage1Done(!stage1Done)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                            stage1Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {stage1Done ? <Check className="w-3.5 h-3.5" /> : null}
                          {stage1Done ? 'Đã xong' : 'Chưa xong'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        Tiền cọc: <strong className="text-amber-700">{formatCurrency(tienCoc)}</strong>
                      </td>
                    </tr>

                    {/* Chặng 2 */}
                    <tr className={stage2Done ? 'bg-emerald-50/30' : ''}>
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px]">2</span>
                          <span>Sản xuất xưởng</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={ngayBatDauSx}
                          onChange={(e) => setNgayBatDauSx(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={ngaySxXong}
                          onChange={(e) => setNgaySxXong(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-purple-700">
                        {durStage2 !== null ? `${durStage2} ngày` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setStage2Done(!stage2Done)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                            stage2Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {stage2Done ? <Check className="w-3.5 h-3.5" /> : null}
                          {stage2Done ? 'Đã xong' : 'Chưa xong'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        Xưởng: {tenNcc || 'Chưa chọn'}
                      </td>
                    </tr>

                    {/* Chặng 3 */}
                    <tr className={stage3Done ? 'bg-emerald-50/30' : ''}>
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">3</span>
                          <span>Vận chuyển QT</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={ngayGuiHang}
                          onChange={(e) => setNgayGuiHang(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={ngayDenCang}
                          onChange={(e) => setNgayDenCang(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-700">
                        {durStage3 !== null ? `${durStage3} ngày` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setStage3Done(!stage3Done)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                            stage3Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {stage3Done ? <Check className="w-3.5 h-3.5" /> : null}
                          {stage3Done ? 'Đã xong' : 'Chưa xong'}
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
                    <tr className={stage4Done ? 'bg-emerald-50/30' : ''}>
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-[10px]">4</span>
                          <span>Hải quan & Cảng</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={ngayMoToKhai}
                          onChange={(e) => setNgayMoToKhai(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={ngayThongQuan}
                          onChange={(e) => setNgayThongQuan(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-cyan-700">
                        {durStage4 !== null ? `${durStage4} ngày` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setStage4Done(!stage4Done)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                            stage4Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {stage4Done ? <Check className="w-3.5 h-3.5" /> : null}
                          {stage4Done ? 'Đã xong' : 'Chưa xong'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        Cảng Cát Lái / Hữu Nghị
                      </td>
                    </tr>

                    {/* Chặng 5 */}
                    <tr className={stage5Done ? 'bg-emerald-50/30' : ''}>
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">5</span>
                          <span>Kho nhận & Bán</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={ngayKeoHangVeKho}
                          onChange={(e) => setNgayKeoHangVeKho(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={ngayKhoNhan}
                          onChange={(e) => setNgayKhoNhan(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                        {durStage5 !== null ? `${durStage5} ngày` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setStage5Done(!stage5Done)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto ${
                            stage5Done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {stage5Done ? <Check className="w-3.5 h-3.5" /> : null}
                          {stage5Done ? 'Đã xong' : 'Chưa xong'}
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
                  </tbody>
                </table>
              </div>
            )}

            {/* 2.2 VIEW DẠNG LỊCH / GANTT TIMELINE */}
            {timelineViewMode === 'CALENDAR' && (
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Sơ đồ thanh thời gian 5 chặng quy trình
                  </span>
                  <span className="text-xs text-slate-500">
                    Bắt đầu: <strong>{formatDateVN(ngayDatHang) || 'Chưa có'}</strong> ➔ Hoàn tất: <strong>{formatDateVN(ngayKhoNhan) || 'Dự kiến'}</strong>
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Thanh 1 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">1. Đặt hàng & Cọc</span>
                      <span className="text-slate-500">{durStage1 || 1} ngày ({formatDateVN(ngayDatHang)})</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${stage1Done ? 'bg-emerald-500 w-full' : 'bg-blue-400 w-3/4'}`} />
                    </div>
                  </div>

                  {/* Thanh 2 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">2. Sản xuất xưởng</span>
                      <span className="text-slate-500">{durStage2 ? `${durStage2} ngày` : 'Chưa ấn định'} {ngaySxXong ? `(Xong: ${formatDateVN(ngaySxXong)})` : ''}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${stage2Done ? 'bg-emerald-500 w-full' : ngaySxXong ? 'bg-purple-500 w-2/3' : 'bg-slate-200 w-1/4'}`} />
                    </div>
                  </div>

                  {/* Thanh 3 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">3. Vận chuyển quốc tế</span>
                      <span className="text-slate-500">{durStage3 ? `${durStage3} ngày` : 'Chưa ấn định'} {trackingVanChuyen ? `(Vận đơn: ${trackingVanChuyen})` : ''}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${stage3Done ? 'bg-emerald-500 w-full' : ngayGuiHang ? 'bg-indigo-500 w-1/2' : 'bg-slate-200 w-0'}`} />
                    </div>
                  </div>

                  {/* Thanh 4 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">4. Hải quan & Thông quan</span>
                      <span className="text-slate-500">{durStage4 ? `${durStage4} ngày` : 'Chưa ấn định'} {ngayThongQuan ? `(Xong: ${formatDateVN(ngayThongQuan)})` : ''}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${stage4Done ? 'bg-emerald-500 w-full' : ngayThongQuan ? 'bg-cyan-500 w-1/2' : 'bg-slate-200 w-0'}`} />
                    </div>
                  </div>

                  {/* Thanh 5 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">5. Kho Việt Nam nhận hàng & Bán</span>
                      <span className="text-slate-500">{ngayKhoNhan ? `Về kho: ${formatDateVN(ngayKhoNhan)}` : 'Chờ về kho'} {slgThucNhan ? `(${formatNumber(slgThucNhan)} cái)` : ''}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${stage5Done ? 'bg-emerald-500 w-full' : ngayKhoNhan ? 'bg-emerald-400 w-3/4' : 'bg-slate-200 w-0'}`} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Buttons lưu */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
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

          <div className="flex items-center gap-2">
            {activeTab === 'TIMELINE' ? (
              <button
                type="button"
                onClick={() => setActiveTab('INFO')}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                Quay lại Tab 1
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('TIMELINE')}
                className="px-3.5 py-2 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-100 transition cursor-pointer flex items-center gap-1"
              >
                <span>Xem Lịch trình 5 chặng</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Đơn Hàng PO'}</span>
            </button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}

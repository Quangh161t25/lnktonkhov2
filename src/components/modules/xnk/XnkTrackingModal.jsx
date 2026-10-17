import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Table, 
  Save, 
  Sparkles, 
  CalendarRange,
  Minimize2,
  Square,
  Maximize2
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { 
  formatNumber, 
  formatCurrency, 
  cleanNumber 
} from '../../../utils/formatters';
import { PO_STAGES, STAGE_INDEX, usePoSchedule, buildGhiChuWithMeta, computeStatusFromDone } from './xnkStages';
import { PoStageTable, PoStageStepper } from './PoStageViews';
import { PoLotsPanel } from './PoLotsPanel';
import { buildPoLinesMap, getPoLines } from './xnkPoLines';
import {
  usePoLots,
  buildLotsMap,
  applyLotsToDone,
  receivedByLine,
  lotAllocation,
  lineKey,
  savePoLots,
  LOT_STAGE_KEYS
} from './xnkLots';

// Giữ các export cũ để các module khác vẫn import từ file này
export { extractTiendoMeta, stripTiendoMeta, buildGhiChuWithMeta, getPoKanbanStage } from './xnkStages';

export function XnkTrackingMatrixContent({
  order,
  onSaved,
  onClose,
  embedded = false,
  trackingSize = 'medium',
  setTrackingSize = null
}) {
  const {
    updateRow,
    deleteRow,
    appendRows,
    logAuditAction,
    fetchModule,
    xnkDonHangData,
    xnkDonHangCtData,
    xnkLoHangData
  } = useData();

  const [activeView, setActiveView] = useState('TABLE'); // 'TABLE' | 'STEPPER'

  // Lịch trình các chặng (dùng chung với Form PO)
  const sched = usePoSchedule();
  const [trackingVanChuyen, setTrackingVanChuyen] = useState('');
  const [slgThucNhan, setSlgThucNhan] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Các SP của PO và lô vận chuyển
  const poLinesMap = useMemo(() => buildPoLinesMap(xnkDonHangCtData), [xnkDonHangCtData]);
  const lotsMap = useMemo(() => buildLotsMap(xnkLoHangData), [xnkLoHangData]);
  const poLines = useMemo(() => getPoLines(order, poLinesMap), [order, poLinesMap]);
  const savedLots = useMemo(() => (order && lotsMap[String(order.ma_po || '').trim().toUpperCase()]) || [], [order, lotsMap]);
  const lotsApi = usePoLots();
  const hasLots = lotsApi.lots.length > 0;

  useEffect(() => {
    lotsApi.load(savedLots);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedLots]);

  useEffect(() => {
    if (order) {
      sched.load(order);
      setTrackingVanChuyen(order.tracking_van_chuyen || '');
      setSlgThucNhan(order.slg_thuc_nhan !== undefined && order.slg_thuc_nhan !== '' ? order.slg_thuc_nhan : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  if (!order) return null;

  // Tự động tính trạng thái chuẩn theo các chặng Đã xong (có lô thì chặng 5-7 suy ra từ các lô)
  const mergedDone = applyLotsToDone(sched.done, lotsApi.lots, poLines);
  const autoStatus = computeStatusFromDone(mergedDone, order.tinh_trang_cuoi === 'Đã hủy');
  const lotReceived = receivedByLine(lotsApi.lots);
  const lotReceivedTotal = lotReceived ? Object.values(lotReceived).reduce((a, b) => a + b, 0) : '';
  // Đã tách lô: chặng Vận chuyển QT trở đi theo dõi trong từng lô, ẩn khỏi bảng chung của PO
  const lotHiddenKeys = hasLots ? LOT_STAGE_KEYS : [];
  const lotHiddenNote = hasLots
    ? `Chặng ${STAGE_INDEX.vc + 1}–${PO_STAGES.length} (Vận chuyển QT → Thông quan → Kho nhận → Mở bán) theo dõi riêng trong ${lotsApi.lots.length} lô vận chuyển bên dưới.`
    : '';
  const lotDefaultStart = sched.ends[STAGE_INDEX.ship];
  // Chỉ tách lô khi đã xong toàn bộ các chặng trước Vận chuyển QT (Cọc -> Duyệt TK -> SX -> Chờ ship)
  const canSplitLots = sched.done.slice(0, STAGE_INDEX.vc).every(Boolean);

  const handleToggle = (i) => {
    // Đã tách lô thì không cho bỏ tích các chặng trước khi ship (chặng 1-4)
    if (hasLots && i < STAGE_INDEX.vc && sched.done[i]) {
      alert('PO đã tách lô vận chuyển nên không thể bỏ "Đã xong" các chặng trước khi ship. Xóa các lô trước nếu muốn sửa lại.');
      return;
    }
    const turnedOn = sched.toggle(i);
    if (turnedOn && i >= STAGE_INDEX.kho && !slgThucNhan) setSlgThucNhan(order.so_luong || '');
  };

  const stageExtra = {
    coc: order.tien_coc ? `Cọc: ${formatCurrency(order.tien_coc)}` : '',
    sx: order.ten_ncc ? `Xưởng: ${order.ten_ncc}` : '',
    vc: hasLots ? `${lotsApi.lots.length} lô vận chuyển` : (trackingVanChuyen ? `Vận đơn: ${trackingVanChuyen}` : ''),
    kho: hasLots
      ? (lotReceivedTotal !== '' ? `Thực nhận: ${formatNumber(lotReceivedTotal)} cái (theo lô)` : '')
      : (slgThucNhan ? `Thực nhận: ${formatNumber(slgThucNhan)} cái` : ''),
    ban: `Hình thức: ${sched.planType}`
  };

  const renderDetail = (key) => {
    switch (key) {
      case 'coc':
        return <span className="text-slate-600">Cọc: <strong className="text-amber-700">{formatCurrency(order.tien_coc)}</strong></span>;
      case 'tk':
        return <span className="text-slate-500 text-[11px]">File thiết kế, bao bì, tem nhãn</span>;
      case 'sx':
        return <span className="text-slate-600">Xưởng: {order.ten_ncc || '-'}</span>;
      case 'ship':
        return <span className="text-slate-500 text-[11px]">Hàng đã đóng gói, chờ lịch ship</span>;
      case 'vc':
        if (hasLots) return <span className="text-indigo-700 text-[11px] font-semibold">Xem các lô bên dưới</span>;
        return (
          <input
            type="text"
            value={trackingVanChuyen}
            onChange={(e) => setTrackingVanChuyen(e.target.value)}
            placeholder="Mã tracking / vận đơn..."
            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
          />
        );
      case 'tq':
        return <span className="text-slate-600">Cảng Cát Lái / Hữu Nghị</span>;
      case 'kho':
        if (hasLots) {
          return (
            <span className="text-emerald-700 text-xs font-bold">
              {lotReceivedTotal !== '' ? formatNumber(lotReceivedTotal) : '—'} <span className="text-[10px] text-slate-400 font-semibold">(theo lô)</span>
            </span>
          );
        }
        return (
          <input
            type="number"
            value={slgThucNhan}
            onChange={(e) => setSlgThucNhan(e.target.value)}
            placeholder="SLG thực tế nhập kho..."
            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700"
          />
        );
      case 'ban':
        return (
          <select
            value={sched.planType}
            onChange={(e) => sched.setPlanType(e.target.value)}
            className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-800"
          >
            <option value="Bán ngay">⚡ Bán ngay</option>
            <option value="Bán sau (Trữ kho)">📦 Bán sau (Trữ kho)</option>
          </select>
        );
      default:
        return null;
    }
  };

  const totalStages = PO_STAGES.length;
  const completedCount = mergedDone.filter(Boolean).length;
  const progressPercent = Math.round((completedCount / totalStages) * 100);

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

    if (hasLots) {
      const over = lotAllocation(poLines, lotsApi.lots).filter(a => a.con < 0);
      if (over.length > 0) {
        alert(`Số lượng xếp lô vượt số lượng đặt: ${over.map(a => a.ten_sp || a.sku).join(', ')}`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const finalStatus = autoStatus;
      const row = sched.toRow(mergedDone);

      // Lô vận chuyển + SL thực nhận theo từng SP (nếu PO có chi tiết SP)
      await savePoLots(order.ma_po, lotsApi.lots, savedLots, { updateRow, deleteRow, appendRows });
      if (hasLots) {
        for (const line of poLines) {
          if (!line._sheetRow) continue;
          const nhan = lotReceived && lotReceived[lineKey(line)] !== undefined ? lotReceived[lineKey(line)] : '';
          if (String(nhan) === String(line.slg_thuc_nhan)) continue;
          await updateRow('xnk_donhang_ct', line._sheetRow, [
            line.ma_po, line.stt, line.id_y_tuong, line.id_mau, line.sku, line.ten_sp,
            line.so_luong, line.don_gia, line.thanh_tien, nhan, line.ghi_chu
          ]);
        }
      }
      const poTracking = hasLots
        ? lotsApi.lots.map(l => String(l.tracking || '').trim()).filter(Boolean).join(', ')
        : trackingVanChuyen.trim();
      const poSlgNhan = hasLots ? lotReceivedTotal : (slgThucNhan !== '' ? cleanNumber(slgThucNhan) : '');

      const rawRow = (xnkDonHangData && xnkDonHangData[targetSheetRow - 1]) || [];
      const userGhiChu = (order.ghi_chu !== undefined ? order.ghi_chu : rawRow[18]) || '';
      const finalGhiChu = buildGhiChuWithMeta(userGhiChu, row.meta);

      const rowValues = [
        (order.ma_po || rawRow[0] || '').toString().trim(),
        (order.id_mau || rawRow[1] || '').toString().trim(),
        (order.sku || rawRow[2] || '').toString().trim(),
        (order.ten_sp || rawRow[3] || '').toString().trim(),
        (order.ten_ncc || rawRow[4] || '').toString().trim(),
        cleanNumber(order.so_luong !== undefined ? order.so_luong : rawRow[5]) || 0,
        order.don_gia === '' ? '' : (cleanNumber(order.don_gia !== undefined ? order.don_gia : rawRow[6]) || 0),
        cleanNumber(order.tong_tien !== undefined ? order.tong_tien : rawRow[7]) || 0,
        cleanNumber(order.tien_coc !== undefined ? order.tien_coc : rawRow[8]) || 0,
        row.ngay_dat_hang,
        row.ngay_sx_xong,
        poTracking,
        row.ngay_gui_hang, // Ngày đến cảng / hoàn thành chặng Vận chuyển QT
        row.ngay_thong_quan,
        row.ngay_kho_nhan,
        poSlgNhan,
        row.ke_hoach_ban,
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
          summary: `Cập nhật tiến độ ${totalStages} chặng đơn PO ${order.ma_po}: ${finalStatus}`
        });
      }
      await new Promise(r => setTimeout(r, 400));
      await fetchModule('xnk_donhang', true);
      if (onSaved) await onSaved();
      alert('Đã cập nhật tiến độ đơn hàng thành công!');
      if (!embedded && onClose) onClose();
    } catch (err) {
      console.error('Lỗi lưu tiến độ:', err);
      alert('Không thể cập nhật tiến độ. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={embedded ? 'flex flex-col space-y-3' : 'flex-1 flex flex-col overflow-hidden'}>
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

        {!embedded && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 3 Size Control Buttons: Nhỏ lại - Vừa - Mở rộng */}
            {setTrackingSize && (
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
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition cursor-pointer"
                title="Đóng / Hủy"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
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
              <span>Bảng ma trận {totalStages} chặng (Nhập & Lưu)</span>
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
            Tiến độ: <span className="text-blue-600">{completedCount}/{totalStages} chặng ({progressPercent}%)</span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* VIEW 1: DẠNG BẢNG MA TRẬN CÁC CHẶNG */}
          {activeView === 'TABLE' && (
            <>
              <PoStageTable sched={sched} done={mergedDone} hiddenKeys={lotHiddenKeys} hiddenNote={lotHiddenNote} onToggle={handleToggle} renderDetail={renderDetail} />
              <PoLotsPanel lotsApi={lotsApi} lines={poLines} defaultStart={lotDefaultStart} canSplit={canSplitLots} />
            </>
          )}

          {/* VIEW 2: DẠNG STEPPER & TIMELINE */}
          {activeView === 'STEPPER' && (
            <PoStageStepper sched={sched} done={mergedDone} hiddenKeys={lotHiddenKeys} extraText={stageExtra} />
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          {!embedded && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Đóng
            </button>
          ) : (
            <div />
          )}

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
  );
}

export function XnkTrackingModal({ isOpen, onClose, order, onSaved }) {
  const [trackingSize, setTrackingSize] = useState('medium'); // 'small' | 'medium' | 'full'

  if (!isOpen || !order) return null;

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
        <XnkTrackingMatrixContent
          order={order}
          onSaved={onSaved}
          onClose={onClose}
          embedded={false}
          trackingSize={trackingSize}
          setTrackingSize={setTrackingSize}
        />
      </div>
    </div>
  );
}


import React, { useMemo } from 'react';
import {
  Package,
  Truck,
  Warehouse,
  Wallet,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { formatNumber, formatCurrency, formatDateVN, formatDateInput, cleanNumber } from '../../../utils/formatters';
import { PO_STAGES, readSchedule, cascadeEnds, computeStatusFromDone, calcDurationDays, getPoStatusBadgeClass } from './xnkStages';
import { buildPoLinesMap, getPoLines } from './xnkPoLines';
import { buildLotsMap, getPoLots, lineKey, applyLotsToDone, LOT_STAGES, latestLotDate } from './xnkLots';

// Ô số liệu nhỏ
function Stat({ icon: Icon, label, value, sub, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 border-slate-200 text-slate-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    rose: 'bg-rose-50 border-rose-200 text-rose-800'
  };
  return (
    <div className={`p-3 rounded-xl border ${tones[tone] || tones.slate}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-80">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      <div className="text-base font-black mt-1 leading-tight">{value}</div>
      {sub && <div className="text-[11px] mt-0.5 opacity-75">{sub}</div>}
    </div>
  );
}

// Trạng thái hiện tại của 1 lô
function lotStatusLabel(lot) {
  for (let j = LOT_STAGES.length - 1; j >= 0; j--) {
    if (lot.done[j]) return LOT_STAGES[j].label;
  }
  return 'Chờ ship';
}

/**
 * Tab Tổng hợp của 1 PO: đặt bao nhiêu, đã đi bao nhiêu, đã về bao nhiêu, tiền & cước, tiến độ.
 */
export function PoSummaryTab({ order }) {
  const { xnkDonHangCtData, xnkLoHangData } = useData();
  const linesMap = useMemo(() => buildPoLinesMap(xnkDonHangCtData), [xnkDonHangCtData]);
  const lotsMap = useMemo(() => buildLotsMap(xnkLoHangData), [xnkLoHangData]);

  const data = useMemo(() => {
    const lines = getPoLines(order, linesMap).filter(l => l.sku || l.ten_sp);
    const lots = getPoLots(order, lotsMap);
    const hasLots = lots.length > 0;
    const khoIdx = LOT_STAGES.findIndex(s => s.key === 'kho');
    const vcIdx = LOT_STAGES.findIndex(s => s.key === 'vc');

    // Tiến độ chung (PO không chia lô: đã gửi / về kho theo chặng của PO)
    const sched = readSchedule(order);
    const ends = cascadeEnds(sched.start, sched.days);
    const done = applyLotsToDone(sched.done, lots, lines);
    const poShipped = done[PO_STAGES.findIndex(s => s.key === 'vc')];
    const poArrived = done[PO_STAGES.findIndex(s => s.key === 'kho')];

    // Theo từng SP
    const products = lines.map(l => {
      const k = lineKey(l);
      const dat = cleanNumber(l.so_luong) || 0;
      const donGia = cleanNumber(l.don_gia) || 0;
      let gui = 0;
      let dangDi = 0;
      let nhan = 0;
      let guiDaVe = 0;
      let hasNhan = false;
      if (hasLots) {
        lots.forEach(lot => {
          const it = lot.items.find(x => x.k === k);
          if (!it) return;
          const g = cleanNumber(it.g) || 0;
          gui += g;
          if (lot.done[khoIdx]) {
            guiDaVe += g;
            if (it.n !== '' && it.n !== undefined) {
              hasNhan = true;
              nhan += cleanNumber(it.n) || 0;
            } else {
              nhan += g;
              hasNhan = true;
            }
          } else if (lot.done[vcIdx]) {
            dangDi += g;
          }
        });
      } else {
        if (poShipped || poArrived) gui = dat;
        if (poArrived) {
          guiDaVe = dat;
          hasNhan = true;
          nhan = l.slg_thuc_nhan !== '' && l.slg_thuc_nhan !== undefined ? (cleanNumber(l.slg_thuc_nhan) || 0) : dat;
        } else if (poShipped) {
          dangDi = dat;
        }
      }
      return {
        k,
        ten_sp: l.ten_sp,
        sku: l.sku,
        dat,
        donGia,
        thanhTien: dat * donGia,
        gui,
        dangDi,
        nhan: hasNhan ? nhan : 0,
        chuaGui: Math.max(0, dat - gui),
        hutHut: hasNhan ? nhan - guiDaVe : 0
      };
    });

    const sum = (key) => products.reduce((s, p) => s + (p[key] || 0), 0);
    const tongDat = sum('dat');
    const tongTien = sum('thanhTien') || cleanNumber(order.tong_tien) || 0;
    const tienCoc = cleanNumber(order.tien_coc) || 0;
    const tongCuoc = lots.reduce((s, l) => s + (cleanNumber(l.cuoc_phi) || 0), 0);
    const tongNhan = sum('nhan');

    const status = order.tinh_trang_cuoi === 'Đã hủy' ? 'Đã hủy' : computeStatusFromDone(done);
    const doneCount = done.filter(Boolean).length;
    const khoStageIdx = PO_STAGES.findIndex(s => s.key === 'kho');
    const ngayVeKho = hasLots
      ? lots.reduce((m, l) => (l.ngay_kho_nhan > m ? l.ngay_kho_nhan : m), '')
      : ends[khoStageIdx];
    const ngayCuoi = hasLots ? (latestLotDate(lots) || ends[ends.length - 1]) : ends[ends.length - 1];
    const today = formatDateInput(new Date());
    const conLaiNgay = ngayVeKho && ngayVeKho > today ? calcDurationDays(today, ngayVeKho) : 0;

    return {
      products,
      lots,
      hasLots,
      tongDat,
      tongGui: sum('gui'),
      tongDangDi: sum('dangDi'),
      tongNhan,
      tongChuaGui: sum('chuaGui'),
      tongHutHut: sum('hutHut'),
      tongTien,
      tienCoc,
      conPhaiTra: tongTien - tienCoc,
      tongCuoc,
      giaVon: tongDat > 0 ? (tongTien + tongCuoc) / tongDat : 0,
      status,
      doneCount,
      start: sched.start,
      ngayVeKho,
      ngayCuoi,
      leadDays: calcDurationDays(sched.start, ngayCuoi),
      conLaiNgay,
      pctNhan: tongDat > 0 ? Math.round((tongNhan / tongDat) * 100) : 0
    };
  }, [order, linesMap, lotsMap]);

  if (!order) return null;

  return (
    <div className="space-y-4">
      {/* Trạng thái & tiến độ */}
      <div className="p-3.5 rounded-2xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getPoStatusBadgeClass(data.status)}`}>{data.status}</span>
          <span className="text-xs text-slate-600">
            Tiến độ: <strong className="text-blue-700">{data.doneCount}/{PO_STAGES.length} chặng</strong>
          </span>
          {data.hasLots && (
            <span className="text-xs text-slate-600">• <strong className="text-indigo-700">{data.lots.length} lô</strong> vận chuyển</span>
          )}
        </div>
        <div className="text-xs text-slate-600">
          Đặt <strong>{formatDateVN(data.start)}</strong> ➔ Về kho dự kiến <strong>{formatDateVN(data.ngayVeKho) || '—'}</strong>
          {' '}• Lead-time <strong>{data.leadDays} ngày</strong>
          {data.conLaiNgay > 0 && <> • Còn <strong className="text-amber-700">{data.conLaiNgay} ngày</strong> tới ngày về kho</>}
        </div>
      </div>

      {/* Số lượng */}
      <div>
        <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Package className="w-4 h-4 text-blue-600" /> Số lượng
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          <Stat icon={Package} tone="blue" label="Tổng đặt" value={`${formatNumber(data.tongDat)} cái`} sub={`${data.products.length} sản phẩm`} />
          <Stat icon={Truck} tone="indigo" label="Đã gửi đi" value={`${formatNumber(data.tongGui)} cái`} sub={data.tongDangDi > 0 ? `${formatNumber(data.tongDangDi)} cái đang trên đường` : (data.hasLots ? 'Theo các lô' : 'Chưa chia lô')} />
          <Stat icon={Warehouse} tone="emerald" label="Đã về kho" value={`${formatNumber(data.tongNhan)} cái`} sub={`${data.pctNhan}% số lượng đặt`} />
          <Stat icon={Clock} tone="amber" label="Chưa gửi" value={`${formatNumber(data.tongChuaGui)} cái`} sub="Còn ở xưởng / chờ ship" />
          <Stat
            icon={data.tongHutHut < 0 ? AlertTriangle : CheckCircle2}
            tone={data.tongHutHut < 0 ? 'rose' : 'slate'}
            label="Chênh lệch nhận"
            value={`${data.tongHutHut > 0 ? '+' : ''}${formatNumber(data.tongHutHut)} cái`}
            sub={data.tongHutHut < 0 ? 'Thiếu so với số đã gửi' : 'Thực nhận so với đã gửi (lô đã về)'}
          />
        </div>
      </div>

      {/* Tài chính */}
      <div>
        <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-emerald-600" /> Tài chính
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          <Stat tone="emerald" label="Tổng giá trị PO" value={formatCurrency(data.tongTien)} />
          <Stat tone="amber" label="Đã cọc xưởng" value={formatCurrency(data.tienCoc)} sub={data.tongTien > 0 ? `${Math.round((data.tienCoc / data.tongTien) * 100)}% giá trị PO` : ''} />
          <Stat tone="rose" label="Còn phải trả xưởng" value={formatCurrency(data.conPhaiTra)} />
          <Stat tone="indigo" label="Tổng cước vận chuyển" value={formatCurrency(data.tongCuoc)} sub={data.hasLots ? `${data.lots.length} lô` : 'Chưa nhập cước'} />
          <Stat tone="slate" label="Giá vốn TB / cái" value={formatCurrency(Math.round(data.giaVon))} sub="(Giá trị PO + cước) / tổng đặt" />
        </div>
      </div>

      {/* Theo từng sản phẩm */}
      <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white">
        <div className="px-3 py-2 border-b border-slate-100 text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-blue-600" /> Theo từng sản phẩm
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-bold">
              <th className="py-2 px-2 text-left">Sản phẩm</th>
              <th className="py-2 px-2 text-right">Đặt</th>
              <th className="py-2 px-2 text-right">Đơn giá</th>
              <th className="py-2 px-2 text-right">Thành tiền</th>
              <th className="py-2 px-2 text-right">Đã gửi</th>
              <th className="py-2 px-2 text-right">Đang đi</th>
              <th className="py-2 px-2 text-right">Đã về kho</th>
              <th className="py-2 px-2 text-right">Chưa gửi</th>
              <th className="py-2 px-2 text-right">Chênh lệch</th>
              <th className="py-2 px-2 text-left w-32">Hoàn thành</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.products.map(p => {
              const pct = p.dat > 0 ? Math.min(100, Math.round((p.nhan / p.dat) * 100)) : 0;
              return (
                <tr key={p.k}>
                  <td className="py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                    {p.ten_sp} <span className="text-slate-400 font-normal">{p.sku}</span>
                  </td>
                  <td className="py-2 px-2 text-right font-bold">{formatNumber(p.dat)}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(p.donGia)}</td>
                  <td className="py-2 px-2 text-right text-emerald-700 font-bold">{formatCurrency(p.thanhTien)}</td>
                  <td className="py-2 px-2 text-right text-indigo-700 font-bold">{formatNumber(p.gui)}</td>
                  <td className="py-2 px-2 text-right">{formatNumber(p.dangDi)}</td>
                  <td className="py-2 px-2 text-right text-emerald-700 font-bold">{formatNumber(p.nhan)}</td>
                  <td className={`py-2 px-2 text-right font-bold ${p.chuaGui > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{formatNumber(p.chuaGui)}</td>
                  <td className={`py-2 px-2 text-right font-bold ${p.hutHut < 0 ? 'text-rose-600' : 'text-slate-500'}`}>{p.hutHut > 0 ? '+' : ''}{formatNumber(p.hutHut)}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 w-8 text-right">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Theo từng lô */}
      {data.hasLots && (
        <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white">
          <div className="px-3 py-2 border-b border-slate-100 text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-indigo-600" /> Theo từng lô vận chuyển
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold">
                <th className="py-2 px-2 text-left">Lô</th>
                <th className="py-2 px-2 text-left">Trạng thái</th>
                <th className="py-2 px-2 text-left">Vận đơn</th>
                <th className="py-2 px-2 text-left">Ngày gửi</th>
                <th className="py-2 px-2 text-left">Về kho</th>
                <th className="py-2 px-2 text-right">SL gửi</th>
                <th className="py-2 px-2 text-right">SL nhận</th>
                <th className="py-2 px-2 text-right">Cước</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.lots.map(lot => {
                const g = lot.items.reduce((s, it) => s + (cleanNumber(it.g) || 0), 0);
                const hasN = lot.items.some(it => it.n !== '' && it.n !== undefined);
                const n = lot.items.reduce((s, it) => s + (cleanNumber(it.n) || 0), 0);
                return (
                  <tr key={lot.ma_lo}>
                    <td className="py-2 px-2"><span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-black text-[11px]">{lot.ma_lo}</span></td>
                    <td className="py-2 px-2 font-semibold text-slate-700">{lotStatusLabel(lot)}</td>
                    <td className="py-2 px-2 text-blue-700 font-semibold">{lot.tracking || '—'}</td>
                    <td className="py-2 px-2">{formatDateVN(lot.ngay_gui) || '—'}</td>
                    <td className="py-2 px-2">{formatDateVN(lot.ngay_kho_nhan) || '—'}</td>
                    <td className="py-2 px-2 text-right text-indigo-700 font-bold">{formatNumber(g)}</td>
                    <td className="py-2 px-2 text-right text-emerald-700 font-bold">{hasN ? formatNumber(n) : '—'}</td>
                    <td className="py-2 px-2 text-right text-amber-700 font-bold">{formatCurrency(lot.cuoc_phi)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

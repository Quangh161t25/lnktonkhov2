import React from 'react';
import { Plus, Trash2, Check, Truck, AlertCircle } from 'lucide-react';
import { formatNumber, formatCurrency, formatDateVN, cleanNumber } from '../../../utils/formatters';
import { calcDurationDays, STAGE_INDEX } from './xnkStages';
import { LOT_STAGES, lotAllocation, lotStageDates } from './xnkLots';

/**
 * Chia PO thành nhiều lô vận chuyển. Đã tách lô thì các chặng sau Chờ ship
 * (Vận chuyển QT -> Thông quan -> Kho nhận -> Mở bán) theo dõi riêng từng lô.
 * lotsApi: kết quả usePoLots(); lines: các dòng SP của PO; defaultStart: ngày gửi gợi ý cho lô mới
 */
export function PoLotsPanel({ lotsApi, lines, defaultStart = '', canSplit = true }) {
  const { lots } = lotsApi;
  const alloc = lotAllocation(lines, lots);
  const overAllocated = alloc.filter(a => a.con < 0);
  const remaining = alloc.reduce((s, a) => s + Math.max(0, a.con), 0);
  const totalCuoc = lots.reduce((s, l) => s + (cleanNumber(l.cuoc_phi) || 0), 0);
  const inputCls = 'w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none';
  const firstLotStageNo = STAGE_INDEX.vc + 1;

  return (
    <div className="p-3 rounded-2xl border border-indigo-200 bg-indigo-50/30 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-indigo-600" />
            Lô vận chuyển ({lots.length} lô)
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {lots.length === 0
              ? 'Không chia lô thì PO đi 1 lần như bình thường. Tách lô để mỗi lô có vận đơn, cước và tiến độ riêng từ chặng Vận chuyển QT trở đi.'
              : <>Từ chặng {firstLotStageNo} trở đi theo dõi <strong>riêng từng lô</strong>: Vận chuyển QT → Thông quan → Kho nhận → Mở bán.</>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => lotsApi.add(lines, defaultStart)}
          disabled={!canSplit}
          title={canSplit ? 'Tách thêm 1 lô vận chuyển' : `Cần hoàn thành chặng 1–${firstLotStageNo - 1} trước khi tách lô`}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Tách lô vận chuyển
        </button>
      </div>

      {!canSplit && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          Cần đánh dấu <strong>Đã xong</strong> chặng 1–{firstLotStageNo - 1} (Đặt hàng & Cọc → Duyệt thiết kế → Sản xuất → SX xong chờ ship) thì mới tách lô vận chuyển được.
        </div>
      )}

      {lots.length > 0 && (
        <>
          {overAllocated.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Số lượng xếp lô vượt số lượng đặt: {overAllocated.map(a => `${a.ten_sp || a.sku} (${formatNumber(-a.con)})`).join(', ')}
            </div>
          )}
          {remaining > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Còn {formatNumber(remaining)} cái chưa xếp lô (vẫn ở chặng Chờ ship).
            </div>
          )}

          {/* Từng lô */}
          {lots.map((lot, idx) => {
            const dates = lotStageDates(lot);
            const lotDoneCount = lot.done.filter(Boolean).length;
            const lotGui = lot.items.reduce((sum, it) => sum + (cleanNumber(it.g) || 0), 0);
            const lotNhan = lot.items.some(it => it.n !== '' && it.n !== undefined)
              ? lot.items.reduce((sum, it) => sum + (cleanNumber(it.n) || 0), 0)
              : '';
            return (
              <div key={lot.ma_lo + idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-black text-[11px]">Lô {lot.ma_lo}</span>
                    <span className="text-[11px] text-slate-500 font-semibold">{lotDoneCount}/{LOT_STAGES.length} chặng</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => lotsApi.remove(idx)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Xóa lô này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Thông tin chung của lô */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Ghi chú lô</label>
                    <input type="text" value={lot.ghi_chu} onChange={(e) => lotsApi.update(idx, { ghi_chu: e.target.value })} placeholder="VD: Hàng gấp đi air, ghép cont với PO khác..." className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Cước vận chuyển (VNĐ)</label>
                    <input type="number" min="0" value={lot.cuoc_phi} onChange={(e) => lotsApi.update(idx, { cuoc_phi: e.target.value })} className={`${inputCls} font-bold text-amber-700`} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Ngày gửi (xuất xưởng)</label>
                    <input type="date" value={lot.ngay_gui} onChange={(e) => lotsApi.setStart(idx, e.target.value)} className={inputCls} />
                  </div>
                </div>

                {/* Sản phẩm trong lô: sửa SL gửi / SL nhận của lô này */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold">
                        <th className="py-1.5 px-2 text-left">Sản phẩm</th>
                        <th className="py-1.5 px-2 text-right">Đặt</th>
                        <th className="py-1.5 px-2 text-right w-28">Gửi lô {lot.ma_lo}</th>
                        <th className="py-1.5 px-2 text-right w-28">Nhận lô {lot.ma_lo}</th>
                        <th className="py-1.5 px-2 text-right">Đã xếp lô</th>
                        <th className="py-1.5 px-2 text-right">Còn lại</th>
                        <th className="py-1.5 px-2 text-right">Thực nhận</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alloc.map(a => {
                        const it = lot.items.find(x => x.k === a.k) || { g: 0, n: '' };
                        return (
                          <tr key={a.k}>
                            <td className="py-1.5 px-2 font-semibold text-slate-800 whitespace-nowrap">
                              {a.ten_sp || a.sku} <span className="text-slate-400 font-normal">{a.sku}</span>
                            </td>
                            <td className="py-1.5 px-2 text-right">{formatNumber(a.dat)}</td>
                            <td className="py-1 px-1.5">
                              <input
                                type="number"
                                min="0"
                                value={it.g}
                                onChange={(e) => lotsApi.updateItem(idx, a.k, { t: a.ten_sp || a.sku, g: e.target.value })}
                                className="w-full px-1.5 py-1 bg-white border border-indigo-200 rounded-lg text-xs text-right font-bold text-indigo-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                              />
                            </td>
                            <td className="py-1 px-1.5">
                              <input
                                type="number"
                                min="0"
                                value={it.n}
                                onChange={(e) => lotsApi.updateItem(idx, a.k, { t: a.ten_sp || a.sku, n: e.target.value })}
                                placeholder="Khi về kho"
                                className="w-full px-1.5 py-1 bg-white border border-emerald-200 rounded-lg text-xs text-right font-bold text-emerald-700 focus:ring-1 focus:ring-emerald-500 outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-right text-indigo-700 font-bold">{formatNumber(a.gui)}</td>
                            <td className={`py-1.5 px-2 text-right font-bold ${a.con < 0 ? 'text-rose-600' : a.con > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {formatNumber(a.con)}
                            </td>
                            <td className="py-1.5 px-2 text-right text-emerald-700 font-bold">{a.nhan === '' ? '—' : formatNumber(a.nhan)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Các chặng của lô */}
                <div className="border border-slate-100 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold">
                        <th className="py-1.5 px-2 text-left">Chặng của lô</th>
                        <th className="py-1.5 px-2 text-left">Từ ngày</th>
                        <th className="py-1.5 px-2 text-center">Số ngày</th>
                        <th className="py-1.5 px-2 text-left">Đến ngày</th>
                        <th className="py-1.5 px-2 text-center">Trạng thái</th>
                        <th className="py-1.5 px-2 text-left min-w-[190px]">Thông tin chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {LOT_STAGES.map((st, j) => {
                        const isDone = lot.done[j];
                        const isBan = st.key === 'ban';
                        return (
                          <tr key={st.key} className={isDone ? (isBan ? 'bg-amber-50/50' : 'bg-emerald-50/40') : ''}>
                            <td className="py-1.5 px-2 font-bold text-slate-800 whitespace-nowrap">
                              {firstLotStageNo + j}. {st.title}
                            </td>
                            <td className="py-1.5 px-2 whitespace-nowrap text-slate-600">
                              {formatDateVN(dates[j].from) || '—'}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                value={calcDurationDays(dates[j].from, dates[j].to)}
                                onChange={(e) => lotsApi.setDays(idx, j, e.target.value)}
                                disabled={!dates[j].from}
                                className="w-14 px-1 py-1 text-center bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 disabled:opacity-50"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="date"
                                value={dates[j].to || ''}
                                onChange={(e) => lotsApi.setEnd(idx, j, e.target.value)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => lotsApi.toggle(idx, j)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1 ${
                                  isDone
                                    ? (isBan ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-800')
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                {isDone ? <Check className="w-3 h-3" /> : null}
                                {isBan ? (isDone ? 'Đang bán' : 'Chưa bán') : (isDone ? 'Đã xong' : 'Chưa xong')}
                              </button>
                            </td>
                            <td className="py-1.5 px-2">
                              {st.key === 'vc' && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 text-[11px] whitespace-nowrap">Mã vận đơn:</span>
                                  <input type="text" value={lot.tracking} onChange={(e) => lotsApi.update(idx, { tracking: e.target.value })} placeholder="Mã tracking / Hãng tàu..." className={`${inputCls} font-semibold text-blue-700`} />
                                </div>
                              )}
                              {st.key === 'tq' && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 text-[11px] whitespace-nowrap">Cửa khẩu:</span>
                                  <input type="text" value={lot.cua_khau || ''} onChange={(e) => lotsApi.update(idx, { cua_khau: e.target.value })} placeholder="Cảng Cát Lái / Hữu Nghị..." className={inputCls} />
                                </div>
                              )}
                              {st.key === 'kho' && (
                                <span className="text-[11px] text-slate-600 whitespace-nowrap">
                                  Thực nhận: <strong className="text-emerald-700">{lotNhan === '' ? '—' : formatNumber(lotNhan)}</strong> / Gửi: <strong className="text-indigo-700">{formatNumber(lotGui)}</strong> cái
                                </span>
                              )}
                              {st.key === 'ban' && (
                                <select
                                  value={lot.hinh_thuc_ban || 'Bán ngay'}
                                  onChange={(e) => lotsApi.update(idx, { hinh_thuc_ban: e.target.value })}
                                  className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-800 outline-none"
                                >
                                  <option value="Bán ngay">⚡ Bán ngay</option>
                                  <option value="Bán sau (Trữ kho)">📦 Bán sau (Trữ kho)</option>
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          <div className="text-right text-[11px] text-slate-600">
            Tổng cước vận chuyển: <strong className="text-amber-700">{formatCurrency(totalCuoc)}</strong>
          </div>
        </>
      )}
    </div>
  );
}

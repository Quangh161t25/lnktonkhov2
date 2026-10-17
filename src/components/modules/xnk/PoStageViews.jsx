import React from 'react';
import {
  Check,
  CheckCircle2,
  Calendar,
  FileCheck,
  PenTool,
  Factory,
  PackageCheck,
  Truck,
  Warehouse,
  TrendingUp
} from 'lucide-react';
import { formatDateVN } from '../../../utils/formatters';
import { PO_STAGES } from './xnkStages';

export const STAGE_ICONS = {
  coc: FileCheck,
  tk: PenTool,
  sx: Factory,
  ship: PackageCheck,
  vc: Truck,
  tq: CheckCircle2,
  kho: Warehouse,
  ban: TrendingUp
};

// Lớp màu tĩnh (Tailwind cần chuỗi đầy đủ)
const COLOR = {
  blue: { badge: 'bg-blue-100 text-blue-700', input: 'border-blue-200 text-blue-700', bar: 'bg-blue-400' },
  pink: { badge: 'bg-pink-100 text-pink-700', input: 'border-pink-200 text-pink-700', bar: 'bg-pink-400' },
  purple: { badge: 'bg-purple-100 text-purple-700', input: 'border-purple-200 text-purple-700', bar: 'bg-purple-500' },
  orange: { badge: 'bg-orange-100 text-orange-700', input: 'border-orange-200 text-orange-700', bar: 'bg-orange-400' },
  indigo: { badge: 'bg-indigo-100 text-indigo-700', input: 'border-indigo-200 text-indigo-700', bar: 'bg-indigo-500' },
  cyan: { badge: 'bg-cyan-100 text-cyan-700', input: 'border-cyan-200 text-cyan-700', bar: 'bg-cyan-500' },
  emerald: { badge: 'bg-emerald-100 text-emerald-700', input: 'border-emerald-200 text-emerald-700', bar: 'bg-emerald-400' },
  amber: { badge: 'bg-amber-200 text-amber-900', input: 'border-amber-300 text-amber-800', bar: 'bg-amber-300' }
};

/**
 * Bảng ma trận các chặng: Từ ngày | Số ngày | Đến ngày | Đã xong | Chi tiết
 * sched: kết quả usePoSchedule(); renderDetail(stageKey) trả về ô chi tiết riêng từng chặng.
 */
export function PoStageTable({ sched, onToggle, renderDetail, done, lockedStages = {}, hiddenKeys = [], hiddenNote = '' }) {
  const doneArr = done || sched.done;
  return (
    <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-2xs">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200 select-none">
            <th className="py-2.5 px-3 min-w-[170px]">Quy trình thực hiện</th>
            <th className="py-2.5 px-3 whitespace-nowrap min-w-[130px]">Từ ngày</th>
            <th className="py-2.5 px-3 text-center whitespace-nowrap w-24">Số ngày (Sửa)</th>
            <th className="py-2.5 px-3 whitespace-nowrap min-w-[130px]">Đến ngày (Sửa)</th>
            <th className="py-2.5 px-3 text-center whitespace-nowrap w-28">Trạng thái</th>
            <th className="py-2.5 px-3 min-w-[200px]">Thông tin chi tiết</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {PO_STAGES.map((st, i) => {
            const c = COLOR[st.color] || COLOR.blue;
            if (hiddenKeys.includes(st.key)) return null;
            const isDone = doneArr[i];
            const isLast = st.key === 'ban';
            const lockLabel = lockedStages[st.key];
            const from = i === 0 ? sched.start : sched.ends[i - 1];
            return (
              <tr
                key={st.key}
                className={`hover:bg-slate-50/60 transition ${isDone ? (isLast ? 'bg-amber-50/50' : 'bg-emerald-50/30') : (isLast ? 'bg-amber-50/20' : '')}`}
              >
                <td className={`py-2.5 px-3 font-bold whitespace-nowrap ${isLast ? 'text-amber-900' : 'text-slate-800'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${c.badge}`}>{i + 1}</span>
                    <span>{i + 1}. {st.title}</span>
                  </div>
                </td>
                <td className="py-2 px-3 whitespace-nowrap">
                  {i === 0 ? (
                    <input
                      type="date"
                      value={sched.start}
                      onChange={(e) => sched.setStart(e.target.value)}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                      title="Ngày bắt đầu ký hợp đồng và cọc"
                    />
                  ) : (
                    <>
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 inline-block">
                        {formatDateVN(from)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">(= Đến Chặng {i})</span>
                    </>
                  )}
                </td>
                <td className="py-2 px-3 text-center">
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={sched.days[i]}
                      onChange={(e) => sched.setDays(i, e.target.value)}
                      className={`w-14 px-1.5 py-1 text-center bg-white border rounded-lg text-xs font-bold focus:ring-1 focus:ring-blue-500 ${c.input}`}
                    />
                    <span className="text-[11px] text-slate-500">ngày</span>
                  </div>
                </td>
                <td className="py-2 px-3">
                  <input
                    type="date"
                    value={sched.ends[i]}
                    onChange={(e) => sched.setEnd(i, e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2.5 px-3 text-center">
                  {lockLabel ? (
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 ${isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-50 text-indigo-700'}`}
                      title="Chặng này tính theo các lô vận chuyển"
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : null}
                      {lockLabel}
                    </span>
                  ) : (
                  <button
                    type="button"
                    onClick={() => onToggle(i)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1 ${
                      isDone
                        ? (isLast ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-800')
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : null}
                    {isLast ? (isDone ? 'Đang bán' : 'Chưa bán') : (isDone ? 'Đã xong' : 'Chưa xong')}
                  </button>
                  )}
                </td>
                <td className="py-2 px-3">
                  {renderDetail ? renderDetail(st.key) : null}
                </td>
              </tr>
            );
          })}
          {hiddenKeys.length > 0 && hiddenNote && (
            <tr className="bg-indigo-50/60">
              <td colSpan={6} className="py-2.5 px-3 text-xs font-semibold text-indigo-800">
                {hiddenNote}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Thanh thời gian Gantt cho các chặng
export function PoStageGantt({ sched, extraText = {}, done, hiddenKeys = [] }) {
  const doneArr = done || sched.done;
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-xs font-bold text-slate-800">
          Sơ đồ thanh thời gian tiến độ chuỗi cung ứng (Gantt waterfall)
        </span>
        <span className="text-xs text-slate-500">
          Khởi động: <strong>{formatDateVN(sched.start) || 'Chưa có'}</strong> ➔ Mở bán: <strong>{formatDateVN(sched.ends[sched.ends.length - 1]) || 'Dự kiến'}</strong>
        </span>
      </div>
      <div className="space-y-3 pt-1">
        {PO_STAGES.map((st, i) => {
          const c = COLOR[st.color] || COLOR.blue;
          if (hiddenKeys.includes(st.key)) return null;
          const isDone = doneArr[i];
          const from = i === 0 ? sched.start : sched.ends[i - 1];
          return (
            <div key={st.key} className="space-y-1">
              <div className="flex justify-between text-xs gap-2">
                <span className={`font-bold ${st.key === 'ban' ? 'text-amber-900' : 'text-slate-700'}`}>
                  {i + 1}. {st.title}{st.key === 'ban' ? ` (${sched.planType})` : ''}
                </span>
                <span className="text-slate-500 text-right">
                  {sched.days[i]} ngày ({formatDateVN(from)} ➔ {formatDateVN(sched.ends[i])}){extraText[st.key] ? ` • ${extraText[st.key]}` : ''}
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${isDone ? (st.key === 'ban' ? 'bg-amber-500' : 'bg-emerald-500') + ' w-full' : c.bar + ' w-1/3'}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Stepper dọc cho các chặng
export function PoStageStepper({ sched, extraText = {}, done, hiddenKeys = [] }) {
  const doneArr = done || sched.done;
  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
      {PO_STAGES.map((st, i) => {
        const Icon = STAGE_ICONS[st.key] || FileCheck;
        if (hiddenKeys.includes(st.key)) return null;
        const isDone = doneArr[i];
        const from = i === 0 ? sched.start : sched.ends[i - 1];
        const to = sched.ends[i];
        return (
          <div key={st.key} className="relative flex items-start gap-4">
            <div className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition ${
              isDone
                ? 'bg-emerald-500 border-white text-white shadow-sm ring-2 ring-emerald-200'
                : 'bg-white border-slate-300 text-slate-400'
            }`}>
              {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>

            <div className={`flex-1 p-3.5 rounded-2xl border transition ${
              isDone ? 'bg-emerald-50/40 border-emerald-100 text-slate-800' : 'bg-slate-50/50 border-slate-100 text-slate-500'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isDone ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-bold ${isDone ? 'text-slate-800' : 'text-slate-600'}`}>
                    Chặng {i + 1}: {st.title} ({sched.days[i]} ngày)
                  </span>
                </div>
                {to ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formatDateVN(from)} ➔ {formatDateVN(to)}
                  </span>
                ) : (
                  <span className="text-xs italic text-slate-400">Chưa có ngày</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">{st.desc}</p>
              {extraText[st.key] && (
                <div className="mt-2 text-xs font-medium text-blue-700 bg-blue-50/60 px-2.5 py-1 rounded-lg inline-block">
                  {extraText[st.key]}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

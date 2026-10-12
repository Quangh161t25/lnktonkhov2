import React from 'react';
import { 
  Ship, 
  Lightbulb, 
  PackageSearch, 
  ClipboardList, 
  RotateCw, 
  Download, 
  Plus 
} from 'lucide-react';

export function XnkHeaderNav({
  activeKey,
  onNavigate,
  onRefresh,
  onExportExcel,
  onAddNew,
  addButtonLabel,
  isLoading = false,
  counts = { ytuong: 0, mau: 0, donhang: 0 }
}) {
  const navTabs = [
    { key: 'xnk', label: '📊 Tổng quan XNK', icon: Ship, count: null },
    { key: 'xnk_ytuong', label: '💡 Ý tưởng sản phẩm', icon: Lightbulb, count: counts.ytuong },
    { key: 'xnk_mau', label: '📦 Đặt mẫu & NCC', icon: PackageSearch, count: counts.mau },
    { key: 'xnk_donhang', label: '🛒 Đơn hàng PO', icon: ClipboardList, count: counts.donhang }
  ];

  return (
    <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200 mb-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Module Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Phân Hệ Xuất Nhập Khẩu (XNK)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                LNK Procurement
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Quy trình khép kín: Ý tưởng ➔ Đặt mẫu thử & NCC ➔ Đặt hàng PO ➔ Theo dõi 5 chặng tiến độ
            </p>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Tải lại dữ liệu Google Sheets"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          )}

          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất Excel
            </button>
          )}

          {onAddNew && (
            <button
              onClick={onAddNew}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              {addButtonLabel || 'Thêm mới'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {navTabs.map((tab) => {
          const isActive = activeKey === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onNavigate(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

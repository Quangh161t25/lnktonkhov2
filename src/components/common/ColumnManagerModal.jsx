import React, { useState } from 'react';
import { 
  X, 
  Eye, 
  EyeOff, 
  ChevronUp, 
  ChevronDown, 
  RotateCcw, 
  SlidersHorizontal, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  GripVertical,
  Search,
  CheckCheck,
  EyeClosed
} from 'lucide-react';

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Trái', icon: AlignLeft },
  { value: 'center', label: 'Giữa', icon: AlignCenter },
  { value: 'right', label: 'Phải', icon: AlignRight }
];

const FORMAT_OPTIONS = [
  { value: 'default', label: 'Mặc định' },
  { value: 'bold', label: 'Chữ đậm' },
  { value: 'uppercase', label: 'VIẾT HOA' },
  { value: 'number', label: 'Số phân cách (1,000)' },
  { value: 'currency', label: 'Tiền tệ (₫)' },
  { value: 'date', label: 'Ngày tháng (VN)' },
  { value: 'badge', label: 'Badge nổi bật' }
];

const WIDTH_PRESETS = [
  { label: '80', value: 80 },
  { label: '140', value: 140 },
  { label: '220', value: 220 },
  { label: '320', value: 320 }
];

export function ColumnManagerModal({ 
  isOpen, 
  onClose, 
  columns = [], 
  toggleVisibility, 
  onToggleVisibility,
  updateColumnProp, 
  onUpdateProp,
  moveColumn, 
  onMoveColumn,
  reorderColumns,
  onReorder,
  setAllVisibility,
  resetToDefault,
  onReset,
  moduleTitle 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'visible' | 'hidden'
  const [draggedKey, setDraggedKey] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null);

  const actualToggle = toggleVisibility || onToggleVisibility;
  const actualUpdateProp = updateColumnProp || onUpdateProp;
  const actualMoveColumn = moveColumn || onMoveColumn;
  const actualReorder = reorderColumns || onReorder;
  const actualReset = resetToDefault || onReset;

  if (!isOpen) return null;

  // Filter columns based on search and status
  const filteredColumns = columns.filter(c => {
    const matchesSearch = (c.label || '').toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      (c.key || '').toLowerCase().includes(searchTerm.toLowerCase().trim());
    
    if (!matchesSearch) return false;

    const isVis = c.visible !== false;
    if (statusFilter === 'visible') return isVis;
    if (statusFilter === 'hidden') return !isVis;
    return true;
  });

  const visibleCount = columns.filter(c => c.visible !== false).length;
  const hiddenCount = columns.length - visibleCount;

  // Drag and Drop handlers
  const handleDragStart = (e, key) => {
    setDraggedKey(key);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
  };

  const handleDragOver = (e, key) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverKey !== key) {
      setDragOverKey(key);
    }
  };

  const handleDrop = (e, targetKey) => {
    e.preventDefault();
    if (!draggedKey || draggedKey === targetKey) {
      setDraggedKey(null);
      setDragOverKey(null);
      return;
    }

    if (actualReorder) {
      actualReorder(draggedKey, targetKey);
    } else if (actualMoveColumn) {
      const sourceIdx = columns.findIndex(c => c.key === draggedKey);
      const targetIdx = columns.findIndex(c => c.key === targetKey);
      if (sourceIdx !== -1 && targetIdx !== -1) {
        const direction = targetIdx > sourceIdx ? 'down' : 'up';
        actualMoveColumn(draggedKey, direction);
      }
    }

    setDraggedKey(null);
    setDragOverKey(null);
  };

  const handleDragEnd = () => {
    setDraggedKey(null);
    setDragOverKey(null);
  };

  const handleBatchVisibility = (targetVisible) => {
    if (setAllVisibility) {
      setAllVisibility(targetVisible);
    } else if (actualToggle) {
      columns.forEach(c => {
        const isCurrentVis = c.visible !== false;
        if (isCurrentVis !== targetVisible) {
          actualToggle(c.key);
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Tùy chỉnh cột bảng dữ liệu {moduleTitle ? `• ${moduleTitle}` : ''}
              </h3>
              <p className="text-xs text-slate-500">
                Kéo thả biểu tượng <span className="font-bold text-blue-600">⠿</span> để đổi thứ tự, bật/tắt hiển thị, chỉnh độ rộng, căn lề và định dạng trực tiếp
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm cột theo tên hoặc mã khóa..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Quick Filter Status */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'all' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({columns.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('visible')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'visible' 
                  ? 'bg-white text-emerald-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đang hiện ({visibleCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('hidden')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'hidden' 
                  ? 'bg-white text-rose-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đang ẩn ({hiddenCount})
            </button>
          </div>

          {/* Batch Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleBatchVisibility(true)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition flex items-center gap-1 cursor-pointer"
              title="Hiển thị tất cả các cột"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hiện hết</span>
            </button>
            <button
              type="button"
              onClick={() => handleBatchVisibility(false)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-rose-600 transition flex items-center gap-1 cursor-pointer"
              title="Ẩn tất cả các cột"
            >
              <EyeClosed className="w-3.5 h-3.5 text-rose-500" />
              <span>Ẩn hết</span>
            </button>
          </div>
        </div>

        {/* Content Body: All-in-One Draggable Table */}
        <div className="flex-1 overflow-y-auto p-6 text-xs bg-slate-50/50">
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 w-14 text-center">Thứ tự</th>
                  <th className="py-2.5 px-3 w-28 text-center">Hiển thị</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Tên cột</th>
                  <th className="py-2.5 px-3 w-48">Độ rộng cột</th>
                  <th className="py-2.5 px-3 w-36 text-center">Căn lề</th>
                  <th className="py-2.5 px-3 min-w-[170px]">Định dạng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredColumns.map((col, index) => {
                  const isVisible = col.visible !== false;
                  const isDragged = draggedKey === col.key;
                  const isOver = dragOverKey === col.key;
                  const originalIndex = columns.findIndex(c => c.key === col.key);
                  const isFirst = originalIndex === 0;
                  const isLast = originalIndex === columns.length - 1;

                  return (
                    <tr
                      key={col.key}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, col.key)}
                      onDragOver={(e) => handleDragOver(e, col.key)}
                      onDrop={(e) => handleDrop(e, col.key)}
                      onDragEnd={handleDragEnd}
                      className={`transition-all duration-150 ${
                        isDragged ? 'opacity-30 bg-blue-50 scale-[0.99]' : ''
                      } ${
                        isOver && !isDragged ? 'bg-blue-50/80 border-t-2 border-t-blue-500 shadow-sm' : ''
                      } ${
                        !isVisible ? 'bg-slate-50/70 opacity-60' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* 1. Drag Handle & Order Controls */}
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <div 
                            className="p-1 text-slate-400 hover:text-blue-600 cursor-grab active:cursor-grabbing hover:bg-slate-100 rounded transition"
                            title="Nhấp giữ và kéo thả để đổi thứ tự cột"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col -space-y-1">
                            <button
                              type="button"
                              onClick={() => actualMoveColumn && actualMoveColumn(col.key, 'up')}
                              disabled={isFirst}
                              className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition cursor-pointer"
                              title="Chuyển lên trên"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => actualMoveColumn && actualMoveColumn(col.key, 'down')}
                              disabled={isLast}
                              className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition cursor-pointer"
                              title="Chuyển xuống dưới"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* 2. Visibility Toggle */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => actualToggle && actualToggle(col.key)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold text-xs transition cursor-pointer ${
                            isVisible
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                          }`}
                          title={isVisible ? "Bấm để ẩn cột này khỏi bảng" : "Bấm để hiện cột này trên bảng"}
                        >
                          {isVisible ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{isVisible ? 'Hiện' : 'Ẩn'}</span>
                        </button>
                      </td>

                      {/* 3. Column Title & Key */}
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-800 text-xs">
                          {col.label}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          key: {col.key}
                        </div>
                      </td>

                      {/* 4. Width (Input + Quick Presets) */}
                      <td className="py-2 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="50"
                              max="600"
                              step="5"
                              value={col.width || ''}
                              placeholder="Tự động"
                              onChange={(e) => actualUpdateProp && actualUpdateProp(col.key, 'width', e.target.value ? Number(e.target.value) : undefined)}
                              className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none text-right bg-white"
                            />
                            <span className="text-[11px] font-semibold text-slate-400">px</span>
                            {col.width && (
                              <button
                                type="button"
                                onClick={() => actualUpdateProp && actualUpdateProp(col.key, 'width', undefined)}
                                className="text-[10px] text-slate-400 hover:text-red-500 underline ml-1 cursor-pointer"
                                title="Đặt lại về tự động"
                              >
                                Auto
                              </button>
                            )}
                          </div>
                          {/* Quick Width Presets */}
                          <div className="flex items-center gap-1">
                            {WIDTH_PRESETS.map(preset => (
                              <button
                                key={preset.value}
                                type="button"
                                onClick={() => actualUpdateProp && actualUpdateProp(col.key, 'width', preset.value)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                                  col.width === preset.value
                                    ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* 5. Align (Left / Center / Right) */}
                      <td className="py-2 px-2 text-center">
                        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                          {ALIGN_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            const isSelected = (col.align || 'left') === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => actualUpdateProp && actualUpdateProp(col.key, 'align', opt.value)}
                                className={`p-1.5 rounded-md transition cursor-pointer ${
                                  isSelected 
                                    ? 'bg-blue-600 text-white shadow-xs font-bold' 
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                                title={`Căn ${opt.label.toLowerCase()}`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* 6. Formatting Dropdown */}
                      <td className="py-2 px-3">
                        <select
                          value={col.format || 'default'}
                          onChange={(e) => actualUpdateProp && actualUpdateProp(col.key, 'format', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                          {FORMAT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Khôi phục tất cả cài đặt cột về mặc định ban đầu?")) {
                if (actualReset) actualReset();
              }
            }}
            className="px-3 py-2 text-slate-600 hover:text-red-600 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Khôi phục mặc định</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Đang hiển thị <strong className="text-blue-600 font-extrabold">{visibleCount}</strong> / {columns.length} cột
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 shadow-sm transition cursor-pointer"
            >
              Hoàn tất & Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

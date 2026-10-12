import React, { useState, useEffect, useCallback } from 'react';
import { X, Minimize2, Square, Maximize2 } from 'lucide-react';

export function Drawer({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth,
  width,
  contentClassName = 'flex-1 overflow-y-auto p-6 space-y-4',
  confirmOnClose = false,
  confirmMessage = 'Bạn có chắc chắn muốn hủy bỏ? Các thông tin đang nhập sẽ không được lưu.'
}) {
  const [drawerSize, setDrawerSize] = useState('medium'); // 'small' | 'medium' | 'full'

  const handleRequestClose = useCallback(() => {
    if (confirmOnClose) {
      if (window.confirm(confirmMessage)) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [confirmOnClose, confirmMessage, onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleRequestClose]);

  if (!isOpen) return null;

  const defaultWidth = (width || maxWidth || 'max-w-3xl').trim();

  let resolvedWidthClass = defaultWidth.includes('w-') ? defaultWidth : `w-full ${defaultWidth}`;
  if (drawerSize === 'small') {
    resolvedWidthClass = 'w-full max-w-xl';
  } else if (drawerSize === 'full') {
    resolvedWidthClass = 'w-full max-w-[96vw]';
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleRequestClose}
      />

      {/* Panel */}
      <div
        className={`relative ${resolvedWidthClass} bg-white shadow-2xl z-10 flex flex-col h-full transform transition-all duration-300 ease-in-out`}
      >
        {/* Header */}
        <div className="h-16 px-5 sm:px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          <h3 className="font-bold text-slate-800 text-base truncate pr-2">{title}</h3>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 3 Size Control Buttons: Nhỏ lại - Vừa - Mở rộng */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-200 shadow-2xs mr-1">
              <button
                type="button"
                onClick={() => setDrawerSize('small')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  drawerSize === 'small'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Nhỏ lại (Giao diện nhỏ gọn)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Nhỏ</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerSize('medium')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  drawerSize === 'medium'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vừa (Kích thước tiêu chuẩn)"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Vừa</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerSize('full')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  drawerSize === 'full'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Mở rộng (Toàn màn hình)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Mở rộng</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleRequestClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition cursor-pointer"
              title="Đóng / Hủy"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`min-h-0 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}


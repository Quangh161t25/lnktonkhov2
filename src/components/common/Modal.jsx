import React, { useState, useEffect, useCallback } from 'react';
import { X, Minimize2, Square, Maximize2 } from 'lucide-react';

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'max-w-xl',
  confirmOnClose = false,
  confirmMessage = 'Bạn có chắc chắn muốn hủy bỏ? Các thông tin đang nhập sẽ không được lưu.'
}) {
  const [modalSize, setModalSize] = useState('medium'); // 'small' | 'medium' | 'full'

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

  let resolvedWidthClass = maxWidth;
  let resolvedHeightClass = 'max-h-[90vh]';
  if (modalSize === 'small') {
    resolvedWidthClass = 'max-w-lg';
    resolvedHeightClass = 'max-h-[85vh]';
  } else if (modalSize === 'full') {
    resolvedWidthClass = 'max-w-[96vw] w-[96vw]';
    resolvedHeightClass = 'h-[94vh] max-h-[94vh]';
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={handleRequestClose}
      />

      {/* Modal Card */}
      <div
        className={`relative w-full ${resolvedWidthClass} ${resolvedHeightClass} bg-white rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col border border-slate-100 transition-all duration-300 animate-in fade-in zoom-in duration-200`}
      >
        {/* Header */}
        <div className="h-14 px-5 sm:px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <h3 className="font-bold text-slate-800 text-sm md:text-base truncate pr-2">{title}</h3>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 3 Size Control Buttons: Nhỏ lại - Vừa - Mở rộng */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-200 shadow-2xs mr-1">
              <button
                type="button"
                onClick={() => setModalSize('small')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  modalSize === 'small'
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
                onClick={() => setModalSize('medium')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  modalSize === 'medium'
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
                onClick={() => setModalSize('full')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  modalSize === 'full'
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
              type="button"
              onClick={handleRequestClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition cursor-pointer"
              title="Đóng / Hủy"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

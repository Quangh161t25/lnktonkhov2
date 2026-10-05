import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

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

  const effectiveWidth = (width || maxWidth || 'max-w-2xl').trim();
  const widthClasses = effectiveWidth.includes('w-') ? effectiveWidth : `w-full ${effectiveWidth}`;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleRequestClose}
      />

      {/* Panel */}
      <div
        className={`relative ${widthClasses} bg-white shadow-2xl z-10 flex flex-col h-full transform transition-transform duration-300 ease-in-out`}
      >
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          <button
            type="button"
            onClick={handleRequestClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition cursor-pointer"
            title="Đóng / Hủy"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className={`min-h-0 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}


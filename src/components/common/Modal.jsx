import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'max-w-xl',
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={handleRequestClose}
      />

      {/* Modal Card */}
      <div
        className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 animate-in fade-in zoom-in duration-200`}
      >
        {/* Header */}
        <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <h3 className="font-bold text-slate-800 text-sm md:text-base">{title}</h3>
          <button
            type="button"
            onClick={handleRequestClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition cursor-pointer"
            title="Đóng / Hủy"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}


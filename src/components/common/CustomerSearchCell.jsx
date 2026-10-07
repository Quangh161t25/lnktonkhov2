import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { removeVietnameseTones } from '../../utils/formatters';
import { UserCheck, Building, Search, X, Check } from 'lucide-react';

function cleanStr(s) {
  if (!s) return '';
  return s
    .toString()
    .replace(/\u00a0/g, ' ')
    .trim()
    .normalize('NFC');
}

export function CustomerSearchCell({
  value = '',
  selectedCode = '',
  onChange,
  onSelectCustomer,
  customerList = [],
  placeholder = "Chọn hoặc tìm tên khách / NPP...",
  className = "",
  mode = "customer", // "customer" or "supplier"
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 380 });
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter customers based on search query
  const filteredList = useMemo(() => {
    if (!customerList || customerList.length === 0) return [];

    const rawQ = cleanStr(value);
    if (!rawQ) {
      return customerList.slice(0, 40);
    }

    const qLower = rawQ.toLowerCase();
    const qNoTone = removeVietnameseTones(qLower);
    const tokens = qNoTone.split(/[\s\-_,.]+/).filter(Boolean);

    const matches = [];

    // 1. Exact or prefix match on ID
    for (let i = 0; i < customerList.length; i++) {
      const c = customerList[i];
      const idLower = cleanStr(c.id).toLowerCase();
      if (idLower === qLower || idLower.startsWith(qLower)) {
        matches.push(c);
        if (matches.length >= 40) return matches;
      }
    }

    // 2. Prefix or contains match on Name
    for (let i = 0; i < customerList.length; i++) {
      const c = customerList[i];
      if (matches.some(m => m.id === c.id)) continue;

      const nameLower = cleanStr(c.name).toLowerCase();
      const nameNoTone = removeVietnameseTones(nameLower);
      const idLower = cleanStr(c.id).toLowerCase();
      const idNoTone = removeVietnameseTones(idLower);

      if (nameLower.startsWith(qLower) || nameNoTone.startsWith(qNoTone)) {
        matches.push(c);
        if (matches.length >= 40) return matches;
      } else if (nameLower.includes(qLower) || nameNoTone.includes(qNoTone) || idLower.includes(qLower)) {
        matches.push(c);
        if (matches.length >= 40) return matches;
      } else if (tokens.length > 0) {
        const allTokens = tokens.every(t => idNoTone.includes(t) || nameNoTone.includes(t));
        if (allTokens) {
          matches.push(c);
          if (matches.length >= 40) return matches;
        }
      }
    }

    return matches;
  }, [value, customerList]);

  // Floating dropdown position calculator
  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const dropdownHeight = 280;
    const dropdownWidth = Math.max(rect.width, 360);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + 4;
    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      top = Math.max(8, rect.top - dropdownHeight - 4);
    }

    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - dropdownWidth - 12);
    }

    setDropdownPos({
      top,
      left,
      width: dropdownWidth
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, updatePosition]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer) => {
    if (!customer) return;
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    } else if (onChange) {
      onChange(customer.name || customer.id);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      updatePosition();
      return;
    }

    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex(prev => (prev + 1) % (filteredList.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex(prev => (prev - 1 + (filteredList.length || 1)) % (filteredList.length || 1));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredList[highlightIndex]) {
          e.preventDefault();
          handleSelect(filteredList[highlightIndex]);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) onChange('');
    if (onSelectCustomer) onSelectCustomer({ id: '', name: '', type: '' });
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={value}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setHighlightIndex(0);
              updatePosition();
            }
          }}
          onChange={(e) => {
            const val = e.target.value;
            if (onChange) onChange(val);
            setIsOpen(true);
            setHighlightIndex(0);
            updatePosition();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={className || "w-full pl-2.5 pr-8 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50"}
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition"
            title="Xóa lựa chọn"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && !disabled && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            zIndex: 99999
          }}
          className="max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50/90 flex justify-between items-center sticky top-0 z-10 border-b border-slate-100">
            <span>
              {mode === 'supplier' ? 'Gợi ý Nhà Cung Cấp' : 'Gợi ý Khách hàng / NPP'} ({filteredList.length})
            </span>
            <span className="text-[10px] text-slate-400">Nhấp để chọn</span>
          </div>

          {filteredList.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-400 text-center italic">
              Không tìm thấy {mode === 'supplier' ? 'NCC' : 'khách hàng'} phù hợp với "{value}"
            </div>
          ) : (
            filteredList.map((c, idx) => {
              const isHighlighted = idx === highlightIndex;
              const isSelected = selectedCode && c.id && c.id.toLowerCase() === selectedCode.toLowerCase();

              return (
                <div
                  key={(c.id || '') + '-' + idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(c);
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={`px-3 py-2 cursor-pointer text-xs transition-colors flex items-center gap-2 ${
                    isHighlighted
                      ? 'bg-blue-50/70 text-slate-900 border-l-2 border-blue-600 pl-2.5'
                      : isSelected
                        ? 'bg-slate-50 text-slate-900 font-medium'
                        : 'hover:bg-slate-50/80 text-slate-700'
                  }`}
                >
                  {/* Mã khách hàng - 1 hàng ngang, màu nhẹ nhàng */}
                  <span className={`shrink-0 font-mono text-[11px] px-1.5 py-0.5 rounded border ${
                    isHighlighted
                      ? 'bg-blue-100/70 text-blue-700 border-blue-200/80 font-semibold'
                      : 'bg-slate-100 text-slate-600 border-slate-200/60 font-medium'
                  }`}>
                    {c.id || 'KH'}
                  </span>

                  {/* Tên khách hàng - nằm cùng 1 hàng */}
                  <span className="truncate flex-1 text-xs text-slate-800">
                    {c.name || c.id}
                  </span>

                  {/* Loại khách / NPP - mờ nhạt bên phải */}
                  {c.type && (
                    <span className="shrink-0 text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      {c.type}
                    </span>
                  )}

                  {/* Checkmark nếu đang chọn */}
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

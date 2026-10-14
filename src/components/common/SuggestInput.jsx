import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { removeVietnameseTones } from '../../utils/formatters';

/**
 * Ô nhập có gợi ý xổ xuống (giống ProductSearchCell) cho danh sách bất kỳ.
 *
 * items: [{ key, title, subtitle?, extra? }]
 *
 * 2 chế độ:
 *  - Tự nhập (truyền `onChange`): giá trị là chuỗi `value`, gõ tự do, chọn gợi ý -> onSelect(item).
 *  - Chọn theo mã (không truyền `onChange`): `value` là key đang chọn, ô hiển thị title của item,
 *    gõ để lọc, chọn -> onSelect(item), bấm X -> onSelect(null).
 */
export function SuggestInput({
  value = '',
  onChange,
  onSelect,
  items = [],
  placeholder = 'Gõ để tìm...',
  headerLabel = 'Gợi ý',
  className = '',
  maxResults = 50
}) {
  const isFreeText = typeof onChange === 'function';
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 360 });
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const selectedItem = !isFreeText && value ? items.find(it => it.key === value) : null;
  const searchText = isFreeText ? value : query;
  const displayText = isFreeText
    ? value
    : (isOpen ? query : (selectedItem ? selectedItem.title : (value || '')));

  const filtered = useMemo(() => {
    const q = removeVietnameseTones((searchText || '').trim());
    if (!q) return items.slice(0, maxResults);
    const tokens = q.split(/\s+/).filter(Boolean);
    const result = [];
    for (const it of items) {
      const hay = removeVietnameseTones(`${it.key} ${it.title} ${it.subtitle || ''} ${it.extra || ''}`);
      if (tokens.every(t => hay.includes(t))) {
        result.push(it);
        if (result.length >= maxResults) break;
      }
    }
    return result;
  }, [searchText, items, maxResults]);

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const dropdownHeight = 260;
    const width = Math.max(rect.width, 320);
    let top = rect.bottom + 4;
    if (window.innerHeight - rect.bottom < dropdownHeight && rect.top > window.innerHeight - rect.bottom) {
      top = Math.max(8, rect.top - dropdownHeight - 4);
    }
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }
    setDropdownPos({ top, left, width });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(e.target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const open = () => {
    setIsOpen(true);
    setHighlightIndex(0);
    updatePosition();
  };

  const handleSelect = (item) => {
    if (!item) return;
    if (onSelect) onSelect(item);
    else if (isFreeText) onChange(item.title);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      open();
      return;
    }
    if (!isOpen) return;
    const n = filtered.length || 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => (prev + 1) % n);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => (prev - 1 + n) % n);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filtered[highlightIndex]) {
        e.preventDefault();
        handleSelect(filtered[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const showClear = !!value;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={displayText}
        onFocus={() => {
          if (!isFreeText) setQuery('');
          open();
        }}
        onChange={(e) => {
          if (isFreeText) onChange(e.target.value);
          else setQuery(e.target.value);
          open();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${className || 'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none'} ${showClear ? 'pr-8' : ''}`}
      />
      {showClear && (
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            if (isFreeText) onChange('');
            else if (onSelect) onSelect(null);
            setQuery('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50"
          title="Xóa lựa chọn"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            zIndex: 99999
          }}
          className="max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl py-1 divide-y divide-slate-100 ring-1 ring-black/10"
        >
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
            {headerLabel} ({filtered.length})
          </div>

          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-400 text-center italic">
              {isFreeText && value
                ? `Không có trong danh sách — sẽ dùng "${value}"`
                : `Không tìm thấy kết quả phù hợp${searchText ? ` với "${searchText}"` : ''}`}
            </div>
          ) : (
            filtered.map((it, idx) => {
              const isHighlighted = idx === highlightIndex;
              return (
                <div
                  key={it.key + '-' + idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(it);
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={`px-3 py-2 cursor-pointer text-xs transition flex items-center justify-between gap-2 ${
                    isHighlighted ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className={`font-bold truncate ${isHighlighted ? 'text-white' : 'text-slate-800'}`}>
                      {it.title}
                    </div>
                    {it.subtitle && (
                      <div className={`text-[11px] truncate ${isHighlighted ? 'text-blue-100' : 'text-slate-500'}`}>
                        {it.subtitle}
                      </div>
                    )}
                  </div>
                  {it.extra && (
                    <div className={`text-[11px] font-bold whitespace-nowrap ${isHighlighted ? 'text-white' : 'text-emerald-700'}`}>
                      {it.extra}
                    </div>
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

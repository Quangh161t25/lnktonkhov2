import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency } from '../../utils/formatters';

// Helper to remove Vietnamese accents for fuzzy searching
function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function ProductSearchCell({
  value = '',
  onChange,
  onSelectProduct,
  productList = [],
  placeholder = "Mã SP...",
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 360 });
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!productList || productList.length === 0) return [];
    
    const rawQ = (value || '').trim();
    if (!rawQ) {
      return productList.slice(0, 30);
    }

    // Clean query: remove " - " if it came from preselected format
    const q = rawQ.includes(' - ') ? rawQ.split(' - ')[0].trim() : rawQ;
    const qLower = q.toLowerCase();
    const qUnaccent = removeVietnameseTones(q);
    const tokens = qUnaccent.split(/\s+/).filter(Boolean);

    const matches = [];

    // 1. Prefix or exact match on ID
    for (let i = 0; i < productList.length; i++) {
      const p = productList[i];
      const idLower = (p.id || '').toLowerCase();
      if (idLower === qLower || idLower.startsWith(qLower)) {
        matches.push(p);
        if (matches.length >= 30) return matches;
      }
    }

    // 2. Contains query in ID or Name (with tone-insensitive matching)
    for (let i = 0; i < productList.length; i++) {
      const p = productList[i];
      const idLower = (p.id || '').toLowerCase();
      if (!idLower.startsWith(qLower)) {
        const idUnaccent = removeVietnameseTones(p.id || '');
        const nameUnaccent = removeVietnameseTones(p.name || '');
        
        const allTokensMatch = tokens.every(tok => 
          idUnaccent.includes(tok) || nameUnaccent.includes(tok)
        );

        if (allTokensMatch) {
          matches.push(p);
          if (matches.length >= 30) return matches;
        }
      }
    }

    return matches;
  }, [value, productList]);

  // Recalculate floating dropdown position
  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const dropdownHeight = 260;
    const dropdownWidth = Math.max(rect.width, 380);
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

  const handleSelect = (product) => {
    if (!product) return;
    if (onSelectProduct) {
      onSelectProduct(product);
    } else if (onChange) {
      onChange(product.id);
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
        setHighlightIndex(prev => (prev + 1) % (filteredProducts.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex(prev => (prev - 1 + (filteredProducts.length || 1)) % (filteredProducts.length || 1));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredProducts[highlightIndex]) {
          e.preventDefault();
          handleSelect(filteredProducts[highlightIndex]);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onFocus={() => {
          setIsOpen(true);
          setHighlightIndex(0);
          updatePosition();
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightIndex(0);
          updatePosition();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className || "w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-bold text-slate-800 uppercase focus:ring-1 focus:ring-blue-500 outline-none bg-white"}
      />

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
          className="max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl py-1 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/10"
        >
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase bg-slate-50 flex justify-between items-center sticky top-0 z-10 border-b border-slate-100">
            <span>Gợi ý ({filteredProducts.length} sản phẩm)</span>
            <span className="text-[10px] text-slate-400 font-normal">Giá niêm yết</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-400 text-center italic">
              Không tìm thấy sản phẩm phù hợp với "{value}"
            </div>
          ) : (
            filteredProducts.map((p, idx) => {
              const isHighlighted = idx === highlightIndex;
              return (
                <div
                  key={p.id + '-' + idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(p);
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={`px-3 py-2 cursor-pointer text-xs transition flex items-center justify-between gap-2 ${
                    isHighlighted ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <span className={isHighlighted ? 'text-white' : 'text-blue-700 font-extrabold'}>
                        {p.id}
                      </span>
                    </div>
                    <div className={`text-[11px] truncate ${isHighlighted ? 'text-blue-100' : 'text-slate-500'}`}>
                      {p.name}
                    </div>
                  </div>
                  {p.price > 0 && (
                    <div className={`text-[11px] font-bold whitespace-nowrap ${isHighlighted ? 'text-white' : 'text-emerald-700'}`}>
                      {formatCurrency(p.price)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>,
        document.body
      )}
    </>
  );
}

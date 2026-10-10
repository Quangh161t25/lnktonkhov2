import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';
import { ProductSearchCell } from '../../common/ProductSearchCell';
import { useData } from '../../../context/DataContext';
import { cleanNumber } from '../../../utils/formatters';

export function DoisoatDrawer({ isOpen, onClose, editRow = null, onSaved }) {
  const { productData, warehouseProductData, getProductMap } = useData();

  const [idSp, setIdSp] = useState('');
  const [tenSp, setTenSp] = useState('');
  const [tonMisa, setTonMisa] = useState(0);
  const [initialSnapshot, setInitialSnapshot] = useState('');

  const productMap = useMemo(() => getProductMap(), [getProductMap]);

  const productList = useMemo(() => {
    const map = new Map();
    (productData || []).slice(1).forEach(r => {
      const id = (r[0] || '').toString().trim();
      if (id) {
        map.set(id.toLowerCase(), {
          id,
          name: (r[1] || '').toString().trim(),
          price: cleanNumber(r[4]) || 0
        });
      }
    });
    (warehouseProductData || []).slice(1).forEach(r => {
      const id = (r[2] || '').toString().trim();
      if (id && !map.has(id.toLowerCase())) {
        map.set(id.toLowerCase(), {
          id,
          name: (r[3] || '').toString().trim(),
          price: 0
        });
      }
    });
    return Array.from(map.values());
  }, [productData, warehouseProductData]);

  useEffect(() => {
    if (editRow) {
      const loadedIdSp = editRow[0] || '';
      const loadedTenSp = editRow[1] || '';
      const loadedTonMisa = cleanNumber(editRow[2]) || 0;

      setIdSp(loadedIdSp);
      setTenSp(loadedTenSp);
      setTonMisa(loadedTonMisa);

      setInitialSnapshot(JSON.stringify({
        idSp: loadedIdSp,
        tenSp: loadedTenSp,
        tonMisa: loadedTonMisa
      }));
    } else {
      setIdSp('');
      setTenSp('');
      setTonMisa(0);

      setInitialSnapshot(JSON.stringify({
        idSp: '',
        tenSp: '',
        tonMisa: 0
      }));
    }
  }, [editRow, isOpen]);

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      idSp,
      tenSp,
      tonMisa
    });
  }, [idSp, tenSp, tonMisa]);

  const isDirty = initialSnapshot !== '' && currentSnapshot !== initialSnapshot;

  const handleProductSelect = (product) => {
    if (!product) return;
    setIdSp(product.id);
    setTenSp(product.name);
  };

  const handleProductChange = (val) => {
    const rawVal = (val || '').trim();
    const targetId = rawVal.includes(' - ') ? rawVal.split(' - ')[0].trim() : rawVal;
    setIdSp(targetId);
    const found = productMap.get(targetId.toLowerCase());
    if (found) setTenSp(found.name);
  };

  const handleSave = () => {
    if (!idSp.trim()) return alert('Vui lòng chọn Mã sản phẩm!');

    const rowToSave = [
      idSp.trim().toUpperCase(),
      tenSp.trim(),
      tonMisa
    ];

    onSaved([rowToSave], editRow?._sheetRow);
    onClose();
  };

  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm('Bạn có chắc chắn muốn hủy bỏ? Các thông tin đang nhập sẽ không được lưu.')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      confirmOnClose={isDirty}
      title={editRow ? "Cập nhật tồn kho MISA" : "Thêm bản ghi đối soát MISA"}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mã sản phẩm (ID SP)</label>
          {editRow ? (
            <input
              type="text"
              value={idSp}
              readOnly
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold uppercase bg-slate-50 text-slate-500 cursor-not-allowed outline-none"
            />
          ) : (
            <ProductSearchCell
              value={idSp}
              onChange={(val) => handleProductChange(val)}
              onSelectProduct={(prod) => handleProductSelect(prod)}
              productList={productList}
              placeholder="TK-0348"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-rose-500 outline-none"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tên sản phẩm</label>
          <input
            type="text"
            value={tenSp}
            readOnly
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-500 font-medium cursor-not-allowed outline-none"
          />
          <p className="text-[10px] text-slate-400 mt-1 italic">
            * Cột Mã SP & Tên SP được đồng bộ tự động từ Danh mục SP (DS_SP). Bạn chỉ cần cập nhật Tồn theo MISA.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tồn kho theo phần mềm MISA</label>
          <input
            type="number"
            value={tonMisa}
            onChange={(e) => setTonMisa(cleanNumber(e.target.value))}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-rose-700 focus:ring-2 focus:ring-rose-500 outline-none text-right"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-[2] py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 shadow-sm transition"
          >
            Lưu số liệu MISA
          </button>
        </div>
      </div>
    </Drawer>
  );
}

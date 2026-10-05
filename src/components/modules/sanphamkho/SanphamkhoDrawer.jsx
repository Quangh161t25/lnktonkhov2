import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';
import { ProductSearchCell } from '../../common/ProductSearchCell';
import { useSettings } from '../../../context/SettingsContext';
import { useData } from '../../../context/DataContext';
import { cleanNumber } from '../../../utils/formatters';

export function SanphamkhoDrawer({ isOpen, onClose, editRow = null, onSaved }) {
  const { getWarehouseOptions, getDefaultWarehouse } = useSettings();
  const { productData, warehouseProductData, getProductMap } = useData();

  const [kho, setKho] = useState(getDefaultWarehouse());
  const [idSp, setIdSp] = useState('');
  const [tenSp, setTenSp] = useState('');
  const [tonDau, setTonDau] = useState(0);
  const [tonSau, setTonSau] = useState(0);
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
      const loadedKho = editRow[1] || getDefaultWarehouse();
      const loadedIdSp = editRow[2] || '';
      const loadedTenSp = editRow[3] || '';
      const loadedTonDau = cleanNumber(editRow[4]) || 0;
      const loadedTonSau = cleanNumber(editRow[5]) || 0;

      setKho(loadedKho);
      setIdSp(loadedIdSp);
      setTenSp(loadedTenSp);
      setTonDau(loadedTonDau);
      setTonSau(loadedTonSau);

      setInitialSnapshot(JSON.stringify({
        kho: loadedKho,
        idSp: loadedIdSp,
        tenSp: loadedTenSp,
        tonDau: loadedTonDau,
        tonSau: loadedTonSau
      }));
    } else {
      const defaultK = getDefaultWarehouse();
      setKho(defaultK);
      setIdSp('');
      setTenSp('');
      setTonDau(0);
      setTonSau(0);

      setInitialSnapshot(JSON.stringify({
        kho: defaultK,
        idSp: '',
        tenSp: '',
        tonDau: 0,
        tonSau: 0
      }));
    }
  }, [editRow, isOpen, getDefaultWarehouse]);

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      kho,
      idSp,
      tenSp,
      tonDau,
      tonSau
    });
  }, [kho, idSp, tenSp, tonDau, tonSau]);

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
      `${kho}|${idSp.trim().toUpperCase()}`,
      kho,
      idSp.trim().toUpperCase(),
      tenSp.trim(),
      tonDau,
      tonSau
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
      title={editRow ? "Cập nhật tồn sản phẩm theo kho" : "Thêm mới sản phẩm vào kho"}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Kho hàng</label>
          <select
            value={kho}
            onChange={(e) => setKho(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {getWarehouseOptions().map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mã sản phẩm (ID SP)</label>
            <ProductSearchCell
              value={idSp}
              onChange={(val) => handleProductChange(val)}
              onSelectProduct={(prod) => handleProductSelect(prod)}
              productList={productList}
              placeholder="TK-0348"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tên sản phẩm</label>
            <input
              type="text"
              value={tenSp}
              onChange={(e) => setTenSp(e.target.value)}
              placeholder="Tên sản phẩm..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tồn đầu kỳ</label>
            <input
              type="number"
              value={tonDau}
              onChange={(e) => setTonDau(cleanNumber(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tồn tối thiểu kho</label>
            <input
              type="number"
              value={tonSau}
              onChange={(e) => setTonSau(cleanNumber(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-right"
            />
          </div>
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
            className="flex-[2] py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 shadow-sm transition"
          >
            Lưu thông tin
          </button>
        </div>
      </div>
    </Drawer>
  );
}

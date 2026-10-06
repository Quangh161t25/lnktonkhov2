import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';
import { ProductSearchCell } from '../../common/ProductSearchCell';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { useData } from '../../../context/DataContext';
import { formatDateInput, generateRandomOrderId, cleanNumber } from '../../../utils/formatters';
import { Plus, Trash2 } from 'lucide-react';

export function ChuyenkhoDrawer({ isOpen, onClose, editRow = null, onSaved }) {
  const { getHiddenProductIds } = useAuth();
  const { getWarehouseOptions } = useSettings();
  const { productData, warehouseProductData, getProductMap, fetchModule } = useData();

  const [date, setDate] = useState(formatDateInput(new Date()));
  const [mdh, setMdh] = useState('');
  const [khoDi, setKhoDi] = useState('KHO 1');
  const [khoNhan, setKhoNhan] = useState('KHO 2');
  const [ghiChu, setGhiChu] = useState('');
  const [tinhTrang, setTinhTrang] = useState('Tốt');
  const [trangThai, setTrangThai] = useState('Đang chuyển');

  const [items, setItems] = useState([
    { idSp: '', tenSp: '', slg: 1 }
  ]);

  const productMap = useMemo(() => getProductMap(), [getProductMap]);
  const warehouses = useMemo(() => getWarehouseOptions(), [getWarehouseOptions]);

  // Ensure essential suggestion datasets are loaded when drawer opens
  useEffect(() => {
    if (isOpen) {
      if (!productData || productData.length <= 1) fetchModule('sanpham');
      if (!warehouseProductData || warehouseProductData.length <= 1) fetchModule('sanphamkho');
    }
  }, [isOpen, productData, warehouseProductData, fetchModule]);

  const productList = useMemo(() => {
    const hiddenIds = new Set((getHiddenProductIds ? getHiddenProductIds() : []).map(id => (id || '').toString().trim().toUpperCase()));
    const map = new Map();

    (productData || []).slice(1).forEach(r => {
      const id = (r[0] || '').toString().trim();
      if (id && !hiddenIds.has(id.toUpperCase())) {
        map.set(id.toLowerCase(), {
          id,
          name: (r[1] || '').toString().trim(),
          price: cleanNumber(r[4]) || 0
        });
      }
    });

    (warehouseProductData || []).slice(1).forEach(r => {
      const id = (r[2] || '').toString().trim();
      if (id && !hiddenIds.has(id.toUpperCase()) && !map.has(id.toLowerCase())) {
        map.set(id.toLowerCase(), {
          id,
          name: (r[3] || '').toString().trim(),
          price: 0
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  }, [productData, warehouseProductData, getHiddenProductIds]);

  const [initialSnapshot, setInitialSnapshot] = useState('');

  useEffect(() => {
    if (editRow) {
      const loadedDate = formatDateInput(editRow[1]) || formatDateInput(new Date());
      const loadedMdh = editRow[2] || '';
      const loadedKhoDi = editRow[6] || warehouses[0] || 'KHO 1';
      const loadedKhoNhan = editRow[7] || warehouses[1] || 'KHO 2';
      const loadedGhiChu = editRow[8] || '';
      const loadedTinhTrang = editRow[9] || 'Tốt';
      const loadedTrangThai = editRow[10] || 'Đang chuyển';
      const loadedItems = [{
        idSp: editRow[3] || '',
        tenSp: editRow[4] || '',
        slg: cleanNumber(editRow[5]) || 1
      }];

      setDate(loadedDate);
      setMdh(loadedMdh);
      setKhoDi(loadedKhoDi);
      setKhoNhan(loadedKhoNhan);
      setGhiChu(loadedGhiChu);
      setTinhTrang(loadedTinhTrang);
      setTrangThai(loadedTrangThai);
      setItems(loadedItems);

      setInitialSnapshot(JSON.stringify({
        date: loadedDate,
        mdh: loadedMdh,
        khoDi: loadedKhoDi,
        khoNhan: loadedKhoNhan,
        ghiChu: loadedGhiChu,
        tinhTrang: loadedTinhTrang,
        trangThai: loadedTrangThai,
        items: loadedItems
      }));
    } else {
      const newDate = formatDateInput(new Date());
      const newMdh = generateRandomOrderId('CK');
      const newKhoDi = warehouses[0] || 'KHO 1';
      const newKhoNhan = warehouses[1] || 'KHO 2';
      const newItems = [{ idSp: '', tenSp: '', slg: 1 }];

      setDate(newDate);
      setMdh(newMdh);
      setKhoDi(newKhoDi);
      setKhoNhan(newKhoNhan);
      setGhiChu('');
      setTinhTrang('Tốt');
      setTrangThai('Đang chuyển');
      setItems(newItems);

      setInitialSnapshot(JSON.stringify({
        date: newDate,
        mdh: newMdh,
        khoDi: newKhoDi,
        khoNhan: newKhoNhan,
        ghiChu: '',
        tinhTrang: 'Tốt',
        trangThai: 'Đang chuyển',
        items: newItems
      }));
    }
  }, [editRow, isOpen, warehouses]);

  const handleProductSelect = (index, product) => {
    if (!product) return;
    const next = [...items];
    const item = next[index];
    item.idSp = product.id;
    item.tenSp = product.name;
    setItems(next);
  };

  const handleProductChange = (index, idSp) => {
    const next = [...items];
    const item = next[index];
    const rawVal = (idSp || '').trim();
    const targetId = rawVal.includes(' - ') ? rawVal.split(' - ')[0].trim() : rawVal;
    item.idSp = targetId;
    const found = productMap.get(targetId.toLowerCase());
    if (found) {
      item.tenSp = found.name;
    }
    setItems(next);
  };

  const handleQtyChange = (index, slg) => {
    const next = [...items];
    next[index].slg = cleanNumber(slg);
    setItems(next);
  };

  const addItemRow = () => {
    setItems([...items, { idSp: '', tenSp: '', slg: 1 }]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    if (!mdh.trim()) return alert('Vui lòng nhập Mã điều chuyển!');
    if (khoDi === khoNhan) return alert('Kho đi và Kho nhận không được trùng nhau!');
    const validItems = items.filter(it => it.idSp.trim());
    if (validItems.length === 0) return alert('Vui lòng nhập ít nhất 1 sản phẩm!');

    const rowsToSave = validItems.map(it => [
      editRow ? editRow[0] : `CK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date,
      mdh,
      it.idSp,
      it.tenSp,
      it.slg,
      khoDi,
      khoNhan,
      ghiChu,
      tinhTrang,
      trangThai
    ]);

    onSaved(rowsToSave, editRow?._sheetRow);
    onClose();
  };

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      date,
      mdh,
      khoDi,
      khoNhan,
      ghiChu,
      tinhTrang,
      trangThai,
      items
    });
  }, [date, mdh, khoDi, khoNhan, ghiChu, tinhTrang, trangThai, items]);

  const isDirty = initialSnapshot !== '' && currentSnapshot !== initialSnapshot;

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
      title={editRow ? "Chỉnh sửa điều chuyển kho" : "Thêm mới điều chuyển kho"}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ngày chuyển</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mã điều chuyển (MDH)</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={mdh}
                onChange={(e) => setMdh(e.target.value)}
                placeholder="CK123456"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setMdh(generateRandomOrderId('CK'))}
                className="px-2.5 py-1 bg-slate-100 text-slate-600 font-bold rounded-xl text-[10px] hover:bg-slate-200"
              >
                Tạo mã
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Kho đi (Xuất)</label>
            <select
              value={khoDi}
              onChange={(e) => setKhoDi(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-cyan-500 outline-none"
            >
              {warehouses.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Kho nhận (Nhập)</label>
            <select
              value={khoNhan}
              onChange={(e) => setKhoNhan(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-cyan-500 outline-none"
            >
              {warehouses.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tình trạng</label>
            <input
              type="text"
              value={tinhTrang}
              onChange={(e) => setTinhTrang(e.target.value)}
              placeholder="Tốt / Nguyên seal..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Trạng thái</label>
            <select
              value={trangThai}
              onChange={(e) => setTrangThai(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-cyan-500 outline-none"
            >
              <option value="Đang chuyển">Đang chuyển</option>
              <option value="Đã nhận">Đã nhận</option>
              <option value="Hoàn tất">Hoàn tất</option>
              <option value="Đã hủy">Đã hủy</option>
            </select>
          </div>
        </div>

        {/* Product items table */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase">Sản phẩm điều chuyển</h4>
            <button
              type="button"
              onClick={addItemRow}
              className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-lg text-xs font-bold hover:bg-cyan-100 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm dòng
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Mã SP</th>
                  <th className="p-2.5">Tên sản phẩm</th>
                  <th className="p-2.5 w-24">Số lượng</th>
                  <th className="p-2.5 w-10 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="p-2">
                      <ProductSearchCell
                        value={item.idSp}
                        onChange={(val) => handleProductChange(index, val)}
                        onSelectProduct={(prod) => handleProductSelect(index, prod)}
                        productList={productList}
                        placeholder="TK-0348"
                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold uppercase focus:ring-1 focus:ring-cyan-500 outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.tenSp}
                        onChange={(e) => {
                          const next = [...items];
                          next[index].tenSp = e.target.value;
                          setItems(next);
                        }}
                        placeholder="Tên sản phẩm..."
                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-cyan-500 outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        value={item.slg}
                        onChange={(e) => handleQtyChange(index, e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-cyan-700 focus:ring-1 focus:ring-cyan-500 outline-none text-center"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        disabled={items.length <= 1}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ghi chú</label>
          <input
            type="text"
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            placeholder="Nhập ghi chú điều chuyển kho..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
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
            className="flex-[2] py-2.5 bg-cyan-600 text-white font-bold rounded-xl text-xs hover:bg-cyan-700 shadow-sm transition"
          >
            Lưu điều chuyển
          </button>
        </div>
      </div>
    </Drawer>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';
import { ProductSearchCell } from '../../common/ProductSearchCell';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { formatDateInput, cleanNumber } from '../../../utils/formatters';

export function TonNppDrawer({ isOpen, onClose, editRow = null, onSaved }) {
  const { usersData } = useAuth();
  const { productData, warehouseProductData, getProductMap } = useData();

  const [date, setDate] = useState(formatDateInput(new Date()));
  const [maKh, setMaKh] = useState('');
  const [idSp, setIdSp] = useState('');
  const [tonCuoi, setTonCuoi] = useState(0);
  const [initialSnapshot, setInitialSnapshot] = useState('');

  const productMap = useMemo(() => getProductMap(), [getProductMap]);
  const customerList = useMemo(() => {
    return (usersData || []).filter(u => u.type?.includes('KHÁCH HÀNG') || u.role === 'NPP');
  }, [usersData]);

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
      const loadedDate = formatDateInput(editRow[1]) || formatDateInput(new Date());
      const loadedMaKh = editRow[2] || '';
      const loadedIdSp = editRow[3] || '';
      const loadedTonCuoi = cleanNumber(editRow[4]) || 0;

      setDate(loadedDate);
      setMaKh(loadedMaKh);
      setIdSp(loadedIdSp);
      setTonCuoi(loadedTonCuoi);

      setInitialSnapshot(JSON.stringify({
        date: loadedDate,
        maKh: loadedMaKh,
        idSp: loadedIdSp,
        tonCuoi: loadedTonCuoi
      }));
    } else {
      const defaultDate = formatDateInput(new Date());
      const defaultMaKh = customerList[0]?.id || '';

      setDate(defaultDate);
      setMaKh(defaultMaKh);
      setIdSp('');
      setTonCuoi(0);

      setInitialSnapshot(JSON.stringify({
        date: defaultDate,
        maKh: defaultMaKh,
        idSp: '',
        tonCuoi: 0
      }));
    }
  }, [editRow, isOpen, customerList]);

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      date,
      maKh,
      idSp,
      tonCuoi
    });
  }, [date, maKh, idSp, tonCuoi]);

  const isDirty = initialSnapshot !== '' && currentSnapshot !== initialSnapshot;

  const handleSave = () => {
    if (!maKh.trim()) return alert('Vui lòng chọn Mã Nhà Phân Phối (NPP)!');
    if (!idSp.trim()) return alert('Vui lòng chọn Mã sản phẩm!');

    const rowToSave = [
      editRow ? editRow[0] : `NPP-${Date.now()}`,
      date,
      maKh.trim(),
      idSp.trim().toUpperCase(),
      tonCuoi
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
      title={editRow ? "Cập nhật số liệu tồn NPP" : "Khai báo tồn kho Nhà Phân Phối"}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ngày chốt số liệu</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nhà Phân Phối (NPP)</label>
          <select
            value={maKh}
            onChange={(e) => setMaKh(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none"
          >
            <option value="">-- Chọn nhà phân phối --</option>
            {customerList.map(c => (
              <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mã sản phẩm (ID SP)</label>
          <ProductSearchCell
            value={idSp}
            onChange={(val) => setIdSp(val)}
            onSelectProduct={(p) => setIdSp(p.id)}
            productList={productList}
            placeholder="TK-0348"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Số lượng tồn kho tại NPP</label>
          <input
            type="number"
            min="0"
            value={tonCuoi}
            onChange={(e) => setTonCuoi(cleanNumber(e.target.value))}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-teal-700 focus:ring-2 focus:ring-teal-500 outline-none text-right"
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
            className="flex-[2] py-2.5 bg-teal-600 text-white font-bold rounded-xl text-xs hover:bg-teal-700 shadow-sm transition"
          >
            Lưu số liệu tồn
          </button>
        </div>
      </div>
    </Drawer>
  );
}

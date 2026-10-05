import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';
import { cleanNumber } from '../../../utils/formatters';

export function SanphamDrawer({ isOpen, onClose, editRow = null, onSaved }) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [image, setImage] = useState('');
  const [price, setPrice] = useState(0);
  const [note, setNote] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState('');

  useEffect(() => {
    if (editRow) {
      const loadedId = editRow[0] || '';
      const loadedName = editRow[1] || '';
      const loadedModel = editRow[2] || '';
      const loadedImage = editRow[3] || '';
      const loadedPrice = cleanNumber(editRow[4]) || 0;
      const loadedNote = editRow[5] || '';

      setId(loadedId);
      setName(loadedName);
      setModel(loadedModel);
      setImage(loadedImage);
      setPrice(loadedPrice);
      setNote(loadedNote);

      setInitialSnapshot(JSON.stringify({
        id: loadedId,
        name: loadedName,
        model: loadedModel,
        image: loadedImage,
        price: loadedPrice,
        note: loadedNote
      }));
    } else {
      setId('');
      setName('');
      setModel('');
      setImage('');
      setPrice(0);
      setNote('');

      setInitialSnapshot(JSON.stringify({
        id: '',
        name: '',
        model: '',
        image: '',
        price: 0,
        note: ''
      }));
    }
  }, [editRow, isOpen]);

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      id,
      name,
      model,
      image,
      price,
      note
    });
  }, [id, name, model, image, price, note]);

  const isDirty = initialSnapshot !== '' && currentSnapshot !== initialSnapshot;

  const handleSave = () => {
    if (!id.trim()) return alert('Vui lòng nhập Mã sản phẩm (ID SP)!');
    if (!name.trim()) return alert('Vui lòng nhập Tên sản phẩm!');

    const rowToSave = [
      id.trim().toUpperCase(),
      name.trim(),
      model.trim(),
      image.trim(),
      price,
      note.trim()
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
      title={editRow ? "Chỉnh sửa thông tin sản phẩm" : "Thêm mới sản phẩm"}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mã sản phẩm (ID SP)</label>
          <input
            type="text"
            value={id}
            disabled={!!editRow}
            onChange={(e) => setId(e.target.value)}
            placeholder="VD: TK-0348"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tên sản phẩm</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên sản phẩm đầy đủ..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Model / Quy cách</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="VD: 2026 Pro"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Giá bán niêm yết (VNĐ)</label>
            <input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(cleanNumber(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-right"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Đường dẫn hình ảnh (URL)</label>
          <input
            type="text"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          {image && (
            <div className="mt-2 p-2 border border-slate-100 rounded-xl flex items-center gap-3 bg-slate-50">
              <img src={image} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
              <span className="text-[11px] text-slate-500">Xem trước ảnh sản phẩm</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ghi chú</label>
          <textarea
            rows="3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Mô tả hoặc ghi chú sản phẩm..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
          ></textarea>
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
            className="flex-[2] py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 shadow-sm transition"
          >
            Lưu sản phẩm
          </button>
        </div>
      </div>
    </Drawer>
  );
}

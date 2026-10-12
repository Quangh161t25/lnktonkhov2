import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';
import { Building2, Phone, Key, Tag, FileText } from 'lucide-react';

export function XnkNccDrawer({ isOpen, onClose, editUser = null, onSaved }) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [type, setType] = useState('KHÁCH HÀNG NCC');
  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState('');

  useEffect(() => {
    if (editUser) {
      const loadedId = editUser.id || '';
      const loadedName = editUser.name || '';
      const loadedContact = editUser.image || editUser.contact || '';
      const loadedType = editUser.type || 'KHÁCH HÀNG NCC';
      const loadedPassword = editUser.password || '';
      const loadedNote = editUser.note || editUser.gender || '';

      setId(loadedId);
      setName(loadedName);
      setContact(loadedContact);
      setType(loadedType);
      setPassword(loadedPassword);
      setNote(loadedNote);

      setInitialSnapshot(JSON.stringify({
        id: loadedId,
        name: loadedName,
        contact: loadedContact,
        type: loadedType,
        password: loadedPassword,
        note: loadedNote
      }));
    } else {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const autoId = `NCC${randomSuffix}`;
      setId(autoId);
      setName('');
      setContact('');
      setType('KHÁCH HÀNG NCC');
      setPassword('');
      setNote('');

      setInitialSnapshot(JSON.stringify({
        id: autoId,
        name: '',
        contact: '',
        type: 'KHÁCH HÀNG NCC',
        password: '',
        note: ''
      }));
    }
  }, [editUser, isOpen]);

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      id,
      name,
      contact,
      type,
      password,
      note
    });
  }, [id, name, contact, type, password, note]);

  const isDirty = initialSnapshot !== '' && currentSnapshot !== initialSnapshot;

  const handleSave = () => {
    if (!id.trim()) return alert('Vui lòng nhập Mã nhà cung cấp (ID)!');
    if (!name.trim()) return alert('Vui lòng nhập Tên Nhà Cung Cấp / Xưởng sản xuất!');

    const userData = {
      sheetRow: editUser?.sheetRow,
      id: id.trim().toUpperCase(),
      name: name.trim(),
      image: contact.trim(), // SĐT / Wechat / Hotline lưu vào cột C
      gender: note.trim(),    // Ghi chú lưu vào cột D
      birthDate: '',
      role: 'NCC',
      password: password.trim() || '',
      type: type || 'KHÁCH HÀNG NCC'
    };

    onSaved(userData);
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
      title={editUser ? "Chỉnh sửa thông tin Nhà Cung Cấp" : "Thêm mới Nhà Cung Cấp / Xưởng"}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Mã NCC */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Mã Nhà Cung Cấp (ID) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={id}
            disabled={!!editUser}
            onChange={(e) => setId(e.target.value)}
            placeholder="VD: NCC001, XUONG-01..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        {/* Tên NCC */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Tên Nhà Cung Cấp / Xưởng SX <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Xưởng Phật Sơn A, Wechat Taobao 1688..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            required
          />
        </div>

        {/* Phân loại & Liên hệ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Phân loại đối tác
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-slate-700"
            >
              <option value="KHÁCH HÀNG NCC">KHÁCH HÀNG NCC (Nhà Cung Cấp)</option>
              <option value="XƯỞNG SẢN XUẤT">XƯỞNG SẢN XUẤT (Gia công)</option>
              <option value="ĐỐI TÁC 1688/TAOBAO">ĐỐI TÁC 1688 / TAOBAO</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Liên hệ (Wechat / SĐT / Hotline)
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="VD: 0912345678, Wechat ID..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Mật khẩu Web */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Mật khẩu đăng nhập (nếu cấp web)
          </label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Để trống nếu không cấp tài khoản đăng nhập"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Ghi chú thêm */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Ghi chú / Địa chỉ xưởng / Sản phẩm thế mạnh
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Địa chỉ kho hàng bên Trung Quốc, ngành hàng chuyên biệt, cam kết chất lượng..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-[2] py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 shadow-sm transition cursor-pointer"
          >
            Lưu Nhà Cung Cấp
          </button>
        </div>
      </div>
    </Drawer>
  );
}

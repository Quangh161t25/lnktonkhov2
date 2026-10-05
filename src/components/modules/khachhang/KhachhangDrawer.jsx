import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';

export function KhachhangDrawer({ isOpen, onClose, editUser = null, onSaved }) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('KHÁCH HÀNG NPP');
  const [role, setRole] = useState('NPP');
  const [password, setPassword] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState('');

  useEffect(() => {
    if (editUser) {
      const loadedId = editUser.id || '';
      const loadedName = editUser.name || '';
      const loadedType = editUser.type || 'KHÁCH HÀNG NPP';
      const loadedRole = editUser.role || 'NPP';
      const loadedPassword = editUser.password || '';

      setId(loadedId);
      setName(loadedName);
      setType(loadedType);
      setRole(loadedRole);
      setPassword(loadedPassword);

      setInitialSnapshot(JSON.stringify({
        id: loadedId,
        name: loadedName,
        type: loadedType,
        role: loadedRole,
        password: loadedPassword
      }));
    } else {
      setId('');
      setName('');
      setType('KHÁCH HÀNG NPP');
      setRole('NPP');
      setPassword('');

      setInitialSnapshot(JSON.stringify({
        id: '',
        name: '',
        type: 'KHÁCH HÀNG NPP',
        role: 'NPP',
        password: ''
      }));
    }
  }, [editUser, isOpen]);

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      id,
      name,
      type,
      role,
      password
    });
  }, [id, name, type, role, password]);

  const isDirty = initialSnapshot !== '' && currentSnapshot !== initialSnapshot;

  const handleSave = () => {
    if (!id.trim()) return alert('Vui lòng nhập Mã khách hàng / NPP (ID)!');
    if (!name.trim()) return alert('Vui lòng nhập Tên khách hàng / NPP!');

    const userData = {
      sheetRow: editUser?.sheetRow,
      id: id.trim().toUpperCase(),
      name: name.trim(),
      image: '',
      gender: '',
      birthDate: '',
      role: role.trim() || 'NPP',
      password: password.trim() || '',
      type: type
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
      title={editUser ? "Chỉnh sửa thông tin khách hàng" : "Thêm mới khách hàng / NPP"}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mã khách hàng / NPP (ID)</label>
          <input
            type="text"
            value={id}
            disabled={!!editUser}
            onChange={(e) => setId(e.target.value)}
            placeholder="KH00206"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-violet-500 outline-none disabled:bg-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tên khách hàng / Nhà Phân Phối</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Công ty TNHH Thương mại..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phân loại đối tác</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                if (e.target.value === 'KHÁCH HÀNG NPP') setRole('NPP');
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-violet-500 outline-none font-bold text-slate-700"
            >
              <option value="KHÁCH HÀNG NPP">KHÁCH HÀNG NPP (Nhà Phân Phối)</option>
              <option value="KHÁCH HÀNG NCC">KHÁCH HÀNG NCC (Nhà Cung Cấp)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mật khẩu đăng nhập (nếu cấp web)</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Để trống nếu không cấp tài khoản"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500 outline-none"
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
            className="flex-[2] py-2.5 bg-violet-600 text-white font-bold rounded-xl text-xs hover:bg-violet-700 shadow-sm transition"
          >
            Lưu khách hàng
          </button>
        </div>
      </div>
    </Drawer>
  );
}

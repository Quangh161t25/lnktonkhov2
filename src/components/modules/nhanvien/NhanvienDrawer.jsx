import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';
import { formatDateInput } from '../../../utils/formatters';

export function NhanvienDrawer({ isOpen, onClose, editUser = null, onSaved }) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [gender, setGender] = useState('Nam');
  const [birthDate, setBirthDate] = useState('');
  const [role, setRole] = useState('KHO');
  const [password, setPassword] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState('');

  useEffect(() => {
    if (editUser) {
      const loadedId = editUser.id || '';
      const loadedName = editUser.name || '';
      const loadedImage = editUser.image || '';
      const loadedGender = editUser.gender || 'Nam';
      const loadedBirthDate = formatDateInput(editUser.birthDate) || '';
      const loadedRole = editUser.role || 'KHO';
      const loadedPassword = editUser.password || '';

      setId(loadedId);
      setName(loadedName);
      setImage(loadedImage);
      setGender(loadedGender);
      setBirthDate(loadedBirthDate);
      setRole(loadedRole);
      setPassword(loadedPassword);

      setInitialSnapshot(JSON.stringify({
        id: loadedId,
        name: loadedName,
        image: loadedImage,
        gender: loadedGender,
        birthDate: loadedBirthDate,
        role: loadedRole,
        password: loadedPassword
      }));
    } else {
      setId('');
      setName('');
      setImage('');
      setGender('Nam');
      setBirthDate('');
      setRole('KHO');
      setPassword('123456');

      setInitialSnapshot(JSON.stringify({
        id: '',
        name: '',
        image: '',
        gender: 'Nam',
        birthDate: '',
        role: 'KHO',
        password: '123456'
      }));
    }
  }, [editUser, isOpen]);

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      id,
      name,
      image,
      gender,
      birthDate,
      role,
      password
    });
  }, [id, name, image, gender, birthDate, role, password]);

  const isDirty = initialSnapshot !== '' && currentSnapshot !== initialSnapshot;

  const handleSave = () => {
    if (!id.trim()) return alert('Vui lòng nhập Mã nhân viên (ID)!');
    if (!name.trim()) return alert('Vui lòng nhập Họ và tên nhân viên!');

    const userData = {
      sheetRow: editUser?.sheetRow,
      id: id.trim().toUpperCase(),
      name: name.trim(),
      image: image.trim(),
      gender: gender.trim(),
      birthDate: birthDate,
      role: role.trim(),
      password: password.trim() || '123456',
      type: 'NHÂN VIÊN'
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
      title={editUser ? "Chỉnh sửa thông tin nhân viên" : "Thêm mới nhân viên"}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mã nhân viên (ID)</label>
            <input
              type="text"
              value={id}
              disabled={!!editUser}
              onChange={(e) => setId(e.target.value)}
              placeholder="NV001"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-sky-500 outline-none disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Họ và tên</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Giới tính</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ngày sinh</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Vai trò / Phân quyền</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none font-bold text-slate-700"
            >
              <option value="ADMIN">ADMIN (Quản trị toàn quyền)</option>
              <option value="kt">Kế toán (KT)</option>
              <option value="KHO">Thủ kho (KHO)</option>
              <option value="KD">Kinh doanh (KD)</option>
              <option value="NVKD">NV Kinh doanh (NVKD)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mật khẩu đăng nhập</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ảnh đại diện (URL)</label>
          <input
            type="text"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 outline-none"
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
            className="flex-[2] py-2.5 bg-sky-600 text-white font-bold rounded-xl text-xs hover:bg-sky-700 shadow-sm transition"
          >
            Lưu nhân viên
          </button>
        </div>
      </div>
    </Drawer>
  );
}

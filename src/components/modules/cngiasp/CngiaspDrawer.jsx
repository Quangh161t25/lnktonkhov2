import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { cleanNumber, formatCurrency, formatDateInput, formatDateVN, parseSimpleSheetDate } from '../../../utils/formatters';
import { Tag, Calendar, User, FileText, CheckCircle2, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';

export function CngiaspDrawer({ isOpen, onClose, editRow = null, onSaved }) {
  const { currentUser } = useAuth();
  const { productData, getProductMap } = useData();

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [ngayCapNhat, setNgayCapNhat] = useState(todayStr);
  const [maSp, setMaSp] = useState('');
  const [tenSp, setTenSp] = useState('');
  const [giaNhap, setGiaNhap] = useState('');
  const [giaBan, setGiaBan] = useState('');
  const [giaCu, setGiaCu] = useState('');
  const [nguoiCapNhat, setNguoiCapNhat] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [trangThai, setTrangThai] = useState('Áp dụng');
  const [productSearch, setProductSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const productMap = useMemo(() => getProductMap(), [getProductMap]);

  // Product selection list
  const productList = useMemo(() => {
    return (productData || []).slice(1).map(r => {
      if (!r || !Array.isArray(r)) return null;
      return {
        id: (r[0] || '').toString().trim(),
        name: (r[1] || '').toString().trim(),
        model: (r[2] || '').toString().trim(),
        currentPrice: cleanNumber(r[4]) || 0
      };
    }).filter(p => p && p.id);
  }, [productData]);

  // Filtered products for dropdown
  const filteredProducts = useMemo(() => {
    if (!productSearch) return productList.slice(0, 50);
    const q = productSearch.toLowerCase().trim();
    return productList.filter(p => 
      p.id.toLowerCase().includes(q) || 
      p.name.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [productList, productSearch]);

  // Initialize or load edit row
  useEffect(() => {
    if (editRow) {
      const rowNgay = editRow[1] ? formatDateInput(editRow[1]) : todayStr;
      setNgayCapNhat(rowNgay);
      setMaSp(editRow[2] || '');
      setTenSp(editRow[3] || '');
      setGiaNhap(editRow[4] !== undefined && editRow[4] !== '' ? String(cleanNumber(editRow[4])) : '');
      setGiaBan(editRow[5] !== undefined && editRow[5] !== '' ? String(cleanNumber(editRow[5])) : '');
      setGiaCu(editRow[6] !== undefined && editRow[6] !== '' ? String(cleanNumber(editRow[6])) : '');
      setNguoiCapNhat(editRow[8] || currentUser?.name || currentUser?.id || 'Kế toán');
      setGhiChu(editRow[9] || '');
      setTrangThai(editRow[10] || 'Áp dụng');
      setProductSearch(editRow[2] || '');
    } else {
      setNgayCapNhat(todayStr);
      setMaSp('');
      setTenSp('');
      setGiaNhap('');
      setGiaBan('');
      setGiaCu('');
      setNguoiCapNhat(currentUser?.name || currentUser?.id || 'Kế toán');
      setGhiChu('');
      setTrangThai('Áp dụng');
      setProductSearch('');
    }
    setIsDropdownOpen(false);
  }, [editRow, isOpen, todayStr, currentUser]);

  // When a product is selected
  const handleSelectProduct = (prod) => {
    setMaSp(prod.id);
    setTenSp(prod.name);
    setProductSearch(prod.id);
    setGiaCu(String(prod.currentPrice || 0));
    setIsDropdownOpen(false);
  };

  const numGiaBan = cleanNumber(giaBan);
  const numGiaCu = cleanNumber(giaCu);
  const numChenhLech = numGiaBan - numGiaCu;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!maSp.trim()) {
      alert('Vui lòng chọn hoặc nhập Mã sản phẩm!');
      return;
    }
    if (!ngayCapNhat) {
      alert('Vui lòng chọn Ngày cập nhật!');
      return;
    }

    const d = parseSimpleSheetDate(ngayCapNhat);
    const ngayVN = !Number.isNaN(d.getTime()) ? formatDateVN(d) : ngayCapNhat;

    const rowId = editRow ? editRow[0] : `GIA-${Date.now()}`;
    const rowValues = [
      rowId,
      ngayVN,
      maSp.trim(),
      tenSp.trim(),
      cleanNumber(giaNhap),
      cleanNumber(giaBan),
      cleanNumber(giaCu),
      numChenhLech,
      nguoiCapNhat.trim() || currentUser?.name || 'Kế toán',
      ghiChu.trim(),
      trangThai
    ];

    onSaved(rowValues, editRow?._sheetRow || null);
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={editRow ? "Chỉnh sửa giá sản phẩm" : "Cập nhật giá sản phẩm mới"}
      width="w-full max-w-lg"
    >
      <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
        {/* Ngày cập nhật & Trạng thái */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Ngày cập nhật <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={ngayCapNhat}
              onChange={(e) => setNgayCapNhat(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Trạng thái áp dụng
            </label>
            <select
              value={trangThai}
              onChange={(e) => setTrangThai(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold bg-white"
            >
              <option value="Áp dụng">Áp dụng</option>
              <option value="Chờ duyệt">Chờ duyệt</option>
              <option value="Tạm dừng">Tạm dừng</option>
            </select>
          </div>
        </div>

        {/* Sản phẩm chọn từ danh mục */}
        <div className="relative">
          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
            Mã sản phẩm <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setMaSp(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Nhập hoặc tìm kiếm mã SP / tên SP..."
              className="w-full px-3 py-2 pr-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Autocomplete dropdown */}
          {isDropdownOpen && filteredProducts.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
              {filteredProducts.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition"
                >
                  <div>
                    <span className="font-extrabold text-blue-700 block">{p.id}</span>
                    <span className="text-slate-600 text-[11px] block truncate">{p.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                    {formatCurrency(p.currentPrice)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tên sản phẩm */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Tên sản phẩm
          </label>
          <input
            type="text"
            value={tenSp}
            onChange={(e) => setTenSp(e.target.value)}
            placeholder="Tên sản phẩm..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium bg-slate-50"
          />
        </div>

        {/* Giá bán mới & Giá nhập */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <label className="block font-bold text-emerald-800 mb-1">
              Giá bán mới (VNĐ) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              step="1000"
              value={giaBan}
              onChange={(e) => setGiaBan(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-extrabold text-emerald-700 text-sm bg-white"
            />
            {giaBan && (
              <span className="text-[11px] font-bold text-emerald-600 block mt-1">
                {formatCurrency(numGiaBan)}
              </span>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Giá nhập / Giá vốn (VNĐ)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={giaNhap}
              onChange={(e) => setGiaNhap(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold bg-white"
            />
            {giaNhap && (
              <span className="text-[11px] font-medium text-slate-500 block mt-1">
                {formatCurrency(cleanNumber(giaNhap))}
              </span>
            )}
          </div>
        </div>

        {/* So sánh với giá cũ & Chênh lệch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
          <div>
            <label className="block font-bold text-slate-600 mb-1">
              Giá cũ / Hiện tại (VNĐ)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={giaCu}
              onChange={(e) => setGiaCu(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 bg-white"
            />
            {giaCu && (
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {formatCurrency(numGiaCu)}
              </span>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1">
              Biến động chênh lệch
            </label>
            <div className={`px-3 py-2 rounded-lg font-black text-xs flex items-center justify-between border ${
              numChenhLech > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
              numChenhLech < 0 ? 'bg-rose-100 text-rose-800 border-rose-300' :
              'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <span>
                {numChenhLech > 0 ? '+' : ''}{formatCurrency(numChenhLech)}
              </span>
              {numChenhLech > 0 ? (
                <span className="flex items-center text-[10px] font-bold text-emerald-700">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Tăng giá
                </span>
              ) : numChenhLech < 0 ? (
                <span className="flex items-center text-[10px] font-bold text-rose-700">
                  <ArrowDownRight className="w-3.5 h-3.5" /> Giảm giá
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">Không đổi</span>
              )}
            </div>
          </div>
        </div>

        {/* Người cập nhật */}
        <div>
          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            Người cập nhật (Kế toán)
          </label>
          <input
            type="text"
            value={nguoiCapNhat}
            onChange={(e) => setNguoiCapNhat(e.target.value)}
            placeholder="Tên kế toán phụ trách..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        {/* Ghi chú */}
        <div>
          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Ghi chú điều chỉnh giá
          </label>
          <textarea
            rows="2"
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            placeholder="Lý do cập nhật giá, thông báo từ nhà cung cấp, đợt áp dụng..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            {editRow ? "Lưu thay đổi" : "Lưu giá sản phẩm"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

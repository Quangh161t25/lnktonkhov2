import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';
import { ProductSearchCell } from '../../common/ProductSearchCell';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { formatDateInput, generateRandomOrderId, cleanNumber, formatNumber } from '../../../utils/formatters';
import { DUKIEN_STATUS_OPTIONS } from '../../../config/constants';
import { Plus, Trash2, CalendarClock, Package, AlertCircle } from 'lucide-react';

const COMMON_TRANG_THAI = DUKIEN_STATUS_OPTIONS;

export function DukienDrawer({ 
  isOpen, 
  onClose, 
  editOrderRows = null, 
  onSaved, 
  onDeleteOrder 
}) {
  const { getHiddenProductIds } = useAuth();
  const { productData, warehouseProductData, getProductMap, fetchModule } = useData();

  const [ngayNhap, setNgayNhap] = useState(formatDateInput(new Date()));
  const [maPo, setMaPo] = useState('');
  const [ngayVeDuKien, setNgayVeDuKien] = useState(formatDateInput(new Date()));
  const [trangThai, setTrangThai] = useState('Chưa giao (Pending)');
  const [ghiChu, setGhiChu] = useState('');
  const [initialSheetRows, setInitialSheetRows] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Multi-items list for the PO
  const [items, setItems] = useState([
    { 
      detailId: '', 
      _sheetRow: null, 
      idSp: '', 
      tenSp: '', 
      dvt: 'Cái', 
      slgDuKien: 1, 
      slgThucNhan: 0, 
      chenhLech: 1 
    }
  ]);

  const productMap = useMemo(() => getProductMap(), [getProductMap]);

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
    if (editOrderRows && editOrderRows.length > 0) {
      const firstRow = editOrderRows[0];
      const loadedNgayNhap = formatDateInput(firstRow[2]) || formatDateInput(new Date());
      const loadedMaPo = firstRow[3] || '';
      const loadedNgayVeDuKien = formatDateInput(firstRow[8]) || formatDateInput(new Date());
      const loadedTrangThai = firstRow[9] || 'Chưa giao (Pending)';
      const loadedGhiChu = firstRow[12] || '';

      const sheetRows = editOrderRows.map(r => r._sheetRow).filter(Boolean);
      setInitialSheetRows(sheetRows);

      const loadedItems = editOrderRows.map(r => {
        const slgDk = cleanNumber(r[7]) || 1;
        const slgTn = cleanNumber(r[10]) || 0;
        return {
          detailId: r[0] || '',
          _sheetRow: r._sheetRow || null,
          idSp: (r[4] || '').toString().trim(),
          tenSp: r[5] || '',
          dvt: r[6] || 'Cái',
          slgDuKien: slgDk,
          slgThucNhan: slgTn,
          chenhLech: slgDk - slgTn
        };
      });

      setNgayNhap(loadedNgayNhap);
      setMaPo(loadedMaPo);
      setNgayVeDuKien(loadedNgayVeDuKien);
      setTrangThai(loadedTrangThai);
      setGhiChu(loadedGhiChu);
      setItems(loadedItems);

      setInitialSnapshot(JSON.stringify({
        ngayNhap: loadedNgayNhap,
        maPo: loadedMaPo,
        ngayVeDuKien: loadedNgayVeDuKien,
        trangThai: loadedTrangThai,
        ghiChu: loadedGhiChu,
        items: loadedItems.map(it => ({ idSp: it.idSp, tenSp: it.tenSp, dvt: it.dvt, slgDuKien: it.slgDuKien, slgThucNhan: it.slgThucNhan }))
      }));
    } else {
      const newNgayNhap = formatDateInput(new Date());
      const newMaPo = generateRandomOrderId('PO');
      const newNgayVe = formatDateInput(new Date());
      const newItems = [{ 
        detailId: '', 
        _sheetRow: null, 
        idSp: '', 
        tenSp: '', 
        dvt: 'Cái', 
        slgDuKien: 1, 
        slgThucNhan: 0, 
        chenhLech: 1 
      }];

      setNgayNhap(newNgayNhap);
      setMaPo(newMaPo);
      setNgayVeDuKien(newNgayVe);
      setTrangThai('Chờ hàng về');
      setGhiChu('');
      setInitialSheetRows([]);
      setItems(newItems);

      setInitialSnapshot(JSON.stringify({
        ngayNhap: newNgayNhap,
        maPo: newMaPo,
        ngayVeDuKien: newNgayVe,
        trangThai: 'Chờ hàng về',
        ghiChu: '',
        items: newItems.map(it => ({ idSp: it.idSp, tenSp: it.tenSp, dvt: it.dvt, slgDuKien: it.slgDuKien, slgThucNhan: it.slgThucNhan }))
      }));
    }
  }, [editOrderRows, isOpen]);

  const handleProductSelect = (index, product) => {
    if (!product) return;
    const next = [...items];
    const item = next[index];
    item.idSp = product.id;
    item.tenSp = product.name;
    setItems(next);
  };

  const handleProductChange = (index, val) => {
    const next = [...items];
    const item = next[index];
    const rawVal = (val || '').trim();
    
    let targetId = rawVal;
    if (rawVal.includes(' - ')) {
      targetId = rawVal.split(' - ')[0].trim();
    }

    item.idSp = targetId;
    const found = productMap.get(targetId.toLowerCase());
    if (found) {
      item.tenSp = found.name;
    }
    setItems(next);
  };

  const handleQtyChange = (index, val) => {
    const next = [...items];
    const item = next[index];
    item.slgDuKien = val === '' ? '' : (val.startsWith('0') && val.length > 1 ? Number(val) : val);
    const numDk = cleanNumber(val) || 0;
    const numTn = cleanNumber(item.slgThucNhan) || 0;
    item.chenhLech = numDk - numTn;
    setItems(next);
  };

  const handleReceivedQtyChange = (index, val) => {
    const next = [...items];
    const item = next[index];
    item.slgThucNhan = val === '' ? '' : (val.startsWith('0') && val.length > 1 ? Number(val) : val);
    const numDk = cleanNumber(item.slgDuKien) || 0;
    const numTn = cleanNumber(val) || 0;
    item.chenhLech = numDk - numTn;
    setItems(next);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        detailId: '',
        _sheetRow: null,
        idSp: '',
        tenSp: '',
        dvt: 'Cái',
        slgDuKien: 1,
        slgThucNhan: 0,
        chenhLech: 1
      }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) {
      setItems([{
        detailId: '',
        _sheetRow: null,
        idSp: '',
        tenSp: '',
        dvt: 'Cái',
        slgDuKien: 1,
        slgThucNhan: 0,
        chenhLech: 1
      }]);
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  const totalSlgDuKien = useMemo(() => {
    return items.reduce((acc, it) => acc + (cleanNumber(it.slgDuKien) || 0), 0);
  }, [items]);

  const totalSlgThucNhan = useMemo(() => {
    return items.reduce((acc, it) => acc + (cleanNumber(it.slgThucNhan) || 0), 0);
  }, [items]);

  const totalChenhLech = totalSlgDuKien - totalSlgThucNhan;

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      ngayNhap,
      maPo,
      ngayVeDuKien,
      trangThai,
      ghiChu,
      items: items.map(it => ({ idSp: it.idSp, tenSp: it.tenSp, dvt: it.dvt, slgDuKien: it.slgDuKien, slgThucNhan: it.slgThucNhan }))
    });
  }, [ngayNhap, maPo, ngayVeDuKien, trangThai, ghiChu, items]);

  const isDirty = initialSnapshot !== '' && currentSnapshot !== initialSnapshot;

  const handleSave = async () => {
    if (!maPo.trim()) return alert('Vui lòng nhập Mã PO / Đơn đặt hàng!');
    const validItems = items.filter(it => it.idSp && it.idSp.trim());
    if (validItems.length === 0) return alert('Vui lòng nhập ít nhất 1 sản phẩm hợp lệ!');

    setIsSaving(true);
    try {
      const rowsToSave = validItems.map((it, idx) => {
        const numDk = cleanNumber(it.slgDuKien) || 1;
        const numTn = cleanNumber(it.slgThucNhan) || 0;
        return {
          _sheetRow: it._sheetRow,
          rowValues: [
            it.detailId || `DK-${Date.now()}-${idx + 1}`,
            String(idx + 1),
            ngayNhap,
            maPo.trim().toUpperCase(),
            it.idSp.trim().toUpperCase(),
            it.tenSp.trim(),
            it.dvt.trim() || 'Cái',
            numDk,
            ngayVeDuKien,
            trangThai,
            numTn,
            numDk - numTn,
            ghiChu.trim()
          ]
        };
      });

      // Detect deleted sheet rows
      const remainingSheetRows = new Set(validItems.map(it => it._sheetRow).filter(Boolean));
      const deletedSheetRows = initialSheetRows.filter(sr => !remainingSheetRows.has(sr));

      await onSaved({ rowsToSave, deletedSheetRows });
      onClose();
    } catch (err) {
      alert("Lỗi khi lưu đơn dự kiến: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteThisOrder = async () => {
    if (!onDeleteOrder || !maPo) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ đơn dự kiến ${maPo} (${items.length} sản phẩm)?`)) {
      setIsSaving(true);
      try {
        await onDeleteOrder(maPo);
        onClose();
      } catch (err) {
        alert("Lỗi khi xóa đơn dự kiến: " + err.message);
      } finally {
        setIsSaving(false);
      }
    }
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

  const isEditing = editOrderRows && editOrderRows.length > 0;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      confirmOnClose={isDirty}
      title={isEditing ? `Sửa đơn dự kiến: ${maPo} (${items.length} sản phẩm)` : "Thêm mới đơn hàng dự kiến về"}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-3.5 text-xs">
        {/* Section 1: Thông tin chung đơn PO */}
        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-2.5">
          <div className="font-bold text-slate-700 uppercase flex items-center justify-between pb-1 border-b border-slate-200">
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-amber-600" />
              <span>Thông tin đơn đặt hàng (PO)</span>
            </div>
            {isEditing && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Mã PO: {maPo}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mã PO / Đơn hàng *</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={maPo}
                  onChange={(e) => setMaPo(e.target.value)}
                  placeholder="PO2026-001"
                  className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-amber-700 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setMaPo(generateRandomOrderId('PO'))}
                    className="px-2 py-1 bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] hover:bg-slate-300 whitespace-nowrap cursor-pointer"
                  >
                    Tạo mã
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Ngày lập PO *</label>
              <input
                type="date"
                value={ngayNhap}
                onChange={(e) => setNgayNhap(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Ngày dự kiến về *</label>
              <input
                type="date"
                value={ngayVeDuKien}
                onChange={(e) => setNgayVeDuKien(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Trạng thái đơn</label>
              <select
                value={trangThai}
                onChange={(e) => setTrangThai(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {COMMON_TRANG_THAI.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Danh sách sản phẩm của Đơn PO */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
              <span>Danh sách sản phẩm</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                {items.length} dòng
              </span>
            </h4>
            <button
              type="button"
              onClick={addItemRow}
              className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 flex items-center gap-1 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm sản phẩm
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-2 w-8 text-center">STT</th>
                    <th className="py-2 px-2 min-w-[140px]">Mã SP *</th>
                    <th className="py-2 px-2 min-w-[180px]">Tên sản phẩm</th>
                    <th className="py-2 px-2 w-24">ĐVT</th>
                    <th className="py-2 px-2 w-28 text-right">SLG Dự kiến *</th>
                    <th className="py-2 px-2 w-28 text-right">SLG Thực nhận</th>
                    <th className="py-2 px-2 w-24 text-right">Chênh lệch</th>
                    <th className="py-2 px-2 w-8 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const diff = (cleanNumber(item.slgDuKien) || 0) - (cleanNumber(item.slgThucNhan) || 0);

                    return (
                      <tr key={index} className="hover:bg-slate-50/70 transition">
                        {/* STT */}
                        <td className="py-1 px-1.5 text-center text-slate-400 font-bold">
                          {index + 1}
                        </td>

                        {/* Mã SP - Fast Instant Search */}
                        <td className="py-1 px-1.5">
                          <ProductSearchCell
                            value={item.idSp}
                            onChange={(val) => handleProductChange(index, val)}
                            onSelectProduct={(prod) => handleProductSelect(index, prod)}
                            productList={productList}
                            placeholder="Mã SP..."
                          />
                        </td>

                        {/* Tên sản phẩm */}
                        <td className="py-1 px-1.5">
                          <input
                            type="text"
                            value={item.tenSp}
                            onChange={(e) => {
                              const next = [...items];
                              next[index].tenSp = e.target.value;
                              setItems(next);
                            }}
                            placeholder="Tên sản phẩm..."
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-700 focus:ring-1 focus:ring-amber-500 outline-none"
                          />
                        </td>

                        {/* ĐVT */}
                        <td className="py-1 px-1.5">
                          <input
                            type="text"
                            value={item.dvt}
                            onChange={(e) => {
                              const next = [...items];
                              next[index].dvt = e.target.value;
                              setItems(next);
                            }}
                            placeholder="Cái"
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-700 focus:ring-1 focus:ring-amber-500 outline-none font-medium"
                          />
                        </td>

                        {/* SLG Dự kiến */}
                        <td className="py-1 px-1.5">
                          <input
                            type="number"
                            min="1"
                            value={item.slgDuKien}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleQtyChange(index, e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-bold text-amber-700 focus:ring-1 focus:ring-amber-500 outline-none text-right"
                          />
                        </td>

                        {/* SLG Thực nhận */}
                        <td className="py-1 px-1.5">
                          <input
                            type="number"
                            min="0"
                            value={item.slgThucNhan}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleReceivedQtyChange(index, e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-bold text-emerald-700 focus:ring-1 focus:ring-amber-500 outline-none text-right"
                          />
                        </td>

                        {/* Chênh lệch */}
                        <td className="py-1 px-2 text-right whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                            diff === 0 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : (diff > 0 ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700')
                          }`}>
                            {formatNumber(diff)}
                          </span>
                        </td>

                        {/* Xóa dòng */}
                        <td className="py-1 px-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                            title="Xóa dòng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total summary footer inside table card */}
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 font-bold text-xs">
              <div className="text-slate-600">
                Tổng cộng: <span className="text-amber-700 font-extrabold">{items.length} mặt hàng</span>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-slate-500 font-normal">Tổng SLG dự kiến: </span>
                  <span className="text-amber-700 text-sm font-extrabold">{formatNumber(totalSlgDuKien)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">Tổng thực nhận: </span>
                  <span className="text-emerald-700 text-sm font-extrabold">{formatNumber(totalSlgThucNhan)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">Tổng chênh lệch: </span>
                  <span className="text-slate-800 text-sm font-extrabold">{formatNumber(totalChenhLech)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Ghi chú */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Ghi chú đơn hàng</label>
          <input
            type="text"
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            placeholder="Nhập ghi chú chi tiết về đơn hàng dự kiến về..."
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-200">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={handleDeleteThisOrder}
                disabled={isSaving}
                className="px-3 py-2 bg-red-50 text-red-700 font-bold rounded-xl text-xs hover:bg-red-100 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa đơn PO này
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-amber-500 text-white font-bold rounded-xl text-xs hover:bg-amber-600 shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>{isEditing ? `Lưu cập nhật đơn (${items.length} SP)` : "Tạo đơn dự kiến về"}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

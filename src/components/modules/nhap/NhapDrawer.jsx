import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';
import { ProductSearchCell } from '../../common/ProductSearchCell';
import { CustomerSearchCell } from '../../common/CustomerSearchCell';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { useData } from '../../../context/DataContext';
import { formatDateInput, generateRandomOrderId, cleanNumber, formatCurrency, formatNumber, removeVietnameseTones } from '../../../utils/formatters';
import { calculateWarehouseStockMap } from '../../../utils/calculations';
import { Plus, Trash2, Scan, Package, User } from 'lucide-react';

const ORDER_LOAI_HINH_OPTIONS = [
  'Thường',
  'Bảo hành'
];

export function NhapDrawer({ 
  isOpen, 
  onClose, 
  editOrderRows = null, 
  onSaved, 
  onDeleteOrder,
  onOpenBarcodeScan 
}) {
  const { currentUser, usersData, hasActionPermission, getHiddenProductIds } = useAuth();
  const { getWarehouseOptions, getDefaultWarehouse } = useSettings();
  const { 
    nhapData, 
    xuatData, 
    transferData, 
    warehouseProductData, 
    productData, 
    getProductMap,
    fetchModule,
    fetchUsersData
  } = useData();

  const [date, setDate] = useState(formatDateInput(new Date()));
  const [mdh, setMdh] = useState('');
  const [maKh, setMaKh] = useState('');
  const [tenKhach, setTenKhach] = useState('');
  const [kho, setKho] = useState(getDefaultWarehouse());
  const [ghiChu, setGhiChu] = useState('');
  const [loaiHinh, setLoaiHinh] = useState('Thường');
  const [initialSheetRows, setInitialSheetRows] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Items list in order
  const [items, setItems] = useState([
    { 
      detailId: '', 
      _sheetRow: null, 
      idSp: '', 
      tenSp: '', 
      slg: 1, 
      donGia: 0, 
      thanhTien: 0, 
      kho: getDefaultWarehouse(),
      loaiHinh: 'Thường'
    }
  ]);

  const productMap = useMemo(() => getProductMap(), [getProductMap]);

  // Inventory stock calculation map
  const warehouseStockMap = useMemo(() => {
    return calculateWarehouseStockMap(nhapData, xuatData, transferData, warehouseProductData);
  }, [nhapData, xuatData, transferData, warehouseProductData]);

  // Get current warehouse stock for product
  const getStock = (idSp, itemKho) => {
    if (!idSp) return 0;
    const targetKho = (itemKho || kho || getDefaultWarehouse()).toUpperCase().trim();
    const targetId = idSp.toUpperCase().trim();
    return warehouseStockMap.get(`${targetKho}|${targetId}`) || 0;
  };

  // Ensure essential suggestion datasets are loaded when drawer opens
  useEffect(() => {
    if (isOpen) {
      if (!productData || productData.length <= 1) fetchModule('sanpham');
      if (!warehouseProductData || warehouseProductData.length <= 1) fetchModule('sanphamkho');
      if (!usersData || usersData.length === 0) {
        if (fetchUsersData) fetchUsersData();
      }
    }
  }, [isOpen, productData, warehouseProductData, usersData, fetchModule, fetchUsersData]);

  // Supplier suggestions
  const supplierList = useMemo(() => {
    const map = new Map();

    // 1. Scan usersData for Suppliers and Partners
    (usersData || []).forEach(u => {
      if (!u.id) return;
      const uType = (u.type || '').toString().toUpperCase();
      const uRole = (u.role || '').toString().toUpperCase();
      if (
        uType.includes('NCC') || 
        uType.includes('CUNG CẤP') || 
        uType.includes('KHÁCH') || 
        uType.includes('NPP') || 
        uRole === 'NPP' || 
        uRole === 'KH'
      ) {
        const idNorm = u.id.toString().trim();
        const nameNorm = (u.name || idNorm).toString().trim();
        map.set(idNorm.toLowerCase(), {
          id: idNorm,
          name: nameNorm,
          type: u.type || u.role
        });
      }
    });

    // 2. Scan historical nhapData rows for supplier pairs
    (nhapData || []).slice(1).forEach(r => {
      if (!r || !Array.isArray(r)) return;
      const maKhVal = (r[4] || '').toString().trim();
      const tenKhVal = (r[5] || '').toString().trim();
      if (maKhVal || tenKhVal) {
        const key = (maKhVal || tenKhVal).toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: maKhVal || tenKhVal,
            name: tenKhVal || maKhVal,
            type: 'NCC'
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [usersData, nhapData]);

  // Product catalog list for autocomplete
  const productList = useMemo(() => {
    const hiddenIds = new Set((getHiddenProductIds ? getHiddenProductIds() : []).map(id => (id || '').toString().trim().toUpperCase()));
    const map = new Map();

    const addProduct = (rawId, rawName, fallbackPrice = 0) => {
      if (!rawId) return;
      const id = rawId.toString().trim().toUpperCase();
      if (!id || hiddenIds.has(id)) return; // SECURITY: filter hidden products
      const idKey = id.toLowerCase();
      if (map.has(idKey)) return;

      map.set(idKey, {
        id,
        name: (rawName || id).toString().trim(),
        price: fallbackPrice
      });
    };

    // 1. Scan productData (DS_SP)
    (productData || []).slice(1).forEach(r => {
      if (!r || !Array.isArray(r)) return;
      const id = (r[0] || '').toString().trim();
      const name = (r[1] || '').toString().trim();
      const catalogPrice = cleanNumber(r[4]) || 0;
      addProduct(id, name, catalogPrice);
    });

    // 2. Scan warehouseProductData (DS_SP_KHO)
    (warehouseProductData || []).slice(1).forEach(r => {
      if (!r || !Array.isArray(r)) return;
      const id = (r[2] || '').toString().trim();
      const name = (r[3] || '').toString().trim();
      addProduct(id, name, 0);
    });

    // 3. Scan historical nhapData
    (nhapData || []).slice(1).forEach(r => {
      if (!r || !Array.isArray(r)) return;
      const id = (r[6] || '').toString().trim();
      const name = (r[7] || '').toString().trim();
      const donGia = cleanNumber(r[9]) || 0;
      addProduct(id, name, donGia);
    });

    return Array.from(map.values()).sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  }, [productData, warehouseProductData, nhapData, getHiddenProductIds]);

  const [initialSnapshot, setInitialSnapshot] = useState('');

  useEffect(() => {
    if (editOrderRows && editOrderRows.length > 0) {
      const firstRow = editOrderRows[0];
      const loadedDate = formatDateInput(firstRow[1]) || formatDateInput(new Date());
      const loadedMdh = firstRow[3] || '';
      const loadedMaKh = firstRow[4] || '';
      const loadedTenKhach = firstRow[5] || '';
      const defaultK = firstRow[11] || getDefaultWarehouse();
      const loadedKho = defaultK;
      const loadedGhiChu = firstRow[13] || '';
      const rawLoaiHinh = (firstRow[14] || '').toString().trim();
      const loadedLoaiHinh = rawLoaiHinh.toLowerCase().includes('bảo hành') || rawLoaiHinh.toUpperCase() === 'BH' ? 'Bảo hành' : 'Thường';

      const sheetRows = editOrderRows.map(r => r._sheetRow).filter(Boolean);
      setInitialSheetRows(sheetRows);

      const loadedItems = editOrderRows.map(r => {
        const slg = cleanNumber(r[8]) || 1;
        const donGia = cleanNumber(r[9]) || 0;
        const thanhTien = cleanNumber(r[10]) || (slg * donGia);
        const itemLoaiHinh = (r[14] || '').toString().trim();
        const normItemLoaiHinh = itemLoaiHinh.toLowerCase().includes('bảo hành') || itemLoaiHinh.toUpperCase() === 'BH' ? 'Bảo hành' : 'Thường';

        return {
          detailId: r[0] || '',
          _sheetRow: r._sheetRow || null,
          idSp: (r[6] || '').toString().trim(),
          tenSp: r[7] || '',
          slg,
          donGia,
          thanhTien,
          kho: r[11] || defaultK,
          loaiHinh: normItemLoaiHinh
        };
      });

      setDate(loadedDate);
      setMdh(loadedMdh);
      setMaKh(loadedMaKh);
      setTenKhach(loadedTenKhach);
      setKho(loadedKho);
      setGhiChu(loadedGhiChu);
      setLoaiHinh(loadedLoaiHinh);
      setItems(loadedItems);

      setInitialSnapshot(JSON.stringify({
        date: loadedDate,
        mdh: loadedMdh,
        maKh: loadedMaKh,
        tenKhach: loadedTenKhach,
        kho: loadedKho,
        ghiChu: loadedGhiChu,
        loaiHinh: loadedLoaiHinh,
        items: loadedItems.map(it => ({ idSp: it.idSp, tenSp: it.tenSp, slg: it.slg, donGia: it.donGia, kho: it.kho, loaiHinh: it.loaiHinh }))
      }));
    } else {
      const newDate = formatDateInput(new Date());
      const newMdh = generateRandomOrderId('PN');
      const newKho = getDefaultWarehouse();
      const newItems = [{ 
        detailId: '', 
        _sheetRow: null, 
        idSp: '', 
        tenSp: '', 
        slg: 1, 
        donGia: 0, 
        thanhTien: 0, 
        kho: newKho,
        loaiHinh: 'Thường'
      }];

      setDate(newDate);
      setMdh(newMdh);
      setMaKh('');
      setTenKhach('');
      setKho(newKho);
      setGhiChu('');
      setLoaiHinh('Thường');
      setInitialSheetRows([]);
      setItems(newItems);

      setInitialSnapshot(JSON.stringify({
        date: newDate,
        mdh: newMdh,
        maKh: '',
        tenKhach: '',
        kho: newKho,
        ghiChu: '',
        loaiHinh: 'Thường',
        items: newItems.map(it => ({ idSp: it.idSp, tenSp: it.tenSp, slg: it.slg, donGia: it.donGia, kho: it.kho, loaiHinh: it.loaiHinh }))
      }));
    }
  }, [editOrderRows, isOpen, getDefaultWarehouse]);

  const handleSupplierSelect = (supplierOrVal) => {
    if (typeof supplierOrVal === 'object' && supplierOrVal !== null) {
      setMaKh(supplierOrVal.id || '');
      setTenKhach(supplierOrVal.name || supplierOrVal.id || '');
      return;
    }
    const raw = (supplierOrVal || '').toString().trim().normalize('NFC');
    setTenKhach(raw);
    if (!raw) {
      setMaKh('');
      return;
    }
    const normRaw = removeVietnameseTones(raw.toLowerCase());
    const found = supplierList.find(s => {
      const sId = (s.id || '').toLowerCase().normalize('NFC');
      const sName = (s.name || '').toLowerCase().normalize('NFC');
      const noToneName = removeVietnameseTones(sName);
      return (
        sId === normRaw ||
        sName === raw.toLowerCase() ||
        noToneName === normRaw ||
        `${sId} - ${sName}` === raw.toLowerCase()
      );
    });
    if (found) {
      setMaKh(found.id);
      setTenKhach(found.name);
    }
  };

  const handleMaKhChange = (val) => {
    const raw = (val || '').toString().trim().normalize('NFC');
    setMaKh(raw.toUpperCase());
    if (!raw) return;
    const normRaw = raw.toLowerCase();
    const found = supplierList.find(s => (s.id || '').toLowerCase().normalize('NFC') === normRaw);
    if (found) {
      setMaKh(found.id);
      setTenKhach(found.name);
    }
  };

  const handleProductSelect = (index, product) => {
    if (!product) return;
    const next = [...items];
    const item = next[index];
    item.idSp = product.id;
    item.tenSp = product.name;
    item.donGia = product.price || 0;
    item.thanhTien = (cleanNumber(item.slg) || 1) * (product.price || 0);
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
      item.donGia = found.price || 0;
      item.thanhTien = (cleanNumber(item.slg) || 1) * (found.price || 0);
    }
    setItems(next);
  };

  const handleQtyChange = (index, val) => {
    const next = [...items];
    const item = next[index];
    item.slg = val === '' ? '' : (val.startsWith('0') && val.length > 1 ? Number(val) : val);
    const numSlg = cleanNumber(val) || 0;
    const numPrice = cleanNumber(item.donGia) || 0;
    item.thanhTien = numSlg * numPrice;
    setItems(next);
  };

  const handlePriceChange = (index, val) => {
    const next = [...items];
    const item = next[index];
    item.donGia = val === '' ? '' : (val.startsWith('0') && val.length > 1 ? Number(val) : val);
    const numSlg = cleanNumber(item.slg) || 0;
    const numPrice = cleanNumber(val) || 0;
    item.thanhTien = numSlg * numPrice;
    setItems(next);
  };

  const handleItemKhoChange = (index, itemKho) => {
    const next = [...items];
    next[index].kho = itemKho;
    setItems(next);
  };

  const handleItemLoaiHinhChange = (index, itemLoaiHinh) => {
    const next = [...items];
    next[index].loaiHinh = itemLoaiHinh;
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
        slg: 1, 
        donGia: 0, 
        thanhTien: 0, 
        kho,
        loaiHinh
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
        slg: 1, 
        donGia: 0, 
        thanhTien: 0, 
        kho,
        loaiHinh
      }]);
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  const totalQty = useMemo(() => {
    return items.reduce((acc, it) => acc + (cleanNumber(it.slg) || 0), 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return items.reduce((acc, it) => acc + (cleanNumber(it.thanhTien) || 0), 0);
  }, [items]);

  const handleSave = async () => {
    if (!mdh.trim()) return alert('Vui lòng nhập Mã đơn hàng / Mã phiếu nhập!');
    const validItems = items.filter(it => it.idSp && it.idSp.trim());
    if (validItems.length === 0) return alert('Vui lòng nhập ít nhất 1 sản phẩm hợp lệ!');

    setIsSaving(true);
    try {
      const rowsToSave = validItems.map((it, idx) => ({
        _sheetRow: it._sheetRow,
        rowValues: [
          it.detailId || `NHAP-${Date.now()}-${idx + 1}`,
          date,
          'NHẬP',
          mdh.trim().toUpperCase(),
          maKh.trim(),
          tenKhach.trim(),
          it.idSp.trim().toUpperCase(),
          it.tenSp.trim(),
          cleanNumber(it.slg) || 1,
          cleanNumber(it.donGia) || 0,
          (cleanNumber(it.slg) || 1) * (cleanNumber(it.donGia) || 0),
          it.kho || kho,
          currentUser?.id || '',
          ghiChu.trim(),
          it.loaiHinh || loaiHinh || 'Thường',
          '',
          'Hàng đã về'
        ]
      }));

      // Detect deleted sheet rows
      const remainingSheetRows = new Set(validItems.map(it => it._sheetRow).filter(Boolean));
      const deletedSheetRows = initialSheetRows.filter(sr => !remainingSheetRows.has(sr));

      await onSaved({ rowsToSave, deletedSheetRows });
      onClose();
    } catch (err) {
      alert("Lỗi khi lưu đơn nhập: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteThisOrder = async () => {
    if (!onDeleteOrder || !mdh) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ đơn nhập ${mdh} (${items.length} sản phẩm)? Hành động này không thể hoàn tác.`)) {
      setIsSaving(true);
      try {
        await onDeleteOrder(mdh);
        onClose();
      } catch (err) {
        alert("Lỗi khi xóa đơn hàng: " + err.message);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const isEditing = editOrderRows && editOrderRows.length > 0;

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      date,
      mdh,
      maKh,
      tenKhach,
      kho,
      ghiChu,
      loaiHinh,
      items: items.map(it => ({ idSp: it.idSp, tenSp: it.tenSp, slg: it.slg, donGia: it.donGia, kho: it.kho, loaiHinh: it.loaiHinh }))
    });
  }, [date, mdh, maKh, tenKhach, kho, ghiChu, loaiHinh, items]);

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
      title={isEditing ? `Sửa đơn nhập: ${mdh} (${items.length} sản phẩm)` : "Thêm mới phiếu nhập kho"}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-3.5 text-xs">
        {/* Datalists for autocompletion */}
        <datalist id="nhapSupplierDatalist">
          {supplierList.map(s => (
            <option key={s.id} value={`${s.id} - ${s.name}`}>{s.type || s.role}</option>
          ))}
        </datalist>


        {/* Section 1: Thông tin chung đơn nhập */}
        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-2.5">
          <div className="font-bold text-slate-700 uppercase flex items-center justify-between pb-1 border-b border-slate-200">
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-600" />
              <span>Thông tin đơn hàng</span>
            </div>
            {isEditing && (
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Mã đơn: {mdh}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Ngày nhập *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mã đơn / MDH *</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={mdh}
                  onChange={(e) => setMdh(e.target.value)}
                  placeholder="PN123456"
                  className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-blue-700 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setMdh(generateRandomOrderId('PN'))}
                    className="px-2 py-1 bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] hover:bg-slate-300 whitespace-nowrap"
                  >
                    Tạo mã
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kho nhập chung *</label>
              <select
                value={kho}
                onChange={(e) => {
                  const newKho = e.target.value;
                  setKho(newKho);
                  setItems(items.map(it => ({ ...it, kho: newKho })));
                }}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {getWarehouseOptions().map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Loại hình mặc định</label>
              <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white p-0.5">
                {ORDER_LOAI_HINH_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setLoaiHinh(opt);
                      setItems(items.map(it => ({ ...it, loaiHinh: opt })));
                    }}
                    className={`flex-1 py-1 text-[11px] font-bold rounded transition ${
                      loaiHinh === opt 
                        ? (opt === 'Bảo hành' ? 'bg-amber-500 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm')
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Nhà cung cấp (Bỏ tình trạng và ngày đặt hàng theo yêu cầu) */}
        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-2.5">
          <div className="font-bold text-slate-700 uppercase flex items-center gap-1.5 pb-1 border-b border-slate-200">
            <User className="w-3.5 h-3.5 text-blue-600" />
            Nhà cung cấp
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mã Nhà Cung Cấp</label>
              <input
                type="text"
                value={maKh}
                onChange={(e) => handleMaKhChange(e.target.value)}
                placeholder="NCC001"
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none uppercase font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center justify-between">
                <span>Tên Nhà Cung Cấp</span>
                {maKh && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 normal-case">
                    Mã: {maKh}
                  </span>
                )}
              </label>
              <CustomerSearchCell
                value={tenKhach}
                selectedCode={maKh}
                mode="supplier"
                onChange={(val) => handleSupplierSelect(val)}
                onSelectCustomer={(s) => {
                  setMaKh(s.id || '');
                  setTenKhach(s.name || s.id || '');
                }}
                customerList={supplierList}
                placeholder="Chọn hoặc nhập tên NCC..."
              />
            </div>
          </div>
        </div>

        {/* Section 3: Danh sách sản phẩm của Đơn hàng (Cột Tồn kho và Loại hình Thường/BH, click vào số lượng chọn luôn số) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
              <span>Danh sách sản phẩm</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px]">
                {items.length} dòng
              </span>
            </h4>
            <div className="flex gap-2">
              {onOpenBarcodeScan && (
                <button
                  type="button"
                  onClick={onOpenBarcodeScan}
                  className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center gap-1 transition"
                >
                  <Scan className="w-3.5 h-3.5" />
                  Quét mã
                </button>
              )}
              <button
                type="button"
                onClick={addItemRow}
                className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1 shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm sản phẩm
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-2 w-8 text-center">STT</th>
                    <th className="py-2 px-2 min-w-[130px]">Mã SP *</th>
                    <th className="py-2 px-2 min-w-[160px]">Tên sản phẩm</th>
                    <th className="py-2 px-2 w-24">Kho</th>
                    <th className="py-2 px-2 w-20 text-right">SLG *</th>
                    <th className="py-2 px-2 w-24 text-right">Đơn giá</th>
                    <th className="py-2 px-2 w-28 text-right">Thành tiền</th>
                    <th className="py-2 px-2 w-20 text-right">Tồn kho</th>
                    <th className="py-2 px-2 w-28 text-center">Loại hình</th>
                    <th className="py-2 px-2 w-8 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const currentStock = getStock(item.idSp, item.kho);
                    const isBH = item.loaiHinh === 'Bảo hành' || item.loaiHinh === 'BH';

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
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </td>

                        {/* Kho */}
                        <td className="py-1 px-1.5">
                          <select
                            value={item.kho || kho}
                            onChange={(e) => handleItemKhoChange(index, e.target.value)}
                            className="w-full px-1.5 py-1 border border-slate-200 rounded-md text-xs bg-white text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none font-medium"
                          >
                            {getWarehouseOptions().map(w => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                          </select>
                        </td>

                        {/* SLG: Auto select text on focus so user can type immediately */}
                        <td className="py-1 px-1.5">
                          <input
                            type="number"
                            min="1"
                            value={item.slg}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleQtyChange(index, e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-bold text-blue-600 focus:ring-1 focus:ring-blue-500 outline-none text-right"
                          />
                        </td>

                        {/* Đơn giá */}
                        <td className="py-1 px-1.5">
                          <input
                            type="number"
                            min="0"
                            value={item.donGia}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handlePriceChange(index, e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none text-right"
                          />
                        </td>

                        {/* Thành tiền */}
                        <td className="py-1 px-2 font-bold text-slate-800 text-right whitespace-nowrap">
                          {formatNumber(item.thanhTien)}
                        </td>

                        {/* TỒN KHO */}
                        <td className="py-1 px-2 text-right whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[11px] ${
                            currentStock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {formatNumber(currentStock)}
                          </span>
                        </td>

                        {/* LOẠI HÌNH: THƯỜNG / BẢO HÀNH */}
                        <td className="py-1 px-1.5 text-center">
                          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => handleItemLoaiHinhChange(index, 'Thường')}
                              className={`px-2 py-0.5 rounded transition ${
                                !isBH 
                                  ? 'bg-blue-600 text-white shadow-xs font-bold' 
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              Thường
                            </button>
                            <button
                              type="button"
                              onClick={() => handleItemLoaiHinhChange(index, 'Bảo hành')}
                              className={`px-2 py-0.5 rounded transition ${
                                isBH 
                                  ? 'bg-amber-500 text-white shadow-xs font-bold' 
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              BH
                            </button>
                          </div>
                        </td>

                        {/* Xóa */}
                        <td className="py-1 px-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
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
                Tổng cộng: <span className="text-blue-600 font-extrabold">{items.length} mặt hàng</span>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-slate-500 font-normal">Tổng SLG: </span>
                  <span className="text-blue-700 text-sm font-extrabold">{formatNumber(totalQty)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">Tổng tiền: </span>
                  <span className="text-emerald-700 text-sm font-extrabold">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Ghi chú đơn hàng</label>
          <input
            type="text"
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            placeholder="Nhập ghi chú chi tiết cho phiếu nhập..."
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-200">
          <div>
            {isEditing && (hasActionPermission('nx.delete') || currentUser?.role === 'ADMIN') && (
              <button
                type="button"
                onClick={handleDeleteThisOrder}
                disabled={isSaving}
                className="px-3 py-2 bg-red-50 text-red-700 font-bold rounded-xl text-xs hover:bg-red-100 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa đơn này
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>{isEditing ? `Lưu cập nhật đơn (${items.length} SP)` : "Tạo phiếu nhập kho"}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

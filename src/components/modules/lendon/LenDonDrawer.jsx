import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Drawer } from '../../common/Drawer';
import { ProductSearchCell } from '../../common/ProductSearchCell';
import { CustomerSearchCell } from '../../common/CustomerSearchCell';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { useData } from '../../../context/DataContext';
import { formatDateInput, generateRandomOrderId, cleanNumber, formatCurrency, formatNumber, removeVietnameseTones } from '../../../utils/formatters';
import { calculateWarehouseStockMap } from '../../../utils/calculations';
import { Plus, Trash2, Scan, UserCheck, Package, Building2, Tag, Calendar, BadgePercent } from 'lucide-react';

const ORDER_LOAI_HINH_OPTIONS = [
  'Thường',
  'Bảo hành'
];

const ORDER_TRANG_THAI_OPTIONS = [
  'Chờ xuất',
  'Đã duyệt',
  'Đang xử lý',
  'Đã xuất',
  'Hoàn thành',
  'Đã hủy'
];

export function LenDonDrawer({ 
  isOpen, 
  onClose, 
  editOrderRows = null, 
  onSaved, 
  onDeleteOrder,
  onOpenBarcodeScan 
}) {
  const { currentUser, usersData, hasActionPermission, getHiddenProductIds, resolveRoleKey } = useAuth();
  const { getWarehouseOptions, getDefaultWarehouse } = useSettings();
  const { 
    nhapData, 
    xuatData, 
    transferData, 
    warehouseProductData, 
    productData, 
    cngiaspData,
    lenDonData,
    getProductMap,
    getLatestPriceMap,
    getPriceAtDate,
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
  const [trangThai, setTrangThai] = useState('Chờ xuất');
  const [initialSheetRows, setInitialSheetRows] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const isNpp = currentUser ? resolveRoleKey(currentUser.role) === 'NPP' : false;

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
      loaiHinh: 'Thường',
      priceSource: ''
    }
  ]);

  const productMap = useMemo(() => getProductMap(), [getProductMap]);

  // Inventory stock calculation map
  const warehouseStockMap = useMemo(() => {
    return calculateWarehouseStockMap(nhapData, xuatData, transferData, warehouseProductData);
  }, [nhapData, xuatData, transferData, warehouseProductData]);

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
      if (!cngiaspData || cngiaspData.length <= 1) fetchModule('cngiasp');
      if (!warehouseProductData || warehouseProductData.length <= 1) fetchModule('sanphamkho');
      if (!usersData || usersData.length === 0) {
        if (fetchUsersData) fetchUsersData();
      }
    }
  }, [isOpen, productData, cngiaspData, warehouseProductData, usersData, fetchModule, fetchUsersData]);

  const customerList = useMemo(() => {
    const role = currentUser ? resolveRoleKey(currentUser.role) : '';
    // SECURITY: If currentUser is an NPP, restrict suggestions strictly to their own account
    if (role === 'NPP' && currentUser?.id) {
      return [{
        id: currentUser.id,
        name: currentUser.name || currentUser.id,
        type: 'NPP'
      }];
    }

    const map = new Map();

    // 1. Scan usersData for Customers and NPPs
    (usersData || []).forEach(u => {
      if (!u.id) return;
      const uType = (u.type || '').toString().toUpperCase();
      const uRole = (u.role || '').toString().toUpperCase();
      if (uType.includes('KHÁCH') || uType.includes('NPP') || uRole === 'NPP' || uRole === 'KH') {
        const idNorm = u.id.toString().trim();
        const nameNorm = (u.name || idNorm).toString().trim();
        map.set(idNorm.toLowerCase(), {
          id: idNorm,
          name: nameNorm,
          type: u.type || u.role
        });
      }
    });

    // 2. Scan historical LEN_DON rows for customer pairs
    (lenDonData || []).slice(1).forEach(r => {
      if (!r || !Array.isArray(r)) return;
      const maKhVal = (r[4] || '').toString().trim();
      const tenKhVal = (r[5] || '').toString().trim();
      if (maKhVal || tenKhVal) {
        const key = (maKhVal || tenKhVal).toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: maKhVal || tenKhVal,
            name: tenKhVal || maKhVal,
            type: 'Khách hàng'
          });
        }
      }
    });

    // 3. Scan historical XUAT rows for customer pairs
    (xuatData || []).slice(1).forEach(r => {
      if (!r || !Array.isArray(r)) return;
      const maKhVal = (r[4] || '').toString().trim();
      const tenKhVal = (r[5] || '').toString().trim();
      if (maKhVal || tenKhVal) {
        const key = (maKhVal || tenKhVal).toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: maKhVal || tenKhVal,
            name: tenKhVal || maKhVal,
            type: 'Khách hàng'
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [currentUser, usersData, lenDonData, xuatData, resolveRoleKey]);

  // Product list for search & auto-fill evaluated according to selected order `date`
  const productList = useMemo(() => {
    const hiddenIds = new Set((getHiddenProductIds ? getHiddenProductIds() : []).map(id => (id || '').toString().trim().toUpperCase()));
    const map = new Map();

    const addProduct = (rawId, rawName, fallbackPrice = 0) => {
      if (!rawId) return;
      const id = rawId.toString().trim().toUpperCase();
      if (!id || hiddenIds.has(id)) return; // SECURITY: filter hidden products
      const idKey = id.toLowerCase();
      if (map.has(idKey)) return;

      const priceInfo = getPriceAtDate 
        ? getPriceAtDate(id, date) 
        : { price: fallbackPrice, effectiveDate: null, isFromCngiasp: false };

      map.set(idKey, {
        id,
        name: (rawName || id).toString().trim(),
        price: priceInfo?.price !== undefined ? priceInfo.price : fallbackPrice,
        priceSourceDate: priceInfo?.effectiveDate || null,
        isFromCngiasp: Boolean(priceInfo?.isFromCngiasp)
      });
    };

    // 1. First scan productData (DS_SP)
    (productData || []).slice(1).forEach(r => {
      if (!r || !Array.isArray(r)) return;
      const id = (r[0] || '').toString().trim();
      const name = (r[1] || '').toString().trim();
      const catalogPrice = cleanNumber(r[4]) || 0;
      addProduct(id, name, catalogPrice);
    });

    // 2. Scan cngiaspData (CN_GIA_SP)
    (cngiaspData || []).slice(1).forEach(r => {
      if (!r || !Array.isArray(r)) return;
      const id = (r[2] || '').toString().trim();
      const name = (r[3] || '').toString().trim();
      const sellingPrice = cleanNumber(r[5]) || 0;
      addProduct(id, name, sellingPrice);
    });

    // 3. Scan warehouseProductData (DS_SP_KHO)
    (warehouseProductData || []).slice(1).forEach(r => {
      if (!r || !Array.isArray(r)) return;
      const id = (r[2] || '').toString().trim();
      const name = (r[3] || '').toString().trim();
      addProduct(id, name, 0);
    });

    // 4. Scan historical lenDonData
    (lenDonData || []).slice(1).forEach(r => {
      if (!r || !Array.isArray(r)) return;
      const id = (r[6] || '').toString().trim();
      const name = (r[7] || '').toString().trim();
      const donGia = cleanNumber(r[9]) || 0;
      addProduct(id, name, donGia);
    });

    return Array.from(map.values()).sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  }, [productData, cngiaspData, warehouseProductData, lenDonData, date, getPriceAtDate, getHiddenProductIds]);

  // Helper to get effective price of a single product ID on a specific date (defaults to current order date)
  const getProductPriceInfo = useCallback((rawId, targetDate = date) => {
    if (!rawId) return { price: 0, date: null, isFromCngiasp: false };
    const cleanId = rawId.trim().toUpperCase();
    if (getPriceAtDate) {
      const info = getPriceAtDate(cleanId, targetDate);
      return {
        price: info?.price || 0,
        date: info?.effectiveDate || null,
        isFromCngiasp: Boolean(info?.isFromCngiasp)
      };
    }
    const catProd = productMap.get(cleanId.toLowerCase());
    return {
      price: catProd ? (cleanNumber(catProd.price) || 0) : 0,
      date: null,
      isFromCngiasp: false
    };
  }, [date, getPriceAtDate, productMap]);

  // When order date changes: automatically recalculate prices based on effective date
  const handleDateChange = (newDate) => {
    setDate(newDate);
    setItems(prevItems => prevItems.map(it => {
      if (!it.idSp || it.priceSource === 'Thủ công') return it;
      const priceInfo = getPriceAtDate ? getPriceAtDate(it.idSp, newDate) : { price: it.donGia, effectiveDate: null, isFromCngiasp: false };
      const newPrice = priceInfo.price;
      const numSlg = cleanNumber(it.slg) || 1;
      return {
        ...it,
        donGia: newPrice,
        thanhTien: numSlg * newPrice,
        priceSource: priceInfo.isFromCngiasp 
          ? `CN Giá SP (${priceInfo.effectiveDate || 'Áp dụng'})` 
          : (it.priceSource || 'DS_SP')
      };
    }));
  };

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
      const loadedTrangThai = firstRow[16] || 'Chờ xuất';

      const sheetRows = editOrderRows.map(r => r._sheetRow).filter(Boolean);
      setInitialSheetRows(sheetRows);

      const loadedItems = editOrderRows.map(r => {
        const idSp = (r[6] || '').toString().trim();
        const slg = cleanNumber(r[8]) || 1;
        const donGia = cleanNumber(r[9]) || 0;
        const thanhTien = cleanNumber(r[10]) || (slg * donGia);
        const itemLoaiHinh = (r[14] || '').toString().trim();
        const normItemLoaiHinh = itemLoaiHinh.toLowerCase().includes('bảo hành') || itemLoaiHinh.toUpperCase() === 'BH' ? 'Bảo hành' : 'Thường';
        const priceInfo = getProductPriceInfo(idSp, loadedDate);

        return {
          detailId: r[0] || '',
          _sheetRow: r._sheetRow || null,
          idSp,
          tenSp: r[7] || '',
          slg,
          donGia,
          thanhTien,
          kho: r[11] || defaultK,
          loaiHinh: normItemLoaiHinh,
          priceSource: priceInfo.isFromCngiasp ? `CN Giá SP (${priceInfo.date})` : 'DS_SP'
        };
      });

      setDate(loadedDate);
      setMdh(loadedMdh);
      setMaKh(loadedMaKh);
      setTenKhach(loadedTenKhach);
      setKho(loadedKho);
      setGhiChu(loadedGhiChu);
      setLoaiHinh(loadedLoaiHinh);
      setTrangThai(loadedTrangThai);
      setItems(loadedItems);
    } else {
      const newDate = formatDateInput(new Date());
      const newMdh = generateRandomOrderId('LD');
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
        loaiHinh: 'Thường',
        priceSource: ''
      }];

      setDate(newDate);
      setMdh(newMdh);
      setMaKh('');
      setTenKhach('');
      setKho(newKho);
      setGhiChu('');
      setLoaiHinh('Thường');
      setTrangThai('Chờ xuất');
      setInitialSheetRows([]);
      setItems(newItems);
    }
  }, [editOrderRows, isOpen, getDefaultWarehouse]);

  const handleCustomerSelect = (customerOrVal) => {
    if (typeof customerOrVal === 'object' && customerOrVal !== null) {
      setMaKh(customerOrVal.id || '');
      setTenKhach(customerOrVal.name || customerOrVal.id || '');
      return;
    }
    const val = (customerOrVal || '').toString();
    setTenKhach(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setMaKh('');
      return;
    }
    const normRaw = removeVietnameseTones(trimmed.toLowerCase().normalize('NFC'));
    const found = customerList.find(c => {
      const cId = (c.id || '').toLowerCase().normalize('NFC');
      const cName = (c.name || '').toLowerCase().normalize('NFC');
      const noToneName = removeVietnameseTones(cName);
      return (
        cId === normRaw ||
        cName === trimmed.toLowerCase().normalize('NFC') ||
        noToneName === normRaw ||
        `${cId} - ${cName}` === trimmed.toLowerCase().normalize('NFC')
      );
    });
    if (found) {
      setMaKh(found.id);
    }
  };

  const handleMaKhChange = (val) => {
    const raw = (val || '').toString().trim().normalize('NFC');
    setMaKh(raw.toUpperCase());
    if (!raw) return;
    const normRaw = raw.toLowerCase();
    const found = customerList.find(c => (c.id || '').toLowerCase().normalize('NFC') === normRaw);
    if (found) {
      setMaKh(found.id);
      setTenKhach(found.name);
    }
  };

  // When a product is selected from dropdown: ALWAYS fetch price effective on order date
  const handleProductSelect = (index, product) => {
    if (!product) return;
    const next = [...items];
    const item = next[index];
    item.idSp = product.id;
    item.tenSp = product.name;

    const priceInfo = getProductPriceInfo(product.id, date);
    item.donGia = priceInfo.price;
    item.thanhTien = (cleanNumber(item.slg) || 1) * priceInfo.price;
    item.priceSource = priceInfo.isFromCngiasp 
      ? `CN Giá SP (${priceInfo.date || 'Áp dụng'})` 
      : 'DS_SP';
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
    const priceInfo = getProductPriceInfo(targetId, date);
    const catProd = productMap.get(targetId.toLowerCase());

    if (catProd || priceInfo.price > 0) {
      if (catProd) item.tenSp = catProd.name;
      item.donGia = priceInfo.price || 0;
      item.thanhTien = (cleanNumber(item.slg) || 1) * (priceInfo.price || 0);
      item.priceSource = priceInfo.isFromCngiasp 
        ? `CN Giá SP (${priceInfo.date || 'Áp dụng'})` 
        : 'DS_SP';
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
    item.priceSource = 'Thủ công';
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
        loaiHinh,
        priceSource: ''
      }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) {
      setItems([{ 
        detailId: '', 
        _sheetRow: null, 
        idSp: '', 
        tenSp: '', 
        slg: 1, 
        donGia: 0, 
        thanhTien: 0, 
        kho,
        loaiHinh,
        priceSource: ''
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
    if (!mdh.trim()) return alert('Vui lòng nhập Mã đơn hàng!');
    const validItems = items.filter(it => it.idSp && it.idSp.trim());
    if (validItems.length === 0) return alert('Vui lòng nhập ít nhất 1 sản phẩm hợp lệ!');

    setIsSaving(true);
    try {
      const rowsToSave = validItems.map((it, idx) => ({
        _sheetRow: it._sheetRow,
        rowValues: [
          it.detailId || `LD-${Date.now()}-${idx + 1}`,
          date,
          'LÊN ĐƠN',
          mdh.trim().toUpperCase(),
          maKh.trim(),
          tenKhach.trim(),
          it.idSp.trim().toUpperCase(),
          it.tenSp.trim(),
          cleanNumber(it.slg),
          cleanNumber(it.donGia),
          cleanNumber(it.slg) * cleanNumber(it.donGia),
          it.kho || kho,
          currentUser?.id || '',
          ghiChu.trim(),
          it.loaiHinh || loaiHinh || 'Thường',
          cleanNumber(it.slg),
          trangThai || 'Chờ xuất'
        ]
      }));

      const remainingSheetRows = new Set(validItems.map(it => it._sheetRow).filter(Boolean));
      const deletedSheetRows = initialSheetRows.filter(sr => !remainingSheetRows.has(sr));

      await onSaved({ rowsToSave, deletedSheetRows });
      onClose();
    } catch (err) {
      alert("Lỗi khi lưu đơn hàng: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteThisOrder = async () => {
    if (!onDeleteOrder || !mdh) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ đơn hàng ${mdh} (${items.length} sản phẩm)?`)) {
      setIsSaving(true);
      try {
        await onDeleteOrder(mdh);
        onClose();
      } catch (err) {
        alert("Lỗi khi xóa đơn: " + err.message);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const isEditing = editOrderRows && editOrderRows.length > 0;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Chỉnh sửa Đơn hàng: ${mdh}` : "Tạo Đơn Hàng Mới (Lên Đơn)"}
      width="w-full max-w-[96vw] lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1500px]"
      contentClassName="flex-1 min-h-0 flex flex-col"
    >
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50 text-xs">
        {/* Form Body */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
          {/* Header Info Banner */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between text-amber-900">
            <div className="flex items-center gap-2">
              <BadgePercent className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium text-[11px]">
                Đơn giá sản phẩm tự động áp dụng <strong>giá hiệu lực theo ngày lập đơn</strong> từ module <strong>CN GIÁ SP</strong>.
              </span>
            </div>
            {onOpenBarcodeScan && (
              <button
                type="button"
                onClick={onOpenBarcodeScan}
                className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-800 font-bold hover:bg-amber-100 flex items-center gap-1.5 shadow-xs transition"
              >
                <Scan className="w-3.5 h-3.5 text-amber-600" />
                Quét mã
              </button>
            )}
          </div>

          {/* Master Order Info */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Ngày */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Ngày lập đơn <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-medium bg-slate-50/50"
                  required
                />
              </div>

              {/* Mã đơn */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mã đơn hàng (MDH) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={mdh}
                  onChange={(e) => setMdh(e.target.value.toUpperCase())}
                  placeholder="VD: LD001, DH102..."
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-bold text-blue-700 bg-slate-50/50 uppercase"
                  required
                />
              </div>

              {/* Tên khách / Khách hàng */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Khách hàng / NPP <span className="text-red-500">*</span>
                  </span>
                  {maKh && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      Mã: {maKh}
                    </span>
                  )}
                </label>
                <CustomerSearchCell
                  value={tenKhach}
                  selectedCode={maKh}
                  onChange={(val) => handleCustomerSelect(val)}
                  onSelectCustomer={(c) => {
                    setMaKh(c.id || '');
                    setTenKhach(c.name || c.id || '');
                  }}
                  customerList={customerList}
                  placeholder="Gõ tên hoặc mã khách..."
                  disabled={isNpp}
                />
              </div>

              {/* Mã KH */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mã khách hàng
                </label>
                <input
                  type="text"
                  value={maKh}
                  onChange={(e) => handleMaKhChange(e.target.value)}
                  placeholder="Mã KH (tự động điền)..."
                  disabled={isNpp}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-bold text-slate-700 bg-slate-50/50 uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
              {/* Kho xuất */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  Kho xuất mặc định
                </label>
                <select
                  value={kho}
                  onChange={(e) => {
                    const newK = e.target.value;
                    setKho(newK);
                    setItems(items.map(it => ({ ...it, kho: newK })));
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-medium bg-slate-50/50"
                >
                  {getWarehouseOptions().map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              {/* Trạng thái đơn */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Trạng thái đơn
                </label>
                <select
                  value={trangThai}
                  onChange={(e) => setTrangThai(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-medium bg-slate-50/50"
                >
                  {ORDER_TRANG_THAI_OPTIONS.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Loại hình */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Loại hình
                </label>
                <select
                  value={loaiHinh}
                  onChange={(e) => {
                    const newLh = e.target.value;
                    setLoaiHinh(newLh);
                    setItems(items.map(it => ({ ...it, loaiHinh: newLh })));
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-medium bg-slate-50/50"
                >
                  {ORDER_LOAI_HINH_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Ghi chú đơn hàng
              </label>
              <input
                type="text"
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                placeholder="Ghi chú thêm về đơn hàng, phương thức vận chuyển..."
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-medium bg-slate-50/50"
              />
            </div>
          </div>

          {/* Product Items Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-700 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                Danh sách sản phẩm ({items.length})
              </span>
              <button
                type="button"
                onClick={addItemRow}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs transition text-[11px]"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm dòng SP
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                    <th className="py-2.5 px-3 w-10 text-center">STT</th>
                    <th className="py-2.5 px-3 w-48 sm:w-56">Mã SP <span className="text-red-500">*</span></th>
                    <th className="py-2.5 px-3 min-w-[200px]">Tên sản phẩm</th>
                    <th className="py-2.5 px-3 w-24 text-right">Tồn kho</th>
                    <th className="py-2.5 px-3 w-24 text-right">SLG <span className="text-red-500">*</span></th>
                    <th className="py-2.5 px-3 w-36 text-right">
                      Đơn giá (CN Giá)
                    </th>
                    <th className="py-2.5 px-3 w-36 text-right">Thành tiền</th>
                    <th className="py-2.5 px-3 w-32">Kho</th>
                    <th className="py-2.5 px-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => {
                    const currentStock = getStock(it.idSp, it.kho);
                    const isOutOfStock = currentStock <= 0;
                    const isExceedStock = currentStock > 0 && (cleanNumber(it.slg) > currentStock);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition group">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <ProductSearchCell
                            value={it.idSp}
                            onChange={(val) => handleProductChange(idx, val)}
                            onSelectProduct={(p) => handleProductSelect(idx, p)}
                            productList={productList}
                            placeholder="Mã SP..."
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={it.tenSp}
                            onChange={(e) => {
                              const next = [...items];
                              next[idx].tenSp = e.target.value;
                              setItems(next);
                            }}
                            placeholder="Tên sản phẩm..."
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            isOutOfStock 
                              ? 'bg-rose-100 text-rose-700' 
                              : isExceedStock 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {formatNumber(currentStock)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="1"
                            value={it.slg}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-bold text-right text-blue-700 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={it.donGia}
                            onChange={(e) => handlePriceChange(idx, e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-bold text-right text-emerald-700 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                          {it.priceSource && (
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5 truncate text-right" title={it.priceSource}>
                              {it.priceSource}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                          {formatCurrency(it.thanhTien || 0)}
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={it.kho || kho}
                            onChange={(e) => handleItemKhoChange(idx, e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-medium bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                            {getWarehouseOptions().map(k => (
                              <option key={k} value={k}>{k}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="text-slate-400 hover:text-rose-600 transition p-1 rounded hover:bg-rose-50"
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

            {/* Total Row */}
            <div className="bg-slate-50 p-3 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
              <button
                type="button"
                onClick={addItemRow}
                className="text-blue-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm dòng khác
              </button>
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-slate-500">Tổng số lượng: </span>
                  <span className="font-extrabold text-blue-700 text-sm">{formatNumber(totalQty)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Tổng tiền hàng: </span>
                  <span className="font-extrabold text-rose-600 text-sm">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={handleDeleteThisOrder}
                disabled={isSaving}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 transition text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa đơn hàng
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 text-xs transition"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition flex items-center gap-1.5 text-xs"
            >
              {isSaving ? "Đang lưu..." : (isEditing ? "Cập nhật đơn hàng" : "Lưu đơn hàng")}
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

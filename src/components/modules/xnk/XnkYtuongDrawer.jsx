import React, { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../common/Drawer';
import { ProductSearchCell } from '../../common/ProductSearchCell';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { formatDateInput, cleanNumber, formatCurrency } from '../../../utils/formatters';
import { 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Save, 
  User, 
  Calendar, 
  Tag, 
  FileText,
  PackagePlus
} from 'lucide-react';

const TRANG_THAI_YTUONG = [
  'Mới tạo',
  'Đang thảo luận',
  'Đã duyệt',
  'Từ chối'
];

export function XnkYtuongDrawer({ 
  isOpen, 
  onClose, 
  editItem = null, 
  onSaved,
  onCreateSampleFromIdea 
}) {
  const { currentUser, hasActionPermission } = useAuth();
  const { appendRow, updateRow, logAuditAction, productData, fetchModule } = useData();

  useEffect(() => {
    if (isOpen) {
      if (!productData || productData.length <= 1) {
        fetchModule('sanpham');
      }
    }
  }, [isOpen, productData, fetchModule]);

  // Danh sách sản phẩm từ DS_SP
  const productList = useMemo(() => {
    if (!productData || productData.length <= 1) return [];
    return productData.slice(1).map(r => ({
      id: (r[0] || '').toString().trim(),
      name: (r[1] || '').toString().trim(),
      price: cleanNumber(r[4]) || 0
    })).filter(p => p.id);
  }, [productData]);

  const [idYtuong, setIdYtuong] = useState('');
  const [ngayTao, setNgayTao] = useState(formatDateInput(new Date()));
  const [nguoiTao, setNguoiTao] = useState('');
  const [skuDuKien, setSkuDuKien] = useState('');
  const [tenSp, setTenSp] = useState('');
  const [moTa, setMoTa] = useState('');
  const [linkThamKhao, setLinkThamKhao] = useState('');
  const [trangThai, setTrangThai] = useState('Mới tạo');
  const [nguoiDuyet, setNguoiDuyet] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canApprove = hasActionPermission('xnk.approve') || currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (editItem) {
      setIdYtuong(editItem.id_y_tuong || '');
      setNgayTao(editItem.ngay_tao ? formatDateInput(editItem.ngay_tao) : formatDateInput(new Date()));
      setNguoiTao(editItem.nguoi_tao || currentUser?.name || currentUser?.id || '');
      setSkuDuKien(editItem.sku_du_kien || '');
      setTenSp(editItem.ten_sp || '');
      setMoTa(editItem.mo_ta || '');
      setLinkThamKhao(editItem.link_tham_khao || '');
      setTrangThai(editItem.trang_thai || 'Mới tạo');
      setNguoiDuyet(editItem.nguoi_duyet || '');
      setGhiChu(editItem.ghi_chu || '');
    } else {
      // Auto-generate code YT-YYYYMMDD-XXXX
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setIdYtuong(`YT-${todayStr}-${randomSuffix}`);
      setNgayTao(formatDateInput(new Date()));
      setNguoiTao(currentUser?.name || currentUser?.id || 'Nhân viên');
      setSkuDuKien('');
      setTenSp('');
      setMoTa('');
      setLinkThamKhao('');
      setTrangThai('Mới tạo');
      setNguoiDuyet('');
      setGhiChu('');
    }
    setErrorMsg('');
  }, [editItem, isOpen, currentUser]);

  const handleApprove = () => {
    setTrangThai('Đã duyệt');
    setNguoiDuyet(currentUser?.name || currentUser?.id || 'Quản lý');
  };

  const handleReject = () => {
    setTrangThai('Từ chối');
    setNguoiDuyet(currentUser?.name || currentUser?.id || 'Quản lý');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenSp.trim()) {
      setErrorMsg('Vui lòng nhập tên sản phẩm ý tưởng!');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      // Columns: ['id_y_tuong', 'ngay_tao', 'nguoi_tao', 'sku_du_kien', 'ten_sp', 'mo_ta', 'link_tham_khao', 'trang_thai', 'nguoi_duyet', 'ghi_chu']
      const rowValues = [
        idYtuong.trim(),
        ngayTao,
        nguoiTao.trim(),
        skuDuKien.trim(),
        tenSp.trim(),
        moTa.trim(),
        linkThamKhao.trim(),
        trangThai,
        nguoiDuyet.trim(),
        ghiChu.trim()
      ];

      if (editItem?._sheetRow) {
        await updateRow('xnk_ytuong', editItem._sheetRow, rowValues);
        if (logAuditAction) {
          await logAuditAction({
            moduleName: 'xnk',
            actionType: 'SỬA',
            orderId: idYtuong,
            targetObject: tenSp,
            summary: `Cập nhật ý tưởng SP: ${tenSp} (${trangThai})`
          });
        }
      } else {
        await appendRow('xnk_ytuong', rowValues);
        if (logAuditAction) {
          await logAuditAction({
            moduleName: 'xnk',
            actionType: 'THÊM',
            orderId: idYtuong,
            targetObject: tenSp,
            summary: `Tạo mới ý tưởng SP: ${tenSp}`
          });
        }
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Lỗi lưu ý tưởng:', err);
      setErrorMsg('Không thể lưu dữ liệu lên hệ thống. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? `Sửa Ý Tưởng: ${idYtuong}` : 'Thêm Ý Tưởng Sản Phẩm Mới'}
      width="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Mã & Ngày tạo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã ý tưởng
            </label>
            <input
              type="text"
              value={idYtuong}
              readOnly
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ngày đề xuất
            </label>
            <input
              type="date"
              value={ngayTao}
              onChange={(e) => setNgayTao(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Người tạo & SKU dự kiến */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Người đề xuất
            </label>
            <input
              type="text"
              value={nguoiTao}
              onChange={(e) => setNguoiTao(e.target.value)}
              placeholder="Họ tên người tạo..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                SKU dự kiến
              </label>
              {productList.length > 0 && (
                <span className="text-[10px] text-blue-600 font-bold">
                  ({productList.length} SP có sẵn)
                </span>
              )}
            </div>
            <ProductSearchCell
              value={skuDuKien}
              onChange={(val) => setSkuDuKien(val)}
              onSelectProduct={(prod) => {
                setSkuDuKien(prod.id);
                if (prod.name && (!tenSp || !tenSp.trim())) {
                  setTenSp(prod.name);
                }
              }}
              productList={productList}
              placeholder="VD: LNK-NEW-01 hoặc chọn từ DS_SP..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-blue-800 uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
            {productList.length > 0 && (
              <div className="mt-1">
                <select
                  value=""
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (!selectedId) return;
                    const found = productList.find(p => p.id === selectedId);
                    if (found) {
                      setSkuDuKien(found.id);
                      if (found.name && (!tenSp || !tenSp.trim())) {
                        setTenSp(found.name);
                      }
                    }
                  }}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 outline-none hover:bg-slate-100 cursor-pointer"
                >
                  <option value="">-- Hoặc chọn nhanh từ DS sản phẩm ({productList.length} SP) --</option>
                  {productList.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.id}] {p.name} {p.price > 0 ? `(${formatCurrency(p.price)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tên sản phẩm */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Tên sản phẩm ý tưởng <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={tenSp}
            onChange={(e) => setTenSp(e.target.value)}
            placeholder="Nhập tên sản phẩm dự kiến..."
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            required
          />
        </div>

        {/* Link tham khảo */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">
              Link sản phẩm tham khảo (1688, Taobao, Shopee, v.v.)
            </label>
            {linkThamKhao && (
              <a
                href={linkThamKhao.startsWith('http') ? linkThamKhao : `https://${linkThamKhao}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
              >
                Mở link <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <input
            type="text"
            value={linkThamKhao}
            onChange={(e) => setLinkThamKhao(e.target.value)}
            placeholder="https://detail.1688.com/offer/..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Mô tả tính năng / thị trường */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Mô tả chi tiết ý tưởng (tính năng, ưu điểm, nhu cầu thị trường)
          </label>
          <textarea
            rows={3}
            value={moTa}
            onChange={(e) => setMoTa(e.target.value)}
            placeholder="Ghi rõ thông số dự kiến, điểm nổi bật, lý do nên nhập bán..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
          />
        </div>

        {/* Trạng thái duyệt & Quyền duyệt của Sếp */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Trạng thái phê duyệt:</span>
            <select
              value={trangThai}
              onChange={(e) => setTrangThai(e.target.value)}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
            >
              {TRANG_THAI_YTUONG.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {canApprove && (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
              <span className="text-[11px] text-slate-500 font-medium mr-auto">Duyệt nhanh:</span>
              <button
                type="button"
                onClick={handleApprove}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center gap-1 transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt ý tưởng
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center gap-1 transition cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" /> Từ chối
              </button>
            </div>
          )}

          {nguoiDuyet && (
            <div className="text-[11px] text-slate-500">
              Người phê duyệt: <strong className="text-slate-700">{nguoiDuyet}</strong>
            </div>
          )}
        </div>

        {/* Ghi chú thảo luận */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Ghi chú thảo luận & ý kiến đóng góp
          </label>
          <input
            type="text"
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            placeholder="Các góp ý trong buổi họp thảo luận..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Chuyển sang đặt mẫu nếu đã duyệt */}
        {editItem && trangThai === 'Đã duyệt' && onCreateSampleFromIdea && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="text-xs text-blue-800 font-semibold">
              Ý tưởng đã được duyệt! Bạn có thể tạo yêu cầu đặt mẫu thử ngay.
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onCreateSampleFromIdea(editItem);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
            >
              <PackagePlus className="w-3.5 h-3.5" /> Đặt mẫu ngay
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Đang lưu...' : (editItem ? 'Cập nhật' : 'Tạo ý tưởng')}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

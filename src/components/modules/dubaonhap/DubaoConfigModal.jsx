import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';

export function DubaoConfigModal({ isOpen, onClose, currentParams, onSaveParams, targetProduct = null }) {
  const [globalLeadTime, setGlobalLeadTime] = useState(7);
  const [globalBufferDays, setGlobalBufferDays] = useState(30);

  // Per-product config if editing single product
  const [itemLeadTime, setItemLeadTime] = useState(7);
  const [itemBufferDays, setItemBufferDays] = useState(30);
  const [itemMethod, setItemMethod] = useState('top3');
  const [initialSnapshot, setInitialSnapshot] = useState('');

  useEffect(() => {
    if (currentParams) {
      const gLt = currentParams.globalLeadTime ?? 7;
      const gBuf = currentParams.globalBufferDays ?? 30;
      setGlobalLeadTime(gLt);
      setGlobalBufferDays(gBuf);

      let iLt = 7;
      let iBuf = 30;
      let iMeth = 'top3';

      if (targetProduct && currentParams.items?.[targetProduct.id]) {
        const itemCfg = currentParams.items[targetProduct.id];
        iLt = itemCfg.leadTime ?? gLt;
        iBuf = itemCfg.bufferDays ?? gBuf;
        iMeth = itemCfg.method ?? 'top3';
      } else if (targetProduct) {
        iLt = gLt;
        iBuf = gBuf;
        iMeth = 'top3';
      }
      setItemLeadTime(iLt);
      setItemBufferDays(iBuf);
      setItemMethod(iMeth);

      setInitialSnapshot(JSON.stringify({
        globalLeadTime: Number(gLt),
        globalBufferDays: Number(gBuf),
        itemLeadTime: Number(iLt),
        itemBufferDays: Number(iBuf),
        itemMethod: iMeth,
        targetProductId: targetProduct?.id || null
      }));
    }
  }, [currentParams, targetProduct, isOpen]);

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      globalLeadTime: Number(globalLeadTime),
      globalBufferDays: Number(globalBufferDays),
      itemLeadTime: Number(itemLeadTime),
      itemBufferDays: Number(itemBufferDays),
      itemMethod,
      targetProductId: targetProduct?.id || null
    });
  }, [globalLeadTime, globalBufferDays, itemLeadTime, itemBufferDays, itemMethod, targetProduct]);

  const isDirty = initialSnapshot !== '' && currentSnapshot !== initialSnapshot;

  const handleSave = () => {
    const updated = {
      ...currentParams,
      globalLeadTime: Number(globalLeadTime) || 7,
      globalBufferDays: Number(globalBufferDays) || 30,
      items: { ...(currentParams?.items || {}) }
    };

    if (targetProduct) {
      updated.items[targetProduct.id] = {
        leadTime: Number(itemLeadTime) || 7,
        bufferDays: Number(itemBufferDays) || 30,
        method: itemMethod
      };
    }

    onSaveParams(updated);
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      confirmOnClose={isDirty}
      title={targetProduct ? `Cấu hình dự báo cho ${targetProduct.id} - ${targetProduct.name}` : "Cài đặt tham số Dự Báo Nhập Hàng"}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 text-xs">
        {targetProduct ? (
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-purple-900">
              <p className="font-bold">{targetProduct.id} - {targetProduct.name}</p>
              <p className="text-[11px] text-purple-700 mt-0.5">Tồn hiện tại: {targetProduct.tonCuoi} | Xuất TB/ngày (DAS): {targetProduct.das}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Thời gian giao hàng (Lead Time - Ngày)</label>
                <input
                  type="number"
                  min="0"
                  value={itemLeadTime}
                  onChange={(e) => setItemLeadTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Dự trữ an toàn (Buffer - Ngày)</label>
                <input
                  type="number"
                  min="0"
                  value={itemBufferDays}
                  onChange={(e) => setItemBufferDays(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-600 uppercase mb-1">Phương pháp tính trung bình tháng xuất</label>
              <select
                value={itemMethod}
                onChange={(e) => setItemMethod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="top3">Top 3 tháng xuất nhiều nhất (Khuyến nghị cho SP mùa vụ / tăng trưởng)</option>
                <option value="12m">Trung bình 12 tháng gần nhất (Chuẩn hóa cả năm)</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-500">
              Các tham số toàn cục này sẽ được áp dụng tự động cho tất cả các sản phẩm chưa có cấu hình riêng biệt.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Lead Time mặc định (Ngày)</label>
                <input
                  type="number"
                  min="0"
                  value={globalLeadTime}
                  onChange={(e) => setGlobalLeadTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Thời gian từ khi đặt PO tới khi hàng nhập kho</span>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Buffer Days mặc định (Ngày)</label>
                <input
                  type="number"
                  min="0"
                  value={globalBufferDays}
                  onChange={(e) => setGlobalBufferDays(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Số ngày tồn kho an toàn chống đứt hàng</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-[2] py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-sm transition"
          >
            Lưu cài đặt tham số
          </button>
        </div>
      </div>
    </Modal>
  );
}

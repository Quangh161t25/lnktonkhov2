import React, { useState } from 'react';
import { Modal } from './Modal';
import { recognizeOrderImage } from '../../services/ocrService';
import { Upload, FileText, CheckCircle2, RotateCw, AlertCircle, Plus } from 'lucide-react';

export function OcrOrderModal({ isOpen, onClose, onApplyItems }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedData, setDetectedData] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setDetectedData(null);
    setError('');
  };

  const handleProcessOcr = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setProgress(0);
    try {
      const result = await recognizeOrderImage(file, p => setProgress(p));
      setDetectedData(result);
    } catch (err) {
      setError(err.message || 'Lỗi quét hình ảnh');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!detectedData || !detectedData.detectedItems) return;
    onApplyItems(detectedData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quét ảnh đơn hàng / Phiếu xuất bằng OCR" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Upload Box */}
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 transition cursor-pointer relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          {previewUrl ? (
            <div className="flex flex-col items-center gap-2">
              <img src={previewUrl} alt="Order preview" className="max-h-48 rounded-xl object-contain shadow-sm" />
              <span className="text-xs text-blue-600 font-semibold">Nhấn để đổi ảnh khác</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Kéo thả hoặc tải lên ảnh phiếu đơn hàng / hoá đơn</p>
              <p className="text-[11px] text-slate-400">Hỗ trợ định dạng PNG, JPG, JPEG</p>
            </div>
          )}
        </div>

        {file && !detectedData && (
          <button
            onClick={handleProcessOcr}
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Đang xử lý OCR ({progress}%)...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Bắt đầu nhận diện đơn hàng</span>
              </>
            )}
          </button>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {detectedData && (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center justify-between border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Mã đơn hàng: <strong className="font-bold">{detectedData.detectedMdh || 'Tự động tạo'}</strong></span>
              </div>
              <span>Tìm thấy: <strong>{detectedData.detectedItems.length}</strong> sản phẩm</span>
            </div>

            {detectedData.detectedItems.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Mã SP</th>
                      <th className="p-2.5">Số lượng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detectedData.detectedItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-bold text-slate-800">{item.idSp}</td>
                        <td className="p-2.5 text-blue-600 font-bold">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Không tự động bóc tách được dòng sản phẩm. Bạn có thể xem nội dung thô bên dưới.</p>
            )}

            <button
              onClick={handleApply}
              className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm vào phiếu xuất / nhập</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

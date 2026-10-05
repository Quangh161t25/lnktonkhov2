import React, { useState } from 'react';
import { Modal } from './Modal';
import { parseExcelFile } from '../../services/excelService';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';

export function ExcelUploadModal({ isOpen, onClose, moduleName, expectedColumns = [], onImportRows }) {
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importMode, setImportMode] = useState('append'); // 'append' or 'replace'

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError('');
    setLoading(true);

    try {
      const rows = await parseExcelFile(selected);
      if (!rows || rows.length <= 1) {
        throw new Error('File Excel rỗng hoặc chỉ có dòng tiêu đề.');
      }
      setPreviewRows(rows);
    } catch (err) {
      setError(err.message || 'Lỗi đọc file Excel.');
      setPreviewRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!previewRows || previewRows.length <= 1) return;
    onImportRows(previewRows, importMode);
    onClose();
  };

  const handleCancel = () => {
    if (previewRows.length > 0) {
      if (window.confirm('Bạn có chắc chắn muốn hủy tải lên? Dữ liệu chưa nhập sẽ bị hủy.')) {
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
      confirmOnClose={previewRows.length > 0}
      confirmMessage="Bạn có chắc chắn muốn hủy tải lên? Dữ liệu chưa nhập sẽ bị hủy."
      title={`Tải lên Excel - ${moduleName?.toUpperCase()}`} 
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Upload Zone */}
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 transition cursor-pointer relative">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="space-y-2">
            <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto" />
            <p className="text-xs font-bold text-slate-700">
              {file ? file.name : 'Nhấn để chọn hoặc kéo thả file Excel (.xlsx, .xls, .csv)'}
            </p>
            <p className="text-[11px] text-slate-400">Hệ thống sẽ đọc dòng đầu tiên làm tiêu đề</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {previewRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-bold">Xem trước: {previewRows.length - 1} dòng dữ liệu</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={(e) => setImportMode(e.target.value)}
                  />
                  <span>Thêm tiếp vào cuối</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={(e) => setImportMode(e.target.value)}
                  />
                  <span className="text-red-600 font-medium">Ghi đè toàn bộ</span>
                </label>
              </div>
            </div>

            {/* Table Preview */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    {previewRows[0]?.map((col, idx) => (
                      <th key={idx} className="p-2.5 whitespace-nowrap">{String(col)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.slice(1, 11).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2.5 text-slate-600 whitespace-nowrap">{String(cell || '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewRows.length > 11 && (
              <p className="text-[11px] text-slate-400 text-center italic">
                ...và còn {previewRows.length - 11} dòng khác
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="flex-[2] py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 shadow-sm transition"
              >
                Xác nhận nhập {previewRows.length - 1} dòng
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

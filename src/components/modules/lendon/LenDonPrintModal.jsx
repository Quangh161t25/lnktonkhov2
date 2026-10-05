import React from 'react';
import { Modal } from '../../common/Modal';
import { formatDateVN, formatCurrency, formatNumber } from '../../../utils/formatters';
import { Printer } from 'lucide-react';

export function LenDonPrintModal({ isOpen, onClose, orderRows = [] }) {
  if (!orderRows || orderRows.length === 0) return null;

  const firstRow = orderRows[0];
  const mdh = firstRow[3] || '';
  const date = firstRow[1] || '';
  const maKh = firstRow[4] || '';
  const tenKh = firstRow[5] || '';
  const kho = firstRow[11] || '';
  const ghiChu = firstRow[13] || '';

  const totalAmount = orderRows.reduce((sum, r) => sum + (Number(r[10]) || 0), 0);
  const totalQty = orderRows.reduce((sum, r) => sum + (Number(r[8]) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Phiếu Lên Đơn - ${mdh}`} maxWidth="max-w-3xl">
      <div className="space-y-6 print:p-0">
        {/* Printable Paper Area */}
        <div id="printArea" className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm text-slate-800 text-xs space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Company & Order Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-blue-600 uppercase tracking-wide">CÔNG TY TNHH LNK</h2>
              <p className="text-slate-500 text-[11px] mt-0.5">Địa chỉ: Hệ thống phân phối & Kho hàng toàn quốc</p>
              <p className="text-slate-500 text-[11px]">Hotline: 1900 xxxx - Email: support@lnk.vn</p>
            </div>
            <div className="text-right">
              <h3 className="text-lg font-bold text-slate-800 uppercase">PHIẾU LÊN ĐƠN BÁN HÀNG</h3>
              <p className="text-xs font-bold text-slate-600 mt-1">Mã đơn: <span className="text-blue-600">{mdh}</span></p>
              <p className="text-slate-500 text-[11px]">Ngày lập đơn: {formatDateVN(date)}</p>
            </div>
          </div>

          {/* Customer / Destination Details */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
            <div>
              <p><strong className="text-slate-700">Khách hàng / Đại lý:</strong> {tenKh || maKh}</p>
              <p><strong className="text-slate-700">Mã KH:</strong> {maKh || '---'}</p>
            </div>
            <div>
              <p><strong className="text-slate-700">Kho xuất dự kiến:</strong> {kho}</p>
              <p><strong className="text-slate-700">Ghi chú:</strong> {ghiChu || 'Không'}</p>
            </div>
          </div>

          {/* Products Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-10 text-center">STT</th>
                  <th className="p-2.5">Mã SP</th>
                  <th className="p-2.5">Tên sản phẩm</th>
                  <th className="p-2.5 text-right w-20">SLG</th>
                  <th className="p-2.5 text-right w-28">Đơn giá</th>
                  <th className="p-2.5 text-right w-32">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orderRows.map((r, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                    <td className="p-2.5 font-bold text-slate-800">{r[6]}</td>
                    <td className="p-2.5 text-slate-700">{r[7]}</td>
                    <td className="p-2.5 text-right font-bold text-slate-800">{formatNumber(r[8])}</td>
                    <td className="p-2.5 text-right text-slate-600">{formatCurrency(r[9])}</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(r[10])}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                <tr>
                  <td colSpan={3} className="p-3 text-right">Tổng cộng:</td>
                  <td className="p-3 text-right text-blue-600">{formatNumber(totalQty)}</td>
                  <td></td>
                  <td className="p-3 text-right text-orange-600 text-sm">{formatCurrency(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-4 text-center pt-8 text-xs">
            <div>
              <p className="font-bold text-slate-700">Người lập đơn</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, họ tên)</p>
              <div className="h-16"></div>
            </div>
            <div>
              <p className="font-bold text-slate-700">Kế toán / Quản lý</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, họ tên)</p>
              <div className="h-16"></div>
            </div>
            <div>
              <p className="font-bold text-slate-700">Khách hàng nhận</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, họ tên)</p>
              <div className="h-16"></div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 text-xs"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm text-xs"
          >
            <Printer className="w-4 h-4" />
            In phiếu lên đơn
          </button>
        </div>
      </div>
    </Modal>
  );
}

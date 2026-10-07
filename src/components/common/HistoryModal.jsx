import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from './Modal';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { 
  History, 
  Search, 
  RotateCcw, 
  RefreshCw, 
  Eye, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar
} from 'lucide-react';
import { matchesSearch } from '../../utils/formatters';

const ACTION_COLORS = {
  'THÊM_MỚI': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'CHỈNH_SỬA': 'bg-blue-50 text-blue-700 border-blue-200',
  'XÓA_DÒNG': 'bg-rose-50 text-rose-700 border-rose-200',
  'XÓA_ĐƠN': 'bg-red-50 text-red-700 border-red-200',
  'IMPORT_EXCEL': 'bg-purple-50 text-purple-700 border-purple-200',
  'KHÔI_PHỤC': 'bg-amber-50 text-amber-700 border-amber-200'
};

export function HistoryModal({
  isOpen,
  onClose,
  defaultModule = '',
  defaultOrderId = '',
  title = 'Lịch sử thay đổi & thao tác'
}) {
  const { lichSuData, fetchLichSuData, rollbackAuditAction } = useData();
  const { currentUser, hasRole } = useAuth();

  const [searchTerm, setSearchTerm] = useState(defaultOrderId || '');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState(defaultModule || 'ALL');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [inspectRow, setInspectRow] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultOrderId) setSearchTerm(defaultOrderId);
      if (defaultModule) setSelectedModule(defaultModule);
      if (fetchLichSuData) {
        fetchLichSuData(false).catch(() => {});
      }
    }
  }, [isOpen, defaultOrderId, defaultModule, fetchLichSuData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (fetchLichSuData) await fetchLichSuData(true);
    } catch (e) {
      console.warn('Refresh lich su failed:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Parse logs from lichSuData (skip header row if present)
  const logs = useMemo(() => {
    if (!lichSuData || !Array.isArray(lichSuData)) return [];
    const rows = lichSuData.slice(1); // skip header row
    return rows.map((r, idx) => {
      const [
        id, thoiGian, nguoiDung, vaiTro, phanHe, thaoTac,
        maDon, doiTuong, tomTat, duLieuCuRaw, duLieuMoiRaw, trangThaiKhoiPhuc
      ] = r || [];

      let oldData = null;
      let newData = null;
      try {
        if (duLieuCuRaw) oldData = JSON.parse(duLieuCuRaw);
      } catch (e) {
        oldData = duLieuCuRaw;
      }
      try {
        if (duLieuMoiRaw) newData = JSON.parse(duLieuMoiRaw);
      } catch (e) {
        newData = duLieuMoiRaw;
      }

      return {
        rawRow: r,
        id: id || `LOG_${idx}`,
        thoiGian: thoiGian || '',
        nguoiDung: nguoiDung || '',
        vaiTro: vaiTro || '',
        phanHe: (phanHe || '').toString().trim().toUpperCase(),
        thaoTac: (thaoTac || '').toString().trim().toUpperCase(),
        maDon: (maDon || '').toString().trim(),
        doiTuong: doiTuong || '',
        tomTat: tomTat || '',
        oldData,
        newData,
        trangThaiKhoiPhuc: (trangThaiKhoiPhuc || 'GỐC').toString().trim()
      };
    });
  }, [lichSuData]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      if (selectedModule !== 'ALL' && item.phanHe !== selectedModule) {
        return false;
      }
      if (selectedAction !== 'ALL' && item.thaoTac !== selectedAction) {
        return false;
      }
      if (searchTerm) {
        const text = `${item.maDon} ${item.doiTuong} ${item.tomTat} ${item.nguoiDung} ${item.thoiGian}`;
        if (!matchesSearch(text, searchTerm)) return false;
      }
      return true;
    });
  }, [logs, selectedModule, selectedAction, searchTerm]);

  // Handle Rollback
  const handleRollback = async (logItem) => {
    if (!logItem.oldData) {
      alert('Bản ghi này không có dữ liệu cũ để khôi phục.');
      return;
    }
    if (logItem.trangThaiKhoiPhuc.startsWith('ĐÃ_KHÔI_PHỤC')) {
      alert('Thao tác này đã được khôi phục trước đó.');
      return;
    }

    const confirmMsg = `Bạn có chắc chắn muốn KHÔI PHỤC lại thao tác [${logItem.thaoTac}] của đơn ${logItem.maDon || ''}?\n\nNội dung: ${logItem.tomTat}`;
    if (!window.confirm(confirmMsg)) return;

    setIsRollingBack(true);
    try {
      await rollbackAuditAction(logItem.rawRow);
      alert('Khôi phục thành công!');
    } catch (err) {
      alert('Lỗi khi khôi phục: ' + (err.message || err));
    } finally {
      setIsRollingBack(false);
    }
  };

  const isAdminOrManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'QUẢN LÝ' || !currentUser?.role;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          <span>{title}</span>
          {defaultOrderId && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800">
              {defaultOrderId}
            </span>
          )}
        </div>
      }
      maxWidth="max-w-6xl"
    >
      <div className="space-y-4">
        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã đơn, sản phẩm, nhân viên..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Module Filter (if not locked) */}
            {!defaultModule && (
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả phân hệ</option>
                <option value="NHẬP">Nhập kho</option>
                <option value="XUẤT">Xuất kho</option>
              </select>
            )}

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả thao tác</option>
              <option value="THÊM_MỚI">Thêm mới</option>
              <option value="CHỈNH_SỬA">Chỉnh sửa</option>
              <option value="XÓA_DÒNG">Xóa dòng</option>
              <option value="XÓA_ĐƠN">Xóa đơn</option>
              <option value="IMPORT_EXCEL">Import Excel</option>
              <option value="KHÔI_PHỤC">Khôi phục</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {filteredLogs.length} bản ghi
            </span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
              title="Làm mới lịch sử"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>

        {/* History List Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto max-h-[58vh]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-semibold sticky top-0 z-10 border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 w-36">Thời gian</th>
                  <th className="py-2.5 px-3 w-40">Người thực hiện</th>
                  <th className="py-2.5 px-3 w-28">Thao tác</th>
                  <th className="py-2.5 px-3 w-32">Mã đơn</th>
                  <th className="py-2.5 px-4">Tóm tắt nội dung</th>
                  <th className="py-2.5 px-3 w-32 text-center">Trạng thái</th>
                  <th className="py-2.5 px-3 w-24 text-right">Xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                      Chưa có lịch sử thao tác nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((item) => {
                    const isExpanded = expandedLogId === item.id;
                    const isRestored = item.trangThaiKhoiPhuc.startsWith('ĐÃ_KHÔI_PHỤC');
                    const badgeClass = ACTION_COLORS[item.thaoTac] || 'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <React.Fragment key={item.id}>
                        <tr className={`hover:bg-blue-50/40 transition-colors ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                          {/* Thời gian */}
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                            {item.thoiGian}
                          </td>

                          {/* Người thực hiện */}
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-800 truncate max-w-[150px]">
                              {item.nguoiDung}
                            </div>
                            {item.vaiTro && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({item.vaiTro})
                              </span>
                            )}
                          </td>

                          {/* Thao tác */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeClass}`}>
                              {item.thaoTac}
                            </span>
                          </td>

                          {/* Mã đơn */}
                          <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-slate-700">
                            {item.maDon || '-'}
                          </td>

                          {/* Tóm tắt */}
                          <td className="py-2.5 px-4 text-slate-700">
                            <div className="line-clamp-2" title={item.tomTat}>
                              {item.tomTat}
                            </div>
                          </td>

                          {/* Trạng thái */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {isRestored ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                                <RotateCcw className="w-2.5 h-2.5" />
                                Đã khôi phục
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                Gốc
                              </span>
                            )}
                          </td>

                          {/* Nút hành động */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {/* Xem chi tiết so sánh */}
                              {(item.oldData || item.newData) && (
                                <button
                                  type="button"
                                  onClick={() => setInspectRow(inspectRow?.id === item.id ? null : item)}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                                  title="Xem dữ liệu so sánh chi tiết"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Nút khôi phục */}
                              {isAdminOrManager && item.oldData && !isRestored && item.thaoTac !== 'KHÔI_PHỤC' && (
                                <button
                                  type="button"
                                  onClick={() => handleRollback(item)}
                                  disabled={isRollingBack}
                                  className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition disabled:opacity-50"
                                  title="Khôi phục lại dữ liệu trước thao tác này"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Undo
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Inspection Modal (Diff Comparison) */}
        {inspectRow && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 text-sm">
                  Chi tiết bản ghi: {inspectRow.maDon || inspectRow.id}
                </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${ACTION_COLORS[inspectRow.thaoTac] || 'bg-slate-100 text-slate-700'}`}>
                  {inspectRow.thaoTac}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectRow(null)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                ✕ Đóng xem chi tiết
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dữ liệu cũ */}
              <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg">
                <div className="text-xs font-bold text-rose-800 mb-2 flex items-center gap-1.5">
                  <span>DỮ LIỆU CŨ (TRƯỚC KHI THAY ĐỔI / ĐÃ XÓA)</span>
                </div>
                <pre className="text-[11px] font-mono text-slate-700 bg-white p-2.5 rounded border border-rose-100 overflow-x-auto max-h-56 leading-relaxed">
                  {inspectRow.oldData ? JSON.stringify(inspectRow.oldData, null, 2) : '(Không có dữ liệu cũ - Thêm mới)'}
                </pre>
              </div>

              {/* Dữ liệu mới */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                <div className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                  <span>DỮ LIỆU MỚI (SAU KHI THAY ĐỔI)</span>
                </div>
                <pre className="text-[11px] font-mono text-slate-700 bg-white p-2.5 rounded border border-emerald-100 overflow-x-auto max-h-56 leading-relaxed">
                  {inspectRow.newData ? JSON.stringify(inspectRow.newData, null, 2) : '(Không có dữ liệu mới - Thao tác Xóa)'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

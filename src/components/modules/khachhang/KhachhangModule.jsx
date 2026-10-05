import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { KhachhangDrawer } from './KhachhangDrawer';
import { Pagination } from '../../common/Pagination';
import { ExcelUploadModal } from '../../common/ExcelUploadModal';
import { ColumnManagerModal } from '../../common/ColumnManagerModal';
import { useColumnManager } from '../../../hooks/useColumnManager';
import { exportToExcel, downloadModuleTemplate } from '../../../services/excelService';
import { matchesSearch } from '../../../utils/formatters';
import { 
  Plus, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Search, 
  UserCheck, 
  Edit3, 
  Trash2,
  Building,
  SlidersHorizontal,
  RotateCw
} from 'lucide-react';

const DEFAULT_KHACHHANG_COLUMNS = [
  { key: 'id_kh', label: 'Mã khách hàng / NPP', width: 140, align: 'left', format: 'bold' },
  { key: 'ten_kh', label: 'Tên doanh nghiệp / Đối tác', width: 240, align: 'left', format: 'default' },
  { key: 'loai_hinh', label: 'Phân loại', width: 130, align: 'left', format: 'badge' },
  { key: 'web_acc', label: 'Tài khoản Web', width: 120, align: 'left', format: 'default' },
  { key: 'actions', label: 'Thao tác', width: 90, align: 'center', format: 'default' },
];

export function KhachhangModule() {
  const { usersData, isAdminSession } = useAuth();
  const { upsertUser, deleteUser, fetchUsersData } = useData();

  // Column Manager Hook
  const {
    columns,
    visibleColumns,
    isConfigModalOpen,
    openConfigModal,
    closeConfigModal,
    toggleVisibility,
    updateColumnProp,
    moveColumn,
    resetToDefault
  } = useColumnManager('khachhang', DEFAULT_KHACHHANG_COLUMNS);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Always fetch fresh customer data when visiting KhachhangModule
  React.useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  const handleDeleteCustomer = async (u) => {
    if (!u.sheetRow) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa đối tác: ${u.id} - ${u.name}?`)) {
      try {
        await deleteUser(u.sheetRow);
        alert('Đã xóa đối tác thành công.');
      } catch (err) {
        alert("Lỗi khi xóa đối tác: " + err.message);
      }
    }
  };

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return (usersData || []).filter(u => {
      const type = (u.type || '').toString().trim().toUpperCase();
      if (!type.includes('KHÁCH HÀNG')) return false;

      if (typeFilter && type !== typeFilter.toUpperCase()) return false;

      if (searchTerm) {
        const text = `${u.id || ''} ${u.name || ''} ${u.type || ''}`;
        if (!matchesSearch(text, searchTerm)) return false;
      }

      return true;
    });
  }, [usersData, typeFilter, searchTerm]);

  // Paginated customers
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const handleSaveUser = async (userData) => {
    try {
      await upsertUser(userData);
      alert('Đã lưu thông tin khách hàng thành công.');
    } catch (err) {
      alert("Lỗi khi lưu khách hàng: " + err.message);
    }
  };

  const handleExportExcel = () => {
    const headers = ['ID', 'Tên khách hàng / NPP', 'Loại hình', 'Mã quyền', 'Mật khẩu'];
    const data = [
      headers,
      ...filteredCustomers.map(u => [
        u.id, u.name, u.type, u.role, u.password ? '******' : ''
      ])
    ];
    exportToExcel(data, `Danh_sach_khach_hang_${Date.now()}.xlsx`, 'DSNV');
  };

  const handleImportExcelRows = async (excelRows) => {
    try {
      const dataRows = excelRows.slice(1);
      for (const row of dataRows) {
        if (row[0]) {
          await upsertUser({
            id: row[0],
            name: row[1] || '',
            image: '',
            gender: '',
            birthDate: '',
            role: row[3] || 'NPP',
            password: row[4] || '',
            type: row[2] || 'KHÁCH HÀNG NPP'
          });
        }
      }
      await fetchUsersData();
      alert(`Đã nhập thành công ${dataRows.length} khách hàng.`);
    } catch (err) {
      alert("Lỗi khi import Excel: " + err.message);
    }
  };

  return (
    <div className="space-y-2">
      {/* Top Controls */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm kiếm mã khách hàng, tên đối tác..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {isAdminSession() && (
              <button
                onClick={() => {
                  setEditUser(null);
                  setIsDrawerOpen(true);
                }}
                className="px-3 py-1.5 bg-violet-600 text-white font-bold rounded-lg text-xs hover:bg-violet-700 shadow-sm transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm đối tác
              </button>
            )}

            {isAdminSession() && (
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="px-2.5 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-200 transition flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Nhập Excel
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs hover:bg-emerald-100 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Xuất Excel
            </button>

            <button
              onClick={() => downloadModuleTemplate('khachhang')}
              className="px-2.5 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              Mẫu Excel
            </button>

            <button
              onClick={openConfigModal}
              className="px-2.5 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-200 transition flex items-center gap-1.5"
              title="Tùy chỉnh cột (Ẩn/Hiện, Thứ tự, Kích thước, Định dạng)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
              Cột
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 text-xs">
          <button
            onClick={() => {
              setTypeFilter('');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              typeFilter === '' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả đối tác
          </button>

          <button
            onClick={() => {
              setTypeFilter('KHÁCH HÀNG NPP');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              typeFilter === 'KHÁCH HÀNG NPP' ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
            }`}
          >
            Nhà Phân Phối (NPP)
          </button>

          <button
            onClick={() => {
              setTypeFilter('KHÁCH HÀNG NCC');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              typeFilter === 'KHÁCH HÀNG NCC' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Nhà Cung Cấp (NCC)
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-210px)] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                {visibleColumns.map((col) => {
                  const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};
                  let alignClass = 'text-left';
                  if (col.align === 'center') alignClass = 'text-center';
                  if (col.align === 'right') alignClass = 'text-right';

                  return (
                    <th
                      key={col.key}
                      style={widthStyle}
                      className={`py-2 px-2.5 whitespace-nowrap ${alignClass}`}
                    >
                      {col.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCustomers.length > 0 ? (
                paginatedCustomers.map((u, idx) => (
                  <tr key={idx} className="hover:bg-violet-50/30 transition">
                    {visibleColumns.map((col) => {
                      let alignClass = 'text-left';
                      if (col.align === 'center') alignClass = 'text-center';
                      if (col.align === 'right') alignClass = 'text-right';

                      let formatClass = '';
                      if (col.format === 'bold') formatClass = 'font-bold text-slate-800';
                      if (col.format === 'uppercase') formatClass = 'uppercase';

                      switch (col.key) {
                        case 'id_kh':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap font-extrabold text-slate-800 ${alignClass} ${formatClass}`}>
                              {u.id}
                            </td>
                          );
                        case 'ten_kh':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 font-semibold text-slate-700 ${alignClass} ${formatClass}`}>
                              {u.name}
                            </td>
                          );
                        case 'loai_hinh':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                u.type === 'KHÁCH HÀNG NPP' ? 'bg-violet-50 text-violet-700 border border-violet-200' :
                                'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}>
                                {u.type}
                              </span>
                            </td>
                          );
                        case 'web_acc':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-slate-500 ${alignClass} ${formatClass}`}>
                              {u.password ? (
                                <span className="text-emerald-600 font-semibold">Đã cấp quyền</span>
                              ) : (
                                <span className="text-slate-400">Chưa cấp web</span>
                              )}
                            </td>
                          );
                        case 'actions':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-center ${alignClass}`}>
                              {isAdminSession() && (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditUser(u);
                                      setIsDrawerOpen(true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-violet-600 transition"
                                    title="Chỉnh sửa đối tác"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCustomer(u)}
                                    className="p-1 text-slate-400 hover:text-red-600 transition"
                                    title="Xóa đối tác"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        default:
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass} ${formatClass}`}>
                              -
                            </td>
                          );
                      }
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length || 5} className="p-8 text-center text-slate-400 italic">
                    Không tìm thấy đối tác nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <KhachhangDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditUser(null);
        }}
        editUser={editUser}
        onSaved={handleSaveUser}
      />

      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        moduleName="khachhang"
        onImportRows={handleImportExcelRows}
      />

      <ColumnManagerModal
        isOpen={isConfigModalOpen}
        onClose={closeConfigModal}
        columns={columns}
        onToggleVisibility={toggleVisibility}
        onUpdateProp={updateColumnProp}
        onMoveColumn={moveColumn}
        onReset={resetToDefault}
        moduleTitle="Khách hàng & NPP"
      />
    </div>
  );
}

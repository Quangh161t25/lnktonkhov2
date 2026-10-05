import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { NhanvienDrawer } from './NhanvienDrawer';
import { Pagination } from '../../common/Pagination';
import { ExcelUploadModal } from '../../common/ExcelUploadModal';
import { ColumnManagerModal } from '../../common/ColumnManagerModal';
import { useColumnManager } from '../../../hooks/useColumnManager';
import { exportToExcel, downloadModuleTemplate } from '../../../services/excelService';
import { formatDateVN, matchesSearch } from '../../../utils/formatters';
import { 
  Plus, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Search, 
  Users, 
  Edit3, 
  Trash2,
  ShieldCheck,
  UserCheck,
  SlidersHorizontal
} from 'lucide-react';

const DEFAULT_NHANVIEN_COLUMNS = [
  { key: 'image', label: 'Ảnh', width: 50, align: 'center', format: 'default' },
  { key: 'id_nv', label: 'Mã NV', width: 110, align: 'left', format: 'bold' },
  { key: 'ho_ten', label: 'Họ và tên', width: 200, align: 'left', format: 'default' },
  { key: 'gioi_tinh', label: 'Giới tính', width: 100, align: 'left', format: 'default' },
  { key: 'ngay_sinh', label: 'Ngày sinh', width: 110, align: 'left', format: 'date' },
  { key: 'vai_tro', label: 'Vai trò', width: 110, align: 'left', format: 'badge' },
  { key: 'actions', label: 'Thao tác', width: 90, align: 'center', format: 'default' },
];

export function NhanvienModule() {
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
  } = useColumnManager('nhanvien', DEFAULT_NHANVIEN_COLUMNS);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Always load fresh users data when authorized admin visits NhanvienModule
  React.useEffect(() => {
    if (isAdminSession()) {
      fetchUsersData();
    }
  }, [isAdminSession, fetchUsersData]);

  const handleDeleteEmployee = async (u) => {
    if (!u.sheetRow) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhân viên: ${u.id} - ${u.name}?`)) {
      try {
        await deleteUser(u.sheetRow);
        alert('Đã xóa nhân viên thành công.');
      } catch (err) {
        alert("Lỗi khi xóa nhân viên: " + err.message);
      }
    }
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return (usersData || []).filter(u => {
      const type = (u.type || '').toString().trim().toUpperCase();
      if (type !== 'NHÂN VIÊN') return false;

      if (roleFilter && (u.role || '').toUpperCase() !== roleFilter.toUpperCase()) return false;

      if (searchTerm) {
        const text = `${u.id || ''} ${u.name || ''} ${u.role || ''}`;
        if (!matchesSearch(text, searchTerm)) return false;
      }

      return true;
    });
  }, [usersData, roleFilter, searchTerm]);

  // Paginated employees
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  const handleSaveUser = async (userData) => {
    try {
      await upsertUser(userData);
      alert('Đã lưu thông tin nhân viên thành công.');
    } catch (err) {
      alert("Lỗi khi lưu nhân viên: " + err.message);
    }
  };

  const handleExportExcel = () => {
    const headers = ['ID', 'Họ tên', 'Hình ảnh', 'Giới tính', 'Ngày sinh', 'Quyền', 'Trường'];
    const data = [
      headers,
      ...filteredEmployees.map(u => [
        u.id, u.name, u.image, u.gender, u.birthDate, u.role, u.type
      ])
    ];
    exportToExcel(data, `Danh_sach_nhan_vien_${Date.now()}.xlsx`, 'DSNV');
  };

  const handleImportExcelRows = async (excelRows) => {
    try {
      const dataRows = excelRows.slice(1);
      for (const row of dataRows) {
        if (row[0]) {
          await upsertUser({
            id: row[0],
            name: row[1] || '',
            image: row[2] || '',
            gender: row[3] || 'Nam',
            birthDate: row[4] || '',
            role: row[5] || 'KHO',
            password: row[6] || '123456',
            type: 'NHÂN VIÊN'
          });
        }
      }
      await fetchUsersData();
      alert(`Đã nhập thành công ${dataRows.length} nhân viên.`);
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
              placeholder="Tìm kiếm theo mã nhân viên, họ tên, vai trò..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {isAdminSession() && (
              <button
                onClick={() => {
                  setEditUser(null);
                  setIsDrawerOpen(true);
                }}
                className="px-3 py-1.5 bg-sky-600 text-white font-bold rounded-lg text-xs hover:bg-sky-700 shadow-sm transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm nhân viên
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
              onClick={() => downloadModuleTemplate('nhanvien')}
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

        {/* Role Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 text-xs">
          <button
            onClick={() => {
              setRoleFilter('');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition ${
              roleFilter === '' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả vai trò
          </button>

          {['ADMIN', 'kt', 'KHO', 'KD', 'NVKD'].map(r => (
            <button
              key={r}
              onClick={() => {
                setRoleFilter(r);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md font-bold transition ${
                roleFilter === r ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
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
              {paginatedEmployees.length > 0 ? (
                paginatedEmployees.map((u, idx) => (
                  <tr key={idx} className="hover:bg-sky-50/30 transition">
                    {visibleColumns.map((col) => {
                      let alignClass = 'text-left';
                      if (col.align === 'center') alignClass = 'text-center';
                      if (col.align === 'right') alignClass = 'text-right';

                      let formatClass = '';
                      if (col.format === 'bold') formatClass = 'font-bold text-slate-800';
                      if (col.format === 'uppercase') formatClass = 'uppercase';

                      switch (col.key) {
                        case 'image':
                          return (
                            <td key={col.key} className="py-1 px-1.5 text-center">
                              {u.image ? (
                                <img
                                  src={u.image}
                                  alt={u.name}
                                  className="w-8 h-8 object-cover rounded-full mx-auto border border-slate-200 shadow-sm"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center mx-auto text-xs">
                                  {u.name?.charAt(0) || u.id?.charAt(0)}
                                </div>
                              )}
                            </td>
                          );
                        case 'id_nv':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap font-extrabold text-slate-800 ${alignClass} ${formatClass}`}>
                              {u.id}
                            </td>
                          );
                        case 'ho_ten':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 font-semibold text-slate-700 ${alignClass} ${formatClass}`}>
                              {u.name}
                            </td>
                          );
                        case 'gioi_tinh':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-slate-500 ${alignClass} ${formatClass}`}>
                              {u.gender || 'Nam'}
                            </td>
                          );
                        case 'ngay_sinh':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap text-slate-500 ${alignClass} ${formatClass}`}>
                              {formatDateVN(u.birthDate)}
                            </td>
                          );
                        case 'vai_tro':
                          return (
                            <td key={col.key} className={`py-1.5 px-2.5 whitespace-nowrap ${alignClass}`}>
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                u.role === 'KHO' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                u.role === 'kt' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {u.role}
                              </span>
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
                                    className="p-1 text-slate-400 hover:text-sky-600 transition"
                                    title="Chỉnh sửa nhân viên"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEmployee(u)}
                                    className="p-1 text-slate-400 hover:text-red-600 transition"
                                    title="Xóa nhân viên"
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
                  <td colSpan={visibleColumns.length || 7} className="p-8 text-center text-slate-400 italic">
                    Không tìm thấy nhân viên nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredEmployees.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <NhanvienDrawer
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
        moduleName="nhanvien"
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
        moduleTitle="Nhân viên"
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useSettings } from '../../context/SettingsContext';
import { MODULE_DEFINITIONS } from '../../config/constants';
import { 
  PanelLeft,
  Home,
  ChevronRight,
  Clock,
  Bell,
  RotateCw, 
  LogOut, 
  Settings, 
  ChevronDown, 
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  User,
  AlertTriangle
} from 'lucide-react';

function getVietnameseFormattedDateTime(date) {
  const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = days[date.getDay()];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${dayName}, ${dd}/${mm}/${yyyy}  ${hh}:${min}:${ss}`;
}

export function Header({ activeModule, onToggleSidebar, onNavigate }) {
  const { currentUser, usersData, switchAdminViewAs, isAdminSession, logout } = useAuth();
  const { syncStatus, lastSyncedTime, fetchAllData, fetchModule } = useData();
  const { appSettings } = useSettings();

  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Live real-time clock updating every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentModDef = MODULE_DEFINITIONS.find(m => m.key === activeModule) || {
    key: 'home',
    name: 'Trang chủ',
    desc: 'LNK Tồn Kho'
  };

  const badgeTitle = currentModDef.name;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeModule === 'home') {
        await fetchAllData();
      } else if (activeModule === 'doisoat' || activeModule === 'sanpham' || activeModule === 'sanphamkho' || activeModule === 'dubaonhap') {
        await Promise.all([
          fetchModule(activeModule, true),
          fetchModule('sanphamkho', true),
          fetchModule('nhap', true),
          fetchModule('xuat', true),
          fetchModule('chuyenkho', true)
        ]);
      } else {
        await fetchModule(activeModule, true);
      }
    } catch (e) {
      console.error("Refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  // Get user initials
  const getUserInitials = () => {
    const name = (currentUser?.name || currentUser?.id || 'U').trim();
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Format role label
  const getRoleLabel = () => {
    const role = (currentUser?.role || '').toUpperCase();
    if (role === 'ADMIN') return 'Tổng Giám Đốc / Admin';
    if (role === 'KHO') return 'Bộ phận Kho hàng';
    if (role === 'KT') return 'Phòng Kế toán';
    if (role === 'NPP') return 'Nhà Phân Phối';
    if (role === 'KD' || role === 'NVKD') return 'Phòng Kinh doanh';
    return role || 'Người dùng';
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200/90 px-3 md:px-5 flex items-center justify-between sticky top-0 z-30 shadow-xs shrink-0 select-none">
      {/* Left: Sidebar Collapse Button & Breadcrumb Navigation */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
        {/* Sidebar Toggle Icon Button [|] */}
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition border border-slate-200/80 shadow-2xs shrink-0"
          title="Thu gọn / Mở rộng menu thanh bên"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* Breadcrumb path */}
        <nav className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-slate-500 truncate">
          {activeModule === 'home' ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-lg font-bold text-xs shadow-2xs">
              <Home className="w-3.5 h-3.5 text-blue-600" />
              <span>Trang chủ</span>
            </span>
          ) : (
            <>
              <button
                onClick={() => onNavigate('home')}
                className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition font-medium shrink-0"
                title="Về Trang chủ"
              >
                <Home className="w-4 h-4 text-slate-400 hover:text-blue-600 transition" />
                <span className="hidden sm:inline">Trang chủ</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />

              {/* Highlighted active pill */}
              <span className="px-2.5 py-0.5 bg-blue-600 text-white rounded-md font-bold text-[11px] sm:text-xs shadow-xs tracking-tight shrink-0">
                {badgeTitle}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Live Clock, Notifications, Sync & User Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Live Date & Time pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200/80 rounded-full text-xs font-semibold text-slate-600 shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="tabular-nums font-mono text-[11px] text-slate-700">
            {getVietnameseFormattedDateTime(currentDateTime)}
          </span>
        </div>

        {/* Sync Status Badge on medium screens */}
        <div className="hidden xl:flex items-center gap-1 text-[11px] text-slate-500 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200/80">
          {syncStatus === 'SYNCING' ? (
            <>
              <RotateCw className="w-3 h-3 text-blue-600 animate-spin" />
              <span className="text-blue-600 font-medium">Đồng bộ...</span>
            </>
          ) : syncStatus === 'ERROR' ? (
            <>
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span className="text-red-500 font-medium">Mất kết nối</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>{lastSyncedTime ? lastSyncedTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}</span>
            </>
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition border border-slate-200/80 shadow-2xs ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Làm mới dữ liệu từ Google Sheets"
        >
          <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="relative p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition border border-slate-200/80 shadow-2xs"
            title="Thông báo hệ thống"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
              3
            </span>
          </button>

          {notificationOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotificationOpen(false)} />
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Thông báo hệ thống (3)</span>
                  <span className="text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline">Đã đọc tất cả</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <p className="font-bold text-emerald-800 text-[11px]">Đồng bộ Google Sheets hoàn tất</p>
                    <p className="text-[10px] text-emerald-600">Sheet CAI_DAT và 10 module đã tải dữ liệu thành công.</p>
                  </div>
                  <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="font-bold text-amber-800 text-[11px]">Cảnh báo tồn kho ROP</p>
                    <p className="text-[10px] text-amber-600">Có sản phẩm chạm ngưỡng cần lập đơn nhập bổ sung.</p>
                  </div>
                  <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="font-bold text-blue-800 text-[11px]">Phiên bản ERP v2.0.0</p>
                    <p className="text-[10px] text-blue-600">Hệ thống đã nâng cấp toàn bộ giao diện React chuyên nghiệp.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Badge & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200/80"
          >
            {/* Avatar Pill */}
            {currentUser?.image ? (
              <img
                src={currentUser.image}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs tracking-tight">
                {getUserInitials()}
              </div>
            )}

            {/* Name and Role Subtitle */}
            <div className="text-left hidden sm:block">
              <div className="text-xs font-extrabold text-slate-800 leading-tight">
                {currentUser?.name || currentUser?.id || 'Người dùng'}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold leading-tight">
                {getRoleLabel()}
              </div>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Dropdown Menu */}
          {userDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 space-y-2">
                {/* User Info Header */}
                <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/70 rounded-xl">
                  <p className="text-xs font-extrabold text-slate-800">{currentUser?.name || currentUser?.id}</p>
                  <p className="text-[11px] text-slate-500">Mã ID: {currentUser?.id}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    Vai trò: {currentUser?.role}
                  </span>
                </div>

                {/* Admin Switch Role Preview */}
                {isAdminSession() && (
                  <div className="px-2.5 py-2 bg-amber-50 rounded-xl border border-amber-200/80 space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Xem trước với tư cách User:
                    </label>
                    <select
                      value={currentUser?.id || ''}
                      onChange={(e) => {
                        switchAdminViewAs(e.target.value);
                      }}
                      className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {(usersData || []).map(u => (
                        <option key={u.id} value={u.id}>
                          {u.id} - {u.name || u.id} ({u.role || 'User'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  {isAdminSession() && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('caidat');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition text-left"
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      Cài đặt & Phân quyền
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Đăng xuất
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

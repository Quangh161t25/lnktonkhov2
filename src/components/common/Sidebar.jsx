import React from 'react';
import appLogo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { MODULE_DEFINITIONS } from '../../config/constants';
import {
  Home,
  ArrowDownToLine,
  CalendarClock,
  ArrowUpFromLine,
  ArrowLeftRight,
  Package,
  Warehouse,
  Building2,
  Scale,
  Users,
  UserCheck,
  TrendingUp,
  Settings,
  BarChart3,
  BadgePercent,
  ShoppingCart,
  Ship,
  Lightbulb,
  PackageSearch,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

const ICON_MAP = {
  Home,
  BarChart3,
  ArrowDownToLine,
  CalendarClock,
  ArrowUpFromLine,
  ArrowLeftRight,
  Package,
  Warehouse,
  BadgePercent,
  ShoppingCart,
  Ship,
  Lightbulb,
  PackageSearch,
  ClipboardList,
  Building2,
  Scale,
  Users,
  UserCheck,
  TrendingUp,
  Settings
};

export function Sidebar({ activeModule, onSelectModule, isCollapsed, onToggleCollapse }) {
  const { canAccessModule } = useAuth();
  const { appSettings } = useSettings();

  const isXnkActive = activeModule === 'xnk' || activeModule.startsWith('xnk_');
  const [isXnkExpanded, setIsXnkExpanded] = React.useState(isXnkActive);

  React.useEffect(() => {
    if (isXnkActive) {
      setIsXnkExpanded(true);
    }
  }, [isXnkActive]);

  const xnkSubModules = [
    { key: 'xnk', name: 'Tổng quan XNK', icon: Ship },
    { key: 'xnk_ytuong', name: 'Ý tưởng sản phẩm', icon: Lightbulb },
    { key: 'xnk_mau', name: 'Đặt mẫu & NCC', icon: PackageSearch },
    { key: 'xnk_donhang', name: 'Đơn hàng PO', icon: ClipboardList }
  ];

  // Filter out xnk sub-keys from primary list, as they are rendered under XNK parent group
  const primaryModules = MODULE_DEFINITIONS.filter(m => 
    !m.key.startsWith('xnk_') && canAccessModule(m.key)
  );

  return (
    <aside
      className={`hidden md:flex flex-col bg-white text-slate-700 border-r border-slate-200 transition-all duration-300 select-none z-40 shadow-sm ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img 
            src={appLogo} 
            alt="Logo" 
            className="w-8 h-8 rounded-xl object-contain shrink-0 bg-white shadow-sm border border-slate-100 p-0.5" 
          />
          {!isCollapsed && (
            <div className="truncate">
              <h2 className="font-bold text-slate-800 text-xs tracking-tight truncate leading-tight">
                {appSettings.appName || 'LNK TỒN KHO'}
              </h2>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
                v{appSettings.appVersion || '2.0.0'}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar bg-white">
        {primaryModules.map((item) => {
          // Special handling for XNK group
          if (item.key === 'xnk') {
            const hasXnkAccess = canAccessModule('xnk');
            if (!hasXnkAccess) return null;

            if (isCollapsed) {
              return (
                <button
                  key="xnk-collapsed"
                  onClick={() => onSelectModule('xnk')}
                  title="Xuất Nhập Khẩu"
                  className={`w-full flex items-center justify-center p-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                    isXnkActive
                      ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100 shadow-sm'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  <Ship className={`w-5 h-5 shrink-0 ${isXnkActive ? 'text-blue-600 stroke-[2.2]' : 'text-slate-400'}`} />
                </button>
              );
            }

            return (
              <div key="xnk-group" className="space-y-1">
                {/* Parent Group Button */}
                <div
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                    isXnkActive
                      ? 'bg-blue-50/70 text-blue-700 font-bold border border-blue-100'
                      : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    if (!isXnkExpanded) {
                      setIsXnkExpanded(true);
                      onSelectModule('xnk');
                    } else {
                      setIsXnkExpanded(!isXnkExpanded);
                    }
                  }}
                >
                  <div className="flex items-center gap-3.5 truncate">
                    <Ship className={`w-5 h-5 shrink-0 ${isXnkActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate text-left">Xuất Nhập Khẩu</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isXnkExpanded ? 'transform rotate-180 text-blue-600' : ''
                  }`} />
                </div>

                {/* Sub-modules list */}
                {isXnkExpanded && (
                  <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-blue-100 ml-4">
                    {xnkSubModules.map(sub => {
                      const SubIcon = sub.icon;
                      const isSubActive = activeModule === sub.key;

                      return (
                        <button
                          key={sub.key}
                          onClick={() => onSelectModule(sub.key)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            isSubActive
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
                          }`}
                        >
                          <SubIcon className={`w-4 h-4 shrink-0 ${isSubActive ? 'text-white' : 'text-slate-400'}`} />
                          <span className="truncate text-left">{sub.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const IconComponent = ICON_MAP[item.icon] || Package;
          const isActive = activeModule === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onSelectModule(item.key)}
              title={isCollapsed ? item.name : undefined}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100 shadow-sm'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              <IconComponent className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600 stroke-[2.2]' : 'text-slate-400'}`} />
              {!isCollapsed && (
                <span className="truncate text-left">{item.name}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer info */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between bg-slate-50/50">
          <span>Hệ thống ERP Kho</span>
          <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Online
          </span>
        </div>
      )}
    </aside>
  );
}

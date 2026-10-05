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
  ChevronLeft,
  ChevronRight
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

  const accessibleModules = MODULE_DEFINITIONS.filter(m => canAccessModule(m.key));

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
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar bg-white">
        {accessibleModules.map((item) => {
          const IconComponent = ICON_MAP[item.icon] || Package;
          const isActive = activeModule === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onSelectModule(item.key)}
              title={isCollapsed ? item.name : undefined}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
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

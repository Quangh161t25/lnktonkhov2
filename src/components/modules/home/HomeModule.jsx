import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { MODULE_DEFINITIONS } from '../../../config/constants';
import {
  Compass,
  BarChart3,
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
  BadgePercent,
  ShoppingCart,
  Sparkles,
  ArrowRight,
  Search,
  ShieldCheck,
  ExternalLink,
  Layers,
  ChevronRight
} from 'lucide-react';

const MODULE_ICON_MAP = {
  Home: Compass,
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

const MODULE_COLOR_THEMES = {
  indigo: {
    bg: 'bg-indigo-50/70',
    border: 'border-indigo-100',
    hoverBorder: 'hover:border-indigo-300',
    hoverShadow: 'hover:shadow-indigo-100/60',
    text: 'text-indigo-600',
    badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    iconBg: 'bg-indigo-100 text-indigo-600',
    btnText: 'text-indigo-600 group-hover:text-indigo-700'
  },
  blue: {
    bg: 'bg-blue-50/70',
    border: 'border-blue-100',
    hoverBorder: 'hover:border-blue-300',
    hoverShadow: 'hover:shadow-blue-100/60',
    text: 'text-blue-600',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200',
    iconBg: 'bg-blue-100 text-blue-600',
    btnText: 'text-blue-600 group-hover:text-blue-700'
  },
  amber: {
    bg: 'bg-amber-50/70',
    border: 'border-amber-100',
    hoverBorder: 'hover:border-amber-300',
    hoverShadow: 'hover:shadow-amber-100/60',
    text: 'text-amber-600',
    badge: 'bg-amber-50 text-amber-800 border border-amber-200',
    iconBg: 'bg-amber-100 text-amber-600',
    btnText: 'text-amber-600 group-hover:text-amber-700'
  },
  orange: {
    bg: 'bg-orange-50/70',
    border: 'border-orange-100',
    hoverBorder: 'hover:border-orange-300',
    hoverShadow: 'hover:shadow-orange-100/60',
    text: 'text-orange-600',
    badge: 'bg-orange-50 text-orange-700 border border-orange-200',
    iconBg: 'bg-orange-100 text-orange-600',
    btnText: 'text-orange-600 group-hover:text-orange-700'
  },
  cyan: {
    bg: 'bg-cyan-50/70',
    border: 'border-cyan-100',
    hoverBorder: 'hover:border-cyan-300',
    hoverShadow: 'hover:shadow-cyan-100/60',
    text: 'text-cyan-600',
    badge: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    iconBg: 'bg-cyan-100 text-cyan-600',
    btnText: 'text-cyan-600 group-hover:text-cyan-700'
  },
  emerald: {
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-100',
    hoverBorder: 'hover:border-emerald-300',
    hoverShadow: 'hover:shadow-emerald-100/60',
    text: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-600',
    btnText: 'text-emerald-600 group-hover:text-emerald-700'
  },
  teal: {
    bg: 'bg-teal-50/70',
    border: 'border-teal-100',
    hoverBorder: 'hover:border-teal-300',
    hoverShadow: 'hover:shadow-teal-100/60',
    text: 'text-teal-600',
    badge: 'bg-teal-50 text-teal-700 border border-teal-200',
    iconBg: 'bg-teal-100 text-teal-600',
    btnText: 'text-teal-600 group-hover:text-teal-700'
  },
  rose: {
    bg: 'bg-rose-50/70',
    border: 'border-rose-100',
    hoverBorder: 'hover:border-rose-300',
    hoverShadow: 'hover:shadow-rose-100/60',
    text: 'text-rose-600',
    badge: 'bg-rose-50 text-rose-700 border border-rose-200',
    iconBg: 'bg-rose-100 text-rose-600',
    btnText: 'text-rose-600 group-hover:text-rose-700'
  },
  sky: {
    bg: 'bg-sky-50/70',
    border: 'border-sky-100',
    hoverBorder: 'hover:border-sky-300',
    hoverShadow: 'hover:shadow-sky-100/60',
    text: 'text-sky-600',
    badge: 'bg-sky-50 text-sky-700 border border-sky-200',
    iconBg: 'bg-sky-100 text-sky-600',
    btnText: 'text-sky-600 group-hover:text-sky-700'
  },
  violet: {
    bg: 'bg-violet-50/70',
    border: 'border-violet-100',
    hoverBorder: 'hover:border-violet-300',
    hoverShadow: 'hover:shadow-violet-100/60',
    text: 'text-violet-600',
    badge: 'bg-violet-50 text-violet-700 border border-violet-200',
    iconBg: 'bg-violet-100 text-violet-600',
    btnText: 'text-violet-600 group-hover:text-violet-700'
  },
  purple: {
    bg: 'bg-purple-50/70',
    border: 'border-purple-100',
    hoverBorder: 'hover:border-purple-300',
    hoverShadow: 'hover:shadow-purple-100/60',
    text: 'text-purple-600',
    badge: 'bg-purple-50 text-purple-700 border border-purple-200',
    iconBg: 'bg-purple-100 text-purple-600',
    btnText: 'text-purple-600 group-hover:text-purple-700'
  },
  slate: {
    bg: 'bg-slate-50/70',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-slate-400',
    hoverShadow: 'hover:shadow-slate-200/60',
    text: 'text-slate-600',
    badge: 'bg-slate-100 text-slate-700 border border-slate-200',
    iconBg: 'bg-slate-200 text-slate-600',
    btnText: 'text-slate-600 group-hover:text-slate-700'
  }
};

export function HomeModule({ onNavigate }) {
  const { currentUser, canAccessModule } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Accessible modules excluding 'home'
  const accessibleModules = useMemo(() => {
    return MODULE_DEFINITIONS.filter(m => m.key !== 'home' && canAccessModule(m.key));
  }, [canAccessModule]);

  // Filter modules by search
  const filteredModules = useMemo(() => {
    if (!searchTerm.trim()) return accessibleModules;
    const term = searchTerm.toLowerCase().trim();
    return accessibleModules.filter(m => 
      m.name.toLowerCase().includes(term) ||
      m.desc.toLowerCase().includes(term) ||
      m.key.toLowerCase().includes(term)
    );
  }, [accessibleModules, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-white/20 text-[11px] font-bold tracking-wider uppercase backdrop-blur-xs">
                Cổng điều hướng trung tâm
              </span>
              <span className="text-blue-200 text-xs font-semibold">
                Xin chào, {currentUser?.name || currentUser?.id || 'Quản trị viên'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Hệ thống Quản lý Tồn kho LNK
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
              Trung tâm điều phối & phân hệ nghiệp vụ. Nhấp vào các phân hệ bên dưới để mở giao diện làm việc.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {canAccessModule('tongquan') && (
              <button
                onClick={() => onNavigate('tongquan')}
                className="px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold rounded-xl text-xs transition flex items-center gap-2 shadow-md hover:shadow-lg transform active:scale-95"
              >
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Báo cáo Tổng quan
              </button>
            )}
            {canAccessModule('nhap') && (
              <button
                onClick={() => onNavigate('nhap')}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/20 active:scale-95"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                Nhập kho
              </button>
            )}
            {canAccessModule('xuat') && (
              <button
                onClick={() => onNavigate('xuat')}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/20 active:scale-95"
              >
                <ArrowUpFromLine className="w-3.5 h-3.5" />
                Xuất kho
              </button>
            )}
            {canAccessModule('chuyenkho') && (
              <button
                onClick={() => onNavigate('chuyenkho')}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/20 active:scale-95"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Điều chuyển
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Launcher Grid & Search Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Danh mục Phân hệ & Đường dẫn mở Mô-đun
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nhấp vào bất kỳ phân hệ nào để truy cập trực tiếp chức năng tương ứng
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm nhanh phân hệ..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg shrink-0">
              {filteredModules.length} phân hệ
            </span>
          </div>
        </div>

        {/* Dynamic Module Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredModules.map((item) => {
            const IconComponent = MODULE_ICON_MAP[item.icon] || Package;
            const theme = MODULE_COLOR_THEMES[item.color] || MODULE_COLOR_THEMES.blue;

            return (
              <div
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`group bg-white rounded-2xl border p-5 shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md ${theme.border} ${theme.hoverBorder} ${theme.hoverShadow} active:scale-[0.99]`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className={`w-12 h-12 rounded-2xl ${theme.iconBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition duration-200`}>
                      <IconComponent className="w-6 h-6 stroke-[2]" />
                    </div>
                    <span className="p-1.5 rounded-lg text-slate-300 group-hover:text-slate-700 group-hover:bg-slate-100 transition">
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition duration-150" />
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition leading-snug">
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-3.5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                    /{item.key}
                  </span>
                  <span className={`font-bold flex items-center gap-1 ${theme.btnText}`}>
                    Mở phân hệ &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredModules.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs italic">
            Không tìm thấy phân hệ nào phù hợp với từ khóa "{searchTerm}".
          </div>
        )}
      </div>
    </div>
  );
}

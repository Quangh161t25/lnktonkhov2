import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Home, 
  BarChart3,
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Package, 
  Settings 
} from 'lucide-react';

export function MobileNav({ activeModule, onSelectModule }) {
  const { canAccessModule } = useAuth();

  const items = [
    { key: 'home', name: 'Trang chủ', icon: Home },
    { key: 'tongquan', name: 'Tổng quan', icon: BarChart3 },
    { key: 'nhap', name: 'Nhập', icon: ArrowDownToLine },
    { key: 'xuat', name: 'Xuất', icon: ArrowUpFromLine },
    { key: 'sanpham', name: 'Sản phẩm', icon: Package }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 px-2 flex items-center justify-around z-40 shadow-lg">
      {items.map((item) => {
        if (!canAccessModule(item.key) && item.key !== 'home') return null;
        const IconComponent = item.icon;
        const isActive = activeModule === item.key;

        return (
          <button
            key={item.key}
            onClick={() => onSelectModule(item.key)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
              isActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <IconComponent className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5">{item.name}</span>
          </button>
        );
      })}
    </nav>
  );
}

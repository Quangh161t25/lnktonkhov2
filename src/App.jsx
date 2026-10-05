import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { MobileNav } from './components/common/MobileNav';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Module views
import { LoginScreen } from './components/modules/auth/LoginScreen';
import { HomeModule } from './components/modules/home/HomeModule';
import { TongquanModule } from './components/modules/tongquan/TongquanModule';
import { NhapModule } from './components/modules/nhap/NhapModule';
import { DukienModule } from './components/modules/dukien/DukienModule';
import { XuatModule } from './components/modules/xuat/XuatModule';
import { ChuyenkhoModule } from './components/modules/chuyenkho/ChuyenkhoModule';
import { SanphamModule } from './components/modules/sanpham/SanphamModule';
import { SanphamkhoModule } from './components/modules/sanphamkho/SanphamkhoModule';
import { CngiaspModule } from './components/modules/cngiasp/CngiaspModule';
import { LenDonModule } from './components/modules/lendon/LenDonModule';
import { TonNppModule } from './components/modules/ton_npp/TonNppModule';
import { DoisoatModule } from './components/modules/doisoat/DoisoatModule';
import { NhanvienModule } from './components/modules/nhanvien/NhanvienModule';
import { KhachhangModule } from './components/modules/khachhang/KhachhangModule';
import { DubaonhapModule } from './components/modules/dubaonhap/DubaonhapModule';
import { CaidatModule } from './components/modules/caidat/CaidatModule';

const VALID_MODULES = [
  'home', 'tongquan', 'nhap', 'dukien', 'xuat', 'chuyenkho', 'sanpham',
  'sanphamkho', 'cngiasp', 'lendon', 'ton_npp', 'doisoat', 'nhanvien', 'khachhang',
  'dubaonhap', 'caidat'
];

function getModuleFromLocation() {
  const path = window.location.pathname.replace(/^\/+/, '').split('/')[0].trim().toLowerCase();
  return VALID_MODULES.includes(path) ? path : 'home';
}

export function App() {
  const { currentUser, canAccessModule, getAllowedModules } = useAuth();
  const { fetchModule } = useData();

  const [activeModule, setActiveModule] = useState(getModuleFromLocation);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [navParams, setNavParams] = useState(null);

  // On startup or login, fetch CAI_DAT system settings & permissions immediately
  useEffect(() => {
    if (currentUser?.id) {
      fetchModule('caidat');
    }
  }, [currentUser?.id, fetchModule]);

  // Sync module change to browser address bar URL
  const navigateToModule = (mod, params = null) => {
    setNavParams(params);
    setActiveModule(mod);
    const targetPath = mod === 'home' ? '/' : `/${mod}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  // Handle browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/+/, '').split('/')[0].trim().toLowerCase();
      if (path === 'login' && currentUser) {
        setActiveModule('home');
      } else {
        const mod = getModuleFromLocation();
        setActiveModule(mod);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  // Ensure user always lands on an allowed module and keep URL in sync (/login when logged out)
  useEffect(() => {
    if (!currentUser) {
      if (window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
    } else {
      const allowed = getAllowedModules();
      if (!allowed.includes(activeModule)) {
        const fallback = allowed.includes('home') ? 'home' : (allowed[0] || 'home');
        setActiveModule(fallback);
        const targetPath = fallback === 'home' ? '/' : `/${fallback}`;
        window.history.replaceState(null, '', targetPath);
      } else {
        const targetPath = activeModule === 'home' ? '/' : `/${activeModule}`;
        if (window.location.pathname !== targetPath) {
          window.history.replaceState(null, '', targetPath);
        }
      }
    }
  }, [currentUser, activeModule, getAllowedModules]);

  const handleNavigateWithFilter = (moduleName, params) => {
    navigateToModule(moduleName, params);
  };

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* Sidebar */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={(mod) => navigateToModule(mod)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <Header
          activeModule={activeModule}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onNavigate={(mod) => navigateToModule(mod)}
        />

        {/* Dynamic View Scroll Area - Tight & Seamless Padding */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-3 pb-16 md:pb-3">
          <ErrorBoundary>
            {activeModule === 'home' && (
              <HomeModule onNavigate={(mod) => navigateToModule(mod)} />
            )}

            {activeModule === 'tongquan' && (
              <TongquanModule onNavigate={(mod) => navigateToModule(mod)} />
            )}

            {activeModule === 'nhap' && <NhapModule />}

            {activeModule === 'dukien' && (
              <DukienModule onNavigate={(mod) => navigateToModule(mod)} />
            )}

            {activeModule === 'xuat' && <XuatModule />}

            {activeModule === 'chuyenkho' && <ChuyenkhoModule />}

            {activeModule === 'sanpham' && (
              <SanphamModule onNavigateWithFilter={handleNavigateWithFilter} />
            )}

            {activeModule === 'sanphamkho' && (
              <SanphamkhoModule initialFilterProductId={navParams?.productId || ''} />
            )}

            {activeModule === 'cngiasp' && <CngiaspModule />}
            {activeModule === 'lendon' && <LenDonModule />}

            {activeModule === 'ton_npp' && <TonNppModule />}

            {activeModule === 'doisoat' && <DoisoatModule />}

            {activeModule === 'nhanvien' && <NhanvienModule />}

            {activeModule === 'khachhang' && <KhachhangModule />}

            {activeModule === 'dubaonhap' && (
              <DubaonhapModule onNavigate={(mod) => navigateToModule(mod)} />
            )}

            {activeModule === 'caidat' && <CaidatModule />}
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeModule={activeModule}
        onSelectModule={(mod) => navigateToModule(mod)}
      />
    </div>
  );
}

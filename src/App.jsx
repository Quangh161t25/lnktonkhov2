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
import { XnkHubModule } from './components/modules/xnk/XnkHubModule';
import { XnkModule } from './components/modules/xnk/XnkModule';
import { XnkYtuongModule } from './components/modules/xnk/XnkYtuongModule';
import { XnkMauModule } from './components/modules/xnk/XnkMauModule';
import { XnkDonHangModule } from './components/modules/xnk/XnkDonHangModule';
import { XnkTienDoModule } from './components/modules/xnk/XnkTienDoModule';
import { XnkNccModule } from './components/modules/xnk/XnkNccModule';
import { CaidatModule } from './components/modules/caidat/CaidatModule';

const VALID_MODULES = [
  'home', 'tongquan', 'nhap', 'xuat', 'chuyenkho', 'sanpham',
  'sanphamkho', 'cngiasp', 'lendon', 'ton_npp', 'doisoat', 'nhanvien', 'khachhang',
  'xnk', 'xnk_tongquan', 'xnk_ytuong', 'xnk_mau', 'xnk_donhang', 'xnk_tiendo', 'xnk_ncc',
  'xnk_dukien', 'xnk_dubaonhap', 'caidat'
];

function getModuleFromLocation() {
  const cleanPath = window.location.pathname.replace(/^\/+/, '').trim().toLowerCase();
  if (cleanPath === 'xnk/tong_quan' || cleanPath === 'xnk/tongquan') return 'xnk_tongquan';
  if (cleanPath === 'xnk/y_tuong' || cleanPath === 'xnk/ytuong') return 'xnk_ytuong';
  if (cleanPath === 'xnk/mau') return 'xnk_mau';
  if (cleanPath === 'xnk/don_hang' || cleanPath === 'xnk/donhang') return 'xnk_donhang';
  if (cleanPath === 'xnk/tien_do' || cleanPath === 'xnk/tiendo') return 'xnk_tiendo';
  if (cleanPath === 'xnk/ncc') return 'xnk_ncc';
  // Dự kiến hàng về & Dự báo nhập hàng đã chuyển vào XNK (link cũ /dukien, /dubaonhap vẫn dùng được)
  if (cleanPath === 'xnk/du_kien' || cleanPath === 'dukien') return 'xnk_dukien';
  if (cleanPath === 'xnk/du_bao_nhap' || cleanPath === 'dubaonhap') return 'xnk_dubaonhap';
  if (cleanPath === 'xnk') return 'xnk';

  const first = cleanPath.split('/')[0];
  return VALID_MODULES.includes(first) ? first : 'home';
}

function getPathForModule(mod) {
  if (mod === 'home') return '/';
  if (mod === 'xnk') return '/xnk';
  if (mod === 'xnk_tongquan') return '/xnk/tong_quan';
  if (mod === 'xnk_ytuong') return '/xnk/y_tuong';
  if (mod === 'xnk_mau') return '/xnk/mau';
  if (mod === 'xnk_donhang') return '/xnk/don_hang';
  if (mod === 'xnk_tiendo') return '/xnk/tien_do';
  if (mod === 'xnk_ncc') return '/xnk/ncc';
  if (mod === 'xnk_dukien') return '/xnk/du_kien';
  if (mod === 'xnk_dubaonhap') return '/xnk/du_bao_nhap';
  return `/${mod}`;
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
    const targetPath = getPathForModule(mod);
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
      if (!canAccessModule(activeModule)) {
        const fallback = allowed.includes('home') ? 'home' : (allowed[0] || 'home');
        setActiveModule(fallback);
        const targetPath = getPathForModule(fallback);
        window.history.replaceState(null, '', targetPath);
      } else {
        const targetPath = getPathForModule(activeModule);
        if (window.location.pathname !== targetPath) {
          window.history.replaceState(null, '', targetPath);
        }
      }
    }
  }, [currentUser, activeModule, getAllowedModules, canAccessModule]);

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
        <main className="flex-1 overflow-y-auto p-2 sm:p-3 pb-16 md:pb-3 flex flex-col">
          <ErrorBoundary>
            {activeModule === 'home' && (
              <HomeModule onNavigate={(mod) => navigateToModule(mod)} />
            )}

            {activeModule === 'tongquan' && (
              <TongquanModule onNavigate={(mod) => navigateToModule(mod)} />
            )}

            {activeModule === 'nhap' && <NhapModule />}

            {activeModule === 'xnk_dukien' && (
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

            {activeModule === 'xnk_dubaonhap' && (
              <DubaonhapModule onNavigate={(mod) => navigateToModule(mod)} />
            )}

            {activeModule === 'xnk' && (
              <XnkHubModule onNavigate={(mod) => navigateToModule(mod)} />
            )}

            {activeModule === 'xnk_tongquan' && (
              <XnkModule onNavigate={(mod) => navigateToModule(mod)} />
            )}

            {activeModule === 'xnk_ytuong' && (
              <XnkYtuongModule onNavigate={(mod) => navigateToModule(mod)} />
            )}

            {activeModule === 'xnk_mau' && (
              <XnkMauModule onNavigate={(mod) => navigateToModule(mod)} />
            )}

            {activeModule === 'xnk_donhang' && (
              <XnkDonHangModule onNavigate={(mod) => navigateToModule(mod)} />
            )}

            {activeModule === 'xnk_tiendo' && (
              <XnkTienDoModule onNavigate={(mod) => navigateToModule(mod)} />
            )}

            {activeModule === 'xnk_ncc' && (
              <XnkNccModule onNavigate={(mod) => navigateToModule(mod)} />
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

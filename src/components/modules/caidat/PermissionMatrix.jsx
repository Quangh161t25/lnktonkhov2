import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Save, 
  RotateCcw, 
  Copy, 
  Search, 
  Users, 
  User, 
  UserCheck, 
  Package, 
  Warehouse, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ArrowLeftRight, 
  ShoppingCart, 
  Building2, 
  BadgePercent, 
  TrendingUp, 
  BarChart3, 
  Scale, 
  Settings, 
  Calculator, 
  Briefcase, 
  Truck, 
  Check, 
  CheckSquare, 
  Square, 
  Eye, 
  AlertCircle
} from 'lucide-react';

export const PERMISSION_MODULE_GROUPS = [
  {
    category: 'HÀNG HÓA & KHO',
    icon: Package,
    color: 'emerald',
    modules: [
      {
        key: 'sanpham',
        name: 'Danh sách sản phẩm',
        desc: 'Danh mục sản phẩm & tồn kho tổng',
        actions: {
          view: true,
          viewDetail: 'sanpham.viewDetail', // Xem chi tiết tồn 5 kho & nhật ký lũy kế
          add: 'sanpham.manage',
          edit: 'sanpham.manage',
          delete: 'sanpham.manage',
          approve: null
        }
      },
      {
        key: 'sanphamkho',
        name: 'Sản phẩm kho',
        desc: 'Tồn kho chi tiết theo từng kho',
        actions: {
          view: true,
          viewDetail: 'sanphamkho.viewDetail',
          add: null,
          edit: null,
          delete: null,
          approve: null
        }
      },
      {
        key: 'cngiasp',
        name: 'CN Giá SP',
        desc: 'Bảng giá sản phẩm',
        actions: {
          view: true,
          viewDetail: null,
          add: 'cngiasp.manage',
          edit: 'cngiasp.manage',
          delete: 'cngiasp.manage',
          approve: null
        }
      },
      {
        key: 'dubaonhap',
        name: 'Dự báo nhập hàng',
        desc: 'ROP & dự báo lượng đặt hàng',
        actions: {
          view: true,
          viewDetail: null,
          add: null,
          edit: null,
          delete: null,
          approve: null
        }
      }
    ]
  },
  {
    category: 'GIAO DỊCH XUẤT NHẬP',
    icon: ArrowLeftRight,
    color: 'blue',
    modules: [
      {
        key: 'nhap',
        name: 'Danh sách nhập',
        desc: 'Phiếu nhập kho hàng hóa',
        actions: {
          view: true,
          viewDetail: 'nhap.viewDetail',
          add: 'nx.manualAdd',
          edit: 'nx.edit',
          delete: 'nx.delete',
          approve: 'nx.confirmWarehouse'
        }
      },
      {
        key: 'xuat',
        name: 'Danh sách xuất',
        desc: 'Phiếu xuất kho hàng hóa',
        actions: {
          view: true,
          viewDetail: 'xuat.viewDetail',
          add: 'nx.manualAdd',
          edit: 'nx.edit',
          delete: 'nx.delete',
          approve: 'nx.confirmWarehouse'
        }
      },
      {
        key: 'dukien',
        name: 'Dự kiến hàng về',
        desc: 'Theo dõi đơn hàng dự kiến về kho',
        actions: {
          view: true,
          viewDetail: 'dukien.viewDetail',
          add: 'nx.manualAdd',
          edit: 'nx.edit',
          delete: 'nx.delete',
          approve: null
        }
      },
      {
        key: 'chuyenkho',
        name: 'Điều chuyển kho',
        desc: 'Phiếu chuyển hàng giữa các kho',
        actions: {
          view: true,
          viewDetail: 'chuyenkho.viewDetail',
          add: 'chuyenkho.create',
          edit: 'chuyenkho.edit',
          delete: 'nx.delete',
          approve: null
        }
      },
      {
        key: 'lendon',
        name: 'Lên đơn bán hàng',
        desc: 'Tạo đơn đặt hàng xuất bán',
        actions: {
          view: true,
          viewDetail: 'lendon.viewDetail',
          add: 'lendon.manage',
          edit: 'lendon.manage',
          delete: 'nx.delete',
          approve: 'nx.confirmWarehouse'
        }
      },
      {
        key: 'ton_npp',
        name: 'Tồn NPP',
        desc: 'Báo cáo tồn Nhà phân phối',
        actions: {
          view: true,
          viewDetail: null,
          add: null,
          edit: null,
          delete: 'nx.delete',
          approve: null
        }
      }
    ]
  },
  {
    category: 'BÁO CÁO & ĐỐI SOÁT',
    icon: BarChart3,
    color: 'rose',
    modules: [
      {
        key: 'tongquan',
        name: 'Tổng quan Dashboard',
        desc: 'Báo cáo biểu đồ & phân tích xuất nhập tồn',
        actions: {
          view: true,
          viewDetail: null,
          add: null,
          edit: null,
          delete: null,
          approve: null
        }
      },
      {
        key: 'doisoat',
        name: 'Đối soát MISA',
        desc: 'Đối chiếu tồn hệ thống với phần mềm MISA',
        actions: {
          view: true,
          viewDetail: 'doisoat.viewDetail',
          add: 'doisoat.manage',
          edit: 'doisoat.manage',
          delete: 'doisoat.manage',
          approve: null
        }
      }
    ]
  },
  {
    category: 'HỆ THỐNG & NGƯỜI DÙNG',
    icon: Settings,
    color: 'purple',
    modules: [
      {
        key: 'nhanvien',
        name: 'Danh sách nhân viên',
        desc: 'Danh bạ tài khoản & nhân sự DSNV',
        actions: {
          view: true,
          viewDetail: 'nhanvien.viewDetail',
          add: 'caidat.manage',
          edit: 'caidat.manage',
          delete: 'caidat.manage',
          approve: null
        }
      },
      {
        key: 'khachhang',
        name: 'Danh sách khách hàng',
        desc: 'Danh mục khách hàng NPP và nhà cung cấp',
        actions: {
          view: true,
          viewDetail: 'khachhang.viewDetail',
          add: 'caidat.manage',
          edit: 'caidat.manage',
          delete: 'caidat.manage',
          approve: null
        }
      },
      {
        key: 'caidat',
        name: 'Cài đặt & Phân quyền',
        desc: 'Cấu hình tham số & ma trận phân quyền',
        actions: {
          view: true,
          viewDetail: null,
          add: null,
          edit: 'caidat.manage',
          delete: null,
          approve: null
        }
      }
    ]
  }
];

export const ROLE_INFO = {
  ADMIN: {
    key: 'ADMIN',
    name: 'Tổng Giám Đốc / Admin',
    desc: 'Quản trị viên tối cao, toàn quyền hệ thống',
    icon: ShieldCheck,
    color: 'purple',
    isSuper: true
  },
  KT: {
    key: 'KT',
    name: 'Phòng Kế toán',
    desc: 'Doanh thu, giá sản phẩm & đối soát tồn',
    icon: Calculator,
    color: 'emerald'
  },
  KHO: {
    key: 'KHO',
    name: 'Bộ phận Kho hàng',
    desc: 'Xuất nhập kho, điều chuyển, quản lý hàng hóa',
    icon: Warehouse,
    color: 'blue'
  },
  KD: {
    key: 'KD',
    name: 'Phòng Kinh doanh',
    desc: 'Quản lý lên đơn, theo dõi xuất hàng và tồn',
    icon: Briefcase,
    color: 'amber'
  },
  NVKD: {
    key: 'NVKD',
    name: 'Nhân viên Kinh doanh',
    desc: 'Lên đơn bán hàng và theo dõi đơn phụ trách',
    icon: UserCheck,
    color: 'sky'
  },
  NPP: {
    key: 'NPP',
    name: 'Nhà Phân Phối',
    desc: 'Xem sản phẩm được phân phối và đơn xuất',
    icon: Truck,
    color: 'teal'
  }
};

export const STANDARD_ROLE_KEYS = ['ADMIN', 'KT', 'KHO', 'KD', 'NVKD', 'NPP'];

export function PermissionMatrix({
  workingRoles,
  setWorkingRoles,
  workingUserPermissions = {},
  setWorkingUserPermissions,
  usersData = [],
  onSave,
  isSaving = false
}) {
  const [targetType, setTargetType] = useState('role'); // 'role' | 'user'
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [moduleSearch, setModuleSearch] = useState('');
  const [copyFromRole, setCopyFromRole] = useState('');

  // Selected User Object
  const selectedUser = useMemo(() => {
    if (targetType !== 'user' || !selectedUserId) return null;
    return usersData.find(u => (u.id || '').toString().trim() === selectedUserId) || null;
  }, [targetType, selectedUserId, usersData]);

  // Is this user currently using custom permissions override?
  const isUserCustomized = Boolean(selectedUser && workingUserPermissions[selectedUser.id]);

  // Active Target Permissions Config
  const currentConfig = useMemo(() => {
    if (targetType === 'role') {
      return workingRoles[selectedRole] || { modules: [], actions: [] };
    }
    if (targetType === 'user' && selectedUser) {
      if (workingUserPermissions[selectedUser.id]) {
        return workingUserPermissions[selectedUser.id];
      }
      // If user has no custom override, inherit from user's role
      const userRoleKey = (selectedUser.role || 'KHO').toUpperCase();
      return workingRoles[userRoleKey] || { modules: [], actions: [] };
    }
    return { modules: [], actions: [] };
  }, [targetType, selectedRole, selectedUser, workingRoles, workingUserPermissions]);

  const isCurrentAdmin = targetType === 'role' && selectedRole === 'ADMIN';

  // Helper to update active target permissions
  const updateCurrentConfig = (updater) => {
    if (isCurrentAdmin) return; // ADMIN is immutable root

    if (targetType === 'role') {
      setWorkingRoles(prev => {
        const next = { ...prev };
        const oldConf = next[selectedRole] || { modules: [], actions: [] };
        next[selectedRole] = updater(oldConf);
        return next;
      });
    } else if (targetType === 'user' && selectedUser) {
      setWorkingUserPermissions(prev => {
        const next = { ...prev };
        const oldConf = next[selectedUser.id] || currentConfig;
        next[selectedUser.id] = updater(oldConf);
        return next;
      });
    }
  };

  // Check if an action is checked for a given module
  const isActionChecked = (moduleKey, actionType, actionKey) => {
    if (isCurrentAdmin) return true;
    if (actionType === 'view') {
      return (currentConfig.modules || []).includes(moduleKey);
    }
    if (!actionKey) return false;
    return (currentConfig.actions || []).includes(actionKey);
  };

  // Toggle single action for a module
  const toggleAction = (moduleKey, actionType, actionKey) => {
    if (isCurrentAdmin) return;

    updateCurrentConfig(conf => {
      let nextMods = Array.isArray(conf.modules) ? [...conf.modules] : [];
      let nextActs = Array.isArray(conf.actions) ? [...conf.actions] : [];

      if (actionType === 'view') {
        if (nextMods.includes(moduleKey)) {
          nextMods = nextMods.filter(m => m !== moduleKey);
        } else {
          nextMods.push(moduleKey);
        }
      } else if (actionKey) {
        if (nextActs.includes(actionKey)) {
          nextActs = nextActs.filter(a => a !== actionKey);
        } else {
          nextActs.push(actionKey);
          // If enabling an action, ensure module view is enabled
          if (!nextMods.includes(moduleKey)) {
            nextMods.push(moduleKey);
          }
        }
      }

      return { modules: nextMods, actions: nextActs };
    });
  };

  // Toggle ALL actions for a single module
  const toggleAllForModule = (mod) => {
    if (isCurrentAdmin) return;

    const applicableActionKeys = Object.entries(mod.actions)
      .filter(([k, v]) => k !== 'view' && Boolean(v))
      .map(([k, v]) => v);

    const isAllChecked = (currentConfig.modules || []).includes(mod.key) &&
      applicableActionKeys.every(actKey => (currentConfig.actions || []).includes(actKey));

    updateCurrentConfig(conf => {
      let nextMods = Array.isArray(conf.modules) ? [...conf.modules] : [];
      let nextActs = Array.isArray(conf.actions) ? [...conf.actions] : [];

      if (isAllChecked) {
        // Uncheck all
        nextMods = nextMods.filter(m => m !== mod.key);
        nextActs = nextActs.filter(a => !applicableActionKeys.includes(a));
      } else {
        // Check all
        if (!nextMods.includes(mod.key)) nextMods.push(mod.key);
        applicableActionKeys.forEach(a => {
          if (!nextActs.includes(a)) nextActs.push(a);
        });
      }

      return { modules: nextMods, actions: nextActs };
    });
  };

  // Toggle ALL modules for a given column (e.g. toggle all 'view', toggle all 'viewDetail', etc.)
  const toggleColumnAll = (actionType) => {
    if (isCurrentAdmin) return;

    // Collect all modules and target action keys
    const allModules = PERMISSION_MODULE_GROUPS.flatMap(g => g.modules);
    const applicablePairs = [];

    allModules.forEach(mod => {
      if (actionType === 'view') {
        applicablePairs.push({ modKey: mod.key, actionKey: null });
      } else {
        const actKey = mod.actions[actionType];
        if (actKey) applicablePairs.push({ modKey: mod.key, actionKey: actKey });
      }
    });

    if (applicablePairs.length === 0) return;

    // Check if all are already checked
    const isAllColumnChecked = applicablePairs.every(p => {
      if (actionType === 'view') return (currentConfig.modules || []).includes(p.modKey);
      return (currentConfig.actions || []).includes(p.actionKey);
    });

    updateCurrentConfig(conf => {
      let nextMods = Array.isArray(conf.modules) ? [...conf.modules] : [];
      let nextActs = Array.isArray(conf.actions) ? [...conf.actions] : [];

      if (isAllColumnChecked) {
        // Turn off for all
        if (actionType === 'view') {
          const modKeys = applicablePairs.map(p => p.modKey);
          nextMods = nextMods.filter(m => !modKeys.includes(m));
        } else {
          const actKeys = applicablePairs.map(p => p.actionKey);
          nextActs = nextActs.filter(a => !actKeys.includes(a));
        }
      } else {
        // Turn on for all
        applicablePairs.forEach(p => {
          if (actionType === 'view') {
            if (!nextMods.includes(p.modKey)) nextMods.push(p.modKey);
          } else {
            if (!nextActs.includes(p.actionKey)) nextActs.push(p.actionKey);
            if (!nextMods.includes(p.modKey)) nextMods.push(p.modKey);
          }
        });
      }

      return { modules: nextMods, actions: nextActs };
    });
  };

  // Copy permissions from another role
  const handleCopyFromRole = (sourceRoleKey) => {
    if (!sourceRoleKey || sourceRoleKey === selectedRole) return;
    const source = workingRoles[sourceRoleKey];
    if (!source) return;

    updateCurrentConfig(() => ({
      modules: [...(source.modules || [])],
      actions: [...(source.actions || [])]
    }));
    setCopyFromRole('');
  };

  // Reset user customization back to inheriting from their Role
  const handleResetUserToRole = () => {
    if (!selectedUser || !workingUserPermissions[selectedUser.id]) return;
    if (window.confirm(`Khôi phục quyền của ${selectedUser.name} về mặc định theo vai trò ${selectedUser.role}?`)) {
      setWorkingUserPermissions(prev => {
        const next = { ...prev };
        delete next[selectedUser.id];
        return next;
      });
    }
  };

  // Filtered Users for Left Column
  const filteredUsers = useMemo(() => {
    return usersData.filter(u => {
      if (!targetSearch) return true;
      const text = `${u.name || ''} ${u.id || ''} ${u.role || ''}`.toLowerCase();
      return text.includes(targetSearch.toLowerCase());
    });
  }, [usersData, targetSearch]);

  // Filtered Module Groups for Right Column
  const filteredGroups = useMemo(() => {
    if (!moduleSearch) return PERMISSION_MODULE_GROUPS;
    const s = moduleSearch.toLowerCase();
    return PERMISSION_MODULE_GROUPS.map(g => ({
      ...g,
      modules: g.modules.filter(m => 
        m.name.toLowerCase().includes(s) || 
        m.desc.toLowerCase().includes(s) || 
        m.key.toLowerCase().includes(s)
      )
    })).filter(g => g.modules.length > 0);
  }, [moduleSearch]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[720px]">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* CỘT TRÁI (VÙNG 2): CHỌN ĐỐI TƯỢNG PHÂN QUYỀN (VAI TRÒ / NHÂN VIÊN) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/70 p-4 sm:p-5 flex flex-col space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Đối tượng phân quyền</h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Chọn vai trò hoặc nhân viên để thiết lập quyền bên phải</p>
        </div>

        {/* Target Mode Tabs: Vai trò vs Nhân viên */}
        <div className="grid grid-cols-2 p-1 bg-slate-200/70 rounded-xl gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTargetType('role')}
            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              targetType === 'role' 
                ? 'bg-white text-purple-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Theo Vai trò ({STANDARD_ROLE_KEYS.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetType('user');
              if (!selectedUserId && usersData.length > 0) {
                setSelectedUserId((usersData[0].id || '').toString().trim());
              }
            }}
            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              targetType === 'user' 
                ? 'bg-white text-purple-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Theo Nhân viên ({usersData.length})</span>
          </button>
        </div>

        {/* Search for roles or users */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={targetSearch}
            onChange={(e) => setTargetSearch(e.target.value)}
            placeholder={targetType === 'role' ? "Tìm kiếm vai trò..." : "Tìm tên, mã nhân viên..."}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* List of Targets */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[500px] lg:max-h-none">
          {targetType === 'role' ? (
            STANDARD_ROLE_KEYS.map((rKey) => {
              const info = ROLE_INFO[rKey] || { key: rKey, name: rKey, desc: '', icon: ShieldCheck, color: 'purple' };
              const IconComp = info.icon || ShieldCheck;
              const isSelected = selectedRole === rKey;
              const modCount = workingRoles[rKey]?.modules?.length || 0;
              const actCount = workingRoles[rKey]?.actions?.length || 0;

              return (
                <div
                  key={rKey}
                  onClick={() => setSelectedRole(rKey)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-3 select-none ${
                    isSelected 
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                      : 'bg-white hover:bg-slate-100/70 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600'
                  }`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-xs truncate">{info.name}</h4>
                      {info.isSuper && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                          isSelected ? 'bg-white text-purple-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          Root
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                      {info.desc}
                    </p>
                    <div className={`flex items-center gap-2 text-[10px] mt-1.5 font-semibold ${
                      isSelected ? 'text-purple-100' : 'text-slate-500'
                    }`}>
                      <span>{modCount} modules</span>
                      <span>•</span>
                      <span>{actCount} quyền</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                Không tìm thấy nhân viên nào phù hợp
              </div>
            ) : (
              filteredUsers.map((u) => {
                const uId = (u.id || '').toString().trim();
                const isSelected = selectedUserId === uId;
                const isCustom = Boolean(workingUserPermissions[uId]);
                const roleKey = (u.role || '').toUpperCase();
                const roleObj = ROLE_INFO[roleKey];

                return (
                  <div
                    key={uId}
                    onClick={() => setSelectedUserId(uId)}
                    className={`p-2.5 rounded-2xl border transition cursor-pointer flex items-center gap-2.5 select-none ${
                      isSelected 
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                        : 'bg-white hover:bg-slate-100/70 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {(u.name || uId).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-xs truncate">{u.name || uId}</h4>
                        {isCustom && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                            isSelected ? 'bg-amber-300 text-amber-950' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Tùy chỉnh
                          </span>
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 text-[10px] mt-0.5 truncate ${
                        isSelected ? 'text-purple-100' : 'text-slate-400'
                      }`}>
                        <span className="font-mono font-bold">{uId}</span>
                        <span>•</span>
                        <span>{roleObj?.name || roleKey || 'Nhân viên'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* BẢNG PHẢI: MA TRẬN TẤT CẢ MODULE & CÁC CỘT QUYỀN HẠN (VÙNG 3)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 min-w-0 space-y-4 overflow-hidden">
        {/* Top Header of Active Target */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Thiết lập ma trận quyền:
              </span>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-purple-100 text-purple-800">
                {targetType === 'role' ? (ROLE_INFO[selectedRole]?.name || selectedRole) : (selectedUser?.name || selectedUserId)}
              </span>
              {targetType === 'user' && selectedUser && (
                <span className="text-xs text-slate-500">
                  (Mã: <b className="font-mono">{selectedUser.id}</b>, Vai trò gốc: <b>{selectedUser.role}</b>)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isCurrentAdmin ? (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Vai trò Tổng Giám Đốc (ADMIN) mặc định sở hữu toàn bộ các quyền và không thể gỡ bỏ.
                </span>
              ) : targetType === 'user' && !isUserCustomized ? (
                <span>
                  Đang kế thừa toàn bộ quyền từ nhóm vai trò <b>{selectedUser?.role}</b>. Bạn có thể tích chọn bên dưới để cấp quyền riêng cho nhân viên này.
                </span>
              ) : targetType === 'user' && isUserCustomized ? (
                <span className="text-amber-700 font-semibold">
                  Tài khoản này đang có cấu hình phân quyền riêng biệt.
                </span>
              ) : (
                <span>
                  Tích chọn các quyền Xem, Xem chi tiết tồn 5 kho, Thêm, Sửa, Xóa, Duyệt cho vai trò này.
                </span>
              )}
            </p>
          </div>

          {/* Action buttons: Reset, Copy, Save */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {targetType === 'user' && isUserCustomized && (
              <button
                type="button"
                onClick={handleResetUserToRole}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                title="Xóa cấu hình riêng để quay về kế thừa vai trò"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kế thừa theo {selectedUser?.role}</span>
              </button>
            )}

            {!isCurrentAdmin && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold pl-1.5">Sao chép từ:</span>
                <select
                  value={copyFromRole}
                  onChange={(e) => {
                    const src = e.target.value;
                    if (src) handleCopyFromRole(src);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none pr-1 cursor-pointer"
                >
                  <option value="">Chọn vai trò</option>
                  {STANDARD_ROLE_KEYS.filter(r => r !== selectedRole).map(r => (
                    <option key={r} value={r}>{ROLE_INFO[r]?.name || r}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu vào Sheet CAI_DAT'}</span>
            </button>
          </div>
        </div>

        {/* Search Module Filter Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
              placeholder="Lọc nhanh module (Sản phẩm, Nhập, Xuất, Giá...)"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Tích chọn vào các ô bên dưới để bật/tắt quyền tương ứng
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* MA TRẬN BẢNG PHÂN QUYỀN (MATRIX TABLE)                         */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[760px]">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px] uppercase select-none">
              <tr>
                <th className="py-3 px-4 w-72">Tên Module màn hình</th>
                {/* Xem */}
                <th className="py-3 px-2 text-center w-20">
                  <div className="flex flex-col items-center gap-1">
                    <span>Xem</span>
                    {!isCurrentAdmin && (
                      <button
                        type="button"
                        onClick={() => toggleColumnAll('view')}
                        className="text-[9px] text-purple-600 hover:underline cursor-pointer lowercase"
                        title="Bật/Tắt cột Xem cho tất cả module"
                      >
                        tất cả
                      </button>
                    )}
                  </div>
                </th>
                {/* Xem chi tiết */}
                <th className="py-3 px-2 text-center w-28 bg-purple-50/50 text-purple-900 border-x border-purple-100">
                  <div className="flex flex-col items-center gap-1">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-purple-600" />
                      <span>Xem chi tiết</span>
                    </span>
                    {!isCurrentAdmin && (
                      <button
                        type="button"
                        onClick={() => toggleColumnAll('viewDetail')}
                        className="text-[9px] text-purple-600 hover:underline cursor-pointer lowercase"
                        title="Bật/Tắt cột Xem chi tiết cho tất cả module có hỗ trợ"
                      >
                        tất cả
                      </button>
                    )}
                  </div>
                </th>
                {/* Thêm */}
                <th className="py-3 px-2 text-center w-20">
                  <div className="flex flex-col items-center gap-1">
                    <span>Thêm</span>
                    {!isCurrentAdmin && (
                      <button
                        type="button"
                        onClick={() => toggleColumnAll('add')}
                        className="text-[9px] text-purple-600 hover:underline cursor-pointer lowercase"
                        title="Bật/Tắt cột Thêm cho tất cả module có hỗ trợ"
                      >
                        tất cả
                      </button>
                    )}
                  </div>
                </th>
                {/* Sửa */}
                <th className="py-3 px-2 text-center w-20">
                  <div className="flex flex-col items-center gap-1">
                    <span>Sửa</span>
                    {!isCurrentAdmin && (
                      <button
                        type="button"
                        onClick={() => toggleColumnAll('edit')}
                        className="text-[9px] text-purple-600 hover:underline cursor-pointer lowercase"
                        title="Bật/Tắt cột Sửa cho tất cả module có hỗ trợ"
                      >
                        tất cả
                      </button>
                    )}
                  </div>
                </th>
                {/* Xóa */}
                <th className="py-3 px-2 text-center w-20">
                  <div className="flex flex-col items-center gap-1">
                    <span>Xóa</span>
                    {!isCurrentAdmin && (
                      <button
                        type="button"
                        onClick={() => toggleColumnAll('delete')}
                        className="text-[9px] text-purple-600 hover:underline cursor-pointer lowercase"
                        title="Bật/Tắt cột Xóa cho tất cả module có hỗ trợ"
                      >
                        tất cả
                      </button>
                    )}
                  </div>
                </th>
                {/* Duyệt */}
                <th className="py-3 px-2 text-center w-24">
                  <div className="flex flex-col items-center gap-1">
                    <span>Duyệt / Kho</span>
                    {!isCurrentAdmin && (
                      <button
                        type="button"
                        onClick={() => toggleColumnAll('approve')}
                        className="text-[9px] text-purple-600 hover:underline cursor-pointer lowercase"
                        title="Bật/Tắt cột Duyệt cho tất cả module có hỗ trợ"
                      >
                        tất cả
                      </button>
                    )}
                  </div>
                </th>
                {/* Toàn bộ */}
                <th className="py-3 px-3 text-center w-20">
                  <span>Toàn bộ</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredGroups.map((group) => {
                const GroupIcon = group.icon || Package;

                return (
                  <React.Fragment key={group.category}>
                    {/* Category Divider Header Row */}
                    <tr className="bg-slate-100/70 border-y border-slate-200">
                      <td colSpan={8} className="py-2 px-4 font-black text-slate-700 tracking-wider text-[11px]">
                        <div className="flex items-center gap-2">
                          <GroupIcon className="w-4 h-4 text-slate-500" />
                          <span>{group.category}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({group.modules.length} modules)
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Module Rows */}
                    {group.modules.map((mod) => {
                      const isView = isActionChecked(mod.key, 'view', null);
                      const isDetail = isActionChecked(mod.key, 'viewDetail', mod.actions.viewDetail);
                      const isAdd = isActionChecked(mod.key, 'add', mod.actions.add);
                      const isEdit = isActionChecked(mod.key, 'edit', mod.actions.edit);
                      const isDelete = isActionChecked(mod.key, 'delete', mod.actions.delete);
                      const isApprove = isActionChecked(mod.key, 'approve', mod.actions.approve);

                      // Calculate if "Toàn bộ" is active
                      const applicableActions = [
                        { key: 'view', applicable: true, checked: isView },
                        { key: 'viewDetail', applicable: Boolean(mod.actions.viewDetail), checked: isDetail },
                        { key: 'add', applicable: Boolean(mod.actions.add), checked: isAdd },
                        { key: 'edit', applicable: Boolean(mod.actions.edit), checked: isEdit },
                        { key: 'delete', applicable: Boolean(mod.actions.delete), checked: isDelete },
                        { key: 'approve', applicable: Boolean(mod.actions.approve), checked: isApprove },
                      ].filter(a => a.applicable);

                      const isAllChecked = applicableActions.every(a => a.checked);

                      return (
                        <tr 
                          key={mod.key} 
                          className={`hover:bg-purple-50/20 transition ${
                            isView ? 'bg-white' : 'bg-slate-50/40 text-slate-400'
                          }`}
                        >
                          {/* Module info */}
                          <td className="py-2.5 px-4 font-bold text-slate-800">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={isView ? 'text-slate-800' : 'text-slate-400'}>{mod.name}</span>
                                {mod.key === 'sanpham' && (
                                  <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded text-[9px] font-black">
                                    Chi tiết 5 kho
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                                {mod.desc}
                              </p>
                            </div>
                          </td>

                          {/* 1. Xem */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={isView}
                              disabled={isCurrentAdmin}
                              onChange={() => toggleAction(mod.key, 'view', null)}
                              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer disabled:cursor-not-allowed"
                              title={`Cho phép truy cập màn hình ${mod.name}`}
                            />
                          </td>

                          {/* 2. Xem chi tiết (Cột nổi bật) */}
                          <td className="py-2 px-2 text-center bg-purple-50/30 border-x border-purple-100">
                            {mod.actions.viewDetail ? (
                              <div className="flex justify-center">
                                <input
                                  type="checkbox"
                                  checked={isDetail}
                                  disabled={isCurrentAdmin}
                                  onChange={() => toggleAction(mod.key, 'viewDetail', mod.actions.viewDetail)}
                                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer disabled:cursor-not-allowed accent-purple-600"
                                  title={`Quyền xem chi tiết tồn kho & lịch sử cho ${mod.name}`}
                                />
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs select-none">-</span>
                            )}
                          </td>

                          {/* 3. Thêm */}
                          <td className="py-2 px-2 text-center">
                            {mod.actions.add ? (
                              <input
                                type="checkbox"
                                checked={isAdd}
                                disabled={isCurrentAdmin}
                                onChange={() => toggleAction(mod.key, 'add', mod.actions.add)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                                title={`Quyền thêm mới cho ${mod.name}`}
                              />
                            ) : (
                              <span className="text-slate-300 font-mono text-xs select-none">-</span>
                            )}
                          </td>

                          {/* 4. Sửa */}
                          <td className="py-2 px-2 text-center">
                            {mod.actions.edit ? (
                              <input
                                type="checkbox"
                                checked={isEdit}
                                disabled={isCurrentAdmin}
                                onChange={() => toggleAction(mod.key, 'edit', mod.actions.edit)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                                title={`Quyền chỉnh sửa cho ${mod.name}`}
                              />
                            ) : (
                              <span className="text-slate-300 font-mono text-xs select-none">-</span>
                            )}
                          </td>

                          {/* 5. Xóa */}
                          <td className="py-2 px-2 text-center">
                            {mod.actions.delete ? (
                              <input
                                type="checkbox"
                                checked={isDelete}
                                disabled={isCurrentAdmin}
                                onChange={() => toggleAction(mod.key, 'delete', mod.actions.delete)}
                                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer disabled:cursor-not-allowed"
                                title={`Quyền xóa cho ${mod.name}`}
                              />
                            ) : (
                              <span className="text-slate-300 font-mono text-xs select-none">-</span>
                            )}
                          </td>

                          {/* 6. Duyệt / Xác nhận kho */}
                          <td className="py-2 px-2 text-center">
                            {mod.actions.approve ? (
                              <input
                                type="checkbox"
                                checked={isApprove}
                                disabled={isCurrentAdmin}
                                onChange={() => toggleAction(mod.key, 'approve', mod.actions.approve)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                title={`Quyền xác nhận trạng thái kho / duyệt đơn cho ${mod.name}`}
                              />
                            ) : (
                              <span className="text-slate-300 font-mono text-xs select-none">-</span>
                            )}
                          </td>

                          {/* 7. Toàn bộ */}
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              disabled={isCurrentAdmin}
                              onClick={() => toggleAllForModule(mod)}
                              className={`p-1 rounded-lg transition cursor-pointer disabled:cursor-not-allowed ${
                                isAllChecked 
                                  ? 'bg-purple-600 text-white' 
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                              }`}
                              title="Tích / Bỏ tích tất cả quyền của module này"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getLocalItem, setLocalItem, removeLocalItem, STORAGE_KEYS } from '../utils/storage';
import { normalizeLoginValue, removeVietnameseTones } from '../utils/formatters';
import { DEFAULT_PERMISSIONS } from '../config/defaultPermissions';
import { MODULE_DEFINITIONS } from '../config/constants';
import { loginWithServerAuth } from '../services/googleSheetsService';

const AuthContext = createContext(null);

function mergePermissionsWithDefaults(cached) {
  if (!cached || typeof cached !== 'object') {
    return DEFAULT_PERMISSIONS;
  }
  const mergedRoles = { ...DEFAULT_PERMISSIONS.roles };
  if (cached.roles) {
    Object.keys(cached.roles).forEach(r => {
      const upperRole = r.toUpperCase();
      const cachedMods = cached.roles[r]?.modules;
      const cachedActs = cached.roles[r]?.actions;

      let modules = Array.isArray(cachedMods) ? [...cachedMods] : (DEFAULT_PERMISSIONS.roles[upperRole]?.modules || []);
      let actions = Array.isArray(cachedActs) ? [...cachedActs] : (DEFAULT_PERMISSIONS.roles[upperRole]?.actions || []);

      if (upperRole === 'ADMIN') {
        MODULE_DEFINITIONS.forEach(m => {
          if (!modules.includes(m.key)) modules.push(m.key);
        });
        DEFAULT_PERMISSIONS.roles.ADMIN.actions.forEach(a => {
          if (!actions.includes(a)) actions.push(a);
        });
      }

      mergedRoles[upperRole] = {
        modules,
        actions
      };
    });
  }
  return {
    ...DEFAULT_PERMISSIONS,
    ...cached,
    roles: mergedRoles
  };
}

export function AuthProvider({ children }) {
  const [loggedInUser, setLoggedInUser] = useState(() => getLocalItem(STORAGE_KEYS.SESSION, null));
  const [currentUser, setCurrentUser] = useState(() => getLocalItem(STORAGE_KEYS.SESSION, null));
  const [usersData, setUsersData] = useState(() => getLocalItem(STORAGE_KEYS.USERS_CACHE, []));
  const [permissions, setPermissions] = useState(() => {
    const cached = getLocalItem(STORAGE_KEYS.PERMISSIONS, null);
    const merged = mergePermissionsWithDefaults(cached);
    setLocalItem(STORAGE_KEYS.PERMISSIONS, merged);
    return merged;
  });

  useEffect(() => {
    if (loggedInUser) {
      setLocalItem(STORAGE_KEYS.SESSION, loggedInUser);
    } else {
      removeLocalItem(STORAGE_KEYS.SESSION);
    }
  }, [loggedInUser]);

  const updateUsers = useCallback((newUsers) => {
    setUsersData(newUsers);
    setLocalItem(STORAGE_KEYS.USERS_CACHE, newUsers);

    setLoggedInUser(prevLoggedIn => {
      if (!prevLoggedIn) return null;
      const freshLoggedIn = newUsers.find(u => u.id?.toLowerCase() === prevLoggedIn.id?.toLowerCase());
      if (freshLoggedIn && JSON.stringify(freshLoggedIn) !== JSON.stringify(prevLoggedIn)) {
        return freshLoggedIn;
      }
      return prevLoggedIn;
    });

    setCurrentUser(prevCurrent => {
      if (!prevCurrent) return null;
      const fresh = newUsers.find(u => u.id?.toLowerCase() === prevCurrent.id?.toLowerCase());
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(prevCurrent)) {
        return fresh;
      }
      return prevCurrent;
    });
  }, []);

  const login = useCallback(async (id, password) => {
    const normId = normalizeLoginValue(id).toLowerCase();
    const normPass = normalizeLoginValue(password);

    if (!normId || !normPass) {
      throw new Error("Vui lòng nhập đầy đủ ID tài khoản và mật khẩu.");
    }

    try {
      // 1. Try secure server-side login
      const result = await loginWithServerAuth(id, password);
      if (result && result.success && result.user) {
        setLoggedInUser(result.user);
        setCurrentUser(result.user);
        return result.user;
      }
    } catch (serverErr) {
      console.warn("Server auth error, trying local fallback:", serverErr.message);
      const noToneNormId = removeVietnameseTones(normId);

      const foundUser = usersData.find(u => {
        const uId = (u.id || '').toString().trim().toLowerCase();
        const uName = (u.name || '').toString().trim().toLowerCase();
        const uPass = (u.password || '').toString().trim();
        const noToneUId = removeVietnameseTones(uId);
        const noToneUName = removeVietnameseTones(uName);
        const nameTokens = uName.split(/[\s\-_,.]+/).filter(Boolean);
        const nameNoToneTokens = noToneUName.split(/[\s\-_,.]+/).filter(Boolean);

        const idMatch = (
          uId === normId ||
          uName === normId ||
          noToneUId === noToneNormId ||
          noToneUName === noToneNormId ||
          nameTokens.includes(normId) ||
          nameNoToneTokens.includes(noToneNormId)
        );

        const passMatch = (
          uPass === normPass ||
          ((uPass === '123456' || uPass === '1') && (normPass === '1' || normPass === '123456')) ||
          (!uPass && (normPass === '1' || normPass === '123456'))
        );

        return idMatch && passMatch;
      });

      if (foundUser) {
        const sanitized = { ...foundUser, loginAlias: id };
        delete sanitized.password;
        setLoggedInUser(sanitized);
        setCurrentUser(sanitized);
        return sanitized;
      }
      throw new Error(serverErr.message || "Tài khoản hoặc mật khẩu không chính xác!");
    }
  }, [usersData]);

  const logout = useCallback(() => {
    setLoggedInUser(null);
    setCurrentUser(null);
    removeLocalItem(STORAGE_KEYS.SESSION);
    if (window.location.pathname !== '/login') {
      window.history.pushState(null, '', '/login');
    }
  }, []);

  const isAdminSession = useCallback(() => {
    const role = (loggedInUser?.role || '').toString().trim().toUpperCase();
    return role === 'ADMIN';
  }, [loggedInUser]);

  const switchAdminViewAs = useCallback((userId) => {
    if (!isAdminSession()) return;
    if (!userId || userId === loggedInUser?.id) {
      setCurrentUser(loggedInUser);
    } else {
      const target = usersData.find(u => u.id === userId);
      if (target) setCurrentUser(target);
    }
  }, [isAdminSession, loggedInUser, usersData]);

  const resolveRoleKey = useCallback((roleStr) => {
    const r = (roleStr || '').toString().trim().toUpperCase();
    if (r === 'ADMIN' || r === 'TỔNG GIÁM ĐỐC' || r === 'TONG GIAM DOC' || r === 'GIÁM ĐỐC' || r === 'GIAM DOC' || r === 'GD' || r === 'TGD') return 'ADMIN';
    if (r === 'KT' || r === 'KẾ TOÁN' || r === 'KE TOAN') return 'KT';
    if (r === 'KHO' || r === 'THỦ KHO' || r === 'THU KHO') return 'KHO';
    if (r === 'NPP' || r === 'NHÀ PHÂN PHỐI' || r === 'NHA PHAN PHOI') return 'NPP';
    if (r === 'KD' || r === 'KINH DOANH') return 'KD';
    if (r === 'NVKD' || r === 'NV KINH DOANH') return 'NVKD';
    return r;
  }, []);

  const getAllowedModules = useCallback(() => {
    if (!currentUser) return [];
    const roleKey = resolveRoleKey(currentUser.role);
    if (roleKey === 'ADMIN') {
      return MODULE_DEFINITIONS.map(m => m.key);
    }
    const roleConfig = permissions?.roles?.[roleKey] || permissions?.roles?.[currentUser.role] || DEFAULT_PERMISSIONS.roles[roleKey] || {};
    let modules = Array.isArray(roleConfig.modules) ? roleConfig.modules : (DEFAULT_PERMISSIONS.roles[roleKey]?.modules || []);
    return modules;
  }, [currentUser, permissions, resolveRoleKey]);

  const canAccessModule = useCallback((moduleKey) => {
    if (!currentUser) return false;
    if (moduleKey === 'home') return true;
    const roleKey = resolveRoleKey(currentUser.role);
    if (roleKey === 'ADMIN') return true;
    const allowed = getAllowedModules();
    return allowed.includes(moduleKey);
  }, [currentUser, getAllowedModules, resolveRoleKey]);

  const hasActionPermission = useCallback((actionKey) => {
    if (!currentUser) return false;
    const roleKey = resolveRoleKey(currentUser.role);
    if (roleKey === 'ADMIN') return true;
    const roleConfig = permissions?.roles?.[roleKey] || permissions?.roles?.[currentUser.role] || DEFAULT_PERMISSIONS.roles[roleKey] || {};
    const actions = Array.isArray(roleConfig.actions) ? roleConfig.actions : (DEFAULT_PERMISSIONS.roles[roleKey]?.actions || []);
    return actions.includes(actionKey);
  }, [currentUser, permissions, resolveRoleKey]);

  const getHiddenProductIds = useCallback(() => {
    if (!currentUser?.id) return [];
    return permissions?.userRestrictions?.[currentUser.id]?.hiddenProductIds || [];
  }, [currentUser, permissions]);

  const getUserWarehouses = useCallback(() => {
    if (!currentUser) return null;
    const userRole = (currentUser.role || '').toString().trim().toUpperCase();
    if (userRole === 'ADMIN') return null; // Admin has full warehouse access

    const userWhs = permissions?.userWarehouses;
    if (!userWhs || typeof userWhs !== 'object') return null;

    const normId = (currentUser.id || '').toString().trim().toLowerCase().normalize('NFC');
    const normName = (currentUser.name || '').toString().trim().toLowerCase().normalize('NFC');
    const normAlias = (currentUser.loginAlias || '').toString().trim().toLowerCase().normalize('NFC');
    const noToneId = removeVietnameseTones(normId);
    const noToneName = removeVietnameseTones(normName);
    const noToneAlias = removeVietnameseTones(normAlias);

    const nameTokens = normName.split(/[\s\-_,.]+/).filter(Boolean);
    const nameNoToneTokens = noToneName.split(/[\s\-_,.]+/).filter(Boolean);

    // Find key matching normalized ID, Name, Alias, or tokens
    const foundKey = Object.keys(userWhs).find(k => {
      const normK = k.toString().trim().toLowerCase().normalize('NFC');
      const noToneK = removeVietnameseTones(normK);
      if (!normK) return false;

      return (
        normK === normId ||
        normK === normName ||
        (normAlias && normK === normAlias) ||
        noToneK === noToneId ||
        noToneK === noToneName ||
        (noToneAlias && noToneK === noToneAlias) ||
        nameTokens.includes(normK) ||
        nameNoToneTokens.includes(noToneK)
      );
    });

    if (foundKey && Array.isArray(userWhs[foundKey]) && userWhs[foundKey].length > 0) {
      return userWhs[foundKey];
    }
    return null;
  }, [currentUser, permissions]);

  const canAccessWarehouse = useCallback((warehouseName) => {
    const userWh = getUserWarehouses();
    if (!userWh || !Array.isArray(userWh) || userWh.length === 0) return true;
    if (!warehouseName) return false;
    const target = warehouseName.toString().trim().toUpperCase();
    return userWh.some(w => w.toString().trim().toUpperCase() === target);
  }, [getUserWarehouses]);

  const applyParsedPermissions = useCallback((parsedPermissions) => {
    if (!parsedPermissions) return;
    setPermissions(prev => {
      const merged = mergePermissionsWithDefaults({
        ...prev,
        ...parsedPermissions,
        roles: { ...(prev?.roles || {}), ...(parsedPermissions.roles || {}) },
        userRestrictions: { ...(prev?.userRestrictions || {}), ...(parsedPermissions.userRestrictions || {}) },
        userWarehouses: { ...(prev?.userWarehouses || {}), ...(parsedPermissions.userWarehouses || {}) },
        dataScopes: { ...(prev?.dataScopes || {}), ...(parsedPermissions.dataScopes || {}) }
      });
      setLocalItem(STORAGE_KEYS.PERMISSIONS, merged);
      return merged;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        loggedInUser,
        currentUser,
        usersData,
        permissions,
        setPermissions,
        applyParsedPermissions,
        updateUsers,
        login,
        logout,
        switchAdminViewAs,
        isAdminSession,
        resolveRoleKey,
        getAllowedModules,
        canAccessModule,
        hasActionPermission,
        getHiddenProductIds,
        getUserWarehouses,
        canAccessWarehouse
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

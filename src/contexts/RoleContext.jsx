import { createContext, useContext, useCallback, useState, useEffect } from 'react';

const RoleContext = createContext();

export const RoleProvider = ({ children, initialUser = null }) => {
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(initialUser !== null ? false : true);

  // Initialize user and load permissions
  useEffect(() => {
    if (initialUser !== null) return; // Skip when initialUser is provided (e.g. tests)
    const loadUserRole = async () => {
      try {
        // Load from AuthContext or Firebase
        setLoading(false);
      } catch (error) {
        console.error('Error loading user role:', error);
        setLoading(false);
      }
    };
    loadUserRole();
  }, [initialUser]);

  // Check if user has permission for action
  const hasPermission = useCallback((action, resource, scope = 'ALL') => {
    if (!currentUser) return false;

    // Admin Level 1 has all permissions
    if (currentUser.role === 'ADMIN_LEVEL_1') return true;

    return permissions[`${action}:${resource}`]?.includes(scope) || false;
  }, [currentUser, permissions]);

  // Check if user can manage a specific user
  const canManageUser = useCallback((targetUserId) => {
    if (!currentUser) return false;

    // Admin Level 1 can manage anyone
    if (currentUser.role === 'ADMIN_LEVEL_1') return true;

    // Admin Level 2 can only manage normal users they created
    if (currentUser.role === 'ADMIN_LEVEL_2') {
      return currentUser.id === targetUserId; // Can manage own profile only
    }

    // Normal users can only manage themselves
    return currentUser.id === targetUserId;
  }, [currentUser]);

  const value = {
    currentUser,
    setCurrentUser,
    hasPermission,
    canManageUser,
    loading,
    isAdmin: currentUser?.role?.includes('ADMIN'),
    isAdminLevel1: currentUser?.role === 'ADMIN_LEVEL_1',
    isAdminLevel2: currentUser?.role === 'ADMIN_LEVEL_2',
    isUser: currentUser?.role === 'USER'
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within RoleProvider');
  }
  return context;
};

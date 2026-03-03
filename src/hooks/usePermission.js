import { useRole } from '@/contexts/RoleContext';
import { useCallback } from 'react';

export const usePermission = () => {
  const { hasPermission, canManageUser, currentUser } = useRole();

  const can = useCallback((action, resource, options = {}) => {
    const { scope = 'ALL', userId } = options;

    if (userId && action !== 'READ') {
      return canManageUser(userId);
    }

    return hasPermission(action, resource, scope);
  }, [hasPermission, canManageUser]);

  return { can, currentUser };
};

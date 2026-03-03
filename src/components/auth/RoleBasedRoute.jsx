import { Navigate } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';

export const RoleBasedRoute = ({
  children,
  requiredRoles = [],
  requiredPermission = null
}) => {
  const { currentUser, hasPermission, loading } = useRole();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check role
  if (requiredRoles.length > 0 && !requiredRoles.includes(currentUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check permission
  if (requiredPermission) {
    const { action, resource, scope } = requiredPermission;
    if (!hasPermission(action, resource, scope)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

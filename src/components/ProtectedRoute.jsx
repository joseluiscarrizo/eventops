import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function PrivateRoute({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#1e3a5f]" />
          <p className="text-slate-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function RoleBasedRoute({ children, requiredRoles = [] }) {
  const { isAuthenticated, isLoadingAuth, user } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user?.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Acceso Denegado
          </h1>
          <p className="text-slate-600 mb-6">
            No tienes permisos para acceder a esta sección.
          </p>
          <p className="text-xs text-slate-500">
            Tu rol: <span className="font-mono font-bold">{user?.role}</span>
          </p>
        </Card>
      </div>
    );
  }

  return children;
}

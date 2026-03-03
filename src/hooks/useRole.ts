import { useAuth } from '@/lib/AuthContext';

/**
 * Hook para acceso centralizado a información y validación de roles
 *
 * @returns {Object} Objeto con propiedades y métodos de rol
 *
 * @example
 * const { isAdmin, can, role } = useRole();
 * if (!isAdmin) return <AccessDenied />;
 */
export function useRole() {
  const { user } = useAuth();

  return {
    // Propiedades booleanas para checks simples
    isAdmin: user?.role === 'admin',
    isCoordinator: user?.role === 'coordinador',
    isCamarero: user?.role === 'camarero',

    // Método genérico: can(requiredRole)
    // Retorna true si user.role === requiredRole
    can: (requiredRole: string) => {
      if (!user) return false;
      return user.role === requiredRole;
    },

    // Método: canAny(...roles)
    // Retorna true si user.role coincide con cualquiera de los roles
    canAny: (...roles: string[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },

    // El rol actual del usuario
    role: user?.role || null,

    // Información adicional del usuario (para auditoría/logging)
    userId: user?.id,
    userName: user?.name
  };
}

import Logger from './logger.ts';

/**
 * Clase para errores de RBAC
 */
export class RBACError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = 'RBACError';
    this.statusCode = statusCode;
  }
}

/**
 * Valida que usuario tiene el rol exacto requerido
 * @param user - Usuario de base44.auth.me()
 * @param requiredRole - Rol requerido ('admin', 'coordinador', 'camarero')
 * @throws {RBACError} Si usuario no tiene rol requerido
 *
 * @example
 * validateUserRole(user, 'admin');
 */
export function validateUserRole(user: { id: string; role: string } | null, requiredRole: string): void {
  if (!user) {
    throw new RBACError('No autorizado: Usuario no autenticado', 401);
  }

  if (user.role !== requiredRole) {
    Logger.warn(`RBAC Violation: User ${user.id} (${user.role}) intentó acceso de ${requiredRole}`);
    throw new RBACError(`No autorizado: Se requiere rol '${requiredRole}', tienes '${user.role}'`, 403);
  }
}

/**
 * Valida que usuario tiene uno de los roles permitidos
 * @param user - Usuario de base44.auth.me()
 * @param allowedRoles - Array de roles permitidos
 * @throws {RBACError} Si usuario no tiene ninguno de los roles permitidos
 *
 * @example
 * validateUserRoleAny(user, ['admin', 'coordinador']);
 */
export function validateUserRoleAny(user: { id: string; role: string } | null, allowedRoles: string[]): void {
  if (!user) {
    throw new RBACError('No autorizado: Usuario no autenticado', 401);
  }

  if (!allowedRoles.includes(user.role)) {
    Logger.warn(`RBAC Violation: User ${user.id} (${user.role}) intentó acceso de ${allowedRoles.join(', ')}`);
    throw new RBACError(`No autorizado: Se requiere uno de estos roles: ${allowedRoles.join(', ')}`, 403);
  }
}

/**
 * Middleware pattern para Cloud Functions
 * Valida autenticación y rol en una sola llamada
 *
 * @param user - Usuario de base44.auth.me()
 * @param requiredRoles - Rol(es) requerido(s)
 * @returns Usuario validado
 * @throws {RBACError} Si validación falla
 *
 * @example
 * const user = validateUserAccess(await base44.auth.me(), ['admin', 'coordinador']);
 */
export function validateUserAccess(
  user: { id: string; role: string } | null,
  requiredRoles: string | string[]
): { id: string; role: string } {
  if (!user) {
    throw new RBACError('No autorizado: Usuario no autenticado', 401);
  }

  const roleArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  if (!roleArray.includes(user.role)) {
    Logger.warn(`RBAC Violation: User ${user.id} (${user.role}) intentó acceso de ${roleArray.join(', ')}`);
    throw new RBACError(`No autorizado: Se requiere uno de estos roles: ${roleArray.join(', ')}`, 403);
  }

  return user;
}

/**
 * Valida que usuario es el propietario del recurso (para operaciones de perfil)
 * @param user - Usuario autenticado
 * @param resourceUserId - ID del usuario dueño del recurso
 * @throws {RBACError} Si usuario no es propietario y no es admin
 *
 * @example
 * validateOwnershipOrAdmin(user, camarero.usuario_id);
 */
export function validateOwnershipOrAdmin(
  user: { id: string; role: string } | null,
  resourceUserId: string
): { id: string; role: string } {
  if (!user) {
    throw new RBACError('No autorizado', 401);
  }

  const isOwner = user.id === resourceUserId;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    Logger.warn(`Ownership Violation: User ${user.id} intentó acceso al recurso de ${resourceUserId}`);
    throw new RBACError('No autorizado: Solo puedes acceder a tus propios recursos', 403);
  }

  return user;
}

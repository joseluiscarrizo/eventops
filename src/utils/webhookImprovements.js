/**
 * webhookImprovements - Módulo de mejoras para manejo de errores y validación.
 */

/**
 * Error de base de datos - para problemas al acceder o guardar datos.
 */
export class DatabaseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Error de validación - para datos de entrada inválidos o incompletos.
 */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Maneja errores de webhook y devuelve un mensaje de usuario legible.
 * @param {Error} error - El error a manejar.
 * @returns {string} - Mensaje amigable para el usuario.
 */
export function handleWebhookError(error) {
  if (error instanceof ValidationError) {
    return error.message;
  }
  if (error instanceof DatabaseError) {
    return 'Error de base de datos. Inténtalo de nuevo.';
  }
  return 'Error de conexión. Inténtalo de nuevo.';
}

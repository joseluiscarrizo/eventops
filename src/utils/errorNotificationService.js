/**
 * ErrorNotificationService - Servicio de notificación de errores al usuario.
 */
class ErrorNotificationService {
  /**
   * Notifica al usuario de un error mostrando un mensaje.
   * @param {string} message - Mensaje de error a mostrar.
   */
  static notify(message) {
    console.warn(`[ErrorNotification] ${message}`);
  }
}

export default ErrorNotificationService;

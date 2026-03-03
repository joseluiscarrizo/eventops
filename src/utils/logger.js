/**
 * Logger - Módulo de logging centralizado para la aplicación.
 * Proporciona métodos de logging con nivel y timestamp.
 */
class Logger {
  static log(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
    switch (level) {
      case 'debug':
        console.log(`[DEBUG] [${timestamp}] ${message}${contextStr}`);
        break;
      case 'info':
        console.info(`[INFO] [${timestamp}] ${message}${contextStr}`);
        break;
      case 'warn':
        console.warn(`[WARN] [${timestamp}] ${message}${contextStr}`);
        break;
      case 'error':
        console.error(`[ERROR] [${timestamp}] ${message}${contextStr}`);
        break;
      default:
        console.log(`[LOG] [${timestamp}] ${message}${contextStr}`);
        break;
    }
  }

  static debug(message, context = {}) {
    this.log('debug', message, context);
  }

  static info(message, context = {}) {
    this.log('info', message, context);
  }

  static warn(message, context = {}) {
    this.log('warn', message, context);
  }

  static error(message, context = {}) {
    this.log('error', message, context);
  }
}

export default Logger;

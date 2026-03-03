// logger.ts - Frontend logger for auth and application events

class Logger {
    static log(level: string, message: string, context?: Record<string, unknown>): void {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` ${JSON.stringify(context)}` : '';
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

    static debug(message: string, context?: Record<string, unknown>): void {
        this.log('debug', message, context);
    }

    static info(message: string, context?: Record<string, unknown>): void {
        this.log('info', message, context);
    }

    static warn(message: string, context?: Record<string, unknown>): void {
        this.log('warn', message, context);
    }

    static error(message: string, context?: Record<string, unknown>): void {
        this.log('error', message, context);
    }
}

export default Logger;

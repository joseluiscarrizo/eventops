class Logger {
    static log(level, message) {
        const timestamp = new Date().toISOString();
        switch (level) {
            case 'debug':
                console.log(`[DEBUG] [${timestamp}] ${message}`);
                break;
            case 'info':
                console.info(`[INFO] [${timestamp}] ${message}`);
                break;
            case 'warn':
                console.warn(`[WARN] [${timestamp}] ${message}`);
                break;
            case 'error':
                console.error(`[ERROR] [${timestamp}] ${message}`);
                break;
            default:
                console.log(`[LOG] [${timestamp}] ${message}`);
                break;
        }
    }
    static debug(message) {
        this.log('debug', message);
    }
    static info(message) {
        this.log('info', message);
    }
    static warn(message) {
        this.log('warn', message);
    }
    static error(message) {
        this.log('error', message);
    }
}

export default Logger;
// retryHandler.ts

const DEFAULT_RETRIES = 5;
const DEFAULT_DELAY = 1000; // 1 second

/**
 * Exponential backoff retry handler for network operations.
 * @param operation - The operation to retry.
 * @param retries - Number of retries.
 * @param delay - Delay between retries in milliseconds.
 */
async function retryWithExponentialBackoff<T>(operation: () => Promise<T>, retries: number = DEFAULT_RETRIES, delay: number = DEFAULT_DELAY): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (retries === 0) throw error;
        await new Promise(res => setTimeout(res, delay));
        return retryWithExponentialBackoff(operation, retries - 1, delay * 2);
    }
}

const API_CONFIGURATIONS = {
    DATABASE: {
        // Add your database config here
        host: 'localhost',
        user: 'user',
        password: 'password',
        database: 'dbname'
    },
    WHATSAPP_API: {
        // Add your WhatsApp API config here
        token: 'your_whatsapp_token'
    },
    GMAIL_API: {
        // Add your Gmail API config here
        clientId: 'your_client_id',
        clientSecret: 'your_client_secret',
        refreshToken: 'your_refresh_token'
    },
    SHEETS_API: {
        // Add your Sheets API config here
        spreadsheetId: 'your_spreadsheet_id',
        range: 'A1:C10'
    }
};

export { retryWithExponentialBackoff, API_CONFIGURATIONS };
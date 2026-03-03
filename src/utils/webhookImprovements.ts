class GmailApiError extends Error {
 constructor(message: string) {
 super(message);
 this.name = 'GmailApiError';
 }
}

async function executeGmailOperation(operation: () => Promise<any>): Promise<any> {
 try {
 const result = await operation();
 return result;
 } catch (error) {
 throw new GmailApiError('Gmail API operation failed: ' + (error as Error).message);
 }
}

function handleWebhookError(error: Error): void {
 console.error('Webhook processing error:', error.message);
}

export { GmailApiError, executeGmailOperation, handleWebhookError };
// webhookErrorHandler.ts

/**
 * Handles errors for webhook requests.
 * @param {Error} error - The error object to handle.
 * @param {Object} _req - The request object (intentionally unused).
 * @param {Object} res - The response object.
 * @returns {void}
 */
export const webhookErrorHandler = (error, _req, res) => {
    console.error('Webhook error:', error);
    
    // Send a generic error response to the webhook sender
    res.status(500).send({
        status: 'error',
        message: 'An error occurred while processing the webhook.'
    });
};
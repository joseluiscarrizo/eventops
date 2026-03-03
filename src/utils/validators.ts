// validators.ts - Frontend validation utilities

/**
 * Validate if the given email is valid.
 * @param {string} email - Email to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

/** Number of seconds before expiration to consider a token as needing refresh. */
const REFRESH_THRESHOLD_SECONDS = 5 * 60; // 5 minutes

/**
 * Validate the structure and basic integrity of an authentication token.
 * For JWTs, also validates expiration and detects tokens close to expiry.
 * @param {string | null | undefined} token - Token to validate.
 * @returns {{ valid: boolean; reason?: string; isExpired?: boolean; shouldRefresh?: boolean }} - Validation result.
 */
export function validateToken(token: string | null | undefined): {
    valid: boolean;
    reason?: string;
    isExpired?: boolean;
    shouldRefresh?: boolean;
} {
    if (!token) {
        return { valid: false, reason: 'Token is missing' };
    }
    if (typeof token !== 'string') {
        return { valid: false, reason: 'Token must be a string' };
    }
    if (token.trim().length === 0) {
        return { valid: false, reason: 'Token is empty' };
    }
    // Basic JWT structure check: three dot-separated base64 segments
    const jwtParts = token.split('.');
    if (jwtParts.length === 3) {
        try {
            const payload = JSON.parse(atob(jwtParts[1]));
            if (payload.exp) {
                const nowSeconds = Math.floor(Date.now() / 1000);
                if (nowSeconds > payload.exp) {
                    return { valid: false, reason: 'Token expired', isExpired: true };
                }
                const secondsUntilExpiry = payload.exp - nowSeconds;
                if (secondsUntilExpiry < REFRESH_THRESHOLD_SECONDS) {
                    return { valid: true, shouldRefresh: true };
                }
            }
        } catch {
            // Not a standard JWT – treat as opaque token, still valid structurally
        }
    }
    return { valid: true };
}

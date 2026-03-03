// tokenRefresh.ts - JWT token refresh and validation utilities

/** Number of seconds before expiration to consider a token as needing refresh. */
const REFRESH_THRESHOLD_SECONDS = 5 * 60; // 5 minutes

export interface TokenValidationResult {
    valid: boolean;
    reason?: string;
    isExpired: boolean;
    shouldRefresh: boolean;
    expiresIn: number | null;
}

/**
 * Parses the payload of a JWT token without verifying the signature.
 * Returns null if the token is not a valid JWT.
 */
function parseJwtPayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
        return JSON.parse(atob(parts[1]));
    } catch {
        return null;
    }
}

/**
 * Calculates seconds until the token expires.
 * Returns null if the token has no exp claim or is not a valid JWT.
 */
function getSecondsUntilExpiration(token: string): number | null {
    const payload = parseJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') return null;
    return payload.exp - Math.floor(Date.now() / 1000);
}

/**
 * Calculates time until token expiration in seconds.
 * Returns 0 if already expired, null if expiration is unknown.
 */
export function getTimeUntilExpiration(token: string): number | null {
    const seconds = getSecondsUntilExpiration(token);
    if (seconds === null) return null;
    return Math.max(0, seconds);
}

/**
 * Validates a token and returns a comprehensive status result.
 */
export function validateAndCheckTokenStatus(token: string | null | undefined): TokenValidationResult {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
        return { valid: false, reason: 'Token is missing or empty', isExpired: false, shouldRefresh: false, expiresIn: null };
    }

    const secondsUntilExpiry = getSecondsUntilExpiration(token);

    if (secondsUntilExpiry === null) {
        // Opaque token or no exp claim – treat as valid
        return { valid: true, isExpired: false, shouldRefresh: false, expiresIn: null };
    }

    if (secondsUntilExpiry <= 0) {
        return { valid: false, reason: 'Token expired', isExpired: true, shouldRefresh: false, expiresIn: 0 };
    }

    const shouldRefresh = secondsUntilExpiry < REFRESH_THRESHOLD_SECONDS;
    return { valid: true, isExpired: false, shouldRefresh, expiresIn: secondsUntilExpiry };
}

/**
 * Attempts to refresh the token if it is close to expiring.
 * Uses base44.auth.me() to verify the session is still active.
 * Returns { token: string, expiresIn: number } on success, or null if refresh is not needed or fails.
 *
 * @param currentToken - The current authentication token.
 * @param base44Client - The base44 SDK client instance.
 */
export async function refreshTokenIfNeeded(
    currentToken: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    base44Client: any
): Promise<{ token: string; expiresIn: number } | null> {
    const status = validateAndCheckTokenStatus(currentToken);

    if (!status.shouldRefresh && !status.isExpired) {
        return null;
    }

    try {
        // Verify the session via the SDK; some SDK versions return a refreshed token
        const user = await base44Client.auth.me();
        if (!user) return null;

        // If the SDK exposes a refreshed token, use it; otherwise return current token.
        // `await` is used here to support both sync and async getToken() implementations.
        const refreshedToken: string = (typeof base44Client.auth.getToken === 'function')
            ? ((await base44Client.auth.getToken()) ?? currentToken)
            : currentToken;

        const newExpiresIn = getTimeUntilExpiration(refreshedToken) ?? 0;
        return { token: refreshedToken, expiresIn: newExpiresIn };
    } catch {
        return null;
    }
}

// useTokenStatus.ts - Hook for accessing token expiration status in components

import { useAuth } from '@/lib/AuthContext';

export interface TokenStatus {
  /** True if the token expires in less than 5 minutes */
  isExpiring: boolean;
  /** Minutes remaining until expiration, or null if unknown */
  minutesRemaining: number | null;
  /** True if the token has already expired */
  isExpired: boolean;
  /** The raw token string, or null if not authenticated */
  token: string | null;
}

/**
 * Returns token expiration status for the currently authenticated user.
 * Useful for showing session expiry warnings in UI components.
 */
export function useTokenStatus(): TokenStatus {
  const { token, isTokenExpired, timeUntilExpiration } = useAuth();

  const isExpiring = timeUntilExpiration !== null && timeUntilExpiration < 5 * 60;
  const minutesRemaining = timeUntilExpiration !== null
    ? Math.floor(timeUntilExpiration / 60)
    : null;

  return {
    isExpiring,
    minutesRemaining,
    isExpired: isTokenExpired ?? false,
    token: token ?? null
  };
}

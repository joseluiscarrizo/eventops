import { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import Logger from '../utils/logger';
import { validateToken } from '../utils/validators';
import {
  validateAndCheckTokenStatus,
  refreshTokenIfNeeded,
  getTimeUntilExpiration
} from '../utils/tokenRefresh';
import ErrorNotificationService from '../utils/errorNotificationService';
import {
  ValidationError,
  handleWebhookError
} from '../utils/webhookImprovements';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }
  const [token, setToken] = useState(appParams.token ?? null);
  const [expiresIn, setExpiresIn] = useState(null);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [timeUntilExpiration, setTimeUntilExpiration] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  // Check token expiration every 3 minutes and refresh if needed
  useEffect(() => {
    if (!token) return;

    const checkToken = async () => {
      const validation = validateAndCheckTokenStatus(token);

      if (validation.isExpired) {
        Logger.warn('Token expired during session – logging out');
        const userMessage = ErrorNotificationService.getMessage('TOKEN_EXPIRED');
        ErrorNotificationService.notifyUser(userMessage);
        setIsTokenExpired(true);
        setTimeUntilExpiration(0);
        logout(false);
        return;
      }

      if (validation.shouldRefresh) {
        const result = await refreshTokenIfNeeded(token, base44);
        if (result) {
          Logger.info('Token refreshed successfully');
          setToken(result.token);
          setExpiresIn(result.expiresIn);
        } else {
          Logger.warn('Token refresh failed – user may need to re-authenticate');
        }
      }

      setTimeUntilExpiration(getTimeUntilExpiration(token));
      setIsTokenExpired(validation.isExpired);
      setExpiresIn(validation.expiresIn);
    };

    // Run immediately on mount to validate the current token without waiting for the first interval
    checkToken();
    const interval = setInterval(checkToken, 3 * 60 * 1000); // 3 minutes (within the 5-min refresh threshold)
    return () => clearInterval(interval);
  }, [token]);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      Logger.info('Checking app state', { appId: appParams.appId });

      // Validate token structure before using it
      const tokenValidation = validateToken(appParams.token);
      if (appParams.token && !tokenValidation.valid) {
        Logger.warn('Token validation failed before app state check', { reason: tokenValidation.reason });
      }

      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        Logger.info('App public settings loaded successfully');

        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token && tokenValidation.valid) {
          await checkUserAuth();
        } else if (appParams.token && !tokenValidation.valid) {
          Logger.warn('Skipping user auth check: token is invalid', { reason: tokenValidation.reason });
          const userMessage = ErrorNotificationService.getMessage('TOKEN_EXPIRED');
          ErrorNotificationService.notifyUser(userMessage);
          setAuthError({
            type: 'token_invalid',
            message: tokenValidation.reason || 'Token is invalid or expired',
            retryable: false
          });
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        const mapped = handleWebhookError(appError);
        Logger.error('App state check failed', { type: mapped.type, message: mapped.message });

        // Handle app-level errors with specific error types
        if (mapped.type === 'auth_required') {
          const userMessage = ErrorNotificationService.getMessage('AUTH_REQUIRED');
          ErrorNotificationService.notifyUser(userMessage);
          setAuthError({
            type: 'auth_required',
            message: 'Authentication required',
            retryable: false
          });
        } else if (mapped.type === 'user_not_registered') {
          const userMessage = ErrorNotificationService.getMessage('USER_NOT_REGISTERED');
          ErrorNotificationService.notifyUser(userMessage);
          setAuthError({
            type: 'user_not_registered',
            message: 'User not registered for this app',
            retryable: false
          });
        } else if (mapped.type === 'validation_error') {
          Logger.error('Validation error during app state check', { message: mapped.message });
          setAuthError({
            type: 'validation_error',
            message: mapped.message,
            retryable: false
          });
        } else {
          const userMessage = ErrorNotificationService.getMessage(mapped.type);
          ErrorNotificationService.notifyUser(userMessage);
          setAuthError({
            type: mapped.type,
            message: mapped.message || 'Failed to load app',
            retryable: mapped.retryable
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      const mapped = handleWebhookError(error);
      Logger.error('Unexpected error during app state check', { type: mapped.type, message: mapped.message });
      ErrorNotificationService.notifyUser(ErrorNotificationService.getMessage('UNKNOWN'));
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred',
        retryable: mapped.retryable
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      Logger.info('Checking user authentication');

      const currentUser = await base44.auth.me();

      // Validate that the user object exists before setting state
      if (!currentUser) {
        Logger.warn('Auth check returned empty user');
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthError({
          type: 'auth_required',
          message: 'Could not retrieve user information',
          retryable: true
        });
        return;
      }

      Logger.info('User authenticated successfully', { userId: currentUser.id ?? currentUser.email });
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      const mapped = handleWebhookError(error);
      Logger.error('User auth check failed', { type: mapped.type, message: mapped.message });
      setIsLoadingAuth(false);
      setIsAuthenticated(false);

      // Handle token expiry and unauthenticated states gracefully
      if (mapped.type === 'auth_required' || error.status === 401 || error.status === 403) {
        const userMessage = ErrorNotificationService.getMessage('AUTH_REQUIRED');
        ErrorNotificationService.notifyUser(userMessage);
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required. Please log in again.',
          retryable: false
        });
      } else if (mapped.type === 'user_not_registered') {
        const userMessage = ErrorNotificationService.getMessage('USER_NOT_REGISTERED');
        ErrorNotificationService.notifyUser(userMessage);
        setAuthError({
          type: 'user_not_registered',
          message: 'Your account is not registered for this application.',
          retryable: false
        });
      } else {
        const userMessage = ErrorNotificationService.getMessage('UNKNOWN');
        ErrorNotificationService.notifyUser(userMessage);
        setAuthError({
          type: mapped.type,
          message: mapped.message,
          retryable: mapped.retryable
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    try {
      Logger.info('User logout initiated', { shouldRedirect });
      setUser(null);
      setIsAuthenticated(false);

      if (shouldRedirect) {
        // Use the SDK's logout method which handles token cleanup and redirect
        base44.auth.logout(globalThis.location.href);
      } else {
        // Just remove the token without redirect
        base44.auth.logout();
      }
      Logger.info('User logged out successfully');
    } catch (error) {
      Logger.error('Error during logout', { message: error.message });
      // Ensure local state is cleared even if logout throws
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const navigateToLogin = () => {
    Logger.info('Redirecting user to login');
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(globalThis.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      token,
      expiresIn,
      isTokenExpired,
      timeUntilExpiration,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

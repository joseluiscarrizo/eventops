import { createContext, useContext, useState } from 'react';
import { toast } from 'sonner';

const ErrorContext = createContext();

export function ErrorProvider({ children }) {
  const [errors, setErrors] = useState([]);

  const handleError = (error, options = {}) => {
    const {
      title = 'Error',
      message = error?.message || 'Algo salió mal',
      severity = 'error',
      duration = 5000,
      showNotification = true,
      onRetry = null
    } = options;

    const errorId = Date.now();
    const errorObj = {
      id: errorId,
      title,
      message,
      severity,
      timestamp: new Date(),
      originalError: error,
      onRetry
    };

    setErrors(prev => [...prev, errorObj]);

    if (showNotification) {
      if (severity === 'error') {
        toast.error(message, { duration });
      } else if (severity === 'warning') {
        toast.warning(message, { duration });
      } else {
        toast.info(message, { duration });
      }
    }

    return errorId;
  };

  const clearError = (errorId) => {
    setErrors(prev => prev.filter(e => e.id !== errorId));
  };

  const clearAllErrors = () => {
    setErrors([]);
  };

  return (
    <ErrorContext.Provider value={{
      errors,
      handleError,
      clearError,
      clearAllErrors
    }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorHandler() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within ErrorProvider');
  }
  return context;
}

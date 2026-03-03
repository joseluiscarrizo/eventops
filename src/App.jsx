import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { RoleProvider, useRole } from '@/contexts/RoleContext';
import { RoleBasedRoute } from '@/components/auth/RoleBasedRoute';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ManagerAdminDashboard } from '@/components/admin/ManagerAdminDashboard';
import { UserDashboard } from '@/components/user/UserDashboard';
import { useEffect } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ErrorProvider } from '@/contexts/ErrorContext';
import { LoadingProvider } from '@/contexts/LoadingContext';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : null;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Syncs authenticated user from AuthContext into RoleContext
const AuthRoleSync = () => {
  const { user } = useAuth();
  const { setCurrentUser } = useRole();

  useEffect(() => {
    setCurrentUser(user || null);
  }, [user, setCurrentUser]);

  return null;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}

      {/* Admin Level 1 Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <RoleBasedRoute requiredRoles={['ADMIN_LEVEL_1']}>
            <AdminDashboard />
          </RoleBasedRoute>
        }
      />

      {/* Admin Level 2 Routes */}
      <Route
        path="/manager/dashboard"
        element={
          <RoleBasedRoute requiredRoles={['ADMIN_LEVEL_2']}>
            <ManagerAdminDashboard />
          </RoleBasedRoute>
        }
      />

      {/* User Routes */}
      <Route
        path="/user/dashboard"
        element={
          <RoleBasedRoute requiredRoles={['USER', 'ADMIN_LEVEL_1', 'ADMIN_LEVEL_2']}>
            <UserDashboard />
          </RoleBasedRoute>
        }
      />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClientInstance}>
        <AuthProvider>
          <ErrorProvider>
            <LoadingProvider>
              <RoleProvider>
                <Router>
                  <AuthRoleSync />
                  <NavigationTracker />
                  <AuthenticatedApp />
                </Router>
                <Toaster />
                <VisualEditAgent />
              </RoleProvider>
            </LoadingProvider>
          </ErrorProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App

import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import Residents from '@/pages/Residents';
import Employers from '@/pages/Employers';
import Partners from '@/pages/Partners';
import Organizations from '@/pages/Organizations';
import Sites from '@/pages/Sites';
import UserManagement from '@/pages/UserManagement';
import ModuleSettings from '@/pages/ModuleSettings';
import AuditLogs from '@/pages/AuditLogs';
import Documents from '@/pages/Documents';
import Messages from '@/pages/Messages';
import ModulePlaceholder from '@/pages/ModulePlaceholder';
import IntakeModule from '@/pages/intake/IntakeModule';
import IntakeForm from '@/pages/intake/IntakeForm';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-bold text-sm">REJ</span>
          </div>
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/residents" element={<Residents />} />
        <Route path="/employers" element={<Employers />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/organizations" element={<Organizations />} />
        <Route path="/sites" element={<Sites />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/modules" element={<ModuleSettings />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/module/:slug" element={<ModulePlaceholder />} />
        <Route path="/intake" element={<IntakeModule />} />
        <Route path="/intake/:residentId" element={<IntakeModule />} />
        <Route path="/intake/:residentId/form" element={<IntakeForm />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
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
import ResidentProfile from '@/pages/ResidentProfile';
import CaseManagement from '@/pages/CaseManagement';
import Learning from '@/pages/Learning';
import JobReadiness from '@/pages/JobReadiness';
import OutcomesReport from '@/pages/OutcomesReport';
import Alumni from '@/pages/Alumni';
import ResourceInventory from '@/pages/ResourceInventory';
import JobMatching from '@/pages/JobMatching';
import Reporting from '@/pages/Reporting';
import ResidentOutcomes from '@/pages/ResidentOutcomes';
import EmployerOutcomes from '@/pages/EmployerOutcomes';
import EmployerPortal from '@/pages/EmployerPortal';
import MyJobs from '@/pages/MyJobs';
import MyAppointments from '@/pages/MyAppointments';
import MyTasks from '@/pages/MyTasks';
import MySupports from '@/pages/MySupports';
import PublicLanding from '@/pages/PublicLanding';
import RequestAccess from '@/pages/RequestAccess';
import OnboardingQueue from '@/pages/admin/OnboardingQueue';
import AdminControlCenter from '@/pages/admin/AdminControlCenter';
import AuditCenter from '@/pages/admin/AuditCenter';
import Training from '@/pages/Training';
import ActivateAccount from '@/pages/auth/ActivateAccount';
import HousingReferrals from '@/pages/HousingReferrals';
import MyAccessVerification from '@/pages/admin/MyAccessVerification';
import HousingOperations from '@/pages/HousingOperations';
import GrantTracker from '@/pages/GrantTracker';
import TransportationHub from '@/pages/TransportationHub';
import ManagerPortal from '@/pages/ManagerPortal';
import SystemHealth from '@/pages/admin/SystemHealth';
import OperationalDashboard from '@/pages/OperationalDashboard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-bold text-sm">HOH</span>
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
      // Private app - show public landing page for unauthenticated users
      return (
        <Routes>
          <Route path="/" element={<PublicLanding />} />
          <Route path="/auth/request-access" element={<RequestAccess />} />
          <Route path="*" element={<PublicLanding />} />
        </Routes>
      );
    }
    // For unknown errors, fall through and render the app anyway
    // (e.g. network blip — don't permanently block rendering)
  }

  return (
    <Routes>
      <Route path="/auth/request-access" element={<RequestAccess />} />
      <Route path="/auth/activate" element={<ActivateAccount />} />
      <Route path="/admin/onboarding" element={<OnboardingQueue />} />
      <Route path="/admin/control-center" element={<AdminControlCenter />} />
      <Route path="/admin/audit" element={<AuditCenter />} />
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
        <Route path="/residents/:residentId" element={<ResidentProfile />} />
        <Route path="/case-management" element={<CaseManagement />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/job-readiness" element={<JobReadiness />} />
        <Route path="/outcomes" element={<OutcomesReport />} />
        <Route path="/alumni" element={<Alumni />} />
        <Route path="/resources" element={<ResourceInventory />} />
        <Route path="/job-matching" element={<JobMatching />} />
        <Route path="/reporting" element={<Reporting />} />
        <Route path="/resident-outcomes" element={<ResidentOutcomes />} />
        <Route path="/employer-outcomes" element={<EmployerOutcomes />} />
        <Route path="/employer-portal" element={<EmployerPortal />} />
        <Route path="/my-jobs" element={<MyJobs />} />
        <Route path="/my-appointments" element={<MyAppointments />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/my-supports" element={<MySupports />} />
        <Route path="/housing-referrals" element={<HousingReferrals />} />
        <Route path="/housing" element={<HousingOperations />} />
        <Route path="/grants" element={<GrantTracker />} />
        <Route path="/transportation" element={<TransportationHub />} />
        <Route path="/manager-portal" element={<ManagerPortal />} />
        <Route path="/admin/my-access" element={<MyAccessVerification />} />
        <Route path="/admin/system-health" element={<SystemHealth />} />
        <Route path="/dashboard/operations" element={<OperationalDashboard />} />
        <Route path="/training" element={<Training />} />
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
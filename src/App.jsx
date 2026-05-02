import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import RequireRole from '@/components/RequireRole';

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
import OutcomesEngine from '@/pages/OutcomesEngine';
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
import Login from '@/pages/auth/Login';
import HousingReferrals from '@/pages/HousingReferrals';
import MyAccessVerification from '@/pages/admin/MyAccessVerification';
import HousingOperations from '@/pages/HousingOperations';
import GrantTracker from '@/pages/GrantTracker';
import DonorDatabase from '@/pages/DonorDatabase';
import EmployerDirectory from '@/pages/EmployerDirectory';
import JobBoard from '@/pages/JobBoard';
import PlacementTracker from '@/pages/PlacementTracker';
import EmployerSignup from '@/pages/EmployerSignup';
import TransportationHub from '@/pages/TransportationHub';
import ManagerPortal from '@/pages/ManagerPortal';
import SystemHealth from '@/pages/admin/SystemHealth';
import OperationalDashboard from '@/pages/OperationalDashboard';
import VideoHub from '@/pages/VideoHub';
import VideoRoom from '@/pages/VideoRoom';
import VideoHistory from '@/pages/VideoHistory';
import ResumePrint from '@/pages/ResumePrint';

// =============================================================
// ROLE GROUPS for route guarding.
// 'user' is the Base44 platform default — currently treated as admin
// (see rbac.js). When commercial multi-tenancy launches, switch new
// accounts to 'pending' until an explicit role is assigned.
// =============================================================
const ADMIN_ROLES   = ['admin', 'user', 'super_admin', 'org_admin'];
const MANAGER_ROLES = [...ADMIN_ROLES, 'manager', 'program_manager'];
const STAFF_ROLES   = [...MANAGER_ROLES, 'staff', 'case_manager', 'instructor', 'house_manager', 'employment_specialist', 'grant_manager', 'transportation_coordinator', 'housing_staff', 'employment_staff'];
const RESIDENT_ROLES = [...STAFF_ROLES, 'resident'];           // staff + the resident themselves
const EMPLOYER_ROLES = [...STAFF_ROLES, 'employer'];           // staff + employer partners
const AUDITOR_ROLES  = [...ADMIN_ROLES, 'auditor'];            // admin + auditor only

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

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
      return (
        <Routes>
          <Route path="/" element={<PublicLanding />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/request-access" element={<RequestAccess />} />
          <Route path="*" element={<PublicLanding />} />
        </Routes>
      );
    }
  }

  return (
    <Routes>
      {/* Public-ish */}
      <Route path="/employer-signup" element={<EmployerSignup />} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/request-access" element={<RequestAccess />} />
      <Route path="/auth/activate" element={<ActivateAccount />} />

      {/* Admin-only standalone routes */}
      <Route path="/admin/onboarding"     element={<RequireRole roles={ADMIN_ROLES}><OnboardingQueue /></RequireRole>} />
      <Route path="/admin/control-center" element={<RequireRole roles={ADMIN_ROLES}><AdminControlCenter /></RequireRole>} />
      <Route path="/admin/audit"          element={<RequireRole roles={AUDITOR_ROLES}><AuditCenter /></RequireRole>} />

      {/* Resume print page — standalone (no AppLayout, full-bleed for printing) */}
      <Route path="/resume/:residentId" element={<RequireRole roles={STAFF_ROLES}><ResumePrint /></RequireRole>} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />

        {/* Staff-only participant management */}
        <Route path="/residents"                  element={<RequireRole roles={STAFF_ROLES}><Residents /></RequireRole>} />
        <Route path="/residents/:residentId"      element={<RequireRole roles={STAFF_ROLES}><ResidentProfile /></RequireRole>} />
        <Route path="/case-management"            element={<RequireRole roles={STAFF_ROLES}><CaseManagement /></RequireRole>} />
        <Route path="/intake"                     element={<RequireRole roles={STAFF_ROLES}><IntakeModule /></RequireRole>} />
        <Route path="/intake/:residentId"         element={<RequireRole roles={STAFF_ROLES}><IntakeModule /></RequireRole>} />
        <Route path="/intake/:residentId/form"    element={<RequireRole roles={STAFF_ROLES}><IntakeForm /></RequireRole>} />
        <Route path="/job-readiness"              element={<RequireRole roles={STAFF_ROLES}><JobReadiness /></RequireRole>} />
        <Route path="/job-matching"               element={<RequireRole roles={STAFF_ROLES}><JobMatching /></RequireRole>} />
        <Route path="/placements"                 element={<RequireRole roles={STAFF_ROLES}><PlacementTracker /></RequireRole>} />
        <Route path="/alumni"                     element={<RequireRole roles={STAFF_ROLES}><Alumni /></RequireRole>} />

        {/* Operations */}
        <Route path="/housing"             element={<RequireRole roles={STAFF_ROLES}><HousingOperations /></RequireRole>} />
        <Route path="/housing-referrals"   element={<RequireRole roles={STAFF_ROLES}><HousingReferrals /></RequireRole>} />
        <Route path="/transportation"      element={<RequireRole roles={STAFF_ROLES}><TransportationHub /></RequireRole>} />
        <Route path="/resources"           element={<RequireRole roles={STAFF_ROLES}><ResourceInventory /></RequireRole>} />
        <Route path="/partners"            element={<RequireRole roles={STAFF_ROLES}><Partners /></RequireRole>} />

        {/* Employer-facing */}
        <Route path="/employer-portal"     element={<RequireRole roles={EMPLOYER_ROLES}><EmployerPortal /></RequireRole>} />
        <Route path="/job-board"           element={<RequireRole roles={EMPLOYER_ROLES}><JobBoard /></RequireRole>} />

        {/* Employer / employment management */}
        <Route path="/employers"           element={<RequireRole roles={STAFF_ROLES}><Employers /></RequireRole>} />
        <Route path="/employer-directory"  element={<RequireRole roles={STAFF_ROLES}><EmployerDirectory /></RequireRole>} />
        <Route path="/employer-outcomes"   element={<RequireRole roles={STAFF_ROLES}><EmployerOutcomes /></RequireRole>} />

        {/* Reporting & outcomes */}
        <Route path="/reporting"           element={<RequireRole roles={STAFF_ROLES}><Reporting /></RequireRole>} />
        <Route path="/outcomes"            element={<RequireRole roles={STAFF_ROLES}><OutcomesReport /></RequireRole>} />
        <Route path="/outcomes-engine"     element={<RequireRole roles={ADMIN_ROLES}><OutcomesEngine /></RequireRole>} />
        <Route path="/resident-outcomes"   element={<RequireRole roles={STAFF_ROLES}><ResidentOutcomes /></RequireRole>} />
        <Route path="/dashboard/operations" element={<RequireRole roles={MANAGER_ROLES}><OperationalDashboard /></RequireRole>} />

        {/* Funding */}
        <Route path="/grants" element={<RequireRole roles={[...ADMIN_ROLES, 'grant_manager']}><GrantTracker /></RequireRole>} />
        <Route path="/donors" element={<RequireRole roles={ADMIN_ROLES}><DonorDatabase /></RequireRole>} />

        {/* Resident self-service */}
        <Route path="/my-jobs"         element={<RequireRole roles={RESIDENT_ROLES}><MyJobs /></RequireRole>} />
        <Route path="/my-appointments" element={<RequireRole roles={RESIDENT_ROLES}><MyAppointments /></RequireRole>} />
        <Route path="/my-tasks"        element={<RequireRole roles={RESIDENT_ROLES}><MyTasks /></RequireRole>} />
        <Route path="/my-supports"     element={<RequireRole roles={RESIDENT_ROLES}><MySupports /></RequireRole>} />

        {/* Admin */}
        <Route path="/users"          element={<RequireRole roles={ADMIN_ROLES}><UserManagement /></RequireRole>} />
        <Route path="/modules"        element={<RequireRole roles={ADMIN_ROLES}><ModuleSettings /></RequireRole>} />
        <Route path="/module/:slug"   element={<RequireRole roles={ADMIN_ROLES}><ModulePlaceholder /></RequireRole>} />
        <Route path="/audit-logs"     element={<RequireRole roles={AUDITOR_ROLES}><AuditLogs /></RequireRole>} />
        <Route path="/organizations"  element={<RequireRole roles={ADMIN_ROLES}><Organizations /></RequireRole>} />
        <Route path="/sites"          element={<RequireRole roles={ADMIN_ROLES}><Sites /></RequireRole>} />
        <Route path="/manager-portal" element={<RequireRole roles={MANAGER_ROLES}><ManagerPortal /></RequireRole>} />
        <Route path="/admin/my-access"     element={<RequireRole roles={ADMIN_ROLES}><MyAccessVerification /></RequireRole>} />
        <Route path="/admin/system-health" element={<RequireRole roles={ADMIN_ROLES}><SystemHealth /></RequireRole>} />

        {/* Communication — any authenticated user (their own subset only) */}
        <Route path="/messages"   element={<Messages />} />
        <Route path="/documents"  element={<Documents />} />
        <Route path="/learning"   element={<Learning />} />
        <Route path="/training"   element={<Training />} />
        <Route path="/video-hub"                    element={<VideoHub />} />
        <Route path="/video-hub/room/:roomName"     element={<VideoRoom />} />
        <Route path="/video-hub/history"            element={<VideoHistory />} />
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

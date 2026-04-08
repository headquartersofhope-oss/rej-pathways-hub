import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { ROLES, isAdmin, isCaseManager, isProbationOfficer, isResident, isEmployer } from '@/lib/roles';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import CaseManagerDashboard from '@/components/dashboard/CaseManagerDashboard';
import StaffDashboard from '@/components/dashboard/StaffDashboard';
import ProbationDashboard from '@/components/dashboard/ProbationDashboard';
import ResidentDashboard from '@/components/dashboard/ResidentDashboard';
import EmployerDashboard from '@/components/dashboard/EmployerDashboard';

export default function Home() {
  const { user } = useOutletContext();
  const role = user?.role;

  const renderDashboard = () => {
    // Admin roles (full access)
    if (isAdmin(role)) return <AdminDashboard user={user} />;

    // Case managers (caseload-focused)
    if (isCaseManager(role)) return <CaseManagerDashboard user={user} />;

    // Probation officers (read-only access)
    if (isProbationOfficer(role)) return <ProbationDashboard user={user} />;

    // Residents (personal dashboard)
    if (isResident(role)) return <ResidentDashboard user={user} />;

    // Employers - show employer dashboard
    if (isEmployer(role)) return <EmployerDashboard user={user} />;

    // Auditors (read-only admin view)
    if (role === 'auditor' || role === ROLES.AUDITOR) return <AdminDashboard user={user} />;

    // Referral partners
    if (role === 'referral_partner' || role === ROLES.REFERRAL_PARTNER) return <StaffDashboard user={user} />;

    // Program managers
    if (role === 'program_manager') return <StaffDashboard user={user} />;

    // Default: instructors, staff (including unrecognized roles default to staff)
    return <StaffDashboard user={user} />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      {renderDashboard()}
    </div>
  );
}
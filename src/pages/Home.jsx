import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { ROLES, isStaff, isAdmin } from '@/lib/roles';
import ResidentDashboard from '@/components/dashboard/ResidentDashboard';
import StaffDashboard from '@/components/dashboard/StaffDashboard';
import EmployerDashboard from '@/components/dashboard/EmployerDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';

export default function Home() {
  const { user } = useOutletContext();
  const role = user?.role;

  const renderDashboard = () => {
    if (isAdmin(role)) return <AdminDashboard user={user} />;
    if (isStaff(role)) return <StaffDashboard user={user} />;
    if (role === ROLES.EMPLOYER) return <EmployerDashboard user={user} />;
    if (role === ROLES.PROBATION_OFFICER || role === ROLES.REFERRAL_PARTNER) return <StaffDashboard user={user} />;
    if (role === ROLES.AUDITOR) return <AdminDashboard user={user} />;
    return <ResidentDashboard user={user} />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      {renderDashboard()}
    </div>
  );
}
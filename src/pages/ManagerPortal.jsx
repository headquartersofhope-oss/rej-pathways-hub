import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CaseloadAssignmentPanel from '@/components/manager/CaseloadAssignmentPanel';
import ManagerCommandDashboard from '@/components/manager/ManagerCommandDashboard';
import StaffOversightPanel from '@/components/manager/StaffOversightPanel';
import { isManager } from '@/lib/rbac';

export default function ManagerPortal() {
  const { user } = useOutletContext();

  // Access control
  if (!user || !isManager(user.role)) {
    return (
      <div className="p-6 pt-14 lg:pt-6 max-w-md mx-auto mt-16 text-center">
        <p className="text-muted-foreground mb-4">You do not have permission to access the Manager Portal.</p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 inline mr-1" /> Home
          </Link>
        </div>
        <h1 className="font-heading text-3xl font-bold">Manager Portal</h1>
        <p className="text-muted-foreground mt-1">Operational oversight, staff management, and resident assignment</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <ManagerCommandDashboard />
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <CaseloadAssignmentPanel />
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff">
          <StaffOversightPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
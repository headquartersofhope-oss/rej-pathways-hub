import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Briefcase, LayoutDashboard, User } from 'lucide-react';
import EmployerPortalDashboard from '@/components/employer/EmployerPortalDashboard';
import EmployerJobsTab from '@/components/employer/EmployerJobsTab';
import EmployerProfileTab from '@/components/employer/EmployerProfileTab';

export default function EmployerPortal() {
  const outletCtx = useOutletContext();
  const user = outletCtx?.user;
  const urlParams = new URLSearchParams(window.location.search);
  const defaultTab = urlParams.get('tab') || 'dashboard';

  const { data: employer, isLoading, refetch: refetchEmployer } = useQuery({
    queryKey: ['my-employer-profile', user?.id],
    queryFn: async () => {
      // Scoped: filter by user_id directly — no full table scan
      const list = await base44.entities.Employer.filter({ user_id: user?.id });
      return list[0] || null;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!employer) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-4xl mx-auto">
        <Card className="p-10 text-center">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h2 className="font-heading text-lg font-bold mb-2">Employer Account Not Linked</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your account is not yet linked to an employer profile. Please contact your program coordinator to complete setup.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">{employer.company_name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Employer Portal — {employer.industry || 'Company Portal'}</p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5">
            <Briefcase className="w-3.5 h-3.5" /> My Jobs
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="w-3.5 h-3.5" /> Company Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <EmployerPortalDashboard employer={employer} user={user} />
        </TabsContent>

        <TabsContent value="jobs">
          <EmployerJobsTab employer={employer} user={user} />
        </TabsContent>

        <TabsContent value="profile">
          <EmployerProfileTab employer={employer} onSaved={refetchEmployer} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { isStaff } from '@/lib/roles';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ReadinessOverview from './ReadinessOverview';
import ResumeBuilder from './ResumeBuilder';
import MockInterviewPanel from './MockInterviewPanel';
import WorkPreferencesPanel from './WorkPreferencesPanel';
import ReferencesPanel from './ReferencesPanel';
import CoverLetterPanel from './CoverLetterPanel';

export default function JobReadinessTab({ resident, user, barriers = [], tasks = [], perms = {} }) {
  const queryClient = useQueryClient();
  const residentId = resident?.id;
  const globalId = resident?.global_resident_id;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['employability-profile', residentId],
    queryFn: async () => {
      const list = await base44.entities.EmployabilityProfile.filter({ resident_id: residentId });
      return list[0] || null;
    },
    enabled: !!residentId,
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes', residentId],
    queryFn: () => base44.entities.ResumeRecord.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const { data: mockInterviews = [] } = useQuery({
    queryKey: ['mock-interviews', residentId],
    queryFn: () => base44.entities.MockInterview.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const { data: references = [] } = useQuery({
    queryKey: ['references', residentId],
    queryFn: () => base44.entities.ReferenceContact.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const { data: coverLetters = [] } = useQuery({
    queryKey: ['cover-letters', residentId],
    queryFn: () => base44.entities.CoverLetterRecord.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates-jr', residentId],
    queryFn: () => base44.entities.Certificate.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const refreshProfile = () => {
    queryClient.refetchQueries({ queryKey: ['employability-profile', residentId] });
    queryClient.refetchQueries({ queryKey: ['resumes', residentId] });
    queryClient.refetchQueries({ queryKey: ['mock-interviews', residentId] });
    queryClient.refetchQueries({ queryKey: ['references', residentId] });
    queryClient.refetchQueries({ queryKey: ['cover-letters', residentId] });
    queryClient.refetchQueries({ queryKey: ['certificates-jr', residentId] });
  };

  // Probation officers and auditors are read-only — no create/edit actions
  const staff = !perms.isReadOnly && (!user?.role || isStaff(user?.role));

  if (profileLoading) {
    return <div className="animate-pulse h-40 bg-muted rounded-lg" />;
  }

  const sharedProps = { resident, profile, user, staff, residentId, globalId, onRefresh: refreshProfile };

  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-4 flex-wrap h-auto gap-1">
        <TabsTrigger value="overview">Readiness Overview</TabsTrigger>
        <TabsTrigger value="preferences">Work Preferences</TabsTrigger>
        <TabsTrigger value="resume">Resume</TabsTrigger>
        <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
        <TabsTrigger value="interviews">Mock Interviews</TabsTrigger>
        <TabsTrigger value="references">References</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <ReadinessOverview
          {...sharedProps}
          barriers={barriers}
          tasks={tasks}
          resumes={resumes}
          mockInterviews={mockInterviews}
          references={references}
          certificates={certificates}
        />
      </TabsContent>

      <TabsContent value="preferences">
        <WorkPreferencesPanel {...sharedProps} />
      </TabsContent>

      <TabsContent value="resume">
        <ResumeBuilder {...sharedProps} resumes={resumes} certificates={certificates} />
      </TabsContent>

      <TabsContent value="cover-letter">
        <CoverLetterPanel {...sharedProps} coverLetters={coverLetters} />
      </TabsContent>

      <TabsContent value="interviews">
        <MockInterviewPanel {...sharedProps} mockInterviews={mockInterviews} />
      </TabsContent>

      <TabsContent value="references">
        <ReferencesPanel {...sharedProps} references={references} />
      </TabsContent>
    </Tabs>
  );
}
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { isStaff } from '@/lib/roles';
import { syncReadinessScore } from '@/lib/syncReadinessScore';
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

  // Use global_resident_id as primary key for all queries — it's the stable master identity.
  // Fall back to resident DB id if global_resident_id not yet assigned.
  const queryId = globalId || residentId;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['employability-profile', queryId],
    queryFn: async () => {
      // Try global_resident_id first (master identity), fall back to resident_id
      let list = globalId
        ? await base44.entities.EmployabilityProfile.filter({ global_resident_id: globalId })
        : [];
      if (!list.length) {
        list = await base44.entities.EmployabilityProfile.filter({ resident_id: residentId });
      }
      return list[0] || null;
    },
    enabled: !!residentId,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes', queryId],
    queryFn: async () => {
      let list = globalId
        ? await base44.entities.ResumeRecord.filter({ global_resident_id: globalId })
        : [];
      if (!list.length) {
        list = await base44.entities.ResumeRecord.filter({ resident_id: residentId });
      }
      return list;
    },
    enabled: !!residentId,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: mockInterviews = [] } = useQuery({
    queryKey: ['mock-interviews', queryId],
    queryFn: async () => {
      let list = globalId
        ? await base44.entities.MockInterview.filter({ global_resident_id: globalId })
        : [];
      if (!list.length) {
        list = await base44.entities.MockInterview.filter({ resident_id: residentId });
      }
      return list;
    },
    enabled: !!residentId,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: references = [] } = useQuery({
    queryKey: ['references', queryId],
    queryFn: async () => {
      let list = globalId
        ? await base44.entities.ReferenceContact.filter({ global_resident_id: globalId })
        : [];
      if (!list.length) {
        list = await base44.entities.ReferenceContact.filter({ resident_id: residentId });
      }
      return list;
    },
    enabled: !!residentId,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: coverLetters = [] } = useQuery({
    queryKey: ['cover-letters', queryId],
    queryFn: async () => {
      let list = globalId
        ? await base44.entities.CoverLetterRecord.filter({ global_resident_id: globalId })
        : [];
      if (!list.length) {
        list = await base44.entities.CoverLetterRecord.filter({ resident_id: residentId });
      }
      return list;
    },
    enabled: !!residentId,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates-jr', queryId],
    queryFn: () => base44.entities.Certificate.filter({ resident_id: residentId }),
    enabled: !!residentId,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance-jr', residentId],
    queryFn: () => base44.entities.AttendanceRecord.filter({ resident_id: residentId }),
    enabled: !!residentId,
    staleTime: 0,
    gcTime: 0,
  });

  const refreshProfile = async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['employability-profile', queryId] }),
      queryClient.refetchQueries({ queryKey: ['resumes', queryId] }),
      queryClient.refetchQueries({ queryKey: ['mock-interviews', queryId] }),
      queryClient.refetchQueries({ queryKey: ['references', queryId] }),
      queryClient.refetchQueries({ queryKey: ['cover-letters', queryId] }),
      queryClient.refetchQueries({ queryKey: ['certificates-jr', queryId] }),
      queryClient.refetchQueries({ queryKey: ['attendance-jr', residentId] }),
    ]);
    // Also refresh the resident record so header + list scores are up-to-date
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    if (residentId) queryClient.invalidateQueries({ queryKey: ['resident', residentId] });
  };

  // Backfill: once profile + all data is loaded, recompute the true score and sync
  // both EmployabilityProfile and Resident so all views show the same value.
  useEffect(() => {
    if (!profile?.id || !residentId) return;
    syncReadinessScore({
      profile,
      residentId,
      resumes,
      mockInterviews,
      references,
      certificates,
      attendanceRecords,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      if (residentId) queryClient.invalidateQueries({ queryKey: ['resident', residentId] });
    });
    // Only re-run when the profile id or supporting data counts change — not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, resumes.length, mockInterviews.length, references.length, certificates.length, attendanceRecords.length]);

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
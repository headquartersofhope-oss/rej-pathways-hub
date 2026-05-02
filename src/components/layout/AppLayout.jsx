import React from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Sidebar from './Sidebar';
import ViewAsToggle from './ViewAsToggle';
import { useAuth } from '@/lib/AuthContext';
import GlobalSearchBar from '@/components/shared/GlobalSearchBar';
import TrainingButton from '@/components/training/TrainingButton';
import TrainingCoach from '@/components/training/TrainingCoach';
import TrainingModeBanner from '@/components/training/TrainingModeBanner';
import AppAssistant from '@/components/ai/AppAssistant';
import { useTrainingMode } from '@/lib/useTrainingMode';
import LiveMeetingIndicator from '@/components/videohub/LiveMeetingIndicator';

export default function AppLayout() {
  const { user, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const { trainingMode, currentModule } = useTrainingMode();

  // UserProfile is queried by email — the most reliable identifier on that entity.
  // (Previously this had hardcoded "Rodney" / phone fallbacks; removed as tech debt.)
  const { data: userProfiles = [] } = useQuery({
    queryKey: ['userProfile', user?.id, user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.UserProfile.filter({ email: user.email });
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
  });

  const userProfile = userProfiles.length > 0 ? userProfiles[0] : null;

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-background to-background/95">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-bold text-sm">HOH</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground font-medium">Loading Pathways...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} />
      <TrainingModeBanner trainingMode={trainingMode} currentModule={currentModule} />
      <TrainingCoach />
      <main className={`flex-1 overflow-y-auto flex flex-col bg-background ${trainingMode ? 'ml-80' : ''}`}>
        {/* Top bar with global search + ViewAsToggle (admin-only) */}
        <div
          className="hidden lg:flex items-center gap-3 px-6 py-4 border-b sticky top-0 z-20 shadow-sm"
          style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}
        >
          <GlobalSearchBar />
          <div className="ml-auto flex items-center gap-3">
            <ViewAsToggle user={user} />
            <LiveMeetingIndicator userId={user?.id} />
          </div>
        </div>
        <div className="flex-1 animate-in fade-in duration-300">
          <Outlet context={{ user }} />
        </div>
      </main>
      <TrainingButton />
      <AppAssistant
        userRole={user?.role || 'resident'}
        userName={user?.full_name || 'User'}
        userProfile={userProfile}
        appName="Pathways Hub"
        organizationId={userProfile?.organization_id}
      />
    </div>
  );
}
